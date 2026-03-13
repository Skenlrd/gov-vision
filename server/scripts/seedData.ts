import mongoose from "mongoose"
import dotenv from "dotenv"

dotenv.config()

import m1Decision from "../models/m1Decisions"
import m2Violation from "../models/m2Violations"

async function seed() {

  await mongoose.connect(process.env.MONGODB_URI!)
  console.log("Connected to MongoDB")

  await m1Decision.deleteMany({})
  await m2Violation.deleteMany({})

  /*
    Since Module 1's real departments collection doesn't
    exist yet, we generate fixed ObjectIds to represent
    each department. These are used consistently across
    both decisions and violations so grouping by department
    works correctly in the aggregator.

    When Module 1 is connected, replace these with the
    real _id values from the departments collection.
  */

  const deptIds = {
    finance:    new mongoose.Types.ObjectId(),
    hr:         new mongoose.Types.ObjectId(),
    legal:      new mongoose.Types.ObjectId(),
    operations: new mongoose.Types.ObjectId()
  }

  const deptList = Object.values(deptIds)

  const statuses = ["approved", "rejected", "pending"]

  const decisions = []

  for (let i = 0; i < 40; i++) {

    const dept = deptList[Math.floor(Math.random() * 4)]
    const status = statuses[Math.floor(Math.random() * 3)]
    const createdAt = new Date(2026, 2, 1 + (i % 30))

    const completedAt =
      status === "pending"
        ? null
        : new Date(
            createdAt.getTime() +
            Math.random() * 72 * 3600000
          )

    decisions.push({
      status,
      department: dept,
      createdAt,
      completedAt,
      cycleTimeHours:  Math.random() * 148,
      rejectionCount:  Math.floor(Math.random() * 6),
      revisionCount:   Math.floor(Math.random() * 4),
      daysOverSLA:     Math.floor(Math.random() * 8),
      stageCount:      Math.floor(Math.random() * 5) + 1
    })

  }

  await m1Decision.insertMany(decisions)
  console.log(`Inserted ${decisions.length} decisions`)

  const severities = ["low", "medium", "high"]
  const vStatuses  = ["open", "resolved"]
  const violations = []

  for (let i = 0; i < 12; i++) {

    violations.push({
      department: deptList[Math.floor(Math.random() * 4)],
      severity:   severities[Math.floor(Math.random() * 3)],
      status:     vStatuses[Math.floor(Math.random() * 2)],
      createdAt:  new Date(2026, 2, 3 + (i * 2))
    })

  }

  await m2Violation.insertMany(violations)
  console.log(`Inserted ${violations.length} violations`)

  /*
    Print the generated department IDs so you can
    use them in Postman tests on Day 3 when testing
    the /api/analytics/kpi-summary/:deptId endpoint.
  */
  console.log("\nDepartment ObjectIds for Postman testing:")
  Object.entries(deptIds).forEach(([name, id]) => {
    console.log(`  ${name}: ${id.toString()}`)
  })

  process.exit(0)

}

seed().catch(err => {
  console.error("Seed failed:", err)
  process.exit(1)
})