from __future__ import annotations

import json
import platform
import time
import warnings
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import sklearn
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.calibration import CalibratedClassifierCV
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_selection import SelectKBest, mutual_info_classif
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    balanced_accuracy_score,
    brier_score_loss,
    confusion_matrix,
    f1_score,
    matthews_corrcoef,
    precision_recall_curve,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)
from sklearn.model_selection import RepeatedStratifiedKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from src.models.optimization import ECHO_FEATURES, FORBIDDEN_COLUMNS, TARGETS, find_project_root, load_inputs

warnings.filterwarnings("ignore", category=FutureWarning)

MODEL_VERSION = "1.0.0"
FINAL_RANDOM_STATE = 2026
TRAINING_RANDOM_STATE = 42
N_SPLITS = 5
N_REPEATS = 10
DATASET_NAME = "Extension of Z-Alizadeh Sani Dataset"


class FeatureSchemaSelector(BaseEstimator, TransformerMixin):
    """Selects a frozen feature subset from a raw dataframe and rejects missing required fields."""

    def __init__(self, selected_features, forbidden_features=None):
        self.selected_features = selected_features
        self.forbidden_features = forbidden_features

    def fit(self, X, y=None):
        self.selected_features_ = list(self.selected_features)
        self.forbidden_features_ = set(self.forbidden_features or [])
        return self

    def transform(self, X):
        X_df = pd.DataFrame(X).copy()
        missing = [col for col in self.selected_features_ if col not in X_df.columns]
        if missing:
            raise ValueError(f"Missing required input feature(s): {missing}")
        return X_df[self.selected_features_]


def frozen_configs() -> dict[str, dict[str, Any]]:
    return {
        "cad": {
            "display_target": "CAD",
            "algorithm": "LogisticRegression",
            "model_name": "cad_logreg_l2_balanced_drop_lymph",
            "threshold": 0.30,
            "drop_features": ["Lymph"],
            "selection_k": None,
            "estimator": LogisticRegression(
                penalty="l2",
                C=0.1,
                solver="liblinear",
                class_weight="balanced",
                max_iter=5000,
                random_state=TRAINING_RANDOM_STATE,
            ),
        },
        "lad": {
            "display_target": "LAD",
            "algorithm": "RandomForestClassifier",
            "model_name": "lad_random_forest_balanced",
            "threshold": 0.40,
            "drop_features": [],
            "selection_k": None,
            "estimator": RandomForestClassifier(
                n_estimators=25,
                max_depth=4,
                min_samples_leaf=5,
                min_samples_split=8,
                max_features="sqrt",
                class_weight="balanced",
                random_state=TRAINING_RANDOM_STATE,
                n_jobs=-1,
            ),
        },
        "lcx": {
            "display_target": "LCX",
            "algorithm": "LogisticRegression",
            "model_name": "lcx_elasticnet_logreg_drop_neut_selectk30",
            "threshold": 0.40,
            "drop_features": ["Neut"],
            "selection_k": 30,
            "estimator": LogisticRegression(
                penalty="elasticnet",
                C=0.1,
                solver="saga",
                l1_ratio=0.3,
                class_weight="balanced",
                max_iter=10000,
                random_state=TRAINING_RANDOM_STATE,
            ),
        },
        "rca": {
            "display_target": "RCA",
            "algorithm": "LogisticRegression",
            "model_name": "rca_logreg_l2_balanced_no_echo",
            "threshold": 0.35,
            "drop_features": list(ECHO_FEATURES),
            "selection_k": None,
            "estimator": LogisticRegression(
                penalty="l2",
                C=0.1,
                solver="liblinear",
                class_weight="balanced",
                max_iter=5000,
                random_state=TRAINING_RANDOM_STATE,
            ),
        },
    }


def target_feature_columns(all_features: list[str], config: dict[str, Any]) -> list[str]:
    return [feature for feature in all_features if feature not in set(config["drop_features"])]


