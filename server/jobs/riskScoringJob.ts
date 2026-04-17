import cron from "node-cron"
import axios from "axios"

import KPI_Snapshot from "../models/KPI_Snapshot"
import { invalidate } from "../services/cacheService"

type RiskFeatureVector = {
	dept: string
	violationCount: number
	openViolationRate: number
	avgCompositeRisk: number
	overdueCount: number
	complianceRate: number
	policyBreachFreq: number
	escalationCount: number
}

type RiskScore = {
	dept: string
	score: number
	level: "low" | "medium" | "high" | "critical"
	featureImportance?: Record<string, number>
}

function toNumber(value: unknown, fallback = 0): number {
	const parsed = Number(value)
	return Number.isFinite(parsed) ? parsed : fallback
}

export async function runRiskScoringJob(): Promise<void> {
	console.log("[RiskJob] Starting risk scoring run...")

	const departments = await KPI_Snapshot.distinct("departmentId") as Array<string | null>
	const filteredDepartments = Array.from(
		new Set(departments.filter((dept): dept is string => typeof dept === "string" && dept.length > 0))
	)

	if (filteredDepartments.length === 0) {
		console.log("[RiskJob] No departments found in KPI snapshots. Skipping run.")
		return
	}

	const features: RiskFeatureVector[] = []

	for (const dept of filteredDepartments) {
		const snapshot = await KPI_Snapshot
			.findOne({ departmentId: dept })
			.sort({ snapshotDate: -1 })
			.lean() as Record<string, unknown> | null

		features.push({
			dept,
			violationCount: toNumber(snapshot?.violationCount),
			openViolationRate: toNumber(snapshot?.openViolationRate ?? snapshot?.openViolationsRate),
			avgCompositeRisk: toNumber(snapshot?.avgCompositeRisk ?? snapshot?.riskScore),
			overdueCount: toNumber(snapshot?.overdueCount ?? snapshot?.overdueApprovalCount),
			complianceRate: toNumber(snapshot?.complianceRate, 75),
			policyBreachFreq: toNumber(snapshot?.policyBreachFreq ?? snapshot?.policyBreachFrequency),
			escalationCount: toNumber(snapshot?.escalationCount),
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
