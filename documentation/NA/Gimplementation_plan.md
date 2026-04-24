# GovVision Data Pipeline & Architecture Restructure

Based on your priorities, here is the structured, 3-phase execution plan to achieve a clean frozen-model architecture with strict schema normalization.

---

## Phase 1: Schema Normalization (The Foundation)
Nothing works until both datasets share a unified, normalized schema. The BPI dataset (loan domain) needs aggressive time-scaling to match the AI Workflow (rapid domain).

### 1. Unified Mongoose Schema (`server/models/m1Decisions.ts`)
We will rewrite `m1_decisions` to strictly enforce your requested schema:
- **Keys**: `decisionId`
- **Core**: `status`, `createdAt`, `completedAt`
- **Metrics**: `cycleTimeHours`, `rejectionCount`, `revisionCount`, `daysOverSLA`, `stageCount`, `hourOfDaySubmitted`
- **Categorical**: `department`, `departmentId`, `departmentName`, `priority` (low, medium, high)
- **Role Tag**: `source` (enum: 'training', 'live')
- Enforce `strict: true` so legacy BPI fields not in this list are dropped.

### 2. Normalizing `importBPI.ts` (Training Data)
**Code Changes:**
1. **Scope the wipe**: Change `await DecisionModel.deleteMany({})` to `await DecisionModel.deleteMany({ source: "training" })`.
2. **Aggressive Time Compression**: Currently, `timeCompressionFactor = 3`. BPI cycles are ~300 hours. We will increase this factor to `~50-60` so BPI cycle times average ~4-8 hours, matching the AI Workflow dataset. 
3. **Field Mapping**:
   - `departmentId` and `departmentName` both get the canonical `deptName`.
   - `priority`: Force `.toLowerCase()`.
   - `source: "training"` is attached to every inserted document.
4. **Drop missing**: Any raw BPI fields outside the unified schema are simply ignored (enforced by the strict Mongoose schema).

### 3. Normalizing `importCSV.ts` (Live Feed Data)
**Code Changes:**
1. **Scope the wipe**: Change `await m1Decision.deleteMany({})` to `await m1Decision.deleteMany({ source: "live" })`.
2. **Field Mapping**:
   - Add `department: departmentMeta.departmentName` (it currently omits the flat `department` field).
   - Add `decisionId: ` (generate or map from the raw task ID).
   - Ensure `priority` is strictly lowercase.
   - `source: "live"` is attached to every inserted document.

---

## Phase 2: Dataset Role Assignment (The Pipeline)
With the schema normalized, we firmly establish the roles of the two datasets. 

1. **Clear the Database**: We will completely wipe `m1_decisions` once to remove legacy malformed data.
2. **Import BPI (`source: "training"`)**: Run `importBPI.ts`. This inserts 31k rows of normalized, time-scaled baseline data.
3. **Train Models**: The Python training scripts (`train_isolation_forest.py`, `train_random_forest.py`, `train_prophet.py`) will be updated to explicitly query `{"source": "training", "completedAt": {"$exists": True}}`. They will learn from the BPI baseline, save the `.pkl` models, and exit.
4. **Import AI Workflow (`source: "live"`)**: Run `importCSV.ts`. This inserts 2,500 rows of live feed data. Because the wipes are now scoped, it safely coexists with the training data.

---

## Phase 3: Frontend/Live Display Decoupling
The ML Service (FastAPI) is already correctly architected as a frozen-model server. The issue is that the Node.js backend feeds raw training data to the dashboard. We fix this by filtering all server-side aggregations.

### 1. Update Server Cron Jobs
The cron jobs must only send live data to the ML service for scoring:
- `anomalyJob.ts`: Update `m1Decision.find()` to include `{ source: "live" }`
- `riskScoringJob.ts`: Update `m1Decision.distinct()` and the `$match` aggregation pipeline to include `{ source: "live" }`
- `forecastJob.ts`: Update `m1Decision.distinct()` to `{ source: "live" }`

### 2. Update KPI Aggregator
The dashboard metrics are calculated in `kpiAggregator.ts`. 
- Update `calculateKPIs()` to inject `source: "live"` into the MongoDB `$match` filters. This instantly decouples the training data from the dashboard's KPI cards.

### 3. Update Analytics Routes
Direct chart queries in `analyticsRoutes.ts` (Decision Volume, Cycle Time Histogram) must be updated to inject `source: "live"` into their `$match` stages.

---

## Execution Flow
If you approve this structured approach, I will begin execution in the exact order requested:
1. Update `m1Decisions.ts` schema.
2. Refactor `importBPI.ts` and `importCSV.ts` with the new schema and scoping.
3. Update the Python training scripts to bind to `source: "training"`.
4. Update Node.js jobs, aggregators, and routes to bind to `source: "live"`.
