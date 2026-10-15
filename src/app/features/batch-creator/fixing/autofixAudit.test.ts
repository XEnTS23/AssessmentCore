import { describe, expect, it } from "vitest";
import { FixSuggestion } from "../core/fixTypes";
import { QuestionRow } from "../core/rowTypes";
import {
  createCleaningAuditEntries,
  createSuggestionAuditEntry,
  describeAutofixFailure,
  formatAutofixValue,
  isAutofixRollbackSafe,
} from "./autofixAudit";

function row(
  stem: string,
  status: QuestionRow["status"] = "rejected",
): QuestionRow {
  return {
    id: "row-1",
    sourceRowNumber: 2,
    rawRow: {},
    normalizedQuestion: {
      type: "TEXT_ENTRY",
      stem,
      acceptedAnswers: ["4"],
      mode: "text",
      caseSensitive: false,
      trimPolicy: "trim",
    },
    metadata: {},
    mediaReferences: [],
    mathReferences: [],
    scoringConfig: { marks: 1, partialMarking: false },
    history: [],
    status,
    issues:
      status === "valid"
        ? []
        : [
            {
              id: "issue-1",
              ruleId: "TEST_RULE",
              rowId: "row-1",
              category: "structural",
              severity: "block",
              message: "Broken",
            },
          ],
  };
}

const suggestion: FixSuggestion = {
  id: "suggestion-1",
  issueId: "issue-1",
  ruleId: "TEST_RULE",
  label: "Repair the stem",
  confidence: "high",
  autoApplicable: true,
  requiresUserApproval: false,
  patch: {
    rowId: "row-1",
    changes: [
      { path: "normalizedQuestion.stem", before: "Broken", after: "Fixed" },
    ],
  },
};

describe("autofix audit ledger", () => {
  it("captures an applied suggestion with validation evidence and snapshots", () => {
    const before = row("Broken");
    const after = row("Fixed", "valid");
    const entry = createSuggestionAuditEntry(
      before,
      suggestion,
      { row: after, success: true },
      "automatic",
      "2026-01-01T00:00:00.000Z",
    );

    expect(entry.status).toBe("applied");
    expect(entry.beforeValidation).toEqual({
      status: "rejected",
      issueCount: 1,
    });
    expect(entry.afterValidation).toEqual({ status: "valid", issueCount: 0 });
    expect(entry.changes[0]).toEqual({
      path: "normalizedQuestion.stem",
      before: "Broken",
      after: "Fixed",
    });
    expect(isAutofixRollbackSafe(entry, after)).toBe(true);
  });

  it("records skipped suggestions without rollback snapshots", () => {
    const before = row("Broken");
    const entry = createSuggestionAuditEntry(
      before,
      suggestion,
      {
        row: before,
        success: false,
        failureReason: "stale_value",
      },
      "manual",
    );

    expect(entry.status).toBe("skipped");
    expect(entry.failureReason).toBe("stale_value");
    expect(entry.beforeSnapshot).toBeUndefined();
    expect(describeAutofixFailure(entry.failureReason)).toContain("changed");
  });

  it("disables rollback after later content edits", () => {
    const before = row("Broken");
    const after = row("Fixed", "valid");
    const entry = createSuggestionAuditEntry(
      before,
      suggestion,
      { row: after, success: true },
      "automatic",
    );
    const laterEdit = row("Manually edited", "valid");

    expect(isAutofixRollbackSafe(entry, laterEdit)).toBe(false);
  });

  it("groups cleaning logs per row and distinguishes detection-only entries", () => {
    const before = row(" Broken ");
    const after = row("Broken", "valid");
    const entries = createCleaningAuditEntries(
      [before],
      [after],
      [
        {
          rowId: "row-1",
          field: "stem",
          action: "whitespace_trim",
          before: " Broken ",
          after: "Broken",
          reversible: true,
          confidence: "high",
        },
      ],
    );
    const detectionOnly = createCleaningAuditEntries(
      [before],
      [before],
      [
        {
          rowId: "row-1",
          field: "rawRow.Answer",
          action: "null_token_detected",
          before: "N/A",
          after: "N/A",
          reversible: true,
          confidence: "medium",
        },
      ],
    );

    expect(entries).toHaveLength(1);
    expect(entries[0].status).toBe("applied");
    expect(detectionOnly[0].status).toBe("skipped");
    expect(detectionOnly[0].failureReason).toBe("detection_only");
  });

  it("formats audit values safely and compactly", () => {
    expect(formatAutofixValue(undefined)).toBe("Not set");
    expect(formatAutofixValue("")).toBe("(empty)");
    expect(formatAutofixValue({ answer: "A" })).toBe('{"answer":"A"}');
    expect(formatAutofixValue("abcdefgh", 5)).toBe("abcd…");
  });
});
