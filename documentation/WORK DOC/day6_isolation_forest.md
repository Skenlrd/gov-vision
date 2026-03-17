# Day 6 - Isolation Forest ML Service (Complete Detailed Documentation)

## 1. Purpose of Day 6
Day 6 implements anomaly detection for Module 1 decision records using Isolation Forest.

The goal is to:
- Train an unsupervised ML model on historical decision behavior.
- Serve predictions through a FastAPI microservice.
- Secure internal ML endpoints with a shared `SERVICE_KEY` header.
- Return structured outputs (`anomalyScore`, `isAnomaly`, `severity`) for each decision payload.

This day is foundational for later days (risk scoring, automation, dashboards).

---

## 2. High-Level System Architecture

Request path and trust boundaries:

1. User interacts with frontend dashboard.
2. Frontend calls Node/Express backend (module APIs).
3. Backend handles user auth/role logic (JWT/role checks when enabled).
4. Backend calls ML service using internal `x-service-key`.
5. ML service loads trained model + scaler and returns anomaly predictions.

Current implementation status:
- ML service auth: implemented using `x-service-key`.
- User JWT/role auth: currently noted as skipped for now in project scope.

---

## 3. What Was Already Present Before Day 6
These existed before Day 6 and were used as prerequisites:

- Existing project structure with `client/`, `server/`, `ml_service/`, `documentation/`.
- MongoDB with decision data in `m1_decisions`.
- Existing backend TypeScript services and routes.
- Existing frontend dashboard and analytics components.

---

## 4. Cross-Day Changes (Important)
This section captures changes from other days that affect Day 6 behavior.

### 4.1 Department ID Scheme Migration (ObjectId removed)
Department references were changed from MongoDB ObjectId patterns to stable canonical string IDs:

- `FI001` -> Finance
- `HR002` -> Human Resources
- `OP003` -> Operations
- `IT004` -> Information Technology
- `CS005` -> Customer Service

Why this matters for ML and analytics:
- Stable IDs avoid cross-module ObjectId mismatch issues.
- Dashboard filters and ETL mapping now use the same deterministic keys.
- Easier joins, filtering, and reporting consistency.

Files tied to this change:
- `server/scripts/importCSV.ts` (alias normalization + canonical mapping)
- `client/src/pages/Dashboard.tsx` (department dropdown values)

### 4.2 KPI Snapshot Behavior (known note)
There is an existing KPI snapshot upsert-date behavior in backend analytics code that was diagnosed earlier. This is separate from Day 6 ML service itself, but documented here because it impacts analytics outputs consumed by dashboards.

---

## 5. Environment and Dependencies Installed

## 5.1 Client-side packages
In `client/`:
- `axios`
- `react-router-dom`
- `recharts`
- `echarts`
- `clsx`
- `tailwindcss` (dev)
- `postcss` (dev)
- `autoprefixer` (dev)
- `@types/node` (dev)

## 5.2 Server-side packages
In `server/`:
- `express`
- `mongoose`
- `redis`
- `node-cron`
- `axios`
- `jsonwebtoken`
- `dotenv`
- `@types/redis` (dev)

## 5.3 ML service packages
In `ml_service/` (Python environment):
- `fastapi`
- `uvicorn`
- `scikit-learn`
- `pandas`
- `numpy`
- `joblib`
- `pymongo`
- `python-dotenv`

---

## 6. Day 6 Implementation - Step-by-Step

## Step 1 - Data and schema pre-check
Validated `m1_decisions` availability and compatibility:
- Confirmed decision count is sufficient for training.
- Confirmed key features exist and are numeric-compatible.
- Confirmed department is string-based (canonical ID scheme).

## Step 2 - Python environment validation
Verified active Python virtual environment and interpreter path.

## Step 3 - Package validation
Confirmed all required ML packages were present and importable.

## Step 4 - Model artifact directory and gitignore
Created model artifacts folder and ensured pickle files are ignored:
- Folder: `ml_service/models/`
- Git ignore rule: `ml_service/models/*.pkl`

## Step 5 - Training script creation
Created `ml_service/train_models.py` with full training pipeline.

### 5.1 Data source
- MongoDB database: `govvision`
- Collection: `m1_decisions`
- Query filter: only records with `completedAt` present

### 5.2 Features used for training
Exact feature schema (must remain in this order):
1. `cycleTimeHours`
2. `rejectionCount`
3. `revisionCount`
4. `daysOverSLA`
5. `stageCount`
6. `hourOfDaySubmitted`

