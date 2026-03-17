import m1Decision from "../models/m1Decisions"
import m2Violation from "../models/m2Violations"
import KPISnapshot from "../models/KPI_Snapshot"

import { IKpiSummary } from "../types"

/*
  aggregateKPI computes KPIs for a single department
  over a given date range and upserts the result
  into m3_kpi_snapshots.

  Called:
  - By the webhook receiver (POST /api/events/decision-update)
    whenever a decision changes state
  - By the GET /api/analytics/kpi-summary/:deptId endpoint
    when the Redis cache is expired
*/

export async function aggregateKPI(
  deptId: string,
  dateFrom: Date,
  dateTo: Date
): Promise<IKpiSummary> {

  const decisions = await m1Decision.find({
    departmentId: deptId,
    createdAt: { $gte: dateFrom, $lte: dateTo }
  })

  const totalDecisions = decisions.length

  const approvedCount =
    decisions.filter(d => d.status === "approved").length

  const rejectedCount =
    decisions.filter(d => d.status === "rejected").length

  const pendingCount =
    decisions.filter(d => d.status === "pending").length

  const completed = decisions.filter(d => d.completedAt)
  const compliantCompletedCount = completed.filter(
    d => d.status === "approved" && Number(d.daysOverSLA ?? 0) === 0
  ).length

  const avgCycleTimeHours =
    completed.reduce((sum, d) => {

      const diff =
        (new Date(d.completedAt!).getTime() -
          new Date(d.createdAt!).getTime()) / (1000 * 60 * 60)

      return sum + diff

    }, 0) / (completed.length || 1)

  const violations = await m2Violation.find({
    department: deptId,
    createdAt: { $gte: dateFrom, $lte: dateTo }
  })

  const violationCount = violations.length

  const openViolations =
    violations.filter(v => v.status === "open").length

  const complianceRate =
    (compliantCompletedCount / (completed.length || 1)) * 100

  const today = new Date().toISOString().split("T")[0]

  const snapshot = await KPISnapshot.findOneAndUpdate(

    {
      departmentId: deptId,
      snapshotDate: today
    },

    {
      departmentId: deptId,
      snapshotDate: new Date(),

      totalDecisions,
      approvedCount,
      rejectedCount,
      pendingCount,

      avgCycleTimeHours,

      violationCount,
      openViolations,

      complianceRate
    },

  {
  upsert: true,
  returnDocument: "after"
}

  )

  return snapshot as unknown as IKpiSummary

}

/*
  aggregateOrgKPI computes KPIs across all departments.

  The departmentId field is stored as null to indicate
  this is an org-wide aggregate, not department-specific.

  Called by:
  - GET /api/analytics/kpi-summary (no deptId param)
  - The webhook receiver on every decision state change
*/

export async function aggregateOrgKPI(
  dateFrom: Date,
  dateTo: Date
): Promise<IKpiSummary> {

  const decisions = await m1Decision.find({
    createdAt: { $gte: dateFrom, $lte: dateTo }
  })

  const totalDecisions = decisions.length

  const approvedCount =
    decisions.filter(d => d.status === "approved").length

  const rejectedCount =
    decisions.filter(d => d.status === "rejected").length

  const pendingCount =
    decisions.filter(d => d.status === "pending").length

  const completed = decisions.filter(d => d.completedAt)
  const compliantCompletedCount = completed.filter(
    d => d.status === "approved" && Number(d.daysOverSLA ?? 0) === 0
  ).length

  const avgCycleTimeHours =
    completed.reduce((sum, d) => {

      const diff =
        (new Date(d.completedAt!).getTime() -
          new Date(d.createdAt!).getTime()) / (1000 * 60 * 60)

      return sum + diff

    }, 0) / (completed.length || 1)

  const violations = await m2Violation.find({
    createdAt: { $gte: dateFrom, $lte: dateTo }
  })

  const violationCount = violations.length

  const openViolations =
    violations.filter(v => v.status === "open").length

  const complianceRate =
    (compliantCompletedCount / (completed.length || 1)) * 100

  const today = new Date().toISOString().split("T")[0]

  const snapshot = await KPISnapshot.findOneAndUpdate(

    {
      departmentId: null,
      snapshotDate: today
    },

    {
      departmentId: null,
      snapshotDate: new Date(),

      totalDecisions,
      approvedCount,
      rejectedCount,
      pendingCount,

      avgCycleTimeHours,

      violationCount,
      openViolations,

      complianceRate
    },

    {
      upsert: true,
      new: true
    }

  )

  return snapshot as unknown as IKpiSummary

}