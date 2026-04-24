DEPARTMENT OF COMPUTER APPLICATIONS
SIKKIM MANIPAL INSTITUTE OF TECHNOLOGY
(A constituent college of Sikkim Manipal University)
MAJITAR, RANGPO, EAST SIKKIM – 737135

# Major Project Progress Report – 2
# Analytics, Reporting & Management Monitoring System with AI/ML Insights


By
**Aswin Chettri (202422006)**

In partial fulfilment of requirements for the award of degree in
Masters of Computer Application (MCA)
(2024-2026)


Under the Project Guidance of

**Dr. Moumita Pramanik**, Assistant Professor - I, Dept. of CA
**Mr. Somnath Barik**, Senior Developer, Euphoria GenX (External Guide)

Department of Computer Applications
Sikkim Manipal Institute of Technology
Majhitar, Rangpo, East Sikkim

---

## Abstract

Gov-Vision is an enterprise-grade web platform that digitizes how organizations create, review, approve, track and audit important decisions. It replaces manual emails and paper-based approvals with a structured workflow, ensuring transparency, governance, and real-time analytics. This module focuses on the **Analytics, Reporting & Management Monitoring System with AI/ML Insights**. It acts as the analytics and monitoring layer, providing management and leadership with real-time dashboards, AI-driven anomaly detection, decision performance metrics, risk distribution insights, and compliance monitoring. By combining classical business intelligence with three targeted AI/ML capabilities — anomaly detection, predictive delay forecasting, and AI-driven risk scoring — the module enables organizations to move from responding to problems to preventing them. The system supports trend-based analysis, automated custom reporting, and exportable summaries for informed managerial decision making. By converting decision records into charts, summaries and reports, the module enables data-driven governance, performance evaluation, and strategic oversight across departments.

---

## LIST OF CONTENTS

| Chapter | Title | Page No |
|---------|-------|---------|
| | ABSTRACT | |
| 1 | INTRODUCTION | 1 |
| 1.1 | General overview of the problem | 2 |
| 1.2 | Feasibility Study | 3 |
| 1.3 | Literature Survey | 4 |
| 1.4 | Problem Definition | 5 |
| 1.5 | Analysis of the Problem | 6 |
| 1.6 | Solution Strategy | 8 |
| 1.7 | Software Requirement Specifications | 10 |
| 1.7.1 | Functional Requirements | 10 |
| 1.7.2 | Non-Functional Requirements | 16 |
| 2 | PROJECT PLANNING | 17 |
| 2.1 | Hardware and Software Requirements | 17 |
| 2.2 | Team Structure | 18 |
| 2.3 | SDLC | 18 |
| 2.4 | Gantt–chart | 18 |
| 3 | DESIGN STRATEGY FOR THE SOLUTION | 18 |
| 3.1 | Architecture Diagram | 18 |
| 4 | PROGRESS TILL DATE | 19 |
| 4.1 | Analytics Dashboard | 19–20 |
| 4.2 | Data Ingestion (CSV Pipeline) | 20–22 |
| 4.3 | Database Model – MongoDB Collections | 22–26 |
| 4.4 | API Testing – Thunder Client | 26–27 |
| 4.5 | Isolation Forest Model Training | 28–31 |
| 4.6 | BPI Dataset Integration & Dual-Source Architecture | 32–34 |
| 4.7 | Random Forest Risk Scoring – Model Training | 35–37 |
| 4.8 | Random Forest Risk Scoring – FastAPI Endpoint & Cron Job | 38–39 |
| 4.9 | Prophet Delay Forecasting – Multi-Target Pipeline | 40–42 |
| 4.10 | Forecast Page – Frontend Implementation | 43–44 |
| 4.11 | Risk Score Dashboard – Frontend Implementation | 45–46 |
| 4.12 | Deep Insights Page – Anomaly Investigation | 47–48 |
| 4.13 | Report Generation System – Backend | 49–51 |
| 4.14 | Report Builder, History & Schedules – Frontend | 52–54 |
| 4.15 | Full JWT Enforcement & AI Route Integration | 55–56 |
| 4.16 | New Database Collections (Progress 2) | 57–59 |
| 4.17 | API Testing – Thunder Client (Progress 2 Endpoints) | 60–61 |
| 5 | SUMMARY AND CONCLUSION | 62 |
| 5.1 | Progress Summary | 62 |
| 5.2 | Conclusion | 63 |
| | REFERENCES | 64 |

---

## LIST OF FIGURES

| Fig. No. | Figure Name |
|----------|-------------|
| 1 | Team Structure |
| 2 | Agile Software Development Life Cycle |
| 3 | Gantt Chart |
| 4 | Architecture Overview Diagram |
| 5–6 | Analytics Dashboard (from Progress 1) |
| 7 | Forecast Page – Prophet Confidence Band Chart |
| 8 | Risk Score Dashboard – Department Ranking Table & Pie Chart |
| 9 | Deep Insights Page – Anomaly Investigation Panel |
| 10 | Report Builder Page |
| 11 | Report History Page |
| 12 | Report Schedules Manager |
| 13 | Random Forest Training – Classification Report |
| 14 | Random Forest – Feature Importance Breakdown |
| 15 | Thunder Client – POST /ml/risk/score Test |

---

## LIST OF TABLES

| Table No. | Table Name |
|-----------|------------|
| 1 | Literature Study |
| 2–6 | API Tables (from Progress 1) |
| 7 | m1_training_decisions – Field Definitions |
| 8 | m3_forecasts – Field Definitions |
| 9 | m3_reports – Field Definitions |
| 10 | m3_report_schedules – Field Definitions |
| 11 | Random Forest – Feature Importance Scores |
| 12 | Thunder Client API Test Results (Progress 2 Endpoints) |
| 13 | Gov-Vision Analytics Module – Progress Summary (Updated) |

---

## 1. INTRODUCTION

The Analytics, Reporting & Management Monitoring System with AI Insights is a dedicated module within the Gov-Vision Digital Decision & Governance Platform, an enterprise-grade system designed to bring analytical depth, transparency, and accountability to organizational decision making. As governance processes grow increasingly complex, this module exists to ensure that the right people have the right information, at the right time, supported by clearly defined Key Performance Indicators (KPIs) that measure governance effectiveness across the organization.

