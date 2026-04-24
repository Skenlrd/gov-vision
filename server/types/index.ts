import { Request } from "express"

/*
  Server TypeScript types for GovVision.
  
  NOTE: Shared API contracts are now in /contracts/index.ts
  and re-exported here for convenience. Server-specific types
  (like Mongoose document extensions) are defined locally.
  
  Import from contracts for shared types:
  import { IKpiSummary, IAnomaly } from '../../contracts'
*/

// Re-export all shared types from contracts for server use
export type {
  Severity,
  RiskLevel,
  IKpiSummary,
  IAnomaly,
  IAnomalyResult,
  IFeatureValues,
  IAnomalyGroup,
  IRiskEntry,
  IRiskHeatmapRow,
  ForecastTarget,
  IForecastPoint,
  IForecastData,
  ReportFormat,
  ReportType,
  ReportStatus,
  IReportConfig,
  IGenerateReportResponse,
  IReportRecord,
  IReportSchedule,
  IFilter,
  IDecisionVolumePoint,
  ICycleTimeBucket,
  IComplianceTrendPoint,
  IComplianceTrendSeries,
  IFeatureImportance,
  IUser,
  RISK_LEVEL_COLORS
} from '../../contracts'

/*
  Server-specific type extensions
*/

/*
  IUser represents the decoded JWT payload.
  This is what sits on req.user after validateJWT runs.
  
  NOTE: Also defined in contracts/index.ts - this is the server
  implementation interface (may have additional server-only fields).
*/
export interface IUser {
  userId: string
  role: string
  department: string
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