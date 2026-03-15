DAY 5 — Analytics Charts

FILES CREATED:
  client/src/components/charts/DecisionVolumeChart.tsx
  client/src/components/charts/CycleTimeHistogram.tsx
  client/src/components/charts/ComplianceTrendChart.tsx
  server/scripts/importCSV.ts

FILES UPDATED:
  client/src/types/index.ts       — 4 new interfaces
  client/src/services/api.ts      — confirmed all 3 chart API functions,
                                    added dynamic API base URL
  client/src/pages/Dashboard.tsx  — replaced inline charts with components,
                                    added ComplianceTrendChart row
  server/routes/analyticsRoutes.ts — temporarily disabled validateJWT on
                                     5 analytics GET routes for dev testing
  server/server.ts                — updated CORS to allow localhost/127.0.0.1
                                    on any dev port

TYPES ADDED:
  IDecisionVolumePoint   — { date, count }
  ICycleTimeBucket       — { bucket, count }
  IComplianceTrendPoint  — { date, complianceRate }
  IComplianceTrendSeries — { department, data: IComplianceTrendPoint[] }

CHART LIBRARIES:
  DecisionVolumeChart   — Recharts AreaChart + BarChart
  CycleTimeHistogram    — Recharts BarChart with Cell per bar
  ComplianceTrendChart  — Apache ECharts via echarts-for-react

FILTER WIRING:
  All 3 components receive filters as a prop from Dashboard.tsx.
  Each manages its own data/loading state.
  useEffect dependency on filters triggers automatic re-fetch.
  No Apply button — changes are immediate.

COMPLIANCE TARGET LINE:
  markLine at yAxis: 95, dashed red, label "Target: 95%"
  Added to first series only to avoid duplicate lines.

CYCLE TIME TOOLTIP:
  Shows count AND percentage of total.
  Total computed as data.reduce((sum, d) => sum + d.count, 0)
  inside buildTooltip(total) factory function.

BACKEND ANALYTICS AUTH (TEMP DEV MODE):
  validateJWT middleware was commented out (not deleted) for these routes:
  - GET /api/analytics/kpi-summary
  - GET /api/analytics/kpi-summary/:deptId
  - GET /api/analytics/decision-volume
  - GET /api/analytics/cycle-time-histogram
  - GET /api/analytics/compliance-trend
  Purpose:
  - Allows local dashboard/API testing without JWT token failures
  - Keeps middleware visible for easy restore later

CSV DATA IMPORT:
  Script added: server/scripts/importCSV.ts
  Source file: server/scripts/AI_Workflow_Optimization_Dataset_2500_Rows_v1.csv
  What it does:
  - Connects to MongoDB using MONGODB_URI from .env
  - Clears existing m1_decisions collection
  - Parses CSV row-by-row
  - Maps CSV fields to m1_decisions schema + extra analytics fields
  - Logs progress every 100 prepared/inserted rows
  - Inserts in batches and logs total inserted count at completion

CSV FIELD MAPPING SUMMARY:
  status:
    Approval -> approved
    Escalation -> rejected
    otherwise -> pending
  department:
    department name lookup in departments collection
    fallback null if no match
  createdAt/completedAt:
    parsed from Task_Start_Time / Task_End_Time
  cycleTimeHours:
    Actual_Time_Minutes / 60
  rejectionCount:
    Delay_Flag == "1" -> random 1..3, else 0
  revisionCount:
    parseInt(Employee_Workload)
  daysOverSLA:
    Math.max(0, (Actual_Time_Minutes - Estimated_Time_Minutes) / 60 / 24)
  stageCount:
    Level 1 -> 1, Level 2 -> 2, Level 3 -> 3
  hourOfDaySubmitted:
    hour from createdAt
  priority:
    lowercase Priority_Level

DATE NORMALIZATION FOR CURRENT DASHBOARD RANGE:
  importCSV.ts now computes an offset from latest CSV timestamp to current time.
  Then applies that same offset to each row's createdAt/completedAt.
  Purpose:
  - Moves historical CSV timeline into a current window so default
    Last 30 Days filters return visible data.

DYNAMIC LOCALHOST API HOST:
  client/src/services/api.ts now builds base URL dynamically:
  - Uses current page hostname/protocol
  - Uses VITE_API_PORT (default 5002)
  - Supports full override with VITE_API_BASE_URL
  Purpose:
  - Frontend works on localhost:5173 or localhost:5174 without hardcoded mismatch.

CORS UPDATE FOR LOCAL DEVELOPMENT:
  server/server.ts CORS now accepts localhost and 127.0.0.1 from any port.
  Purpose:
  - Fixes browser CORS errors when Vite chooses a non-5173 port (for example 5174).

KNOWN LIMITATIONS / NOTES:
  - If departments collection is empty, imported rows use department: null.
    Org-wide KPIs still work, but department filtering will not.
  - Compliance Trend route reads KPI snapshots, not raw decisions directly.
    It may appear empty until snapshot data exists for departments.

RUN / VERIFY CHECKLIST:
  1) Run server: npm run dev (from server/)
  2) Run client: npm run dev (from client/)
  3) Re-import shifted CSV data when needed:
     npx ts-node scripts/importCSV.ts (from server/)
  4) Open Vite URL and hard refresh
  5) Verify KPI cards + Decision Volume + Cycle Histogram populate
