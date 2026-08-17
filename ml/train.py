from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

try:
    from xgboost import XGBRegressor
except Exception:  # pragma: no cover
    XGBRegressor = None

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "datasets" / "processed" / "road_accidents_clean.csv"
MODEL_PATH = Path(__file__).resolve().parent / "models" / "saferoute_risk_model.joblib"
COMPARISON_PATH = Path(__file__).resolve().parent / "outputs" / "model_comparison.csv"
REPORT_PATH = Path(__file__).resolve().parent / "outputs" / "training_report.md"

TARGET_COLUMN = "risk_score"
APPROVED_FEATURES = [
    "city",
    "state",
    "latitude",
    "longitude",
    "road_type",
    "weather",
    "visibility",
    "traffic_density",
    "cause",
    "hour",
    "day_of_week",
    "is_weekend",
    "is_peak_hour",
    "vehicles_involved",
    "casualties",
    "temperature",
    "month",
    "year",
]


def load_dataset(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path)
    if TARGET_COLUMN not in df.columns:
        raise ValueError(f"Target column '{TARGET_COLUMN}' not found in {path}.")
    print(f"Loaded dataset: {path}")
    print(f"Dataset shape: {df.shape}")
    return df


def verify_features(df: pd.DataFrame, feature_names: list[str]):
    present = []
    missing = []
    for feature in feature_names:
        if feature in df.columns:
            present.append(feature)
        else:
            missing.append(feature)
    print("\nFeature status:")
    print(f"Available: {present}")
    print(f"Unavailable: {missing}")
    return present, missing


def detect_target_leakage(df: pd.DataFrame):
    leakage_candidates = []
    for col in df.columns:
        if col == TARGET_COLUMN:
            continue
        lower = col.lower()
        if any(token in lower for token in ["severity", "risk", "score", "safety", "target", "outcome"]):
            if col not in APPROVED_FEATURES:
                leakage_candidates.append(col)
    if "accident_severity" in df.columns:
        leakage_candidates.append("accident_severity")
    leakage_candidates = sorted(set(leakage_candidates))
    if leakage_candidates:
        print("\nTarget leakage candidates identified:")
        for col in leakage_candidates:
            print(f"- {col}: excluded because it is directly related to accident severity/risk outcome and would leak target information.")
    else:
        print("\nNo direct target leakage candidates were detected in the non-approved columns.")
    return leakage_candidates


def build_preprocessor(X: pd.DataFrame):
    numeric_cols = X.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = [col for col in X.columns if col not in numeric_cols]

    transformers = []
    if numeric_cols:
        transformers.append(
            (
                "num",
                Pipeline(
                    steps=[
                        ("imputer", SimpleImputer(strategy="median")),
                    ]
                ),
                numeric_cols,
            )
        )
    if categorical_cols:
        transformers.append(
            (
                "cat",
                Pipeline(
                    steps=[
                        ("imputer", SimpleImputer(strategy="most_frequent")),
                        ("onehot", OneHotEncoder(handle_unknown="ignore")),
                    ]
                ),
                categorical_cols,
            )
        )

    if not transformers:
        raise ValueError("No usable features were found after feature selection.")

    return ColumnTransformer(transformers=transformers, remainder="drop")


def make_pipeline(estimator):
    return Pipeline(steps=[("preprocessor", None), ("model", estimator)])


def evaluate_model(pipeline, X_test, y_test):
    y_pred = pipeline.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    rmse = mean_squared_error(y_test, y_pred, squared=False)
    r2 = r2_score(y_test, y_pred)
    return {
        "MAE": mae,
        "RMSE": rmse,
        "R2": r2,
        "predictions": y_pred,
    }


def format_report(all_models, comparison_df, X_train, y_train, X_test, y_test, feature_columns, excluded_features, leakage_candidates, target_summary):
    best_row = comparison_df.sort_values(["RMSE", "MAE"], ascending=True).iloc[0]
    best_model_name = best_row["model"]

    lines = [
        "# SafeRoute Risk Model Training Report",
        "",
        "## Overview",
        f"- Dataset: `{DATA_PATH.name}`",
        f"- Dataset rows: {len(X_train) + len(X_test)}",
        f"- Training rows: {len(X_train)}",
        f"- Test rows: {len(X_test)}",
        f"- Target: `{TARGET_COLUMN}`",
        f"- Features used: {', '.join(feature_columns) if feature_columns else 'none'}",
        f"- Features excluded: {', '.join(excluded_features) if excluded_features else 'none'}",
        f"- Leakage candidates excluded: {', '.join(leakage_candidates) if leakage_candidates else 'none'}",
        "",
        "## Preprocessing",
        "- Numeric features: median imputation",
        "- Categorical features: most-frequent imputation + one-hot encoding",
        "- Missing values are handled inside the sklearn pipeline and not manually hard-coded.",
        "",
        "## Target distribution",
        f"- Min: {target_summary['min']:.4f}",
        f"- Max: {target_summary['max']:.4f}",
        f"- Mean: {target_summary['mean']:.4f}",
        f"- Std: {target_summary['std']:.4f}",
        "",
        "## Model parameters",
    ]

    for model_name, params in all_models.items():
        lines.append(f"- {model_name}: {params}")

    lines.extend([
        "",
        "## Evaluation metrics",
        "",
        "| model | MAE | RMSE | R2 |",
        "|---|---:|---:|---:|",
    ])
    for _, row in comparison_df.iterrows():
        lines.append(f"| {row['model']} | {row['MAE']:.6f} | {row['RMSE']:.6f} | {row['R2']:.6f} |")

    lines.extend([
        "",
        f"## Best model\n- Best model: **{best_model_name}**",
        "",
        "## Limitations",
        "- This is a prototype model trained on historical data and should not be treated as a real-world safety assessment.",
        "- The dataset is historical; temporal drift can affect future performance.",
        "- Correlation does not imply causation.",
        "- This model predicts `risk_score`, not guaranteed accident occurrence.",
        "- Model quality depends on the quality and completeness of the processed dataset.",
        "",
    ])
    return "\n".join(lines) + "\n"


