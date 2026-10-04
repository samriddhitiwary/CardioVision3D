# Cardio 3D AI

AI-powered cardiovascular risk prediction and interactive 3D heart visualization system for the IIT hackathon.

This repository is intentionally scaffold-only right now. It sets up a clean monorepo for backend APIs, ML experimentation, and a React/Three.js frontend without implementing prediction models or application features yet.

## Architecture

- `backend/`: FastAPI service for future clinical-data prediction APIs.
- `ml/`: reproducible ML workspace for data processing, feature engineering, training, evaluation, and SHAP explainability.
- `frontend/`: React + Vite + TypeScript app prepared for Tailwind CSS and future React Three Fiber views.
- `docs/`: project notes, API decisions, and collaboration docs.
- `scripts/`: local automation scripts when the project needs them.

## Folder Structure

```text
cardio-3d-ai/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── main.py
│   ├── tests/
│   └── requirements.txt
├── ml/
│   ├── data/
│   │   ├── raw/
│   │   ├── processed/
│   │   └── README.md
│   ├── notebooks/
│   ├── src/
│   │   ├── data/
│   │   ├── features/
│   │   ├── models/
│   │   ├── evaluation/
│   │   └── explainability/
│   ├── artifacts/
│   │   ├── models/
│   │   ├── preprocessors/
│   │   └── metrics/
│   ├── tests/
│   └── requirements.txt
├── frontend/
│   ├── public/
│   │   └── models/
│   └── src/
│       ├── components/
│       ├── components/heart/
│       ├── pages/
│       ├── services/
│       ├── hooks/
│       ├── types/
│       ├── utils/
│       └── assets/
├── docs/
├── scripts/
├── .env.example
├── .gitignore
├── README.md
└── docker-compose.yml
```

## Prerequisites

- Python 3.11+
- Node.js 20+
- npm 10+
- Git

## Environment Setup

Create a local environment file from the placeholder template:

```bash
cp .env.example .env
```

You must configure the `.env` file (placed in the root directory) with your Supabase credentials:

```bash
VITE_API_BASE_URL=http://localhost:8000
BACKEND_HOST=127.0.0.1
BACKEND_PORT=8000
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
SECRET_KEY=generate_a_random_secure_string_here
SUPABASE_URL=https://[PROJECT_REF].supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
```

**Important**: For the PDF Report Generation to work, ensure you have created a public Supabase Storage bucket named `patient-reports`.

## Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
cd ..
python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

Windows PowerShell activation:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
cd ..
python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

Health check:

```bash
curl http://127.0.0.1:8000/health
```

## ML Setup

```bash
cd ml
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
pytest
```

Windows PowerShell activation:

```powershell
cd ml
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
pytest
```

Keep patient datasets in `ml/data/raw/`. The directory is retained with `.gitkeep`, but CSV and Excel files are ignored by Git.

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Build check:

```bash
npm run build
```

## Git Collaboration Workflow

1. Keep `main` stable and runnable.
2. Create feature branches: `git checkout -b feature/backend-health` or `feature/heart-viewer`.
3. Pull before starting work: `git pull --rebase origin main`.
4. Commit small, focused changes with clear messages.
5. Do not commit `.env`, patient datasets, model binaries, generated artifacts, or local virtual environments.
6. Open a pull request, request review from the other developer, and merge only after tests/builds pass.

## Local Verification

```bash
cd backend
pytest

cd ../ml
pytest

cd ../frontend
npm run build
```

## API Testing (Postman)

A full Postman collection is provided in `docs/CardioVision3D_Postman_Collection.json`. It contains all configured endpoints for Authentication, Patient Management, and ML Predictions. Import this file directly into Postman to test APIs quickly.

## Docker

Docker is fully configured for development. It mounts your local codebase and connects securely to the cloud Supabase database defined in your `.env`.

To start both the frontend and backend simultaneously:

```bash
docker-compose up --build
```