In modern enterprise environments, decision-making generates vast amounts of data that, when properly analysed, can reveal critical insights about organizational efficiency, risk exposure, and compliance status. Most organizations still rely on manual spreadsheets, delayed reports, and intuition-led decision, leaving bottlenecks undetected, compliance risks overlooked, and performance gaps unaddressed. This module directly solves that problem by serving as the analytical and visibility layer of the Gov-Vision platform, transforming raw decision data into clear insights for executives, managers, compliance officers, analysts, and department heads.

While the broader Gov-Vision platform manages the full lifecycle of organizational decisions from creation and approval through to compliance and auditing, this module focuses exclusively on analytics, reporting, and monitoring. It continuously tracks KPIs across decision workflows, departmental performance, and policy compliance, providing organizations with real-time visibility into governance activity. It operates as an independent microservice, consuming processed decision data via secure internal REST APIs from the Decision Management and Governance & Compliance modules, and presenting that data through analytical dashboards and structured reports. It does not manage decisions; it analyses and monitors them.

### 1.1 General overview of the problem

Enterprise governance environments today lack a centralized, real-time analytical system for transforming decision-making data into usable management information. When organizations need visibility into approval workflows, KPI performance, or compliance status, the process relies on manually compiled spreadsheets and periodic reports assembled across disconnected systems. These methods are neither timely nor reliable. Governance data is operationally critical and without automated monitoring, bottlenecks go undetected, compliance risks are overlooked, and performance gaps remain unaddressed until they escalate.

Additionally, there is no mechanism through which recurring anomalies — approval delay spikes, unusual rejection patterns, or sudden compliance deterioration — are automatically flagged against historical departmental baselines. There is also no system to forecast potential workflow congestion before it occurs, nor a continuous risk scoring mechanism to classify departmental risk levels in real time.

### 1.2 Feasibility Study

**1.2.1 Technical Feasibility:**
The module is technically feasible as it is built on modern web technologies well suited for scalable, data-driven, and AI integrated applications. The React.js frontend with Chart.js and Recharts handles complex real-time visualizations. The Node.js/Express.js backend handles API orchestration. Python-based ML services (scikit-learn, Prophet) are integrated via REST for anomaly detection and forecasting.

**1.2.2 Operational Feasibility:**
The system is designed for ease of use. Dashboards are role based and auto populate based on user designation. AI insights are surfaced as simple alerts and summaries — not raw model outputs — so no data expertise is required from users.

**1.2.3 Economic Feasibility:**
Development costs are manageable, primarily involving open-source technologies. The ML/AI components rely on open-source libraries (scikit-learn, Prophet, Transformers). Estimated development timeline is within the proposed project schedule.

### 1.3 Literature Survey

*(Same as Progress 1 — Table 1: Literature Study — 5 papers reviewed)*

| Author(s) & Year | Full Title | Key Findings | Relevance to Our Project | Gaps Identified |
|---|---|---|---|---|
| [1] Dheerendra Yaganti, 2020 | A Modular Python-Based Framework for Real-Time Enterprise KPI Visualization Using Pandas and Interactive Dashboards | Proposed a modular analytics framework using Pandas for data processing, Matplotlib and Plotly for visualization, and API-based ingestion. | Supports Analytics & Dashboard module. Aligns with modular architecture and real-time KPI analytics implementation. | No machine learning models used. No governance rule validation, predictive forecasting, risk scoring, or decision lifecycle workflow integration. |
| [2] Dachepalli, V. (2025) | AI-Driven Decision Support Systems in ERP | Used supervised machine learning models and time-series forecasting for predictive analytics within ERP systems. | Aligns with our AI Insights module, which also uses ML-based predictive analytics to improve enterprise decision quality. | No governance workflow, no policy validation engine, no audit trail, and no structured decision lifecycle integration. |
| [3] Herreros-Martínez A, et al. (2025) | Applied Machine Learning to Anomaly Detection in Enterprise Purchase Processes | Used Clustering and Isolation Forest for anomaly detection in enterprise purchase data. | Supports our AI Anomaly Detection module, which also applies Isolation Forest for governance anomaly flagging. | Limited to anomaly detection; no governance workflow, dashboards, forecasting, or decision lifecycle integration. |
| [4] Boning Huang et al. (2021) | Enterprise Risk Assessment Based on Machine Learning | Developed enterprise risk models using Random Forest, SVM, and AdaBoost. | Strongly aligns with our AI Risk Scoring module, which uses Random Forest for governance risk classification. | Focused only on financial risk classification. No governance policy enforcement, workflow automation, audit tracking. |
| [5] Andrea Kolková & Aleksandr Ključnikov (2022) | Demand Forecasting: AI-Based, Statistical and Hybrid Models | Compared ARIMA, ETS, TBATS, ANN, Hybrid models, and Prophet forecasting. Found Prophet effective for enterprise-scale forecasting. | Justifies our use of Prophet model for Predictive Delay Forecasting. | Focused only on demand forecasting. No governance engine, no compliance automation, no risk scoring integration. |

*Table 1: Literature Study*

### 1.4 Problem Definition

Organizational decision-making in enterprise governance environments generates structured, measurable data at every stage of execution. The core challenge is the absence of a system that continuously ingests, processes, and transforms this data into real-time managerial insights. While the Decision Management & Workflow System and the Governance, Policy & Compliance Engine digitize and store the complete decision lifecycle, the generated data remains underutilized. Management relies on manually prepared reports and spreadsheets that are delayed, error-prone, and incapable of reflecting real-time operational status.

### 1.5 Analysis of the Problem

A systematic analysis of the governance data pipeline within the Gov-Vision platform reveals six discrete failure points:

**1.5.1 Absence of Real-Time KPI Computation** — KPIs are computed manually through spreadsheet-based processes, structurally incapable of producing the refresh frequency required for real-time governance oversight.

**1.5.2 Absence of Multi-Metric Anomaly Detection** — No automated mechanism exists to identify when a department's decision-processing behavior deviates significantly from its historical baseline across multiple simultaneous metrics.

**1.5.3 Absence of Predictive Delay Forecasting** — Management responds to workflow bottlenecks exclusively after delays have already accumulated.

**1.5.4 Absence of Continuous Automated Risk Scoring** — Departmental risk levels are assessed manually on a quarterly cadence, creating a structural monitoring gap of up to 90 days.

**1.5.5 Absence of Automated Report Generation** — Governance reports are produced through manual data extraction and reformatting.

**1.5.6 Fragmentation of Cross Department Governance Data** — Decision lifecycle data and compliance violation records are distributed across independent systems with no unified analytical layer.

### 1.6 Solution Strategy

