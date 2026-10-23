import { describe, expect, it } from "vitest";

import { QuestionRow } from "../core/rowTypes";
import { ValidationContext, ValidationRule } from "./validationEngine";
import { getDefaultRuleRegistry } from "./ruleRegistry";
import { canonicalRuleCatalog } from "./canonicalRuleCatalog";

interface TriggerScenario {
  row: QuestionRow;
  allRows?: QuestionRow[];
  columnMapping?: ValidationContext["columnMapping"];
}

function option(id: string, text: string, label = id) {
  return { id, label, text };
}

function baseRow(
  normalizedQuestion: QuestionRow["normalizedQuestion"],
  id = "row-1",
): QuestionRow {
  return {
    id,
    sourceRowNumber: id === "row-1" ? 2 : 3,
    rawRow: { Answer: "A" },
    normalizedQuestion,
    metadata: { questionId: id },
    mediaReferences: [],
    mathReferences: [],
    scoringConfig: { marks: 1, partialMarking: false },
    history: [
      {
        timestamp: "2026-01-01T00:00:00.000Z",
        action: "Row normalized from raw sheet data",
      },
    ],
    status: "normalized",
    issues: [],
  };
}

function mcq(id = "row-1"): QuestionRow {
  return baseRow(
    {
      type: "MCQ",
      stem: "Choose the correct answer.",
      options: [option("A", "Red"), option("B", "Blue")],
      correctAnswerId: "A",
    },
    id,
  );
}

function msq(id = "row-1"): QuestionRow {
  return baseRow(
    {
      type: "MSQ",
      stem: "Select every correct answer.",
      options: [option("A", "Red"), option("B", "Blue"), option("C", "Green")],
      correctAnswerIds: ["A", "B"],
    },
    id,
  );
}

function textEntry(id = "row-1"): QuestionRow {
  return baseRow(
    {
      type: "TEXT_ENTRY",
      stem: "Enter the answer.",
      acceptedAnswers: ["answer"],
      mode: "text",
      caseSensitive: false,
      trimPolicy: "trim",
    },
    id,
  );
}

function order(id = "row-1"): QuestionRow {
  return baseRow(
    {
      type: "ORDER",
      stem: "Arrange the items.",
      options: [option("A", "First"), option("B", "Second")],
      correctSequenceIds: ["A", "B"],
    },
    id,
  );
}

function scenario(
  row: QuestionRow,
  allRows: QuestionRow[] = [row],
  columnMapping: ValidationContext["columnMapping"] = {
    correctAnswer: "Answer",
  },
): TriggerScenario {
  return { row, allRows, columnMapping };
}

function withQuestion(
  row: QuestionRow,
  normalizedQuestion: QuestionRow["normalizedQuestion"],
): QuestionRow {
  return { ...row, normalizedQuestion };
}

