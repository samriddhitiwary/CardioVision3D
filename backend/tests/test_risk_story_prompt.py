from backend.app.services.risk_story_prompt import build_risk_story_prompt

def test_build_risk_story_prompt():
    analysis_data = {
        "model_version": "v1",
        "targets": {"LAD": {"risk_percent": 81.0, "severity": "high"}},
        "highest_risk_vessel": "LAD",
        "shap": {"positive": [], "negative": []}
    }
    prompt = build_risk_story_prompt(analysis_data)
    
    # Assert system prompt properties
    assert "Your job is ONLY to transform the supplied machine-learning analysis" in prompt
    assert "<ANALYSIS_DATA>" in prompt
    assert "</ANALYSIS_DATA>" in prompt
    
    # Assert data injection
    assert '"model_version": "v1"' in prompt
    assert '"highest_risk_vessel": "LAD"' in prompt
