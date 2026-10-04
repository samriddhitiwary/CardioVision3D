from __future__ import annotations

import json
import math
import re
from pathlib import Path
from typing import Any

import pandas as pd
from pandas.api.types import is_numeric_dtype
from pydantic import BaseModel, ConfigDict, Field, create_model, field_validator, model_validator

from backend.app.core.config import find_project_root


def api_alias(feature_name: str) -> str:
    return re.sub(r"[^0-9a-zA-Z]+", "_", feature_name).strip("_").lower()


def _load_schema() -> dict[str, Any]:
    schema_path = find_project_root() / "ml" / "artifacts" / "models" / "input_schema.json"
    return json.loads(schema_path.read_text(encoding="utf-8"))


INPUT_SCHEMA = _load_schema()
FEATURES_DF = pd.read_csv(find_project_root() / "ml" / "data" / "processed" / "features_clean.csv", nrows=5)
ML_FEATURE_NAMES = [field["name"] for field in INPUT_SCHEMA["fields"]]
ALIAS_TO_ML = {api_alias(name): name for name in ML_FEATURE_NAMES}
ML_TO_ALIAS = {name: api_alias(name) for name in ML_FEATURE_NAMES}
ALLOWED_VALUES = {
    field["name"]: {str(value) for value in field.get("allowed_values", [])}
    for field in INPUT_SCHEMA["fields"]
    if field.get("type") == "categorical"
}
FORBIDDEN_INPUT_FIELDS = set(INPUT_SCHEMA.get("forbidden_input_fields", []))
FORBIDDEN_ALIASES = {api_alias(name) for name in FORBIDDEN_INPUT_FIELDS}


class _PatientBase(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=False)

    @model_validator(mode="before")
    @classmethod
    def reject_forbidden_targets(cls, data: Any) -> Any:
        if isinstance(data, dict):
            forbidden = (set(data) & FORBIDDEN_INPUT_FIELDS) | (set(data) & FORBIDDEN_ALIASES)
            if forbidden:
                raise ValueError(f"Target fields are not accepted as model inputs: {sorted(forbidden)}")
        return data

    @field_validator("*", mode="before")
    @classmethod
    def reject_nan_inf(cls, value: Any) -> Any:
        if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
            raise ValueError("NaN and infinite values are not valid patient inputs.")
        return value

    @model_validator(mode="after")
    def validate_categorical_values(self) -> "_PatientBase":
        for ml_name, allowed in ALLOWED_VALUES.items():
            value = getattr(self, ML_TO_ALIAS[ml_name])
            if str(value) not in allowed:
                raise ValueError(f"{ML_TO_ALIAS[ml_name]} must be one of {sorted(allowed)}")
        return self

    def to_ml_dataframe(self) -> pd.DataFrame:
        payload = self.model_dump(by_alias=False)
        row = {}
        for ml_name in ML_FEATURE_NAMES:
            value = payload[ML_TO_ALIAS[ml_name]]
            if ml_name in ALLOWED_VALUES and is_numeric_dtype(FEATURES_DF[ml_name].dtype):
                value = pd.to_numeric(value)
                if float(value).is_integer():
                    value = int(value)
            row[ml_name] = value
        return pd.DataFrame([row], columns=ML_FEATURE_NAMES)


field_definitions: dict[str, tuple[Any, Any]] = {}
for schema_field in INPUT_SCHEMA["fields"]:
    ml_name = schema_field["name"]
    alias = api_alias(ml_name)
    if schema_field["type"] == "number":
        annotation: Any = float
        description = f"Numeric clinical field mapped to ML feature '{ml_name}'."
    else:
        annotation = str
        allowed = ", ".join(str(value) for value in schema_field.get("allowed_values", []))
        description = f"Categorical clinical field mapped to ML feature '{ml_name}'. Allowed values: {allowed}."
    field_definitions[alias] = (
        annotation,
        Field(..., description=description),
    )


PatientInput = create_model("PatientInput", __base__=_PatientBase, **field_definitions)

class PatientBase(BaseModel):
    name: str
    age: int
    gender: str
    clinical_data: dict[str, Any] | None = None

class PatientCreate(PatientBase):
    pass

class PatientUpdate(BaseModel):
    name: str | None = None
    age: int | None = None
    gender: str | None = None
    clinical_data: dict[str, Any] | None = None
    analysis_data: dict[str, Any] | None = None
    pdf_link: str | None = None

class PatientResponse(PatientBase):
    id: int
    doctor_id: int
    analysis_data: dict[str, Any] | None = None
    pdf_link: str | None = None
    created_at: Any

    model_config = ConfigDict(from_attributes=True)

class PatientReportRequest(BaseModel):
    image_base64: str = Field(..., description="Base64 encoded snapshot of the 3D heart model")
