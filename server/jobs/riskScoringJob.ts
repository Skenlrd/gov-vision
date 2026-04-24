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

	const departments = await m1Decision.distinct("departmentId", { source: 'ai_workflow' }) as Array<string | null>
	const filteredDepartments = Array.from(
		new Set(departments.filter((dept): dept is string => typeof dept === "string" && dept.length > 0))
	).filter(dept => dept && dept !== "null" && dept !== "undefined")

	if (filteredDepartments.length === 0) {
		console.log("[RiskJob] No departments found in decisions. Skipping run.")
		return
	}

	const features: RiskFeatureVector[] = []

	const decisions = await m1Decision.find({ departmentId: { $in: filteredDepartments }, source: 'ai_workflow' })
		.select("departmentId hourOfDaySubmitted revisionCount stageCount priority").lean()

	for (const d of decisions) {
		features.push({
			dept: (d.departmentId || "unknown") as string,
			hourOfDaySubmitted: d.hourOfDaySubmitted || 12,
			revisionCount: d.revisionCount || 0,
			stageCount: d.stageCount || 1,
			department: (d.departmentId || "unknown") as string,
			priority: (d.priority || "normal") as string
		})
	}

	if (features.length === 0) {
		console.log("[RiskJob] No decisions found to score. Skipping run.")
		return
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
		const rawScores = Array.isArray(response.data?.scores) ? response.data.scores : []
		console.log(`[RiskJob] FastAPI returned ${rawScores.length} individual scores`)
		
		const deptScores: Record<string, { totalScore: number, count: number, featureImportance: Record<string, number> }> = {}
		
		for (const s of rawScores) {
			if (!deptScores[s.dept]) {
				deptScores[s.dept] = { totalScore: 0, count: 0, featureImportance: s.featureImportance || {} }
			}
			deptScores[s.dept].totalScore += s.score
			deptScores[s.dept].count += 1
		}
		
		scores = Object.keys(deptScores).map(dept => {
			const avgScore = deptScores[dept].totalScore / deptScores[dept].count
			let level: "low" | "medium" | "high" | "critical" = "low"
			if (avgScore >= 80) level = "critical"
			else if (avgScore >= 60) level = "high"
			else if (avgScore >= 40) level = "medium"
			
			return {
				dept,
				score: avgScore,
				level,
				featureImportance: deptScores[dept].featureImportance
			}
		})
		console.log(`[RiskJob] Aggregated into ${scores.length} department scores`)
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

		// Use upsert to create snapshot if it doesn't exist
		const today = new Date()
		today.setHours(0, 0, 0, 0)

		const updateResult = await KPI_Snapshot.findOneAndUpdate(
			{ departmentId: score.dept, snapshotDate: today },
			{
				$set: {
					...setPayload,
					departmentId: score.dept,
					source: 'ai_workflow',
					snapshotDate: today,
					updatedAt: new Date()
				},
				$setOnInsert: {
					totalDecisions: 0,
					approvedCount: 0,
					rejectedCount: 0,
					pendingCount: 0,
					avgCycleTimeHours: 0,
					complianceRate: 100,
					createdAt: new Date()
				}
			},
			{
				upsert: true,
				new: true
			}
		)

		const action = updateResult ? (updateResult as any).createdAt?.getTime() === (updateResult as any).updatedAt?.getTime() ? 'Created' : 'Updated' : 'Failed'
		console.log(
			`[RiskJob] ${action} snapshot for ${score.dept}: score=${score.score}, level=${score.level}`
		)

		await invalidate(`m3:riskscore:${score.dept}`)
	}

	await invalidate("m3:riskheatmap:*")

	// Compute and save ORG-level average risk score
	if (scores.length > 0) {
		const avgOrgScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length
		let orgLevel: "low" | "medium" | "high" | "critical" = "low"
		if (avgOrgScore >= 80) orgLevel = "critical"
		else if (avgOrgScore >= 60) orgLevel = "high"
		else if (avgOrgScore >= 40) orgLevel = "medium"

		const today = new Date()
		today.setHours(0, 0, 0, 0)

		await KPI_Snapshot.findOneAndUpdate(
			{ departmentId: 'ORG', snapshotDate: today },
			{
				$set: {
					riskScore: avgOrgScore,
					riskLevel: orgLevel,
					source: 'ai_workflow',
					updatedAt: new Date()
				}
			},
			{ upsert: true }
		)
		console.log(`[RiskJob] Updated ORG snapshot: score=${avgOrgScore.toFixed(1)}, level=${orgLevel}`)
		await invalidate("m3:riskscore:ORG")
	}

	console.log("[RiskJob] Risk scoring run complete.")
}

cron.schedule("0 1 * * *", () => {
	runRiskScoringJob().catch((error) => {
		console.error("[RiskJob] Uncaught error in cron run:", error)
	})
})

console.log("[RiskJob] Scheduled: daily at 01:00.")
