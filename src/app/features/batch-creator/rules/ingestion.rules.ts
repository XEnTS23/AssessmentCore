import {
  ValidationRule,
  ValidationContext,
} from "../validation/validationEngine";
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

export const COLUMN_MAPPING_AMBIGUOUS: ValidationRule = {
  id: "COLUMN_MAPPING_AMBIGUOUS",
  name: "Column Mapping Ambiguous",
  category: "ingestion",
  severity: "block",
  priority: 100,
  appliesTo: "all",
  validate(row, context) {
    const amb =
      (context as any).ambiguousMappings ||
      (context.columnMapping as any)?.__ambiguous;
    if (amb && amb.length > 0) {
      return [
        createIssue(
          this,
          row.id,
          `Multiple candidate columns detected for canonical fields: ${amb.join(", ")}. Explicit selection required.`,
          "columnMapping",
          { candidateColumns: amb },
        ),
      ];
    }
    return [];
  },
};

export const QUESTION_ID_FIELD_MISMAPPED: ValidationRule = {
  id: "QUESTION_ID_FIELD_MISMAPPED",
  name: "Question ID Field Mismapped",
  category: "ingestion",
  severity: "block",
  priority: 98,
  appliesTo: "all",
  validate(row) {
    const qid = row.metadata?.questionId;
    if (
      qid &&
      (qid.startsWith("SUB-") ||
        qid.startsWith("SUBMISSION_") ||
        qid.startsWith("TEMP_ROW_"))
    ) {
      return [
        createIssue(
          this,
          row.id,
          `Intake submission identifier '${qid}' mapped as canonical Question ID. Verify column mapping.`,
          "questionId",
          { rawQid: qid },
        ),
      ];
    }
    return [];
  },
};

export const QUESTION_TYPE_ALIAS_UNMAPPED: ValidationRule = {
  id: "QUESTION_TYPE_ALIAS_UNMAPPED",
  name: "Question Type Alias Unmapped",
  category: "ingestion",
  severity: "block",
  priority: 99,
  appliesTo: ["UNKNOWN"],
  validate(row) {
    const q = row.normalizedQuestion;
    if (q?.type === "UNKNOWN" && (q as any).rawType) {
      return [
        createIssue(
          this,
          row.id,
          `Raw question type '${(q as any).rawType}' is not mapped to any supported canonical type.`,
          "type",
          { rawType: (q as any).rawType },
        ),
      ];
    }
    return [];
  },
};

export const EXPLICIT_TYPE_OVERRIDDEN: ValidationRule = {
  id: "EXPLICIT_TYPE_OVERRIDDEN",
  name: "Explicit Type Overridden",
  category: "ingestion",
  severity: "block",
  priority: 99,
  appliesTo: "all",
  validate(row) {
    const q = row.normalizedQuestion;
    if (q?.type === "UNSUPPORTED") {
      return [
        createIssue(
          this,
          row.id,
          `Explicit raw question type '${(q as any).rawType}' is unsupported for canonical export and must not be silently converted.`,
          "type",
          { rawType: (q as any).rawType },
        ),
      ];
    }
    return [];
  },
};

export const RESPONSE_SUBTYPE_LOST: ValidationRule = {
  id: "RESPONSE_SUBTYPE_LOST",
  name: "Response Subtype Lost",
  category: "ingestion",
  severity: "block",
  priority: 95,
  appliesTo: ["TEXT_ENTRY"],
  validate(row) {
    const q = row.normalizedQuestion;
    if (q?.type === "TEXT_ENTRY") {
      if (q.responseSubtype === "integer") {
        const nonIntegers = q.acceptedAnswers?.filter((ans) => {
          const n = Number(ans);
          return isNaN(n) || !Number.isInteger(n);
        });
        if (nonIntegers && nonIntegers.length > 0) {
          return [
            createIssue(
              this,
              row.id,
              `Integer response subtype required, but accepted answer '${nonIntegers.join(", ")}' is not an integer.`,
              "acceptedAnswers",
              { nonIntegers },
            ),
          ];
        }
      }
    }
    return [];
  },
};

export const NEGATIVE_MARKS_CONVENTION_AMBIGUOUS: ValidationRule = {
  id: "NEGATIVE_MARKS_CONVENTION_AMBIGUOUS",
  name: "Negative Marks Convention Ambiguous",
  category: "scoring",
  severity: "review",
  priority: 85,
  appliesTo: "all",
  validate(row) {
    const rawNeg = row.metadata?.negativeMarks;
    if (
      rawNeg !== undefined &&
      rawNeg > 0 &&
      !(row as any).negativeMarksConventionConfirmed
    ) {
      return [
        createIssue(
          this,
          row.id,
          `Negative marks specified as positive magnitude (+${rawNeg}). Confirm whether this represents a deduction (-${rawNeg}).`,
          "negativeMarks",
          { rawNeg },
        ),
      ];
    }
    return [];
  },
};

export const NORMALIZATION_AUDIT_MISSING: ValidationRule = {
  id: "NORMALIZATION_AUDIT_MISSING",
  name: "Normalization Audit Missing",
  category: "ingestion",
  severity: "block",
  priority: 90,
  appliesTo: "all",
  validate(row) {
    // If transformations occurred (like sign flipping or stem trimming) but audit trail is empty
    if (
      row.history &&
      row.history.length > 0 &&
      (!row.normalizationAudit || row.normalizationAudit.length === 0)
    ) {
      const hasMeaningfulTransform =
        row.scoringConfig?.marks !== undefined ||
        row.metadata?.negativeMarks !== undefined;
      if (hasMeaningfulTransform && (row as any).__transformedWithoutAudit) {
        return [
          createIssue(
            this,
            row.id,
            "Row data underwent value transformation without a complete normalization audit log.",
            "normalizationAudit",
          ),
        ];
      }
    }
    return [];
  },
};

export const UNSUPPORTED_TYPE_FOR_TARGET_EXPORT: ValidationRule = {
  id: "UNSUPPORTED_TYPE_FOR_TARGET_EXPORT",
  name: "Unsupported Type for Target Export Profile",
  category: "export_readiness",
  severity: "block",
  priority: 99,
  appliesTo: ["UNSUPPORTED"],
  validate(row) {
    const rawType =
      (row.normalizedQuestion as any)?.rawType ||
      (row.rawRow as any)?.Question_Type ||
      "UNSUPPORTED";
    return [
      createIssue(
        this,
        row.id,
        `Question type '${rawType}' is unsupported for the current target export profile.`,
        "type",
        { rawType },
      ),
    ];
  },
};
