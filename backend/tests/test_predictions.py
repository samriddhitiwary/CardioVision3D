from __future__ import annotations

import json
import math
import statistics
import time
from pathlib import Path

import joblib
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.schemas.patient import ALLOWED_VALUES, ML_TO_ALIAS


TARGETS = ("CAD", "LAD", "LCX", "RCA")


@pytest.fixture(scope="session")
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="session")
def features() -> pd.DataFrame:
    return pd.read_csv(Path(__file__).resolve().parents[2] / "ml" / "data" / "processed" / "features_clean.csv")


def payload_from_row(row: pd.Series) -> dict:
    payload = {}
    for ml_name, alias in ML_TO_ALIAS.items():
        value = row[ml_name]
        if ml_name in ALLOWED_VALUES:
            payload[alias] = str(value)
        else:
            payload[alias] = float(value)
    return payload


@pytest.fixture()
def valid_payload(features: pd.DataFrame) -> dict:
    return payload_from_row(features.iloc[0])


def assert_prediction_block(data: dict) -> None:
    assert data["model_version"] == "1.0.0"
    assert set(data["predictions"]) == set(TARGETS)
    assert set(data["visualization"]) == {"LAD", "LCX", "RCA"}
    for target in TARGETS:
        prediction = data["predictions"][target]
        assert 0.0 <= prediction["probability"] <= 1.0
        assert prediction["risk_score"] == prediction["probability"]
        assert prediction["visualization_band"] in {"low", "moderate", "high"}


def test_predict_valid_patient(client: TestClient, valid_payload: dict) -> None:
    response = client.post("/api/v1/predict", json=valid_payload)
    assert response.status_code == 200, response.text
    data = response.json()
    assert_prediction_block(data)
    assert data["predictions"]["CAD"]["threshold"] == pytest.approx(0.30)
    assert data["predictions"]["LAD"]["threshold"] == pytest.approx(0.40)
    assert data["predictions"]["LCX"]["threshold"] == pytest.approx(0.40)
    assert data["predictions"]["RCA"]["threshold"] == pytest.approx(0.35)


def test_analyze_valid_patient(client: TestClient, valid_payload: dict) -> None:
    response = client.post("/api/v1/analyze", json=valid_payload)
    assert response.status_code == 200, response.text
    data = response.json()
    assert_prediction_block(data)
    assert set(data["explanations"]) == set(TARGETS)


def test_explain_valid_patient(client: TestClient, valid_payload: dict) -> None:
    response = client.post("/api/v1/explain", json=valid_payload)
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["model_version"] == "1.0.0"
    assert set(data["explanations"]) == set(TARGETS)
    for explanation in data["explanations"].values():
        assert 0.0 <= explanation["probability"] <= 1.0
        assert explanation["top_increasing_contributors"]
        assert explanation["explanation_method"].startswith("shap.")


def test_model_info(client: TestClient) -> None:
    response = client.get("/api/v1/model-info")
    assert response.status_code == 200
    data = response.json()
    assert data["model_version"] == "1.0.0"
    assert set(data["targets"]) == set(TARGETS)
    assert "models" not in data


def test_missing_required_field_returns_422(client: TestClient, valid_payload: dict) -> None:
    payload = dict(valid_payload)
    payload.pop("age")
    response = client.post("/api/v1/predict", json=payload)
    assert response.status_code == 422


def test_invalid_categorical_value_returns_422(client: TestClient, valid_payload: dict) -> None:
    payload = dict(valid_payload)
    payload["sex"] = "Unknown"
    response = client.post("/api/v1/predict", json=payload)
    assert response.status_code == 422


def test_nan_and_infinite_values_return_422(client: TestClient, valid_payload: dict) -> None:
    for bad_value in (float("nan"), float("inf")):
        payload = dict(valid_payload)
        payload["age"] = bad_value
        response = client.post("/api/v1/predict", content=json.dumps(payload), headers={"content-type": "application/json"})
        assert response.status_code == 422


def test_target_field_injected_returns_422(client: TestClient, valid_payload: dict) -> None:
    payload = dict(valid_payload)
    payload["LAD"] = "Stenotic"
    response = client.post("/api/v1/predict", json=payload)
    assert response.status_code == 422


def test_predict_matches_direct_joblib_pipelines(client: TestClient, features: pd.DataFrame) -> None:
    models_dir = Path(__file__).resolve().parents[2] / "ml" / "artifacts" / "models"
    models = {target: joblib.load(models_dir / f"{target.lower()}_pipeline.joblib") for target in TARGETS}
    for _, row in features.head(3).iterrows():
        payload = payload_from_row(row)
        response = client.post("/api/v1/predict", json=payload)
        assert response.status_code == 200, response.text
        data = response.json()
        patient_df = pd.DataFrame([{ml_name: row[ml_name] for ml_name in ML_TO_ALIAS}], columns=list(ML_TO_ALIAS))
        for target in TARGETS:
            expected = float(models[target].predict_proba(patient_df)[0, 1])
            actual = data["predictions"][target]["probability"]
            assert actual == pytest.approx(expected, abs=1e-12)


def test_analyze_prediction_matches_explain_probability(client: TestClient, valid_payload: dict) -> None:
    analyze = client.post("/api/v1/analyze", json=valid_payload).json()
    explain = client.post("/api/v1/explain", json=valid_payload).json()
    for target in TARGETS:
        assert analyze["predictions"][target]["probability"] == pytest.approx(
            analyze["explanations"][target]["probability"], abs=1e-12
        )
        assert analyze["explanations"][target]["probability"] == pytest.approx(
            explain["explanations"][target]["probability"], abs=1e-12
        )


def test_local_latency_smoke(client: TestClient, valid_payload: dict) -> None:
    client.post("/api/v1/predict", json=valid_payload)
    client.post("/api/v1/analyze", json=valid_payload)
    predict_times = []
    analyze_times = []
    for _ in range(3):
        start = time.perf_counter()
        assert client.post("/api/v1/predict", json=valid_payload).status_code == 200
        predict_times.append(time.perf_counter() - start)
        start = time.perf_counter()
        assert client.post("/api/v1/analyze", json=valid_payload).status_code == 200
        analyze_times.append(time.perf_counter() - start)
    assert statistics.mean(predict_times) < statistics.mean(analyze_times)
