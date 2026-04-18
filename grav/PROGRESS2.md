# Progress 2 — Detailed Implementation Report

**Project:** GovVision — Digital Decision & Governance Platform  
**Module:** Module 3 — Analytics, Reporting & AI/ML Monitoring System  
**Student:** Aswin Chettri · 202422006

---

## Executive Summary

Module 3 delivers a complete analytics, reporting, and AI/ML monitoring layer for the GovVision platform. The implementation spans backend pipeline engineering, machine learning integration, frontend dashboard development, and automated report generation. The system operates as a three-tier architecture: a React frontend, a Node.js Express backend, and a Python FastAPI ML microservice.

**Key metrics:**
- 4 scheduled cron jobs (anomaly, forecast, risk, report scheduling)
- 3 AI/ML models operational (Isolation Forest, Prophet, Random Forest)
- 17 REST API endpoints implemented and tested
- 9 frontend pages built and routed
- 7 MongoDB collections (5 owned + 2 cross-module read-only)
- 3 report output formats (PDF, Excel, CSV)
- Full compile/build passing on both server and client

---

## 1. System Architecture

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18 + TypeScript + Vite | SPA dashboard with ECharts visualisations |
| Backend | Node.js + Express + TypeScript | REST API, job orchestration, cache management |
| ML Service | Python + FastAPI + scikit-learn + Prophet | Model training, inference endpoints |
| Database | MongoDB (Atlas) | Primary data store for all collections |
| Cache | Redis (optional) | Read-through cache with 300s TTL, auto-fallback |
| Auth | JWT + RBAC | Role-based access control (admin, manager, executive, analyst) |
| Service Auth | `x-service-key` header | Machine-to-machine authentication between Node and FastAPI |

### Architectural Pattern

The system follows a **Functional Modular Architecture** using TypeScript export patterns and Mongoose schemas rather than traditional OOP class hierarchies. Services are stateless functions. Data models are Mongoose schema definitions with typed interfaces. Jobs are scheduled via `node-cron` and can also be triggered manually via runner scripts.

### Communication Flow

```
React Client → Node.js API → MongoDB (read/write)
                           → Redis (cache read/write)
                           → Python FastAPI (ML inference)

Python FastAPI → scikit-learn / Prophet models (local .pkl files)

Module 1 → POST /api/events/decision-update → Node.js → KPI re-aggregation
Module 2 → POST /api/events/compliance-update → Node.js → cache invalidation
```

---

## 2. Database Design

### Collections Owned by Module 3

| # | Collection | Purpose | Key Fields |
|---|-----------|---------|------------|
| 1 | `m3_kpi_snapshots` | Daily KPI state per department | departmentId, snapshotDate, totalDecisions, approvedCount, rejectedCount, pendingCount, avgCycleTimeHours, violationCount, complianceRate, riskScore, riskLevel |
| 2 | `m3_anomalies` | Isolation Forest anomaly records | decisionId, department, anomalyScore, severity, isAcknowledged, featureValues |
| 3 | `m3_forecasts` | Prophet forecast output | department, horizon, target, forecastData[] |
| 4 | `m3_reports` | Generated report metadata | type, format, status, filePath, parameters, generatedBy |
| 5 | `m3_report_schedules` | Automated report schedules | name, reportConfig, frequency, nextRunAt, isActive, recipients |

### Cross-Module Read-Only Models

| # | Collection | Owner | Purpose in Module 3 |
|---|-----------|-------|---------------------|
| 1 | `m1_decisions` | Module 1 | Count decisions by status, compute cycle times, extract ML features |
| 2 | `m2_violations` | Module 2 | Count violations per department, compute compliance rate |

All collections use MongoDB ObjectId (`_id`) as primary key. The `m3_kpi_snapshots` collection has a compound index on `(departmentId, snapshotDate)` for fast upsert operations.

---

## 3. KPI Aggregation Engine

