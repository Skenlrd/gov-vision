# GovVision Module 3 — Progress 2: Detailed Implementation Guide (Days 8–20)

> **Who this is for:** This guide is written assuming you are building this for the first time and have never seen this codebase before. Every step explains not just *what* to do but *why* you are doing it, what the code means, what file to open, what to type in the terminal, and how to confirm it worked. Days 1–7 are already complete. This guide covers Days 8–20.

> **Before you start each day:** Read the entire day section top to bottom before writing a single line of code. Understand the goal. Then execute.

---

## ⚠️ Why the Original Plan Was Wrong — Read This First

The original `old_plan.md` was written as an aspirational build guide. Claude generated it without checking what actually existed in the repository. This caused three types of errors:

**Error Type 1 — Features already built were described as future work.**
The forecast backend (`train_prophet.py`, `forecastJob.ts`, the `/api/analytics/forecast` route, the `Forecast.ts` model) was already fully implemented by Day 7. The old plan told you to build it from scratch on Days 8–9.

**Error Type 2 — Features outside the project scope were invented.**
The old plan described building a `RiskHeatmap.tsx` page and a `DrillDownPanel.tsx` component. Neither of these exists anywhere in the GovVision project specification document. The actual project spec (GovVision.md, section 4.2) describes a **Risk Score Dashboard** — a department ranking table with score and level badges — not a heatmap grid. Claude invented the heatmap name and structure without reading the spec.

**Error Type 3 — Placeholder code was treated as working code.**
`ml_service/app/services/risk_service.py` exists in the repo but returns `riskScore: 0.0` and `riskLevel: 'Low'` for every single department no matter what — it is a stub. The old plan described it as if a real model already existed and just needed to be wired up.

**What Copilot corrected:** `Progress2_Scheduled_Work.md` (the updated file) accurately identified what was done vs. what was missing. That document is the correct truth source for repo state. This guide takes that truth and turns it into actual executable implementation steps.

---

## Current Repository State After Day 7 — What Is Done and What Is Not

Before starting Day 8, understand exactly what exists:

| Area | Status | Where It Lives |
|---|---|---|
| Anomaly cron job (24h schedule) | ✅ Done | `server/jobs/anomalyJob.ts` |
| Anomaly upsert + cache invalidation | ✅ Done | `server/jobs/anomalyJob.ts` |
| `GET /api/ai/anomalies` endpoint | ✅ Done | `server/routes/aiRoutes.ts` |
| `PUT /api/ai/anomalies/:id/acknowledge` | ✅ Done | `server/routes/aiRoutes.ts` |
| Analytics caching + JWT guards | ✅ Done | `server/routes/analyticsRoutes.ts` |
| Event webhook re-aggregation | ✅ Done | `server/routes/eventRoutes.ts` |
| Risk heatmap aggregation route | ✅ Done (partial) | `server/routes/analyticsRoutes.ts` |
| Dashboard page with KPI cards | ✅ Done | `client/src/pages/Dashboard.tsx` |
| Deep Insights anomaly table page | ✅ Done | `client/src/pages/DeepInsights.tsx` |
| Shared AppLayout + Sidebar | ✅ Done | `client/src/components/AppLayout.tsx` |
| ErrorBoundary + SkeletonLoader | ✅ Done | `client/src/components/` |
| PlaceholderPage for empty routes | ✅ Done | `client/src/pages/PlaceholderPage.tsx` |
| Prophet forecast training script | ✅ Done | `ml_service/training/train_prophet.py` |
| Prophet forecast job (dual target) | ✅ Done | `server/jobs/forecastJob.ts` |
| `GET /api/analytics/forecast` route | ✅ Done | `server/routes/analyticsRoutes.ts` |
| Forecast frontend page | ❌ Missing | needs `client/src/pages/ForecastPage.tsx` |
| Risk scoring (Random Forest) | ❌ Stub only | `ml_service/app/services/risk_service.py` returns 0 |
| Risk scoring training script | ❌ Missing | needs `ml_service/training/train_risk_model.py` |
| Risk scoring cron job | ❌ Missing | needs `server/jobs/riskScoringJob.ts` |
| Risk Score page (standalone) | ❌ Missing | needs `client/src/pages/RiskPage.tsx` |
| Report generator service | ❌ Missing | `server/services/reportGenerator.ts` is empty |
| Report API routes | ❌ Missing | `server/routes/reportRoutes.ts` is empty |
| Report builder frontend page | ❌ Missing | needs `client/src/pages/ReportBuilder.tsx` |
| Report history frontend page | ❌ Missing | needs `client/src/pages/ReportHistory.tsx` |
| Scheduled reports backend | ❌ Missing | needs `server/jobs/reportScheduleJob.ts` |
| Scheduled reports frontend page | ❌ Missing | needs `client/src/pages/ReportSchedules.tsx` |

---

## Day 8 — Verify and Lock Down the Forecast Backend

### 🎯 Goal & Reasoning

Day 7 upgraded the forecast pipeline to dual targets (volume + delay). Day 8 is not a build day — it is a **verification day**. Before you build the frontend that depends on the forecast API (Day 9), you need to be 100% sure the backend is working correctly. If you build the frontend and then discover the API returns the wrong shape, you will have to rewrite both. Spending one day verifying now saves two days of debugging later.

The forecast backend involves four layers that must all work together:

1. Python Prophet model files (`.pkl` files on disk) — trained and saved by `train_prophet.py`
2. FastAPI service (`ml_service/main.py`) — loads those pkl files and serves predictions
3. Node.js cron job (`server/jobs/forecastJob.ts`) — calls FastAPI, stores results in MongoDB
4. Analytics route (`server/routes/analyticsRoutes.ts`) — serves those stored results to the frontend

All four must be working before Day 9 starts.

---

### What Exists in the Repo

These files already exist and are implemented:

- `ml_service/training/train_prophet.py` — trains two Prophet model families per department plus an org-level model: `prophet_{dept}.pkl` for decision volume forecasting and `prophet_delay_{dept}.pkl` for approval delay forecasting
- `ml_service/app/services/forecast_service.py` — loads the correct `.pkl` file based on `dept_id` and `target`, runs `.predict()`, and returns `forecastData` with fields `ds` (date string), `yhat` (predicted value), `yhat_lower` (lower confidence bound), `yhat_upper` (upper confidence bound)
- `ml_service/main.py` — exposes `POST /ml/forecast/predict`, accepts `{ dept_id, horizon, target }`, delegates to `forecast_service.py`
- `server/jobs/forecastJob.ts` — scheduled at `0 2 * * *` (every day at 2:00 AM), loops over all unique departments from `m1_decisions` plus the `'org'` aggregate, calls FastAPI for both `volume` and `delay` targets at horizons 7, 14, and 30 days, upserts each result into `m3_forecasts`
- `server/models/Forecast.ts` — Mongoose model for the `m3_forecasts` collection, stores `department`, `generatedAt`, `horizon`, `target`, `forecastData`
- `server/routes/analyticsRoutes.ts` — has `GET /api/analytics/forecast` with query params `deptId`, `horizon`, `target`
- `server/package.json` — has `run:forecast-job` script for manual execution

---

### Step A — Confirm Prophet Model Files Exist on Disk

**Why:** The FastAPI service cannot serve forecasts if the `.pkl` files don't exist. The files are generated by running the training script. If someone cloned the repo fresh, they won't have these files yet.

Check what pkl files currently exist:

```bash
ls ml_service/models/
```

**Expected output:** You should see files like `prophet_FI001.pkl`, `prophet_delay_FI001.pkl`, `prophet_org.pkl`, `prophet_delay_org.pkl` etc. for each department.

**If the folder is empty or the files are missing**, run the training script:

```bash
cd ml_service
python training/train_prophet.py
```

**Expected output after training:**
```
Training prophet volume model for FI001...
Saved: models/prophet_FI001.pkl
Training prophet delay model for FI001...
Saved: models/prophet_delay_FI001.pkl
...
Training complete. All models saved.
```

**Why training is needed:** Prophet is a machine learning model. It learns from historical data (KPI snapshots). Until it sees data and saves what it learned into a `.pkl` file, it cannot make predictions. The training script feeds it historical `m3_kpi_snapshots` data, runs the Prophet fit algorithm, and saves the learned parameters to disk.

---

### Step B — Verify FastAPI Service Returns Forecast Data

**Why:** You need to confirm the API contract that Day 9's frontend will depend on. If the response shape is wrong, fix it now, not after you've written all the frontend code.

Start the ML service:

```bash
cd ml_service
python -m uvicorn main:app --port 8000 --reload
```

**Expected startup output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Application startup complete.
```

In a **separate terminal**, test the endpoint directly:

```bash
curl -X POST http://localhost:8000/ml/forecast/predict \
  -H "Content-Type: application/json" \
  -H "x-service-key: YOUR_SERVICE_KEY" \
  -d '{"dept_id": "FI001", "horizon": 7, "target": "volume"}'
```

**Expected response shape:**
```json
{
  "forecast": [
    { "ds": "2026-04-12", "yhat": 18.4, "yhat_lower": 14.1, "yhat_upper": 22.7 },
    { "ds": "2026-04-13", "yhat": 21.2, "yhat_lower": 16.5, "yhat_upper": 25.9 },
    ...7 items total
  ]
}
```

**What each field means:**
- `ds` — the forecasted date (Prophet uses `ds` as the standard column name, from "datestamp")
- `yhat` — the model's predicted value for that date (y-hat = predicted y)
- `yhat_lower` — the lower bound of the 80% confidence interval (the model is 80% confident the real value will be above this)
- `yhat_upper` — the upper bound of the 80% confidence interval

**If you get a 404 or connection refused:** Make sure you started uvicorn in the `ml_service` directory and it's using port 8000.

**If you get a model not found error:** The pkl file is missing. Go back to Step A and run the training script.

---

### Step C — Run the Forecast Job Manually and Verify MongoDB

**Why:** The Node.js job calls FastAPI, gets forecasts, and stores them in `m3_forecasts`. You need to confirm this full chain works — not just that FastAPI works in isolation.

Make sure the Node backend is running in a separate terminal:

```bash
cd server
npm run dev
```

**Expected startup logs (look for these specifically):**
```
MongoDB connected
Redis connected (or: Redis disabled in dev)
[ForecastJob] Scheduled: daily at 02:00.
[AnomalyJob] Scheduled: every 24 hours (daily at 00:00).
```

Now manually trigger the forecast job without waiting for 2:00 AM:

```bash
cd server
npm run run:forecast-job
```

**Expected output:**
```
[ForecastJob] Starting forecast run...
[ForecastJob] Processing dept=FI001, target=volume, horizon=7
[ForecastJob] Processing dept=FI001, target=volume, horizon=14
[ForecastJob] Processing dept=FI001, target=volume, horizon=30
[ForecastJob] Processing dept=FI001, target=delay, horizon=7
...
[ForecastJob] Forecast run complete. X documents upserted.
```

Now verify the data landed in MongoDB. Open a new terminal:

```bash
cd server
npx ts-node -e "
const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Forecast = require('./models/Forecast').default;
  const count = await Forecast.countDocuments();
  console.log('Total forecast documents:', count);
  const sample = await Forecast.findOne({ department: 'FI001', target: 'volume', horizon: 7 }).lean();
  console.log('Sample document:', JSON.stringify(sample, null, 2));
  mongoose.disconnect();
});
"
```

**Expected output:**
```
Total forecast documents: 30
Sample document: {
  "_id": "...",
  "department": "FI001",
  "target": "volume",
  "horizon": 7,
  "generatedAt": "2026-04-10T...",
  "forecastData": [
    { "ds": "2026-04-11", "yhat": 18.4, "yhat_lower": 14.1, "yhat_upper": 22.7 },
    ...
  ]
}
```

**Why 30 documents?** 5 departments (or however many are in your db) × 2 targets (volume, delay) × 3 horizons (7, 14, 30) = 30. Plus `org` level makes it more.

---

### Step D — Test the Node.js API Endpoint

**Why:** The frontend will call this endpoint, not the FastAPI directly. You need to confirm this layer works.

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "http://localhost:5002/api/analytics/forecast?deptId=FI001&horizon=7&target=volume"
```

Replace `YOUR_JWT_TOKEN` with a valid token obtained by logging into Module 1.

**Expected response:**
```json
{
  "forecastData": [
    { "ds": "2026-04-12", "yhat": 18.4, "yhat_lower": 14.1, "yhat_upper": 22.7 },
    ...
  ],
  "department": "FI001",
  "horizon": 7,
  "target": "volume",
  "generatedAt": "2026-04-10T..."
}
```

**If you get 401 Unauthorized:** Your JWT token is expired. Log into Module 1 again to get a fresh one.

**If you get 404 or empty data:** The forecast job hasn't run yet. Go back to Step C.

---

### ⚙️ API Contract (Locked for Day 9 Frontend)

**GET `/api/analytics/forecast`**
- Protected by: `validateJWT`, `requireRole(['admin', 'manager', 'executive', 'analyst'])`
- Query params:
  - `deptId` (string) — department ID like `'FI001'` or `'org'`
  - `horizon` (number) — must be `7`, `14`, or `30`
  - `target` (string) — must be `'volume'` or `'delay'`
- Cache key: `m3:forecast:{deptId}:{target}:{horizon}`, TTL 300 seconds
- Response:
```json
{
  "forecastData": [{ "ds": "string", "yhat": number, "yhat_lower": number, "yhat_upper": number }],
  "department": "string",
  "horizon": 7 | 14 | 30,
  "target": "volume" | "delay",
  "generatedAt": "ISO string"
}
```

---

### 📋 Day 8 Outcome

The forecast backend is fully verified: pkl model files exist on disk, FastAPI returns correct forecast data, the Node.js job persists results in MongoDB, and the analytics API endpoint serves them correctly. Day 9 can now build the frontend without any backend uncertainty.

---

---

## Day 9 — Forecast Frontend: ForecastPage.tsx, ForecastChart, HorizonToggle

### 🎯 Goal & Reasoning

The backend is locked. Now you build the page users will actually see when they click "Forecast" in the sidebar. Currently `App.tsx` sends the `/forecast` route to `PlaceholderPage` — a blank page with a "coming soon" message. Today you replace that with a fully working page that:

1. Lets the user select a department and forecast horizon (7, 14, or 30 days) and target (volume or delay)
2. Calls the forecast API you verified in Day 8
3. Renders a Prophet confidence band chart (a line chart where the area between the upper and lower bounds is shaded) using Apache ECharts
4. Shows a skeleton loading state while fetching and an error banner if the API fails

This page is built bottom-up: types first, then API wrapper, then the chart component, then the toggle component, then the full page that assembles everything. This order means you are never writing JSX that references a type or function that doesn't exist yet.

---

### Pages / Components Being Created Today

| File | What It Is |
|---|---|
| `client/src/pages/ForecastPage.tsx` | The full `/forecast` page — manages state, calls API, assembles child components |
| `client/src/components/ForecastChart.tsx` | The ECharts confidence band chart — accepts `forecastData[]` as props, renders the chart |
| `client/src/components/HorizonToggle.tsx` | Three buttons (7 / 14 / 30 days) — the active one is highlighted |
| `client/src/components/TargetToggle.tsx` | Two buttons (Decision Volume / Approval Delay) |

Plus modifications to existing files:
| File | What Changes |
|---|---|
| `client/src/types/index.ts` | Add `ForecastPoint` and `ForecastResponse` interfaces |
| `client/src/services/api.ts` | Add `getForecast()` function |
| `client/src/App.tsx` | Replace `PlaceholderPage` with `ForecastPage` for the `/forecast` route |

---

### Step A — Add Forecast Types to `client/src/types/index.ts`

**Why you do this first:** TypeScript is a statically typed language. Before you can write a component that uses forecast data, TypeScript needs to know the exact shape of that data. If you try to access `forecastData[0].yhat` without a type definition, TypeScript will throw a compile error. Defining the types first means the IDE will autocomplete field names and catch typos immediately.

**File to modify:** `client/src/types/index.ts`

Add these interfaces to the existing file (don't replace what's already there, just add at the bottom):

```typescript
// ─── Forecast Types ───────────────────────────────────────────────────────────

// A single data point in the forecast array
// Prophet returns these — ds is the date, yhat is the prediction,
// yhat_lower and yhat_upper form the confidence band
export interface ForecastPoint {
  ds: string;          // ISO date string e.g. "2026-04-12"
  yhat: number;        // The model's predicted value for that date
  yhat_lower: number;  // Lower bound of 80% confidence interval
  yhat_upper: number;  // Upper bound of 80% confidence interval
}

// The full response from GET /api/analytics/forecast
export interface ForecastResponse {
  forecastData: ForecastPoint[];
  department: string;
  horizon: 7 | 14 | 30;
  target: 'volume' | 'delay';
  generatedAt: string;
}

// The parameters used to request a forecast
export interface ForecastParams {
  deptId: string;
  horizon: 7 | 14 | 30;
  target: 'volume' | 'delay';
}
```

