# Project Bash and PowerShell Commands

This file contains manual commands you can run yourself. Each command block includes:
- what it is trying to do
- command
- expected result

---

## Forecast Session Commands (2026-04-10)

Grouped commands that were actually used during forecast target implementation and validation.

### 1) Startup commands

What it does:
- starts ML service and runs forecast ingestion from backend server scripts

Commands:
cd ml_service
python -m uvicorn main:app --host 0.0.0.0 --port 8000

cd ../server
npm run run:forecast-job

Expected result:
- ML service responds on port 8000
- forecast job logs show `Done: dept=<id>, target=volume|delay, horizon=7|14|30d`

### 2) API test commands (curl/PowerShell)

What it does:
- validates ML service availability before/after forecast runs

Commands:
Invoke-RestMethod -Uri "http://localhost:8000/health" -Method GET | ConvertTo-Json -Depth 5

Expected result:
- JSON contains:
  - status: ok
  - service: GovVision ML Service

### 3) Validation commands

What it does:
- verifies persisted delay forecast records and checks plotting output generation

Commands:
& "C:\Users\win\Desktop\GithubUploads\gov_vision\.venv\Scripts\python.exe" -c "from pymongo import MongoClient; c=MongoClient('mongodb://localhost:27017/govvision'); col=c.get_default_database()['m3_forecasts']; q={'department':'FI001','target':'delay','horizon':7}; d=col.find_one(q, {'_id':0,'department':1,'target':1,'horizon':1,'generatedAt':1,'forecastData':1}); print('NO_DOC' if not d else {'department':d['department'],'target':d['target'],'horizon':d['horizon'],'generatedAt':str(d['generatedAt']),'points':len(d.get('forecastData',[])),'first2':d.get('forecastData',[])[:2]})"

python .\plot_forecast.py --dept FI001 --target delay --periods 30 --no-band

& "C:\Users\win\Desktop\GithubUploads\gov_vision\.venv\Scripts\python.exe" "C:\Users\win\Desktop\GithubUploads\gov_vision\ml_service\scripts\plot_forecast.py" --dept FI001 --target volume --periods 30 --no-band --save "C:\Users\win\Desktop\GithubUploads\gov_vision\ml_service\models\FI001_volume_quickcheck.png" --no-show

Expected result:
- Mongo check prints a matching `delay` forecast row for `FI001` and `horizon=7`
- delay plot command opens a chart window for visual inspection
- plot command prints `Saved chart: ...FI001_volume_quickcheck.png`

### 4) Troubleshooting commands

What it does:
- fixes dependency and interpreter mismatch and documents common command mistakes encountered

Commands:
& "C:\Users\win\Desktop\GithubUploads\gov_vision\.venv\Scripts\python.exe" -m pip install -r "C:\Users\win\Desktop\GithubUploads\gov_vision\ml_service\requirements.txt"

python .\plot_forecast.py --dept FI001 --target delay --periods 30 --no-band

Set-Location "C:\Users\win\Desktop\GithubUploads\gov_vision\server"
npm run dev

Expected result:
- requirements command reports dependencies satisfied in `.venv`
- plot command runs successfully once script header corruption is removed
- running `npm run dev` from repo root fails (missing package.json), while running from `server` directory is the correct path

---

## UI Accent and Dropdown Consistency Session Commands (2026-04-12)

Grouped commands and validation checks that were actually executed for universal dark-gray accent and dropdown consistency updates.

### 1) Startup commands

What it does:
- records startup command status for this session

Commands:
No startup command was executed in this session.

Expected result:
- n/a

### 2) API test commands (curl/PowerShell)

What it does:
- records API command status for this session

Commands:
No direct API curl or Invoke-RestMethod command was executed in this session.

Expected result:
- n/a

### 3) Validation commands

What it does:
- validates edited frontend files and confirms dropdown option rendering was moved away from native select/option controls

