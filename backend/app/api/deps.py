from typing import Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from sqlalchemy.orm import Session

from backend.app.core.config import get_settings
from backend.app.db.database import SessionLocal
from backend.app.db.models import Doctor
from backend.app.schemas.auth import TokenPayload

settings = get_settings()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)) -> Doctor:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        token_data = TokenPayload(**payload)
        
        if token_data.type != "access":
            raise credentials_exception
            
    except jwt.PyJWTError:
        raise credentials_exception
        
    user = db.query(Doctor).filter(Doctor.id == int(token_data.sub)).first()
    if user is None:
        raise credentials_exception
    return user
