"""
train_risk_model.py

Train a Random Forest model for department risk classification.
Saves a scikit-learn pipeline under ml_service/models/risk/random_forest.pkl.
"""

from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

MODELS_DIR = Path(__file__).resolve().parents[1] / "models" / "risk"
MODELS_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_PATH = MODELS_DIR / "random_forest.pkl"

FEATURE_COLS = [
	"violationCount",
	"openViolationRate",
	"avgCompositeRisk",
	"overdueCount",
	"complianceRate",
	"policyBreachFreq",
	"escalationCount",
]


def build_synthetic_dataset(n_rows: int = 800) -> tuple[pd.DataFrame, np.ndarray]:
	"""Generate synthetic risk-feature rows and class labels for development training."""
	np.random.seed(42)

	frame = pd.DataFrame(
		{
			"violationCount": np.random.poisson(lam=3, size=n_rows),
			"openViolationRate": np.random.beta(a=2, b=5, size=n_rows),
			"avgCompositeRisk": np.random.uniform(low=0, high=100, size=n_rows),
			"overdueCount": np.random.poisson(lam=2, size=n_rows),
			"complianceRate": np.random.uniform(low=50, high=100, size=n_rows),
			"policyBreachFreq": np.random.exponential(scale=0.5, size=n_rows),
			"escalationCount": np.random.poisson(lam=1, size=n_rows),
		}
	)

	risk_score = (
		frame["avgCompositeRisk"] * 0.40
		+ frame["violationCount"] * 3.0
		+ frame["openViolationRate"] * 20.0
		+ frame["overdueCount"] * 2.0
		+ (100.0 - frame["complianceRate"]) * 0.50
	)

	labels = np.where(
		risk_score < 20,
		0,
		np.where(risk_score < 40, 1, np.where(risk_score < 65, 2, 3)),
	)

	return frame, labels


def main() -> None:
	print("Generating synthetic training data...")
	data, labels = build_synthetic_dataset(800)

	print(
		"Class distribution:",
		f"Low={np.sum(labels == 0)}",
		f"Medium={np.sum(labels == 1)}",
		f"High={np.sum(labels == 2)}",
		f"Critical={np.sum(labels == 3)}",
	)

	x_train, x_test, y_train, y_test = train_test_split(
		data[FEATURE_COLS],
		labels,
		test_size=0.2,
		random_state=42,
		stratify=labels,
	)

	print("Training RandomForestClassifier (200 trees)...")
	pipeline = Pipeline(
		[
			("scaler", StandardScaler()),
			(
				"classifier",
				RandomForestClassifier(
					n_estimators=200,
					max_depth=10,
					class_weight="balanced",
					random_state=42,
					n_jobs=-1,
				),
			),
		]
	)

	pipeline.fit(x_train, y_train)

	print("\nModel evaluation on held-out test set:")
	predictions = pipeline.predict(x_test)
	print(
		classification_report(
			y_test,
			predictions,
			target_names=["Low", "Medium", "High", "Critical"],
		)
	)

	importances = pipeline.named_steps["classifier"].feature_importances_
	print("Feature importances:")
	for name, importance in sorted(
		zip(FEATURE_COLS, importances), key=lambda item: item[1], reverse=True
	):
		print(f"  {name:25s}: {importance:.4f} ({importance * 100:.1f}%)")

	joblib.dump(pipeline, OUTPUT_PATH)
	print(f"\nModel saved to: {OUTPUT_PATH}")


if __name__ == "__main__":
	main()
