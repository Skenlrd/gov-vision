# BPI Dataset: Status Rebalancing & Dynamic SLA — Revised Implementation Plan

## Background

The BPI Challenge 2017 dataset contains **31,509 real loan-application cases** from a Dutch financial institution. Its natural status distribution is heavily skewed:

| Status | Approximate % |
|---|---|
| Pending / Cancelled | ~55% |
| Rejected / Denied | ~35% |
| Approved / Accepted | ~10% |

This causes two compounding problems in GovVision:

1. **Dashboard looks reject-prone** — KPI cards, charts, and approval-rate metrics all show unhealthy-looking numbers that do not represent a balanced operational governance environment.
2. **Anomaly Detection is inverted** — Isolation Forest's job is to find *rare* outliers against a *normal* baseline. When 90% of cases are non-approved, the model learns that rejection is normal and approved cases become the anomalies. This is the exact opposite of the intended behavior.

The SLA is also currently a flat hardcoded constant (`SLA_HOURS = 504`, i.e., 21 days), ignoring priority and case complexity entirely.

---

## Part 1: Dynamic SLA Calculation

### Proposed Formula
Replace the static `SLA_HOURS` constant with a per-case function. Since we are compressing the cycle times to make the system look faster, we will use a tighter SLA:

```typescript
function getDynamicSlaHours(priority: string, stageCount: number): number {
  const BASE: Record<string, number> = {
    high:   72,   // 3 days
    medium: 168,  // 7 days
    low:    336,  // 14 days
  };
  const base = BASE[priority?.toLowerCase()] ?? 168;
  const stageBonus = Math.min(stageCount, 3) * 24; // cap at +3 days
  return base + stageBonus;
}

// Usage:
const slaHours = getDynamicSlaHours(row.priority, stageCount);
// Note: cycleTimeHours will be compressed first before this calculation
const daysOverSLA = Math.max(0, (cycleTimeHours - slaHours) / 24);
```

### ⚠️ Critique: Why Cap the Stage Bonus at +3 Days?
Without a cap, a case with 8 stages gets +8 days SLA allowance. High-complexity applications could have their `daysOverSLA` forced to near zero even when genuinely delayed. Capping at 3 stages (`+72h` max) ensures complex cases still face accountability.

---

## Part 2: Status Rebalancing

### Target Distribution
| Status | Target % |
|---|---|
| Approved | ~55% |
| Pending | ~25% |
| Rejected | ~20% |

This produces a governance dashboard that feels like a functioning, healthy system while retaining enough rejections and pending items to be realistic.

### Deterministic Hashing — Not Random

> **⚠️ Do NOT use `Math.random()` to flip statuses.**
> Random flipping means every `importBPI.ts` run produces a different dataset, making ML model retraining non-reproducible and dashboard numbers drift between deployments. This is unacceptable for a governance system.

Use a **deterministic hash of `caseId`** (same pattern as department mapping), so the exact same cases are always flipped:

```typescript
function balanceStatus(
  originalStatus: string,
  caseId: string
): "approved" | "rejected" | "pending" {
  const h = hashString(caseId);

  if (originalStatus === "rejected") {
    // Deterministically flip ~40% of rejected → approved
    return (h % 100) < 40 ? "approved" : "rejected";
  }
  if (originalStatus === "pending") {
    // Deterministically flip ~60% of pending → approved
    return (h % 100) < 60 ? "approved" : "pending";
  }
  return "approved"; // native approved cases stay approved
}
```

---

## Part 3: Feature Consistency After Status Flipping ⚠️ CRITICAL

> **This is the most important correction to the original plan.**
>
> When you flip a `rejected` case to `approved`, its numeric features still reflect a **rejected application's behavior** — high `rejectionCount`, high `revisionCount`, long `cycleTimeHours`. The Risk Model will then encounter:
> - `status = approved` with `rejectionCount = 5` and `cycleTimeHours = 680`
>
> This is contradictory noise that will confuse the Random Forest and degrade model accuracy.

### Fix: Feature Jitter & Cycle Time Compression

When a case is deterministically flipped to `approved`, apply light normalization to bring its numeric features closer to what an approved case would realistically look like. 

