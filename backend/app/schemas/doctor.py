from pydantic import BaseModel, EmailStr
from datetime import datetime

class DoctorBase(BaseModel):
    email: EmailStr
    full_name: str

class DoctorCreate(DoctorBase):
    password: str

class DoctorResponse(DoctorBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
