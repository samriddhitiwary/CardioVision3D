import sys
from pathlib import Path
sys.path.insert(0, str(Path("..").resolve()))
from backend.app.schemas.patient import PatientInput

try:
    print(PatientInput.model_fields['sex'].annotation)
except Exception as e:
    print(e)
