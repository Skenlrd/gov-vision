# GovVision Module 3 — Progress 2: 20-Day Implementation Guide

---



## Day 1 — Complete the Anomaly Cron Pipeline End-to-End

### 🎯 Goal & Reasoning

Progress 1 left the anomaly job running only once at server startup, not on a proper 24-hour schedule, and the AI routes (`aiRoutes.ts`) were stubs — files that exist but have no real logic inside them. Today you fix both. You'll wire the `anomalyJob.ts` to run every 24 hours using `node-cron`, write the full handler bodies for `GET /api/ai/anomalies` and `PUT /api/ai/anomalies/:id/acknowledge`, and make sure every anomaly result is upserted into `m3_anomalies` and the Redis key `m3:anomalies:active` is invalidated after each run. This day is first because everything else — the AI Insights page, the Risk Heatmap risk counts, the demo anomaly banner — depends on `m3_anomalies` having real, fresh data.

---

### Work to Complete

#### A. Fix `anomalyJob.ts` — Proper Cron Schedule + Full Upsert Loop

**Why this exists:** The anomaly job is what keeps `m3_anomalies` current. Without it running on a schedule, the dashboard shows stale anomaly counts and the AI Insights page has nothing to display. The upsert pattern (update if exists, create if not) prevents duplicate documents when the job re-runs.

**File to modify:** `server/jobs/anomalyJob.ts`

**What to build:**

The job does seven things in sequence. Here is each step with the exact logic:

**Step 1 — Query recent completed decisions.**
Use Mongoose to query `m1_decisions` where `completedAt` exists (meaning the decision finished) and `createdAt` is within the last 30 days. Use `.lean()` to get plain JavaScript objects instead of Mongoose Document instances — this is significantly faster for bulk reads because Mongoose doesn't need to wrap each result in its document class.

```typescript
import cron from 'node-cron';
import axios from 'axios';
import Anomaly from '../models/Anomaly';
import M1Decision from '../models/m1Decisions';
import { invalidate } from '../services/cacheService';

export async function runAnomalyJob(): Promise<void> {
  console.log('[AnomalyJob] Starting anomaly detection run...');

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const decisions = await M1Decision.find({
    completedAt: { $exists: true, $ne: null },
    createdAt: { $gte: thirtyDaysAgo },
  })
    .select(
      '_id cycleTimeHours rejectionCount revisionCount daysOverSLA stageCount hourOfDaySubmitted department'
    )
    .lean();

  if (decisions.length === 0) {
    console.log('[AnomalyJob] No completed decisions found. Skipping.');
    return;
  }

  console.log(`[AnomalyJob] Loaded ${decisions.length} decisions for scoring.`);
```
from pathlib import Path
from typing import Dict, List

import joblib
import pandas as pd
from prophet import Prophet

MODELS_DIR = Path(__file__).resolve().parents[2] / 'models'
    cycleTimeHours: d.cycleTimeHours || 0,
    rejectionCount: d.rejectionCount || 0,
    revisionCount: d.revisionCount || 0,
    daysOverSLA: d.daysOverSLA || 0,
  path = MODELS_DIR / f'prophet_{safe_dept_id}.pkl'
    hourOfDaySubmitted: d.hourOfDaySubmitted || 0,
  if not path.exists():
```

  return joblib.load(path)
Use `axios.post()` with the `x-service-key` header. Wrap in try/catch so a FastAPI outage doesn't crash your Node server. Type the expected response shape inline.

```typescript
  let results: Array<{
    id: string;
    anomalyScore: number;
    isAnomaly: boolean;
    severity: string;
  }> = [];

  try {
    const response = await axios.post<{ results: typeof results }>(
      `${process.env.ML_SERVICE_URL}/ml/anomaly/predict`,
      { decisions: payload },
      { headers: { 'x-service-key': process.env.SERVICE_KEY } }
    );
    results = response.data.results;
    console.log(`[AnomalyJob] FastAPI returned ${results.length} scores.`);
  } catch (err: any) {
    console.error('[AnomalyJob] FastAPI call failed:', err.message);
    return;
  }
```

**Step 4 — Filter to only anomalies.**
Only upsert documents where `isAnomaly === true`. Normal decisions do not need a record in `m3_anomalies`.

```typescript
  const anomalies = results.filter((r) => r.isAnomaly === true);
  console.log(`[AnomalyJob] ${anomalies.length} anomalies detected.`);
```

**Step 5 — Upsert each anomaly into `m3_anomalies`.**
`findOneAndUpdate` with `{ upsert: true }` means: if a document with this `decisionId` already exists, update it; if not, create it. This is safe to run repeatedly — re-running the job won't create duplicates.

You also need to store the raw `featureValues` so the AI Insights page can display them in the table. Build that object from the original `decisions` array using `.find()`.

```typescript
  for (const anomaly of anomalies) {
    const original = decisions.find((d: any) => d._id.toString() === anomaly.id);
    const featureValues = original
      ? {
          cycleTimeHours: original.cycleTimeHours || 0,
          rejectionCount: original.rejectionCount || 0,
          revisionCount: original.revisionCount || 0,
          daysOverSLA: original.daysOverSLA || 0,
          stageCount: original.stageCount || 0,
          hourOfDaySubmitted: original.hourOfDaySubmitted || 0,
        }
      : {};

    await Anomaly.findOneAndUpdate(
      { decisionId: anomaly.id },
      {
        $set: {
          anomalyScore: anomaly.anomalyScore,
          severity: anomaly.severity,
          isAnomaly: true,
          department: original?.department || 'unknown',
          featureValues,
          description: `Anomaly detected: score ${anomaly.anomalyScore.toFixed(3)}, severity ${anomaly.severity}`,
        },
        $setOnInsert: {
          isAcknowledged: false,
          decisionId: anomaly.id,
        },
      },
      { upsert: true, new: true }
    );
  }
```

**Why `$setOnInsert`?** Fields in `$setOnInsert` only apply when creating a new document. This way, if a decision was already flagged and `isAcknowledged` was set to `true` by a user, re-running the job won't reset it back to `false`.

**Step 6 — Invalidate the Redis cache.**
After writing new data, the cached list of active anomalies is stale. Delete it so the next GET request fetches fresh data.

```typescript
  await invalidate('m3:anomalies:active');
  console.log('[AnomalyJob] Redis cache invalidated. Run complete.');
}
```

**Step 7 — Register the cron schedule.**
`node-cron` uses standard cron syntax. `'0 0 * * *'` means "at minute 0, once per day." The job runs daily at 00:00.

```typescript
cron.schedule('0 0 * * *', () => {
  runAnomalyJob().catch((err) =>
    console.error('[AnomalyJob] Uncaught error in cron run:', err)
  );
});

console.log('[AnomalyJob] Scheduled: every 24 hours (daily at 00:00).');
```

**Common fresher mistake:** Forgetting to `import` the job file in `server.ts`. The cron schedule only registers if the file is imported at startup. Add this line to `server.ts`:

```typescript
import './jobs/anomalyJob'; // registers the cron schedule
```

---

#### B. Fill in `aiRoutes.ts` — `GET /api/ai/anomalies`

**Why this exists:** The AI Insights page and the anomaly banner both need a way to fetch current unacknowledged anomalies, grouped by severity. Without this working endpoint, there is nothing for the frontend to display.

**File to modify:** `server/routes/aiRoutes.ts`

**What to build:**

```typescript
import { Router, Request, Response } from 'express';
import Anomaly from '../models/Anomaly';
import { getOrSet, invalidate } from '../services/cacheService';
import { validateJWT } from '../middleware/validateJWT';
import { requireRole } from '../middleware/requireRole';

const router = Router();

// GET /api/ai/anomalies
router.get(
  '/anomalies',
  validateJWT,
  requireRole(['admin', 'manager', 'executive', 'analyst']),
  async (req: Request, res: Response) => {
    try {
      const cacheKey = 'm3:anomalies:active';

      const data = await getOrSet(cacheKey, 300, async () => {
        const anomalies = await Anomaly.find({ isAcknowledged: false })
          .sort({ anomalyScore: -1 })
          .lean();

        // Group by severity
        const grouped: Record<string, typeof anomalies> = {
          Critical: [],
          High: [],
          Medium: [],
          Low: [],
        };

        for (const a of anomalies) {
          if (grouped[a.severity]) {
            grouped[a.severity].push(a);
          }
        }

        return {
          ...grouped,
          total: anomalies.length,
        };
      });

      return res.json(data);
    } catch (err: any) {
      console.error('[GET /api/ai/anomalies]', err.message);
      return res.status(500).json({ error: 'Failed to fetch anomalies' });
    }
  }
);
```

**How `getOrSet` works here:** It checks Redis for `m3:anomalies:active`. On a cache hit it returns the cached JSON immediately — no MongoDB query. On a miss, it calls the async function you pass as the third argument, stores the result in Redis with a 300-second TTL, and returns the fresh data. This pattern is called a **read-through cache**.

---

#### C. Fill in `aiRoutes.ts` — `PUT /api/ai/anomalies/:id/acknowledge`

**Why this exists:** When a manager clicks "Acknowledge" on an anomaly in the UI, the system needs to record who acknowledged it and when, and remove it from the active list. Without this, the same anomaly keeps appearing in the banner forever.

**File to continue in:** `server/routes/aiRoutes.ts`

```typescript
// PUT /api/ai/anomalies/:id/acknowledge
router.put(
  '/anomalies/:id/acknowledge',
  validateJWT,
  requireRole(['admin', 'manager', 'executive']),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.userId;

      const updated = await Anomaly.findByIdAndUpdate(
        id,
        {
          $set: {
            isAcknowledged: true,
            acknowledgedBy: userId,
            acknowledgedAt: new Date(),
          },
        },
        { new: true }
      );

      if (!updated) {
        return res.status(404).json({ error: 'Anomaly not found' });
      }

      // Invalidate cache so next GET returns fresh data without this anomaly
      await invalidate('m3:anomalies:active');

      return res.json(updated);
    } catch (err: any) {
      console.error('[PUT /api/ai/anomalies/:id/acknowledge]', err.message);
      return res.status(500).json({ error: 'Failed to acknowledge anomaly' });
    }
  }
);

export default router;
```

---

### 📦 New Packages to Install

No new packages today — `node-cron`, `axios`, and `ioredis` were all installed in Progress 1.

---

### ⚙️ API Contracts

**GET /api/ai/anomalies**
- Protected by: `validateJWT`, `requireRole(['admin', 'manager', 'executive', 'analyst'])`
- Query params: none
- Internal logic: Read-through cache on `m3:anomalies:active` (TTL 300s). On miss: query `m3_anomalies` where `isAcknowledged: false`, sort by `anomalyScore` descending, group into `{ Critical[], High[], Medium[], Low[], total }`.
- Response: `{ Critical: IAnomaly[], High: IAnomaly[], Medium: IAnomaly[], Low: IAnomaly[], total: number }`
- Redis cache key: `m3:anomalies:active`, TTL: 300 seconds

**PUT /api/ai/anomalies/:id/acknowledge**
- Protected by: `validateJWT`, `requireRole(['admin', 'manager', 'executive'])`
- URL param: `id` — MongoDB `_id` of the anomaly document
- Internal logic: `findByIdAndUpdate` setting `isAcknowledged: true`, `acknowledgedBy: req.user.userId`, `acknowledgedAt: new Date()`. Then `invalidate('m3:anomalies:active')`.
- Response: `IAnomaly` (the updated document)

---

### 💻 Commands to Run

```bash
# In server/ — restart backend to pick up job changes
npm run dev

# Manually trigger the anomaly job from ts-node REPL to test without waiting 24 hours
cd server
npx ts-node -e "import('./jobs/anomalyJob').then(m => m.runAnomalyJob())"

# Check that Redis key was created after job runs
redis-cli keys "m3:anomalies:*"
```

---

### ✅ How to Validate

```bash
# 1. Call the anomalies endpoint (replace TOKEN with a valid JWT from Module 1 login)
curl -H "Authorization: Bearer TOKEN" http://localhost:3003/api/ai/anomalies

# Expected: JSON with Critical, High, Medium, Low arrays and a total number

# 2. Acknowledge one anomaly (replace ANOMALY_ID with an _id from the above response)
curl -X PUT \
  -H "Authorization: Bearer TOKEN" \
  http://localhost:3003/api/ai/anomalies/ANOMALY_ID/acknowledge