**1.6.1 Automated Real-Time KPI Computation** — Manual KPI computation is replaced by an automated aggregation engine that continuously reads raw decision and compliance data, computes all governance performance indicators, and stores results in time-series snapshots.

**1.6.2 Unsupervised Anomaly Detection via Isolation Forest** — Multi-metric anomaly detection using an Isolation Forest model trained on historical decision records. Six behavioral features are used: approval cycle time, rejection count, revision count, days over SLA, stage count, and submission hour.

**1.6.3 Time-Series Delay Forecasting via Prophet** — Prophet time-series forecasting model trained per department on historical decision throughput data, producing 7-day, 14-day, and 30-day forecasts with confidence interval bounds.

**1.6.4 Supervised Risk Classification via Random Forest** — Continuous departmental risk scoring using a supervised Random Forest classifier trained on labeled historical governance records, producing Low/Medium/High/Critical labels with feature importance explanations.

**1.6.5 On-Demand Report Generation** — Programmatic report generation engine assembling governance reports in PDF, Excel, and CSV formats on demand or on a user-defined schedule.

**1.6.6 Unified Real-Time Governance Observation Layer** — The Gov-Vision Analytics Module serves as the single observability layer, consolidating all derived outputs through a unified dashboard interface.

### 1.7 Software Requirement Specifications (SRS)

#### 1.7.1 Functional Requirements

**R1: Executive KPI Dashboard** — Real-time executive dashboard computing and displaying ten governance KPIs across all departments.

| METHOD | ENDPOINT | DESCRIPTION |
|--------|----------|-------------|
| GET | /api/analytics/kpi-summary | Returns all ten KPI values for the requested department and date range |
| GET | /api/analytics/decision-volume | Returns decision counts grouped by daily, weekly, or monthly granularity |
| GET | /api/analytics/cycle-time-histogram | Returns decision counts across four cycle time buckets |
| GET | /api/analytics/compliance-trend | Returns per-department compliance rate time-series |
| POST | /api/events/decision-update | Receives decision state-change events from Module 1 |
| POST | /api/events/compliance-update | Receives compliance violation events from Module 2 |

*Table 2: APIs of the KPI Dashboard Sub-Module*

**R2: Anomaly Detection and Alert System** — Automatically detect abnormal patterns using Isolation Forest, classify each flagged decision by severity, and surface anomalies as real-time alerts.

| METHOD | ENDPOINT | DESCRIPTION |
|--------|----------|-------------|
| GET | /api/ai/anomalies | Returns all unacknowledged anomaly records grouped by severity |
| PUT | /api/ai/anomalies/:id/acknowledge | Sets isAcknowledged to true |
| POST | /ml/anomaly/predict | FastAPI accepts decision feature array, runs Isolation Forest inference |
| POST | /ml/models/train | FastAPI spawns training script as background subprocess |

*Table 3: APIs of the Anomaly Detection Sub-Module*

**R3: Predictive Delay Forecasting** — Forecast future decision throughput per department over 7/14/30-day horizons using Prophet.

| METHOD | ENDPOINT | DESCRIPTION |
|--------|----------|-------------|
| GET | /api/analytics/forecast | Returns stored forecast data for specified department |
| POST | /ml/forecast/predict | FastAPI accepts department time-series, fits Prophet model |

*Table 4: APIs of the Predictive Forecasting Sub-Module*

**R4: AI-Driven Risk Scoring** — Assign continuously updated risk classification using Random Forest.

| METHOD | ENDPOINT | DESCRIPTION |
|--------|----------|-------------|
| GET | /api/ai/risk-scores | Returns current risk label and feature importance |
| GET | /api/analytics/risk-heatmap | Returns risk data aggregated by severity for heatmap |
| POST | /ml/risk/score | FastAPI accepts department feature vectors, runs RandomForestClassifier |

*Table 5: APIs of the Risk Scoring Sub-Module*

**R5: Automated Report Generation** — On-demand and scheduled generation in PDF, Excel, and CSV.

| METHOD | ENDPOINT | DESCRIPTION |
|--------|----------|-------------|
| POST | /api/reports/generate | Initiates on-demand report generation |
| GET | /api/reports | Returns list of all generated reports |
| GET | /api/reports/:id/download | Streams the generated report file |
| POST | /api/reports/schedules | Creates a new scheduled report entry |
| GET | /api/reports/schedules | Returns all active report schedules |
| PATCH | /api/reports/schedules/:id/toggle | Toggles schedule active state |
| DELETE | /api/reports/schedules/:id | Deletes a schedule |

*Table 6: APIs of the Report Generation Sub-Module*

#### 1.7.2 Non-Functional Requirements

**Security:** All dashboard-facing API endpoints are protected by JWT authentication enforced through `validateJWT.ts`. Role-based access control through `requireRole.ts` restricts endpoints by role. All webhook endpoints are protected by `serviceKey.ts`.

**Performance:** Redis caching with TTL-based invalidation. MongoDB aggregation pipelines with indexed field $match stages.

**Reliability:** All async route handlers incorporate try/catch blocks returning structured HTTP 500 responses. FastAPI validates model files at startup.

**Scalability:** Three-tier microservices architecture allows independent scaling. Redis absorbs concurrent read traffic. ML microservice is stateless.

**Maintainability:** TypeScript strict mode enforced. Shared data contracts in types/index.ts. Cross-module reads isolated to dedicated read-only Mongoose models.

---

## 2. PROJECT PLANNING

### 2.1 Hardware and Software Requirements

| Item | Specification |
|------|---------------|
| Memory | 16 GB RAM |
| Processor | AMD Ryzen 7 7840HS |
| Storage | 512 GB SSD |
| Frontend | React.js, TailwindCSS, Apache ECharts |
| Backend | Node.js, Express.js, FastAPI |
| AI / ML | Python, scikit-learn, Prophet, Pandas, NumPy |
| Database | MongoDB (Mongoose), Redis |
| Report Generation | jsPDF, ExcelJS, json2csv |
| Scheduling | node-cron |
| API Testing | Thunder Client |

### 2.2 Team Structure

Aswin Chettri (202422006) — Full-stack Development & AI/ML Integration.

### 2.3 Software Development Life Cycle (SDLC)

Developed using the **Agile SDLC**, where features are built iteratively. Each cycle focuses on key functionalities such as real-time KPI dashboards, anomaly detection, forecasting, risk scoring, and report generation.

### 2.4 Gantt–chart

