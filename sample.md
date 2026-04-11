# Report Metric Formulas

## Report 1: Validation Report (`handleDownloadValidationReport`)

### Base Counts

| Variable | Formula |
|----------|---------|
| `total` | `Math.max(1, summary.totalRows)` |
| `usableCount` | `summary.valid` |
| `needsFixingCount` | `summary.invalid + summary.review` |

### Top-Level Percentages

| Metric | Formula |
|--------|---------|
| `usablePercent` | `round(valid / total * 100)` |
| `needsFixingPercent` | `round((invalid + review) / total * 100)` |
| `readyNowPct` | `round(valid / total * 100)` |
| `needsFixingPct` | `round(review / total * 100)` |
| `brokenPct` | `round(invalid / total * 100)` |

### Health Badge

| Condition | Label |
|-----------|-------|
| `usablePercent >= 80` | GOOD |
| `usablePercent >= 60` | NEEDS WORK |
| `usablePercent < 60` | DATA NEEDS CLEANING |

### Verdict

| Condition | Text |
|-----------|------|
| `usablePercent >= 85` | "This dataset is in good shape (X% immediately usable)" |
| `usablePercent < 85` | "Your dataset has value -- cleanup required before upload" |

### Per-Issue Metrics

| Metric | Formula |
|--------|---------|
| `pct` (issue card) | `round(issue.count / total * 100)` |
| `barPct` (bar width) | `round(issue.count / maxIssueCt * 100)` -- relative to biggest issue |
| `ofTotal` (bar label) | `round(issue.count / total * 100)` |

### Donut Chart Segments

| Metric | Formula |
|--------|---------|
| `validEnd` | `round(valid / total * 100)` |
| `cautionEnd` | `validEnd + round(review / total * 100)` |

---

## Recovery Metrics (`computeDatasetRecoveryMetrics`)

### Deduplication

| Metric | Formula |
|--------|---------|
| `uniqueRows` | `totalRows - duplicateRows` (DUPLICATE_EXACT / DUPLICATE_CONFLICT only) |
| `deduplicationGain` | `totalRows - uniqueRows` |

### Per-Row Classification (unique rows only)

| Metric | Formula |
|--------|---------|
| `validInUnique` | Count of unique rows with `status === 'valid'` |
| `fixableInUnique` | Count of unique non-valid rows where ALL issue codes are in `FIXABLE_CODES` |
| `blockedInUnique` | Unique rows that are neither valid nor fully fixable |

### FIXABLE_CODES Set

```
MISSING_ANSWER, MISSING_MULTI_SELECT_ANSWERS, MISSING_CORRECT_ANSWERS,
ANSWER_NOT_IN_OPTIONS, MSQ_EXACT_SET_MISMATCH, MSQ_CARDINALITY_MISMATCH,
AMBIGUOUS_ANSWER_MAPPING, AMBIGUOUS_ANSWER_MATCH, INVALID_FORMAT,
SHORT_STEM, DUPLICATE_NEAR, DUPLICATE_SUSPICIOUS,
MISSING_REQUIRED_OPTIONS, EMPTY_OPTION_TEXT, INVALID_ANSWER_FORMAT,
WHITESPACE_AUTOFIX
```

### Recovery Estimates

| Metric | Formula |
|--------|---------|
| `conservativeRecoverable` | `validInUnique` |
| `realisticRecoverable` | `validInUnique + fixableInUnique` |
| `immediatelyUsablePercent` | `round(validInUnique / totalRows * 100)` |
| `recoveryPotentialPercent` | `round(fixableInUnique / totalRows * 100)` |
| `finalUsablePercent` | `round(realisticRecoverable / totalRows * 100)` |

### Derived Display Values

| Metric | Formula |
|--------|---------|
| `recoverablePct` | `max(1, finalUsablePercent)` -- never shows 0% |
| `uniquePct` | `round(uniqueRows / totalRows * 100)` |
| `dupPercent` | `round(deduplicationGain / totalRows * 100)` |
| `readySeg` | `immediatelyUsablePercent` |
| `recoverSeg` | `max(0, finalUsablePercent - immediatelyUsablePercent)` |
| `lostSeg` | `max(0, 100 - finalUsablePercent)` |

---

## Data Quality Metrics (`computeDataQualityMetrics`)

| Metric | Formula |
|--------|---------|
| `rawValidRows` | Count where `status === 'valid'` |
| `duplicatesCount` | Rows with any DUPLICATE_EXACT / DUPLICATE_CONFLICT issue |
| `duplicateRows` | Subset of `duplicatesCount` where `status === 'caution'` |
| `validRows` | All non-rejected rows (`valid + caution`) |
| `adjustedValidRows` | `max(0, validRows - duplicateRows)` |
| `usableAfterCleanupPercentage` | `round(adjustedValidRows / totalRows * 1000) / 10` (1 decimal place) |
| `readyForExportPercentage` | `round(rawValidRows / totalRows * 1000) / 10` (1 decimal place) |

---

## Report 2: Row-Level Report (`handleDownloadRowLevelReport`)

### Base Counts

| Variable | Formula |
|----------|---------|
| `totalRows` | `reportRows.length` |
| `validCount` | Count where `status === 'valid'` |
| `cautionCount` | Count where `status === 'caution'` |
| `rejectedCount` | Everything else |

### Auto-Fixable Rows

| Variable | Formula |
|----------|---------|
| `autoFixableRows` | Rows with NO `block` severity issues AND at least one `review` issue whose code is NOT in `{DUPLICATE_CONFLICT, DUPLICATE_EXACT}` |

### Duplicate Rows (Union-Find)

| Variable | Formula |
|----------|---------|
| Duplicate codes used | `DUPLICATE_EXACT`, `DUPLICATE_CONFLICT`, `DUPLICATE_NEAR`, `DUPLICATE_SUSPICIOUS` |
| Partner extraction | Regex on issue message: `row(s): 2, 3` or `row 5` |
| Clustering | Union-Find groups all linked rows into clusters |
| `redundantRows` | Sum of `(clusterSize - 1)` across all clusters (keeps one original per cluster) |

### Percentage Metrics

| Metric | Formula |
|--------|---------|
| `pct(n)` | `totalRows === 0 ? 0 : round(n / totalRows * 100)` |
| `usabilityPct` | `pct(validCount)` |
| `attentionPct` | `min(100, pct(cautionCount + rejectedCount))` |
| `criticalPct` | `pct(rejectedCount)` |
| `partialPct` | `pct(cautionCount)` |
| `duplicatePct` | `min(100, pct(redundantRows))` |
| `autoFixPct` | `min(100, pct(autoFixableRows))` |
| `effectiveCount` | `validCount + cautionCount` |
| `effectivePct` | `min(100, round(effectiveCount / totalRows * 100))` |

### Key Invariant

Since `validCount + cautionCount + rejectedCount = totalRows`, the individual percentages for these three categories will always sum to exactly 100% (with rounding variance of +/-1). The `effectivePct` is computed directly from `effectiveCount` and capped at 100 to prevent rounding from pushing it above 100%.
