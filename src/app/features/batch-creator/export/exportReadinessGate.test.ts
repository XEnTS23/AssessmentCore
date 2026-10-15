import { describe, expect, it } from "vitest";

import { DEFAULT_EXPORT_CONFIG } from "../configuration/defaultExportConfig";
import { ExportConfig } from "../core/exportTypes";
import { QuestionRow } from "../core/rowTypes";
import { buildAndPackage } from "./packageBuilder";
import { evaluateExportReadinessGate } from "./exportReadinessGate";

function validMcq(overrides: Partial<QuestionRow> = {}): QuestionRow {
  return {
    id: "row-1",
    sourceRowNumber: 2,
    rawRow: {},
    normalizedQuestion: {
      type: "MCQ",
      stem: "What is 2 + 2?",
      options: [
        { id: "A", label: "A", text: "4" },
        { id: "B", label: "B", text: "5" },
      ],
      correctAnswerId: "A",
      explanation: "2 + 2 equals 4.",
    },
    metadata: { questionId: "question_1" },
    mediaReferences: [],
    mathReferences: [],
    scoringConfig: { marks: 1, partialMarking: false },
    history: [],
    status: "valid",
    issues: [],
    ...overrides,
  };
}

function config(overrides: Partial<ExportConfig> = {}): ExportConfig {
  return {
    ...structuredClone(DEFAULT_EXPORT_CONFIG),
    ...overrides,
  };
}

describe("authoritative export readiness gate", () => {
  it("blocks a stale row that is marked valid but fails current validation", () => {
    const stale = validMcq({
      normalizedQuestion: {
        type: "MCQ",
        stem: "",
        options: [
          { id: "A", label: "A", text: "4" },
          { id: "B", label: "B", text: "5" },
        ],
        correctAnswerId: "A",
      },
    });

    const result = evaluateExportReadinessGate([stale], config());

    expect(result.isReady).toBe(false);
    expect(result.rows[0].status).toBe("rejected");
    expect(
      result.blockers.some(
        (error) => error.code === "EXPORT_READINESS_BLOCKED",
      ),
    ).toBe(true);
    expect(
      result.warnings.some(
        (warning) => warning.code === "ROW_VALIDATION_REFRESHED",
      ),
    ).toBe(true);
  });

  it("refreshes a stale rejected status when the current content is valid", () => {
    const stale = validMcq({
      status: "rejected",
      issues: [
        {
          id: "old",
          ruleId: "REQUIRED_QUESTION_FIELD",
          rowId: "row-1",
          category: "structural",
          severity: "block",
          message: "Old validation result.",
        },
      ],
    });

    const result = evaluateExportReadinessGate([stale], config());

    expect(result.isReady).toBe(true);
    expect(result.rows[0].status).toBe("valid");
    expect(result.summary.refreshed).toBe(1);
  });

  it("keeps review rows exportable but requires a surfaced warning", () => {
    const first = validMcq();
    const duplicate = validMcq({
      id: "row-2",
      sourceRowNumber: 3,
      metadata: { questionId: "question_2" },
    });

    const result = evaluateExportReadinessGate([first, duplicate], config());

    expect(result.isReady).toBe(true);
    expect(result.summary.needsReview).toBe(2);
    expect(
      result.warnings.filter(
        (warning) => warning.code === "EXPORT_READINESS_WARNING",
      ),
    ).toHaveLength(2);
  });

  it("blocks empty and malformed batches before any builder runs", () => {
    const empty = evaluateExportReadinessGate([], config());
    const malformed = evaluateExportReadinessGate(
      [{} as QuestionRow],
      config(),
    );

    expect(empty.blockers[0].code).toBe("EMPTY_EXPORT_BATCH");
    expect(malformed.blockers[0].code).toBe("MALFORMED_EXPORT_ROW");
  });

  it("enforces invalid export configuration at the same boundary", () => {
    const result = evaluateExportReadinessGate(
      [validMcq()],
      config({
        timeLimitMode: "global",
        timeLimitValue: undefined,
      }),
    );

    expect(result.isReady).toBe(false);
    expect(
      result.blockers.some((error) => error.code === "EXPORT_CONFIG_INVALID"),
    ).toBe(true);
  });
});

describe("package builder readiness enforcement", () => {
  it("returns no artifact for a stale invalid row", async () => {
    const stale = validMcq({
      normalizedQuestion: {
        type: "MCQ",
        stem: "",
        options: [
          { id: "A", label: "A", text: "4" },
          { id: "B", label: "B", text: "5" },
        ],
        correctAnswerId: "A",
      },
    });

    const result = await buildAndPackage([stale], config());

    expect(result.isDownloadReady).toBe(false);
    expect(result.validatedArtifacts).toHaveLength(0);
    expect(
      result.validationErrors.some(
        (error) => error.code === "EXPORT_READINESS_BLOCKED",
      ),
    ).toBe(true);
  });

  it("builds from the freshly validated row set when the gate passes", async () => {
    const result = await buildAndPackage(
      [validMcq({ status: "normalized" })],
      config(),
    );

    expect(result.isDownloadReady).toBe(true);
    expect(result.validatedArtifacts).toHaveLength(1);
    expect(
      result.validationWarnings.some(
        (warning) => warning.code === "ROW_VALIDATION_REFRESHED",
      ),
    ).toBe(true);
  });
});
