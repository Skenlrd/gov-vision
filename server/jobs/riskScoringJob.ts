import cron from "node-cron"
import axios from "axios"

import KPI_Snapshot from "../models/KPI_Snapshot"
import { invalidate } from "../services/cacheService"

import m1Decision from "../models/m1Decisions"

type RiskFeatureVector = {
	dept: string
	hourOfDaySubmitted: number
	revisionCount: number
	stageCount: number
	department: string
	priority: string
}

type RiskScore = {
	dept: string
	score: number
	level: "low" | "medium" | "high" | "critical"
	featureImportance?: Record<string, number>
}

export async function runRiskScoringJob(): Promise<void> {
	console.log("[RiskJob] Starting risk scoring run...")

	const departments = await m1Decision.distinct("department") as Array<string | null>
	const filteredDepartments = Array.from(
		new Set(departments.filter((dept): dept is string => typeof dept === "string" && dept.length > 0))
	)

	if (filteredDepartments.length === 0) {
		console.log("[RiskJob] No departments found in decisions. Skipping run.")
		return
	}

	const features: RiskFeatureVector[] = []

	for (const dept of filteredDepartments) {
		// Calculate averages for this department from m1_decisions
		const stats = await m1Decision.aggregate([
			{ $match: { department: dept } },
			{
				$group: {
					_id: "$department",
					avgRevisions: { $avg: "$revisionCount" },
					avgStages: { $avg: "$stageCount" },
					avgHour: { $avg: "$hourOfDaySubmitted" }
				}
			}
		])

		const s = stats[0] || {}
		features.push({
			dept,
			hourOfDaySubmitted: s.avgHour || 12,
			revisionCount: s.avgRevisions || 0,
			stageCount: s.avgStages || 1,
			department: dept,
			priority: "normal" // Default to normal for aggregate scoring
		})
	}

	let scores: RiskScore[] = []

	try {
		const response = await axios.post<{ scores: RiskScore[] }>(
			`${process.env.ML_SERVICE_URL}/ml/risk/score`,
			{ features },
			{
				headers: { "x-service-key": process.env.SERVICE_KEY },
				timeout: 30000,
			}
		)
		scores = Array.isArray(response.data?.scores) ? response.data.scores : []
		console.log(`[RiskJob] FastAPI returned scores for ${scores.length} departments`)
	} catch (error: any) {
		console.error("[RiskJob] FastAPI call failed:", error.message)
		return
	}

	for (const score of scores) {
		const setPayload: Record<string, unknown> = {
			riskScore: score.score,
			riskLevel: score.level,
		}

		if (score.featureImportance && typeof score.featureImportance === "object") {
			setPayload.featureImportance = score.featureImportance
		}

		const updateResult = await KPI_Snapshot.updateMany(
			{ departmentId: score.dept },
			{
				$set: setPayload,
			}
		)

		console.log(
			`[RiskJob] Updated ${updateResult.modifiedCount} snapshots for ${score.dept}: score=${score.score}, level=${score.level}`
		)

		await invalidate(`m3:riskscore:${score.dept}`)
	}

	await invalidate("m3:riskheatmap:*")

	console.log("[RiskJob] Risk scoring run complete.")
}

cron.schedule("0 1 * * *", () => {
	runRiskScoringJob().catch((error) => {
		console.error("[RiskJob] Uncaught error in cron run:", error)
	})
})

console.log("[RiskJob] Scheduled: daily at 01:00.")