def make_preprocessor(numeric_features: list[str], categorical_features: list[str], estimator_kind: str, selection_k=None):
    if estimator_kind == "logistic":
        preprocessor = ColumnTransformer(
            [
                ("num", Pipeline([("imputer", SimpleImputer(strategy="median")), ("scaler", StandardScaler())]), numeric_features),
                ("cat", Pipeline([("imputer", SimpleImputer(strategy="most_frequent")), ("onehot", OneHotEncoder(handle_unknown="ignore"))]), categorical_features),
            ],
            remainder="drop",
        )
    else:
        preprocessor = ColumnTransformer(
            [
                ("num", SimpleImputer(strategy="median"), numeric_features),
                ("cat", Pipeline([("imputer", SimpleImputer(strategy="most_frequent")), ("onehot", OneHotEncoder(handle_unknown="ignore"))]), categorical_features),
            ],
            remainder="drop",
        )
    steps: list[tuple[str, Any]] = [("preprocess", preprocessor)]
    if isinstance(selection_k, int):
        steps.append(("select_k_best", SelectKBest(score_func=mutual_info_classif, k=selection_k)))
    return Pipeline(steps)


def make_pipeline(config: dict[str, Any], raw_features: list[str], numeric_all: list[str], categorical_all: list[str]):
    selected_features = target_feature_columns(raw_features, config)
    numeric = [feature for feature in numeric_all if feature in selected_features]
    categorical = [feature for feature in categorical_all if feature in selected_features]
    estimator_kind = "logistic" if config["algorithm"] == "LogisticRegression" else "tree"
    return Pipeline(
        [
            ("schema", FeatureSchemaSelector(selected_features=selected_features, forbidden_features=FORBIDDEN_COLUMNS)),
            ("features", make_preprocessor(numeric, categorical, estimator_kind, config["selection_k"])),
            ("model", config["estimator"]),
        ]
    )


def make_calibrated_pipeline(config, raw_features, numeric_all, categorical_all, cv=3):
    base = make_pipeline(config, raw_features, numeric_all, categorical_all)
    return CalibratedClassifierCV(estimator=base, method="sigmoid", cv=cv)


def positive_probability(model, X):
    proba = model.predict_proba(X)
    if proba.shape[1] == 1:
        return np.full(len(X), proba[0, 0])
    return proba[:, 1]


def metrics_at_threshold(y_true, probability, threshold):
    pred = (np.asarray(probability) >= threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_true, pred, labels=[0, 1]).ravel()
    specificity = tn / (tn + fp) if (tn + fp) else np.nan
    return {
        "accuracy": accuracy_score(y_true, pred),
        "precision": precision_score(y_true, pred, zero_division=0),
        "recall": recall_score(y_true, pred, zero_division=0),
        "specificity": specificity,
        "f1": f1_score(y_true, pred, zero_division=0),
        "balanced_accuracy": balanced_accuracy_score(y_true, pred),
        "mcc": matthews_corrcoef(y_true, pred),
        "tn": int(tn),
        "fp": int(fp),
        "fn": int(fn),
        "tp": int(tp),
    }


def probability_metrics(y_true, probability):
    return {
        "roc_auc": roc_auc_score(y_true, probability),
        "pr_auc": average_precision_score(y_true, probability),
        "brier": brier_score_loss(y_true, probability),
        "ece": expected_calibration_error(y_true, probability),
    }


def expected_calibration_error(y_true, probability, n_bins=10):
    df = pd.DataFrame({"y": y_true, "p": probability})
    df["bin"] = pd.cut(df["p"], bins=np.linspace(0, 1, n_bins + 1), include_lowest=True)
    ece = 0.0
    for _, group in df.groupby("bin", observed=False):
        if group.empty:
            continue
        ece += len(group) / len(df) * abs(group["y"].mean() - group["p"].mean())
    return float(ece)


