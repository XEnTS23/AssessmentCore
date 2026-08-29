import { ValidationRule } from "../validation/validationEngine";
import { QuestionRow } from "../core/rowTypes";
import { ValidationIssue } from "../core/issueTypes";
import {
  McqQuestion,
  MsqQuestion,
  TextEntryQuestion,
} from "../core/questionTypes";
import { extractFinalResultFromExplanation } from "../validation/explanationResultExtractor";

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

export const EXPLANATION_MISSING: ValidationRule = {
  id: "EXPLANATION_MISSING",
  name: "Explanation Missing",
  category: "academic_consistency",
  severity: "review",
  priority: 75,
  appliesTo: "all",
  validate(row, context) {
    const q = row.normalizedQuestion;
    if (
      q &&
      q.type !== "UNKNOWN" &&
      (!q.explanation || q.explanation.trim() === "")
    ) {
      const isRequired = context.exportConfig?.requireExplanations ?? false;
      if (isRequired) {
        return [
          createIssue(
            this,
            row.id,
            "Question explanation is missing.",
            "explanation",
          ),
        ];
      }
    }
    return [];
  },
};

export const EXPLANATION_INSUFFICIENT: ValidationRule = {
  id: "EXPLANATION_INSUFFICIENT",
  name: "Explanation Insufficient",
  category: "academic_consistency",
  severity: "review",
  priority: 70,
  appliesTo: "all",
  validate(row) {
    const question = row.normalizedQuestion;
    const exp =
      question && "explanation" in question
        ? question.explanation?.trim()
        : undefined;
    if (exp) {
      const lower = exp.toLowerCase();
      if (
        lower.includes("ans is obvious") ||
        lower.includes("use shortcut") ||
        exp.length < 8
      ) {
        return [
          createIssue(
            this,
            row.id,
            `Explanation text '${exp}' appears vague or insufficient. Detail derivation or reasoning.`,
            "explanation",
            { explanation: exp },
          ),
        ];
      }
    }
    return [];
  },
};

export const EXPLANATION_KEY_MISMATCH: ValidationRule = {
  id: "EXPLANATION_KEY_MISMATCH",
  name: "Explanation Key Mismatch",
  category: "academic_consistency",
  severity: "block",
  priority: 95,
  appliesTo: ["MCQ", "MSQ"],
  requires: ["EXPLANATION_PRESENT", "EXPLANATION_CONCLUSION_EXTRACTED"],
  validate(row) {
    const q = row.normalizedQuestion as McqQuestion | MsqQuestion;
    const extracted = extractFinalResultFromExplanation(q.explanation || "");
    if (
      !extracted ||
      extracted.confidence < 0.9 ||
      !["option", "option_set"].includes(extracted.mode)
    )
      return [];

    const structured =
      q.type === "MCQ"
        ? ([
            q.options.find((option) => option.id === q.correctAnswerId)?.label,
          ].filter(Boolean) as string[])
        : q.correctAnswerIds.map(
            (id) => q.options.find((option) => option.id === id)?.label || id,
          );
    const stated = (
      Array.isArray(extracted.value)
        ? extracted.value
        : [String(extracted.value)]
    )
      .map((value) => value.toUpperCase())
      .sort();
    const expected = structured.map((value) => value.toUpperCase()).sort();
    if (
      stated.length === expected.length &&
      stated.every((value, index) => value === expected[index])
    )
      return [];

    return [
      createIssue(
        this,
        row.id,
        `Explanation concludes with option set '${stated.join(",")}', but structured answer is '${expected.join(",")}'.`,
        "explanation",
        {
          extractedValue: stated,
          structuredValue: expected,
          confidence: extracted.confidence,
          extractionMethod: extracted.extractionMethod,
          sourceSpan: extracted.sourceSpan,
          comparisonPolicy: "normalized_option_set_exact_match",
        },
      ),
    ];
  },
};

export const EXPLANATION_RESULT_MISMATCH: ValidationRule = {
  id: "EXPLANATION_RESULT_MISMATCH",
  name: "Explanation Result Mismatch",
  category: "academic_consistency",
  severity: "block",
  priority: 95,
  appliesTo: ["TEXT_ENTRY"],
  requires: [
    "NUMERIC_ANSWER_VALID",
    "EXPLANATION_PRESENT",
    "EXPLANATION_CONCLUSION_EXTRACTED",
  ],
  validate(row) {
    const q = row.normalizedQuestion as TextEntryQuestion;
    const extracted = extractFinalResultFromExplanation(q.explanation || "");
    if (
      !extracted ||
      extracted.mode !== "numeric" ||
      extracted.confidence < 0.9
    )
      return [];

    const tolerance = q.numericTolerance ?? 0;
    const acceptedValues = q.acceptedAnswers
      .map(Number)
      .filter(Number.isFinite);
    if (
      acceptedValues.some(
        (value) => Math.abs(value - Number(extracted.value)) <= tolerance,
      )
    )
      return [];
    return [
      createIssue(
        this,
        row.id,
        `Explanation concludes with high-confidence result '${extracted.value}', but accepted answer is '${q.acceptedAnswers.join(", ")}'.`,
        "explanation",
        {
          extractedValue: extracted.value,
          structuredValue: q.acceptedAnswers,
          confidence: extracted.confidence,
          extractionMethod: extracted.extractionMethod,
          sourceSpan: extracted.sourceSpan,
          comparisonPolicy: {
            mode: tolerance === 0 ? "exact_numeric" : "absolute_tolerance",
            tolerance,
            unit: q.units || null,
          },
        },
      ),
    ];
  },
};

