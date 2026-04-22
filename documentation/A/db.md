# Database Schema Reference — Module 3

All collections use MongoDB with Mongoose ODM. Primary key `_id` (ObjectId) is auto-generated on every document.

---

## Collection: `m3_kpi_snapshots`

Daily KPI state per department. Upserted — one document per (departmentId + snapshotDate) pair.

| Field | Type | Description |
|---|---|---|
| `_id` | ObjectId | Auto-generated primary key |
| `departmentId` | String | Canonical department ID (e.g. `FI001`). `null` = org-wide aggregate |
| `snapshotDate` | Date | Date of this daily snapshot |
| `totalDecisions` | Number | Total decisions created on this date for this department |
| `approvedCount` | Number | Count of decisions with status `approved` |
| `rejectedCount` | Number | Count of decisions with status `rejected` |
| `pendingCount` | Number | Count of decisions still pending |
| `avgCycleTimeHours` | Number | Average (completedAt − createdAt) in hours for completed decisions |
| `violationCount` | Number | Total violations from m2_violations on this date |
| `openViolations` | Number | Count of violations with status `open` |
| `complianceRate` | Number | Percentage 0–100: ((total − violations) / total) × 100 |
| `bottleneckRate` | Number | Percentage of pending tasks that are overdue past SLA |
| `bottleneckCount` | Number | Absolute count of bottlenecked decisions |
| `bottleneckThresholds` | Mixed | Configuration object for bottleneck calculation thresholds |
| `anomalyCount` | Number | Count of Isolation Forest anomalies detected (populated by anomaly cron) |
| `riskScore` | Number | Random Forest output: 0–100 composite risk score (populated by risk cron) |
| `riskLevel` | String | `low` / `medium` / `high` / `critical` (from Random Forest classification) |
| `featureImportance` | Mixed | Feature importance weights from Random Forest model (populated by risk cron) |

**Indexes:** Compound index on `(departmentId, snapshotDate)`

---

## Collection: `m3_anomalies`

One record per anomalous decision detected by the Isolation Forest model.

| Field | Type | Description |
|---|---|---|
| `_id` | ObjectId | Auto-generated primary key |
| `decisionId` | ObjectId | Foreign key → `m1_decisions._id`. The flagged decision |
| `department` | String | Department of the flagged decision |
| `anomalyScore` | Number | Raw Isolation Forest score (0.0–1.0). Higher = more anomalous |
| `severity` | String | `Low` / `Medium` / `High` / `Critical` / `Normal` — threshold-mapped from score |
| `isAcknowledged` | Boolean | `true` when a manager clicks Acknowledge on the dashboard |
| `acknowledgedBy` | ObjectId | Foreign key → `users._id`. Who acknowledged it |
| `acknowledgedAt` | Date | Timestamp of acknowledgement |
| `description` | String | Auto-generated text describing the detected pattern |
| `featureValues` | Mixed | The raw feature vector sent to the ML model for this decision |

---

## Collection: `m3_forecasts`

Prophet model forecast output per department, target, and horizon.

| Field | Type | Description |
|---|---|---|
| `_id` | ObjectId | Auto-generated primary key |
| `department` | String | Department ID. `org` = organisation-wide forecast |
| `generatedAt` | Date | Timestamp when this forecast was generated |
| `horizon` | Number | `7` / `14` / `30` — forecast horizon in days |
| `target` | String | `volume` / `delay` / `approval_rate` / `rejection_rate` / `pending_workload` / `sla_misses` |
| `forecastData` | Array | Array of forecast points: `[{ ds: Date, yhat: Number, yhat_lower: Number, yhat_upper: Number }]` |

---

## Collection: `m3_reports`

Tracks every generated report file.

| Field | Type | Description |
|---|---|---|
| `_id` | ObjectId | Auto-generated primary key |
| `type` | String | `executive_summary` / `compliance` / `anomaly` / `risk` |
| `format` | String | `pdf` / `excel` / `csv` |
| `status` | String | `completed` / `pending` / `failed` |
| `filePath` | String | Filesystem path to the generated report file |
| `parameters` | Mixed | Report configuration: `{ type, format, dateFrom, dateTo, departments[], requestedBy }` |
| `generatedAt` | Date | Timestamp of report generation |
| `generatedBy` | String | User ID or identifier of who triggered the report |

---

## Collection: `m3_report_schedules`

Automated report delivery schedule configurations.

| Field | Type | Description |
|---|---|---|
| `_id` | ObjectId | Auto-generated primary key |
| `name` | String | Schedule display name |
| `reportConfig` | Mixed | Report parameters: `{ type, format, departments[], dateRangeMode }` |
| `frequency` | String | `daily` / `weekly` / `monthly` |
| `nextRunAt` | Date | Next scheduled execution time |
| `lastRunAt` | Date | Last successful execution timestamp |
| `lastRunStatus` | String | `success` / `failed` / `pending` |
| `isActive` | Boolean | Whether this schedule is currently active |
| `createdBy` | String | User who created the schedule |
| `recipients` | String[] | Email addresses for automated delivery |
| `createdAt` | Date | Auto-generated (Mongoose timestamps) |
| `updatedAt` | Date | Auto-generated (Mongoose timestamps) |

---

## Cross-Module Read-Only Models

Module 3 defines read-only Mongoose models for collections owned by other modules to perform bulk analytics queries.

### `m1_decisions` (Read-Only — Owned by Module 1)

| Field | Type | Description |
|---|---|---|
| `_id` | ObjectId | Decision primary key |
| `status` | String | Decision lifecycle status |
| `department` | String | Canonical department string (e.g. `FI001`) |
| `createdAt` | Date | Decision creation timestamp |
| `completedAt` | Date | Decision completion timestamp (null if pending) |
| `cycleTimeHours` | Number | Hours from creation to completion |
| `rejectionCount` | Number | Number of times this decision was rejected |
| `revisionCount` | Number | Number of revision requests |
| `daysOverSLA` | Number | Days past the SLA deadline |
| `stageCount` | Number | Number of approval stages traversed |
| `hourOfDaySubmitted` | Number | Hour of day when submitted (0–23) |
| `departmentName` | String | Human-readable department name |

### `m2_violations` (Read-Only — Owned by Module 2)

| Field | Type | Description |
|---|---|---|
| `_id` | ObjectId | Violation primary key |
| `department` | String | Canonical department string |
| `severity` | String | Violation severity level |
| `status` | String | `open` / `resolved` |
| `createdAt` | Date | When the violation was detected |
