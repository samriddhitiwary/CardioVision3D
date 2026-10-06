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
  - The `analysis_data` column stores ML inference output (`AnalyzeResponse` or wrapped analysis object).
  - The `PatientResponse` schema includes `analysis_data`, `pdf_link`, `risk_story`, `risk_story_model`, and `created_at`.
- **Machine Learning Integration**: 
  - The `schemas/patient.py` dynamically builds Pydantic validation models using the freeze-framed ML schema located at `ml/artifacts/models/input_schema.json`.
  - ML features are strictly mapped. Categorical ML features must be passed as string values (e.g., `"0"`, `"1"`, `"N"`, `"Y"`).
  - Fast inference via `/api/v1/predict` and SHAP explainability via `/api/v1/explain` (combined in `/api/v1/analyze`).
- **AI Risk Story (Gemini Generative Service)**:
  - Generates natural-language risk narratives under `POST /api/patients/{patient_id}/risk-story`.
  - Integrates the Google GenAI SDK (`google-genai`) with structured output enforcement (`RiskStoryResponse`).
  - **Hallucination Guardrails**: Employs an authoritative override that overwrites LLM vessel probabilities, severity bands, and top SHAP factors with the deterministic CatBoost & TreeSHAP calculations.
  - **Resilience & Stateful Fallback**: Tracks model failures statefully across `RISK_STORY_MODEL` (e.g., `gemini-3.8-flash`) and `RISK_STORY_FALLBACK_MODELS` (e.g., `gemini-3.5-flash`), ultimately falling back to a deterministic template if all LLMs fail.
  - **Deterministic Caching**: Caches generated narratives in PostgreSQL (`Patient.risk_story`, `risk_story_fingerprint`, `risk_story_model`, `risk_story_generated_at`) keyed by a SHA-256 fingerprint of the 55 inputs + ML outputs. Supports forced regeneration via `force_regenerate=true`.
- **ORM / Migrations**: Handled via SQLAlchemy and Alembic. The initial migration is complete and pushed to the `alembic/versions/` directory.
- **Health Check**: Root endpoint is `GET /health` returning `{ status: "ok", model_version: "...", models_loaded: true }`. (Note: Mounted at root `/health`, not `/api/health`).

## State of the Frontend (UI Overhaul Complete)
- **Architecture**: Modern Single Page Application built with React 18, Vite, TypeScript, Tailwind CSS, Lucide icons, Three.js, and Recharts.
- **Frontend Overhaul Milestones (Phases 01–09 Complete)**:
  - **Phase 01 - Foundation**: Dark/light theme tokens, typography, custom scrollbars, and accessible component primitives (Card, Button, Input, Modal, Badge, Tooltip).
  - **Phase 02 - App Shell & Navigation**: Persistent sidebar, topbar with user profile, doctor logout, breadcrumbs, responsive drawer, and `ServerStatusBanner`.
  - **Phase 03 - Dashboard**: CAD risk breakdown, high-risk watchlist, recent assessments table, highest vessel distribution chart, and system metric counters.
  - **Phase 04 - Patient Records**: Patient search, filtering, detailed patient header, tabs for Clinical Data, Analysis, and AI Risk Story.
  - **Phase 05 - Clinical Assessment**: Multi-step stepper wizard capturing 55 clinical parameters with real-time field validation and data persistence.
  - **Phase 06 - 3D Heart Visualization & Analysis**: Interactive Three.js 3D coronary artery model (LAD, LCX, RCA), risk-based vessel color coding, camera reset, orbit controls, and snapshot capture.
  - **Phase 07 - AI Risk Story Tab**: Dedicated narrative presentation, factor impact badges, visualization steps, loading spinner during generation, and instant display of cached stories.
  - **Phase 08 - Clinical PDF Export**: Dual export modes—client-side printable summary view and server-side Supabase-generated official PDF report with embedded 3D snapshot.
  - **Phase 09 - QA, Polish & Edge Cases**: Error boundaries (`GlobalErrorBoundary`), patient route guard (`ValidPatientIdGuard`), custom 404 page, keyboard accessibility, and comprehensive automated test suites.
- **Data Normalization & Resilience**:
  - `normalizeAnalysis` uses Zod to validate ML payloads. Supports both unwrapped `AnalyzeResponse` and backend-stored wrapped `{ data: AnalyzeResponse }` shapes seamlessly.
  - Built-in fallback default for missing `disclaimer` field in legacy records.
  - Recharts SVG hover glitch resolved by disabling SVG overlay bars (`cursor={false}`, `activeBar={false}`).

## Environment & Configuration
- Configuration is loaded via `pydantic-settings` from a `.env` file placed in the repository root.
- Required `.env` keys:
  - `VITE_API_BASE_URL` (e.g. `http://localhost:8000`)
  - `BACKEND_HOST`
  - `BACKEND_PORT`
  - `DATABASE_URL` (Supabase connection string)
  - `SECRET_KEY` (For JWT)
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_KEY`
  - `GEMINI_API_KEY` (For Google GenAI Risk Story generation)
  - `RISK_STORY_MODEL` (Default: `gemini-3.8-flash`)
  - `RISK_STORY_FALLBACK_MODELS` (Default: `gemini-3.5-flash`)
  - `RISK_STORY_THINKING_LEVEL` (Default: `low`)
  - `RISK_STORY_MAX_OUTPUT_TOKENS` (Default: `1200`)
  - `RISK_STORY_TIMEOUT_SECONDS` (Default: `20`)
  - `RISK_STORY_CACHE_ENABLED` (Default: `true`)

## Supabase Storage & PDF Generation
- We successfully integrated `fpdf2` and the `supabase` Python SDK.
- The `patient-reports` bucket was created via the API to store dynamically generated clinical reports.
- **Report Generation (`POST /api/patients/{patient_id}/report`)**:
  - Validates the base64 3D heart snapshot from the frontend.
  - Generates an in-memory PDF combining patient clinical data (formatted in a grid), ML predictions, and SHAP explainability variables.
  - Automatically pushes the PDF bytes to the Supabase storage bucket, gets the public URL, and saves it to the `pdf_link` column in the `Patient` database row.

## Testing & Quality Assurance
- The definitive API structure is documented in `docs/api_contract.md`.
- A fully functional **Postman Collection** is available at `docs/CardioVision3D_Postman_Collection.json`. It includes pre-configured dummy payloads for Auth, Patient creation, and ML Predictions.
- **Automated Frontend Test Suites**:
  - **Vitest Unit/Component Tests**: `npm run test` verifies data normalization, patient view helpers, dashboard stats computation, and hook behaviors.
  - **Playwright E2E Tests**: `npm run test:e2e` exercises end-to-end user journeys (login, assessment creation, 3D visualization, risk story view, report generation).

## Docker
- `docker-compose up --build` works correctly. It mounts the repository root to `/app` inside the container so that `config.py` can cleanly resolve paths across both the `backend/` and `ml/` workspaces.

## Current Standing & Operational Status
- **Status**: The entire full-stack application (FastAPI backend + React frontend + ML pipelines + Supabase storage + Gemini generative narrative) is fully functional and tested.
- All 9 phases of the frontend overhaul, edge-case bug fixes (payload unwrapping, health endpoint routing, Recharts tooltips, and AI story regeneration states) have been verified and passed.
