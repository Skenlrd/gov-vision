import cron from "node-cron"
import axios from "axios"
import mongoose from "mongoose"
import m1Decision from "../models/m1Decisions"
import Anomaly from "../models/Anomaly"
import { invalidate } from "../services/cacheService"

interface ILeanDecision {
	_id: any
	cycleTimeHours?: number
	rejectionCount?: number
	revisionCount?: number
	daysOverSLA?: number
	stageCount?: number
	hourOfDaySubmitted?: number
	department?: string
	departmentId?: string
	departmentName?: string
}

export async function runAnomalyDetection(): Promise<void> {
	console.log("[AnomalyJob] Starting anomaly detection run...")

	const decisions = await m1Decision.find({
		completedAt: { $exists: true, $ne: null }
	})
		.select(
			"_id cycleTimeHours rejectionCount revisionCount daysOverSLA department"
		)
		.lean<ILeanDecision[]>()

	if (decisions.length === 0) {
		console.log("[AnomalyJob] No completed decisions found. Skipping.")
		return
	}

	console.log(`[AnomalyJob] Loaded ${decisions.length} decisions for scoring.`)

	const payload = decisions.map((d) => ({
		id: d._id.toString(),
		cycleTimeHours: d.cycleTimeHours || 0,
		rejectionCount: d.rejectionCount || 0,
		revisionCount: d.revisionCount || 0,
		daysOverSLA: d.daysOverSLA || 0
	}))

	let results: Array<{
		id: string
		anomalyScore: number
		isAnomaly: boolean
		severity: string
	}> = []

	try {
		const response = await axios.post<{ results: typeof results }>(
			`${process.env.ML_SERVICE_URL}/ml/anomaly/predict`,
			{ decisions: payload },
			{ headers: { "x-service-key": process.env.SERVICE_KEY } }
		)

		results = response.data.results
		console.log(`[AnomalyJob] FastAPI returned ${results.length} scores.`)
	} catch (err: any) {
		console.error("[AnomalyJob] FastAPI call failed:", err.message)
		return
	}

	const anomalies = results.filter((r) => r.isAnomaly === true)
	console.log(`[AnomalyJob] ${anomalies.length} anomalies detected.`)

	for (const anomaly of anomalies) {
		const original = decisions.find((d) => d._id.toString() === anomaly.id)
		const featureValues = original
			? {
				cycleTimeHours: original.cycleTimeHours || 0,
				rejectionCount: original.rejectionCount || 0,
				revisionCount: original.revisionCount || 0,
				daysOverSLA: original.daysOverSLA || 0
			}
			: {}

		if (!mongoose.Types.ObjectId.isValid(anomaly.id)) {
			continue
		}

		const decisionObjectId = new mongoose.Types.ObjectId(anomaly.id)

		await Anomaly.findOneAndUpdate(
			{ decisionId: decisionObjectId },
			{
				$set: {
					anomalyScore: anomaly.anomalyScore,
					severity: anomaly.severity,
					isAnomaly: true,
					department: original?.department || "unknown",
					featureValues,
					description: `Anomaly detected: score ${anomaly.anomalyScore.toFixed(3)}, severity ${anomaly.severity}`
				},
				$setOnInsert: {
					isAcknowledged: false,
					decisionId: decisionObjectId
				}
			},
			{ upsert: true, new: true }
		)
	}

	await invalidate("m3:anomalies:active")
	console.log("[AnomalyJob] Redis cache invalidated. Run complete.")
}

export async function runAnomalyJob(): Promise<void> {
	await runAnomalyDetection()
}

cron.schedule("0 0 * * *", () => {
	runAnomalyJob().catch((err) => {
		console.error("[AnomalyJob] Uncaught error in cron run:", err)
	})
})

console.log("[AnomalyJob] Scheduled: every 24 hours (daily at 00:00).")
