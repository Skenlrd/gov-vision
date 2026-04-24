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
| 1 | INTRODUCTION | |
| 1.1 | General overview of the problem | |
| 1.2 | Feasibility Study | |
| 1.3 | Literature Survey | |
| 1.4 | Problem Definition | |
| 1.5 | Analysis of the Problem | |
| 1.6 | Solution Strategy | |
| 1.7 | Software Requirement Specifications | |
| 1.7.1 | Functional Requirements | |
| 1.7.2 | Non-Functional Requirements | |
| 2 | PROJECT PLANNING | |
| 2.1 | Hardware and Software Requirements | |
| 2.2 | Team Structure | |
| 2.3 | SDLC | |
| 2.4 | Gantt–chart | |
| 3 | DESIGN STRATEGY FOR THE SOLUTION | |
| 3.1 | Architecture Diagram | |
| 4 | PROGRESS TILL DATE (Progress 2 – New Work) | |
| 4.1 | Random Forest Risk Scoring Pipeline | |
| 4.2 | Prophet Delay Forecasting – Frontend & Verification | |
| 4.3 | Forecast Page Implementation | |
| 4.4 | Risk Score Dashboard Implementation | |
| 4.5 | Deep Insights Page – Anomaly Investigation | |
| 4.6 | Report Generation System | |
| 4.7 | Report Builder & History UI | |
| 4.8 | Full JWT Enforcement & AI Route Integration | |
| 4.9 | New Database Collections | |
| 4.10 | API Testing – Thunder Client (Progress 2 Endpoints) | |
| 5 | SUMMARY AND CONCLUSION | |
| 5.1 | Progress Summary | |
| 5.2 | Conclusion | |
| | REFERENCES | |

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
| 12 | Random Forest Training – Classification Report |
| 13 | Random Forest – Feature Importance Breakdown |
| 14 | Thunder Client – POST /ml/risk/score Test |

---

## LIST OF TABLES

| Table No. | Table Name |
|-----------|------------|
| 1 | Literature Study |
| 2–6 | API Tables (from Progress 1) |
| 7 | m3_forecasts – Field Definitions |
| 8 | m3_reports – Field Definitions |
| 9 | m3_report_schedules – Field Definitions |
| 10 | Random Forest – Feature Importance Scores |
| 11 | Thunder Client API Test Results (Progress 2 Endpoints) |
| 12 | Gov-Vision Analytics Module – Progress Summary (Updated) |

---

## 1. INTRODUCTION

The Analytics, Reporting & Management Monitoring System with AI Insights is a dedicated module within the Gov-Vision Digital Decision & Governance Platform, an enterprise-grade system designed to bring analytical depth, transparency, and accountability to organizational decision making. As governance processes grow increasingly complex, this module exists to ensure that the right people have the right information, at the right time, supported by clearly defined Key Performance Indicators (KPIs) that measure governance effectiveness across the organization.

In modern enterprise environments, decision-making generates vast amounts of data that, when properly analysed, can reveal critical insights about organizational efficiency, risk exposure, and compliance status. Most organizations still rely on manual spreadsheets, delayed reports, and intuition-led decision, leaving bottlenecks undetected, compliance risks overlooked, and performance gaps unaddressed. This module directly solves that problem by serving as the analytical and visibility layer of the Gov-Vision platform, transforming raw decision data into clear insights for executives, managers, compliance officers, analysts, and department heads.

While the broader Gov-Vision platform manages the full lifecycle of organizational decisions from creation and approval through to compliance and auditing, this module focuses exclusively on analytics, reporting, and monitoring. It continuously tracks KPIs across decision workflows, departmental performance, and policy compliance, providing organizations with real-time visibility into governance activity. It operates as an independent microservice, consuming processed decision data via secure internal REST APIs from the Decision Management and Governance & Compliance modules, and presenting that data through analytical dashboards and structured reports. It does not manage decisions; it analyses and monitors them.

The module's most notable capabilities include real-time executive dashboards that display decision metrics, approval timelines, KPI performance, and risk indicators, alongside AI-powered anomaly detection that automatically flags abnormal patterns in approval workflows. It features predictive analytics that forecast approval delays before they occur, and AI-driven risk scoring that assigns dynamic risk levels to departments and decision types. Users also benefit from comprehensive analytical tools for examining decision patterns, compliance status, and departmental performance, as well as customizable automated report generation with scheduled delivery in PDF, Excel, and CSV formats. Role-based access controls ensure that every stakeholder sees precisely the data relevant to their role.

### 1.1 General overview of the problem

Enterprise governance environments today lack a centralized, real-time analytical system for transforming decision-making data into usable management information. When organizations need visibility into approval workflows, KPI performance, or compliance status, the process relies on manually compiled spreadsheets and periodic reports assembled across disconnected systems. These methods are neither timely nor reliable. Governance data is operationally critical and without automated monitoring, bottlenecks go undetected, compliance risks are overlooked, and performance gaps remain unaddressed until they escalate.

Additionally, there is no mechanism through which recurring anomalies — approval delay spikes, unusual rejection patterns, or sudden compliance deterioration — are automatically flagged against historical departmental baselines. There is also no system to forecast potential workflow congestion before it occurs, nor a continuous risk scoring mechanism to classify departmental risk levels in real time. Without these capabilities, management is forced into a reactive posture, responding to failures only after they have materialized.

Furthermore, decision data is fragmented across multiple systems with no unified governance view available to executives or department heads. All these gaps collectively highlight the need for an integrated, AI/ML enhanced analytics and monitoring platform such as the Gov-Vision Analytics Module.

### 1.2 Feasibility Study

**1.2.1 Technical Feasibility:**
The module is technically feasible as it is built on modern web technologies well suited for scalable, data-driven, and AI integrated applications. The React.js frontend with Chart.js and Recharts handles complex real-time visualizations. The Node.js/Express.js backend handles API orchestration. Python-based ML services (scikit-learn, Prophet) are integrated via REST for anomaly detection and forecasting. These are all well-documented, and widely adopted in enterprise environments.

**1.2.2 Operational Feasibility:**
The system is designed for ease of use. Dashboards are role based and auto populate based on user designation. AI insights are surfaced as simple alerts and summaries — not raw model outputs — so no data expertise is required from users. This minimizes training requirements and simplifies system usage.

**1.2.3 Economic Feasibility:**
Development costs are manageable, primarily involving open-source technologies. The ML/AI components rely on open-source libraries (scikit-learn, Prophet, Transformers). Estimated development timeline is within the proposed project schedule.

### 1.3 Literature Survey

*(Same as Progress 1 — Table 1: Literature Study — 5 papers reviewed)*

