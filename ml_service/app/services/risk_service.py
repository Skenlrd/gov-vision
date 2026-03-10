def score_risk(payload: dict):
	return {
		"id": payload.get("id", "unknown"),
		"riskScore": 0.0,
		"riskLevel": "Low",
	}
