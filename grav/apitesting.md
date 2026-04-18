# API Testing Results — Module 3

Base URL: `http://localhost:5002`  
ML Service: `http://localhost:8000`  
Auth: JWT Bearer Token

---

## 1. Analytics & KPI Endpoints

| # | Method | Endpoint | Auth | Status |
|---|--------|----------|------|--------|
| 1 | GET | `/api/analytics/kpi-summary` | JWT + role | ✅ 200 |
| 2 | GET | `/api/analytics/kpi-summary/:deptId` | JWT + role | ✅ 200 |
| 3 | GET | `/api/analytics/decision-volume` | JWT + role | ✅ 200 |
| 4 | GET | `/api/analytics/cycle-time-histogram` | JWT + role | ✅ 200 |
| 5 | GET | `/api/analytics/compliance-trend` | JWT + role | ✅ 200 |
| 6 | GET | `/api/analytics/risk-heatmap` | JWT + role | ✅ 200 |
| 7 | GET | `/api/analytics/forecast` | JWT + role | ✅ 200 |

### Test Details

**1. KPI Summary (Org-wide)**  
- Input: No params  
- Response: `{ totalDecisions, approvedCount, rejectedCount, pendingCount, avgCycleTimeHours, complianceRate, violationCount, bottleneckRate, anomalyCount, riskScore, riskLevel }`

**2. KPI Summary (Department)**  
- Input: `:deptId = FI001`  
- Response: Same shape as above, scoped to FI001

**3. Decision Volume**  
- Input: `?granularity=daily`  
- Response: `{ series: [{ date, count }] }`

**4. Cycle Time Histogram**  
- Input: No params  
- Response: `{ histogram: [{ bucket, count }] }`

**5. Compliance Trend**  
- Input: `?deptIds=FI001,HR002`  
- Response: `{ lines: [{ dept, data: [{ date, rate }] }] }`

**6. Risk Heatmap**  
- Input: No params  
- Response: `{ Low: [...], Medium: [...], High: [...], Critical: [...] }` with `riskScore`, `riskLevel`, `featureImportance` per department

**7. Forecast**  
- Input: `?deptId=org&horizon=30&target=volume`  
- Response: `{ department, horizon, target, forecastData: [{ ds, yhat, yhat_lower, yhat_upper }] }`  
- Also tested with `?deptId=FI001&horizon=7&target=delay` → ✅ 200

---

## 2. AI / ML Endpoints

| # | Method | Endpoint | Auth | Status |
|---|--------|----------|------|--------|
| 1 | GET | `/api/ai/anomalies` | JWT + role | ✅ 200 |
| 2 | PUT | `/api/ai/anomalies/:id/acknowledge` | JWT + role | ✅ 200 |

### Test Details

**1. Get Anomalies**  
- Input: No params  
- Response: `{ Critical: [], High: [], Medium: [], Low: [], total: N }`

**2. Acknowledge Anomaly**  
- Input: `:id = valid anomaly ObjectId`  
- Response: `{ ...anomaly, isAcknowledged: true, acknowledgedAt: Date }`

### Auth Verification

| Test Case | Expected | Result |
|-----------|----------|--------|
| GET `/api/ai/anomalies` without token | 401 Unauthorized | ✅ Pass |
| PUT `/api/ai/anomalies/:id/acknowledge` with analyst role | 403 Forbidden | ✅ Pass |
| PUT `/api/ai/anomalies/:id/acknowledge` with admin role | 200 OK | ✅ Pass |

---

## 3. Event Webhook Endpoints

| # | Method | Endpoint | Auth | Status |
|---|--------|----------|------|--------|
| 1 | POST | `/api/events/decision-update` | Service Key | ✅ 200 |
| 2 | POST | `/api/events/compliance-update` | Service Key | ✅ 200 |

### Test Details

**1. Decision Update Webhook**  
- Input: `{ department: "FI001", decisionId: "abc123", status: "approved" }`  
- Response: `{ received: true, department: "FI001", status: "approved" }`

**2. Compliance Update Webhook**  
- Input: `{ violationId: "xyz", department: "HR002", severity: "high" }`  
- Response: `{ received: true }`

---

## 4. Report Endpoints

