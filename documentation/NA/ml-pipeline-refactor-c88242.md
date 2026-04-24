# ML Pipeline Refactor: Separate Training from Live Data

This plan fixes the architecture where training data was being displayed on the dashboard by establishing proper separation between training data (BPI dataset) and live/scored data (AI Workflow dataset).

## Problem Summary

Currently both datasets import into `m1_decisions`, creating a mixed collection where:
- Training data (BPI - loan domain, long SLA hours) is visible on dashboard
- Live data (AI Workflow - actual domain) is not distinguished
- Model trains on combined data and scores everything, creating domain mismatch

## Solution Architecture

**Three Collection Strategy:**
1. `m1_training_decisions` → BPI data only (normalized, for model training)
2. `m1_decisions` → AI Workflow data (live feed, gets scored) - KEEPING CURRENT NAME
3. `anomalies` → Scoring results from live data only

**Data Flow:**
```
BPI CSV → importBPI.ts → m1_training_decisions → train_isolation_forest.py → frozen model
                                                                           ↓
AI Workflow CSV → importCSV.ts → m1_decisions → anomalyJob.ts (scoring) → anomalies collection
                                                                                ↓
                                                                        Dashboard (live metrics only)
```

## Implementation Steps

### Phase 1: Schema Normalization & Collection Separation

**1. Create new Mongoose models:**
- `server/models/m1TrainingDecisions.ts` - For BPI training data with normalization
- Update `server/models/m1Decisions.ts` - Add `isScored`, `anomalyScore`, `source` fields for live data
- Keep `m1Decisions.ts` as the LIVE collection (no breaking change)

**2. Update `server/scripts/importBPI.ts`:**
- Change target collection to `m1_training_decisions`
- Add schema normalization to match target schema:
  - `id` → ObjectId (auto)
  - `status` → normalized to "approved"|"rejected"|"pending"
  - `createdAt/completedAt` → Date objects with +9 year shift
  - `cycleTimeHours` → scaled down by factor of 10 (loan hours → workflow hours)
  - `rejectionCount/revisionCount/stageCount` → direct mapping
  - `daysOverSLA` → computed from normalized cycle time
  - `departmentId/departmentName` → from hash-based mapping
  - `hourOfDaySubmitted` → from createdAt
  - `priority` → normalized to "low"|"medium"|"high"
  - `decisionId` → generated from caseId
- Add `source: 'bpi_aggregated'` field for tracking

**3. Update `server/scripts/importCSV.ts` (AI Workflow import):**
- Keep target collection as `m1_decisions` (current live collection)
- Schema is already mostly aligned, just ensure all target fields present
- Add `source: 'ai_workflow'` field for tracking
- Add `isScored: false` flag for initial ingestion

**4. Update `ml_service/training/train_isolation_forest.py`:**
- Change source collection from `m1_decisions` to `m1_training_decisions`
- Keep model training logic identical (features: cycleTimeHours, rejectionCount, revisionCount, daysOverSLA)
- Add validation that training data has expected `source` field

### Phase 2: Live Data Scoring Pipeline

**5. Update `server/jobs/anomalyJob.ts`:**
- Keep source as `m1Decision` model (no change to collection name)
- Only fetch records where `isScored: false` or `lastScoredAt` is older than threshold
- After scoring, update `m1_decisions` with:
  - `isScored: true`
  - `lastScoredAt: new Date()`
  - `anomalyScore: number`
  - `isAnomaly: boolean`
- Store anomaly details in `anomalies` collection with reference to live decision

**6. Update `server/services/kpiAggregator.ts`:**
- Keep source collection as `m1_decisions` (no rename needed)
- All KPIs (approval rate, cycle time, etc.) now computed from live data only
- Add filter `source: 'ai_workflow'` to ensure no training data included

**7. Update `server/routes/analyticsRoutes.ts`:**
- All `/api/analytics/*` endpoints query `m1_decisions` only (unchanged)
- Add explicit filter `source: 'ai_workflow'` to exclude any training data

### Phase 3: Dashboard Architecture Fix

**8. Update `client/src/services/api.ts`:**
- No changes needed - API endpoints stay same, just backend data source changes
- Dashboard will automatically show live data only

**9. Update `client/src/pages/Dashboard.tsx`:**
- No changes needed - already uses API services
- Optionally add indicator showing "Live Data" vs "Training Data" mode

**10. Add admin/debug view (optional):**
- New route `/api/admin/training-data` to view training data for validation
- New route `/api/admin/model-info` to view model training metadata

