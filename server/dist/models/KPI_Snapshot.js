"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
/*
  Module 3's primary analytics collection.

  Each document represents one day's KPI state
  for one department (or null for org-wide aggregate).

  Documents are upserted — one document per
  (department + snapshotDate) pair.
  Calling aggregateKPI() twice on the same day
  updates the existing document rather than
  creating a duplicate.
*/
const kpiSnapshotSchema = new mongoose_1.Schema({
    /*
      null means this is an org-wide aggregate snapshot.
      A canonical string means this is a department-specific snapshot.
    */
    department: {
        type: String,
        default: null
    },
    snapshotDate: {
        type: Date,
        required: true
    },
    // Decision counts from m1_decisions
    totalDecisions: {
        type: Number,
        default: 0
    },
    approvedCount: {
        type: Number,
        default: 0
    },
    rejectedCount: {
        type: Number,
        default: 0
    },
    pendingCount: {
        type: Number,
        default: 0
    },
    // Average of (completedAt - createdAt) in hours
    // Only computed for decisions that have completedAt set
    avgCycleTimeHours: {
        type: Number,
        default: 0
    },
    // Violation counts from m2_violations
    violationCount: {
        type: Number,
        default: 0
    },
    openViolations: {
        type: Number,
        default: 0
    },
    // ((totalDecisions - violationCount) / totalDecisions) * 100
    complianceRate: {
        type: Number,
        default: 100
    },
    // Filled in later by anomaly detection cron job (Day 7)
    anomalyCount: {
        type: Number,
        default: 0
    },
    // Filled in later by risk scoring cron job (Day 9)
    riskScore: {
        type: Number,
        default: 0
    },
    // Filled in later by risk scoring cron job (Day 9)
    riskLevel: {
        type: String,
        enum: ["low", "medium", "high", "critical"],
        default: "low"
    }
}, {
    collection: "m3_kpi_snapshots"
});
// Compound index so upsert matching is fast
kpiSnapshotSchema.index({ department: 1, snapshotDate: 1 });
exports.default = mongoose_1.default.model("KPI_Snapshot", kpiSnapshotSchema);