---

### Step B — Add `getForecast()` to `client/src/services/api.ts`

**Why:** Components should never call `axios.get(...)` directly — they should call a typed wrapper function. If the API URL changes, you fix it in one place. The wrapper also ensures the return type is correct.

**File to modify:** `client/src/services/api.ts`

Add this function to the existing file:

```typescript
import { ForecastResponse } from '../types';

// Fetch forecast data for a department, horizon, and target
// Calls GET /api/analytics/forecast?deptId=X&horizon=Y&target=Z
export async function getForecast(
  deptId: string,
  horizon: 7 | 14 | 30,
  target: 'volume' | 'delay'
): Promise<ForecastResponse> {
  const res = await api.get<ForecastResponse>('/analytics/forecast', {
    params: { deptId, horizon, target },
  });
  return res.data;
}
```

**What `api.get<ForecastResponse>` means:** The `<ForecastResponse>` tells TypeScript: "I expect the response data to match this interface." If the server returns something different, TypeScript will warn you.

---

### Step C — Create `HorizonToggle.tsx`

**Why this is a separate component:** The horizon toggle (7 / 14 / 30 days) and the target toggle (Volume / Delay) are both small UI pieces that could be reused in other pages. Keeping them as separate components also makes `ForecastPage.tsx` easier to read.

**File to create:** `client/src/components/HorizonToggle.tsx`

```typescript
import React from 'react';

// Props this component receives from its parent
interface HorizonToggleProps {
  selected: 7 | 14 | 30;                          // Currently active horizon
  onChange: (horizon: 7 | 14 | 30) => void;       // Called when user clicks a button
}

// The three possible horizons
const HORIZONS: Array<7 | 14 | 30> = [7, 14, 30];

export default function HorizonToggle({ selected, onChange }: HorizonToggleProps) {
  return (
    <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
      {HORIZONS.map((h) => (
        <button
          key={h}
          onClick={() => onChange(h)}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
            selected === h
              ? 'bg-white text-indigo-600 shadow-sm font-semibold'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {h}d
        </button>
      ))}
    </div>
  );
}
```

**How it works:** The parent (`ForecastPage`) owns the `selected` state. When the user clicks a button, `onChange(h)` is called, which triggers `setHorizon(h)` in the parent, which triggers a new API call. The component itself is "dumb" — it just renders buttons and fires callbacks.

---

### Step D — Create `TargetToggle.tsx`

**File to create:** `client/src/components/TargetToggle.tsx`

```typescript
import React from 'react';

interface TargetToggleProps {
  selected: 'volume' | 'delay';
  onChange: (target: 'volume' | 'delay') => void;
}

export default function TargetToggle({ selected, onChange }: TargetToggleProps) {
  return (
    <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => onChange('volume')}
        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
          selected === 'volume'
            ? 'bg-white text-indigo-600 shadow-sm font-semibold'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        Decision Volume
      </button>
      <button
        onClick={() => onChange('delay')}
        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
          selected === 'delay'
            ? 'bg-white text-indigo-600 shadow-sm font-semibold'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        Approval Delay
      </button>
    </div>
  );
}
```

---

### Step E — Create `ForecastChart.tsx`

**Why ECharts instead of Recharts for this chart:** The confidence band (shaded area between upper and lower bounds) requires stacked area series with transparency, which Apache ECharts handles more cleanly than Recharts for this specific pattern.

**How the confidence band works visually:**
```
Upper bound  ─ ─ ─ ─ ─ ─ ─ ─ ─  (dashed or faded)
             ░░░░░░░░░░░░░░░░░░░  (shaded confidence band area)
Prediction   ────────────────────  (solid line, main forecast)
             ░░░░░░░░░░░░░░░░░░░  (shaded confidence band area)
Lower bound  ─ ─ ─ ─ ─ ─ ─ ─ ─  (dashed or faded)
```

**File to create:** `client/src/components/ForecastChart.tsx`

```typescript
import React from 'react';
import ReactECharts from 'echarts-for-react';
import { ForecastPoint } from '../types';

interface ForecastChartProps {
  data: ForecastPoint[];     // The forecast data array from the API
  target: 'volume' | 'delay'; // Changes y-axis label
  horizon: 7 | 14 | 30;      // Changes chart title
  department: string;         // Shows in chart subtitle
}

export default function ForecastChart({ data, target, horizon, department }: ForecastChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        No forecast data available
      </div>
    );
  }

  // Extract arrays for each series
  const dates = data.map((d) => d.ds.split('T')[0]); // Just the date part
  const predicted = data.map((d) => parseFloat(d.yhat.toFixed(1)));
  const upper = data.map((d) => parseFloat(d.yhat_upper.toFixed(1)));
  const lower = data.map((d) => parseFloat(d.yhat_lower.toFixed(1)));

  // Y-axis label changes based on what we're forecasting
  const yAxisLabel = target === 'volume' ? 'Decisions per Day' : 'Approval Time (hours)';
  const chartTitle = `${horizon}-Day Forecast — ${department === 'org' ? 'Organisation' : department}`;

  const option = {
    title: {
      text: chartTitle,
      subtext: target === 'volume' ? 'Predicted decision volume with 80% confidence band' : 'Predicted approval delay with 80% confidence band',
      left: 'center',
      textStyle: { fontSize: 14, color: '#1F3A6E' },
      subtextStyle: { fontSize: 11, color: '#888' },
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        // Show all three values in tooltip
        const date = params[0].axisValue;
        let html = `<b>${date}</b><br/>`;
        params.forEach((p: any) => {
          if (p.seriesName !== 'Lower') { // Skip the lower band line
            html += `${p.marker} ${p.seriesName}: <b>${p.value}</b><br/>`;
          }
        });
        return html;
      },
    },
    legend: {
      data: ['Predicted', 'Upper Bound', 'Lower Bound'],
      bottom: 0,
    },
    grid: { left: 60, right: 30, top: 80, bottom: 50 },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: { fontSize: 11, rotate: 30 },
    },
    yAxis: {
      type: 'value',
      name: yAxisLabel,
      nameLocation: 'middle',
      nameGap: 45,
      axisLabel: { fontSize: 11 },
    },
    series: [
      // Upper bound — drawn first, fills down with transparent blue
      {
        name: 'Upper Bound',
        type: 'line',
        data: upper,
        lineStyle: { opacity: 0 },         // Hide the line itself
        areaStyle: {
          color: 'rgba(99, 102, 241, 0.15)', // Transparent indigo fill
          origin: 'auto',
        },
        symbol: 'none',                     // No dots on line
        stack: 'confidence',               // Stack with lower for band effect
      },
      // Lower bound — stacked under upper, white fill erases the bottom
      {
        name: 'Lower Bound',
        type: 'line',
        data: lower,
        lineStyle: { opacity: 0 },
        areaStyle: { color: '#ffffff' },    // White erases the area below lower
        symbol: 'none',
        stack: 'confidence',
      },
      // Predicted line — the main line on top of the band
      {
        name: 'Predicted',
        type: 'line',
        data: predicted,
        lineStyle: { color: '#E8700A', width: 2.5 },
        itemStyle: { color: '#E8700A' },
        symbol: 'circle',
        symbolSize: 5,
        smooth: true,                       // Smooth curve instead of straight segments
      },
    ],
  };

  return (
    <div className="bg-white rounded-xl border p-4">
      <ReactECharts
        option={option}
        style={{ height: '380px', width: '100%' }}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
}
```

---

### Step F — Create `ForecastPage.tsx`

**Why this is last:** `ForecastPage` is the container that uses all the components you just built. Building the sub-components first means this file can import them cleanly.

**File to create:** `client/src/pages/ForecastPage.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { getForecast } from '../services/api';
import { ForecastResponse } from '../types';
import ForecastChart from '../components/ForecastChart';
import HorizonToggle from '../components/HorizonToggle';
import TargetToggle from '../components/TargetToggle';
import SkeletonLoader from '../components/SkeletonLoader';

// The list of departments to show in the dropdown
// In a production app this would come from an API call
// For now, hardcoded to match what's in the database
const DEPARTMENTS = [
  { id: 'org', label: 'All Departments (Org)' },
  { id: 'FI001', label: 'Finance' },
  { id: 'HR001', label: 'Human Resources' },
  { id: 'OPS001', label: 'Operations' },
  { id: 'LEGAL001', label: 'Legal' },
  { id: 'IT001', label: 'IT' },
];

export default function ForecastPage() {
  // State — these are the three controls the user can change
  const [deptId, setDeptId] = useState<string>('org');
  const [horizon, setHorizon] = useState<7 | 14 | 30>(30);
  const [target, setTarget] = useState<'volume' | 'delay'>('volume');

  // State — these track what is happening with the API call
  const [data, setData] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // useEffect — whenever deptId, horizon, or target changes, fetch new forecast data
  // The dependency array [deptId, horizon, target] means:
  // "run this effect whenever any of these three values change"
  useEffect(() => {
    let cancelled = false; // Prevents setting state if component unmounts mid-fetch

    async function loadForecast() {
      setLoading(true);
      setError(null);
      try {
        const result = await getForecast(deptId, horizon, target);
        if (!cancelled) {
          setData(result);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.response?.data?.error || 'Failed to load forecast data. Is the backend running?');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadForecast();

    // Cleanup: if this effect re-runs before the fetch finishes, cancel the old one
    return () => { cancelled = true; };
  }, [deptId, horizon, target]);

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Decision Forecasting</h1>
        <p className="text-sm text-gray-500 mt-1">
          Prophet time-series predictions trained on historical KPI data. Runs nightly at 02:00.
        </p>
      </div>

      {/* Controls row — department selector + toggles */}
      <div className="flex flex-wrap items-center gap-4 bg-white rounded-xl border p-4">
        {/* Department selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">Department:</label>
          <select
            value={deptId}
            onChange={(e) => setDeptId(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {DEPARTMENTS.map((d) => (
              <option key={d.id} value={d.id}>{d.label}</option>
            ))}
          </select>
        </div>

        {/* Horizon toggle */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">Horizon:</label>
          <HorizonToggle selected={horizon} onChange={setHorizon} />
        </div>

        {/* Target toggle */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">Forecast:</label>
          <TargetToggle selected={target} onChange={setTarget} />
        </div>
      </div>

      {/* Chart area — shows skeleton, error, or chart */}
      {loading && (
        <div className="bg-white rounded-xl border p-4">
          <SkeletonLoader rows={6} />
        </div>
      )}

      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      {!loading && !error && data && (
        <ForecastChart
          data={data.forecastData}
          target={target}
          horizon={horizon}
          department={deptId}
        />
      )}

      {/* Info box — explains what the user is seeing */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
        <strong>How to read this chart:</strong> The solid line is the model's predicted value.
        The shaded band is the 80% confidence interval — the model predicts the real value will fall
        inside this band 80% of the time. A widening band means the model is less certain about
        predictions further in the future.
      </div>
    </div>
  );
}
```

---

### Step G — Wire the Route in `App.tsx`

**File to modify:** `client/src/App.tsx`

Find the line that routes `/forecast` to `PlaceholderPage` and replace it:

```typescript
// Add this import at the top of the file with the other page imports:
import ForecastPage from './pages/ForecastPage';

// Find this line:
<Route path="/forecast" element={<PlaceholderPage />} />

// Replace it with:
<Route path="/forecast" element={<ForecastPage />} />
```

---

### 📦 Packages Needed

ECharts should already be installed from the Dashboard page. If not:

```bash
cd client
npm install echarts echarts-for-react
```

Verify with:

```bash
node -e "require('./node_modules/echarts-for-react'); console.log('echarts-for-react: ok')"
```

---

### 💻 Commands to Run

```bash
# Terminal 1 — ML service must be running for forecasts to exist in DB
cd ml_service
python -m uvicorn main:app --port 8000 --reload

# Terminal 2 — Backend
cd server
npm run dev

# Terminal 3 — Frontend
cd client
npm run dev
```

---

### ✅ How to Validate — Step by Step

**Step 1 — TypeScript build check:**
```bash
cd client
npx tsc --noEmit
```
Expected: zero errors. If you see type errors, fix them before moving on.

**Step 2 — Navigate to /forecast in browser:**
- Open `http://localhost:5173/forecast`
- Expected: Page renders with controls row visible
- Expected: Spinner/skeleton appears for ~1 second, then the chart renders
- Not expected: Blank white screen or unhandled error

**Step 3 — Horizon toggle:**
- Click "7d" → chart updates to show 7 data points
- Click "14d" → chart updates to show 14 data points
- Click "30d" → chart updates to show 30 data points
- Each click triggers a new API call (watch network tab in browser DevTools)

**Step 4 — Target toggle:**
- Switch to "Approval Delay" → chart title updates, y-axis label changes to "hours"
- Switch back to "Decision Volume" → resets

**Step 5 — Department selector:**
- Change from "All Departments" to "Finance" → chart updates with FI001 data

**Step 6 — Error state:**
- Stop the Node backend (`Ctrl+C` in Terminal 2)
- Refresh `/forecast`
- Expected: Skeleton for 2–3 seconds, then red error banner appears
- Not expected: Blank screen or JavaScript crash

**Step 7 — Tooltip:**
- Hover over any data point on the chart
- Expected: Tooltip shows date, predicted value, and upper bound

---

### 🖥️ UI Specification — What the Page Should Look Like

```
/forecast
┌──────────────────────────────────────────────────────────────────────┐
│  Decision Forecasting                                                 │
│  Prophet time-series predictions trained on historical KPI data      │
├──────────────────────────────────────────────────────────────────────┤
│  Department: [All Departments ▼]   Horizon: [7d][14d][30d]          │
│  Forecast:   [Decision Volume] [Approval Delay]                      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│   30-Day Forecast — Organisation                                      │
│   Predicted decision volume with 80% confidence band                 │
│                                                                       │
│  25 │         ╭─────╮                                                │
│  20 │   ╭─────╯░░░░░╰─────╮                                          │
│  15 │───╯░░░░░░░░░░░░░░░░░╰─────────────────────────                │
│  10 │                                                                 │
│     Apr 12   Apr 16    Apr 20    Apr 25    Apr 30   May 5            │
│                                                                       │
│  ── Predicted    ░ Confidence Band                                   │
└──────────────────────────────────────────────────────────────────────┘
│  How to read: The solid line is the prediction. The shaded band is   │
│  the 80% confidence interval.                                         │
└──────────────────────────────────────────────────────────────────────┘
```

---

### 📋 Day 9 Outcome

`ForecastPage.tsx` is live at `/forecast`. Users can select any department, horizon (7/14/30 days), and target (volume/delay) and see the Prophet confidence band chart. The page handles loading states with a skeleton and API failures with an error banner. Day 10 will build the Random Forest risk scoring pipeline to replace the stub in `risk_service.py`.

---

---

## Day 10 — Risk Scoring Backend: Train Random Forest + Build riskScoringJob.ts

### 🎯 Goal & Reasoning

Currently, `ml_service/app/services/risk_service.py` contains a stub that returns `riskScore: 0.0` and `riskLevel: 'Low'` for every department regardless of actual data. This means the `riskScore` and `riskLevel` fields in `m3_kpi_snapshots` are either `0` and `'Low'` or simply not populated.

Today you fix this completely:
1. Write `train_risk_model.py` — a Python script that trains a Random Forest classifier on risk features and saves the model to disk as `random_forest.pkl`
2. Replace the stub `risk_service.py` with a real implementation that loads the saved model and produces genuine predictions
3. Publish the `/ml/risk/score` endpoint in FastAPI's `main.py`
4. Create `riskScoringJob.ts` — a Node.js cron job that runs daily at 01:00, assembles feature vectors per department, calls FastAPI, and writes the real `riskScore` and `riskLevel` back into `m3_kpi_snapshots`
5. Register the job in `server.ts` and add an npm script to run it manually

**Why Random Forest for risk scoring?**
A Random Forest is an ensemble of decision trees. Each tree votes on the risk level, and the majority vote wins. Using many trees instead of one prevents overfitting — one tree might memorize training data quirks, but 200 trees voting together are more robust. The model's `feature_importances_` property tells you exactly which features (violation count, compliance rate, etc.) influenced the risk classification most, which is what the Risk Score page will display.

