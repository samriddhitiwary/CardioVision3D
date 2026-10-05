from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import logging

from backend.app.api.deps import get_db, get_current_user
from backend.app.db.models import Doctor, Patient
from backend.app.schemas.risk_story import RiskStoryRequest, RiskStoryResponse
from backend.app.schemas.patient import PatientInput
from backend.app.api.predictions import prediction_service, explanation_service
from backend.app.services.risk_story_service import RiskStoryService

logger = logging.getLogger(__name__)

router = APIRouter()
risk_story_service = RiskStoryService()

@router.post("/{patient_id}/risk-story", response_model=RiskStoryResponse)
async def generate_risk_story(
    patient_id: int,
    request: RiskStoryRequest,
    db: Session = Depends(get_db),
    current_user: Doctor = Depends(get_current_user),
    predictor = Depends(prediction_service),
    explainer = Depends(explanation_service)
):
    # Enforce Patient Ownership
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient or patient.doctor_id != current_user.id:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    if not patient.clinical_data:
        raise HTTPException(status_code=400, detail="Patient has no clinical data")
        
    try:
        # Recompute authoritative analysis from ML services
        patient_input = PatientInput(**patient.clinical_data)
        patient_df = patient_input.to_ml_dataframe()
        raw_predictions = predictor.predict(patient_df)
        raw_explanations = explainer.explain(patient_df)
    except Exception as e:
        logger.exception("ML analysis failed")
        raise HTTPException(status_code=500, detail=f"ML analysis failed: {str(e)}")
        
    # Generate risk story using the ML outputs
    story_response = await risk_story_service.generate_risk_story(
        predictions=raw_predictions,
        explanations=raw_explanations,
        patient_data=patient.clinical_data,
        patient=patient,
        db=db,
        force_regenerate=request.force_regenerate
    )
    
    return story_response
