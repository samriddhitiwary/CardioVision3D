# Backend Project Structure & Documentation

This document provides a comprehensive overview of the `backend/` directory, detailing the purpose of every file, API implementations, database models, and critical service architectures.

## Folder Tree

```text
backend/app/
├── api/
│   ├── deps.py
│   ├── health.py
│   ├── predictions.py
│   ├── routers.py
│   └── endpoints/
│       ├── auth.py
│       ├── patients.py
│       └── risk_story.py
├── core/
│   ├── config.py
│   ├── model_registry.py
│   ├── security.py
│   └── supabase_client.py
├── db/
│   ├── database.py
│   └── models.py
├── integrations/
│   └── gemini_client.py
├── schemas/
│   ├── auth.py
│   ├── doctor.py
│   ├── patient.py
│   ├── prediction.py
│   └── risk_story.py
├── services/
│   ├── explanation_service.py
│   ├── pdf_builder.py
│   ├── prediction_service.py
│   ├── risk_story_prompt.py
│   ├── risk_story_service.py
│   └── storage.py
├── utils/
│   └── analysis_fingerprint.py
└── main.py
```

## File Explanations & Component Details

### 1. `app/main.py`
**Purpose**: The FastAPI application entry point. 
**Details**: Initializes the FastAPI app, configures CORS, and includes the main API router. It serves as the root ASGI application for `uvicorn`.

---

### 2. `app/api/` (Controllers / Routers)
This directory houses all API route definitions and endpoint handlers.

#### `endpoints/auth.py`
**APIs Implemented**:
- `POST /api/auth/register`: Registers a new `Doctor` in the database.
- `POST /api/auth/login`: Authenticates a doctor using bcrypt hashing and returns JWT access & refresh tokens.
- `POST /api/auth/refresh`: Exchanges a valid refresh token for a new access token.
- `POST /api/auth/logout`: Revokes a refresh token by deleting it from the database.

#### `endpoints/patients.py`
**APIs Implemented**:
- `POST /api/patients/`: Creates a new patient profile linked to the authenticated doctor.
- `GET /api/patients/`: Retrieves all patients belonging to the doctor.
- `GET /api/patients/{patient_id}`: Retrieves specific patient details.
- `PUT /api/patients/{patient_id}`: Partially updates a patient's clinical data or analysis data.
- `DELETE /api/patients/{patient_id}`: Deletes a patient.
- `POST /api/patients/{patient_id}/report`: Triggers the entire Clinical Report PDF generation pipeline (ML Prediction -> SHAP Explanation -> PDF Builder -> Supabase Storage Upload -> DB Update).

#### `endpoints/risk_story.py`
**APIs Implemented**:
- `POST /api/patients/{patient_id}/risk-story`: Generates or retrieves a cached clinical narrative explaining CAD risk and coronary artery stenosis using Gemini AI, with deterministic fallback and authoritative ML overrides.

#### `health.py`
**APIs Implemented**:
- `GET /health`: Basic health-check returning service and model-load status. Note: Mounted at root `/health`.

#### `predictions.py`
**APIs Implemented**:
- `GET /api/v1/model-info`: Returns ML model metadata.
- `POST /api/v1/predict`: Runs fast ML predictions.
- `POST /api/v1/explain`: Computes SHAP explainability variables.
- `POST /api/v1/analyze`: Combined endpoint for both predictions and explanations.

#### `deps.py`
**Purpose**: FastAPI Dependency Injection handlers.
**Details**: Contains `get_db()` for providing SQLAlchemy database sessions per request, and `get_current_user()` to validate JWT Bearer tokens and extract the authenticated `Doctor` entity.

#### `routers.py`
**Purpose**: Aggregates all individual routers (`auth`, `patients`, `risk_story`, `predictions`, `health`) into one unified `api_router` mounted in `main.py`.

---

### 3. `app/db/` (Database Layer)
Handles the ORM setup and actual database tables.

