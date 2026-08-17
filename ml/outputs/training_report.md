# SafeRoute Risk Model Training Report

## Overview
- Dataset: `road_accidents_clean.csv`
- Dataset rows: 20000
- Training rows: 16000
- Test rows: 4000
- Target: `risk_score`
- Features used: city, state, latitude, longitude, road_type, weather, visibility, traffic_density, cause, hour, day_of_week, is_weekend, is_peak_hour, vehicles_involved, casualties, temperature, month, year
- Features excluded: accident_id, accident_severity, date, day, festival, has_coordinates, lanes, time, traffic_signal
- Leakage candidates excluded: accident_severity

## Preprocessing
- Numeric features: median imputation
- Categorical features: most-frequent imputation + one-hot encoding
- Missing values are handled inside the sklearn pipeline and not manually hard-coded.

## Target distribution
- Min: 0.1000
- Max: 1.0000
- Mean: 0.4379
- Std: 0.2188

## Model parameters
- GradientBoostingRegressor: {'alpha': 0.9, 'ccp_alpha': 0.0, 'criterion': 'friedman_mse', 'init': None, 'learning_rate': 0.1, 'loss': 'squared_error', 'max_depth': 3, 'max_features': None, 'max_leaf_nodes': None, 'min_impurity_decrease': 0.0, 'min_samples_leaf': 1, 'min_samples_split': 2, 'min_weight_fraction_leaf': 0.0, 'n_estimators': 100, 'n_iter_no_change': None, 'random_state': 42, 'subsample': 1.0, 'tol': 0.0001, 'validation_fraction': 0.1, 'verbose': 0, 'warm_start': False}
- RandomForestRegressor: {'bootstrap': True, 'ccp_alpha': 0.0, 'criterion': 'squared_error', 'max_depth': None, 'max_features': 1.0, 'max_leaf_nodes': None, 'max_samples': None, 'min_impurity_decrease': 0.0, 'min_samples_leaf': 1, 'min_samples_split': 2, 'min_weight_fraction_leaf': 0.0, 'monotonic_cst': None, 'n_estimators': 300, 'n_jobs': None, 'oob_score': False, 'random_state': 42, 'verbose': 0, 'warm_start': False}

## Evaluation metrics

| model | MAE | RMSE | R2 |
|---|---:|---:|---:|
| GradientBoostingRegressor | 0.040155 | 0.061211 | 0.919340 |
| RandomForestRegressor | 0.039028 | 0.063918 | 0.912048 |

## Best model
- Best model: **GradientBoostingRegressor**

## Limitations
- This is a prototype model trained on historical data and should not be treated as a real-world safety assessment.
- The dataset is historical; temporal drift can affect future performance.
- Correlation does not imply causation.
- This model predicts `risk_score`, not guaranteed accident occurrence.
- Model quality depends on the quality and completeness of the processed dataset.

