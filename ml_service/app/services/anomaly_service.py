"""
anomaly_service.py

Loads the trained IsolationForest model and scaler once at import time.
Exposes detect_anomaly(payload) for single-decision scoring.

Feature columns MUST match training/train_isolation_forest.py exactly.
"""

from pathlib import Path

import joblib
import numpy as np

# ---------------------------------------------------------------------------
# Model loading – done once at module import, not per request
# ---------------------------------------------------------------------------
_MODELS_DIR = Path(__file__).resolve().parents[2] / "models" / "anomaly"

_model = joblib.load(_MODELS_DIR / "isolation_forest.pkl")
_scaler = joblib.load(_MODELS_DIR / "isolation_forest_scaler.pkl")

FEATURE_COLUMNS = [
    "cycleTimeHours",
    "rejectionCount",
    "revisionCount",
    "daysOverSLA",
]


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------
def _to_float(value, default: float = 0.0) -> float:
    """Safely coerce a payload value to float, falling back to default."""
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _get_severity(is_anomaly: bool, anomaly_score: float) -> str:
    """Map an anomaly_score in [0, 1] to a human-readable severity label."""
    if not is_anomaly:
        return "Normal"
    if anomaly_score >= 0.95:
        return "Critical"
    if anomaly_score >= 0.90:
        return "High"
    if anomaly_score >= 0.80:
        return "Medium"
    return "Low"


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
def detect_anomaly(payload: dict) -> dict:
    """Score a single decision document for anomalies (backward compat)."""
    results = detect_anomalies_batch([payload])
    return results[0]


def detect_anomalies_batch(payloads: list[dict]) -> list[dict]:
    """
    Score a batch of decision documents for anomalies.
    Returns: list of results with anomalyScore, isAnomaly, and severity.
    """
    if not payloads:
        return []

    # Build feature matrix in the same column order as training
    X = np.array([
        [_to_float(p.get(col), 0.0) for col in FEATURE_COLUMNS]
        for p in payloads
    ])

    # Scale and score
    X_scaled = _scaler.transform(X)
    raw_scores = _model.decision_function(X_scaled)
    predictions = _model.predict(X_scaled)

    results = []
    for i, payload in enumerate(payloads):
        # Normalise to [0, 1] where 1.0 = most anomalous
        # Typical raw_score range is [-0.5, 0.5]
        score = float(raw_scores[i])
        is_anomaly = bool(predictions[i] == -1)
        norm_score = round(max(0.0, min(1.0, (0.5 - score) / 1.0)), 4)

        results.append({
            "id": payload.get("id", "unknown"),
            "anomalyScore": norm_score,
            "isAnomaly": is_anomaly,
            "severity": _get_severity(is_anomaly, norm_score),
        })

    return results
