import hashlib
import json
from typing import Any


def generate_fingerprint(
    patient_clinical_data: dict[str, Any],
    analysis_outputs: dict[str, Any],
    prediction_model_versions: dict[str, str],
    schema_version: str = "risk-story-v1"
) -> str:
    """
    Generates a deterministic SHA-256 fingerprint for caching the AI Risk Story.
    """
    source_object = {
        "patient_clinical_data": patient_clinical_data,
        "analysis_outputs": analysis_outputs,
        "prediction_model_versions": prediction_model_versions,
        "schema_version": schema_version
    }
    
    # Canonicalize JSON by sorting keys and removing extraneous whitespace
    canonical_json = json.dumps(source_object, sort_keys=True, separators=(',', ':'))
    
    return f"sha256:{hashlib.sha256(canonical_json.encode('utf-8')).hexdigest()}"
