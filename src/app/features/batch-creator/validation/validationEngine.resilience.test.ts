import { describe, expect, it } from "vitest";

import { ValidationIssue } from "../core/issueTypes";
import { QuestionRow } from "../core/rowTypes";
import {
  ValidationContext,
  ValidationEngine,
  ValidationRule,
} from "./validationEngine";

function row(id = "row-1"): QuestionRow {
  return {
    id,
    sourceRowNumber: id === "row-1" ? 2 : 3,
    rawRow: {},
    normalizedQuestion: {
      type: "TEXT_ENTRY",
      stem: "Name the largest planet.",
      acceptedAnswers: ["Jupiter"],
      mode: "text",
      caseSensitive: false,
      trimPolicy: "trim",
    },
    metadata: { questionId: id },
    mediaReferences: [],
    mathReferences: [],
    scoringConfig: { marks: 1, partialMarking: false },
    history: [],
    status: "normalized",
    issues: [],
  };
}

function context(rows: QuestionRow[]): ValidationContext {
  return {
    allRows: rows,
    columnMapping: {},
  };
}

function rule(
  id: string,
  validate: ValidationRule["validate"],
  overrides: Partial<ValidationRule> = {},
): ValidationRule {
  return {
    id,
    name: id,
    category: "content_quality",
    severity: "warning",
    priority: 10,
    appliesTo: "all",
    validate,
    ...overrides,
  };
}

function issue(
  ruleId: string,
  rowId: string,
  evidence?: Record<string, unknown>,
): ValidationIssue {
  return {
    id: crypto.randomUUID(),
    ruleId,
    rowId,
    category: "content_quality",
    severity: "warning",
    message: "Review this question.",
    field: "stem",
    evidence,
  };
}

describe("ValidationEngine resilience", () => {
  it("contains a throwing rule, blocks the affected row, and continues later rules", () => {
    const current = row();
    const engine = new ValidationEngine([
      rule(
        "THROWS",
        () => {
          throw new Error("simulated failure");
        },
        { priority: 20 },
      ),
      rule("SAFE_RULE", (candidate) => [issue("SAFE_RULE", candidate.id)]),
    ]);

    const result = engine.validateRow(current, context([current]));

    expect(result.status).toBe("rejected");
    expect(result.issues.map((item) => item.ruleId)).toEqual([
      "VALIDATION_RULE_EXECUTION_ERROR",
      "SAFE_RULE",
    ]);
    expect(result.issues[0].evidence).toMatchObject({
      failedRuleId: "THROWS",
      errorMessage: "simulated failure",
    });
  });

  it("fails closed when a rule violates the issue-array contract", () => {
    const current = row();
    const invalidRule = rule(
      "INVALID_RETURN",
      (() => null) as unknown as ValidationRule["validate"],
    );

    const result = new ValidationEngine([invalidRule]).validateRow(
      current,
      context([current]),
    );

    expect(result.status).toBe("rejected");
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].ruleId).toBe("VALIDATION_RULE_EXECUTION_ERROR");
    expect(result.issues[0].message).toContain("INVALID_RETURN");
  });

  it("deduplicates identical issues emitted by a rule", () => {
    const current = row();
    const duplicateRule = rule("DUPLICATE_OUTPUT", (candidate) => [
      issue("DUPLICATE_OUTPUT", candidate.id),
      issue("DUPLICATE_OUTPUT", candidate.id),
    ]);

    const result = new ValidationEngine([duplicateRule]).validateRow(
      current,
      context([current]),
    );

    expect(result.status).toBe("caution");
    expect(result.issues).toHaveLength(1);
  });

  it("deduplicates issues sharing the same canonical identity and merges structured evidence", () => {
    const current = row();
    const evidenceRule = rule("EVIDENCE_OUTPUT", (candidate) => [
      issue("EVIDENCE_OUTPUT", candidate.id, { index: 4 }),
      issue("EVIDENCE_OUTPUT", candidate.id, { index: 12 }),
    ]);

    const result = new ValidationEngine([evidenceRule]).validateRow(
      current,
      context([current]),
    );

    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].suppressedRuleIds).toContain("EVIDENCE_OUTPUT");
  });

  it("generates stable issue IDs across repeated validation runs", () => {
    const current = row();
    const stableRule = rule("STABLE", (candidate) => [
      issue("STABLE", candidate.id),
    ]);
    const engine = new ValidationEngine([stableRule]);

    const first = engine.validateRow(current, context([current]));
    const second = engine.validateRow(current, context([current]));

    expect(first.issues[0].id).toBe(second.issues[0].id);
    expect(current.status).toBe("normalized");
    expect(current.issues).toEqual([]);
  });

  it("does not let one poisoned row abort the rest of the batch", () => {
    const first = row("row-1");
    const second = row("row-2");
    const conditionalRule = rule("CONDITIONAL", (candidate) => {
      if (candidate.id === "row-1") throw new Error("row-specific failure");
      return [];
    });
    const engine = new ValidationEngine([conditionalRule]);

    const result = engine.validateBatch(
      [first, second],
      context([first, second]),
    );

    expect(result).toHaveLength(2);
    expect(result[0].status).toBe("rejected");
    expect(result[1].status).toBe("valid");
  });

  it("rejects duplicate rule IDs without mutating registry order", () => {
    const low = rule("LOW", () => [], { priority: 1 });
    const high = rule("HIGH", () => [], { priority: 100 });
    const registry = [low, high];

    new ValidationEngine(registry);
    expect(registry.map((item) => item.id)).toEqual(["LOW", "HIGH"]);

    expect(
      () =>
        new ValidationEngine([
          rule("DUPLICATE", () => []),
          rule("DUPLICATE", () => []),
        ]),
    ).toThrow("Duplicate validation rule id: DUPLICATE");
  });
});