- **Progress 1 (Days 1–7):** Foundation setup, CSV ETL pipeline, KPI aggregation engine, analytics dashboard UI, Isolation Forest training & inference, and core API development.
- **Progress 2 (Days 8–20):** BPI dataset integration, dual-source architecture, Random Forest risk scoring pipeline, Prophet multi-target forecasting frontend, Deep Insights anomaly investigation page, Report Generation system (CSV/Excel/PDF + builder UI + history + schedules), full JWT enforcement, and final integration testing.

---

## 3. DESIGN STRATEGY FOR THE SOLUTION

### 3.1 Architecture Diagram

**Three-Tier Architecture:**
```
┌──────────────────────────────────────────────────────┐
│  PRESENTATION LAYER — React.js + TailwindCSS         │
│  Dashboard, Deep Insights, Forecast, Risk, Reports   │
├──────────────────────────────────────────────────────┤
│  API LAYER — Node.js / Express.js (Port 5002)        │
│  JWT + RBAC + SERVICE_KEY Middleware                  │
│  KPI Aggregation, Report Generation, Cron Jobs       │
├──────────────────────────────────────────────────────┤
│  AI/ML SERVICE — Python FastAPI (Port 8000)           │
│  Isolation Forest │ Random Forest │ Prophet           │
├──────────────────────────────────────────────────────┤
│  DATA LAYER — MongoDB Cluster + Redis Cache           │
│  m1_decisions, m1_training_decisions, m2_violations, │
│  m3_kpi_snapshots, m3_anomalies, m3_forecasts,       │
│  m3_reports, m3_report_schedules                      │
└──────────────────────────────────────────────────────┘
```

---

## 4. PROGRESS TILL DATE

### 4.1 Analytics Dashboard

The executive analytics dashboard is the primary user-facing page of the GovVision Analytics Module. It is implemented in `client/src/pages/Dashboard.tsx` and provides ten live KPI metric cards alongside three interactive chart components.

**Ten KPI Metric Cards:** Total Decisions, Approval Rate (%), Rejection Rate (%), Average Approval Time (hours), Bottleneck Rate (%), Compliance Rate (%), Violation Count, Decision Throughput (decisions/day), Anomaly Count, and AI Risk Score (label). Each card is rendered by the `KPICard.tsx` component with semantic color-coding — green for healthy thresholds, amber for warning levels, and red for critical values.

**Three Chart Components:**
1. **Decision Volume Chart** — A time-series bar chart showing daily, weekly, or monthly decision counts. Data is fetched from `GET /api/analytics/decision-volume` with configurable granularity.
2. **Cycle Time Histogram** — Groups completed decisions into four cycle-time buckets (0–24h, 24–48h, 48–72h, >72h). Data is fetched from `GET /api/analytics/cycle-time-histogram`.
3. **Compliance Trend Chart** — Multi-line chart showing per-department compliance rate over time. Data is fetched from `GET /api/analytics/compliance-trend`.

The dashboard includes a **date range picker** (`DateRangePicker.tsx`) and a **department selector** in the `TopBar.tsx` component, enabling users to filter all KPI data by department and time window.

An **Anomaly Feed Panel** (`AnomalyFeed.tsx`) is embedded in the dashboard, displaying the latest unacknowledged anomalies grouped by severity with dismissible alert banners.

### 4.2 Data Ingestion (CSV Pipeline)

The initial data pipeline ingests 2,500 decision records from the AI Workflow Optimization Dataset into MongoDB via `server/scripts/importCSV.ts`.

**CSV Parsing:** The script implements a custom RFC-4180-compliant CSV parser (`splitCsvLine()`) that correctly handles quoted fields and escaped double-quotes, reading the file via Node.js `readline` streams for memory efficiency.

**Department Normalization:** Raw department values from the CSV (e.g., "HR", "H.R.", "Human Resources") are normalized to five canonical departments using a two-level lookup — `DEPT_ALIAS_TO_CANONICAL` maps all known aliases to a canonical key, and `DEPT_CANONICAL_META` maps each canonical key to a `{departmentId, departmentName}` pair: Finance (FI001), Human Resources (HR002), Operations (OP003), Information Technology (IT004), and Customer Service (CS005).

**Date Projection:** Original dataset timestamps are linearly mapped from the source time window into a 1-year trailing window ending at the current date using `mapStartTimeToTargetWindow()`. This ensures all dashboard visualizations show data distributed across the past 12 months.

**Feature Engineering:** Each CSV row is transformed into a decision document with derived governance features: `cycleTimeHours` is derived via `deriveCycleTime()` to center around BPI-compatible distributions; `rejectionCount` and `revisionCount` are mapped to realistic governance distributions; `daysOverSLA` is recalculated via `recalcDaysOverSLA()` based on cycle time, stage count, and priority; `status` is mapped from Task_Type via `mapStatus()`.

**Pending Task Simulation:** Recent tasks (within 60 days) with high workload scores have a probability-based chance of being set to pending (`completedAt = null`), ensuring the bottleneck rate KPI has realistic pending decision representation.

**Batch Insert:** Documents are inserted in batches of 100 using `m1Decision.insertMany()` with `ordered: false` for maximum throughput.

### 4.3 Database Model – MongoDB Collections

The following MongoDB collections form the data layer of the Analytics Module:

**m1_decisions** (`server/models/m1Decisions.ts`) — The primary collection for live AI Workflow decision data. Key fields: `decisionId` (indexed), `status` (approved/rejected/pending), `departmentId` (indexed), `departmentName`, `createdAt` (indexed), `completedAt`, `cycleTimeHours`, `rejectionCount`, `revisionCount`, `daysOverSLA`, `stageCount`, `hourOfDaySubmitted`, `priority`, `source` (default: 'ai_workflow', indexed), `isScored` (boolean, indexed), `anomalyScore`, `isAnomaly`, `lastScoredAt`. Compound index on `{isScored: 1, completedAt: -1}` for efficient anomaly job queries.

**m2_violations** (`server/models/m2Violations.ts`) — Read-only model for Module 2's compliance violations. Fields: `department`, `severity`, `status` (open/resolved), `createdAt`. Uses `strict: false` to accept any upstream schema additions.

**m3_kpi_snapshots** (`server/models/KPI_Snapshot.ts`) — One document per (departmentId + snapshotDate) pair, upserted daily. Fields include all ten KPI metrics, plus `riskScore`, `riskLevel` (enum: low/medium/high/critical), `featureImportance` (Mixed type), and `source`. Compound index on `{departmentId: 1, snapshotDate: 1}`.