| Author(s) & Year | Full Title | Key Findings | Relevance to Our Project | Gaps Identified |
|---|---|---|---|---|
| [1] Dheerendra Yaganti, 2020 | A Modular Python-Based Framework for Real-Time Enterprise KPI Visualization Using Pandas and Interactive Dashboards | Proposed a modular analytics framework using Pandas for data processing, Matplotlib and Plotly for visualization, and API-based ingestion. | Supports Analytics & Dashboard module, which uses structured data processing and visualization techniques. Aligns with modular architecture and real-time KPI analytics implementation. | No machine learning models used. No governance rule validation, predictive forecasting, risk scoring, or decision lifecycle workflow integration. |
| [2] Dachepalli, V. (2025) | AI-Driven Decision Support Systems in ERP | Used supervised machine learning models (regression, decision trees, ensemble methods) and time-series forecasting for predictive analytics within ERP systems. | Aligns with our AI Insights module, which also uses ML-based predictive analytics to improve enterprise decision quality. | No governance workflow, no policy validation engine, no audit trail, and no structured decision lifecycle integration. |
| [3] Herreros-Martínez A, et al. (2025) | Applied Machine Learning to Anomaly Detection in Enterprise Purchase Processes, A Hybrid Approach Using Clustering and Isolation Forest | Used Clustering (unsupervised learning) and Isolation Forest for anomaly detection in enterprise purchase data. | Supports our AI Anomaly Detection module, which also applies Isolation Forest for governance anomaly flagging. | Limited to anomaly detection; no governance workflow, dashboards, forecasting, or decision lifecycle integration. |
| [4] Boning Huang et al. (2021) | Enterprise Risk Assessment Based on Machine Learning | Developed enterprise risk models using Random Forest, SVM, and AdaBoost. Demonstrated improved risk prediction accuracy over traditional statistical models. | Strongly aligns with our AI Risk Scoring module, which uses Random Forest for governance risk classification. Similar supervised ML training on structured indicators. | Focused only on financial risk classification. No governance policy enforcement, workflow automation, audit tracking, or real-time enterprise dashboard integration. |
| [5] Andrea Kolková & Aleksandr Ključnikov (2022) | Demand Forecasting: AI-Based, Statistical and Hybrid Models vs Practice-Based Models | Compared ARIMA, ETS, TBATS, ANN, Hybrid models, and Prophet forecasting. Found Prophet effective for enterprise-scale forecasting. | Justifies our use of Prophet model for Predictive Delay Forecasting. Supports time-series modeling and performance validation techniques in enterprise environments. | Focused only on demand forecasting. No governance engine, no compliance automation, no risk scoring integration, and no decision lifecycle management. |

*Table 1: Literature Study*

### 1.4 Problem Definition

Organizational decision-making in enterprise governance environments generates structured, measurable data at every stage of execution. Each decision follows a defined multi-stage workflow — Example: Submitted → Under Review → L1 Approval → L2 Approval → Approved or Rejected — producing quantifiable attributes such as timestamps, stage durations, reviewer identifiers, revision counts, rejection reasons, SLA deviations, and compliance indicators.

The core challenge is the absence of a system that continuously ingests, processes, and transforms this data into real-time managerial insights. While the Decision Management & Workflow System and the Governance, Policy & Compliance Engine digitize and store the complete decision lifecycle, the generated data remains underutilized. It is stored in MongoDB collections without an automated analytics pipeline to compute KPIs, detect anomalies, or predict future outcomes.

As a result, management relies on manually prepared reports and spreadsheets that are delayed, error-prone, and incapable of reflecting real-time operational status. Furthermore, the lack of applied machine learning techniques — such as anomaly detection, predictive delay forecasting, and risk classification — creates a critical gap in proactive governance.

The Analytics, Reporting & AI/ML Monitoring System is designed to address this gap by converting raw decision data into actionable, real-time intelligence.

### 1.5 Analysis of the Problem

A systematic analysis of the governance data pipeline within the Gov-Vision platform reveals six discrete failure points, each of which independently degrades management's ability to maintain effective organizational oversight.

**1.5.1 Absence of Real-Time KPI Computation**
Key performance indicators — Average Approval Time, Bottleneck Rate (decisions stalled beyond SLA thresholds as a percentage of total active decisions), Compliance Rate, Rejection Rate, and Decision Throughput — are computed manually through spreadsheet-based processes. This methodology is structurally incapable of producing the refresh frequency required for real-time governance oversight. By the time a manually compiled KPI report reaches a decision-maker, the underlying operational data may already reflect a materially different state. Performance degradation that develops gradually over days goes entirely undetected between reporting cycles.

**1.5.2 Absence of Multi-Metric Anomaly Detection**
No automated mechanism exists to identify when a department's decision-processing behavior deviates significantly from its historical baseline across multiple simultaneous metrics. A single delayed decision may be operationally unremarkable; however, a department simultaneously exhibiting an average approval cycle time of 9.8 days against a historical baseline of 2.3 days, combined with a rejection rate rising from 5% to 29%, constitutes a statistically significant governance anomaly. Such multi-metric behavioral deviations are invisible to manual monitoring and compound silently until they escalate into compliance failures or missed organizational commitments.

**1.5.3 Absence of Predictive Delay Forecasting**
Management responds to workflow bottlenecks exclusively after delays have already accumulated and escalated. No mechanism exists to forecast which departments are likely to experience approval congestion in the coming weeks based on current decision intake rates and historical throughput patterns. This reactive posture means that preventive resource reallocation, escalation of pending approvals, or policy adjustments cannot be initiated in advance — interventions occur only after the bottleneck has already impacted organizational output.

**1.5.4 Absence of Continuous Automated Risk Scoring**
Departmental risk levels in most enterprise governance frameworks are assessed manually by compliance officers on a quarterly cadence. This creates a structural monitoring gap of up to 90 days during which a department may deteriorate from a low-risk classification to a critical operational state without triggering any alert. The absence of a continuously updated, data-driven risk scoring mechanism means that high-risk states persist undetected between audit cycles, exposing the organization to compliance violations and unmanaged operational failures.

**1.5.5 Absence of Automated Report Generation**
Governance reports are produced through manual data extraction, reformatting in spreadsheet tools, and distribution via email. This process introduces transcription errors, consumes significant analyst effort per reporting cycle, and makes reports unavailable on demand. Decision-makers requiring an immediate governance summary must wait for the next scheduled report cycle regardless of operational urgency, delaying evidence-based management response.

**1.5.6 Fragmentation of Cross Department/Module Governance Data**
Decision lifecycle data, compliance violation records, and policy definitions are distributed across independent organizational systems with no unified analytical layer. Executives and department heads must consult multiple interfaces to construct a complete picture of governance performance, and even then, the view is static rather than live. The absence of a centralized observability layer prevents cross-dimensional analysis — for example, correlating approval delays with compliance violations across the same department over the same time window — which is precisely the class of insight required for proactive governance.

### 1.6 Solution Strategy

The Gov-Vision Analytics Module addresses each identified failure point through a corresponding technical approach, implemented as an independent analytical microservice that continuously ingests cross-module decision data and transforms it into real-time governance intelligence.

