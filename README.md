# Cardio 3D AI (CardioVision 3D)

AI-powered cardiovascular risk prediction and interactive 3D heart visualization system for the IIT hackathon.

**CardioVision 3D** is an AI-powered cardiovascular clinical decision-support and interactive 3D coronary artery visualization platform. It combines calibrated multi-target CatBoost machine learning models, TreeSHAP explainability, generative clinical narratives via Google Gemini, and interactive 3D heart rendering to help cardiologists assess and communicate coronary artery disease (CAD) risk.

---

## 🌟 Core Features

- **Multi-Target Risk Estimation**: Calibrated predictions for overall CAD as well as specific major coronary arteries:
  - **LAD** (Left Anterior Descending)
  - **LCX** (Left Circumflex)
  - **RCA** (Right Coronary Artery)
- **Interactive 3D Heart Visualizer**: Real-time 3D anatomical coronary artery model rendered with Three.js / WebGL, displaying vessel-specific risk coloration, interactive branch highlighting, orbit controls, and snapshot capture.
- **TreeSHAP Clinical Explainability**: Transparent attribution of patient clinical parameters, displaying ranked increasing and decreasing risk contributors.
- **Generative AI Risk Story**: Natural-language clinical narratives powered by Google Gemini (`gemini-3.8-flash` / `gemini-3.5-flash`), with strict hallucination guardrails (authoritative CatBoost data overrides), deterministic SHA-256 caching, and seamless deterministic fallback.
- **55-Feature Clinical Assessment Wizard**: Multi-step stepper interface capturing demographic, symptomatic, ECG, echocardiographic, and laboratory parameters with real-time validation.
- **Dual Clinical PDF Export**: Instant in-browser printable summary and official server-generated PDF clinical reports (embedded 3D snapshot, clinical data table, and risk breakdown) stored on Supabase Storage.
- **Doctor Authentication & Patient Management**: Custom bcrypt + JWT authentication with complete doctor-scoped patient records, search, filtering, and watchlist monitoring.

---

## 🏗️ Repository Architecture

This repository is structured as a full-stack monorepo:

```text
CardioVision3D/
├── backend/                  # FastAPI REST API service
│   ├── app/
│   │   ├── api/              # Endpoints: auth, patients, risk-story, predictions, health
│   │   ├── core/             # Configuration, security, ML model registry, Supabase client
│   │   ├── db/               # SQLAlchemy models & database engine
│   │   ├── integrations/     # Google GenAI SDK (Gemini) client
│   │   ├── schemas/          # Pydantic request/response validation schemas
│   │   ├── services/         # ML inference, TreeSHAP, PDF builder, risk story generator
│   │   ├── utils/            # SHA-256 fingerprinting utility
│   │   └── main.py           # ASGI application entrypoint
│   ├── alembic/              # Database migration revisions
│   ├── tests/                # Pytest test suite
│   ├── Dockerfile            # Production backend Docker image
│   └── requirements.txt      # Python dependencies
├── frontend/                 # React 18 + Vite + TypeScript application
│   ├── public/               # Static assets & 3D heart glTF/GLB models
│   ├── src/
│   │   ├── app/              # Router, layout guards, error boundary, pages
│   │   ├── components/       # Design system primitives & layout shells
│   │   ├── features/         # Domain modules: analysis, assessment, auth, dashboard, records, reports
│   │   ├── lib/              # Axios HTTP client, TanStack Query setup
│   │   └── types/            # TypeScript API contract definitions
│   ├── tests/                # Playwright E2E and accessibility tests
│   ├── Dockerfile            # Development frontend Docker image
│   ├── package.json          # Node dependencies and scripts
│   └── vitest.config.ts      # Vitest unit test configuration
├── ml/                       # Machine Learning workspace
│   ├── artifacts/models/     # Frozen serialized models (.joblib) & input_schema.json
│   ├── data/processed/       # Clean feature schemas and preprocessed data
│   └── src/                  # Feature engineering, model training & evaluation scripts
├── docs/                     # Architecture documentation, API contracts, QA matrices
├── docker-compose.yml        # Docker Compose configuration for one-command startup
├── .env.example              # Environment variables template
└── README.md                 # Project documentation
```

---

## ⚡ Prerequisites

Before setting up the project locally, ensure you have the following installed:

