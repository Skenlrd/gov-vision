import { Types } from "mongoose"
import { Request } from "express"

/*
  IUser represents the decoded JWT payload.
  This is what sits on req.user after validateJWT runs.
*/
export interface IUser {
  userId: string
  role:   string
  department: string
}

/*
  IKpiSummary is the shape returned by the aggregation engine
  and served by the KPI endpoints.
*/
export interface IKpiSummary {
  department:         Types.ObjectId | null
  snapshotDate:       Date
  totalDecisions:     number
  approvedCount:      number
  rejectedCount:      number
  pendingCount:       number
  avgCycleTimeHours:  number
  violationCount:     number
  openViolations:     number
  complianceRate:     number
  anomalyCount?:      number
  riskScore?:         number
  riskLevel?:         "low" | "medium" | "high" | "critical"
}

/*
  IAnomalyResult is the shape of a single prediction
  returned from the Python FastAPI service.
  Used starting Day 6.
*/
export interface IAnomalyResult {
  id:           string
  anomalyScore: number
  isAnomaly:    boolean
  severity:     "Low" | "Medium" | "High" | "Critical" | "Normal"
}

/*
  Declaration merging — adds req.user to Express Request.
  Without this block, TypeScript will error on every
  req.user access in your middleware and routes.
*/
declare global {
  namespace Express {
    interface Request {
      user?: IUser
    }
  }
}