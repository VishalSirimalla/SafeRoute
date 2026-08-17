# SafeRoute ML Service

This service exposes the trained SafeRoute risk model as a lightweight FastAPI API.

## Model path
The service loads the trained artifact from:

`../ml/models/saferoute_risk_model.joblib`

## Install dependencies

```bash
cd ml_service
python -m pip install -r requirements.txt
```

## Start the service

```bash
cd ml_service
uvicorn app:app --host 0.0.0.0 --port 8001 --reload
```

## Endpoints

### GET /health
Returns service status and whether the model is loaded.

### POST /predict-risk
Accepts a request body like the example below and returns the raw risk score together with a display risk category.

## Sample request

```json
{
  "city": "mumbai",
  "state": "maharashtra",
  "latitude": 19.076,
  "longitude": 72.877,
  "road_type": "urban",
  "weather": "clear",
  "visibility": 10,
  "traffic_density": "medium",
  "cause": "weather",
  "hour": 20,
  "day_of_week": "Friday",
  "is_weekend": false,
  "is_peak_hour": true,
  "vehicles_involved": 2,
  "casualties": 1,
  "temperature": 28,
  "month": 8,
  "year": 2026
}
```

## Sample response

```json
{
  "success": true,
  "risk_score": 0.26,
  "risk_category": "Low Risk"
}
```

## Notes
- The prediction is produced by the trained model already saved in the repository.
- No model retraining occurs when the service starts.
- This is a prototype service and is intended for API exposure only.
- The risk score is a prediction from historical data and is not a guaranteed real-world safety assessment.
