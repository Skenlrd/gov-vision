import mongoose, { Schema } from "mongoose"

/*
  Read-only model for Module 1's decision collection.

  Module 3 uses this to:
  - Count decisions by status
  - Compute average cycle time
  - Pull feature data for Isolation Forest anomaly detection

  strict: false allows extra fields from Module 1 to
  pass through without causing Mongoose validation errors.
*/

const decisionSchema = new Schema(
  {

    status: {
      type: String
    },

    /*
      department is an ObjectId referencing the shared
      departments collection.
      Used to group KPIs by department.
    */
    department: {
      type: Schema.Types.ObjectId,
      ref: "departments"
    },

    createdAt: {
      type: Date
    },

    completedAt: {
      type: Date
    },

    // These 5 fields are used as features by the
    // Isolation Forest model starting on Day 6

    cycleTimeHours: {
      type: Number
    },

    rejectionCount: {
      type: Number
    },

    revisionCount: {
      type: Number
    },

    daysOverSLA: {
      type: Number
    },

    stageCount: {
      type: Number
    }

  },
  {
    collection: "m1_decisions",
    strict: false
  }
)

export default mongoose.model("m1Decision", decisionSchema)