const triggerScenarios: Record<string, () => TriggerScenario> = {
  REQUIRED_QUESTION_FIELD: () => {
    const row = mcq();
    return scenario(
      withQuestion(row, { ...row.normalizedQuestion!, stem: "" } as any),
    );
  },
  UNKNOWN_QUESTION_TYPE_BLOCK: () =>
    scenario(baseRow({ type: "UNKNOWN", rawStem: "Unknown" })),
  EMPTY_ROW_WARNING: () =>
    scenario(
      { ...baseRow({ type: "UNKNOWN", rawStem: "" }), rawRow: {} },
      undefined,
      { stem: "Question" },
    ),
  DUPLICATE_QUESTION_ID: () => {
    const row = mcq();
    const duplicate = {
      ...mcq("row-2"),
      metadata: { questionId: row.metadata.questionId },
    };
    return scenario(row, [row, duplicate]);
  },
  DUPLICATE_NORMALIZED_STEM_REVIEW: () => {
    const row = mcq();
    const duplicate = mcq("row-2");
    return scenario(row, [row, duplicate]);
  },
  LATEX_STEM_DELIMITER_VALID: () => {
    const row = mcq();
    return scenario(
      withQuestion(row, {
        ...row.normalizedQuestion!,
        stem: "Solve \\(x + 1",
      } as any),
    );
  },
  MEDIA_URL_INVALID_FORMAT: () =>
    scenario({
      ...mcq(),
      mediaReferences: [
        {
          id: "media-1",
          publicUrlSource: "not a URL",
          role: "question_stem",
          status: "pending",
          altText: "Graph",
        },
      ],
    }),
  MARKS_INVALID: () =>
    scenario({ ...mcq(), scoringConfig: { marks: 0, partialMarking: false } }),
  NEGATIVE_MARKS_INVALID: () =>
    scenario({ ...mcq(), metadata: { questionId: "row-1", negativeMarks: 1 } }),
  TIME_LIMIT_INVALID: () =>
    scenario({ ...mcq(), timeLimitConfig: { timeLimitSeconds: 0 } }),
  YEAR_INVALID: () =>
    scenario({ ...mcq(), metadata: { questionId: "row-1", year: "1800" } }),

  MCQ_MIN_OPTIONS: () => {
    const row = mcq();
    return scenario(
      withQuestion(row, {
        ...row.normalizedQuestion!,
        options: [option("A", "Only")],
      } as any),
    );
  },
  MCQ_OPTION_TEXT_NOT_EMPTY: () => {
    const row = mcq();
    return scenario(
      withQuestion(row, {
        ...row.normalizedQuestion!,
        options: [option("A", ""), option("B", "Blue")],
      } as any),
    );
  },
  MCQ_OPTIONS_UNIQUE: () => {
    const row = mcq();
    return scenario(
      withQuestion(row, {
        ...row.normalizedQuestion!,
        options: [option("A", "Same"), option("B", " same ")],
      } as any),
    );
  },
  MCQ_OPTION_IDENTIFIERS_UNIQUE: () => {
    const row = mcq();
    return scenario(
      withQuestion(row, {
        ...row.normalizedQuestion!,
        options: [option("A", "Red"), option("A", "Blue", "B")],
      } as any),
    );
  },
  MCQ_OPTION_IDENTIFIER_VALID: () => {
    const row = mcq();
    return scenario(
      withQuestion(row, {
        ...row.normalizedQuestion!,
        options: [option("", "Red", "A"), option("B", "Blue")],
      } as any),
    );
  },
  MCQ_HAS_CORRECT_ANSWER: () => {
    const row = mcq();
    return scenario(
      withQuestion(row, {
        ...row.normalizedQuestion!,
        correctAnswerId: "",
      } as any),
    );
  },
  MCQ_ANSWER_IN_OPTIONS: () => {
    const row = mcq();
    return scenario(
      withQuestion(row, {
        ...row.normalizedQuestion!,
        correctAnswerId: "missing",
      } as any),
    );
  },
  MCQ_ANSWER_TEXT_MATCH: () => {
    const row = {
      ...mcq(),
      rawRow: { Answer: "Purple" },
    };
    return scenario(
      withQuestion(row, {
        ...row.normalizedQuestion!,
        correctAnswerId: "Purple",
      } as any),
    );
  },
  MCQ_ANSWER_TEXT_AMBIGUOUS: () => {
    const row = { ...mcq(), rawRow: { Answer: "Same" } };
    return scenario(
      withQuestion(row, {
        ...row.normalizedQuestion!,
        options: [option("A", "Same"), option("B", " same ")],
        correctAnswerId: "A",
      } as any),
    );
  },
  MCQ_SINGLE_CORRECT_ONLY: () => {
    const row = mcq();
    return scenario(
      withQuestion(row, {
        ...row.normalizedQuestion!,
        correctAnswerId: "A,B",
      } as any),
    );
  },
  MCQ_SHOULD_BE_MSQ_REVIEW: () => {
    const row = mcq();
    return scenario(
      withQuestion(row, {
        ...row.normalizedQuestion!,
        correctAnswerId: "A,B",
      } as any),
    );
  },
  MCQ_SUSPECT_TRUE_FALSE_REVIEW: () => {
    const row = mcq();
    return scenario(
      withQuestion(row, {
        ...row.normalizedQuestion!,
        options: [option("A", "True"), option("B", "False")],
      } as any),
    );
  },

  MSQ_MIN_OPTIONS: () => {
    const row = msq();
    return scenario(
      withQuestion(row, {
        ...row.normalizedQuestion!,
        options: [option("A", "Only")],
      } as any),
    );
  },
  MSQ_HAS_CORRECT_ANSWERS: () => {
    const row = msq();
    return scenario(
      withQuestion(row, {
        ...row.normalizedQuestion!,
        correctAnswerIds: [],
      } as any),
    );
  },
  MSQ_ANSWER_IDENTIFIER_VALID: () => {
    const row = msq();
    return scenario(
      withQuestion(row, {
        ...row.normalizedQuestion!,
        correctAnswerIds: [""],
      } as any),
    );
  },
  MSQ_OPTION_IDENTIFIERS_UNIQUE: () => {
    const row = msq();
    return scenario(
      withQuestion(row, {
        ...row.normalizedQuestion!,
        options: [option("A", "Red"), option("A", "Blue", "B")],
      } as any),
    );
  },
  MSQ_OPTIONS_UNIQUE: () => {
    const row = msq();
    return scenario(
      withQuestion(row, {
        ...row.normalizedQuestion!,
        options: [option("A", "Same"), option("B", " same ")],
      } as any),
    );
  },
  MSQ_CORRECT_ANSWERS_IN_OPTIONS: () => {
    const row = msq();
    return scenario(
      withQuestion(row, {
        ...row.normalizedQuestion!,
        correctAnswerIds: ["A", "missing"],
      } as any),
    );
  },
  MSQ_MIXED_IDENTIFIER_MODE: () => {
    const row = { ...msq(), rawRow: { Answer: "A,Blue" } };
    return scenario(row);
  },
  MSQ_ANSWER_TEXT_MATCH: () => {
    const row = { ...msq(), rawRow: { Answer: "A,Purple" } };
    return scenario(
      withQuestion(row, {
        ...row.normalizedQuestion!,
        correctAnswerIds: ["A", "PURPLE"],
      } as any),
    );
  },
  MSQ_ANSWER_TEXT_AMBIGUOUS: () => {
    const row = { ...msq(), rawRow: { Answer: "Same" } };
    return scenario(
      withQuestion(row, {
        ...row.normalizedQuestion!,
        options: [option("A", "Same"), option("B", " same ")],
        correctAnswerIds: ["A"],
      } as any),
    );
  },
  MSQ_NO_DUPLICATE_CORRECT_ANSWERS: () => {
    const row = msq();
    return scenario(
      withQuestion(row, {
        ...row.normalizedQuestion!,
        correctAnswerIds: ["A", "A"],
      } as any),
    );
  },
  MSQ_EXACT_SET_MATCH: () => {
    const row = msq();
    const duplicate = msq("row-2");
    return scenario(row, [row, duplicate]);
  },
  DELIMITER_FORMAT_FOR_MSQ: () => {
    const row = msq();
    return scenario(
      withQuestion(row, {
        ...row.normalizedQuestion!,
        correctAnswerIds: ["A|B"],
      } as any),
    );
  },
  MSQ_SCORING_REVIEW: () =>
    scenario({ ...msq(), scoringConfig: { marks: 1, partialMarking: true } }),

  TEXT_ENTRY_HAS_ANSWER: () => {
    const row = textEntry();
    return scenario(
      withQuestion(row, {
        ...row.normalizedQuestion!,
        acceptedAnswers: [],
      } as any),
    );
  },
  TEXT_ENTRY_ACCEPTED_ANSWERS_NOT_EMPTY: () => {
    const row = textEntry();
    return scenario(
      withQuestion(row, {
        ...row.normalizedQuestion!,
        acceptedAnswers: [""],
      } as any),
    );
  },
  TEXT_ENTRY_MULTIPLE_ANSWERS_DELIMITER_VALID: () => {
    const row = textEntry();
    return scenario(
      withQuestion(row, {
        ...row.normalizedQuestion!,
        acceptedAnswers: ["one|two", "three"],
      } as any),
    );
  },
  TEXT_ENTRY_CASE_POLICY_DEFINED: () => {
    const row = textEntry();
    return scenario(
      withQuestion(row, {
        ...row.normalizedQuestion!,
        caseSensitive: undefined,
      } as any),
    );
  },
  TEXT_ENTRY_TRIM_POLICY_DEFINED: () => {
    const row = textEntry();
    return scenario(
      withQuestion(row, {
        ...row.normalizedQuestion!,
        trimPolicy: undefined,
      } as any),
    );
  },
  TEXT_ENTRY_NUMERIC_ANSWER_VALID: () => {
    const row = textEntry();
    return scenario(
      withQuestion(row, {
        ...row.normalizedQuestion!,
        mode: "numeric",
        acceptedAnswers: ["twelve"],
      } as any),
    );
  },
  TEXT_ENTRY_NUMERIC_TOLERANCE_VALID: () => {
    const row = textEntry();
    return scenario(
      withQuestion(row, {
        ...row.normalizedQuestion!,
        mode: "numeric",
        acceptedAnswers: ["12"],
        numericTolerance: -1,
      } as any),
    );
  },
  TEXT_ENTRY_UNIT_POLICY_VALID: () => {
    const row = textEntry();
    return scenario(
      withQuestion(row, {
        ...row.normalizedQuestion!,
        mode: "numeric",
        acceptedAnswers: ["12"],
        units: "",
      } as any),
    );
  },
  TEXT_ENTRY_FORMULA_FORMAT_VALID: () => {
    const row = textEntry();
    return scenario(
      withQuestion(row, {
        ...row.normalizedQuestion!,
        mode: "formula",
        acceptedAnswers: [""],
      } as any),
    );
  },
  TEXT_ENTRY_LATEX_VALID: () => {
    const row = textEntry();
    return scenario(
      withQuestion(row, {
        ...row.normalizedQuestion!,
        mode: "formula",
        acceptedAnswers: ["$x"],
      } as any),
    );
  },

  // Ingestion & Normalization
  COLUMN_MAPPING_AMBIGUOUS: () =>
    ({
      row: mcq(),
      allRows: [mcq()],
      columnMapping: {},
      ambiguousMappings: ["Answer", "Key"],
    }) as any,
  QUESTION_ID_FIELD_MISMAPPED: () =>
    scenario({ ...mcq(), metadata: { questionId: "SUB-0001" } }),
  QUESTION_TYPE_ALIAS_UNMAPPED: () =>
    scenario(baseRow({ type: "UNKNOWN", rawType: "Matrix-Type-A" } as any)),
  EXPLICIT_TYPE_OVERRIDDEN: () =>
    scenario(baseRow({ type: "UNSUPPORTED", rawType: "Hotspot" } as any)),
  RESPONSE_SUBTYPE_LOST: () =>
    scenario(
      withQuestion(textEntry(), {
        ...textEntry().normalizedQuestion!,
        responseSubtype: "integer",
        acceptedAnswers: ["1.5"],
      } as any),
    ),
  NEGATIVE_MARKS_CONVENTION_AMBIGUOUS: () =>
    scenario({ ...mcq(), metadata: { questionId: "row-1", negativeMarks: 1 } }),
  NORMALIZATION_AUDIT_MISSING: () =>
    scenario({
      ...mcq(),
      scoringConfig: { marks: 1, partialMarking: false },
      __transformedWithoutAudit: true,
      normalizationAudit: [],
    } as any),

  // Numeric Responses, Units & Scoring
  NUMERIC_ANSWER_NOT_NUMERIC: () =>
    scenario(
      withQuestion(textEntry(), {
        ...textEntry().normalizedQuestion!,
        mode: "numeric",
        acceptedAnswers: ["invalid"],
      } as any),
    ),
  INTEGER_ANSWER_NOT_INTEGER: () =>
    scenario(
      withQuestion(textEntry(), {
        ...textEntry().normalizedQuestion!,
        responseSubtype: "integer",
        acceptedAnswers: ["1.5"],
      } as any),
    ),
  NUMERIC_TOLERANCE_MISSING: () =>
    scenario(
      withQuestion(textEntry(), {
        ...textEntry().normalizedQuestion!,
        mode: "numeric",
        acceptedAnswers: ["10"],
        numericTolerance: undefined,
      } as any),
    ),
  NUMERIC_TOLERANCE_INVALID: () =>
    scenario(
      withQuestion(textEntry(), {
        ...textEntry().normalizedQuestion!,
        mode: "numeric",
        acceptedAnswers: ["10"],
        numericTolerance: -1,
      } as any),
    ),
  UNIT_EMBEDDED_IN_NUMERIC_ANSWER: () =>
    scenario(
      withQuestion(textEntry(), {
        ...textEntry().normalizedQuestion!,
        mode: "numeric",
        acceptedAnswers: ["10 m/s"],
      } as any),
    ),
  UNIT_POLICY_INVALID: () =>
    scenario(
      withQuestion(textEntry(), {
        ...textEntry().normalizedQuestion!,
        mode: "numeric",
        unitPolicy: "required",
        units: "",
      } as any),
    ),
  UNSUPPORTED_TYPE_FOR_TARGET_EXPORT: () =>
    scenario({
      ...mcq(),
      normalizedQuestion: {
        type: "UNSUPPORTED",
        rawType: "MATRIX_MATCH",
      } as any,
    }),
  POSITIVE_MARKS_INVALID: () =>
    scenario({ ...mcq(), scoringConfig: { marks: -1, partialMarking: false } }),
  NEGATIVE_MARKS_EXCEED_POSITIVE: () =>
    scenario({
      ...mcq(),
      scoringConfig: { marks: 2, partialMarking: false },
      metadata: { questionId: "row-1", negativeMarks: -3 },
    }),
  QUESTION_SCORING_CONFLICTS_WITH_SECTION: () => {
    const r = { ...mcq(), scoringConfig: { marks: 3, partialMarking: false } };
    return {
      row: r,
      allRows: [r],
      columnMapping: { correctAnswer: "Answer" },
      exportConfig: { scoring: { sectionDefaultMarks: 4 } },
    } as any;
  },
  PARTIAL_MARKING_AMBIGUOUS: () =>
    scenario({
      ...msq(),
      scoringConfig: {
        marks: 1,
        partialMarking: { enabled: true, strategy: undefined } as any,
      },
    }),

  // Explanation & Academic Consistency
  EXPLANATION_MISSING: () => {
    const r = withQuestion(mcq(), {
      ...mcq().normalizedQuestion!,
      explanation: "",
    } as any);
    return {
      row: r,
      allRows: [r],
      columnMapping: { correctAnswer: "Answer" },
      exportConfig: { requireExplanations: true },
    } as any;
  },
  EXPLANATION_INSUFFICIENT: () =>
    scenario(
      withQuestion(mcq(), {
        ...mcq().normalizedQuestion!,
        explanation: "Ans is obvious.",
      } as any),
    ),
  EXPLANATION_KEY_MISMATCH: () =>
    scenario(
      withQuestion(mcq(), {
        ...mcq().normalizedQuestion!,
        correctAnswerId: "A",
        explanation: "Final Answer: Option B",
      } as any),
    ),
  EXPLANATION_RESULT_MISMATCH: () =>
    scenario(
      withQuestion(textEntry(), {
        ...textEntry().normalizedQuestion!,
        mode: "numeric",
        acceptedAnswers: ["25"],
        explanation: "Final answer: 20",
      } as any),
    ),
  POSSIBLE_EXPLANATION_RESULT_MISMATCH: () =>
    scenario(
      withQuestion(textEntry(), {
        ...textEntry().normalizedQuestion!,
        mode: "numeric",
        acceptedAnswers: ["25"],
        explanation: "Working concludes with x = 20",
      } as any),
    ),
  EXPLANATION_FORMAT_INCOMPATIBLE: () =>
    scenario(
      withQuestion(textEntry(), {
        ...textEntry().normalizedQuestion!,
        explanation: "Final answer: Option D",
      } as any),
    ),
  EXPLANATION_UNIT_MISMATCH: () =>
    scenario(
      withQuestion(textEntry(), {
        ...textEntry().normalizedQuestion!,
        units: "m",
        explanation: "Velocity is 10 m/s",
      } as any),
    ),
  MULTIPLE_CORRECT_OPTIONS_SUSPECTED: () =>
    scenario(
      withQuestion(mcq(), {
        ...mcq().normalizedQuestion!,
        options: [option("A", "2.0"), option("B", "2")],
      } as any),
    ),

  // Math, Language & Rendering
  MALFORMED_LATEX_DELIMITER: () =>
    scenario(
      withQuestion(mcq(), {
        ...mcq().normalizedQuestion!,
        stem: "Use \\(v^2=u^2.",
      } as any),
    ),
  MATH_RENDER_FAILED: () =>
    scenario({ ...mcq(), __mathRenderError: "Syntax error in MathJax" } as any),
  UNSUPPORTED_MATH_FORMAT: () =>
    scenario(
      withQuestion(mcq(), {
        ...mcq().normalizedQuestion!,
        stem: 'Question with MathType <math xmlns="http://www.w3.org/1998/Math/MathML">',
      } as any),
    ),
  UNICODE_MATH_FALSE_POSITIVE: () =>
    scenario({
      ...mcq(),
      normalizedQuestion: {
        ...mcq().normalizedQuestion!,
        stem: "Evaluate ∫₀¹ x² dx",
      },
      __unicodeMathFlaggedAsBlock: true,
    } as any),
  LANGUAGE_METADATA_MISMATCH: () =>
    scenario({
      ...mcq(),
      metadata: { questionId: "row-1", language: "English" },
      normalizedQuestion: {
        ...mcq().normalizedQuestion!,
        stem: "निम्नलिखित में से सही विकल्प चुनिए",
      },
    }),
  UNSUPPORTED_HTML_OR_SCRIPT: () =>
    scenario(
      withQuestion(mcq(), {
        ...mcq().normalizedQuestion!,
        stem: "Stem with <script>alert(1)</script>",
      } as any),
    ),

  // Advanced & Linked Content
  MATRIX_MATCH_INCOMPLETE: () =>
    scenario(
      baseRow({
        type: "MATRIX_MATCH",
        stem: "Match the columns",
        leftEntities: [],
      } as any),
    ),
  HOTSPOT_CONFIGURATION_INCOMPLETE: () =>
    scenario(baseRow({ type: "HOTSPOT", stem: "Click the spot" } as any)),
  ORDER_SEQUENCE_INVALID: () =>
    scenario(
      withQuestion(order(), {
        ...order().normalizedQuestion!,
        correctSequenceIds: ["A"],
      } as any),
    ),
  PASSAGE_LINK_BROKEN: () =>
    scenario({
      ...mcq(),
      metadata: { questionId: "row-1", passageId: "PASS-99" } as any,
    }),

  // Defect & Audit Rules
  REPORT_FIELD_MISLABELED: () =>
    scenario({ ...mcq(), __reportMislabeled: true } as any),
  ISSUE_MESSAGE_TRUNCATED: () =>
    scenario({
      ...mcq(),
      issues: [
        {
          ruleId: "DUMMY",
          message: "accepte accep",
          severity: "engine_defect",
          category: "system_defect",
          id: "1",
          rowId: "row-1",
        },
      ],
    }),
  DUPLICATE_MATCH_CONTEXT_MISSING: () =>
    scenario({
      ...mcq(),
      issues: [
        {
          ruleId: "DUPLICATE_NORMALIZED_STEM_REVIEW",
          message: "Duplicate stem",
          severity: "review",
          category: "content_quality",
          id: "1",
          rowId: "row-1",
          relatedRows: [],
        },
      ],
    }),
  CORRECTION_ACTION_AMBIGUOUS: () =>
    scenario({ ...mcq(), __ambiguousCorrectionAction: true } as any),
  CORRECTION_AUDIT_TRAIL_MISSING: () =>
    scenario({ ...mcq(), __manuallyEditedWithoutAudit: true } as any),

  TRUNCATED_STEM: () =>
    scenario(
      baseRow({
        type: "MCQ",
        stem: "Which of the following statements...",
      } as any),
    ),
  CONTEXT_MISSING: () =>
    scenario(
      baseRow({
        type: "MCQ",
        stem: "Find the correct answer from the following.",
      } as any),
    ),
  BROKEN_ENCODING: () =>
    scenario(baseRow({ type: "MCQ", stem: "x\uFFFD + y = 4" } as any)),
  REQUIRED_MEDIA_MISSING: () =>
    scenario({ ...mcq(), rawRow: { Image_Required: "Yes" } }),
  MEDIA_REFERENCE_NOT_FOUND: () =>
    ({
      row: { ...mcq(), rawRow: { Image_File_Name: "missing.png" } },
      allRows: [],
      columnMapping: {},
      packageAssets: ["other.png"],
    }) as any,
  COPYRIGHT_UNVERIFIED: () =>
    scenario({
      ...mcq(),
      rawRow: {
        Copyright_Status: "Unknown",
        Source_Reference: "Screenshot from coaching material",
      },
    }),
  AMBIGUOUS_MEDIA_FILENAME: () =>
    scenario({ ...mcq(), rawRow: { Image_File_Name: "image1.png" } }),
  WRONG_SUBJECT_TAG: () =>
    scenario({
      ...mcq(),
      metadata: {
        questionId: "row-1",
        subject: "Chemistry",
        chapter: "Current Electricity",
      },
    }),
  NONSTANDARD_DIFFICULTY: () =>
    scenario({
      ...mcq(),
      metadata: { questionId: "row-1", difficulty: "Very Hard" },
    }),
  VERSION_TIMESTAMP_CONFLICT: () =>
    scenario({
      ...mcq(),
      rawRow: { Submitted_At: "2026-05-10", Updated_At: "2026-05-01" },
    }),
  PARTIAL_MARKING_AMBIGUOUS_PROSE: () =>
    scenario({
      ...mcq(),
      rawRow: {
        Partial_Marking_Rule: "Award 3, 2, or 1 depending on closeness",
      },
    }),
  INACTIVE_FIELD_CONTAINS_DATA: () =>
    scenario({
      ...mcq(),
      rawRow: {
        Numerical_Answer: "8 m",
      },
    }),

  ORDER_MIN_OPTIONS: () => {
    const row = order();
    return scenario(
      withQuestion(row, {
        ...row.normalizedQuestion!,
        options: [option("A", "Only")],
      } as any),
    );
  },
  ORDER_HAS_CORRECT_SEQUENCE: () => {
    const row = order();
    return scenario(
      withQuestion(row, {
        ...row.normalizedQuestion!,
        correctSequenceIds: [],
      } as any),
    );
  },
  ORDER_SEQUENCE_MATCH: () => {
    const row = order();
    return scenario(
      withQuestion(row, {
        ...row.normalizedQuestion!,
        correctSequenceIds: ["missing", "missing"],
      } as any),
    );
  },
};

