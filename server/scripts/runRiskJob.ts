import dotenv from "dotenv"
import path from "path"
import { connectMongo } from "../config/db"
import { runRiskScoringJob } from "../jobs/riskScoringJob"

dotenv.config({ path: path.resolve(__dirname, "../.env") })

async function main(): Promise<void> {
  await connectMongo()
  await runRiskScoringJob()
  console.log("Manual risk run completed")
  process.exit(0)
}

main().catch((error) => {
  console.error("Manual risk run failed:", error)
  process.exit(1)
})