### 5.3 Missing value handling
For each feature column:
- If column missing entirely, create with 0.
- Convert values to numeric (`errors='coerce'`).
- Fill nulls with column mean.

### 5.4 Normalization and model training
- Scaler: `StandardScaler()`
- Training transform: `fit_transform(X)`
- Model: `IsolationForest(n_estimators=100, contamination=0.05, random_state=42)`

### 5.5 Artifacts produced
- `ml_service/models/isolation_forest.pkl`
- `ml_service/models/isolation_forest_scaler.pkl`

## Step 6 - Training execution and verification
Ran training script successfully and verified:
- Model file exists.
- Scaler file exists.
- Feature matrix built from 2500 rows.

## Step 7 - Inference service implementation
Replaced stub anomaly service with real model inference in:
- `ml_service/app/services/anomaly_service.py`

What it does:
- Loads model and scaler once at import time.
- Builds feature vector in exact training order.
- Applies `scaler.transform()` (not `fit_transform`) for inference.
- Computes `raw_score` from `decision_function` and anomaly class from `predict`.

## Step 8 - FastAPI app wiring
Updated `ml_service/main.py` with:
- Public `GET /health`
- Protected `POST /ml/anomaly/predict`
- Protected `POST /ml/models/train`
- `SERVICE_KEY` validation via `x-service-key` header dependency
- `.env` loading pinned to file location:
  - `load_dotenv(Path(__file__).parent / ".env")`

## Step 9 - Uvicorn service launch
Started ML service on port `8000` and validated health endpoint.

## Step 10 - Endpoint validation tests
Executed equivalent Postman/Thunder Client tests:
- `GET /health` -> 200 OK
- Normal payload -> `isAnomaly=false`, `severity=Normal`
- Extreme payload -> `isAnomaly=true`, `severity=Low`
- Wrong key -> 401 Unauthorized

---

## 7. Scoring Scheme and Calculations

## 7.1 IsolationForest output interpretation
`decision_function()` returns a signed score:
- Positive: more normal
- Negative: more anomalous

`predict()` returns:
- `1` for normal
- `-1` for anomaly

## 7.2 Normalized anomaly score formula
In inference code:

`anomalyScore = clamp((0.5 - raw_score) / 1.0, 0, 1)`

Where:
- `raw_score` is from `decision_function`.
- `clamp` bounds value into `[0, 1]`.
- Score is rounded to 4 decimals.

Interpretation:
- Near `0.0` = very normal
- Near `1.0` = highly anomalous

## 7.3 Severity mapping scheme
Severity is assigned only after anomaly state is known:

- If `isAnomaly = false` -> `Normal`
- If `isAnomaly = true` and score >= 0.95 -> `Critical`
- If `isAnomaly = true` and score >= 0.90 -> `High`
- If `isAnomaly = true` and score >= 0.80 -> `Medium`
- Else -> `Low`

Why an anomaly can still be `Low`:
- Binary anomaly flag comes from model boundary (`predict`).
- Severity band is a separate threshold layer on normalized score.

---

## 8. API Contracts (Day 6)

## 8.1 Health
Endpoint:
- `GET /health`

Response:
```json
{
  "status": "ok",
  "service": "GovVision ML Service"
}
```

## 8.2 Predict anomaly
Endpoint:
- `POST /ml/anomaly/predict`

Header:
- `x-service-key: <SERVICE_KEY>`

Request body:
```json
{
  "id": "test-anomaly",
  "cycleTimeHours": 999,
  "rejectionCount": 50,
  "revisionCount": 100,
  "daysOverSLA": 90,
  "stageCount": 20,
  "hourOfDaySubmitted": 3
}
```

Response shape:
```json
{
  "id": "test-anomaly",
  "anomalyScore": 0.5601,
  "isAnomaly": true,
  "severity": "Low"
}
```

## 8.3 Trigger retraining
Endpoint:
- `POST /ml/models/train`

Header:
- `x-service-key: <SERVICE_KEY>`

Behavior:
- Starts `train_models.py` asynchronously via subprocess.
- Returns immediately:
```json
{
  "status": "training started",
  "script": "train_models.py"
}
```

---

## 9. Exact Commands to Run (Bash/PowerShell Style)

Note: project was run on Windows PowerShell. Equivalent bash-style command flow is shown.

## 9.1 Start backend API (server)
```bash
cd server
npx ts-node server.ts
```

