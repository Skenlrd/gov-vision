"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aggregateKPI = aggregateKPI;
exports.aggregateOrgKPI = aggregateOrgKPI;
const m1Decisions_1 = __importDefault(require("../models/m1Decisions"));
const m2Violations_1 = __importDefault(require("../models/m2Violations"));
const KPI_Snapshot_1 = __importDefault(require("../models/KPI_Snapshot"));
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
async function aggregateKPI(deptId, dateFrom, dateTo) {
    const decisions = await m1Decisions_1.default.find({
        department: deptId,
        createdAt: { $gte: dateFrom, $lte: dateTo }
    });
    const totalDecisions = decisions.length;
    const approvedCount = decisions.filter(d => d.status === "approved").length;
    const rejectedCount = decisions.filter(d => d.status === "rejected").length;
    const pendingCount = decisions.filter(d => d.status === "pending").length;
    const completed = decisions.filter(d => d.completedAt);
    const avgCycleTimeHours = completed.reduce((sum, d) => {
        const diff = (new Date(d.completedAt).getTime() -
            new Date(d.createdAt).getTime()) / (1000 * 60 * 60);
        return sum + diff;
    }, 0) / (completed.length || 1);
    const violations = await m2Violations_1.default.find({
        department: deptId,
        createdAt: { $gte: dateFrom, $lte: dateTo }
    });
    const violationCount = violations.length;
    const openViolations = violations.filter(v => v.status === "open").length;
    const complianceRate = ((totalDecisions - violationCount) /
        (totalDecisions || 1)) * 100;
    const today = new Date().toISOString().split("T")[0];
    const snapshot = await KPI_Snapshot_1.default.findOneAndUpdate({
        department: deptId,
        snapshotDate: today
    }, {
        department: deptId,
        snapshotDate: new Date(),
        totalDecisions,
        approvedCount,
        rejectedCount,
        pendingCount,
        avgCycleTimeHours,
        violationCount,
        openViolations,
        complianceRate
    }, {
        upsert: true,
        returnDocument: "after"
    });
    return snapshot;
}
/*
  aggregateOrgKPI computes KPIs across all departments.

  The department field is stored as null to indicate
  this is an org-wide aggregate, not department-specific.

  Called by:
  - GET /api/analytics/kpi-summary (no deptId param)
  - The webhook receiver on every decision state change
*/
async function aggregateOrgKPI(dateFrom, dateTo) {
    const decisions = await m1Decisions_1.default.find({
        createdAt: { $gte: dateFrom, $lte: dateTo }
    });
    const totalDecisions = decisions.length;
    const approvedCount = decisions.filter(d => d.status === "approved").length;
    const rejectedCount = decisions.filter(d => d.status === "rejected").length;
    const pendingCount = decisions.filter(d => d.status === "pending").length;
    const completed = decisions.filter(d => d.completedAt);
    const avgCycleTimeHours = completed.reduce((sum, d) => {
        const diff = (new Date(d.completedAt).getTime() -
            new Date(d.createdAt).getTime()) / (1000 * 60 * 60);
        return sum + diff;
    }, 0) / (completed.length || 1);
    const violations = await m2Violations_1.default.find({
        createdAt: { $gte: dateFrom, $lte: dateTo }
    });
    const violationCount = violations.length;
    const openViolations = violations.filter(v => v.status === "open").length;
    const complianceRate = ((totalDecisions - violationCount) /
        (totalDecisions || 1)) * 100;
    const today = new Date().toISOString().split("T")[0];
    const snapshot = await KPI_Snapshot_1.default.findOneAndUpdate({
        department: null,
        snapshotDate: today
    }, {
        department: null,
        snapshotDate: new Date(),
        totalDecisions,
        approvedCount,
        rejectedCount,
        pendingCount,
        avgCycleTimeHours,
        violationCount,
        openViolations,
        complianceRate
    }, {
        upsert: true,
        new: true
    });
    return snapshot;
}
