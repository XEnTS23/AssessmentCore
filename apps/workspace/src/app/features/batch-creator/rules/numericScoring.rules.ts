import { ValidationRule } from "../validation/validationEngine";
import { QuestionRow } from "../core/rowTypes";
import { ValidationIssue } from "../core/issueTypes";
import { TextEntryQuestion } from "../core/questionTypes";

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

export const NUMERIC_ANSWER_NOT_NUMERIC: ValidationRule = {
  id: "NUMERIC_ANSWER_NOT_NUMERIC",
  name: "Numeric Answer Not Numeric",
  category: "content_quality",
  severity: "block",
  priority: 95,
  appliesTo: ["TEXT_ENTRY"],
  validate(row) {
    const q = row.normalizedQuestion as TextEntryQuestion;
    if (q?.mode === "numeric" && q.acceptedAnswers) {
      for (const ans of q.acceptedAnswers) {
        const cleaned = ans.trim();
        if (cleaned === "" || !Number.isFinite(Number(cleaned))) {
          return [
            createIssue(
              this,
              row.id,
              `Numeric mode selected, but answer '${ans}' cannot be parsed as a finite number.`,
              "acceptedAnswers",
              { rawAnswer: ans },
            ),
          ];
        }
      }
    }
    return [];
  },
};

export const INTEGER_ANSWER_NOT_INTEGER: ValidationRule = {
  id: "INTEGER_ANSWER_NOT_INTEGER",
  name: "Integer Answer Not Integer",
  category: "content_quality",
  severity: "block",
  priority: 95,
  appliesTo: ["TEXT_ENTRY"],
  validate(row) {
    const q = row.normalizedQuestion as TextEntryQuestion;
    const isIntegerMode =
      q?.responseMode === "integer" || q?.responseSubtype === "integer";
    if (isIntegerMode && q?.acceptedAnswers) {
      for (const ans of q.acceptedAnswers) {
        const n = Number(ans);
        if (!Number.isFinite(n) || !Number.isInteger(n)) {
          return [
            createIssue(
              this,
              row.id,
              `Integer response mode required, but answer '${ans}' contains decimals or non-integer characters.`,
              "acceptedAnswers",
              { rawAnswer: ans },
              {
                allowedCorrections: [
                  {
                    actionId: "change_to_numeric",
                    label: "Change response mode to numeric",
                    mode: "suggested",
                    proposedValue: "numeric",
                  },
                  {
                    actionId: "correct_answer",
                    label: "Correct accepted answer",
                    mode: "manual_only",
                  },
                  {
                    actionId: "academic_review",
                    label: "Request academic review",
                    mode: "manual_only",
                  },
                ],
              },
            ),
          ];
        }
      }
    }
    return [];
  },
};

export const NUMERIC_TOLERANCE_MISSING: ValidationRule = {
  id: "NUMERIC_TOLERANCE_MISSING",
  name: "Numeric Tolerance Missing",
  category: "scoring",
  severity: "review",
  priority: 85,
  appliesTo: ["TEXT_ENTRY"],
  validate(row) {
    const q = row.normalizedQuestion as TextEntryQuestion;
    if (q?.mode === "numeric" && q.numericTolerance === undefined) {
      return [
        createIssue(
          this,
          row.id,
          "Numeric response question has no tolerance or exact-match rounding policy defined.",
          "numericTolerance",
        ),
      ];
    }
    return [];
  },
};

export const NUMERIC_TOLERANCE_INVALID: ValidationRule = {
  id: "NUMERIC_TOLERANCE_INVALID",
  name: "Numeric Tolerance Invalid",
  category: "scoring",
  severity: "block",
  priority: 90,
  appliesTo: ["TEXT_ENTRY"],
  validate(row) {
    const q = row.normalizedQuestion as TextEntryQuestion;
    if (q?.mode === "numeric" && q.numericTolerance !== undefined) {
      if (
        typeof q.numericTolerance !== "number" ||
        isNaN(q.numericTolerance) ||
        q.numericTolerance < 0
      ) {
        return [
          createIssue(
            this,
            row.id,
            `Numeric tolerance must be a non-negative finite number. Found '${q.numericTolerance}'.`,
            "numericTolerance",
            { tolerance: q.numericTolerance },
          ),
        ];
      }
    }
    return [];
  },
};

