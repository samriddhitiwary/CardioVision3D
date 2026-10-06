from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db, get_current_user
from backend.app.db.models import Doctor, Patient
from backend.app.schemas.patient import PatientCreate, PatientUpdate, PatientResponse, PatientReportRequest, PatientInput
from backend.app.services.pdf_builder import generate_clinical_report
from backend.app.services.storage import StorageService
from backend.app.api.predictions import prediction_service, explanation_service
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
def create_patient(
    patient_in: PatientCreate,
    db: Session = Depends(get_db),
    current_user: Doctor = Depends(get_current_user)
):
    db_patient = Patient(
        **patient_in.model_dump(),
        doctor_id=current_user.id
    )
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return db_patient

@router.get("/", response_model=List[PatientResponse])
def read_patients(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Doctor = Depends(get_current_user)
):
    patients = db.query(Patient).filter(Patient.doctor_id == current_user.id).offset(skip).limit(limit).all()
    return patients

@router.get("/{patient_id}", response_model=PatientResponse)
def read_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: Doctor = Depends(get_current_user)
):
    patient = db.query(Patient).filter(Patient.id == patient_id, Patient.doctor_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient

@router.put("/{patient_id}", response_model=PatientResponse)
def update_patient(
    patient_id: int,
    patient_in: PatientUpdate,
    db: Session = Depends(get_db),
    current_user: Doctor = Depends(get_current_user)
):
    patient = db.query(Patient).filter(Patient.id == patient_id, Patient.doctor_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    update_data = patient_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(patient, field, value)
        
    db.commit()
    db.refresh(patient)
    return patient

@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: Doctor = Depends(get_current_user)
):
    patient = db.query(Patient).filter(Patient.id == patient_id, Patient.doctor_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    db.delete(patient)
    db.commit()
    return None

@router.post("/{patient_id}/report", response_model=PatientResponse)
def generate_patient_report(
    patient_id: int,
    report_req: PatientReportRequest,
    db: Session = Depends(get_db),
    current_user: Doctor = Depends(get_current_user),
    predictor = Depends(prediction_service),
    explainer = Depends(explanation_service)
):
    patient = db.query(Patient).filter(Patient.id == patient_id, Patient.doctor_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    if not patient.clinical_data:
        raise HTTPException(status_code=400, detail="Patient has no clinical data")
        
    # 1. ML Analysis
    try:
        # Combine clinical data with root fields
        full_data = {
            **patient.clinical_data,
            "age": patient.age,
            "sex": patient.gender
        }
        patient_input = PatientInput(**full_data)
        patient_df = patient_input.to_ml_dataframe()
        raw_predictions = predictor.predict(patient_df)
        raw_explanations = explainer.explain(patient_df)
    except Exception as e:
        logger.exception("ML analysis failed")
        raise HTTPException(status_code=500, detail=f"ML analysis failed: {str(e)}")
        
    # Transform data for PDF builder
    # risk_score is 0.0-1.0 from ML, we want 0-100% for display
    predictions = {}
    if "predictions" in raw_predictions:
        for target, pred in raw_predictions["predictions"].items():
            predictions[target] = {"risk_score": round(pred["risk_score"] * 100, 1)}
            
    explanations = []
    if "explanations" in raw_explanations and "CAD" in raw_explanations["explanations"]:
        for factor in raw_explanations["explanations"]["CAD"]["top_increasing_contributors"]:
            explanations.append({
                "feature": factor["feature"],
                "impact": factor["contribution"]
            })
            
    # 2. PDF Generation
    try:
        pdf_bytes = generate_clinical_report(
            patient_data=patient.clinical_data,
            predictions=predictions,
            explanations=explanations,
            image_base64=report_req.image_base64
        )
    except Exception as e:
        logger.exception("PDF generation failed")
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")
        
    # 3. Supabase Upload
    try:
        storage = StorageService()
        file_name = f"{current_user.id}_{patient_id}_{uuid.uuid4().hex[:8]}.pdf"
        pdf_link = storage.upload_pdf_bytes(pdf_bytes, file_name)
        if not pdf_link:
            raise Exception("Storage service returned None")
    except Exception as e:
        logger.exception("PDF upload failed")
        raise HTTPException(status_code=500, detail=f"PDF upload failed: {str(e)}")
        
    # 4. Save to DB
    patient.pdf_link = pdf_link
    db.commit()
    db.refresh(patient)
    return patient
