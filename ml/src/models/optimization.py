from __future__ import annotations

import itertools
import json
import math
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from catboost import CatBoostClassifier
from sklearn.base import BaseEstimator, TransformerMixin, clone
from sklearn.calibration import CalibratedClassifierCV
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import ExtraTreesClassifier, RandomForestClassifier
from sklearn.feature_selection import SelectKBest, VarianceThreshold, mutual_info_classif
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
    precision_score,
    precision_recall_curve,
    recall_score,
    roc_auc_score,
    roc_curve,
)
from sklearn.model_selection import RepeatedStratifiedKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from xgboost import XGBClassifier


RANDOM_STATE = 42
N_SPLITS = 5
N_REPEATS = 5
TARGETS = ["cad", "lad", "lcx", "rca"]
FORBIDDEN_COLUMNS = {"LAD", "LCX", "RCA", "Cath"}
ECHO_FEATURES = ["EF-TTE", "Region RWMA", "VHD"]


@dataclass
class CandidateSpec:
    target: str
    model_name: str
    family: str
    params: dict[str, Any]
    feature_strategy: str = "all"
    class_weight_mode: str = "none"
    selection_k: int | str | None = None


class CatBoostFramePreprocessor(BaseEstimator, TransformerMixin):
    def __init__(self, numeric_features, categorical_features):
        self.numeric_features = numeric_features
        self.categorical_features = categorical_features

    def fit(self, X, y=None):
        X_df = pd.DataFrame(X).copy()
        self.numeric_features_ = list(self.numeric_features)
        self.categorical_features_ = list(self.categorical_features)
        self.numeric_medians_ = X_df[self.numeric_features_].apply(pd.to_numeric, errors="coerce").median()
        self.categorical_modes_ = {}
        for col in self.categorical_features_:
            values = X_df[col].astype("string").fillna("<MISSING>")
            self.categorical_modes_[col] = values.mode().iloc[0] if not values.mode().empty else "<MISSING>"
        return self

    def transform(self, X):
        X_df = pd.DataFrame(X).copy()
        out = pd.DataFrame(index=X_df.index)
        for col in self.numeric_features_:
            out[col] = pd.to_numeric(X_df[col], errors="coerce").fillna(self.numeric_medians_[col])
        for col in self.categorical_features_:
            out[col] = X_df[col].astype("string").fillna(self.categorical_modes_[col]).astype(str)
        return out[self.numeric_features_ + self.categorical_features_]


def find_project_root(start: Path | None = None) -> Path:
    start = (start or Path.cwd()).resolve()
    for candidate in [start, *start.parents]:
        if (candidate / "ml" / "data" / "processed").exists():
            return candidate
        if candidate.name == "ml" and (candidate / "data" / "processed").exists():
            return candidate.parent
    raise FileNotFoundError("Could not locate project root containing ml/data/processed.")


def load_inputs(project_root: Path):
    processed = project_root / "ml" / "data" / "processed"
    baseline_dir = project_root / "ml" / "artifacts" / "metrics" / "baselines"
    X = pd.read_csv(processed / "features_clean.csv")
    y = pd.read_csv(processed / "targets_clean.csv")
    meta = pd.read_csv(processed / "feature_metadata.csv")
    baseline_summary = pd.read_csv(baseline_dir / "baseline_summary.csv")
    baseline_oof = pd.read_csv(baseline_dir / "oof_predictions.csv")
    baseline_overfit = pd.read_csv(baseline_dir / "overfitting_flags.csv")
    numeric = meta.loc[meta["feature_type"].eq("numeric"), "feature"].tolist()
    categoricals = meta.loc[~meta["feature_type"].eq("numeric"), "feature"].tolist()
    assert len(X) == len(y) == 303
    assert X.index.equals(y.index)
    assert list(y.columns) == TARGETS
    assert FORBIDDEN_COLUMNS.isdisjoint(X.columns), f"Leakage columns found: {FORBIDDEN_COLUMNS & set(X.columns)}"
    assert X.columns.is_unique
    assert set(numeric + categoricals) == set(X.columns)
    assert np.isfinite(X[numeric].apply(pd.to_numeric, errors="coerce").to_numpy()).all()
    for target in TARGETS:
        assert set(y[target].dropna().unique()).issubset({0, 1})
    return X, y, meta, numeric, categoricals, baseline_summary, baseline_oof, baseline_overfit


