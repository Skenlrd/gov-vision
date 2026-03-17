import mongoose, { Schema } from "mongoose"

/*
  Module 3's primary analytics collection.

  Each document represents one day's KPI state
  for one department (or null for org-wide aggregate).

  Documents are upserted — one document per
  (departmentId + snapshotDate) pair.
  Calling aggregateKPI() twice on the same day
  updates the existing document rather than
  creating a duplicate.
*/

const kpiSnapshotSchema = new Schema(
  {

    /*
      null means this is an org-wide aggregate snapshot.
      A canonical department ID means this is a department-specific snapshot.
    */
    departmentId: {
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

  },
  {
    collection: "m3_kpi_snapshots"
  }
)

// Compound index so upsert matching is fast
kpiSnapshotSchema.index({ departmentId: 1, snapshotDate: 1 })

export default mongoose.model("KPI_Snapshot", kpiSnapshotSchema)