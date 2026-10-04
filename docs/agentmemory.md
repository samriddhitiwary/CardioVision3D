# Agent Memory Context

*This file serves as a context ingestion point for AI agents working on the CardioVision3D codebase.*

## Project Overview
**Cardio 3D AI** is an AI-powered cardiovascular risk prediction and interactive 3D heart visualization system. It uses a monolithic repository with a FastAPI backend, a reproducible ML workspace, and a React/Vite/TypeScript frontend.

## State of the Backend (FastAPI)
- **Database setup**: We migrated from a local SQLite/PostgreSQL setup to a cloud-based **Supabase PostgreSQL** instance. 
- **Authentication**: Custom JWT-based authentication is fully implemented.
  - Hashing uses native `bcrypt` (we bypassed `passlib` due to a 72-byte string length bug).
  - Auth models (`Doctor`) and token handling exist in `app/core/security.py` and `app/api/endpoints/auth.py`.
- **Patient Management**: Complete CRUD endpoints exist under `/api/patients/`.
  - Important: Patients are strictly tied to the authenticated doctor's `id`. Cross-access between doctors throws `404 Not Found`.
  - The `clinical_data` is stored as a `JSONB` column in PostgreSQL to hold 55 dynamic features safely.
- **Machine Learning Integration**: 
  - The `schemas/patient.py` dynamically builds Pydantic validation models using the freeze-framed ML schema located at `ml/artifacts/models/input_schema.json`.
  - ML features are strictly mapped. Categorical ML features must be passed as string values (e.g., `"0"`, `"1"`, `"N"`, `"Y"`).
- **ORM / Migrations**: Handled via SQLAlchemy and Alembic. The initial migration is complete and pushed to the `alembic/versions/` directory.

## Environment & Configuration
- Configuration is loaded via `pydantic-settings` from a `.env` file placed in the repository root.
- Required `.env` keys:
  - `VITE_API_BASE_URL`
  - `BACKEND_HOST`
  - `BACKEND_PORT`
  - `DATABASE_URL` (Supabase connection string)
  - `SECRET_KEY` (For JWT)
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_KEY`

## Supabase Storage & PDF Generation
- We successfully integrated `fpdf2` and the `supabase` Python SDK.
- The `patient-reports` bucket was created via the API to store dynamically generated clinical reports.
- **Report Generation (`POST /api/patients/{patient_id}/report`)**:
  - Validates the base64 3D heart snapshot from the frontend.
  - Generates an in-memory PDF combining patient clinical data (formatted in a grid), ML predictions, and SHAP explainability variables.
  - Automatically pushes the PDF bytes to the Supabase storage bucket, gets the public URL, and saves it to the `pdf_link` column in the `Patient` database row.

## API Documentation & Testing
- The definitive API structure is documented in `docs/api_contract.md`.
- A fully functional **Postman Collection** is available at `docs/CardioVision3D_Postman_Collection.json`. It includes pre-configured dummy payloads for Auth, Patient creation, and ML Predictions.

## Docker
- `docker-compose up --build` works correctly. It mounts the repository root to `/app` inside the container so that `config.py` can cleanly resolve paths across both the `backend/` and `ml/` workspaces.

## Next Steps / Active Tasks
- The next major milestone is **Task 4: Frontend Auth Integration**, bridging the React UI to the fully operational backend auth endpoints.
