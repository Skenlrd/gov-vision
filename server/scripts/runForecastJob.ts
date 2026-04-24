import dotenv from "dotenv"
import path from "path"

import { connectMongo } from "../config/db"
import { runForecastJob } from "../jobs/forecastJob"

dotenv.config({ path: path.join(__dirname, '../.env') })

async function main(): Promise<void> {
  await connectMongo()
  await runForecastJob()
  console.log("Manual forecast run completed")
  process.exit(0)
}

main().catch((error) => {
  console.error("Manual forecast run failed:", error)
  process.exit(1)
})