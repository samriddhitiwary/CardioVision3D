import sys
from pathlib import Path
sys.path.insert(0, str(Path("..").resolve()))
from backend.app.schemas.patient import PatientInput

print("PatientInput fields:", sorted(PatientInput.model_fields.keys()))
