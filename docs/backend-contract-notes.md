# Backend Contract Notes

*Note: These notes clarify ambiguities in the Master Context based on direct inspection of the backend code. Future phases must adhere to these facts rather than the original guide where they differ.*

### 1. Does `PatientUpdate` accept `analysis_data`? Does `PUT` merge or replace `clinical_data`?
- **Yes**, `PatientUpdate` explicitly accepts `analysis_data` as `dict[str, Any] | None`.
- **Replace**: The `PUT` endpoint iterates over provided keys and applies them via `setattr(patient, field, value)`. This replaces the entire `clinical_data` JSON blob rather than doing a deep merge.
- *Refs*: `backend/app/schemas/patient.py:112`, `backend/app/api/endpoints/patients.py:65-67`.

### 2. Does `PatientResponse` include `risk_story`, `risk_story_model`, `risk_story_generated_at`?
- **Updated Status**: `PatientResponse` was updated to explicitly include `risk_story: dict[str, Any] | None = None` and `risk_story_model: str | None = None`.
- It still omits `risk_story_generated_at` and `risk_story_fingerprint` (which remain internal to the database columns).
- When fetching a patient, the frontend receives the cached `risk_story` object if one has been generated, avoiding unnecessary regeneration.
- *Refs*: `backend/app/schemas/patient.py:115-122`, `backend/app/db/models.py:43-46`.

### 3. What is the exact shape stored in `analysis_data`?
- The backend column is loosely typed as `dict[str, Any]`.
- It may store either the raw JSON returned by `/analyze` (`AnalyzeResponse`) or a wrapped persistence object `{ id, patient_id, created_at, data: AnalyzeResponse }`.
- **Frontend Safeguard**: The frontend `normalizeAnalysis` and `getAnalysis` helpers safely unwrap `patient.analysis_data.data || patient.analysis_data` and provide a default fallback for missing `disclaimer` fields before validating with Zod.
- *Refs*: `backend/app/api/predictions.py:68-72`, `backend/app/schemas/patient.py:118`, `frontend/src/features/patients/patientView.ts:4-13`.

### 4. Does `GET /api/patients/` return `clinical_data` and `analysis_data` for every patient?
- **Yes**. It returns a list of `PatientResponse` objects, which carry `clinical_data`, `analysis_data`, `pdf_link`, `risk_story`, and `risk_story_model`.
- *Refs*: `backend/app/api/endpoints/patients.py:33`, `backend/app/schemas/patient.py:102,118-121`.

### 5. Are `clinical_data` values validated on create/update, or only on `/analyze`?
- **Only on ML operations**: Create and update endpoints loosely accept `dict[str, Any]`. Strict validation against the 55 frozen features from `input_schema.json` occurs when constructing `PatientInput` during `/analyze`, `/risk-story`, and `/report`.
- *Refs*: `backend/app/schemas/patient.py:70-96,111`, `backend/app/api/endpoints/risk_story.py:41`, `backend/app/api/endpoints/patients.py:111`.

### 6. Which claims does the access JWT contain? Is there a "current user" endpoint?
- The JWT contains only `exp`, `sub` (stringified user ID), and `type`. It does **not** contain `name` or `email`.
- There is **no** `/me` or "current user" endpoint. The frontend must rely entirely on data captured at login/registration to display the doctor's name or email.
- *Refs*: `backend/app/core/security.py:22`, `backend/app/api/endpoints/auth.py`.

### 7. Does the risk-story response carry any flag that tells fallback from AI-generated?
- **No flag in endpoint payload**: The `RiskStoryResponse` model is identical for both paths. The frontend detects fallback by matching the `headline` against the exact string `"Model explanation available"`.
- **Database Tracking**: The database column and `PatientResponse.risk_story_model` store `"fallback-deterministic"` when the fallback was used, versus the model identifier (e.g., `"gemini-3.8-flash"`).
- *Refs*: `backend/app/schemas/risk_story.py:25-35`, `backend/app/services/risk_story_service.py:10-20,104`.

### 8. What are CORS origins and are `Authorization` headers allowed?
- Allowed origins are `http://localhost:5173` and `http://127.0.0.1:5173`.
- **Yes**, `Authorization` headers are fully supported because the backend is configured with `allow_headers=["*"]`.
- *Refs*: `backend/app/core/config.py:29-35`, `backend/app/main.py:53`.

### 9. Where is the Health Check endpoint mounted?
- Mounted at root `GET /health` (`backend/app/main.py:56`), NOT under `/api/health` or `/api/v1/health`.
- The frontend `ServerStatusBanner` polls `GET /health` directly.

### 10. How does AI Risk Story caching and invalidation work?
- Caching is managed via a deterministic SHA-256 fingerprint (`generate_fingerprint` in `utils/analysis_fingerprint.py`) derived from canonical JSON of patient clinical data, ML outputs, and model version.
- Stored in `Patient.risk_story_fingerprint`.
- If the fingerprint matches and `force_regenerate=false`, the cached story is returned immediately.
- Passing `force_regenerate=true` in `RiskStoryRequest` invalidates the cache and triggers a fresh generation.

### 11. How are ML predictions protected against LLM hallucinations in the risk story?
- `RiskStoryService._override_authoritative()` unconditionally overwrites LLM outputs for vessel probabilities, risk percentage, severity, and SHAP contributors with the verified CatBoost & TreeSHAP predictions before returning and saving the story.

### 12. What is the multi-model fallback sequence for Gemini?
- `GeminiRiskStoryClient` statefully tracks model health.
- It attempts generation with `RISK_STORY_MODEL` (e.g. `gemini-3.8-flash`), rotates through `RISK_STORY_FALLBACK_MODELS` (e.g. `gemini-3.5-flash`), and on complete failure defaults to a deterministic template based on SHAP rankings with headline `"Model explanation available"`.
