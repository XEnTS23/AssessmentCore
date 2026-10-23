import {
  ValidationRule,
  ValidationContext,
} from "../validation/validationEngine";
import { QuestionRow } from "../core/rowTypes";
import { ValidationIssue } from "../core/issueTypes";
import { validateMediaReference } from "../media/mediaValidator";
import { analyzeLatexDelimiters } from "../validation/latexDelimiterValidator";

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
    ...options,
  };
}

export const REQUIRED_QUESTION_FIELD: ValidationRule = {
  id: "REQUIRED_QUESTION_FIELD",
  name: "Required Question Field",
  category: "structural",
  severity: "block",
  priority: 100,
  appliesTo: "all",
  validate(row) {
    const issues: ValidationIssue[] = [];
    if (!row.normalizedQuestion?.type) return issues; // Handled by UNKNOWN

    // Every question needs a stem
    const q = row.normalizedQuestion;
    const stemStr =
      q && "stem" in q && q.stem
        ? q.stem
        : q && "rawStem" in q && (q as any).rawStem
          ? (q as any).rawStem
          : "";
    if (q && q.type !== "UNKNOWN" && (!stemStr || stemStr.trim() === "")) {
      issues.push(
        createIssue(this, row.id, "Question stem is required.", "stem"),
      );
    }

    return issues;
  },
};

export const UNKNOWN_QUESTION_TYPE_BLOCK: ValidationRule = {
  id: "UNKNOWN_QUESTION_TYPE_BLOCK",
  name: "Unknown Question Type Block",
  category: "structural",
  severity: "block",
  priority: 99,
  appliesTo: ["UNKNOWN"],
  validate(row) {
    return [
      createIssue(
        this,
        row.id,
        "Question type could not be determined.",
        "type",
      ),
    ];
  },
};

export const EMPTY_ROW_WARNING: ValidationRule = {
  id: "EMPTY_ROW_WARNING",
  name: "Empty Row Warning",
  category: "content_quality",
  severity: "warning",
  priority: 50,
  appliesTo: "all",
  validate(row, context) {
    const q = row.normalizedQuestion;
    if (q?.type === "UNKNOWN" && (!q.rawStem || q.rawStem.trim() === "")) {
      // Check if raw row has any data in the mapped columns
      const hasData = Object.keys(context.columnMapping).some((key) => {
        const mappedCol = (context.columnMapping as any)[key];
        return (
          mappedCol &&
          row.rawRow[mappedCol] &&
          String(row.rawRow[mappedCol]).trim() !== ""
        );
      });

      if (!hasData) {
        return [
          createIssue(this, row.id, "Row appears to be completely empty."),
        ];
      }
    }
    return [];
  },
};

export const DUPLICATE_QUESTION_ID: ValidationRule = {
  id: "DUPLICATE_QUESTION_ID",
  name: "Duplicate Question ID",
  category: "metadata",
  severity: "block",
  priority: 90,
  appliesTo: "all",
  validate(row, context) {
    if (!row.metadata?.questionId) return [];

    const duplicates = context.allRows.filter(
      (r) =>
        r.id !== row.id && r.metadata?.questionId === row.metadata.questionId,
    );

    if (duplicates.length > 0) {
      return [
        createIssue(
          this,
          row.id,
          `Duplicate Question ID found: ${row.metadata.questionId}`,
          "questionId",
        ),
      ];
    }
    return [];
  },
};

export const DUPLICATE_NORMALIZED_STEM_REVIEW: ValidationRule = {
  id: "DUPLICATE_NORMALIZED_STEM_REVIEW",
  name: "Duplicate Stem Review",
  category: "content_quality",
  severity: "review",
  priority: 80,
  appliesTo: ["MCQ", "MSQ", "TEXT_ENTRY"],
  requires: ["STEM_PRESENT", "STEM_INTEGRITY_VALID"],
  validate(row, context) {
    const q = row.normalizedQuestion;
    if (!q || q.type === "UNKNOWN" || !q.stem) return [];

    const stemClean = q.stem.trim().toLowerCase();

    const duplicates = context.allRows.filter((r) => {
      if (r.id === row.id) return false;
      const otherQ = r.normalizedQuestion;
      if (!otherQ || otherQ.type === "UNKNOWN" || !otherQ.stem) return false;
      return otherQ.stem.trim().toLowerCase() === stemClean;
    });

    if (duplicates.length > 0) {
      const duplicateGroupId = `DUP-STEM-${row.sourceRowNumber || row.id}`;
      const relatedRows = duplicates.map((dup) => ({
        submissionId: (dup as any).submissionId,
        questionId:
          dup.metadata?.questionId || (dup.rawRow as any)?.Question_ID,
        similarityScore: 1.0,
        rowNumber: dup.sourceRowNumber,
      }));

      const matchingIdsStr = relatedRows
        .map((r) =>
          r.questionId ? `\`${r.questionId}\`` : `Row ${r.rowNumber}`,
        )
        .join(", ");

      return [
        createIssue(
          this,
          row.id,
          `Question stem is identical to matching rows: ${matchingIdsStr}.`,
          "stem",
          { duplicateGroupId, matchingCount: duplicates.length },
          { duplicateGroupId, relatedRows },
        ),
      ];
    }
    return [];
  },
};

