import { Router, Request, Response } from "express"
import Anomaly from "../models/Anomaly"

const router = Router()

router.get("/anomalies", async (req: Request, res: Response) => {
  const anomalies = await Anomaly.find({ isAcknowledged: false })
    .sort({ anomalyScore: -1 })

  res.json(anomalies)
})

router.put("/anomalies/:id/acknowledge", async (req: Request, res: Response) => {
  const updated = await Anomaly.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        isAcknowledged: true,
        acknowledgedAt: new Date()
      }
    },
    { new: true }
  )

  res.json(updated)
})

export default router