**m3_anomalies** (`server/models/Anomaly.ts`) — Stores detected anomaly records. Fields: `decisionId` (ObjectId ref to m1_decisions), `department`, `anomalyScore` (0–1), `severity` (enum: Low/Medium/High/Critical/Normal), `isAcknowledged`, `acknowledgedBy`, `acknowledgedAt`, `description`, `featureValues` (Mixed).

### 4.4 API Testing – Thunder Client

All core REST API endpoints implemented in Progress 1 were verified using Thunder Client within VS Code. Tests covered both success paths and authentication/authorization failure paths for the KPI summary, decision volume, cycle-time histogram, compliance trend, anomaly listing, anomaly acknowledgement, anomaly prediction (FastAPI), and model retraining endpoints.

### 4.5 Isolation Forest Model Training

The Isolation Forest anomaly detection model is trained via `ml_service/training/train_isolation_forest.py` using decision records from the `m1_training_decisions` collection.

**Feature Columns:** Four behavioral features are used: `cycleTimeHours`, `rejectionCount`, `revisionCount`, and `daysOverSLA`.

**Data Normalization:** A `RobustScaler` is used instead of StandardScaler to handle outliers in the training data. The scaler is fit on the full training dataset and serialized alongside the model.

**Model Configuration:** `IsolationForest(n_estimators=200, contamination=0.05, random_state=42, max_samples='auto', bootstrap=False)`. The contamination parameter sets 5% of the training data as expected anomaly rate.

**Anomaly Scoring:** Raw decision function scores are normalized to a [0, 1] range using `normalize_scores()`. Severity thresholds: ≥0.95 = Critical, ≥0.90 = High, ≥0.80 = Medium, ≥0.70 = Low, <0.70 = Normal.

**Inference Service:** `ml_service/app/services/anomaly_service.py` loads the saved model and scaler at import time (not per-request). The `detect_anomalies_batch()` function accepts a list of decision payloads, builds a feature matrix, scales via the persisted scaler, and scores via the model's `decision_function()` and `predict()` methods.

**Validation Visualizations:** Five diagnostic charts are generated during training: (1) Anomaly score distribution by severity band, (2) Feature separation between anomalies and normals, (3) Sanity test on synthetic profiles from normal to critical, (4) Histogram of overall score distribution, (5) Scatter map of cycle time vs rejection count colored by anomaly score.

**Artifacts Saved:** `ml_service/models/anomaly/isolation_forest.pkl` and `ml_service/models/anomaly/isolation_forest_scaler.pkl`.

**Cron Job:** `server/jobs/anomalyJob.ts` — Scheduled daily at midnight (`0 0 * * *`). Queries all completed decisions with `isScored: false`, sends them to FastAPI `POST /ml/anomaly/predict`, updates `isScored` flag and anomaly scores via `bulkWrite()`, upserts detected anomalies into `m3_anomalies`, and invalidates the Redis anomaly cache.

### 4.6 BPI Dataset Integration & Dual-Source Architecture

A critical architectural advancement in Progress 2 was the integration of the BPI Challenge 2017 dataset as the training corpus for all three ML models, establishing a strict separation between training data and live inference data.

**Dual-Collection Design:** The system now maintains two distinct MongoDB collections for decision data:
- `m1_decisions` — Live operational data from the AI Workflow dataset, used exclusively for dashboard KPIs, analytics queries, and ML inference.
- `m1_training_decisions` — Historical data from the BPI Challenge 2017 dataset, used exclusively for model training (Isolation Forest, Random Forest, Prophet).

**BPI Import Script:** `server/scripts/importBPI.ts` reads `bpi_aggregated_cases.csv` and transforms each row into the normalized decision schema. Key transformations include:
- **Department Assignment:** Abstract BPI `Resource` identifiers are deterministically mapped to canonical departments (FI001–CS005) using a hash function `hashString()` for consistent distribution.
- **Date Shifting:** BPI dates (2016–2017 era) are shifted forward by 9 years to align with GovVision's 2025–2026 operational timeline.
- **Time Compression:** All cycle times are divided by a factor of 12x via `adjustFeaturesForApproved()` to create realistic governance-scale durations.
- **Status Rebalancing:** `balanceStatus()` deterministically flips a portion of rejected and pending cases to approved, creating a more balanced class distribution for model training.
- **SLA Recalculation:** `getDynamicSlaHours()` computes SLA thresholds based on priority and stage count, with `daysOverSLA` derived accordingly.

**Schema Contract:** Both `m1Decisions.ts` and `m1TrainingDecisions.ts` share an identical field schema (decisionId, status, departmentId, departmentName, createdAt, completedAt, cycleTimeHours, rejectionCount, revisionCount, daysOverSLA, stageCount, hourOfDaySubmitted, priority), differentiated only by the `source` field ('ai_workflow' vs 'bpi_aggregated') and `collection` name. This ensures models trained on BPI data can score live AI Workflow data without feature mismatches.

### 4.7 Random Forest Risk Scoring – Model Training

The supervised Random Forest risk classifier is trained via `ml_service/training/train_random_forest.py` using BPI historical data from the `m1_training_decisions` collection.

**Feature Columns:** Five features are used: `hourOfDaySubmitted` (numeric), `revisionCount` (numeric), `stageCount` (numeric), `department` (categorical — one-hot encoded), and `priority` (categorical — one-hot encoded).

**4-Class Risk Labeling:** Each training record is assigned a risk label based on `daysOverSLA` and `status`:
- **0 (Low):** daysOverSLA == 0 AND status == "approved"
- **1 (Medium):** 0 < daysOverSLA ≤ 1 AND status ≠ "rejected"
- **2 (High):** 1 < daysOverSLA ≤ 5 OR status == "rejected"
- **3 (Critical):** daysOverSLA > 5

**Preprocessing Pipeline:** A scikit-learn `ColumnTransformer` with `StandardScaler` for numeric features and `OneHotEncoder(handle_unknown='ignore')` for categorical features, ensuring the pipeline handles unseen department/priority values at inference time.

**Model Configuration:** `RandomForestClassifier(n_estimators=200, max_depth=10, class_weight='balanced', random_state=42, n_jobs=-1)`. The `class_weight='balanced'` parameter compensates for class imbalance in the training labels.

**Training/Test Split:** 80/20 stratified split with `random_state=42`. A full `classification_report` with per-class precision, recall, and F1-scores is printed for all four risk classes.

**Visual Diagnostics:** Three charts are generated: (1) Confusion Matrix Heatmap (4-class), (2) Top 15 Feature Importance Horizontal Bar Chart, (3) Risk Score Probability Distribution Histogram.

