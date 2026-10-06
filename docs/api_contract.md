# CardioTwin API Contract

Base URL for local development: `http://127.0.0.1:8000`

Start command from the repository root:

```powershell
.\backend\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --reload
```

All prediction responses include this disclaimer:

> Educational / decision-support prototype only. Predictions are model risk estimates and are not a medical diagnosis or substitute for professional evaluation or coronary imaging.

## Patient Request Schema

The API accepts one patient per request using safe snake_case JSON keys. These keys map deterministically to the exact 55 frozen ML feature names from `ml/artifacts/models/input_schema.json`.

Examples:

- `typical_chest_pain` maps to `Typical Chest Pain`
- `ef_tte` maps to `EF-TTE`
- `region_rwma` maps to `Region RWMA`

Target fields are forbidden as inputs: `Cath`, `LAD`, `LCX`, `RCA`, plus their snake_case aliases.

Unknown fields, missing fields, invalid categorical values, NaN, and infinite numeric values return HTTP `422`.

## GET /health

Returns service and model-load status.

> **Note**: This endpoint is mounted directly at the root server URL (`/health`), NOT under `/api` or `/api/v1`.

```json
{
  "status": "ok",
  "model_version": "1.0.0",
  "models_loaded": true
}
```

## GET /api/v1/model-info

Returns safe public metadata:

- model version
- dataset name
- targets
- algorithm names
- frozen thresholds
- calibration method
- validation metrics
- validation methodology
- limitations

No local filesystem paths are returned.

## POST /api/v1/predict

Fast endpoint. It does not compute SHAP.

Response:

```json
{
  "model_version": "1.0.0",
  "predictions": {
    "CAD": {
      "probability": 0.84,
      "threshold": 0.3,
      "positive": true,
      "risk_score": 0.84,
      "visualization_band": "high",
      "band_basis": "UI visualization band based on model probability; not a clinical severity category."
    }
  },
  "visualization": {
    "LAD": {
      "probability": 0.72,
      "threshold": 0.4,
      "positive": true,
      "risk_score": 0.72,
      "visualization_band": "high",
      "band_basis": "UI visualization band based on model probability; not a clinical severity category."
    }
  },
  "disclaimer": "..."
}
```

`probability` is the calibrated probability from the saved frozen pipeline. `threshold` is loaded from model metadata. `positive` is `probability >= threshold`.

`risk_score` is the same calibrated probability, provided for 3D rendering. `visualization_band` is a UI-only display band:

- `low`: probability `< 0.33`
- `moderate`: probability `>= 0.33` and `< 0.66`
- `high`: probability `>= 0.66`

These bands are not clinical severity categories.

## POST /api/v1/explain

Computes SHAP explanations for all targets.

Response:

```json
{
  "model_version": "1.0.0",
  "explanations": {
    "CAD": {
      "probability": 0.84,
      "threshold": 0.3,
      "classification": "positive",
      "top_increasing_contributors": [
        {
          "feature": "Age",
          "raw_value": 67,
          "contribution": 0.42,
          "direction": "increases_model_score",
          "ui_label": "Increases predicted risk"
        }
      ],
      "top_decreasing_contributors": [],
      "explanation_method": "shap.LinearExplainer",
      "explanation_scope": "SHAP values explain the underlying fitted decision estimators; calibrated probability comes from the saved pipeline."
    }
  },
  "disclaimer": "..."
}
```

Positive SHAP contributions increase the model score toward the positive class. Negative SHAP contributions decrease it. They do not prove medical causality.

## POST /api/v1/analyze

Primary frontend endpoint. Returns `/predict` plus `/explain` data in one response:

```json
{
  "model_version": "1.0.0",
  "predictions": {},
  "visualization": {},
  "explanations": {},
  "disclaimer": "..."
}
```

## Auth APIs

### POST /api/auth/register
Registers a new doctor account.