## 9.2 Re-import CSV decisions
```bash
cd server
npx ts-node scripts/importCSV.ts
```

## 9.3 Run one-time Day 6 model training
```bash
cd ml_service
python train_models.py
```

If using explicit venv python on Windows:
```bash
c:/Users/win/Desktop/GithubUploads/gov_vision/.venv/Scripts/python.exe train_models.py
```

## 9.4 Start ML service with Uvicorn
Recommended robust command:
```bash
c:/Users/win/Desktop/GithubUploads/gov_vision/.venv/Scripts/python.exe -m uvicorn main:app --port 8000 --app-dir c:/Users/win/Desktop/GithubUploads/gov_vision/ml_service
```

Alternative (inside `ml_service/`):
```bash
python -m uvicorn main:app --port 8000 --reload
```

## 9.5 Validate health endpoint
```bash
curl http://localhost:8000/health
```

## 9.6 Validate anomaly endpoint (normal sample)
```bash
curl -X POST "http://localhost:8000/ml/anomaly/predict" \
  -H "Content-Type: application/json" \
  -H "x-service-key: replace_with_long_random_service_key" \
  -d '{
    "id": "test-normal",
    "cycleTimeHours": 3,
    "rejectionCount": 2,
    "revisionCount": 5,
    "daysOverSLA": 0,
    "stageCount": 2,
    "hourOfDaySubmitted": 11
  }'
```

## 9.7 Validate anomaly endpoint (extreme sample)
```bash
curl -X POST "http://localhost:8000/ml/anomaly/predict" \
  -H "Content-Type: application/json" \
  -H "x-service-key: replace_with_long_random_service_key" \
  -d '{
    "id": "test-anomaly",
    "cycleTimeHours": 999,
    "rejectionCount": 50,
    "revisionCount": 100,
    "daysOverSLA": 90,
    "stageCount": 20,
    "hourOfDaySubmitted": 3
  }'
```

---

## 10. Environment Variables

## 10.1 `ml_service/.env`
Required:
- `MONGODB_URI`
- `SERVICE_KEY`
- `PORT` (informational)

Example current setup:
```env
MONGODB_URI=mongodb://localhost:27017/gov_vision
SERVICE_KEY=replace_with_long_random_service_key
PORT=8000
```

## 10.2 `server/.env`
Must use same `SERVICE_KEY` when server-to-ML calls are wired.

---

## 11. Files Created/Modified During Day 6

Primary Day 6 files:
- `ml_service/train_models.py` (created)
- `ml_service/app/services/anomaly_service.py` (implemented)
- `ml_service/main.py` (rewritten for endpoints + auth)
- `.gitignore` (added `ml_service/models/*.pkl`)
- `ml_service/models/isolation_forest.pkl` (generated)
- `ml_service/models/isolation_forest_scaler.pkl` (generated)

Related cross-day files affecting behavior:
- `server/scripts/importCSV.ts`
- `client/src/pages/Dashboard.tsx`

---

## 12. What Is Skipped / Deferred
Current project notes list these as skipped or deferred for now:
- Full user auth flow according to final role matrix.
- Redis production wiring.
- Department ObjectId usage (intentionally replaced by canonical string IDs).
- Full JWT-role enforcement on all routes in current working state.

---

## 13. Troubleshooting Notes Captured During Day 6

1. `Could not import module "main"` when running uvicorn:
- Cause: wrong working directory / missing `--app-dir`.
- Fix: provide `--app-dir .../ml_service`.

2. `SyntaxError` in `main.py` (`def YES require_service_key`):
- Cause: accidental text insertion while editing.
- Fix: restored correct function signature.

3. `SERVICE_KEY not configured on ML service`:
- Cause: `.env` loaded relative to cwd.
- Fix: `load_dotenv(Path(__file__).parent / ".env")`.

4. Port bind error `WinError 10048`:
- Cause: existing process already listening on port 8000.
- Fix: stop old process or reuse current running server.

---

## 14. Final Day 6 Status
Day 6 is complete and validated.

Completed outcomes:
- Trained IsolationForest model and scaler artifacts generated.
- ML inference service implemented and secured with internal service key.
- Endpoints available and validated with sample normal + anomaly payloads.
- Error handling and startup reliability improved (`.env` path + app-dir usage).
- Documentation consolidated in this file.

Next natural phase after Day 6:
- Integrate server-side proxy calls from Node backend to ML service.
- Add scheduled retraining and model version tracking.
- Expand anomaly severity calibration using business thresholds.
