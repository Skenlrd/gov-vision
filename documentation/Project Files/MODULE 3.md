G O V V I S I O N
Digital Decision & Governance Platform
Complete Project Breakdown — Implementation Guide
Architecture  ·  AI/ML Integration  ·  REST APIs  ·  Database Design  ·  Roles  ·  Data Flow  ·  Sequence Diagram

MODULE 1
Decision Management
& Workflow System
Arnab Roy · 202422025	MODULE 2
Governance, Policy &
Compliance Engine
Moyuk Rudra · 202422016	MODULE 3
Analytics, Reporting &
AI/ML Monitoring System
Aswin Chettri · 202422006
 
1. Overall System Architecture

1.1 Architecture Pattern
GovVision is built as a Modular Microservices Architecture. Each of the three modules is an independently deployable Node.js service (Module 2 may also use Python Flask). They communicate through documented REST APIs and share a single MongoDB cluster. Module 3 additionally delegates all AI/ML work to a separate Python FastAPI microservice.

MODULAR MICROSERVICES — KEY PRINCIPLES:
  • Each module runs as a separate Node.js (or Flask) server on its own port
  • Each module owns its own MongoDB collections (namespaced m1_, m2_, m3_)
  • All three services connect to the SAME MongoDB cluster (shared database, separate collections)
  • Cross-module data access uses REST API calls — not direct DB joins across namespaces
  • Exception: Module 3 reads m1_decisions and m2_violations directly via Mongoose for bulk analytics (same cluster)
  • A shared Redis instance (Module 3 only) caches AI/ML results and KPI aggregations
  • One shared JWT_SECRET env var validates user tokens across all three Node.js services
  • Service-to-service calls use a separate SERVICE_KEY header — never exposed to the browser

1.2 Layer-by-Layer Architecture

┌─────────────────────────────────────────────────────────────────────────────────┐
│                           GOVVISION PLATFORM ARCHITECTURE                       │
├──────────────────────────────────────────────────────────────────────────────── ┤
│  PRESENTATION LAYER (Frontend)                                                   │
│                                                                                   │
│   Module 1 Frontend           Module 2 Frontend        Module 3 Frontend          │
│   React.js + TailwindCSS       HTML + CSS + JS          React.js + TailwindCSS    │
│   Runs in Browser              Runs in Browser           Runs in Browser           │
│         │                            │                          │                  │
├─────────┼────────────────────────────┼──────────────────────────┼──────────────────┤
│  API GATEWAY LAYER (Each module exposes its own REST API)                          │
│         │                            │                          │                  │
│   M1 Express.js Server         M2 Express.js /          M3 Express.js Server       │
│   Port: 3001                   Flask Server             Port: 3003                 │
│   JWT Middleware               Port: 3002               JWT Middleware             │
│   RBAC Middleware              JWT + SERVICE_KEY         RBAC + SERVICE_KEY        │
│         │                            │                          │                  │
├─────────┼────────────────────────────┼──────────────────────────┼──────────────────┤
│  SERVICE / BUSINESS LOGIC LAYER                                                    │
│                                                                                    │
│  M1: Lifecycle Engine          M2: Policy Engine         M3: KPI Aggregation       │
│  M1: Approval Routing          M2: Compliance Hook       M3: AI/ML Orchestrator    │
│  M1: Notification Service      M2: Audit Trail Writer    M3: Report Generator      │
│  M1: File Manager              M2: Risk Scorer           M3: Cache Manager         │
│  M1: bcrypt Auth               M2: bcrypt Auth           M3: bcrypt Auth           │
│         │                            │                          │                  │
│         │          ┌─────────────────────────────────┐          │                  │
│         │          │  SERVICE-TO-SERVICE REST CALLS   │          │                  │
│         │          │  M1 → M2: validate, audit/log    │          │                  │
│         │          │  M1 → M3: decision-update webhook│          │                  │
│         │          │  M3 → M2: compliance data        │          │                  │
│         │          │  M3 → M2: audit/log              │          │                  │
│         │          └─────────────────────────────────┘          │                  │
│         │                            │                          │                  │
├─────────┼────────────────────────────┼──────────────────────────┼──────────────────┤
│  AI/ML SERVICE LAYER (Python FastAPI — port 8000)                                  │
│                                                                                    │
│   POST /ml/anomaly/predict    →  Isolation Forest (scikit-learn)                  │
│   POST /ml/forecast/predict   →  Prophet (Facebook)                               │
│   POST /ml/risk/score         →  Random Forest (scikit-learn)                     │
│   POST /ml/models/train       →  Retrain all three models (weekly)                │
│                    Called only by Module 3 via SERVICE_KEY                         │
│         │                            │                          │                  │
├─────────┼────────────────────────────┼──────────────────────────┼──────────────────┤
│  DATA LAYER                                                                        │
│                                                                                    │
│   MongoDB Cluster (shared)                  Redis (Module 3 only)                  │
│   ├── users (shared read/write)             ├── m3:kpi:{dept}:{date}               │
│   ├── departments (shared read/write)       ├── m3:anomalies:active                │
│   ├── m1_decisions                          ├── m3:forecast:{dept}:{horizon}       │
│   ├── m1_comments                           └── m3:riskscore:{dept}                │
│   ├── m1_notifications                                                             │
│   ├── m1_file_versions                     File Storage (GridFS / filesystem)      │
│   ├── m1_workflow_configs                   ├── Decision attachments (M1)           │
│   ├── m2_policies                           └── Generated reports (M3)             │
│   ├── m2_policy_versions                                                           │
│   ├── m2_violations                                                                │
│   ├── m2_audit_logs                                                                │
│   ├── m2_risks                                                                     │
│   ├── m3_kpi_snapshots                                                             │
│   ├── m3_anomalies                                                                 │
│   ├── m3_forecasts                                                                 │
│   ├── m3_reports                                                                   │
│   └── m3_report_schedules                                                          │
└─────────────────────────────────────────────────────────────────────────────────┘

1.3 Technology Stack (All Modules)
Layer	Module 1	Module 2	Module 3
Frontend	React.js, Tailwind CSS	HTML, CSS, JavaScript	React.js, HTML5, CSS3, TailwindCSS
Backend	Node.js, Express.js	Node.js, Express.js / Python (Flask)	Node.js, Express.js, Python FastAPI
Database	MongoDB	MongoDB	MongoDB (Mongoose), Redis
Authentication	JWT (JSON Web Tokens)	JWT (JSON Web Tokens)	JWT (JSON Web Tokens)
AI/ML Libraries	—	—	scikit-learn, Prophet, Pandas, NumPy
Visualisation	—	—	Recharts, Apache ECharts
Report Generation	—	—	jsPDF, ExcelJS, json2csv
Scheduling	—	—	node-cron
Dev & Version Control	VS Code, Postman, Git, GitHub	VS Code, Postman, Git, GitHub	VS Code, Thunder Client, npm, pip, Git, GitHub

