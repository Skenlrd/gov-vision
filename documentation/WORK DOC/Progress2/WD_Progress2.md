# WD Progress2 - Day 1 (Anomaly Cron Pipeline End-to-End)

Date: 2026-04-06
Scope: Module 3 backend Day 1 implementation for scheduled anomaly detection and AI anomaly APIs.

## 1) Goal Completed

This day completed the anomaly data pipeline so anomaly records are refreshed on schedule and can be read/acknowledged through real API endpoints.

Implemented outcomes:
- Anomaly job now schedules every 24 hours with node-cron.
- Anomaly detection pipeline now runs with full 7-step flow:
  - query last 30 days completed decisions
  - map ML payload
  - call FastAPI anomaly endpoint
  - filter anomalies only
  - upsert into m3_anomalies
  - preserve acknowledgment state on re-runs
  - cache invalidation call is implemented in code (runtime cache currently disabled in dev)
- GET /api/ai/anomalies implemented with JWT + role guard.
- PUT /api/ai/anomalies/:id/acknowledge implemented with JWT + role guard.
- server bootstrap updated so cron registration is guaranteed at startup.

## 2) Files Changed

1. server/jobs/anomalyJob.ts
- Added node-cron schedule: 0 0 * * *
- Added axios ML call to /ml/anomaly/predict with x-service-key
- Added complete anomaly filtering and upsert loop
- Added featureValues persistence for AI Insights usage
- Added cache invalidation: m3:anomalies:active
- Added logs for each run phase
- Added exported runAnomalyJob wrapper for manual trigger convenience

2. server/routes/aiRoutes.ts
- Implemented GET /anomalies:
  - validateJWT
  - requireRole([admin, manager, executive, analyst])
  - getOrSet cache key m3:anomalies:active, TTL 300
  - Mongo query for unacknowledged anomalies, sorted by anomalyScore desc
  - grouped response: Critical, High, Medium, Low, total
- Implemented PUT /anomalies/:id/acknowledge:
  - validateJWT
  - requireRole([admin, manager, executive])
  - sets isAcknowledged=true, acknowledgedBy, acknowledgedAt
  - 404 for missing anomaly
  - invalidates m3:anomalies:active

3. server/server.ts
- Removed one-time startup run call (previous behavior)
- Added side-effect import of ./jobs/anomalyJob so cron schedule is always registered

4. server/models/m1Decisions.ts
- Added explicit optional schema fields used by anomaly feature mapping:
  - hourOfDaySubmitted
  - departmentName

## 3) Package Installation Status

No new package installation required for Day 1.
Already present in server package:
- node-cron
- axios
- ioredis

## 4) Commands Used During Implementation

## A) Development / compile check
```bash
cd server
npm run typecheck
```

Expected result:
- TypeScript noEmit passes with no errors.

## B) Start backend
```bash
cd server
npm run dev
```

Expected startup logs include:
- [AnomalyJob] Scheduled: every 24 hours (daily at 00:00).

## C) Manually trigger anomaly job (do not wait 24 hours)
```bash
cd server
npm run run:anomaly-job
```

Expected logs:
- [AnomalyJob] Starting anomaly detection run...
- [AnomalyJob] Loaded X decisions for scoring.
- [AnomalyJob] FastAPI returned X scores.
- [AnomalyJob] Y anomalies detected.
- [AnomalyJob] Redis cache invalidated. Run complete.

## D) Check Redis keys
```bash
redis-cli keys "m3:anomalies:*"
```

Current dev note:
- Redis is intentionally disabled for Module 3 validation in this phase.
- Skip Redis key checks while Redis is off.

## 5) API Contracts Implemented

## GET /api/ai/anomalies
- Auth: validateJWT + requireRole([admin, manager, executive, analyst])
- Cache helper call exists in code; with Redis disabled it falls back to direct DB reads.
- Query: Anomaly.find({ isAcknowledged: false }).sort({ anomalyScore: -1 })
- Response shape:
```json
{
  "Critical": [],
  "High": [],
  "Medium": [],
  "Low": [],
  "total": 0
}
```

