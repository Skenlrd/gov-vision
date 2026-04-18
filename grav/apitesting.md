# API Testing Results — Module 3

Base URL: `http://localhost:5002`  
ML Service: `http://localhost:8000`  
Auth: JWT Bearer Token

---

## 1. Analytics & KPI Endpoints

| #   | Method | Endpoint                              | Auth       | Status |
| --- | ------ | ------------------------------------- | ---------- | ------ |
| 1   | GET    | `/api/analytics/kpi-summary`          | JWT + role | ✅ 200 |
| 2   | GET    | `/api/analytics/kpi-summary/:deptId`  | JWT + role | ✅ 200 |
| 3   | GET    | `/api/analytics/decision-volume`      | JWT + role | ✅ 200 |
| 4   | GET    | `/api/analytics/cycle-time-histogram` | JWT + role | ✅ 200 |
| 5   | GET    | `/api/analytics/compliance-trend`     | JWT + role | ✅ 200 |
| 6   | GET    | `/api/analytics/risk-heatmap`         | JWT + role | ✅ 200 |
| 7   | GET    | `/api/analytics/forecast`             | JWT + role | ✅ 200 |

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

| #   | Method | Endpoint                            | Auth       | Status |
| --- | ------ | ----------------------------------- | ---------- | ------ |
| 1   | GET    | `/api/ai/anomalies`                 | JWT + role | ✅ 200 |
| 2   | PUT    | `/api/ai/anomalies/:id/acknowledge` | JWT + role | ✅ 200 |

### Test Details

**1. Get Anomalies**

- Input: No params
- Response: `{ Critical: [], High: [], Medium: [], Low: [], total: N }`

**2. Acknowledge Anomaly**

- Input: `:id = valid anomaly ObjectId`
- Response: `{ ...anomaly, isAcknowledged: true, acknowledgedAt: Date }`

### Auth Verification

| Test Case                                                 | Expected         | Result  |
| --------------------------------------------------------- | ---------------- | ------- |
| GET `/api/ai/anomalies` without token                     | 401 Unauthorized | ✅ Pass |
| PUT `/api/ai/anomalies/:id/acknowledge` with analyst role | 403 Forbidden    | ✅ Pass |
| PUT `/api/ai/anomalies/:id/acknowledge` with admin role   | 200 OK           | ✅ Pass |

---

## 3. Event Webhook Endpoints

| #   | Method | Endpoint                        | Auth        | Status |
| --- | ------ | ------------------------------- | ----------- | ------ |
| 1   | POST   | `/api/events/decision-update`   | Service Key | ✅ 200 |
| 2   | POST   | `/api/events/compliance-update` | Service Key | ✅ 200 |

### Test Details

**1. Decision Update Webhook**

- Input: `{ department: "FI001", decisionId: "abc123", status: "approved" }`
- Response: `{ received: true, department: "FI001", status: "approved" }`

**2. Compliance Update Webhook**

- Input: `{ violationId: "xyz", department: "HR002", severity: "high" }`
- Response: `{ received: true }`

---

## 4. Report Endpoints

| #   | Method | Endpoint                    | Auth       | Status |
| --- | ------ | --------------------------- | ---------- | ------ |
| 1   | POST   | `/api/reports/generate`     | JWT + role | ✅ 200 |
| 2   | GET    | `/api/reports`              | JWT + role | ✅ 200 |
| 3   | GET    | `/api/reports/:id/download` | JWT        | ✅ 200 |

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

| #   | Method | Endpoint                            | Auth       | Status |
| --- | ------ | ----------------------------------- | ---------- | ------ |
| 1   | POST   | `/api/reports/schedules`            | JWT + role | ✅ 201 |
| 2   | GET    | `/api/reports/schedules`            | JWT + role | ✅ 200 |
| 3   | PATCH  | `/api/reports/schedules/:id/toggle` | JWT + role | ✅ 200 |
| 4   | DELETE | `/api/reports/schedules/:id`        | JWT + role | ✅ 200 |

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

| #   | Method | Endpoint               | Auth        | Status |
| --- | ------ | ---------------------- | ----------- | ------ |
| 1   | GET    | `/health`              | None        | ✅ 200 |
| 2   | POST   | `/ml/anomaly/predict`  | Service Key | ✅ 200 |
| 3   | POST   | `/ml/forecast/predict` | Service Key | ✅ 200 |
| 4   | POST   | `/ml/risk/score`       | Service Key | ✅ 200 |
| 5   | POST   | `/ml/models/train`     | Service Key | ✅ 200 |

### Test Details

**1. Health Check**

- Response: `{ status: "ok", service: "GovVision ML Service" }`

**2. Anomaly Predict**

- Input:

