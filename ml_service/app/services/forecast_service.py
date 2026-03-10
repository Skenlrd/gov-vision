def generate_forecast(payload: dict):
	horizon = int(payload.get("horizon", 7))
	return {
		"horizon": horizon,
		"forecastData": [],
	}