The `kpiAggregator.ts` service computes ten key performance indicators using MongoDB aggregation pipelines:

| # | KPI Metric | Computation |
|---|-----------|-------------|
| 1 | Total Decisions | Count of `m1_decisions` in date range |
| 2 | Approved Count | Count where `status = approved` |
| 3 | Rejected Count | Count where `status = rejected` |
| 4 | Pending Count | Count where `status = pending` |
| 5 | Avg Cycle Time (Hours) | Average of `(completedAt - createdAt)` for completed decisions |
| 6 | Violation Count | Count of `m2_violations` in date range |
| 7 | Open Violations | Count where `status = open` |
| 8 | Compliance Rate | `((totalDecisions - violationCount) / totalDecisions) × 100` |
| 9 | Bottleneck Rate | Percentage of pending decisions exceeding SLA threshold |
| 10 | Bottleneck Count | Absolute count of SLA-exceeding decisions |

Results are upserted into `m3_kpi_snapshots` — running the aggregator twice on the same day updates the existing document rather than creating a duplicate.

---

## 4. AI/ML Pipeline Integration

### 4.1 Isolation Forest — Anomaly Detection

**Purpose:** Identify unusual decision patterns that deviate from normal governance behaviour.

**Training:**
- Script: `ml_service/training/train_isolation_forest.py`
- Dataset: 2,500 decision records from `m1_decisions`
- Features: `cycleTimeHours`, `rejectionCount`, `revisionCount`, `daysOverSLA`, `stageCount`, `hourOfDaySubmitted`
- Preprocessing: StandardScaler normalisation
- Output: `ml_service/models/isolation_forest.pkl`

**Inference:**
- Endpoint: `POST /ml/anomaly/predict`
- Input: Array of decision feature vectors
- Output: `{ id, anomalyScore, isAnomaly, severity }`
- Severity mapping: Score thresholds → Low / Medium / High / Critical

**Orchestration:**
- Cron job: `anomalyJob.ts` — runs daily at 00:00
- Queries last 30 days of completed decisions
- Calls ML endpoint with extracted features
- Filters for `isAnomaly = true` and upserts into `m3_anomalies`
- Preserves `isAcknowledged` state across re-runs via `$setOnInsert`
- Invalidates Redis cache key `m3:anomalies:active`

### 4.2 Prophet — Time Series Forecasting

**Purpose:** Predict future decision volumes and processing delays per department.

**Training:**
- Script: `ml_service/training/train_prophet.py`
- Trains two model families per department plus org-wide:
  - `prophet_{dept}.pkl` — decision volume forecast
  - `prophet_delay_{dept}.pkl` — average cycle time hours forecast

**Inference:**
- Endpoint: `POST /ml/forecast/predict`
- Input: `{ timeSeries, horizon, target, department }`
- Output: `{ forecast: [{ ds, yhat, yhat_lower, yhat_upper }] }`

**Orchestration:**
- Cron job: `forecastJob.ts` — runs daily at 02:00
- Sweeps all combinations: department × target (volume, delay) × horizon (7, 14, 30 days)
- Upserts results into `m3_forecasts`

### 4.3 Random Forest — Risk Classification

**Purpose:** Score each department's governance risk level using a trained classifier.

**Training:**
- Script: `ml_service/training/train_risk_model.py`
- Pipeline: StandardScaler + RandomForestClassifier
- Features: `violationCount`, `openViolationRate`, `avgRiskScore`, `overdueCount`, `complianceRate`, `policyBreachFreq`, `escalationCount`
- Output: `ml_service/models/risk/random_forest.pkl`

**Inference:**
- Endpoint: `POST /ml/risk/score`
- Input: Array of department feature vectors
- Output: `{ department, score, level, featureImportance }`

