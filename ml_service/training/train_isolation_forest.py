"""
train_isolation_forest.py

Fully unsupervised Isolation Forest workflow.
Trains and scores on all available decisions.
Validates behavior using score-based diagnostics and charts.

Run with: python training/train_isolation_forest.py
"""

from pathlib import Path
import os

import joblib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from dotenv import load_dotenv
from pymongo import MongoClient
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import MinMaxScaler, StandardScaler

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

FEATURE_COLUMNS = [
    "cycleTimeHours",
    "rejectionCount",
    "revisionCount",
    "daysOverSLA",
    "stageCount",
    "hourOfDaySubmitted",
]


def normalize_scores(raw_scores, score_min, score_max):
    score_range = score_max - score_min
    if score_range == 0:
        score_range = 1
    return 1 - (raw_scores - score_min) / score_range


def print_section(title, show_line=True):
    print(f"\n{title}")
    if show_line:
        print("─" * 72)


def print_kv(label, value, width=30):
    print(f"{label:<{width}}: {value}")


def resolve_contamination():
    raw_value = os.getenv("IF_CONTAMINATION", "0.06").strip().lower()
    if raw_value == "auto":
        return "auto"

    try:
        parsed = float(raw_value)
    except ValueError as exc:
        raise ValueError(
            "IF_CONTAMINATION must be 'auto' or a float in (0, 0.5]. "
            f"Received: {raw_value}"
        ) from exc

    if parsed <= 0 or parsed > 0.5:
        raise ValueError(
            "IF_CONTAMINATION must be in (0, 0.5]. "
            f"Received: {parsed}"
        )

    return parsed


print_section("1. Load Data From MongoDB")

MONGODB_URI = os.getenv("MONGODB_URI")
if not MONGODB_URI:
    raise ValueError("MONGODB_URI not found in .env")

client = MongoClient(MONGODB_URI)
db = client["govvision"]
collection = db["m1_decisions"]

cursor = collection.find(
    {"completedAt": {"$exists": True}},
    {
        **{col: 1 for col in FEATURE_COLUMNS},
        "department": 1,
        "_id": 1,
    },
)
documents = list(cursor)
print_kv("Documents loaded", len(documents))

df = pd.DataFrame(documents)

for col in FEATURE_COLUMNS:
    if col not in df.columns:
        df[col] = 0
    df[col] = pd.to_numeric(df[col], errors="coerce")
    df[col] = df[col].fillna(df[col].mean())

print_kv("Feature matrix shape", df[FEATURE_COLUMNS].shape)

print_section("2. Build Feature Matrix")

X_all = df[FEATURE_COLUMNS].values
print_kv("Feature rows used for training", len(X_all))

print_section("3. Normalize Data")

scaler = StandardScaler()
X_all_scaled = scaler.fit_transform(X_all)

print_kv("Scaler fit", "PASS")
print_kv("Training mean", scaler.mean_.round(2))
print_kv("Training standard deviation", scaler.scale_.round(2))

print_section("4. Train Isolation Forest on Full Dataset")

contamination_setting = resolve_contamination()
print_kv("Contamination setting", contamination_setting)

model = IsolationForest(
    n_estimators=100,
    contamination=contamination_setting,
    random_state=42,
)
model.fit(X_all_scaled)
print_kv("Training complete", "PASS")

train_preds = model.predict(X_all_scaled)
train_anomalies = int((train_preds == -1).sum())
print_kv(
    "Flagged on training set",
    f"{train_anomalies} ({train_anomalies / len(X_all) * 100:.1f}%)",
)

models_dir = Path(__file__).resolve().parents[1] / "models"
models_dir.mkdir(parents=True, exist_ok=True)
joblib.dump(model, models_dir / "isolation_forest.pkl")
joblib.dump(scaler, models_dir / "isolation_forest_scaler.pkl")
print_kv("Models saved", "PASS")

print_section("5. Unsupervised Score Inference")

# Infer scores and anomaly flags on the full dataset.
raw_scores_all = model.decision_function(X_all_scaled)
norm_scores = normalize_scores(
    raw_scores_all,
    raw_scores_all.min(),
    raw_scores_all.max(),
)
norm_scores = np.clip(norm_scores, 0.0, 1.0)
predictions = model.predict(X_all_scaled)

