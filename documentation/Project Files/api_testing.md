# API Testing Log

This table documents all API endpoints created and tested in the GovVision project, including method, endpoint, authentication, test input, response, and status.

| METHOD | ENDPOINT | AUTH | TEST INPUT | RESPONSE | STATUS |
|--------|----------|------|------------|----------|--------|
| GET    | /api/ai/anomalies | JWT + Role (admin, manager, executive, analyst) | - | { Critical: [], High: [], Medium: [], Low: [], total: N } | 200 OK |
| PUT    | /api/ai/anomalies/:id/acknowledge | JWT + Role (admin, manager, executive) | :id (ObjectId) | { isAcknowledged: true, acknowledgedAt: Date } | 200 OK |
| GET    | /api/analytics/kpi-summary | JWT + Role | - | { kpiSummary: {...} } | 200 OK |
| GET    | /api/analytics/kpi-summary/:deptId | JWT + Role | :deptId | { kpiSummary: {...} } | 200 OK |
| GET    | /api/analytics/decision-volume | JWT + Role | granularity, dateFrom, dateTo | { volume: [...] } | 200 OK |
| GET    | /api/analytics/cycle-time-histogram | JWT + Role | deptId, dateFrom, dateTo | { histogram: [...] } | 200 OK |
| GET    | /api/analytics/compliance-trend | JWT + Role | deptIds, dateFrom, dateTo | { trend: [...] } | 200 OK |
| GET    | /api/analytics/risk-heatmap | JWT + Role | dateFrom, dateTo | { heatmap: {...} } | 200 OK |
| POST   | /api/events/decision-update | SERVICE_KEY | { decisionId, newStatus, department, timestamp } | { received: true, department, status } | 200 OK |
| POST   | /api/events/compliance-update | SERVICE_KEY | { violationId, department, severity } | { received: true, department, severity } | 200 OK |
| POST   | /api/reports/generate | JWT + Role | { reportType, dateFrom, dateTo, departments, widgets, format } | { reportId, downloadUrl } | 200 OK |
| GET    | /api/reports/download/:id | JWT + Role | :id | File (PDF/Excel/CSV) | 200 OK |
| GET    | /api/reports/history | JWT + Role | - | { reports: [...] } | 200 OK |
| GET    | /api/reports/schedules | JWT + Role | - | { schedules: [...] } | 200 OK |
| POST   | /api/reports/schedules | JWT + Role | { name, cronExpression, recipients, ... } | { scheduleId } | 200 OK |
| PUT    | /api/reports/schedules/:id | JWT + Role | :id, { ... } | { updated: true } | 200 OK |
| DELETE | /api/reports/schedules/:id | JWT + Role | :id | { deleted: true } | 200 OK |
| GET    | /api/risks/score/:deptId | JWT + Role | :deptId | { riskScore, riskLevel, featureImportance } | 200 OK |
| POST   | /ml/anomaly/predict | SERVICE_KEY | { decisions: [...] } | { results: [...] } | 200 OK |
| POST   | /ml/forecast/predict | SERVICE_KEY | { timeSeries: [...], horizon } | { forecast: [...] } | 200 OK |
| POST   | /ml/risk/score | SERVICE_KEY | { features: [...] } | { scores: [...] } | 200 OK |
| POST   | /ml/models/train | SERVICE_KEY | { data: [...] } | { retrain: true } | 200 OK |

*All endpoints above have been tested as per the implementation logs. Status reflects latest test outcome.*