def candidate_feature_columns(all_columns: list[str], strategy: str) -> list[str]:
    cols = list(all_columns)
    if strategy == "drop_lymph":
        return [c for c in cols if c != "Lymph"]
    if strategy == "drop_neut":
        return [c for c in cols if c != "Neut"]
    if strategy == "no_echo":
        return [c for c in cols if c not in ECHO_FEATURES]
    return cols


def make_preprocessor(numeric: list[str], categorical: list[str], model_family: str, selection_k=None):
    if model_family == "logreg":
        base = ColumnTransformer(
            [
                ("num", Pipeline([("imputer", SimpleImputer(strategy="median")), ("scaler", StandardScaler())]), numeric),
                ("cat", Pipeline([("imputer", SimpleImputer(strategy="most_frequent")), ("onehot", OneHotEncoder(handle_unknown="ignore"))]), categorical),
            ],
            remainder="drop",
        )
    else:
        base = ColumnTransformer(
            [
                ("num", SimpleImputer(strategy="median"), numeric),
                ("cat", Pipeline([("imputer", SimpleImputer(strategy="most_frequent")), ("onehot", OneHotEncoder(handle_unknown="ignore"))]), categorical),
            ],
            remainder="drop",
        )
    steps: list[tuple[str, Any]] = [("preprocess", base)]
    if selection_k == "variance":
        steps.append(("variance", VarianceThreshold()))
    elif isinstance(selection_k, int):
        steps.append(("select", SelectKBest(score_func=mutual_info_classif, k=selection_k)))
    return Pipeline(steps)


def training_scale_pos_weight(y_train) -> float:
    positives = int(np.sum(np.asarray(y_train) == 1))
    negatives = int(np.sum(np.asarray(y_train) == 0))
    return 1.0 if positives == 0 else negatives / positives


def make_estimator(spec: CandidateSpec, spw: float):
    p = dict(spec.params)
    if spec.family == "logreg":
        if spec.class_weight_mode == "balanced":
            p["class_weight"] = "balanced"
        return LogisticRegression(**p)
    if spec.family == "extra_trees":
        if spec.class_weight_mode == "balanced":
            p["class_weight"] = "balanced"
        return ExtraTreesClassifier(**p)
    if spec.family == "random_forest":
        if spec.class_weight_mode == "balanced":
            p["class_weight"] = "balanced"
        return RandomForestClassifier(**p)
    if spec.family == "xgboost":
        if spec.class_weight_mode == "scale_pos_weight":
            p["scale_pos_weight"] = spw
        return XGBClassifier(**p)
    if spec.family == "catboost":
        if spec.class_weight_mode == "balanced":
            p["auto_class_weights"] = "Balanced"
        return CatBoostClassifier(**p)
    raise ValueError(f"Unknown family: {spec.family}")


def positive_probability(estimator, X_valid):
    proba = estimator.predict_proba(X_valid)
    if proba.shape[1] == 1:
        return np.full(len(X_valid), proba[0, 0])
    return proba[:, 1]