**Artifact Saved:** `ml_service/models/risk/random_forest.pkl` — A serialized scikit-learn `Pipeline` containing both the preprocessor and classifier.

### 4.8 Random Forest Risk Scoring – FastAPI Endpoint & Cron Job

**FastAPI Endpoint:** `POST /ml/risk/score` accepts a `RiskScoreRequest` containing a list of `RiskFeature` objects (dept, hourOfDaySubmitted, revisionCount, stageCount, department, priority). The `risk_service.py` module:
1. Loads the saved pipeline from `random_forest.pkl`.
2. Normalizes incoming features into a DataFrame with the exact training column order.
3. Runs `model.predict()` for class labels and `model.predict_proba()` for probability distributions.
4. Computes a weighted risk score (0–100) using class-weighted probabilities: Low=0, Medium=33, High=66, Critical=100.
5. Returns per-record `{dept, score, level, featureImportance}` with the classifier's feature importance vector.

**Cron Job:** `server/jobs/riskScoringJob.ts` — Scheduled daily at 01:00 (`0 1 * * *`). Workflow:
1. Queries all distinct `departmentId` values from `m1_decisions` where `source='ai_workflow'`.
2. Loads all decision feature vectors for those departments.
3. Sends them to FastAPI `POST /ml/risk/score`.
4. Aggregates per-decision scores into per-department averages using `deptScores` accumulator.
5. Maps averaged scores to risk levels using synchronized thresholds: ≥80 = critical, ≥60 = high, ≥40 = medium, <40 = low.
6. Upserts `riskScore`, `riskLevel`, and `featureImportance` into `m3_kpi_snapshots` for each department.
7. Computes and saves an ORG-level aggregate risk score.
8. Invalidates Redis cache keys `m3:riskscore:*` and `m3:riskheatmap:*`.

### 4.9 Prophet Delay Forecasting – Multi-Target Pipeline

The Prophet forecasting system is trained via `ml_service/training/train_prophet.py` using BPI historical data from `m1_training_decisions`.

**Six Forecast Targets:** The system supports six distinct forecast targets, each producing a separate Prophet model per department:
1. **volume** — Daily decision count (groupby ds → size).
2. **delay** — Average cycle time hours per day (groupby ds → mean of cycleTimeHours).
3. **approval_rate** — Daily approval percentage ((approved/total) × 100).
4. **rejection_rate** — Daily rejection percentage ((rejected/total) × 100).
5. **pending_workload** — Daily count of pending decisions.
6. **sla_misses** — Daily count of decisions with daysOverSLA > 0.

**Model Configuration:** `Prophet(yearly_seasonality=True, weekly_seasonality=True, daily_seasonality=False, interval_width=0.95, changepoint_prior_scale=0.05)`. The 95% confidence interval provides the upper/lower bounds displayed in the frontend chart.

**Gap Filling:** Date ranges are filled using `pd.date_range()` with missing days handled differently by target: volume-type targets fill with 0, delay targets use forward/backward fill.

**Minimum Data Requirement:** Models are only trained for departments with ≥10 daily data points, preventing unstable fits.

**Model Naming Convention:** Each model is saved as `{prefix}_{dept_id}.pkl` where prefix maps to the target (e.g., `prophet_FI001.pkl` for Finance volume, `prophet_delay_HR002.pkl` for HR delay).

**Inference Service:** `ml_service/app/services/forecast_service.py` — `generate_forecast()` loads the appropriate model, creates a future DataFrame starting from today's date (not the training end date), and runs `model.predict()` to produce forecast points with `yhat`, `yhat_lower`, and `yhat_upper` values.

**Cron Job:** `server/jobs/forecastJob.ts` — Scheduled nightly at 02:00 (`0 2 * * *`). Iterates over all departments × all targets × all horizons (7, 14, 30 days), calls FastAPI for each combination, and upserts results into the `m3_forecasts` collection.

### 4.10 Forecast Page – Frontend Implementation

`client/src/pages/ForecastPage.tsx` provides a full-featured forecast exploration interface built with React and Apache ECharts.

**Control Panel:** Three interactive filter groups:
- **Department Selector** — Six preset pills: Organization Wide, Finance, Operations, Human Resources, Legal, Procurement.
- **Horizon Selector** — Three options: 7 Days, 14 Days, 30 Days.
- **Target Selector** — Six forecast targets: Volume, Delay, Approval Rate, Rejection Rate, Pending Workload, SLA Misses.

**Confidence Band Chart:** An ECharts line chart with three series stacked to create the confidence interval visualization: the upper bound area, the lower bound "cutout" area, and the solid midpoint line. Tooltips show the exact yhat, yhat_lower, and yhat_upper values for each date.

**Summary Cards:** Four computed metric cards: Projected Total, Average per Day, Peak Day (date + value), and Forecast Window.

**API Integration:** Data is fetched via `getForecast(deptId, horizon, target)` which calls `GET /api/analytics/forecast` with query parameters.

### 4.11 Risk Score Dashboard – Frontend Implementation

`client/src/pages/RiskPage.tsx` provides the departmental risk assessment view.

**Summary Stat Cards:** Four clickable cards showing the count of departments at each risk level (Critical, High, Medium, Low). Clicking a card filters the table to that severity.

**Risk Table:** `RiskTable.tsx` displays all departments with their risk score (0–100), risk level badge (color-coded), and row click handler for the feature breakdown modal.

**Risk Pie Chart:** `RiskPieChart.tsx` shows the distribution of departments across risk levels.

**Feature Breakdown Modal:** `FeatureBreakdownModal.tsx` — Clicking any department row opens a modal displaying the feature importance scores returned by the Random Forest model, showing which behavioral features (hourOfDaySubmitted, revisionCount, stageCount, department, priority) contributed most to that department's risk classification.

**Filter Controls:** Two dropdown filters (risk level and department) with a reset button. The `AccentDropdown` component provides a styled custom select with click-outside-to-close behavior.

### 4.12 Deep Insights Page – Anomaly Investigation

`client/src/pages/AnomalyDetection.tsx` provides the anomaly investigation interface for governance analysts.

**Severity Group View:** Anomalies are fetched via `getAnomalyGroups()` and displayed grouped by severity level (Critical → High → Medium → Low) with count badges. Each group is expandable/collapsible.

**Anomaly Cards:** Each anomaly displays the decision ID, department, anomaly score (0–1 scale), severity badge, detection description, and feature values that triggered the detection (cycleTimeHours, rejectionCount, revisionCount, daysOverSLA).

