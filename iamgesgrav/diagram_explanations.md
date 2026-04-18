# UML Diagrams — System Documentation

This document explains each UML diagram produced for the **Analytics, Reporting & AI/ML Monitoring System** — what it shows, who the participants are, and how to read it.

---

## 1. Use Case Diagram

### What It Shows
The Use Case Diagram answers the question: **"Who uses the system and what can they do?"**

It maps every type of user (called an **Actor**) to the features (called **Use Cases**) they are allowed to access. It also shows which external systems interact with the platform automatically.

### Actors

| Actor | Type | Role |
|---|---|---|
| **Admin** | Human | Has unrestricted access — can configure KPI thresholds, trigger model retraining, and view everything |
| **Analyst** | Human | Can view all dashboards, build reports, manage report schedules, and explore AI insights |
| **Compliance Officer** | Human | Focuses on compliance analytics and generating compliance-specific reports |
| **Decision Management System** | External System | Sends automatic notifications whenever a decision changes state |
| **Compliance Engine** | External System | Provides risk feature data for AI scoring on request |
| **Python ML Service** | External System | Runs the AI prediction models when called |

### Key Use Cases Explained

- **View Executive Dashboard** — A real-time summary page showing 10 KPI cards (approval rates, cycle times, risk scores, etc.) that refresh every 30 seconds.
- **View AI Anomaly Alerts** — Lists decisions flagged as unusual by the Isolation Forest model, colour-coded by severity (Low → Critical).
- **Acknowledge Anomaly Alert** — Marked with `<<extend>>` because it is an optional action that *extends* the View Anomaly use case. A user only does this after reviewing an alert.
- **Generate Report (PDF / Excel / CSV)** — Builds a formatted file from live data. Marked with `<<include>>` toward *Download Generated Report* because downloading always follows generation.
- **Receive Decision State Webhook** — The Decision Management System calls this automatically every time a decision is approved, rejected, or revised. It triggers a dashboard refresh.
- **Run ML Prediction Pipeline** — Triggered internally by the system's daily scheduled jobs, not by a human user.

---

## 2. Activity Diagram

### What It Shows
The Activity Diagram answers: **"What happens step by step when a user requests data, and how does the nightly AI pipeline work?"**

It is split into three horizontal **swimlanes** to show which part of the system performs each step:

| Swimlane | Responsibility |
|---|---|
| **User** | Interacts with the interface — opens the dashboard, applies filters, views results |
| **API Server** | Handles all business logic — checks cache, queries database, coordinates the AI jobs |
| **ML Service** | Runs the three AI/ML models — anomaly detection, delay forecasting, and risk classification |

### Flow 1 — Dashboard Data Request (Top Path)

1. User opens the dashboard and selects a department and date range.
2. The API Server checks the **Redis cache** first.
3. **If the cache has data (Cache Hit):** it returns immediately — no database query needed. This keeps the dashboard fast.
4. **If the cache is empty (Cache Miss):** the server queries the database directly — it reads all decisions and violation records, computes rates and averages, saves the result as a daily KPI snapshot, and then stores it in the cache for the next 5 minutes.
5. The computed KPI data is returned to the user's dashboard, which renders the charts and cards.

### Flow 2 — Nightly AI/ML Pipeline (Bottom Path)

This runs automatically every night via a scheduler — no user interaction is needed.

1. The API Server fetches the last 30 days of decision data from the database.
2. A **Fork Bar** (thick black horizontal bar) splits the execution into three parallel branches — all three AI models run simultaneously:
   - **Isolation Forest** — detects decisions with unusual behaviour patterns.
   - **Prophet** — forecasts expected decision volume for the next 7, 14, or 30 days.
   - **Random Forest** — classifies each department's current risk level.
3. A **Join Bar** waits for all three models to finish.
4. All results are saved to the database and the cache is cleared so the dashboard will show fresh AI data on the next user request.

---

## 3. Sequence Diagram

### What It Shows
The Sequence Diagram answers: **"In what order do the system components communicate with each other, and what messages do they exchange?"**

Time flows **top to bottom**. Each vertical dashed line (called a **Lifeline**) represents a component that participates in the interaction. Horizontal arrows are the **messages** sent between them.

### Lifelines (Left to Right)

| # | Lifeline | What It Represents |
|---|---|---|
| 1 | **User** | The person using the web browser |
| 2 | **React Frontend** | The web interface running in the browser |
| 3 | **API Server** | The Node.js backend that handles all requests |
| 4 | **Cache (Redis)** | In-memory store for fast data retrieval |
| 5 | **Database (MongoDB)** | Permanent storage for all records |
| 6 | **ML Service (Python)** | Python FastAPI service running the AI models |
| 7 | **Compliance Engine** | The separate compliance module that owns risk data |

### Interaction Block 1 — Dashboard Poll `loop [every 30 seconds]`

