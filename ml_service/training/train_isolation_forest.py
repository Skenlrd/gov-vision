"""
training/train_isolation_forest.py

Run ONCE manually from terminal.
Never import this file anywhere.
It is a standalone training script only.

Run with: python training/train_isolation_forest.py
"""

import os
from pathlib import Path

import joblib
import pandas as pd
from dotenv import load_dotenv
from pymongo import MongoClient
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

# Always resolve .env relative to ml_service/, not caller cwd.
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

# -- 1. Connect to MongoDB -------------------------------------------------
MONGODB_URI = os.getenv("MONGODB_URI")
if not MONGODB_URI:
	raise ValueError("MONGODB_URI not found in .env file")

print("Connecting to MongoDB...")
client = MongoClient(MONGODB_URI)
db = client["govvision"]
collection = db["m1_decisions"]

# -- 2. Pull only completed decisions --------------------------------------
# completedAt must exist -- pending decisions have no cycle time
print("Pulling decisions from MongoDB...")

cursor = collection.find(
	{"completedAt": {"$exists": True}},
	{
		"cycleTimeHours": 1,
		"rejectionCount": 1,
		"revisionCount": 1,
		"daysOverSLA": 1,
		"stageCount": 1,
		"hourOfDaySubmitted": 1,
		"_id": 0,
	},
)

documents = list(cursor)
print(f"Loaded {len(documents)} completed decisions for training")

if len(documents) < 10:
	raise ValueError(
		f"Only {len(documents)} documents found. "
		"Run importCSV.ts first to populate m1_decisions."
	)

# -- 3. Build DataFrame -----------------------------------------------------
FEATURE_COLUMNS = [
	"cycleTimeHours",
	"rejectionCount",
	"revisionCount",
	"daysOverSLA",
	"stageCount",
	"hourOfDaySubmitted",
]

df = pd.DataFrame(documents)

# Fill any missing values with column mean
# This handles documents where a field is missing entirely
for col in FEATURE_COLUMNS:
	if col not in df.columns:
		df[col] = 0
	df[col] = pd.to_numeric(df[col], errors="coerce")
	df[col] = df[col].fillna(df[col].mean())

print(f"Feature matrix shape: {df[FEATURE_COLUMNS].shape}")
print("Feature means:")
print(df[FEATURE_COLUMNS].mean().round(3))

# -- 4. Build matrix --------------------------------------------------------
X = df[FEATURE_COLUMNS].values

# -- 5. Normalize with StandardScaler --------------------------------------
# IMPORTANT: fit_transform is used HERE during training only.
# During prediction in anomaly_service.py use scaler.transform().
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

print("Data normalized with StandardScaler")
print(f"Scaler means: {scaler.mean_.round(3)}")

# -- 6. Train Isolation Forest ----------------------------------------------
# contamination=0.05 means model expects 5% of decisions to be anomalous.
# n_estimators=100 means 100 isolation trees in the ensemble.
# random_state=42 makes results reproducible.
print("Training Isolation Forest model...")

model = IsolationForest(
	n_estimators=100,
	contamination=0.05,
	random_state=42,
)
model.fit(X_scaled)

print("Model trained successfully")

# -- 7. Save both files -----------------------------------------------------
models_dir = Path(__file__).resolve().parents[1] / "models"
models_dir.mkdir(parents=True, exist_ok=True)

model_path = models_dir / "isolation_forest.pkl"
scaler_path = models_dir / "isolation_forest_scaler.pkl"

joblib.dump(model, model_path)
joblib.dump(scaler, scaler_path)

print(f"Model saved  -> {model_path}")
print(f"Scaler saved -> {scaler_path}")
print()
print("training complete")
