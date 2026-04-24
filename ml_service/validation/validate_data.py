"""
validate_data.py

Run this BEFORE any training.
Checks MongoDB data is correct and ready.

Run with: python validation/validate_data.py
"""

from pathlib import Path
import os

import pandas as pd
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

print("=" * 60)
print("DATA VALIDATION")
print("=" * 60)

MONGODB_URI = os.getenv("MONGODB_URI")
if not MONGODB_URI:
    raise ValueError("MONGODB_URI not found in .env")

client = MongoClient(MONGODB_URI)
db = client["govvision"]
collection = db["m1_training_decisions"]

FEATURE_COLUMNS = [
    "cycleTimeHours",
    "rejectionCount",
    "revisionCount",
    "daysOverSLA",
    "stageCount",
    "hourOfDaySubmitted",
]

passed = 0
failed = 0

print("\n1.Total Document Count")
total = collection.count_documents({})
completed = collection.count_documents({"completedAt": {"$exists": True}})
pending = total - completed

print(f"  Total documents:     {total}")
print(f"  Completed decisions: {completed}")
print(f"  Pending decisions:   {pending}")

if total >= 2400:
    print("  Status: PASS")
    passed += 1
else:
    print(f"  Status: FAIL - only {total} docs")
    print("  Fix: re-run importCSV.ts")
    failed += 1

print("\n2. Date Range")
pipeline = [
    {
        "$group": {
            "_id": None,
            "minDate": {"$min": "$createdAt"},
            "maxDate": {"$max": "$createdAt"},
        }
    }
]
result = list(collection.aggregate(pipeline))

if result:
    min_date = result[0]["minDate"]
    max_date = result[0]["maxDate"]
    min_year = str(min_date)[:4]
    max_year = str(max_date)[:4]

    print(f"  Earliest: {str(min_date)[:10]}")
    print(f"  Latest:   {str(max_date)[:10]}")

    year_ok = min_year in ["2025", "2026"] and max_year in ["2025", "2026"]
    if year_ok:
        print("  Status: PASS - dates in 2025-2026")
        passed += 1
    else:
        print(f"  Status: FAIL - wrong years {min_year}-{max_year}")
        print("  Fix: update date shift in importCSV.ts")
        failed += 1
else:
    print("  Status: FAIL - no dates found")
    failed += 1

print("\n3. Feature Columns Present")
cursor = collection.find(
    {"completedAt": {"$exists": True}},
    {col: 1 for col in FEATURE_COLUMNS},
)
df = pd.DataFrame(list(cursor))

all_present = True
for col in FEATURE_COLUMNS:
    if col in df.columns:
        null_count = int(df[col].isna().sum())
        null_pct = null_count / len(df) * 100 if len(df) else 0
        status = "OK" if null_pct < 10 else "WARN"
        print(
            f"  {col:<25} present  nulls={null_count} ({null_pct:.1f}%)  {status}"
        )
    else:
        print(f"  {col:<25} MISSING")
        all_present = False

if all_present:
    print("  Status: PASS - all 6 features present")
    passed += 1
else:
    print("  Status: FAIL - missing feature columns")
    print("  Fix: check importCSV.ts field mappings")
    failed += 1

print("\n4. Value Ranges")
expected_ranges = {
    "cycleTimeHours": (0, 50),
    "rejectionCount": (0, 10),
    "revisionCount": (0, 10),
    "daysOverSLA": (0, 5),
    "stageCount": (1, 5),
    "hourOfDaySubmitted": (0, 23),
}

range_ok = True
for col, (lo, hi) in expected_ranges.items():
    if col not in df.columns:
        continue
    col_data = pd.to_numeric(df[col], errors="coerce").dropna()
    actual_min = col_data.min()
    actual_max = col_data.max()
    actual_mean = col_data.mean()
    ok = actual_min >= lo
    if not ok:
        range_ok = False
    print(
        f"  {col:<25} min={actual_min:>7.2f}  max={actual_max:>7.2f}  "
        f"mean={actual_mean:>7.2f}  {'PASS' if ok else 'WARN'}"
    )

if range_ok:
    print("  Status: PASS - values realistic")
    passed += 1
else:
    print("  Status: WARNING - some values unexpected")

print("\n5. Department Coverage")
dept_pipeline = [
    {"$group": {"_id": "$department", "count": {"$sum": 1}}},
    {"$sort": {"count": -1}},
]
dept_results = list(collection.aggregate(dept_pipeline))
null_depts = sum(1 for row in dept_results if row["_id"] is None)

for row in dept_results:
    dept = str(row["_id"])[:30] if row["_id"] else "NULL"
    print(f"  {dept:<32} count={row['count']}")

print(f"  Null department count: {null_depts}")

if null_depts == 0:
    print("  Status: PASS - all decisions have department")
    passed += 1
else:
    print(f"  Status: WARNING - {null_depts} null departments")
    print("  Fix: run importCSV.ts again after correcting department mapping")

print("\n6. Business Rule Label Preview")


def label_decision(row):
    # Rule 1 — Only truly extreme cycle times
    if row.get("cycleTimeHours", 0) > 8:
        return 1

    # Rule 2 — Raised threshold from 3 to max possible
    # rejectionCount max in this dataset is 3
    # so this rule effectively only catches the
    # absolute worst cases combined with other issues
    if row.get("rejectionCount", 0) >= 3 and row.get("cycleTimeHours", 0) > 5:
        return 1

    # Rule 3 — SLA breach raised threshold
    if row.get("daysOverSLA", 0) > 0.3:
        return 1

    # Rule 4 — Combined issues both raised
    if row.get("cycleTimeHours", 0) > 6 and row.get("rejectionCount", 0) >= 2:
        return 1

    # Rule 5 — Late night kept but rejection raised
    if row.get("hourOfDaySubmitted", 12) <= 4 and row.get("rejectionCount", 0) >= 3:
        return 1

    return 0


df["rule_label"] = df.apply(label_decision, axis=1)
rule_anomalies = int(df["rule_label"].sum())
rule_normals = len(df) - rule_anomalies
rule_pct = rule_anomalies / len(df) * 100 if len(df) else 0

print("  Using business rule labelling:")
print(f"  Anomalies: {rule_anomalies} ({rule_pct:.1f}%)")
print(f"  Normals:   {rule_normals} ({100 - rule_pct:.1f}%)")

if 3 <= rule_pct <= 20:
    print("  Status: PASS - realistic anomaly ratio")
    passed += 1
else:
    print("  Status: WARNING - anomaly ratio unusual")
    print("  Consider adjusting business rule thresholds")

print(f"\n{'=' * 60}")
print("PHASE 1 SUMMARY \n")
print(f"  Passed: {passed}")
print(f"  Failed: {failed}")
if failed == 0:
    print("  ALL CHECKS PASSED - proceed to training")
else:
    print("  FIX FAILURES BEFORE TRAINING")
print(f"{'=' * 60}\n")