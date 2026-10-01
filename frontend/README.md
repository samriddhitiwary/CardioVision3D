# CardioTwin Frontend

React + Vite + TypeScript dashboard for the CardioTwin FastAPI backend.

## Setup

```powershell
cd frontend
npm install
```

Create or update the root `.env`/frontend environment with:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Start the backend first from the repository root:

```powershell
.\backend\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --reload
```

Then run the frontend:

```powershell
cd frontend
npm run dev
```

Vite serves the dashboard at:

```text
http://localhost:5173
```

## Build

```powershell
npm run build
```

The dashboard consumes `GET /health`, `GET /api/v1/model-info`, and `POST /api/v1/analyze`.
