import m1Decision from "../models/m1Decisions"
import m2Violation from "../models/m2Violations"
import KPISnapshot from "../models/KPI_Snapshot"
import Anomaly from "../models/Anomaly"

import { IKpiSummary } from "../types"

const DEPARTMENTS = ["FI001", "HR002", "OP003", "IT004", "CS005"] as const
const DEPT_NAME_MAP: Record<string, string> = {
  FI001: "Finance",
  HR002: "Human Resources",
  OP003: "Operations",
  IT004: "Information Technology",
  CS005: "Customer Service",
  ORG: "Organization Wide"
}
const COMPLIANCE_SLA_GRACE_DAYS = 0

function dayStart(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function getSlaDays(decision: Record<string, unknown>): number {
  const slaDays = Number((decision as any).slaDays)
  if (Number.isFinite(slaDays) && slaDays > 0) {
    return slaDays
  }

  const stageCount = Number((decision as any).stageCount ?? 1)
  const priority = String((decision as any).priority ?? "normal").toLowerCase()
  if (stageCount === 1 && priority === 'high') {
    return 1;
  }
  return Math.max(1, stageCount * 2)
}

function getPendingDaysOverSLA(decision: Record<string, unknown>, now: Date): number {
  const createdAtRaw = (decision as any).createdAt
  if (!createdAtRaw) {
    return 0
  }

  const createdAt = new Date(createdAtRaw)
  if (Number.isNaN(createdAt.getTime())) {
    return 0
  }

  const elapsedDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
  const slaDays = getSlaDays(decision)
  return Math.max(0, elapsedDays - slaDays)
}

async function calculateKPIs(
  startDate: Date,
  endDate: Date,
  departmentId?: string
): Promise<Record<string, unknown>> {
  const decisionFilter: Record<string, unknown> = {
    createdAt: { $gte: startDate, $lte: endDate },
    source: 'ai_workflow'  // Only include live AI Workflow data
  }

  // Separate filter for pending - counts ALL pending regardless of createdAt
  const pendingFilter: Record<string, unknown> = {
    status: 'pending',
    source: 'ai_workflow'
  }

  if (departmentId && departmentId !== "ORG") {
    decisionFilter.departmentId = departmentId
    pendingFilter.departmentId = departmentId
  }

  const decisions = await m1Decision.find(decisionFilter)
  
  // Count ALL pending cases (not filtered by date)
  const allPending = await m1Decision.find(pendingFilter)
  const pendingCount = allPending.length

  const totalDecisions = decisions.length  // Fixed double-counting of pending tasks
  const approvedCount = decisions.filter(d => d.status === "approved").length
  const rejectedCount = decisions.filter(d => d.status === "rejected").length

  const completed = decisions.filter(d => d.completedAt)
  const compliantDecisionCount = decisions.filter(
    d => d.status === "approved" && Number(d.daysOverSLA ?? 0) <= COMPLIANCE_SLA_GRACE_DAYS
  ).length

  const avgCycleTimeHours =
    completed.reduce((sum, d) => sum + (Number((d as any).cycleTimeHours) || 0), 0) / (completed.length || 1)

  const violationFilter: Record<string, unknown> = {
    createdAt: { $gte: startDate, $lte: endDate },
    source: 'ai_workflow'  // Only include live data violations
  }

  if (departmentId && departmentId !== "ORG") {
    violationFilter.department = departmentId
  }

  const violations = await m2Violation.find(violationFilter)
  const violationCount = violations.length
  const openViolations = violations.filter(v => v.status === "open").length

  const decisionIds = decisions.map((d) => (d as any)._id)
  const anomalyCount = decisionIds.length
    ? await Anomaly.countDocuments({
      decisionId: { $in: decisionIds },
      isAcknowledged: false
    })
    : 0

  const complianceRate =
    (compliantDecisionCount / (totalDecisions || 1)) * 100

  const bottleneckThresholds: Record<string, number> = {}
  const now = new Date()

  // Use ALL pending for bottleneck calculation (not just date-filtered)
  const bottleneckCount = allPending.filter((d) => {
    return getPendingDaysOverSLA(d as unknown as Record<string, unknown>, now) > 0
  }).length

  const bottleneckRate = totalDecisions
    ? Math.round(((bottleneckCount / totalDecisions) * 100) * 10) / 10
    : 0

  return {
    totalDecisions,
    approvedCount,
    rejectedCount,
    pendingCount,
    avgCycleTimeHours,
    violationCount,
    openViolations,
    anomalyCount,
    complianceRate,
    bottleneckRate,
    bottleneckCount,
    bottleneckThresholds
  }
}

async function saveSnapshot(
  scopeId: string,
  kpis: Record<string, unknown>
): Promise<IKpiSummary> {
  const today = dayStart(new Date())
  const snapshot = await KPISnapshot.findOneAndUpdate(
    {
      departmentId: scopeId,
      snapshotDate: today
    },
    {
      $set: {
        ...kpis,
        departmentId: scopeId,
        departmentName: DEPT_NAME_MAP[scopeId] || scopeId,
        snapshotDate: today
      }
    },
    {
      upsert: true,
      returnDocument: "after"
    }
  )

  return snapshot as unknown as IKpiSummary
}

async function removeLegacyNullSnapshots(): Promise<void> {
  await KPISnapshot.deleteMany({
    $or: [
      { departmentId: { $exists: true, $eq: null } },
      { department: { $exists: true, $eq: null } }
    ]
  })
}

export async function aggregateAllDepartments(
  dateFrom: Date,
  dateTo: Date
): Promise<IKpiSummary[]> {
  const snapshots: IKpiSummary[] = []

  for (const deptId of DEPARTMENTS) {
    const kpis = await calculateKPIs(dateFrom, dateTo, deptId)
    const snapshot = await saveSnapshot(deptId, kpis)
    snapshots.push(snapshot)
  }

  await removeLegacyNullSnapshots()

  return snapshots
}

export async function aggregateKPI(
  deptId: string,
  dateFrom: Date,
  dateTo: Date
): Promise<IKpiSummary> {
  const kpis = await calculateKPIs(dateFrom, dateTo, deptId)
  const snapshot = await saveSnapshot(deptId, kpis)
  await removeLegacyNullSnapshots()
  return snapshot
}

export async function aggregateOrgKPI(
  dateFrom: Date,
  dateTo: Date
): Promise<IKpiSummary> {
  const orgKpis = await calculateKPIs(dateFrom, dateTo)
  const snapshot = await saveSnapshot("ORG", orgKpis)
  await removeLegacyNullSnapshots()
  return snapshot
}
