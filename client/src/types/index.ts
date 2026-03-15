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
  isAcknowledged: boolean
  detectedAt: string
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
