import mongoose, { Schema } from "mongoose"

/*
  Read-only model for Module 1's training decision collection (BPI dataset).

  This is used exclusively by the ML service to train the 
  Isolation Forest, Random Forest, and Prophet models.
*/

const trainingDecisionSchema = new Schema(
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
    source: { type: String, default: 'bpi_aggregated', index: true }
  },
  {
    collection: "m1_training_decisions",
    strict: true
  }
)

export default mongoose.model("m1TrainingDecision", trainingDecisionSchema)
