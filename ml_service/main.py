"""
main.py  –  GovVision ML Service entry-point.

Start with:
    uvicorn main:app --port 8000 --reload

Environment variables (ml_service/.env):
    SERVICE_KEY   – shared secret; callers must send x-service-key header
    MONGODB_URI   – used by anomaly_service and the /ml/models/train endpoint
    PORT          – informational only (uvicorn CLI controls the actual port)
"""

import os
import subprocess
import sys
from pathlib import Path

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, status
from pydantic import BaseModel

# Always load .env from ml_service/ regardless of where uvicorn was launched
load_dotenv(Path(__file__).parent / ".env")

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(title="GovVision ML Service", version="1.0.0")

# ---------------------------------------------------------------------------
# Auth dependency  (shared secret checked on every protected route)
# ---------------------------------------------------------------------------
_SERVICE_KEY = os.getenv("SERVICE_KEY", "")


def require_service_key(x_service_key: str = Header(...)):
    """FastAPI dependency – rejects requests whose x-service-key is wrong."""
    if not _SERVICE_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SERVICE_KEY not configured on ML service",
        )
    if x_service_key != _SERVICE_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid service key",
        )


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------
class AnomalyRequest(BaseModel):
    """All feature fields are optional; missing values default to 0."""
    id: str = "unknown"
    cycleTimeHours: float = 0.0
    rejectionCount: float = 0.0
    revisionCount: float = 0.0
    daysOverSLA: float = 0.0
    stageCount: float = 0.0
    hourOfDaySubmitted: float = 0.0


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/health")
def health():
    """Public health-check — no auth required."""
    return {"status": "ok", "service": "GovVision ML Service"}


@app.post("/ml/anomaly/predict", dependencies=[Depends(require_service_key)])
def anomaly_predict(body: AnomalyRequest):
    """
    Score a single decision document for anomalies.

    Requires header:  x-service-key: <SERVICE_KEY>
    """
    from app.services.anomaly_service import detect_anomaly

    return detect_anomaly(body.model_dump())


@app.post("/ml/models/train", dependencies=[Depends(require_service_key)])
def models_train():
    """
    Trigger a background retraining run of the Isolation Forest model.

    Spawns training/train_isolation_forest.py as a subprocess so the HTTP
    response returns
    immediately while training runs in the background.

    Requires header:  x-service-key: <SERVICE_KEY>
    """
    train_script = os.path.join(
        os.path.dirname(__file__),
        "training",
        "train_isolation_forest.py",
    )
    subprocess.Popen(
        [sys.executable, train_script],
        cwd=os.path.dirname(__file__),
    )
    return {
        "status": "training started",
        "script": "training/train_isolation_forest.py",
    }
