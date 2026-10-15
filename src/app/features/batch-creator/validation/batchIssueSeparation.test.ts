import { describe, expect, it } from "vitest";
import { QuestionRow } from "../core/rowTypes";
import { ValidationEngine } from "./validationEngine";

function row(id: string): QuestionRow {
  return {
    id,
    sourceRowNumber: Number(id.slice(-1)),
    rawRow: {},
    normalizedQuestion: {
      type: "MCQ",
      rawType: "MCQ",
      canonicalType: "MCQ",
      typeResolution: {
        status: "supported",
        rawType: "MCQ",
        canonicalType: "MCQ",
      },
      stem: `A complete question stem for ${id}?`,
      options: [
        { id: `${id}-A`, label: "A", text: "Alpha" },
        { id: `${id}-B`, label: "B", text: "Beta" },
      ],
      correctAnswerId: `${id}-A`,
    },
    rawType: "MCQ",
    canonicalType: "MCQ",
    typeResolution: {
      status: "supported",
      rawType: "MCQ",
      canonicalType: "MCQ",
    },
    metadata: {
      questionId: id,
      marks: 4,
      negativeMarks: 1,
    },
    mediaReferences: [],
    mathReferences: [],
    scoringConfig: { marks: 4, partialMarking: false },
    history: [],
    status: "normalized",
    issues: [],
  };
}

describe("batch issue separation", () => {
  it("keeps scoring-convention issues out of every row issue collection", () => {
    const rows = [row("REG-BATCH-1"), row("REG-BATCH-2")];
    const engine = new ValidationEngine([]);
    const validated = engine.validateBatch(rows, {
      allRows: rows,
      columnMapping: {},
    });

    expect(engine.getBatchIssues()).toHaveLength(1);
    expect(engine.getBatchIssues()[0]).toMatchObject({
      ruleId: "NEGATIVE_MARKS_CONVENTION_AMBIGUOUS",
      scope: "batch",
    });
    expect(
      validated
        .flatMap((item) => item.issues)
        .some((issue) => issue.scope === "batch"),
    ).toBe(false);
    expect(validated.map((item) => item.status)).toEqual(["valid", "valid"]);
  });
});