| # | Method | Endpoint | Auth | Status |
|---|--------|----------|------|--------|
| 1 | POST | `/api/reports/generate` | JWT + role | ✅ 200 |
| 2 | GET | `/api/reports` | JWT + role | ✅ 200 |
| 3 | GET | `/api/reports/:id/download` | JWT | ✅ 200 |

### Test Details

**1. Generate Report**  
- Input:
```json
{
  "type": "executive_summary",
  "format": "csv",
  "dateFrom": "2026-01-01",
  "dateTo": "2026-04-18",
  "departments": ["FI001"]
}
```
- Response: `{ report: { _id, type, format, status: "completed", filePath, generatedAt } }`

**2. List Reports**  
- Response: Array of report records sorted by date descending

**3. Download Report**  
- Input: `:id = valid report ObjectId`  
- Response: Binary file download (CSV / Excel / PDF)

---

## 5. Report Schedule Endpoints

| # | Method | Endpoint | Auth | Status |
|---|--------|----------|------|--------|
| 1 | POST | `/api/reports/schedules` | JWT + role | ✅ 201 |
| 2 | GET | `/api/reports/schedules` | JWT + role | ✅ 200 |
| 3 | PATCH | `/api/reports/schedules/:id/toggle` | JWT + role | ✅ 200 |
| 4 | DELETE | `/api/reports/schedules/:id` | JWT + role | ✅ 200 |

### Test Details

**1. Create Schedule**  
- Input:
```json
{
  "name": "Weekly Summary",
  "frequency": "weekly",
  "reportConfig": {
    "type": "executive_summary",
    "format": "pdf",
    "departments": ["FI001"],
    "dateRangeMode": "last_7_days"
  },
  "recipients": ["admin@gov.in"]
}
```
- Response: `{ schedule: { _id, name, frequency, nextRunAt, isActive: true } }`

**2. List Schedules**  
- Response: Array of schedule records

**3. Toggle Schedule**  
- Response: Updated schedule with `isActive` toggled

**4. Delete Schedule**  
- Response: `{ message: "Schedule deleted" }`

---

## 6. Python ML Service (FastAPI)

| # | Method | Endpoint | Auth | Status |
|---|--------|----------|------|--------|
| 1 | GET | `/health` | None | ✅ 200 |
| 2 | POST | `/ml/anomaly/predict` | Service Key | ✅ 200 |
| 3 | POST | `/ml/forecast/predict` | Service Key | ✅ 200 |
| 4 | POST | `/ml/risk/score` | Service Key | ✅ 200 |
| 5 | POST | `/ml/models/train` | Service Key | ✅ 200 |

### Test Details

**1. Health Check**  
- Response: `{ status: "ok", service: "GovVision ML Service" }`

**2. Anomaly Predict**  
- Input:
```json
{
  "decisions": [{
    "id": "test",
    "cycleTimeHours": 999,
    "rejectionCount": 50,
    "revisionCount": 100,
    "daysOverSLA": 90,
    "stageCount": 20
  }]
}
```
- Response: `{ results: [{ id, anomalyScore, isAnomaly: true, severity: "Critical" }] }`

**3. Forecast Predict**  
- Input: `{ timeSeries: [{ ds, y }], horizon: 7, target: "volume", department: "FI001" }`  
- Response: `{ forecast: [{ ds, yhat, yhat_lower, yhat_upper }] }`

**4. Risk Score**  
- Input: `{ features: [{ department, violationCount, openViolationRate, avgRiskScore, overdueCount, complianceRate, policyBreachFreq, escalationCount }] }`  
- Response: `{ scores: [{ department, score, level, featureImportance: {} }] }`

**5. Model Train**  
- Input: `{}`  
- Response: `{ status: "training_started" }`

---

## 7. Cron Jobs (Manual Runner Tests)

| # | Job | Command | Result | Status |
|---|-----|---------|--------|--------|
| 1 | Anomaly Detection | `npm run run:anomaly-job` | Loaded decisions, called ML, upserted anomalies | ✅ Pass |
| 2 | Forecast Generation | `npm run run:forecast-job` | Completed all dept × target × horizon | ✅ Pass |
| 3 | Risk Scoring | `npm run run:risk-job` | Updated snapshots with riskScore + riskLevel | ✅ Pass |
| 4 | Report Scheduler | Hourly cron at server startup | Checks due schedules, triggers generation | ✅ Pass |