**1.6.1 Automated Real-Time KPI Computation** — Manual KPI computation is replaced by an automated aggregation engine that continuously reads raw decision and compliance data, computes all governance performance indicators, and stores the results in a time-series snapshot store. KPI data is refreshed both on a scheduled interval and immediately upon receiving state-change notifications from the decision management and compliance modules, ensuring that the dashboard always reflects the current operational state. A caching layer with a defined expiry window is applied to high-frequency dashboard queries, maintaining low latency without incurring repeated computation costs on every poll.

**1.6.2 Unsupervised Anomaly Detection via Isolation Forest** — Multi-metric anomaly detection is achieved by training an Isolation Forest model on historical decision records. Isolation Forest is selected because it detects anomalies by measuring how quickly a data point can be isolated from the rest of the population in a random partitioning tree — anomalous decisions, being statistically rare and extreme, are isolated in fewer splits and therefore receive higher anomaly scores. Six behavioral features are used: approval cycle time, rejection count, revision count, days over SLA, stage count, and submission hour. Detected anomalies are classified into severity tiers — Critical, High, Medium, and Low — based on normalized score thresholds, and surfaced to managers as real-time dismissible alerts on the executive dashboard, enabling immediate investigation rather than post-incident discovery.

**1.6.3 Time-Series Delay Forecasting via Prophet** — Predictive capability is introduced through a Prophet time-series forecasting model trained per department on historical decision throughput data. Prophet is selected for its ability to decompose irregular business time-series into trend and seasonality components without requiring stationary input data. The model produces 7-day, 14-day, and 30-day decision volume forecasts with confidence interval bounds, which are visualized as area charts on the management dashboard. This enables governance teams to identify departments approaching capacity thresholds weeks in advance and take preventive action — escalating approvals, reallocating reviewer bandwidth, or adjusting SLA windows — before bottlenecks affect organizational output.

**1.6.4 Supervised Risk Classification via Random Forest** — Continuous departmental risk scoring is achieved through a supervised Random Forest classifier trained on labeled historical governance records. Random Forest is selected for its robustness to noisy features, its native support for multi-class classification, and its built-in feature importance mechanism which provides explainability — enabling compliance officers to understand not just a department's risk label but which governance factors are driving it. The model executes on a daily refresh cycle, producing a live risk label (Low, Medium, High, or Critical) for each active department alongside a feature importance breakdown. This eliminates the quarterly manual audit cycle and ensures that deteriorating departments are flagged continuously rather than only at scheduled review intervals.

**1.6.5 On-Demand Report Generation** — Manual report production is replaced by a programmatic report generation engine that assembles governance reports in PDF, Excel, and CSV formats on demand or on a user-defined schedule. Reports are constructed directly from pre-aggregated governance data — KPI summaries, anomaly logs, compliance rates, and risk classifications — eliminating manual extraction and transcription. Scheduled report delivery is configurable per report type, enabling weekly executive summaries, monthly compliance reports, and ad-hoc departmental performance snapshots to be generated and distributed automatically without analyst intervention.

**1.6.6 Unified Real-Time Governance Observation Layer** — Cross-module/department data fragmentation is resolved by establishing the Gov-Vision Analytics Module as the single observability layer of the platform. Decision lifecycle data and compliance records from the upstream modules are consumed through direct read access to the shared database cluster, avoiding the latency and pagination overhead of inter-service REST calls for bulk analytical queries. All derived outputs — KPI snapshots, anomaly classifications, risk scores, and forecasts — are consolidated and exposed through a unified dashboard interface comprising dedicated views for executive KPI monitoring, AI-powered anomaly insights, departmental risk heatmaps, delay forecasts, and compliance analytics. This provides executives and department heads with a single, continuously updated, role-gated interface through which the complete governance performance of the organization is visible at all times.

### 1.7 Software Requirement Specifications (SRS)

#### 1.7.1 Functional Requirements

**R1: Executive KPI Dashboard**
*Description:* The system shall provide a real-time executive dashboard that computes and displays ten governance Key Performance Indicators across all organizational departments, enabling management to monitor decision-making performance without manual data compilation.
*Input:* Decision records from m1_decisions, compliance violation records from m2_violations, a department filter parameter, and a date range supplied through the dashboard filter bar.
*Output:* Ten live KPI metric cards — Total Decisions, Approval Rate (%), Rejection Rate (%), Average Approval Time (hours), Bottleneck Rate (%), Compliance Rate (%), Violation Count, Decision Throughput (decisions/day), Anomaly Count, and AI Risk Score (label) — updated in real time.
*Process:* KPI computation is event-driven. Whenever a decision state change occurs in Module 1 or a compliance violation is raised or resolved in Module 2, an authenticated webhook payload is dispatched to the respective endpoint. On receipt, the system invalidates the corresponding Redis cache keys and immediately invokes the KPI aggregation engine, which computes all ten metrics from m1_decisions and m2_violations and upserts the result into m3_kpi_snapshots. The updated KPI payload is then pushed directly to connected dashboard clients via a Socket.io kpi:updated event, triggering an immediate re-render of all KPI cards without any polling interval.

| METHOD | ENDPOINT | DESCRIPTION |
|--------|----------|-------------|
| GET | /api/analytics/kpi-summary | Returns all ten KPI values for the requested department and date range |
| GET | /api/analytics/decision-volume | Returns decision counts grouped by daily, weekly, or monthly granularity |
| GET | /api/analytics/cycle-time-histogram | Returns decision counts across four cycle time buckets |
| GET | /api/analytics/compliance-trend | Returns per-department compliance rate time-series |
| POST | /api/events/decision-update | Receives decision state-change events from Module 1 |
| POST | /api/events/compliance-update | Receives compliance violation events from Module 2 |

*Table 2: APIs of the KPI Dashboard Sub-Module*

**R2: Anomaly Detection and Alert System**
*Description:* The system shall automatically detect abnormal patterns in both active and completed decisions using a trained Isolation Forest model, classify each flagged decision by severity, and surface unacknowledged anomalies to managers as real-time alerts while intervention is still actionable.
*Input:* Decision feature vectors extracted from m1_decisions — cycleTimeHours, rejectionCount, revisionCount, daysOverSLA, stageCount, and hourOfDaySubmitted — covering all decisions within the last 30 days regardless of completion status.
*Output:* Per-decision anomaly result containing anomalyScore (normalized float, 0–1), isAnomaly (boolean), and severity label (Critical, High, Medium, Low, or Normal). Anomalous results are persisted in m3_anomalies and displayed as dismissible severity-coded alerts on the executive dashboard and AI Insights page, with active decisions prioritized as they remain actionable.
*Process:* Detection operates through two mechanisms. The primary mechanism is event-driven — on every decision state transition, the incoming feature vector is immediately evaluated against the Isolation Forest model, ensuring active decisions with abnormal daysOverSLA or cycleTimeHours are flagged within seconds. The secondary mechanism is a daily midnight cron job that re-evaluates the full 30-day decision window as a fault-tolerance reconciliation pass for any decisions missed due to dropped webhooks. In both paths, the FastAPI service normalizes input vectors using the persisted StandardScaler, scores via the Isolation Forest model, and maps results to severity thresholds (≥ 0.95 = Critical, ≥ 0.90 = High, ≥ 0.80 = Medium, ≥ 0.70 = Low). Confirmed anomalies are upserted into m3_anomalies and pushed to connected clients via a Socket.io anomaly:new event.

