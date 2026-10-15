import { describe, expect, it } from "vitest";

import {
  BatchLimitError,
  assertFileWithinBatchLimits,
  assertTabularDataWithinBatchLimits,
  resolveBatchProcessingLimits,
} from "./batchLimits";

describe("batch processing limits", () => {
  it("accepts values exactly at configured boundaries", () => {
    expect(() =>
      assertFileWithinBatchLimits(
        { name: "questions.csv", size: 10 },
        { maxFileBytes: 10 },
      ),
    ).not.toThrow();

    const metrics = assertTabularDataWithinBatchLimits(
      ["A", "B"],
      [
        { A: "1234", B: "56" },
        { A: "", B: "7" },
      ],
      {
        maxRows: 2,
        maxColumns: 2,
        maxCellCharacters: 4,
        maxTotalCharacters: 9,
      },
    );
    expect(metrics).toEqual({
      rows: 2,
      columns: 2,
      totalCharacters: 9,
      largestCellCharacters: 4,
    });
  });

  it("rejects oversized files before parsing", () => {
    expect(() =>
      assertFileWithinBatchLimits(
        { name: "huge.xlsx", size: 11 },
        { maxFileBytes: 10 },
      ),
    ).toThrowError(
      expect.objectContaining({
        code: "FILE_TOO_LARGE",
        limit: 10,
        actual: 11,
      }),
    );
  });

  it.each([
    {
      name: "rows",
      columns: ["A"],
      rows: [{ A: "1" }, { A: "2" }],
      limits: { maxRows: 1 },
      code: "TOO_MANY_ROWS",
    },
    {
      name: "columns",
      columns: ["A", "B"],
      rows: [{ A: "1", B: "2" }],
      limits: { maxColumns: 1 },
      code: "TOO_MANY_COLUMNS",
    },
    {
      name: "cell characters",
      columns: ["A"],
      rows: [{ A: "12345" }],
      limits: { maxCellCharacters: 4 },
      code: "CELL_TOO_LARGE",
    },
    {
      name: "total characters",
      columns: ["A"],
      rows: [{ A: "1234" }],
      limits: { maxTotalCharacters: 4 },
      code: "TOTAL_CONTENT_TOO_LARGE",
    },
  ])("rejects excessive $name", ({ columns, rows, limits, code }) => {
    expect(() =>
      assertTabularDataWithinBatchLimits(columns, rows, limits),
    ).toThrowError(expect.objectContaining({ code }));
  });

  it("rejects unsafe limit configuration", () => {
    expect(() => resolveBatchProcessingLimits({ maxRows: 0 })).toThrowError(
      expect.objectContaining({ code: "INVALID_LIMIT_CONFIGURATION" }),
    );
    expect(() =>
      resolveBatchProcessingLimits({ maxRows: Number.MAX_SAFE_INTEGER + 1 }),
    ).toThrow(BatchLimitError);
  });
});