**Orchestration:**
- Cron job: `riskScoringJob.ts` — runs daily at 01:30
- Assembles risk features from latest KPI snapshots
- Calls ML endpoint, updates `m3_kpi_snapshots` with `riskScore`, `riskLevel`, `featureImportance`
- Invalidates risk-related cache keys

---

## 5. Backend API Implementation

### 5.1 Analytics Routes (`analyticsRoutes.ts`)

All endpoints protected with `validateJWT` + `requireRole` middleware. Redis cache applied with 300-second TTL and automatic fallback to MongoDB when Redis is unavailable.

| # | Method | Endpoint | Purpose |
|---|--------|----------|---------|
| 1 | GET | `/api/analytics/kpi-summary` | Org-wide KPI snapshot |
| 2 | GET | `/api/analytics/kpi-summary/:deptId` | Department-specific KPI |
| 3 | GET | `/api/analytics/decision-volume` | Decision count time series |
| 4 | GET | `/api/analytics/cycle-time-histogram` | Processing time distribution |
| 5 | GET | `/api/analytics/compliance-trend` | Multi-department compliance over time |
| 6 | GET | `/api/analytics/risk-heatmap` | Departments grouped by risk level |
| 7 | GET | `/api/analytics/forecast` | Prophet forecast data by dept/target/horizon |

### 5.2 AI Routes (`aiRoutes.ts`)

| # | Method | Endpoint | Purpose |
|---|--------|----------|---------|
| 1 | GET | `/api/ai/anomalies` | Unacknowledged anomalies grouped by severity |
| 2 | PUT | `/api/ai/anomalies/:id/acknowledge` | Mark anomaly as reviewed |

### 5.3 Event Webhook Routes (`eventRoutes.ts`)

Protected with `x-service-key` header for machine-to-machine communication.

| # | Method | Endpoint | Purpose |
|---|--------|----------|---------|
| 1 | POST | `/api/events/decision-update` | Receive decision state changes from Module 1 |
| 2 | POST | `/api/events/compliance-update` | Receive violation events from Module 2 |

### 5.4 Report Routes (`reportRoutes.ts`)

| # | Method | Endpoint | Purpose |
|---|--------|----------|---------|
| 1 | POST | `/api/reports/generate` | Generate report (PDF/Excel/CSV) |
| 2 | GET | `/api/reports` | List all generated reports |
| 3 | GET | `/api/reports/:id/download` | Download report file |
| 4 | POST | `/api/reports/schedules` | Create automated schedule |
| 5 | GET | `/api/reports/schedules` | List all schedules |
| 6 | PATCH | `/api/reports/schedules/:id/toggle` | Enable/disable schedule |
| 7 | DELETE | `/api/reports/schedules/:id` | Remove schedule |

### 5.5 Report Generation Service

The `reportGenerator.ts` service produces three output formats:

| Format | Library | Features |
|--------|---------|----------|
| CSV | json2csv | Flat tabular export of KPI and anomaly data |
| Excel | ExcelJS | Multi-sheet workbook with styled headers, auto-fitted columns, frozen header rows |
| PDF | jsPDF | Cover page with title/date/scope, KPI summary table, page footers |

Generated files are saved to `server/generated_reports/` directory.

---

## 6. Frontend Implementation

### 6.1 Pages

| # | Page | Route | Description |
|---|------|-------|-------------|
| 1 | Executive Dashboard | `/dashboard` | 10 KPI cards (hero + soft variants), 3 chart components, anomaly feed panel, department/date filters, live-status indicator with 4 states, manual refresh |
| 2 | Deep Insights | `/deep-insights` | Anomaly investigation table, severity/department filters, feature contribution chart, acknowledge flow, decision ID links |
| 3 | Forecast | `/forecast` | Prophet forecast chart, volume/delay target toggle, horizon selector (7/14/30 days), department filter |
| 4 | Risk Dashboard | `/risk` | Risk heatmap table, pie chart distribution, feature breakdown modal, backend-driven risk data |
| 5 | Anomaly Detection | `/anomaly` | Standalone anomaly detection view |
| 6 | Report Builder | `/reports` | Report type, format, date range, department selection form |
| 7 | Report History | `/reports/history` | Generated report archive with download links |
| 8 | Report Schedules | `/reports/schedules` | Schedule management with create/toggle/delete |
| 9 | Placeholder | `/settings`, `/support` | Reserved for future features |

