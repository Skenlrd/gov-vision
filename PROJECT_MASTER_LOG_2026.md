# GovVision Comprehensive Project Master Log
**Detailed History of BPI Migration & Model Refinement**

## 1. Data ETL & Conversion (The Foundation)
- **Problem:** Small mock dataset needed replacement with high-volume real data.
- **Solution:** Processed **BPI Challenge 2017** (XES format).
- **Technical Steps:**
    - Developed a streaming Python parser to handle memory-heavy XES files.
    - Standardized terminology: "Loan" -> "Decision", "Customer" -> "Applicant".
    - Calculated `cycleTimeHours` and identified `status` (A_Accepted=approved, A_Denied=rejected).
    - Calculated `daysOverSLA` (30-day threshold).
    - Standardized 31,509 records into MongoDB `m1_decisions`.

## 2. Dashboard UI Modernization
- **Design Philosophy:** Premium SaaS aesthetic with dark mode and vibrant accents.
- **Components:**
    - **Report Builder:** Pill-style department selectors and responsive Grid layouts.
    - **Typography:** Moved to *Inter* and *Outfit* fonts for an academic/professional feel.
    - **Interactions:** Added hover micro-animations and custom SVG iconography.

## 3. ML Pipeline Deep Dive

### Isolation Forest (Anomaly Detection)
- **Contamination:** 0.05 (5% alert rate).
- **Feature Selection (Refinement):** Stripped noisy features (hour, stage count) to focus on 4 high-signal metrics: `cycleTimeHours`, `rejectionCount`, `revisionCount`, `daysOverSLA`.
- **Diagnostics:** Created jittered, log-scaled scatter plots to prove multi-feature anomaly detection.
- **FastAPI Integration:** Updated `anomaly_service.py` to support **Batch Prediction** (scoring all 31k decisions in seconds).

### Random Forest (Risk Scoring)
- **Model:** 200-tree Classifier with balanced class weights.
- **Accuracy:** 73% (High precision on "Safe" cases).
- **Features:** Optimized for BPI metrics (`hourOfDaySubmitted`, `revisionCount`, `stageCount`).
- **Score Calculation:** Updated to use probability-based scoring (0-100%).

### Prophet (Workload Forecasting)
- **Training:** 24 models generated.
- **Targets:** Volume, Delay, Approval Rate, Rejection Rate.
- **Logic:** Updated `forecast_service.py` to handle the specific BPI date ranges (now remapped to 2025-2026).

## 4. Critical Bug Fixes & System Alignment
- **Department ID Restoration:** Discovered BPI names ("Operations") were breaking the dashboard. Restored legacy IDs:
    - `OP001` (Operations)
    - `FI001` (Finance)
    - `IT001` (IT)
    - `HR001` (Human Resources)
    - `CS001` (CS)
- **Backend Job Fixes:**
    - **Anomaly Job:** Removed the strict "30-day recency" filter to allow scoring of the whole BPI dataset.
    - **Risk Job:** Updated to fetch BPI-specific feature averages from `m1_decisions`.
    - **API Payload:** Fixed a mismatch where the backend sent a list but the ML service expected a single object.

## 5. Current State & Environment
- **ML Service:** `uvicorn main:app` on Port 8000.
- **Backend Server:** `npm run dev` on Port 5002.
- **Frontend Client:** `npm run dev` on Port 5173.
- **Database:** MongoDB `govvision` (Collection: `m1_decisions`, `m3_kpi_snapshots`).

## 6. Commands for New Account
```bash
# Terminal 1: Run ML Service
cd ml_service
python -m uvicorn main:app --host 0.0.0.0 --port 8000

# Terminal 2: Populate Analytics
cd server
npm run run:anomaly-job    # Scores 31k docs
npm run run:forecast-job   # Generates 90-day outlooks
npm run run:risk-job       # Generates BPI risk scores
```
