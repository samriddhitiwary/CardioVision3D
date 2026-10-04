from contextlib import asynccontextmanager
import math
from typing import Any

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.api.health import router as health_router
from backend.app.api.predictions import router as predictions_router
from backend.app.api.routers import api_router
from backend.app.core.config import get_settings
from backend.app.core.model_registry import init_model_registry
from backend.app.services.explanation_service import ExplanationService


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    registry = init_model_registry(settings)
    app.state.model_registry = registry
    app.state.explanation_service = ExplanationService(registry)
    yield


def _sanitize_error_payload(value: Any) -> Any:
    if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
        return str(value)
    if isinstance(value, list):
        return [_sanitize_error_payload(item) for item in value]
    if isinstance(value, dict):
        return {key: _sanitize_error_payload(item) for key, item in value.items()}
    if isinstance(value, Exception):
        return str(value)
    return value


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        description="CardioTwin frozen ML inference API for calibrated CAD/LAD/LCX/RCA risk estimates.",
        version=settings.model_version,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router)
    app.include_router(predictions_router)
    app.include_router(api_router, prefix="/api")

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request, exc):  # noqa: ANN001
        return JSONResponse(status_code=422, content={"detail": _sanitize_error_payload(exc.errors())})

    return app


app = create_app()
