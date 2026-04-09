"""
train_prophet.py

Train Prophet forecasting models from historical decision data.

This script trains two Prophet model families:
1) volume: daily decision counts
2) delay: average cycle time hours per day

Each family is trained per department plus org-level and saved under
ml_service/models/.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import joblib
import pandas as pd
from dotenv import load_dotenv
from prophet import Prophet
from pymongo import MongoClient

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_DB = os.getenv("MONGODB_DB", "govvision")
MODELS_DIR = Path(__file__).resolve().parents[1] / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)


def get_database(client: MongoClient):
	"""Return the configured MongoDB database, falling back to govvision."""
	try:
		return client.get_default_database()
	except Exception:
		return client[MONGODB_DB]


def get_decisions() -> pd.DataFrame:
	"""Load decisions from MongoDB and normalize them into a training frame."""
	if not MONGODB_URI:
		print("ERROR: MONGODB_URI not found in ml_service/.env")
		sys.exit(1)

	client = MongoClient(MONGODB_URI)
	db = get_database(client)

	decisions = list(
		db["m1_decisions"].find(
			{
				"completedAt": {"$exists": True, "$ne": None},
				"createdAt": {"$exists": True, "$ne": None},
				"$or": [
					{"department": {"$exists": True, "$ne": None}},
					{"departmentId": {"$exists": True, "$ne": None}},
					{"departmentName": {"$exists": True, "$ne": None}},
				],
			},
			{
				"_id": 0,
				"createdAt": 1,
				"completedAt": 1,
				"cycleTimeHours": 1,
				"department": 1,
				"departmentId": 1,
				"departmentName": 1,
			},
		)
	)

	client.close()

	if not decisions:
		print("ERROR: No completed decisions found in m1_decisions.")
		sys.exit(1)

	df = pd.DataFrame(decisions)
	df["createdAt"] = pd.to_datetime(df["createdAt"], errors="coerce")
	df["completedAt"] = pd.to_datetime(df.get("completedAt"), errors="coerce")

	if "cycleTimeHours" not in df.columns:
		df["cycleTimeHours"] = None

	if "department" not in df.columns:
		df["department"] = None
	if "departmentId" not in df.columns:
		df["departmentId"] = None
	if "departmentName" not in df.columns:
		df["departmentName"] = None

	df["department"] = (
		df["department"]
		.fillna(df["departmentId"])
		.fillna(df["departmentName"])
	)

	df = df.dropna(subset=["createdAt", "department"]).copy()
	if df.empty:
		print("ERROR: Decision data could not be normalized into training rows.")
		sys.exit(1)

	df["ds"] = df["createdAt"].dt.floor("D")
	df["cycleTimeHours"] = pd.to_numeric(df["cycleTimeHours"], errors="coerce")

	# Backfill missing cycleTimeHours from completedAt - createdAt.
	missing_cycle = df["cycleTimeHours"].isna() & df["completedAt"].notna()
	df.loc[missing_cycle, "cycleTimeHours"] = (
		(df.loc[missing_cycle, "completedAt"] - df.loc[missing_cycle, "createdAt"])
		.dt.total_seconds()
		/ 3600.0
	)

	# Discard invalid negative cycle durations.
	df.loc[df["cycleTimeHours"] < 0, "cycleTimeHours"] = pd.NA
	return df


def _fit_and_save_model(dept_id: str, daily: pd.DataFrame, prefix: str) -> bool:
	"""Fit a Prophet model on daily ds/y points and persist to disk."""
	if len(daily) < 10:
		print(f"  Skipping {dept_id} ({prefix}): only {len(daily)} points (need >= 10)")
		return False

	date_range = pd.date_range(daily["ds"].min(), daily["ds"].max(), freq="D")
	daily = daily.set_index("ds").reindex(date_range).reset_index()
	daily.columns = ["ds", "y"]

	if prefix == "prophet":
		daily["y"] = daily["y"].fillna(0.0)
	else:
		daily["y"] = daily["y"].ffill().bfill()

	if daily["y"].isna().all():
		print(f"  Skipping {dept_id} ({prefix}): no valid target values")
		return False

	model = Prophet(
		yearly_seasonality=True,
		weekly_seasonality=True,
		daily_seasonality=False,
		interval_width=0.95,
		changepoint_prior_scale=0.05,
	)
	model.fit(daily)

	safe_dept_id = dept_id.replace("/", "_").replace(" ", "_")
	path = MODELS_DIR / f"{prefix}_{safe_dept_id}.pkl"
	joblib.dump(model, path)
	print(f"  Saved: {path}")
	return True


def train_volume_for_department(dept_id: str, df_dept: pd.DataFrame) -> bool:
	"""Train daily decision volume Prophet model for one department."""
	if df_dept.empty:
		print(f"  Skipping {dept_id} (volume): no training rows available")
		return False

	daily = df_dept.groupby("ds").size().reset_index(name="y").sort_values("ds")
	return _fit_and_save_model(dept_id, daily, "prophet")


def train_delay_for_department(dept_id: str, df_dept: pd.DataFrame) -> bool:
	"""Train average cycle-time-hours Prophet model for one department."""
	if df_dept.empty:
		print(f"  Skipping {dept_id} (delay): no training rows available")
		return False

	df_delay = df_dept.dropna(subset=["cycleTimeHours"]).copy()
	if df_delay.empty:
		print(f"  Skipping {dept_id} (delay): no cycleTimeHours data")
		return False

	daily = (
		df_delay.groupby("ds")["cycleTimeHours"]
		.mean()
		.reset_index(name="y")
		.sort_values("ds")
	)
	return _fit_and_save_model(dept_id, daily, "prophet_delay")


def main() -> None:
	print("Loading decisions from MongoDB...")
	df = get_decisions()
	print(f"Loaded {len(df)} decisions across {df['department'].nunique()} departments.")

	trained_volume = 0
	trained_delay = 0
	for dept_id in df["department"].dropna().unique():
		print(f"Training Prophet volume for department: {dept_id}")
		dept_df = df[df["department"] == dept_id].copy()
		if train_volume_for_department(str(dept_id), dept_df):
			trained_volume += 1

		print(f"Training Prophet delay for department: {dept_id}")
		if train_delay_for_department(str(dept_id), dept_df):
			trained_delay += 1

	print("Training org-level Prophet volume model...")
	if train_volume_for_department("org", df):
		trained_volume += 1

	print("Training org-level Prophet delay model...")
	if train_delay_for_department("org", df):
		trained_delay += 1

	print(
		"\nProphet training complete. "
		f"Volume models saved: {trained_volume}, "
		f"Delay models saved: {trained_delay}, "
		f"Total: {trained_volume + trained_delay}"
	)


if __name__ == "__main__":
	main()
