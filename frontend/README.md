# CardioVision3D Frontend

This is the completely redesigned React-based frontend for CardioVision3D. It provides a modern, responsive interface for doctors to manage patients, run CAD risk assessments, and view 3D anatomical heart models with AI-generated risk stories.

## Requirements
- Node.js (v18+)
- npm

## Setup & Running
1. Install dependencies: `npm install`
2. Start the development server: `npm run dev`
3. Build for production: `npm run build`

## Scripts
- `npm run dev`: Starts the Vite development server.
- `npm run build`: Compiles TypeScript and builds the production bundle.
- `npm run preview`: Locally previews the production build.
- `npm run test`: Runs the Vitest unit test suite.
- `npm run test:e2e`: Runs Playwright accessibility and smoke tests.
- `npm run lint`: Runs oxlint for fast static analysis.
- `npm run typecheck`: Runs the TypeScript compiler to verify types.

## Environment Variables
Create a `.env` file in the `frontend` root:
- `VITE_API_BASE_URL`: The URL pointing to the FastAPI backend (defaults to `http://localhost:8000`).

## Folder Structure
- `src/app`: Application router, route guards, and top-level page components.
- `src/components`: Shared, reusable UI building blocks (using Radix UI primitives) and layout shells.
  - `src/components/heart`: The WebGL 3D Heart Visualization built with React Three Fiber.
- `src/features`: Domain-driven feature modules containing hooks, state, and specific components.
  - `analysis`: Risk overview, Shapley visualizations, and AI Risk Story.
  - `assessment`: The clinical data wizard driven by `featureConfig.ts`.
  - `auth`: JWT token management and doctor context.
  - `dashboard`: Statistics and recent patient lists.
  - `patients`: React Query hooks for fetching/mutating patient data.
  - `records`: The patient list and detailed record views.
  - `reports`: PDF generation and export logic.
- `src/hooks`: Global React hooks (e.g., `usePageTitle`).
- `src/lib`: Axios HTTP instance and TanStack Query client setup.
- `src/types`: TypeScript definitions matching backend schemas.
- `src/utils`: Helper functions (e.g., form validation, vessel coloring).

## Feature Config
The assessment wizard forms are entirely data-driven via `src/features/assessment/featureConfig.ts`. Adding a new clinical feature simply requires updating the schema array in that file; the UI (inputs, validation, steppers, presets) will automatically generate the corresponding controls.

## Known Backend Gaps
Please see [docs/known-gaps.md](../docs/known-gaps.md) for a list of known limitations in the current API layer and suggested backend additions.
