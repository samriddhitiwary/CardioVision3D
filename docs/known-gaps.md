# Known Backend Gaps

This document tracks known limitations in the current CardioVision3D backend API and suggests small additions to remove these gaps in future iterations.

## 1. No `/api/auth/me` endpoint
- **Current state**: The frontend derives the logged-in doctor's display name client-side using a hardcoded `extractDisplayName` helper that parses the email from the JWT token.
- **Suggested fix**: Add a `GET /api/v1/auth/me` endpoint that returns the current user's profile information (including a proper `name` field).

## 2. No dedicated stats endpoint
- **Current state**: The dashboard metrics are computed client-side by fetching the entire list of patients.
- **Suggested fix**: Add a `GET /api/v1/dashboard/stats` endpoint that performs aggregation on the database side to return counts by risk level, total patients, etc.

## 3. No explicit fallback flag on the risk-story response
- **Current state**: The frontend uses a heuristics-based string comparison (`isFallbackStory`) to detect when the LLM service timed out and returned a generic fallback story.
- **Suggested fix**: Update the `POST /api/v1/patients/{id}/risk-story` response schema to explicitly include an `is_fallback: boolean` field in the JSON structure.

## 4. PDF report excludes charts and AI story
- **Current state**: The backend PDF generation logic only accepts the `image_base64` (3D heart snapshot) and missing some context.
- **Suggested fix**: Expand the PDF template and `POST /api/v1/patients/{id}/report` endpoint to accept or auto-fetch the Shapley chart data, Risk overview data, and the latest LLM Risk Story text.

## 5. PDF link is public
- **Current state**: The backend returns a raw AWS S3 or static URL for the generated PDF, which the frontend opens directly.
- **Suggested fix**: Serve the PDF behind an authenticated endpoint (e.g., `GET /api/v1/patients/{id}/report/download`) that verifies the user's JWT token.

## 6. `exertional_cp` only accepts `"N"`
- **Current state**: Attempting to submit a value other than `"N"` for Exertional Chest Pain triggers a validation error from the backend.
- **Suggested fix**: Fix the backend validation schema to accept the full range of expected categorical values for this feature.

## 7. Dataset typo `"Fmale"`
- **Current state**: The patient demographics endpoint sometimes returns `"Fmale"` instead of `"Female"`.
- **Suggested fix**: Run a database migration or update the backend seed script to correct spelling errors in the categorical dataset features.
