from __future__ import annotations

import json
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import joblib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import shap


TARGETS = ("cad", "lad", "lcx", "rca")
DISPLAY_TARGETS = {target: target.upper() for target in TARGETS}
RANDOM_STATE = 2026


def find_project_root(start: Path | None = None) -> Path:
    current = (start or Path.cwd()).resolve()
    for path in [current, *current.parents]:
        if (path / "ml").exists() and (path / "docs").exists():
            return path
    raise FileNotFoundError("Could not find project root containing ml/ and docs/.")


def _to_dense(matrix: Any) -> np.ndarray:
    if hasattr(matrix, "toarray"):
        return matrix.toarray()
    return np.asarray(matrix)


def _json_value(value: Any) -> Any:
    if pd.isna(value):
        return None
    if isinstance(value, np.generic):
        return value.item()
    return value


def positive_probability(model: Any, X: pd.DataFrame) -> np.ndarray:
    probability = model.predict_proba(X)
    if probability.shape[1] == 1:
        return np.full(len(X), probability[0, 0], dtype=float)
    return np.asarray(probability[:, 1], dtype=float)


def _positive_shap_values(values: Any) -> np.ndarray:
    if isinstance(values, list):
        values = values[1] if len(values) > 1 else values[0]
    values = np.asarray(values)
    if values.ndim == 3:
        values = values[:, :, 1] if values.shape[2] > 1 else values[:, :, 0]
    if values.ndim == 1:
        values = values.reshape(1, -1)
    return values.astype(float)


def _positive_expected_value(value: Any) -> float:
    arr = np.asarray(value)
    if arr.ndim == 0:
        return float(arr)
    if arr.size > 1:
        return float(arr.reshape(-1)[1])
    return float(arr.reshape(-1)[0])


def _strip_transformer_prefix(name: str) -> str:
    return name.split("__", 1)[1] if "__" in name else name


@dataclass
class _EstimatorContext:
    target: str
    estimator_index: int
    pipeline: Any
    feature_pipeline: Any
    estimator: Any
    transformed_feature_names: list[str]
    raw_feature_names: list[str]
    background: np.ndarray
    background_raw_index: list[int]
    explainer: Any
    explainer_name: str
    expected_value: float

    def transform(self, patient_df: pd.DataFrame) -> np.ndarray:
        selected = self.pipeline.named_steps["schema"].transform(patient_df)
        return _to_dense(self.feature_pipeline.transform(selected))

    def shap_values(self, patient_df: pd.DataFrame) -> np.ndarray:
        transformed = self.transform(patient_df)
        values = self.explainer.shap_values(transformed)
        return _positive_shap_values(values)

    def model_output(self, patient_df: pd.DataFrame) -> np.ndarray:
        transformed = self.transform(patient_df)
        if hasattr(self.estimator, "decision_function"):
            return np.asarray(self.estimator.decision_function(transformed), dtype=float).reshape(-1)
        probability = self.estimator.predict_proba(transformed)
        return np.asarray(probability[:, 1], dtype=float).reshape(-1)


