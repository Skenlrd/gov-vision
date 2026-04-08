"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const serviceKey_1 = require("../middleware/serviceKey");
const cacheService_1 = require("../services/cacheService");
const kpiAggregator_1 = require("../services/kpiAggregator");
const router = (0, express_1.Router)();
// ─────────────────────────────────────────────
// POST /api/events/decision-update
// Called by Module 1 after every decision state change
// Protected by SERVICE_KEY, not JWT
// ─────────────────────────────────────────────
router.post("/decision-update", serviceKey_1.serviceKey, async (req, res) => {
    const { department, decisionId, status } = req.body;
    console.log(`[Webhook] decision-update received: dept=${department}, decision=${decisionId}, status=${status}`);
    if (!department) {
        res.status(400).json({ error: "department is required" });
        return;
    }
    try {
        /*
          Step 1: Invalidate stale cache for this department
          and for the org-wide aggregate.
    
          The * wildcard deletes all keys matching the pattern.
          Example: "m3:kpi:finance123:*" deletes any date
          variant cached for that department.
        */
        await (0, cacheService_1.invalidate)(`m3:kpi:${department}:*`);
        await (0, cacheService_1.invalidate)(`m3:kpi:org:*`);
        /*
          Step 2: Re-aggregate fresh KPI data for today
          so the next dashboard request hits the cache
          immediately instead of computing on demand.
        */
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        await (0, kpiAggregator_1.aggregateKPI)(department, today, today);
        await (0, kpiAggregator_1.aggregateOrgKPI)(today, today);
        console.log(`[Webhook] KPI re-aggregated for dept ${department}`);
        res.json({ received: true, department, status });
    }
    catch (err) {
        console.error("[Webhook] decision-update handler error:", err);
        res.status(500).json({ error: "Webhook processing failed" });
    }
});
// ─────────────────────────────────────────────
// POST /api/events/compliance-update
// Called by Module 2 when a violation is created
// or resolved
// Protected by SERVICE_KEY, not JWT
// ─────────────────────────────────────────────
router.post("/compliance-update", serviceKey_1.serviceKey, async (req, res) => {
    try {
        const { department } = req.body;
        if (!department) {
            res.status(400).json({ error: "department is required" });
            return;
        }
        /*
          Clear cached KPI data for this department.
          The compliance rate will be recomputed on the
          next dashboard request.
        */
        await (0, cacheService_1.invalidate)(`m3:kpi:${department}:*`);
        res.json({ ok: true });
    }
    catch (err) {
        console.error("compliance-update webhook error:", err);
        res.status(500).json({ error: "Webhook processing failed" });
    }
});
exports.default = router;