#### `database.py`
**Purpose**: Initializes the SQLAlchemy `Engine` and `SessionLocal` maker using the `DATABASE_URL` (Supabase Postgres) defined in environment variables.

#### `models.py`
**Purpose**: Defines the SQLAlchemy declarative models (Database Tables).
**Data Models & Relations**:
1. **`Doctor`**:
   - `id`: Integer (Primary Key)
   - `email`: String (Unique)
   - `hashed_password`: String (bcrypt)
   - `full_name`: String
   - **Relations**: Has a one-to-many relationship (`patients`, `refresh_tokens`).
2. **`Patient`**:
   - `id`: Integer (Primary Key)
   - `doctor_id`: Integer (Foreign Key to `Doctor.id`)
   - `name`, `age`, `gender`: Strings/Integers
   - `clinical_data`: **JSONB** (Flexible JSON column storing 55 dynamic clinical features required by the ML model).
   - `analysis_data`: **JSONB** (Serialized inference payload from `/analyze` or wrapped client analysis object).
   - `pdf_link`: String (Stores the public Supabase URL of the generated report).
   - `risk_story`: **JSONB** (Cached structured AI narrative object).
   - `risk_story_fingerprint`: String (SHA-256 hash derived from clinical inputs, ML outputs, and model version).
   - `risk_story_model`: String (Tracks model used: e.g., `gemini-3.8-flash` or `fallback-deterministic`).
   - `risk_story_generated_at`: DateTime (Timestamp of generation).
   - **Relations**: Belongs to one `Doctor`.
3. **`RefreshToken`**:
   - `id`: Integer (Primary Key)
   - `token`: String (Unique JWT string)
   - `doctor_id`: Integer (Foreign Key to `Doctor.id`)
   - **Relations**: Belongs to one `Doctor`.

---

### 4. `app/schemas/` (Pydantic Validation Models)
Defines the strictly-typed structures used for API Request/Response validation.

#### `doctor.py` & `auth.py`
**Structure**: Defines `DoctorCreate` (registration payload), `DoctorResponse` (excludes password), and `Token` / `TokenPayload` structures for JWT claims.

#### `patient.py`
**Structure**: Defines `PatientCreate`, `PatientUpdate`, and `PatientResponse`.
- **`clinical_data` Validation**: Strictly validated using a dynamic `create_model` function that reads the 55 exact features (e.g., `age`, `sysbp`, `chol`) directly from the ML schema frozen artifact `ml/artifacts/models/input_schema.json`.
- **`PatientResponse`**: Returns `id`, `doctor_id`, `name`, `age`, `gender`, `clinical_data`, `analysis_data`, `pdf_link`, `risk_story`, `risk_story_model`, and `created_at`.
- **`PatientReportRequest`**: Expects `image_base64` property containing the base64 snapshot of the 3D heart model.

#### `prediction.py`
**Structure**: Defines schemas for ML outputs like `PredictionResponse`, `ExplanationFactor`, and `AnalyzeResponse`.

#### `risk_story.py`
**Structure**: Defines schemas for the generative AI narrative:
- `RiskStoryRequest`: Accepts `force_regenerate: bool` and `language: str`.
- `RiskStoryFactor`: Represents individual feature contributions (`feature`, `display_name`, `direction`, `contribution`, `value_text`, `explanation`).
- `RiskStoryVessel`: Per-vessel severity breakdown (`vessel`, `risk_percent`, `severity`).
- `RiskStoryResponse`: Full narrative payload (`headline`, `summary`, `primary_message`, `positive_factors`, `negative_factors`, `vessels`, `highest_risk_vessel`, `visualization_steps`, `disclaimer`).

---

### 5. `app/services/` (Business Logic & External Services)
Contains isolated business logic decoupling controllers from implementations.

#### `prediction_service.py` & `explanation_service.py`
**Purpose**: Interfaces with `catboost` and `shap` to load the serialized ML models and compute risk scoring and feature importance logic.

#### `storage.py`
**Purpose**: Supabase Storage operations.
**Details**: Implements `StorageService.upload_pdf_bytes()` which pushes raw PDF byte data to the `patient-reports` Supabase bucket and returns the generated public URL.

