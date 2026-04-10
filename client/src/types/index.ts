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