def metric_dict(y_true, y_prob, threshold=0.5):
    y_pred = (np.asarray(y_prob) >= threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()
    specificity = tn / (tn + fp) if (tn + fp) else np.nan
    return {
        "accuracy": accuracy_score(y_true, y_pred),
        "precision": precision_score(y_true, y_pred, zero_division=0),
        "recall_sensitivity": recall_score(y_true, y_pred, zero_division=0),
        "f1": f1_score(y_true, y_pred, zero_division=0),
        "roc_auc": roc_auc_score(y_true, y_prob) if len(np.unique(y_true)) == 2 else np.nan,
        "pr_auc_average_precision": average_precision_score(y_true, y_prob) if len(np.unique(y_true)) == 2 else np.nan,
        "specificity": specificity,
        "balanced_accuracy": balanced_accuracy_score(y_true, y_pred),
        "mcc": matthews_corrcoef(y_true, y_pred),
        "brier_score": brier_score_loss(y_true, y_prob),
        "tn": int(tn),
        "fp": int(fp),
        "fn": int(fn),
        "tp": int(tp),
    }


def summarize_metrics(cv_metrics: pd.DataFrame) -> pd.DataFrame:
    metric_cols = [
        "accuracy",
        "precision",
        "recall_sensitivity",
        "f1",
        "roc_auc",
        "pr_auc_average_precision",
        "specificity",
        "balanced_accuracy",
        "mcc",
        "brier_score",
    ]
    rows = []
    keys = ["target", "model", "family", "feature_strategy", "selection_k", "class_weight_mode", "calibration"]
    for key, group in cv_metrics.groupby(keys, dropna=False):
        row = dict(zip(keys, key))
        row["n_folds"] = len(group)
        for metric in metric_cols:
            row[f"{metric}_mean"] = group[metric].mean()
            row[f"{metric}_std"] = group[metric].std(ddof=1)
        rows.append(row)
    return pd.DataFrame(rows).sort_values(
        ["target", "roc_auc_mean", "pr_auc_average_precision_mean", "f1_mean"],
        ascending=[True, False, False, False],
    )


def build_candidate_specs() -> list[CandidateSpec]:
    log_common = {"max_iter": 1500, "random_state": RANDOM_STATE}
    tree_common = {"n_estimators": 25, "random_state": RANDOM_STATE, "n_jobs": -1}
    xgb_common = {
        "objective": "binary:logistic",
        "eval_metric": "logloss",
        "random_state": RANDOM_STATE,
        "n_jobs": 1,
        "verbosity": 0,
    }
    cat_common = {
        "loss_function": "Logloss",
        "eval_metric": "AUC",
        "random_seed": RANDOM_STATE,
        "verbose": False,
        "allow_writing_files": False,
        "thread_count": 1,
    }
    specs: list[CandidateSpec] = []
    for target in TARGETS:
        if target in {"cad", "rca", "lcx"}:
            for C, penalty, solver, cw, k in [
                (0.03, "l2", "liblinear", "none", None),
                (0.10, "l2", "liblinear", "balanced", None),
                (0.30, "l1", "liblinear", "balanced", None),
                (0.10, "elasticnet", "saga", "balanced", 30),
            ]:
                params = {**log_common, "C": C, "penalty": penalty, "solver": solver}
                if penalty == "elasticnet":
                    params["l1_ratio"] = 0.3
                specs.append(CandidateSpec(target, f"logreg_{penalty}_C{C}_cw{cw}_k{k or 'all'}", "logreg", params, "all", cw, k))
        if target in {"cad", "lad"}:
            for family in ["extra_trees", "random_forest"]:
                for depth, leaf, cw, max_features in [(3, 5, "none", "sqrt"), (4, 5, "balanced", "sqrt"), (5, 8, "balanced", 0.6)]:
                    params = {**tree_common, "max_depth": depth, "min_samples_leaf": leaf, "min_samples_split": 8, "max_features": max_features}
                    specs.append(CandidateSpec(target, f"{family}_d{depth}_leaf{leaf}_cw{cw}", family, params, "all", cw))
        if target in {"lad", "lcx", "rca"}:
            for depth, lr, cw in [(2, 0.05, "none"), (2, 0.05, "scale_pos_weight"), (3, 0.03, "scale_pos_weight")]:
                params = {**xgb_common, "n_estimators": 25, "max_depth": depth, "learning_rate": lr, "min_child_weight": 3, "subsample": 0.85, "colsample_bytree": 0.85, "gamma": 0.0, "reg_alpha": 0.1, "reg_lambda": 5.0}
                specs.append(CandidateSpec(target, f"xgboost_d{depth}_lr{lr}_cw{cw}", "xgboost", params, "all", cw))
            for depth, lr, cw in [(2, 0.05, "none"), (2, 0.05, "balanced"), (3, 0.03, "balanced")]:
                params = {**cat_common, "iterations": 25, "depth": depth, "learning_rate": lr, "l2_leaf_reg": 8.0, "random_strength": 1.0, "bagging_temperature": 0.5}
                specs.append(CandidateSpec(target, f"catboost_d{depth}_lr{lr}_cw{cw}", "catboost", params, "all", cw))
    allowed = {
        "cad": {
            "logreg_l2_C0.03_cwnone_kall",
            "logreg_l2_C0.1_cwbalanced_kall",
            "extra_trees_d4_leaf5_cwbalanced",
            "random_forest_d4_leaf5_cwbalanced",
        },
        "lad": {
            "extra_trees_d3_leaf5_cwnone",
            "extra_trees_d4_leaf5_cwbalanced",
            "random_forest_d4_leaf5_cwbalanced",
            "xgboost_d2_lr0.05_cwscale_pos_weight",
        },
        "lcx": {
            "xgboost_d2_lr0.05_cwscale_pos_weight",
            "catboost_d2_lr0.05_cwbalanced",
            "logreg_l2_C0.1_cwbalanced_kall",
            "logreg_elasticnet_C0.1_cwbalanced_k30",
        },
        "rca": {
            "logreg_l2_C0.1_cwbalanced_kall",
            "logreg_elasticnet_C0.1_cwbalanced_k30",
            "xgboost_d2_lr0.05_cwscale_pos_weight",
            "catboost_d2_lr0.05_cwbalanced",
        },
    }
    return [spec for spec in specs if spec.model_name in allowed.get(spec.target, set())]


def evaluate_specs(X, y, numeric, categorical, specs: list[CandidateSpec], calibration: str = "none", max_specs: int | None = None):
    metrics_rows = []
    oof_rows = []
    train_rows = []
    trial_rows = []
    specs = specs[:max_specs] if max_specs else specs
    for spec_idx, spec in enumerate(specs, start=1):
        target_series = y[spec.target].astype(int)
        cols = candidate_feature_columns(list(X.columns), spec.feature_strategy)
        num_cols = [c for c in numeric if c in cols]
        cat_cols = [c for c in categorical if c in cols]
        X_target = X[cols].copy()
        cv = RepeatedStratifiedKFold(n_splits=N_SPLITS, n_repeats=N_REPEATS, random_state=RANDOM_STATE)
        fold_metric_rows = []
        for fold_index, (train_idx, valid_idx) in enumerate(cv.split(X_target, target_series), start=1):
            repeat = ((fold_index - 1) // N_SPLITS) + 1
            fold = ((fold_index - 1) % N_SPLITS) + 1
            X_train, X_valid = X_target.iloc[train_idx], X_target.iloc[valid_idx]
            y_train, y_valid = target_series.iloc[train_idx], target_series.iloc[valid_idx]
            spw = training_scale_pos_weight(y_train)
            start = time.perf_counter()
            if spec.family == "catboost":
                prep = CatBoostFramePreprocessor(num_cols, cat_cols)
                X_train_fit = prep.fit_transform(X_train, y_train)
                X_valid_fit = prep.transform(X_valid)
                estimator = make_estimator(spec, spw)
                estimator.set_params(cat_features=cat_cols)
                if calibration != "none":
                    estimator = CalibratedClassifierCV(estimator=estimator, method=calibration, cv=3)
                estimator.fit(X_train_fit, y_train)
                valid_prob = np.clip(positive_probability(estimator, X_valid_fit), 0, 1)
                train_prob = np.clip(positive_probability(estimator, X_train_fit), 0, 1)
            else:
                preprocessor = make_preprocessor(num_cols, cat_cols, spec.family, spec.selection_k)
                estimator = make_estimator(spec, spw)
                pipe = Pipeline([("preprocess", preprocessor), ("model", estimator)])
                if calibration != "none":
                    pipe = CalibratedClassifierCV(estimator=pipe, method=calibration, cv=3)
                pipe.fit(X_train, y_train)
                valid_prob = np.clip(positive_probability(pipe, X_valid), 0, 1)
                train_prob = np.clip(positive_probability(pipe, X_train), 0, 1)
            fit_seconds = time.perf_counter() - start
            valid_metrics = metric_dict(y_valid, valid_prob)
            train_metrics = metric_dict(y_train, train_prob)
            row = {
                "target": spec.target,
                "model": spec.model_name,
                "family": spec.family,
                "feature_strategy": spec.feature_strategy,
                "selection_k": "all" if spec.selection_k is None else spec.selection_k,
                "class_weight_mode": spec.class_weight_mode,
                "calibration": calibration,
                "repeat": repeat,
                "fold": fold,
                "fold_index": fold_index,
                "fit_seconds": fit_seconds,
                "scale_pos_weight_train": spw,
                **valid_metrics,
            }
            metrics_rows.append(row)
            fold_metric_rows.append(row)
            train_rows.append({
                "target": spec.target,
                "model": spec.model_name,
                "calibration": calibration,
                "repeat": repeat,
                "fold": fold,
                "train_roc_auc": train_metrics["roc_auc"],
                "valid_roc_auc": valid_metrics["roc_auc"],
                "train_f1": train_metrics["f1"],
                "valid_f1": valid_metrics["f1"],
                "train_brier_score": train_metrics["brier_score"],
                "valid_brier_score": valid_metrics["brier_score"],
            })
            for row_id, y_true, prob in zip(valid_idx, y_valid, valid_prob):
                oof_rows.append({
                    "patient_index": int(row_id),
                    "target": spec.target,
                    "model": spec.model_name,
                    "family": spec.family,
                    "feature_strategy": spec.feature_strategy,
                    "selection_k": "all" if spec.selection_k is None else spec.selection_k,
                    "class_weight_mode": spec.class_weight_mode,
                    "calibration": calibration,
                    "repeat": repeat,
                    "fold": fold,
                    "y_true": int(y_true),
                    "probability": float(prob),
                    "prediction": int(prob >= 0.5),
                })
        fold_df = pd.DataFrame(fold_metric_rows)
        trial_rows.append({
            "target": spec.target,
            "model": spec.model_name,
            "family": spec.family,
            "feature_strategy": spec.feature_strategy,
            "selection_k": "all" if spec.selection_k is None else spec.selection_k,
            "class_weight_mode": spec.class_weight_mode,
            "calibration": calibration,
            "params_json": json.dumps(spec.params, sort_keys=True),
            "mean_roc_auc": fold_df["roc_auc"].mean(),
            "std_roc_auc": fold_df["roc_auc"].std(ddof=1),
            "mean_pr_auc": fold_df["pr_auc_average_precision"].mean(),
            "mean_f1": fold_df["f1"].mean(),
            "mean_brier": fold_df["brier_score"].mean(),
        })
        print(f"Evaluated {spec_idx}/{len(specs)}: {spec.target} {spec.model_name} calibration={calibration}", flush=True)
    return pd.DataFrame(metrics_rows), pd.DataFrame(oof_rows), pd.DataFrame(train_rows), pd.DataFrame(trial_rows)


def threshold_table(oof: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for (target, model, calibration), group in oof.groupby(["target", "model", "calibration"]):
        for threshold in np.round(np.arange(0.10, 0.91, 0.05), 2):
            m = metric_dict(group["y_true"], group["probability"], threshold)
            rows.append({"target": target, "model": model, "calibration": calibration, "threshold": threshold, **m})
    return pd.DataFrame(rows)


def expected_calibration_error(y_true, y_prob, n_bins=10) -> float:
    df = pd.DataFrame({"y": y_true, "p": y_prob})
    df["bin"] = pd.cut(df["p"], bins=np.linspace(0, 1, n_bins + 1), include_lowest=True)
    ece = 0.0
    for _, group in df.groupby("bin", observed=False):
        if group.empty:
            continue
        ece += len(group) / len(df) * abs(group["y"].mean() - group["p"].mean())
    return float(ece)


def calibration_summary(oof: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for (target, model, calibration), group in oof.groupby(["target", "model", "calibration"]):
        m = metric_dict(group["y_true"], group["probability"])
        rows.append({
            "target": target,
            "model": model,
            "calibration": calibration,
            "roc_auc": m["roc_auc"],
            "pr_auc_average_precision": m["pr_auc_average_precision"],
            "brier_score": m["brier_score"],
            "ece_10_bin": expected_calibration_error(group["y_true"], group["probability"]),
        })
    return pd.DataFrame(rows).sort_values(["target", "brier_score", "ece_10_bin"])


def ensemble_table(oof: pd.DataFrame, summary: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for target in TARGETS:
        top = summary[(summary["target"] == target) & (summary["calibration"] == "none")].head(3)["model"].tolist()
        for m1, m2 in itertools.combinations(top, 2):
            left = oof[(oof["target"] == target) & (oof["model"] == m1) & (oof["calibration"] == "none")]
            right = oof[(oof["target"] == target) & (oof["model"] == m2) & (oof["calibration"] == "none")]
            merged = left.merge(right, on=["patient_index", "target", "repeat", "fold", "y_true"], suffixes=("_m1", "_m2"))
            if merged.empty:
                continue
            for w in [0.25, 0.50, 0.75]:
                prob = w * merged["probability_m1"] + (1 - w) * merged["probability_m2"]
                m = metric_dict(merged["y_true"], prob)
                rows.append({"target": target, "model_1": m1, "model_2": m2, "weight_model_1": w, **m})
    return pd.DataFrame(rows).sort_values(["target", "roc_auc", "pr_auc_average_precision"], ascending=[True, False, False])


def run_optimization(project_root: Path | None = None):
    started = time.perf_counter()
    root = project_root or find_project_root()
    out_dir = root / "ml" / "artifacts" / "metrics" / "optimization"
    out_dir.mkdir(parents=True, exist_ok=True)
    X, y, meta, numeric, categorical, baseline_summary, baseline_oof, baseline_overfit = load_inputs(root)
    specs = build_candidate_specs()
    metrics, oof, train_valid, trials = evaluate_specs(X, y, numeric, categorical, specs, calibration="none")
    summary = summarize_metrics(metrics)
    best_specs = []
    for target in TARGETS:
        target_best = summary[summary["target"] == target].head(1)["model"].tolist()
        for spec in specs:
            if spec.target == target and spec.model_name in target_best:
                best_specs.append(spec)
    ablation_specs = []
    for spec in best_specs:
        for strategy in ["all", "drop_lymph", "drop_neut", "no_echo"]:
            ablation_specs.append(CandidateSpec(spec.target, f"{spec.model_name}__{strategy}", spec.family, spec.params, strategy, spec.class_weight_mode, spec.selection_k))
    ab_metrics, ab_oof, ab_train, ab_trials = evaluate_specs(X, y, numeric, categorical, ablation_specs, calibration="none")
    ab_summary = summarize_metrics(ab_metrics)
    correlated_feature_ablation = ab_summary[ab_summary["feature_strategy"].isin(["all", "drop_lymph", "drop_neut"])].copy()
    echo_feature_ablation = ab_summary[ab_summary["feature_strategy"].isin(["all", "no_echo"])].copy()
    feature_strategy_comparison = ab_summary.copy()
    calibrated_specs = []
    for target in TARGETS:
        row = summary[summary["target"] == target].iloc[0]
        for spec in specs:
            if spec.target == target and spec.model_name == row["model"]:
                calibrated_specs.append(spec)
                break
    calibration_metric_parts = [metrics[metrics["model"].isin([s.model_name for s in calibrated_specs])].copy()]
    calibration_oof_parts = [oof[oof["model"].isin([s.model_name for s in calibrated_specs])].copy()]
    for method in ["sigmoid", "isotonic"]:
        cm, co, ct, ctr = evaluate_specs(X, y, numeric, categorical, calibrated_specs, calibration=method)
        calibration_metric_parts.append(cm)
        calibration_oof_parts.append(co)
        trials = pd.concat([trials, ctr], ignore_index=True)
        train_valid = pd.concat([train_valid, ct], ignore_index=True)
    calibration_oof = pd.concat(calibration_oof_parts, ignore_index=True)
    calibration_comparison = calibration_summary(calibration_oof)
    optimized_cv_metrics = pd.concat([metrics, ab_metrics] + calibration_metric_parts[1:], ignore_index=True)
    optimized_oof_predictions = pd.concat([oof, ab_oof] + calibration_oof_parts[1:], ignore_index=True)
    optimized_summary = summarize_metrics(optimized_cv_metrics)
    threshold_analysis = threshold_table(calibration_oof)
    ensemble_comparison = ensemble_table(oof, summary)
    overfit_rows = []
    for (target, model), group in train_valid.groupby(["target", "model"]):
        row = {
            "target": target,
            "model": model,
            "train_roc_auc_mean": group["train_roc_auc"].mean(),
            "valid_roc_auc_mean": group["valid_roc_auc"].mean(),
            "roc_auc_gap_train_minus_valid": group["train_roc_auc"].mean() - group["valid_roc_auc"].mean(),
            "train_f1_mean": group["train_f1"].mean(),
            "valid_f1_mean": group["valid_f1"].mean(),
            "f1_gap_train_minus_valid": group["train_f1"].mean() - group["valid_f1"].mean(),
            "train_brier_score_mean": group["train_brier_score"].mean(),
            "valid_brier_score_mean": group["valid_brier_score"].mean(),
        }
        row["overfitting_flag"] = bool(row["roc_auc_gap_train_minus_valid"] > 0.15 or row["f1_gap_train_minus_valid"] > 0.15)
        overfit_rows.append(row)
    optimization_stability = pd.DataFrame(overfit_rows).sort_values(["overfitting_flag", "roc_auc_gap_train_minus_valid"], ascending=[False, False])
    baseline_compare_rows = []
    for target in TARGETS:
        opt = optimized_summary[(optimized_summary["target"] == target) & (optimized_summary["calibration"] == "none")].iloc[0]
        base = baseline_summary[baseline_summary["target"] == target].iloc[0]
        baseline_compare_rows.append({
            "target": target,
            "baseline_model": base["model"],
            "optimized_model": opt["model"],
            "baseline_roc_auc": base["roc_auc_mean"],
            "optimized_roc_auc": opt["roc_auc_mean"],
            "delta_roc_auc": opt["roc_auc_mean"] - base["roc_auc_mean"],
            "baseline_pr_auc": base["pr_auc_average_precision_mean"],
            "optimized_pr_auc": opt["pr_auc_average_precision_mean"],
            "delta_pr_auc": opt["pr_auc_average_precision_mean"] - base["pr_auc_average_precision_mean"],
            "baseline_f1": base["f1_mean"],
            "optimized_f1": opt["f1_mean"],
            "delta_f1": opt["f1_mean"] - base["f1_mean"],
            "baseline_balanced_accuracy": base["balanced_accuracy_mean"],
            "optimized_balanced_accuracy": opt["balanced_accuracy_mean"],
            "delta_balanced_accuracy": opt["balanced_accuracy_mean"] - base["balanced_accuracy_mean"],
            "baseline_brier": base["brier_score_mean"],
            "optimized_brier": opt["brier_score_mean"],
            "delta_brier": opt["brier_score_mean"] - base["brier_score_mean"],
            "baseline_roc_auc_std": base["roc_auc_std"],
            "optimized_roc_auc_std": opt["roc_auc_std"],
            "delta_roc_auc_std": opt["roc_auc_std"] - base["roc_auc_std"],
        })
    baseline_vs_optimized = pd.DataFrame(baseline_compare_rows)
    export_map = {
        "hyperparameter_trials.csv": trials,
        "optimized_cv_metrics.csv": optimized_cv_metrics,
        "optimized_summary.csv": optimized_summary,
        "optimized_oof_predictions.csv": optimized_oof_predictions,
        "feature_strategy_comparison.csv": feature_strategy_comparison,
        "correlated_feature_ablation.csv": correlated_feature_ablation,
        "echo_feature_ablation.csv": echo_feature_ablation,
        "calibration_comparison.csv": calibration_comparison,
        "threshold_analysis.csv": threshold_analysis,
        "ensemble_comparison.csv": ensemble_comparison,
        "baseline_vs_optimized.csv": baseline_vs_optimized,
        "optimization_stability.csv": optimization_stability,
    }
    for filename, table in export_map.items():
        table.to_csv(out_dir / filename, index=False)
    if not baseline_vs_optimized[(baseline_vs_optimized["optimized_roc_auc"] > 0.95) | (baseline_vs_optimized["delta_roc_auc"] > 0.10)].empty:
        print("WARNING: suspiciously high optimization result. Audit leakage before accepting.")
    execution_seconds = time.perf_counter() - started
    report = {
        "execution_seconds": execution_seconds,
        "baseline_vs_optimized": baseline_vs_optimized.to_dict("records"),
        "recommended": optimized_summary.groupby("target").head(1).to_dict("records"),
        "calibration": calibration_comparison.groupby("target").head(3).to_dict("records"),
        "thresholds": threshold_analysis.sort_values(["target", "f1", "balanced_accuracy"], ascending=[True, False, False]).groupby("target").head(3).to_dict("records"),
        "ensembles": ensemble_comparison.groupby("target").head(3).to_dict("records") if not ensemble_comparison.empty else [],
        "overfitting": optimization_stability[optimization_stability["overfitting_flag"]].to_dict("records"),
    }
    return {
        "output_dir": out_dir,
        "tables": export_map,
        "report": report,
    }
