import m1Decision from "../models/m1Decisions"
import Anomaly from "../models/Anomaly"
import mongoose from "mongoose"
import {
	callAnomalyPredict,
	IAnomalyPredictInput
} from "../services/mlService"

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
	try {
		const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000))

		const decisions = await m1Decision.find({
			createdAt: { $gte: thirtyDaysAgo },
			completedAt: { $exists: true, $ne: null }
		})
			.select("_id cycleTimeHours rejectionCount revisionCount daysOverSLA stageCount hourOfDaySubmitted department departmentId departmentName")
			.lean<ILeanDecision[]>()

		if (!decisions.length) {
			console.log("[AnomalyJob] No decisions found for the last 30 days")
			return
		}

		const mappedPayload: IAnomalyPredictInput[] = decisions.map((d) => ({
			id: String(d._id),
			cycleTimeHours: Number(d.cycleTimeHours ?? 0),
			rejectionCount: Number(d.rejectionCount ?? 0),
			revisionCount: Number(d.revisionCount ?? 0),
			daysOverSLA: Number(d.daysOverSLA ?? 0),
			stageCount: Number(d.stageCount ?? 0),
			hourOfDaySubmitted: Number(d.hourOfDaySubmitted ?? 0)
		}))

		const predictions = await callAnomalyPredict(mappedPayload)

		const byId = new Map(decisions.map((d) => [String(d._id), d]))
		let anomalyCount = 0

		for (const prediction of predictions) {
			if (!prediction.isAnomaly) {
				continue
			}

			anomalyCount += 1
			const sourceDecision = byId.get(prediction.id)
			if (!mongoose.Types.ObjectId.isValid(prediction.id)) {
				continue
			}

			const decisionObjectId = new mongoose.Types.ObjectId(prediction.id)

			await Anomaly.updateOne(
				{ decisionId: decisionObjectId },
				{
					$set: {
						decisionId: decisionObjectId,
						department:
							sourceDecision?.departmentName ??
							sourceDecision?.departmentId ??
							"Unknown",
						anomalyScore: Number(prediction.anomalyScore ?? 0),
						severity: prediction.severity,
						isAcknowledged: false,
						description: "Isolation Forest anomaly detected",
						featureValues: {
							cycleTimeHours: Number(sourceDecision?.cycleTimeHours ?? 0),
							rejectionCount: Number(sourceDecision?.rejectionCount ?? 0),
							revisionCount: Number(sourceDecision?.revisionCount ?? 0),
							daysOverSLA: Number(sourceDecision?.daysOverSLA ?? 0),
							stageCount: Number(sourceDecision?.stageCount ?? 0),
							hourOfDaySubmitted: Number(sourceDecision?.hourOfDaySubmitted ?? 0)
						}
					}
				},
				{ upsert: true }
			)
		}

		console.log(`[AnomalyJob] Processed ${predictions.length} decisions, found ${anomalyCount} anomalies`)
	} catch (error) {
		console.error("[AnomalyJob] Failed to run anomaly detection:", error)
	}
}
