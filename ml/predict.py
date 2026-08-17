from __future__ import annotations

import json
from pathlib import Path

import joblib
import pandas as pd

MODEL_PATH = Path(__file__).resolve().parent / "models" / "saferoute_risk_model.joblib"


def predict_risk(input_data):
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Saved model not found at {MODEL_PATH}. Run ml/train.py first.")

    model = joblib.load(MODEL_PATH)

    if isinstance(input_data, dict):
        row = pd.DataFrame([input_data])
    elif isinstance(input_data, list):
        row = pd.DataFrame(input_data)
    else:
        raise TypeError("input_data must be a dictionary or list of dictionaries.")

    predictions = model.predict(row)
    risk_score = float(predictions[0])
    return {"risk_score": risk_score}


if __name__ == "__main__":
    example = {
        "city": "pune",
        "state": "maharashtra",
        "latitude": 18.5204,
        "longitude": 73.8567,
        "road_type": "urban",
        "weather": "clear",
        "visibility": "high",
        "traffic_density": "medium",
        "cause": "weather",
        "hour": 18,
        "day_of_week": "Friday",
        "is_weekend": 0,
        "is_peak_hour": 1,
        "vehicles_involved": 2,
        "casualties": 1,
        "temperature": 29,
        "month": 7,
        "year": 2024,
    }
    print(json.dumps(predict_risk(example), indent=2))