## PUT /api/ai/anomalies/:id/acknowledge
- Auth: validateJWT + requireRole([admin, manager, executive])
- Update fields:
  - isAcknowledged: true
  - acknowledgedBy: req.user.userId
  - acknowledgedAt: new Date()
- Invalidation: invalidate("m3:anomalies:active")
- In dev with Redis disabled, invalidation call is a no-op and does not break endpoint behavior.

## 6) Manual Validation Steps (Step-by-Step)

Pre-requisites:
- MongoDB running
- Redis disabled for current Module 3 dev validation
- ML FastAPI service running and reachable at ML_SERVICE_URL
- Valid JWT token from Module 1 login

## Step 1: Start services
```bash
# Terminal 1
cd ml_service
python -m uvicorn main:app --port 8000 --reload

# Terminal 2
cd server
npm run dev
```

Check backend startup log contains:
- [AnomalyJob] Scheduled: every 24 hours (daily at 00:00).

## Step 2: Manually trigger anomaly run
```bash
cd server
npm run run:anomaly-job
```

Confirm run logs appear and no uncaught exception is printed.

## Step 3: Verify anomaly records in MongoDB Compass
- Open collection: m3_anomalies
- Confirm records include:
  - decisionId
  - anomalyScore
  - severity
  - isAcknowledged
  - featureValues
  - description

## Step 4: Test GET anomalies endpoint
```bash
curl -H "Authorization: Bearer TOKEN" http://localhost:5002/api/ai/anomalies
```

Expected:
- grouped object with keys Critical, High, Medium, Low, total

## Step 5: Test acknowledge endpoint
1. Pick anomaly _id from DB or GET response list
2. Execute:
```bash
curl -X PUT -H "Authorization: Bearer TOKEN" http://localhost:5002/api/ai/anomalies/ANOMALY_ID/acknowledge
```

Expected:
- response document contains:
  - isAcknowledged: true
  - acknowledgedAt populated

## Step 6: Verify cache lifecycle
Redis is currently disabled in development for Module 3.

Expected:
- API responses continue to work without Redis.
- Server does not crash when AI endpoints are called.
- Redis key lifecycle checks are skipped in this phase.

## Step 7: Verify authorization behavior
```bash
# no token
curl http://localhost:5002/api/ai/anomalies
```

Expected:
- 401 unauthorized

## Step 8: Role matrix verification (AI routes)

GET /api/ai/anomalies (with valid token):
- admin -> 200
- manager -> 200
- executive -> 200
- analyst -> 200

PUT /api/ai/anomalies/:id/acknowledge:
- admin -> 200
- manager -> 200
- executive -> 200
- analyst -> 403

## Step 9: Current auth scope in dev

- AI routes are JWT protected and role-guarded.
- Analytics routes are currently relaxed in development (JWT middleware commented) to avoid continuous re-authorization flow issues during website testing.

## 7) Why Specific Implementation Decisions Were Used

1. $setOnInsert for isAcknowledged
- Prevents resetting previously acknowledged anomalies on future reruns.

2. Upsert by decisionId
- Avoids duplicate anomaly documents for same decision across repeated runs.

3. lean() query for source decisions
- Faster bulk reads than hydrated Mongoose documents.

4. Cache key m3:anomalies:active with TTL 300
- Reduces repeated Mongo reads for dashboard polling while keeping data fresh.

5. Cron registration via import in server.ts
- Ensures schedule is registered exactly on service startup.

## 8) Final Day 1 Summary

Day 1 backend pipeline is now production-like and operational:
- Automated 24-hour anomaly detection schedule is active.
- Anomaly upsert path writes/updates m3_anomalies safely.
- Acknowledgment state survives reruns.
- AI anomaly read and acknowledge APIs are fully implemented with auth guards.
- Redis cache integration exists in code, but Redis is intentionally disabled in current dev validation.

This unblocks downstream frontend and analytics features that depend on fresh m3_anomalies data.