## Schema Mapping Reference

### Dataset Comparison Summary

| Aspect | **BPI Dataset** (Training) | **AI Workflow Dataset** (Live) |
|--------|---------------------------|-------------------------------|
| **Records** | ~31,000 | 2,500 |
| **Domain** | Bank loan applications | AI workflow optimization |
| **Cycle Time Scale** | Hundreds of hours (days) | Minutes to hours |
| **Import Script** | `importBPI.ts` | `importCSV.ts` |
| **Target Collection** | `m1_training_decisions` | `m1_decisions` |

### Raw CSV Fields (Side by Side)

| BPI CSV Column | AI Workflow CSV Column | Notes |
|----------------|----------------------|-------|
| `caseId` | *(no direct equivalent)* | BPI: Unique case identifier |
| `createdAt` | `Task_Start_Time` | Both: When decision started |
| `completedAt` | `Task_End_Time` | Both: When decision ended |
| `cycleTimeHours` | `Actual_Time_Minutes` | BPI: Hours directly, AI: Minutes → Hours |
| `status` | `Task_Type` | BPI: status string, AI: "Approval"/"Escalation" |
| `priority` | `Priority_Level` | Both: Priority string |
| `rejectionCount` | `Delay_Flag` | BPI: Count directly, AI: Flag (0/1) |
| `revisionCount` | `Employee_Workload` | BPI: Count directly, AI: Workload number |
| `stageCount` | `Approval_Level` | BPI: Count directly, AI: "Level 1/2/3" |
| `departmentId` | `Department` | BPI: Abstract hash, AI: Department name |
| *(no equivalent)* | `Decision_ID` | AI: Unique decision ID |

### Complete Field Transformation Table

| Target DB Field | Type | BPI Transformation Logic | AI Workflow Transformation Logic | Normalization Applied |
|-----------------|------|-------------------------|----------------------------------|----------------------|
| `_id` | ObjectId | Auto-generated by MongoDB | Auto-generated by MongoDB | None |
| `decisionId` | String | `caseId.replace("Application_", "Decision_")` | Use `Decision_ID` if present, else generate from index | BPI: String replace |
| `status` | String | `balanceStatus(originalStatus, caseId)`:<br>- rejected → 15% approved, 85% rejected<br>- pending → 30% approved, 70% pending<br>- approved → 95% approved, 5% rejected | `mapStatus(Task_Type, completedAt)`:<br>- "Approval" → "approved"<br>- "Escalation" → "rejected"<br>- else → "pending" if no completedAt | BPI: Preserves rejection-heavy BPI distribution |
| `createdAt` | Date | `new Date(createdAt)` then mapped to **2024-2025** window | `mapStartTimeToTargetWindow(Task_Start_Time)` mapped to **2026-Jan to 2026-Apr 22** | BPI: Training era 2024-2025, AI: Live era 2026-current |
| `completedAt` | Date | Computed from `createdAt + cycleTimeHours` within 2024-2025 | Computed: `createdAt.getTime() + durationMs` within 2026-current | Both: Computed from cycle time, date ranges separate |
| `cycleTimeHours` | Number | `parseFloat(cycleTimeHours) / 12` (**÷12 to align distributions**) | `Actual_Time_Minutes / 60` then through `deriveCycleTime()` enrichment | **CRITICAL: BPI ÷12 (72-336h → 6-28h) to overlap with AI (0.5-24h)** |
| `rejectionCount` | Number | `parseInt(rejectionCount)` or 0 | `Delay_Flag === "1" ? random(1-3) : 0` then through `deriveRejectionCount()` | BPI: Direct, AI: Derived from flag |
| `revisionCount` | Number | `parseInt(revisionCount)` or 0 | `parseInt(Employee_Workload)` or 0 then through `enrichOriginalDistribution()` | AI: Enriched with distribution logic |
| `daysOverSLA` | Number | `Math.max(0, (cycleTimeHours - slaHours) / 24)` after compression | `recalcDaysOverSLA(cycleTimeHours, revisionCount)`: `Math.max(0, (cycleTime - revision*0.8) / 24)` | Both: Computed relative to SLA |
| `stageCount` | Number | `parseInt(stageCount)` or 0 | `mapStageCount(Approval_Level)`:<br>- "Level 1" → 1<br>- "Level 2" → 2<br>- "Level 3" → 3 | AI: String → Number mapping |
| `departmentId` | String | `getDepartment(departmentId)`:<br>Hash-based mapping to FI001, HR002, OP003, IT004, CS005 | `mapDepartmentMeta(Department).departmentId`:<br>Canonical lookup (FI001, HR002, etc.) | Both: Map to canonical 5 depts |
| `departmentName` | String | Same hash function returns dept name string | `mapDepartmentMeta(Department).departmentName` | Both: Consistent 5 department names |
| `hourOfDaySubmitted` | Number | `createdAt.getHours()` | `createdAt.getHours()` (after time mapping) | Both: Extracted from timestamp |
| `priority` | String | `priority.toLowerCase()` | `normalize(Priority_Level)` → lower case | Both: Normalized to low/medium/high |
| `source` | String | Hardcoded: `'bpi_aggregated'` | Hardcoded: `'ai_workflow'` | Tracks data origin |
| `isScored` | Boolean | `null` (N/A - training data not scored) | `false` initially, set to `true` after anomaly job runs | Live data only |
| `anomalyScore` | Number | `null` (N/A) | Populated by `anomalyJob.ts` via ML service | Live data only |
| `lastScoredAt` | Date | `null` (N/A) | Set to `new Date()` when scored | Live data only |

