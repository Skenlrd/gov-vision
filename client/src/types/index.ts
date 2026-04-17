/*
  All frontend TypeScript interfaces for GovVision Module 3.
  These must match exactly what the backend API returns.
  If a backend field changes, update here too.
*/

export interface IKpiSummary {
  department: string | null
  snapshotDate: string
  totalDecisions: number
  approvedCount: number
  rejectedCount: number
  pendingCount: number
  avgCycleTimeHours: number
  violationCount: number
  openViolations: number
  complianceRate: number
  bottleneckRate?: number
  bottleneckCount?: number
  anomalyCount?: number
  riskScore?: number
  riskLevel?: string
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

export interface IFeatureImportance {
  feature: string
  weight: number
}

export interface IFilter {
  dateFrom: string
  dateTo: string
  deptId: string | null
}

export interface IDecisionVolume {
  date: string
  count: number
}

export interface ICycleTimeBucket {
  bucket: string
  count: number
}

export interface IComplianceTrend {
  department: string
  data: Array<{
    date: string
    complianceRate: number
  }>
}

export interface IReport {
  _id: string
  name: string
  type: string
  format: "pdf" | "excel" | "csv"
  status: "pending" | "generating" | "completed" | "failed"
  createdAt: string
}

/*
  Union types - use these instead of plain string
  wherever severity or risk level appears.
  TypeScript will catch any typo at compile time.
*/
export type Severity = "Low" | "Medium" | "High" | "Critical" | "Normal"
export type RiskLevel = "Low" | "Medium" | "High" | "Critical"

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

export interface IRiskHeatmapRow {
  department: string
  deptId: string
  Low: number
  Medium: number
  High: number
  Critical: number
  riskScore?: number
  riskLevel?: "low" | "medium" | "high" | "critical"
  featureImportance?: Record<string, number> | null
}

export interface RiskEntry {
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

export const RISK_LEVEL_COLORS: Record<RiskLevel, string> = {
  Low: "#57B877",
  Medium: "#FFC107",
  High: "#E08C3E",
  Critical: "#DE6D6D"
}

export const RISK_LEVEL_THEME: Record<RiskLevel, {
  fill: string
  text: string
  bg: string
  border: string
}> = {
  Low: {
    fill: "#57B877",
    text: "#2E7D32",
    bg: "#DDF3E5",
    border: "#9FD7AF"
  },
  Medium: {
    fill: "#FFC107",
    text: "#8A6A00",
    bg: "#FFF6CC",
    border: "#F2D979"
  },
  High: {
    fill: "#E08C3E",
    text: "#9C4A00",
    bg: "#FDE9D6",
    border: "#E9BC92"
  },
  Critical: {
    fill: "#DE6D6D",
    text: "#9C2F2F",
    bg: "#FADDDD",
    border: "#E8A9A9"
  }
}

export type ForecastTarget = "volume" | "delay"

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

export type ReportFormat = "csv" | "excel" | "pdf"
export type ReportType = "executive_summary" | "compliance" | "anomaly" | "risk"

export interface ReportConfig {
  type: ReportType
  format: ReportFormat
  dateFrom: string
  dateTo: string
  departments: string[]
}

export interface GenerateReportResponse {
  reportId: string
  status: "completed" | "pending" | "failed"
}

export interface ReportRecord {
  _id: string
  type: string
  format: ReportFormat
  status: "completed" | "pending" | "failed"
  generatedAt: string
  generatedBy: string
  parameters: ReportConfig
  filePath: string
}

export interface ReportSchedule {
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