```json
{
  "decisions": [
    {
      "id": "test",
      "cycleTimeHours": 999,
      "rejectionCount": 50,
      "revisionCount": 100,
      "daysOverSLA": 90,
      "stageCount": 20
    }
  ]
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

| #   | Job                 | Command                       | Result                                          | Status  |
| --- | ------------------- | ----------------------------- | ----------------------------------------------- | ------- |
| 1   | Anomaly Detection   | `npm run run:anomaly-job`     | Loaded decisions, called ML, upserted anomalies | ✅ Pass |
| 2   | Forecast Generation | `npm run run:forecast-job`    | Completed all dept × target × horizon           | ✅ Pass |
| 3   | Risk Scoring        | `npm run run:risk-job`        | Updated snapshots with riskScore + riskLevel    | ✅ Pass |
| 4   | Report Scheduler    | Hourly cron at server startup | Checks due schedules, triggers generation       | ✅ Pass |

---

## 8. Consolidated API Test Summary — Thunder Client

All implemented REST API endpoints have been verified using Thunder Client within VS Code.

| METHOD | ENDPOINT | AUTH | TEST INPUT | RESPONSE | STATUS |
|--------|----------|------|------------|----------|--------|
| GET | /health | None | --- | 200 OK | PASS |
| GET | /health (FastAPI :8000) | None | --- | 200 OK, model loaded | PASS |
| GET | /api/analytics/kpi-summary | JWT | All Departments | 200 OK, ten KPI values | PASS |
| GET | /api/analytics/kpi-summary/:deptId | JWT | deptId=FI001 | 200 OK, dept-scoped KPI | PASS |
| GET | /api/analytics/decision-volume | JWT | granularity=daily | 200 OK, count array | PASS |
| GET | /api/analytics/cycle-time-histogram | JWT | --- | 200 OK, four bucket counts | PASS |
| GET | /api/analytics/compliance-trend | JWT | deptIds=FI001,HR002 | 200 OK, per-dept time-series | PASS |
| GET | /api/analytics/risk-heatmap | JWT | --- | 200 OK, grouped by risk level | PASS |
| GET | /api/analytics/forecast | JWT | deptId=org, horizon=30, target=volume | 200 OK, forecast array with yhat bounds | PASS |
| GET | /api/analytics/forecast | JWT | deptId=FI001, horizon=7, target=delay | 200 OK, delay forecast array | PASS |
| GET | /api/ai/anomalies | JWT | --- | 200 OK, records by severity | PASS |
| PUT | /api/ai/anomalies/:id/acknowledge | JWT | valid anomaly ObjectId | 200 OK, isAcknowledged: true | PASS |
| PUT | /api/ai/anomalies/:id/acknowledge | JWT (analyst) | valid anomaly ObjectId | 403 Forbidden | PASS |
| GET | /api/ai/anomalies | Missing token | --- | 401 Unauthorized | PASS |
| POST | /api/events/decision-update | x-service-key | { newStatus: "approved", department: "CS005" } | 200 OK, cache invalidated | PASS |
| POST | /api/events/decision-update | Missing key | --- | 401 Unauthorized | PASS |
| POST | /api/events/compliance-update | x-service-key | { violationId: "xyz", department: "HR002" } | 200 OK, received: true | PASS |
| POST | /api/reports/generate | JWT | { type: "executive_summary", format: "csv", dateFrom: "2026-01-01", dateTo: "2026-04-18", departments: ["FI001"] } | 200 OK, report record with filePath | PASS |
| GET | /api/reports | JWT | --- | 200 OK, report list array | PASS |
| GET | /api/reports/:id/download | JWT | valid report ObjectId | 200 OK, binary file download | PASS |
| POST | /api/reports/schedules | JWT | { name: "Weekly Summary", frequency: "weekly", reportConfig: { type: "executive_summary", format: "pdf", departments: ["FI001"], dateRangeMode: "last_7_days" } } | 201 Created, schedule record | PASS |
| GET | /api/reports/schedules | JWT | --- | 200 OK, schedule list array | PASS |
| PATCH | /api/reports/schedules/:id/toggle | JWT | valid schedule ObjectId | 200 OK, isActive toggled | PASS |
| DELETE | /api/reports/schedules/:id | JWT | valid schedule ObjectId | 200 OK, schedule deleted | PASS |
| POST | /ml/anomaly/predict | x-service-key | cycleTimeHours: 3, rejectionCount: 2, revisionCount: 5, daysOverSLA: 0, stageCount: 2, hourOfDaySubmitted: 11 | 200 OK, score: 0.4085, isAnomaly: false, severity: Normal | PASS |
| POST | /ml/anomaly/predict | x-service-key | cycleTimeHours: 148, rejectionCount: 12, revisionCount: 30, daysOverSLA: 90, stageCount: 20, hourOfDaySubmitted: 3 | 200 OK, score: 1.000, isAnomaly: true, severity: Critical | PASS |
| POST | /ml/forecast/predict | x-service-key | timeSeries: [{ds, y}], horizon: 7, target: "volume", department: "FI001" | 200 OK, forecast array with ds, yhat, yhat_lower, yhat_upper | PASS |
| POST | /ml/forecast/predict | x-service-key | timeSeries: [{ds, y}], horizon: 30, target: "delay", department: "org" | 200 OK, delay forecast 30 points | PASS |
| POST | /ml/risk/score | x-service-key | violationCount: 5, openViolationRate: 0.3, complianceRate: 85, overdueCount: 2, policyBreachFreq: 0.1, escalationCount: 1 | 200 OK, score: 72, level: high, featureImportance: {} | PASS |
| POST | /ml/models/train | x-service-key | {} | 200 OK, status: training_started | PASS |

