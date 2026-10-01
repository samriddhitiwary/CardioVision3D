from __future__ import annotations

import json
import logging
import sys
from pathlib import Path
from typing import Any

import joblib

from backend.app.core.config import Settings

logger = logging.getLogger(__name__)

TARGETS = ("CAD", "LAD", "LCX", "RCA")


class ModelRegistryError(RuntimeError):
    """Raised when frozen model artifacts are unavailable or invalid."""


class ModelRegistry:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.project_root = settings.project_root
        self.ml_dir = self.project_root / "ml"
        self.models_dir = self.ml_dir / "artifacts" / "models"
        self.metadata: dict[str, Any] | None = None
        self.input_schema: dict[str, Any] | None = None
        self.models: dict[str, Any] = {}
        self.loaded = False

    def load(self) -> None:
        if self.loaded:
            return
        if str(self.ml_dir) not in sys.path:
            sys.path.insert(0, str(self.ml_dir))

        required = [
            self.models_dir / "cad_pipeline.joblib",
            self.models_dir / "lad_pipeline.joblib",
            self.models_dir / "lcx_pipeline.joblib",
            self.models_dir / "rca_pipeline.joblib",
            self.models_dir / "model_metadata.json",
            self.models_dir / "input_schema.json",
        ]
        missing = [path.name for path in required if not path.exists()]
        if missing:
            raise ModelRegistryError(f"Missing frozen model artifact(s): {', '.join(missing)}")

        self.metadata = json.loads((self.models_dir / "model_metadata.json").read_text(encoding="utf-8"))
        self.input_schema = json.loads((self.models_dir / "input_schema.json").read_text(encoding="utf-8"))
        version = self.metadata.get("model_version")
        if version != self.settings.model_version:
            raise ModelRegistryError(f"Expected model version {self.settings.model_version}, found {version!r}")

        loaded_models: dict[str, Any] = {}
        for target in TARGETS:
            loaded_models[target] = joblib.load(self.models_dir / f"{target.lower()}_pipeline.joblib")
        self.models = loaded_models
        self.loaded = True
        logger.info("Loaded CardioTwin frozen model registry version %s", version)

    def require_loaded(self) -> None:
        if not self.loaded:
            raise ModelRegistryError("Model registry is not initialized.")

    @property
    def model_version(self) -> str:
        self.require_loaded()
        assert self.metadata is not None
        return str(self.metadata["model_version"])

    @property
    def feature_fields(self) -> list[dict[str, Any]]:
        self.require_loaded()
        assert self.input_schema is not None
        return list(self.input_schema["fields"])

    @property
    def forbidden_fields(self) -> set[str]:
        self.require_loaded()
        assert self.input_schema is not None
        return set(self.input_schema.get("forbidden_input_fields", []))

    def get_model(self, target: str) -> Any:
        self.require_loaded()
        return self.models[target.upper()]

    def threshold(self, target: str) -> float:
        self.require_loaded()
        assert self.metadata is not None
        return float(self.metadata["models"][target.lower()]["frozen_threshold"])

    def public_model_info(self) -> dict[str, Any]:
        self.require_loaded()
        assert self.metadata is not None
        return {
            "model_version": self.metadata["model_version"],
            "dataset_name": self.metadata.get("dataset_name"),
            "targets": {
                target: {
                    "algorithm": self.metadata["models"][target.lower()]["algorithm"],
                    "threshold": self.metadata["models"][target.lower()]["frozen_threshold"],
                    "calibration_method": self.metadata["models"][target.lower()]["calibration_method"],
                    "validation": {
                        "method": self.metadata["models"][target.lower()]["validation_method"],
                        "roc_auc": self.metadata["models"][target.lower()]["validation_roc_auc"],
                        "pr_auc": self.metadata["models"][target.lower()]["validation_pr_auc"],
                        "f1": self.metadata["models"][target.lower()]["validation_f1"],
                        "brier": self.metadata["models"][target.lower()]["validation_brier"],
                    },
                }
                for target in TARGETS
            },
            "limitations": [
                "Educational / decision-support hackathon prototype.",
                "Internal cross-validation only; no external clinical validation.",
                "Predictions are model risk estimates, not diagnoses.",
                "Not a substitute for professional evaluation or coronary imaging.",
            ],
        }


registry: ModelRegistry | None = None


def init_model_registry(settings: Settings) -> ModelRegistry:
    global registry
    registry = ModelRegistry(settings)
    registry.load()
    return registry


def get_model_registry() -> ModelRegistry:
    if registry is None:
        raise ModelRegistryError("Model registry has not been initialized.")
    registry.require_loaded()
    return registry
