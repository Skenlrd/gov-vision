import "dotenv/config"
import { connectMongo } from "../config/db"
import Anomaly from "../models/Anomaly"

async function main() {
  await connectMongo()

  const docs = await Anomaly.find()
    .sort({ updatedAt: -1 })
    .limit(5)
    .select("_id")
    .lean()

  const ids = docs.map((d: any) => d._id)

  if (ids.length === 0) {
    console.log("No anomaly docs found")
    process.exit(0)
  }

  const result = await Anomaly.updateMany(
    { _id: { $in: ids } },
    {
      $set: { isAcknowledged: false },
      $unset: { acknowledgedBy: "", acknowledgedAt: "" }
    }
  )

  const total = await Anomaly.countDocuments({ isAcknowledged: false })
  const grouped = await Anomaly.aggregate([
    { $match: { isAcknowledged: false } },
    { $group: { _id: "$severity", count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ])

  console.log(`Reset ${result.modifiedCount} anomalies to unacknowledged`)
  console.log(`Unacknowledged total: ${total}`)
  console.log(`By severity: ${JSON.stringify(grouped)}`)

  process.exit(0)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