Commands:
get_errors filePaths:
- client/src/pages/DeepInsights.tsx
- client/src/pages/Dashboard.tsx
- client/src/components/Sidebar.tsx
- client/src/index.css

grep_search query: <select|<option
includePattern: client/src/**

grep_search query: 3B82F6|2563EB|4F46E5|6366F1|8B5CF6|A855F7
includePattern: client/src/**

Expected result:
- diagnostics output: No errors found for all edited files
- native select/option scan returns no matches in client/src
- hardcoded-blue scan returns matches in chart-related files, confirming chart palette remains independent

### 4) Troubleshooting commands

What it does:
- records command-level troubleshooting status for this session

Commands:
No terminal troubleshooting command was required beyond validation checks.

Expected result:
- n/a

---

## Routing and Layout Session Commands (2026-04-09)

Grouped commands that were actually used during routing/layout refactor validation.

### 1) Startup commands

What it does:
- starts the client dev server for route and shared-layout checking

Commands:
cd client
npm run dev

Expected result:
- Vite serves the app locally
- `/dashboard` and `/deep-insights` render inside the shared AppLayout
- placeholder routes render as blank pages with no visible text or emoji

### 2) API test commands (curl/PowerShell)

What it does:
- documents API testing status for this frontend-only refactor

Commands:
No API test commands were executed during the routing/layout pass.

Expected result:
- n/a

### 3) Validation commands

What it does:
- confirms the client still builds after the shared layout/router refactor

Commands:
cd client
npm run build

Expected result:
- TypeScript compile and Vite production build complete successfully
- observed output: 1675 modules transformed, dist assets emitted, and a large-chunk warning noted

### 4) Troubleshooting commands

What it does:
- records the fact that no extra shell troubleshooting command was needed during the routing/layout refactor

Commands:
No shell troubleshooting command was needed beyond the build validation above.

Expected result:
- n/a

---

## Deep Insights Session Commands (2026-04-09)

Grouped commands that were actually used during implementation, validation, and troubleshooting.

### 1) Startup commands

What it does:
- starts backend and frontend for manual Deep Insights validation

Commands:
cd server
npm run dev

cd ../client
npm run dev

Expected result:
- backend serves API on port 5002
- frontend serves app and /deep-insights is reachable

### 2) API test commands (curl/PowerShell)

What it does:
- documents direct API command usage for this session

Commands:
No direct curl or Invoke-RestMethod API command was executed in this session; API behavior was validated through the Deep Insights UI flow.

Expected result:
- n/a

### 3) Validation commands

What it does:
- verifies frontend TypeScript/build integrity after the Deep Insights fixes

Commands:
cd client
npm run build

Expected result:
- build completes successfully (observed exit code: 0)

### 4) Troubleshooting commands

What it does:
- restores unacknowledged anomalies after repeated acknowledge testing depleted active rows

Commands:
cd server
npx ts-node scripts/resetUnacknowledged.ts

Expected result:
- console output includes:
  - Reset 5 anomalies to unacknowledged
  - Unacknowledged total: 5
  - By severity: [{"_id":"Low","count":5}]

---

## Reporting and Risk Session Commands (2026-04-13)

Grouped commands that were actually used during reporting backend/frontend integration and risk/report runtime verification checks.

### 1) Startup commands

What it does:
- activates the repository Python virtual environment used by ML and utility commands

Commands:
& c:\Users\win\Desktop\GithubUploads\gov_vision\.venv\Scripts\Activate.ps1

Expected result:
- virtual environment activation completes successfully (exit code 0)

### 2) API test commands (PowerShell/Node quick checks)

What it does:
- confirms required report-generation Node libraries are resolvable at runtime
- confirms report output directory can be listed

Commands:
Push-Location server; node -e "require('exceljs'); console.log('exceljs: ok')"; node -e "require('jspdf'); console.log('jspdf: ok')"; node -e "const {parse}=require('json2csv'); console.log('json2csv: ok')"; Get-ChildItem generated_reports | Out-String; Pop-Location

Expected result:
- prints:
  - exceljs: ok
  - jspdf: ok
  - json2csv: ok
- generated_reports directory listing command executes without failure

### 3) Validation commands

What it does:
- verifies Python-side model path resolution for anomaly/forecast/risk services
- validates backend/frontend compile status after report + schedule implementation

Commands:
Push-Location c:\Users\win\Desktop\GithubUploads\gov_vision\ml_service; python -c "from app.services.anomaly_service import _MODELS_DIR as a; from app.services.forecast_service import MODELS_DIR as f; from app.services.risk_service import MODEL_PATH as r; print('anomaly_dir=', a); print('forecast_dir=', f); print('risk_model=', r)"; Pop-Location

cd server
npm run typecheck

cd ../client
npm run typecheck

Expected result:
- model-path command prints resolved paths for anomaly_dir, forecast_dir, and risk_model
- backend typecheck completes with no TypeScript errors
- client typecheck completes with no TypeScript errors

### 4) Troubleshooting commands

What it does:
- captures dependency/runtime verification path used to confirm report package availability before endpoint runtime testing

Commands:
Push-Location server; node -e "require('exceljs'); console.log('exceljs: ok')"; node -e "require('jspdf'); console.log('jspdf: ok')"; node -e "const {parse}=require('json2csv'); console.log('json2csv: ok')"; Pop-Location

Expected result:
- each package check prints `ok`; missing module errors do not occur

---

## 1) Environment Setup

### Install frontend and backend dependencies
What it does:
- installs Node.js packages for client and server

Commands:
cd client
npm install
cd ../server
npm install

Expected result:
- node_modules folders are created and npm install completes with no errors

### Install ML service dependencies
What it does:
- installs Python packages from requirements.txt for ml_service

Commands:
cd ../ml_service
pip install -r requirements.txt

Expected result:
- all required Python packages are installed

---

## 2) Core Services Run Order

### Start ML service
What it does:
- starts FastAPI service on port 8000 for anomaly and ML endpoints

Commands:
cd ml_service
python -m uvicorn main:app --port 8000 --reload

Expected result:
- service starts on http://localhost:8000

### Start backend service
What it does:
- starts Module 3 backend API on port 5002

Commands:
cd ../server
npm run dev

Expected result:
- log shows Module 3 server running on port 5002

### Start frontend service
What it does:
- starts Vite frontend dev server

Commands:
cd ../client
npm run dev

Expected result:
- frontend opens on local Vite URL (usually localhost:5173)

---

## 3) Data and Utilities

### Import CSV data into MongoDB
What it does:
- runs import script to populate DB collections from CSV

Commands:
cd ../server
npx ts-node scripts/importCSV.ts

Expected result:
- import script finishes and logs inserted records

### Test KPI aggregator script
What it does:
- runs aggregator test utility manually

Commands:
npx ts-node scripts/testAggregator.ts

Expected result:
- script outputs aggregation test results with no runtime crash

### Open Mongo shell using env URI (PowerShell)
What it does:
- opens mongosh connected to the database configured in env

Commands:
mongosh "$env:MONGODB_URI"

Expected result:
- interactive Mongo shell opens on target DB

---

## 4) Anomaly Pipeline Validation Commands

### Trigger anomaly job manually
What it does:
- runs anomaly pipeline immediately instead of waiting for cron

Commands:
cd server
npx ts-node -e "import('./jobs/anomalyJob').then(m => m.runAnomalyJob())"

Expected result:
- logs show anomaly scoring flow and cache invalidation

### Test anomaly read endpoint
What it does:
- fetches grouped active anomalies via protected AI route

Commands:
curl -H "Authorization: Bearer TOKEN" http://localhost:5002/api/ai/anomalies

Expected result:
- JSON response with Critical, High, Medium, Low, total

### Test anomaly acknowledge endpoint
What it does:
- marks one anomaly as acknowledged

Commands:
curl -X PUT -H "Authorization: Bearer TOKEN" http://localhost:5002/api/ai/anomalies/ANOMALY_ID/acknowledge

Expected result:
- updated anomaly document with isAcknowledged true

---

## 5) Analytics Auth and Caching Validation Commands

### Confirm unauthenticated request is blocked
What it does:
- verifies JWT middleware is enforced on analytics routes

Commands:
curl "http://localhost:5002/api/analytics/kpi-summary"

Expected result:
- HTTP 401

### Test authenticated analytics routes
What it does:
- verifies major analytics endpoints return valid data with JWT

Commands:
curl -H "Authorization: Bearer TOKEN" "http://localhost:5002/api/analytics/kpi-summary"
curl -H "Authorization: Bearer TOKEN" "http://localhost:5002/api/analytics/kpi-summary/FI001"
curl -H "Authorization: Bearer TOKEN" "http://localhost:5002/api/analytics/decision-volume?granularity=daily"
curl -H "Authorization: Bearer TOKEN" "http://localhost:5002/api/analytics/cycle-time-histogram"
curl -H "Authorization: Bearer TOKEN" "http://localhost:5002/api/analytics/compliance-trend?deptIds=FI001,HR002"

Expected result:
- valid JSON responses for each route

### Check Redis port reachability (PowerShell)
What it does:
- checks whether Redis is reachable on localhost:6379

Commands:
Test-NetConnection localhost -Port 6379

Expected result:
- TcpTestSucceeded True when Redis is running

---

## 6) Webhook and Risk Heatmap Validation Commands

### Webhook decision update test (PowerShell)
What it does:
- simulates Module 1 event webhook call to Module 3
- validates cache invalidation and KPI re-aggregation trigger path

Commands:
Set-Location C:\Users\win\Desktop\GithubUploads\gov_vision\server
$envFile = Get-Content .env
$serviceKey = ($envFile | Where-Object { $_ -match '^SERVICE_KEY=' }) -replace '^SERVICE_KEY=',''

$r = Invoke-WebRequest -Method Post -TimeoutSec 10 \
  -Uri "http://localhost:5002/api/events/decision-update" \
  -Headers @{ "x-service-key" = $serviceKey; "Content-Type" = "application/json" } \
  -Body '{"department":"FI001","decisionId":"abc123","status":"approved"}'

"HTTP: $($r.StatusCode)"
$r.Content

Expected result:
- HTTP 200
- body contains received true, department, status

### Risk heatmap endpoint test (PowerShell)
What it does:
- validates risk heatmap route with JWT auth

Commands:
$token = "YOUR_TOKEN"
Invoke-RestMethod -Method Get `
  -Uri "http://localhost:5002/api/analytics/risk-heatmap" `
  -Headers @{ Authorization = "Bearer $token" }

Expected result:
- array of department rows with Low, Medium, High, Critical counts

---

## 7) Redis Commands (Only when Redis is available)

### List Module 3 cache keys
What it does:
- shows current Redis keys under m3 namespace

Commands:
redis-cli keys "m3:*"

Expected result:
- list of cache keys if cache is connected and in use

### Check TTL for a key
What it does:
- verifies cache expiration for a key

Commands:
redis-cli ttl "m3:kpi:org:2026-04-07"

Expected result:
- integer TTL in seconds

---

## 8) Git Utility Commands

### Find which rule ignores a file
What it does:
- identifies ignore rule source for a specific file

Commands:
git check-ignore -v TestNotes.md

Expected result:
- shows ignore file and pattern that matched

### Show modified, untracked, and ignored files
What it does:
- quick status snapshot during documentation or coding updates

Commands:
git status --short --ignored

Expected result:
- compact status list with ignored entries marked as !!
