import dotenv from "dotenv"
import path from "path"
import { connectMongo } from "../config/db"
import { runAnomalyJob } from "../jobs/anomalyJob"

dotenv.config({ path: path.resolve(__dirname, "../.env") })

async function main(): Promise<void> {
  await connectMongo()
  await runAnomalyJob()
  console.log("Manual anomaly run completed")
  process.exit(0)
}

main().catch((error) => {
  console.error("Manual anomaly run failed:", error)
  process.exit(1)
})