export const POSSIBLE_EXPLANATION_RESULT_MISMATCH: ValidationRule = {
  id: "POSSIBLE_EXPLANATION_RESULT_MISMATCH",
  name: "Possible Explanation Result Mismatch",
  category: "academic_consistency",
  severity: "review",
  priority: 90,
  appliesTo: ["TEXT_ENTRY"],
  requires: [
    "NUMERIC_ANSWER_VALID",
    "EXPLANATION_PRESENT",
    "EXPLANATION_CONCLUSION_EXTRACTED",
  ],
  validate(row) {
    const q = row.normalizedQuestion as TextEntryQuestion;
    const extracted = extractFinalResultFromExplanation(q.explanation || "");
    if (
      !extracted ||
      extracted.mode !== "numeric" ||
      extracted.confidence < 0.65 ||
      extracted.confidence >= 0.9
    )
      return [];

    const tolerance = q.numericTolerance ?? 0;
    const acceptedValues = q.acceptedAnswers
      .map(Number)
      .filter(Number.isFinite);
    if (
      acceptedValues.some(
        (value) => Math.abs(value - Number(extracted.value)) <= tolerance,
      )
    )
      return [];
    return [
      createIssue(
        this,
        row.id,
        `Explanation may conclude with result '${extracted.value}', but accepted answer is '${q.acceptedAnswers.join(", ")}'.`,
        "explanation",
        {
          extractedValue: extracted.value,
          structuredValue: q.acceptedAnswers,
          confidence: extracted.confidence,
          extractionMethod: extracted.extractionMethod,
          sourceSpan: extracted.sourceSpan,
          comparisonPolicy: {
            mode: tolerance === 0 ? "exact_numeric" : "absolute_tolerance",
            tolerance,
            unit: q.units || null,
          },
        },
      ),
    ];
  },
};

export const EXPLANATION_FORMAT_INCOMPATIBLE: ValidationRule = {
  id: "EXPLANATION_FORMAT_INCOMPATIBLE",
  name: "Explanation Format Incompatible",
  category: "academic_consistency",
  severity: "block",
  priority: 95,
  appliesTo: ["TEXT_ENTRY"],
  requires: ["EXPLANATION_PRESENT", "EXPLANATION_CONCLUSION_EXTRACTED"],
  validate(row) {
    const q = row.normalizedQuestion as TextEntryQuestion;
    const extracted = extractFinalResultFromExplanation(q.explanation || "");
    if (!extracted || !["option", "option_set"].includes(extracted.mode))
      return [];
    return [
      createIssue(
        this,
        row.id,
        "Explanation concludes with an option answer, which is incompatible with a text-entry interaction.",
        "explanation",
        {
          extractedValue: extracted.value,
          structuredValue: q.acceptedAnswers,
          confidence: extracted.confidence,
          extractionMethod: extracted.extractionMethod,
          sourceSpan: extracted.sourceSpan,
          comparisonPolicy: "interaction_mode_compatibility",
        },
      ),
    ];
  },
};

export const EXPLANATION_UNIT_MISMATCH: ValidationRule = {
  id: "EXPLANATION_UNIT_MISMATCH",
  name: "Explanation Unit Mismatch",
  category: "academic_consistency",
  severity: "block",
  priority: 90,
  appliesTo: ["TEXT_ENTRY"],
  validate(row) {
    const q = row.normalizedQuestion as TextEntryQuestion;
    if (q?.units && q.explanation) {
      const expLower = q.explanation.toLowerCase();
      // Simple unit conflict check (e.g. answer unit is m, explanation concludes with m/s)
      if (q.units.toLowerCase() === "m" && expLower.includes(" m/s")) {
        return [
          createIssue(
            this,
            row.id,
            `Explanation uses unit 'm/s', but specified answer unit is '${q.units}'.`,
            "units",
            { answerUnit: q.units, explanation: q.explanation },
          ),
        ];
      }
    }
    return [];
  },
};

export const MULTIPLE_CORRECT_OPTIONS_SUSPECTED: ValidationRule = {
  id: "MULTIPLE_CORRECT_OPTIONS_SUSPECTED",
  name: "Multiple Correct Options Suspected",
  category: "academic_consistency",
  severity: "review",
  priority: 85,
  appliesTo: ["MCQ"],
  validate(row) {
    const q = row.normalizedQuestion as McqQuestion;
    if (q?.type === "MCQ" && q.options && q.options.length >= 2) {
      const normTexts = q.options.map((o) =>
        o.text.trim().toLowerCase().replace(/\.0+$/, ""),
      );
      const uniqueTexts = new Set(normTexts);
      if (uniqueTexts.size < normTexts.length) {
        return [
          createIssue(
            this,
            row.id,
            "Suspected multiple correct or equivalent options found in single-choice question.",
            "options",
          ),
        ];
      }
    }
    return [];
  },
};
