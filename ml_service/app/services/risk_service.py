"""Risk scoring service backed by a saved Random Forest pipeline."""

from __future__ import annotations

from pathlib import Path

import joblib
import pandas as pd

MODELS_DIR = Path(__file__).resolve().parents[2] / "models" / "risk"
MODEL_PATH = MODELS_DIR / "random_forest.pkl"

# Matches train_random_forest.py
FEATURE_COLS = [
    "hourOfDaySubmitted",
    "revisionCount",
    "stageCount",
    "department",
    "priority"
]

LEVEL_MAP = {
    0: "low",
    1: "medium",
    2: "high",
    3: "critical",
}


def _load_model():
	if not MODEL_PATH.exists():
		raise FileNotFoundError(
			f"random_forest.pkl not found at {MODEL_PATH}. "
			"Run: python training/train_random_forest.py"
		)
	return joblib.load(MODEL_PATH)


def _normalize_features(features: list[dict]) -> pd.DataFrame:
    frame = pd.DataFrame(features)
    for col in FEATURE_COLS:
        if col not in frame.columns:
            frame[col] = None
    return frame[FEATURE_COLS]


def score_departments(features: list[dict]) -> list[dict]:
	"""Score a list of department feature vectors with confidence and importance."""
	model = _load_model()
	x = _normalize_features(features)

	predictions = model.predict(x)
	probabilities = model.predict_proba(x)
	importances = model.named_steps["classifier"].feature_importances_

	results: list[dict] = []
	for index, row in enumerate(features):
		predicted_class = int(predictions[index])
		# Score = weighted probability across classes (0-100)
		# Weight: low=0, medium=33, high=66, critical=100
		weights = [0.0, 33.0, 66.0, 100.0]
		probs = probabilities[index]
		# Pad weights in case model has fewer classes
		effective_weights = weights[:len(probs)]
		risk_score = sum(p * w for p, w in zip(probs, effective_weights))

		results.append(
			{
				"dept": row.get("dept", "unknown"),
				"score": round(risk_score, 1),
				"level": LEVEL_MAP.get(predicted_class, "low"),
				"featureImportance": {
					name: round(float(importance), 4)
					for name, importance in zip(FEATURE_COLS, importances)
				},
			}
		)

	return results


def score_risk(payload: dict):
	"""Backward-compatible single-item scoring used by legacy /risk route."""
	dept = payload.get("dept") or payload.get("id") or "unknown"
	features = [{**payload, "dept": dept}]
	result = score_departments(features)[0]
	return {
		"id": dept,
		"riskScore": result["score"],
		"riskLevel": result["level"],
		"featureImportance": result["featureImportance"],
	}
