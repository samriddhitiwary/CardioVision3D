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

### GET /api/patients/
Retrieves all patients belonging to the authenticated doctor.

### GET /api/patients/{patient_id}
Retrieves a specific patient. Returns `404 Not Found` if the patient does not exist or belongs to a different doctor.

### PUT /api/patients/{patient_id}
Partially updates a patient's details or clinical data.

**Request Body (JSON):**
```json
{
  "age": 46,
  "clinical_data": {
    "sysbp": 125,
    "diab": 0
  }
}
```

### DELETE /api/patients/{patient_id}
Deletes a specific patient. Returns `204 No Content` on success.
