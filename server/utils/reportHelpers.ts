import KPISnapshot from "../models/KPI_Snapshot"
import Anomaly from "../models/Anomaly"

export interface ReportData {
  kpiRows: KPIRow[]
  anomalyRows: AnomalyRow[]
  generatedAt: string
  dateFrom: string
  dateTo: string
  departments: string[]
}

export interface KPIRow {
  dept: string
  approvalRate: number
  avgCycleTime: number
  riskLevel: string
  complianceRate: number
  totalDecisions: number
  anomalyCount: number
}

export interface AnomalyRow {
  decisionId: string
  severity: string
  anomalyScore: string
  department: string
  isAcknowledged: string
  description: string
}

type AnomalyDoc = {
  decisionId?: unknown
  severity?: unknown
  anomalyScore?: unknown
  department?: unknown
  isAcknowledged?: unknown
  description?: unknown
}

function titleCaseRisk(value: unknown): string {
  const normalized = String(value || "low").toLowerCase()
  if (normalized === "critical") return "Critical"
  if (normalized === "high") return "High"
  if (normalized === "medium") return "Medium"
  return "Low"
}

export async function assembleReportData(config: {
  dateFrom: string
  dateTo: string
  departments: string[]
}): Promise<ReportData> {
  const dateFilter: Record<string, Date> = {}
  if (config.dateFrom) dateFilter.$gte = new Date(config.dateFrom)
  if (config.dateTo) dateFilter.$lte = new Date(config.dateTo)

  const matchFilter: Record<string, unknown> = {}
  if (Object.keys(dateFilter).length > 0) matchFilter.snapshotDate = dateFilter
  if (config.departments.length > 0) {
    matchFilter.departmentId = { $in: config.departments }
  }

  const snapshots = await KPISnapshot.find(matchFilter)
    .sort({ snapshotDate: -1 })
    .lean() as Array<Record<string, unknown>>

  const byDept = new Map<string, Record<string, unknown>>()
  for (const snap of snapshots) {
    const deptId = String(snap.departmentId || "")
    if (!deptId) continue
    if (!byDept.has(deptId)) {
      byDept.set(deptId, snap)
    }
  }

  const kpiRows: KPIRow[] = Array.from(byDept.values()).map((snap) => {
    const totalDecisions = Number(snap.totalDecisions || 0)
    const approvedCount = Number(snap.approvedCount || 0)
    const approvalRate = totalDecisions > 0 ? (approvedCount / totalDecisions) * 100 : 0

    return {
      dept: String(snap.departmentId || "unknown"),
      approvalRate: Number(approvalRate.toFixed(2)),
      avgCycleTime: Number(snap.avgCycleTimeHours || 0),
      riskLevel: titleCaseRisk(snap.riskLevel),
      complianceRate: Number(snap.complianceRate ?? 100),
      totalDecisions,
      anomalyCount: Number(snap.anomalyCount || 0),
    }
  })

  const anomalyFilter: Record<string, unknown> = {}
  if (config.departments.length > 0) {
    anomalyFilter.department = { $in: config.departments }
  }

  const anomalies = await Anomaly.find(anomalyFilter)
    .sort({ anomalyScore: -1 })
    .lean()
    .exec() as AnomalyDoc[]

  const anomalyRows: AnomalyRow[] = anomalies.map((a) => ({
    decisionId: String(a.decisionId || ""),
    severity: String(a.severity || "Normal"),
    anomalyScore: Number(a.anomalyScore || 0).toFixed(3),
    department: String(a.department || "unknown"),
    isAcknowledged: a.isAcknowledged ? "Yes" : "No",
    description: String(a.description || ""),
  }))

  return {
    kpiRows,
    anomalyRows,
    generatedAt: new Date().toISOString(),
    dateFrom: config.dateFrom,
    dateTo: config.dateTo,
    departments: config.departments,
  }
}
