import mongoose, { Schema } from "mongoose"

/*
  Read-only model for Module 2's violations collection.

  Module 3 uses this to:
  - Count violations per department
  - Compute compliance rate
  - Count open vs resolved violations
*/

const violationSchema = new Schema(
  {

    /*
      department is stored as a canonical plain string
      to match m1_decisions.department.
    */
    department: {
      type: String
    },

    severity: {
      type: String
    },

    // "open" or "resolved"
    status: {
      type: String
    },

    createdAt: {
      type: Date
    }

  },
  {
    collection: "m2_violations",
    strict: false
  }
)

export default mongoose.model("m2Violation", violationSchema)