anomaly_mask = predictions == -1
normal_mask = predictions == 1
flagged_count = int(anomaly_mask.sum())

print_kv("Decisions scored", len(norm_scores))
print_kv(
    "Flagged anomalies",
    f"{flagged_count} ({flagged_count / len(norm_scores) * 100:.1f}%)",
)

print_section("6. Unsupervised Validation Visualizations")

# Each chart is generated separately so figures appear one by one.

COLOR_NORMAL = "#3B82F6"
COLOR_ANOMALY = "#EF4444"
COLOR_BORDERLINE = "#F59E0B"
COLOR_PASS = "#10B981"
COLOR_FAIL = "#EF4444"

# Chart 1 - Anomaly score distribution by severity band.
fig1, ax1 = plt.subplots(figsize=(9, 5.5))
ax1.set_title("Chart 1: Anomaly Score Distribution", fontsize=12)

bands_data = [
    ("Very Normal\n0.00-0.20", 0.00, 0.20, COLOR_NORMAL),
    ("Normal\n0.20-0.50", 0.20, 0.50, COLOR_NORMAL),
    ("Borderline\n0.50-0.70", 0.50, 0.70, COLOR_BORDERLINE),
    ("Low\n0.70-0.80", 0.70, 0.80, "#F97316"),
    ("Medium\n0.80-0.90", 0.80, 0.90, COLOR_ANOMALY),
    ("High\n0.90-0.95", 0.90, 0.95, "#DC2626"),
    ("Critical\n0.95-1.00", 0.95, 1.01, "#991B1B"),
]

labels1 = [b[0] for b in bands_data]
counts1 = [
    int(((norm_scores >= b[1]) & (norm_scores < b[2])).sum())
    for b in bands_data
]
anomaly_counts1 = [
    int((((norm_scores >= b[1]) & (norm_scores < b[2])) & anomaly_mask).sum())
    for b in bands_data
]
colors1 = [b[3] for b in bands_data]
total1 = sum(counts1)

print_section("Severity Band Summary (Normal to Critical)")
print_kv("Total anomalies flagged", flagged_count)
for (label, _, _, _), total_count, anomaly_count in zip(bands_data, counts1, anomaly_counts1):
    clean_label = label.replace("\n", " ")
    pct = total_count / total1 * 100 if total1 else 0
    print(
        f"  {clean_label:<32} | total: {total_count:>4} ({pct:>5.1f}%)  anomalies: {anomaly_count:>4}"
    )

bars1 = ax1.bar(
    range(len(labels1)),
    counts1,
    color=colors1,
    width=0.65,
    edgecolor="white",
    linewidth=1.5,
)
for bar, cnt in zip(bars1, counts1):
    pct = cnt / total1 * 100 if total1 else 0
    ax1.text(
        bar.get_x() + bar.get_width() / 2,
        bar.get_height() + 3,
        f"{cnt}\n({pct:.1f}%)",
        ha="center",
        va="bottom",
        fontsize=8,
    )

ax1.set_xticks(range(len(labels1)))
ax1.set_xticklabels(labels1, fontsize=8)
ax1.set_ylabel("Decision count", fontsize=10)
ax1.set_xlabel("Score band", fontsize=10)
ax1.grid(axis="y", linestyle="--", alpha=0.35)

ax1.annotate(
    f"Flagged: {flagged_count}\n({flagged_count / len(predictions) * 100:.1f}%)",
    xy=(5, max(counts1) * 0.6 if counts1 else 0),
    fontsize=9,
    fontweight="bold",
    bbox={"boxstyle": "round,pad=0.3", "facecolor": "#FEF2F2", "alpha": 0.85},
)

plt.tight_layout()
plt.show()

# Chart 2 - Feature separation between predicted anomalies and normals.
fig2, ax2 = plt.subplots(figsize=(9, 5.5))
ax2.set_title("Chart 2: Feature Separation (Predicted Anomalies vs Normals)", fontsize=12)