**Request Body (JSON):**
```json
{
  "email": "doctor@example.com",
  "full_name": "Dr. John Doe",
  "password": "securepassword123"
}
```

**Response (200 OK):**
```json
{
  "email": "doctor@example.com",
  "full_name": "Dr. John Doe",
  "id": 1,
  "created_at": "2026-10-04T12:00:00Z"
}
```

### POST /api/auth/login
Authenticates a doctor and returns JWT access and refresh tokens.

**Request Body (`application/x-www-form-urlencoded`):**
- `username`: `doctor@example.com`
- `password`: `securepassword123`

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOi...",
  "refresh_token": "eyJhbGciOi...",
  "token_type": "bearer"
}
```

### POST /api/auth/refresh
Issues a new access token using a valid refresh token.

**Request Body (JSON):**
```json
{
  "refresh_token": "eyJhbGciOi..."
}
```

### POST /api/auth/logout
Revokes a refresh token. Requires `Authorization: Bearer <access_token>`.

**Request Body (JSON):**
```json
{
  "refresh_token": "eyJhbGciOi..."
}
```

## Patient Management APIs

All patient APIs require `Authorization: Bearer <access_token>`.

### Patient Response Schema
All patient endpoints returning patient objects (`POST /api/patients/`, `GET /api/patients/`, `GET /api/patients/{patient_id}`, `PUT /api/patients/{patient_id}`, `POST /api/patients/{patient_id}/report`) return the `PatientResponse` schema:

```json
{
  "id": 1,
  "doctor_id": 1,
  "name": "Jane Doe",
  "age": 45,
  "gender": "Female",
  "clinical_data": {
    "sysbp": 120,
    "diab": 0,
    "...": "55 ML features"
  },
  "analysis_data": {
    "model_version": "1.0.0",
    "predictions": { "CAD": { "probability": 0.84, "...": "..." } },
    "visualization": { "LAD": { "...": "..." } },
    "explanations": { "CAD": { "...": "..." } },
    "disclaimer": "..."
  },
  "pdf_link": "https://[PROJECT_REF].supabase.co/storage/v1/object/public/patient-reports/1_1_abc123.pdf",
  "risk_story": {
    "headline": "...",
    "summary": "...",
    "primary_message": "...",
    "positive_factors": [],
    "negative_factors": [],
    "vessels": [],
    "highest_risk_vessel": "LAD",
    "visualization_steps": [],
    "disclaimer": "..."
  },
  "risk_story_model": "gemini-3.8-flash",
  "created_at": "2026-10-04T12:00:00Z"
}
```

> **Data Shape Note**: In some database records or client payloads, `analysis_data` may be wrapped inside an object with metadata: `{ "id": "...", "patient_id": "...", "created_at": "...", "data": { ...AnalyzeResponse } }`. Frontend consumers unwrap `analysis_data.data || analysis_data` prior to Zod validation.

### POST /api/patients/
Creates a new patient profile associated with the authenticated doctor.

**Request Body (JSON):**
```json
{
  "name": "Jane Doe",
  "age": 45,
  "gender": "Female",
  "clinical_data": {
    "sysbp": 120,
    "diab": 0
  }
}
```

**Response (201 Created):** Returns `PatientResponse`.

### GET /api/patients/
Retrieves all patients belonging to the authenticated doctor (with optional query parameters `skip: int = 0`, `limit: int = 100`).

**Response (200 OK):** Returns `list[PatientResponse]`.

### GET /api/patients/{patient_id}
Retrieves a specific patient. Returns `404 Not Found` if the patient does not exist or belongs to a different doctor.

**Response (200 OK):** Returns `PatientResponse`.

### PUT /api/patients/{patient_id}
Partially updates a patient's details, clinical data, analysis data, or pdf link.

**Request Body (JSON):**
```json
{
  "name": "Jane Doe",
  "age": 46,
  "gender": "Female",
  "clinical_data": {
    "sysbp": 125,
    "diab": 0
  },
  "analysis_data": { ... },
  "pdf_link": "https://..."
}
```

**Response (200 OK):** Returns `PatientResponse`.

### DELETE /api/patients/{patient_id}
Deletes a specific patient. Returns `204 No Content` on success.

### POST /api/patients/{patient_id}/report
Generates a PDF clinical report for the patient combining patient data, ML predictions, TreeSHAP explainability, and the 3D heart snapshot; uploads it to Supabase Storage, and updates `pdf_link` in the database.

**Request Body (JSON):**
```json
{
  "image_base64": "data:image/png;base64,iVBORw0K..."
}
```

**Response (200 OK):** Returns updated `PatientResponse` with `pdf_link`.

### POST /api/patients/{patient_id}/risk-story
Generates a personalized, clinical AI Risk Narrative for the patient using the Google GenAI SDK (`google-genai`).

**Request Body (JSON):**
```json
{
  "force_regenerate": false,
  "language": "en"
}
```

**Response (200 OK - `RiskStoryResponse`):**
```json
{
  "headline": "Elevated LAD Stenosis Risk Influenced by Systolic Hypertension and Age",
  "summary": "This 67-year-old patient demonstrates an elevated likelihood of coronary artery disease, with primary vulnerability localized to the Left Anterior Descending (LAD) artery.",
  "primary_message": "Prioritize clinical evaluation and anatomical coronary imaging targeting the LAD territory.",
  "positive_factors": [
    {
      "feature": "Typical Chest Pain",
      "display_name": "Typical Chest Pain",
      "direction": "increases_risk",
      "contribution": 0.42,
      "value_text": "1",
      "explanation": "Primary symptomatic presentation strongly elevating CAD probability."
    },
    {
      "feature": "Age",
      "display_name": "Age",
      "direction": "increases_risk",
      "contribution": 0.35,
      "value_text": "67",
      "explanation": "Advanced age increases arterial stiffness and baseline atherosclerotic risk."
    }
  ],
  "negative_factors": [
    {
      "feature": "EF-TTE",
      "display_name": "EF-TTE",
      "direction": "decreases_risk",
      "contribution": -0.18,
      "value_text": "55",
      "explanation": "Preserved left ventricular ejection fraction is protective against acute decompensation."
    }
  ],
  "vessels": [
    {
      "vessel": "LAD",
      "risk_percent": 72.0,
      "severity": "high"
    },
    {
      "vessel": "LCX",
      "risk_percent": 45.0,
      "severity": "moderate"
    },
    {
      "vessel": "RCA",
      "risk_percent": 28.0,
      "severity": "low"
    }
  ],
  "highest_risk_vessel": "LAD",
  "visualization_steps": [
    "Rotate to the anterior-apical perspective to view the LAD trajectory.",
    "Examine the diagonal branches where occlusion likelihood is greatest."
  ],
  "disclaimer": "AI-generated narrative for educational and clinical decision-support prototype use only. Must be validated by professional medical evaluation."
}
```

#### Operational Characteristics of `/risk-story`:
1. **Deterministic Caching**:
   - Computes a SHA-256 fingerprint from the patient's 55 clinical parameters, ML predictions, and model version.
   - If `patient.risk_story_fingerprint` matches and `force_regenerate=false`, the cached narrative is returned instantly from the database without invoking the LLM API.
2. **Authoritative ML Override**:
   - To prevent LLM hallucinations, `RiskStoryService` unconditionally overrides vessel percentages, severity classifications, and SHAP feature impact values with the true CatBoost & TreeSHAP calculations.
3. **Multi-Model Stateful Resilience**:
   - Client rotates through configured models (`RISK_STORY_MODEL` -> `RISK_STORY_FALLBACK_MODELS`).
   - If all models fail, a deterministic fallback story is returned (with headline `"Model explanation available"`) without crashing or raising 500 errors to the client.