1.4 Authentication & Security — bcrypt + JWT
What is bcrypt and why is it used?
•	bcrypt is a password-hashing algorithm designed specifically to be slow and resistant to brute-force attacks. Unlike fast algorithms (MD5, SHA-256), bcrypt has a configurable cost factor (saltRounds) that increases computation time exponentially.
•	Every user's password gets a unique random salt auto-generated by bcrypt. This salt is embedded inside the resulting hash string, so even two users with the same password will have completely different hashes.
•	The resulting hash is a 60-character string that encodes: algorithm version + cost factor + salt + hashed value — all in one string. Only this hash is stored in the database; the original password is never stored anywhere.
Authentication Flow — Step by Step
1.	User submits email + plain-text password via the login page.
2.	The server fetches the user document from MongoDB by email. It calls bcrypt.compare(inputPassword, storedHash). bcrypt extracts the embedded salt from storedHash, re-hashes the input using the same salt and cost, then compares. Returns true/false.
3.	On success: server creates a JWT Access Token (15-minute expiry) containing { userId, role, department } signed with the shared JWT_SECRET env variable.
4.	Server also creates a JWT Refresh Token (7-day expiry) and stores a reference hash in Redis (or MongoDB). Both tokens are returned to the client.
5.	For every subsequent request, the client sends: Authorization: Bearer <accessToken>. The server's validateJWT middleware verifies the signature and expiry. If valid, req.user is populated with the decoded payload.
6.	When the access token expires, the client sends the refresh token to POST /api/auth/refresh. The server verifies it, issues a new access token, and rotates the refresh token (old one invalidated). This keeps sessions alive without re-entering credentials.
7.	All three modules use the same JWT_SECRET, so a token issued by Module 1's login endpoint is accepted by Module 2's and Module 3's middleware without any additional exchange.
Service-to-Service Authentication
•	Machine-to-machine calls (e.g., Module 1 calling Module 2's internal compliance endpoint) use a SERVICE_KEY header, not a JWT. This is a long random secret shared between modules via environment variables.
•	Internal endpoints check: if (req.headers['x-service-key'] !== process.env.SERVICE_KEY) return 403. These endpoints are never reachable from the browser.
 
 
MODULE 3
Analytics, Reporting & AI/ML Monitoring System
Aswin Chettri  ·  202422006

4.1 Work to be Done — Module 3

Module 3 integrates three AI/ML methods: (1) Isolation Forest for anomaly detection, (2) Prophet for predictive delay forecasting, and (3) Random Forest for AI/ML-driven risk scoring. All AI/ML work is implemented in Python using scikit-learn, Prophet, Pandas, and NumPy, served via a FastAPI microservice. The Node.js/Express.js backend orchestrates calls to this service.

CLIENT-SIDE TASKS

Executive Dashboard
•	Build real-time executive dashboard in React.js with TailwindCSS: 10 KPI summary cards at the top (Total Decisions, Approval Rate %, Rejection Rate %, Average Approval Time hours, Bottleneck Rate %, Compliance Rate %, Violation Count, Decision Throughput, Anomaly Count, AI Risk Score)
•	Live data refresh: poll GET /api/analytics/kpi-summary every 30 seconds; animate card value transitions with CSS transitions; show 'Live' pulse indicator while data is fresh
•	Page-level date range picker and department filter dropdown that simultaneously update all charts and KPI cards by passing updated query params to all data-fetch calls
•	Anomaly alert banner: surfaced from Isolation Forest results stored in m3_anomalies; each unacknowledged anomaly renders as a dismissible card showing: severity colour badge, description text, link to the anomalous decision (if decisionId is set); clicking Acknowledge calls PUT /api/ai/anomalies/:id/acknowledge
Analytics Visualisation Components (Recharts + Apache ECharts)
•	Decision Volume Chart: Recharts LineChart/BarChart with toggle — line for trend, bar for raw counts; X-axis: dates; Y-axis: count; granularity toggle buttons (Daily / Weekly / Monthly)
•	Approval Cycle Time Histogram: Recharts BarChart where each bar is a time bucket (0-24h, 24-48h, 48-72h, >72h) showing frequency distribution
•	Compliance Rate Trend: Apache ECharts multi-line chart — one line per selected department; X-axis: date; Y-axis: 0–100%; includes a reference line at the configured compliance target
•	AI/ML Risk Heatmap: Apache ECharts heatmap widget — departments on Y-axis, risk categories on X-axis, cell colour gradient from green (Low) to red (Critical); click a cell to drill into that department's risk detail
•	Prophet Forecast Chart: Apache ECharts line chart showing actual historical throughput, forecast yhat line, and shaded confidence band (yhat_lower to yhat_upper); horizon toggle buttons (7 / 14 / 30 days)
•	Department Performance Radar: Apache ECharts radar chart comparing up to 5 selected departments across 5 axes: cycle time, decision volume, compliance rate, risk score, violation count
Report Builder UI
•	Report parameter form: report type select (Executive / Compliance / Decision / Department / Custom), date-from and date-to inputs, department multi-select, widget checkboxes (KPI Table / Compliance Chart / Anomaly List / Risk Scores / Decision Volume), format radio buttons (PDF / Excel / CSV)
•	Generate button calls POST /api/reports/generate; shows a loading spinner during generation; on success, shows a Download Now button linking to GET /api/reports/download/:id
•	Scheduled Reports manager: table listing all active schedules with name, frequency, next run time, last run status badge, Edit and Delete buttons; Add Schedule modal form with frequency select, report type, format, and recipients email list (comma-separated input)
•	Report History table: all past m3_reports records sorted by date descending; columns: date, report name, type, format badge, status badge (Completed/Failed), Download button; filter by type and date range

SERVER-SIDE TASKS — Node.js / Express.js

Webhook Receiver & Cache Invalidation
•	POST /api/events/decision-update (SERVICE_KEY auth): receives { decisionId, newStatus, department, timestamp } from Module 1 on every decision state change; deletes relevant Redis keys (m3:kpi:{deptId}:{today} and m3:kpi:org:{today}); triggers synchronous KPI re-aggregation for the affected department
•	POST /api/events/compliance-update (SERVICE_KEY auth): receives { violationId, department, severity } from Module 2 when a violation is created or resolved; invalidates compliance-related Redis keys
KPI Aggregation Engine
•	Queries m1_decisions directly on the shared MongoDB cluster (same connection string, separate Mongoose model defined in Module 3): computes totalDecisions, approvedCount, rejectedCount, pendingCount, avgCycleTimeHours (average of completedAt - createdAt in hours for all completed decisions in the date range)
•	Queries m2_violations directly: counts violations per department grouped by severity for the date range; computes complianceRate = (decisionsWithoutViolation / totalDecisions) × 100
•	Writes the aggregated values into an m3_kpi_snapshots document for the current date and department; upserts (if a snapshot for this date+department already exists, it updates rather than creating a duplicate)
•	Serves KPI data from Redis cache when available (5-minute TTL); falls back to MongoDB aggregation on cache miss; sets the cache key after aggregation
AI/ML Orchestration Cron Jobs (node-cron)
•	Every 24 hours (daily, 00:00) — Anomaly Detection Job: reads the last 30 days of m1_decisions (selecting feature fields only: cycleTimeHours, rejectionCount, revisionCount, daysOverSLA, stageCount, hourOfDaySubmitted), formats into a JSON array, POSTs to Python FastAPI POST /ml/anomaly/predict; writes results to m3_anomalies (only for decisions where isAnomaly = true)
•	Every 24 hours (daily, 01:30) — Risk Scoring Job: for each active department, calls GET /api/risks/score/:deptId on Module 2 to fetch current risk features, combines with local m2_violations counts (direct MongoDB query), POSTs to Python FastAPI POST /ml/risk/score; updates m3_kpi_snapshots.riskScore and riskLevel for each department
•	Every 24 hours (daily, 02:00) — Forecasting Job: for each department, reads the last 90 days of m3_kpi_snapshots (selecting snapshotDate and totalDecisions for the time-series), POSTs to Python FastAPI POST /ml/forecast/predict with each horizon (7, 14, and 30 days — three separate calls); writes forecast arrays to m3_forecasts
•	Weekly (Sunday 3:00 AM) — Model Retraining Job: POSTs to Python FastAPI POST /ml/models/train with the last 12 months of data; logs the retrain event to Module 2's audit endpoint
Report Generation Service
•	jsPDF: generate PDF reports with a cover page (title, date range, generated by), KPI summary table, compliance chart exported as base64 PNG (captured from a server-side chart renderer or pre-rendered image), violation breakdown table, and page footers
•	ExcelJS: generate multi-sheet Excel workbooks — Sheet 1: Summary with styled headers and KPI values; Sheet 2: Decision detail table; Sheet 3: Compliance breakdown; all columns auto-fitted; header rows frozen for scrolling
•	json2csv: convert MongoDB query result arrays to CSV with configurable field mapping and header row
•	node-cron: for each active m3_report_schedules entry where isActive = true, runs the report generation function at the configured cronExpression; saves the file; sends email via Nodemailer to all recipients with a download link; updates lastRun and nextRun on the schedule document

PYTHON FastAPI — AI/ML SERVICE (scikit-learn, Prophet, Pandas, NumPy)

AI/ML Method 1 — Anomaly Detection: Isolation Forest (scikit-learn)
•	Isolation Forest works by randomly partitioning the feature space into trees. Anomalous data points (e.g., decisions with unusually long approval times or many rejections) are isolated in fewer partitions — they have shorter average path lengths through the trees. The anomaly score is the normalised inverse of the average path length: higher score = more anomalous.
•	Training features assembled by Pandas from m1_decisions: approvalCycleTimeHours, rejectionCount, revisionCount, daysOverSLA, stageCount, hourOfDaySubmitted — these are the measurable characteristics of each decision
•	NumPy used for: constructing the feature matrix (np.array), computing Z-score normalisation (zero-mean, unit-variance) before fitting, and handling NaN imputation (np.nanmean fill for missing cycle times)
•	Model training: IsolationForest(n_estimators=100, contamination=0.05, random_state=42) — contamination=0.05 means 5% of training data is expected to be anomalous; n_estimators=100 means 100 isolation trees in the ensemble
•	Severity mapping from anomaly score: 0.7–0.8 = Low, 0.8–0.9 = Medium, 0.9–0.95 = High, >0.95 = Critical
•	Model saved to disk with joblib.dump('./models/isolation_forest.pkl'); loaded at FastAPI startup with joblib.load() so it is immediately ready without re-training
•	FastAPI endpoint POST /ml/anomaly/predict: accepts { decisions: [{id, cycleTimeHours, rejectionCount, revisionCount, daysOverSLA, stageCount}] }; returns { results: [{id, anomalyScore, isAnomaly, severity}] }
AI/ML Method 2 — Predictive Delay Forecasting: Prophet
•	Prophet is a time-series forecasting library developed by Meta. It decomposes the series into trend (piecewise linear or logistic), weekly seasonality, yearly seasonality, and user-defined holiday effects using an additive model: y(t) = trend(t) + seasonality(t) + holidays(t) + error. It is robust to missing dates and handles sudden trend changes (changepoints) automatically.
•	Input data assembled by Pandas from m3_kpi_snapshots: a DataFrame with column ds (date, Python datetime) and y (totalDecisions completed that day) per department; covers the last 90 days
•	NumPy used for: constructing the future dates DataFrame (np.arange for date offsets) and computing confidence interval arrays
•	Model configuration: Prophet(yearly_seasonality=True, weekly_seasonality=True, changepoint_prior_scale=0.05); changepoint_prior_scale=0.05 is a regularisation parameter that prevents overfitting to short-term fluctuations
•	model.fit(df) trains the model on the historical series; model.make_future_dataframe(periods=horizon) generates the future date range; model.predict(future_df) returns a DataFrame with ds, yhat, yhat_lower, yhat_upper
•	A high yhat (predicted future decision volume) relative to the department's historical average completion capacity signals an upcoming bottleneck — too many decisions expected, not enough processing capacity
•	FastAPI endpoint POST /ml/forecast/predict: accepts { timeSeries: [{ds, y}], horizon: 7|14|30 }; returns { forecast: [{ds, yhat, yhat_lower, yhat_upper}] }
AI/ML Method 3 — Risk Scoring: Random Forest Classifier (scikit-learn)
•	Random Forest builds an ensemble of decision trees, each trained on a random subset of the training data (bootstrap sampling) and a random subset of features at each split. The final prediction is the majority vote across all trees. This prevents overfitting that a single decision tree would exhibit on small governance datasets.
•	Training features assembled by Pandas per department: violationCount (last 30 days), openViolationRate (open/total violations), avgCompositeRiskScore (from m2_risks), overdueApprovalCount, complianceRate (last 30 days), policyBreachFrequency (violations per 100 decisions), escalationCount
•	Target label: risk classification — Low | Medium | High | Critical — historically assigned by compliance officers in m2_risks and mapped to numeric labels 0, 1, 2, 3
•	NumPy constructs the feature matrix (X) and label array (y); scikit-learn StandardScaler normalises all numerical features before training to prevent high-magnitude features from dominating splits
•	Model training: RandomForestClassifier(n_estimators=200, max_depth=10, class_weight='balanced', random_state=42) — class_weight='balanced' compensates for the rarity of Critical-level samples by increasing their weight in the loss function
•	Feature importance scores (model.feature_importances_) are returned alongside the prediction to explain which factors most contributed to the risk classification — displayed in the AI/ML Insights Panel as a bar chart
•	Model saved with joblib.dump('./models/random_forest.pkl'); FastAPI endpoint POST /ml/risk/score: accepts { features: [{dept, violationCount, openViolationRate, avgCompositeRisk, overdueCount, complianceRate, policyBreachFreq, escalationCount}] }; returns { scores: [{dept, score, level, featureImportance: {}}] }

4.2 Pages to be Created — Module 3

Module 3 has 10 pages built with React.js and TailwindCSS. All pages require JWT authentication and most require manager-level role or above.

Page / Screen	Purpose	UI Components	User Actions	Data Displayed
Executive Dashboard	Top-level real-time management overview of all governance KPIs	10 KPI summary cards row, Decision Volume Recharts chart (bar/line toggle), Compliance Trend Apache ECharts multi-line chart, Anomaly Alert banner with severity badges and Acknowledge buttons, AI/ML Risk Heatmap (Apache ECharts), Department filter dropdown, Date range picker	Select date range, filter by department, acknowledge anomaly alerts, click KPI card to navigate to related detail page, toggle chart granularity	Real-time KPI values: Total Decisions, Approval Rate %, Rejection Rate %, Average Approval Time hours, Bottleneck Rate %, Compliance Rate %, Violation Count, Decision Throughput, Anomaly Count, AI Risk Score
Decision Analytics	Deep analysis of decision volume, cycle times, and approval patterns	Decision Volume Recharts LineChart/BarChart with granularity toggle, Cycle Time Histogram (Recharts BarChart), Approval Rate by Decision Type (Recharts BarChart), Status Funnel (Apache ECharts), Rejection Reasons Pie (Recharts PieChart), Category filter, Export PNG per chart	Toggle chart type (bar/line), change time granularity (Daily/Weekly/Monthly), filter by category or department, export chart as PNG image	Volume over time, cycle time distribution buckets, approval and rejection rates by decision type, funnel drop-off at each lifecycle stage
Compliance Analytics	Detailed compliance metrics broken down per department and policy	Overall Compliance % KPI card, Multi-department compliance trend chart (Apache ECharts), Violation severity breakdown bar chart (Recharts), Department compliance heatmap (Apache ECharts), Top Violated Policies table, Department multi-select filter	Select departments to overlay on trend chart, filter by policy category, click heatmap cell to filter table, export chart as PNG	Compliance % per department over time, violation counts by severity, policy-level compliance adherence rates
AI/ML Insights Panel	Combined view of all three AI/ML model outputs: anomalies, forecasts, and risk scores	Anomaly Cards list (Isolation Forest results): severity badge, description, linked decision link, Acknowledge button; Prophet Forecast Chart (Apache ECharts) with confidence bands; Horizon toggle (7/14/30 days); Risk Score gauges per department (Random Forest); Model Confidence indicators; Last Retrained timestamp display	Acknowledge anomaly, click anomaly card to navigate to linked decision, toggle forecast horizon, select department for forecast, view risk score factor breakdown	Anomaly severity and auto-description, forecast predicted daily values with confidence bands, risk score 0–100 per department with contributing feature importance weights
Risk Score Dashboard	AI/ML-driven risk classification for all departments	Risk Score ranking table (department, composite score, level badge, top contributing factor), Risk Level distribution pie chart (Recharts), Score trend line chart (Apache ECharts) per department over time, Feature importance bar chart, Level filter (All/Low/Medium/High/Critical)	Filter by risk level, sort by score, click department for factor breakdown modal, export risk report	Composite risk score 0–100, risk level label (Low/Medium/High/Critical), top feature contributions, historical score trend
Department Performance	Side-by-side comparison of departments across all governance metrics	Department multi-select (up to 5), Comparison bar charts per metric (Recharts), Radar chart (Apache ECharts) for multi-metric overview, Ranking table with rank-change delta arrows, Metric selector (Cycle Time / Compliance / Volume / Risk Score / Violation Count)	Add or remove departments from comparison view, change metric, toggle between bar chart and radar view, export comparison as PDF	Per-department values for: avg cycle time (hours), total decision count, compliance %, AI/ML risk score, violation count
Report Builder	User-configurable report creation and generation tool	Report Type select, Date range inputs, Department multi-select, Widget checkboxes (KPI Table / Compliance Chart / Anomaly List / Risk Scores / Decision Volume), Format radio (PDF / Excel / CSV), Generate button with loading spinner, Download Now button, Save as Template button, Schedule This Report button	Configure all parameters, select widgets to include, choose format, generate and download, save configuration as a template, schedule for automated delivery	Live preview of parameter selections with estimated output scope (row counts, date range, department count)
Scheduled Reports	Manage automated report delivery schedules using node-cron	Active schedules table (name, type, frequency, next run time, last run status badge, recipients count, Edit/Delete buttons), Add Schedule modal (frequency select, report type, format, recipients email list, parameters), Manual Run Now button, Run History expandable per row	Create schedule, edit existing schedule, delete schedule, trigger manual immediate run, expand row to view run history with status and timestamps	Schedule name, frequency, next scheduled run, last run status (Success/Failed/Pending), recipient list, report format
Report History	Archive of all previously generated reports with re-download access	Reports table sorted by date descending (date, report name, type, format badge, status badge, generated-by user, file size, Download button), Filter by type/date/format, Search by name input	Filter and search reports, click Download to get the file in original format, re-run report with same parameters	Report name, type, format, generation date, generated-by user name, file size, download link, generation status
KPI Config (Admin)	Admin configuration of KPI target thresholds and alert triggers	KPI list table (KPI name, current live value, target value input, warning threshold % input, critical threshold % input), Save All Changes button, Reset to Defaults button	Edit target values per KPI, set warning and critical alert thresholds, save configuration which affects dashboard colour coding and alert triggers	All configurable KPI names with current live values and configured targets and thresholds

4.3 Database Design — Module 3

Module 3 uses MongoDB (Mongoose) for persistence and Redis for caching. It reads m1_decisions and m2_violations directly from the shared MongoDB cluster for bulk analytical queries. It owns five collections.

Collection: m3_kpi_snapshots
Field	Type	Constraints	Description
PK _id	ObjectId	Auto	
snapshotDate	Date	Required, Indexed	Date of this daily snapshot; compound index with department for upsert
FK department	ObjectId	Ref: departments, Indexed	null = org-wide aggregate snapshot
totalDecisions	Number		Total decisions created on this date for this department
approvedCount	Number		
rejectedCount	Number		
pendingCount	Number		
avgCycleTimeHours	Number		Average (completedAt - createdAt) hours for completed decisions on this date
complianceRate	Number		Percentage 0–100; computed from m2_violations count vs decision count
violationCount	Number		Total violations recorded on this date for this department
anomalyCount	Number		Count of Isolation Forest anomalies detected on this date
riskScore	Number		Random Forest output: 0–100 composite risk score for this department
riskLevel	String		low | medium | high | critical (from Random Forest classification)
createdAt	Date	Auto	

Collection: m3_anomalies  [Populated by Isolation Forest predictions]
Field	Type	Constraints	Description
PK _id	ObjectId	Auto	
FK decisionId	ObjectId	Ref: m1_decisions, Nullable, Indexed	Cross-module: linked decision if anomaly is decision-specific; null for department-level anomalies
FK department	ObjectId	Ref: departments, Indexed	
anomalyScore	Number	0.0–1.0	Raw Isolation Forest output; higher value = more anomalous path length
severity	String	Indexed	low | medium | high | critical (threshold-mapped)
description	String		Auto-generated text describing the detected pattern (e.g. 'Approval cycle time 3.2x above department average')
isAcknowledged	Boolean	Default: false, Indexed	Set true when a manager clicks Acknowledge on the dashboard
FK acknowledgedBy	ObjectId	Ref: users, Nullable	
detectedAt	Date	Auto, Indexed	

Collection: m3_forecasts  [Populated by Prophet predictions]
Field	Type	Constraints	Description
PK _id	ObjectId	Auto	
FK department	ObjectId	Ref: departments, Indexed	null = org-wide forecast
forecastDate	Date	Indexed	Date when this forecast was generated; overwritten each nightly run
horizon	Number	7 | 14 | 30	Forecast horizon in days
forecastData	Array		[{ ds: Date, yhat: Number, yhat_lower: Number, yhat_upper: Number }] — one entry per forecasted day
modelVersion	String		Prophet model version string (e.g. 'v2.1-2025-03') for audit trail
createdAt	Date	Auto	

Collection: m3_reports
Field	Type	Constraints	Description
PK _id	ObjectId	Auto	
name	String	Required	Report display name
type	String	Required	executive | compliance | decision | department | custom
format	String	Required	pdf | excel | csv
params	Object		{ from: Date, to: Date, departments: [ObjectId], widgets: [String] }
storagePath	String		Filesystem path or GridFS ID for the generated file
FK generatedBy	ObjectId	Ref: users	User who triggered generation; null if auto-generated by schedule
FK scheduleId	ObjectId	Ref: m3_report_schedules, Nullable	Set if generated automatically by a schedule
status	String		pending | generating | completed | failed
createdAt	Date	Auto	

Collection: m3_report_schedules
Field	Type	Constraints	Description
PK _id	ObjectId	Auto	
name	String	Required	Schedule display label
frequency	String	Required	daily | weekly | monthly
cronExpression	String		Derived node-cron expression (e.g. '0 8 * * 1' = Monday 8am)
reportType	String	Required	Same options as m3_reports.type
format	String	Required	pdf | excel | csv
params	Object		Same structure as m3_reports.params
recipients	Array		[String] email addresses for automated delivery via Nodemailer
isActive	Boolean	Default: true	
lastRun	Date	Nullable	Last successful execution timestamp
nextRun	Date		Computed from cronExpression and current time
FK createdBy	ObjectId	Ref: users	
createdAt	Date	Auto	

Module 3 Cross-Module Relationships
•	m3_anomalies.decisionId is a cross-module FK to m1_decisions._id — enables direct navigation from the AI/ML Insights Panel to the anomalous decision in Module 1
•	m3_kpi_snapshots.department and m3_anomalies.department both reference departments._id (shared collection) — the same FK used in m1_decisions.department and m2_violations.department enabling consistent three-module grouping
•	Module 3 reads m1_decisions directly from MongoDB (Mongoose model for m1_decisions defined within Module 3's codebase) for bulk KPI aggregation — avoids the overhead of paginated REST calls for large datasets
•	Module 3 reads m2_violations directly from MongoDB (same reason) for compliance rate computation and violation counts
•	Module 3 calls GET /api/risks/score/:deptId on Module 2 (via SERVICE_KEY REST call) for structured risk features; this is preferred over direct m2_risks reads to respect Module 2's business logic (composite score computation and level mapping)
•	Redis keys used: m3:kpi:{deptId}:{date} (5min TTL), m3:anomalies:active (5min TTL), m3:forecast:{deptId}:{horizon} (60min TTL), m3:riskscore:{deptId} (30min TTL)

4.4 REST API — Module 3

Analytics & KPI Endpoints
Method	Endpoint	Description	Request Body	Response | Auth
GET	/api/analytics/kpi-summary	Real-time KPI summary (Redis-cached)	Query: dept, from, to	200 { kpis: { totalDecisions, approvalRate, avgCycleTime, violationCount, riskLevel, anomalyCount } } | JWT + manager
GET	/api/analytics/decisions/volume	Decision volume time-series	Query: granularity, from, to, dept	200 { series: [{date, count}] } | JWT
GET	/api/analytics/decisions/cycle-time	Cycle time histogram distribution	Query: decisionType, from, to	200 { histogram: [{bucket, count}] } | JWT
GET	/api/analytics/compliance/trend	Compliance rate per dept over time	Query: depts[], from, to	200 { lines: [{dept, data[{date,rate}]}] } | JWT + manager
GET	/api/analytics/departments/compare	Multi-dept metric comparison	Query: depts[], metric, period	200 { departments: [{name, metrics}] } | JWT + manager

AI/ML Insights Endpoints (Node.js proxies to FastAPI)
Method	Endpoint	Description	Request Body	Response | Auth
GET	/api/ai/anomalies	Current unacknowledged Isolation Forest results	Query: severity, from, to	200 { anomalies: [{id, score, severity, description, decisionId}] } | JWT + manager
PUT	/api/ai/anomalies/:id/acknowledge	Acknowledge an anomaly alert	{}	200 { anomaly } | JWT + manager
GET	/api/ai/forecast	Prophet forecast for N days	Query: horizon (7/14/30), dept	200 { forecasts: [{date, yhat, yhat_lower, yhat_upper}] } | JWT + manager
GET	/api/ai/risk-scores	Random Forest scores all departments	Query: period	200 { scores: [{dept, score, level, featureImportance}] } | JWT + manager
POST	/api/ai/retrain	Trigger immediate model retraining	{}	202 { jobId } | JWT + admin

FastAPI Internal Endpoints (SERVICE_KEY Auth)
Method	Endpoint	Description	Request Body	Response | Auth
POST	/ml/anomaly/predict	Isolation Forest: anomaly scores	{ decisions: [{id, cycleTimeHours, rejectionCount, revisionCount, daysOverSLA, stageCount}] }	200 { results: [{id, anomalyScore, isAnomaly, severity}] } | SERVICE_KEY
POST	/ml/forecast/predict	Prophet: delay forecast	{ timeSeries: [{ds, y}], horizon: 7|14|30 }	200 { forecast: [{ds, yhat, yhat_lower, yhat_upper}] } | SERVICE_KEY
POST	/ml/risk/score	Random Forest: risk classification	{ features: [{dept, violationCount, openViolationRate, avgCompositeRisk, overdueCount, complianceRate, policyBreachFreq, escalationCount}] }	200 { scores: [{dept, score, level, featureImportance}] } | SERVICE_KEY
POST	/ml/models/train	Retrain Isolation Forest + Prophet + Random Forest	{ dataFrom, dataTo }	200 { status, modelsUpdated[] } | SERVICE_KEY

Report & Webhook Endpoints
Method	Endpoint	Description	Request Body	Response | Auth
POST	/api/reports/generate	Generate report; return download URL	{ type, format, params: {from,to,depts[],widgets[]} }	200 { reportId, downloadUrl } | JWT + manager
GET	/api/reports/history	Report generation history	Query: type, page, limit	200 { reports[] } | JWT
GET	/api/reports/download/:id	Download generated report file	Param: id	200 Binary File | JWT
POST	/api/reports/schedules	Create automated report schedule	{ name, frequency, reportType, format, recipients[], params }	201 { schedule } | JWT + manager
GET	/api/reports/schedules	List active report schedules	{}	200 { schedules[] } | JWT + manager
DELETE	/api/reports/schedules/:id	Delete a schedule	Param: id	200 { message } | JWT + manager
POST	/api/events/decision-update	M1 webhook: decision state changed	{ decisionId, newStatus, department, timestamp }	200 { received } | SERVICE_KEY
POST	/api/events/compliance-update	M2 webhook: violation event	{ violationId, department, severity }	200 { received } | SERVICE_KEY
 
5. User Roles & Permissions

GovVision uses Role-Based Access Control (RBAC). The role field in the users collection is decoded from the JWT on every API request. The requireRole() middleware enforces access at the server level. The frontend conditionally renders menus and action buttons based on the decoded role.

Role	Module 1 Access	Module 2 Access	Module 3 Access	CRUD Rights	Key Restrictions
Admin	Full access: manage users, workflow configs, view and manage all decisions, configure approval chains	Full access: publish/archive policies, full audit log access, manage all risks	Full access: all analytics, KPI config, trigger AI/ML model retraining	Create/Read/Update/Delete on ALL collections in ALL modules	None — super user
Manager	View all decisions across all departments; cannot create decisions; approve/escalate as assigned	View compliance dashboard, violation registry, risk register; cannot create or modify policies	View all KPIs, AI/ML insights, request and download any report	Read all; Update (approve/escalate decisions, resolve violations); no Delete	Cannot publish policies; cannot create new decisions
Decision Maker	Create, edit, and submit own decisions; view own decision list and detail; manage own file attachments; add comments	View published policies applicable to their category and department	View own decision analytics: cycle time for own decisions only	Create/Update own decisions; no Delete on decisions; Read all policies	Cannot approve own decisions; no access to other departments' decisions
Reviewer / Approver	View only decisions assigned to them in the approval chain; approve, reject, or request revision; add remarks and comments	View policy summaries linked to decisions assigned to them	View analytics for decisions in their approval queue only	Update (approval actions) on assigned decisions only; Read assigned decisions	Cannot create decisions; cannot modify unassigned decisions
Compliance Officer	Read-only access to all decisions across all departments for compliance audit purposes	Full compliance module access: create/read/update violations, read all policies, full audit log viewer, read risk register	View compliance analytics and generate compliance-specific reports	Read all decisions; Create/Update/Resolve violations; Read audit logs; no Delete anywhere	Cannot approve decisions; cannot create or modify policies
Analyst	Read-only access to all decisions (no write operations)	Read published policies; read audit logs (no export without admin approval)	Full analytics module access: view all dashboards, build and schedule reports, view AI/ML insights	Read-only on all decisions and policies; Create/Update/Delete own report schedules	No approval actions; no policy write actions
Employee / Viewer	View decisions belonging to their own department only (read-only); view own submitted decisions status	View published policies assigned to their department only	View high-level summary dashboard only — no drill-down, no raw data	Read-only, own department scope only; no write operations anywhere	Most restricted role; no action buttons rendered; no access to analytics detail pages
 
6. Complete Interconnected Database Map

The following diagram shows every MongoDB collection in the GovVision platform, which module owns it, and how collections are connected across modules. PK = Primary Key. FK = Foreign Key cross-collection reference. Arrows show the direction of the reference (collection that holds the FK → collection whose PK is referenced).

══════════════════════════════════════════════════════════════════════════════════
                    GOVVISION — COMPLETE DATABASE COLLECTION MAP
══════════════════════════════════════════════════════════════════════════════════

 SHARED COLLECTIONS (read/write by multiple modules)
 ─────────────────────────────────────────────────────
 ┌──────────────────────────────┐   ┌─────────────────────────────┐
 │  users                       │   │  departments                │
 │  PK _id                      │   │  PK _id                     │
 │  name, email                 │◄──│  FK head (→users)           │
 │  passwordHash (bcrypt)       │   │  name, isActive             │
 │  role, department            │   └──────────────┬──────────────┘
 │  isActive, notifPrefs        │                  │
 └───────────────┬──────────────┘                  │
                 │ referenced as FK by ALL below    │ referenced as FK by ALL below

 MODULE 1 COLLECTIONS
 ─────────────────────────────────────────────────────────────────────────────
 ┌────────────────────────────────────────────────────────────────────────┐
 │  m1_decisions                                                          │
 │  PK _id ◄──────────────────────────────────────────────────────────┐  │
 │  FK createdBy       → users._id                                    │  │
 │  FK department      → departments._id                              │  │
 │  approvalChain[ FK approver → users._id ]                          │  │
 │  FK ref from: m2_violations.decisionId (MODULE 2)                  │  │
 │  FK ref from: m3_anomalies.decisionId  (MODULE 3)                  │  │
 │  title, body, category, priority, status, slaDeadline, currentStage│  │
 └──────────────────────────────────────────────────────────────────────┘  │
                  │                                                         │
    ┌─────────────┼──────────────────────────────────────────┐             │
    ▼             ▼                                           ▼             │
 ┌──────────────────┐  ┌────────────────────────┐  ┌──────────────────────┐│
 │ m1_comments      │  │ m1_notifications       │  │ m1_file_versions     ││
 │ PK _id           │  │ PK _id                 │  │ PK _id               ││
 │ FK decisionId ───┘  │ FK userId → users      │  │ FK decisionId ───────┘│
 │ FK author → users   │ FK decisionId          │  │ FK uploadedBy → users │
 │ FK parentId (self)  │ type, message, isRead  │  │ fileName, version     │
 │ text, mentions[]    │ createdAt              │  │ storagePath           │
 └──────────────────┘  └────────────────────────┘  └──────────────────────┘

 ┌────────────────────────────────────┐
 │ m1_workflow_configs                │
 │ PK _id                             │
 │ category (matched on submission)   │
 │ approvalChainDef[], slaDays        │
 └────────────────────────────────────┘

 MODULE 2 COLLECTIONS
 ─────────────────────────────────────────────────────────────────────────────
 ┌────────────────────────────────────┐  ┌──────────────────────────────────┐
 │ m2_policies                        │  │ m2_policy_versions               │
 │ PK _id ◄────────────────────────┐  │  │ PK _id                           │
 │ FK createdBy → users            │  │  │ FK policyId → m2_policies._id ───┘
 │ assignedDepts[] → departments   │  │  │ FK changedBy → users             │
 │ category, status, weight        │  │  │ versionNumber, content, note     │
 │ effectiveDate, expiryDate       │  │  └──────────────────────────────────┘
 └──────────────────┬─────────────┘
                    │ referenced by
                    ▼
 ┌──────────────────────────────────────────────────────────────────────────┐
 │ m2_violations                  ◄── CROSS-MODULE INPUT from Module 1      │
 │ PK _id                                                                   │
 │ FK policyId        → m2_policies._id                                     │
 │ FK decisionId      → m1_decisions._id   (MODULE 1 cross-ref)             │
 │ FK department      → departments._id                                     │
 │ FK assignedOwner   → users._id                                           │
 │ FK resolvedBy      → users._id                                           │
 │ severity, status, description, detectedAt                                │
 │ FK ref from: m3_kpi_snapshots (count read by MODULE 3)                   │
 └──────────────────────────────────────────────────────────────────────────┘

 ┌──────────────────────────────────────────────────────────────────────────┐
 │ m2_audit_logs              ◄── WRITTEN BY ALL THREE MODULES via REST API │
 │ PK _id                                                                   │
 │ FK userId     → users._id                                                │
 │ FK entityId   → any entity in any module                                 │
 │ action, module, entityType, before, after, ipAddress                     │
 │ hash (SHA-256 tamper-evidence token)                                     │
 └──────────────────────────────────────────────────────────────────────────┘

 ┌─────────────────────────────────────────────┐
 │ m2_risks                                    │
 │ PK _id                                      │
 │ FK department → departments._id             │
 │ FK owner      → users._id                   │
 │ likelihood(1-5), impact(1-5)                │
 │ compositeScore = likelihood × impact        │
 │ → READ by MODULE 3 as AI/ML feature input   │
 └─────────────────────────────────────────────┘

 MODULE 3 COLLECTIONS
 ─────────────────────────────────────────────────────────────────────────────
 ┌──────────────────────────────────────────────────────────────────────────┐
 │ m3_kpi_snapshots           ◄── AGGREGATED from m1_decisions + m2_violations│
 │ PK _id                                                                   │
 │ FK department  → departments._id                                         │
 │ snapshotDate, totalDecisions, approvedCount, rejectedCount, pendingCount  │
 │ avgCycleTimeHours, complianceRate, violationCount                        │
 │ anomalyCount, riskScore, riskLevel  ← from AI/ML predictions             │
 └──────────────────────────────────────────────────────────────────────────┘

 ┌──────────────────────────────────────────────────────────────────────────┐
 │ m3_anomalies               ◄── POPULATED by Isolation Forest (FastAPI)   │
 │ PK _id                                                                   │
 │ FK decisionId  → m1_decisions._id  (MODULE 1 cross-ref)                  │
 │ FK department  → departments._id                                         │
 │ FK acknowledgedBy → users._id                                            │
 │ anomalyScore, severity, description, isAcknowledged, detectedAt          │
 └──────────────────────────────────────────────────────────────────────────┘

 ┌───────────────────────────────────────┐   ┌─────────────────────────────────┐
 │ m3_forecasts                          │   │ m3_reports                      │
 │ PK _id                                │   │ PK _id                          │
 │ FK department → departments._id       │   │ FK generatedBy → users._id      │
 │ forecastDate, horizon                 │   │ FK scheduleId → m3_schedules    │
 │ forecastData[{ds,yhat,lower,upper}]   │   │ type, format, params, status    │
 │ ◄── Prophet model output              │   │ storagePath                     │
 └───────────────────────────────────────┘   └─────────────────────────────────┘

 ┌──────────────────────────────────────┐
 │ m3_report_schedules                  │
 │ PK _id                               │
 │ FK createdBy → users._id             │
 │ frequency, cronExpression            │
 │ recipients[], params, isActive       │
 │ lastRun, nextRun                     │
 └──────────────────────────────────────┘

 REDIS CACHE (Module 3 only — key-value, no FK relationships)
 ─────────────────────────────────────────────────────────────
 m3:kpi:{deptId}:{date}         TTL 5 min   — KPI snapshot for dashboard
 m3:anomalies:active             TTL 5 min   — Unacknowledged anomaly list
 m3:forecast:{deptId}:{horizon}  TTL 60 min  — Latest Prophet forecast
 m3:riskscore:{deptId}           TTL 30 min  — Latest Random Forest score

══════════════════════════════════════════════════════════════════════════════════
CROSS-MODULE FK REFERENCES SUMMARY:
  m2_violations.decisionId ──── → m1_decisions._id       (M2 references M1)
  m3_anomalies.decisionId  ──── → m1_decisions._id       (M3 references M1)
  m3_kpi_snapshots aggregates from m1_decisions + m2_violations (direct DB reads)
  m2_audit_logs receives writes from M1, M2, M3 (via POST /api/internal/audit/log)
  All modules reference users._id and departments._id from shared collections
══════════════════════════════════════════════════════════════════════════════════
 
7. Real-Time Data Flow Summary

This section summarises how data moves through the platform in real time — what triggers each data movement, which path it takes, and what the end result is for the user.

7.1 Decision State Change Flow (Triggered every time an approval action is taken)

TRIGGER: Reviewer submits an approval, rejection, or revision request

STEP 1 — Module 1 validates the action (correct role, correct stage) and updates m1_decisions.status and currentStage in MongoDB
STEP 2 — Module 1 calls POST /api/internal/audit/log on Module 2 (SERVICE_KEY) → Module 2 writes immutable audit entry with SHA-256 hash to m2_audit_logs
STEP 3 — Module 1 calls POST /api/events/decision-update on Module 3 (SERVICE_KEY) → Module 3 receives the webhook
STEP 4 — Module 3 deletes the stale Redis cache key m3:kpi:{deptId}:{today}
STEP 5 — Module 3 re-aggregates KPIs from m1_decisions and m2_violations (direct MongoDB queries) and writes updated m3_kpi_snapshots
STEP 6 — Module 3 sets fresh Redis cache key m3:kpi:{deptId}:{today} with 5-minute TTL
STEP 7 — Webhook also triggers real-time anomaly evaluation
STEP 8 — Next 30-second poll from the Executive Dashboard receives updated KPI data from Redis cache

LATENCY: Dashboard reflects the state change within ~30 seconds of the approval action

7.2 Compliance Violation Detection Flow (Triggered on every decision submission)

TRIGGER: Decision Maker clicks 'Submit' on a decision proposal

STEP 1 — Module 1 calls POST /api/internal/compliance/validate on Module 2 (SERVICE_KEY) synchronously
STEP 2 — Module 2 queries all m2_policies where status='published' AND assignedDepts includes the decision's department AND category matches
STEP 3 — Module 2 evaluates each policy's rules against the decision metadata
STEP 4 — If violations detected: Module 2 writes m2_violations records (policyId + decisionId cross-module FK)
STEP 5 — Module 2 returns { valid: Boolean, violations: [] } to Module 1
STEP 6 — Module 1 surfaces any violation warnings on the Decision Detail View for the Decision Maker to see
STEP 7 — Module 1 fires the state-change webhook to Module 3 (see 7.1) so KPI compliance rate is recalculated

RESULT: Compliance violations are created with zero manual effort; they appear instantly in Module 2's Violation Registry

7.3 AI/ML Anomaly Detection Flow (Hybrid: Event-driven + Daily Reconciliation)

TRIGGER A: decision-update webhook from Module 1 (real-time, on every state change)
TRIGGER B: Daily reconciliation job fires at 01:00

STEP 1 — Module 3 queries m1_decisions from MongoDB for the last 30 days: selects feature fields (cycleTimeHours, rejectionCount, revisionCount, daysOverSLA, stageCount)
STEP 2 — Formats data as JSON array; sends POST /ml/anomaly/predict to Python FastAPI
STEP 3 — FastAPI loads Isolation Forest model from disk (joblib); normalises features with NumPy; runs predict(); returns anomaly scores
STEP 4 — Module 3 Node.js receives results; filters for isAnomaly=true; writes new m3_anomalies documents
STEP 5 — Invalidates Redis key m3:anomalies:active so next dashboard load gets fresh anomaly list
STEP 6 — Anomaly alert cards appear on the AI/ML Insights Panel for managers on their next page load

RESULT: Managers see anomaly alerts within at most 24 hours of an abnormal pattern appearing in decision data

7.4 Predictive Delay Forecast Flow (Every 24 Hours)

TRIGGER: node-cron job fires at 02:00 every day

STEP 1 — Module 3 queries m3_kpi_snapshots for the last 90 days: selects snapshotDate (ds) and totalDecisions (y) per department
STEP 2 — Sends POST /ml/forecast/predict to FastAPI with time-series data and horizon (7, 14, and 30 days — three separate calls)
STEP 3 — FastAPI Prophet model fits to the time-series; generates future dates DataFrame; calls model.predict(); returns forecast array
STEP 4 — Module 3 saves forecast results to m3_forecasts (upsert by department + forecastDate + horizon)
STEP 5 — Invalidates Redis key m3:forecast:{deptId}:{horizon}
STEP 6 — AI/ML Insights Panel shows updated forecast chart with confidence bands on next load

RESULT: Managers can see predicted decision bottlenecks 7, 14, or 30 days in advance and take preventive action

7.5 AI/ML Risk Scoring Flow (Daily)

TRIGGER: node-cron job fires at 01:30 every day

STEP 1 — Module 3 iterates all active departments
STEP 2 — For each department, calls GET /api/risks/score/:deptId on Module 2 (SERVICE_KEY) to get structured risk features (compositeScore, breakdown)
STEP 3 — Combines Module 2 risk data with local m2_violations counts (direct MongoDB query) to build the full feature vector
STEP 4 — Sends POST /ml/risk/score to FastAPI with feature vectors for all departments in one batch call
STEP 5 — FastAPI Random Forest model predicts risk level and score for each department; returns feature importance weights
STEP 6 — Module 3 updates m3_kpi_snapshots.riskScore and riskLevel for each department (today's snapshot)
STEP 7 — Invalidates Redis keys m3:riskscore:{deptId} for all departments
STEP 8 — Risk Score Dashboard and Executive Dashboard show updated risk classifications on next load

RESULT: AI/ML-computed risk scores replace manual risk assessment; updated once per day

7.6 Report Generation Flow (On-demand or scheduled)

TRIGGER A: Manager clicks Generate on the Report Builder page
TRIGGER B: node-cron fires a scheduled report job at the configured time

STEP 1 — Module 3 reads from its own m3_kpi_snapshots and m3_anomalies for the requested date range and departments
STEP 2 — Calls GET /api/compliance/status on Module 2 to fetch compliance scores and violation summaries for enrichment
STEP 3 — Calls GET /api/ai/risk-scores internally to get latest AI/ML risk scores
STEP 4 — Assembles all data; calls jsPDF (for PDF), ExcelJS (for Excel), or json2csv (for CSV) to generate the output file
STEP 5 — Saves file to server filesystem or GridFS; writes m3_reports document with storagePath and status='completed'
STEP 6 — Calls POST /api/internal/audit/log on Module 2: action REPORT_GENERATED
STEP 7 — If scheduled: sends email via Nodemailer to all recipients with a download link
STEP 8 — Returns { reportId, downloadUrl } to the client
 
8. Module Integration

8.1 Shared Database Strategy
•	All three Node.js services use the same MONGODB_URI environment variable and connect to the same MongoDB cluster
•	Collections are namespaced (m1_, m2_, m3_) to prevent name collisions between modules
•	Module 3 defines Mongoose models for m1_decisions and m2_violations within its own codebase to enable direct bulk analytical queries without HTTP overhead
•	All other cross-module data access goes through REST API calls to preserve each module's ownership of its business logic

8.2 Authentication Strategy
•	All three Node.js services share a single JWT_SECRET environment variable — a token issued by Module 1's login endpoint is valid on Module 2 and Module 3 without any token exchange
•	Service-to-service calls use a separate SERVICE_KEY environment variable in the Authorization header — this is a long random secret never exposed to the browser
•	The Python FastAPI service is only reachable from Module 3's server — it is not exposed on a public port and uses the SERVICE_KEY for all incoming requests

8.3 Inter-Module Communication Map

Caller	Called	Endpoint	Trigger & Purpose
Module 1	Module 2	/api/internal/compliance/validate	Every decision submission — synchronous policy breach check
Module 1	Module 2	/api/internal/audit/log	Every decision state change — write immutable audit record
Module 1	Module 3	/api/events/decision-update	Every state change — invalidate KPI cache + re-aggregate snapshot
Module 3	Module 2	/api/compliance/status	Report generation — enrich report with compliance breakdown
Module 3	Module 2	/api/risks/score/:deptId	Every 24h AI/ML job — fetch risk features for Random Forest
Module 3	Module 2	/api/internal/audit/log	Report generated + AI/ML model retrain — log the events
Module 3	FastAPI	/ml/anomaly/predict	Event-driven + Daily 01:00 — Isolation Forest batch anomaly scoring
Module 3	FastAPI	/ml/forecast/predict	Every 24 hours (02:00 daily) — Prophet delay forecast per department
Module 3	FastAPI	/ml/risk/score	Daily (01:30) — Random Forest risk classification per department
Module 3	FastAPI	/ml/models/train	Weekly (Sundays 03:00) or admin-triggered — retrain all three AI/ML models

8.4 Collection Ownership & Cross-Module Access

Collection	Owner	M1 Access	M2 Access	M3 Access
users	All (M1 creates)	Create, Read, Update	Read (role, dept)	Read (name, dept)
departments	All (M1 creates)	Create, Read	Read	Read (grouping)
m1_decisions	Module 1	Full CRUD	Read via REST (compliance)	Read direct (analytics)
m1_comments	Module 1	Full CRUD	No access	No access
m1_notifications	Module 1	Full CRUD	No access	No access
m1_file_versions	Module 1	Full CRUD	No access	No access
m1_workflow_configs	Module 1	Full CRUD	No access	No access
m2_policies	Module 2	Read published (REST)	Full CRUD	Read via REST
m2_policy_versions	Module 2	No access	Full CRUD	No access
m2_violations	Module 2	Write via REST (validation result)	Full CRUD	Read direct (analytics)
m2_audit_logs	Module 2	Write via REST API	Full CRUD	Write via REST API
m2_risks	Module 2	No access	Full CRUD	Read via REST API
m3_kpi_snapshots	Module 3	No access	No access	Full CRUD
m3_anomalies	Module 3	No access	No access	Full CRUD
m3_forecasts	Module 3	No access	No access	Full CRUD
m3_reports	Module 3	No access	No access	Full CRUD
m3_report_schedules	Module 3	No access	No access	Full CRUD
 
9. Complete Sequence Diagram

The following diagram shows every interaction across all modules, services, databases, and the AI/ML service from user login through to report generation. Numbers map to the Real-Time Data Flow steps in Section 7.

GOVVISION — COMPLETE SYSTEM SEQUENCE DIAGRAM
══════════════════════════════════════════════════════════════════════════════════

  User/Browser    M1-Frontend    M1-API        M2-API       M3-API      FastAPI(ML)
       │               │            │              │             │            │
       │──[1] POST /api/auth/login ─►│              │             │            │
       │               │  bcrypt.compare() verify passwordHash   │            │
       │               │  Sign JWT { userId, role, dept }        │            │
       │◄── 200 { accessToken (15min), refreshToken (7d) } ──────│            │
       │               │            │              │             │            │
       │──[2] POST /api/decisions ──►│              │             │            │
       │               │  Validate fields (express-validator)    │            │
       │               │  Create m1_decisions { status: draft }  │            │
       │◄── 201 { decision } ────────│              │             │            │
       │               │            │              │             │            │
       │──[3] POST /api/decisions/:id/submit ──────►│             │            │
       │               │  validateTransition(draft → submitted)  │            │
       │               │  Lookup m1_workflow_configs by category │            │
       │               │  Build approvalChain[], set currentStage=0           │
       │               │            │              │             │            │
       │               │  ──[4] POST /api/internal/compliance/validate ───────►(M2)
       │               │            │  Query published m2_policies for dept+category
       │               │            │  Evaluate rules; detect violations      │
       │               │            │  Write m2_violations (FK decisionId→M1) │
       │               │◄── { valid: false, violations: [...] } ─│            │
       │               │            │              │             │            │
       │               │  ──[5] POST /api/internal/audit/log ────►(M2)        │
       │               │            │  Compute SHA-256 hash                   │
       │               │            │  Write m2_audit_logs (IMMUTABLE)        │
       │               │◄── { logged: true } ────── │            │            │
       │               │            │              │             │            │
       │               │  ──[6] POST /api/events/decision-update ─────────── ►(M3)
       │               │            │              │  Delete Redis m3:kpi:{dept}:{today}
       │               │            │              │  Query m1_decisions + m2_violations
       │               │            │              │  Write updated m3_kpi_snapshots
       │               │            │              │  Set Redis cache (5min TTL)  │
       │◄── 200 { decision, violations[] } ──────── │             │            │
       │               │            │              │             │            │
 Reviewer──[7] GET /api/approvals/pending ──────── ►│             │            │
       │               │◄── 200 { approvals[] } ────│             │            │
       │               │            │              │             │            │
 Reviewer──[8] POST /api/decisions/:id/approve (remarks) ────────►│            │
       │               │  Validate reviewer role + stage assignment            │
       │               │  Advance currentStage; check if all stages complete   │
       │               │  If complete: status → 'approved', set completedAt   │
       │               │  Notify next approver OR notify creator if complete  │
       │               │            │              │             │            │
       │               │  ──[9] POST /api/internal/audit/log ────►(M2)        │
       │               │◄── { logged: true } ───────│             │            │
       │               │  ──[10] POST /api/events/decision-update ─────────── ►(M3)
       │               │            │              │  Cache invalidate + re-aggregate│
       │◄── 200 { decision } ────────│              │             │            │
       │               │            │              │             │            │
      ═══════════════════ BACKGROUND AI/ML JOBS (node-cron, every 24 hours) ═══════│
       │               │            │              │             │            │
       │               │            │              │  ─[11] POST /ml/anomaly/predict►
       │               │            │              │      Load IsolationForest model│
       │               │            │              │      Normalise features (NumPy)│
       │               │            │              │◄── { results: [{id,score,isAnomaly}] }
       │               │            │              │  Write m3_anomalies (FK→m1_decisions)
       │               │            │              │  Invalidate m3:anomalies:active│
       │               │            │              │             │            │
       │               │  ─[12] GET /api/risks/score/:deptId ───►(M2)         │
       │               │            │◄── { maxScore, breakdown[] } ─│          │
       │               │            │  Build feature vector (M2 risk + M3 violations)
       │               │            │              │  ─[13] POST /ml/risk/score ──►│
       │               │            │              │      Load RandomForest model   │
       │               │            │              │◄── { scores: [{dept,score,level,featureImportance}] }
       │               │            │              │  Update m3_kpi_snapshots.riskScore,riskLevel
       │               │            │              │  Invalidate m3:riskscore:{dept}│
       │               │            │              │             │            │
      ═══════════════════ FORECAST JOB (node-cron, every 24 hours at 02:00) ══════ │
       │               │            │              │             │            │
       │               │            │              │  ─[14] POST /ml/forecast/predict►
       │               │            │              │      Load Prophet model        │
       │               │            │              │      fit(timeSeries) + predict │
       │               │            │              │◄── { forecast: [{ds,yhat,lower,upper}] }
       │               │            │              │  Write m3_forecasts (upsert)   │
       │               │            │              │  Invalidate m3:forecast:{dept}:{h}
       │               │            │              │             │            │
  ═══════════════════ DASHBOARD POLL (every 30 seconds) ══════════════════════│
       │               │            │              │             │            │
 Manager──[15] GET /api/analytics/kpi-summary ────────────────►(M3)          │
       │               │            │              │  Check Redis m3:kpi:{dept}:{today}
       │               │            │              │  Cache HIT → return cached data│
       │◄── 200 { kpis: { approvalRate, avgCycleTime, riskLevel, anomalyCount... } } ──
       │               │            │              │             │            │
 Manager──[16] POST /api/reports/generate ────────────────────►(M3)          │
       │               │  ─[17] GET /api/compliance/status ─────►(M2)         │
       │               │            │◄── { overall%, deptBreakdown[] } ────── │
       │               │            │              │  jsPDF / ExcelJS assemble file │
       │               │            │              │  Write m3_reports (status=completed)
       │               │  ─[18] POST /api/internal/audit/log ───►(M2) REPORT_GENERATED
       │◄── 200 { reportId, downloadUrl } ─────────────────────  │            │

══════════════════════════════════════════════════════════════════════════════════
STEP INDEX:
 [1]       bcrypt verify + JWT issuance (login)
 [2-3]     Decision creation and submission (Module 1 lifecycle engine)
 [4]       Compliance validation hook (M1 → M2 synchronous call)
 [5,9,18]  Immutable audit log writes via REST (all modules → M2)
 [6,10]    KPI cache invalidation webhooks (M1 → M3)
 [7-8]     Approval workflow actions (Module 1)
 [11]      Isolation Forest anomaly detection (M3 → FastAPI)
 [12-13]   Random Forest risk scoring (M3 → M2 for features, M3 → FastAPI)
 [14]      Prophet delay forecasting (M3 → FastAPI)
 [15]      Live dashboard KPI data served from Redis cache (M3)
 [16-18]   Report generation with cross-module data enrichment (M3 + M2)
══════════════════════════════════════════════════════════════════════════════════
