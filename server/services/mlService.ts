import axios from "axios"

export interface IAnomalyPredictInput {
	id: string
	cycleTimeHours: number
	rejectionCount: number
	revisionCount: number
	daysOverSLA: number
	stageCount: number
	hourOfDaySubmitted: number
}

export interface IAnomalyPredictOutput {
	id: string
	anomalyScore: number
	isAnomaly: boolean
	severity: string
}

export async function callAnomalyPredict(
	decisions: IAnomalyPredictInput[]
): Promise<IAnomalyPredictOutput[]> {
	const baseUrl = process.env.ML_SERVICE_URL
	const serviceKey = process.env.SERVICE_KEY

	if (!baseUrl) {
		throw new Error("ML_SERVICE_URL is not configured")
	}

	if (!serviceKey) {
		throw new Error("SERVICE_KEY is not configured")
	}

	const url = `${baseUrl}/ml/anomaly/predict`

	const responses = await Promise.all(
		decisions.map(async (decision) => {
			const response = await axios.post(url, decision, {
				headers: {
					"x-service-key": serviceKey
				}
			})

			return response.data as IAnomalyPredictOutput
		})
	)

	return responses
}