### BPI-Specific Normalizations (Domain Adaptation)

| Issue | Current BPI Value | Target Scale | Transformation |
|-------|------------------|--------------|----------------|
| Cycle time magnitude | 72-336 hours (loan SLA) | 0.5-24 hours (workflow) | **Divide by 12** via `timeCompressionFactor` to align distributions |
| Date era | 2016-2017 | BPI: 2024-2025, AI: 2026-Apr 2026 | **BPI**: Map to 2024-2025 range, **AI**: Map to 2026-current |
| Status imbalance | Mostly rejected/pending (realistic) | Preserve rejection-heavy distribution | **Minimal flipping**: 15% rejected→approved, 30% pending→approved |
| Abstract resources | Resource_12345 | Finance, HR, etc. | **Hash modulo 5** to canonical departments |

### AI Workflow-Specific Normalizations

| Issue | Raw Value | Transformation | Output |
|-------|-----------|----------------|--------|
| Time window | Various dates | `mapStartTimeToTargetWindow()` | Mapped to 2025-01-01 → 2026-03-15 |
| Minutes → Hours | `Actual_Time_Minutes` | `/ 60` | Hours float |
| Flag → Count | `Delay_Flag` (0/1) | `=== "1" ? random(1-3) : 0` | Rejection count |
| Workload → Revisions | `Employee_Workload` (number) | `parseInt()` then enrichment | Revision count with distribution |
| String levels | `Approval_Level` ("Level 1") | String match to integer | Stage count 1-3 |
| Department names | "Finance", "HR", "operations" | `DEPT_ALIAS_TO_CANONICAL` mapping | FI001, HR002, etc. |

### Transformation Functions Reference

```typescript
// BPI: Time compression for domain compatibility
const timeCompressionFactor = 12; // Aligns BPI (72-336h) with AI workflow (0.5-24h)
newCycleTime = originalCycleTime / timeCompressionFactor;

// BPI: Status flip with CONSISTENT feature adjustment
function balanceStatusWithFeatures(original: string, caseId: string, doc: any): { status: Status, adjustedDoc: any } {
  const h = hashString(caseId);
  let newStatus = original;
  let adjusted = { ...doc };
  
  // Determine new status (35% rejected→approved, 40% pending→approved)
  if (original === "rejected" && (h % 100) < 35) {
    newStatus = "approved";
    // CRITICAL: Adjust features to match approved status
    adjusted.rejectionCount = Math.min(doc.rejectionCount, 1);     // Approved cases have 0-1 rejections
    adjusted.revisionCount = Math.min(doc.revisionCount, 2);       // Approved cases have 0-2 revisions
    adjusted.cycleTimeHours = Math.min(doc.cycleTimeHours, doc.slaHours * 0.9); // Within SLA
    adjusted.daysOverSLA = 0;                                         // Approved cases not over SLA
  }
  else if (original === "pending" && (h % 100) < 40) {
    newStatus = "approved";
    // Same adjustments for pending→approved
    adjusted.rejectionCount = Math.min(doc.rejectionCount, 1);
    adjusted.revisionCount = Math.min(doc.revisionCount, 2);
    adjusted.cycleTimeHours = Math.min(doc.cycleTimeHours, doc.slaHours * 0.85);
    adjusted.daysOverSLA = 0;
  }
  
  return { status: newStatus, adjustedDoc: adjusted };
}

// AI: Department canonicalization
const DEPT_ALIAS_TO_CANONICAL = {
  "finance": "finance", "fin": "finance", "financial": "finance",
  "hr": "human resources", "human resources": "human resources",
  "operations": "operations", "ops": "operations",
  "it": "information technology", "tech": "information technology",
  "customer service": "customer service", "cs": "customer service"
};

// AI: Distribution-based enrichment (adds realistic variance)
function enrichOriginalDistribution(base: Features): Features {
  const roll = Math.random();
  if (roll < 0.82) { /* 82% normal - slight variation */ }
  else if (roll < 0.94) { /* 12% borderline */ }
  else if (roll < 0.99) { /* 5% elevated */ }
  else { /* 1% critical outliers */ }
}
```

