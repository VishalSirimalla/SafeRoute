# SafeRoute Machine Learning Pipeline

This directory contains the first machine-learning workflow for SafeRoute.

## Purpose
The prototype model predicts `risk_score` from the processed road accident dataset and saves a complete sklearn pipeline that includes preprocessing and the trained estimator.

## Files
- `train.py`: loads the processed dataset, validates approved features, trains models, evaluates them, and saves the best model
- `predict.py`: loads the saved trained model and exposes `predict_risk(input_data)`
- `requirements.txt`: Python dependency list for the ML pipeline
- `models/`: output directory for the saved model artifact
- `outputs/`: model comparison table and training report

## Approved target
- `risk_score`

## Approved dataset
- `datasets/processed/road_accidents_clean.csv`

## Approved problem
- Regression

## Current pipeline
1. Validate target existence.
2. Confirm approved feature columns exist.
3. Exclude target-related leakage columns such as `accident_severity`.
4. Train GradientBoostingRegressor and RandomForestRegressor, plus XGBRegressor when available.
5. Compare MAE, RMSE, and R².
6. Save the best pipeline as `ml/models/saferoute_risk_model.joblib`.

## Important limitations
- This is a prototype trained on historical data.
- It predicts a risk score, not guaranteed accident occurrence.
- Model quality depends on the data quality and future drift.
- Correlation does not imply causation.
