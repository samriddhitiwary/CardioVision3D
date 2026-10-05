import pytest
from pydantic import ValidationError

from backend.app.schemas.risk_story import RiskStoryResponse


def test_valid_risk_story_response():
    valid_data = {
        "headline": "The highest predicted vessel risk is in the LAD",
        "summary": "The model's prediction is primarily influenced by the highest-ranked positive TreeSHAP contributors.",
        "primary_message": "The LAD has the highest predicted risk among the three analyzed coronary vessels.",
        "positive_factors": [
            {
                "feature": "LDL",
                "display_name": "LDL cholesterol",
                "direction": "increases_risk",
                "contribution": 0.31,
                "value_text": "168 mg/dL",
                "explanation": "High LDL cholesterol pushed the model prediction higher."
            }
        ],
        "negative_factors": [],
        "vessels": [
            {
                "vessel": "LAD",
                "risk_percent": 81.0,
                "severity": "high"
            }
        ],
        "highest_risk_vessel": "LAD",
        "visualization_steps": [
            "Review overall CAD risk",
            "Review top model contributors",
            "Inspect the highest-risk vessel",
        ],
        "disclaimer": "CardioVision3D is an AI-assisted clinical decision support tool."
    }
    
    # Should not raise an exception
    response = RiskStoryResponse(**valid_data)
    assert response.headline == valid_data["headline"]


def test_invalid_vessel_rejected():
    invalid_data = {
        "headline": "Test",
        "summary": "Test",
        "primary_message": "Test",
        "positive_factors": [],
        "negative_factors": [],
        "vessels": [
            {
                "vessel": "UNKNOWN_VESSEL",  # Invalid literal
                "risk_percent": 81.0,
                "severity": "high"
            }
        ],
        "highest_risk_vessel": "LAD",
        "visualization_steps": [],
        "disclaimer": "Test disclaimer"
    }
    
    with pytest.raises(ValidationError) as exc_info:
        RiskStoryResponse(**invalid_data)
    
    assert "Input should be 'LAD', 'LCX' or 'RCA'" in str(exc_info.value)


def test_max_length_constraints():
    invalid_data = {
        "headline": "A" * 150,  # Max is 140
        "summary": "Test",
        "primary_message": "Test",
        "positive_factors": [],
        "negative_factors": [],
        "vessels": [],
        "highest_risk_vessel": None,
        "visualization_steps": [],
        "disclaimer": "Test disclaimer"
    }
    
    with pytest.raises(ValidationError) as exc_info:
        RiskStoryResponse(**invalid_data)
        
    assert "String should have at most 140 characters" in str(exc_info.value)

def test_invalid_factor_direction():
    invalid_data = {
        "headline": "Test",
        "summary": "Test",
        "primary_message": "Test",
        "positive_factors": [
            {
                "feature": "LDL",
                "display_name": "LDL",
                "direction": "bad_direction",  # Invalid
                "contribution": 0.5,
                "value_text": "High",
                "explanation": "Test"
            }
        ],
        "negative_factors": [],
        "vessels": [],
        "highest_risk_vessel": None,
        "visualization_steps": [],
        "disclaimer": "Test"
    }
    with pytest.raises(ValidationError) as exc_info:
        RiskStoryResponse(**invalid_data)
    assert "Input should be 'increases_risk' or 'decreases_risk'" in str(exc_info.value)

def test_invalid_vessel_severity():
    invalid_data = {
        "headline": "Test",
        "summary": "Test",
        "primary_message": "Test",
        "positive_factors": [],
        "negative_factors": [],
        "vessels": [
            {
                "vessel": "LAD",
                "risk_percent": 81.0,
                "severity": "extreme"  # Invalid
            }
        ],
        "highest_risk_vessel": None,
        "visualization_steps": [],
        "disclaimer": "Test"
    }
    with pytest.raises(ValidationError) as exc_info:
        RiskStoryResponse(**invalid_data)
    assert "Input should be 'low', 'moderate' or 'high'" in str(exc_info.value)

def test_optional_highest_risk_vessel_allowed():
    valid_data = {
        "headline": "Test",
        "summary": "Test",
        "primary_message": "Test",
        "positive_factors": [],
        "negative_factors": [],
        "vessels": [],
        "visualization_steps": [],
        "disclaimer": "Test"
    }
    # missing highest_risk_vessel should default to None
    response = RiskStoryResponse(**valid_data)
    assert response.highest_risk_vessel is None