| Message | Direction | Meaning |
|---|---|---|
| 1 | User → Frontend | User opens or is already viewing the dashboard |
| 2 | Frontend → API Server | Calls `GET /api/analytics/kpi-summary` |
| 3 | API Server → Cache | Checks whether a recent result is stored |
| 4 (italic) | API Server → Database | Only if the cache has no data — queries decisions and violations directly |
| 5 | Database → API Server | Returns the raw KPI data |
| 6 | API Server → User | Returns the final KPI summary as a JSON response |

Solid arrows = requests. Dashed arrows = responses (return messages).

### Interaction Block 2 — Anomaly Detection `alt [Daily Cron 00:00]`

| Message | Meaning |
|---|---|
| 7 | Server reads the last 30 days of decisions from the database |
| 8 | Database returns the feature data (cycle times, rejection counts, etc.) |
| 9 | Server sends the data to the ML Service: `POST /ml/anomaly/predict` |
| 10 | ML Service returns anomaly scores and severity labels for each decision |
| 11 | Server saves the detected anomaly records to the database |

### Interaction Block 3 — Risk Scoring `alt [Daily Cron 01:30]`

| Message | Meaning |
|---|---|
| 12 | Server requests risk feature data from the Compliance Engine per department |
| 13 | Compliance Engine returns structured risk vectors |
| 14 | Server sends feature vectors to the ML Service: `POST /ml/risk/score` |
| 15 | ML Service returns a risk score (0–100) and risk level (Low/Medium/High/Critical) per department |

### Interaction Block 4 — Report Generation (On Demand)

| Message | Meaning |
|---|---|
| 16 | User clicks the Generate Report button on the interface |
| 17 | Frontend sends `POST /api/reports/generate` with the report parameters |
| 18 | Server fetches KPI, anomaly, and risk data from the database |
| 19 | Server generates the file — PDF using jsPDF, Excel using ExcelJS, or CSV using json2csv |
| 20 | Server returns a download URL to the user |

---

## 4. Class Diagram

### What It Shows
The Class Diagram answers: **"What are the main building blocks of the system, what data do they hold, and how do they depend on each other?"**

It is organised into **three rows** from top to bottom:

### Row 1 — Data Models (Mongoose Schemas)
These define the structure of every record stored in the database.

| Class | Database Collection | Purpose |
|---|---|---|
| **KpiSnapshot** | `m3_kpi_snapshots` | One record per department per day — stores all computed KPI values including AI-generated risk scores |
| **Anomaly** | `m3_anomalies` | One record per anomalous decision — stores the anomaly score, severity, description, and acknowledgement status |
| **Forecast** | `m3_forecasts` | Stores the Prophet model's predicted daily values (with upper and lower confidence bounds) per department and horizon |
| **Report** | `m3_reports` | Tracks every generated report file — its type, format, parameters, storage path, and generation status |
| **ReportSchedule** | `m3_report_schedules` | Stores the configuration for each automated report — the schedule (cron expression), recipients, and format |

### Row 2 — Services (Business Logic Modules)
These contain the logic that operates on the data.

| Class | File | Purpose |
|---|---|---|
| **KpiAggregator** | `kpiAggregator.ts` | Reads decisions and violations from the database, computes all KPI values, and saves them as daily snapshots |
| **CacheService** | `cacheService.ts` | Generic Redis helper — provides `getOrSet()` (check cache or compute fresh) and `invalidate()` (clear stale keys) |
| **MlService** | `mlService.ts` | Proxy layer that sends HTTP requests to the Python ML Service with the correct authentication key |
| **ReportGenerator** | `reportGenerator.ts` | Assembles data and generates the actual report files using jsPDF, ExcelJS, and json2csv |

### Row 3 — Cron Jobs (Scheduled Tasks)
These run automatically at fixed times with no user input.

| Class | Schedule | Task |
|---|---|---|
| **AnomalyJob** | Every day at 00:00 | Runs anomaly detection — sends decisions to the ML Service and saves results |
| **ForecastJob** | Every day at 02:00 | Runs the Prophet forecast for all departments across all three horizons |
| **RiskJob** | Every day at 01:30 | Fetches risk features and runs the Random Forest classifier |
| **RetrainJob** | Every Sunday at 03:00 | Triggers a full retraining of all three AI models on the latest 12 months of data |

### Relationships

| Arrow Style | Meaning | Example |
|---|---|---|
| Dashed open arrow | **Uses / Depends on** | `AnomalyJob` depends on `MlService` to get predictions |
| Solid open arrow | **Writes / Creates** | `AnomalyJob` writes records into the `Anomaly` model |
| Filled diamond | **Composes / Generates** | `ReportGenerator` produces (composes) a `Report` document |
| Solid plain arrow | **Associated with** | A `Report` is linked to the `ReportSchedule` that triggered it |

---

*All four diagrams together provide a complete picture — who uses the system (Use Case), how it processes requests step by step (Activity), in what order components communicate (Sequence), and how the codebase is structured internally (Class).*
