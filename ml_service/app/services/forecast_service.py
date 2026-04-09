"""
forecast_service.py

Load trained Prophet models and generate forecast rows.

This module is intentionally small so the FastAPI route layer can stay thin.
"""

from __future__ import annotations

from pathlib import Path
from typing import Dict, List

import joblib
from prophet import Prophet

MODELS_DIR = Path(__file__).resolve().parents[2] / "models"
TARGET_MODEL_PREFIX = {
	"volume": "prophet",
	"delay": "prophet_delay",
}


def load_prophet_model(dept_id: str, target: str) -> Prophet:
	"""Load a trained Prophet model for a department or the org-level model."""
	if target not in TARGET_MODEL_PREFIX:
		raise ValueError("target must be 'volume' or 'delay'")

	safe_dept_id = dept_id.replace("/", "_").replace(" ", "_")
	prefix = TARGET_MODEL_PREFIX[target]
	path = MODELS_DIR / f"{prefix}_{safe_dept_id}.pkl"

	if not path.exists():
		raise FileNotFoundError(
			f"No {target} Prophet model found for department: {dept_id}"
		)

	return joblib.load(path)


def generate_forecast(payload: dict) -> Dict[str, object]:
	"""Generate forecast rows from a request payload."""
	dept_id = str(payload.get("dept_id") or payload.get("deptId") or "org")
	horizon = int(payload.get("horizon", 7))
	target = str(payload.get("target") or "volume").lower()

	if horizon not in (7, 14, 30):
		raise ValueError("horizon must be 7, 14, or 30")
	if target not in TARGET_MODEL_PREFIX:
		raise ValueError("target must be 'volume' or 'delay'")

	model = load_prophet_model(dept_id, target)
	future = model.make_future_dataframe(periods=horizon, freq="D")
	forecast = model.predict(future).tail(horizon)

	forecast_data: List[Dict[str, object]] = []
	for _, row in forecast.iterrows():
		forecast_data.append(
			{
				"ds": row["ds"].strftime("%Y-%m-%d"),
				"yhat": round(float(row["yhat"]), 2),
				"yhat_lower": round(float(row["yhat_lower"]), 2),
				"yhat_upper": round(float(row["yhat_upper"]), 2),
			}
		)

	return {
		"dept_id": dept_id,
		"horizon": horizon,
		"target": target,
		"forecastData": forecast_data,
	}
