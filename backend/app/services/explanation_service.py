from __future__ import annotations

import sys
from typing import Any

import pandas as pd

from backend.app.core.model_registry import TARGETS, ModelRegistry
from backend.app.schemas.prediction import DISCLAIMER


class ExplanationService:
    def __init__(self, registry: ModelRegistry) -> None:
        self.registry = registry
        ml_dir = registry.project_root / "ml"
        if str(ml_dir) not in sys.path:
            sys.path.insert(0, str(ml_dir))
        from src.explainability.shap_explainer import CardioTwinExplainer

        self.explainer = CardioTwinExplainer(project_root=registry.project_root, background_size=80, random_state=2026)

    def explain(self, patient_df: pd.DataFrame, top_n: int = 5) -> dict[str, Any]:
        raw = self.explainer.explain_all(patient_df, top_n=top_n)
        explanations: dict[str, dict[str, Any]] = {}
        for target in TARGETS:
            item = raw[target]
            explanations[target] = {
                "probability": item["probability"],
                "threshold": item["threshold"],
                "classification": item["classification"],
                "top_increasing_contributors": item["top_risk_factors"],
                "top_decreasing_contributors": item["top_decreasing_risk_factors"],
                "explanation_method": item["explanation_method"],
                "explanation_scope": item["explanation_scope"],
            }
        return {
            "model_version": self.registry.model_version,
            "explanations": explanations,
            "disclaimer": DISCLAIMER,
        }
