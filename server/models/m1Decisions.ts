import mongoose, { Schema } from "mongoose"

/*
  Model for Module 1's live decision collection (AI Workflow dataset).

  This is used by the dashboard for all KPIs and analytics,
  and by the anomalyJob to score new decisions against the frozen model.
*/

const decisionSchema = new Schema(
  {
    decisionId: { type: String, index: true },
    status: { type: String },
    department: { type: String },
    departmentId: { type: String, index: true },
    departmentName: { type: String },
    createdAt: { type: Date, index: true },
    completedAt: { type: Date },
    cycleTimeHours: { type: Number },
    rejectionCount: { type: Number },
    revisionCount: { type: Number },
    daysOverSLA: { type: Number },
    stageCount: { type: Number },
    hourOfDaySubmitted: { type: Number },
    priority: { type: String },
    
    // Live Tracking & ML Scoring Fields
    source: { type: String, default: 'ai_workflow', index: true },
    isScored: { type: Boolean, default: false, index: true },
    anomalyScore: { type: Number },
    isAnomaly: { type: Boolean },
    lastScoredAt: { type: Date }
  },
  {
    collection: "m1_decisions",
    strict: true
  }
)

// Compound index to quickly find unscored completed cases
decisionSchema.index({ isScored: 1, completedAt: -1 })

export default mongoose.model("m1Decision", decisionSchema)