---

### Current State (What's in the Repo Right Now)

- `ml_service/app/services/risk_service.py` — **EXISTS but is a stub** — returns zeros
- `ml_service/app/routes/ml_routes.py` — defines a `/risk` handler but it calls the stub
- `ml_service/main.py` — does NOT currently expose a `/ml/risk/score` endpoint
- `server/models/KPI_Snapshot.ts` — **already has `riskScore` and `riskLevel` fields** — the schema is ready
- There is **NO** `ml_service/training/train_risk_model.py`
- There is **NO** `ml_service/models/random_forest.pkl`
- There is **NO** `server/jobs/riskScoringJob.ts`

---

### Step A — Install Required Python Packages

These should already be installed from the anomaly detection pipeline (scikit-learn was used for Isolation Forest). Verify:

```bash
cd ml_service
python -c "import sklearn; print('scikit-learn version:', sklearn.__version__)"
python -c "import pandas; print('pandas version:', pandas.__version__)"
python -c "import numpy; print('numpy version:', numpy.__version__)"
python -c "import joblib; print('joblib version:', joblib.__version__)"
```

**Expected output:** Version numbers printed for each, no ImportError.

**If any package is missing:**
```bash
pip install scikit-learn pandas numpy joblib --break-system-packages
```

The `--break-system-packages` flag is required on Ubuntu 24 when pip is used outside a virtual environment.

---

### Step B — Create `ml_service/training/train_risk_model.py`

**What this script does:**
1. Defines the 7 features used for risk classification
2. Since we may not have large labeled datasets from real `m2_risks` data in development, generates realistic synthetic training data using NumPy's random functions with distributions that match what real governance risk data looks like
3. Trains a `RandomForestClassifier` with 200 trees, max depth 10, and `class_weight='balanced'` (so rare Critical samples are weighted higher)
4. Wraps the scaler and classifier in a `Pipeline` so both are saved together in one file
5. Saves to `ml_service/models/random_forest.pkl`

**File to create:** `ml_service/training/train_risk_model.py`

```python
"""
Train the Random Forest risk scoring model for GovVision Module 3.

Features used:
  - violationCount: number of policy violations in last 30 days
  - openViolationRate: fraction of violations still open (0.0 to 1.0)
  - avgCompositeRisk: average composite risk score from m2_risks (0 to 100)
  - overdueCount: number of decisions past their SLA deadline
  - complianceRate: percentage of decisions that passed compliance checks (0 to 100)
  - policyBreachFreq: violations per 100 decisions (frequency metric)
  - escalationCount: number of decisions that were escalated

Target classes:
  0 = Low
  1 = Medium
  2 = High
  3 = Critical
"""

import numpy as np
import pandas as pd
import joblib
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

# ─── Paths ────────────────────────────────────────────────────────────────────
# __file__ is this script
# .parents[1] goes up one level from training/ to ml_service/
MODELS_DIR = Path(__file__).resolve().parents[1] / 'models'
MODELS_DIR.mkdir(exist_ok=True)  # Create models/ folder if it doesn't exist
OUTPUT_PATH = MODELS_DIR / 'random_forest.pkl'

# ─── Synthetic Training Data ──────────────────────────────────────────────────
# In production, you would load real labeled data from MongoDB here.
# For development, we generate synthetic data with realistic distributions.
np.random.seed(42)  # Fix seed so training is reproducible
N = 800             # Total training samples

print("Generating synthetic training data...")

X = pd.DataFrame({
    # Violations follow a Poisson distribution (count data, always >= 0)
    'violationCount': np.random.poisson(lam=3, size=N),
    
    # Open rate is a fraction between 0 and 1, Beta distribution is good for this
    'openViolationRate': np.random.beta(a=2, b=5, size=N),
    
    # Composite risk score from 0 to 100
    'avgCompositeRisk': np.random.uniform(low=0, high=100, size=N),
    
    # Overdue count follows Poisson
    'overdueCount': np.random.poisson(lam=2, size=N),
    
    # Compliance rate: realistic range is 50–100%
    'complianceRate': np.random.uniform(low=50, high=100, size=N),
    
    # Breach frequency: exponential (most depts have low frequency, few have high)
    'policyBreachFreq': np.random.exponential(scale=0.5, size=N),
    
    # Escalation count: Poisson
    'escalationCount': np.random.poisson(lam=1, size=N),
})

# ─── Label Generation ─────────────────────────────────────────────────────────
# Risk level is primarily driven by avgCompositeRisk, with violations adding noise
# np.where works like: np.where(condition, value_if_true, value_if_false)
risk_score_composite = (
    X['avgCompositeRisk'] * 0.4
    + X['violationCount'] * 3
    + X['openViolationRate'] * 20
    + X['overdueCount'] * 2
    + (100 - X['complianceRate']) * 0.5
)

y = np.where(risk_score_composite < 20, 0,
    np.where(risk_score_composite < 40, 1,
    np.where(risk_score_composite < 65, 2, 3)))

print(f"Training samples: {N}")
print(f"Class distribution: Low={np.sum(y==0)}, Medium={np.sum(y==1)}, High={np.sum(y==2)}, Critical={np.sum(y==3)}")

# ─── Train/Test Split ─────────────────────────────────────────────────────────
# Hold out 20% for evaluation so we can see how well the model performs
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# ─── Pipeline: Scaler + Classifier ───────────────────────────────────────────
# Why Pipeline? So when we save to .pkl, both the scaler (fitted to training data)
# and the classifier are saved together. When loading for prediction, the scaler
# automatically transforms features the same way as during training.
print("\nTraining RandomForestClassifier (200 trees)...")
pipeline = Pipeline([
    ('scaler', StandardScaler()),  # Normalise features to zero-mean, unit-variance
    ('classifier', RandomForestClassifier(
        n_estimators=200,          # 200 decision trees
        max_depth=10,              # Max depth prevents overfitting
        class_weight='balanced',   # Upweight rare Critical samples
        random_state=42,
        n_jobs=-1,                 # Use all CPU cores for training
    )),
])

pipeline.fit(X_train, y_train)

# ─── Evaluation ───────────────────────────────────────────────────────────────
print("\nModel evaluation on held-out test set:")
y_pred = pipeline.predict(X_test)
print(classification_report(y_test, y_pred, target_names=['Low', 'Medium', 'High', 'Critical']))

# ─── Feature Importance ───────────────────────────────────────────────────────
feature_names = X.columns.tolist()
importances = pipeline.named_steps['classifier'].feature_importances_
print("\nFeature importances:")
for name, imp in sorted(zip(feature_names, importances), key=lambda x: -x[1]):
    print(f"  {name:25s}: {imp:.4f} ({imp*100:.1f}%)")

# ─── Save Model ───────────────────────────────────────────────────────────────
joblib.dump(pipeline, OUTPUT_PATH)
print(f"\nModel saved to: {OUTPUT_PATH}")
print("Training complete.")
```

Run it:

```bash
cd ml_service
python training/train_risk_model.py
```

**Expected output:**
```
Generating synthetic training data...
Training samples: 800
Class distribution: Low=..., Medium=..., High=..., Critical=...

Training RandomForestClassifier (200 trees)...

Model evaluation on held-out test set:
              precision    recall  f1-score   support
         Low       0.xx      0.xx      0.xx        xx
      Medium       0.xx      0.xx      0.xx        xx
        High       0.xx      0.xx      0.xx        xx
    Critical       0.xx      0.xx      0.xx        xx

Feature importances:
  avgCompositeRisk         : 0.xxxx (xx.x%)
  violationCount           : 0.xxxx (xx.x%)
  ...

Model saved to: ml_service/models/random_forest.pkl
Training complete.
```

**Verify the file was created:**
```bash
ls -lh ml_service/models/random_forest.pkl
```
Expected: File exists with size around 5–20 MB.

---

### Step C — Replace the Stub in `ml_service/app/services/risk_service.py`

**Current (stub) content of this file:**
```python
# Stub — returns zeros for everything
def score_departments(features):
    return [{'dept': f['dept'], 'score': 0.0, 'level': 'Low'} for f in features]
```

**Replace the entire file with:**

```python
"""
Real Random Forest risk scoring service.
Loads the trained model and produces genuine risk scores per department.
"""

import joblib
import pandas as pd
import numpy as np
from pathlib import Path

# Path to the saved model
MODELS_DIR = Path(__file__).resolve().parents[2] / 'models'
MODEL_PATH = MODELS_DIR / 'random_forest.pkl'

# Map numeric class indices back to human-readable labels
LEVEL_MAP = {0: 'Low', 1: 'Medium', 2: 'High', 3: 'Critical'}

# These must match exactly what was used during training
FEATURE_COLS = [
    'violationCount',
    'openViolationRate',
    'avgCompositeRisk',
    'overdueCount',
    'complianceRate',
    'policyBreachFreq',
    'escalationCount',
]


def load_model():
    """Load the trained pipeline from disk. Raises FileNotFoundError if not trained."""
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"random_forest.pkl not found at {MODEL_PATH}. "
            "Run: python training/train_risk_model.py"
        )
    return joblib.load(MODEL_PATH)


def score_departments(features: list) -> list:
    """
    Score a list of departments.
    
    Args:
        features: List of dicts, each with keys matching FEATURE_COLS plus 'dept'
    
    Returns:
        List of dicts with keys: dept, score, level, featureImportance
    """
    model = load_model()
    
    # Build DataFrame from input
    df = pd.DataFrame(features)
    
    # Fill any missing feature values with 0
    for col in FEATURE_COLS:
        if col not in df.columns:
            df[col] = 0
    
    X = df[FEATURE_COLS].fillna(0)
    
    # Get predictions and probabilities
    predictions = model.predict(X)
    probabilities = model.predict_proba(X)  # Shape: (n_depts, 4)
    
    # Get feature importances from the Random Forest inside the pipeline
    importances = model.named_steps['classifier'].feature_importances_
    
    results = []
    for i, dept_features in enumerate(features):
        # Use the probability of the predicted class as the "score" (0–100)
        predicted_class = int(predictions[i])
        confidence = float(probabilities[i][predicted_class])
        
        # Scale: the score represents overall risk severity
        # Critical (class 3) with 90% confidence = high score
        raw_score = (predicted_class / 3) * 70 + confidence * 30
        
        results.append({
            'dept': dept_features['dept'],
            'score': round(raw_score, 1),         # Score 0–100
            'level': LEVEL_MAP[predicted_class],   # Low/Medium/High/Critical
            'featureImportance': {
                name: round(float(imp), 4)
                for name, imp in zip(FEATURE_COLS, importances)
            },
        })
    
    return results
```

---

### Step D — Publish `/ml/risk/score` in `ml_service/main.py`

**Why this needs to be added:** The endpoint handler exists in `ml_routes.py` but was never added to `main.py`'s router. Open `ml_service/main.py` and find where other routes are registered. Add:

```python
from app.services.risk_service import score_departments
from pydantic import BaseModel
from typing import List, Dict, Any

class RiskFeature(BaseModel):
    dept: str
    violationCount: float = 0
    openViolationRate: float = 0
    avgCompositeRisk: float = 0
    overdueCount: float = 0
    complianceRate: float = 75
    policyBreachFreq: float = 0
    escalationCount: float = 0

class RiskScoreRequest(BaseModel):
    features: List[RiskFeature]

@app.post("/ml/risk/score")
def risk_score(payload: RiskScoreRequest):
    """
    Score risk level for each department.
    Called by server/jobs/riskScoringJob.ts via SERVICE_KEY.
    """
    features = [f.dict() for f in payload.features]
    scores = score_departments(features)
    return {"scores": scores}
```

**Test it immediately:**
```bash
# Restart the ML service to pick up changes
cd ml_service
python -m uvicorn main:app --port 8000 --reload

# In a separate terminal, test the endpoint
curl -X POST http://localhost:8000/ml/risk/score \
  -H "Content-Type: application/json" \
  -H "x-service-key: YOUR_SERVICE_KEY" \
  -d '{
    "features": [
      {
        "dept": "FI001",
        "violationCount": 8,
        "openViolationRate": 0.6,
        "avgCompositeRisk": 72,
        "overdueCount": 5,
        "complianceRate": 61,
        "policyBreachFreq": 2.1,
        "escalationCount": 3
      }
    ]
  }'
```

**Expected response (not zeros this time!):**
```json
{
  "scores": [
    {
      "dept": "FI001",
      "score": 74.3,
      "level": "High",
      "featureImportance": {
        "violationCount": 0.1842,
        "openViolationRate": 0.1234,
        "avgCompositeRisk": 0.3241,
        "overdueCount": 0.0987,
        "complianceRate": 0.1654,
        "policyBreachFreq": 0.0743,
        "escalationCount": 0.0299
      }
    }
  ]
}
```

---

### Step E — Create `server/jobs/riskScoringJob.ts`

**What this job does:**
1. Queries `m3_kpi_snapshots` to get the list of all unique departments
2. For each department, reads the most recent KPI snapshot to assemble feature values
3. Sends all department feature vectors to FastAPI in one batch
4. Receives back risk scores and levels
5. Updates every KPI snapshot for that department with the new `riskScore` and `riskLevel`
6. Invalidates the Redis cache for each department's risk score
7. Is scheduled to run daily at 01:00 AM

**File to create:** `server/jobs/riskScoringJob.ts`

```typescript
import cron from 'node-cron';
import axios from 'axios';
import KPISnapshot from '../models/KPI_Snapshot';
import { invalidate } from '../services/cacheService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RiskFeatureVector {
  dept: string;
  violationCount: number;
  openViolationRate: number;
  avgCompositeRisk: number;
  overdueCount: number;
  complianceRate: number;
  policyBreachFreq: number;
  escalationCount: number;
}

interface RiskScore {
  dept: string;
  score: number;
  level: 'Low' | 'Medium' | 'High' | 'Critical';
  featureImportance: Record<string, number>;
}

// ─── Main Job Function ─────────────────────────────────────────────────────────

export async function runRiskScoringJob(): Promise<void> {
  console.log('[RiskJob] Starting risk scoring run...');

  // Step 1: Get all distinct department IDs from KPI snapshots
  // This tells us which departments we have data for
  const departments = await KPISnapshot.distinct('departmentId') as string[];

  if (departments.length === 0) {
    console.log('[RiskJob] No departments found in KPI snapshots. Run seed data first.');
    return;
  }

  console.log(`[RiskJob] Scoring ${departments.length} departments: ${departments.join(', ')}`);

  // Step 2: Build feature vector for each department
  // We read the most recent KPI snapshot per department for the current feature values
  const features: RiskFeatureVector[] = await Promise.all(
    departments.map(async (dept: string) => {
      // Get the most recent snapshot for this department
      const snapshot = await KPISnapshot
        .findOne({ departmentId: dept })
        .sort({ date: -1 }) // Most recent first
        .lean();

      // Use snapshot values if available, fall back to safe defaults if not
      return {
        dept,
        // These field names must match what risk_service.py expects
        violationCount: (snapshot as any)?.violationCount ?? 0,
        openViolationRate: (snapshot as any)?.openViolationRate ?? 0,
        avgCompositeRisk: (snapshot as any)?.avgCompositeRisk ?? 0,
        overdueCount: (snapshot as any)?.overdueApprovalCount ?? 0,
        complianceRate: (snapshot as any)?.complianceRate ?? 75,
        policyBreachFreq: (snapshot as any)?.policyBreachFrequency ?? 0,
        escalationCount: (snapshot as any)?.escalationCount ?? 0,
      };
    })
  );

  // Step 3: Call FastAPI with all department feature vectors in one batch
  let scores: RiskScore[] = [];
  try {
    const response = await axios.post<{ scores: RiskScore[] }>(
      `${process.env.ML_SERVICE_URL}/ml/risk/score`,
      { features },
      {
        headers: { 'x-service-key': process.env.SERVICE_KEY },
        timeout: 30000, // 30 second timeout
      }
    );
    scores = response.data.scores;
    console.log(`[RiskJob] FastAPI returned scores for ${scores.length} departments`);
  } catch (err: any) {
    console.error('[RiskJob] FastAPI call failed:', err.message);
    console.error('[RiskJob] Is the ML service running at', process.env.ML_SERVICE_URL, '?');
    return; // Don't update MongoDB with stale data if the ML service failed
  }

  // Step 4: Write risk scores back to KPI snapshots + invalidate Redis cache
  for (const score of scores) {
    // Update ALL snapshots for this department (historical ones too)
    // This ensures the risk heatmap always has data to show
    const updateResult = await KPISnapshot.updateMany(
      { departmentId: score.dept },
      {
        $set: {
          riskScore: score.score,
          riskLevel: score.level,
        },
      }
    );

    console.log(
      `[RiskJob] Updated ${updateResult.modifiedCount} snapshots for ${score.dept}: ` +
      `score=${score.score}, level=${score.level}`
    );

    // Invalidate the Redis cache for this department's risk data
    // So the next API request fetches fresh data instead of stale cached data
    await invalidate(`m3:riskscore:${score.dept}`);
    await invalidate(`m3:riskheatmap:*`); // Heatmap aggregation also needs to refresh
  }

  console.log('[RiskJob] Risk scoring run complete.');
}

// ─── Cron Schedule ─────────────────────────────────────────────────────────────
// '0 1 * * *' means: at minute 0 of hour 1, every day
// In plain English: daily at 01:00 AM
cron.schedule('0 1 * * *', () => {
  runRiskScoringJob().catch((err) => {
    console.error('[RiskJob] Uncaught error in cron run:', err);
  });
});

console.log('[RiskJob] Scheduled: daily at 01:00.');
```

