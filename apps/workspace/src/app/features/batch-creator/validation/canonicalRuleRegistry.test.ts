import { describe, expect, it } from "vitest";

import type { QuestionRow } from "../core/rowTypes";
import { canonicalRuleCatalog } from "./canonicalRuleCatalog";
import { getDefaultRuleRegistry } from "./ruleRegistry";
import { ValidationEngine, type ValidationContext } from "./validationEngine";

function row(overrides: Partial<QuestionRow> = {}): QuestionRow {
  return {
    id: "row-1",
    sourceRowNumber: 2,
    rawRow: {},
    normalizedQuestion: {
      type: "MCQ",
      stem: "Choose the correct answer.",
      options: [
        { id: "A", label: "A", text: "One" },
        { id: "B", label: "B", text: "Two" },
      ],
      correctAnswerId: "A",
    },
    metadata: { questionId: "Q-1" },
    mediaReferences: [],
    mathReferences: [],
    scoringConfig: { marks: 1, partialMarking: false },
    history: [],
    status: "normalized",
    issues: [],
    ...overrides,
  };
}

function context(item: QuestionRow): ValidationContext {
  return { allRows: [item], columnMapping: { correctAnswer: "Answer" } };
}

describe("canonical validation registry", () => {
  it("contains all and only the 155 canonical IDs", () => {
    const registered = getDefaultRuleRegistry();
    expect(registered.map((rule) => rule.id)).toEqual(
      canonicalRuleCatalog.map((rule) => rule.id),
    );
    expect(registered).toHaveLength(155);
    expect(
      registered.every(
        (rule) =>
          rule.implementationStatus === "implemented" &&
          (rule.implementationMode === "native" ||
            rule.implementationMode === "stage_adapter"),
      ),
    ).toBe(true);
    expect(registered.some((rule) => rule.id === "YEAR_INVALID")).toBe(false);
    expect(
      registered.some((rule) => rule.id === "REQUIRED_MEDIA_MISSING"),
    ).toBe(false);
  });

  it("runs a deterministic canonical detector when its row data is present", () => {
    const item = row({
      mediaReferences: [
        {
          id: "asset-1",
          publicUrlSource: "diagram.png",
          role: "question_stem",
          status: "pending",
          contentType: "diagram",
        },
      ],
    });
    const engine = new ValidationEngine(getDefaultRuleRegistry());
    const result = engine.validateRow(item, context(item));

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: "ALT_TEXT_MISSING",
          severity: "review",
          blocksExport: false,
        }),
      ]),
    );
  });

  it("records policy rules as skipped when the versioned profile is absent", () => {
    const item = row({ metadata: { questionId: "Q-1", year: "1800" } });
    const engine = new ValidationEngine(getDefaultRuleRegistry());
    const result = engine.validateRow(item, context(item));

    expect(result.skippedRules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: "YEAR_RANGE_INVALID",
          missingPrerequisites: expect.arrayContaining([
            "policyProfile.id",
            "policyProfile.version",
          ]),
        }),
      ]),
    );
    expect(
      result.issues.some((issue) => issue.ruleId === "YEAR_RANGE_INVALID"),
    ).toBe(false);
  });

  it("accepts auditable stage evaluations and renders canonical messages", () => {
    const item = row();
    const engine = new ValidationEngine(getDefaultRuleRegistry());
    const result = engine.validateRow(item, {
      ...context(item),
      canonicalEvaluations: {
        [item.id]: {
          COLOR_ONLY_MEANING: {
            triggered: true,
            evidence: { matchedSpan: "the red line" },
            confidence: 0.98,
            sourceReference: "source-page-4",
          },
          QTI_MANIFEST_MISSING: {
            triggered: true,
            evidence: { packageFiles: ["items/Q-1.xml"] },
          },
        },
      },
    });

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: "COLOR_ONLY_MEANING",
          message:
            "Meaning cannot be conveyed by color alone; add text, pattern, shape, or labels.",
        }),
        expect.objectContaining({
          ruleId: "QTI_MANIFEST_MISSING",
          severity: "block",
          scope: "package",
          blocksExport: true,
        }),
      ]),
    );
  });

  it("does not hard-block from a heuristic result lacking required evidence", () => {
    const item = row();
    const engine = new ValidationEngine(getDefaultRuleRegistry());
    const result = engine.validateRow(item, {
      ...context(item),
      canonicalEvaluations: {
        [item.id]: {
          COLOR_ONLY_REFERENCE: { triggered: true },
        },
      },
    });

    expect(result.skippedRules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: "COLOR_ONLY_REFERENCE",
          missingPrerequisites: expect.arrayContaining([
            "heuristic evidence",
            "confidence",
            "source reference",
          ]),
        }),
      ]),
    );
    expect(
      result.issues.some((issue) => issue.ruleId === "COLOR_ONLY_REFERENCE"),
    ).toBe(false);
  });
});