### 6.2 Shared Components

| # | Component | Purpose |
|---|-----------|---------|
| 1 | `AppLayout.tsx` | Shared wrapper with persistent sidebar |
| 2 | `Sidebar.tsx` | Collapsible navigation with active-route highlighting |
| 3 | `TopBar.tsx` | Universal top navigation bar |
| 4 | `KPICard.tsx` | Animated KPI summary card (hero/soft variants) |
| 5 | `AnomalyFeed.tsx` | Real-time anomaly counter and list panel |
| 6 | `AnomalyTableRow.tsx` | Expandable anomaly detail row |
| 7 | `FeatureImportanceChart.tsx` | 6-bar horizontal chart for feature contributions |
| 8 | `ForecastChart.tsx` | Prophet forecast line chart with confidence band |
| 9 | `HorizonToggle.tsx` | Forecast horizon selector (7/14/30) |
| 10 | `TargetToggle.tsx` | Forecast target selector (volume/delay) |
| 11 | `ErrorBoundary.tsx` | React error boundary for chart sections |
| 12 | `SkeletonLoader.tsx` | Loading skeleton placeholder |
| 13 | `DateRangePicker.tsx` | Date range input for report builder |
| 14 | `FormatSelector.tsx` | Report format radio selector |
| 15 | `AddScheduleModal.tsx` | Schedule creation modal form |
| 16 | `RiskTable.tsx` | Risk score data table |
| 17 | `RiskPieChart.tsx` | Risk distribution pie chart |
| 18 | `RiskLevelBadge.tsx` | Colour-coded risk level badge |
| 19 | `FeatureBreakdownModal.tsx` | Feature importance detail modal |
| 20 | `ReportsSubnav.tsx` | Reports section sub-navigation |

### 6.3 Design System

- Shared CSS accent variables defined in `index.css` (dark-gray palette)
- Custom styled dropdowns replaced all native `<select>` elements
- Chart colours kept independent from UI accent palette
- Responsive layout with sidebar collapse behaviour
- Live-status state model:
  - `Updating live` (green, blinking) — active data flow
  - `No live data` (gray) — no data received
  - `Live feed paused` (amber) — polling paused
  - `Live unavailable` (red) — API unreachable

---

## 7. Caching Strategy

Redis is used as an optional performance cache with a graceful fallback mechanism.

**Implementation:** `server/services/cacheService.ts`

| Feature | Detail |
|---------|--------|
| Pattern | Read-through cache (`getOrSet`) |
| TTL | 300 seconds (5 minutes) |
| Fallback | When Redis is unavailable, queries go directly to MongoDB |
| Invalidation | Event webhooks trigger targeted cache key invalidation |
| Key strategy | Scoped by endpoint + parameters (e.g. `m3:kpi:org:{date}`) |

---

## 8. Authentication & Security

### Middleware Stack

| # | Middleware | File | Purpose |
|---|-----------|------|---------|
| 1 | `validateJWT` | `validateJWT.ts` | Verifies JWT token, extracts user and role |
| 2 | `requireRole` | `requireRole.ts` | Enforces role-based access (admin, manager, executive, analyst) |
| 3 | `serviceKey` | `serviceKey.ts` | Validates `x-service-key` header for inter-service calls |

### Role Access Matrix

| Endpoint Category | admin | manager | executive | analyst |
|-------------------|-------|---------|-----------|---------|
| Analytics (read) | ✅ | ✅ | ✅ | ✅ |
| Anomaly acknowledge | ✅ | ✅ | ✅ | ❌ |
| Report generation | ✅ | ✅ | ❌ | ❌ |
| Schedule management | ✅ | ✅ | ❌ | ❌ |