---

### Step F — Register the Job in `server/server.ts`

Open `server/server.ts` and add this import alongside the other job imports:

```typescript
import './jobs/riskScoringJob'; // registers cron schedule at 01:00 daily
```

**Why just importing it is enough:** The file has a `cron.schedule(...)` call at the module level. When Node.js imports the file, that line runs and registers the schedule. You don't need to call any function — the import itself is the trigger.

---

### Step G — Add npm Script for Manual Triggering

Open `server/package.json` and add to the `"scripts"` section:

```json
"run:risk-job": "npx ts-node -e \"import('./jobs/riskScoringJob').then(m => m.runRiskScoringJob())\""
```

---

### 💻 Commands to Run

```bash
# Terminal 1: ML service
cd ml_service
python -m uvicorn main:app --port 8000 --reload

# Terminal 2: Node backend
cd server
npm run dev
# Look for: [RiskJob] Scheduled: daily at 01:00.

# Terminal 3: Manually trigger the risk job
cd server
npm run run:risk-job
```

---

### ✅ How to Validate

**Step 1 — TypeScript check:**
```bash
cd server
npx tsc --noEmit
```
Expected: zero errors.

**Step 2 — Check the job runs successfully:**
After `npm run run:risk-job`, look for logs:
```
[RiskJob] Starting risk scoring run...
[RiskJob] Scoring 5 departments: FI001, HR001, OPS001, LEGAL001, IT001
[RiskJob] FastAPI returned scores for 5 departments
[RiskJob] Updated X snapshots for FI001: score=74.3, level=High
[RiskJob] Updated X snapshots for HR001: score=31.2, level=Medium
...
[RiskJob] Risk scoring run complete.
```

**Step 3 — Verify MongoDB was updated with real scores:**
```bash
cd server
npx ts-node -e "
const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const K = require('./models/KPI_Snapshot').default;
  const samples = await K.find({}).select('departmentId riskScore riskLevel').limit(5).lean();
  samples.forEach(s => console.log(s.departmentId, '- score:', s.riskScore, '- level:', s.riskLevel));
  mongoose.disconnect();
});
"
```

**Expected:** Real, different scores per department. NOT all `0` and NOT all `'Low'`.

**Step 4 — Confirm the risk heatmap API now returns real data:**
```bash
curl -H "Authorization: Bearer YOUR_JWT" \
  "http://localhost:5002/api/analytics/risk-heatmap"
```
Expected: Each department now has non-zero counts in High/Critical buckets (if scores warrant it).

---

### 📋 Day 10 Outcome

The Random Forest model is trained and saved. `risk_service.py` now produces real predictions instead of zeros. The FastAPI endpoint `/ml/risk/score` is live. `riskScoringJob.ts` runs daily at 01:00 and writes real `riskScore` and `riskLevel` values into every `m3_kpi_snapshots` document. The dashboard's risk heatmap section now shows meaningful data. Day 11 builds the standalone Risk Score page that displays all this data.

---

---

## Day 11 — Risk Score Frontend: RiskPage.tsx, RiskTable, RiskPieChart, FeatureBreakdownModal

### 🎯 Goal & Reasoning

The project spec (GovVision.md section 4.2) describes a **"Risk Score Dashboard"** page with: a department risk score ranking table, a risk level distribution pie chart, score trend over time, and a feature importance bar chart. Currently `/risk` routes to `PlaceholderPage`. Today you build all of this.

This page reads from the existing `GET /api/analytics/risk-heatmap` endpoint which now returns real data thanks to Day 10.

---

### Pages / Components Being Created Today

| File | What It Is |
|---|---|
| `client/src/pages/RiskPage.tsx` | The full `/risk` page — fetches data, manages filter state, assembles components |
| `client/src/components/RiskTable.tsx` | Department ranking table with score bars and level badges |
| `client/src/components/RiskLevelBadge.tsx` | A coloured badge that shows Low/Medium/High/Critical |
| `client/src/components/RiskPieChart.tsx` | ECharts pie chart showing distribution of risk levels |
| `client/src/components/FeatureBreakdownModal.tsx` | Modal opened on row click, shows which features drove the risk |

Modifications to existing files:
| File | What Changes |
|---|---|
| `client/src/types/index.ts` | Add `RiskEntry` and `RiskHeatmapResponse` interfaces |
| `client/src/services/api.ts` | Verify `getRiskHeatmap()` exists (or add it) |
| `client/src/App.tsx` | Replace `PlaceholderPage` with `RiskPage` for `/risk` route |

---

### Step A — Add Risk Types to `client/src/types/index.ts`

```typescript
// ─── Risk Score Types ─────────────────────────────────────────────────────────

// Represents one department's risk data as returned by GET /api/analytics/risk-heatmap
export interface RiskEntry {
  departmentId: string;
  department: string;          // Display name
  riskScore: number;           // 0–100
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  // Count of KPI snapshot days at each risk level (used for pie chart aggregation)
  Low: number;
  Medium: number;
  High: number;
  Critical: number;
  // Feature importance — populated if Day 10 risk job stored it
  featureImportance?: Record<string, number>;
}

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

// Color mapping — used by badge and pie chart
export const RISK_LEVEL_COLORS: Record<RiskLevel, string> = {
  Low: '#4CAF50',       // Green
  Medium: '#FFC107',    // Amber
  High: '#FF9800',      // Orange
  Critical: '#F44336',  // Red
};
```

---

### Step B — Verify `getRiskHeatmap()` Exists in `api.ts`

Check `client/src/services/api.ts`. If `getRiskHeatmap` already exists (it was mentioned in the Doing_Progress2 log), leave it. If not, add:

```typescript
import { RiskEntry } from '../types';

// Fetch risk heatmap data for all departments
// Returns array of RiskEntry objects
export async function getRiskHeatmap(
  dateFrom?: string,
  dateTo?: string
): Promise<RiskEntry[]> {
  const res = await api.get<RiskEntry[]>('/analytics/risk-heatmap', {
    params: { dateFrom, dateTo },
  });
  // The API returns an array, but field names may be lowercase
  // Normalise to match our interface
  return res.data.map((row: any) => ({
    departmentId: row.deptId || row.departmentId || row._id,
    department: row.department || row.departmentId || row.deptId,
    riskScore: row.riskScore ?? 0,
    riskLevel: row.riskLevel ?? (row.Critical > 0 ? 'Critical' : row.High > 0 ? 'High' : row.Medium > 0 ? 'Medium' : 'Low'),
    Low: row.Low ?? row.low ?? 0,
    Medium: row.Medium ?? row.medium ?? 0,
    High: row.High ?? row.high ?? 0,
    Critical: row.Critical ?? row.critical ?? 0,
    featureImportance: row.featureImportance,
  }));
}
```

---

### Step C — Create `RiskLevelBadge.tsx`

**Why a separate component?** The badge (coloured pill with text "High" or "Critical") is used in multiple places — the table, the modal header. One component, used everywhere.

**File to create:** `client/src/components/RiskLevelBadge.tsx`

```typescript
import React from 'react';
import { RiskLevel, RISK_LEVEL_COLORS } from '../types';

interface Props {
  level: RiskLevel;
  size?: 'sm' | 'md';
}

// Background colors (lighter than text colors for contrast)
const BG_COLORS: Record<RiskLevel, string> = {
  Low: 'bg-green-100 text-green-800',
  Medium: 'bg-amber-100 text-amber-800',
  High: 'bg-orange-100 text-orange-800',
  Critical: 'bg-red-100 text-red-800',
};

export default function RiskLevelBadge({ level, size = 'md' }: Props) {
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';
  return (
    <span className={`inline-flex items-center font-semibold rounded-full ${sizeClass} ${BG_COLORS[level]}`}>
      {level}
    </span>
  );
}
```

---

### Step D — Create `RiskTable.tsx`

**What it shows:** A table sorted by risk score (highest first) with columns: Rank, Department, Risk Score (bar + number), Risk Level (badge), and an Action column.

**File to create:** `client/src/components/RiskTable.tsx`

```typescript
import React from 'react';
import { RiskEntry } from '../types';
import RiskLevelBadge from './RiskLevelBadge';

interface Props {
  data: RiskEntry[];
  onRowClick: (entry: RiskEntry) => void; // Called when user clicks a row
}

export default function RiskTable({ data, onRowClick }: Props) {
  // Sort by riskScore descending (highest risk at top)
  const sorted = [...data].sort((a, b) => b.riskScore - a.riskScore);

  if (sorted.length === 0) {
    return (
      <div className="text-center text-gray-500 py-12 text-sm">
        No risk data available. Run the risk scoring job first.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b">
            <th className="text-left px-4 py-3 font-semibold text-gray-600 w-12">#</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">Department</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600 w-64">Risk Score</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">Level</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">Details</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((entry, index) => (
            <tr
              key={entry.departmentId}
              className="border-b last:border-0 hover:bg-slate-50 cursor-pointer transition-colors"
              onClick={() => onRowClick(entry)}
            >
              <td className="px-4 py-3 text-gray-400 font-mono">{index + 1}</td>
              <td className="px-4 py-3 font-medium text-gray-900">{entry.department}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {/* Score bar */}
                  <div className="flex-1 bg-gray-100 rounded-full h-2 max-w-40">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min(entry.riskScore, 100)}%`,
                        backgroundColor:
                          entry.riskScore >= 75 ? '#F44336' :
                          entry.riskScore >= 50 ? '#FF9800' :
                          entry.riskScore >= 25 ? '#FFC107' : '#4CAF50',
                      }}
                    />
                  </div>
                  <span className="text-gray-700 font-mono text-xs w-10">
                    {entry.riskScore.toFixed(1)}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3">
                <RiskLevelBadge level={entry.riskLevel} />
              </td>
              <td className="px-4 py-3">
                <button className="text-indigo-600 hover:text-indigo-800 text-xs font-medium">
                  View breakdown →
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

### Step E — Create `RiskPieChart.tsx`

**File to create:** `client/src/components/RiskPieChart.tsx`

```typescript
import React from 'react';
import ReactECharts from 'echarts-for-react';
import { RiskEntry } from '../types';

interface Props {
  data: RiskEntry[];
}

export default function RiskPieChart({ data }: Props) {
  // Sum up counts across all departments for each risk level
  const totals = data.reduce(
    (acc, row) => ({
      Low: acc.Low + (row.Low || 0),
      Medium: acc.Medium + (row.Medium || 0),
      High: acc.High + (row.High || 0),
      Critical: acc.Critical + (row.Critical || 0),
    }),
    { Low: 0, Medium: 0, High: 0, Critical: 0 }
  );

  const chartData = [
    { value: totals.Low, name: 'Low', itemStyle: { color: '#4CAF50' } },
    { value: totals.Medium, name: 'Medium', itemStyle: { color: '#FFC107' } },
    { value: totals.High, name: 'High', itemStyle: { color: '#FF9800' } },
    { value: totals.Critical, name: 'Critical', itemStyle: { color: '#F44336' } },
  ].filter((d) => d.value > 0); // Only show levels that have data

  const option = {
    title: {
      text: 'Risk Level Distribution',
      subtext: 'Across all departments and time periods',
      left: 'center',
      textStyle: { fontSize: 13, color: '#1F3A6E' },
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} days ({d}%)',
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'middle',
    },
    series: [
      {
        name: 'Risk Level',
        type: 'pie',
        radius: ['40%', '70%'], // Donut chart
        center: ['40%', '55%'],
        data: chartData,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
        label: {
          formatter: '{b}\n{d}%',
          fontSize: 11,
        },
      },
    ],
  };

  return (
    <div className="bg-white rounded-xl border p-4">
      <ReactECharts option={option} style={{ height: '280px' }} />
    </div>
  );
}
```

---

### Step F — Create `FeatureBreakdownModal.tsx`

**What it shows:** When the user clicks a department row in the table, a modal slides in showing which features drove that department's risk score, displayed as a horizontal bar chart.

**File to create:** `client/src/components/FeatureBreakdownModal.tsx`

