from fastapi import APIRouter
from backend.app.api.endpoints import auth, patients, risk_story

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(patients.router, prefix="/patients", tags=["patients"])
api_router.include_router(risk_story.router, prefix="/patients", tags=["risk_story"])