disp_scaler = MinMaxScaler()
df_norm_disp = pd.DataFrame(
    disp_scaler.fit_transform(df[FEATURE_COLUMNS]),
    columns=FEATURE_COLUMNS,
)

anom_means = df_norm_disp[anomaly_mask].mean().values
norm_means = df_norm_disp[normal_mask].mean().values

x2 = np.arange(len(FEATURE_COLUMNS))
w2 = 0.35
ax2.bar(
    x2 - w2 / 2,
    anom_means,
    width=w2,
    label="Anomalies",
    color=COLOR_ANOMALY,
    edgecolor="white",
    linewidth=1.0,
)
ax2.bar(
    x2 + w2 / 2,
    norm_means,
    width=w2,
    label="Normals",
    color=COLOR_NORMAL,
    edgecolor="white",
    linewidth=1.0,
)

ax2.set_xticks(x2)
ax2.set_xticklabels(
    [
        "cycle time\nhours",
        "rejection\ncount",
        "revision\ncount",
        "days over\nSLA",
        "stage\ncount",
        "submission\nhour",
    ],
    fontsize=8,
)
ax2.set_ylabel("Normalized mean (0-1)", fontsize=10)
ax2.legend(fontsize=9, frameon=False)
ax2.grid(axis="y", linestyle="--", alpha=0.35)

all_separated = bool(np.all(anom_means > norm_means))
ax2.text(
    0.02,
    0.97,
    "PASS: anomalies have higher feature means"
    if all_separated
    else "CHECK: not all feature means are separated",
    transform=ax2.transAxes,
    va="top",
    fontsize=8,
    fontweight="bold",
    color=COLOR_PASS if all_separated else COLOR_FAIL,
)

plt.tight_layout()
plt.show()

# Chart 3 - Sanity test on mixed-range profiles.
fig3, ax3 = plt.subplots(figsize=(9, 5.5))
ax3.set_title("Chart 3: Sanity Test Cases", fontsize=12)

sanity_profiles = [
    {
        "label": "Normal baseline\n(4h, 0 rej)",
        "features": [4, 0, 1, 0, 2, 10],
    },
    {
        "label": "Normal high-work\n(12h, 2 rej)",
        "features": [12, 2, 4, 0.4, 2, 14],
    },
    {
        "label": "Borderline delay\n(22h, 3 rej)",
        "features": [22, 3, 5, 1.1, 3, 11],
    },
    {
        "label": "Elevated risk\n(46h, 6 rej)",
        "features": [46, 6, 8, 2.8, 3, 9],
    },
    {
        "label": "Critical late-night\n(58h, 9 rej)",
        "features": [58, 9, 11, 5.6, 3, 2],
    },
    {
        "label": "Critical combined\n(148h, 12 rej)",
        "features": [148, 12, 14, 11.5, 3, 1],
    },
]

sanity_cases = np.array([p["features"] for p in sanity_profiles], dtype=float)
sanity_scaled = scaler.transform(sanity_cases)
sanity_raw = model.decision_function(sanity_scaled)
sanity_norm = normalize_scores(sanity_raw, raw_scores_all.min(), raw_scores_all.max())
sanity_norm = np.clip(sanity_norm, 0.0, 1.0)
sanity_preds = model.predict(sanity_scaled)

sanity_labels = [p["label"] for p in sanity_profiles]
sanity_result_text = ["ANOMALY" if p == -1 else "NORMAL" for p in sanity_preds]
sanity_colors = []
for label, pred in zip(sanity_labels, sanity_preds):
    if "Borderline" in label:
        sanity_colors.append(COLOR_BORDERLINE)
    else:
        sanity_colors.append(COLOR_ANOMALY if pred == -1 else COLOR_NORMAL)

bars3 = ax3.bar(
    sanity_labels,
    [float(s) for s in sanity_norm],
    color=sanity_colors,
    width=0.45,
    edgecolor="white",
    linewidth=1.5,
)
for bar, score, result in zip(bars3, sanity_norm, sanity_result_text):
    ax3.text(
        bar.get_x() + bar.get_width() / 2,
        bar.get_height() + 0.03,
        f"Score: {score:.3f}\n{result}",
        ha="center",
        va="bottom",
        fontsize=9,
        fontweight="bold",
    )

