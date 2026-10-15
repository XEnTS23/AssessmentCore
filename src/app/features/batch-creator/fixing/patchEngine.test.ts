import { describe, expect, it } from "vitest";
import { QuestionRow } from "../core/rowTypes";
import { ValidationIssue } from "../core/issueTypes";
import {
  ValidationContext,
  ValidationEngine,
} from "../validation/validationEngine";
import { pass3GenerateSuggestions } from "../cleaning/pass3SuggestionEngine";
import { applySuggestion } from "./manualFixEngine";
import { applyPatch } from "./patchEngine";

function issue(
  severity: ValidationIssue["severity"],
  ruleId = "TEST_RULE",
): ValidationIssue {
  return {
    id: `${ruleId}-${severity}`,
    ruleId,
    rowId: "row-1",
    category: "structural",
    severity,
    message: `${severity} issue`,
  };
}

function row(stem = "Original", issues: ValidationIssue[] = []): QuestionRow {
  return {
    id: "row-1",
    sourceRowNumber: 2,
    rawRow: {},
    normalizedQuestion: {
      type: "MCQ",
      stem,
      options: [
        { id: "opt-a", label: "A", text: "One" },
        { id: "opt-b", label: "B", text: "Two" },
      ],
      correctAnswerId: "opt-a",
    },
    metadata: {},
    mediaReferences: [],
    mathReferences: [],
    scoringConfig: { marks: 1, partialMarking: false },
    history: [],
    status: issues.some((candidate) => candidate.severity === "block")
      ? "rejected"
      : "valid",
    issues,
  };
}

function context(current: QuestionRow): ValidationContext {
  return { allRows: [current], columnMapping: {} };
}

function engine(
  validate: (candidate: QuestionRow, context: ValidationContext) => QuestionRow,
): ValidationEngine {
  return { validateRow: validate } as ValidationEngine;
}

