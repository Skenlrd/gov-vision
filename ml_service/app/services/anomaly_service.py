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
_MODELS_DIR = Path(__file__).resolve().parents[2] / "models"

_model = joblib.load(_MODELS_DIR / "isolation_forest.pkl")
_scaler = joblib.load(_MODELS_DIR / "isolation_forest_scaler.pkl")

FEATURE_COLUMNS = [
    "cycleTimeHours",
    "rejectionCount",
    "revisionCount",
    "daysOverSLA",
    "stageCount",
    "hourOfDaySubmitted",
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
    """
    Score a single decision document for anomalies.

    Expected payload keys (all numeric, all optional – missing → 0):
        cycleTimeHours, rejectionCount, revisionCount,
        daysOverSLA, stageCount, hourOfDaySubmitted

    Returns:
        id            – echoed from payload
        anomalyScore  – float in [0, 1]; higher = more anomalous
        isAnomaly     – bool
        severity      – "Normal" | "Low" | "Medium" | "High" | "Critical"
    """
    # Build feature vector in the same column order as training
    features = np.array(
        [[_to_float(payload.get(col), 0.0) for col in FEATURE_COLUMNS]]
    )

    # Scale using the FITTED scaler (never fit_transform during inference)
    features_scaled = _scaler.transform(features)

    # decision_function: positive → normal, negative → anomalous
    # Typical range ≈ [-0.5, +0.5]
    raw_score: float = float(_model.decision_function(features_scaled)[0])
    is_anomaly: bool = bool(_model.predict(features_scaled)[0] == -1)

    # Normalise to [0, 1] where 1.0 = most anomalous
    # Maps +0.5 → 0.0,  0.0 → 0.5,  -0.5 → 1.0
    anomaly_score: float = round(max(0.0, min(1.0, (0.5 - raw_score) / 1.0)), 4)

    return {
        "id": payload.get("id", "unknown"),
        "anomalyScore": anomaly_score,
        "isAnomaly": is_anomaly,
        "severity": _get_severity(is_anomaly, anomaly_score),
    }
