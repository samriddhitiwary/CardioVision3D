from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


DISCLAIMER = (
    "Educational / decision-support prototype only. Predictions are model risk estimates and are not a medical "
    "diagnosis or substitute for professional evaluation or coronary imaging."
)


class TargetPrediction(BaseModel):
    probability: float = Field(ge=0.0, le=1.0)
    threshold: float
    positive: bool
    risk_score: float = Field(ge=0.0, le=1.0)
    visualization_band: Literal["low", "moderate", "high"]
    band_basis: str


class PredictionResponse(BaseModel):
    model_version: str
    predictions: dict[str, TargetPrediction]
    visualization: dict[str, TargetPrediction]
    disclaimer: str = DISCLAIMER


class ExplanationFactor(BaseModel):
    feature: str
    raw_value: Any
    contribution: float
    direction: str
    ui_label: str


class TargetExplanation(BaseModel):
    probability: float
    threshold: float
    classification: str
    top_increasing_contributors: list[ExplanationFactor]
    top_decreasing_contributors: list[ExplanationFactor]
    explanation_method: str
    explanation_scope: str


class ExplanationResponse(BaseModel):
    model_version: str
    explanations: dict[str, TargetExplanation]
    disclaimer: str = DISCLAIMER


class AnalyzeResponse(PredictionResponse):
    explanations: dict[str, TargetExplanation]

