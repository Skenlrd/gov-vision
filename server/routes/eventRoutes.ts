import { Router, Request, Response } from "express"
import { serviceKey } from "../middleware/serviceKey"
import { invalidate } from "../services/cacheService"
import { aggregateKPI } from "../services/kpiAggregator"

const router = Router()

// ─────────────────────────────────────────────
// POST /api/events/decision-update
// Called by Module 1 after every decision state change
// Protected by SERVICE_KEY, not JWT
// ─────────────────────────────────────────────

router.post("/decision-update", serviceKey, async (req: Request, res: Response) => {

  try {

    const { department } = req.body

    if (!department) {
      res.status(400).json({ error: "department is required" })
      return
    }

    /*
      Step 1: Invalidate stale cache for this department
      and for the org-wide aggregate.

      The * wildcard deletes all keys matching the pattern.
      Example: "m3:kpi:finance123:*" deletes any date
      variant cached for that department.
    */
    await invalidate(`m3:kpi:${department}:*`)
    await invalidate(`m3:kpi:org:*`)

    /*
      Step 2: Re-aggregate fresh KPI data for today
      so the next dashboard request hits the cache
      immediately instead of computing on demand.
    */
    const today = new Date()
    await aggregateKPI(department, today, today)

    res.json({ ok: true })

  } catch (err) {

    console.error("decision-update webhook error:", err)
    res.status(500).json({ error: "Webhook processing failed" })

  }

})

// ─────────────────────────────────────────────
// POST /api/events/compliance-update
// Called by Module 2 when a violation is created
// or resolved
// Protected by SERVICE_KEY, not JWT
// ─────────────────────────────────────────────

router.post("/compliance-update", serviceKey, async (req: Request, res: Response) => {

  try {

    const { department } = req.body

    if (!department) {
      res.status(400).json({ error: "department is required" })
      return
    }

    /*
      Clear cached KPI data for this department.
      The compliance rate will be recomputed on the
      next dashboard request.
    */
    await invalidate(`m3:kpi:${department}:*`)

    res.json({ ok: true })

  } catch (err) {

    console.error("compliance-update webhook error:", err)
    res.status(500).json({ error: "Webhook processing failed" })

  }

})

export default router