ax3.set_ylabel("Anomaly score (0-1)", fontsize=10)
ax3.set_ylim(0, 1.25)
ax3.grid(axis="y", linestyle="--", alpha=0.35)

plt.tight_layout()
plt.show()

# Chart 4 - Histogram of overall anomaly score distribution.
fig4, ax4 = plt.subplots(figsize=(9, 5.5))
ax4.set_title("Chart 4: Anomaly Score Histogram", fontsize=12)

anom_scores = norm_scores[anomaly_mask]
normal_scores = norm_scores[normal_mask]

ax4.hist(
    normal_scores,
    bins=40,
    alpha=0.75,
    color=COLOR_NORMAL,
    label=f"Normal ({normal_mask.sum()})",
    edgecolor="white",
    linewidth=0.5,
)
ax4.hist(
    anom_scores,
    bins=20,
    alpha=0.85,
    color=COLOR_ANOMALY,
    label=f"Anomaly ({anomaly_mask.sum()})",
    edgecolor="white",
    linewidth=0.5,
)
ax4.axvline(
    norm_scores.mean(),
    color="#374151",
    linestyle="--",
    linewidth=1.5,
    label=f"Mean {norm_scores.mean():.3f}",
)
ax4.axvline(
    norm_scores.mean() + 2 * norm_scores.std(),
    color="#F59E0B",
    linestyle=":",
    linewidth=1.5,
    label=f"Mean + 2 standard deviations {norm_scores.mean() + 2 * norm_scores.std():.3f}",
)
ax4.set_xlabel("Anomaly score (0-1)", fontsize=10)
ax4.set_ylabel("Decision count", fontsize=10)
ax4.legend(fontsize=9, frameon=False)
ax4.grid(axis="y", linestyle="--", alpha=0.35)

stats_text = (
    f"Standard deviation: {norm_scores.std():.4f}\n"
    f"{'PASS: score variance present' if norm_scores.std() > 0.05 else 'CHECK: low variance'}"
)
stats_is_pass = norm_scores.std() > 0.05
ax4.text(
    0.98,
    0.96,
    stats_text,
    transform=ax4.transAxes,
    fontsize=8,
    va="top",
    ha="right",
    fontweight="bold",
    color=COLOR_PASS if stats_is_pass else COLOR_FAIL,
)

plt.tight_layout()
plt.show()

# Chart 5 - Scatter map of cycle time vs rejection count.
fig5, ax5 = plt.subplots(figsize=(9, 5.5))
ax5.set_title("Chart 5: Scatter Map (Cycle Time vs Rejection Count)", fontsize=12)

sc = ax5.scatter(
    df["cycleTimeHours"],
    df["rejectionCount"],
    c=norm_scores,
    cmap="magma",
    s=18,
    alpha=0.8,
    edgecolors="none",
)
ax5.set_xlabel("Cycle time (hours)", fontsize=10)
ax5.set_ylabel("Rejection count", fontsize=10)
ax5.grid(linestyle="--", alpha=0.3)

cbar = plt.colorbar(sc, ax=ax5)
cbar.set_label("Normalized anomaly score (0-1)")

plt.tight_layout()
plt.show()

print_section("Summary")

print_section("Model Run")
print_kv("Training approach", "Full-dataset unsupervised fit")
print_kv("Training set", f"{len(X_all)} decisions")
print_kv("Full scored set", f"{len(X_all)} decisions")

print_section("Unsupervised outputs")
print_kv(
    "Flagged anomalies",
    f"{flagged_count} ({flagged_count / len(norm_scores) * 100:.1f}%)",
)
print_kv("Score mean", f"{norm_scores.mean():.4f}")
print_kv("Score standard deviation", f"{norm_scores.std():.4f}")
print_kv("Score range", f"{norm_scores.min():.4f} to {norm_scores.max():.4f}")

print_section("Generated visuals")
print("  1. Score distribution by severity band")
print("  2. Feature separation (predicted anomaly vs normal)")
print("  3. Sanity test (test cases: normal → critical)")
print("  4. Histogram of anomaly score distribution")
print("  5. Scatter map (cycle time vs rejection count)")
print("Visualization generation complete.")