export const UNIT_EMBEDDED_IN_NUMERIC_ANSWER: ValidationRule = {
  id: "UNIT_EMBEDDED_IN_NUMERIC_ANSWER",
  name: "Unit Embedded in Numeric Answer",
  category: "content_quality",
  severity: "block",
  priority: 92,
  appliesTo: ["TEXT_ENTRY"],
  validate(row, context) {
    const q = row.normalizedQuestion as TextEntryQuestion;
    if (
      !(
        q?.mode === "numeric" ||
        q?.responseMode === "numeric" ||
        q?.responseMode === "integer"
      )
    )
      return [];

    // Gather all answer candidates: normalized + raw
    const candidates: string[] = [];
    if (q.acceptedAnswers) {
      candidates.push(...q.acceptedAnswers);
    }
    // Also check the raw answer column value (before normalization may strip units)
    const rawAnswerCol =
      context?.columnMapping?.acceptedAnswers ||
      context?.columnMapping?.correctAnswer;
    if (rawAnswerCol && row.rawRow?.[rawAnswerCol]) {
      const rawVal = String(row.rawRow[rawAnswerCol]).trim();
      if (rawVal && !candidates.includes(rawVal)) {
        candidates.push(rawVal);
      }
    }

    const NUMERIC_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

    for (const ans of candidates) {
      const trimmed = ans.trim();
      // Skip valid pure numeric values (including scientific notation)
      if (NUMERIC_PATTERN.test(trimmed)) continue;

      const match = trimmed.match(
        /^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)\s+([a-zA-ZÂ°%/Â²Â³ÂµÎ©]+.*)$/,
      );
      if (match) {
        const valPart = match[1];
        const unitPart = match[2];
        return [
          createIssue(
            this,
            row.id,
            `Numeric answer field '${ans}' contains unit or text. Separate value and unit.`,
            "acceptedAnswers",
            {
              rawAnswer: ans,
              parsedNumericCandidate: valPart,
              parsedUnitCandidate: unitPart,
              parserConfidence: 1,
            },
            {
              allowedCorrections: [
                {
                  actionId: "split_value_unit",
                  label: `Move '${valPart}' into Numerical Answer and '${unitPart}' into Answer Unit`,
                  mode: "suggested",
                  proposedValue: {
                    answer: Number(valPart),
                    unit: unitPart,
                  },
                },
              ],
            },
          ),
        ];
      }

      // Also detect when an answer contains trailing alpha/unit chars without space
      if (/[a-zA-ZÂ°%]/.test(trimmed) && !NUMERIC_PATTERN.test(trimmed)) {
        const alphaMatch = trimmed.match(
          /^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)([a-zA-ZÂ°%/Â²Â³ÂµÎ©]+.*)$/,
        );
        if (alphaMatch) {
          return [
            createIssue(
              this,
              row.id,
              `Numeric answer field '${ans}' contains unit or text. Separate value and unit.`,
              "acceptedAnswers",
              {
                rawAnswer: ans,
                parsedNumericCandidate: alphaMatch[1],
                parsedUnitCandidate: alphaMatch[2],
                parserConfidence: 0.9,
              },
              {
                allowedCorrections: [
                  {
                    actionId: "split_value_unit",
                    label: `Separate into numeric value '${alphaMatch[1]}' and unit '${alphaMatch[2]}'`,
                    mode: "suggested",
                    proposedValue: {
                      answer: Number(alphaMatch[1]),
                      unit: alphaMatch[2],
                    },
                  },
                ],
              },
            ),
          ];
        }
      }
    }
    return [];
  },
};

export const UNIT_POLICY_INVALID: ValidationRule = {
  id: "UNIT_POLICY_INVALID",
  name: "Unit Policy Invalid",
  category: "scoring",
  severity: "review",
  priority: 80,
  appliesTo: ["TEXT_ENTRY"],
  validate(row) {
    const q = row.normalizedQuestion as TextEntryQuestion;
    if (q?.mode === "numeric") {
      const unitPolicy = (q as any).unitPolicy || "optional";
      if (unitPolicy === "required" && (!q.units || q.units.trim() === "")) {
        return [
          createIssue(
            this,
            row.id,
            "Unit policy is set to required, but no unit was provided.",
            "units",
          ),
        ];
      }
    }
    return [];
  },
};

export const POSITIVE_MARKS_INVALID: ValidationRule = {
  id: "POSITIVE_MARKS_INVALID",
  name: "Positive Marks Invalid",
  category: "scoring",
  severity: "block",
  priority: 90,
  appliesTo: "all",
  validate(row) {
    const marks = row.scoringConfig?.marks;
    if (marks !== undefined && (!Number.isFinite(marks) || marks <= 0)) {
      return [
        createIssue(
          this,
          row.id,
          `Positive marks must be a finite number greater than 0. Found '${marks}'.`,
          "marks",
          { marks },
        ),
      ];
    }
    return [];
  },
};

