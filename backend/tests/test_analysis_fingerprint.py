import pytest
from backend.app.utils.analysis_fingerprint import generate_fingerprint

def test_generate_fingerprint_deterministic_order():
    """Test that key insertion order does not affect the generated fingerprint."""
    data_1 = {
        "patient_clinical_data": {"age": 60, "ldl": 160},
        "analysis_outputs": {"cad_risk": 75},
        "prediction_model_versions": {"cad": "v1"}
    }
    
    data_2 = {
        "patient_clinical_data": {"ldl": 160, "age": 60},  # Swapped keys
        "analysis_outputs": {"cad_risk": 75},
        "prediction_model_versions": {"cad": "v1"}
    }
    
    fp_1 = generate_fingerprint(**data_1)
    fp_2 = generate_fingerprint(**data_2)
    
    assert fp_1 == fp_2
    assert fp_1.startswith("sha256:")

def test_generate_fingerprint_different_data():
    """Test that different data produces a different fingerprint."""
    data_1 = {
        "patient_clinical_data": {"age": 60, "ldl": 160},
        "analysis_outputs": {"cad_risk": 75},
        "prediction_model_versions": {"cad": "v1"}
    }
    
    data_2 = {
        "patient_clinical_data": {"age": 61, "ldl": 160},  # Age changed
        "analysis_outputs": {"cad_risk": 75},
        "prediction_model_versions": {"cad": "v1"}
    }
    
    fp_1 = generate_fingerprint(**data_1)
    fp_2 = generate_fingerprint(**data_2)
    
    assert fp_1 != fp_2

def test_generate_fingerprint_empty_dicts():
    """Test fingerprint generation with empty dictionaries."""
    data_1 = {
        "patient_clinical_data": {},
        "analysis_outputs": {},
        "prediction_model_versions": {}
    }
    fp = generate_fingerprint(**data_1)
    assert fp.startswith("sha256:")

def test_generate_fingerprint_schema_version():
    """Test that changing the schema version changes the fingerprint."""
    data_1 = {
        "patient_clinical_data": {"age": 60},
        "analysis_outputs": {},
        "prediction_model_versions": {},
        "schema_version": "v1"
    }
    
    data_2 = {
        "patient_clinical_data": {"age": 60},
        "analysis_outputs": {},
        "prediction_model_versions": {},
        "schema_version": "v2"
    }
    
    fp_1 = generate_fingerprint(**data_1)
    fp_2 = generate_fingerprint(**data_2)
    
    assert fp_1 != fp_2