function canonicalEvaluationTrigger(ruleId: string): TriggerScenario {
  const row = mcq();
  return {
    ...scenario(row),
    canonicalEvaluations: {
      [row.id]: {
        [ruleId]: {
          triggered: true,
          values: {
            answer: "sample",
            evidencePreview: "sample evidence",
            field: "stem",
            reason: "canonical adversarial test",
          },
          evidence: { testCase: "canonical adversarial trigger" },
          confidence: 1,
          sourceReference: "ruleCoverageMatrix.test.ts",
        },
      },
    },
  } as any;
}

function executeRule(rule: ValidationRule, trigger: TriggerScenario) {
  return rule.validate(trigger.row, {
    allRows: trigger.allRows ?? [trigger.row],
    columnMapping: trigger.columnMapping ?? { correctAnswer: "Answer" },
    ambiguousMappings: (trigger as any).ambiguousMappings,
    exportConfig: (trigger as any).exportConfig,
    packageAssets: (trigger as any).packageAssets,
    canonicalEvaluations: (trigger as any).canonicalEvaluations,
    policyProfile: (trigger as any).policyProfile,
    targetProfile: (trigger as any).targetProfile,
    packageSnapshot: (trigger as any).packageSnapshot,
    iterationSnapshot: (trigger as any).iterationSnapshot,
  } as any);
}