class CardioTwinExplainer:
    """SHAP explainability layer for frozen CardioTwin v1.0.0 pipelines.

    The calibrated deployment probability is always read from the saved
    CalibratedClassifierCV pipeline. SHAP values explain the underlying fitted
    decision estimators inside that calibration wrapper, then aggregate encoded
    columns back to original clinical features.
    """

    def __init__(
        self,
        project_root: str | Path | None = None,
        background_size: int = 80,
        random_state: int = RANDOM_STATE,
    ) -> None:
        self.project_root = find_project_root(Path(project_root) if project_root else None)
        self.ml_dir = self.project_root / "ml"
        self.models_dir = self.ml_dir / "artifacts" / "models"
        self.data_dir = self.ml_dir / "data" / "processed"
        self.background_size = background_size
        self.random_state = random_state
        self.metadata = json.loads((self.models_dir / "model_metadata.json").read_text(encoding="utf-8"))
        self.input_schema = json.loads((self.models_dir / "input_schema.json").read_text(encoding="utf-8"))
        if self.metadata.get("model_version") != "1.0.0":
            raise ValueError(f"Expected frozen model version 1.0.0, got {self.metadata.get('model_version')!r}.")
        self.X = pd.read_csv(self.data_dir / "features_clean.csv")
        self.y = pd.read_csv(self.data_dir / "targets_clean.csv") if (self.data_dir / "targets_clean.csv").exists() else None
        self.models = {target: joblib.load(self.models_dir / f"{target}_pipeline.joblib") for target in TARGETS}
        self.contexts = {target: self._build_contexts(target) for target in TARGETS}

    def _build_contexts(self, target: str) -> list[_EstimatorContext]:
        model = self.models[target]
        contexts: list[_EstimatorContext] = []
        rng = np.random.default_rng(self.random_state)
        background_indices = np.arange(len(self.X))
        if len(background_indices) > self.background_size:
            background_indices = np.sort(rng.choice(background_indices, size=self.background_size, replace=False))
        background_raw = self.X.iloc[background_indices].copy()
        for estimator_index, calibrated in enumerate(model.calibrated_classifiers_):
            pipeline = calibrated.estimator
            feature_pipeline = pipeline.named_steps["features"]
            estimator = pipeline.named_steps["model"]
            selected_raw = pipeline.named_steps["schema"].transform(background_raw)
            background_transformed = _to_dense(feature_pipeline.transform(selected_raw))
            transformed_feature_names, raw_feature_names = self._feature_names_for_pipeline(feature_pipeline)
            if background_transformed.shape[1] != len(transformed_feature_names):
                raise ValueError(
                    f"{target} estimator {estimator_index}: transformed feature count "
                    f"{background_transformed.shape[1]} does not match recovered names {len(transformed_feature_names)}."
                )
            class_name = estimator.__class__.__name__
            if class_name == "LogisticRegression":
                explainer = shap.LinearExplainer(estimator, background_transformed)
                explainer_name = "shap.LinearExplainer"
            elif class_name == "RandomForestClassifier":
                explainer = shap.TreeExplainer(estimator, data=background_transformed, model_output="raw")
                explainer_name = "shap.TreeExplainer"
            else:
                explainer = shap.Explainer(estimator.predict_proba, background_transformed)
                explainer_name = "shap.Explainer"
            contexts.append(
                _EstimatorContext(
                    target=target,
                    estimator_index=estimator_index,
                    pipeline=pipeline,
                    feature_pipeline=feature_pipeline,
                    estimator=estimator,
                    transformed_feature_names=transformed_feature_names,
                    raw_feature_names=raw_feature_names,
                    background=background_transformed,
                    background_raw_index=[int(i) for i in background_indices],
                    explainer=explainer,
                    explainer_name=explainer_name,
                    expected_value=_positive_expected_value(explainer.expected_value),
                )
            )
        return contexts

    def _feature_names_for_pipeline(self, feature_pipeline: Any) -> tuple[list[str], list[str]]:
        preprocessor = feature_pipeline.named_steps["preprocess"]
        names: list[str] = []
        raw_names: list[str] = []
        for transformer_name, transformer, columns in preprocessor.transformers_:
            if transformer_name == "remainder" or transformer == "drop":
                continue
            columns = list(columns)
            if transformer_name == "num":
                for column in columns:
                    names.append(str(column))
                    raw_names.append(str(column))
            elif transformer_name == "cat":
                onehot = transformer.named_steps["onehot"] if hasattr(transformer, "named_steps") else transformer
                for column, categories in zip(columns, onehot.categories_):
                    for category in categories:
                        names.append(f"{column}={category}")
                        raw_names.append(str(column))
            else:
                feature_names = [_strip_transformer_prefix(n) for n in transformer.get_feature_names_out(columns)]
                for name in feature_names:
                    names.append(name)
                    raw_names.append(name.split("=", 1)[0])
        if "select_k_best" in feature_pipeline.named_steps:
            support = feature_pipeline.named_steps["select_k_best"].get_support()
            names = [name for name, keep in zip(names, support) if keep]
            raw_names = [name for name, keep in zip(raw_names, support) if keep]
        return names, raw_names

    def threshold(self, target: str) -> float:
        return float(self.metadata["models"][target.lower()]["frozen_threshold"])

    def explain_target(self, patient_df: pd.DataFrame, target: str, top_n: int = 5) -> dict[str, Any]:
        target = target.lower()
        if target not in TARGETS:
            raise ValueError(f"Unknown target {target!r}. Expected one of {TARGETS}.")
        if len(patient_df) != 1:
            raise ValueError("explain_target expects exactly one patient row.")
        probability = float(np.clip(positive_probability(self.models[target], patient_df)[0], 0, 1))
        threshold = self.threshold(target)
        raw_contrib: dict[str, float] = {}
        transformed_rows: list[dict[str, Any]] = []
        base_values = []
        for context in self.contexts[target]:
            values = context.shap_values(patient_df)[0]
            if len(values) != len(context.transformed_feature_names):
                raise ValueError(f"{target}: SHAP value count does not match transformed feature count.")
            if not np.isfinite(values).all():
                raise ValueError(f"{target}: SHAP values contain NaN or inf.")
            base_values.append(context.expected_value)
            for feature, raw_feature, contribution in zip(context.transformed_feature_names, context.raw_feature_names, values):
                contribution = float(contribution)
                raw_contrib[raw_feature] = raw_contrib.get(raw_feature, 0.0) + contribution / len(self.contexts[target])
                transformed_rows.append(
                    {
                        "target": target,
                        "estimator_index": context.estimator_index,
                        "feature": feature,
                        "raw_feature": raw_feature,
                        "contribution": contribution,
                    }
                )
        increasing = sorted(
            [(feature, value) for feature, value in raw_contrib.items() if value > 0],
            key=lambda item: item[1],
            reverse=True,
        )[:top_n]
        decreasing = sorted(
            [(feature, value) for feature, value in raw_contrib.items() if value < 0],
            key=lambda item: item[1],
        )[:top_n]
        row = patient_df.iloc[0]
        return {
            "target": DISPLAY_TARGETS[target],
            "probability": probability,
            "threshold": threshold,
            "classification": "positive" if probability >= threshold else "negative",
            "top_risk_factors": [self._factor_dict(row, feature, value, "increases_model_score") for feature, value in increasing],
            "top_protective_factors": [self._factor_dict(row, feature, value, "decreases_model_score") for feature, value in decreasing],
            "top_decreasing_risk_factors": [self._factor_dict(row, feature, value, "decreases_model_score") for feature, value in decreasing],
            "base_value": float(np.mean(base_values)),
            "explanation_method": self.contexts[target][0].explainer_name,
            "explanation_scope": "SHAP values explain the underlying fitted decision estimators; calibrated probability comes from the saved pipeline.",
            "transformed_contributions": transformed_rows,
        }

    def _factor_dict(self, row: pd.Series, feature: str, contribution: float, direction: str) -> dict[str, Any]:
        return {
            "feature": feature,
            "raw_value": _json_value(row.get(feature)),
            "contribution": float(contribution),
            "direction": direction,
            "ui_label": "Increases predicted risk" if contribution > 0 else "Decreases predicted risk",
        }

    def explain_all(self, patient_df: pd.DataFrame, top_n: int = 5) -> dict[str, Any]:
        return {DISPLAY_TARGETS[target]: self.explain_target(patient_df, target, top_n=top_n) for target in TARGETS}

    def transformed_importance(self, target: str, sample_df: pd.DataFrame | None = None) -> pd.DataFrame:
        target = target.lower()
        X = self.X if sample_df is None else sample_df
        rows: list[dict[str, Any]] = []
        for context in self.contexts[target]:
            values = context.shap_values(X)
            mean_abs = np.abs(values).mean(axis=0)
            for feature, raw_feature, importance in zip(context.transformed_feature_names, context.raw_feature_names, mean_abs):
                rows.append(
                    {
                        "target": target,
                        "estimator_index": context.estimator_index,
                        "feature": feature,
                        "raw_feature": raw_feature,
                        "mean_abs_shap": float(importance),
                    }
                )
        grouped = (
            pd.DataFrame(rows)
            .groupby(["target", "feature", "raw_feature"], as_index=False)["mean_abs_shap"]
            .mean()
            .sort_values(["target", "mean_abs_shap"], ascending=[True, False])
        )
        grouped["rank"] = grouped.groupby("target")["mean_abs_shap"].rank(method="first", ascending=False).astype(int)
        return grouped

    def get_global_importance(self, target: str, top_n: int = 15, sample_df: pd.DataFrame | None = None) -> pd.DataFrame:
        transformed = self.transformed_importance(target, sample_df=sample_df)
        aggregated = (
            transformed.groupby(["target", "raw_feature"], as_index=False)["mean_abs_shap"]
            .sum()
            .rename(columns={"raw_feature": "feature"})
            .sort_values(["target", "mean_abs_shap"], ascending=[True, False])
        )
        aggregated["rank"] = aggregated.groupby("target")["mean_abs_shap"].rank(method="first", ascending=False).astype(int)
        return aggregated.head(top_n).reset_index(drop=True)

    def all_global_importance(self, top_n: int | None = None) -> tuple[pd.DataFrame, pd.DataFrame]:
        transformed_frames = []
        aggregated_frames = []
        for target in TARGETS:
            transformed = self.transformed_importance(target)
            aggregated = (
                transformed.groupby(["target", "raw_feature"], as_index=False)["mean_abs_shap"]
                .sum()
                .rename(columns={"raw_feature": "feature"})
                .sort_values(["target", "mean_abs_shap"], ascending=[True, False])
            )
            aggregated["rank"] = aggregated.groupby("target")["mean_abs_shap"].rank(method="first", ascending=False).astype(int)
            if top_n is not None:
                aggregated = aggregated.head(top_n)
            transformed_frames.append(transformed)
            aggregated_frames.append(aggregated)
        return pd.concat(aggregated_frames, ignore_index=True), pd.concat(transformed_frames, ignore_index=True)

    def validate(self) -> dict[str, Any]:
        checks: dict[str, Any] = {"model_version": self.metadata.get("model_version"), "targets": {}}
        for target in TARGETS:
            target_checks: dict[str, Any] = {}
            probs = positive_probability(self.models[target], self.X.head(5))
            target_checks["predict_proba_valid"] = bool(np.isfinite(probs).all() and ((probs >= 0) & (probs <= 1)).all())
            excluded = set(self.metadata["models"][target]["excluded_features"])
            context_checks = []
            for context in self.contexts[target]:
                n_features = len(context.transformed_feature_names)
                values = context.shap_values(self.X.head(3))
                reconstruction = context.expected_value + values.sum(axis=1)
                model_output = context.model_output(self.X.head(3))
                context_checks.append(
                    {
                        "estimator_index": context.estimator_index,
                        "explainer": context.explainer_name,
                        "n_transformed_features": n_features,
                        "shap_shape": list(values.shape),
                        "finite_shap": bool(np.isfinite(values).all()),
                        "excluded_features_absent": bool(excluded.isdisjoint(context.raw_feature_names)),
                        "additive_max_abs_error": float(np.max(np.abs(reconstruction - model_output))),
                    }
                )
            if target == "lcx":
                target_checks["lcx_select_k_counts"] = [item["n_transformed_features"] for item in context_checks]
                target_checks["lcx_select_k_correct"] = all(count == 30 for count in target_checks["lcx_select_k_counts"])
            target_checks["contexts"] = context_checks
            target_checks["excluded_features_absent"] = all(item["excluded_features_absent"] for item in context_checks)
            target_checks["finite_shap"] = all(item["finite_shap"] for item in context_checks)
            checks["targets"][target] = target_checks
        return checks

    def latency_report(self, patient_df: pd.DataFrame, repeats: int = 3, top_n: int = 5) -> pd.DataFrame:
        rows = []
        for target in TARGETS:
            durations = []
            for _ in range(repeats):
                start = time.perf_counter()
                self.explain_target(patient_df, target, top_n=top_n)
                durations.append(time.perf_counter() - start)
            rows.append(
                {
                    "target": target,
                    "mean_seconds": float(np.mean(durations)),
                    "min_seconds": float(np.min(durations)),
                    "max_seconds": float(np.max(durations)),
                    "repeats": repeats,
                }
            )
        return pd.DataFrame(rows)

    def plot_global_importance(self, target: str, path: str | Path, top_n: int = 15) -> Path:
        importance = self.get_global_importance(target, top_n=top_n)
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        plot_df = importance.sort_values("mean_abs_shap", ascending=True)
        fig, ax = plt.subplots(figsize=(8, 6))
        ax.barh(plot_df["feature"], plot_df["mean_abs_shap"], color="#2f6f8f")
        ax.set_title(f"{target.upper()} Global SHAP Importance")
        ax.set_xlabel("Mean absolute SHAP value")
        ax.set_ylabel("Clinical feature")
        plt.tight_layout()
        fig.savefig(path, dpi=180)
        plt.close(fig)
        return path

    def plot_beeswarm(self, target: str, path: str | Path, max_display: int = 15) -> Path:
        target = target.lower()
        context = self.contexts[target][0]
        values = context.shap_values(self.X)
        transformed = context.transform(self.X)
        explanation = shap.Explanation(
            values=values,
            base_values=np.full(values.shape[0], context.expected_value),
            data=transformed,
            feature_names=context.transformed_feature_names,
        )
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        plt.figure(figsize=(8, 6))
        shap.plots.beeswarm(explanation, max_display=max_display, show=False)
        plt.title(f"{target.upper()} SHAP Beeswarm: Underlying Estimator 0")
        plt.tight_layout()
        plt.savefig(path, dpi=180, bbox_inches="tight")
        plt.close()
        return path

    def plot_waterfall(self, patient_df: pd.DataFrame, target: str, path: str | Path, max_display: int = 12) -> Path:
        target = target.lower()
        context = self.contexts[target][0]
        values = context.shap_values(patient_df)[0]
        transformed = context.transform(patient_df)[0]
        explanation = shap.Explanation(
            values=values,
            base_values=context.expected_value,
            data=transformed,
            feature_names=context.transformed_feature_names,
        )
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        plt.figure(figsize=(8, 6))
        shap.plots.waterfall(explanation, max_display=max_display, show=False)
        plt.title(f"{target.upper()} Local SHAP Waterfall")
        plt.tight_layout()
        plt.savefig(path, dpi=180, bbox_inches="tight")
        plt.close()
        return path

