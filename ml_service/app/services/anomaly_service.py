def detect_anomaly(payload: dict):
	return {
		"id": payload.get("id", "unknown"),
		"anomalyScore": 0.0,
		"isAnomaly": False,
		"severity": "Normal",
	}
