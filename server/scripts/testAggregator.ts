import dotenv from "dotenv"
dotenv.config()

import mongoose from "mongoose"
import { aggregateOrgKPI } from "../services/kpiAggregator"

async function test() {

  await mongoose.connect(process.env.MONGODB_URI!)
  console.log("Connected")

  const result = await aggregateOrgKPI(
    new Date("2026-01-01"),
    new Date()
  )

  console.log("\n--- KPI Result ---")
  console.log(JSON.stringify(result, null, 2))

  process.exit(0)

}

test().catch(err => {
  console.error(err)
  process.exit(1)
})