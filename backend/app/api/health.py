from fastapi import APIRouter

from backend.app.core.model_registry import get_model_registry

router = APIRouter()


@router.get("/health", tags=["health"])
def health_check() -> dict[str, object]:
    try:
        registry = get_model_registry()
        return {"status": "ok", "model_version": registry.model_version, "models_loaded": registry.loaded}
    except Exception:  # noqa: BLE001 - health should not leak startup internals
        return {"status": "ok", "model_version": None, "models_loaded": False}
