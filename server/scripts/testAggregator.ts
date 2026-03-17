import dotenv from "dotenv"
dotenv.config()

import mongoose from "mongoose"
import {
  aggregateOrgKPI,
  aggregateAllDepartments
} from "../services/kpiAggregator"

async function test() {

  await mongoose.connect(process.env.MONGODB_URI!)
  console.log("Connected")

  const startDate = new Date("2025-01-01")
  const endDate = new Date()

  const orgResult = await aggregateOrgKPI(
    startDate,
    endDate
  )

  await aggregateAllDepartments(
    startDate,
    endDate
  )

  console.log("\n--- ORG KPI ---")
  console.log(JSON.stringify(orgResult, null, 2))
  console.log("\n--- All department snapshots saved ---")

  process.exit(0)

}

test().catch(err => {
  console.error(err)
  process.exit(1)
})