---

## 9. Scheduled Jobs

| # | Job | File | Schedule | Function |
|---|-----|------|----------|----------|
| 1 | Anomaly Detection | `anomalyJob.ts` | Daily 00:00 | Query decisions → ML predict → upsert anomalies |
| 2 | Risk Scoring | `riskScoringJob.ts` | Daily 01:30 | Assemble features → ML score → update KPI snapshots |
| 3 | Forecast Generation | `forecastJob.ts` | Daily 02:00 | Sweep dept × target × horizon → ML predict → upsert forecasts |
| 4 | Report Schedule | `reportScheduleJob.ts` | Hourly | Check due schedules → trigger report generation |

All jobs can be manually triggered via runner scripts in `server/scripts/`:
- `npm run run:anomaly-job`
- `npm run run:forecast-job`
- `npm run run:risk-job`

---

## 10. CSV ETL Pipeline

The `importCSV.ts` script handles initial data ingestion:

| Detail | Value |
|--------|-------|
| Records imported | 2,500 |
| Source | CSV file with governance decision data |
| Department normalisation | Maps raw department names to canonical IDs |
| Derived fields | `cycleTimeHours`, `rejectionCount`, `revisionCount`, `daysOverSLA`, `stageCount`, `hourOfDaySubmitted` |
| Target collection | `m1_decisions` |

---

## 11. Complete File Inventory

### Backend (20 files)

| # | File | Purpose |
|---|------|---------|
| 1 | `server/jobs/anomalyJob.ts` | Anomaly detection cron |
| 2 | `server/jobs/forecastJob.ts` | Forecast generation cron |
| 3 | `server/jobs/riskScoringJob.ts` | Risk scoring cron |
| 4 | `server/jobs/reportScheduleJob.ts` | Report schedule runner |
| 5 | `server/routes/aiRoutes.ts` | Anomaly read/acknowledge API |
| 6 | `server/routes/analyticsRoutes.ts` | KPI and analytics API |
| 7 | `server/routes/eventRoutes.ts` | Webhook event handlers |
| 8 | `server/routes/reportRoutes.ts` | Report and schedule API |
| 9 | `server/services/kpiAggregator.ts` | KPI computation engine |
| 10 | `server/services/cacheService.ts` | Redis cache helper |
| 11 | `server/services/mlService.ts` | ML service proxy |
| 12 | `server/services/reportGenerator.ts` | PDF/Excel/CSV generator |
| 13 | `server/utils/reportHelpers.ts` | Report data assembly |
| 14 | `server/models/KPI_Snapshot.ts` | KPI snapshot schema |
| 15 | `server/models/Anomaly.ts` | Anomaly schema |
| 16 | `server/models/Forecast.ts` | Forecast schema |
| 17 | `server/models/Report.ts` | Report schema |
| 18 | `server/models/ReportSchedule.ts` | Report schedule schema |
| 19 | `server/models/m1Decisions.ts` | Read-only decisions model |
| 20 | `server/models/m2Violations.ts` | Read-only violations model |

### Frontend (23 files)

