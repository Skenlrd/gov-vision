/*
  Shared API Contracts for GovVision
  These types are used by both frontend (client) and backend (server)
  to ensure type safety across the API boundary.
*/

// ==================== Core Domain Types ====================

export type Severity = "Low" | "Medium" | "High" | "Critical" | "Normal"
export type RiskLevel = "Low" | "Medium" | "High" | "Critical"

export interface IKpiSummary {
  department: string | null
  snapshotDate: string | Date
  totalDecisions: number
  approvedCount: number
  rejectedCount: number
  pendingCount: number
  avgCycleTimeHours: number
  violationCount: number
  openViolations: number
  complianceRate: number
  anomalyCount?: number
  riskScore?: number
  riskLevel?: RiskLevel
}

export interface IAnomaly {
  _id: string
  decisionId: string | null
  department: string
  anomalyScore: number
  severity: Severity
  description: string
  isAnomaly?: boolean
  isAcknowledged: boolean
  acknowledgedBy?: string
  acknowledgedAt?: string
  featureValues?: IFeatureValues
  createdAt?: string
  updatedAt?: string
  detectedAt: string
}

export interface IAnomalyResult {
  id: string
  anomalyScore: number
  isAnomaly: boolean
  severity: Severity
}

export interface IFeatureValues {
  cycleTimeHours: number
  rejectionCount: number
  revisionCount: number
  daysOverSLA: number
  stageCount: number
  hourOfDaySubmitted: number
}

export interface IAnomalyGroup {
  Critical: IAnomaly[]
  High: IAnomaly[]
  Medium: IAnomaly[]
  Low: IAnomaly[]
  total: number
}

// ==================== Risk Types ====================

export interface IRiskEntry {
  departmentId: string
  department: string
  riskScore: number
  riskLevel: RiskLevel
  Low: number
  Medium: number
  High: number
  Critical: number
  featureImportance?: Record<string, number>
}

export interface IRiskHeatmapRow {
  department: string
  deptId: string
  Low: number
  Medium: number
  High: number
  Critical: number
  riskScore?: number
  riskLevel?: RiskLevel
  featureImportance?: Record<string, number> | null
}

export const RISK_LEVEL_COLORS: Record<RiskLevel, string> = {
  Low: "#57B877",
  Medium: "#FFC107",
  High: "#E08C3E",
  Critical: "#DE6D6D"
}

// ==================== Forecast Types ====================

export type ForecastTarget =
  | "volume"
  | "delay"
  | "approval_rate"
  | "rejection_rate"
  | "pending_workload"
  | "sla_misses"

export interface IForecastPoint {
  ds: string
  yhat: number
  yhat_lower: number
  yhat_upper: number
}

export interface IForecastData {
  department: string
  target: ForecastTarget
  horizon: number
  generatedAt: string
  forecastData: IForecastPoint[]
}

// ==================== Report Types ====================

export type ReportFormat = "csv" | "excel" | "pdf"
export type ReportType = "executive_summary" | "compliance" | "anomaly" | "risk"
export type ReportStatus = "pending" | "generating" | "completed" | "failed"

export interface IReportConfig {
  type: ReportType
  format: ReportFormat
  dateFrom: string
  dateTo: string
  departments: string[]
}

export interface IGenerateReportResponse {
  reportId: string
  status: "completed" | "pending" | "failed"
}

export interface IReportRecord {
  _id: string
  type: string
  format: ReportFormat
  status: ReportStatus
  generatedAt: string
  generatedBy: string
  parameters: IReportConfig
  filePath: string
}

export interface IReportSchedule {
  _id: string
  name: string
  reportConfig: {
    type: string
    format: string
    departments: string[]
    dateRangeMode: "last_7_days" | "last_30_days" | "last_90_days"
  }
  frequency: "daily" | "weekly" | "monthly"
  nextRunAt: string
  lastRunAt?: string
  lastRunStatus?: "success" | "failed" | "pending"
  isActive: boolean
  recipients: string[]
}

// ==================== Analytics Types ====================

export interface IFilter {
  dateFrom: string
  dateTo: string
  deptId: string | null
}

export interface IDecisionVolumePoint {
  date: string
  count: number
}

export interface ICycleTimeBucket {
  bucket: string
  count: number
}

export interface IComplianceTrendPoint {
  date: string
  complianceRate: number
}

export interface IComplianceTrendSeries {
  department: string
  data: IComplianceTrendPoint[]
}

export interface IFeatureImportance {
  feature: string
  weight: number
}

// ==================== User Types ====================

export interface IUser {
  userId: string
  role: string
  department: string
}