## Files to Modify

### Server Scripts
- `server/scripts/importBPI.ts` (complete rewrite with normalization)
- `server/scripts/importCSV.ts` (change target collection, add isScored flag)

### Models
- `server/models/m1TrainingDecisions.ts` (new - for BPI training data)
- (no new model needed - keep using m1Decisions.ts for live data)
- `server/models/m1Decisions.ts` (mark deprecated, add migration note)

### Jobs & Services
- `server/jobs/anomalyJob.ts` (change to live collection, add scoring status tracking)
- `server/services/kpiAggregator.ts` (change to live collection)
- `server/services/mlService.ts` (update collection references if any)

### Routes
- `server/routes/analyticsRoutes.ts` (add live-only filters)
- `server/routes/aiRoutes.ts` (verify anomaly queries use correct collection)

### ML Service
- `ml_service/training/train_isolation_forest.py` (change collection name)
- `ml_service/main.py` (no changes needed)

### Client
- No required changes (API contract remains same)
- Optional: Add "Live Data" indicator in Dashboard

## Migration Steps (After Code Deploy)

1. **Clear old mixed data:**
   ```bash
   cd server
   npm run reset-decisions  # Clears m1_decisions (old mixed collection)
   ```

2. **Import training data (BPI):**
   ```bash
   npx ts-node scripts/importBPI.ts
   # Imports into m1_training_decisions only
   ```

3. **Train model on clean training data:**
   ```bash
   cd ml_service
   python training/train_isolation_forest.py
   # Trains on m1_training_decisions only
   ```

4. **Import live data (AI Workflow):**
   ```bash
   cd server
   npx ts-node scripts/importCSV.ts
   # Imports into m1_decisions (live collection)
   ```

5. **Run initial scoring:**
   ```bash
   npm run job:anomaly  # Scores m1_decisions against frozen model
   ```

6. **Verify dashboard:**
   - Open dashboard
   - Confirm metrics reflect AI Workflow data patterns (not BPI loan patterns)
   - Anomalies should be from AI Workflow domain

## Testing & Validation

- [ ] importBPI creates records only in m1_training_decisions
- [ ] importCSV creates records only in m1_decisions
- [ ] train_isolation_forest loads from m1_training_decisions
- [ ] anomalyJob scores only m1_decisions with isScored=false
- [ ] Dashboard queries return only m1_decisions data (with source filter)
- [ ] KPI calculations reflect AI Workflow scale (hours, not hundreds of hours)
- [ ] Anomaly detection works on live data with frozen model

## Technical Improvements (from gmegin review)

### 1. Database Performance & Indexing
Add explicit fields and indexes to `m1Decisions.ts`:
```typescript
const decisionSchema = new Schema({
    // ... existing fields ...
    source: { type: String, default: 'ai_workflow', index: true },
    isScored: { type: Boolean, default: false, index: true },
    anomalyScore: { type: Number },
    isAnomaly: { type: Boolean },
    lastScoredAt: { type: Date }
}, { collection: "m1_decisions", strict: false })

// Compound index for anomaly job queries
decisionSchema.index({ isScored: 1, completedAt: -1 });
```

### 2. Optimize `anomalyJob.ts` with bulkWrite
Replace N+1 updates with batch operations:
```typescript
const bulkOps = results.map(r => ({
    updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(r.id) },
        update: { 
            $set: { 
                isScored: true, 
                anomalyScore: r.anomalyScore,
                isAnomaly: r.isAnomaly,
                lastScoredAt: new Date()
            } 
        }
    }
}));
await m1Decision.bulkWrite(bulkOps);
```