describe("autofix patch safety boundary", () => {
  it("applies an exact, effective patch without mutating the source row", () => {
    const source = row();
    const result = applyPatch(
      source,
      {
        rowId: source.id,
        changes: [
          {
            path: "normalizedQuestion.stem",
            before: "Original",
            after: "Updated",
          },
        ],
      },
      engine((candidate) => ({ ...candidate, issues: [], status: "valid" })),
      context(source),
    );

    expect(result.success).toBe(true);
    expect(result.patchedRow.normalizedQuestion?.stem).toBe("Updated");
    expect(source.normalizedQuestion?.stem).toBe("Original");
    expect(result.patchedRow.history).toHaveLength(1);
  });

  it("rejects a patch created for another row", () => {
    const source = row();
    const result = applyPatch(
      source,
      {
        rowId: "row-2",
        changes: [
          {
            path: "normalizedQuestion.stem",
            before: "Original",
            after: "Updated",
          },
        ],
      },
      engine((candidate) => candidate),
      context(source),
    );

    expect(result.success).toBe(false);
    expect(result.failureReason).toBe("row_mismatch");
  });

  it("rejects stale preconditions and preserves the latest value", () => {
    const source = row("Changed by user");
    const result = applyPatch(
      source,
      {
        rowId: source.id,
        changes: [
          {
            path: "normalizedQuestion.stem",
            before: "Original",
            after: "Autofixed",
          },
        ],
      },
      engine((candidate) => candidate),
      context(source),
    );

    expect(result.success).toBe(false);
    expect(result.failureReason).toBe("stale_value");
    expect(result.patchedRow.normalizedQuestion?.stem).toBe("Changed by user");
  });

  it("blocks protected and prototype-polluting paths", () => {
    const source = row();
    const protectedResult = applyPatch(
      source,
      {
        rowId: source.id,
        changes: [{ path: "status", before: "valid", after: "rejected" }],
      },
      engine((candidate) => candidate),
      context(source),
    );
    const prototypeResult = applyPatch(
      source,
      {
        rowId: source.id,
        changes: [
          {
            path: "metadata.__proto__.polluted",
            before: undefined,
            after: true,
          },
        ],
      },
      engine((candidate) => candidate),
      context(source),
    );

    expect(protectedResult.failureReason).toBe("unsafe_path");
    expect(prototypeResult.failureReason).toBe("unsafe_path");
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
  });

  it("rejects no-op patches so they cannot be reported as repairs", () => {
    const source = row();
    const result = applyPatch(
      source,
      {
        rowId: source.id,
        changes: [
          {
            path: "normalizedQuestion.stem",
            before: "Original",
            after: "Original",
          },
        ],
      },
      engine((candidate) => candidate),
      context(source),
    );

    expect(result.success).toBe(false);
    expect(result.failureReason).toBe("no_change");
  });

  it("detects a severity regression even when the total issue count decreases", () => {
    const source = row("Original", [
      issue("warning", "WARNING_A"),
      issue("warning", "WARNING_B"),
    ]);
    const result = applyPatch(
      source,
      {
        rowId: source.id,
        changes: [
          {
            path: "normalizedQuestion.stem",
            before: "Original",
            after: "Updated",
          },
        ],
      },
      engine((candidate) => ({
        ...candidate,
        issues: [issue("block", "NEW_BLOCK")],
        status: "rejected",
      })),
      context(source),
    );

    expect(result.issuesBefore).toBe(2);
    expect(result.issuesAfter).toBe(1);
    expect(result.success).toBe(false);
    expect(result.failureReason).toBe("validation_regression");
  });

  it("validates cross-row rules against the candidate revision", () => {
    const source = row();
    let contextStem = "";
    const result = applyPatch(
      source,
      {
        rowId: source.id,
        changes: [
          {
            path: "normalizedQuestion.stem",
            before: "Original",
            after: "Candidate",
          },
        ],
      },
      engine((candidate, validationContext) => {
        contextStem =
          validationContext.allRows.find((item) => item.id === candidate.id)
            ?.normalizedQuestion?.stem || "";
        return { ...candidate, issues: [], status: "valid" };
      }),
      context(source),
    );

    expect(result.success).toBe(true);
    expect(contextStem).toBe("Candidate");
  });

  it("rolls back an otherwise safe suggestion when its target rule remains", () => {
    const targetIssue = issue("warning", "TARGET_RULE");
    const source = row("Original", [targetIssue]);
    const result = applySuggestion(
      source,
      {
        id: "suggestion-1",
        issueId: targetIssue.id,
        ruleId: targetIssue.ruleId,
        label: "Change the stem",
        confidence: "high",
        autoApplicable: true,
        requiresUserApproval: false,
        patch: {
          rowId: source.id,
          changes: [
            {
              path: "normalizedQuestion.stem",
              before: "Original",
              after: "Updated",
            },
          ],
        },
      },
      engine((candidate) => ({
        ...candidate,
        issues: [targetIssue],
        status: "caution",
      })),
      context(source),
    );

    expect(result.success).toBe(false);
    expect(result.failureReason).toBe("target_issue_not_resolved");
    expect(result.row.normalizedQuestion?.stem).toBe("Original");
  });

  it("emits one atomic autofix for multiple deterministic MSQ identifiers", () => {
    const source: QuestionRow = {
      ...row(),
      normalizedQuestion: {
        type: "MSQ",
        stem: "Choose both.",
        options: [
          { id: "opt-a", label: "A", text: "One" },
          { id: "opt-b", label: "B", text: "Two" },
        ],
        correctAnswerIds: ["a", "b"],
      },
      issues: [issue("block", "MSQ_CORRECT_ANSWERS_IN_OPTIONS")],
      status: "rejected",
    };

    const suggestions = pass3GenerateSuggestions([source]);
    expect(suggestions.autoApplicable).toHaveLength(1);
    expect(suggestions.autoApplicable[0].patch.changes).toEqual([
      {
        path: "normalizedQuestion.correctAnswerIds",
        before: ["a", "b"],
        after: ["opt-a", "opt-b"],
      },
    ]);
  });
});