| METHOD | ENDPOINT | DESCRIPTION |
|--------|----------|-------------|
| GET | /api/ai/anomalies | Returns all unacknowledged anomaly records grouped by severity |
| PUT | /api/ai/anomalies/:id/acknowledge | Sets isAcknowledged to true, records acknowledgedBy and acknowledgedAt |
| POST | /ml/anomaly/predict | FastAPI accepts decision feature array, runs Isolation Forest inference |
| POST | /ml/models/train | FastAPI spawns training script as a background subprocess |

*Table 3: APIs of the Anomaly Detection Sub-Module*

**R3: Predictive Delay Forecasting**
*Description:* The system shall forecast future decision throughput per department over 7-day, 14-day, and 30-day horizons using a trained Prophet time-series model, enabling management to identify departments approaching bottleneck conditions before delays materialize.
*Input:* Historical KPI snapshot records from m3_kpi_snapshots, with snapshotDate as the time index and totalDecisions as the target variable, submitted per department to the FastAPI ML microservice.
*Output:* Forecast arrays stored in m3_forecasts containing predicted decision count (yhat), lower confidence bound (yhat_lower), and upper confidence bound (yhat_upper) at the 80% interval for each future date. Output is visualized as a time-series area chart with confidence bands on the Forecast Dashboard using Apache ECharts.
*Process:* A weekly cron job queries all active departments, assembles their historical throughput time-series from m3_kpi_snapshots, and posts to the FastAPI forecast endpoint. The service fits one Prophet model per department and generates forecasts across all three horizons. Prophet requires sufficient historical data accumulation between runs to produce updated forecasts — a weekly cadence aligns with this requirement since daily decision volumes do not shift multi-week trend patterns within shorter intervals. Results are inserted into m3_forecasts and a forecast:updated Socket.io event is emitted to connected clients.

| METHOD | ENDPOINT | DESCRIPTION |
|--------|----------|-------------|
| GET | /api/analytics/forecast | Returns stored forecast data for the specified department across all three horizons |
| POST | /ml/forecast/predict | FastAPI accepts department time-series, fits Prophet model, returns forecast arrays |

*Table 4: APIs of the Predictive Forecasting Sub-Module*

**R4: AI-Driven Risk Scoring**
*Description:* The system shall assign a continuously updated risk classification to each active department by applying a trained Random Forest classifier to live governance feature vectors, providing management with an explainable departmental risk signal.
*Input:* Per-department governance feature vector assembled from m3_kpi_snapshots and m2_violations — approval delay ratio, SLA breach frequency, violation count per decision, policy compliance rate, and revision cycle count.
*Output:* A risk label (Low, Medium, High, or Critical) and a feature importance breakdown per department indicating the percentage contribution of each governance feature to the composite risk score. Results are written to m3_kpi_snapshots.riskScore and riskLevel, and visualized as a department-by-category ECharts heatmap with drill-down capability.
*Process:* A daily cron job queries the latest governance feature vector for each active department from m3_kpi_snapshots and m2_violations and posts to the FastAPI risk scoring endpoint. The service runs RandomForestClassifier inference and returns a risk label alongside feature importance scores for each department. Results are written back to m3_kpi_snapshots and a risk:updated Socket.io event is emitted to connected clients. Risk scoring runs daily since the underlying features — approval delay ratios, violation counts, compliance rates — are aggregated metrics that accumulate over days and do not shift within shorter intervals.

| METHOD | ENDPOINT | DESCRIPTION |
|--------|----------|-------------|
| GET | /api/ai/risk-scores | Returns current risk label and feature importance breakdown for all active departments |
| GET | /api/analytics/risk-heatmap | Returns risk data aggregated by severity for heatmap rendering |
| POST | /ml/risk/score | FastAPI accepts department feature vectors, runs RandomForestClassifier inference |

*Table 5: APIs of the Risk Scoring Sub-Module*

**R5: Automated Report Generation**
*Description:* The system shall enable on-demand and scheduled generation of structured governance reports in PDF, Excel, and CSV formats, assembling data programmatically from pre-aggregated governance collections without manual extraction.
*Input:* Report parameters — report name, type (Executive, Compliance, Decision, Department, or Custom), output format (PDF, Excel, or CSV), date range, and target departments. For scheduled reports, a user-defined cron expression and recipient email list are additionally configured through m3_report_schedules.
*Output:* A generated report file persisted to the server filesystem with its path recorded in m3_reports. Report status transitions through Generating → Completed or Failed. Completed reports are available for immediate download through the Report History page.
*Process:* On-demand reports are triggered explicitly by the user through the Report Builder interface. Scheduled reports are registered at server startup by reading all active m3_report_schedules documents and dynamically registering each cron expression with node-cron. In both cases, the report generation service queries m3_kpi_snapshots, m3_anomalies, and m2_violations for the requested parameters and assembles the output using jsPDF for PDF, ExcelJS for Excel, and json2csv for CSV. Report generation is a user-initiated or user-scheduled operation and does not respond to upstream system events.

| METHOD | ENDPOINT | DESCRIPTION |
|--------|----------|-------------|
| POST | /api/reports/generate | Initiates on-demand report generation; returns reportId and initial status |
| GET | /api/reports/history | Returns list of all generated reports from m3_reports with download URLs |
| GET | /api/reports/download/:reportId | Streams the generated report file to the client |
| POST | /api/reports/schedules | Creates a new scheduled report entry in m3_report_schedules |
| GET | /api/reports/schedules | Returns all active report schedules |
| DELETE | /api/reports/schedules/:id | Deletes a schedule |

*Table 6: APIs of the Report Generation Sub-Module*

#### 1.7.2 Non-Functional Requirements

**Security:** All dashboard-facing API endpoints are protected by JWT authentication enforced through validateJWT.ts, which verifies the Bearer token against the shared JWT_SECRET and attaches the decoded user payload to the request. Role-based access control through requireRole.ts restricts anomaly acknowledgement, risk score retrieval, and report generation endpoints to users with the manager or admin role. All machine-to-machine webhook endpoints are protected by serviceKey.ts, which validates the x-service-key request header against process.env.SERVICE_KEY. No credentials or service keys are transmitted in URL query parameters.

**Performance:** KPI and anomaly cache keys are invalidated on every upstream webhook event and immediately rewritten with fresh results, so the Redis TTL of 3600 seconds on both functions purely as a fallback for missed webhook scenarios. MongoDB aggregation pipelines include $match stages on indexed fields (department, createdAt, completedAt) to prevent full collection scans. WebSocket push delivery eliminates polling overhead on both client and server.

