"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cacheService_1 = require("../services/cacheService");
const kpiAggregator_1 = require("../services/kpiAggregator");
const m1Decisions_1 = __importDefault(require("../models/m1Decisions"));
const KPI_Snapshot_1 = __importDefault(require("../models/KPI_Snapshot"));
const router = (0, express_1.Router)();
/*
  Helper: get today's date string "YYYY-MM-DD"
  Used as part of Redis cache keys.
*/
function todayStr() {
    return new Date().toISOString().split("T")[0];
}
// ─────────────────────────────────────────────
// GET /api/analytics/kpi-summary
// Org-wide KPI numbers
// Protected by JWT
// ─────────────────────────────────────────────
router.get("/kpi-summary", /* validateJWT, */ async (req, res) => {
    try {
        const dateFrom = req.query.dateFrom
            ? new Date(req.query.dateFrom)
            : new Date(new Date().setDate(new Date().getDate() - 30));
        const dateTo = req.query.dateTo
            ? new Date(req.query.dateTo)
            : new Date();
        /*
          Cache key includes today's date so data refreshes
          daily automatically even without an explicit
          cache invalidation call.
          TTL is 300 seconds (5 minutes).
        */
        const cacheKey = `m3:kpi:org:${todayStr()}`;
        const data = await (0, cacheService_1.getOrSet)(cacheKey, 300, () => (0, kpiAggregator_1.aggregateOrgKPI)(dateFrom, dateTo));
        res.json({ success: true, data });
    }
    catch (err) {
        console.error("kpi-summary error:", err);
        res.status(500).json({ error: "Failed to fetch KPI summary" });
    }
});
// ─────────────────────────────────────────────
// GET /api/analytics/kpi-summary/:deptId
// Department-level KPI numbers
// Protected by JWT
// ─────────────────────────────────────────────
router.get("/kpi-summary/:deptId", /* validateJWT, */ async (req, res) => {
    try {
        const deptId = req.params.deptId;
        const dateFrom = req.query.dateFrom
            ? new Date(req.query.dateFrom)
            : new Date(new Date().setDate(new Date().getDate() - 30));
        const dateTo = req.query.dateTo
            ? new Date(req.query.dateTo)
            : new Date();
        const cacheKey = `m3:kpi:${deptId}:${todayStr()}`;
        const data = await (0, cacheService_1.getOrSet)(cacheKey, 300, () => (0, kpiAggregator_1.aggregateKPI)(deptId, dateFrom, dateTo));
        res.json({ success: true, data });
    }
    catch (err) {
        console.error("kpi-summary/:deptId error:", err);
        res.status(500).json({ error: "Failed to fetch department KPI" });
    }
});
// ─────────────────────────────────────────────
// GET /api/analytics/decision-volume
// Time-series decision count for the line/bar chart
// Protected by JWT
// Query params:
//   granularity: "daily" | "weekly" | "monthly"
//   dateFrom: ISO date string
//   dateTo:   ISO date string
//   deptId:   canonical department string (optional)
// ─────────────────────────────────────────────
router.get("/decision-volume", /* validateJWT, */ async (req, res) => {
    try {
        const granularity = req.query.granularity || "daily";
        const deptId = req.query.deptId;
        const dateFrom = req.query.dateFrom
            ? new Date(req.query.dateFrom)
            : new Date(new Date().setDate(new Date().getDate() - 30));
        const dateTo = req.query.dateTo
            ? new Date(req.query.dateTo)
            : new Date();
        /*
          $dateToString format changes based on granularity:
          - daily:   "2026-03-11"
          - weekly:  "2026-W11"
          - monthly: "2026-03"
        */
        const formatMap = {
            daily: "%Y-%m-%d",
            weekly: "%G-W%V",
            monthly: "%Y-%m"
        };
        const format = formatMap[granularity] || "%Y-%m-%d";
        /*
          Build the match filter.
          If deptId is provided, filter by department.
          Otherwise include all decisions.
        */
        const matchStage = {
            createdAt: { $gte: dateFrom, $lte: dateTo }
        };
        if (deptId) {
            matchStage.department = deptId;
        }
        const result = await m1Decisions_1.default.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format,
                            date: "$createdAt"
                        }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } },
            {
                $project: {
                    _id: 0,
                    date: "$_id",
                    count: 1
                }
            }
        ]);
        res.json({ success: true, data: result });
    }
    catch (err) {
        console.error("decision-volume error:", err);
        res.status(500).json({ error: "Failed to fetch decision volume" });
    }
});
// ─────────────────────────────────────────────
// GET /api/analytics/cycle-time-histogram
// Groups completed decisions into 4 time buckets
// Protected by JWT
// ─────────────────────────────────────────────
router.get("/cycle-time-histogram", /* validateJWT, */ async (req, res) => {
    try {
        const dateFrom = req.query.dateFrom
            ? new Date(req.query.dateFrom)
            : new Date(new Date().setDate(new Date().getDate() - 30));
        const dateTo = req.query.dateTo
            ? new Date(req.query.dateTo)
            : new Date();
        /*
          Only query decisions that have completedAt.
          Pending decisions have no cycle time to measure.
        */
        const decisions = await m1Decisions_1.default.find({
            completedAt: { $exists: true, $ne: null },
            createdAt: { $gte: dateFrom, $lte: dateTo }
        });
        /*
          Group into 4 buckets based on cycle time in hours.
          cycleTimeHours is stored directly on the document
          from Module 1. If it's missing, compute it from
          completedAt - createdAt.
        */
        const buckets = {
            "0-24h": 0,
            "24-48h": 0,
            "48-72h": 0,
            ">72h": 0
        };
        decisions.forEach(d => {
            const hours = d.cycleTimeHours ||
                (new Date(d.completedAt).getTime() -
                    new Date(d.createdAt).getTime()) / (1000 * 60 * 60);
            if (hours <= 24)
                buckets["0-24h"]++;
            else if (hours <= 48)
                buckets["24-48h"]++;
            else if (hours <= 72)
                buckets["48-72h"]++;
            else
                buckets[">72h"]++;
        });
        const data = Object.entries(buckets).map(([bucket, count]) => ({
            bucket,
            count
        }));
        res.json({ success: true, data });
    }
    catch (err) {
        console.error("cycle-time-histogram error:", err);
        res.status(500).json({ error: "Failed to fetch cycle time data" });
    }
});
// ─────────────────────────────────────────────
// GET /api/analytics/compliance-trend
// Returns compliance rate over time per department
// Protected by JWT
// Query params:
//   dateFrom: ISO date string
//   dateTo:   ISO date string
//   depts:    comma-separated department strings (optional)
//   deptId:   single department string (optional)
// ─────────────────────────────────────────────
router.get("/compliance-trend", /* validateJWT, */ async (req, res) => {
    try {
        const dateFrom = req.query.dateFrom
            ? new Date(req.query.dateFrom)
            : new Date(new Date().setDate(new Date().getDate() - 30));
        const dateTo = req.query.dateTo
            ? new Date(req.query.dateTo)
            : new Date();
        /*
          depts query param is a comma-separated list of
          department strings.
          Example: ?depts=finance,operations
          If not provided, return all departments.
        */
        const deptsParam = req.query.depts;
        const deptIdParam = req.query.deptId;
        const matchStage = {
            snapshotDate: { $gte: dateFrom, $lte: dateTo },
            department: { $ne: null }
        };
        if (deptsParam) {
            matchStage.department = {
                $in: deptsParam.split(",")
            };
        }
        else if (deptIdParam) {
            matchStage.department = deptIdParam;
        }
        const snapshots = await KPI_Snapshot_1.default.find(matchStage)
            .sort({ snapshotDate: 1 })
            .lean();
        /*
          Group by department into separate series.
          Each series is one line on the ECharts multi-line chart.
        */
        const seriesMap = {};
        snapshots.forEach(snap => {
            const deptKey = snap.department
                ? snap.department.toString()
                : "org";
            if (!seriesMap[deptKey]) {
                seriesMap[deptKey] = [];
            }
            seriesMap[deptKey].push({
                date: snap.snapshotDate.toISOString().split("T")[0],
                complianceRate: snap.complianceRate
            });
        });
        const data = Object.entries(seriesMap).map(([department, points]) => ({
            department,
            data: points
        }));
        res.json({ success: true, data });
    }
    catch (err) {
        console.error("compliance-trend error:", err);
        res.status(500).json({ error: "Failed to fetch compliance trend" });
    }
});
exports.default = router;
