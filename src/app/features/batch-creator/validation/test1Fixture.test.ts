import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import fs from "fs";
import { inferColumnMapping } from "../normalization/autoColumnMapping";
import { normalizeRow } from "../normalization/normalizeRow";
import { ValidationEngine } from "./validationEngine";
import { getDefaultRuleRegistry } from "./ruleRegistry";
import { QuestionRow, RawSheetRow } from "../core/rowTypes";
import {
  detectBatchScoringConvention,
  applyScoringConventionToBatch,
} from "./batchScoringConvention";

describe("test1.xlsx mandatory third-pass regression assertions", () => {
  it("executes the full pipeline and verifies all prompt regression assertions", async () => {
    const filePath = "D:/PC-13-06/download/AssessmentCore/test1.xlsx";
    expect(fs.existsSync(filePath)).toBe(true);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) return;

    // Extract headers
    const headerRow = worksheet.getRow(1);
    const columns: string[] = [];
    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const colName = cell.text?.trim() || `Column_${colNumber}`;
      columns[colNumber - 1] = colName;
    });

    for (let i = 0; i < columns.length; i++) {
      if (!columns[i]) columns[i] = `Column_${i + 1}`;
    }

    const rawRows: RawSheetRow[] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const rawRow: Record<string, any> = {};
      let isEmpty = true;

      for (let i = 0; i < columns.length; i++) {
        const colName = columns[i];
        const cell = row.getCell(i + 1);
        let value = cell.value;
        if (value && typeof value === "object" && "richText" in value) {
          value = (value as any).richText.map((rt: any) => rt.text).join("");
        } else if (value && typeof value === "object" && "text" in value) {
          value = (value as any).text;
        }
        const strValue =
          value === null || value === undefined ? "" : String(value).trim();
        rawRow[colName] = strValue;
        if (strValue !== "") isEmpty = false;
      }

      if (!isEmpty) {
        rawRows.push({
          ...rawRow,
          __internalId: `row-${rowNumber}`,
          __sourceRowNumber: rowNumber,
        });
      }
    });

    // 1. Column Mapping Inference
    const mapping = inferColumnMapping(columns);

    // 2. Initial Normalization
    let normalizedRows = rawRows.map((raw) => normalizeRow(raw, mapping));

    // 3. Batch Scoring Convention Detection & Normalization
    const scoringConvention = detectBatchScoringConvention(normalizedRows);
    const { rows: batchScoredRows } = applyScoringConventionToBatch(
      normalizedRows,
      scoringConvention,
    );
    normalizedRows = batchScoredRows;

    // 4. Staged Validation Engine
    const engine = new ValidationEngine(getDefaultRuleRegistry());
    const validatedRows = engine.validateBatch(normalizedRows, {
      allRows: normalizedRows,
      columnMapping: mapping,
    });

    const getRowByQid = (qid: string) =>
      validatedRows.find((r) => r.metadata?.questionId === qid);

    const hasIssue = (
      row: QuestionRow | undefined,
      ruleIdOrCanonical: string,
    ) => {
      return !!row?.issues?.some(
        (i) =>
          i.ruleId === ruleIdOrCanonical ||
          i.canonicalProblem === ruleIdOrCanonical,
      );
    };

    // Assertion 1: Scoring convention - positive penalty magnitude (+1) normalized to -1
    const row003 = getRowByQid("JEE26-PHY-003");
    expect(row003).toBeDefined();
    if (row003) {
      expect(hasIssue(row003, "NEGATIVE_MARKS_INVALID")).toBe(false);
      expect(row003.metadata.negativeMarks).toBe(-1);
    }

    // Assertion 2: Marks deduplication - Positive marks -4 triggers POSITIVE_MARKS_INVALID and suppresses MARKS_INVALID & NEGATIVE_MARKS_EXCEED_POSITIVE
    const row006 = getRowByQid("JEE26-PHY-006");
    if (row006) {
      expect(hasIssue(row006, "POSITIVE_MARKS_INVALID")).toBe(true);
      expect(hasIssue(row006, "MARKS_INVALID")).toBe(false);
      expect(hasIssue(row006, "NEGATIVE_MARKS_EXCEED_POSITIVE")).toBe(false);
      const posIssue = row006.issues.find(
        (i) => i.canonicalProblem === "POSITIVE_MARKS_INVALID",
      );
      expect(posIssue?.suppressedRuleIds).toContain("MARKS_INVALID");
    }

    // Assertion 3: Missing media - REQUIRED_MEDIA_MISSING on JEE26-PHY-001
    const row001 = getRowByQid("JEE26-PHY-001");
    if (row001) {
      expect(hasIssue(row001, "REQUIRED_MEDIA_MISSING")).toBe(true);
    }

    // Assertion 4: Integer answer subtype and non-integer answer on JEE26-PHY-007
    const row007 = getRowByQid("JEE26-PHY-007");
    if (row007) {
      expect((row007.normalizedQuestion as any)?.responseMode).toBe("integer");
      expect(hasIssue(row007, "INTEGER_ANSWER_NOT_INTEGER")).toBe(true);
      expect(hasIssue(row007, "TRUNCATED_STEM")).toBe(true);
    }

    // Assertion 5: Unicode mathematics on JEE26-MAT-002
    const mat002 = getRowByQid("JEE26-MAT-002");
    if (mat002) {
      expect(hasIssue(mat002, "LATEX_STEM_DELIMITER_VALID")).toBe(false);
      expect(hasIssue(mat002, "MALFORMED_LATEX_DELIMITER")).toBe(false);
    }

    // Assertion 6: Answer deduplication on JEE26-CHE-017
    const che017 = getRowByQid("JEE26-CHE-017");
    if (che017) {
      expect(hasIssue(che017, "ANSWER_NOT_IN_OPTIONS")).toBe(true);
      expect(
        che017.issues.filter(
          (i) => i.canonicalProblem === "ANSWER_NOT_IN_OPTIONS",
        ).length,
      ).toBe(1);
    }

    // Assertion 7: Unsupported type preservation for MATRIX_MATCH and Hotspot
    const matrixRow = validatedRows.find(
      (r) =>
        (r.rawRow as any)?.Question_Type === "MATRIX_MATCH" ||
        r.normalizedQuestion?.type === "UNSUPPORTED",
    );
    if (matrixRow) {
      expect(matrixRow.normalizedQuestion?.type).toBe("UNSUPPORTED");
      expect(hasIssue(matrixRow, "UNSUPPORTED_TYPE_FOR_TARGET_EXPORT")).toBe(
        true,
      );
      expect(hasIssue(matrixRow, "UNKNOWN_QUESTION_TYPE_BLOCK")).toBe(false);
    }

    // Assertion 8: Duplicate stem grouping
    const dupStemRow = validatedRows.find((r) =>
      hasIssue(r, "DUPLICATE_NORMALIZED_STEM_REVIEW"),
    );
    if (dupStemRow) {
      const issue = dupStemRow.issues.find(
        (i) => i.ruleId === "DUPLICATE_NORMALIZED_STEM_REVIEW",
      );
      expect(issue?.duplicateGroupId).toBeDefined();
      expect(issue?.relatedRows?.length).toBeGreaterThan(0);
    }

    // Strict third-pass acceptance matrix: required rows may not silently disappear.
    for (const questionId of [
      "JEE26-PHY-006",
      "JEE26-CHE-007",
      "JEE26-MAT-007",
    ]) {
      const marksRow = getRowByQid(questionId);
      expect(marksRow, questionId).toBeDefined();
      expect(hasIssue(marksRow, "POSITIVE_MARKS_INVALID"), questionId).toBe(
        true,
      );
      expect(hasIssue(marksRow, "MARKS_INVALID"), questionId).toBe(false);
      expect(
        hasIssue(marksRow, "NEGATIVE_MARKS_EXCEED_POSITIVE"),
        questionId,
      ).toBe(false);
      expect(marksRow?.skippedRuleIds, questionId).toContain(
        "NEGATIVE_MARKS_EXCEED_POSITIVE",
      );
    }

    for (const questionId of [
      "JEE26-PHY-015",
      "JEE26-CHE-007",
      "JEE26-MAT-007",
      "JEE26-PHY-034",
      "JEE26-CHE-026",
      "JEE26-MAT-025",
    ]) {
      const latexRow = getRowByQid(questionId);
      expect(latexRow, questionId).toBeDefined();
      if (hasIssue(latexRow, "MALFORMED_LATEX_DELIMITER")) {
        expect(
          latexRow?.issues.some(
            (issue) => issue.ruleId === "LATEX_STEM_DELIMITER_VALID",
          ),
          questionId,
        ).toBe(false);
      }
    }

    const invalidOptionRow = getRowByQid("JEE26-PHY-028");
    expect(invalidOptionRow).toBeDefined();
    expect(hasIssue(invalidOptionRow, "MCQ_MIN_OPTIONS")).toBe(true);
    expect(hasIssue(invalidOptionRow, "ANSWER_NOT_IN_OPTIONS")).toBe(false);
    expect(invalidOptionRow?.skippedRuleIds).toContain("MCQ_ANSWER_IN_OPTIONS");

    const integerRow = getRowByQid("JEE26-PHY-007");
    expect(integerRow).toBeDefined();
    expect(integerRow?.rawType).toBe("INTEGER");
    expect(integerRow?.canonicalType).toBe("TEXT_ENTRY");
    expect(integerRow?.typeResolution?.status).toBe("supported");
    expect((integerRow?.normalizedQuestion as any)?.responseMode).toBe(
      "integer",
    );
    expect(hasIssue(integerRow, "INTEGER_ANSWER_NOT_INTEGER")).toBe(true);
    expect(hasIssue(integerRow, "TRUNCATED_STEM")).toBe(true);

    const unsupportedRows = validatedRows.filter((row) =>
      ["matrix_match", "hotspot"].includes(String(row.rawType).toLowerCase()),
    );
    expect(unsupportedRows.length).toBeGreaterThan(0);
    for (const unsupportedRow of unsupportedRows) {
      expect(unsupportedRow.canonicalType).toBe("UNSUPPORTED");
      expect(unsupportedRow.typeResolution?.status).toBe("unsupported");
      expect(
        hasIssue(unsupportedRow, "UNSUPPORTED_TYPE_FOR_TARGET_EXPORT"),
      ).toBe(true);
      expect(hasIssue(unsupportedRow, "UNKNOWN_QUESTION_TYPE_BLOCK")).toBe(
        false,
      );
    }

    // Assertion 9 (Fourth-pass): WRONG_SUBJECT_TAG on real fixture mismatches
    // ROW 18: JEE26-PHY-017 Subject=Chemistry Chapter=Dual Nature of Matter -> should be Physics
    const phy017 = getRowByQid("JEE26-PHY-017");
    if (phy017) {
      expect(hasIssue(phy017, "WRONG_SUBJECT_TAG")).toBe(true);
      const subjectIssue = phy017.issues.find(
        (i) => i.ruleId === "WRONG_SUBJECT_TAG",
      );
      expect(subjectIssue?.evidence?.expectedSubject).toBe("Physics");
    }

    // ROW 59: JEE26-CHE-018 Subject=Mathematics Chapter=Periodic Classification -> should be Chemistry
    const che018 = getRowByQid("JEE26-CHE-018");
    if (che018) {
      expect(hasIssue(che018, "WRONG_SUBJECT_TAG")).toBe(true);
      const subjectIssue = che018.issues.find(
        (i) => i.ruleId === "WRONG_SUBJECT_TAG",
      );
      expect(subjectIssue?.evidence?.expectedSubject).toBe("Chemistry");
    }

    // ROW 98: JEE26-MAT-017 Subject=Physics Chapter=Permutations and Combinations -> should be Mathematics
    const mat017 = getRowByQid("JEE26-MAT-017");
    if (mat017) {
      expect(hasIssue(mat017, "WRONG_SUBJECT_TAG")).toBe(true);
      const subjectIssue = mat017.issues.find(
        (i) => i.ruleId === "WRONG_SUBJECT_TAG",
      );
      expect(subjectIssue?.evidence?.expectedSubject).toBe("Mathematics");
    }
  });
});
