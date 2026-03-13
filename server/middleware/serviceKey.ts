import { Request, Response, NextFunction } from "express"

/*
  serviceKey middleware

  Protects internal service-to-service endpoints.
  Used on:
  - POST /api/events/decision-update  (called by Module 1)
  - POST /api/events/compliance-update (called by Module 2)

  How it works:
  - Reads the x-service-key header from the request
  - Compares it to the SERVICE_KEY environment variable
  - If they match → call next()
  - If not → return 403

  This key is never exposed to the browser.
  It is a long random string shared between modules
  via environment variables.
*/

export function serviceKey(
  req: Request,
  res: Response,
  next: NextFunction
): void {

  const incomingKey = req.headers["x-service-key"]

  if (!incomingKey || incomingKey !== process.env.SERVICE_KEY) {
    res.status(403).json({ error: "Invalid service key" })
    return
  }

  next()

}