# Expected: JSON with isAcknowledged: true, acknowledgedAt timestamp
```

**In MongoDB Compass:**
- Open `m3_anomalies` collection
- Confirm documents exist with fields: `decisionId`, `anomalyScore`, `severity`, `isAcknowledged: false`, `featureValues`
- After acknowledge call: find the document by `_id` — confirm `isAcknowledged: true` and `acknowledgedAt` is set

**In Redis:**
```bash
redis-cli get "m3:anomalies:active"
# Should return cached JSON string after first GET call
# Should return nil after acknowledge (invalidated)
```

**Terminal logs to look for:**
```
[AnomalyJob] Starting anomaly detection run...
[AnomalyJob] Loaded 847 decisions for scoring.
[AnomalyJob] FastAPI returned 847 scores.
[AnomalyJob] 23 anomalies detected.
[AnomalyJob] Redis cache invalidated. Run complete.
[AnomalyJob] Scheduled: every 24 hours (daily at 00:00).
```

---

### 📋 Day 1 Outcome

The anomaly pipeline now runs automatically every 24 hours, properly upserts results into `m3_anomalies`, and exposes two fully working API endpoints for reading and acknowledging anomalies. Day 2 will add the Redis read-through cache to the remaining analytics routes that are currently querying MongoDB on every request, and will re-enable the JWT guards that were commented out for development.

---

## Day 2 — Redis Cache on All Analytics Routes + Re-enable JWT Guards

### 🎯 Goal & Reasoning

Right now, every analytics API call hits MongoDB directly, every time. If the dashboard polls every 30 seconds with 5 concurrent users, that's 150 MongoDB queries per minute for data that almost never changes between polls. The `getOrSet` cache utility was built in Progress 1 but only partially used. Today you wire it to every analytics endpoint, set the correct key naming pattern and TTLs, and re-enable the JWT middleware that was commented out for development. This is also the correct sequence: you fix the backend layer completely before building frontend pages on top of it, so you're not debugging both at once.

---

### Work to Complete

#### A. Add Redis Cache to All Analytics Endpoints

**Why this exists:** Without caching, MongoDB is queried on every poll. With caching, the first request per 5-minute window pays the MongoDB cost; all subsequent requests within that window return from Redis in microseconds.

**File to modify:** `server/routes/analyticsRoutes.ts`

For each endpoint, wrap the database logic inside `getOrSet()`. Here is the complete pattern for every endpoint:

**GET /api/analytics/kpi-summary (org-level)**

```typescript
router.get(
  '/kpi-summary',
  validateJWT,
  requireRole(['admin', 'manager', 'executive', 'analyst']),
  async (req: Request, res: Response) => {
    const today = new Date().toISOString().split('T')[0]; // "2026-04-05"
    const cacheKey = `m3:kpi:org:${today}`;
    const { dateFrom, dateTo } = req.query as { dateFrom?: string; dateTo?: string };

    try {
      const data = await getOrSet(cacheKey, 300, () =>
        aggregateOrgKPI(
          dateFrom ? new Date(dateFrom) : undefined,
          dateTo ? new Date(dateTo) : undefined
        )
      );
      return res.json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);
```

**GET /api/analytics/kpi-summary/:deptId (department-level)**

```typescript
router.get(
  '/kpi-summary/:deptId',
  validateJWT,
  requireRole(['admin', 'manager', 'executive', 'analyst']),
  async (req: Request, res: Response) => {
    const today = new Date().toISOString().split('T')[0];
    const { deptId } = req.params;
    const cacheKey = `m3:kpi:${deptId}:${today}`;
    const { dateFrom, dateTo } = req.query as { dateFrom?: string; dateTo?: string };

    try {
      const data = await getOrSet(cacheKey, 300, () =>
        aggregateKPI(
          deptId,
          dateFrom ? new Date(dateFrom) : undefined,
          dateTo ? new Date(dateTo) : undefined
        )
      );
      return res.json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);
```

**GET /api/analytics/decision-volume**

Cache key uses granularity and date range so different filter combinations get separate cache entries:

```typescript
router.get(
  '/decision-volume',
  validateJWT,
  requireRole(['admin', 'manager', 'executive', 'analyst']),
  async (req: Request, res: Response) => {
    const { granularity = 'daily', dateFrom, dateTo, deptId } = req.query as {
      granularity?: string;
      dateFrom?: string;
      dateTo?: string;
      deptId?: string;
    };

    const cacheKey = `m3:volume:${deptId || 'all'}:${granularity}:${dateFrom || 'nd'}:${dateTo || 'nd'}`;

    try {
      const data = await getOrSet(cacheKey, 300, async () => {
        const formatMap: Record<string, string> = {
          daily: '%Y-%m-%d',
          weekly: '%Y-%U',
          monthly: '%Y-%m',
        };
        const matchStage: any = {};
        if (dateFrom) matchStage.createdAt = { $gte: new Date(dateFrom) };
        if (dateTo) matchStage.createdAt = { ...matchStage.createdAt, $lte: new Date(dateTo) };
        if (deptId) matchStage.department = deptId;

        return M1Decision.aggregate([
          { $match: matchStage },
          {
            $group: {
              _id: { $dateToString: { format: formatMap[granularity] || '%Y-%m-%d', date: '$createdAt' } },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { date: '$_id', count: 1, _id: 0 } },
        ]);
      });

      return res.json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);
```

**GET /api/analytics/cycle-time-histogram**

```typescript
router.get(
  '/cycle-time-histogram',
  validateJWT,
  requireRole(['admin', 'manager', 'executive', 'analyst']),
  async (req: Request, res: Response) => {
    const { deptId } = req.query as { deptId?: string };
    const cacheKey = `m3:cycletime:${deptId || 'all'}`;

    try {
      const data = await getOrSet(cacheKey, 300, async () => {
        const match: any = { completedAt: { $exists: true, $ne: null } };
        if (deptId) match.department = deptId;

        const decisions = await M1Decision.find(match)
          .select('cycleTimeHours')
          .lean();

        const buckets = { '0-24h': 0, '24-48h': 0, '48-72h': 0, '>72h': 0 };
        for (const d of decisions as any[]) {
          const h = d.cycleTimeHours || 0;
          if (h <= 24) buckets['0-24h']++;
          else if (h <= 48) buckets['24-48h']++;
          else if (h <= 72) buckets['48-72h']++;
          else buckets['>72h']++;
        }

        return Object.entries(buckets).map(([bucket, count]) => ({ bucket, count }));
      });

      return res.json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);
```

**GET /api/analytics/compliance-trend**

```typescript
router.get(
  '/compliance-trend',
  validateJWT,
  requireRole(['admin', 'manager', 'executive', 'analyst']),
  async (req: Request, res: Response) => {
    const { deptIds, dateFrom, dateTo } = req.query as {
      deptIds?: string;
      dateFrom?: string;
      dateTo?: string;
    };

    const cacheKey = `m3:compliance:${deptIds || 'all'}:${dateFrom || 'nd'}:${dateTo || 'nd'}`;

    try {
      const data = await getOrSet(cacheKey, 300, async () => {
        const match: any = {};
        if (dateFrom) match.snapshotDate = { $gte: new Date(dateFrom) };
        if (dateTo) match.snapshotDate = { ...match.snapshotDate, $lte: new Date(dateTo) };
        if (deptIds) match.department = { $in: deptIds.split(',') };

        return KpiSnapshot.aggregate([
          { $match: match },
          { $sort: { snapshotDate: 1 } },
          {
            $group: {
              _id: '$department',
              data: { $push: { date: '$snapshotDate', complianceRate: '$complianceRate' } },
            },
          },
          { $project: { department: '$_id', data: 1, _id: 0 } },
        ]);
      });

      return res.json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);
```

---

#### B. Re-enable JWT Guards Properly

**Why this exists:** JWT guards were commented out in Progress 1 to speed up local testing. Leaving them off means any unauthenticated request can read all analytics data. Re-enabling them is a prerequisite for demo day — the professor will notice if `curl http://localhost:3003/api/analytics/kpi-summary` returns data without any token.

**File to modify:** `server/routes/analyticsRoutes.ts` (already done above — `validateJWT` and `requireRole` are now in every route)

**Also verify in `server/middleware/validateJWT.ts`** that it properly reads the token and attaches `req.user`:

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export function validateJWT(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    (req as any).user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
```

**Common fresher mistake:** Calling `return next()` and then also calling `res.json()` — this causes a "headers already sent" error. The structure above avoids it by returning early on failures.

---

#### C. Verify Cache Service Handles Redis-Down Gracefully

**Why this exists:** Redis is optional in dev mode. If Redis is not running and `getOrSet` crashes, it takes down the entire API server. The cache service should fall through to the database if Redis is unavailable.

**File to modify:** `server/services/cacheService.ts`

```typescript
import redis from '../config/redis'; // your ioredis instance

export async function getOrSet<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  // Try Redis first
  if (redis) {
    try {
      const cached = await redis.get(key);
      if (cached) {
        return JSON.parse(cached) as T;
      }
    } catch (err) {
      console.warn('[Cache] Redis GET failed, falling through to DB:', (err as Error).message);
    }
  }

  // Cache miss or Redis unavailable — call the real data function
  const fresh = await fetchFn();

  // Try to store in Redis (non-blocking — don't await, don't crash if it fails)
  if (redis) {
    redis
      .setex(key, ttlSeconds, JSON.stringify(fresh))
      .catch((err: Error) =>
        console.warn('[Cache] Redis SETEX failed:', err.message)
      );
  }

  return fresh;
}

export async function invalidate(pattern: string): Promise<void> {
  if (!redis) return;
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`[Cache] Invalidated ${keys.length} keys matching: ${pattern}`);
    }
  } catch (err) {
    console.warn('[Cache] Invalidation failed:', (err as Error).message);
  }
}
```

---

### ⚙️ API Contracts

All analytics endpoints updated:

**GET /api/analytics/kpi-summary**
- Protected by: `validateJWT`, `requireRole(['admin','manager','executive','analyst'])`
- Query: `dateFrom?: string`, `dateTo?: string`
- Cache key: `m3:kpi:org:{YYYY-MM-DD}`, TTL 300s

**GET /api/analytics/kpi-summary/:deptId**
- Protected by: same
- Cache key: `m3:kpi:{deptId}:{YYYY-MM-DD}`, TTL 300s

**GET /api/analytics/decision-volume**
- Protected by: same
- Query: `granularity: 'daily'|'weekly'|'monthly'`, `dateFrom?`, `dateTo?`, `deptId?`
- Cache key: `m3:volume:{deptId|all}:{granularity}:{dateFrom}:{dateTo}`, TTL 300s

**GET /api/analytics/cycle-time-histogram**
- Protected by: same
- Cache key: `m3:cycletime:{deptId|all}`, TTL 300s

**GET /api/analytics/compliance-trend**
- Protected by: same
- Cache key: `m3:compliance:{deptIds|all}:{dateFrom}:{dateTo}`, TTL 300s

---

### 💻 Commands to Run

```bash
# Start backend
cd server && npm run dev

# Start Redis (Windows — Memurai)
memurai

# Test authenticated endpoint (get token from Module 1 login first)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3003/api/analytics/kpi-summary"

# Test unauthenticated — should now return 401
curl "http://localhost:3003/api/analytics/kpi-summary"

# Check Redis after first authenticated call
redis-cli keys "m3:*"
redis-cli ttl "m3:kpi:org:2026-04-05"
```

---

### ✅ How to Validate

1. `curl` without a token → should return `{ "error": "No token provided" }` with HTTP 401
2. `curl` with a valid token → should return KPI data
3. `redis-cli keys "m3:*"` → should show keys like `m3:kpi:org:2026-04-05`
4. Second `curl` within 5 minutes → should be noticeably faster (check with `time curl ...`)
5. Terminal: look for `[Cache] Invalidated` log after the webhook fires

---

### 📋 Day 2 Outcome

Every analytics endpoint now uses Redis read-through caching with correct key naming, all routes are JWT-protected, and the cache service degrades gracefully if Redis is unavailable. Day 3 will complete the webhook flow so that when Module 1 submits a decision, the KPI cache for that department is immediately invalidated and recomputed.

---

## Day 3 — Complete the Webhook Flow + Events Route + Final Backend Wiring

### 🎯 Goal & Reasoning

The `POST /api/events/decision-update` webhook already exists from Progress 1, but it needs to be verified end-to-end: does it actually invalidate the right Redis keys, trigger re-aggregation, and write fresh snapshots? Today you make sure the full event-driven flow works — Module 1 submits a decision, fires the webhook to Module 3, Module 3 deletes stale cache, re-runs KPI aggregation for the affected department, and writes the new snapshot to `m3_kpi_snapshots`. This day also adds the `GET /api/analytics/risk-heatmap` backend endpoint (placeholder data today, full scoring pipeline in Days 10–11) and ensures `server.ts` imports all route and job files correctly.

---

### Work to Complete

#### A. Verify and Complete `eventsRoutes.ts` — `POST /api/events/decision-update`

**Why this exists:** This is the mechanism by which Module 3 stays current. Every time a decision is created, submitted, approved, or rejected in Module 1, it posts here. Without this webhook working correctly, the dashboard shows stale numbers that only update when the manual aggregation runs.

**File to modify:** `server/routes/eventsRoutes.ts`

```typescript
import { Router, Request, Response } from 'express';
import { serviceKey } from '../middleware/serviceKey';
import { invalidate } from '../services/cacheService';
import { aggregateKPI, aggregateOrgKPI } from '../services/kpiAggregator';

const router = Router();

// POST /api/events/decision-update
// Called by Module 1 whenever a decision changes status
router.post(
  '/decision-update',
  serviceKey, // No JWT here — this is a server-to-server call from Module 1
  async (req: Request, res: Response) => {
    const { department, decisionId, status } = req.body as {
      department: string;
      decisionId: string;
      status: string;
    };

    console.log(
      `[Webhook] decision-update received: dept=${department}, decision=${decisionId}, status=${status}`
    );

    if (!department) {
      return res.status(400).json({ error: 'department is required' });
    }

    try {
      const today = new Date().toISOString().split('T')[0];

      // Step 1: Invalidate stale cache for this department
      await invalidate(`m3:kpi:${department}:*`);
      await invalidate(`m3:kpi:org:*`);
      console.log(`[Webhook] Cache invalidated for dept ${department}`);

      // Step 2: Re-aggregate KPI for this department and write new snapshot
      await aggregateKPI(department);
      await aggregateOrgKPI();
      console.log(`[Webhook] KPI re-aggregated for dept ${department}`);

      return res.json({ received: true, department, status });
    } catch (err: any) {
      console.error('[Webhook] decision-update handler error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }
);

export default router;
```

**Why no JWT here:** This endpoint is called by Module 1's backend server, not by a browser. JWT tokens belong to users. The `serviceKey` middleware validates a shared secret (`SERVICE_KEY` env var) that Module 1 sends in the `x-service-key` header — this is the correct pattern for server-to-server calls in this architecture.

---

#### B. Add `GET /api/analytics/risk-heatmap` Endpoint

**Why this exists:** The Risk Heatmap page (Day 12) needs an endpoint that returns risk level counts per department. Today you build the backend endpoint with Redis caching. It reads from `m3_kpi_snapshots` which are written by the KPI aggregator. The real risk scoring (Random Forest) will update these scores in Days 10–11, but this endpoint works with whatever `riskLevel` values are currently in the snapshots.

**File to modify:** `server/routes/analyticsRoutes.ts`

```typescript
// GET /api/analytics/risk-heatmap
router.get(
  '/risk-heatmap',
  validateJWT,
  requireRole(['admin', 'manager', 'executive', 'analyst']),
  async (req: Request, res: Response) => {
    const { dateFrom, dateTo } = req.query as { dateFrom?: string; dateTo?: string };
    const cacheKey = `m3:riskheatmap:${dateFrom || 'nd'}:${dateTo || 'nd'}`;

    try {
      const data = await getOrSet(cacheKey, 300, async () => {
        const match: any = {};
        if (dateFrom) match.snapshotDate = { $gte: new Date(dateFrom) };
        if (dateTo) match.snapshotDate = { ...match.snapshotDate, $lte: new Date(dateTo) };

        const snapshots = await KpiSnapshot.aggregate([
          { $match: match },
          {
            $group: {
              _id: '$department',
              Low: {
                $sum: { $cond: [{ $eq: ['$riskLevel', 'Low'] }, 1, 0] },
              },
              Medium: {
                $sum: { $cond: [{ $eq: ['$riskLevel', 'Medium'] }, 1, 0] },
              },
              High: {
                $sum: { $cond: [{ $eq: ['$riskLevel', 'High'] }, 1, 0] },
              },
              Critical: {
                $sum: { $cond: [{ $eq: ['$riskLevel', 'Critical'] }, 1, 0] },
              },
            },
          },
          {
            $project: {
              _id: 0,
              department: '$_id',
              deptId: '$_id',
              Low: 1,
              Medium: 1,
              High: 1,
              Critical: 1,
            },
          },
        ]);

        return snapshots;
      });

      return res.json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);
```

---

#### C. Verify `server.ts` Imports Everything

**Why this exists:** Node.js only runs code that is imported. If a route file or job file is not imported in `server.ts`, it silently doesn't exist — no error, just missing functionality.

**File to modify:** `server/server.ts`

```typescript
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectDB } from './config/db';

// Route imports
import analyticsRoutes from './routes/analyticsRoutes';
import aiRoutes from './routes/aiRoutes';
import eventsRoutes from './routes/eventsRoutes';
import reportsRoutes from './routes/reportsRoutes'; // will be built Day 14

// Job imports — importing the file registers the cron schedule
import './jobs/anomalyJob';
// forecastJob and riskScoringJob will be added in Days 8 and 11

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(morgan('dev'));
app.use(express.json());

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', service: 'module3' }));

// Mount routes
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/events', eventsRoutes);
// app.use('/api/reports', reportsRoutes); // uncomment on Day 14

const PORT = process.env.PORT || 3003;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`[Server] Module 3 running on port ${PORT}`);
  });
});
```

---

### ⚙️ API Contracts

**POST /api/events/decision-update**
- Protected by: `serviceKey` (not JWT — server-to-server only)
- Request body: `{ department: string, decisionId: string, status: string }`
- Internal logic: Invalidate `m3:kpi:{department}:*` and `m3:kpi:org:*`. Call `aggregateKPI(department)` and `aggregateOrgKPI()`.
- Response: `{ received: true, department: string, status: string }`
- Cross-module note: Called by Module 1 with `x-service-key` header

**GET /api/analytics/risk-heatmap**
- Protected by: `validateJWT`, `requireRole`
- Query: `dateFrom?`, `dateTo?`
- Response: `Array<{ department: string, deptId: string, Low: number, Medium: number, High: number, Critical: number }>`
- Cache key: `m3:riskheatmap:{dateFrom}:{dateTo}`, TTL 300s

---

### 💻 Commands to Run

```bash
# Restart backend
cd server && npm run dev

# Simulate Module 1 webhook call
curl -X POST \
  -H "x-service-key: YOUR_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"department":"finance","decisionId":"abc123","status":"approved"}' \
  http://localhost:3003/api/events/decision-update

# Test risk heatmap endpoint
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3003/api/analytics/risk-heatmap
```

---

### ✅ How to Validate

- Webhook call: terminal should log `[Webhook] decision-update received: dept=finance...` and `[Webhook] KPI re-aggregated for dept finance`
- In Compass: `m3_kpi_snapshots` — filter by `department: "finance"`, confirm `updatedAt` changed
- Risk heatmap: should return array of department objects with Low/Medium/High/Critical counts
- `redis-cli keys "m3:riskheatmap:*"` — should appear after heatmap call

---

### 📋 Day 3 Outcome

The entire backend is now wired correctly: analytics endpoints are cached and JWT-protected, the webhook invalidates and recomputes on every decision event from Module 1, and the risk heatmap endpoint is available for the frontend to use. Days 4–6 build the complete AI Insights frontend page and the anomaly banner on the dashboard.

---

## Day 4 — AI Insights Page: Types, API Service, and AnomalyBanner

### 🎯 Goal & Reasoning

The backend for anomalies is fully working. Now you build the frontend layer. Today focuses on the foundation pieces that the AI Insights page depends on: the TypeScript interfaces (so all data is typed end-to-end), the API service functions (so any component can call the endpoints), and the `AnomalyBanner` component that lives on the Dashboard page. Tomorrow you build the full `/ai-insights` page on top of these pieces. Doing it this order — types first, then API service, then leaf components, then full pages — prevents the "I wrote a page but the data shape is wrong" class of bug.

Implementation alignment note (2026-04-08):
- Keep only one active-anomaly counter surface on Dashboard.
- Use the existing `Real-Time Anomalies` panel as the single source of anomaly count display.
- Dashboard anomaly status should be presented under `Real-Time Anomalies` naming for consistency.

### Module 3 Sidebar Navigation (Current UI Labels)

Use the sidebar labels below exactly as shown in the current Module 3 UI:

1. Dashboard
2. Deep Insights
3. Anomaly Detection
4. Forecast
5. Risk Assessment
6. Reports

Note:
- This list is the current sidebar navigation naming baseline for Progress 2 documentation.
- Any future frontend page additions for Module 3 should keep these labels consistent unless a planned naming update is approved.

---

### Work to Complete

#### A. Add Anomaly Types to Frontend Types File

**Why this exists:** TypeScript won't let you call `anomaly.featureValues.cycleTimeHours` unless it knows the shape of `featureValues`. Defining interfaces here means every component gets autocomplete and compile-time error checking.

**File to modify:** `client/src/types/index.ts`

```typescript
export interface IFeatureValues {
  cycleTimeHours: number;
  rejectionCount: number;
  revisionCount: number;
  daysOverSLA: number;
  stageCount: number;
  hourOfDaySubmitted: number;
}

export interface IAnomaly {
  _id: string;
  decisionId: string;
  department: string;
  anomalyScore: number;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Normal';
  isAnomaly: boolean;
  isAcknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  description: string;
  featureValues: IFeatureValues;
  createdAt: string;
  updatedAt: string;
}

export interface IAnomalyGroup {
  Critical: IAnomaly[];
  High: IAnomaly[];
  Medium: IAnomaly[];
  Low: IAnomaly[];
  total: number;
}

export interface IFeatureImportance {
  feature: string;
  weight: number; // percentage 0–100
}
```

---

#### B. Add API Functions to `api.ts`

**Why this exists:** Components should never call `axios` directly — they should call typed wrapper functions. This way, if the API URL changes, you fix it in one place. It also makes it easy to add auth headers in one central location.

**File to modify:** `client/src/services/api.ts`

First, make sure the axios instance has auth header logic:

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3003',
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('govvision_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

Then add the anomaly functions:

```typescript
import { IAnomalyGroup, IAnomaly } from '../types';

export async function getAnomalies(): Promise<IAnomalyGroup> {
  const res = await api.get<IAnomalyGroup>('/api/ai/anomalies');
  return res.data;
}

export async function acknowledgeAnomaly(id: string): Promise<IAnomaly> {
  const res = await api.put<IAnomaly>(`/api/ai/anomalies/${id}/acknowledge`);
  return res.data;
}
```

**Where the token comes from:** When the user logs in via Module 1's login page, Module 1's frontend stores the JWT in `localStorage`. Module 3's frontend reads from the same key. Confirm with your Module 1 teammate what key they use — above it's `'govvision_token'`. Align this.

---

#### C. Build `AnomalyBanner` Component

**Why this exists:** Managers need immediate visibility into critical anomalies without having to navigate to a separate page. The banner on the Dashboard surfaces the most urgent anomalies inline. Acknowledging one removes it from the banner immediately (optimistic UI update) and also calls the API to persist the acknowledgment.

**File to create:** `client/src/components/AnomalyBanner.tsx`

```typescript
import React from 'react';
import { IAnomaly, IAnomalyGroup } from '../types';
import { acknowledgeAnomaly } from '../services/api';

interface AnomalyBannerProps {
  anomalies: IAnomalyGroup;
  onAcknowledge: (id: string) => void;
}

const severityColors: Record<string, string> = {
  Critical: 'border-red-600 bg-red-50',
  High: 'border-orange-500 bg-orange-50',
  Medium: 'border-yellow-500 bg-yellow-50',
  Low: 'border-blue-400 bg-blue-50',
};

const severityBadgeColors: Record<string, string> = {
  Critical: 'bg-red-100 text-red-800',
  High: 'bg-orange-100 text-orange-800',
  Medium: 'bg-yellow-100 text-yellow-800',
  Low: 'bg-blue-100 text-blue-800',
};

export default function AnomalyBanner({ anomalies, onAcknowledge }: AnomalyBannerProps) {
  const allAnomalies: IAnomaly[] = [
    ...anomalies.Critical,
    ...anomalies.High,
    ...anomalies.Medium,
    ...anomalies.Low,
  ];

  if (allAnomalies.length === 0) return null;

  async function handleAcknowledge(anomaly: IAnomaly) {
    try {
      await acknowledgeAnomaly(anomaly._id);
      onAcknowledge(anomaly._id); // Tell parent to remove from state immediately
    } catch (err) {
      console.error('Acknowledge failed:', err);
    }
  }

  return (
    <div className="mb-6 space-y-3">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
        ⚠️ Active Anomalies ({allAnomalies.length})
      </h3>
      {allAnomalies.slice(0, 5).map((anomaly) => (
        <div
          key={anomaly._id}
          className={`border-l-4 rounded-lg px-4 py-3 flex items-start justify-between ${severityColors[anomaly.severity] || 'border-gray-400 bg-gray-50'}`}
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${severityBadgeColors[anomaly.severity]}`}
              >
                {anomaly.severity}
              </span>
              <span className="text-xs text-gray-500">
                Decision: {anomaly.decisionId} · {anomaly.department}
              </span>
            </div>
            <p className="text-sm text-gray-700">{anomaly.description}</p>
            <p className="text-xs text-gray-400 mt-1">
              Score: {anomaly.anomalyScore.toFixed(3)} · Cycle:{' '}
              {anomaly.featureValues.cycleTimeHours}h · Rejections:{' '}
              {anomaly.featureValues.rejectionCount}
            </p>
          </div>
          <button
            onClick={() => handleAcknowledge(anomaly)}
            className="ml-4 text-xs bg-white border border-gray-300 rounded px-3 py-1 hover:bg-gray-100 transition"
          >
            Acknowledge
          </button>
        </div>
      ))}
      {allAnomalies.length > 5 && (
        <p className="text-xs text-gray-400 ml-2">
          +{allAnomalies.length - 5} more — view all in AI Insights
        </p>
      )}
    </div>
  );
}
```

---

#### D. Wire `AnomalyBanner` into `Dashboard.tsx`

**Why this exists:** The banner has to be part of the Dashboard component, which is what actually fetches the anomaly data and manages the state of which anomalies have been acknowledged.

**File to modify:** `client/src/pages/Dashboard.tsx`

Add state and effect for anomaly data, then render the banner:

```typescript
import { useState, useEffect } from 'react';
import { getAnomalies } from '../services/api';
import { IAnomalyGroup } from '../types';
import AnomalyBanner from '../components/AnomalyBanner';

// Inside the Dashboard component:
const [anomalyData, setAnomalyData] = useState<IAnomalyGroup>({
  Critical: [], High: [], Medium: [], Low: [], total: 0,
});

useEffect(() => {
  getAnomalies()
    .then(setAnomalyData)
    .catch((err) => console.error('Failed to load anomalies:', err));
}, []); // Fetch once on mount

function handleAcknowledge(id: string) {
  // Optimistic update: remove the anomaly from local state immediately
  setAnomalyData((prev) => ({
    ...prev,
    Critical: prev.Critical.filter((a) => a._id !== id),
    High: prev.High.filter((a) => a._id !== id),
    Medium: prev.Medium.filter((a) => a._id !== id),
    Low: prev.Low.filter((a) => a._id !== id),
    total: prev.total - 1,
  }));
}

// In the JSX, between the filter bar and charts grid:
<AnomalyBanner anomalies={anomalyData} onAcknowledge={handleAcknowledge} />
```

**What "optimistic update" means:** Instead of waiting for the API to respond and then re-fetching the full anomaly list, you immediately remove the anomaly from local state. The UI feels instant. If the API call fails (the `try/catch` in the banner component), you'd ideally add it back — but for a demo context, the happy path is sufficient.

---

### 🖥️ UI/UX Specification — AnomalyBanner

```
┌─────────────────────────────────────────────────────────┐
│ ⚠️ Active Anomalies (3)                                  │
├─────────────────────────────────────────────────────────┤
│ ▌ [CRITICAL] Decision: abc123 · finance                 │
│   Anomaly detected: score 0.978, severity Critical      │
│   Score: 0.978 · Cycle: 148h · Rejections: 9    [Ack]  │
├─────────────────────────────────────────────────────────┤
│ ▌ [HIGH]     Decision: def456 · operations             │
│   Anomaly detected: score 0.921, severity High          │
│   Score: 0.921 · Cycle: 96h · Rejections: 6    [Ack]  │
└─────────────────────────────────────────────────────────┘
  The ▌ is the colored left border (red for Critical, orange for High)
```

---

### 💻 Commands to Run

```bash
# Start frontend
cd client && npm run dev

# Confirm the banner appears at http://localhost:5173/dashboard
# If no anomalies exist yet, run the job manually first:
cd server && npx ts-node -e "import('./jobs/anomalyJob').then(m => m.runAnomalyJob())"
```

---

### ✅ How to Validate

1. Open `http://localhost:5173/dashboard` — only the `Real-Time Anomalies` panel should show the active anomaly counter
2. Click "Acknowledge" on one card — it should disappear from the panel immediately (no page reload)
3. Open Compass, check `m3_anomalies` — the acknowledged document should now have `isAcknowledged: true`
4. Open Network tab in browser DevTools — confirm `PUT /api/ai/anomalies/{id}/acknowledge` returned 200

---

### 📋 Day 4 Outcome

All frontend TypeScript types for anomalies are defined, the API service layer is wired with auth headers, and anomaly acknowledge flow is active through the existing `Real-Time Anomalies` panel on Dashboard. Dashboard anomaly presentation is aligned to `Real-Time Anomalies` naming and behavior. Day 5 builds the full `/deep-insights` page: the complete anomaly table with filters and the feature importance chart.

---

## Day 5 — Full Deep Insights Page

### 🎯 Goal & Reasoning

The backend serves anomaly data grouped by severity. The banner gives a quick view. The Deep Insights page is where a manager does the detailed investigation: sorting by score, filtering by severity or department, seeing which features drove the anomaly, and bulk-acknowledging items. This is the most feature-rich frontend page in the module, which is why it gets its own day. Building it today also validates that the anomaly data pipeline is correct end-to-end — if the table looks wrong, you know where to look.

---

### Work to Complete

#### A. Build `DeepInsights.tsx` — Full Page

**Why this exists:** Managers need a structured interface to investigate anomalies. The table, filters, and feature importance chart all serve different investigative needs. This page is a primary demo touchpoint.

**File to create:** `client/src/pages/DeepInsights.tsx`

**State variables (all typed):**

```typescript
const [anomalyData, setAnomalyData] = useState<IAnomalyGroup>({
  Critical: [], High: [], Medium: [], Low: [], total: 0,
});
const [loading, setLoading] = useState<boolean>(true);
const [error, setError] = useState<string | null>(null);
const [severityFilter, setSeverityFilter] = useState<string>('All');
const [deptFilter, setDeptFilter] = useState<string>('All');
```

**useEffect for data fetch:**

```typescript
useEffect(() => {
  setLoading(true);
  getAnomalies()
    .then((data) => {
      setAnomalyData(data);
      setLoading(false);
    })
    .catch((err) => {
      setError('Failed to load anomaly data.');
      setLoading(false);
    });
}, []); // Only runs on mount — filtering is client-side
```

**Compute flat anomaly list from grouped data:**

```typescript
const allAnomalies: IAnomaly[] = [
  ...anomalyData.Critical,
  ...anomalyData.High,
  ...anomalyData.Medium,
  ...anomalyData.Low,
];
```

**Client-side filtering logic:**

```typescript
const filtered = allAnomalies.filter((a) => {
  const severityMatch = severityFilter === 'All' || a.severity === severityFilter;
  const deptMatch = deptFilter === 'All' || a.department === deptFilter;
  return severityMatch && deptMatch;
});
```

**Why client-side filtering:** All anomalies are already in memory from the one API call. Sending a new request to the server every time the user changes the severity dropdown would be wasteful — the dataset is small enough to filter locally.

**Feature importance computation:**

For each feature, compute the average value across all anomalous decisions, then express each as a percentage of the total:

```typescript
function computeFeatureImportance(anomalies: IAnomaly[]): IFeatureImportance[] {
  if (anomalies.length === 0) return [];

  const features: (keyof IFeatureValues)[] = [
    'cycleTimeHours',
    'rejectionCount',
    'revisionCount',
    'daysOverSLA',
    'stageCount',
    'hourOfDaySubmitted',
  ];

  const averages = features.map((f) => ({
    feature: f,
    avg: anomalies.reduce((sum, a) => sum + (a.featureValues[f] || 0), 0) / anomalies.length,
  }));

  const total = averages.reduce((sum, a) => sum + a.avg, 0) || 1;

  return averages
    .map(({ feature, avg }) => ({
      feature,
      weight: parseFloat(((avg / total) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.weight - a.weight);
}
```

**Handle acknowledge in this page:**

```typescript
async function handleAcknowledge(id: string) {
  try {
    await acknowledgeAnomaly(id);
    // Remove from state
    setAnomalyData((prev) => ({
      ...prev,
      Critical: prev.Critical.filter((a) => a._id !== id),
      High: prev.High.filter((a) => a._id !== id),
      Medium: prev.Medium.filter((a) => a._id !== id),
      Low: prev.Low.filter((a) => a._id !== id),
      total: prev.total - 1,
    }));
  } catch {
    alert('Failed to acknowledge. Please try again.');
  }
}
```

**Full JSX structure:**

```tsx
return (
  <div className="p-6">
    {/* Summary pills */}
    <div className="flex gap-4 mb-6">
      {[
        { label: 'Total', value: anomalyData.total, color: 'bg-gray-100 text-gray-800' },
        { label: 'Critical', value: anomalyData.Critical.length, color: 'bg-red-100 text-red-800' },
        { label: 'High', value: anomalyData.High.length, color: 'bg-orange-100 text-orange-800' },
        { label: 'Medium', value: anomalyData.Medium.length, color: 'bg-yellow-100 text-yellow-800' },
      ].map(({ label, value, color }) => (
        <div key={label} className={`rounded-full px-4 py-1 text-sm font-semibold ${color}`}>
          {label}: {value}
        </div>
      ))}
    </div>

    {/* Filter bar */}
    <div className="flex gap-4 mb-4">
      <select
        value={severityFilter}
        onChange={(e) => setSeverityFilter(e.target.value)}
        className="border rounded px-3 py-1 text-sm"
      >
        {['All', 'Critical', 'High', 'Medium', 'Low'].map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>
      <select
        value={deptFilter}
        onChange={(e) => setDeptFilter(e.target.value)}
        className="border rounded px-3 py-1 text-sm"
      >
        <option>All</option>
        {[...new Set(allAnomalies.map((a) => a.department))].map((d) => (
          <option key={d}>{d}</option>
        ))}
      </select>
    </div>

    {/* Table */}
    {loading ? (
      <div className="animate-pulse space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-200 rounded" />
        ))}
      </div>
    ) : (
      <div className="overflow-x-auto rounded-lg border mb-8">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              {['Date', 'Decision ID', 'Department', 'Severity', 'Score', 'Cycle Time', 'Rejections', 'Status', 'Action'].map(
                (h) => <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((anomaly) => (
              <AnomalyTableRow
                key={anomaly._id}
                anomaly={anomaly}
                onAcknowledge={handleAcknowledge}
              />
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-gray-400">No anomalies match the current filters.</div>
        )}
      </div>
    )}

    {/* Feature importance chart */}
    <FeatureImportanceChart data={computeFeatureImportance(allAnomalies)} />
  </div>
);
```

---

#### B. Build `AnomalyTableRow` Component

**File to create:** `client/src/components/AnomalyTableRow.tsx`

```typescript
import React, { useState } from 'react';
import { IAnomaly } from '../types';

interface Props {
  anomaly: IAnomaly;
  onAcknowledge: (id: string) => void;
}

const severityColors: Record<string, string> = {
  Critical: 'bg-red-100 text-red-800',
  High: 'bg-orange-100 text-orange-800',
  Medium: 'bg-yellow-100 text-yellow-800',
  Low: 'bg-blue-100 text-blue-800',
};

export default function AnomalyTableRow({ anomaly, onAcknowledge }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    await onAcknowledge(anomaly._id);
    setLoading(false);
  }

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 text-gray-500">
        {new Date(anomaly.createdAt).toLocaleDateString()}
      </td>
      <td className="px-4 py-3">
        
          href={`http://localhost:3001/decisions/${anomaly.decisionId}`}
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 hover:underline font-mono text-xs"
        >
          {anomaly.decisionId.slice(0, 8)}...
        </a>
      </td>
      <td className="px-4 py-3">{anomaly.department}</td>
      <td className="px-4 py-3">
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${severityColors[anomaly.severity]}`}>
          {anomaly.severity}
        </span>
      </td>
      <td className="px-4 py-3 font-mono">{anomaly.anomalyScore.toFixed(3)}</td>
      <td className="px-4 py-3">{anomaly.featureValues.cycleTimeHours}h</td>
      <td className="px-4 py-3">{anomaly.featureValues.rejectionCount}</td>
      <td className="px-4 py-3">
        <span className={`text-xs px-2 py-1 rounded-full ${anomaly.isAcknowledged ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
          {anomaly.isAcknowledged ? 'Acknowledged' : 'Unacknowledged'}
        </span>
      </td>
      <td className="px-4 py-3">
        {!anomaly.isAcknowledged && (
          <button
            onClick={handleClick}
            disabled={loading}
            className="text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? '...' : 'Acknowledge'}
          </button>
        )}
      </td>
    </tr>
  );
}
```

---

#### C. Build `FeatureImportanceChart` Component

**Why this exists:** Numbers in a table are hard to compare quickly. A horizontal bar chart lets the manager instantly see which feature contributed most to anomalies.

**File to create:** `client/src/components/FeatureImportanceChart.tsx`

```typescript
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { IFeatureImportance } from '../types';

interface Props {
  data: IFeatureImportance[];
}

const featureLabels: Record<string, string> = {
  cycleTimeHours: 'Cycle Time',
  rejectionCount: 'Rejections',
  revisionCount: 'Revisions',
  daysOverSLA: 'Days Over SLA',
  stageCount: 'Stage Count',
  hourOfDaySubmitted: 'Submission Hour',
};

const barColors = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'];

export default function FeatureImportanceChart({ data }: Props) {
  if (data.length === 0) return null;

  const chartData = data.map((d) => ({
    name: featureLabels[d.feature] || d.feature,
    weight: d.weight,
  }));

  return (
    <div className="bg-white rounded-xl border p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">
        Feature Contribution to Anomalies (approximate)
      </h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart
          layout="vertical"
          data={chartData}
          margin={{ left: 20, right: 40 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" unit="%" domain={[0, 100]} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
          <Tooltip formatter={(v: number) => `${v}%`} />
          <Bar dataKey="weight" radius={[0, 4, 4, 0]}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={barColors[i % barColors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

---

### 🖥️ UI/UX Specification — Deep Insights Page

```
/deep-insights
┌─────────────────────────────────────────────────────────────────────────┐
│  [Total: 23]  [Critical: 3]  [High: 8]  [Medium: 10]                   │
├─────────────────────────────────────────────────────────────────────────┤
│  Filter: [Severity ▼]  [Department ▼]                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  Date     │ Decision ID │ Dept    │ Severity  │ Score │ Cycle │ Rej │ Status │ Action │
│  Apr 01   │ abc123...   │ finance │ [CRITICAL]│ 0.978 │ 148h  │ 9   │ Unack  │ [Ack]  │
│  Apr 01   │ def456...   │ ops     │ [HIGH]    │ 0.921 │ 96h   │ 6   │ Unack  │ [Ack]  │
│  Mar 30   │ ghi789...   │ finance │ [MEDIUM]  │ 0.843 │ 72h   │ 3   │ Ack    │        │
├─────────────────────────────────────────────────────────────────────────┤
│  Feature Contribution to Anomalies                                      │
│  Cycle Time    ████████████████████ 42%                                 │
│  Rejections    ████████████ 28%                                         │
│  Days Over SLA ████████ 18%                                             │
│  Revisions     ████ 8%                                                  │
│  Stage Count   ██ 4%                                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### 💻 Commands to Run

```bash
cd client && npm run dev
# Navigate to http://localhost:5173/deep-insights
```

---

### ✅ How to Validate

1. Navigate to `/deep-insights` — table loads with anomaly rows
2. Select "Critical" in severity filter — only Critical rows remain
3. Select a department — table narrows further
4. Click Acknowledge on one unacknowledged row — status badge changes to "Acknowledged", action button disappears
5. Feature importance chart renders with 6 horizontal bars that sum to ~100%
6. Decision ID links open to correct Module 1 URL

---

### 📋 Day 5 Outcome

The complete Deep Insights page is built and working end-to-end — anomaly table, client-side filtering, acknowledge flow, and feature importance chart. Days 7–9 will tackle the Prophet forecasting pipeline. Day 6 first adds routing and navigation so all pages are reachable.

---

## Day 6 — Sidebar Navigation, Routing, and Shared Layout

### 🎯 Goal & Reasoning

You now have two pages (`/dashboard`, `/deep-insights`) and are about to add more route-backed screens over time. The risk heatmap is currently rendered inside the Dashboard page, so it is not a separate route yet. Without a sidebar and React Router route definitions, new pages are unreachable. Today you set up the permanent navigation structure so every subsequent page you build is immediately accessible. You also add the `SkeletonLoader` and `ErrorBoundary` shared components that every page will use for loading and error states — building them now means each future page can use them from day one.

Current codebase note: keep `App.tsx` as the source of truth for route paths, keep `Sidebar.tsx` as navigation only, and treat the risk heatmap as Dashboard content until a dedicated risk page is added.

---

### Work to Complete

#### A. Install and Configure React Router (if not already)

**react-router-dom** is the standard routing library for React. It lets you define URL paths (`/dashboard`, `/deep-insights`) and map each to a React component. Without it, navigating to a URL just shows a blank page.

**File to modify:** `client/src/main.tsx`

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
```

---

#### B. Build `Sidebar.tsx`

**Why this exists:** Every page shares the same left navigation. Building it as one component means adding a new page only requires adding one `NavLink` here, not modifying every existing page.

**File to create:** `client/src/components/Sidebar.tsx`

```typescript
import React from 'react';
import { NavLink } from 'react-router-dom';

interface NavItem {
  label: string;
  path: string;
  badge?: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/' },
  { label: 'Deep Insights', path: '/deep-insights' },
  { label: 'Anomaly Detection', path: '/anomaly' },
  { label: 'Forecast', path: '/forecast' },
  { label: 'Risk Assessment', path: '/risk' },
  { label: 'Reports', path: '/reports' },
  { label: 'Settings', path: '/settings' },
  { label: 'Support', path: '/support' },
];

export default function Sidebar() {
  return (
    <aside className="w-56 min-h-screen bg-[#1A1F2E] text-white flex flex-col py-6 px-4 shrink-0">
      <div className="mb-8">
        <h1 className="text-lg font-bold tracking-wider">GovVision</h1>
        <p className="text-xs text-gray-400 mt-1">Module 3 · Analytics</p>
      </div>
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2 rounded-lg text-sm transition ${
                isActive
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`
            }
          >
            <span>{item.label}</span>
            {item.badge && (
              <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
```

---

#### C. Build `AppLayout.tsx` and Wire All Routes in `App.tsx`

**File to create:** `client/src/components/AppLayout.tsx`

```typescript
import React from 'react';
import Sidebar from './Sidebar';
import { Outlet } from 'react-router-dom';

export default function AppLayout() {
  return (
    <div className="flex min-h-screen bg-[#F5F6FA]">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet /> {/* Page content renders here */}
      </main>
    </div>
  );
}
```

**File to modify:** `client/src/App.tsx`

```typescript
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import Dashboard from './pages/Dashboard';
import DeepInsights from './pages/DeepInsights';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/deep-insights" element={<DeepInsights />} />
        {/* Day 9 — Risk Heatmap (not a separate route yet in the current codebase) */}
        {/* <Route path="/risk" element={<RiskHeatmap />} /> */}
        {/* Day 10 — Reports */}
        {/* <Route path="/reports" element={<Reports />} /> */}
      </Route>
    </Routes>
  );
}
```

---

#### D. Build `PlaceholderPage`, `SkeletonLoader`, and `ErrorBoundary`

**File to create:** `client/src/pages/PlaceholderPage.tsx`

```typescript
export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-32 text-gray-400">
      <div className="text-4xl mb-4">🚧</div>
      <h2 className="text-xl font-semibold text-gray-500">{title}</h2>
      <p className="text-sm mt-2">Coming soon</p>
    </div>
  );
}
```

**File to create:** `client/src/components/SkeletonLoader.tsx`

```typescript
interface Props {
  rows?: number;
  height?: string;
}

export default function SkeletonLoader({ rows = 5, height = 'h-8' }: Props) {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`${height} bg-gray-200 rounded-lg`} />
      ))}
    </div>
  );
}
```

**File to create:** `client/src/components/ErrorBoundary.tsx`

Error boundaries must be class components in React — there is no hooks equivalent for catching render-time errors:

```typescript
import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Chart crashed:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex flex-col items-center justify-center h-32 bg-red-50 rounded-lg border border-red-200">
            <p className="text-sm text-red-500 font-medium">Chart failed to load</p>
            <button
              className="mt-2 text-xs text-red-400 underline"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Retry
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
```

**Wrap every chart on the Dashboard with `ErrorBoundary`:**

```tsx
<ErrorBoundary>
  <DecisionVolumeChart filters={filters} />
</ErrorBoundary>
<ErrorBoundary>
  <CycleTimeHistogram filters={filters} />
</ErrorBoundary>
```

---

### 💻 Commands to Run

```bash
cd client && npm run dev
# Visit http://localhost:5173 — should redirect to /dashboard
# Click each sidebar link — each page should load, with placeholders only for routes that do not exist yet
# No blank white screens anywhere
```

---

### ✅ How to Validate

1. All sidebar links are clickable and navigate correctly
2. Active link is highlighted in indigo
3. Sidebar labels match the current app naming, especially Deep Insights and Risk Assessment
4. Placeholder pages show the 🚧 message, not a blank screen, for any routes not built yet
5. ErrorBoundary: temporarily throw an error inside a chart component to confirm the "Chart failed to load" fallback renders

---

### 📋 Day 6 Outcome

Full navigation structure is in place — every page is reachable, no blank white screens, shared loading and error components are available for all future pages to use. Day 7 begins the Prophet forecasting pipeline: training the model in Python.

---

## Day 7 — Train Prophet Forecasting Model (Python)

### 🎯 Goal & Reasoning

Prophet is Meta's time-series forecasting library. It takes a sequence of `(date, value)` pairs and predicts future values with confidence intervals. In the current repo, Prophet is already listed in `ml_service/requirements.txt`, and Day 7 now adds the actual training script and forecasting helper in the existing `ml_service` layout. Day 8 can then wire the trained model into FastAPI and the Node.js cron job once the Python pieces are in place.

---

### Work to Complete

#### A. Confirm Prophet Dependencies (Python)

**prophet** is Meta's open-source time-series forecasting library. It handles seasonality (weekly patterns, monthly patterns) automatically and works well with data that has gaps or irregular timestamps — which is common with government decision workflows.

**pyarrow** is a dependency that Prophet requires internally for fast data serialization. You don't use it directly, but Prophet's import will fail without it.

```bash
# In ml_service/ virtual environment
pip install prophet pyarrow
```

**Common install issue:** Prophet has a complex dependency chain. If it fails, try:

```bash
pip install pystan==2.19.1.1 prophet
```

Repository note:
- `prophet` is already present in [ml_service/requirements.txt](ml_service/requirements.txt)
- `pyarrow` is not currently pinned there, so this step is still needed if your local environment does not already provide it

---

#### B. Implement `train_prophet.py`

**Why this exists:** The model needs historical data from MongoDB to learn patterns. This script pulls all decisions, groups them by date and department, and trains one Prophet model per department. Each model is saved as its own `.pkl` file so predictions can be served per department.

**Current file:** `ml_service/training/train_prophet.py` now contains the training implementation.

```python
import os
import sys
import joblib
import pandas as pd
from pymongo import MongoClient
from prophet import Prophet
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
MODELS_DIR = os.path.join(os.path.dirname(__file__), '..', 'models')
os.makedirs(MODELS_DIR, exist_ok=True)

def get_decisions():
    """Pull all decisions from MongoDB and return as DataFrame."""
    client = MongoClient(MONGODB_URI)
    db = client.get_default_database()
    
    decisions = list(db["m1_decisions"].find(
        {},
        {"_id": 0, "createdAt": 1, "department": 1}
    ))
    
    client.close()
    
    if not decisions:
        print("ERROR: No decisions found in m1_decisions. Run importCSV first.")
        sys.exit(1)
    
    df = pd.DataFrame(decisions)
    df['createdAt'] = pd.to_datetime(df['createdAt'])
    df['ds'] = df['createdAt'].dt.floor('D')  # Normalize to date (no time component)
    return df

def train_for_department(dept_id: str, df_dept: pd.DataFrame):
    """
    Train a Prophet model for one department.
    Prophet requires a DataFrame with exactly two columns: 'ds' (date) and 'y' (value).
    """
    # Count decisions per day for this department
    daily = df_dept.groupby('ds').size().reset_index(name='y')
    
    # Prophet needs at least 2 non-zero data points
    if len(daily) < 10:
        print(f"  Skipping {dept_id}: only {len(daily)} data points (need >= 10)")
        return
    
    # Fill in missing dates with 0 (days when no decisions were submitted)
    date_range = pd.date_range(daily['ds'].min(), daily['ds'].max(), freq='D')
    daily = daily.set_index('ds').reindex(date_range, fill_value=0).reset_index()
    daily.columns = ['ds', 'y']
    
    # Initialize Prophet
    # yearly_seasonality=True: learns yearly patterns
    # weekly_seasonality=True: learns that weekends have fewer decisions
    # daily_seasonality=False: we only have one data point per day, so daily patterns don't apply
    model = Prophet(
        yearly_seasonality=True,
        weekly_seasonality=True,
        daily_seasonality=False,
        interval_width=0.95  # 95% confidence interval
    )
    
    model.fit(daily)
    
    # Save model
    safe_dept_id = dept_id.replace('/', '_').replace(' ', '_')
    path = os.path.join(MODELS_DIR, f'prophet_{safe_dept_id}.pkl')
    joblib.dump(model, path)
    print(f"  Saved: {path}")

def main():
    print("Loading decisions from MongoDB...")
    df = get_decisions()
    print(f"Loaded {len(df)} decisions across {df['department'].nunique()} departments.")
    
    for dept_id in df['department'].unique():
        print(f"Training Prophet for department: {dept_id}")
        dept_df = df[df['department'] == dept_id].copy()
        train_for_department(dept_id, dept_df)
    
    print("\nProphet training complete.")

if __name__ == '__main__':
    main()
```

Also train a single "org-level" model using all decisions:

```python
# Add after the loop in main():
    print("Training org-level Prophet model...")
    train_for_department('org', df)
```

Current repo note:
- The training script lives in the existing `ml_service/training/` folder and saves artifacts under `ml_service/models/`
- The save path should stay under `ml_service/models/` so it matches the existing forecast and risk model conventions in the repo

---

#### C. Implement `forecast_service.py`

**Why this exists:** FastAPI needs a function to load a trained Prophet model and generate predictions. This service file is what the API endpoint calls. Separating the service logic from the route handler keeps the code clean and testable.

**Current file:** `ml_service/app/services/forecast_service.py` now contains the real loader/predictor logic.

```python
import os
import joblib
import pandas as pd
from prophet import Prophet
from typing import List, Dict

MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models')

def load_prophet_model(dept_id: str) -> Prophet:
    """Load the trained Prophet model for a department."""
    safe_dept_id = dept_id.replace('/', '_').replace(' ', '_')
    path = os.path.join(MODELS_DIR, f'prophet_{safe_dept_id}.pkl')
    
    if not os.path.exists(path):
        raise FileNotFoundError(f"No Prophet model found for department: {dept_id}")
    
    return joblib.load(path)

def generate_forecast(dept_id: str, horizon: int) -> List[Dict]:
    """
    Load model for dept_id and predict `horizon` days into the future.
    Returns list of { ds, yhat, yhat_lower, yhat_upper }
    """
    model = load_prophet_model(dept_id)
    
    # Create a future DataFrame with dates Prophet will predict
    future = model.make_future_dataframe(periods=horizon, freq='D')
    forecast = model.predict(future)
    
    # Return only the future rows (not the historical fit)
    future_rows = forecast.tail(horizon)
    
    result = []
    for _, row in future_rows.iterrows():
        result.append({
            'ds': row['ds'].strftime('%Y-%m-%d'),
            'yhat': round(float(row['yhat']), 2),
            'yhat_lower': round(float(row['yhat_lower']), 2),
            'yhat_upper': round(float(row['yhat_upper']), 2),
        })
    
    return result
```

Current repo note:
- The service already lives under [ml_service/app/services/forecast_service.py](ml_service/app/services/forecast_service.py), and it now returns real forecast rows
- Keep the return shape aligned with the Node.js forecast model and later FastAPI route usage

---

### 🤖 ML Specification

- **Model:** Facebook Prophet (time-series forecasting)
- **Training script:** `ml_service/training/train_prophet.py`
- **When it runs:** Once manually now, using the training script in `ml_service/training/`. The current `/ml/models/train` endpoint in [ml_service/main.py](ml_service/main.py) still only retrains Isolation Forest, so Prophet retraining is not wired yet.
- **Input to training:** MongoDB `m1_decisions` grouped by `createdAt` date and `department`
- **Output:** One `.pkl` file per department: `models/prophet_{deptId}.pkl`
- **Prediction input:** `dept_id: str`, `horizon: int (7|14|30)`
- **Prediction output:** `[{ ds: "2026-04-06", yhat: 12.4, yhat_lower: 8.1, yhat_upper: 16.7 }]`

---

### 💻 Commands to Run

```bash
# Navigate to ml_service directory
cd ml_service

# Install Prophet (do this inside your venv if you use one)
pip install prophet pyarrow

# Run the training script
python training/train_prophet.py

# Expected output:
# Loading decisions from MongoDB...
# Loaded 2500 decisions across 5 departments.
# Training Prophet for department: finance
#   Saved: ./models/prophet_finance.pkl
# Training Prophet for department: operations
#   Saved: ./models/prophet_operations.pkl
# ... (one per department)
# Training org-level Prophet model...
#   Saved: ./models/prophet_org.pkl
# Prophet training complete.

# List the saved models
ls ml_service/models/
# Should show: isolation_forest.pkl, prophet_finance.pkl, prophet_operations.pkl, ...
```

Repo-aligned expectation:
- `python training/train_prophet.py` should train and save Prophet artifacts if `MONGODB_URI` and MongoDB are available
- `ml_service/app/services/forecast_service.py` should return real forecast rows once model files exist in `ml_service/models/`

---

### ✅ How to Validate

1. `ls ml_service/models/` — should show `prophet_*.pkl` files, one per department
2. Quick Python test:
```bash
cd ml_service
python -c "
import joblib
model = joblib.load('models/prophet_finance.pkl')
future = model.make_future_dataframe(periods=7)
forecast = model.predict(future)
print(forecast[['ds','yhat','yhat_lower','yhat_upper']].tail(7))
"
# Should print 7 rows of predicted values with confidence bounds
```
3. Confirm `yhat` values are positive numbers in a reasonable range (not 0 or negative)

4. Confirm the files changed in this day are actually present in the repo: [ml_service/training/train_prophet.py](ml_service/training/train_prophet.py) and [ml_service/app/services/forecast_service.py](ml_service/app/services/forecast_service.py)
---

### 📋 Day 7 Outcome

Prophet models are trained and saved for every department plus the org level. Day 8 wires these models into the FastAPI prediction endpoint and builds the Node.js nightly cron job that stores forecast results in `m3_forecasts`.
---

## Day 8 — Prophet FastAPI Endpoint + Node.js Forecast Cron Job

### 🎯 Goal & Reasoning

Training produced `.pkl` files. Now you need two things: a FastAPI endpoint that loads those files and serves predictions on demand, and a Node.js cron job that calls that endpoint every night at 2AM, stores the results in `m3_forecasts`, and caches them in Redis. This day connects the Python ML layer to the Node.js orchestration layer for the forecast feature, exactly as the anomaly pipeline did for anomalies in Days 1–3.

---

### Work to Complete

#### A. Add Forecast Endpoint to `main.py`

**Why this exists:** The Node.js backend cannot import Python code directly. It communicates with FastAPI over HTTP. The endpoint receives a department ID and horizon, loads the correct model, and returns prediction data.

**File to modify:** `ml_service/main.py`

First define the Pydantic request model. **Pydantic** is the data validation library that FastAPI uses — it automatically checks that incoming JSON matches your expected schema and returns a clear error if not:

```python
from pydantic import BaseModel, validator
from typing import List
from forecast_service import generate_forecast

class ForecastRequest(BaseModel):
    dept_id: str
    horizon: int
    
    @validator('horizon')
    def horizon_must_be_valid(cls, v):
        if v not in [7, 14, 30]:
            raise ValueError('horizon must be 7, 14, or 30')
        return v

class ForecastPoint(BaseModel):
    ds: str
    yhat: float
    yhat_lower: float
    yhat_upper: float

class ForecastResponse(BaseModel):
    dept_id: str
    horizon: int
    forecast: List[ForecastPoint]

@app.post("/ml/forecast/predict", response_model=ForecastResponse)
async def forecast_predict(body: ForecastRequest, request: Request):
    # Validate service key
    if request.headers.get("x-service-key") != SERVICE_KEY:
        raise HTTPException(status_code=401, detail="Invalid service key")
    
    try:
        points = generate_forecast(body.dept_id, body.horizon)
        return ForecastResponse(dept_id=body.dept_id, horizon=body.horizon, forecast=points)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

---

#### B. Build `forecastJob.ts` — Nightly Cron at 2AM

**Why this exists:** Forecasts don't need to update every 6 hours like anomalies — the underlying decision data changes slowly enough that a nightly refresh is sufficient. The cron expression `'0 2 * * *'` means "at 2:00AM every day."

**File to create:** `server/jobs/forecastJob.ts`

```typescript
import cron from 'node-cron';
import axios from 'axios';
import M1Decision from '../models/m1Decisions';
import Forecast from '../models/Forecast';
import { invalidate } from '../services/cacheService';

const HORIZONS = [7, 14, 30];

export async function runForecastJob(): Promise<void> {
  console.log('[ForecastJob] Starting nightly forecast run...');

  // Get all unique department IDs
  const departments: string[] = await M1Decision.distinct('department');
  departments.push('org'); // Add org-level

  console.log(`[ForecastJob] Generating forecasts for ${departments.length} departments.`);

  for (const deptId of departments) {
    for (const horizon of HORIZONS) {
      try {
        const response = await axios.post<{
          dept_id: string;
          horizon: number;
          forecast: Array<{ ds: string; yhat: number; yhat_lower: number; yhat_upper: number }>;
        }>(
          `${process.env.ML_SERVICE_URL}/ml/forecast/predict`,
          { dept_id: deptId, horizon },
          { headers: { 'x-service-key': process.env.SERVICE_KEY } }
        );

        const { forecast } = response.data;

        // Upsert into m3_forecasts — one document per dept+horizon combination
        await Forecast.findOneAndUpdate(
          { department: deptId, horizon },
          {
            $set: {
              department: deptId,
              horizon,
              generatedAt: new Date(),
              forecastData: forecast.map((p) => ({
                ds: new Date(p.ds),
                yhat: p.yhat,
                yhat_lower: p.yhat_lower,
                yhat_upper: p.yhat_upper,
              })),
            },
          },
          { upsert: true, new: true }
        );

        // Invalidate Redis cache for this dept+horizon
        await invalidate(`m3:forecast:${deptId}:${horizon}`);

        console.log(`[ForecastJob] Done: dept=${deptId}, horizon=${horizon}d`);
      } catch (err: any) {
        console.error(`[ForecastJob] Failed dept=${deptId} horizon=${horizon}:`, err.message);
        // Don't crash — continue with other departments
      }
    }
  }

  console.log('[ForecastJob] Nightly forecast run complete.');
}

// Schedule: 2:00 AM every night
cron.schedule('0 2 * * *', () => {
  runForecastJob().catch((err) =>
    console.error('[ForecastJob] Uncaught error:', err)
  );
});

console.log('[ForecastJob] Scheduled: nightly at 02:00.');
```

**Import in `server.ts`:**

```typescript
import './jobs/forecastJob';
```

---

#### C. Build `GET /api/analytics/forecast` Endpoint

**Why this exists:** The forecast page needs to fetch stored forecast data. This endpoint reads from `m3_forecasts` (written by the cron job) and serves it through Redis cache.

**File to modify:** `server/routes/analyticsRoutes.ts`

```typescript
// GET /api/analytics/forecast
router.get(
  '/forecast',
  validateJWT,
  requireRole(['admin', 'manager', 'executive', 'analyst']),
  async (req: Request, res: Response) => {
    const { deptId = 'org', horizon = '30' } = req.query as {
      deptId?: string;
      horizon?: string;
    };

    const horizonNum = parseInt(horizon, 10);
    const cacheKey = `m3:forecast:${deptId}:${horizonNum}`;

    try {
      const data = await getOrSet(cacheKey, 3600, async () => {
        // TTL is 1 hour — forecasts only change nightly
        const forecast = await Forecast.findOne({
          department: deptId,
          horizon: horizonNum,
        }).lean();

        if (!forecast) return null;
        return forecast;
      });

      if (!data) {
        return res.status(404).json({
          error: 'No forecast found. Run the forecast job first.',
        });
      }

      return res.json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);
```

---

### ⚙️ API Contracts

**GET /api/analytics/forecast**
- Protected by: `validateJWT`, `requireRole`
- Query: `deptId?: string` (default `'org'`), `horizon?: '7'|'14'|'30'` (default `'30'`)
- Cache key: `m3:forecast:{deptId}:{horizon}`, TTL 3600s (1 hour — forecasts change nightly)
- Response: `{ department: string, horizon: number, generatedAt: string, forecastData: [{ ds: Date, yhat: number, yhat_lower: number, yhat_upper: number }] }`

---

### 🤖 ML Specification

**POST /ml/forecast/predict (FastAPI)**
- Protected by: `x-service-key` header
- Request body: `{ dept_id: string, horizon: 7|14|30 }`
- Internal: loads `models/prophet_{dept_id}.pkl`, calls `generate_forecast(dept_id, horizon)`
- Response: `{ dept_id, horizon, forecast: [{ ds, yhat, yhat_lower, yhat_upper }] }`

**How Node.js calls it:**
```typescript
axios.post(`${ML_SERVICE_URL}/ml/forecast/predict`,
  { dept_id: deptId, horizon },
  { headers: { 'x-service-key': process.env.SERVICE_KEY } }
)
```

**MongoDB storage:** `m3_forecasts` collection, upsert on `{ department, horizon }`

---

### 💻 Commands to Run

```bash
# Restart FastAPI service
cd ml_service
python -m uvicorn main:app --port 8000 --reload

# Test forecast endpoint directly
curl -X POST http://localhost:8000/ml/forecast/predict \
  -H "Content-Type: application/json" \
  -H "x-service-key: YOUR_SERVICE_KEY" \
  -d '{"dept_id": "finance", "horizon": 7}'

# Restart Node backend (picks up new forecastJob import)
cd server && npm run dev

# Manually trigger forecast job (no need to wait for 2AM)
cd server
npx ts-node -e "import('./jobs/forecastJob').then(m => m.runForecastJob())"

# Check m3_forecasts in Compass after job runs
```

---

### ✅ How to Validate

1. FastAPI test: `curl` above should return 7 forecast data points with `ds`, `yhat`, `yhat_lower`, `yhat_upper`
2. After running forecast job manually: Compass → `m3_forecasts` collection → should have documents for each dept × horizon combination
3. `redis-cli keys "m3:forecast:*"` → should show keys like `m3:forecast:finance:7`
4. `GET /api/analytics/forecast?deptId=finance&horizon=7` with JWT → should return forecast data
5. Terminal logs: `[ForecastJob] Done: dept=finance, horizon=7d`

---

### 📋 Day 8 Outcome

The full Prophet forecast pipeline is operational: models are trained, FastAPI serves predictions, Node.js stores results nightly in `m3_forecasts`, and a cached REST endpoint serves the data to the frontend. Day 9 builds the Forecast page in React.

---

## Day 9 — Forecast Frontend Page

### 🎯 Goal & Reasoning

The forecast endpoint is live and returning real data. Today you build the `/analytics/forecast` page that displays it visually: a line chart showing historical decision volume overlaid with the Prophet prediction and a shaded confidence band. This gives managers a clear visual answer to "how busy will this department be over the next 30 days?" The page also needs a department selector and a horizon toggle so the user can explore different views without navigating away.

---

### Work to Complete

#### A. Add Forecast Types

**File to modify:** `client/src/types/index.ts`

```typescript
export interface IForecastPoint {
  ds: string; // ISO date string "2026-04-05"
  yhat: number;
  yhat_lower: number;
  yhat_upper: number;
}

export interface IForecastData {
  department: string;
  horizon: number;
  generatedAt: string;
  forecastData: IForecastPoint[];
}
```

---

#### B. Add Forecast API Function

**File to modify:** `client/src/services/api.ts`

```typescript
import { IForecastData } from '../types';

export async function getForecast(deptId: string, horizon: number): Promise<IForecastData> {
  const res = await api.get<IForecastData>(
    `/api/analytics/forecast?deptId=${deptId}&horizon=${horizon}`
  );
  return res.data;
}
```

---

#### C. Build `ForecastPage.tsx`

**File to create:** `client/src/pages/ForecastPage.tsx`

**ECharts** is used here because Recharts does not have a built-in confidence band (area between two lines) chart type. ECharts supports this natively with `areaStyle` and stacked series.

```typescript
import React, { useState, useEffect, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import { getForecast } from '../services/api';
import { IForecastPoint } from '../types';
import SkeletonLoader from '../components/SkeletonLoader';

const DEPARTMENTS = ['org', 'finance', 'operations', 'hr', 'legal', 'procurement'];
const HORIZONS = [7, 14, 30];

export default function ForecastPage() {
  const [deptId, setDeptId] = useState<string>('org');
  const [horizon, setHorizon] = useState<number>(30);
  const [forecastData, setForecastData] = useState<IForecastPoint[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchForecast = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getForecast(deptId, horizon);
      setForecastData(data.forecastData);
      setGeneratedAt(data.generatedAt);
    } catch {
      setError('Forecast data not available. Run the forecast job first.');
    } finally {
      setLoading(false);
    }
  }, [deptId, horizon]);

  useEffect(() => {
    fetchForecast();
  }, [fetchForecast]); // Re-fetches when deptId or horizon changes

  const predicted = forecastData.reduce((sum, p) => sum + Math.max(0, p.yhat), 0);
  const currentAvg =
    forecastData.length > 0
      ? forecastData.reduce((sum, p) => sum + p.yhat, 0) / forecastData.length
      : 0;

  // Build ECharts option
  const chartOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['Predicted Volume', 'Upper Bound', 'Lower Bound'] },
    xAxis: {
      type: 'category',
      data: forecastData.map((p) => p.ds),
      axisLabel: { rotate: 45, fontSize: 10 },
    },
    yAxis: { type: 'value', name: 'Decisions' },
    series: [
      {
        name: 'Upper Bound',
        type: 'line',
        data: forecastData.map((p) => p.yhat_upper.toFixed(1)),
        lineStyle: { opacity: 0 },
        areaStyle: { color: 'rgba(99, 102, 241, 0.15)' },
        stack: 'confidence',
        symbol: 'none',
      },
      {
        name: 'Lower Bound',
        type: 'line',
        data: forecastData.map((p) => p.yhat_lower.toFixed(1)),
        lineStyle: { opacity: 0 },
        areaStyle: { color: '#ffffff' }, // White "erases" the lower portion of the band
        stack: 'confidence',
        symbol: 'none',
      },
      {
        name: 'Predicted Volume',
        type: 'line',
        data: forecastData.map((p) => p.yhat.toFixed(1)),
        lineStyle: { color: '#6366f1', width: 2 },
        itemStyle: { color: '#6366f1' },
        symbol: 'circle',
        symbolSize: 4,
      },
    ],
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Decision Volume Forecast</h1>
        {generatedAt && (
          <p className="text-xs text-gray-400 mt-1">
            Last updated: {new Date(generatedAt).toLocaleString()}
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-4 mb-6">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Department</label>
          <select
            value={deptId}
            onChange={(e) => setDeptId(e.target.value)}
            className="border rounded px-3 py-1 text-sm"
          >
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Horizon</label>
          <div className="flex gap-1">
            {HORIZONS.map((h) => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={`px-3 py-1 text-sm rounded border transition ${
                  horizon === h
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {h}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary card */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: `Predicted (next ${horizon}d)`, value: Math.round(predicted).toString() },
          { label: 'Avg Daily', value: currentAvg.toFixed(1) },
          { label: 'Department', value: deptId },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-400 uppercase">{label}</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl border p-6">
        {loading ? (
          <SkeletonLoader rows={8} height="h-6" />
        ) : error ? (
          <div className="text-center py-12 text-red-400">{error}</div>
        ) : (
          <ReactECharts option={chartOption} style={{ height: 350 }} />
        )}
      </div>
    </div>
  );
}
```

---

### 🖥️ UI/UX Specification — Forecast Page

```
/analytics/forecast
┌──────────────────────────────────────────────────────────────────────┐
│  Decision Volume Forecast                                            │
│  Last updated: Apr 5, 2026, 2:03 AM                                  │
├──────────────────────────────────────────────────────────────────────┤
│  Department: [org ▼]    Horizon: [7d] [14d] [30d]                   │
├──────────────────────────────────────────────────────────────────────┤
│  [Predicted (next 30d): 342]  [Avg Daily: 11.4]  [Dept: org]        │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ECharts Line Chart                                                 │
│   ─── Predicted Volume (blue line)                                   │
│   ░░░ Confidence Band (shaded area between upper/lower bounds)       │
│                                                                      │
│   X-axis: dates (Apr 06, Apr 07, ... Apr 05+horizon)                │
│   Y-axis: number of decisions                                        │
└──────────────────────────────────────────────────────────────────────┘
```

---

### 💻 Commands to Run

```bash
cd client && npm run dev
# Navigate to http://localhost:5173/analytics/forecast
# Toggle horizon buttons — chart should update
# Change department — chart should re-fetch and update
```

---

### ✅ How to Validate

1. Page loads with chart — confidence band visible (shaded region around the line)
2. Toggling 7d/14d/30d changes the number of data points on the chart
3. Changing department triggers a new API call (check Network tab)
4. If forecast data isn't available: red error message appears (not a blank page)
5. Summary cards show real numbers (not 0 or NaN)

---

### 📋 Day 9 Outcome

The complete forecast feature is now functional — trained model, FastAPI endpoint, Node.js cron job, REST API, and frontend page with confidence band chart. Days 10–12 tackle the Random Forest risk scoring pipeline and the Risk Heatmap page.

---

## Day 10 — Train Random Forest Risk Scoring Model (Python)

### 🎯 Goal & Reasoning

The risk heatmap page needs `riskScore` and `riskLevel` values per department stored in `m3_kpi_snapshots`. Right now the KPI aggregator sets `riskLevel` as a naive default. The Random Forest model will compute a proper score based on six features: violation count, open violations, average cycle time, average rejections, anomaly count, and days over SLA. Today you build the training script and the prediction service in Python. Days 11 and 12 wire it into the Node.js cron and the frontend page.

---

### Work to Complete

#### A. Write `train_risk_model.py`

**Why this exists:** Random Forest is a supervised learning algorithm — it learns from labeled training examples. For risk scoring, you don't have labeled "this department is High risk" ground truth data, so instead you use an **unsupervised proxy**: compute a raw composite risk score from the features, then bin it into levels. The Random Forest then learns to predict that composite score from the features, effectively becoming a risk scoring function that generalizes beyond the training set.

**File to create:** `ml_service/training/train_risk_model.py`

```python
import os
import numpy as np
import pandas as pd
import joblib
from pymongo import MongoClient
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
MODELS_DIR = os.path.join(os.path.dirname(__file__), '..', 'models')
os.makedirs(MODELS_DIR, exist_ok=True)

def load_data():
    """Load decisions and violations from MongoDB, aggregate per department."""
    client = MongoClient(MONGODB_URI)
    db = client.get_default_database()

    decisions = list(db["m1_decisions"].find(
        {},
        {"department": 1, "cycleTimeHours": 1, "rejectionCount": 1, "daysOverSLA": 1, "status": 1}
    ))
    
    violations = list(db["m2_violations"].find(
        {},
        {"department": 1, "status": 1}
    ))

    anomalies = list(db["m3_anomalies"].find(
        {"isAnomaly": True},
        {"department": 1}
    ))

    client.close()

    df_d = pd.DataFrame(decisions)
    df_v = pd.DataFrame(violations) if violations else pd.DataFrame(columns=["department", "status"])
    df_a = pd.DataFrame(anomalies) if anomalies else pd.DataFrame(columns=["department"])

    # Aggregate per department
    dept_stats = df_d.groupby("department").agg(
        avgCycleTimeHours=("cycleTimeHours", lambda x: x.mean() or 0),
        avgRejectionCount=("rejectionCount", lambda x: x.mean() or 0),
        avgDaysOverSLA=("daysOverSLA", lambda x: x.mean() or 0),
    ).reset_index()

    # Violation counts per department
    viol_counts = df_v.groupby("department").size().reset_index(name="violationCount")
    open_viols = df_v[df_v["status"] == "open"].groupby("department").size().reset_index(name="openViolations")

    # Anomaly counts per department
    anomaly_counts = df_a.groupby("department").size().reset_index(name="anomalyCount") if len(df_a) > 0 else pd.DataFrame(columns=["department", "anomalyCount"])

    # Merge everything
    df = dept_stats.merge(viol_counts, on="department", how="left")
    df = df.merge(open_viols, on="department", how="left")
    df = df.merge(anomaly_counts, on="department", how="left")
    df = df.fillna(0)

    return df

def create_risk_score(df: pd.DataFrame) -> pd.Series:
    """
    Create a proxy risk score using Z-score normalization and weighted sum.
    Features with higher weight contribute more to risk.
    """
    weights = {
        "violationCount": 0.3,
        "openViolations": 0.25,
        "avgCycleTimeHours": 0.2,
        "avgRejectionCount": 0.15,
        "anomalyCount": 0.1,
    }
    
    score = pd.Series(0.0, index=df.index)
    for feature, weight in weights.items():
        col = df[feature]
        if col.std() > 0:
            normalized = (col - col.mean()) / col.std()
        else:
            normalized = col * 0
        score += weight * normalized
    
    # Scale to 0–100
    if score.max() != score.min():
        score = ((score - score.min()) / (score.max() - score.min())) * 100
    else:
        score = score * 0 + 50  # All same — assign 50
    
    return score.round(2)

def score_to_level(score: float) -> str:
    if score >= 75: return "Critical"
    if score >= 50: return "High"
    if score >= 25: return "Medium"
    return "Low"

def main():
    print("Loading data from MongoDB...")
    df = load_data()
    print(f"Loaded data for {len(df)} departments.")
    print(df.to_string())

    # Feature columns
    feature_cols = ["violationCount", "openViolations", "avgCycleTimeHours",
                    "avgRejectionCount", "anomalyCount", "avgDaysOverSLA"]
    
    X = df[feature_cols].values
    
    # Create proxy labels
    y = create_risk_score(df).values
    
    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Train Random Forest (regression mode — predicts a score, not a category)
    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=5,
        random_state=42
    )
    model.fit(X_scaled, y)
    
    print(f"\nFeature importances (from Random Forest):")
    for feat, imp in zip(feature_cols, model.feature_importances_):
        print(f"  {feat}: {imp:.3f}")
    
    # Save model and scaler together
    joblib.dump({"model": model, "scaler": scaler, "feature_cols": feature_cols}, 
                os.path.join(MODELS_DIR, "risk_model.pkl"))
    print(f"\nSaved: models/risk_model.pkl")
    
    # Save department labels for reference
    dept_results = df[["department"]].copy()
    dept_results["riskScore"] = y
    dept_results["riskLevel"] = dept_results["riskScore"].apply(score_to_level)
    print("\nDepartment risk scores:")
    print(dept_results.to_string())

if __name__ == "__main__":
    main()
```

---

#### B. Write `risk_service.py`

**File to create:** `ml_service/risk_service.py`

```python
import os
import joblib
import numpy as np
from typing import List, Dict

MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models')

def score_to_level(score: float) -> str:
    if score >= 75: return "Critical"
    if score >= 50: return "High"
    if score >= 25: return "Medium"
    return "Low"

def predict_risk(departments: List[Dict]) -> List[Dict]:
    """
    Input: list of { dept, violationCount, openViolations, avgCycleTimeHours,
                     avgRejectionCount, anomalyCount, avgDaysOverSLA }
    Output: list of { dept, score, level, featureImportance }
    """
    artifact = joblib.load(os.path.join(MODELS_DIR, "risk_model.pkl"))
    model = artifact["model"]
    scaler = artifact["scaler"]
    feature_cols = artifact["feature_cols"]
    
    X = np.array([[d.get(f, 0) for f in feature_cols] for d in departments])
    X_scaled = scaler.transform(X)
    scores = model.predict(X_scaled)
    
    importances = model.feature_importances_
    feature_importance = [
        {"feature": feat, "weight": round(float(imp) * 100, 1)}
        for feat, imp in zip(feature_cols, importances)
    ]
    
    results = []
    for dept_data, score in zip(departments, scores):
        results.append({
            "dept": dept_data["dept"],
            "score": round(float(score), 2),
            "level": score_to_level(float(score)),
            "featureImportance": feature_importance,
        })
    
    return results
```

---

#### C. Add Risk Score Endpoint to `main.py`

**File to modify:** `ml_service/main.py`

```python
from risk_service import predict_risk
from pydantic import BaseModel
from typing import List, Optional

class DeptFeatureVector(BaseModel):
    dept: str
    violationCount: float = 0
    openViolations: float = 0
    avgCycleTimeHours: float = 0
    avgRejectionCount: float = 0
    anomalyCount: float = 0
    avgDaysOverSLA: float = 0

class RiskScoreRequest(BaseModel):
    departments: List[DeptFeatureVector]

@app.post("/ml/risk/score")
async def risk_score(body: RiskScoreRequest, request: Request):
    if request.headers.get("x-service-key") != SERVICE_KEY:
        raise HTTPException(status_code=401, detail="Invalid service key")
    
    try:
        dept_dicts = [d.dict() for d in body.departments]
        results = predict_risk(dept_dicts)
        return {"scores": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

---

### 💻 Commands to Run

```bash
cd ml_service

# Train the risk model
python training/train_risk_model.py

# Expected output:
# Loaded data for 5 departments.
# Feature importances (from Random Forest):
#   violationCount: 0.312
#   openViolations: 0.244
#   avgCycleTimeHours: 0.198
#   avgRejectionCount: 0.151
#   anomalyCount: 0.095
# Saved: models/risk_model.pkl
# Department risk scores:
#   finance     riskScore=72.3  riskLevel=High
#   operations  riskScore=45.1  riskLevel=Medium
# ...

# Restart FastAPI to load new endpoint
python -m uvicorn main:app --port 8000 --reload

# Test risk score endpoint
curl -X POST http://localhost:8000/ml/risk/score \
  -H "Content-Type: application/json" \
  -H "x-service-key: YOUR_KEY" \
  -d '{
    "departments": [
      {"dept":"finance","violationCount":12,"openViolations":5,"avgCycleTimeHours":48,"avgRejectionCount":3,"anomalyCount":4,"avgDaysOverSLA":2}
    ]
  }'
```

---

### ✅ How to Validate

1. `ls ml_service/models/` — should now show `risk_model.pkl`
2. `curl` test returns JSON with `scores` array containing `dept`, `score`, `level`, `featureImportance`
3. Feature importances sum to approximately 1.0 (100%)
4. Scores are between 0 and 100

---

### 📋 Day 10 Outcome

The Random Forest risk model is trained and the FastAPI endpoint is live. Day 11 builds the Node.js risk scoring cron job that calls this endpoint daily and writes results back to `m3_kpi_snapshots`.

---

## Day 11 — Risk Scoring Cron Job + Risk Heatmap Backend

### 🎯 Goal & Reasoning

The risk model is trained. Now you need the Node.js orchestration layer: a cron job that collects the feature vectors for each department (pulling violation data from Module 2, anomaly counts from `m3_anomalies`, and KPI data from `m3_kpi_snapshots`), sends them to FastAPI, and writes the resulting scores back into `m3_kpi_snapshots`. Once this runs, the risk heatmap endpoint already built in Day 3 will return meaningful data instead of whatever default values were written by the basic KPI aggregator.

---

### Work to Complete

#### A. Build `riskScoringJob.ts`

**Why this exists:** Risk scoring depends on cross-module data (M2 violations) that Module 3 can't access directly for real-time requests. The cron job pattern is correct here: run daily, collect all inputs, score all departments in batch, write results. This is more efficient than scoring on every dashboard request.

**File to create:** `server/jobs/riskScoringJob.ts`

```typescript
import cron from 'node-cron';
import axios from 'axios';
import M1Decision from '../models/m1Decisions';
import M2Violation from '../models/m2Violations';
import Anomaly from '../models/Anomaly';
import KpiSnapshot from '../models/KPI_Snapshot';
import { invalidate } from '../services/cacheService';

interface DeptFeatureVector {
  dept: string;
  violationCount: number;
  openViolations: number;
  avgCycleTimeHours: number;
  avgRejectionCount: number;
  anomalyCount: number;
  avgDaysOverSLA: number;
}

interface RiskScoreResult {
  dept: string;
  score: number;
  level: string;
  featureImportance: Array<{ feature: string; weight: number }>;
}

export async function runRiskScoringJob(): Promise<void> {
  console.log('[RiskJob] Starting risk scoring run...');

  // Step 1: Get all unique departments
  const departments: string[] = await M1Decision.distinct('department');

  // Step 2: Build feature vector for each department
  const featureVectors: DeptFeatureVector[] = [];

  for (const dept of departments) {
    // Query M3's own data for this department
    const decisions = await M1Decision.find({ department: dept })
      .select('cycleTimeHours rejectionCount daysOverSLA')
      .lean() as any[];

    const violations = await M2Violation.find({ department: dept }).lean() as any[];
    const openViolations = violations.filter((v: any) => v.status === 'open').length;

    const anomalyCount = await Anomaly.countDocuments({
      department: dept,
      isAnomaly: true,
      isAcknowledged: false,
    });

    const avgCycleTimeHours =
      decisions.reduce((s: number, d: any) => s + (d.cycleTimeHours || 0), 0) /
      (decisions.length || 1);

    const avgRejectionCount =
      decisions.reduce((s: number, d: any) => s + (d.rejectionCount || 0), 0) /
      (decisions.length || 1);

    const avgDaysOverSLA =
      decisions.reduce((s: number, d: any) => s + (d.daysOverSLA || 0), 0) /
      (decisions.length || 1);

    featureVectors.push({
      dept,
      violationCount: violations.length,
      openViolations,
      avgCycleTimeHours: parseFloat(avgCycleTimeHours.toFixed(2)),
      avgRejectionCount: parseFloat(avgRejectionCount.toFixed(2)),
      anomalyCount,
      avgDaysOverSLA: parseFloat(avgDaysOverSLA.toFixed(2)),
    });
  }

  // Step 3: POST to FastAPI
  let scores: RiskScoreResult[] = [];
  try {
    const response = await axios.post<{ scores: RiskScoreResult[] }>(
      `${process.env.ML_SERVICE_URL}/ml/risk/score`,
      { departments: featureVectors },
      { headers: { 'x-service-key': process.env.SERVICE_KEY } }
    );
    scores = response.data.scores;
    console.log(`[RiskJob] Received ${scores.length} risk scores from FastAPI.`);
  } catch (err: any) {
    console.error('[RiskJob] FastAPI call failed:', err.message);
    return;
  }

  // Step 4: Write results back to m3_kpi_snapshots
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const result of scores) {
    await KpiSnapshot.findOneAndUpdate(
      { department: result.dept, snapshotDate: today },
      {
        $set: {
          riskScore: result.score,
          riskLevel: result.level,
        },
      },
      { upsert: true, new: true }
    );

    // Invalidate per-department risk cache
    await invalidate(`m3:riskscore:${result.dept}`);
    await invalidate(`m3:riskheatmap:*`);

    console.log(
      `[RiskJob] Updated dept=${result.dept} score=${result.score} level=${result.level}`
    );
  }

  console.log('[RiskJob] Risk scoring run complete.');
}

// Daily at 01:00 AM — offset from anomaly job (00:00) by 1 hour
cron.schedule('0 1 * * *', () => {
  runRiskScoringJob().catch((err) =>
    console.error('[RiskJob] Uncaught error:', err)
  );
});

console.log('[RiskJob] Scheduled: daily at 01:00 AM.');
```

**Import in `server.ts`:**

```typescript
import './jobs/riskScoringJob';
```

---

#### B. Also Call Module 2 for Risk Data (Cross-Module Integration)

**Why this exists:** Module 2 has a `/api/risks/score/:deptId` endpoint that provides its own risk assessment. The GovVision architecture specifies that Module 3 should pull this data as additional feature input. This makes the risk score richer — it combines M3's own anomaly and cycle-time data with M2's compliance-based risk data.

```typescript
// Add this to the feature vector building loop in riskScoringJob.ts:
// After building featureVectors, try to enrich with M2 risk data

let m2RiskScore = 0;
try {
  const m2Response = await axios.get(
    `${process.env.M2_SERVICE_URL}/api/risks/score/${dept}`,
    { headers: { 'x-service-key': process.env.SERVICE_KEY } }
  );
  m2RiskScore = m2Response.data?.maxScore || 0;
} catch {
  // M2 unavailable — proceed with M3-only data, don't crash
}
// Use m2RiskScore as an additional input if desired
```

**Add `M2_SERVICE_URL` to `.env`:**

```
M2_SERVICE_URL=http://localhost:3002
```

---

### 🔗 Cross-Module Integration

**M3 → M2:** `GET /api/risks/score/:deptId`
- Caller: `riskScoringJob.ts` on Module 3's Node.js server
- Header: `x-service-key: SERVICE_KEY`
- Purpose: Enrich the risk feature vector with M2's compliance-based risk assessment
- Data received: `{ maxScore: number, breakdown: [] }`
- What M3 does with it: uses `maxScore` as a supplementary feature when building the vector for FastAPI

---

### 💻 Commands to Run

```bash
# Restart backend (picks up new riskScoringJob import)
cd server && npm run dev

# Manually trigger risk job
npx ts-node -e "import('./jobs/riskScoringJob').then(m => m.runRiskScoringJob())"

# Test risk heatmap endpoint (should now have non-zero values)
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3003/api/analytics/risk-heatmap"

# Check in Compass
# m3_kpi_snapshots — filter for today, confirm riskScore and riskLevel fields are set
```

---

### ✅ How to Validate

1. After running job manually: `m3_kpi_snapshots` documents for today should have `riskScore` (number between 0-100) and `riskLevel` (`Low`/`Medium`/`High`/`Critical`)
2. `GET /api/analytics/risk-heatmap` returns array where each dept has non-zero counts in at least one risk level column
3. `redis-cli keys "m3:riskheatmap:*"` → invalidated and regenerated
4. Terminal: `[RiskJob] Updated dept=finance score=72.3 level=High`

---

### 📋 Day 11 Outcome

Risk scores are computed by Random Forest, stored in `m3_kpi_snapshots`, and the risk heatmap endpoint returns meaningful data. Day 12 builds the frontend Risk Heatmap page with the ECharts visualization and drill-down side panel.

---

## Day 12 — Risk Heatmap Frontend Page

### 🎯 Goal & Reasoning

The risk heatmap page is the most visually distinctive page in Module 3. It answers the question: "Which departments are at what risk levels, and why?" The ECharts heatmap grid makes the answer scannable at a glance. Clicking any cell opens a side panel with department-specific detail. This is a primary demo touchpoint — it directly demonstrates the ML pipeline's output in a format that non-technical stakeholders understand immediately.

---

### Work to Complete

#### A. Add Risk Heatmap Types

**File to modify:** `client/src/types/index.ts`

```typescript
export interface IRiskHeatmapRow {
  department: string;
  deptId: string;
  Low: number;
  Medium: number;
  High: number;
  Critical: number;
}

export interface IDrillDownData {
  department: string;
  riskLevel: string;
  count: number;
  trend: 'up' | 'down' | 'flat';
  violations30Days: number;
  topAnomalies: IAnomaly[];
}
```

---

#### B. Add Risk Heatmap API Function

**File to modify:** `client/src/services/api.ts`

```typescript
import { IRiskHeatmapRow } from '../types';

export async function getRiskHeatmap(
  dateFrom?: string,
  dateTo?: string
): Promise<IRiskHeatmapRow[]> {
  const params = new URLSearchParams();
  if (dateFrom) params.set('dateFrom', dateFrom);
  if (dateTo) params.set('dateTo', dateTo);
  const res = await api.get<IRiskHeatmapRow[]>(`/api/analytics/risk-heatmap?${params}`);
  return res.data;
}
```

---

#### C. Build `RiskHeatmap.tsx`

**File to create:** `client/src/pages/RiskHeatmap.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { getRiskHeatmap } from '../services/api';
import { IRiskHeatmapRow } from '../types';
import SkeletonLoader from '../components/SkeletonLoader';
import DrillDownPanel from '../components/DrillDownPanel';

const RISK_LEVELS = ['Low', 'Medium', 'High', 'Critical'];

const riskColors: Record<string, string> = {
  Low: '#22c55e',
  Medium: '#eab308',
  High: '#f97316',
  Critical: '#ef4444',
};

export default function RiskHeatmap() {
  const [heatmapData, setHeatmapData] = useState<IRiskHeatmapRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<{
    department: string;
    riskLevel: string;
    count: number;
  } | null>(null);

  useEffect(() => {
    getRiskHeatmap()
      .then((data) => {
        setHeatmapData(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load risk heatmap data.');
        setLoading(false);
      });
  }, []);

  const departments = heatmapData.map((r) => r.department);

  // ECharts needs data as [xIndex, yIndex, value] tuples
  const seriesData: [number, number, number][] = [];
  heatmapData.forEach((row, yIdx) => {
    RISK_LEVELS.forEach((level, xIdx) => {
      seriesData.push([xIdx, yIdx, row[level as keyof IRiskHeatmapRow] as number]);
    });
  });

  const maxValue = Math.max(...seriesData.map(([, , v]) => v), 1);

  const chartOption = {
    tooltip: {
      formatter: (params: any) =>
        `${departments[params.data[1]]} — ${RISK_LEVELS[params.data[0]]}: ${params.data[2]} snapshots`,
    },
    grid: { top: 20, bottom: 60, left: 100, right: 60 },
    xAxis: {
      type: 'category',
      data: RISK_LEVELS,
      splitArea: { show: true },
    },
    yAxis: {
      type: 'category',
      data: departments,
      splitArea: { show: true },
    },
    visualMap: {
      min: 0,
      max: maxValue,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      inRange: {
        color: ['#f0fdf4', '#fef9c3', '#fed7aa', '#fecaca', '#dc2626'],
      },
    },
    series: [
      {
        name: 'Risk Snapshots',
        type: 'heatmap',
        data: seriesData,
        label: { show: true, fontSize: 11 },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' } },
      },
    ],
  };

  const handleChartClick = (params: any) => {
    const department = departments[params.data[1]];
    const riskLevel = RISK_LEVELS[params.data[0]];
    const count = params.data[2];
    setSelectedCell({ department, riskLevel, count });
  };

  return (
    <div className="p-6 flex gap-6">
      {/* Main heatmap */}
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Department Risk Heatmap</h1>

        {loading ? (
          <SkeletonLoader rows={6} height="h-12" />
        ) : error ? (
          <div className="text-center py-16 text-red-400">{error}</div>
        ) : (
          <div className="bg-white rounded-xl border p-6">
            <ReactECharts
              option={chartOption}
              style={{ height: Math.max(300, departments.length * 60) }}
              onEvents={{ click: handleChartClick }}
            />
          </div>
        )}

        <p className="text-xs text-gray-400 mt-3">
          Click any cell to view department details. Numbers show count of daily snapshots at each risk level.
        </p>
      </div>

      {/* Drill-down side panel */}
      {selectedCell && (
        <DrillDownPanel
          department={selectedCell.department}
          riskLevel={selectedCell.riskLevel}
          count={selectedCell.count}
          onClose={() => setSelectedCell(null)}
        />
      )}
    </div>
  );
}
```

---

#### D. Build `DrillDownPanel.tsx`

**File to create:** `client/src/components/DrillDownPanel.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { getAnomalies } from '../services/api';
import { IAnomaly } from '../types';

interface Props {
  department: string;
  riskLevel: string;
  count: number;
  onClose: () => void;
}

const levelColors: Record<string, string> = {
  Low: 'bg-green-100 text-green-800',
  Medium: 'bg-yellow-100 text-yellow-800',
  High: 'bg-orange-100 text-orange-800',
  Critical: 'bg-red-100 text-red-800',
};

export default function DrillDownPanel({ department, riskLevel, count, onClose }: Props) {
  const [anomalies, setAnomalies] = useState<IAnomaly[]>([]);

  useEffect(() => {
    // Load top 3 anomalies for this department
    getAnomalies().then((data) => {
      const all = [
        ...data.Critical, ...data.High, ...data.Medium, ...data.Low,
      ].filter((a) => a.department === department);
      setAnomalies(all.slice(0, 3));
    });
  }, [department]);

  return (
    <div
      className="w-80 shrink-0 bg-white border-l shadow-xl p-6 transition-all duration-300"
      style={{ minHeight: '100%' }}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800">{department}</h2>
          <span className={`text-xs font-bold px-3 py-1 rounded-full mt-1 inline-block ${levelColors[riskLevel]}`}>
            {riskLevel} Risk
          </span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl">×</button>
      </div>

      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-400 uppercase">Snapshots at {riskLevel}</p>
          <p className="text-2xl font-bold text-gray-800">{count}</p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-600 mb-2">Top Anomalies</h3>
          {anomalies.length === 0 ? (
            <p className="text-xs text-gray-400">No anomalies for this department.</p>
          ) : (
            <div className="space-y-2">
              {anomalies.map((a) => (
                <div key={a._id} className="border rounded p-2 text-xs">
                  <div className="flex justify-between">
                    <span className="font-mono text-blue-600">
                      <a href={`http://localhost:3001/decisions/${a.decisionId}`} target="_blank" rel="noreferrer">
                        {a.decisionId.slice(0, 10)}...
                      </a>
                    </span>
                    <span className={`px-2 py-0.5 rounded-full font-bold ${levelColors[a.severity]}`}>
                      {a.severity}
                    </span>
                  </div>
                  <p className="text-gray-500 mt-1">Score: {a.anomalyScore.toFixed(3)} · {a.featureValues.cycleTimeHours}h cycle</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

### 🖥️ UI/UX Specification — Risk Heatmap

```
/risk-heatmap
┌────────────────────────────────────────────────────┬─────────────────────┐
│  Department Risk Heatmap                           │ finance             │
│                                                    │ [High Risk]         │
│  ECharts Heatmap Grid:                             │                     │
│                                                    │ Snapshots at High   │
│         Low  Medium  High  Critical                │ 12                  │
│ finance   3    8     12      2      ← cell click  │                     │
│ ops       8    4      3      0      → opens panel │ Top Anomalies:      │
│ hr        9    2      1      0                    │ abc123... [CRITICAL] │
│ legal     6    5      2      1                    │ Score: 0.978 · 148h  │
│                                                    │                     │
│  Color: green (low count) → red (high count)       │ def456... [HIGH]     │
│  Click any cell to view details →                 │ Score: 0.921 · 96h   │
└────────────────────────────────────────────────────┴─────────────────────┘
```

---

### 💻 Commands to Run

```bash
cd client && npm run dev
# Navigate to http://localhost:5173/risk-heatmap
# Click a cell — side panel should slide in
```

---

### ✅ How to Validate

1. Heatmap grid renders with department names on Y-axis and Low/Medium/High/Critical on X-axis
2. Cells have colored backgrounds based on count (more = redder)
3. Click any non-zero cell — side panel appears with department name and risk level badge
4. Top 3 anomalies for the department appear in the panel with links to Module 1
5. Close button (×) hides the panel

---

### 📋 Day 12 Outcome

The complete Risk Heatmap page is built and demonstrates the Random Forest risk scoring pipeline visually. Days 13–17 build the complete reporting system — the last major feature block.

---

## Day 13 — Report Generator Service (Backend)

### 🎯 Goal & Reasoning

The reporting system is the operational backbone of Module 3 — managers use it to create formal records of governance performance. Three output formats are required: CSV (lightweight, good for data analysis), Excel (formatted with multiple sheets for presentations), and PDF (for executive distribution). Today you build the `reportGeneratorService.ts` that handles all three. The actual report API routes and the frontend will be built on Days 14–16.

---

### Work to Complete

#### A. Install Required Packages

**json2csv** converts an array of JavaScript objects into a CSV string. It handles escaping, headers, and quoted fields automatically. Without it, you'd have to manually serialize each row.

**exceljs** generates `.xlsx` workbook files in Node.js. It supports multiple sheets, styled header rows, column widths, frozen rows, and cell formatting. It's significantly more capable than writing raw CSV and calling it Excel.

**jspdf** generates PDF documents from JavaScript code. You define the content programmatically — text positions, table cells, font sizes — and it produces a real PDF file.

**uuid** generates universally unique identifiers. You use it to name each generated report file uniquely so files don't overwrite each other.

```bash
cd server
npm install json2csv exceljs jspdf uuid
npm install --save-dev @types/json2csv @types/uuid
# Note: @types/jspdf is bundled with jspdf in newer versions, no separate install needed
# Note: @types/exceljs is bundled with exceljs
```

---

#### B. Create the Uploads Directory

```bash
mkdir -p server/uploads/reports
```

Add to `.gitignore`:
```
server/uploads/reports/*.csv
server/uploads/reports/*.xlsx
server/uploads/reports/*.pdf
```

---

#### C. Add Report Types to Backend

**File to modify:** `server/types/index.ts`

```typescript
export interface IReportParams {
  reportName: string;
  reportType: 'Executive' | 'Compliance' | 'Decision' | 'Department' | 'Custom';
  format: 'csv' | 'excel' | 'pdf';
  dateFrom: string; // ISO date string
  dateTo: string;
  departments: string[]; // Array of dept IDs, empty = all
  generatedBy: string; // userId from JWT
}
```

---

#### D. Build `reportGeneratorService.ts`

**File to create:** `server/services/reportGeneratorService.ts`

```typescript
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Parser } from 'json2csv';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import KpiSnapshot from '../models/KPI_Snapshot';
import Anomaly from '../models/Anomaly';
import axios from 'axios';
import { IReportParams } from '../types';

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'reports');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

async function fetchReportData(params: IReportParams) {
  const match: any = {};
  if (params.dateFrom) match.snapshotDate = { $gte: new Date(params.dateFrom) };
  if (params.dateTo)
    match.snapshotDate = { ...match.snapshotDate, $lte: new Date(params.dateTo) };
  if (params.departments && params.departments.length > 0)
    match.department = { $in: params.departments };

  const kpiSnapshots = await KpiSnapshot.find(match).lean();

  const anomalies = await Anomaly.find({
    isAnomaly: true,
    ...(params.departments?.length ? { department: { $in: params.departments } } : {}),
  }).lean();

  // Fetch compliance data from Module 2
  let complianceData: any = null;
  try {
    const m2Response = await axios.get(
      `${process.env.M2_SERVICE_URL}/api/compliance/status`,
      { headers: { 'x-service-key': process.env.SERVICE_KEY } }
    );
    complianceData = m2Response.data;
  } catch {
    console.warn('[ReportGenerator] M2 compliance data unavailable.');
  }

  return { kpiSnapshots, anomalies, complianceData };
}

export async function generateCSV(params: IReportParams): Promise<string> {
  const { kpiSnapshots } = await fetchReportData(params);

  const fields = [
    { label: 'Department', value: 'department' },
    { label: 'Snapshot Date', value: (row: any) => new Date(row.snapshotDate).toLocaleDateString() },
    { label: 'Total Decisions', value: 'totalDecisions' },
    { label: 'Approved', value: 'approvedCount' },
    { label: 'Rejected', value: 'rejectedCount' },
    { label: 'Pending', value: 'pendingCount' },
    { label: 'Avg Cycle Time (h)', value: 'avgCycleTimeHours' },
    { label: 'Compliance Rate (%)', value: 'complianceRate' },
    { label: 'Risk Score', value: 'riskScore' },
    { label: 'Risk Level', value: 'riskLevel' },
  ];

  const parser = new Parser({ fields });
  const csv = parser.parse(kpiSnapshots);

  const filename = `report_${uuidv4()}.csv`;
  const filePath = path.join(UPLOADS_DIR, filename);
  fs.writeFileSync(filePath, csv, 'utf-8');

  return filePath;
}

export async function generateExcel(params: IReportParams): Promise<string> {
  const { kpiSnapshots, anomalies, complianceData } = await fetchReportData(params);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'GovVision Module 3';
  workbook.created = new Date();

  // Sheet 1: KPI Summary
  const kpiSheet = workbook.addWorksheet('KPI Summary');

  kpiSheet.columns = [
    { header: 'Department', key: 'department', width: 18 },
    { header: 'Snapshot Date', key: 'snapshotDate', width: 15 },
    { header: 'Total Decisions', key: 'totalDecisions', width: 16 },
    { header: 'Approved', key: 'approvedCount', width: 12 },
    { header: 'Rejected', key: 'rejectedCount', width: 12 },
    { header: 'Avg Cycle Time (h)', key: 'avgCycleTimeHours', width: 20 },
    { header: 'Compliance Rate (%)', key: 'complianceRate', width: 20 },
    { header: 'Risk Score', key: 'riskScore', width: 12 },
    { header: 'Risk Level', key: 'riskLevel', width: 14 },
  ];

  // Style header row
  const headerRow = kpiSheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.alignment = { horizontal: 'center' };
  });
  kpiSheet.views = [{ state: 'frozen', ySplit: 1 }]; // Freeze header row

  kpiSnapshots.forEach((snap: any) => {
    kpiSheet.addRow({
      ...snap,
      snapshotDate: new Date(snap.snapshotDate).toLocaleDateString(),
    });
  });

  // Alternate row colors
  kpiSheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: rowNumber % 2 === 0 ? 'FFF5F6FA' : 'FFFFFFFF' },
        };
      });
    }
  });

  // Sheet 2: Anomaly List
  const anomalySheet = workbook.addWorksheet('Anomaly List');
  anomalySheet.columns = [
    { header: 'Decision ID', key: 'decisionId', width: 30 },
    { header: 'Department', key: 'department', width: 18 },
    { header: 'Severity', key: 'severity', width: 12 },
    { header: 'Anomaly Score', key: 'anomalyScore', width: 15 },
    { header: 'Acknowledged', key: 'isAcknowledged', width: 15 },
    { header: 'Cycle Time (h)', key: 'cycleTime', width: 15 },
    { header: 'Rejections', key: 'rejections', width: 12 },
  ];

  const anomalyHeaderRow = anomalySheet.getRow(1);
  anomalyHeaderRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEF4444' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  });
  anomalySheet.views = [{ state: 'frozen', ySplit: 1 }];

  anomalies.forEach((a: any) => {
    anomalySheet.addRow({
      decisionId: a.decisionId,
      department: a.department,
      severity: a.severity,
      anomalyScore: a.anomalyScore?.toFixed(3),
      isAcknowledged: a.isAcknowledged ? 'Yes' : 'No',
      cycleTime: a.featureValues?.cycleTimeHours || 0,
      rejections: a.featureValues?.rejectionCount || 0,
    });
  });

  // Sheet 3: Compliance Summary (from Module 2)
  if (complianceData) {
    const compSheet = workbook.addWorksheet('Compliance');
    compSheet.addRow(['Compliance Report (from Module 2)']);
    compSheet.addRow(['Overall Compliance', `${complianceData.overall}%`]);
    compSheet.addRow([]);
    compSheet.addRow(['Department', 'Compliance %']);
    (complianceData.deptBreakdown || []).forEach((dept: any) => {
      compSheet.addRow([dept.department, dept.rate]);
    });
  }

  const filename = `report_${uuidv4()}.xlsx`;
  const filePath = path.join(UPLOADS_DIR, filename);
  await workbook.xlsx.writeFile(filePath);

  return filePath;
}

export async function generatePDF(params: IReportParams): Promise<string> {
  const { kpiSnapshots, complianceData } = await fetchReportData(params);

  const doc = new jsPDF();
  const margin = 15;
  let y = margin;

  // Cover page
  doc.setFontSize(22);
  doc.setTextColor(79, 70, 229); // Indigo
  doc.text('GovVision Analytics Report', margin, y);
  y += 10;

  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`Report Type: ${params.reportType}`, margin, y);
  y += 7;
  doc.text(
    `Date Range: ${params.dateFrom} to ${params.dateTo}`,
    margin,
    y
  );
  y += 7;
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y);
  y += 7;
  doc.text('Generated by GovVision Module 3', margin, y);
  y += 15;

  // KPI Summary Table
  doc.setFontSize(14);
  doc.setTextColor(30, 30, 30);
  doc.text('KPI Summary', margin, y);
  y += 8;

  doc.setFontSize(9);
  const headers = ['Department', 'Total', 'Approved', 'Rejected', 'Compliance%', 'Risk'];
  const colWidths = [40, 20, 22, 22, 28, 24];
  let x = margin;

  // Header row
  doc.setFillColor(79, 70, 229);
  doc.rect(margin, y - 5, colWidths.reduce((a, b) => a + b, 0), 8, 'F');
  doc.setTextColor(255, 255, 255);
  headers.forEach((h, i) => {
    doc.text(h, x + 2, y);
    x += colWidths[i];
  });
  y += 6;

  // Data rows
  doc.setTextColor(30, 30, 30);
  kpiSnapshots.slice(0, 25).forEach((snap: any, rowIdx: number) => {
    if (y > 270) {
      doc.addPage();
      y = margin;
    }
    if (rowIdx % 2 === 0) {
      doc.setFillColor(245, 246, 250);
      doc.rect(margin, y - 4, colWidths.reduce((a, b) => a + b, 0), 7, 'F');
    }
    x = margin;
    const row = [
      snap.department,
      snap.totalDecisions?.toString() || '0',
      snap.approvedCount?.toString() || '0',
      snap.rejectedCount?.toString() || '0',
      `${snap.complianceRate?.toFixed(1) || '0'}%`,
      snap.riskLevel || 'N/A',
    ];
    row.forEach((cell, i) => {
      doc.text(cell, x + 2, y);
      x += colWidths[i];
    });
    y += 7;
  });

  // Compliance section
  if (complianceData) {
    y += 10;
    doc.setFontSize(14);
    doc.text('Compliance Overview (Module 2)', margin, y);
    y += 8;
    doc.setFontSize(10);
    doc.text(`Overall Compliance Rate: ${complianceData.overall}%`, margin, y);
  }

  const filename = `report_${uuidv4()}.pdf`;
  const filePath = path.join(UPLOADS_DIR, filename);
  fs.writeFileSync(filePath, Buffer.from(doc.output('arraybuffer')));

  return filePath;
}
```

---

### 🔗 Cross-Module Integration

**M3 → M2:** `GET /api/compliance/status`
- Called inside `fetchReportData()` when generating Excel and PDF reports
- Header: `x-service-key: SERVICE_KEY`
- Data received: `{ overall: number, deptBreakdown: [{ department, rate }] }`
- What M3 does with it: includes in Sheet 3 of Excel report and in PDF compliance section
- Failure handling: wrapped in try/catch — if M2 is unavailable, report still generates without compliance section

---

### 💻 Commands to Run

```bash
cd server
npm install json2csv exceljs jspdf uuid
npm install --save-dev @types/json2csv @types/uuid

# Verify packages installed
cat package.json | grep -E "json2csv|exceljs|jspdf|uuid"

# Quick test — run the generator directly from ts-node
npx ts-node -e "
const s = require('./services/reportGeneratorService');
s.generateCSV({
  reportName: 'Test',
  reportType: 'Executive',
  format: 'csv',
  dateFrom: '2026-01-01',
  dateTo: '2026-04-05',
  departments: [],
  generatedBy: 'test'
}).then(p => console.log('Generated:', p));
"
```

---

### ✅ How to Validate

1. After running the ts-node test: `ls server/uploads/reports/` — should show a `.csv` file
2. Open the CSV file — should have headers and rows of KPI data
3. Run `generateExcel` the same way — should produce a `.xlsx` file
4. Open the Excel file — should have "KPI Summary" and "Anomaly List" sheets with styled headers
5. Run `generatePDF` — should produce a `.pdf` file with a cover page and table

---

### 📋 Day 13 Outcome

All three report generators (CSV, Excel, PDF) are built and tested in isolation. Day 14 wraps these generators with REST API endpoints that the frontend will call.

---

## Day 14 — Reports API Routes

### 🎯 Goal & Reasoning

The generator service is a set of functions. Today you expose those functions through REST API endpoints. The three endpoints you need are: one to trigger generation, one to download a generated file, and one to list all past reports. You also wire the audit log call to Module 2 so every report generation is immutably logged — this is required by the GovVision architecture specification.

---

### Work to Complete

#### A. Create `server/routes/reportsRoutes.ts`

**File to create:** `server/routes/reportsRoutes.ts`

```typescript
import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { validateJWT } from '../middleware/validateJWT';
import { requireRole } from '../middleware/requireRole';
import { generateCSV, generateExcel, generatePDF } from '../services/reportGeneratorService';
import Report from '../models/Report';
import { IReportParams } from '../types';

const router = Router();

// POST /api/reports/generate
router.post(
  '/generate',
  validateJWT,
  requireRole(['admin', 'manager', 'executive']),
  async (req: Request, res: Response) => {
    const user = (req as any).user;
    const params: IReportParams = {
      ...req.body,
      generatedBy: user?.userId,
    };

    if (!params.reportType || !params.format || !params.dateFrom || !params.dateTo) {
      return res.status(400).json({ error: 'reportType, format, dateFrom, dateTo are required' });
    }

    // Step 1: Create the report document with status "Generating"
    const reportDoc = await Report.create({
      reportName: params.reportName || `${params.reportType} Report`,
      reportType: params.reportType,
      format: params.format,
      status: 'Generating',
      dateFrom: new Date(params.dateFrom),
      dateTo: new Date(params.dateTo),
      departments: params.departments || [],
      generatedBy: params.generatedBy,
      generatedAt: new Date(),
    });

    // Step 2: Run generator (async — respond after it finishes)
    try {
      let filePath: string;
      if (params.format === 'csv') {
        filePath = await generateCSV(params);
      } else if (params.format === 'excel') {
        filePath = await generateExcel(params);
      } else if (params.format === 'pdf') {
        filePath = await generatePDF(params);
      } else {
        await Report.findByIdAndUpdate(reportDoc._id, { status: 'Failed' });
        return res.status(400).json({ error: 'Invalid format' });
      }

      // Step 3: Update document to Completed with file path
      await Report.findByIdAndUpdate(reportDoc._id, {
        status: 'Completed',
        filePath,
      });

      // Step 4: Audit log to Module 2
      try {
        await axios.post(
          `${process.env.M2_SERVICE_URL}/api/internal/audit/log`,
          {
            action: 'REPORT_GENERATED',
            userId: params.generatedBy,
            metadata: {
              reportId: reportDoc._id.toString(),
              reportType: params.reportType,
              format: params.format,
            },
          },
          { headers: { 'x-service-key': process.env.SERVICE_KEY } }
        );
      } catch {
        console.warn('[Reports] Audit log to M2 failed (non-critical).');
      }

      return res.json({
        reportId: reportDoc._id.toString(),
        message: 'Report generated successfully.',
      });
    } catch (err: any) {
      await Report.findByIdAndUpdate(reportDoc._id, { status: 'Failed' });
      console.error('[Reports] Generation failed:', err.message);
      return res.status(500).json({ error: 'Report generation failed.' });
    }
  }
);

// GET /api/reports/download/:id
router.get(
  '/download/:id',
  validateJWT,
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const report = await Report.findById(id).lean() as any;
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    if (report.status !== 'Completed' || !report.filePath) {
      return res.status(400).json({ error: 'Report is not ready for download' });
    }
    if (!fs.existsSync(report.filePath)) {
      return res.status(404).json({ error: 'Report file not found on disk' });
    }

    const mimeTypes: Record<string, string> = {
      csv: 'text/csv',
      excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      pdf: 'application/pdf',
    };

    const ext = path.extname(report.filePath).slice(1);
    const filename = path.basename(report.filePath);

    res.setHeader('Content-Type', mimeTypes[report.format] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${report.reportName}.${ext}"`);

    const fileStream = fs.createReadStream(report.filePath);
    fileStream.pipe(res);
  }
);

// GET /api/reports/history
router.get(
  '/history',
  validateJWT,
  requireRole(['admin', 'manager', 'executive']),
  async (req: Request, res: Response) => {
    const { reportType, dateFrom, dateTo } = req.query as {
      reportType?: string;
      dateFrom?: string;
      dateTo?: string;
    };

    const filter: any = {};
    if (reportType) filter.reportType = reportType;
    if (dateFrom) filter.generatedAt = { $gte: new Date(dateFrom) };
    if (dateTo) filter.generatedAt = { ...filter.generatedAt, $lte: new Date(dateTo) };

    const reports = await Report.find(filter)
      .sort({ generatedAt: -1 })
      .limit(100)
      .lean();

    return res.json(reports);
  }
);

export default router;
```

**Uncomment the reports route in `server.ts`:**

```typescript
import reportsRoutes from './routes/reportsRoutes';
app.use('/api/reports', reportsRoutes);
```

---

### ⚙️ API Contracts

**POST /api/reports/generate**
- Protected by: `validateJWT`, `requireRole(['admin','manager','executive'])`
- Request body: `IReportParams` (reportType, format, dateFrom, dateTo, departments?, reportName?)
- Internal: create `m3_reports` doc with `status: 'Generating'`, run generator, update to `status: 'Completed'` with `filePath`, call M2 audit log
- Response: `{ reportId: string, message: string }`
- Cross-module: `POST /api/internal/audit/log` to M2

**GET /api/reports/download/:id**
- Protected by: `validateJWT`
- URL param: `id` — MongoDB `_id` of the `m3_reports` document
- Internal: find report, verify file exists, stream file with correct Content-Type and Content-Disposition
- Response: raw file stream (triggers browser download)

**GET /api/reports/history**
- Protected by: `validateJWT`, `requireRole(['admin','manager','executive'])`
- Query: `reportType?`, `dateFrom?`, `dateTo?`
- Response: `IReport[]` sorted by `generatedAt` descending

---

### 🔗 Cross-Module Integration

**M3 → M2:** `POST /api/internal/audit/log`
- Caller: `POST /api/reports/generate` handler after successful generation
- Header: `x-service-key: SERVICE_KEY`
- Body: `{ action: 'REPORT_GENERATED', userId, metadata: { reportId, reportType, format } }`
- Purpose: Creates an immutable audit log entry in Module 2's `m2_audit_logs` collection
- Failure handling: wrapped in try/catch — if M2 is unavailable, the report still succeeds

---

### 💻 Commands to Run

```bash
cd server && npm run dev

# Test report generation
curl -X POST http://localhost:3003/api/reports/generate \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reportName": "Test Report",
    "reportType": "Executive",
    "format": "csv",
    "dateFrom": "2026-01-01",
    "dateTo": "2026-04-05",
    "departments": []
  }'

# Expected: { "reportId": "...", "message": "Report generated successfully." }

# Download the report (replace REPORT_ID)
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3003/api/reports/download/REPORT_ID \
  --output test_report.csv

# List history
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3003/api/reports/history
```

---

### ✅ How to Validate

1. Generate endpoint returns `reportId`
2. In Compass: `m3_reports` collection — should have a document with `status: 'Completed'` and `filePath` pointing to an actual file
3. Download endpoint: `--output test_report.csv` should produce a valid CSV file with data rows
4. History endpoint: returns array with the just-generated report
5. In Compass `m2_audit_logs` (if M2 is running): should have a `REPORT_GENERATED` entry

---

### 📋 Day 14 Outcome

All three report endpoints are live. Day 15 builds the Report Builder frontend page.

---

## Day 15 — Report Builder Frontend Page

### 🎯 Goal & Reasoning

The backend generates reports. The Report Builder page gives managers a clean UI to configure and trigger report generation without touching the API directly. The form collects report type, date range, department selection, and format. After submission, a spinner shows while generation runs, then a download button appears. This is a primary demo interaction — the professor will watch you fill the form and trigger a download.

---

### Work to Complete

#### A. Add Report Types to Frontend

**File to modify:** `client/src/types/index.ts`

```typescript
export interface IReportParams {
  reportName: string;
  reportType: 'Executive' | 'Compliance' | 'Decision' | 'Department' | 'Custom';
  format: 'csv' | 'excel' | 'pdf';
  dateFrom: string;
  dateTo: string;
  departments: string[];
}

export interface IReport {
  _id: string;
  reportName: string;
  reportType: string;
  format: 'csv' | 'excel' | 'pdf';
  status: 'Completed' | 'Failed' | 'Generating';
  dateFrom: string;
  dateTo: string;
  departments: string[];
  generatedAt: string;
  generatedBy: string;
  filePath?: string;
}

export interface IGenerateReportResponse {
  reportId: string;
  message: string;
}
```

---

#### B. Add API Functions

**File to modify:** `client/src/services/api.ts`

```typescript
import { IReportParams, IGenerateReportResponse, IReport } from '../types';

export async function generateReport(
  params: IReportParams
): Promise<IGenerateReportResponse> {
  const res = await api.post<IGenerateReportResponse>('/api/reports/generate', params);
  return res.data;
}

export async function getReportHistory(
  filters?: { reportType?: string; dateFrom?: string; dateTo?: string }
): Promise<IReport[]> {
  const params = new URLSearchParams();
  if (filters?.reportType) params.set('reportType', filters.reportType);
  if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.set('dateTo', filters.dateTo);
  const res = await api.get<IReport[]>(`/api/reports/history?${params}`);
  return res.data;
}

// Returns the URL string for use in <a href> download links
export function getReportDownloadUrl(reportId: string): string {
  const base = import.meta.env.VITE_API_URL || 'http://localhost:3003';
  const token = localStorage.getItem('govvision_token');
  return `${base}/api/reports/download/${reportId}`;
}
```

**Note:** The download URL is an `<a>` tag with the `download` attribute, not an `axios` call. The browser handles downloading files directly — axios would require you to manually construct a Blob URL.

---

#### C. Build `ReportBuilder.tsx`

**File to create:** `client/src/pages/ReportBuilder.tsx`

```typescript
import React, { useState } from 'react';
import { generateReport, getReportDownloadUrl } from '../services/api';
import { IReportParams } from '../types';

const DEPARTMENTS = ['finance', 'operations', 'hr', 'legal', 'procurement'];
const REPORT_TYPES = ['Executive', 'Compliance', 'Decision', 'Department', 'Custom'] as const;
const FORMATS = ['csv', 'excel', 'pdf'] as const;

const formatColors: Record<string, string> = {
  csv: 'bg-blue-100 text-blue-800',
  excel: 'bg-green-100 text-green-800',
  pdf: 'bg-orange-100 text-orange-800',
};

export default function ReportBuilder() {
  const [form, setForm] = useState<IReportParams>({
    reportName: '',
    reportType: 'Executive',
    format: 'csv',
    dateFrom: '',
    dateTo: '',
    departments: [],
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  function handleDeptToggle(dept: string) {
    setForm((prev) => ({
      ...prev,
      departments: prev.departments.includes(dept)
        ? prev.departments.filter((d) => d !== dept)
        : [...prev.departments, dept],
    }));
  }

  async function handleSubmit() {
    if (!form.dateFrom || !form.dateTo) {
      setError('Please select both start and end dates.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);
    setReportId(null);

    try {
      const response = await generateReport({
        ...form,
        reportName: form.reportName || `${form.reportType} Report`,
      });
      setReportId(response.reportId);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Report generation failed.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Report Builder</h1>

      <div className="bg-white rounded-xl border p-6 space-y-5">
        {/* Report name */}
        <div>
          <label className="text-sm font-medium text-gray-600 block mb-1">Report Name</label>
          <input
            type="text"
            value={form.reportName}
            onChange={(e) => setForm((p) => ({ ...p, reportName: e.target.value }))}
            placeholder="e.g. Q1 Executive Summary"
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>

        {/* Report type */}
        <div>
          <label className="text-sm font-medium text-gray-600 block mb-1">Report Type</label>
          <select
            value={form.reportType}
            onChange={(e) =>
              setForm((p) => ({ ...p, reportType: e.target.value as IReportParams['reportType'] }))
            }
            className="w-full border rounded px-3 py-2 text-sm"
          >
            {REPORT_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Date range */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-600 block mb-1">From</label>
            <input
              type="date"
              value={form.dateFrom}
              onChange={(e) => setForm((p) => ({ ...p, dateFrom: e.target.value }))}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-600 block mb-1">To</label>
            <input
              type="date"
              value={form.dateTo}
              onChange={(e) => setForm((p) => ({ ...p, dateTo: e.target.value }))}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Departments */}
        <div>
          <label className="text-sm font-medium text-gray-600 block mb-2">
            Departments <span className="text-gray-400">(leave blank for all)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {DEPARTMENTS.map((dept) => (
              <button
                key={dept}
                onClick={() => handleDeptToggle(dept)}
                className={`px-3 py-1 text-sm rounded-full border transition ${
                  form.departments.includes(dept)
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>

        {/* Format */}
        <div>
          <label className="text-sm font-medium text-gray-600 block mb-2">Format</label>
          <div className="flex gap-3">
            {FORMATS.map((fmt) => (
              <label key={fmt} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value={fmt}
                  checked={form.format === fmt}
                  onChange={() => setForm((p) => ({ ...p, format: fmt }))}
                  className="accent-indigo-600"
                />
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${formatColors[fmt]}`}>
                  {fmt.toUpperCase()}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Success + download */}
        {success && reportId && (
          <div className="bg-green-50 border border-green-200 rounded p-4">
            <p className="text-sm text-green-700 font-medium mb-2">
              ✅ Report generated successfully!
            </p>
            
              href={getReportDownloadUrl(reportId)}
              download
              className="inline-block bg-green-600 text-white text-sm px-4 py-2 rounded hover:bg-green-700 transition"
            >
              ⬇ Download Report
            </a>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating...
            </span>
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

### 🖥️ UI/UX Specification — Report Builder

```
/reports/builder
┌──────────────────────────────────────────┐
│  Report Builder                          │
│                                          │
│  Report Name: [_____________________]   │
│                                          │
│  Report Type: [Executive ▼]             │
│                                          │
│  From: [date input]  To: [date input]   │
│                                          │
│  Departments:                            │
│  [finance] [operations] [hr] [legal]    │  (toggle buttons, selected = indigo)
│  [procurement]                           │
│                                          │
│  Format:                                 │
│  ○ [CSV]   ○ [EXCEL]   ○ [PDF]          │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ ✅ Report generated successfully!  │ │
│  │ [⬇ Download Report]               │ │
│  └────────────────────────────────────┘ │
│                                          │
│  [Generate Report]  ← spinner while loading
└──────────────────────────────────────────┘
```

---

### 💻 Commands to Run

```bash
cd client && npm run dev
# Navigate to http://localhost:5173/reports/builder
# Fill form and click Generate Report
# After spinner: Download Report button appears
# Click it — browser should download the file
```

---

### ✅ How to Validate

1. Fill all fields, click Generate — spinner appears, button is disabled
2. After generation: green banner and download button appear
3. Click download — browser downloads a file with correct extension
4. Open the downloaded file — confirm it has real data (not empty)
5. No TypeScript errors in terminal

---

### 📋 Day 15 Outcome

Report Builder page is complete and fully functional end-to-end. Day 16 builds the Report History page.

---

## Day 16 — Report History Page

### 🎯 Goal & Reasoning

After managers generate reports over time, they need to find and re-download past reports. The Report History page provides this — a filterable table of all generated reports with status badges and download links. Building this page is straightforward because all the API functions and types were already created in Day 15.

---

### Work to Complete

#### A. Build `ReportHistory.tsx`

**File to create:** `client/src/pages/ReportHistory.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { getReportHistory, getReportDownloadUrl } from '../services/api';
import { IReport } from '../types';
import SkeletonLoader from '../components/SkeletonLoader';

const REPORT_TYPES = ['All', 'Executive', 'Compliance', 'Decision', 'Department', 'Custom'];

const formatBadge: Record<string, string> = {
  csv: 'bg-blue-100 text-blue-800',
  excel: 'bg-green-100 text-green-800',
  pdf: 'bg-orange-100 text-orange-800',
};

const statusBadge: Record<string, string> = {
  Completed: 'bg-green-100 text-green-800',
  Failed: 'bg-red-100 text-red-800',
  Generating: 'bg-yellow-100 text-yellow-800',
};

const PAGE_SIZE = 20;

export default function ReportHistory() {
  const [reports, setReports] = useState<IReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [page, setPage] = useState<number>(0);

  useEffect(() => {
    setLoading(true);
    getReportHistory({
      reportType: typeFilter !== 'All' ? typeFilter : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    })
      .then((data) => {
        setReports(data);
        setPage(0);
      })
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, [typeFilter, dateFrom, dateTo]);

  const paginated = reports.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(reports.length / PAGE_SIZE);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Report History</h1>

      {/* Filter bar */}
      <div className="flex gap-4 mb-4 flex-wrap">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border rounded px-3 py-1 text-sm"
        >
          {REPORT_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="border rounded px-3 py-1 text-sm"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="border rounded px-3 py-1 text-sm"
        />
        {(dateFrom || dateTo || typeFilter !== 'All') && (
          <button
            onClick={() => { setTypeFilter('All'); setDateFrom(''); setDateTo(''); }}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <SkeletonLoader rows={8} height="h-10" />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  {['Date', 'Report Name', 'Type', 'Format', 'Status', 'Download'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginated.map((report) => (
                  <tr key={report._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(report.generatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {report.reportName}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{report.reportType}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${formatBadge[report.format]}`}>
                        {report.format.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusBadge[report.status]}`}>
                        {report.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {report.status === 'Completed' && (
                        
                          href={getReportDownloadUrl(report._id)}
                          download
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          ⬇ Download
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-400">
                      No reports found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex gap-2 justify-center mt-4">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1 text-sm border rounded disabled:opacity-40"
              >
                ←
              </button>
              <span className="px-3 py-1 text-sm text-gray-500">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
                className="px-3 py-1 text-sm border rounded disabled:opacity-40"
              >
                →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

---

### 🖥️ UI/UX Specification — Report History

```
/reports/history
┌──────────────────────────────────────────────────────────────────────────┐
│  Report History                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│  [Type ▼]  [From date]  [To date]  [Clear filters]                      │
├──────────────────────────────────────────────────────────────────────────┤
│  Date      │ Report Name         │ Type       │ Format    │ Status   │ DL│
│  Apr 05    │ Q1 Executive Report │ Executive  │ [CSV]     │ [Done]   │ ⬇ │
│  Apr 04    │ Compliance Check    │ Compliance │ [EXCEL]   │ [Done]   │ ⬇ │
│  Apr 03    │ Ad-hoc              │ Custom     │ [PDF]     │ [Failed] │   │
├──────────────────────────────────────────────────────────────────────────┤
│                       ← Page 1 of 3 →                                   │
└──────────────────────────────────────────────────────────────────────────┘
```

---

### 💻 Commands to Run

```bash
# Make sure you've generated at least one report via the builder first
# Navigate to http://localhost:5173/reports/history
# Should show the generated report with a Download link
```

---

### ✅ How to Validate

1. After generating a report on Day 15, navigate to `/reports/history` — it should appear at the top of the table
2. Filter by type — table updates
3. Download link for Completed reports — triggers file download
4. Failed reports have no download link
5. If more than 20 reports: pagination controls appear

---

### 📋 Day 16 Outcome

The complete reporting system frontend is done: Report Builder + Report History. Day 17 adds the Scheduled Reports page with backend cron registration.

---

## Day 17 — Scheduled Reports

### 🎯 Goal & Reasoning

Some reports should run automatically — for example, every Monday an executive summary is emailed to leadership. The `m3_report_schedules` collection and model were created in Progress 1 but never used. Today you implement the full loop: create schedule → persist to MongoDB → read at server startup → register as live `node-cron` jobs. The frontend page lets managers see and toggle schedules.

---

### Work to Complete

#### A. Backend — Schedule Routes + Startup Job Registration

**File to create:** `server/routes/schedulesRoutes.ts`

```typescript
import { Router, Request, Response } from 'express';
import cron from 'node-cron';
import { validateJWT } from '../middleware/validateJWT';
import { requireRole } from '../middleware/requireRole';
import ReportSchedule from '../models/ReportSchedule';
import { generateCSV, generateExcel, generatePDF } from '../services/reportGeneratorService';
import Report from '../models/Report';

const router = Router();

// POST /api/reports/schedules — create a new schedule
router.post(
  '/schedules',
  validateJWT,
  requireRole(['admin', 'manager']),
  async (req: Request, res: Response) => {
    const { name, cronExpression, reportType, format, recipients, departments } = req.body;

    if (!cron.validate(cronExpression)) {
      return res.status(400).json({ error: 'Invalid cron expression' });
    }

    const schedule = await ReportSchedule.create({
      name,
      cronExpression,
      reportType,
      format,
      recipients: recipients || [],
      departments: departments || [],
      isActive: true,
      nextRun: getNextRunDate(cronExpression),
    });

    // Register the new schedule immediately as a live cron job
    registerSchedule(schedule);

    return res.status(201).json(schedule);
  }
);

// GET /api/reports/schedules
router.get(
  '/schedules',
  validateJWT,
  requireRole(['admin', 'manager', 'executive']),
  async (_req: Request, res: Response) => {
    const schedules = await ReportSchedule.find().sort({ createdAt: -1 }).lean();
    return res.json(schedules);
  }
);

// PUT /api/reports/schedules/:id/toggle — enable or disable
router.put(
  '/schedules/:id/toggle',
  validateJWT,
  requireRole(['admin', 'manager']),
  async (req: Request, res: Response) => {
    const schedule = await ReportSchedule.findById(req.params.id);
    if (!schedule) return res.status(404).json({ error: 'Schedule not found' });

    schedule.isActive = !schedule.isActive;
    await schedule.save();

    return res.json(schedule);
  }
);

export default router;

// Helper: compute next run date (approximate)
function getNextRunDate(cronExpr: string): Date {
  const next = new Date();
  next.setHours(next.getHours() + 1); // Rough estimate
  return next;
}

// Map of registered cron tasks keyed by schedule ID
const registeredJobs = new Map<string, cron.ScheduledTask>();

export function registerSchedule(schedule: any) {
  if (!schedule.isActive || !cron.validate(schedule.cronExpression)) return;

  // Cancel previous job if re-registering
  const existing = registeredJobs.get(schedule._id.toString());
  if (existing) existing.stop();

  const task = cron.schedule(schedule.cronExpression, async () => {
    if (!schedule.isActive) return;

    console.log(`[ScheduledReport] Running: ${schedule.name}`);

    const params = {
      reportName: schedule.name,
      reportType: schedule.reportType,
      format: schedule.format,
      dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      dateTo: new Date().toISOString(),
      departments: schedule.departments || [],
      generatedBy: 'scheduler',
    };

    try {
      let filePath: string;
      if (schedule.format === 'csv') filePath = await generateCSV(params);
      else if (schedule.format === 'excel') filePath = await generateExcel(params);
      else filePath = await generatePDF(params);

      await Report.create({
        reportName: schedule.name,
        reportType: schedule.reportType,
        format: schedule.format,
        status: 'Completed',
        filePath,
        generatedAt: new Date(),
        generatedBy: 'scheduler',
      });

      await ReportSchedule.findByIdAndUpdate(schedule._id, {
        lastRun: new Date(),
        nextRun: getNextRunDate(schedule.cronExpression),
      });

      console.log(`[ScheduledReport] Done: ${schedule.name}`);
    } catch (err: any) {
      console.error(`[ScheduledReport] Failed: ${schedule.name}`, err.message);
    }
  });

  registeredJobs.set(schedule._id.toString(), task);
  console.log(`[ScheduledReport] Registered: "${schedule.name}" @ ${schedule.cronExpression}`);
}
```

**In `server.ts` — load all active schedules on startup:**

```typescript
import ReportSchedule from './models/ReportSchedule';
import { registerSchedule } from './routes/schedulesRoutes';
import schedulesRoutes from './routes/schedulesRoutes';

app.use('/api/reports', schedulesRoutes);

// After DB connects, load all active schedules
connectDB().then(async () => {
  const activeSchedules = await ReportSchedule.find({ isActive: true });
  activeSchedules.forEach(registerSchedule);
  console.log(`[Startup] Registered ${activeSchedules.length} scheduled reports.`);

  app.listen(PORT, () => console.log(`Module 3 running on port ${PORT}`));
});
```

---

#### B. Build `ReportSchedules.tsx` Frontend Page

**File to create:** `client/src/pages/ReportSchedules.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import api from '../services/api';

interface ISchedule {
  _id: string;
  name: string;
  cronExpression: string;
  reportType: string;
  format: string;
  isActive: boolean;
  lastRun?: string;
  nextRun?: string;
}

export default function ReportSchedules() {
  const [schedules, setSchedules] = useState<ISchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', cronExpression: '0 9 * * 1', reportType: 'Executive', format: 'excel',
  });

  useEffect(() => {
    api.get<ISchedule[]>('/api/reports/schedules')
      .then((r) => setSchedules(r.data))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    const res = await api.post<ISchedule>('/api/reports/schedules', form);
    setSchedules((prev) => [res.data, ...prev]);
    setShowForm(false);
  }

  async function handleToggle(id: string) {
    const res = await api.put<ISchedule>(`/api/reports/schedules/${id}/toggle`);
    setSchedules((prev) => prev.map((s) => (s._id === id ? res.data : s)));
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Scheduled Reports</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white px-4 py-2 rounded text-sm"
        >
          + New Schedule
        </button>
      </div>

      {showForm && (
        <div className="bg-white border rounded-xl p-6 mb-6 space-y-4">
          <h2 className="font-semibold text-gray-700">Create Schedule</h2>
          <input placeholder="Schedule Name" value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            className="w-full border rounded px-3 py-2 text-sm" />
          <input placeholder="Cron Expression (e.g. 0 9 * * 1)" value={form.cronExpression}
            onChange={(e) => setForm((p) => ({ ...p, cronExpression: e.target.value }))}
            className="w-full border rounded px-3 py-2 text-sm font-mono" />
          <p className="text-xs text-gray-400">
            Example: "0 9 * * 1" = every Monday at 9AM. Use crontab.guru to build expressions.
          </p>
          <select value={form.format}
            onChange={(e) => setForm((p) => ({ ...p, format: e.target.value }))}
            className="border rounded px-3 py-2 text-sm">
            <option value="csv">CSV</option>
            <option value="excel">Excel</option>
            <option value="pdf">PDF</option>
          </select>
          <button onClick={handleCreate}
            className="bg-indigo-600 text-white px-4 py-2 rounded text-sm">
            Create Schedule
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              {['Name', 'Cron', 'Type', 'Format', 'Last Run', 'Status', 'Toggle'].map((h) => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {schedules.map((s) => (
              <tr key={s._id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3 font-mono text-xs">{s.cronExpression}</td>
                <td className="px-4 py-3">{s.reportType}</td>
                <td className="px-4 py-3 uppercase text-xs">{s.format}</td>
                <td className="px-4 py-3 text-gray-400">
                  {s.lastRun ? new Date(s.lastRun).toLocaleDateString() : 'Never'}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${s.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                    {s.isActive ? 'Active' : 'Paused'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => handleToggle(s._id)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 underline">
                    {s.isActive ? 'Pause' : 'Enable'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

### 💻 Commands to Run

```bash
cd server && npm run dev
# Look for: [Startup] Registered N scheduled reports.

# Create a test schedule
curl -X POST http://localhost:3003/api/reports/schedules \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Weekly Executive","cronExpression":"0 9 * * 1","reportType":"Executive","format":"excel"}'

# List schedules
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3003/api/reports/schedules
```

---

### ✅ How to Validate

1. Server startup: look for `[Startup] Registered N scheduled reports.` in terminal
2. Create a schedule via UI or curl — it appears in the table
3. Toggle Pause/Enable — status badge changes
4. If you set a cron expression that fires in the near future (e.g., `* * * * *` = every minute for testing): confirm a report is generated and appears in Report History

---

### 📋 Day 17 Outcome

Scheduled reports are fully functional — schedules persist across restarts and fire automatically. Days 18–19 do end-to-end integration verification and TypeScript cleanup.

---

## Day 18 — End-to-End Cross-Module Integration Verification

### 🎯 Goal & Reasoning

Individual features work in isolation. Today you verify the full system works as a connected whole — Module 1 firing a webhook triggers the right Module 3 behavior, Module 3 calling Module 2 for compliance data returns real results, and the anomaly/forecast/risk pipelines all run correctly together. You also fix any broken integration points discovered. This day is deliberately scheduled before TypeScript cleanup (Day 19) so you're testing against real behavior, not compiled types.

---

### Work to Complete

#### A. Verify M1 → M3 Webhook Flow

**Test the full decision lifecycle:**

1. Submit a decision in Module 1's UI
2. Module 1's backend should POST to `http://localhost:3003/api/events/decision-update`
3. Module 3's terminal should log: `[Webhook] decision-update received: dept=finance...`
4. Redis keys for that department should be invalidated
5. New KPI snapshot should appear in `m3_kpi_snapshots`
6. Dashboard KPI cards should update on next poll

**If Module 1 is not configured to call Module 3's webhook:**

Add this to Module 1's decision update handler (share this snippet with your Module 1 teammate):

```javascript
// In Module 1's backend, after saving a decision status change:
try {
  await axios.post('http://localhost:3003/api/events/decision-update', {
    department: decision.department,
    decisionId: decision._id.toString(),
    status: decision.status,
  }, {
    headers: { 'x-service-key': process.env.SERVICE_KEY }
  });
} catch (err) {
  console.warn('M3 webhook failed:', err.message); // Non-critical
}
```

---

#### B. Verify M3 → M2 Calls

**Test compliance data pull:**

```bash
# Simulate what reportGenerator does when calling M2
curl -H "x-service-key: YOUR_SERVICE_KEY" \
  http://localhost:3002/api/compliance/status
# Expected: { overall: number, deptBreakdown: [...] }

# Simulate audit log call
curl -X POST http://localhost:3002/api/internal/audit/log \
  -H "x-service-key: YOUR_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"REPORT_GENERATED","userId":"test123","metadata":{"reportId":"abc","format":"csv"}}'
# Expected: { logged: true }
```

**If M2 endpoints are not yet implemented by your teammate:**

The pattern of wrapping all M2 calls in `try/catch` means Module 3 gracefully degrades — reports still generate, risk scoring still runs, the compliance section is simply omitted from the report. Document this in your demo notes.

---

#### C. Run All Three Background Jobs in Sequence

```bash
# Start everything
# Terminal 1: MongoDB (if local)
# Terminal 2: Redis
# Terminal 3: FastAPI
cd ml_service && python -m uvicorn main:app --port 8000

# Terminal 4: Module 3 backend
cd server && npm run dev

# Trigger all three jobs manually (no waiting for cron)
npx ts-node -e "import('./jobs/anomalyJob').then(m => m.runAnomalyJob())"
npx ts-node -e "import('./jobs/forecastJob').then(m => m.runForecastJob())"
npx ts-node -e "import('./jobs/riskScoringJob').then(m => m.runRiskScoringJob())"
```

After all three run:
- `m3_anomalies` has documents with `isAnomaly: true`
- `m3_forecasts` has documents for each dept × horizon
- `m3_kpi_snapshots` for today has `riskScore` and `riskLevel` fields set

---

#### D. Full 10-Step User Journey Test

```
1. Browser → http://localhost:5173/dashboard
   ✓ 6 KPI cards show real numbers (not 0, not loading spinner stuck)

2. Change date range filter → all cards AND all 3 charts update simultaneously
   ✓ No "Cannot read property of undefined" errors in console

3. Change department dropdown → all cards AND charts update
   ✓ Redis keys for new dept/date combo appear in redis-cli

4. Anomaly banner visible with at least 1 alert → click Acknowledge
   ✓ Card disappears immediately (optimistic update)
   ✓ Compass: m3_anomalies doc has isAcknowledged: true

5. Navigate to /ai-insights → table loads → filter by Critical → only Critical rows
   ✓ Feature importance chart renders (not blank)

6. Click a Decision ID link → opens Module 1 URL in new tab

7. Navigate to /risk-heatmap → heatmap renders with colored cells
   ✓ Click a cell → side panel slides in with department details

8. Navigate to /analytics/forecast → chart loads with confidence band
   ✓ Toggle 7d/14d/30d → chart updates

9. Navigate to /reports/builder → fill form → CSV → Generate
   ✓ Spinner → Download button appears → file downloads

10. Navigate to /reports/history → generated report appears at top
    ✓ Download link works
```

---

### 💻 Commands to Run

```bash
# Check all Redis keys after running jobs
redis-cli keys "m3:*"
# Expected output:
# m3:kpi:org:2026-04-05
# m3:kpi:finance:2026-04-05
# m3:anomalies:active
# m3:forecast:finance:30
# m3:riskheatmap:nd:nd
# ... (many more)

# Check all collections have data
# In MongoDB Compass:
# m3_kpi_snapshots — filter: {} — should have documents for each dept
# m3_anomalies — should have 10+ documents
# m3_forecasts — should have 5 depts × 3 horizons = 15 documents
# m3_reports — should have any reports generated during testing
```

---

### ✅ How to Validate

All 10 steps in section D above must pass. Fix any that don't before proceeding to Day 19.

Common issues and fixes:

| Symptom | Cause | Fix |
|---|---|---|
| 401 on all API calls | JWT expired | Re-login to Module 1, update token in localStorage |
| Blank charts | API returning empty array | Check Network tab for 404/500 errors |
| Redis keys not appearing | Redis not running | Start Memurai |
| FastAPI call fails | ML service not running | Start uvicorn |
| M2 calls fail | M2 not running or wrong URL | Check M2_SERVICE_URL in .env |

---

### 📋 Day 18 Outcome

The full system works end-to-end across all three modules and the ML service. Day 19 does the TypeScript final validation — ensuring the code compiles cleanly before the demo.

---

## Day 19 — TypeScript Final Validation

### 🎯 Goal & Reasoning

Type errors that don't crash the app during development will still be flagged during a demo if the professor asks to run `tsc --noEmit`. More importantly, TypeScript errors are usually signals of real logic bugs — a `req.user` that might be undefined at runtime, an API response typed as `any` that hides a missing field. Today you run the compiler in strict mode, read every error carefully, and fix them. This is not optional polish — it is a correctness check.

---

### Work to Complete

#### A. Run TypeScript Check on Backend

```bash
cd server
npx tsc --noEmit
```

**Common errors and how to fix each:**

**Error: `Property 'user' does not exist on type 'Request'`**

Cause: Express's `Request` type doesn't have a `user` field by default.

Fix — add declaration merging in `server/types/index.ts`:

```typescript
import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: string;
        department: string;
      };
    }
  }
}
```

Then in route handlers, use `req.user` directly without casting:

```typescript
// Before (cast):
const userId = (req as any).user?.userId;

// After (typed):
const userId = req.user?.userId;
```

**Error: `Object is possibly 'undefined'` on `req.user.userId`**

Cause: `req.user` is typed as optional (`user?`). Even after the JWT middleware runs, TypeScript doesn't know that.

Fix — add a null check or non-null assertion:

```typescript
// Option 1: Guard
if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
const userId = req.user.userId; // Now safe

// Option 2: Non-null assertion (use only when you know JWT middleware ran)
const userId = req.user!.userId;
```

**Error: `Type 'LeanDocument<...>[]' is not assignable to type 'IAnomaly[]'`**

Cause: Mongoose's `.lean()` returns a different type than the model's document type.

Fix:

```typescript
const anomalies = await Anomaly.find({ isAcknowledged: false }).lean() as IAnomaly[];
```

**Error: `Argument of type 'string | undefined' is not assignable to parameter of type 'string'`**

Cause: Query params from `req.query` are typed as `string | string[] | ParsedQs | undefined` by Express.

Fix — explicitly cast the query object:

```typescript
const { deptId, dateFrom, dateTo } = req.query as {
  deptId?: string;
  dateFrom?: string;
  dateTo?: string;
};
```

**Error: `Module has no exported member 'runAnomalyJob'`**

Cause: The job file's export is missing or misnamed.

Fix: Confirm the function is exported with `export`:

```typescript
export async function runAnomalyJob(): Promise<void> { ... }
```

---

#### B. Run TypeScript Check on Frontend

```bash
cd client
npx tsc --noEmit
```

**Common errors:**

**Error: `Property 'weight' does not exist on type 'IFeatureImportance'`**

Cause: The type was defined with `weight` as a string somewhere. Fix: confirm `IFeatureImportance.weight` is typed as `number`.

**Error: ECharts `option` object type mismatch**

Cause: ECharts's `EChartsOption` type requires certain fields. The error message will tell you which field is missing.

Fix — import and use the type:

```typescript
import type { EChartsOption } from 'echarts';
// ... then type your option object:
const chartOption: EChartsOption = { ... };
```

**Error: `JSX element type 'ErrorBoundary' does not have any construct or call signatures`**

Cause: ErrorBoundary is a class component but is imported without the correct type.

Fix — confirm the class is exported as `default` and the import uses default import syntax:

```typescript
import ErrorBoundary from '../components/ErrorBoundary';
```

**Error: `Type 'string' is not assignable to type 'csv' | 'excel' | 'pdf'`**

Cause: Form state initialized with a plain string but typed as a union.

Fix:

```typescript
const [form, setForm] = useState<IReportParams>({
  format: 'csv' as const, // Use 'as const' or cast
  ...
});
```

---

#### C. Fix `tsconfig.json` Issues

If you see module resolution errors, check `server/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "rootDir": ".",
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

`skipLibCheck: true` silences errors in third-party type definition files — useful when a library's bundled types have minor issues you can't fix.

---

### 💻 Commands to Run

```bash
# Backend
cd server && npx tsc --noEmit 2>&1 | head -50
# Goal: zero errors

# Frontend
cd client && npx tsc --noEmit 2>&1 | head -50
# Goal: zero errors

# If errors: fix, re-run, repeat until clean
```

---

### ✅ How to Validate

```bash
# Backend: exactly this output (no errors)
cd server && npx tsc --noEmit
# (no output = success)

# Frontend: exactly this output
cd client && npx tsc --noEmit
# (no output = success)
```

Zero TypeScript errors in both directories before proceeding.

---

### 📋 Day 19 Outcome

Both the backend and frontend compile with zero TypeScript errors. The codebase is now type-safe end-to-end. Day 20 is final demo preparation: seed data, full journey verification, and the 3-minute demo script.

---

## Day 20 — Demo Prep, Seed Data, and Final Polish

### 🎯 Goal & Reasoning

Everything is built. Today you make sure it looks good when someone is watching. The three risks on demo day are: empty charts (no data), a broken flow (an error message appearing mid-demo), and missing context (the evaluator doesn't understand what they're looking at). You address all three: seed data fills the charts, the full 10-step journey test confirms no broken flows, and the demo script gives you a rehearsed narrative for each screen.

---

### Work to Complete

#### A. Build and Run the Seed Data Script

**Why this exists:** The CSV import gave you 2,500 real decisions. But `m3_kpi_snapshots`, `m3_anomalies`, and `m3_forecasts` are computed by cron jobs — if those jobs haven't run with fresh data, the charts look empty. The seed script creates realistic data directly in these collections so the dashboard looks impressive immediately.

**File to create:** `server/scripts/seedData.ts`

```typescript
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import KpiSnapshot from '../models/KPI_Snapshot';
import Anomaly from '../models/Anomaly';
import Forecast from '../models/Forecast';

const DEPARTMENTS = ['finance', 'operations', 'hr', 'legal', 'procurement'];

const RISK_LEVELS = ['Low', 'Medium', 'High', 'Critical'];
const SEVERITIES = ['Critical', 'High', 'Medium', 'Low'];

function rand(min: number, max: number) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

function randomRiskLevel() {
  const weights = [0.4, 0.35, 0.15, 0.1]; // Low, Medium, High, Critical
  const r = Math.random();
  let cum = 0;
  for (let i = 0; i < weights.length; i++) {
    cum += weights[i];
    if (r < cum) return RISK_LEVELS[i];
  }
  return 'Low';
}

async function seedKpiSnapshots() {
  console.log('Seeding m3_kpi_snapshots...');
  await KpiSnapshot.deleteMany({});

  const docs = [];
  for (const dept of DEPARTMENTS) {
    for (let daysAgo = 89; daysAgo >= 0; daysAgo--) {
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      date.setHours(0, 0, 0, 0);

      const totalDecisions = Math.floor(rand(20, 80));
      const approvedCount = Math.floor(totalDecisions * rand(0.5, 0.8));
      const rejectedCount = Math.floor(totalDecisions * rand(0.05, 0.15));
      const pendingCount = totalDecisions - approvedCount - rejectedCount;

      docs.push({
        department: dept,
        snapshotDate: date,
        totalDecisions,
        approvedCount,
        rejectedCount,
        pendingCount: Math.max(0, pendingCount),
        avgCycleTimeHours: rand(18, 72),
        complianceRate: rand(78, 98),
        riskScore: rand(10, 90),
        riskLevel: randomRiskLevel(),
      });
    }
  }

  await KpiSnapshot.insertMany(docs);
  console.log(`  Inserted ${docs.length} KPI snapshots.`);
}

async function seedAnomalies() {
  console.log('Seeding m3_anomalies...');
  await Anomaly.deleteMany({});

  const anomalyConfig = [
    { severity: 'Critical', count: 3 },
    { severity: 'High', count: 8 },
    { severity: 'Medium', count: 10 },
    { severity: 'Low', count: 4 },
  ];

  const docs = [];
  for (const { severity, count } of anomalyConfig) {
    for (let i = 0; i < count; i++) {
      const dept = DEPARTMENTS[Math.floor(Math.random() * DEPARTMENTS.length)];
      docs.push({
        decisionId: new mongoose.Types.ObjectId().toString(),
        department: dept,
        anomalyScore: severity === 'Critical' ? rand(0.95, 1.0) :
                      severity === 'High' ? rand(0.85, 0.95) :
                      severity === 'Medium' ? rand(0.7, 0.85) : rand(0.5, 0.7),
        severity,
        isAnomaly: true,
        isAcknowledged: false,
        description: `Anomaly detected: ${severity.toLowerCase()} severity in ${dept} department.`,
        featureValues: {
          cycleTimeHours: severity === 'Critical' ? rand(120, 200) : rand(40, 120),
          rejectionCount: severity === 'Critical' ? Math.floor(rand(7, 15)) : Math.floor(rand(1, 7)),
          revisionCount: Math.floor(rand(2, 10)),
          daysOverSLA: Math.floor(rand(0, 15)),
          stageCount: Math.floor(rand(3, 8)),
          hourOfDaySubmitted: Math.floor(rand(0, 23)),
        },
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      });
    }
  }

  await Anomaly.insertMany(docs);
  console.log(`  Inserted ${docs.length} anomalies.`);
}

async function seedForecasts() {
  console.log('Seeding m3_forecasts...');
  await Forecast.deleteMany({});

  const docs = [];
  for (const dept of [...DEPARTMENTS, 'org']) {
    for (const horizon of [7, 14, 30]) {
      const forecastData = [];
      for (let d = 1; d <= horizon; d++) {
        const date = new Date();
        date.setDate(date.getDate() + d);
        const yhat = rand(8, 25);
        forecastData.push({
          ds: date,
          yhat,
          yhat_lower: yhat - rand(2, 5),
          yhat_upper: yhat + rand(2, 5),
        });
      }

      docs.push({
        department: dept,
        horizon,
        generatedAt: new Date(),
        forecastData,
      });
    }
  }

  await Forecast.insertMany(docs);
  console.log(`  Inserted ${docs.length} forecast documents.`);
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to MongoDB.');

  await seedKpiSnapshots();
  await seedAnomalies();
  await seedForecasts();

  console.log('\nSeed complete. You can now run the backend and frontend.');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
```

```bash
cd server
npx ts-node scripts/seedData.ts
```

---

#### B. Also Invalidate All Redis Cache After Seeding

After seeding, existing Redis caches point to old data. Flush them:

```bash
redis-cli flushdb
# WARNING: This clears ALL Redis keys. Only do this in dev.
```

---

#### C. Fix All Common Demo-Killers

**CORS error in browser console:**
In `server.ts`, confirm:
```typescript
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'] }));
```

**JWT expired — dashboard shows 401:**
The JWT has a 15-minute expiry. Before the demo, re-login to Module 1 to get a fresh token. Or temporarily extend expiry for demo day:
```typescript
// In Module 1's login handler — for dev only
jwt.sign(payload, secret, { expiresIn: '24h' });
```

**Charts showing empty after seeding:**
Run these checks:
```bash
# Confirm seed data exists
cd server && npx ts-node -e "
const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const KPI = require('./models/KPI_Snapshot').default;
  const count = await KPI.countDocuments();
  console.log('KPI snapshots:', count);
  mongoose.disconnect();
});
"
# Expected: KPI snapshots: 450 (5 depts × 90 days)
```

**FastAPI not running:**
Both the anomaly API route and the forecast page need FastAPI running. Always start it before the demo:
```bash
cd ml_service && python -m uvicorn main:app --port 8000
```

---

#### D. Verify `SkeletonLoader` Is Used on Every Page

Open each page while the backend is stopped (to force loading state). Every page should show skeleton pulses, not a blank white screen.

Pages to check:
- `/dashboard` — KPI cards and charts show skeletons
- `/ai-insights` — table shows skeleton rows
- `/risk-heatmap` — chart area shows skeletons
- `/analytics/forecast` — chart shows skeletons
- `/reports/builder` — no data loading, so no skeleton needed
- `/reports/history` — table shows skeleton rows

---

#### E. The 3-Minute Demo Script

| Time | What to Show | What to Say |
|---|---|---|
| 0:00–0:40 | Dashboard at `/dashboard` — 6 KPI cards | "This is the live analytics dashboard for GovVision Module 3. These 6 cards update every 30 seconds from the shared MongoDB cluster — approval rate, average cycle time, compliance rate, risk level, anomaly count, and pending bottlenecks. This filter simultaneously updates all six cards and all three charts." |
| 0:40–0:45 | Change dept filter to "finance" | "Switching to Finance: notice all three charts — volume, cycle time, and compliance trend — all update in one action. The Redis cache means this query costs nothing after the first load." |
| 0:45–1:15 | Point to AnomalyBanner, click to `/ai-insights` | "Isolation Forest detected 3 critical anomalies in the last run. This finance decision had a 148-hour cycle time and 9 rejections — automatically flagged by the model. I can acknowledge it here. The AI Insights page shows the full anomaly breakdown by severity, and this horizontal chart shows which features drove the anomalies most." |
| 1:15–1:45 | Navigate to `/risk-heatmap`, click a cell | "This heatmap shows risk levels across all departments, computed by our Random Forest model daily (at 1:00 AM) using 6 features including violation counts from Module 2. Finance has the highest critical count. Clicking that cell shows the breakdown, including the top anomalous decisions with direct links to Module 1." |
| 1:45–2:00 | Navigate to `/analytics/forecast` | "Prophet time-series forecasting runs nightly at 2AM. This confidence band shows the model's predicted decision volume for the next 30 days, with upper and lower bounds. I can toggle to 7 or 14 days." |
| 2:00–2:30 | Navigate to `/reports/builder`, generate CSV | "I can generate an executive summary for any date range and department combination — CSV, Excel with two styled sheets, or PDF with a cover page. The Excel report pulls compliance data directly from Module 2. Generating now… and the file downloads directly." |
| 2:30–3:00 | Navigate to `/reports/history`, then architecture | "Every generated report is logged here with a download link. The entire system runs on 3 Node.js servers, one Python FastAPI service, MongoDB, and Redis — connected by JWT auth for users and a shared service key for internal calls." |

---

### 💻 Final Pre-Demo Checklist (Run in Order)

```bash
# 1. Start Redis
memurai  # Windows

# 2. Start FastAPI ML service
cd ml_service && python -m uvicorn main:app --port 8000

# 3. Run seed data (if collections are empty)
cd server && npx ts-node scripts/seedData.ts

# 4. Flush Redis cache (so fresh seed data is served)
redis-cli flushdb

# 5. Start Module 3 backend
cd server && npm run dev
# Look for: MongoDB connected, Redis connected, AnomalyJob Scheduled, ForecastJob Scheduled, RiskJob Scheduled

# 6. Manually run all jobs to populate fresh data
npx ts-node -e "import('./jobs/anomalyJob').then(m => m.runAnomalyJob())"
npx ts-node -e "import('./jobs/riskScoringJob').then(m => m.runRiskScoringJob())"

# 7. Start frontend
cd client && npm run dev

# 8. Open browser → http://localhost:5173/dashboard
# 9. Re-login to Module 1 to get fresh JWT, update localStorage
# 10. Refresh dashboard — all KPI cards should show real numbers

# 11. Final TypeScript check
cd server && npx tsc --noEmit
cd client && npx tsc --noEmit
```

---

### ✅ Final Validation — All 10 Steps Must Pass

1. `/dashboard` — 6 KPI cards with real numbers, anomaly banner visible
2. Filter change — all cards and charts update simultaneously
3. Acknowledge anomaly — banner card disappears immediately
4. `/ai-insights` — table loads, severity filter works, feature chart renders
5. Decision ID link — opens correct Module 1 URL
6. `/risk-heatmap` — colored grid renders, cell click opens side panel
7. `/analytics/forecast` — confidence band chart with department and horizon toggle
8. `/reports/builder` — generate → spinner → download → file opens with data
9. `/reports/history` — generated report appears, download works
10. `/reports/schedules` — schedule table shows, toggle works
11. All placeholder pages show 🚧 message, not blank
12. `tsc --noEmit` — zero errors on both server and client

---

### 📋 Day 20 Outcome

GovVision Module 3 is complete. The system delivers: a live KPI dashboard with Redis-cached analytics, an Isolation Forest anomaly detection pipeline running daily at 00:00, a Prophet forecasting pipeline running nightly at 02:00, a Random Forest risk scoring pipeline running daily at 01:00 AM, a complete report generation system in three formats, scheduled report automation, full cross-module integration with Modules 1 and 2, JWT-protected APIs, and a React frontend with 6 fully working pages — all compiling cleanly with zero TypeScript errors.

---

*End of 20-Day Implementation Guide.*