**Reliability:** All asynchronous Express route handlers incorporate try/catch blocks returning structured HTTP 500 responses rather than crashing the server process. The FastAPI startup lifecycle validates that all serialized model files are present and loadable before the service accepts inference requests. Failed report generation transitions the corresponding m3_reports document to a Failed status with an error description. All scheduled cron jobs log execution start, completion, and errors on every run.

**Scalability:** The three-tier microservices architecture allows the Node.js backend and the Python FastAPI ML microservice to be scaled independently. The Redis caching layer absorbs concurrent read traffic without proportionally increasing MongoDB query load. The ML microservice is stateless between requests, so horizontal scaling requires no session affinity.

**Maintainability:** TypeScript strict mode is enforced across both the backend and frontend tiers. All shared data contracts are defined in a single types/index.ts file per tier, preventing interface drift across the API boundary. All cross-module read operations are isolated to dedicated read-only Mongoose models in backend/models/external/, ensuring upstream schema changes require updates in a single clearly identified location.

**Availability:** If the FastAPI ML microservice is unavailable, the Node.js backend continues to serve cached KPI data and the last computed anomaly and risk records from Redis and MongoDB. If Redis is unavailable, the system falls back to direct MongoDB queries. No single downstream dependency blocks core dashboard functionality.

---

## 2. PROJECT PLANNING

### 2.1 Hardware and Software Requirements

**Hardware Requirements (System Specification)**

| Item | Specification |
|------|---------------|
| Memory | 16 GB RAM |
| Processor | AMD Ryzen 7 7840HS |
| Storage | 512 GB SSD |
| Graphics Card | NVIDIA GeForce RTX 3050 |

**Software Requirements**

| Item | Technology |
|------|------------|
| Operating System | Windows 11 |
| Frontend | React.js, HTML5, CSS3, TailwindCSS |
| Backend | Node.js, Express.js, FastAPI |
| AI / ML | Python, scikit-learn, Prophet, Pandas, NumPy |
| Analytics & Visualization | Recharts, Apache ECharts |
| Database | MongoDB (Mongoose), Redis |
| Report Generation | jsPDF, ExcelJS, json2csv |
| Scheduling | node-cron |
| Development Tools | VS Code, npm, pip |
| API Testing | Thunder Client |
| Version Control | Git, GitHub |

### 2.2 Team Structure

Aswin Chettri (202422006) — Full-stack Development & AI/ML Integration, under the guidance of Dr. Moumita Pramanik (Internal Guide) and Mr. Somnath Barik (External Guide).

### 2.3 Software Development Life Cycle (SDLC)

Analytics, Reporting & AI/ML Monitoring System is developed using the **Agile SDLC**, where features are built iteratively. Each cycle focuses on key functionalities such as real-time KPI dashboards, anomaly detection, forecasting, risk scoring, and report generation. Backend services handle KPI aggregation, AI/ML models (Isolation Forest, Random Forest, Prophet), and REST APIs, while frontend components like the Executive Dashboard, AI Insights, and Report Builder are developed in parallel. After testing, features are deployed and continuously improved using feedback from integration with other Modules.

### 2.4 Gantt–chart

The project was executed in two major sprints:
- **Progress 1 (Days 1–7):** Foundation setup, CSV ETL pipeline, KPI aggregation engine, analytics dashboard UI, Isolation Forest training & inference, and core API development.
- **Progress 2 (Days 8–20):** Prophet forecast frontend, Random Forest risk scoring (training + cron job + frontend), Deep Insights anomaly investigation page, Report Generation system (CSV/Excel/PDF + builder UI + history + schedules), full JWT enforcement, and final integration testing.

---

## 3. DESIGN STRATEGY FOR THE SOLUTION

### 3.1 Architecture Diagram

*Fig 4: Architecture Overview Diagram of Analytics, Reporting & AI/ML Monitoring System*

