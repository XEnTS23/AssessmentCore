import { QuestionRow } from "../core/rowTypes";
import { BatchIssue } from "../core/issueTypes";

export type NegativeMarksInputMode =
  | "signed"
  | "positive_penalty_magnitude"
  | "unresolved";

export interface BatchScoringConvention {
  negativeMarksInputMode: NegativeMarksInputMode;
  source: "explicit_config" | "user_confirmation" | "inferred";
  confidence: number;
}

/**
 * Inspects all rows in a batch to infer whether negative mark values are entered
 * as signed numbers (-1) or positive penalty magnitudes (+1).
 */
export function detectBatchScoringConvention(
  rows: QuestionRow[],
  userOverride?: NegativeMarksInputMode,
): BatchScoringConvention {
  if (userOverride) {
    return {
      negativeMarksInputMode: userOverride,
      source: "user_confirmation",
      confidence: 1.0,
    };
  }

  let positiveCount = 0;
  let negativeCount = 0;
  let zeroCount = 0;

  for (const row of rows) {
    const neg = row.metadata?.negativeMarks;
    if (neg !== undefined && neg !== null && Number.isFinite(Number(neg))) {
      const num = Number(neg);
      if (num > 0) positiveCount++;
      else if (num < 0) negativeCount++;
      else zeroCount++;
    }
  }

  const totalPopulated = positiveCount + negativeCount;
  if (totalPopulated === 0) {
    return {
      negativeMarksInputMode: "signed",
      source: "inferred",
      confidence: 1.0,
    };
  }

  // If > 70% of populated penalty values are positive magnitude (e.g. Negative_Marks = 1)
  if (positiveCount / totalPopulated > 0.7) {
    return {
      negativeMarksInputMode: "positive_penalty_magnitude",
      source: "inferred",
      confidence: positiveCount / totalPopulated,
    };
  }

  if (negativeCount / totalPopulated > 0.7) {
    return {
      negativeMarksInputMode: "signed",
      source: "inferred",
      confidence: negativeCount / totalPopulated,
    };
  }

  return {
    negativeMarksInputMode: "unresolved",
    source: "inferred",
    confidence: 0.5,
  };
}

/**
 * Normalizes row metadata.negativeMarks according to the batch scoring convention.
 * If mode === 'positive_penalty_magnitude', converts +1 to -1 and logs audit entry.
 */
export function applyScoringConventionToBatch(
  rows: QuestionRow[],
  convention: BatchScoringConvention,
): { rows: QuestionRow[]; batchIssues: BatchIssue[] } {
  const batchIssues: BatchIssue[] = [];
  const now = new Date().toISOString();

  if (convention.negativeMarksInputMode === "positive_penalty_magnitude") {
    batchIssues.push({
      id: crypto.randomUUID(),
      ruleId: "NEGATIVE_MARKS_CONVENTION_AMBIGUOUS",
      rowId: "batch-level",
      category: "scoring",
      severity: "review",
      scope: "batch",
      message:
        "Negative marks detected as positive penalty magnitudes (e.g., +1). Automatically normalized to deductions (-1). Please confirm.",
      allowedCorrections: [
        {
          actionId: "confirm_positive_magnitude",
          label: "Confirm Positive Penalty Magnitudes (-1 deduction)",
          mode: "safe_auto",
        },
        {
          actionId: "keep_signed",
          label: "Keep Signed Input Mode",
          mode: "manual_only",
        },
      ],
    });
  }

  const normalizedRows = rows.map((row) => {
    const rawNeg = row.metadata?.negativeMarks;
    if (
      rawNeg !== undefined &&
      rawNeg !== null &&
      Number.isFinite(Number(rawNeg))
    ) {
      const num = Number(rawNeg);
      let normalized = num;

      if (
        convention.negativeMarksInputMode === "positive_penalty_magnitude" &&
        num > 0
      ) {
        normalized = -Math.abs(num);
      }

      const auditEntry = {
        field: "negativeMarks",
        rawValue: rawNeg,
        normalizedValue: normalized,
        ruleId: "NORMALIZE_POSITIVE_PENALTY_MAGNITUDE",
        actorType: "system" as const,
        timestamp: now,
      };

      return {
        ...row,
        metadata: {
          ...row.metadata,
          negativeMarks: normalized,
        },
        normalizationAudit: [...(row.normalizationAudit || []), auditEntry],
      };
    }
    return row;
  });

  return { rows: normalizedRows, batchIssues };
}
