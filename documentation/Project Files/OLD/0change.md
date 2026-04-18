# Change Log: old_plan vs Progress2_Scheduled_Work

Source files compared:
- old: documentation/Project Files/old_plan.md
- new: documentation/Project Files/Progress2_Scheduled_Work.md

## 1) Overall Documentation Style
old:
- A build-first execution plan with detailed coding instructions, large code blocks, package installs, and validation commands for each day.

new:
- A repo-truth status document for later days, focused on what is currently implemented vs missing in this codebase.

reason for change:
- The old plan was aspirational and described features as if they were fully implemented.
- The updated document reflects actual repository state to avoid mismatch during development and demo prep.

---

## 2) Day 8 Forecast Backend
old:
- "Implement forecast endpoint, build forecast cron, add forecast analytics route" as planned work.

new:
- Marks forecast backend as already implemented end-to-end (FastAPI forecast endpoint, Node forecast job, forecast persistence, analytics route).

reason for change:
- These backend parts already exist in the repository, so the document was corrected from "to do" to "done".

---

## 3) Day 9 Forecast Frontend
old:
- "Build ForecastPage.tsx, forecast types, forecast API wrappers, chart UI" as if to be completed in the sequence.

new:
- Explicitly states forecast frontend is not yet implemented and route still points to placeholder.

reason for change:
- Current app routing and pages show no dedicated forecast page in client.

---

## 4) Day 10 Risk Scoring Backend
old:
- "Train Random Forest risk model, add risk endpoint, produce real risk scores".

new:
- States risk service is currently stubbed and full training pipeline/artifacts are not present.

reason for change:
- Repo contains placeholder risk scoring logic and no complete risk model training pipeline implementation.

---

## 5) Day 11 Risk Heatmap Backend
old:
- "Build risk scoring cron + cross-module data pull" as implementation work.

new:
- Marks heatmap backend as partial: aggregation route exists, but automatic risk scoring pipeline is missing.

reason for change:
- Heatmap route reads stored snapshot values, but score generation pipeline is incomplete.

---

## 6) Day 12 Risk Heatmap Frontend
old:
- "Build RiskHeatmap page + DrillDownPanel".

new:
- States standalone risk page is not implemented; risk data is only surfaced inside dashboard context.

reason for change:
- No dedicated risk page/components were found in client pages/components.

---

## 7) Day 13 Reporting Generator
old:
- "Implement report generator service (CSV/Excel/PDF)".

new:
- Clarifies report models exist, but generator implementation is missing.

reason for change:
- Report data schemas are present, while generator service remains scaffold-only.

---

## 8) Day 14 Reports API
old:
- "Create full reports API routes (generate, list, download)".

new:
- Marks reports API as not implemented.

reason for change:
- Report routing file exists as scaffold/empty in current repo state.

---

## 9) Day 15-17 Reporting UI + Scheduling
old:
- Day 15: report builder UI
- Day 16: report history UI
- Day 17: scheduled reports backend + frontend

new:
- Marks these as not implemented/pending in current snapshot.

reason for change:
- Client routes still use placeholders for reports area and scheduling execution flow is absent.

---

## 10) Day 18-19 Integration/Validation Scope
old:
- Full E2E integration verification and TypeScript final hardening framed as active build/test milestones.

new:
- Reframed as gap/status summary for incomplete subsystems (especially reporting and risk).

reason for change:
- End-to-end validations in old plan assumed features that are not yet built.

---

## 11) Day 20 Final State
old:
- Demo prep with assumption that all prior modules/pages are complete and runnable.

new:
- Explicit repository snapshot summary:
  - implemented: dashboard, deep insights, anomaly flow, forecast backend, KPI aggregation routes
  - missing: forecast frontend, risk scoring pipeline, dedicated risk page, report generator/routes/scheduling UI

reason for change:
- Final day now documents realistic deliverable status for this repo instead of idealized completion.

---

## Net Effect
old:
- Future-state implementation plan.

new:
- Current-state implementation truth.

reason for change:
- Keeps project documentation aligned with actual codebase behavior and avoids misleading progress claims.