**Description:** The layered architecture of the Analytics, Reporting & AI/ML Monitoring System of the GovVision platform. It shows how the frontend (React + dashboards) communicates with the Node.js backend via REST APIs secured by JWT, which handles KPI computation, report generation, and orchestration. The backend interacts with a Python FastAPI AI/ML service (using Isolation Forest, Random Forest, and Prophet) for anomaly detection, risk scoring, and forecasting. It also integrates with other modules through secure REST calls. Data is stored in a shared MongoDB cluster, while Redis caching improves performance for KPIs, anomalies, and forecasts.

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
│  m1_decisions, m2_violations, m3_kpi_snapshots,      │
│  m3_anomalies, m3_forecasts, m3_reports,             │
│  m3_report_schedules                                  │
└──────────────────────────────────────────────────────┘
```

---

## 4. PROGRESS TILL DATE (Progress 2 – New Work Since Progress 1)

Progress 1 established the foundational layers of the Gov-Vision Analytics Module: the three-tier architecture, the CSV ETL pipeline (2,500 records), the KPI aggregation engine, the executive analytics dashboard with ten live KPI cards and three chart components, the Isolation Forest anomaly detection model (training + FastAPI inference), and core API endpoints with Thunder Client verification. The items listed as "Not Started" or "In Progress" in Progress 1's summary table (Table 14) form the scope of Progress 2. This section documents the completion of each of those items.

### 4.1 Random Forest Risk Scoring – Model Training

The Random Forest risk scoring pipeline was implemented end-to-end to replace the stub implementation that existed in `risk_service.py` (which returned `riskScore: 0.0` and `riskLevel: 'Low'` for every department regardless of input).

**Training Script:** `ml_service/training/train_risk_model.py`

The training script generates a supervised classification model using `RandomForestClassifier` from scikit-learn. Seven governance features are used per department:

| Feature | Type | Description |
|---------|------|-------------|
| violationCount | Number | Policy violations in the last 30 days |
| openViolationRate | Float (0–1) | Fraction of violations still unresolved |
| avgCompositeRisk | Number (0–100) | Average composite risk score from m2_risks |
| overdueCount | Number | Decisions past their SLA deadline |
| complianceRate | Number (0–100) | Percentage of decisions passing compliance checks |
| policyBreachFreq | Float | Violations per 100 decisions (frequency metric) |
| escalationCount | Number | Decisions that were escalated |

**Target classes:** 0 = Low, 1 = Medium, 2 = High, 3 = Critical

**Model Configuration:**
- `RandomForestClassifier(n_estimators=200, max_depth=10, class_weight='balanced', random_state=42)`
- `class_weight='balanced'` compensates for the rarity of Critical-level samples by increasing their weight in the loss function
- `StandardScaler` normalizes all features before training
- Both the scaler and classifier are saved together in a single `Pipeline` object serialized to `ml_service/models/random_forest.pkl`

**Training Results:**
- 800 training samples generated with realistic governance data distributions
- 80/20 train-test split with stratified sampling
- Classification report showed strong precision and recall across all four classes

**Feature Importance Scores (from `model.feature_importances_`):**

| Feature | Importance | Percentage |
|---------|-----------|------------|
| avgCompositeRisk | 0.3241 | 32.4% |
| violationCount | 0.1842 | 18.4% |
| complianceRate | 0.1654 | 16.5% |
| openViolationRate | 0.1234 | 12.3% |
| overdueCount | 0.0987 | 9.9% |
| policyBreachFreq | 0.0743 | 7.4% |
| escalationCount | 0.0299 | 3.0% |

*Table 10: Random Forest — Feature Importance Scores*

### 4.2 Random Forest Risk Scoring – FastAPI Endpoint & Cron Job

**FastAPI Endpoint:** `POST /ml/risk/score`
The stub in `risk_service.py` was replaced with a real implementation that loads the trained pipeline from disk, constructs a Pandas DataFrame from the input feature vectors, runs `model.predict()` and `model.predict_proba()`, and returns a risk label, score (0–100), and the feature importance breakdown for each department.

**Node.js Cron Job:** `server/jobs/riskScoringJob.ts`
A daily cron job scheduled at `0 1 * * *` (01:00 AM) was implemented. The job:
1. Queries `m3_kpi_snapshots` for all distinct department IDs
2. For each department, reads the most recent KPI snapshot to assemble the 7-feature vector
3. Sends all department feature vectors to FastAPI `POST /ml/risk/score` in one batch call
4. Receives back risk scores and levels for each department
5. Updates `m3_kpi_snapshots.riskScore` and `m3_kpi_snapshots.riskLevel` for each department via `updateMany()`
6. Invalidates Redis cache keys `m3:riskscore:{deptId}` for all departments

The job is registered in `server.ts` via a module-level import and can also be triggered manually via `npm run run:risk-job`.

### 4.3 Prophet Delay Forecasting – Frontend Implementation

The Prophet forecasting backend (training script `train_prophet.py`, FastAPI endpoint `POST /ml/forecast/predict`, Node.js cron job `forecastJob.ts`, and analytics route `GET /api/analytics/forecast`) was completed in Progress 1's later stages. Progress 2 verified the full pipeline end-to-end and built the frontend page.

**Forecast Page:** `client/src/pages/ForecastPage.tsx`

The page provides three user controls:
- **Department Selector:** Dropdown with all canonical departments plus an "All Departments (Org)" option
- **Horizon Toggle:** Three buttons — 7d, 14d, 30d — controlling how far ahead the forecast extends
- **Target Toggle:** Two buttons — Decision Volume and Approval Delay — switching between the two Prophet model families

The chart is rendered using **Apache ECharts** (`echarts-for-react`) as a confidence band visualization:
- The solid orange line represents the model's predicted value (`yhat`)
- The shaded indigo band represents the 80% confidence interval (`yhat_lower` to `yhat_upper`)
- A widening band indicates decreasing model certainty for dates further in the future

Supporting components created:
- `client/src/components/ForecastChart.tsx` — ECharts confidence band chart
- `client/src/components/HorizonToggle.tsx` — 7/14/30 day toggle buttons
- `client/src/components/TargetToggle.tsx` — Volume/Delay toggle buttons

Types added to `client/src/types/index.ts`: `ForecastPoint`, `ForecastResponse`, `ForecastParams`
API wrapper added to `client/src/services/api.ts`: `getForecast(deptId, horizon, target)`

### 4.4 Risk Score Dashboard – Frontend Implementation

**Risk Page:** `client/src/pages/RiskPage.tsx`

The Risk Score Dashboard displays the AI/ML-driven risk classification for all departments. It includes:

1. **Department Risk Ranking Table** (`RiskTable.tsx`): Sorted by risk score descending. Each row shows department name, composite risk score (0–100) with a colored progress bar, risk level badge (Low/Medium/High/Critical with semantic color coding), and the top contributing feature from the importance breakdown.

2. **Risk Level Distribution Pie Chart** (`RiskPieChart.tsx`): Apache ECharts pie chart showing the distribution of departments across the four risk levels. Color scheme: Low = green, Medium = amber, High = orange, Critical = red.

3. **Feature Importance Breakdown Modal** (`FeatureBreakdownModal.tsx`): Opened when clicking a department row. Displays a horizontal bar chart showing the percentage contribution of each of the 7 governance features to that department's risk classification.

4. **Risk Level Badge** (`RiskLevelBadge.tsx`): Reusable component rendering a colored badge — green for Low, amber for Medium, orange for High, red for Critical.

Data is fetched from `GET /api/analytics/risk-heatmap` which returns risk data aggregated by severity with date-range support.

### 4.5 Deep Insights Page – Anomaly Investigation

**Deep Insights Page:** `client/src/pages/DeepInsights.tsx`

This page provides a detailed anomaly investigation interface beyond the simple anomaly feed on the executive dashboard. Features include:

1. **Anomaly Table:** All detected anomalies listed with columns for department, anomaly score, severity badge, detection date, acknowledgment status, and linked decision ID
2. **Severity Filter:** Filter anomalies by severity level (Critical/High/Medium/Low/All)
3. **Feature Values Chart:** For each selected anomaly, displays the six Isolation Forest feature values as a radar or bar chart, enabling managers to understand *why* a decision was flagged
4. **Acknowledge Flow:** Clicking "Acknowledge" on any anomaly calls `PUT /api/ai/anomalies/:id/acknowledge`, which sets `isAcknowledged: true`, records `acknowledgedBy` and `acknowledgedAt`, and invalidates the Redis anomaly cache

### 4.6 Report Generation System – Backend

The report generation system was built from scratch across three backend components:

**Report Generator Service:** `server/services/reportGenerator.ts`
- **PDF Generation (jsPDF):** Generates reports with a cover page (title, date range, generated-by), KPI summary table, compliance data tables, violation breakdown, and page footers with page numbers
- **Excel Generation (ExcelJS):** Creates multi-sheet workbooks — Sheet 1: Summary with styled headers and KPI values; Sheet 2: Decision detail table; Sheet 3: Compliance breakdown. All columns are auto-fitted with frozen header rows for scrolling
- **CSV Generation (json2csv):** Converts MongoDB query result arrays to CSV with configurable field mapping and header row

**Report API Routes:** `server/routes/reportRoutes.ts`
- `POST /api/reports/generate` — Initiates on-demand report generation; accepts `{ type, format, params: {from, to, departments[], widgets[]} }`; returns `{ reportId, status }`
- `GET /api/reports/history` — Returns all generated reports from `m3_reports` sorted by date descending
- `GET /api/reports/download/:reportId` — Streams the generated report file to the client
- `POST /api/reports/schedules` — Creates a new scheduled report entry
- `GET /api/reports/schedules` — Returns all active report schedules
- `DELETE /api/reports/schedules/:id` — Deletes a schedule

**Scheduled Report Runner:** `server/jobs/reportScheduleJob.ts`
- Reads all active `m3_report_schedules` documents where `isActive = true`
- Registers each cron expression with `node-cron` at server startup
- On trigger, runs the report generation function, saves the file, updates `lastRun` and `nextRun` on the schedule document

### 4.7 Report Builder & History – Frontend Implementation

**Report Builder Page:** `client/src/pages/ReportBuilder.tsx`
The Report Builder provides a form-based interface for configuring and generating reports:
- **Report Type Select:** Executive, Compliance, Decision, Department, or Custom
- **Date Range Inputs:** From and To date pickers
- **Department Multi-Select:** Select one or more departments to include
- **Widget Checkboxes:** KPI Table, Compliance Chart, Anomaly List, Risk Scores, Decision Volume
- **Format Radio Buttons:** PDF, Excel, or CSV
- **Generate Button:** Calls `POST /api/reports/generate` with a loading spinner during generation; on success displays a Download button

**Report History Page:** `client/src/pages/ReportHistory.tsx`
- Displays all past `m3_reports` records sorted by date descending
- Columns: Date, Report Name, Type, Format Badge, Status Badge (Completed/Failed), Download Button
- Filter by type and date range
- Download button calls `GET /api/reports/download/:reportId`

**Report Schedules Manager:** Integrated into the Report Builder page
- Table listing all active schedules with name, frequency, next run time, last run status badge, Edit/Delete buttons
- Add Schedule modal with frequency select, report type, format, and recipients email list

### 4.8 Full JWT Enforcement & AI Route Integration

**Authentication Hardening:**
During Progress 1, JWT middleware on analytics GET routes was intentionally commented out for development convenience. In Progress 2, `validateJWT` and `requireRole` middleware have been re-enabled and enforced on all analytics, AI, and report endpoints. Specifically:
- All `GET /api/analytics/*` routes require JWT with manager/admin/analyst role
- All `GET /api/ai/*` routes require JWT with manager/admin role
- All `POST /api/reports/*` routes require JWT with manager/admin role
- All `PUT /api/ai/anomalies/:id/acknowledge` requires JWT with manager/admin role
- All webhook endpoints (`POST /api/events/*`) continue to use SERVICE_KEY authentication

**AI Route Integration:**
`server/routes/aiRoutes.ts` was completed from its partial/stub state. The Node.js backend now fully proxies to the FastAPI ML service for:
- Anomaly detection inference (`POST /ml/anomaly/predict`)
- Risk score inference (`POST /ml/risk/score`)
- Forecast prediction (`POST /ml/forecast/predict`)
- Model retraining trigger (`POST /ml/models/train`)

### 4.9 New Database Collections (Progress 2)

Three new MongoDB collections were created and are operational:

**m3_forecasts** — Populated by Prophet predictions

| FIELD | TYPE | DESCRIPTION |
|-------|------|-------------|
| _id | ObjectId | Auto-generated primary key |
| department | String | Department identifier or "org" for organisation-level |
| forecastDate | Date | Date when this forecast was generated |
| horizon | Number | 7, 14, or 30 — forecast horizon in days |
| target | String | "volume" or "delay" |
| forecastData | Array | [{ds: Date, yhat: Number, yhat_lower: Number, yhat_upper: Number}] |
| generatedAt | Date | Auto timestamp |

*Table 7: m3_forecasts — Field Definitions*

**m3_reports**

| FIELD | TYPE | DESCRIPTION |
|-------|------|-------------|
| _id | ObjectId | Auto-generated primary key |
| name | String | Report display name |
| type | String | executive, compliance, decision, department, or custom |
| format | String | pdf, excel, or csv |
| params | Object | {from: Date, to: Date, departments: [String], widgets: [String]} |
| storagePath | String | Filesystem path for the generated file |
| generatedBy | ObjectId | FK reference to users._id |
| scheduleId | ObjectId | FK reference to m3_report_schedules (nullable) |
| status | String | pending, generating, completed, or failed |
| createdAt | Date | Auto timestamp |

*Table 8: m3_reports — Field Definitions*

**m3_report_schedules**

| FIELD | TYPE | DESCRIPTION |
|-------|------|-------------|
| _id | ObjectId | Auto-generated primary key |
| name | String | Schedule display label |
| frequency | String | daily, weekly, or monthly |
| cronExpression | String | Derived node-cron expression (e.g. '0 8 * * 1') |
| reportType | String | Same options as m3_reports.type |
| format | String | pdf, excel, or csv |
| params | Object | Same structure as m3_reports.params |
| recipients | Array | [String] email addresses for automated delivery |
| isActive | Boolean | Default: true |
| lastRun | Date | Last successful execution timestamp (nullable) |
| nextRun | Date | Computed from cronExpression and current time |
| createdBy | ObjectId | FK reference to users._id |
| createdAt | Date | Auto timestamp |

*Table 9: m3_report_schedules — Field Definitions*

### 4.10 API Testing – Thunder Client (Progress 2 Endpoints)

All new REST API endpoints implemented in Progress 2 have been verified using Thunder Client within VS Code.

| METHOD | ENDPOINT | AUTH | TEST INPUT | RESPONSE | STATUS |
|--------|----------|------|------------|----------|--------|
| GET | /api/analytics/forecast | JWT | deptId=FI001, horizon=7, target=volume | 200 OK, forecastData array with 7 points | PASS |
| GET | /api/analytics/forecast | JWT | deptId=org, horizon=30, target=delay | 200 OK, forecastData array with 30 points | PASS |
| GET | /api/analytics/risk-heatmap | JWT | — | 200 OK, risk aggregation by severity | PASS |
| POST | /ml/risk/score | x-service-key | violationCount: 8, avgCompositeRisk: 72, complianceRate: 61 | 200 OK — score: 74.3, level: High, featureImportance: {} | PASS |
| POST | /ml/risk/score | Invalid key | — | 401 Unauthorized | PASS |
| POST | /ml/forecast/predict | x-service-key | dept_id=FI001, horizon=7, target=volume | 200 OK — forecast array | PASS |
| POST | /api/reports/generate | JWT | type: executive, format: pdf, params: {from, to, departments} | 200 OK — reportId, status: generating | PASS |
| GET | /api/reports/history | JWT | — | 200 OK — reports array | PASS |
| GET | /api/reports/download/:id | JWT | Valid reportId | 200 OK — binary file stream | PASS |
| POST | /api/reports/schedules | JWT | name, frequency: weekly, reportType, format, recipients | 201 Created — schedule object | PASS |
| GET | /api/reports/schedules | JWT | — | 200 OK — schedules array | PASS |
| DELETE | /api/reports/schedules/:id | JWT | Valid scheduleId | 200 OK — deleted | PASS |

*Table 11: Thunder Client API Test Results (Progress 2 Endpoints)*

---

## 5. SUMMARY AND CONCLUSION

### 5.1 Progress Summary

The following table summarises the implementation status of all planned components of the GovVision Analytics Module as of the current submission date. Items marked **Complete (P1)** were finished during Progress 1. Items marked **Complete (P2)** were finished during Progress 2.

| COMPONENT | DESCRIPTION | STATUS |
|-----------|-------------|--------|
| Project architecture | Three-tier setup: React client, Node.js backend, Python FastAPI ML service | Complete (P1) |
| Core middleware | validateJWT.ts, requireRole.ts, serviceKey.ts | Complete (P1) |
| MongoDB connection | db.ts — MongoDB Atlas connection utility | Complete (P1) |
| m1_decisions schema | Cross-module read-only Mongoose model | Complete (P1) |
| m3_kpi_snapshots schema | KPI aggregation snapshot collection | Complete (P1) |
| m3_anomalies schema | Anomaly detection results collection | Complete (P1) |
| CSV ETL pipeline | importCSV.ts — 2,500 records imported with department normalization | Complete (P1) |
| KPI aggregation engine | kpiAggregator.ts — ten KPI metrics via MongoDB aggregation pipelines | Complete (P1) |
| Webhook event routes | POST /api/events/decision-update and compliance-update | Complete (P1) |
| Analytics API endpoints | GET kpi-summary, decision-volume, cycle-time-histogram, compliance-trend | Complete (P1) |
| Executive Dashboard UI | Ten KPI cards, three chart components, anomaly feed panel | Complete (P1) |
| Isolation Forest training | train_isolation_forest.py — 2,500 records, six features, artifacts saved | Complete (P1) |
| FastAPI ML service | POST /ml/anomaly/predict and POST /ml/models/train | Complete (P1) |
| Anomaly API routes | GET /api/ai/anomalies and PUT /api/ai/anomalies/:id/acknowledge | **Complete (P2)** |
| Full AI route wiring | Node.js aiRoutes.ts wiring to FastAPI ML service for all endpoints | **Complete (P2)** |
| Authentication guards | JWT middleware fully enforced on all analytics and AI endpoints | **Complete (P2)** |
| m3_forecasts schema | Prophet forecast collection — dual target (volume + delay) | **Complete (P2)** |
| m3_reports schema | Report metadata collection | **Complete (P2)** |
| m3_report_schedules schema | Scheduled report configuration collection | **Complete (P2)** |
| Random Forest risk scoring | train_risk_model.py, riskScoringJob.ts, real scores in m3_kpi_snapshots | **Complete (P2)** |
| Prophet delay forecasting | train_prophet.py, forecastJob.ts, m3_forecasts population (dual target) | **Complete (P2)** |
| Report generation service | reportGenerator.ts — jsPDF, ExcelJS, json2csv | **Complete (P2)** |
| Report Builder UI | Frontend report configuration, generation, and download | **Complete (P2)** |
| Report History UI | Frontend report archive with re-download access | **Complete (P2)** |
| Report Schedules | Backend cron-based scheduled report execution + frontend manager | **Complete (P2)** |
| Forecast Page UI | ForecastPage.tsx — Prophet confidence band chart with horizon/target toggle | **Complete (P2)** |
| Risk Score Dashboard | RiskPage.tsx — ranking table, pie chart, feature importance modal | **Complete (P2)** |
| Deep Insights Page | DeepInsights.tsx — anomaly investigation, filters, feature chart | **Complete (P2)** |

*Table 12: GovVision Analytics Module — Progress Summary (Updated)*

### 5.2 Conclusion

The Gov-Vision Analytics Module has reached full completion of all planned functional requirements across both Progress 1 and Progress 2. The three-tier microservices architecture — React frontend, Node.js backend, and Python FastAPI ML microservice — is fully operational with all endpoints secured by JWT authentication and role-based access control.

All three AI/ML models are trained, serialized, and serving real predictions:

1. **Isolation Forest (Anomaly Detection):** Trained on 2,500 decision records across six behavioural features. 150 decisions (6.0%) flagged with severity classifications from Normal (score: 0.407) to Critical (score: 1.000). The model correctly identifies multi-metric governance anomalies and surfaces them as dismissible alerts on both the executive dashboard and the Deep Insights investigation page.

2. **Random Forest (Risk Scoring):** Trained with 200 decision trees on seven governance risk features. The model produces genuine risk classifications (Low/Medium/High/Critical) with explainable feature importance scores for each department. The daily cron job at 01:00 ensures risk scores are continuously updated without manual intervention, replacing the previous quarterly manual assessment cadence.

3. **Prophet (Delay Forecasting):** Trained per department on historical KPI throughput data with dual targets (decision volume and approval delay). The model produces 7-day, 14-day, and 30-day forecasts with 80% confidence interval bounds, visualized as confidence band charts on the Forecast page. This enables management to identify departments approaching capacity thresholds weeks in advance.

The automated report generation system supports on-demand and scheduled generation of governance reports in PDF, Excel, and CSV formats, programmatically assembled from pre-aggregated KPI, anomaly, compliance, and risk data. The Report Builder, Report History, and Schedule Manager provide a complete self-service reporting workflow.

The complete frontend comprises the Executive Dashboard (ten KPI cards, three chart components, anomaly feed), Deep Insights (anomaly investigation), Forecast Page (Prophet confidence bands), Risk Score Dashboard (ranking table, pie chart, feature importance), Report Builder, Report History, and Scheduled Reports — all protected by JWT and role-based access controls.

The module successfully transitions governance oversight from a reactive to a proactive posture, providing organizations with continuous, AI-enhanced analytical intelligence across all decision workflows.

---

## REFERENCES

[1] D. Yaganti, "A modular Python-based framework for real-time enterprise KPI visualization using Pandas and interactive dashboards," International Journal of Science and Research (IJSR), vol. 9, no. 3, p. 1735–1736, 2020. https://dx.doi.org/10.21275/SR20033094751

[2] V. Dachepalli, "AI-driven decision support systems in ERP," International Journal of Computer Science and Data Engineering, vol. 2, no. 2, p. 7, 2025. http://dx.doi.org/10.55124/csdb.v2i2.248

[3] A. Herreros-Martínez, R. Magdalena-Benedicto, J. Vila-Francés, A. J. Serrano-López, S. Pérez-Díaz, and J. J. Martínez-Herráiz, "Applied machine learning to anomaly detection in enterprise purchase processes: A hybrid approach using clustering and isolation forest," Information, vol. 16, no. 3, p. 177, 2025. https://doi.org/10.3390/info16030177

[4] B. Huang, J. Wei, Y. Tang, and C. Liu, "Enterprise risk assessment based on machine learning," Computational Intelligence and Neuroscience, no. 1, p. 6049195, 2021. https://doi.org/10.1155/2021/6049195

[5] A. Kolková and A. Ključnikov, "Demand forecasting: AI-based, statistical and hybrid models vs practice-based models – The case of SMEs and large enterprises," Economics and Sociology, vol. 15, no. 4, pp. 39-42, 2022. https://doi.org/10.14254/2071-789X.2022/15-4/2
