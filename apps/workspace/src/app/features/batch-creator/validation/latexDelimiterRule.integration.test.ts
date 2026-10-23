import { describe, expect, it } from "vitest";
import type { QuestionRow } from "../core/rowTypes";
import type { ValidationContext } from "./validationEngine";
import { defaultRules } from "./ruleRegistry";

function createMcqRow(stem: string): QuestionRow {
  return {
    id: "latex-rule-row",
    sourceRowNumber: 2,
    rawRow: {},
    normalizedQuestion: {
      type: "MCQ",
      stem,
      options: [
        { id: "A", label: "A", text: "3/4" },
        { id: "B", label: "B", text: "1/2" },
      ],
      correctAnswerId: "A",
    },
    metadata: {},
    mediaReferences: [],
    mathReferences: [],
    scoringConfig: { marks: 1, partialMarking: false },
    history: [],
    status: "normalized",
    issues: [],
  };
}

function validateStem(stem: string) {
  const rule = defaultRules.find(
    (candidate) => candidate.id === "MATH_SYNTAX_INVALID",
  );
  expect(rule).toBeDefined();

  const row = createMcqRow(stem);
  const context: ValidationContext = {
    allRows: [row],
    columnMapping: {} as ValidationContext["columnMapping"],
  };

  return rule!.validate(row, context);
}

describe("MATH_SYNTAX_INVALID registry integration", () => {
  it("is active for every supported question type, including ORDER", () => {
    const rule = defaultRules.find(
      (candidate) => candidate.id === "MATH_SYNTAX_INVALID",
    );

    expect(rule?.appliesTo).toBe("all");
  });

  it("returns actionable issue evidence for missing delimiters", () => {
    const issues = validateStem("Find \\frac{1}{2} + \\frac{1}{4}.");

    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      ruleId: "MATH_SYNTAX_INVALID",
      field: "stem",
      category: "rendering",
      severity: "block",
      evidence: {
        fieldPath: "stem",
        issues: [
          expect.objectContaining({
            code: "LATEX_DELIMITER_MISSING",
            commands: ["\frac", "\frac"],
          }),
        ],
      },
    });
  });

  it("does not flag valid delimited math or ordinary currency", () => {
    expect(validateStem("Find $\\frac{1}{2} + \\frac{1}{4}$.")).toEqual([]);
    expect(
      validateStem("A book costs $100. What is its discounted price?"),
    ).toEqual([]);
  });
});