Additionally, to make the dashboard look like a faster, more efficient system, we will **manually compress the cycle times** for all cases. We can divide the `cycleTimeHours` by a factor (e.g., by 3) so that a loan that originally took 21 days now looks like it took 7 days. We will also adjust the `completedAt` timestamp backward so the timeline stays mathematically consistent.

```typescript
function adjustFeaturesForApproved(doc: any, wasFlipped: boolean, slaHours: number): any {
  // 1. Compress time for ALL cases (make the system look 3x faster)
  const timeCompressionFactor = 3; 
  let newCycleTime = doc.cycleTimeHours / timeCompressionFactor;
  
  // 2. Adjust the completedAt date to match the new shorter cycle time
  const newCompletedAt = new Date(doc.createdAt.getTime() + (newCycleTime * 3600 * 1000));

  if (!wasFlipped) {
    return {
      ...doc,
      cycleTimeHours: newCycleTime,
      completedAt: newCompletedAt
    };
  }
  
  // 3. Feature jitter for cases that were flipped to "approved"
  return {
    ...doc,
    rejectionCount: Math.min(doc.rejectionCount, 1),              // cap rejections at 1
    revisionCount:  Math.min(doc.revisionCount, 2),               // cap revisions at 2
    cycleTimeHours: Math.min(newCycleTime, slaHours * 0.85),      // keep within SLA window
    completedAt: new Date(doc.createdAt.getTime() + (Math.min(newCycleTime, slaHours * 0.85) * 3600 * 1000)),
    daysOverSLA:    0,  // flipped-approved cases should not be flagged over SLA
  };
}
```

---

## Part 4: ML Model — Class Imbalance in Risk Labels

After rebalancing, the `is_at_risk` label in `train_risk_model.py` is still derived as:
```
is_at_risk = 1  IF (daysOverSLA > 0 OR status == 'rejected')
is_at_risk = 0  OTHERWISE
```

With fewer `rejected` cases post-rebalance, the `status == 'rejected'` component contributes less. But `daysOverSLA > 0` may still dominate.

> **Action:** Print the class distribution before training. If `is_at_risk = 1` is still >65%, apply `class_weight='balanced'` to the `RandomForestClassifier`.

```python
model = RandomForestClassifier(
    n_estimators=100,
    class_weight='balanced',   # ← add this
    random_state=42
)
```

---

## Part 5: Isolation Forest Contamination Tuning

The `IF_CONTAMINATION=0.02` env var tells Isolation Forest that 2% of cases are anomalies (~630 out of 31k). After rebalancing the dataset shape, this value needs revisiting.

> **Action:** After running the import, calculate what % of cases are statistically extreme (e.g., `cycleTimeHours > mean + 2σ`) and set contamination to approximately that fraction. A value between `0.03` and `0.06` is typical for process-mining event logs.

---

## Summary of All Changes

| File | Change |
|---|---|
| `server/scripts/importBPI.ts` | Add `getDynamicSlaHours()`, `balanceStatus()`, `adjustFeaturesForApproved()` |
| `server/.env` | Tune `IF_CONTAMINATION` after reviewing post-rebalance distribution |
| `ml_service/training/train_risk_model.py` | Add `class_weight='balanced'`; print class distribution before training |
| `ml_service/training/train_isolation_forest.py` | Re-run after import to learn the new baseline |

## Execution Order

1. Modify and run `importBPI.ts` → verify MongoDB status distribution (~55% approved)
2. Check `daysOverSLA` spread — confirm dynamic SLA is working
3. Run `train_risk_model.py` → check class distribution printout
4. Run `train_isolation_forest.py` → confirm contamination is sensible
5. Review dashboard KPIs

## Open Questions

1. **Feature Jitter Aggressiveness** — The caps (`rejectionCount ≤ 1`, `revisionCount ≤ 2`) are conservative. Should these be looser to preserve more BPI signal, or tighter for cleaner model training?
2. **Target Approval Rate** — Plan targets ~55% approved. Is this the right balance, or do you want a different ratio (e.g. 65% approved / 20% pending / 15% rejected)?