```typescript
import React from 'react';
import { RiskEntry } from '../types';
import RiskLevelBadge from './RiskLevelBadge';

interface Props {
  entry: RiskEntry | null;   // null means modal is closed
  onClose: () => void;
}

// Human-readable labels for feature names
const FEATURE_LABELS: Record<string, string> = {
  violationCount: 'Violation Count',
  openViolationRate: 'Open Violation Rate',
  avgCompositeRisk: 'Avg Composite Risk',
  overdueCount: 'Overdue Decision Count',
  complianceRate: 'Compliance Rate',
  policyBreachFreq: 'Policy Breach Frequency',
  escalationCount: 'Escalation Count',
};

// Colors for bars (from most to least important — gradient of purples)
const BAR_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe', '#f5f3ff'];

export default function FeatureBreakdownModal({ entry, onClose }: Props) {
  if (!entry) return null; // Modal is closed

  const features = entry.featureImportance
    ? Object.entries(entry.featureImportance)
        .map(([key, value]) => ({
          name: FEATURE_LABELS[key] || key,
          importance: value,
          percentage: (value * 100).toFixed(1),
        }))
        .sort((a, b) => b.importance - a.importance) // Most important first
    : [];

  return (
    // Backdrop — clicking it closes the modal
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Modal panel — stop click propagation so clicking inside doesn't close */}
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{entry.department}</h2>
            <p className="text-sm text-gray-500 mt-0.5">Risk Score: {entry.riskScore.toFixed(1)} / 100</p>
          </div>
          <div className="flex items-center gap-3">
            <RiskLevelBadge level={entry.riskLevel} />
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl font-light"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Feature importance bars */}
        <div className="p-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">
            Feature Importance (what drove this risk score)
          </h3>
          {features.length > 0 ? (
            features.map((f, i) => (
              <div key={f.name} className="space-y-1">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>{f.name}</span>
                  <span className="font-mono">{f.percentage}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${f.percentage}%`,
                      backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                    }}
                  />
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-400">
              Feature importance data not available. Re-run the risk scoring job.
            </p>
          )}
        </div>

        {/* Level counts */}
        <div className="px-5 pb-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Historical risk level distribution</h3>
          <div className="grid grid-cols-4 gap-2">
            {(['Low', 'Medium', 'High', 'Critical'] as const).map((level) => (
              <div key={level} className="text-center bg-gray-50 rounded-lg p-2">
                <div className="text-lg font-bold text-gray-800">{(entry as any)[level] ?? 0}</div>
                <RiskLevelBadge level={level} size="sm" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

### Step G — Create `RiskPage.tsx`

**File to create:** `client/src/pages/RiskPage.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { getRiskHeatmap } from '../services/api';
import { RiskEntry, RiskLevel } from '../types';
import RiskTable from '../components/RiskTable';
import RiskPieChart from '../components/RiskPieChart';
import RiskLevelBadge from '../components/RiskLevelBadge';
import FeatureBreakdownModal from '../components/FeatureBreakdownModal';
import SkeletonLoader from '../components/SkeletonLoader';

// Filter options for the level filter dropdown
const LEVEL_FILTERS: Array<'All' | RiskLevel> = ['All', 'Critical', 'High', 'Medium', 'Low'];

export default function RiskPage() {
  const [data, setData] = useState<RiskEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState<'All' | RiskLevel>('All');
  const [selectedEntry, setSelectedEntry] = useState<RiskEntry | null>(null); // For modal

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const rows = await getRiskHeatmap();
        setData(rows);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load risk data.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Apply level filter
  const filteredData = levelFilter === 'All'
    ? data
    : data.filter((row) => row.riskLevel === levelFilter);

  // Summary counts for the header stat cards
  const counts = {
    Critical: data.filter((r) => r.riskLevel === 'Critical').length,
    High: data.filter((r) => r.riskLevel === 'High').length,
    Medium: data.filter((r) => r.riskLevel === 'Medium').length,
    Low: data.filter((r) => r.riskLevel === 'Low').length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Risk Score Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Random Forest risk classification updated daily at 01:00. Click any department for feature breakdown.
        </p>
      </div>

      {/* Summary stat cards */}
      {!loading && !error && (
        <div className="grid grid-cols-4 gap-4">
          {(['Critical', 'High', 'Medium', 'Low'] as const).map((level) => (
            <div
              key={level}
              onClick={() => setLevelFilter(levelFilter === level ? 'All' : level)}
              className="bg-white rounded-xl border p-4 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="text-3xl font-bold text-gray-900 mb-1">{counts[level]}</div>
              <RiskLevelBadge level={level} />
              <div className="text-xs text-gray-400 mt-1">departments</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter row */}
      {!loading && !error && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 font-medium">Filter by level:</span>
          {LEVEL_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setLevelFilter(f)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                levelFilter === f
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {/* Loading / error / content */}
      {loading && <SkeletonLoader rows={5} />}
      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Table — takes 2/3 width on large screens */}
          <div className="lg:col-span-2">
            <RiskTable data={filteredData} onRowClick={setSelectedEntry} />
          </div>
          {/* Pie chart — takes 1/3 width */}
          <div>
            <RiskPieChart data={data} />
          </div>
        </div>
      )}

      {/* Feature breakdown modal */}
      <FeatureBreakdownModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
    </div>
  );
}
```

---

### Step H — Wire Route in `App.tsx`

```typescript
// Add import:
import RiskPage from './pages/RiskPage';

// Replace:
<Route path="/risk" element={<PlaceholderPage />} />
// With:
<Route path="/risk" element={<RiskPage />} />
```

---

### 💻 Commands to Run

```bash
# Run risk job first to populate real scores
cd server && npm run run:risk-job

# Start frontend
cd client && npm run dev
# Navigate to http://localhost:5173/risk
```

---

### ✅ How to Validate

1. `/risk` page loads — table shows all departments ranked by score
2. Click a department row — modal opens with feature importance bars
3. Click backdrop — modal closes
4. Click a stat card (e.g. "Critical") — table filters to only Critical departments
5. Click "All" filter — all departments reappear
6. Pie chart shows correct distribution
7. `npx tsc --noEmit` in `client/` — zero errors
8. Stop backend — error banner appears, no crash

---

### 📋 Day 11 Outcome

Risk Score page is live at `/risk`. Department ranking table, pie chart, and drill-down modal all display real data from the Random Forest pipeline built in Day 10.

---

---

## Day 12 — Report Generator Service: CSV, Excel (2-sheet), PDF

### 🎯 Goal & Reasoning

This is the most important backend day in the reporting subsystem. Everything else — the Report Builder UI, the Report History page, the Scheduled Reports — all depend on this working. Build this before touching any report frontend.

`server/services/reportGenerator.ts` currently exists as an **empty file**. `server/routes/reportRoutes.ts` currently exists as an **empty file**. Today you fill both.

The generator needs to:
- Accept a configuration object (report type, date range, departments, output format)
- Fetch the relevant data from MongoDB (KPI snapshots, anomalies)
- Produce a real downloadable file in the requested format (CSV, Excel with two sheets, or PDF with a table)
- Save the file to `server/generated_reports/` on disk
- Return the file path so the API can serve it as a download

---

### 📦 Packages Needed

```bash
cd server
npm install exceljs jspdf jspdf-autotable json2csv
npm install --save-dev @types/json2csv
```

Verify:
```bash
node -e "require('exceljs'); console.log('exceljs: ok')"
node -e "require('jspdf'); console.log('jspdf: ok')"
node -e "const {parse} = require('json2csv'); console.log('json2csv: ok')"
```

Also make sure the output directory exists (create it if needed, and add it to `.gitignore`):
```bash
mkdir -p server/generated_reports
echo "generated_reports/" >> server/.gitignore
```

---

### Step A — Create `server/utils/reportHelpers.ts`

**Why a separate helpers file?** The data assembly logic (querying MongoDB, shaping it for the report) is separate from the file generation logic. Keeping them separate means you can test data assembly independently.

**File to create:** `server/utils/reportHelpers.ts`

```typescript
import KPISnapshot from '../models/KPI_Snapshot';
import Anomaly from '../models/Anomaly';

// Describes the raw data assembled for a report
export interface ReportData {
  kpiRows: KPIRow[];
  anomalyRows: AnomalyRow[];
  generatedAt: string;
  dateFrom: string;
  dateTo: string;
  departments: string[];
}

export interface KPIRow {
  dept: string;
  approvalRate: number;
  avgCycleTime: number;
  riskLevel: string;
  complianceRate: number;
  totalDecisions: number;
  anomalyCount: number;
}

export interface AnomalyRow {
  decisionId: string;
  severity: string;
  anomalyScore: string;
  department: string;
  isAcknowledged: string;
  description: string;
}

export async function assembleReportData(config: {
  dateFrom: string;
  dateTo: string;
  departments: string[];
}): Promise<ReportData> {
  // Build the MongoDB query filter
  const dateFilter: any = {};
  if (config.dateFrom) dateFilter.$gte = new Date(config.dateFrom);
  if (config.dateTo) dateFilter.$lte = new Date(config.dateTo);

  const matchFilter: any = {};
  if (Object.keys(dateFilter).length > 0) matchFilter.date = dateFilter;
  if (config.departments && config.departments.length > 0) {
    matchFilter.departmentId = { $in: config.departments };
  }

  // Fetch KPI snapshots
  const snapshots = await KPISnapshot.find(matchFilter)
    .sort({ date: -1 })
    .lean();

  // Group by department and take the most recent snapshot per dept
  const byDept = new Map<string, any>();
  for (const snap of snapshots) {
    if (!byDept.has(snap.departmentId)) {
      byDept.set(snap.departmentId, snap);
    }
  }

  const kpiRows: KPIRow[] = Array.from(byDept.values()).map((snap) => ({
    dept: snap.departmentId,
    approvalRate: snap.approvalRate ?? 0,
    avgCycleTime: snap.avgCycleTimeHours ?? 0,
    riskLevel: snap.riskLevel ?? 'Low',
    complianceRate: snap.complianceRate ?? 100,
    totalDecisions: snap.totalDecisions ?? 0,
    anomalyCount: snap.anomalyCount ?? 0,
  }));

  // Fetch anomaly rows
  const anomalyFilter: any = {};
  if (config.departments && config.departments.length > 0) {
    anomalyFilter.department = { $in: config.departments };
  }
  const anomalies = await Anomaly.find(anomalyFilter).sort({ anomalyScore: -1 }).lean();

  const anomalyRows: AnomalyRow[] = anomalies.map((a) => ({
    decisionId: a.decisionId?.toString() || '',
    severity: a.severity,
    anomalyScore: a.anomalyScore?.toFixed(3) || '0',
    department: a.department,
    isAcknowledged: a.isAcknowledged ? 'Yes' : 'No',
    description: a.description || '',
  }));

  return {
    kpiRows,
    anomalyRows,
    generatedAt: new Date().toISOString(),
    dateFrom: config.dateFrom,
    dateTo: config.dateTo,
    departments: config.departments,
  };
}
```

---

### Step B — Implement `server/services/reportGenerator.ts`

**File to implement (it currently exists but is empty):** `server/services/reportGenerator.ts`

```typescript
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { parse as csvParse } from 'json2csv';
import path from 'path';
import fs from 'fs/promises';
import { assembleReportData, ReportData } from '../utils/reportHelpers';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReportFormat = 'csv' | 'excel' | 'pdf';
export type ReportType = 'executive_summary' | 'compliance' | 'anomaly' | 'risk';

export interface ReportConfig {
  type: ReportType;
  format: ReportFormat;
  dateFrom: string;         // ISO date string e.g. "2026-01-01"
  dateTo: string;           // ISO date string e.g. "2026-04-10"
  departments: string[];    // Empty array = all departments
  requestedBy: string;      // User ID of who requested the report
}

// ─── Output Directory ─────────────────────────────────────────────────────────
// Resolve path relative to this file: server/services/ → server/generated_reports/
const OUTPUT_DIR = path.join(__dirname, '..', 'generated_reports');

// ─── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * Generate a report file and return the full path to the file on disk.
 * The caller (report API route) will use this path to serve the file download.
 */
export async function generateReport(config: ReportConfig): Promise<string> {
  // Ensure output directory exists
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  // Assemble the data to put in the report
  const data = await assembleReportData({
    dateFrom: config.dateFrom,
    dateTo: config.dateTo,
    departments: config.departments,
  });

  // Generate a unique filename using a timestamp
  const timestamp = Date.now();
  const safeType = config.type.replace('_', '-');
  const baseFilename = `report-${safeType}-${timestamp}`;

  // Branch to the correct format generator
  if (config.format === 'csv') {
    return generateCSV(data, baseFilename);
  } else if (config.format === 'excel') {
    return generateExcel(data, baseFilename, config);
  } else {
    return generatePDF(data, baseFilename, config);
  }
}

// ─── CSV Generator ────────────────────────────────────────────────────────────

async function generateCSV(data: ReportData, baseFilename: string): Promise<string> {
  // json2csv's parse() converts an array of objects to a CSV string
  // Fields are taken from the object keys automatically
  const csv = csvParse(data.kpiRows, {
    fields: [
      { label: 'Department', value: 'dept' },
      { label: 'Approval Rate %', value: 'approvalRate' },
      { label: 'Avg Cycle Time (hours)', value: 'avgCycleTime' },
      { label: 'Risk Level', value: 'riskLevel' },
      { label: 'Compliance Rate %', value: 'complianceRate' },
      { label: 'Total Decisions', value: 'totalDecisions' },
    ],
  });

  const filePath = path.join(OUTPUT_DIR, `${baseFilename}.csv`);
  await fs.writeFile(filePath, csv, 'utf8');
  console.log(`[ReportGenerator] CSV saved: ${filePath}`);
  return filePath;
}

// ─── Excel Generator ──────────────────────────────────────────────────────────

async function generateExcel(
  data: ReportData,
  baseFilename: string,
  config: ReportConfig
): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'GovVision Module 3';
  workbook.created = new Date();

  // ── Sheet 1: KPI Summary ──
  const kpiSheet = workbook.addWorksheet('KPI Summary');

  // Define columns with widths
  kpiSheet.columns = [
    { header: 'Department', key: 'dept', width: 22 },
    { header: 'Approval Rate %', key: 'approvalRate', width: 18 },
    { header: 'Avg Cycle Time (h)', key: 'avgCycleTime', width: 20 },
    { header: 'Risk Level', key: 'riskLevel', width: 14 },
    { header: 'Compliance Rate %', key: 'complianceRate', width: 20 },
    { header: 'Total Decisions', key: 'totalDecisions', width: 18 },
  ];

  // Style the header row
  const kpiHeaderRow = kpiSheet.getRow(1);
  kpiHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  kpiHeaderRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1F3A6E' }, // Dark navy — GovVision brand color
  };
  kpiHeaderRow.height = 22;

  // Add data rows
  data.kpiRows.forEach((row, index) => {
    const dataRow = kpiSheet.addRow(row);
    // Alternate row background for readability
    if (index % 2 === 0) {
      dataRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEAF1FB' }, // Light blue tint
      };
    }
    // Color the Risk Level cell based on value
    const riskCell = dataRow.getCell('riskLevel');
    const riskColors: Record<string, string> = {
      Low: 'FFD6EAD8',
      Medium: 'FFFFF3CD',
      High: 'FFFFE0B2',
      Critical: 'FFFFEBEE',
    };
    const colorKey = row.riskLevel as string;
    if (riskColors[colorKey]) {
      riskCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: riskColors[colorKey] } };
    }
  });

  // ── Sheet 2: Anomaly List ──
  const anomalySheet = workbook.addWorksheet('Anomaly List');

  anomalySheet.columns = [
    { header: 'Decision ID', key: 'decisionId', width: 28 },
    { header: 'Severity', key: 'severity', width: 12 },
    { header: 'Anomaly Score', key: 'anomalyScore', width: 15 },
    { header: 'Department', key: 'department', width: 20 },
    { header: 'Acknowledged', key: 'isAcknowledged', width: 14 },
    { header: 'Description', key: 'description', width: 50 },
  ];

  const anomalyHeaderRow = anomalySheet.getRow(1);
  anomalyHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  anomalyHeaderRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1F3A6E' },
  };
  anomalyHeaderRow.height = 22;

  data.anomalyRows.forEach((row, index) => {
    const dataRow = anomalySheet.addRow(row);
    if (index % 2 === 0) {
      dataRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F9FF' } };
    }
  });

  // ── Write to disk ──
  const filePath = path.join(OUTPUT_DIR, `${baseFilename}.xlsx`);
  await workbook.xlsx.writeFile(filePath);
  console.log(`[ReportGenerator] Excel saved: ${filePath}`);
  return filePath;
}

// ─── PDF Generator ────────────────────────────────────────────────────────────

async function generatePDF(
  data: ReportData,
  baseFilename: string,
  config: ReportConfig
): Promise<string> {
  // jsPDF creates a PDF document
  // 'p' = portrait, 'mm' = millimeters, 'a4' = A4 paper
  const doc = new jsPDF('p', 'mm', 'a4');

  // ── Cover section ──
  doc.setFillColor(31, 58, 110); // #1F3A6E navy
  doc.rect(0, 0, 210, 40, 'F'); // Full-width navy header rectangle
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text('GovVision Module 3', 14, 18);
  doc.setFontSize(13);
  doc.text('Governance Analytics Report', 14, 28);

  // ── Report metadata ──
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  const metaY = 50;
  doc.text(`Report Type: ${config.type.replace('_', ' ').toUpperCase()}`, 14, metaY);
  doc.text(`Date Range: ${config.dateFrom} to ${config.dateTo}`, 14, metaY + 7);
  doc.text(
    `Departments: ${config.departments.length > 0 ? config.departments.join(', ') : 'All'}`,
    14,
    metaY + 14
  );
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, metaY + 21);

  // ── KPI Summary table ──
  doc.setFontSize(12);
  doc.setTextColor(31, 58, 110);
  doc.text('KPI Summary by Department', 14, metaY + 34);

  // autoTable from jspdf-autotable draws a styled table into the PDF
  autoTable(doc, {
    startY: metaY + 38,
    head: [['Department', 'Approval Rate %', 'Avg Cycle Time (h)', 'Risk Level', 'Compliance %']],
    body: data.kpiRows.map((row) => [
      row.dept,
      row.approvalRate.toFixed(1),
      row.avgCycleTime.toFixed(1),
      row.riskLevel,
      row.complianceRate.toFixed(1),
    ]),
    headStyles: {
      fillColor: [31, 58, 110], // Navy header
      textColor: [255, 255, 255],
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [234, 241, 251], // Light blue alternating rows
    },
    styles: { fontSize: 9 },
    columnStyles: {
      3: { // Risk Level column
        fontStyle: 'bold',
      },
    },
  });

  // ── Anomaly Summary ──
  const finalY = (doc as any).lastAutoTable.finalY || 180;
  if (finalY < 230 && data.anomalyRows.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(31, 58, 110);
    doc.text('Anomaly Summary', 14, finalY + 12);

    autoTable(doc, {
      startY: finalY + 16,
      head: [['Decision ID', 'Severity', 'Score', 'Department', 'Acknowledged']],
      body: data.anomalyRows.slice(0, 10).map((row) => [ // Top 10 only in PDF
        row.decisionId.substring(0, 20) + '...', // Truncate long IDs
        row.severity,
        row.anomalyScore,
        row.department,
        row.isAcknowledged,
      ]),
      headStyles: { fillColor: [31, 58, 110], textColor: [255, 255, 255], fontSize: 9 },
      styles: { fontSize: 8 },
    });
  }

  // ── Footer ──
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    'GovVision Module 3 — Analytics, Reporting & AI/ML Monitoring',
    14,
    doc.internal.pageSize.height - 8
  );

  // ── Write to disk ──
  const filePath = path.join(OUTPUT_DIR, `${baseFilename}.pdf`);
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  await fs.writeFile(filePath, pdfBuffer);
  console.log(`[ReportGenerator] PDF saved: ${filePath}`);
  return filePath;
}
```

---

### Step C — Implement `server/routes/reportRoutes.ts`

**File to implement (currently empty):** `server/routes/reportRoutes.ts`

```typescript
import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { generateReport, ReportConfig } from '../services/reportGenerator';
import Report from '../models/Report';
import { validateJWT } from '../middleware/validateJWT';
import { requireRole } from '../middleware/requireRole';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/reports/generate
// Generates a new report file based on the config in the request body.
// Returns the report ID. Client uses the ID to download the file.
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/generate',
  validateJWT,
  requireRole(['admin', 'manager', 'executive']),
  async (req: Request, res: Response) => {
    try {
      const config: ReportConfig = {
        type: req.body.type || 'executive_summary',
        format: req.body.format || 'csv',
        dateFrom: req.body.dateFrom || '2026-01-01',
        dateTo: req.body.dateTo || new Date().toISOString().split('T')[0],
        departments: req.body.departments || [],
        requestedBy: (req as any).user?.userId || 'unknown',
      };

      console.log('[ReportAPI] Generating report:', config.type, config.format);

      // Generate the file — this may take a few seconds for large datasets
      const filePath = await generateReport(config);

      // Save a record of this report to MongoDB so it appears in history
      const reportRecord = await Report.create({
        type: config.type,
        format: config.format,
        status: 'completed',
        filePath,
        parameters: config,
        generatedBy: config.requestedBy,
        generatedAt: new Date(),
      });

      console.log('[ReportAPI] Report saved with ID:', reportRecord._id);
      return res.json({ reportId: reportRecord._id, status: 'completed' });
    } catch (err: any) {
      console.error('[ReportAPI] Generation failed:', err.message);
      return res.status(500).json({ error: 'Report generation failed: ' + err.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports
// Returns list of all generated reports (for the history page)
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/',
  validateJWT,
  requireRole(['admin', 'manager', 'executive', 'analyst']),
  async (req: Request, res: Response) => {
    try {
      const reports = await Report.find()
        .sort({ generatedAt: -1 }) // Newest first
        .lean();
      return res.json(reports);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports/:id/download
// Streams the report file to the client as a file download
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/:id/download',
  validateJWT,
  async (req: Request, res: Response) => {
    try {
      const report = await Report.findById(req.params.id);
      if (!report) {
        return res.status(404).json({ error: 'Report not found' });
      }

      // Check the file actually exists on disk
      if (!fs.existsSync(report.filePath)) {
        return res.status(404).json({ error: 'Report file not found on disk' });
      }

      // res.download() sets the Content-Disposition header and streams the file
      // The second argument is the filename the browser will suggest when saving
      const filename = path.basename(report.filePath);
      return res.download(report.filePath, filename);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

export default router;
```

---

### Step D — Register the Route in `server/server.ts`

```typescript
// Add with other route imports:
import reportRoutes from './routes/reportRoutes';

// Add with other app.use() calls:
app.use('/api/reports', reportRoutes);
```

---

### 💻 Commands to Run

```bash
cd server
npm run dev
```

---

### ✅ How to Validate

**Step 1 — Test CSV generation:**
```bash
curl -X POST http://localhost:5002/api/reports/generate \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "executive_summary",
    "format": "csv",
    "dateFrom": "2026-01-01",
    "dateTo": "2026-04-10",
    "departments": []
  }'
```
Expected: `{ "reportId": "abc123...", "status": "completed" }`

**Step 2 — Download the CSV:**
```bash
curl -H "Authorization: Bearer YOUR_JWT" \
  "http://localhost:5002/api/reports/REPORT_ID_FROM_ABOVE/download" \
  -o test_report.csv

# Open the file
cat test_report.csv
```
Expected: CSV with headers and department data rows.

**Step 3 — Test Excel generation:**
```bash
curl -X POST http://localhost:5002/api/reports/generate \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"type":"executive_summary","format":"excel","dateFrom":"2026-01-01","dateTo":"2026-04-10","departments":[]}'

# Download and check
curl -H "Authorization: Bearer YOUR_JWT" \
  "http://localhost:5002/api/reports/REPORT_ID/download" -o test_report.xlsx
```
Open the `.xlsx` in Excel or Google Sheets — should have two sheets: "KPI Summary" and "Anomaly List".

**Step 4 — Test PDF generation:**
Generate with `"format": "pdf"` and download as `test_report.pdf`. Open in a PDF viewer — should have a navy header, metadata section, and KPI table.

**Step 5 — Check MongoDB history:**
```bash
curl -H "Authorization: Bearer YOUR_JWT" "http://localhost:5002/api/reports"
```
Expected: Array containing all three test reports with `status: "completed"`.

**Step 6 — Check files on disk:**
```bash
ls -lh server/generated_reports/
```
Expected: Three files (`.csv`, `.xlsx`, `.pdf`).

---

### 📋 Day 12 Outcome

The report generator is fully functional. All three formats produce real files with real data. The API can list and download reports. Day 13 builds the Report Builder page in the frontend.

---

---

## Day 13 — Report Builder Frontend: ReportBuilder.tsx

### 🎯 Goal & Reasoning

Now that the backend can generate reports, you need a UI for users to configure and trigger them. The Report Builder page lets users pick the report type, date range, departments, and format, then click Generate to get a downloadable file.

---

### Pages / Components Being Created Today

| File | What It Is |
|---|---|
| `client/src/pages/ReportBuilder.tsx` | Main report builder page |
| `client/src/components/DateRangePicker.tsx` | Two date inputs (From / To) as a component |
| `client/src/components/FormatSelector.tsx` | CSV / Excel / PDF radio buttons |

Modifications:
| File | What Changes |
|---|---|
| `client/src/types/index.ts` | Add `ReportConfig`, `GenerateReportResponse` types |
| `client/src/services/api.ts` | Add `generateReport()` and `downloadReport()` functions |
| `client/src/App.tsx` | Route `/reports/builder` to `ReportBuilder` |

---

### Step A — Add Report Types to `client/src/types/index.ts`

```typescript
// ─── Report Types ─────────────────────────────────────────────────────────────

export type ReportFormat = 'csv' | 'excel' | 'pdf';
export type ReportType = 'executive_summary' | 'compliance' | 'anomaly' | 'risk';

export interface ReportConfig {
  type: ReportType;
  format: ReportFormat;
  dateFrom: string;       // "YYYY-MM-DD"
  dateTo: string;         // "YYYY-MM-DD"
  departments: string[];  // Empty = all departments
}

export interface GenerateReportResponse {
  reportId: string;
  status: 'completed' | 'pending' | 'failed';
}

export interface ReportRecord {
  _id: string;
  type: string;
  format: ReportFormat;
  status: string;
  generatedAt: string;
  generatedBy: string;
  parameters: ReportConfig;
  filePath: string;
}
```

---

### Step B — Add API Functions to `api.ts`

```typescript
import { GenerateReportResponse, ReportRecord, ReportConfig } from '../types';

// POST /api/reports/generate — trigger report generation
export async function generateReport(config: ReportConfig): Promise<GenerateReportResponse> {
  const res = await api.post<GenerateReportResponse>('/reports/generate', config);
  return res.data;
}

// GET /api/reports — list all generated reports
export async function getReports(): Promise<ReportRecord[]> {
  const res = await api.get<ReportRecord[]>('/reports');
  return res.data;
}

// GET /api/reports/:id/download — download a report file
// Uses a Blob response type and creates a temporary link to trigger browser download
export async function downloadReport(reportId: string, filename: string): Promise<void> {
  const res = await api.get(`/reports/${reportId}/download`, {
    responseType: 'blob', // Tell axios to return raw binary data
  });

  // Create an object URL from the blob (a temporary browser URL)
  const url = URL.createObjectURL(new Blob([res.data]));

  // Create a temporary <a> tag, click it to trigger download, remove it
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename); // Suggested filename for the browser's save dialog
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Free the object URL memory
  URL.revokeObjectURL(url);
}
```

---

### Step C — Create `DateRangePicker.tsx`

**File to create:** `client/src/components/DateRangePicker.tsx`

```typescript
import React from 'react';

interface DateRangePickerProps {
  dateFrom: string;
  dateTo: string;
  onFromChange: (date: string) => void;
  onToChange: (date: string) => void;
}

export default function DateRangePicker({
  dateFrom, dateTo, onFromChange, onToChange
}: DateRangePickerProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500 font-medium">From</label>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => onFromChange(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <span className="text-gray-400 mt-4">→</span>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500 font-medium">To</label>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => onToChange(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
    </div>
  );
}
```

---

### Step D — Create `FormatSelector.tsx`

**File to create:** `client/src/components/FormatSelector.tsx`

```typescript
import React from 'react';
import { ReportFormat } from '../types';

interface FormatSelectorProps {
  selected: ReportFormat;
  onChange: (format: ReportFormat) => void;
}

const formats: Array<{ value: ReportFormat; label: string; description: string }> = [
  { value: 'csv', label: 'CSV', description: 'Plain text, opens in Excel/Sheets' },
  { value: 'excel', label: 'Excel', description: '2 sheets: KPI summary + anomalies' },
  { value: 'pdf', label: 'PDF', description: 'Formatted with cover page + table' },
];

export default function FormatSelector({ selected, onChange }: FormatSelectorProps) {
  return (
    <div className="flex gap-3">
      {formats.map((f) => (
        <label
          key={f.value}
          className={`flex flex-col gap-0.5 cursor-pointer border rounded-xl p-3 flex-1 transition-all ${
            selected === f.value
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <input
              type="radio"
              name="format"
              value={f.value}
              checked={selected === f.value}
              onChange={() => onChange(f.value)}
              className="accent-indigo-600"
            />
            <span className="font-semibold text-sm text-gray-800">{f.label}</span>
          </div>
          <span className="text-xs text-gray-500 ml-5">{f.description}</span>
        </label>
      ))}
    </div>
  );
}
```

---

### Step E — Create `ReportBuilder.tsx`

**File to create:** `client/src/pages/ReportBuilder.tsx`

```typescript
import React, { useState } from 'react';
import { generateReport, downloadReport } from '../services/api';
import { ReportFormat, ReportType } from '../types';
import DateRangePicker from '../components/DateRangePicker';
import FormatSelector from '../components/FormatSelector';