def main():
    MODEL_ROOT = Path(__file__).resolve().parent / "models"
    OUTPUT_ROOT = Path(__file__).resolve().parent / "outputs"
    MODEL_ROOT.mkdir(parents=True, exist_ok=True)
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)

    df = load_dataset(DATA_PATH)
    feature_columns, missing_features = verify_features(df, APPROVED_FEATURES)
    excluded_features = missing_features + [col for col in df.columns if col not in feature_columns and col != TARGET_COLUMN]
    leakage_candidates = detect_target_leakage(df)

    features_to_use = [col for col in feature_columns if col not in leakage_candidates]
    excluded_features = sorted(set(missing_features + leakage_candidates + [col for col in df.columns if col not in features_to_use and col != TARGET_COLUMN and col not in leakage_candidates]))

    X = df[features_to_use].copy()
    y = df[TARGET_COLUMN].copy()

    if X.empty:
        raise ValueError("No approved features were available for training after validation.")

    print(f"\nTraining with features: {features_to_use}")
    print(f"Excluded features: {excluded_features}")

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
    )

    models = {
        "GradientBoostingRegressor": GradientBoostingRegressor(random_state=42),
        "RandomForestRegressor": RandomForestRegressor(random_state=42, n_estimators=300),
    }

    if XGBRegressor is not None:
        models["XGBRegressor"] = XGBRegressor(
            random_state=42,
            n_estimators=500,
            learning_rate=0.05,
            max_depth=6,
            objective="reg:squarederror",
        )
        print("\nXGBoost is available; training XGBRegressor as a third model.")
    else:
        print("\nXGBoost is not available; skipping XGBRegressor.")

    all_model_artifacts = {}
    comparison_rows = []

    for model_name, estimator in models.items():
        pipe = make_pipeline(estimator)
        pipe.steps[0] = ("preprocessor", build_preprocessor(X_train))
        pipe.fit(X_train, y_train)

        metrics = evaluate_model(pipe, X_test, y_test)
        comparison_rows.append(
            {
                "model": model_name,
                "MAE": float(metrics["MAE"]),
                "RMSE": float(metrics["RMSE"]),
                "R2": float(metrics["R2"]),
            }
        )
        all_model_artifacts[model_name] = pipe

        print(f"\nModel: {model_name}")
        print(f"MAE: {metrics['MAE']:.6f}")
        print(f"RMSE: {metrics['RMSE']:.6f}")
        print(f"R2: {metrics['R2']:.6f}")

    comparison_df = pd.DataFrame(comparison_rows)
    comparison_df = comparison_df.sort_values(["RMSE", "MAE"], ascending=True).reset_index(drop=True)
    comparison_df.to_csv(COMPARISON_PATH, index=False)
    print(f"\nSaved model comparison to {COMPARISON_PATH}")

    best_model_name = comparison_df.iloc[0]["model"]
    best_pipeline = all_model_artifacts[best_model_name]
    best_pipeline.fit(X, y)
    joblib.dump(best_pipeline, MODEL_PATH)
    print(f"Saved trained pipeline to {MODEL_PATH}")

    y_train_summary = y_train.describe()
    target_summary = {
        "min": float(y_train_summary["min"]),
        "max": float(y_train_summary["max"]),
        "mean": float(y_train_summary["mean"]),
        "std": float(y_train_summary["std"]),
    }

    sample_predictions = best_pipeline.predict(X_test.head(5))
    print("\nSample predictions vs actual:")
    for idx, value in enumerate(sample_predictions):
        actual = float(y_test.iloc[idx])
        pred = float(value)
        print(f"Sample {idx + 1}: actual={actual:.6f}, predicted={pred:.6f}, delta={pred - actual:.6f}")

    pred_min = float(sample_predictions.min())
    pred_max = float(sample_predictions.max())
    outside_range = int(np.sum((sample_predictions < target_summary["min"]) | (sample_predictions > target_summary["max"])))
    print(f"\nPrediction range: min={pred_min:.6f}, max={pred_max:.6f}")
    print(f"Predictions outside training target range: {outside_range}")

    model_params = {name: str(estimator.get_params()) for name, estimator in models.items()}
    report_content = format_report(
        model_params,
        comparison_df,
        X_train,
        y_train,
        X_test,
        y_test,
        features_to_use,
        excluded_features,
        leakage_candidates,
        target_summary,
    )
    REPORT_PATH.write_text(report_content, encoding="utf-8")
    print(f"Saved training report to {REPORT_PATH}")

    print("\nTraining pipeline complete.")


if __name__ == "__main__":
    main()
