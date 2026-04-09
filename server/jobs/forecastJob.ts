import cron from "node-cron"
import axios from "axios"

import { invalidate } from "../services/cacheService"
import m1Decision from "../models/m1Decisions"
import Forecast from "../models/Forecast"

const HORIZONS = [7, 14, 30]
const TARGETS = ["volume", "delay"] as const

export async function runForecastJob(): Promise<void> {
	console.log("[ForecastJob] Starting nightly forecast run...")

	let departments = await m1Decision.distinct<string>("department")
	if (!departments || departments.length === 0) {
		departments = await m1Decision.distinct<string>("departmentId")
	}
	if (!departments || departments.length === 0) {
		departments = await m1Decision.distinct<string>("departmentName")
	}
	const uniqueDepartments = Array.from(
		new Set([...(departments || []).filter(Boolean), "org"])
	)

	if (uniqueDepartments.length === 0) {
		console.log("[ForecastJob] No departments found. Skipping.")
		return
	}

	console.log(
		`[ForecastJob] Generating forecasts for ${uniqueDepartments.length} departments.`
	)

	for (const deptId of uniqueDepartments) {
		for (const target of TARGETS) {
			for (const horizon of HORIZONS) {
			try {
				const response = await axios.post<{
					dept_id: string
					horizon: number
					target: "volume" | "delay"
					forecast: Array<{
						ds: string
						yhat: number
						yhat_lower: number
						yhat_upper: number
					}>
				}>(
					`${process.env.ML_SERVICE_URL}/ml/forecast/predict`,
					{ dept_id: deptId, horizon, target },
					{ headers: { "x-service-key": process.env.SERVICE_KEY } }
				)

				const forecast = response.data.forecast || []

				if (forecast.length === 0) {
					console.warn(
						`[ForecastJob] No forecast rows returned for dept=${deptId}, target=${target}, horizon=${horizon}`
					)
					continue
				}

				await Forecast.findOneAndUpdate(
					{ department: deptId, target, horizon } as any,
					{
						$set: {
							department: deptId,
							target,
							horizon,
							generatedAt: new Date(),
							forecastData: forecast.map((point) => ({
								ds: new Date(point.ds),
								yhat: point.yhat,
								yhat_lower: point.yhat_lower,
								yhat_upper: point.yhat_upper,
							})),
						},
					} as any,
					{ upsert: true, returnDocument: "after" }
				)

				await invalidate(`m3:forecast:${deptId}:${target}:${horizon}`)

				console.log(
					`[ForecastJob] Done: dept=${deptId}, target=${target}, horizon=${horizon}d`
				)
			} catch (err: any) {
				console.error(
					`[ForecastJob] Failed dept=${deptId} target=${target} horizon=${horizon}:`,
					err.message
				)
			}
			}
		}
	}

	console.log("[ForecastJob] Nightly forecast run complete.")
}

cron.schedule("0 2 * * *", () => {
	runForecastJob().catch((err) =>
		console.error("[ForecastJob] Uncaught error:", err)
	)
})

console.log("[ForecastJob] Scheduled: nightly at 02:00.")
