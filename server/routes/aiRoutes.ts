import { Router, Request, Response } from "express"
import { validateJWT } from "../middleware/validateJWT"
import { requireRole } from "../middleware/requireRole"

const router = Router()

/*
  Stubs only — handlers filled in on Day 7
  when the Isolation Forest model is ready.
*/

router.get(
  "/anomalies",
  validateJWT,
  requireRole(["manager", "admin", "executive"]),
  async (req: Request, res: Response) => {
    res.json({ message: "AI routes coming Day 7" })
  }
)

router.put(
  "/anomalies/:id/acknowledge",
  validateJWT,
  requireRole(["manager", "admin", "executive"]),
  async (req: Request, res: Response) => {
    res.json({ message: "AI routes coming Day 7" })
  }
)

export default router