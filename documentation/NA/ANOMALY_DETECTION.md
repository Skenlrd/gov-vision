# Anomaly Detection System

## Overview

This document explains how the AI Workflow Optimization system detects anomalies in decision processing.

## How It Works

### Multivariate Detection

The Isolation Forest model is **multivariate** - it learns relationships between ALL features simultaneously, not just looking at cycle time in isolation.

### Learned Patterns

| Relationship | Model Expectation | Anomaly Trigger |
|--------------|-------------------|-----------------|
| `cycleTimeHours` vs `stageCount` | Complex decisions (5 stages) take longer | Simple decision (1 stage) with 50h = ANOMALY |
| `rejectionCount` vs `revisionCount` | Rejections correlate with revisions | High rejections but 0 revisions = ANOMALY |
| `daysOverSLA` vs `priority` | High priority should resolve faster | Critical priority + 20 days over SLA = ANOMALY |
| `cycleTimeHours` alone | Most decisions cluster 6-28h | 80+ hours = ANOMALY (regardless of other features) |

## Detection Examples

| Decision | Features | Status | Why |
|----------|----------|--------|-----|
| Simple approval | 1 stage, 8h, 0 rejections | ✅ Normal | Matches trained pattern |
| Complex approval | 5 stages, 50h, 2 rejections | ✅ Normal | Proportional to complexity |
| Fast rejection | 1 stage, 2h, 3 rejections | ✅ Normal | Quick rejection is expected |
| **Delayed simple** | 1 stage, **50h**, 0 rejections | 🚨 **ANOMALY** | Too long for simple decision |
| **Stuck pending** | 2 stages, **80h**, pending status | 🚨 **ANOMALY** | Far outside normal range |
| **SLA breach** | Any stages, any time, **daysOverSLA > 14** | 🚨 **ANOMALY** | Extreme SLA violation |
| **High rejections** | 2 stages, 12h, **5+ rejections** | 🚨 **ANOMALY** | Unusual rejection count |

## Severity Levels

| Anomaly Score | Severity | Action |
|---------------|----------|--------|
| 0.0 - 0.3 | Normal | No action |
| 0.3 - 0.6 | Borderline | Monitor, investigate if pattern |
| 0.6 - 0.8 | Elevated | Flag for review |
| 0.8+ | Critical | Immediate alert |

## Training vs Live Data

### Training Data (BPI Dataset)
- **Time Range**: 2024-2025
- **Purpose**: Teach model what "normal" looks like
- **Normalized Range**: 6-28 hours cycle time
- **Rejection Pattern**: Mostly rejected/pending (realistic loan processing)
- **Collection**: `m1_training_decisions`

### Live Data (AI Workflow Dataset)
- **Time Range**: 2026 - Present
- **Purpose**: Get scored against trained model
- **Source**: Real-time workflow decisions
- **Collection**: `m1_decisions`

### Detection on Live Data

| Live Data Type | Cycle Time | Detection Result |
|----------------|------------|------------------|
| Normal | 2-20 hours | **Not flagged** - Within learned pattern |
| Borderline | 30-50 hours + low stages | **Flagged** - Outside pattern |
| Critical | 60-160 hours | **Flagged** - Far outside pattern |

## Key Insight

The model learns **relative proportions**, not absolute thresholds:

- **50 hours with 5 stages** = Normal (complex decision takes time)
- **50 hours with 1 stage** = Anomaly (simple decision taking too long)

This is **more intelligent** than simple thresholding - it catches **truly unjustified delays**, not just long cycle times.

## Why Stage Count Matters

Decisions with more stages are expected to take longer:

| Stage Count | Expected Cycle Time |
|-------------|---------------------|
| 1 stage | 2-12 hours |
| 2-3 stages | 8-30 hours |
| 4-5 stages | 20-60 hours |

A 50-hour decision with 5 stages is **normal**.
A 50-hour decision with 1 stage is **anomalous**.

## Model Features

The Isolation Forest is trained on these features:

1. `cycleTimeHours` - Total processing time
2. `rejectionCount` - Number of rejections
3. `revisionCount` - Number of revision cycles
4. `daysOverSLA` - Days beyond SLA threshold

## Scoring Process

1. Live decision completes → Stored in `m1_decisions` with `isScored: false`
2. Anomaly job runs (every X minutes)
3. Job fetches unscored decisions: `{ isScored: false, completedAt: { $exists: true } }`
4. Sends to ML service for scoring
5. Receives anomaly scores (0.0 to 1.0+)
6. Updates `m1_decisions` with score, marks `isScored: true`
7. Critical anomalies also saved to `anomalies` collection

## Architecture

```
BPI CSV (Training) → m1_training_decisions → train_isolation_forest.py → Frozen Model
                                                                        ↓
AI Workflow CSV (Live) → m1_decisions → anomalyJob.ts (Scoring) → Anomaly Scores
                                                                        ↓
Dashboard (Live Metrics Only)
```

## Important Notes

- Training data (BPI) is **never shown** on dashboard
- Only live data (AI Workflow) appears on dashboard
- Model is **frozen** after training - doesn't learn from new data
- Anomaly detection is **unsupervised** - no labels needed
- System catches **distribution outliers**, not just threshold violations