### 3. CRITICAL: Fix Cycle Time Scaling Factor
**Issue identified**: BPI 72-336h ÷ 3 = 24-112h, but AI workflow is 0.5-24h. Distributions won't overlap!

**New scaling approach**:
| Dataset | Original Range | Compression Factor | Target Range |
|---------|---------------|-------------------|--------------|
| BPI | 72-336 hours | **÷ 12** (not 3) | **6-28 hours** |
| AI Workflow | 0.5-160 hours | None | 0.5-160 hours |

This aligns BPI's center (was 168h, now ~14h) with AI's center (~12h). Outliers will still be detected.

**Alternative**: Use RobustScaler in `train_isolation_forest.py` instead of StandardScaler to handle different distributions.

### 4. Migration Safety (Production)
Instead of wiping `m1_decisions`:
```bash
# Inside MongoDB shell
db.m1_decisions.renameCollection("m1_training_decisions")
# Then run importCSV.ts to create fresh m1_decisions
```
Zero downtime for dashboard users.

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| BPI scaling factor wrong (distributions don't overlap) | **TEST**: Plot histograms before/after; adjust factor from 3 → 12 if needed |
| Data loss during migration | **Rename** instead of delete; keep backup until verified |
| Model performs poorly on AI Workflow | Validate score distributions; switch to RobustScaler if needed |
| Performance degradation | Add indexes on `isScored`, `source`, compound `{isScored:1, completedAt:-1}` |
| Inconsistent anomaly state | Update both `m1_decisions` and `anomalies` collections on user actions |
| Collection name typos | Use constants file; add validation checks |

## Anomaly Detection: How It Works

### Multivariate Detection (Not Just Cycle Time)

The Isolation Forest model is **multivariate** - it learns relationships between ALL features simultaneously, not just looking at cycle time in isolation.

### Learned Patterns

| Relationship | Model Expectation | Anomaly Trigger |
|--------------|-------------------|-----------------|
| `cycleTimeHours` vs `stageCount` | Complex decisions (5 stages) take longer | Simple decision (1 stage) with 50h = ANOMALY |
| `rejectionCount` vs `revisionCount` | Rejections correlate with revisions | High rejections but 0 revisions = ANOMALY |
| `daysOverSLA` vs `priority` | High priority should resolve faster | Critical priority + 20 days over SLA = ANOMALY |
| `cycleTimeHours` alone | Most decisions cluster 6-28h | 80+ hours = ANOMALY (regardless of other features) |

### Detection Examples

| Decision | Features | Status | Why |
|----------|----------|--------|-----|
| Simple approval | 1 stage, 8h, 0 rejections | ✅ Normal | Matches trained pattern |
| Complex approval | 5 stages, 50h, 2 rejections | ✅ Normal | Proportional to complexity |
| Fast rejection | 1 stage, 2h, 3 rejections | ✅ Normal | Quick rejection is expected |
| **Delayed simple** | 1 stage, **50h**, 0 rejections | 🚨 **ANOMALY** | Too long for simple decision |
| **Stuck pending** | 2 stages, **80h**, pending status | 🚨 **ANOMALY** | Far outside normal range |
| **SLA breach** | Any stages, any time, **daysOverSLA > 14** | 🚨 **ANOMALY** | Extreme SLA violation |
| **High rejections** | 2 stages, 12h, **5+ rejections** | 🚨 **ANOMALY** | Unusual rejection count |

### Severity Levels

| Anomaly Score | Severity | Action |
|---------------|----------|--------|
| 0.0 - 0.3 | Normal | No action |
| 0.3 - 0.6 | Borderline | Monitor, investigate if pattern |
| 0.6 - 0.8 | Elevated | Flag for review |
| 0.8+ | Critical | Immediate alert |

### How BPI Training Enables Detection

**BPI Training Data (after normalization):**
- Range: 6-28 hours
- Most rejections: 0-2
- Most revisions: 0-3
- Pattern: Higher stages = longer time

**AI Workflow Live Data:**
- Normal: 2-20 hours → **Not flagged** (within learned pattern)
- Borderline: 30-50 hours + low stages → **Flagged** (outside pattern)
- Critical: 60-160 hours → **Flagged** (far outside pattern)

### Key Insight

The model learns **relative proportions**, not absolute thresholds:
- 50h with 5 stages = Normal (complex decision)
- 50h with 1 stage = Anomaly (simple decision taking too long)

This is **more intelligent** than simple thresholding - it catches **truly unjustified delays**, not just 
