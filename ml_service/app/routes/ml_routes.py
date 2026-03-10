from fastapi import APIRouter

from app.services.anomaly_service import detect_anomaly
from app.services.forecast_service import generate_forecast
from app.services.risk_service import score_risk

router = APIRouter()


@router.get("/health")
def ml_health():
	return {"status": "ok", "route": "ml"}


@router.post("/anomaly")
def anomaly(payload: dict):
	return detect_anomaly(payload)


@router.post("/forecast")
def forecast(payload: dict):
	return generate_forecast(payload)


@router.post("/risk")
def risk(payload: dict):
	return score_risk(payload)
