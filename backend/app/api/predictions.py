from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status

from backend.app.core.model_registry import ModelRegistry, ModelRegistryError, get_model_registry
from backend.app.schemas.patient import PatientInput
from backend.app.schemas.prediction import AnalyzeResponse, ExplanationResponse, PredictionResponse
from backend.app.services.explanation_service import ExplanationService
from backend.app.services.prediction_service import PredictionService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["predictions"])


def registry_dependency() -> ModelRegistry:
    try:
        return get_model_registry()
    except ModelRegistryError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Models are not initialized.") from exc


def prediction_service(registry: ModelRegistry = Depends(registry_dependency)) -> PredictionService:
    return PredictionService(registry)


def explanation_service(request: Request) -> ExplanationService:
    service = getattr(request.app.state, "explanation_service", None)
    if service is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Explainer is not initialized.")
    return service


@router.post(
    "/predict",
    response_model=PredictionResponse,
    summary="Fast calibrated cardiovascular risk prediction",
    description="Returns calibrated frozen-model probabilities and UI visualization bands. Does not compute SHAP.",
)
def predict(patient: PatientInput, service: PredictionService = Depends(prediction_service)) -> dict:
    try:
        return service.predict(patient.to_ml_dataframe())
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.exception("Unexpected prediction failure")
        raise HTTPException(status_code=500, detail="Unexpected inference error.") from exc


@router.post(
    "/explain",
    response_model=ExplanationResponse,
    summary="SHAP explanations for all frozen targets",
    description="Returns patient-level SHAP contributors for CAD, LAD, LCX, and RCA using the reusable ML explainer.",
)
def explain(patient: PatientInput, service: ExplanationService = Depends(explanation_service)) -> dict:
    try:
        return service.explain(patient.to_ml_dataframe())
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.exception("Unexpected explanation failure")
        raise HTTPException(status_code=500, detail="Unexpected explanation error.") from exc


@router.post(
    "/analyze",
    response_model=AnalyzeResponse,
    summary="Combined prediction and explanation response",
    description="Primary frontend endpoint returning calibrated predictions, 3D-friendly visualization values, and SHAP explanations.",
)
def analyze(
    patient: PatientInput,
    predictor: PredictionService = Depends(prediction_service),
    explainer: ExplanationService = Depends(explanation_service),
) -> dict:
    try:
        patient_df = patient.to_ml_dataframe()
        prediction = predictor.predict(patient_df)
        explanation = explainer.explain(patient_df)
        return {**prediction, "explanations": explanation["explanations"]}
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.exception("Unexpected analyze failure")
        raise HTTPException(status_code=500, detail="Unexpected analyze error.") from exc


@router.get(
    "/model-info",
    summary="Public frozen model metadata",
    description="Safe model metadata for frontend display. Does not expose filesystem paths.",
)
def model_info(registry: ModelRegistry = Depends(registry_dependency)) -> dict:
    return registry.public_model_info()