**Acknowledge Workflow:** Each unacknowledged anomaly has an "Acknowledge" button that calls `PUT /api/ai/anomalies/:id/acknowledge` and updates the local state.

**Severity Filtering:** A filter bar allows users to show only specific severity levels, enabling analysts to prioritize critical anomalies first.

### 4.13 Report Generation System – Backend

The report generation engine is implemented across three files:

**Report Generator Service** (`server/services/reportGenerator.ts`):
- `generateReport(config)` — Entry point accepting `{type, format, dateFrom, dateTo, departments, requestedBy}`.
- **CSV Generation:** Uses `json2csv` `parse()` with labeled field mappings (Department, Approval Rate %, Avg Cycle Time, Risk Level, Compliance Rate %, Total Decisions, Anomaly Count).
- **Excel Generation:** Uses `ExcelJS` to create a styled workbook with two worksheets — "KPI Summary" (with branded header row styling, alternating row colors, and risk-level cell color-coding) and "Anomaly List" (with decision ID, severity, score, department, acknowledged status, and description columns).
- **PDF Generation:** Uses `jsPDF` with `jspdf-autotable` plugin to create a branded A4 document with a blue header banner ("GovVision – Governance Analytics Report"), metadata section (report type, date range, departments, generated timestamp), KPI summary table with auto-styled headers, and an anomaly summary table (limited to top 10 rows).

**Report Data Assembly** (`server/utils/reportHelpers.ts`):
- `assembleReportData()` — Queries `m3_kpi_snapshots`, `m3_anomalies`, and `m1_decisions` to build `kpiRows[]` and `anomalyRows[]` arrays consumed by all three format generators.

**Report Routes** (`server/routes/reportRoutes.ts`):
- `POST /api/reports/generate` — Creates a pending Report document, calls `generateReport()`, updates status to "completed" or "failed", returns the report metadata.
- `GET /api/reports` — Returns all report records sorted by `generatedAt` descending.
- `GET /api/reports/:id/download` — Streams the generated file using `res.download()`.
- `GET /api/reports/history` — Alias for listing all reports.

### 4.14 Report Builder, History & Schedules – Frontend

**Report Builder** (`client/src/pages/ReportBuilder.tsx`):
- Form with four controls: Report Type (Executive Summary / Compliance / Anomaly / Risk), Format (PDF / Excel / CSV), Date Range (From/To date pickers), and Department multi-select checkboxes.
- Calls `generateReport(config)` on submit and displays success/failure feedback.

**Report History** (`client/src/pages/ReportHistory.tsx`):
- Fetches `getReports()` and displays a table of all generated reports with columns: Type, Format, Status (color-coded badge), Date Range, Generated At, and a Download button that triggers `downloadReport(id, filename)`.

**Report Schedules** (`client/src/pages/ReportSchedules.tsx`):
- Fetches `getSchedules()` and displays active/inactive schedules in a card-based layout.
- Create form: Name, Report Config (type, format, departments, date range mode), Frequency (daily/weekly/monthly), Recipients list.
- Toggle active/inactive via `toggleSchedule(id)`.
- Delete via `deleteSchedule(id)` with confirmation.

**Schedule Job** (`server/jobs/reportScheduleJob.ts`):
- Scheduled hourly (`0 * * * *`). Queries `m3_report_schedules` for active schedules with `nextRunAt <= now`.
- For each due schedule: computes dynamic date range via `calculateDateRange(mode)`, calls `generateReport()`, creates a Report record, updates `lastRunAt`, `lastRunStatus`, and `nextRunAt` via `calculateNextRun(frequency)`.

### 4.15 Full JWT Enforcement & AI Route Integration

**JWT Middleware** (`server/middleware/validateJWT.ts`):
- Reads `Authorization: Bearer <token>` header.
- Verifies signature with `JWT_SECRET` environment variable.
- Attaches decoded payload (`userId`, `role`, `department`) to `req.user`.
- Supports `X-Test-Role` header for development-mode role simulation.

**Role-Based Access Control** (`server/middleware/requireRole.ts`):
- Factory function `requireRole(allowedRoles)` returns Express middleware.
- Checks `req.user.role` against the allowed roles array.
- Returns 403 with `{error, required, yourRole}` on unauthorized access.

**Service Key Middleware** (`server/middleware/serviceKey.ts`):
- Protects webhook endpoints (`/api/events/*`).
- Validates `x-service-key` header against `SERVICE_KEY` environment variable.

**Route Protection Matrix:**

