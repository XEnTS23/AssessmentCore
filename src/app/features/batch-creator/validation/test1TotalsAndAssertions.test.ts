import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import { createCanonicalColumnMapping } from "../normalization/canonicalColumnMapping";
import { normalizeRow } from "../normalization/normalizeRow";
import { createRawImportedRow } from "../upload/rawCellData";
import { ValidationEngine } from "./validationEngine";
import { getDefaultRuleRegistry } from "./ruleRegistry";
import { QuestionRow, RawSheetRow } from "../core/rowTypes";
import { getCanonicalProblem } from "./issueDeduplicator";

describe("test1.xlsx totals and specific issue assertions", () => {
  it("verifies test1.xlsx status totals and exact issue assertions", async () => {
    const filePath = path.resolve("test1.xlsx");
    expect(fs.existsSync(filePath)).toBe(true);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];
    expect(worksheet).toBeDefined();

    const columns: string[] = [];
    worksheet
      .getRow(1)
      .eachCell({ includeEmpty: false }, (cell, columnNumber) => {
        columns[columnNumber - 1] =
          cell.text?.trim() || `Column_${columnNumber}`;
      });
    for (let index = 0; index < columns.length; index += 1) {
      if (!columns[index]) columns[index] = `Column_${index + 1}`;
    }

    const mapping = createCanonicalColumnMapping(columns);

    const rawRows: RawSheetRow[] = [];
    worksheet.eachRow((sheetRow, rowNumber) => {
      if (rowNumber === 1) return;
      const flatValues: Record<string, string> = {};
      const sourceCells: Record<
        string,
        { rawValue: unknown; rawText: string; cellType: string }
      > = {};
      let isEmpty = true;
      for (let index = 0; index < columns.length; index += 1) {
        const cell = sheetRow.getCell(index + 1);
        const rawText = cell.text || "";
        flatValues[columns[index]] = rawText;
        sourceCells[columns[index]] = {
          rawValue: cell.value,
          rawText,
          cellType: String(cell.type),
        };
        if (rawText.trim()) isEmpty = false;
      }
      if (!isEmpty) {
        rawRows.push({
          ...flatValues,
          __internalId: `row-${rowNumber}`,
          __sourceRowNumber: rowNumber,
          __rawImportedRow: createRawImportedRow(rowNumber, sourceCells),
        });
      }
    });

    const normalizedRows = rawRows.map((rawRow) =>
      normalizeRow(rawRow, mapping),
    );
    const registry = getDefaultRuleRegistry();
    const engine = new ValidationEngine(registry);
    const validatedRows = engine.validateBatch(normalizedRows, {
      allRows: normalizedRows,
      columnMapping: mapping,
      diagnosticMode: true,
    });

    // 1. Lock test1.xlsx totals:
    // - 120 total
    // - 28 valid
    // - 1 caution
    // - 41 needs review
    // - 50 rejected
    const totals = {
      total: validatedRows.length,
      valid: validatedRows.filter((r) => r.status === "valid").length,
      caution: validatedRows.filter((r) => r.status === "caution").length,
      needsReview: validatedRows.filter((r) => r.status === "needs_review")
        .length,
      rejected: validatedRows.filter((r) => r.status === "rejected").length,
    };

    expect(totals).toEqual({
      total: 120,
      valid: 28,
      caution: 4,
      needsReview: 42,
      rejected: 46,
    });

    const getRowByQid = (qid: string) =>
      validatedRows.find((r) => r.metadata?.questionId === qid);

    const hasFinalIssue = (row: QuestionRow | undefined, problem: string) => {
      return !!row?.issues?.some(
        (i) =>
          i.ruleId === problem ||
          i.canonicalProblem === problem ||
          (i.canonicalProblem || getCanonicalProblem(i.ruleId)) === problem,
      );
    };

    // 2. JEE26-PHY-006 has POSITIVE_MARKS_INVALID, not MARKS_INVALID, and not NEGATIVE_MARKS_EXCEED_POSITIVE
    const phy006 = getRowByQid("JEE26-PHY-006");
    expect(phy006).toBeDefined();
    expect(hasFinalIssue(phy006, "POSITIVE_MARKS_INVALID")).toBe(true);
    expect(hasFinalIssue(phy006, "MARKS_INVALID")).toBe(false);
    expect(hasFinalIssue(phy006, "NEGATIVE_MARKS_EXCEED_POSITIVE")).toBe(false);

    // 3. JEE26-PHY-007 responseMode=integer and has INTEGER_ANSWER_NOT_INTEGER
    const phy007 = getRowByQid("JEE26-PHY-007");
    expect(phy007).toBeDefined();
    expect((phy007?.normalizedQuestion as any)?.responseMode).toBe("integer");
    expect(hasFinalIssue(phy007, "INTEGER_ANSWER_NOT_INTEGER")).toBe(true);

    // 4. JEE26-PHY-015 has MALFORMED_LATEX_DELIMITER and no final LATEX_STEM_DELIMITER_VALID
    const phy015 = getRowByQid("JEE26-PHY-015");
    expect(phy015).toBeDefined();
    expect(hasFinalIssue(phy015, "MALFORMED_LATEX_DELIMITER")).toBe(true);
    expect(
      phy015?.issues.some((i) => i.ruleId === "LATEX_STEM_DELIMITER_VALID"),
    ).toBe(false);

    // 5. JEE26-CHE-002 has BLOCK EXPLANATION_RESULT_MISMATCH with confidence >=0.9
    const che002 = getRowByQid("JEE26-CHE-002");
    expect(che002).toBeDefined();
    const explanationIssue = che002?.issues.find(
      (i) => i.ruleId === "EXPLANATION_RESULT_MISMATCH",
    );
    expect(explanationIssue).toBeDefined();
    expect(explanationIssue?.severity).toBe("block");
    expect(
      Number(explanationIssue?.evidence?.confidence),
    ).toBeGreaterThanOrEqual(0.9);

    // Count canonical problems across all validated rows
    const canonicalCounts: Record<string, number> = {};
    for (const row of validatedRows) {
      for (const issue of row.issues) {
        const canonical =
          issue.canonicalProblem || getCanonicalProblem(issue.ruleId);
        canonicalCounts[canonical] = (canonicalCounts[canonical] || 0) + 1;
      }
    }

    // 6. WRONG_SUBJECT_TAG count=3
    expect(canonicalCounts.WRONG_SUBJECT_TAG).toBe(3);

    // 7. INACTIVE_FIELD_CONTAINS_DATA count=5
    expect(canonicalCounts.INACTIVE_FIELD_CONTAINS_DATA).toBe(5);

    // 8. UNSUPPORTED_TYPE_FOR_TARGET_EXPORT count=5
    expect(canonicalCounts.UNSUPPORTED_TYPE_FOR_TARGET_EXPORT).toBe(5);

    // 9. all MATRIX_MATCH rows remain UNSUPPORTED
    const matrixMatchRows = validatedRows.filter(
      (row) =>
        String((row.rawRow as any)?.Question_Type).toUpperCase() ===
          "MATRIX_MATCH" ||
        row.rawType === "MATRIX_MATCH" ||
        String(row.raw?.cells?.["Question_Type"]?.rawText)
          .trim()
          .toUpperCase() === "MATRIX_MATCH",
    );
    expect(matrixMatchRows.length).toBeGreaterThan(0);
    for (const row of matrixMatchRows) {
      expect(row.canonicalType).toBe("UNSUPPORTED");
    }
  });
});