| # | File | Purpose |
|---|------|---------|
| 1 | `client/src/pages/Dashboard.tsx` | Executive dashboard |
| 2 | `client/src/pages/DeepInsights.tsx` | AI anomaly investigation |
| 3 | `client/src/pages/ForecastPage.tsx` | Forecast visualisation |
| 4 | `client/src/pages/RiskPage.tsx` | Risk score dashboard |
| 5 | `client/src/pages/AnomalyDetection.tsx` | Anomaly detection page |
| 6 | `client/src/pages/ReportBuilder.tsx` | Report generation form |
| 7 | `client/src/pages/ReportHistory.tsx` | Report archive |
| 8 | `client/src/pages/ReportSchedules.tsx` | Schedule management |
| 9 | `client/src/pages/PlaceholderPage.tsx` | Placeholder for future routes |
| 10 | `client/src/components/KPICard.tsx` | KPI summary card |
| 11 | `client/src/components/AnomalyFeed.tsx` | Real-time anomaly panel |
| 12 | `client/src/components/AnomalyTableRow.tsx` | Anomaly detail row |
| 13 | `client/src/components/FeatureImportanceChart.tsx` | Feature contribution chart |
| 14 | `client/src/components/ForecastChart.tsx` | Forecast line chart |
| 15 | `client/src/components/HorizonToggle.tsx` | Horizon selector |
| 16 | `client/src/components/TargetToggle.tsx` | Target selector |
| 17 | `client/src/components/AppLayout.tsx` | Shared layout wrapper |
| 18 | `client/src/components/Sidebar.tsx` | Navigation sidebar |
| 19 | `client/src/components/TopBar.tsx` | Top navigation bar |
| 20 | `client/src/components/ErrorBoundary.tsx` | Error boundary |
| 21 | `client/src/components/DateRangePicker.tsx` | Date range input |
| 22 | `client/src/components/FormatSelector.tsx` | Format radio selector |
| 23 | `client/src/components/AddScheduleModal.tsx` | Schedule creation modal |

### ML Service (7 files)

| # | File | Purpose |
|---|------|---------|
| 1 | `ml_service/main.py` | FastAPI entry point |
| 2 | `ml_service/app/services/anomaly_service.py` | Isolation Forest inference |
| 3 | `ml_service/app/services/forecast_service.py` | Prophet forecast inference |
| 4 | `ml_service/app/services/risk_service.py` | Random Forest risk inference |
| 5 | `ml_service/training/train_isolation_forest.py` | Anomaly model training |
| 6 | `ml_service/training/train_prophet.py` | Forecast model training |
| 7 | `ml_service/training/train_risk_model.py` | Risk model training |

---

## 12. Testing & Validation

### Build Verification

| Check | Command | Result |
|-------|---------|--------|
| Server typecheck | `cd server && npm run typecheck` | ✅ Pass |
| Client build | `cd client && npm run build` | ✅ Pass |
| ML service health | `GET http://localhost:8000/health` | ✅ Pass |

### Runtime Verification

| Test | Method | Result |
|------|--------|--------|
| KPI summary endpoint | `GET /api/analytics/kpi-summary` | ✅ 200 OK with full payload |
| Anomaly listing | `GET /api/ai/anomalies` | ✅ 200 OK with severity groups |
| Forecast retrieval | `GET /api/analytics/forecast` | ✅ 200 OK with forecast data |
| Risk heatmap | `GET /api/analytics/risk-heatmap` | ✅ 200 OK with enriched risk data |
| Report generation | `POST /api/reports/generate` | ✅ 200 OK with file generated |
| Schedule CRUD | Create/Toggle/Delete flow | ✅ All operations succeeded |
| Auth enforcement | Request without JWT | ✅ 401 Unauthorized |
| Role enforcement | Analyst → acknowledge | ✅ 403 Forbidden |

### Job Execution

| Job | Trigger | Observed Result |
|-----|---------|-----------------|
| Anomaly | Manual runner | Loaded decisions, called ML, upserted anomalies |
| Forecast | Manual runner | Completed all dept × target × horizon combinations |
| Risk | Manual runner | Updated KPI snapshots with risk scores and levels |

---

## 13. Known Limitations

| # | Item | Detail |
|---|------|--------|
| 1 | Redis not running locally | Cache fallback works correctly but cache-hit behaviour is unverified |
| 2 | Dev auth bypass active | `x-test-role` header in `validateJWT.ts` must be removed before production |
| 3 | No email delivery | Report schedules generate files but do not email recipients via Nodemailer |