export const NEGATIVE_MARKS_INVALID: ValidationRule = {
  id: "NEGATIVE_MARKS_INVALID",
  name: "Negative Marks Invalid",
  category: "scoring",
  severity: "block",
  priority: 90,
  appliesTo: "all",
  validate(row) {
    const neg = row.metadata?.negativeMarks;
    if (neg !== undefined && (!Number.isFinite(neg) || neg > 0)) {
      return [
        createIssue(
          this,
          row.id,
          `Negative marks penalty must be a finite non-positive number (<= 0). Found '${neg}'.`,
          "negativeMarks",
          { negativeMarks: neg },
        ),
      ];
    }
    return [];
  },
};

export const NEGATIVE_MARKS_EXCEED_POSITIVE: ValidationRule = {
  id: "NEGATIVE_MARKS_EXCEED_POSITIVE",
  name: "Negative Marks Exceed Positive",
  category: "scoring",
  severity: "block",
  priority: 88,
  appliesTo: "all",
  requires: ["POSITIVE_MARKS_VALID", "NEGATIVE_MARKS_VALID"],
  validate(row) {
    const pos = row.scoringConfig?.marks || 0;
    const neg = row.metadata?.negativeMarks;
    if (neg !== undefined && Math.abs(neg) > pos) {
      return [
        createIssue(
          this,
          row.id,
          `Absolute penalty magnitude (${Math.abs(neg)}) exceeds positive marks (+${pos}).`,
          "negativeMarks",
          { pos, neg },
        ),
      ];
    }
    return [];
  },
};

export const QUESTION_SCORING_CONFLICTS_WITH_SECTION: ValidationRule = {
  id: "QUESTION_SCORING_CONFLICTS_WITH_SECTION",
  name: "Question Scoring Conflicts With Section",
  category: "scoring",
  severity: "review",
  priority: 80,
  appliesTo: "all",
  validate(row, context) {
    const sectionMarks =
      context.exportConfig?.scoring?.sectionDefaultMarks ??
      (context.exportConfig as any)?.scoring?.sectionDefaultMarks ??
      (context.exportConfig as any)?.sectionDefaultMarks;
    if (
      sectionMarks &&
      row.scoringConfig?.marks &&
      row.scoringConfig.marks !== sectionMarks
    ) {
      if (!(row as any).scoringOverrideApproved) {
        return [
          createIssue(
            this,
            row.id,
            `Question marks (+${row.scoringConfig.marks}) differ from section default scheme (+${sectionMarks}).`,
            "marks",
            { questionMarks: row.scoringConfig.marks, sectionMarks },
          ),
        ];
      }
    }
    return [];
  },
};

export const PARTIAL_MARKING_AMBIGUOUS: ValidationRule = {
  id: "PARTIAL_MARKING_AMBIGUOUS",
  name: "Partial Marking Ambiguous",
  category: "scoring",
  severity: "block",
  priority: 85,
  appliesTo: ["MSQ"],
  validate(row) {
    const partial = row.scoringConfig?.partialMarking as
      | boolean
      | { enabled: boolean; strategy?: string };
    if (typeof partial === "object" && partial.enabled && !partial.strategy) {
      return [
        createIssue(
          this,
          row.id,
          "Partial marking is enabled but partial scoring strategy is undefined.",
          "partialMarking",
        ),
      ];
    }
    return [];
  },
};

export const TIME_LIMIT_INVALID: ValidationRule = {
  id: "TIME_LIMIT_INVALID",
  name: "Time Limit Invalid",
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
          `Time limit must be a finite number greater than 0 seconds. Found '${seconds}'.`,
          "timeLimitSeconds",
          { timeLimitSeconds: seconds },
        ),
      ];
    }
    return [];
  },
};

export const INACTIVE_FIELD_CONTAINS_DATA: ValidationRule = {
  id: "INACTIVE_FIELD_CONTAINS_DATA",
  name: "Inactive Field Contains Data",
  category: "content_quality",
  severity: "review",
  priority: 85,
  appliesTo: "all",
  validate(row, context) {
    const q = row.normalizedQuestion;
    const qType = q?.type || "UNKNOWN";
    if (qType === "TEXT_ENTRY") return [];

    const numAnsCol =
      context?.columnMapping?.acceptedAnswers || "Numerical_Answer";
    const rawVal = row.rawRow?.[numAnsCol];
    if (
      rawVal !== undefined &&
      rawVal !== null &&
      String(rawVal).trim() !== ""
    ) {
      const strVal = String(rawVal).trim();
      const rawType =
        row.rawType || (row.rawRow as any)?.Question_Type || qType;
      return [
        createIssue(
          this,
          row.id,
          `Inactive field '${numAnsCol}' contains data ('${strVal}') for question type '${rawType}'.`,
          numAnsCol,
          {
            rawType,
            inactiveField: numAnsCol,
            rawValue: strVal,
          },
        ),
      ];
    }
    return [];
  },
};