- **Python**: 3.11+ (Python 3.12 recommended)
- **Node.js**: 20+ (Node.js 18+ supported)
- **npm**: 10+
- **Git**: 2.30+
- **Docker & Docker Compose**: Optional, for containerized execution
- **Database**: PostgreSQL database (either a free [Supabase](https://supabase.com) project or a local PostgreSQL instance)

---

## 🚀 Quick Start (Docker Compose)

The easiest way to run the entire stack (FastAPI backend + React frontend) simultaneously:

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd CardioVision3D
   ```

2. **Create the environment file**:
   ```bash
   cp .env.example .env
   ```
   *(Edit `.env` to set your `DATABASE_URL` and credentials; see [Environment Configuration](#-environment-configuration) below).*

3. **Start the containers**:
   ```bash
   docker-compose up --build
   ```

4. **Access the application**:
   - **Frontend UI**: [http://localhost:5173](http://localhost:5173)
   - **FastAPI Backend**: [http://localhost:8000](http://localhost:8000)
   - **Interactive API Docs (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)
   - **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

---

## 💻 Manual Local Development Setup

If you prefer running services directly on your host machine for development:

### 1. Configure Environment Variables

Create `.env` at the root of the repository:
```bash
cp .env.example .env
```

Edit `.env` and fill in your database credentials and API keys:

```ini
# Backend Server
BACKEND_HOST=127.0.0.1
BACKEND_PORT=8000
CORS_ORIGINS=["http://localhost:5173","http://127.0.0.1:5173"]

# Frontend Vite
VITE_API_BASE_URL=http://localhost:8000

# Database (PostgreSQL / Supabase)
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres

# JWT Security
SECRET_KEY=generate_a_random_secure_hex_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# Supabase Storage (for PDF Reports)
SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# Google Gemini (for AI Risk Story)
GEMINI_API_KEY=your_google_ai_studio_api_key
RISK_STORY_MODEL=gemini-3.8-flash
RISK_STORY_FALLBACK_MODELS=gemini-3.5-flash
```

---

### 2. Backend Setup (FastAPI)

1. Open a terminal and navigate to `backend/`:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   - **Windows (PowerShell)**:
     ```powershell
     python -m venv .venv
     .\.venv\Scripts\Activate.ps1
     ```
   - **macOS / Linux**:
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```

3. Install backend dependencies:
   ```bash
   python -m pip install --upgrade pip
   pip install -r requirements.txt
   ```

4. Apply database migrations using Alembic:
   ```bash
   alembic upgrade head
   ```

5. Start the FastAPI development server:
   - **From repository root**:
     ```bash
     python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
     ```
   - **From `backend/` directory**:
     ```bash
     python -m uvicorn backend.app.main:app --app-dir .. --reload --host 127.0.0.1 --port 8000
     ```

6. Verify the server is running:
   ```bash
   curl http://127.0.0.1:8000/health
   # Returns: {"status":"ok","model_version":"1.0.0","models_loaded":true}
   ```

---

### 3. Frontend Setup (React + Vite)

1. Open a second terminal and navigate to `frontend/`:
   ```bash
   cd frontend
   ```

2. Install Node dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:5173
   ```

---

### 4. Supabase Storage Setup (For PDF Reports)

To enable the PDF Clinical Report export feature (`POST /api/patients/{id}/report`):
1. Sign in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Navigate to **Storage** -> **New Bucket**.
3. Create a bucket named **`patient-reports`**.
4. Set the bucket to **Public** (or configure public read policies) so generated PDF URLs are accessible.
5. Ensure your `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` (service role secret) are set in `.env`.

---

## 🧪 Testing & Validation

The project includes unit, component, and end-to-end test suites:

### Frontend Tests (Vitest & Playwright)
```bash
# In frontend/ directory:

# Run Vitest unit & component tests (28 tests across 11 files)
npm run test

# Run TypeScript typechecker
npm run typecheck

# Run production build
npm run build

# Run Playwright E2E & Accessibility tests
npm run test:e2e
```

### Backend Tests (Pytest)
```bash
# In backend/ directory with .venv active:
pytest tests
```

---

## 📚 API Reference & Documentation

Comprehensive architectural notes and API contracts are available in the [`docs/`](docs/) directory:

| Document | Description |
| :--- | :--- |
| **[api_contract.md](docs/api_contract.md)** | Definitive REST API endpoints, schemas, request/response samples, and health checks |
| **[updated_backend_structure.md](docs/updated_backend_structure.md)** | Complete backend codebase map, controllers, database models, and service layer architecture |
| **[backend-contract-notes.md](docs/backend-contract-notes.md)** | Technical clarifications, data shape quirks, Zod normalization, and caching behaviors |
| **[agentmemory.md](docs/agentmemory.md)** | State-of-the-project summary, ML integration details, and milestones |
| **[Postman Collection](docs/CardioVision3D_Postman_Collection.json)** | Ready-to-import Postman workspace with pre-configured request payloads |

---

## 🛠️ Troubleshooting & FAQ

### 1. `404 Not Found` on `/api/health`
- The health check endpoint is mounted at the root URL: `GET /health` (not `/api/health` or `/api/v1/health`).
- Verify via `http://localhost:8000/health`.

### 2. CORS errors when calling backend from browser
- Ensure `CORS_ORIGINS` in `.env` includes your frontend port (e.g. `["http://localhost:5173","http://127.0.0.1:5173"]`).

### 3. "Failed to generate AI Risk Story" or missing Gemini API Key
- If `GEMINI_API_KEY` is not provided or quota is exceeded, the backend automatically uses its deterministic fallback service without crashing.
- To use generative AI narratives, obtain a free API key at [Google AI Studio](https://aistudio.google.com/) and place it in `.env`.

### 4. Database migrations (`alembic upgrade head`) fails
- Ensure PostgreSQL is running and accessible via the `DATABASE_URL` string in `.env`.
- For Supabase, ensure your connection string uses port `5432` or the direct connection pooling URL.

### 5. PDF generation fails (`Storage service returned None`)
- Verify that the `patient-reports` storage bucket exists in your Supabase project.
- Verify that `SUPABASE_SERVICE_KEY` has service-role privileges to write objects.

