# BPI Challenge 2017 ETL Documentation

This document explains the end-to-end Extract, Transform, Load (ETL) pipeline implemented to migrate the GovVision platform from synthetic datasets to the real-world **BPI Challenge 2017** dataset.

The dataset contains logs of a loan application approval process at a Dutch financial institution, originally formatted as a large IEEE XES (XML-based) event log file containing over 1.2 million events spanning 31,509 loan cases.

---

## Architecture Overview

The ETL process was intentionally designed as a **Two-Step Pipeline** to isolate the heavy processing of XML parsing from the database insertion logic. 

1. **Step 1 (Python):** Stream-parse the massive XML file, flatten the event-level data into case-level aggregates, and output a clean CSV.
2. **Step 2 (TypeScript/Node.js):** Stream-read the CSV, perform business-logic transformations (time-shifting, SLA adjustments, department mapping), and batch-insert into MongoDB.

---

## Step 1: XES to CSV Extraction (`aggregate_xes.py`)

### What was done
The python script `server/scripts/aggregate_xes.py` reads the `BPI Challenge 2017.xes` file. For each trace (loan application case), it aggregates all corresponding events chronologically and calculates specific case-level metrics. Once a trace is fully evaluated, it immediately writes that aggregated row to `bpi_aggregated_cases.csv`.

**Calculated Metrics:**
- **cycleTimeHours:** Delta between the first and last event timestamps in the case.
- **revisionCount:** Count of `O_Create Offer` events minus 1.
- **rejectionCount:** Count of `O_Refused` and `A_Denied` events.
- **stageCount:** Count of unique workflow (`W_*`) activities.
- **status:** Determined by looking at the chronologically last Application (`A_*`) event (e.g., `A_Denied`/`A_Cancelled` = rejected, `A_Complete`/`A_Accepted` = approved, else pending).
- **priority:** Binned into Low, Medium, or High based on the `RequestedAmount`.

### What was used
- **Python's `xml.etree.ElementTree` (`iterparse`)**: A standard library module used for parsing XML data.
- **Python's `csv` module**: Used to stream the output to `bpi_aggregated_cases.csv`.

### Why it was done this way (The Rationale)
**Memory Efficiency via Streaming:** The XES file is a heavily nested XML file that exceeds 130MB. If we used standard XML parsing methods (like `ET.parse()` or DOM parsers) or tried to process this in Node.js, the entire tree would be loaded into RAM simultaneously. This is highly memory-intensive and scales poorly.
By using Python's `iterparse`, the script processes the XML incrementally, event by event. As soon as an element or trace is fully parsed and its data captured, `elem.clear()` is called to delete it from memory. This keeps the memory footprint extremely low and constant, regardless of whether the file is 100MB or 10GB.

---

## Step 2: CSV to MongoDB Ingestion (`importBPI.ts`)

### What was done
The TypeScript script `server/scripts/importBPI.ts` reads the intermediate `bpi_aggregated_cases.csv` file. It iterates line-by-line, applies final GovVision-specific business logic, and inserts the formatted documents into the MongoDB `m1_decisions` collection.

**Transformations Applied:**
- **Time Shifting:** Real timestamps (2016-2017) are linearly shifted forward by exactly 9 years to match the GovVision dashboard's simulated `Jan 2025 – Mar 2026` window.
- **SLA Recalibration:** The SLA threshold was changed to **21 Days (504 hours)**. `daysOverSLA` was recalculated against this new benchmark.
- **Department Mapping:** The abstract resource IDs (`User_1`, `User_2`, etc.) found in the raw log are mapped to one of the five canonical GovVision departments (`Finance`, `HR`, `Operations`, `IT`, `CS`) using a deterministic string hashing function.
- **Terminology Normalization:** To align with the GovVision Governance Platform vision, all raw "Application" identifiers were renamed to **"Decision"** identifiers. Specifically, the field `caseId` was renamed to `decisionId`, and the string values were transformed from `Application_XXXXXXXXX` to `Decision_XXXXXXXXX`.

### What was used
- **Node.js `fs` and `readline` modules**: For streaming the CSV file.
- **Mongoose / MongoDB**: For database insertion (`DecisionModel.insertMany()`).

### Why it was done this way (The Rationale)
1. **SLA Adjustment for Real-world Data:** The original GovVision mock data used a 48-hour SLA. However, real-world loan applications inherently take weeks to process. If the 48-hour SLA was maintained, ~95% of the real BPI cases would be flagged as "Critical Risk." Recalibrating to 21 days prevents the anomaly detection and risk models from being oversaturated with false positives.
2. **Deterministic Hashing for Departments:** Because there are roughly 145 unique users in the BPI dataset, we needed a way to map them to GovVision's 5 departments without hardcoding 145 mappings. A string hashing function guarantees that `User_1` will *always* map to the same department every time the script is run, preserving data consistency.
3. **Batch Insertion:** Inserting 31,509 documents into MongoDB one-by-one is highly inefficient and creates massive network overhead. The script pushes documents to an array and executes `DecisionModel.insertMany(batch)` every 500 records. This drastically reduces database I/O and speeds up the insertion process by several orders of magnitude.
4. **Streaming over Memory:** Similar to the XML parser, `readline` ensures the Node.js process does not load the entire CSV into RAM, keeping the ingestion script lightweight and fast.

---

## Step 3: Machine Learning Model Training (`train_risk_model.py`)

### What was done
With the real-world BPI data populated in the `m1_decisions` MongoDB collection, the Random Forest risk model (`ml_service/training/train_risk_model.py`) was entirely rewritten. Instead of generating fake/synthetic data, the script now pulls the live BPI loan applications directly from the database to learn real patterns.

**Feature Extraction:**
The model extracts the new case-centric features mapped from the BPI dataset: `department`, `priority`, `hourOfDaySubmitted`, `revisionCount`, and `stageCount`.

**Dynamic Risk Labeling:**
Because the BPI dataset does not have a native "risk score" column, a binary target label (`is_at_risk`) was dynamically generated during extraction:
- `1` (At Risk): If the case breached the 21-day SLA (`daysOverSLA > 0`) OR was rejected/cancelled (`status == 'rejected'`).
- `0` (Safe): Otherwise.

### How Accuracy was Validated
Accuracy was strictly evaluated using a dynamic **Train/Test Split** methodology built into the Python pipeline:
1. **80/20 Shuffle:** Using `scikit-learn`'s `train_test_split`, the 31,509 extracted cases were randomly shuffled and split. 80% (approx. 25,207 cases) were used to train the Random Forest, allowing it to learn the correlations between features (like `stageCount`) and failure rates.
2. **Hold-out Testing:** The remaining 20% (approx. 6,302 cases) were completely hidden from the model during training. After the model was built, it was forced to predict the risk label for these hidden cases.
3. **Results:** The predictions were scored against the actual outcomes (using `classification_report`), achieving a **71% overall accuracy** and identifying `stageCount` as the most critical predictor of a loan failing.