def summarize_fold_metrics(cv_metrics: pd.DataFrame):
    metric_cols = [
        "accuracy",
        "precision",
        "recall",
        "specificity",
        "f1",
        "balanced_accuracy",
        "mcc",
        "roc_auc",
        "pr_auc",
        "brier",
    ]
    rows = []
    for (target, threshold_name, probability_type), group in cv_metrics.groupby(["target", "threshold_name", "probability_type"]):
        row = {"target": target, "threshold_name": threshold_name, "probability_type": probability_type, "n_folds": len(group)}
        for metric in metric_cols:
            row[f"{metric}_mean"] = group[metric].mean()
            row[f"{metric}_std"] = group[metric].std(ddof=1)
            row[f"{metric}_min"] = group[metric].min()
            row[f"{metric}_max"] = group[metric].max()
            row[f"{metric}_approx_ci95"] = 1.96 * group[metric].std(ddof=1) / np.sqrt(N_REPEATS)
        rows.append(row)
    return pd.DataFrame(rows)


def run_locked_cv(X, y, raw_features, numeric_features, categorical_features):
    configs = frozen_configs()
    cv_rows = []
    oof_rows = []
    for target, config in configs.items():
        target_y = y[target].astype(int)
        cv = RepeatedStratifiedKFold(n_splits=N_SPLITS, n_repeats=N_REPEATS, random_state=FINAL_RANDOM_STATE)
        for fold_index, (train_idx, valid_idx) in enumerate(cv.split(X, target_y), start=1):
            repeat = ((fold_index - 1) // N_SPLITS) + 1
            fold = ((fold_index - 1) % N_SPLITS) + 1
            X_train, X_valid = X.iloc[train_idx], X.iloc[valid_idx]
            y_train, y_valid = target_y.iloc[train_idx], target_y.iloc[valid_idx]
            uncalibrated = make_pipeline(config, raw_features, numeric_features, categorical_features)
            calibrated = make_calibrated_pipeline(config, raw_features, numeric_features, categorical_features, cv=3)
            uncalibrated.fit(X_train, y_train)
            calibrated.fit(X_train, y_train)
            prob_uncal = np.clip(positive_probability(uncalibrated, X_valid), 0, 1)
            prob_cal = np.clip(positive_probability(calibrated, X_valid), 0, 1)
            for probability_type, probability in [("uncalibrated", prob_uncal), ("sigmoid", prob_cal)]:
                prob_m = probability_metrics(y_valid, probability)
                for threshold_name, threshold in [("0.50", 0.50), ("frozen", config["threshold"])]:
                    row = {
                        "target": target,
                        "model": config["model_name"],
                        "repeat": repeat,
                        "fold": fold,
                        "fold_index": fold_index,
                        "probability_type": probability_type,
                        "threshold_name": threshold_name,
                        "threshold": threshold,
                    }
                    row.update(metrics_at_threshold(y_valid, probability, threshold))
                    row.update(prob_m)
                    cv_rows.append(row)
            pred_05 = (prob_cal >= 0.5).astype(int)
            pred_frozen = (prob_cal >= config["threshold"]).astype(int)
            for idx, true_value, p_uncal, p_cal, p05, pf in zip(valid_idx, y_valid, prob_uncal, prob_cal, pred_05, pred_frozen):
                oof_rows.append(
                    {
                        "patient_index": int(idx),
                        "target": target,
                        "repeat": repeat,
                        "fold": fold,
                        "y_true": int(true_value),
                        "probability_uncalibrated": float(p_uncal),
                        "probability_calibrated": float(p_cal),
                        "prediction_0_5": int(p05),
                        "prediction_frozen_threshold": int(pf),
                    }
                )
            print(f"Completed {target} repeat {repeat} fold {fold}", flush=True)
    return pd.DataFrame(cv_rows), pd.DataFrame(oof_rows)


def plot_confusion(cm, title, path):
    fig, ax = plt.subplots(figsize=(4.5, 4))
    ax.imshow(cm, cmap="Blues")
    ax.set_xticks([0, 1])
    ax.set_xticklabels(["Pred 0", "Pred 1"])
    ax.set_yticks([0, 1])
    ax.set_yticklabels(["True 0", "True 1"])
    labels = np.array([["TN", "FP"], ["FN", "TP"]])
    for i in range(2):
        for j in range(2):
            ax.text(j, i, f"{labels[i, j]}\n{cm[i, j]}", ha="center", va="center", color="black")
    ax.set_title(title)
    plt.tight_layout()
    fig.savefig(path, dpi=180)
    plt.close(fig)


def create_figures(oof: pd.DataFrame, final_dir: Path):
    fig_dir = final_dir / "figures"
    fig_dir.mkdir(parents=True, exist_ok=True)
    configs = frozen_configs()
    stability_source = []
    for target in TARGETS:
        group = oof[oof["target"] == target]
        y_true = group["y_true"]
        p = group["probability_calibrated"]
        fpr, tpr, _ = roc_curve(y_true, p)
        precision, recall, _ = precision_recall_curve(y_true, p)
        roc_auc = roc_auc_score(y_true, p)
        pr_auc = average_precision_score(y_true, p)
        fig, ax = plt.subplots(figsize=(6, 5))
        ax.plot(fpr, tpr, label=f"ROC-AUC={roc_auc:.3f}")
        ax.plot([0, 1], [0, 1], "--", color="gray", linewidth=1)
        ax.set_title(f"{target.upper()} OOF ROC Curve")
        ax.set_xlabel("False Positive Rate")
        ax.set_ylabel("True Positive Rate")
        ax.legend()
        plt.tight_layout()
        fig.savefig(fig_dir / f"{target}_roc_curve.png", dpi=180)
        plt.close(fig)
        fig, ax = plt.subplots(figsize=(6, 5))
        ax.plot(recall, precision, label=f"AP={pr_auc:.3f}")
        ax.set_title(f"{target.upper()} OOF Precision-Recall Curve")
        ax.set_xlabel("Recall")
        ax.set_ylabel("Precision")
        ax.legend()
        plt.tight_layout()
        fig.savefig(fig_dir / f"{target}_pr_curve.png", dpi=180)
        plt.close(fig)
        fig, ax = plt.subplots(figsize=(6, 5))
        df = group.copy()
        df["bin"] = pd.cut(df["probability_calibrated"], bins=np.linspace(0, 1, 11), include_lowest=True)
        curve = df.groupby("bin", observed=False).agg(mean_probability=("probability_calibrated", "mean"), observed_rate=("y_true", "mean")).dropna()
        ax.plot(curve["mean_probability"], curve["observed_rate"], marker="o")
        ax.plot([0, 1], [0, 1], "--", color="gray")
        ax.set_title(f"{target.upper()} Calibration")
        ax.set_xlabel("Mean predicted probability")
        ax.set_ylabel("Observed positive rate")
        plt.tight_layout()
        fig.savefig(fig_dir / f"{target}_calibration.png", dpi=180)
        plt.close(fig)
        fig, ax = plt.subplots(figsize=(6, 4))
        ax.hist(group.loc[group["y_true"] == 0, "probability_calibrated"], bins=20, alpha=0.65, label="True 0")
        ax.hist(group.loc[group["y_true"] == 1, "probability_calibrated"], bins=20, alpha=0.65, label="True 1")
        ax.set_title(f"{target.upper()} Calibrated Probability Distribution")
        ax.set_xlabel("Predicted probability")
        ax.legend()
        plt.tight_layout()
        fig.savefig(fig_dir / f"{target}_probability_histogram.png", dpi=180)
        plt.close(fig)
        cm05 = confusion_matrix(group["y_true"], group["prediction_0_5"], labels=[0, 1])
        cmf = confusion_matrix(group["y_true"], group["prediction_frozen_threshold"], labels=[0, 1])
        plot_confusion(cm05, f"{target.upper()} Confusion Matrix @ 0.50", fig_dir / f"{target}_confusion_05.png")
        plot_confusion(cmf, f"{target.upper()} Confusion Matrix @ Frozen {configs[target]['threshold']}", fig_dir / f"{target}_confusion_frozen.png")
        for (repeat, fold), fold_group in group.groupby(["repeat", "fold"]):
            stability_source.append(
                {
                    "target": target,
                    "repeat": repeat,
                    "fold": fold,
                    "roc_auc": roc_auc_score(fold_group["y_true"], fold_group["probability_calibrated"]),
                    "f1": f1_score(fold_group["y_true"], fold_group["prediction_frozen_threshold"], zero_division=0),
                }
            )
    stability_df = pd.DataFrame(stability_source)
    for metric, filename in [("roc_auc", "stability_roc_auc.png"), ("f1", "stability_f1.png")]:
        fig, ax = plt.subplots(figsize=(7, 4.5))
        data = [stability_df.loc[stability_df["target"] == target, metric] for target in TARGETS]
        ax.boxplot(data, tick_labels=[t.upper() for t in TARGETS])
        ax.set_title(f"Repeated-CV Stability: {metric}")
        ax.set_ylabel(metric)
        plt.tight_layout()
        fig.savefig(fig_dir / filename, dpi=180)
        plt.close(fig)
    return fig_dir


def make_threshold_comparison(oof: pd.DataFrame):
    rows = []
    configs = frozen_configs()
    for target, group in oof.groupby("target"):
        for threshold_name, threshold, pred_col in [
            ("0.50", 0.50, "prediction_0_5"),
            ("frozen", configs[target]["threshold"], "prediction_frozen_threshold"),
        ]:
            m = metrics_at_threshold(group["y_true"], group["probability_calibrated"], threshold)
            rows.append({"target": target, "threshold_name": threshold_name, "threshold": threshold, **m})
    return pd.DataFrame(rows)


def make_calibration_metrics(oof: pd.DataFrame):
    rows = []
    for target, group in oof.groupby("target"):
        for label, col in [("uncalibrated", "probability_uncalibrated"), ("sigmoid", "probability_calibrated")]:
            rows.append({"target": target, "probability_type": label, **probability_metrics(group["y_true"], group[col])})
    return pd.DataFrame(rows)


def stability_summary(cv_metrics: pd.DataFrame):
    rows = []
    source = cv_metrics[(cv_metrics["probability_type"] == "sigmoid") & (cv_metrics["threshold_name"] == "frozen")]
    for target, group in source.groupby("target"):
        row = {"target": target}
        for metric in ["roc_auc", "pr_auc", "f1", "balanced_accuracy", "brier"]:
            row[f"{metric}_mean"] = group[metric].mean()
            row[f"{metric}_std"] = group[metric].std(ddof=1)
            row[f"{metric}_min"] = group[metric].min()
            row[f"{metric}_max"] = group[metric].max()
        row["unstable_warning"] = bool(row["roc_auc_std"] > 0.10 or row["f1_std"] > 0.15)
        rows.append(row)
    return pd.DataFrame(rows)


def compare_notebook04(final_summary: pd.DataFrame, optimization_dir: Path):
    nb04 = pd.read_csv(optimization_dir / "baseline_vs_optimized.csv")
    rows = []
    final = final_summary[(final_summary["probability_type"] == "sigmoid") & (final_summary["threshold_name"] == "frozen")]
    for _, old in nb04.iterrows():
        target = old["target"]
        new = final[final["target"] == target].iloc[0]
        rows.append(
            {
                "target": target,
                "notebook04_roc_auc": old["optimized_roc_auc"],
                "notebook05_roc_auc": new["roc_auc_mean"],
                "delta_roc_auc": new["roc_auc_mean"] - old["optimized_roc_auc"],
                "notebook04_pr_auc": old["optimized_pr_auc"],
                "notebook05_pr_auc": new["pr_auc_mean"],
                "delta_pr_auc": new["pr_auc_mean"] - old["optimized_pr_auc"],
                "notebook04_f1": old["optimized_f1"],
                "notebook05_f1": new["f1_mean"],
                "delta_f1": new["f1_mean"] - old["optimized_f1"],
                "notebook04_balanced_accuracy": old["optimized_balanced_accuracy"],
                "notebook05_balanced_accuracy": new["balanced_accuracy_mean"],
                "delta_balanced_accuracy": new["balanced_accuracy_mean"] - old["optimized_balanced_accuracy"],
                "notebook04_brier": old["optimized_brier"],
                "notebook05_brier": new["brier_mean"],
                "delta_brier": new["brier_mean"] - old["optimized_brier"],
            }
        )
    return pd.DataFrame(rows)


def package_versions():
    versions = {
        "python": platform.python_version(),
        "numpy": np.__version__,
        "pandas": pd.__version__,
        "scikit_learn": sklearn.__version__,
        "joblib": joblib.__version__,
    }
    return versions


def train_and_save_deployment_models(X, y, raw_features, numeric_features, categorical_features, models_dir: Path, final_summary: pd.DataFrame):
    configs = frozen_configs()
    models_dir.mkdir(parents=True, exist_ok=True)
    metadata = {
        "model_version": MODEL_VERSION,
        "created_at_utc": datetime.now(timezone.utc).isoformat(),
        "dataset_name": DATASET_NAME,
        "package_versions": package_versions(),
        "models": {},
    }
    saved_paths = {}
    summary = final_summary[(final_summary["probability_type"] == "sigmoid") & (final_summary["threshold_name"] == "frozen")]
    for target, config in configs.items():
        model = make_calibrated_pipeline(config, raw_features, numeric_features, categorical_features, cv=5)
        model.fit(X, y[target].astype(int))
        path = models_dir / f"{target}_pipeline.joblib"
        joblib.dump(model, path)
        saved_paths[target] = path
        selected_features = target_feature_columns(raw_features, config)
        metrics = summary[summary["target"] == target].iloc[0].to_dict()
        metadata["models"][target] = {
            "target": target,
            "model_name": config["model_name"],
            "algorithm": config["algorithm"],
            "hyperparameters": config["estimator"].get_params(),
            "expected_raw_features": raw_features,
            "excluded_features": config["drop_features"],
            "model_used_features": selected_features,
            "feature_selection": f"SelectKBest(k={config['selection_k']}) inside pipeline" if config["selection_k"] else "none",
            "calibration_method": "sigmoid via CalibratedClassifierCV(cv=5) on full deployment training data",
            "frozen_threshold": config["threshold"],
            "training_rows": int(len(X)),
            "random_seed": TRAINING_RANDOM_STATE,
            "dataset_name": DATASET_NAME,
            "validation_method": f"Locked-configuration repeated stratified CV: {N_SPLITS} folds x {N_REPEATS} repeats, random_state={FINAL_RANDOM_STATE}",
            "validation_accuracy": metrics["accuracy_mean"],
            "validation_precision": metrics["precision_mean"],
            "validation_recall": metrics["recall_mean"],
            "validation_f1": metrics["f1_mean"],
            "validation_roc_auc": metrics["roc_auc_mean"],
            "validation_pr_auc": metrics["pr_auc_mean"],
            "validation_specificity": metrics["specificity_mean"],
            "validation_balanced_accuracy": metrics["balanced_accuracy_mean"],
            "validation_mcc": metrics["mcc_mean"],
            "validation_brier": metrics["brier_mean"],
        }
    with open(models_dir / "model_metadata.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, default=str)
    return saved_paths, metadata


def make_input_schema(X: pd.DataFrame, metadata: pd.DataFrame, categorical_features: list[str], models_dir: Path):
    fields = []
    for feature in X.columns:
        is_categorical = feature in categorical_features
        series = X[feature]
        field = {
            "name": feature,
            "type": "categorical" if is_categorical else "number",
            "required": True,
        }
        if is_categorical:
            field["allowed_values"] = sorted([str(v) for v in series.dropna().unique().tolist()])
        fields.append(field)
    schema = {
        "model_version": MODEL_VERSION,
        "description": "Raw clinical input schema for CardioTwin vessel/CAD prediction pipelines.",
        "fields": fields,
        "forbidden_input_fields": sorted(FORBIDDEN_COLUMNS),
    }
    with open(models_dir / "input_schema.json", "w", encoding="utf-8") as f:
        json.dump(schema, f, indent=2)
    return schema


def reload_smoke_test(models_dir: Path, X: pd.DataFrame):
    rows = []
    sample = X.head(5).copy()
    reordered = sample[list(reversed(sample.columns))]
    for target in TARGETS:
        model = joblib.load(models_dir / f"{target}_pipeline.joblib")
        for label, frame in [("normal", sample), ("reordered", reordered)]:
            prob = positive_probability(model, frame)
            rows.append({"target": target, "case": label, "min_probability": float(np.min(prob)), "max_probability": float(np.max(prob)), "finite": bool(np.isfinite(prob).all()), "within_0_1": bool(((prob >= 0) & (prob <= 1)).all())})
        try:
            model.predict_proba(sample.drop(columns=[sample.columns[0]]))
            missing_error = "no_error"
        except Exception as exc:  # noqa: BLE001 - stored for smoke report
            missing_error = type(exc).__name__
        with_extra = sample.copy()
        with_extra["Cath"] = "CAD"
        prob_extra = positive_probability(model, with_extra)
        rows.append({"target": target, "case": "missing_required_column", "min_probability": np.nan, "max_probability": np.nan, "finite": missing_error != "no_error", "within_0_1": missing_error != "no_error", "error": missing_error})
        rows.append({"target": target, "case": "extra_target_column_ignored", "min_probability": float(np.min(prob_extra)), "max_probability": float(np.max(prob_extra)), "finite": bool(np.isfinite(prob_extra).all()), "within_0_1": bool(((prob_extra >= 0) & (prob_extra <= 1)).all())})
    result = pd.DataFrame(rows)
    assert result[result["case"].isin(["normal", "reordered", "extra_target_column_ignored"])]["finite"].all()
    assert result[result["case"].isin(["normal", "reordered", "extra_target_column_ignored"])]["within_0_1"].all()
    assert (result[result["case"] == "missing_required_column"]["error"] != "no_error").all()
    return result


def write_model_card(docs_dir: Path, final_summary: pd.DataFrame, notebook04_vs_final: pd.DataFrame):
    docs_dir.mkdir(parents=True, exist_ok=True)
    final = final_summary[(final_summary["probability_type"] == "sigmoid") & (final_summary["threshold_name"] == "frozen")]
    metric_lines = []
    for _, row in final.iterrows():
        metric_lines.append(
            f"- {row['target'].upper()}: ROC-AUC {row['roc_auc_mean']:.3f}, PR-AUC {row['pr_auc_mean']:.3f}, F1 {row['f1_mean']:.3f}, Brier {row['brier_mean']:.3f}"
        )
    text = f"""# CardioTwin Model Card

## Dataset
Extension of Z-Alizadeh Sani Dataset.

303 patients.

## Targets
Overall CAD, LAD stenosis, LCX stenosis, RCA stenosis.

## Leakage Prevention
Cath, LAD, LCX and RCA source labels were excluded from predictors. No target is used as a predictor for another target.

## Validation
Locked-configuration repeated stratified CV: 5 folds x 10 repeats, random_state=2026.

This is internal repeated cross-validation, not external clinical validation.

## Models
- CAD: Logistic Regression, drops Lymph.
- LAD: Random Forest, full legitimate feature set.
- LCX: ElasticNet Logistic Regression, drops Neut and uses fold-safe SelectKBest(k=30).
- RCA: Logistic Regression, excludes EF-TTE, Region RWMA and VHD.

## Metrics
{chr(10).join(metric_lines)}

## Probability Calibration
Sigmoid calibration is used via CalibratedClassifierCV. Calibration is fitted inside training folds for validation and with internal CV for deployment training.

## Decision Thresholds
Thresholds were chosen during development in Notebook 04 and frozen before Notebook 05: CAD 0.30, LAD 0.40, LCX 0.40, RCA 0.35.

## Feature Handling
CAD drops Lymph. LCX drops Neut and uses fold-safe SelectKBest(k=30). RCA excludes EF-TTE, Region RWMA and VHD. LAD uses the full legitimate feature set.

## Limitations
- only 303 patients
- single dataset
- internal cross-validation
- no external clinical validation
- performance uncertainty is important
- LCX/RCA prediction is more difficult
- probabilities are risk estimates, not diagnoses
- predictions are vessel-level
- the system cannot identify the exact physical lesion location from this tabular dataset

## Intended Use
Educational / decision-support hackathon prototype.

Not a medical device. Not a substitute for professional diagnosis or coronary imaging.
"""
    path = docs_dir / "model_card.md"
    path.write_text(text, encoding="utf-8")
    return path


def run_final_evaluation(project_root: Path | None = None):
    started = time.perf_counter()
    root = project_root or find_project_root()
    X, y, meta, numeric_features, categorical_features, baseline_summary, baseline_oof, baseline_overfit = load_inputs(root)
    final_dir = root / "ml" / "artifacts" / "metrics" / "final"
    models_dir = root / "ml" / "artifacts" / "models"
    final_dir.mkdir(parents=True, exist_ok=True)
    raw_features = X.columns.tolist()
    cv_metrics, oof = run_locked_cv(X, y, raw_features, numeric_features, categorical_features)
    final_summary = summarize_fold_metrics(cv_metrics)
    threshold_comp = make_threshold_comparison(oof)
    calibration = make_calibration_metrics(oof)
    stability = stability_summary(cv_metrics)
    notebook04_vs_final = compare_notebook04(final_summary, root / "ml" / "artifacts" / "metrics" / "optimization")
    cad_ensemble = pd.DataFrame(
        [
            {
                "eligible": False,
                "reason": "CAD ensemble not eligible for locked final evaluation because its configuration was not frozen before Notebook 05.",
            }
        ]
    )
    figure_dir = create_figures(oof, final_dir)
    final_cv_metrics_path = final_dir / "final_cv_metrics.csv"
    final_summary_path = final_dir / "final_summary.csv"
    oof_path = final_dir / "final_oof_predictions.csv"
    threshold_path = final_dir / "threshold_comparison.csv"
    calibration_path = final_dir / "calibration_metrics.csv"
    stability_path = final_dir / "stability_summary.csv"
    n4_path = final_dir / "notebook04_vs_final.csv"
    ensemble_path = final_dir / "cad_ensemble_comparison.csv"
    cv_metrics.to_csv(final_cv_metrics_path, index=False)
    final_summary.to_csv(final_summary_path, index=False)
    oof.to_csv(oof_path, index=False)
    threshold_comp.to_csv(threshold_path, index=False)
    calibration.to_csv(calibration_path, index=False)
    stability.to_csv(stability_path, index=False)
    notebook04_vs_final.to_csv(n4_path, index=False)
    cad_ensemble.to_csv(ensemble_path, index=False)
    saved_paths, model_metadata = train_and_save_deployment_models(X, y, raw_features, numeric_features, categorical_features, models_dir, final_summary)
    input_schema = make_input_schema(X, meta, categorical_features, models_dir)
    smoke = reload_smoke_test(models_dir, X)
    smoke.to_csv(final_dir / "reload_smoke_test.csv", index=False)
    model_card_path = write_model_card(root / "docs", final_summary, notebook04_vs_final)
    for path in [
        final_cv_metrics_path,
        final_summary_path,
        oof_path,
        threshold_path,
        calibration_path,
        stability_path,
        n4_path,
        ensemble_path,
        models_dir / "model_metadata.json",
        models_dir / "input_schema.json",
        model_card_path,
    ]:
        assert path.exists(), f"Missing expected artifact: {path}"
    suspicious = notebook04_vs_final[(notebook04_vs_final["notebook05_roc_auc"] > 0.95) | (notebook04_vs_final["delta_roc_auc"] > 0.10)]
    warnings = []
    if not suspicious.empty:
        warnings.append("Suspiciously high ROC-AUC or large increase detected; audit leakage before accepting.")
    if stability["unstable_warning"].any():
        warnings.append("At least one target has high repeated-CV variability.")
    execution_seconds = time.perf_counter() - started
    return {
        "execution_seconds": execution_seconds,
        "final_dir": final_dir,
        "figure_dir": figure_dir,
        "models_dir": models_dir,
        "saved_model_paths": {target: str(path) for target, path in saved_paths.items()},
        "metadata_path": str(models_dir / "model_metadata.json"),
        "input_schema_path": str(models_dir / "input_schema.json"),
        "model_card_path": str(model_card_path),
        "final_summary": final_summary,
        "threshold_comparison": threshold_comp,
        "calibration_metrics": calibration,
        "stability_summary": stability,
        "notebook04_vs_final": notebook04_vs_final,
        "cad_ensemble": cad_ensemble,
        "reload_smoke_test": smoke,
        "warnings": warnings,
    }
