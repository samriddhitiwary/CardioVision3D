from __future__ import annotations

import logging
from typing import Any

import numpy as np
import pandas as pd

from backend.app.core.model_registry import TARGETS, ModelRegistry
from backend.app.schemas.prediction import DISCLAIMER

logger = logging.getLogger(__name__)


def positive_probability(model: Any, patient_df: pd.DataFrame) -> float:
    probability = model.predict_proba(patient_df)
    value = probability[0, 1] if probability.shape[1] > 1 else probability[0, 0]
    return float(np.clip(value, 0.0, 1.0))


def visualization_band(probability: float) -> str:
    if probability < 0.33:
        return "low"
    if probability < 0.66:
        return "moderate"
    return "high"


class PredictionService:
    def __init__(self, registry: ModelRegistry) -> None:
        self.registry = registry

    def predict(self, patient_df: pd.DataFrame) -> dict[str, Any]:
        predictions: dict[str, dict[str, Any]] = {}
        for target in TARGETS:
            probability = positive_probability(self.registry.get_model(target), patient_df)
            threshold = self.registry.threshold(target)
            predictions[target] = {
                "probability": probability,
                "threshold": threshold,
                "positive": probability >= threshold,
                "risk_score": probability,
                "visualization_band": visualization_band(probability),
                "band_basis": "UI visualization band based on model probability; not a clinical severity category.",
            }
        return {
            "model_version": self.registry.model_version,
            "predictions": predictions,
            "visualization": {target: predictions[target] for target in ("LAD", "LCX", "RCA")},
            "disclaimer": DISCLAIMER,
        }
