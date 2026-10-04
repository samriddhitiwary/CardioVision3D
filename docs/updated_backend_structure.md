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
│       └── patients.py
├── core/
│   ├── config.py
│   ├── model_registry.py
│   ├── security.py
│   └── supabase_client.py
├── db/
│   ├── database.py
│   └── models.py
├── schemas/
│   ├── auth.py
│   ├── doctor.py
│   ├── patient.py
│   └── prediction.py
├── services/
│   ├── explanation_service.py
│   ├── pdf_builder.py
│   ├── prediction_service.py
│   └── storage.py
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
- `PUT /api/patients/{patient_id}`: Partially updates a patient's clinical data.
- `DELETE /api/patients/{patient_id}`: Deletes a patient.
- `POST /api/patients/{patient_id}/report`: Triggers the entire Clinical Report PDF generation pipeline (ML Prediction -> SHAP Explanation -> PDF Builder -> Supabase Storage Upload -> DB Update).

#### `health.py`
**APIs Implemented**:
- `GET /health`: Basic health-check returning service status.

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
**Purpose**: Aggregates all individual routers (`auth`, `patients`, `predictions`, `health`) into one unified `api_router` that is mounted in `main.py`.

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
   - `pdf_link`: String (Stores the public Supabase URL of the generated report).
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
**Crucial Detail**: `clinical_data` is strictly validated using a dynamic `create_model` function that reads the 55 exact features (e.g., `age`, `sysbp`, `chol`) directly from the ML schema frozen artifact `ml/artifacts/models/input_schema.json`.
Also defines `PatientReportRequest` which expects an `image_base64` property for the 3D heart snapshot.

#### `prediction.py`
**Structure**: Defines schemas for ML outputs like `PredictionResponse`, `ExplanationFactor`, and `AnalyzeResponse`.

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

---

### 6. `app/core/` (Core Configuration)
Global app settings and low-level setup.

#### `config.py`
**Purpose**: Validates all `.env` environment variables using `pydantic-settings` (e.g., `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SECRET_KEY`).

#### `security.py`
**Purpose**: Implements `bcrypt` password hashing and `PyJWT` logic to mint and decode access/refresh tokens.

#### `supabase_client.py`
**Purpose**: Initializes and exposes the official `supabase-py` client using the `SUPABASE_SERVICE_KEY` so the backend can bypass RLS for administrative storage operations.

#### `model_registry.py`
**Purpose**: Global cache for loading CatBoost ML models securely into memory on app startup.
