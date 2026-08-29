import { ValidationRule } from "../validation/validationEngine";
import { QuestionRow } from "../core/rowTypes";
import { ValidationIssue } from "../core/issueTypes";

function createIssue(
  rule: Pick<ValidationRule, "id" | "category" | "severity">,
  rowId: string,
  message: string,
  field?: string,
  evidence?: Record<string, unknown>,
  options?: Partial<ValidationIssue>,
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
    blocksExport:
      rule.severity === "block" || rule.severity === "engine_defect",
    ...options,
  };
}

export const REPORT_FIELD_MISLABELED: ValidationRule = {
  id: "REPORT_FIELD_MISLABELED",
  name: "Report Field Mislabeled Check",
  category: "system_defect",
  severity: "engine_defect",
  priority: 40,
  appliesTo: "all",
  validate(row) {
    if ((row as any).__reportMislabeled) {
      return [
        createIssue(
          this,
          row.id,
          "Validator defect: Report heading or binding displays a canonical field under an incorrect label.",
          "report",
        ),
      ];
    }
    return [];
  },
};

export const ISSUE_MESSAGE_TRUNCATED: ValidationRule = {
  id: "ISSUE_MESSAGE_TRUNCATED",
  name: "Issue Message Truncated Check",
  category: "system_defect",
  severity: "engine_defect",
  priority: 40,
  appliesTo: "all",
  validate(row) {
    for (const issue of row.issues || []) {
      if (
        issue.message &&
        (issue.message.endsWith("...") ||
          issue.message.endsWith("accepte accep"))
      ) {
        return [
          createIssue(
            this,
            row.id,
            `Validator defect: Issue message for rule ${issue.ruleId} was truncated in output UI.`,
            "message",
            { truncatedMessage: issue.message },
          ),
        ];
      }
    }
    return [];
  },
};

export const DUPLICATE_MATCH_CONTEXT_MISSING: ValidationRule = {
  id: "DUPLICATE_MATCH_CONTEXT_MISSING",
  name: "Duplicate Match Context Missing",
  category: "system_defect",
  severity: "engine_defect",
  priority: 40,
  appliesTo: "all",
  validate(row) {
    const hasDupIssue = row.issues?.some(
      (i) =>
        i.ruleId === "DUPLICATE_NORMALIZED_STEM_REVIEW" ||
        i.ruleId === "EXACT_DUPLICATE_STEM",
    );
    if (hasDupIssue) {
      const dupIssue = row.issues.find(
        (i) =>
          i.ruleId === "DUPLICATE_NORMALIZED_STEM_REVIEW" ||
          i.ruleId === "EXACT_DUPLICATE_STEM",
      );
      if (
        dupIssue &&
        (!dupIssue.relatedRows || dupIssue.relatedRows.length === 0)
      ) {
        return [
          createIssue(
            this,
            row.id,
            "Validator defect: Duplicate warning emitted without identifying matching row IDs or context.",
            "issues",
          ),
        ];
      }
    }
    return [];
  },
};

export const CORRECTION_ACTION_AMBIGUOUS: ValidationRule = {
  id: "CORRECTION_ACTION_AMBIGUOUS",
  name: "Correction Action Ambiguous Check",
  category: "system_defect",
  severity: "engine_defect",
  priority: 40,
  appliesTo: "all",
  validate(row) {
    if ((row as any).__ambiguousCorrectionAction) {
      return [
        createIssue(
          this,
          row.id,
          "Validator defect: UI flagged row invalid without providing actionable correction paths.",
          "correction",
        ),
      ];
    }
    return [];
  },
};

export const CORRECTION_AUDIT_TRAIL_MISSING: ValidationRule = {
  id: "CORRECTION_AUDIT_TRAIL_MISSING",
  name: "Correction Audit Trail Missing",
  category: "ingestion",
  severity: "block",
  priority: 95,
  appliesTo: "all",
  validate(row) {
    if ((row as any).__manuallyEditedWithoutAudit) {
      return [
        createIssue(
          this,
          row.id,
          "Manual or automatic correction modified question content without recording a complete audit entry.",
          "audit",
        ),
      ];
    }
    return [];
  },
};
