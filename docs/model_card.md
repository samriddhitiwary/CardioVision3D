# CardioTwin Model Card

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
- CAD: ROC-AUC 0.921, PR-AUC 0.966, F1 0.895, Brier 0.101
- LAD: ROC-AUC 0.839, PR-AUC 0.874, F1 0.824, Brier 0.160
- LCX: ROC-AUC 0.733, PR-AUC 0.624, F1 0.614, Brier 0.206
- RCA: ROC-AUC 0.741, PR-AUC 0.630, F1 0.635, Brier 0.199

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
