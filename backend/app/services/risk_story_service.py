import logging
from typing import Any

from backend.app.schemas.risk_story import RiskStoryResponse, RiskStoryFactor, RiskStoryVessel
from backend.app.integrations.gemini_client import GeminiRiskStoryClient
from backend.app.services.risk_story_prompt import build_risk_story_prompt

logger = logging.getLogger(__name__)

FALLBACK_STORY = {
    "headline": "Model explanation available",
    "summary": "The current analysis identifies the highest-contributing factors from the TreeSHAP explanation. The AI-generated narrative is temporarily unavailable.",
    "primary_message": "Review the ranked model contributors and vessel-specific risk scores below.",
    "positive_factors": [],
    "negative_factors": [],
    "vessels": [],
    "highest_risk_vessel": "LAD",
    "visualization_steps": [],
    "disclaimer": "AI-generated narrative unavailable. Review the underlying model outputs and independent clinical judgment."
}

from sqlalchemy.orm import Session
from datetime import datetime, timezone
from backend.app.db.models import Patient
from backend.app.utils.analysis_fingerprint import generate_fingerprint

class RiskStoryService:
    def __init__(self, gemini_client: GeminiRiskStoryClient = None):
        self.client = gemini_client or GeminiRiskStoryClient()

    async def generate_risk_story(
        self,
        predictions: dict[str, Any],
        explanations: dict[str, Any],
        patient_data: dict[str, Any],
        patient: Patient,
        db: Session,
        force_regenerate: bool = False
    ) -> RiskStoryResponse:
        
        # 1. Generate fingerprint for current ML inputs
        current_fingerprint = generate_fingerprint(
            patient_clinical_data=patient_data,
            analysis_outputs={"predictions": predictions, "explanations": explanations},
            prediction_model_versions={"model_version": predictions.get("model_version", "unknown")}
        )
        
        # 2. Check Cache
        if not force_regenerate and patient.risk_story_fingerprint == current_fingerprint and patient.risk_story:
            logger.info(f"Returning cached risk story for patient {patient.id}")
            return RiskStoryResponse.model_validate(patient.risk_story)
            
        vessels_data = {}
        highest_vessel = None
        max_prob = -1.0
        
        for vessel in ["LAD", "LCX", "RCA"]:
            if vessel in predictions.get("predictions", {}):
                prob = predictions["predictions"][vessel].get("probability", 0.0) * 100
                sev = predictions["predictions"][vessel].get("visualization_band", "low")
                vessels_data[vessel] = {"risk_percent": round(prob, 1), "severity": sev}
                if prob > max_prob:
                    max_prob = prob
                    highest_vessel = vessel
        
        cad_exp = explanations.get("explanations", {}).get("CAD", {})
        pos_contribs = cad_exp.get("top_increasing_contributors", [])
        neg_contribs = cad_exp.get("top_decreasing_contributors", [])
        
        analysis_payload = {
            "model_version": predictions.get("model_version", "unknown"),
            "targets": vessels_data,
            "highest_risk_vessel": highest_vessel,
            "shap": {
                "positive": pos_contribs,
                "negative": neg_contribs
            }
        }
        
        prompt = build_risk_story_prompt(analysis_payload)
        
        try:
            # Note: the client model switching handles failures deterministically.
            model_used = self.client.all_models[self.client.current_model_idx]
            llm_response = await self.client.generate(prompt)
            self._override_authoritative(llm_response, vessels_data, highest_vessel, pos_contribs, neg_contribs)
            
            # 3. Cache the successful response
            patient.risk_story = llm_response.model_dump()
            patient.risk_story_fingerprint = current_fingerprint
            patient.risk_story_model = model_used
            patient.risk_story_generated_at = datetime.now(timezone.utc)
            db.commit()
            
            return llm_response
            
        except Exception as e:
            logger.error(f"Failed to generate risk story, using fallback: {e}")
            fallback_response = self._build_fallback(vessels_data, highest_vessel, pos_contribs, neg_contribs)
            
            # We also cache the fallback to avoid spamming the failed API
            patient.risk_story = fallback_response.model_dump()
            patient.risk_story_fingerprint = current_fingerprint
            patient.risk_story_model = "fallback-deterministic"
            patient.risk_story_generated_at = datetime.now(timezone.utc)
            db.commit()
            
            return fallback_response
            
    def _override_authoritative(
        self,
        response: RiskStoryResponse,
        vessels_data: dict,
        highest_vessel: str,
        pos_contribs: list,
        neg_contribs: list
    ):
        """Forces LLM output to match true backend ML predictions to prevent hallucination."""
        response.highest_risk_vessel = highest_vessel
        
        # Override vessels with strictly backend data
        response.vessels = [
            RiskStoryVessel(
                vessel=v,
                risk_percent=vessels_data[v]["risk_percent"],
                severity=vessels_data[v]["severity"]
            ) for v in vessels_data
        ]
        
        pos_map = {f["feature"]: f for f in pos_contribs}
        neg_map = {f["feature"]: f for f in neg_contribs}
        
        for pf in response.positive_factors:
            if pf.feature in pos_map:
                pf.contribution = pos_map[pf.feature].get("contribution", pf.contribution)
                pf.value_text = str(pos_map[pf.feature].get("value", pf.value_text))
                pf.direction = "increases_risk"
                pf.display_name = pos_map[pf.feature].get("feature", pf.display_name)
                
        for nf in response.negative_factors:
            if nf.feature in neg_map:
                nf.contribution = neg_map[nf.feature].get("contribution", nf.contribution)
                nf.value_text = str(neg_map[nf.feature].get("value", nf.value_text))
                nf.direction = "decreases_risk"
                nf.display_name = neg_map[nf.feature].get("feature", nf.display_name)
        
    def _build_fallback(self, vessels_data, highest_vessel, pos_contribs, neg_contribs) -> RiskStoryResponse:
        """Returns deterministic fallback story on Gemini API failure."""
        fallback = RiskStoryResponse.model_validate(FALLBACK_STORY)
        fallback.highest_risk_vessel = highest_vessel
        
        fallback.vessels = [
            RiskStoryVessel(
                vessel=v,
                risk_percent=vessels_data[v]["risk_percent"],
                severity=vessels_data[v]["severity"]
            ) for v in vessels_data
        ]
        
        fallback.positive_factors = [
            RiskStoryFactor(
                feature=f.get("feature", "unknown"),
                display_name=f.get("feature", "unknown"),
                direction="increases_risk",
                contribution=f.get("contribution", 0.0),
                value_text=str(f.get("value", "")),
                explanation="Positive contributor to the model."
            ) for f in pos_contribs
        ]
        
        fallback.negative_factors = [
            RiskStoryFactor(
                feature=f.get("feature", "unknown"),
                display_name=f.get("feature", "unknown"),
                direction="decreases_risk",
                contribution=f.get("contribution", 0.0),
                value_text=str(f.get("value", "")),
                explanation="Negative contributor to the model."
            ) for f in neg_contribs
        ]
        return fallback
