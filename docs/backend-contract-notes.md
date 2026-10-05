# Backend Contract Notes

*Note: These notes clarify ambiguities in the Master Context based on direct inspection of the backend code. Future phases must adhere to these facts rather than the original guide where they differ.*

### 1. Does `PatientUpdate` accept `analysis_data`? Does `PUT` merge or replace `clinical_data`?
- **Yes**, `PatientUpdate` explicitly accepts `analysis_data` as `dict[str, Any] | None`.
- **Replace**: The `PUT` endpoint iterates over provided keys and applies them via `setattr(patient, field, value)`. This replaces the entire `clinical_data` JSON blob rather than doing a deep merge.
- *Refs*: `backend/app/schemas/patient.py:112`, `backend/app/api/endpoints/patients.py:65-67`.

### 2. Does `PatientResponse` include `risk_story`, `risk_story_model`, `risk_story_generated_at`?
- **No**. `PatientResponse` inherits from `PatientBase` but omits the risk story database columns entirely. The frontend must be aware that fetching a patient will not retrieve their previously generated risk story.
- *Refs*: `backend/app/schemas/patient.py:115-122`.

### 3. What is the exact shape stored in `analysis_data`?
- It stores exactly the JSON returned by the `/analyze` endpoint (`AnalyzeResponse`). The backend schema for `analysis_data` is loosely typed as `dict[str, Any]`, so whatever the frontend PUTs will be stored.
- *Refs*: `backend/app/api/predictions.py:68-72`, `backend/app/schemas/patient.py:118`.

### 4. Does `GET /api/patients/` return `clinical_data` and `analysis_data` for every patient?
- **Yes**. It returns a list of `PatientResponse` objects, which carry both `clinical_data` and `analysis_data` in the list payload.
- *Refs*: `backend/app/api/endpoints/patients.py:33`, `backend/app/schemas/patient.py:102,118`.

### 5. Are `clinical_data` values validated on create/update, or only on `/analyze`?
- **Only on `/analyze`** (and `/risk-story`). Create and update endpoints loosely accept `dict[str, Any]`. The strict type coercion and feature validation against the schema only occur when parsed into `PatientInput` during an ML operation.
- *Refs*: `backend/app/schemas/patient.py:70-96,111`.

### 6. Which claims does the access JWT contain? Is there a "current user" endpoint?
- The JWT contains only `exp`, `sub` (stringified user ID), and `type`. It does **not** contain `name` or `email`.
- There is **no** `/me` or "current user" endpoint. The frontend must rely entirely on data captured at login/registration to display the doctor's name or email.
- *Refs*: `backend/app/core/security.py:22`, `backend/app/api/endpoints/auth.py`.

### 7. Does the risk-story response carry any flag that tells fallback from AI-generated?
- **No flag exists**. The `RiskStoryResponse` model is identical for both paths. The only way the frontend can detect a fallback is by matching the `headline` against the exact hardcoded string `"Model explanation available"`.
- *Refs*: `backend/app/schemas/risk_story.py:25-35`.

### 8. What are CORS origins and are `Authorization` headers allowed?
- Allowed origins are `http://localhost:5173` and `http://127.0.0.1:5173`.
- **Yes**, `Authorization` headers are fully supported because the backend is configured with `allow_headers=["*"]`.
- *Refs*: `backend/app/core/config.py:29-35`, `backend/app/main.py:53`.
