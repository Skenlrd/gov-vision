"""
train_prophet.py

Train Prophet forecasting models from historical decision data.

This script trains two Prophet model families:
1) volume: daily decision counts
2) delay: average cycle time hours per day

Each family is trained per department plus org-level and saved under
ml_service/models/forecast/.
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
MODELS_DIR = Path(__file__).resolve().parents[1] / "models" / "forecast"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

TARGET_PREFIX = {
	"volume": "prophet",
	"delay": "prophet_delay",
	"approval_rate": "prophet_approval_rate",
	"rejection_rate": "prophet_rejection_rate",
	"pending_workload": "prophet_pending_workload",
	"sla_misses": "prophet_sla_misses",
}


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
	if "status" not in df.columns:
		df["status"] = ""
	if "daysOverSLA" not in df.columns:
		df["daysOverSLA"] = 0

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
	df["daysOverSLA"] = pd.to_numeric(df["daysOverSLA"], errors="coerce").fillna(0)
	df["status"] = df["status"].astype(str).str.lower().str.strip()

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


def build_target_series(target: str, df_dept: pd.DataFrame) -> pd.DataFrame:
	"""Build a daily ds/y time series for the requested forecast target."""
	if target == "volume":
		return df_dept.groupby("ds").size().reset_index(name="y").sort_values("ds")

	if target == "delay":
		df_delay = df_dept.dropna(subset=["cycleTimeHours"]).copy()
		if df_delay.empty:
			return pd.DataFrame(columns=["ds", "y"])
		return (
			df_delay.groupby("ds")["cycleTimeHours"]
			.mean()
			.reset_index(name="y")
			.sort_values("ds")
		)

	if target in ("approval_rate", "rejection_rate"):
		daily = (
			df_dept.groupby("ds")
			.agg(
				total=("status", "size"),
				approved=("status", lambda s: (s == "approved").sum()),
				rejected=("status", lambda s: (s == "rejected").sum()),
			)
			.reset_index()
			.sort_values("ds")
		)

		if target == "approval_rate":
			daily["y"] = (daily["approved"] / daily["total"].clip(lower=1)) * 100.0
		else:
			daily["y"] = (daily["rejected"] / daily["total"].clip(lower=1)) * 100.0

		return daily[["ds", "y"]]

	if target == "pending_workload":
		df_pending = df_dept[df_dept["status"] == "pending"].copy()
		if df_pending.empty:
			return pd.DataFrame(columns=["ds", "y"])
		return df_pending.groupby("ds").size().reset_index(name="y").sort_values("ds")

	if target == "sla_misses":
		df_sla = df_dept[df_dept["daysOverSLA"] > 0].copy()
		if df_sla.empty:
			return pd.DataFrame(columns=["ds", "y"])
		return df_sla.groupby("ds").size().reset_index(name="y").sort_values("ds")

	raise ValueError(f"Unsupported target: {target}")


def _fit_and_save_model(dept_id: str, target: str, daily: pd.DataFrame, prefix: str) -> bool:
	"""Fit a Prophet model on daily ds/y points and persist to disk."""
	if len(daily) < 10:
		print(f"  Skipping {dept_id} ({target}): only {len(daily)} points (need >= 10)")
		return False

	date_range = pd.date_range(daily["ds"].min(), daily["ds"].max(), freq="D")
	daily = daily.set_index("ds").reindex(date_range).reset_index()
	daily.columns = ["ds", "y"]

	if target == "delay":
		daily["y"] = daily["y"].ffill().bfill()
	else:
		daily["y"] = daily["y"].fillna(0.0)

	if daily["y"].isna().all():
		print(f"  Skipping {dept_id} ({target}): no valid target values")
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


def train_target_for_department(dept_id: str, target: str, df_dept: pd.DataFrame) -> bool:
	"""Train one target-specific Prophet model for one department."""
	if df_dept.empty:
		print(f"  Skipping {dept_id} ({target}): no training rows available")
		return False

	daily = build_target_series(target, df_dept)
	if daily.empty:
		print(f"  Skipping {dept_id} ({target}): no usable rows for target")
		return False

	prefix = TARGET_PREFIX[target]
	return _fit_and_save_model(dept_id, target, daily, prefix)


def main() -> None:
	print("Loading decisions from MongoDB...")
	df = get_decisions()
	print(f"Loaded {len(df)} decisions across {df['department'].nunique()} departments.")

	trained_counts = {target: 0 for target in TARGET_PREFIX}
	for dept_id in df["department"].dropna().unique():
		dept_df = df[df["department"] == dept_id].copy()
		for target in TARGET_PREFIX:
			print(f"Training Prophet {target} for department: {dept_id}")
			if train_target_for_department(str(dept_id), target, dept_df):
				trained_counts[target] += 1

	for target in TARGET_PREFIX:
		print(f"Training org-level Prophet {target} model...")
		if train_target_for_department("org", target, df):
			trained_counts[target] += 1

	total_models = sum(trained_counts.values())
	print("\nProphet training complete.")
	for target, count in trained_counts.items():
		print(f"{target}: {count} models saved")
	print(f"Total: {total_models}")


if __name__ == "__main__":
	main()
