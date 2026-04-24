"""
train_random_forest.py

Train a Random Forest model for department risk classification using BPI Challenge 2017 case data.
Saves a scikit-learn pipeline under ml_service/models/risk/random_forest.pkl.
"""

import os
from pathlib import Path

import joblib
import pandas as pd
from pymongo import MongoClient
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from dotenv import load_dotenv
import matplotlib.pyplot as plt
import seaborn as sns

# Load env variables if present
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

MODELS_DIR = Path(__file__).resolve().parents[1] / "models" / "risk"
MODELS_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_PATH = MODELS_DIR / "random_forest.pkl"

# Map BPI department names to canonical IDs (same mapping as importCSV.ts)
# BPI uses exact values: 'CS', 'Finance', 'HR', 'IT', 'Operations'
DEPT_NAME_TO_ID = {
    # BPI exact values
    "cs": "CS005",
    "finance": "FI001",
    "hr": "HR002",
    "it": "IT004",
    "operations": "OP003",
    # Common variations
    "financial": "FI001",
    "human resources": "HR002",
    "human resource": "HR002",
    "operation": "OP003",
    "ops": "OP003",
    "information technology": "IT004",
    "technology": "IT004",
    "customer service": "CS005",
    "customer services": "CS005",
    "customer support": "CS005",
    "legal": "FI001",
    "compliance": "FI001",
}

# New features as per NEWDATASET.MD
# Note: We keep hourOfDaySubmitted and stageCount here as supervised models (RF) 
# can learn patterns from them even if they are 'noisy' for unsupervised models.
NUMERIC_COLS = ["hourOfDaySubmitted", "revisionCount", "stageCount"]
CATEGORICAL_COLS = ["department", "priority"]
FEATURE_COLS = NUMERIC_COLS + CATEGORICAL_COLS


def fetch_dataset() -> pd.DataFrame:
    """Fetch the BPI training data from MongoDB and normalize fields to match live inference format."""
    mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/govvision")
    client = MongoClient(mongo_uri)
    db = client.get_database()
    collection = db["m1_training_decisions"]

    print("Querying MongoDB for m1_training_decisions (BPI data)...")
    cursor = collection.find(
        {},
        {
            "department": 1,
            "departmentName": 1,
            "priority": 1,
            "hourOfDaySubmitted": 1,
            "revisionCount": 1,
            "stageCount": 1,
            "daysOverSLA": 1,
            "status": 1,
            "_id": 0
        }
    )
    
    df = pd.DataFrame(list(cursor))
    client.close()
    
    if df.empty:
        raise ValueError("No data found in govvision.m1_training_decisions collection.")
        
    print(f"Loaded {len(df)} records from MongoDB.")

    # Normalize department name → canonical ID (to match live inference which sends departmentId)
    def normalize_dept(val):
        if pd.isna(val):
            return "unknown"
        key = str(val).strip().lower()
        return DEPT_NAME_TO_ID.get(key, "unknown")

    dept_col = "departmentName" if "departmentName" in df.columns else "department"
    df["department"] = df[dept_col].apply(normalize_dept)

    # Normalize priority to lowercase (live data uses lowercase)
    if "priority" in df.columns:
        df["priority"] = df["priority"].astype(str).str.strip().str.lower()
    
    # Drop rows with missing essential features
    df = df.dropna(subset=FEATURE_COLS + ["daysOverSLA", "status"])
    print(f"Rows after dropping missing values: {len(df)}")
    
    # 4-class risk label per Module 3 spec:
    # 0=Low, 1=Medium, 2=High, 3=Critical
    def assign_risk_label(row):
        days = float(row["daysOverSLA"] or 0)
        status = str(row["status"]).lower()
        if days == 0 and status == "approved":
            return 0  # Low
        elif days > 0 and days <= 1 and status != "rejected":
            return 1  # Medium
        elif (days > 1 and days <= 5) or status == "rejected":
            return 2  # High
        else:  # days > 5
            return 3  # Critical

    df["risk_label"] = df.apply(assign_risk_label, axis=1)
    
    print("Class distribution (BPI training data):")
    label_names = {0: "Low", 1: "Medium", 2: "High", 3: "Critical"}
    for label, name in label_names.items():
        count = (df["risk_label"] == label).sum()
        print(f"  {name} ({label}): {count} ({count/len(df)*100:.1f}%)")
    
    return df


def main() -> None:
    print("Fetching BPI historical dataset for training...")
    df = fetch_dataset()
    
    labels = df["risk_label"]
    features = df[FEATURE_COLS]
    
    x_train, x_test, y_train, y_test = train_test_split(
        features,
        labels,
        test_size=0.2,
        random_state=42,
        stratify=labels,
    )
    
    print("Building preprocessing pipeline...")
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), NUMERIC_COLS),
            ("cat", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL_COLS),
        ]
    )
    
    print("Training RandomForestClassifier (200 trees)...")
    pipeline = Pipeline(
        [
            ("preprocessor", preprocessor),
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
            target_names=["Low (0)", "Medium (1)", "High (2)", "Critical (3)"],
            labels=[0, 1, 2, 3],
            zero_division=0,
        )
    )
    
    # --- VISUAL DIAGNOSTICS ---
    print("\nGenerating visual diagnostics...")
    
    # 1. Confusion Matrix Heatmap
    plt.figure(figsize=(8, 6))
    cm = confusion_matrix(y_test, predictions)
    class_names = ['Low', 'Medium', 'High', 'Critical']
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                xticklabels=class_names,
                yticklabels=class_names)
    plt.title('Chart 1: Risk Model Confusion Matrix (4-Class)')
    plt.xlabel('Predicted Label')
    plt.ylabel('True Label')
    plt.show()

    # 2. Feature Importance Horizontal Bar Chart
    try:
        classifier = pipeline.named_steps["classifier"]
        importances = classifier.feature_importances_
        cat_encoder = preprocessor.named_transformers_["cat"]
        cat_features = list(cat_encoder.get_feature_names_out(CATEGORICAL_COLS))
        all_feature_names = NUMERIC_COLS + cat_features
        
        feat_df = pd.DataFrame({
            'Feature': all_feature_names,
            'Importance': importances
        }).sort_values(by='Importance', ascending=False).head(15)

        plt.figure(figsize=(10, 8))
        sns.barplot(x='Importance', y='Feature', data=feat_df, palette='viridis')
        plt.title('Chart 2: Top 15 Risk Drivers (Feature Importance)')
        plt.tight_layout()
        plt.show()
    except Exception as e:
        print(f"Could not plot feature importances: {e}")

    # 3. Probability Distribution
    plt.figure(figsize=(10, 6))
    probs = pipeline.predict_proba(x_test)[:, 1]
    sns.histplot(probs, bins=50, kde=True, color='orange')
    plt.axvline(0.5, color='red', linestyle='--')
    plt.title('Chart 3: Distribution of Predicted Risk Scores (0-1)')
    plt.xlabel('Risk Probability')
    plt.ylabel('Count')
    plt.show()
    
    joblib.dump(pipeline, OUTPUT_PATH)
    print(f"\nModel saved to: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
