import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from backend.app.schemas.risk_story import RiskStoryResponse
from backend.app.services.risk_story_service import RiskStoryService
from backend.app.integrations.gemini_client import GeminiRiskStoryClient


@pytest.fixture
def mock_ml_data():
    predictions = {
        "model_version": "v1.0",
        "predictions": {
            "LAD": {"probability": 0.81, "visualization_band": "high"},
            "LCX": {"probability": 0.43, "visualization_band": "moderate"},
            "RCA": {"probability": 0.36, "visualization_band": "low"}
        }
    }
    
    explanations = {
        "explanations": {
            "CAD": {
                "top_increasing_contributors": [
                    {"feature": "LDL", "contribution": 0.31, "value": 168}
                ],
                "top_decreasing_contributors": [
                    {"feature": "HDL", "contribution": -0.08, "value": 54}
                ]
            }
        }
    }
    
    patient_data = {"age": 60}
    return predictions, explanations, patient_data


@pytest.fixture
def mock_db():
    return MagicMock()

@pytest.fixture
def mock_patient():
    patient = MagicMock()
    patient.id = 1
    patient.risk_story = None
    patient.risk_story_fingerprint = None
    patient.risk_story_model = None
    patient.risk_story_generated_at = None
    return patient

@pytest.mark.anyio
async def test_generate_risk_story_success_overrides_llm(mock_ml_data, mock_patient, mock_db):
    predictions, explanations, patient_data = mock_ml_data
    
    # Simulate LLM returning incorrect/hallucinated numbers
    hallucinated_response = RiskStoryResponse(
        headline="AI generated",
        summary="summary",
        primary_message="message",
        positive_factors=[
            {
                "feature": "LDL",
                "display_name": "LDL",
                "direction": "increases_risk",
                "contribution": 0.99, # Hallucinated
                "value_text": "1000", # Hallucinated
                "explanation": "High LDL"
            }
        ],
        negative_factors=[],
        vessels=[
            {
                "vessel": "LAD",
                "risk_percent": 99.9, # Hallucinated
                "severity": "low"     # Hallucinated
            }
        ],
        highest_risk_vessel="RCA", # Hallucinated
        visualization_steps=[],
        disclaimer="disclaimer"
    )
    
    mock_client = MagicMock(spec=GeminiRiskStoryClient)
    mock_client.all_models = ["gemini-test"]
    mock_client.current_model_idx = 0
    mock_client.generate = AsyncMock(return_value=hallucinated_response)
    
    service = RiskStoryService(gemini_client=mock_client)
    
    response = await service.generate_risk_story(predictions, explanations, patient_data, mock_patient, mock_db)
    
    # Assert authoritative override worked
    assert response.highest_risk_vessel == "LAD" # Overridden from RCA
    
    # Assert vessel numbers overridden
    lad_vessel = next(v for v in response.vessels if v.vessel == "LAD")
    assert lad_vessel.risk_percent == 81.0
    assert lad_vessel.severity == "high"
    
    # Assert factor numbers overridden
    ldl_factor = response.positive_factors[0]
    assert ldl_factor.contribution == 0.31
    assert ldl_factor.value_text == "168"
    
    # Assert db commit and patient updated
    mock_db.commit.assert_called_once()
    assert mock_patient.risk_story is not None
    assert mock_patient.risk_story_fingerprint is not None
    assert mock_patient.risk_story_model == "gemini-test"


@pytest.mark.anyio
async def test_generate_risk_story_fallback(mock_ml_data, mock_patient, mock_db):
    predictions, explanations, patient_data = mock_ml_data
    
    mock_client = MagicMock(spec=GeminiRiskStoryClient)
    # Simulate API failure
    mock_client.generate = AsyncMock(side_effect=Exception("API Down"))
    
    service = RiskStoryService(gemini_client=mock_client)
    
    response = await service.generate_risk_story(predictions, explanations, patient_data, mock_patient, mock_db)
    
    # Assert fallback structure
    assert response.headline == "Model explanation available"
    assert response.highest_risk_vessel == "LAD"
    assert len(response.vessels) == 3
    
    lad_vessel = next(v for v in response.vessels if v.vessel == "LAD")
    assert lad_vessel.risk_percent == 81.0
    
    assert len(response.positive_factors) == 1
    assert response.positive_factors[0].feature == "LDL"
    assert response.positive_factors[0].contribution == 0.31

    # Assert db commit and patient updated with fallback metadata
    mock_db.commit.assert_called_once()
    assert mock_patient.risk_story is not None
    assert mock_patient.risk_story_model == "fallback-deterministic"


@pytest.mark.anyio
async def test_generate_risk_story_uses_cache(mock_ml_data, mock_patient, mock_db):
    predictions, explanations, patient_data = mock_ml_data
    
    mock_client = MagicMock(spec=GeminiRiskStoryClient)
    # This shouldn't be called if cache is hit
    mock_client.generate = AsyncMock()
    
    service = RiskStoryService(gemini_client=mock_client)
    
    # 1. First call (Cache Miss)
    mock_client.all_models = ["gemini-test"]
    mock_client.current_model_idx = 0
    mock_client.generate.return_value = RiskStoryResponse(
        headline="Original Story",
        summary="", primary_message="", positive_factors=[], negative_factors=[], vessels=[], visualization_steps=[], disclaimer=""
    )
    
    resp1 = await service.generate_risk_story(predictions, explanations, patient_data, mock_patient, mock_db)
    assert resp1.headline == "Original Story"
    mock_client.generate.assert_called_once()
    
    # 2. Second call (Cache Hit)
    mock_client.generate.reset_mock()
    # Change the mock return value to prove it's not called
    mock_client.generate.return_value = RiskStoryResponse(
        headline="Different Story",
        summary="", primary_message="", positive_factors=[], negative_factors=[], vessels=[], visualization_steps=[], disclaimer=""
    )
    
    resp2 = await service.generate_risk_story(predictions, explanations, patient_data, mock_patient, mock_db)
    assert resp2.headline == "Original Story" # Should still be original
    mock_client.generate.assert_not_called()
    
    # 3. Third call with force_regenerate (Cache Miss)
    resp3 = await service.generate_risk_story(predictions, explanations, patient_data, mock_patient, mock_db, force_regenerate=True)
    assert resp3.headline == "Different Story"
    mock_client.generate.assert_called_once()

