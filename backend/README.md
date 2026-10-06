# CardioVision3D Backend Service

High-performance FastAPI service providing calibrated cardiovascular disease risk estimation, CatBoost ML inference, TreeSHAP explainability, generative AI risk stories via Google Gemini, and automated PDF clinical reporting.

---

## 🛠️ Requirements & Tech Stack

- **Python**: 3.11+ (Python 3.12 recommended)
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) + Uvicorn
- **Database**: PostgreSQL (Supabase Cloud or local PostgreSQL)
- **ORM / Migrations**: SQLAlchemy 2.0 + Alembic
- **Machine Learning**: CatBoost, TreeSHAP, Scikit-learn
- **Generative AI**: Google GenAI SDK (`google-genai`)
- **Reporting**: `fpdf2` + Supabase Storage SDK

---

## 🚀 Local Development Setup

### 1. Create and Activate Virtual Environment

From the **repository root**:

#### Windows (PowerShell):
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

#### macOS / Linux:
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
```

### 2. Install Dependencies
```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### 3. Configure Environment Variables
Ensure `.env` exists in the repository root (see `../.env.example`):
```bash
# From repository root
cp .env.example .env
```
Key backend variables required in `.env`:
- `DATABASE_URL`: PostgreSQL connection string (Supabase or local).
- `SECRET_KEY`: JWT secret key.
- `SUPABASE_URL` & `SUPABASE_SERVICE_KEY`: For report PDF storage.
- `GEMINI_API_KEY`: For AI Risk Story narrative generation (optional; falls back to deterministic story if omitted).

### 4. Run Database Migrations
Initialize or update database tables:
```bash
# Inside the backend/ directory with .venv active
alembic upgrade head
```

### 5. Start the API Server
Run the Uvicorn ASGI server from the **repository root** (or from `backend/` with `--app-dir ..`):

#### From Repository Root:
```bash
python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

#### Or from `backend/`:
```bash
python -m uvicorn backend.app.main:app --app-dir .. --reload --host 127.0.0.1 --port 8000
```

The API will be available at:
- **API Base**: `http://127.0.0.1:8000`
- **Health Check**: `http://127.0.0.1:8000/health`
- **Interactive Swagger Docs**: `http://127.0.0.1:8000/docs`
- **ReDoc**: `http://127.0.0.1:8000/redoc`

---

## 🧪 Testing

Run backend tests using `pytest`:
```bash
# From repository root
pytest backend/tests
```

---

## 📦 Database & Migrations

Alembic handles database schema revisions:
- Check current revision: `alembic current`
- Apply migrations: `alembic upgrade head`
- Create a new migration: `alembic revision --autogenerate -m "describe_change"`

---

## 📄 Storage & Supabase Bucket

For PDF Clinical Report generation (`POST /api/patients/{id}/report`):
1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Go to **Storage** and create a public bucket named `patient-reports`.
3. Set `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in `.env`.

---

## 🧠 ML Inference & Artifacts

The backend loads serialized ML pipelines on startup:
- CAD model: `ml/artifacts/models/cad_pipeline.joblib`
- LAD model: `ml/artifacts/models/lad_pipeline.joblib`
- LCX model: `ml/artifacts/models/lcx_pipeline.joblib`
- RCA model: `ml/artifacts/models/rca_pipeline.joblib`
- Feature schema: `ml/artifacts/models/input_schema.json`

Categorical inputs and 55 clinical parameters are dynamically validated using Pydantic models generated from `input_schema.json`.
