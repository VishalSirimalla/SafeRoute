from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, field_validator

ROOT = Path(__file__).resolve().parent.parent
MODEL_PATH = ROOT / "ml" / "models" / "saferoute_risk_model.joblib"

app = FastAPI(title="SafeRoute ML Service", version="1.0.0")


class RiskPredictionRequest(BaseModel):
    city: str = Field(..., description="City name")
    state: str = Field(..., description="State name")
    latitude: float = Field(..., description="Latitude coordinate")
    longitude: float = Field(..., description="Longitude coordinate")
    road_type: str = Field(..., description="Road type")
    weather: str = Field(..., description="Weather condition")
    visibility: float = Field(..., description="Visibility level")
    traffic_density: str = Field(..., description="Traffic density")
    cause: str = Field(..., description="Accident cause")
    hour: int = Field(..., description="Hour of day")
    day_of_week: str = Field(..., description="Day of week")
    is_weekend: bool = Field(..., description="Weekend flag")
    is_peak_hour: bool = Field(..., description="Peak hour flag")
    vehicles_involved: int = Field(..., description="Number of vehicles involved")
    casualties: int = Field(..., description="Number of casualties")
    temperature: float = Field(..., description="Temperature")
    month: int = Field(..., description="Month")
    year: int = Field(..., description="Year")

    @field_validator("latitude")
    @classmethod
    def validate_latitude(cls, value: float):
        if value < -90 or value > 90:
            raise ValueError("latitude must be between -90 and 90")
        return value

    @field_validator("longitude")
    @classmethod
    def validate_longitude(cls, value: float):
        if value < -180 or value > 180:
            raise ValueError("longitude must be between -180 and 180")
        return value

    @field_validator("hour")
    @classmethod
    def validate_hour(cls, value: int):
        if value < 0 or value > 23:
            raise ValueError("hour must be between 0 and 23")
        return value

    @field_validator("month")
    @classmethod
    def validate_month(cls, value: int):
        if value < 1 or value > 12:
            raise ValueError("month must be between 1 and 12")
        return value

    @field_validator("year")
    @classmethod
    def validate_year(cls, value: int):
        if value < 2000 or value > 2100:
            raise ValueError("year appears unrealistic for this dataset")
        return value

    @field_validator("visibility")
    @classmethod
    def validate_visibility(cls, value: float):
        if value < 0:
            raise ValueError("visibility must be non-negative")
        return value


def get_risk_category(risk_score: float) -> str:
    if risk_score < 0.33:
        return "Low Risk"
    if risk_score < 0.66:
        return "Moderate Risk"
    return "High Risk"


MODEL = None


@app.on_event("startup")
def load_model():
    global MODEL
    if not MODEL_PATH.exists():
        raise RuntimeError(f"Model file not found at {MODEL_PATH}")
    try:
        MODEL = joblib.load(MODEL_PATH)
    except Exception as exc:  # pragma: no cover
        raise RuntimeError(f"Failed to load model: {exc}") from exc


@app.get("/health")
def health_check():
    return {
        "success": True,
        "service": "SafeRoute ML Service",
        "model_loaded": MODEL is not None,
    }


@app.post("/predict-risk")
def predict_risk(payload: RiskPredictionRequest):
    if MODEL is None:
        raise HTTPException(status_code=503, detail="Model is not loaded")

    try:
        df = pd.DataFrame([payload.model_dump()])
        prediction = MODEL.predict(df)[0]
        risk_score = float(prediction)
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(exc)}") from exc

    return {
        "success": True,
        "risk_score": risk_score,
        "risk_category": get_risk_category(risk_score),
    }
