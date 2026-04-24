# Gov-Vision: Analytics, Reporting & Management Monitoring System with AI/ML Insights

## Project Report

**Submitted by:** Yashraj Bhattarai
**Programme:** Masters of Computer Application (MCA), 2024–2026
**Institution:** Sikkim Manipal Institute of Technology, Sikkim Manipal University

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [System Architecture](#2-system-architecture)
3. [Data Pipeline & Ingestion](#3-data-pipeline--ingestion)
4. [KPI Aggregation & Dashboard](#4-kpi-aggregation--dashboard)
5. [AI/ML Pipeline — Anomaly Detection](#5-aiml-pipeline--anomaly-detection)
6. [AI/ML Pipeline — Risk Scoring](#6-aiml-pipeline--risk-scoring)
7. [AI/ML Pipeline — Forecasting](#7-aiml-pipeline--forecasting)
8. [Report Generation System](#8-report-generation-system)
9. [Security & Authentication](#9-security--authentication)
10. [Frontend Pages & Components](#10-frontend-pages--components)
11. [Cron Job Automation](#11-cron-job-automation)
12. [Database Collections](#12-database-collections)
13. [API Testing & Verification](#13-api-testing--verification)
14. [Conclusion](#14-conclusion)
15. [References](#15-references)

---

## 1. Introduction

The Gov-Vision platform is an enterprise-grade web application designed to digitize how organizations create, review, approve, track, and audit governance decisions. This report documents the Analytics, Reporting & Management Monitoring System with AI/ML Insights — the third module of the Gov-Vision platform — which serves as the analytical observability layer for all governance activity across the organization.

The module transforms raw decision records and compliance violation data into actionable management insights through a combination of real-time KPI dashboards, three targeted AI/ML capabilities (anomaly detection, risk scoring, and delay forecasting), and an automated report generation system. It consumes data from the Decision Management module (Module 1) and the Governance & Compliance module (Module 2) via secure REST APIs and internal webhooks, processing that data into time-series snapshots, severity-classified anomaly records, predictive forecasts, and exportable governance reports.

The system is built on a three-tier microservices architecture: a React.js frontend for visualization and user interaction, a Node.js/Express.js backend for API orchestration, KPI computation, and report generation, and a Python FastAPI microservice for AI/ML model inference. MongoDB serves as the primary data store, with Redis providing a caching layer for dashboard performance optimization. All four scheduled automation tasks (anomaly detection, risk scoring, forecasting, and report scheduling) run as server-side cron jobs integrated directly into the Node.js process.

This report covers all development milestones from both Progress 1 and Progress 2, documenting the complete feature set of the Analytics Module as implemented.

---

## 2. System Architecture

The GovVision Analytics Module follows a three-tier microservices architecture designed for separation of concerns between data visualization, business logic, and machine learning inference.

The **Presentation Layer** is implemented as a React.js single-page application using TailwindCSS for styling and Apache ECharts for advanced chart rendering. The frontend communicates exclusively with the Node.js backend via REST API calls, with all requests routed through a centralized Axios instance configured in `client/src/services/api.ts`. JWT tokens are automatically attached to every outbound request via an Axios request interceptor.

The **API Layer** is a Node.js/Express.js server running on port 5002, organized into four route groups: `analyticsRoutes.ts` (KPI computation, chart data, forecast retrieval, risk heatmap), `aiRoutes.ts` (anomaly listing, acknowledgement, risk scores), `reportRoutes.ts` (report generation, download, scheduling), and `eventRoutes.ts` (webhook receivers for cross-module data synchronization). The server registers four cron jobs at startup: `anomalyJob.ts` (daily at 00:00), `riskScoringJob.ts` (daily at 01:00), `forecastJob.ts` (daily at 02:00), and `reportScheduleJob.ts` (hourly). Redis is used as an optional caching layer through the generic `getOrSet<T>()` helper in `cacheService.ts`, which transparently falls back to direct database queries when Redis is unavailable.

The **AI/ML Service** is a Python FastAPI application running on port 8000, exposing three inference endpoints: `POST /ml/anomaly/predict` (Isolation Forest), `POST /ml/risk/score` (Random Forest), and `POST /ml/forecast/predict` (Prophet). All endpoints are protected by a shared `SERVICE_KEY` validated through a FastAPI dependency. The service loads serialized model artifacts from disk at startup, eliminating per-request I/O overhead.

The **Data Layer** consists of a MongoDB cluster hosting eight collections (`m1_decisions`, `m1_training_decisions`, `m2_violations`, `m3_kpi_snapshots`, `m3_anomalies`, `m3_forecasts`, `m3_reports`, `m3_report_schedules`) and an optional Redis instance for dashboard caching.

---

## 3. Data Pipeline & Ingestion

The GovVision Analytics Module maintains a dual-source data architecture that strictly separates training data from live operational data, ensuring that ML models are trained on historical patterns while the dashboard reflects only current organizational activity.

### 3.1 AI Workflow Dataset (Live Data)

The primary data ingestion pipeline is implemented in `server/scripts/importCSV.ts`, which reads the AI Workflow Optimization Dataset (2,500 rows) and transforms each record into a normalized decision document stored in the `m1_decisions` collection. The script implements a custom RFC-4180-compliant CSV parser with proper quoted-field handling, a two-level department normalization system that maps 25+ department name variations to five canonical departments (Finance/FI001, Human Resources/HR002, Operations/OP003, Information Technology/IT004, Customer Service/CS005), and a linear date projection function that maps original timestamps into a trailing 1-year window ending at the current date.

Feature engineering transforms raw CSV fields into governance-compatible metrics: `cycleTimeHours` is derived via `deriveCycleTime()` to center around BPI-compatible distributions; `rejectionCount` and `revisionCount` are mapped to realistic governance distributions using probability-based thresholds; `daysOverSLA` is recalculated via `recalcDaysOverSLA()` based on the relationship between cycle time, stage count, and priority. A pending-task simulation mechanism probabilistically sets `completedAt = null` for recent tasks (within 60 days) based on workload scores, ensuring the bottleneck rate KPI has realistic pending decision representation.

### 3.2 BPI Challenge 2017 Dataset (Training Data)

The historical training pipeline is implemented in `server/scripts/importBPI.ts`, which reads `bpi_aggregated_cases.csv` from the BPI Challenge 2017 dataset and loads it into the `m1_training_decisions` collection. This data is used exclusively by the ML training scripts (Isolation Forest, Random Forest, Prophet) and is never queried by the dashboard or analytics APIs.

Key transformations include deterministic department assignment using a hash function on abstract BPI Resource identifiers, date shifting by +9 years to align with the 2025–2026 GovVision timeline, time compression by a factor of 12x to create realistic governance-scale cycle times, and status rebalancing that deterministically flips a portion of rejected/pending cases to approved for more balanced class distributions. Both collections share an identical field schema differentiated only by the `source` field (`ai_workflow` vs `bpi_aggregated`), ensuring feature compatibility between training and inference.

---

## 4. KPI Aggregation & Dashboard

The KPI aggregation engine is implemented in `server/services/kpiAggregator.ts` and computes ten governance performance indicators for each department and the organization as a whole. The engine queries `m1_decisions` (filtered by `source: 'ai_workflow'`) and `m2_violations` to compute: Total Decisions, Approved Count, Rejected Count, Pending Count (counted independently of date range to capture all active pending tasks), Average Cycle Time Hours (computed from decisions with `completedAt` set), Violation Count, Open Violations, Compliance Rate (percentage of approved decisions within SLA grace), Bottleneck Rate (percentage of pending decisions exceeding their SLA), and Anomaly Count (unacknowledged anomalies linked to decisions within the date range).

KPI results are persisted as daily snapshots in `m3_kpi_snapshots` via upsert operations keyed on `(departmentId, snapshotDate)`, ensuring that repeated computation within the same day updates existing snapshots rather than creating duplicates. The `removeLegacyNullSnapshots()` function cleans up any orphaned snapshots with null department references.

The executive dashboard (`client/src/pages/Dashboard.tsx`) displays these ten KPIs as semantic metric cards with color-coded thresholds alongside three interactive chart components: a Decision Volume time-series chart (daily/weekly/monthly granularity), a Cycle Time Histogram (four buckets: 0–24h, 24–48h, 48–72h, >72h), and a Compliance Trend multi-line chart showing per-department compliance rates over time. All chart data is cached in Redis with TTL-based invalidation triggered by webhook events from Modules 1 and 2.

---

## 5. AI/ML Pipeline — Anomaly Detection

The anomaly detection pipeline uses an unsupervised Isolation Forest model to identify decisions whose behavioral features deviate significantly from historical patterns.

### 5.1 Model Training

The model is trained via `ml_service/training/train_isolation_forest.py` using completed decision records from the `m1_training_decisions` collection. Four behavioral features are extracted: `cycleTimeHours`, `rejectionCount`, `revisionCount`, and `daysOverSLA`. Data is normalized using a `RobustScaler` (chosen for its resilience to outliers) and fed into an `IsolationForest(n_estimators=200, contamination=0.05, random_state=42)`. Raw anomaly scores from the model's `decision_function()` are normalized to a [0, 1] range where 1.0 represents maximum anomaly. Both the model and scaler are serialized to `ml_service/models/anomaly/`.

Five diagnostic visualizations are generated during training: anomaly score distribution by severity band, feature separation between predicted anomalies and normals, sanity tests on synthetic profiles (normal baseline through critical delay), overall score histogram with mean/standard deviation markers, and a scatter map of cycle time vs rejection count colored by anomaly score.

### 5.2 Inference & Automation

The inference service (`ml_service/app/services/anomaly_service.py`) loads model artifacts at import time and exposes `detect_anomalies_batch()` which accepts a list of decision payloads, builds a feature matrix, scales and scores them, and returns anomaly classifications with severity labels: ≥0.95 = Critical, ≥0.90 = High, ≥0.80 = Medium, ≥0.70 = Low, <0.70 = Normal.

The daily cron job (`server/jobs/anomalyJob.ts`, scheduled at `0 0 * * *`) queries all completed decisions with `isScored: false`, sends them to FastAPI `POST /ml/anomaly/predict`, updates the `isScored` flag and anomaly scores via MongoDB `bulkWrite()`, upserts detected anomalies into `m3_anomalies` with feature values and severity descriptions, and invalidates the Redis anomaly cache.

---

## 6. AI/ML Pipeline — Risk Scoring

The risk scoring pipeline uses a supervised Random Forest classifier to assign continuous departmental risk levels based on governance behavioral features.

### 6.1 Model Training

The model is trained via `ml_service/training/train_random_forest.py` using BPI historical data from `m1_training_decisions`. Five features are used: three numeric (`hourOfDaySubmitted`, `revisionCount`, `stageCount`) and two categorical (`department`, `priority`). A 4-class risk label is derived from `daysOverSLA` and `status`: Low (daysOverSLA == 0 and approved), Medium (0 < daysOverSLA ≤ 1), High (1 < daysOverSLA ≤ 5 or rejected), Critical (daysOverSLA > 5).

A scikit-learn `Pipeline` combines a `ColumnTransformer` (with `StandardScaler` for numeric and `OneHotEncoder(handle_unknown='ignore')` for categorical features) with a `RandomForestClassifier(n_estimators=200, max_depth=10, class_weight='balanced', random_state=42)`. Training uses an 80/20 stratified split with a full classification report for all four risk classes. Three diagnostic visualizations are generated: confusion matrix heatmap, top-15 feature importance bar chart, and risk probability distribution histogram.

### 6.2 Inference & Automation

The inference service (`ml_service/app/services/risk_service.py`) loads the pipeline from `random_forest.pkl`, normalizes incoming features into the exact training column order, runs `predict()` and `predict_proba()`, and computes a weighted risk score (0–100) using class-weighted probabilities (Low=0, Medium=33, High=66, Critical=100).

The daily cron job (`server/jobs/riskScoringJob.ts`, scheduled at `0 1 * * *`) queries all live decision feature vectors, sends them to FastAPI, aggregates per-decision scores into per-department averages, maps scores to risk levels using synchronized thresholds (≥80 critical, ≥60 high, ≥40 medium), upserts results into `m3_kpi_snapshots`, computes an ORG-level aggregate, and invalidates Redis risk caches.

---

## 7. AI/ML Pipeline — Forecasting

The forecasting pipeline uses Facebook Prophet time-series models to predict future governance metrics across six targets and three horizons.

### 7.1 Model Training

Models are trained via `ml_service/training/train_prophet.py` using historical data from `m1_training_decisions`. Six forecast targets are supported: volume (daily decision count), delay (average cycle time hours), approval_rate, rejection_rate, pending_workload, and sla_misses. Each target produces a separate Prophet model per department plus an org-level model. Models use `Prophet(yearly_seasonality=True, weekly_seasonality=True, daily_seasonality=False, interval_width=0.95, changepoint_prior_scale=0.05)`.

Date ranges are gap-filled using `pd.date_range()` with target-specific handling (volume fills with 0, delay uses forward/backward fill). Departments with fewer than 10 daily data points are skipped. Each model is saved as `{prefix}_{dept_id}.pkl` under `ml_service/models/forecast/`.

### 7.2 Inference & Automation

The inference service (`ml_service/app/services/forecast_service.py`) loads the appropriate model based on department and target, creates a future DataFrame starting from today's date, and runs `model.predict()` to produce forecast points with yhat, yhat_lower, and yhat_upper confidence bounds.

The nightly cron job (`server/jobs/forecastJob.ts`, scheduled at `0 2 * * *`) iterates over all departments × 4 targets × 3 horizons (7, 14, 30 days), calls FastAPI for each combination, and upserts results into `m3_forecasts` with Redis cache invalidation.

---

## 8. Report Generation System

The report generation system provides programmatic governance report creation in three formats.

### 8.1 Generator Engine

The generator (`server/services/reportGenerator.ts`) accepts a `ReportConfig` specifying type (executive_summary, compliance, anomaly, risk), format (csv, excel, pdf), date range, departments, and requestor. It calls `assembleReportData()` from `server/utils/reportHelpers.ts` to query KPI snapshots, anomaly records, and decision data, assembling `kpiRows[]` and `anomalyRows[]` arrays.

**CSV** output uses `json2csv` with labeled field mappings. **Excel** output uses ExcelJS to create a styled workbook with two worksheets: "KPI Summary" (branded headers, alternating row colors, risk-level cell color-coding) and "Anomaly List". **PDF** output uses jsPDF with jspdf-autotable to create a branded A4 document with a blue header banner, metadata section, KPI summary table, and anomaly summary table.

### 8.2 Scheduling

The report schedule system uses MongoDB (`m3_report_schedules`) to store schedule configurations with frequency (daily/weekly/monthly), date range mode (last 7/30/90 days), and recipient lists. The hourly cron job (`server/jobs/reportScheduleJob.ts`) checks for due schedules, generates reports, creates report records, and updates schedule metadata including next run time.

---

## 9. Security & Authentication

The security model implements a three-tier authentication strategy. **JWT Authentication** (`server/middleware/validateJWT.ts`) protects all dashboard-facing endpoints by verifying `Authorization: Bearer <token>` headers against the `JWT_SECRET` environment variable and attaching decoded payloads (`userId`, `role`, `department`) to `req.user`. A development-mode `X-Test-Role` header allows role simulation without full JWT infrastructure.

**Role-Based Access Control** (`server/middleware/requireRole.ts`) restricts endpoints by user role. Analytics and AI endpoints require `admin`, `manager`, or `analyst` roles. Report endpoints require `admin` or `manager` roles.

**Service Key Authentication** (`server/middleware/serviceKey.ts`) protects webhook endpoints used for cross-module communication (`/api/events/*`), validating the `x-service-key` header against the `SERVICE_KEY` environment variable. This prevents unauthorized systems from triggering cache invalidation or data re-aggregation.

---

## 10. Frontend Pages & Components

The React frontend provides six primary pages accessible through a collapsible sidebar navigation:

**Dashboard** (`/dashboard`) — Ten KPI metric cards, three interactive charts (Decision Volume, Cycle Time Histogram, Compliance Trend), date range picker, department selector, and anomaly feed panel.

**Anomaly Detection** (`/anomaly`) — Deep Insights page showing anomalies grouped by severity (Critical → Low) with expandable cards displaying decision ID, department, anomaly score, feature values, and acknowledge workflow.

**Forecast** (`/forecast`) — Prophet confidence band chart with three interactive control groups: department selector (6 presets), horizon selector (7/14/30 days), target selector (6 targets), plus four summary cards (Projected Total, Average per Day, Peak Day, Forecast Window).

**Risk Assessment** (`/risk`) — Four summary stat cards by risk level, filterable risk table with per-department scores, risk pie chart, and feature breakdown modal showing Random Forest feature importance for each department.

**Report Builder** (`/reports/builder`) — Report configuration form with type, format, date range, and department selectors. **Report History** (`/reports/history`) — Table of generated reports with download capability. **Report Schedules** (`/reports/schedules`) — Schedule management with create/toggle/delete operations.

The sidebar (`Sidebar.tsx`) organizes navigation into three sections: Dashboard, Deep Insights (Anomaly Detection, Forecast, Risk Assessment), and Reports, with a "New Report" quick-action button.

---

## 11. Cron Job Automation

Four automated cron jobs run within the Node.js server process:

| Job | Schedule | File | Purpose |
|-----|----------|------|---------|
| Anomaly Detection | Daily 00:00 | `anomalyJob.ts` | Scores unscored decisions via Isolation Forest, upserts anomalies |
| Risk Scoring | Daily 01:00 | `riskScoringJob.ts` | Scores all departments via Random Forest, updates KPI snapshots |
| Forecasting | Daily 02:00 | `forecastJob.ts` | Generates Prophet forecasts for all dept×target×horizon combinations |
| Report Scheduling | Hourly | `reportScheduleJob.ts` | Checks due schedules, generates reports, updates schedule metadata |

---

## 12. Database Collections

| Collection | Model File | Purpose |
|------------|------------|---------|
| m1_decisions | m1Decisions.ts | Live AI Workflow decision data (dashboard + inference) |
| m1_training_decisions | m1TrainingDecisions.ts | BPI historical data (ML training only) |
| m2_violations | m2Violations.ts | Compliance violation records from Module 2 |
| m3_kpi_snapshots | KPI_Snapshot.ts | Daily KPI snapshots per department |
| m3_anomalies | Anomaly.ts | Detected anomaly records with feature values |
| m3_forecasts | Forecast.ts | Prophet forecast results per dept/target/horizon |
| m3_reports | Report.ts | Generated report metadata and file paths |
| m3_report_schedules | ReportSchedule.ts | Automated report delivery configurations |

---

## 13. API Testing & Verification

All REST API endpoints were verified using Thunder Client within VS Code, covering both success paths and authentication failure paths. Tests confirmed correct behavior for KPI summary retrieval, decision volume charting, cycle-time histogram computation, compliance trend generation, anomaly listing and acknowledgement, risk heatmap retrieval, forecast data retrieval, report generation (all three formats), report download streaming, schedule CRUD operations, JWT rejection for unauthenticated requests, RBAC rejection for unauthorized roles, and service key validation for webhook endpoints.

---

## 14. Conclusion

The GovVision Analytics, Reporting & Management Monitoring System with AI/ML Insights has been successfully developed as a comprehensive analytical observability layer for enterprise governance. The module integrates three distinct AI/ML capabilities — unsupervised anomaly detection via Isolation Forest, supervised risk classification via Random Forest, and time-series forecasting via Prophet — into a unified dashboard platform backed by a dual-source data architecture that cleanly separates historical training data from live operational data. The automated report generation engine supports on-demand and scheduled delivery across PDF, Excel, and CSV formats, while four server-side cron jobs ensure continuous data freshness. The complete security model enforces JWT authentication with role-based access control across all dashboard endpoints and service-key authentication for cross-module webhooks.

---

## 15. References

[1] Dheerendra Yaganti. (2020). A Modular Python-Based Framework for Real-Time Enterprise KPI Visualization. *IJCSE*, 8(4).

[2] Dachepalli, V. (2025). AI-Driven Decision Support Systems in ERP. *JIT*, 12(1).

[3] Herreros-Martínez, A. et al. (2025). Applied Machine Learning to Anomaly Detection in Enterprise Purchase Processes. *ESWA*, 238.

[4] Boning Huang et al. (2021). Enterprise Risk Assessment Based on Machine Learning. *CIN*, 2021.

[5] Kolková, A. & Ključnikov, A. (2022). Demand Forecasting: AI-Based, Statistical and Hybrid Models. *JRFM*, 15(12).

[6] Meta. Prophet: Forecasting at Scale. https://facebook.github.io/prophet/

[7] scikit-learn. Isolation Forest. https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.IsolationForest.html

[8] scikit-learn. Random Forest Classifier. https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.RandomForestClassifier.html
