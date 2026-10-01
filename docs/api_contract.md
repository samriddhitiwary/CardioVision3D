# CardioTwin API Contract

Base URL for local development: `http://127.0.0.1:8000`

Start command from the repository root:

```powershell
.\backend\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --reload
```

All prediction responses include this disclaimer:

> Educational / decision-support prototype only. Predictions are model risk estimates and are not a medical diagnosis or substitute for professional evaluation or coronary imaging.

## Patient Request Schema

The API accepts one patient per request using safe snake_case JSON keys. These keys map deterministically to the exact 55 frozen ML feature names from `ml/artifacts/models/input_schema.json`.

Examples:

- `typical_chest_pain` maps to `Typical Chest Pain`
- `ef_tte` maps to `EF-TTE`
- `region_rwma` maps to `Region RWMA`

Target fields are forbidden as inputs: `Cath`, `LAD`, `LCX`, `RCA`, plus their snake_case aliases.

Unknown fields, missing fields, invalid categorical values, NaN, and infinite numeric values return HTTP `422`.

## GET /health

Returns service and model-load status.

```json
{
  "status": "ok",
  "model_version": "1.0.0",
  "models_loaded": true
}
```

## GET /api/v1/model-info

Returns safe public metadata:

- model version
- dataset name
- targets
- algorithm names
- frozen thresholds
- calibration method
- validation metrics
- validation methodology
- limitations

No local filesystem paths are returned.

## POST /api/v1/predict

Fast endpoint. It does not compute SHAP.

Response:

```json
{
  "model_version": "1.0.0",
  "predictions": {
    "CAD": {
      "probability": 0.84,
      "threshold": 0.3,
      "positive": true,
      "risk_score": 0.84,
      "visualization_band": "high",
      "band_basis": "UI visualization band based on model probability; not a clinical severity category."
    }
  },
  "visualization": {
    "LAD": {
      "probability": 0.72,
      "threshold": 0.4,
      "positive": true,
      "risk_score": 0.72,
      "visualization_band": "high",
      "band_basis": "UI visualization band based on model probability; not a clinical severity category."
    }
  },
  "disclaimer": "..."
}
```

`probability` is the calibrated probability from the saved frozen pipeline. `threshold` is loaded from model metadata. `positive` is `probability >= threshold`.

`risk_score` is the same calibrated probability, provided for 3D rendering. `visualization_band` is a UI-only display band:

- `low`: probability `< 0.33`
- `moderate`: probability `>= 0.33` and `< 0.66`
- `high`: probability `>= 0.66`

These bands are not clinical severity categories.

## POST /api/v1/explain

Computes SHAP explanations for all targets.

Response:

```json
{
  "model_version": "1.0.0",
  "explanations": {
    "CAD": {
      "probability": 0.84,
      "threshold": 0.3,
      "classification": "positive",
      "top_increasing_contributors": [
        {
          "feature": "Age",
          "raw_value": 67,
          "contribution": 0.42,
          "direction": "increases_model_score",
          "ui_label": "Increases predicted risk"
        }
      ],
      "top_decreasing_contributors": [],
      "explanation_method": "shap.LinearExplainer",
      "explanation_scope": "SHAP values explain the underlying fitted decision estimators; calibrated probability comes from the saved pipeline."
    }
  },
  "disclaimer": "..."
}
```

Positive SHAP contributions increase the model score toward the positive class. Negative SHAP contributions decrease it. They do not prove medical causality.

## POST /api/v1/analyze

Primary frontend endpoint. Returns `/predict` plus `/explain` data in one response:

```json
{
  "model_version": "1.0.0",
  "predictions": {},
  "visualization": {},
  "explanations": {},
  "disclaimer": "..."
}
```