export const LATEX_STEM_DELIMITER_VALID: ValidationRule = {
  id: "LATEX_STEM_DELIMITER_VALID",
  name: "Valid LaTeX Delimiters in Question Stem",
  category: "content_quality",
  severity: "review",
  priority: 85,
  appliesTo: ["MCQ", "MSQ", "TEXT_ENTRY", "ORDER"],
  validate(row) {
    const q = row.normalizedQuestion;
    if (!q || q.type === "UNKNOWN" || !q.stem) return [];

    return analyzeLatexDelimiters(q.stem).issues.map((issue) =>
      createIssue(this, row.id, issue.message, "stem", {
        issueCode: issue.code,
        index: issue.index,
        delimiter: issue.delimiter,
        expectedDelimiter: issue.expectedDelimiter,
        commands: issue.commands,
      }),
    );
  },
};

// Kept as an export alias so direct imports continue to work while the active
// rule now validates all supported delimiter failures.
export const LATEX_DELIMITER_UNCLOSED = LATEX_STEM_DELIMITER_VALID;

export const MEDIA_URL_INVALID_FORMAT: ValidationRule = {
  id: "MEDIA_URL_INVALID_FORMAT",
  name: "Invalid Media URL",
  category: "media",
  severity: "block",
  priority: 95,
  appliesTo: "all",
  validate(row) {
    const issues: ValidationIssue[] = [];

    for (const [index, ref] of (row.mediaReferences || []).entries()) {
      const urlIssues = validateMediaReference(ref);
      for (const ui of urlIssues) {
        issues.push({
          id: crypto.randomUUID(),
          ruleId: this.id,
          rowId: row.id,
          category: "media",
          severity: ui.severity,
          message: ui.message,
          field: `mediaReferences[${index}]`,
          evidence: { mediaIssueCode: ui.code, mediaId: ref.id },
        });
      }
    }

    return issues;
  },
};

export const MARKS_INVALID: ValidationRule = {
  id: "MARKS_INVALID",
  name: "Invalid Marks",
  category: "scoring",
  severity: "block",
  priority: 90,
  appliesTo: "all",
  validate(row) {
    if (row.scoringConfig?.marks !== undefined) {
      if (
        !Number.isFinite(row.scoringConfig.marks) ||
        row.scoringConfig.marks <= 0
      ) {
        return [
          createIssue(
            this,
            row.id,
            "Marks must be a finite number greater than 0.",
            "marks",
          ),
        ];
      }
    }
    return [];
  },
};

export const NEGATIVE_MARKS_INVALID: ValidationRule = {
  id: "NEGATIVE_MARKS_INVALID",
  name: "Invalid Negative Marks",
  category: "scoring",
  severity: "block",
  priority: 90,
  appliesTo: "all",
  validate(row) {
    if (row.metadata?.negativeMarks !== undefined) {
      if (
        !Number.isFinite(row.metadata.negativeMarks) ||
        row.metadata.negativeMarks > 0
      ) {
        return [
          createIssue(
            this,
            row.id,
            "Negative marks must be a finite number less than or equal to 0.",
            "negativeMarks",
          ),
        ];
      }
    }
    return [];
  },
};

export const TIME_LIMIT_INVALID: ValidationRule = {
  id: "TIME_LIMIT_INVALID",
  name: "Invalid Time Limit",
  category: "metadata",
  severity: "block",
  priority: 90,
  appliesTo: "all",
  validate(row) {
    const seconds = row.timeLimitConfig?.timeLimitSeconds;
    if (seconds !== undefined && (!Number.isFinite(seconds) || seconds <= 0)) {
      return [
        createIssue(
          this,
          row.id,
          "Time limit must be a finite number greater than 0 seconds.",
          "timeLimitSeconds",
        ),
      ];
    }
    return [];
  },
};

export const YEAR_INVALID: ValidationRule = {
  id: "YEAR_INVALID",
  name: "Invalid Year",
  category: "metadata",
  severity: "warning",
  priority: 60,
  appliesTo: "all",
  validate(row) {
    if (row.metadata?.year) {
      const year = parseInt(row.metadata.year, 10);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < 1900 || year > currentYear + 5) {
        return [
          createIssue(
            this,
            row.id,
            `Unusual year value: ${row.metadata.year}`,
            "year",
          ),
        ];
      }
    }
    return [];
  },
};