describe("registered validation rule trigger matrix", () => {
  const rules = getDefaultRuleRegistry();

  it("registers the canonical catalog exactly once and in canonical order", () => {
    expect(rules).toHaveLength(155);
    expect(rules.map((rule) => rule.id)).toEqual(
      canonicalRuleCatalog.map((rule) => rule.id),
    );
    expect(new Set(rules.map((rule) => rule.id)).size).toBe(155);
    rules.forEach((rule, index) => {
      expect(rule.canonicalSpec).toBe(canonicalRuleCatalog[index]);
    });
  });

  it.each(rules)("$id has a reachable, contract-valid failure path", (rule) => {
    const trigger =
      triggerScenarios[rule.id]?.() || canonicalEvaluationTrigger(rule.id);
    const issues = executeRule(rule, trigger);

    expect(
      issues.length,
      `${rule.id} did not emit an issue for its registered trigger`,
    ).toBeGreaterThan(0);
    issues.forEach((issue) => {
      expect(issue.ruleId).toBe(rule.id);
      expect(issue.rowId).toBe(trigger.row.id);
      expect(issue.message.trim()).not.toBe("");
    });
  });

  it("does not reuse stale raw-answer ambiguity after an authoritative manual answer edit", () => {
    const row = triggerScenarios.MCQ_ANSWER_TEXT_AMBIGUOUS().row;
    row.history.push({
      timestamp: "2026-01-01T00:01:00.000Z",
      action: "Patch applied: normalizedQuestion.correctAnswerId",
      previousState: {
        patchChanges: [
          {
            path: "normalizedQuestion.correctAnswerId",
            before: "A",
            after: "B",
          },
        ],
      },
    });
    const rule = rules.find(
      (candidate) => candidate.id === "MCQ_ANSWER_TEXT_AMBIGUOUS",
    )!;

    expect(executeRule(rule, scenario(row))).toEqual([]);
  });
});
