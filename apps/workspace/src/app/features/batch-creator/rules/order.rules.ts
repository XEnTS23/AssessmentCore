import { ValidationRule } from "../validation/validationEngine";
import { ValidationIssue } from "../core/issueTypes";
import { OrderQuestion } from "../core/questionTypes";

function createIssue(
  rule: Pick<ValidationRule, "id" | "category" | "severity">,
  rowId: string,
  message: string,
  field?: string,
  evidence?: Record<string, unknown>,
  suggestedFixes?: any[],
): ValidationIssue {
  return {
    id: crypto.randomUUID(),
    ruleId: rule.id,
    rowId,
    category: rule.category,
    severity: rule.severity,
    message,
    field,
    evidence,
    suggestedFixes,
  };
}

export const ORDER_MIN_OPTIONS: ValidationRule = {
  id: "ORDER_MIN_OPTIONS",
  name: "Order Minimum Options",
  category: "structural",
  severity: "block",
  priority: 100,
  appliesTo: ["ORDER"],
  validate(row) {
    const q = row.normalizedQuestion as OrderQuestion;
    if (!q.options || q.options.length < 2) {
      return [
        createIssue(
          this,
          row.id,
          "Ordering question must have at least 2 options to order.",
          "options",
        ),
      ];
    }
    return [];
  },
};

export const ORDER_HAS_CORRECT_SEQUENCE: ValidationRule = {
  id: "ORDER_HAS_CORRECT_SEQUENCE",
  name: "Order Has Correct Sequence",
  category: "structural",
  severity: "block",
  priority: 95,
  appliesTo: ["ORDER"],
  validate(row) {
    const q = row.normalizedQuestion as OrderQuestion;
    if (!q.correctSequenceIds || q.correctSequenceIds.length === 0) {
      return [
        createIssue(
          this,
          row.id,
          "Correct sequence is required.",
          "correctSequenceIds",
        ),
      ];
    }

    if (q.options && q.correctSequenceIds.length !== q.options.length) {
      return [
        createIssue(
          this,
          row.id,
          `Correct sequence length (${q.correctSequenceIds.length}) must match the number of options (${q.options.length}).`,
          "correctSequenceIds",
        ),
      ];
    }
    return [];
  },
};

export const ORDER_SEQUENCE_MATCH: ValidationRule = {
  id: "ORDER_SEQUENCE_MATCH",
  name: "Order Sequence Match Options",
  category: "structural",
  severity: "block",
  priority: 90,
  appliesTo: ["ORDER"],
  validate(row) {
    const q = row.normalizedQuestion as OrderQuestion;
    if (!q.correctSequenceIds || !q.options) return [];

    const optionIds = new Set(q.options.map((o) => o.id));
    const issues: ValidationIssue[] = [];

    for (const seqId of q.correctSequenceIds) {
      if (!optionIds.has(seqId)) {
        issues.push(
          createIssue(
            this,
            row.id,
            `Sequence item '${seqId}' does not match any option.`,
            "correctSequenceIds",
          ),
        );
      }
    }

    // Also check for duplicates in the sequence
    const uniqueSeq = new Set(q.correctSequenceIds);
    if (uniqueSeq.size !== q.correctSequenceIds.length) {
      issues.push(
        createIssue(
          this,
          row.id,
          "Correct sequence contains duplicate items.",
          "correctSequenceIds",
        ),
      );
    }

    return issues;
  },
};
