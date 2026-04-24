"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aggregateAllDepartments = aggregateAllDepartments;
exports.aggregateKPI = aggregateKPI;
exports.aggregateOrgKPI = aggregateOrgKPI;
const m1Decisions_1 = __importDefault(require("../models/m1Decisions"));
const m2Violations_1 = __importDefault(require("../models/m2Violations"));
const KPI_Snapshot_1 = __importDefault(require("../models/KPI_Snapshot"));
const Anomaly_1 = __importDefault(require("../models/Anomaly"));
const DEPARTMENTS = ["FI001", "HR002", "OP003", "IT004", "CS005"];
const COMPLIANCE_SLA_GRACE_DAYS = 0;
function dayStart(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}
function getSlaDays(decision) {
    const slaDays = Number(decision.slaDays);
    if (Number.isFinite(slaDays) && slaDays > 0) {
        return slaDays;
    }
    const stageCount = Number(decision.stageCount ?? 1);
    const priority = String(decision.priority ?? "normal").toLowerCase();
    if (stageCount === 1 && priority === 'high') {
        return 1;
    }
    return Math.max(1, stageCount * 2);
}
function getPendingDaysOverSLA(decision, now) {
    const createdAtRaw = decision.createdAt;
    if (!createdAtRaw) {
        return 0;
    }
    const createdAt = new Date(createdAtRaw);
    if (Number.isNaN(createdAt.getTime())) {
        return 0;
    }
    const elapsedDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const slaDays = getSlaDays(decision);
    return Math.max(0, elapsedDays - slaDays);
}
async function calculateKPIs(startDate, endDate, departmentId) {
    const decisionFilter = {
        createdAt: { $gte: startDate, $lte: endDate },
        source: 'ai_workflow' // Only include live AI Workflow data
    };
    // Separate filter for pending - counts ALL pending regardless of createdAt
    const pendingFilter = {
        status: 'pending',
        source: 'ai_workflow'
    };
    if (departmentId && departmentId !== "ORG") {
        decisionFilter.departmentId = departmentId;
        pendingFilter.departmentId = departmentId;
    }
    const decisions = await m1Decisions_1.default.find(decisionFilter);
    // Count ALL pending cases (not filtered by date)
    const allPending = await m1Decisions_1.default.find(pendingFilter);
    const pendingCount = allPending.length;
    const totalDecisions = decisions.length; // Fixed double-counting of pending tasks
    const approvedCount = decisions.filter(d => d.status === "approved").length;
    const rejectedCount = decisions.filter(d => d.status === "rejected").length;
    const completed = decisions.filter(d => d.completedAt);
    const compliantDecisionCount = decisions.filter(d => d.status === "approved" && Number(d.daysOverSLA ?? 0) <= COMPLIANCE_SLA_GRACE_DAYS).length;
    const avgCycleTimeHours = completed.reduce((sum, d) => {
        const diff = (new Date(d.completedAt).getTime() -
            new Date(d.createdAt).getTime()) / (1000 * 60 * 60);
        return sum + diff;
    }, 0) / (completed.length || 1);
    const violationFilter = {
        createdAt: { $gte: startDate, $lte: endDate },
        source: 'ai_workflow' // Only include live data violations
    };
    if (departmentId && departmentId !== "ORG") {
        violationFilter.department = departmentId;
    }
    const violations = await m2Violations_1.default.find(violationFilter);
    const violationCount = violations.length;
    const openViolations = violations.filter(v => v.status === "open").length;
    const decisionIds = decisions.map((d) => d._id);
    const anomalyCount = decisionIds.length
        ? await Anomaly_1.default.countDocuments({
            decisionId: { $in: decisionIds },
            isAcknowledged: false
        })
        : 0;
    const complianceRate = (compliantDecisionCount / (totalDecisions || 1)) * 100;
    const bottleneckThresholds = {};
    const now = new Date();
    // Use ALL pending for bottleneck calculation (not just date-filtered)
    const bottleneckCount = allPending.filter((d) => {
        return getPendingDaysOverSLA(d, now) > 0;
    }).length;
    const bottleneckRate = totalDecisions
        ? Math.round(((bottleneckCount / totalDecisions) * 100) * 10) / 10
        : 0;
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
    };
}
async function saveSnapshot(scopeId, kpis) {
    const today = dayStart(new Date());
    const snapshot = await KPI_Snapshot_1.default.findOneAndUpdate({
        departmentId: scopeId,
        snapshotDate: today
    }, {
        $set: {
            ...kpis,
            departmentId: scopeId,
            snapshotDate: today
        }
    }, {
        upsert: true,
        returnDocument: "after"
    });
    return snapshot;
}
async function removeLegacyNullSnapshots() {
    await KPI_Snapshot_1.default.deleteMany({
        $or: [
            { departmentId: { $exists: true, $eq: null } },
            { department: { $exists: true, $eq: null } }
        ]
    });
}
async function aggregateAllDepartments(dateFrom, dateTo) {
    const snapshots = [];
    for (const deptId of DEPARTMENTS) {
        const kpis = await calculateKPIs(dateFrom, dateTo, deptId);
        const snapshot = await saveSnapshot(deptId, kpis);
        snapshots.push(snapshot);
    }
    await removeLegacyNullSnapshots();
    return snapshots;
}
async function aggregateKPI(deptId, dateFrom, dateTo) {
    const kpis = await calculateKPIs(dateFrom, dateTo, deptId);
    const snapshot = await saveSnapshot(deptId, kpis);
    await removeLegacyNullSnapshots();
    return snapshot;
}
async function aggregateOrgKPI(dateFrom, dateTo) {
    const orgKpis = await calculateKPIs(dateFrom, dateTo);
    const snapshot = await saveSnapshot("ORG", orgKpis);
    await removeLegacyNullSnapshots();
    return snapshot;
}