#### `pdf_builder.py`
**Purpose**: Generates the formal Clinical Decision Support PDF Report.
**PDF Structure Details**:
Uses `fpdf2` to build a multi-page PDF entirely in-memory (bytes) to avoid local file I/O constraints.
- **Page 1**:
  - **Header**: "CardioVision3D - Clinical Decision Support Report"
  - **Section 1**: Patient Profile & Clinical Inputs (Dynamically iterates through all 55 items in `patient.clinical_data` and places them into a dense 4-column bordered table).
  - **Section 2**: Risk Predictions & Vessel Stenosis Results (Displays CAD, LAD, LCX, RCA probability percentages).
- **Page Break**: Forces the layout to split.
- **Page 2**:
  - **Section 3**: Clinical Explainability (Maps actual SHAP `feature` names like "Age" or "Obesity" to their numerical impact).
  - **Section 4**: 3D Risk Mapping (Decodes the frontend-provided `image_base64` standard data URI and injects the snapshot of the 3D heart model into the PDF).
  - **Disclaimer Footer**: Appends a clinical safety warning.

#### `risk_story_service.py`
**Purpose**: Orchestrates AI Risk Story generation, caching, and fallback resilience.
**Details**:
- Computes SHA-256 cache fingerprints via `analysis_fingerprint.py`. Returns cached DB records instantly when unchanged.
- Formats prompts via `risk_story_prompt.py` and queries `GeminiRiskStoryClient`.
- **`_override_authoritative()`**: Overrides LLM output with deterministic CatBoost risk percentages and TreeSHAP impact rankings to prevent numerical hallucinations.
- **`_build_fallback()`**: Assembles a deterministic fallback narrative using TreeSHAP rankings when all LLMs fail.

#### `risk_story_prompt.py`
**Purpose**: Builds formatted, constrained prompts injecting patient clinical data, vessel predictions, and top TreeSHAP contributors for structured LLM narrative generation.

---

### 6. `app/core/` (Core Configuration)
Global app settings and low-level setup.

#### `config.py`
**Purpose**: Validates all `.env` environment variables using `pydantic-settings`:
- Server & Database: `BACKEND_HOST`, `BACKEND_PORT`, `DATABASE_URL`, `CORS_ORIGINS`.
- Security: `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS`.
- Supabase: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`.
- Gemini & AI Narrative: `GEMINI_API_KEY`, `RISK_STORY_MODEL`, `RISK_STORY_FALLBACK_MODELS`, `RISK_STORY_THINKING_LEVEL`, `RISK_STORY_MAX_OUTPUT_TOKENS`, `RISK_STORY_TIMEOUT_SECONDS`, `RISK_STORY_CACHE_ENABLED`.

#### `security.py`
**Purpose**: Implements `bcrypt` password hashing and `PyJWT` logic to mint and decode access/refresh tokens.

#### `supabase_client.py`
**Purpose**: Initializes and exposes the official `supabase-py` client using the `SUPABASE_SERVICE_KEY` so the backend can bypass RLS for administrative storage operations.

#### `model_registry.py`
**Purpose**: Global cache for loading CatBoost ML models securely into memory on app startup.

---

### 7. `app/integrations/` (External AI Integrations)
Third-party AI service clients.

#### `gemini_client.py`
**Purpose**: Wraps the Google GenAI SDK (`google-genai`).
**Details**:
- Uses structured JSON outputs constrained by `RiskStoryResponse` (`response_mime_type="application/json"`).
- Implements stateful model rotation across `primary_model` (`RISK_STORY_MODEL`) and `fallback_models` (`RISK_STORY_FALLBACK_MODELS`).

---

### 8. `app/utils/` (Utility Functions)
Cross-cutting helper modules.

#### `analysis_fingerprint.py`
**Purpose**: Computes a deterministic SHA-256 fingerprint from canonical JSON of patient clinical data, ML outputs, and model version for cache validation.
