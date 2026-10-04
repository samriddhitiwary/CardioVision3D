from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import jwt

from backend.app.api.deps import get_db, get_current_user
from backend.app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token
from backend.app.core.config import get_settings
from backend.app.db.models import Doctor, RefreshToken
from backend.app.schemas.auth import Token, RefreshTokenRequest
from backend.app.schemas.doctor import DoctorCreate, DoctorResponse

settings = get_settings()
router = APIRouter()

@router.post("/register", response_model=DoctorResponse)
def register(doctor_in: DoctorCreate, db: Session = Depends(get_db)):
    user = db.query(Doctor).filter(Doctor.email == doctor_in.email).first()
    if user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(doctor_in.password)
    db_doctor = Doctor(email=doctor_in.email, full_name=doctor_in.full_name, hashed_password=hashed_password)
    db.add(db_doctor)
    db.commit()
    db.refresh(db_doctor)
    return db_doctor

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(Doctor).filter(Doctor.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)
    
    payload = jwt.decode(refresh_token, settings.secret_key, algorithms=[settings.algorithm])
    expires_at = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
    
    db_token = RefreshToken(token=refresh_token, doctor_id=user.id, expires_at=expires_at)
    db.add(db_token)
    db.commit()
    
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

@router.post("/refresh", response_model=Token)
def refresh_token(request: RefreshTokenRequest, db: Session = Depends(get_db)):
    credentials_exception = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    try:
        payload = jwt.decode(request.refresh_token, settings.secret_key, algorithms=[settings.algorithm])
        if payload.get("type") != "refresh":
            raise credentials_exception
        user_id = payload.get("sub")
    except jwt.PyJWTError:
        raise credentials_exception
        
    db_token = db.query(RefreshToken).filter(
        RefreshToken.token == request.refresh_token,
        RefreshToken.revoked == False
    ).first()
    
    if not db_token:
        raise credentials_exception
        
    access_token = create_access_token(subject=user_id)
    return {"access_token": access_token, "refresh_token": request.refresh_token, "token_type": "bearer"}

@router.post("/logout")
def logout(request: RefreshTokenRequest, db: Session = Depends(get_db), current_user: Doctor = Depends(get_current_user)):
    db_token = db.query(RefreshToken).filter(
        RefreshToken.token == request.refresh_token,
        RefreshToken.doctor_id == current_user.id
    ).first()
    
    if db_token:
        db.delete(db_token)
        db.commit()
        
    return {"message": "Successfully logged out"}
