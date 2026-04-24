# ML Pipeline Refactor: Data Separation & Scoring Architecture

This document outlines the architecture, data flow, and scoring logic of the GovVision ML pipeline following the BPI-to-Live dataset decoupling refactor.

## 1. Pipeline Architecture

The pipeline uses a strict **Frozen-Model Inference Pattern** to guarantee that the dashboard only displays metrics from the live AI Workflow dataset, while the models are trained on the robust BPI Challenge 2017 historical dataset.

### Dual Collection Strategy
- **`m1_training_decisions`**: Stores the 31,509 historical cases from the BPI dataset. This collection is exclusively used by the Python ML service to train the Isolation Forest, Random Forest, and Prophet models.
- **`m1_decisions`**: Stores the 2,500 live operational cases from the AI Workflow dataset. This is the only collection the dashboard queries for KPIs, volume metrics, and compliance rates.

### Data Flow
1. **Ingestion (Training)**: `importBPI.ts` reads the BPI CSV, normalizes it, applies a 12x time compression factor to match the live data's cycle times (reducing hundreds of hours to 6-28 hours), and inserts it into `m1_training_decisions`.
2. **Model Training**: `train_isolation_forest.py` reads from `m1_training_decisions`, normalizes the features (StandardScaler), trains an Isolation Forest model, and saves the frozen model as a `.pkl` file.
3. **Ingestion (Live)**: `importCSV.ts` reads the AI Workflow CSV, enriches the data, and inserts it into `m1_decisions` with a flag `isScored: false`.
4. **Scoring**: The `anomalyJob.ts` cron job finds all unscored completed decisions in `m1_decisions` and sends them to the ML Service. The ML Service uses the frozen `.pkl` model to score them. The job then uses high-performance `bulkWrite` to set `isScored: true` and saves the anomalies to the `m3_anomalies` collection.

## 2. Feature Normalization & The "12x Factor"

The biggest challenge in bridging the two datasets was the **domain mismatch**. The BPI dataset is based on loan applications taking hundreds of hours (e.g., 72-336 hours). The AI Workflow dataset is based on rapid operations taking 0.5-24 hours.

If the model trained on 200-hour cases, it would flag every AI Workflow case as "too fast", and if a live case took 50 hours, the model would think it's completely normal (because 50 < 200).

**The Solution:** In `importBPI.ts`, we implemented `timeCompressionFactor = 12`.
```typescript
const timeCompressionFactor = 12; 
let newCycleTime = doc.cycleTimeHours / timeCompressionFactor;
```
This mathematically squeezed the BPI data down into a ~6-28 hour window. The model now correctly understands that a case taking 50 hours is a massive delay, and flags it accordingly.

## 3. How Anomaly Scoring Works

The anomaly detection uses an **Isolation Forest** (unsupervised learning). It doesn't just look at single thresholds (e.g., "is cycle time > 24h?"); it looks at the *multivariate relationship* between four key features:
1. `cycleTimeHours`
2. `rejectionCount`
3. `revisionCount`
4. `daysOverSLA`

### The Scoring Mechanism
1. The ML service receives a decision.
2. It scales the 4 features using the exact `StandardScaler` fitted during training.
3. The Isolation Forest calculates an anomaly score. By default, Isolation Forests return a score from -1 (anomaly) to 1 (normal).
4. `train_isolation_forest.py` normalizes this internal score to a clean **0.0 to 1.0 range**, where 1.0 is a critical anomaly.
5. **Severity Bands**:
   - `0.00 - 0.50`: Normal
   - `0.50 - 0.70`: Borderline
   - `0.70 - 0.80`: Low Severity
   - `0.80 - 0.90`: Medium Severity
   - `0.90 - 0.95`: High Severity
   - `0.95 - 1.00`: Critical Severity

### Why are there no "Pending" cases in the Live Data?
The AI Workflow dataset is a historical snapshot of completed operations. Every single row in the CSV has a `Task_End_Time`. Because of this, `importCSV.ts` successfully calculates a `completedAt` timestamp for every record. The system logic dictates that if a task has a `completedAt` date, it is either "approved" or "rejected", but never "pending". Pending is reserved strictly for tasks with a `null` completed date.

### Why did we have to "Reset" the Anomalies?
During the migration, the `m3_anomalies` collection was heavily polluted. When the `m1_decisions` collection temporarily held the 31k BPI records, the `anomalyJob` scored them, generating roughly ~4,000 anomalies. When we cleared `m1_decisions` and replaced it with the 2,500 live AI Workflow records, those 4,000 training anomalies were left behind in the database, causing the dashboard to show wildly inflated numbers. Deleting the `m3_anomalies` collection and resetting `isScored: false` on the live data allowed us to perform a clean scoring run, generating the correct ~125 anomalies for the live data.
