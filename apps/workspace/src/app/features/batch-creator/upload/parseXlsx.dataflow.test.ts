import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { parseXlsx } from "./parseXlsx";
import { normalizeRow } from "../normalization/normalizeRow";
import { getMappingMetadata } from "../normalization/canonicalColumnMapping";
import { ValidationEngine } from "../validation/validationEngine";
import { getDefaultRuleRegistry } from "../validation/ruleRegistry";

function parse(file: File): Promise<any> {
  return new Promise((resolve, reject) => {
    void parseXlsx({ file, onSuccess: resolve, onError: reject });
  });
}

describe("XLSX canonical mapping/raw-cell dataflow", () => {
  it("creates one mapping, preserves source cells, and propagates all five metadata fields", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Questions");
    sheet.addRow([
      "Question_ID",
      "Question_Type",
      "Question_Stem",
      "Option_A",
      "Option_B",
      "Correct_Answer",
      "Copyright_Status",
      "Source_Reference",
      "Teacher_Version",
      "Submitted_At",
      "Last_Updated_At",
      "Unmapped_Audit_Column",
    ]);
    sheet.addRow([
      "Q-1",
      "MCQ",
      "Which answer is correct?",
      "A",
      "B",
      "A",
      "Unknown",
      "Screenshot from coaching material",
      "v2",
      "2026-07-20T10:00:00Z",
      "2026-07-19T10:00:00Z",
      42,
    ]);
    const bytes = await workbook.xlsx.writeBuffer();
    const file = new File([bytes], "mapped.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const result = await parse(file);
    const reportContext = {
      mapping: result.mapping,
      mappingMetadata: result.mappingMetadata,
    };
    expect(result.mapping).toBe(reportContext.mapping);
    expect(result.mapping).toMatchObject({
      copyrightStatus: "Copyright_Status",
      sourceReference: "Source_Reference",
      teacherVersion: "Teacher_Version",
      submittedAt: "Submitted_At",
      lastUpdatedAt: "Last_Updated_At",
    });
    expect(result.mappingMetadata).toEqual(getMappingMetadata(result.mapping));

    const imported = result.rawRows[0].__rawImportedRow;
    expect(imported.cells.Copyright_Status.rawText).toBe("Unknown");
    expect(imported.cells.Unmapped_Audit_Column.rawValue).toBe(42);
    expect(Object.isFrozen(imported)).toBe(true);
    expect(Object.isFrozen(imported.cells)).toBe(true);

    const normalized = normalizeRow(result.rawRows[0], result.mapping);
    expect(normalized.raw).toBe(imported);
    expect(normalized.metadata.rawCopyrightStatus).toBe("Unknown");
    expect(normalized.metadata.rawSourceReference).toBe(
      "Screenshot from coaching material",
    );
    expect(normalized.metadata.submittedTimestamp?.valid).toBe(true);
    expect(normalized.metadata.lastUpdatedTimestamp?.valid).toBe(true);

    const engine = new ValidationEngine(getDefaultRuleRegistry());
    const [validated] = engine.validateBatch([normalized], {
      allRows: [normalized],
      columnMapping: result.mapping,
    });
    expect(
      validated.issues.some((issue) => issue.ruleId === "COPYRIGHT_UNVERIFIED"),
    ).toBe(true);
    expect(
      validated.issues.some(
        (issue) => issue.ruleId === "VERSION_TIMESTAMP_CONFLICT",
      ),
    ).toBe(true);
  });
});
