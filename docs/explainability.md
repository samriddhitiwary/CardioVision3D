# CardioTwin Explainability

CardioTwin uses SHAP to describe how clinical input features contributed to each frozen model prediction for CAD, LAD, LCX, and RCA.

SHAP values describe how features influence this model's prediction. They do not establish medical causality.

## Scope

Model version `1.0.0` is frozen. The explainability layer does not retrain, tune, select new features, change thresholds, or alter calibration.

The displayed risk probability comes from the saved sigmoid-calibrated deployment pipeline. The SHAP explanations are computed on the fitted underlying decision estimators inside the calibration wrapper. Because sigmoid calibration changes the probability mapping, the SHAP values should be read as contributions to the underlying model score, not as an exact additive decomposition of the calibrated probability.

## Explainers

- CAD: `shap.LinearExplainer` on the underlying Logistic Regression estimators.
- LAD: `shap.TreeExplainer` on the underlying Random Forest estimators.
- LCX: `shap.LinearExplainer` on the underlying ElasticNet Logistic Regression estimators after `SelectKBest(k=30)`.
- RCA: `shap.LinearExplainer` on the underlying Logistic Regression estimators.

Each saved calibrated model contains five fitted internal estimators. Patient-level explanations average contributions across those internal estimators. Global importance is computed from mean absolute SHAP magnitude and aggregated to clinical feature names.

## Feature Names

Preprocessing creates transformed features such as scaled numeric columns and one-hot encoded categorical columns. The explainability layer exports both:

- transformed-feature importance, useful for audit and debugging
- aggregated clinical-feature importance, preferred for the dashboard

One-hot encoded columns are summed back into their original clinical variable. For example, category-level columns for `BBB` aggregate to `BBB`.

## Target-Specific Handling

- CAD excludes `Lymph`.
- LAD uses the full legitimate clinical feature set.
- LCX excludes `Neut` and explains only the selected transformed columns from `SelectKBest(k=30)`.
- RCA excludes `EF-TTE`, `Region RWMA`, and `VHD`.

Excluded features are not passed to the underlying explanation models.

## Local Interpretation

Positive SHAP values push the underlying model output toward the positive class. Negative SHAP values push it away from the positive class.

Use careful wording:

- "Age increased the model's predicted CAD risk."
- "This feature decreased the model's predicted risk."

Avoid causal wording:

- "Age caused CAD."
- "Region RWMA proves coronary obstruction."

## Limitations

This is an educational and decision-support hackathon prototype. It uses one small tabular dataset with internal validation only. SHAP explanations are model explanations, not clinical truth. They should be reviewed with the same caution as the model probabilities.

