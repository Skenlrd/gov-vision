import { Router, Request, Response } from "express"
import Anomaly from "../models/Anomaly"
import { getOrSet, invalidate } from "../services/cacheService"
import { validateJWT } from "../middleware/validateJWT"
import { requireRole } from "../middleware/requireRole"

const router = Router()

router.get(
  "/anomalies",
  validateJWT,
  requireRole(["admin", "manager", "executive", "analyst"]),
  async (req: Request, res: Response) => {
    try {
      const cacheKey = "m3:anomalies:active"

      const data = await getOrSet(cacheKey, 300, async () => {
        const anomalies = await Anomaly.find({ isAcknowledged: false })
          .sort({ anomalyScore: -1 })
          .lean()

        const grouped: Record<string, typeof anomalies> = {
          Critical: [],
          High: [],
          Medium: [],
          Low: []
        }

        for (const anomaly of anomalies) {
          if (grouped[anomaly.severity]) {
            grouped[anomaly.severity].push(anomaly)
          }
        }

        return {
          ...grouped,
          total: anomalies.length
        }
      })

      return res.json(data)
    } catch (err: any) {
      console.error("[GET /api/ai/anomalies]", err.message)
      return res.status(500).json({ error: "Failed to fetch anomalies" })
    }
  }
)

router.put(
  "/anomalies/:id/acknowledge",
  validateJWT,
  requireRole(["admin", "manager", "executive"]),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params
      const userId = req.user?.userId

      const updated = await Anomaly.findByIdAndUpdate(
        id,
        {
          $set: {
            isAcknowledged: true,
            acknowledgedBy: userId,
            acknowledgedAt: new Date()
          }
        },
        { new: true }
      )

      if (!updated) {
        return res.status(404).json({ error: "Anomaly not found" })
      }

      await invalidate("m3:anomalies:active")

      return res.json(updated)
    } catch (err: any) {
      console.error("[PUT /api/ai/anomalies/:id/acknowledge]", err.message)
      return res.status(500).json({ error: "Failed to acknowledge anomaly" })
    }
  }
)

export default router