const REPORT_TYPES: Array<{ value: ReportType; label: string; description: string }> = [
  { value: 'executive_summary', label: 'Executive Summary', description: 'KPI overview + anomaly count across all selected departments' },
  { value: 'compliance', label: 'Compliance Report', description: 'Detailed compliance rates and violation breakdown' },
  { value: 'anomaly', label: 'Anomaly Report', description: 'All anomalies detected by Isolation Forest with feature values' },
  { value: 'risk', label: 'Risk Report', description: 'Risk scores per department from Random Forest model' },
];

const DEPARTMENTS = ['FI001', 'HR001', 'OPS001', 'LEGAL001', 'IT001'];

// Get today's date and 90 days ago as default range
const today = new Date().toISOString().split('T')[0];
const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

export default function ReportBuilder() {
  // Form state
  const [reportType, setReportType] = useState<ReportType>('executive_summary');
  const [dateFrom, setDateFrom] = useState(ninetyDaysAgo);
  const [dateTo, setDateTo] = useState(today);
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]); // Empty = all depts
  const [format, setFormat] = useState<ReportFormat>('csv');

  // UI state
  const [loading, setLoading] = useState(false);
  const [generatedId, setGeneratedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Toggle a department in/out of the selected list
  function toggleDept(dept: string) {
    setSelectedDepts((prev) =>
      prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]
    );
    // Reset any previous generation result when config changes
    setGeneratedId(null);
    setSuccess(false);
  }

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setGeneratedId(null);
    setSuccess(false);

    try {
      const result = await generateReport({
        type: reportType,
        format,
        dateFrom,
        dateTo,
        departments: selectedDepts,
      });

      setGeneratedId(result.reportId);
      setSuccess(true);
      console.log('[ReportBuilder] Report generated:', result.reportId);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Report generation failed. Check the backend is running.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload() {
    if (!generatedId) return;
    const ext = format === 'excel' ? 'xlsx' : format;
    await downloadReport(generatedId, `govvision-report-${reportType}.${ext}`);
  }

  return (
    <div className="p-6 max-w-3xl space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Report Builder</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure and generate governance reports in CSV, Excel, or PDF format.
        </p>
      </div>

      {/* Section 1: Report Type */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-gray-800">1. Report Type</h2>
        <div className="grid grid-cols-2 gap-3">
          {REPORT_TYPES.map((rt) => (
            <label
              key={rt.value}
              className={`cursor-pointer border rounded-xl p-4 transition-all ${
                reportType === rt.value
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <input
                  type="radio"
                  name="reportType"
                  value={rt.value}
                  checked={reportType === rt.value}
                  onChange={() => { setReportType(rt.value); setGeneratedId(null); }}
                  className="accent-indigo-600"
                />
                <span className="font-semibold text-sm text-gray-800">{rt.label}</span>
              </div>
              <p className="text-xs text-gray-500 ml-5">{rt.description}</p>
            </label>
          ))}
        </div>
      </div>

      {/* Section 2: Date Range */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-gray-800">2. Date Range</h2>
        <DateRangePicker
          dateFrom={dateFrom}
          dateTo={dateTo}
          onFromChange={setDateFrom}
          onToChange={setDateTo}
        />
      </div>

      {/* Section 3: Departments */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">3. Departments</h2>
          <span className="text-xs text-gray-400">
            {selectedDepts.length === 0 ? 'All departments selected' : `${selectedDepts.length} selected`}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {DEPARTMENTS.map((dept) => (
            <button
              key={dept}
              onClick={() => toggleDept(dept)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                selectedDepts.includes(dept)
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400">Leave all unselected to include all departments in the report.</p>
      </div>

      {/* Section 4: Format */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-gray-800">4. Output Format</h2>
        <FormatSelector selected={format} onChange={(f) => { setFormat(f); setGeneratedId(null); }} />
      </div>

      {/* Section 5: Generate */}
      <div className="space-y-4 border-t pt-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        {success && generatedId && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-green-800 font-semibold text-sm">Report generated successfully</p>
              <p className="text-green-600 text-xs mt-0.5">Click Download to save the file</p>
            </div>
            <button
              onClick={handleDownload}
              className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              ↓ Download {format.toUpperCase()}
            </button>
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white py-3 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="animate-spin">⟳</span>
              Generating report...
            </>
          ) : (
            'Generate Report'
          )}
        </button>
      </div>
    </div>
  );
}
```

---

### Step F — Wire Route in `App.tsx`

```typescript
import ReportBuilder from './pages/ReportBuilder';

// Replace:
<Route path="/reports/builder" element={<PlaceholderPage />} />
// Or if there's no nested route yet, add under a /reports parent:
<Route path="/reports/builder" element={<ReportBuilder />} />
```

---

### ✅ How to Validate

1. Navigate to `/reports/builder` — page renders with all four sections visible
2. Select "Executive Summary", set a date range, leave departments empty, choose "CSV" → click Generate
3. Spinner appears → turns into green success box with Download button
4. Click Download → browser saves a `.csv` file → open it — contains department rows with headers
5. Repeat with Excel — `.xlsx` file with 2 sheets
6. Repeat with PDF — `.pdf` file with navy header and table
7. Change any selection after generating — generate button resets (no stale download button)
8. `npx tsc --noEmit` — zero errors

---

### 📋 Day 13 Outcome

Report Builder page is live at `/reports/builder`. Users can generate all three formats with full configuration options. Day 14 builds the Report History page.

---

---

## Day 14 — Report History Frontend: ReportHistory.tsx

### 🎯 Goal & Reasoning

Every report that gets generated is saved to MongoDB. The Report History page shows all of them in a table with filter and re-download options. This page is relatively straightforward — it's mostly a table that reads from `GET /api/reports` and calls `downloadReport()` on click.

---

### Files to Create / Modify

| File | Action |
|---|---|
| `client/src/pages/ReportHistory.tsx` | Create — the report history page |
| `client/src/App.tsx` | Modify — wire `/reports/history` route |

The `getReports()` and `downloadReport()` API functions are already in `api.ts` from Day 13. The `ReportRecord` type is already in `types/index.ts` from Day 13.

---

### Step A — Create `ReportHistory.tsx`

**File to create:** `client/src/pages/ReportHistory.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { getReports, downloadReport } from '../services/api';
import { ReportRecord, ReportFormat } from '../types';
import SkeletonLoader from '../components/SkeletonLoader';

// Format badge colors
const FORMAT_COLORS: Record<ReportFormat, string> = {
  csv: 'bg-green-100 text-green-800',
  excel: 'bg-blue-100 text-blue-800',
  pdf: 'bg-red-100 text-red-800',
};

// Make report type readable
function formatTypeName(type: string): string {
  return type.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ReportHistory() {
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formatFilter, setFormatFilter] = useState<'all' | ReportFormat>('all');
  const [downloading, setDownloading] = useState<string | null>(null); // ID of report being downloaded

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getReports();
        setReports(data);
      } catch (err: any) {
        setError('Failed to load report history.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleDownload(report: ReportRecord) {
    setDownloading(report._id);
    try {
      const ext = report.format === 'excel' ? 'xlsx' : report.format;
      await downloadReport(report._id, `govvision-${report.type}-${report._id.slice(-6)}.${ext}`);
    } catch (err) {
      console.error('Download failed', err);
    } finally {
      setDownloading(null);
    }
  }

  const filtered = formatFilter === 'all'
    ? reports
    : reports.filter((r) => r.format === formatFilter);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Report History</h1>
        <p className="text-sm text-gray-500 mt-1">
          All previously generated reports. Click Download to re-download any report.
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 font-medium">Format:</span>
        {(['all', 'csv', 'excel', 'pdf'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFormatFilter(f)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
              formatFilter === f
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.toUpperCase()}
          </button>
        ))}
        {!loading && (
          <span className="ml-auto text-sm text-gray-400">
            {filtered.length} report{filtered.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Content */}
      {loading && <SkeletonLoader rows={5} />}

      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="bg-gray-50 rounded-xl border p-12 text-center">
          <p className="text-gray-500 text-sm">No reports found.</p>
          <p className="text-gray-400 text-xs mt-1">Generate a report from the Report Builder to see it here.</p>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Format</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Generated At</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Date Range</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((report) => (
                <tr key={report._id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {formatTypeName(report.type)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${FORMAT_COLORS[report.format]}`}>
                      {report.format.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      report.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {report.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(report.generatedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {report.parameters?.dateFrom} → {report.parameters?.dateTo}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDownload(report)}
                      disabled={downloading === report._id}
                      className="text-indigo-600 hover:text-indigo-800 text-xs font-medium disabled:text-indigo-300"
                    >
                      {downloading === report._id ? 'Downloading...' : '↓ Download'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

---

### Step B — Wire Route in `App.tsx`

```typescript
import ReportHistory from './pages/ReportHistory';

<Route path="/reports/history" element={<ReportHistory />} />
```

---

### ✅ How to Validate

1. Generate 2–3 reports via `/reports/builder` first (so there's history to show)
2. Navigate to `/reports/history` — table shows all generated reports
3. Click "CSV" filter — only CSV reports remain
4. Click "ALL" — all reports return
5. Click Download on any row — file saves
6. Stop backend — error banner appears, no crash

---

### 📋 Day 14 Outcome

Report History page live at `/reports/history`. All generated reports listed with format badges, status, timestamps, and download links.

---

---

## Day 15 — Scheduled Reports Backend + Frontend

### 🎯 Goal & Reasoning

Users want reports delivered automatically — every Monday, or the first of each month — without logging in and clicking Generate each time. The scheduled reports system adds a cron runner to the backend that checks for due schedules every hour and auto-generates reports, plus a UI page to create and manage those schedules.

---

### Files to Create / Modify

| File | Action |
|---|---|
| `server/models/ReportSchedule.ts` | Create or verify schema |
| `server/jobs/reportScheduleJob.ts` | Create — hourly cron runner |
| `server/routes/reportRoutes.ts` | Modify — add schedule API endpoints |
| `client/src/pages/ReportSchedules.tsx` | Create — schedule management UI |
| `client/src/components/AddScheduleModal.tsx` | Create — create schedule modal |
| `client/src/types/index.ts` | Add schedule types |
| `client/src/services/api.ts` | Add schedule API functions |
| `client/src/App.tsx` | Wire `/reports/schedules` route |

---

### Step A — Verify/Create `server/models/ReportSchedule.ts`

The Copilot-updated Progress 2 file notes this model already exists in the repo. Open it and confirm it has these fields. If it doesn't, add them:

```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface IReportSchedule extends Document {
  name: string;
  reportConfig: {
    type: string;
    format: string;
    departments: string[];
    dateRangeMode: 'last_7_days' | 'last_30_days' | 'last_90_days';
  };
  frequency: 'daily' | 'weekly' | 'monthly';
  nextRunAt: Date;
  lastRunAt?: Date;
  lastRunStatus?: 'success' | 'failed' | 'pending';
  isActive: boolean;
  createdBy: string;
  recipients: string[];
}

const ReportScheduleSchema = new Schema<IReportSchedule>(
  {
    name: { type: String, required: true },
    reportConfig: { type: Schema.Types.Mixed, required: true },
    frequency: { type: String, enum: ['daily', 'weekly', 'monthly'], required: true },
    nextRunAt: { type: Date, required: true },
    lastRunAt: { type: Date },
    lastRunStatus: { type: String, enum: ['success', 'failed', 'pending'], default: 'pending' },
    isActive: { type: Boolean, default: true },
    createdBy: { type: String },
    recipients: [{ type: String }],
  },
  { timestamps: true }
);

export default mongoose.model<IReportSchedule>('m3_report_schedules', ReportScheduleSchema);
```

---

### Step B — Create `server/jobs/reportScheduleJob.ts`

```typescript
import cron from 'node-cron';
import ReportSchedule from '../models/ReportSchedule';
import Report from '../models/Report';
import { generateReport } from '../services/reportGenerator';

function calculateDateRange(mode: string): { dateFrom: string; dateTo: string } {
  const today = new Date();
  const days = mode === 'last_7_days' ? 7 : mode === 'last_30_days' ? 30 : 90;
  const from = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);
  return {
    dateFrom: from.toISOString().split('T')[0],
    dateTo: today.toISOString().split('T')[0],
  };
}

function calculateNextRun(frequency: string, from: Date): Date {
  const next = new Date(from);
  if (frequency === 'daily') next.setDate(next.getDate() + 1);
  else if (frequency === 'weekly') next.setDate(next.getDate() + 7);
  else next.setMonth(next.getMonth() + 1);
  return next;
}

export async function runScheduleCheck(): Promise<void> {
  const now = new Date();
  const dueSchedules = await ReportSchedule.find({
    isActive: true,
    nextRunAt: { $lte: now },
  });

  if (dueSchedules.length === 0) {
    console.log('[ScheduleJob] No due schedules found.');
    return;
  }

  console.log(`[ScheduleJob] Found ${dueSchedules.length} due schedule(s).`);

  for (const schedule of dueSchedules) {
    console.log(`[ScheduleJob] Running schedule: ${schedule.name}`);
    try {
      const { dateFrom, dateTo } = calculateDateRange(
        schedule.reportConfig.dateRangeMode || 'last_30_days'
      );

      const filePath = await generateReport({
        type: schedule.reportConfig.type as any,
        format: schedule.reportConfig.format as any,
        dateFrom,
        dateTo,
        departments: schedule.reportConfig.departments || [],
        requestedBy: `schedule:${schedule._id}`,
      });

      await Report.create({
        type: schedule.reportConfig.type,
        format: schedule.reportConfig.format,
        status: 'completed',
        filePath,
        parameters: { dateFrom, dateTo, departments: schedule.reportConfig.departments },
        generatedBy: `schedule:${schedule.name}`,
        generatedAt: new Date(),
      });

      await ReportSchedule.findByIdAndUpdate(schedule._id, {
        lastRunAt: now,
        lastRunStatus: 'success',
        nextRunAt: calculateNextRun(schedule.frequency, now),
      });

      console.log(`[ScheduleJob] Schedule "${schedule.name}" completed successfully.`);
    } catch (err: any) {
      console.error(`[ScheduleJob] Schedule "${schedule.name}" failed:`, err.message);
      await ReportSchedule.findByIdAndUpdate(schedule._id, {
        lastRunAt: now,
        lastRunStatus: 'failed',
        nextRunAt: calculateNextRun(schedule.frequency, now),
      });
    }
  }
}

// Run every hour at :00 to check for due schedules
cron.schedule('0 * * * *', () => {
  runScheduleCheck().catch((err) =>
    console.error('[ScheduleJob] Uncaught error:', err)
  );
});

console.log('[ScheduleJob] Scheduled: checks every hour.');
```

---

### Step C — Add Schedule API Routes to `reportRoutes.ts`

Add these to the existing `server/routes/reportRoutes.ts`:

```typescript
import ReportSchedule from '../models/ReportSchedule';

// POST /api/reports/schedules — create a new schedule
router.post('/schedules', validateJWT, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { name, reportConfig, frequency, recipients } = req.body;

    // Set nextRunAt to the start of tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(6, 0, 0, 0); // 6:00 AM tomorrow

    const schedule = await ReportSchedule.create({
      name,
      reportConfig,
      frequency,
      nextRunAt: tomorrow,
      createdBy: (req as any).user?.userId,
      recipients: recipients || [],
    });

    return res.status(201).json(schedule);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/schedules — list all schedules
router.get('/schedules', validateJWT, async (req, res) => {
  try {
    const schedules = await ReportSchedule.find().sort({ createdAt: -1 }).lean();
    return res.json(schedules);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/reports/schedules/:id/toggle — toggle isActive
router.patch('/schedules/:id/toggle', validateJWT, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const schedule = await ReportSchedule.findById(req.params.id);
    if (!schedule) return res.status(404).json({ error: 'Not found' });
    schedule.isActive = !schedule.isActive;
    await schedule.save();
    return res.json(schedule);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/reports/schedules/:id
router.delete('/schedules/:id', validateJWT, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    await ReportSchedule.findByIdAndDelete(req.params.id);
    return res.json({ deleted: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
```

Also import and register the job in `server/server.ts`:
```typescript
import './jobs/reportScheduleJob'; // hourly schedule runner
```

---

### Step D — Add Schedule Types and API Functions

In `client/src/types/index.ts`:
```typescript
export interface ReportSchedule {
  _id: string;
  name: string;
  reportConfig: { type: string; format: string; departments: string[]; dateRangeMode: string };
  frequency: 'daily' | 'weekly' | 'monthly';
  nextRunAt: string;
  lastRunAt?: string;
  lastRunStatus?: 'success' | 'failed' | 'pending';
  isActive: boolean;
  recipients: string[];
}
```

In `client/src/services/api.ts`:
```typescript
import { ReportSchedule } from '../types';

export async function getSchedules(): Promise<ReportSchedule[]> {
  const res = await api.get('/reports/schedules');
  return res.data;
}

export async function createSchedule(data: Partial<ReportSchedule>): Promise<ReportSchedule> {
  const res = await api.post('/reports/schedules', data);
  return res.data;
}

export async function toggleSchedule(id: string): Promise<ReportSchedule> {
  const res = await api.patch(`/reports/schedules/${id}/toggle`);
  return res.data;
}

export async function deleteSchedule(id: string): Promise<void> {
  await api.delete(`/reports/schedules/${id}`);
}
```

---

### Step E — Create `ReportSchedules.tsx`

**File to create:** `client/src/pages/ReportSchedules.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { getSchedules, toggleSchedule, deleteSchedule } from '../services/api';
import { ReportSchedule } from '../types';
import SkeletonLoader from '../components/SkeletonLoader';
import AddScheduleModal from '../components/AddScheduleModal';

export default function ReportSchedules() {
  const [schedules, setSchedules] = useState<ReportSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await getSchedules();
      setSchedules(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleToggle(id: string) {
    const updated = await toggleSchedule(id);
    setSchedules((prev) => prev.map((s) => (s._id === id ? updated : s)));
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this schedule?')) return;
    await deleteSchedule(id);
    setSchedules((prev) => prev.filter((s) => s._id !== id));
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scheduled Reports</h1>
          <p className="text-sm text-gray-500 mt-1">
            Automated report delivery. Schedules run at 6:00 AM on their due date.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          + Add Schedule
        </button>
      </div>

      {loading && <SkeletonLoader rows={3} />}

      {!loading && schedules.length === 0 && (
        <div className="bg-gray-50 rounded-xl border p-12 text-center">
          <p className="text-gray-500 text-sm">No schedules yet.</p>
          <p className="text-gray-400 text-xs mt-1">Click "Add Schedule" to create your first automated report.</p>
        </div>
      )}

      {!loading && schedules.length > 0 && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Frequency</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Format</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Next Run</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Last Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Active</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((s) => (
                <tr key={s._id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3 capitalize">{s.frequency}</td>
                  <td className="px-4 py-3 uppercase text-xs">{s.reportConfig.format}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(s.nextRunAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    {s.lastRunStatus && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        s.lastRunStatus === 'success' ? 'bg-green-100 text-green-800' :
                        s.lastRunStatus === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {s.lastRunStatus}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggle(s._id)}
                      className={`w-10 h-6 rounded-full transition-colors relative ${
                        s.isActive ? 'bg-indigo-600' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow ${
                        s.isActive ? 'left-5' : 'left-1'
                      }`} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(s._id)}
                      className="text-red-500 hover:text-red-700 text-xs font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddScheduleModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={(newSchedule) => {
          setSchedules((prev) => [newSchedule, ...prev]);
          setShowAdd(false);
        }}
      />
    </div>
  );
}
```

---

### Step F — Create `AddScheduleModal.tsx`

**File to create:** `client/src/components/AddScheduleModal.tsx`

```typescript
import React, { useState } from 'react';
import { createSchedule } from '../services/api';
import { ReportSchedule } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (schedule: ReportSchedule) => void;
}

export default function AddScheduleModal({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [reportType, setReportType] = useState('executive_summary');
  const [format, setFormat] = useState('csv');
  const [dateRange, setDateRange] = useState('last_30_days');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleCreate() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const created = await createSchedule({
        name,
        frequency,
        reportConfig: { type: reportType, format, departments: [], dateRangeMode: dateRange },
      });
      onCreated(created);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-900">New Scheduled Report</h2>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Schedule Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Weekly Finance Summary"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Frequency</label>
            <select value={frequency} onChange={(e) => setFrequency(e.target.value as any)}
              className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Format</label>
            <select value={format} onChange={(e) => setFormat(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="csv">CSV</option>
              <option value="excel">Excel</option>
              <option value="pdf">PDF</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Report Type</label>
          <select value={reportType} onChange={(e) => setReportType(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="executive_summary">Executive Summary</option>
            <option value="compliance">Compliance Report</option>
            <option value="anomaly">Anomaly Report</option>
            <option value="risk">Risk Report</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Date Range (for each run)</label>
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="last_7_days">Last 7 days</option>
            <option value="last_30_days">Last 30 days</option>
            <option value="last_90_days">Last 90 days</option>
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleCreate} disabled={loading || !name.trim()}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white py-2 rounded-lg text-sm font-semibold transition-colors">
            {loading ? 'Creating...' : 'Create Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

### Step G — Wire Route + Register Job

In `App.tsx`:
```typescript
import ReportSchedules from './pages/ReportSchedules';
<Route path="/reports/schedules" element={<ReportSchedules />} />
```

In `server/server.ts`:
```typescript
import './jobs/reportScheduleJob'; // hourly schedule runner
```

---

### ✅ How to Validate

1. `/reports/schedules` — page loads showing empty state or existing schedules
2. Click "Add Schedule" → modal opens with all form fields
3. Fill in name, pick weekly frequency, CSV format → Create → modal closes, schedule appears in table
4. Toggle switch on a schedule → it flips between active/inactive, persists across refresh
5. Delete a schedule → it disappears from table
6. `POST /api/reports/schedules` via curl — creates a schedule document in MongoDB

---

### 📋 Day 15 Outcome

Scheduled reports system fully functional. Hourly cron checks for due schedules and auto-generates them. Frontend management page at `/reports/schedules`.

---

---

## Day 16 — Seed Data, Auth Hardening, and TypeScript Zero-Error Pass

### 🎯 Goal & Reasoning

Before building the final pages and running integration tests, you need to make sure the database has enough realistic data to demo with, any temporary auth bypasses are removed, and both the server and client codebases compile with zero TypeScript errors. A demo with empty charts or `0` everywhere does not impress.

---

### Step A — Seed Data Targets

Run the seed script to populate all collections:

```bash
cd server
npx ts-node scripts/seedData.ts
```

After seeding, verify counts:

```bash
npx ts-node -e "
const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const KPI = require('./models/KPI_Snapshot').default;
  const Anomaly = require('./models/Anomaly').default;
  const Forecast = require('./models/Forecast').default;
  const Report = require('./models/Report').default;
  
  console.log('KPI snapshots:', await KPI.countDocuments());
  console.log('Anomalies:', await Anomaly.countDocuments());
  console.log('Forecasts:', await Forecast.countDocuments());
  console.log('Reports:', await Report.countDocuments());
  
  mongoose.disconnect();
});
"
```

**Expected minimums:**
```
KPI snapshots: 450  (5 departments × 90 days)
Anomalies: 20       (at minimum — run anomaly job after seeding)
Forecasts: 30       (5 depts × 2 targets × 3 horizons)
Reports: 0          (these are generated on demand, not seeded)
```

After seeding, run all three jobs to populate fresh scores:

```bash
npm run run:anomaly-job
npm run run:forecast-job
npm run run:risk-job
```

Then flush Redis so the seed data is served (not stale cached data):

```bash
redis-cli flushdb
# WARNING: Only do this in development — clears all Redis keys
```

---

### Step B — Remove Auth Bypasses

Search both codebases for any lines that skip authentication:

```bash
# Search server code for bypass patterns
grep -rn "NODE_ENV.*dev.*next()" server/src/ 2>/dev/null
grep -rn "return next()" server/middleware/ 2>/dev/null
grep -rn "// validateJWT" server/routes/ 2>/dev/null
```

If you find something like:
```typescript
// TEMPORARY: skip auth in dev
if (process.env.NODE_ENV === 'development') return next();
```

**Remove it.** Auth must work in all environments for the demo.

---

### Step C — Extend JWT Expiry for Demo Day

The JWT access token expires every 15 minutes by default. During a demo, you don't want to be interrupted by a 401 error. Temporarily extend it.

In **Module 1**'s login handler (ask your Module 1 teammate if needed):
```typescript
// Change from:
jwt.sign(payload, secret, { expiresIn: '15m' });

// To (for demo day only):
jwt.sign(payload, secret, { expiresIn: '24h' });
```

**Remember to revert this after the demo/submission.**

---

### Step D — TypeScript Zero-Error Check

```bash
# Server check
cd server
npx tsc --noEmit
# Expected output: nothing (zero errors = no output)

# Client check  
cd client
npx tsc --noEmit
# Expected output: nothing

# Client build check (catches runtime issues too)
cd client
npm run build
# Expected: Build completed successfully
# Warning: "Some chunks are larger than 500 kBs" is OK — this is just a size warning, not an error
```

**If you get TypeScript errors:** Fix each one before moving to Day 17. Common causes:
- Missing types added in Days 9–15 that aren't properly imported
- Functions in `api.ts` referencing interfaces that weren't exported
- New pages using props that don't match their component's interface

---

### 📋 Day 16 Outcome

All collections seeded with demo-ready data. Auth bypasses removed. JWT extended for demo. Zero TypeScript errors on both server and client.

---

---

## Day 17 — Skeleton Loaders and Error States on All Pages

### 🎯 Goal & Reasoning

Every page that loads data from an API must show a skeleton loading state while the fetch is in progress, and an error message if the fetch fails. Without this, a stopped backend produces a blank white screen — which looks like a bug, not a graceful failure.

The `SkeletonLoader` component was built in Day 6 and is already used in some pages. Today you verify every page uses it correctly.

---

### Pages to Check

| Route | Page | Should Show |
|---|---|---|
| `/dashboard` | `Dashboard.tsx` | Skeleton cards (6 cards) + skeleton chart areas |
| `/deep-insights` | `DeepInsights.tsx` | Skeleton table rows |
| `/forecast` | `ForecastPage.tsx` | Skeleton chart area |
| `/risk` | `RiskPage.tsx` | Skeleton table rows |
| `/reports/builder` | `ReportBuilder.tsx` | No async on load, no skeleton needed |
| `/reports/history` | `ReportHistory.tsx` | Skeleton table rows |
| `/reports/schedules` | `ReportSchedules.tsx` | Skeleton table rows |

---

### How to Test Each Page

```bash
# 1. Stop the Node backend (Ctrl+C in the backend terminal)

# 2. Keep the frontend running

# 3. Navigate to each route
# Expected sequence for each page:
#   - Skeleton pulses for 2–3 seconds (the fetch timeout period)
#   - Then a red error banner appears with the error message
#   - The page does NOT crash or show a blank white screen
```

---

### Standard Pattern for Loading + Error States

Every page that fetches data should follow this pattern. If any page doesn't match, update it:

```typescript
// At the top of each page component:
const [data, setData] = useState<YourType | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

// In useEffect:
try {
  const result = await yourApiCall();
  setData(result);
} catch (err: any) {
  setError(err.response?.data?.error || 'Failed to load data. Is the backend running?');
} finally {
  setLoading(false);
}

// In JSX (render logic):
if (loading) return <SkeletonLoader rows={5} />;

if (error) return (
  <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm m-6">
    <strong>Error:</strong> {error}
  </div>
);

// Normal content:
return <YourPageContent data={data} />;
```

---

### 📋 Day 17 Outcome

Every page shows skeleton loaders during loading and error banners on failure. No page crashes or shows a blank screen.

---

---

## Day 18 — Full End-to-End Integration Test

### 🎯 Goal & Reasoning

Start every service, run every job, and walk through the complete demo script manually. This is your final check before the actual demo. Treat it exactly like the real demo — same order, same actions, same timing.

---

### Service Startup Order

Start each in a separate terminal window:

```bash
# Terminal 1 — Redis
memurai          # Windows
# or: redis-server  # Linux/Mac

# Terminal 2 — FastAPI ML service
cd ml_service
python -m uvicorn main:app --port 8000

# Terminal 3 — Module 1 backend (for JWT + decision data)
cd module1/server
npm run dev

# Terminal 4 — Module 2 backend (for compliance data)
cd module2/server
npm run dev

# Terminal 5 — Module 3 backend
cd module3/server
npm run dev
# CHECK: All of these must appear in the logs:
# ✅ MongoDB connected
# ✅ Redis connected
# ✅ [AnomalyJob] Scheduled: every 24 hours (daily at 00:00)
# ✅ [ForecastJob] Scheduled: daily at 02:00
# ✅ [RiskJob] Scheduled: daily at 01:00
# ✅ [ScheduleJob] Scheduled: checks every hour

# Terminal 6 — Run all jobs to populate fresh data
cd module3/server
npm run run:anomaly-job    # Populates m3_anomalies
npm run run:forecast-job  # Populates m3_forecasts
npm run run:risk-job      # Updates riskScore/riskLevel in m3_kpi_snapshots

# Terminal 7 — Frontend
cd module3/client
npm run dev
```

---

### Login and JWT Setup

1. Open `http://localhost:5173/` (or whatever Module 1's frontend port is)
2. Log in as a manager-level user
3. Open browser DevTools → Application → localStorage
4. Copy the JWT token value
5. Navigate to `http://localhost:5173/dashboard` (Module 3's frontend)
6. If the dashboard shows 401 errors, paste the token into localStorage under the correct key name

---

### 12-Point Integration Validation Checklist

Go through each item below in order. Mark ✅ or ❌.

| # | What to Do | Expected Result |
|---|---|---|
| 1 | Open `/dashboard` | 6 KPI cards load with real numbers (not 0 or NaN) |
| 2 | Change department filter | All 6 cards AND all 3 charts update at the same time |
| 3 | Click Acknowledge on an anomaly | Anomaly disappears from the Real-Time Anomalies panel |
| 4 | Navigate to `/deep-insights` | Anomaly table loads; severity filter works |
| 5 | Click a Decision ID link | Opens correct Module 1 URL |
| 6 | Navigate to `/forecast` | Confidence band chart renders; horizon/target/dept toggles all work |
| 7 | Navigate to `/risk` | Department ranking table with real scores; click row opens modal |
| 8 | Navigate to `/reports/builder` → generate CSV | Spinner appears → Download button → CSV file opens with data |
| 9 | Generate Excel from builder | `.xlsx` file has 2 sheets (KPI Summary + Anomaly List) |
| 10 | Navigate to `/reports/history` | All 3 generated reports appear; Download re-works |
| 11 | Navigate to `/reports/schedules` → create schedule | Schedule appears in table with toggle |
| 12 | `cd server && npx tsc --noEmit` AND `cd client && npx tsc --noEmit` | Zero errors on both |

**If any check fails:** Stop. Debug it before proceeding. Do not leave failing checks for demo day.

---

### 📋 Day 18 Outcome

All 12 validation checks pass. The system is demo-ready.

---

---

## Day 19 — 3-Minute Demo Prep + Final Repository Summary

### 🎯 Goal & Reasoning

The demo is typically 3 minutes for a project assessment. Practice the script below until you can do it in 3 minutes without pausing to think. Know what to click next before you finish the current action.

---

### Pre-Demo Checklist (Run in This Exact Order)

```bash
# 1. Start Redis
memurai   # Windows

# 2. Start ML service
cd ml_service && python -m uvicorn main:app --port 8000

# 3. Start Module 3 backend
cd server && npm run dev

# 4. Populate fresh data
npm run run:anomaly-job
npm run run:forecast-job
npm run run:risk-job

# 5. Flush Redis (so seed data is served fresh, not stale)
redis-cli flushdb

# 6. Start frontend
cd client && npm run dev

# 7. Log into Module 1 → get fresh JWT → paste into Module 3 localStorage

# 8. Open: http://localhost:5173/dashboard
```

---

### 3-Minute Demo Script

| Time | Screen | What to Say |
|---|---|---|
| 0:00–0:35 | `/dashboard` — KPI cards + anomaly panel | "This is the live analytics dashboard for GovVision Module 3. Six KPI cards update every 30 seconds via Redis-cached aggregations from MongoDB. Approval rate, cycle time, compliance rate, risk level, anomaly count. The department filter updates all six cards and all three charts simultaneously." |
| 0:35–1:00 | Click anomaly → `/deep-insights` | "The Isolation Forest model ran at midnight and flagged this Finance decision — 148-hour cycle time, 9 rejections. I can acknowledge it here. The Deep Insights page shows the full severity breakdown and which features drove the anomalies most — cycle time and rejection count." |
| 1:00–1:25 | `/forecast` | "Prophet time-series forecasting runs nightly at 2AM. This 30-day confidence band shows the predicted decision volume. I can switch to approval delay forecast or change the horizon to 7 or 14 days." |
| 1:25–1:50 | `/risk` | "Random Forest model scores all departments daily at 1AM using 7 features from Module 2 compliance data. Finance has the highest risk score. Clicking it shows feature importance — avgCompositeRisk and violationCount are the top drivers." |
| 1:50–2:25 | `/reports/builder` → generate Excel | "I can generate an executive summary for any date range and department combination in CSV, Excel, or PDF. Excel gives two styled sheets — KPI summary and anomaly list. Generating now... and the file downloads directly." |
| 2:25–3:00 | `/reports/history` → `/reports/schedules` | "Every generated report is archived here with a re-download link. Scheduled reports can automate this — weekly CSV delivery every Monday. The entire system runs on 3 Node.js servers, Python FastAPI, MongoDB, and Redis, connected by JWT auth and a shared service key." |

---

### Final Repository State

**Fully Implemented after Days 1–19:**

| Feature | Route |
|---|---|
| Live KPI Dashboard (Redis-cached, 30s polling) | `/dashboard` |
| Deep Insights anomaly page with acknowledge flow | `/deep-insights` |
| Prophet forecast page (volume + delay, 3 horizons) | `/forecast` |
| Risk Score Dashboard (Random Forest, feature drill-down) | `/risk` |
| Report Generator (CSV/Excel/PDF) | backend only |
| Report Builder UI | `/reports/builder` |
| Report History UI | `/reports/history` |
| Scheduled Reports (backend + management UI) | `/reports/schedules` |

**Placeholder pages (intentionally blank — not part of Module 3 scope):**

| Route | Status |
|---|---|
| `/anomaly` | Placeholder (Deep Insights is the anomaly page) |
| `/settings` | Placeholder |
| `/support` | Placeholder |

---

### 📋 Final Outcome

GovVision Module 3 is complete. The system delivers:
- Live KPI dashboard with Redis-cached analytics
- Isolation Forest anomaly detection pipeline (daily at 00:00)
- Prophet forecasting pipeline for volume and delay (daily at 02:00)
- Random Forest risk scoring pipeline (daily at 01:00)
- Complete report generation in three formats
- Scheduled report automation
- Full cross-module integration with Modules 1 and 2
- JWT-protected APIs with role-based access control
- React frontend with 6 fully working pages
- Zero TypeScript errors on both server and client

---

## Appendix A — Environment Variables Reference

| Variable | Where Used | Example Value |
|---|---|---|
| `MONGODB_URI` | All Mongoose models | `mongodb://localhost:27017/govvision` |
| `JWT_SECRET` | `validateJWT` middleware | shared across M1/M2/M3 |
| `SERVICE_KEY` | service-to-service calls | long random string |
| `ML_SERVICE_URL` | anomalyJob, forecastJob, riskScoringJob | `http://localhost:8000` |
| `M2_SERVICE_URL` | reportHelpers compliance fetch | `http://localhost:3002` |
| `REDIS_URL` | `cacheService.ts` | `redis://localhost:6379` |
| `PORT` | `server.ts` | `5002` |
| `CLIENT_URL` | CORS config | `http://localhost:5173` |

---

## Appendix B — All New Files Created in Days 8–19

| Day | File | What It Is |
|---|---|---|
| 9 | `client/src/pages/ForecastPage.tsx` | Forecast page container |
| 9 | `client/src/components/ForecastChart.tsx` | ECharts confidence band chart |
| 9 | `client/src/components/HorizonToggle.tsx` | 7/14/30 day toggle |
| 9 | `client/src/components/TargetToggle.tsx` | Volume/Delay toggle |
| 10 | `ml_service/training/train_risk_model.py` | Random Forest training script |
| 10 | `ml_service/models/random_forest.pkl` | Trained model artifact (generated) |
| 10 | `server/jobs/riskScoringJob.ts` | Daily risk scoring cron at 01:00 |
| 11 | `client/src/pages/RiskPage.tsx` | Risk Score Dashboard page |
| 11 | `client/src/components/RiskTable.tsx` | Dept ranking table |
| 11 | `client/src/components/RiskLevelBadge.tsx` | Coloured level badge |
| 11 | `client/src/components/RiskPieChart.tsx` | Level distribution pie chart |
| 11 | `client/src/components/FeatureBreakdownModal.tsx` | Feature importance drill-down |
| 12 | `server/services/reportGenerator.ts` | CSV/Excel/PDF generator |
| 12 | `server/utils/reportHelpers.ts` | Data assembly for reports |
| 12 | `server/generated_reports/` | Output directory for generated files |
| 13 | `client/src/pages/ReportBuilder.tsx` | Report configuration + generate UI |
| 13 | `client/src/components/DateRangePicker.tsx` | Date from/to inputs |
| 13 | `client/src/components/FormatSelector.tsx` | CSV/Excel/PDF radio selector |
| 14 | `client/src/pages/ReportHistory.tsx` | Report archive + download UI |
| 15 | `server/jobs/reportScheduleJob.ts` | Hourly schedule runner |
| 15 | `client/src/pages/ReportSchedules.tsx` | Schedule management page |
| 15 | `client/src/components/AddScheduleModal.tsx` | Create schedule modal |

---

## Appendix C — Common Mistakes and How to Avoid Them

**Mistake 1 — Starting the frontend from the wrong directory**
Always `cd client` before `npm run dev`. Running it from the repo root will fail.

**Mistake 2 — Forgetting to import job files in server.ts**
If a cron job doesn't appear in startup logs, check that `import './jobs/yourJob'` is in `server.ts`. The file must be imported for the cron schedule to register.

**Mistake 3 — JWT expired during demo**
Re-login to Module 1 right before the demo. The token must be pasted into localStorage in Module 3's browser tab.

**Mistake 4 — FastAPI not running**
Both anomaly detection and forecast data require FastAPI. It must be started before the Node backend. Check: `curl http://localhost:8000/health` should return `{ "status": "ok" }`.

**Mistake 5 — Random Forest pkl file missing**
If you cloned fresh or someone deleted `models/`, the pkl won't exist. Run `python training/train_risk_model.py` from the `ml_service/` directory before starting the server.

**Mistake 6 — Redis not running causes crashes**
If Redis isn't running, `cacheService.ts` should fall back to direct MongoDB reads gracefully. If it crashes instead, check the `cacheService` implementation has a try/catch around Redis calls.

**Mistake 7 — Wrong port in API base URL**
Your backend runs on port `5002` (based on Doing_Progress2.md). Make sure `VITE_API_URL` in `.env` or the axios `baseURL` points to `http://localhost:5002`, not `3003` (the original plan used 3003, your repo uses 5002).

---

*End of GovVision Module 3 — Progress 2 Detailed Implementation Guide.*