| Route Group | Middleware Chain |
|-------------|-----------------|
| /api/analytics/* | validateJWT → requireRole(['admin','manager','analyst']) |
| /api/ai/* | validateJWT → requireRole(['admin','manager','analyst']) |
| /api/reports/* | validateJWT → requireRole(['admin','manager']) |
| /api/events/* | serviceKey (no JWT) |
| /ml/* (FastAPI) | require_service_key dependency |

### 4.16 New Database Collections (Progress 2)

**m1_training_decisions** (`server/models/m1TrainingDecisions.ts`) — Read-only BPI training data collection. Schema mirrors `m1_decisions` with `source: 'bpi_aggregated'`. Used exclusively by ML training scripts.

| Field | Type | Description |
|-------|------|-------------|
| decisionId | String (indexed) | BPI case ID remapped to Decision_* format |
| status | String | approved / rejected / pending (rebalanced) |
| departmentId | String (indexed) | Canonical ID (FI001–CS005) |
| departmentName | String | Full department name |
| createdAt | Date (indexed) | BPI date shifted +9 years |
| completedAt | Date | Completion timestamp (time-compressed) |
| cycleTimeHours | Number | Duration / 12 compression factor |
| source | String | 'bpi_aggregated' (indexed) |

*Table 7: m1_training_decisions – Field Definitions*

**m3_forecasts** (`server/models/Forecast.ts`) — Stores Prophet forecast results.

| Field | Type | Description |
|-------|------|-------------|
| department | String | Department ID or 'org' |
| generatedAt | Date | Timestamp of forecast generation |
| horizon | Number (enum: 7,14,30) | Forecast horizon in days |
| target | String (enum) | volume / delay / approval_rate / rejection_rate / pending_workload / sla_misses |
| forecastData | Array | Array of {ds, yhat, yhat_lower, yhat_upper} points |

*Table 8: m3_forecasts – Field Definitions*

**m3_reports** (`server/models/Report.ts`) — Stores generated report metadata.

| Field | Type | Description |
|-------|------|-------------|
| type | String (enum) | executive_summary / compliance / anomaly / risk |
| format | String (enum) | csv / excel / pdf |
| status | String (enum) | completed / pending / failed |
| filePath | String | Server filesystem path to generated file |
| parameters | Mixed | Full generation parameters (type, format, dateFrom, dateTo, departments, requestedBy) |
| generatedAt | Date | Generation timestamp |
| generatedBy | String | User ID or schedule reference |

*Table 9: m3_reports – Field Definitions*

**m3_report_schedules** (`server/models/ReportSchedule.ts`) — Stores automated report delivery configurations.

| Field | Type | Description |
|-------|------|-------------|
| name | String | Schedule display name |
| reportConfig | Mixed | {type, format, departments, dateRangeMode} |
| frequency | String (enum) | daily / weekly / monthly |
| nextRunAt | Date | Next scheduled execution time |
| lastRunAt | Date | Last execution timestamp |
| lastRunStatus | String (enum) | success / failed / pending |
| isActive | Boolean | Whether schedule is enabled |
| recipients | Array of String | Email recipients list |
| createdBy | String | Creator user ID |

*Table 10: m3_report_schedules – Field Definitions*

### 4.17 API Testing – Thunder Client (Progress 2 Endpoints)

All Progress 2 API endpoints were verified using Thunder Client within VS Code:

| # | Method | Endpoint | Status | Result |
|---|--------|----------|--------|--------|
| 1 | POST | /ml/risk/score | 200 OK | Returns per-decision risk scores with feature importance |
| 2 | POST | /ml/forecast/predict | 200 OK | Returns forecast points for specified dept/target/horizon |
| 3 | GET | /api/analytics/risk-heatmap | 200 OK | Returns department risk data with severity counts |
| 4 | GET | /api/analytics/forecast | 200 OK | Returns cached forecast data from m3_forecasts |
| 5 | POST | /api/reports/generate | 200 OK | Generates report file and returns metadata |
| 6 | GET | /api/reports | 200 OK | Returns all report records |
| 7 | GET | /api/reports/:id/download | 200 OK | Streams generated file (PDF/Excel/CSV) |
| 8 | POST | /api/reports/schedules | 201 Created | Creates new report schedule |
| 9 | GET | /api/reports/schedules | 200 OK | Returns all active schedules |
| 10 | PATCH | /api/reports/schedules/:id/toggle | 200 OK | Toggles isActive flag |
| 11 | DELETE | /api/reports/schedules/:id | 200 OK | Removes schedule |
| 12 | GET | /api/ai/anomalies (no JWT) | 401 Unauthorized | Correctly rejects unauthenticated request |
| 13 | GET | /api/analytics/kpi-summary (wrong role) | 403 Forbidden | Correctly rejects unauthorized role |

*Table 12: Thunder Client API Test Results (Progress 2 Endpoints)*

---

## 5. SUMMARY AND CONCLUSION

### 5.1 Progress Summary

| Milestone | Status |
|-----------|--------|
| Analytics Dashboard (10 KPIs, 3 Charts) | ✅ Complete |
| Data Ingestion – CSV Pipeline | ✅ Complete |
| Database Model – 8 MongoDB Collections | ✅ Complete |
| Isolation Forest Anomaly Detection Pipeline | ✅ Complete |
| BPI Dataset Integration & Dual-Source Architecture | ✅ Complete |
| Random Forest Risk Scoring Pipeline | ✅ Complete |
| Prophet Multi-Target Forecasting Pipeline | ✅ Complete |
| Forecast Page (6 targets, 3 horizons) | ✅ Complete |
| Risk Score Dashboard (Table + Pie Chart + Feature Modal) | ✅ Complete |
| Deep Insights – Anomaly Investigation Page | ✅ Complete |
| Report Generation System (PDF, Excel, CSV) | ✅ Complete |
| Report Builder, History & Schedules UI | ✅ Complete |
| Full JWT + RBAC Enforcement | ✅ Complete |
| API Testing – Thunder Client (All Endpoints) | ✅ Complete |
| 4 Automated Cron Jobs (Anomaly, Risk, Forecast, Report Schedule) | ✅ Complete |

*Table 13: Gov-Vision Analytics Module – Progress Summary (Updated)*

### 5.2 Conclusion

The GovVision Analytics, Reporting & Management Monitoring System with AI/ML Insights has been developed as a comprehensive analytical layer for enterprise governance. The module successfully integrates three distinct AI/ML capabilities — unsupervised anomaly detection using Isolation Forest, supervised risk classification using Random Forest, and time-series forecasting using Prophet — into a unified dashboard platform. The dual-source data architecture ensures clean separation between historical training data and live operational data, enabling robust model inference on production decision streams. The reporting engine supports on-demand and scheduled generation across three formats (PDF, Excel, CSV), providing management with structured governance reports. All endpoints are secured through JWT authentication with role-based access control, and four automated cron jobs ensure continuous data freshness across the analytical pipeline.

---

## REFERENCES

[1] Dheerendra Yaganti. (2020). A Modular Python-Based Framework for Real-Time Enterprise KPI Visualization Using Pandas and Interactive Dashboards. *International Journal of Computer Science and Engineering*, 8(4), 15–23.

[2] Dachepalli, V. (2025). AI-Driven Decision Support Systems in ERP: Enhancing Operational Efficiency Through Machine Learning. *Journal of Information Technology*, 12(1), 45–62.

[3] Herreros-Martínez, A., Rodríguez Ferrer, S., Álvarez, A. & Mucientes, M. (2025). Applied Machine Learning to Anomaly Detection in Enterprise Purchase Processes. *Expert Systems with Applications*, 238, 121–135.

[4] Boning Huang, Jingdong Wei, Jiayu Tang, Feng Liu & Yumeng Li. (2021). Enterprise Risk Assessment Based on Machine Learning. *Computational Intelligence and Neuroscience*, 2021, Article ID 6049195.

[5] Andrea Kolková & Aleksandr Ključnikov. (2022). Demand Forecasting: AI-Based, Statistical and Hybrid Models. *Journal of Risk and Financial Management*, 15(12), 549.

[6] Meta (Facebook). Prophet: Forecasting at Scale. https://facebook.github.io/prophet/

[7] scikit-learn. Isolation Forest Documentation. https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.IsolationForest.html

[8] scikit-learn. Random Forest Classifier Documentation. https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.RandomForestClassifier.html
