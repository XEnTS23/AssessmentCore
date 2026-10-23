import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import fs from "fs";
import { createHash } from "node:crypto";
import {
  createCanonicalColumnMapping,
  getMappingMetadata,
} from "../normalization/canonicalColumnMapping";
import { normalizeRow } from "../normalization/normalizeRow";
import { createRawImportedRow } from "../upload/rawCellData";
import { ValidationEngine } from "./validationEngine";
import { getDefaultRuleRegistry } from "./ruleRegistry";
import { QuestionRow, RawSheetRow } from "../core/rowTypes";
import {
  assertFixtureCoverageIntegrity,
  calculateFixtureCoverage,
  extractFixtureExpectations,
} from "./fixtureCoverage";
import { getCanonicalProblem } from "./issueDeduplicator";

const BUILD = "5.0.0-regression-fixture-stable";
const RULE_SET = "5.0.0";
const NORMALIZER = "1.7.0";

function canonicalProblemRowIds(
  rows: QuestionRow[],
  canonicalProblem: string,
): string[] {
  return rows
    .filter((row) =>
      row.issues.some(
        (issue) =>
          (issue.canonicalProblem || getCanonicalProblem(issue.ruleId)) ===
          canonicalProblem,
      ),
    )
    .map(
      (row) => row.metadata.questionId || `source-row-${row.sourceRowNumber}`,
    );
}

function sourceRuleRowIds(rows: QuestionRow[], sourceRule: string): string[] {
  return rows
    .filter((row) => row.issues.some((issue) => issue.ruleId === sourceRule))
    .map(
      (row) => row.metadata.questionId || `source-row-${row.sourceRowNumber}`,
    );
}

function list(ids: string[]): string {
  return ids.length ? `[${ids.join(", ")}]` : "[]";
}

function hasRawText(row: QuestionRow, columnName: string): boolean {
  return !!row.raw?.cells[columnName]?.rawText?.trim();
}

function hasBrokenRawText(row: QuestionRow): boolean {
  return Object.values(row.raw?.cells || {}).some((cell) => {
    const value = cell.rawText || "";
    return (
      value.includes("\uFFFD") ||
      value.includes("\u0000") ||
      /[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value) ||
      /(?:\u00C3[\u0080-\u00BF]|\u00E2(?:\u20AC[\u0080-\uFFFF]|\u0080[\u0080-\u00BF])|\u00EF\u00BF\u00BD)/.test(
        value,
      )
    );
  });
}

describe("test1.xlsx diagnostic execution (dataflow/coverage integrity)", () => {
  it("writes a checksum-backed report derived from immutable raw cells and final issues", async () => {
    const filePath = "test1.xlsx";
    if (!fs.existsSync(filePath)) return;

    const inputChecksum = createHash("sha256")
      .update(fs.readFileSync(filePath))
      .digest("hex");
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
    const mappingMetadata = getMappingMetadata(mapping);
    const ingestionContext = { mapping, mappingMetadata };
    const reportContext = { mapping, mappingMetadata };
    expect(reportContext.mapping).toBe(ingestionContext.mapping);
    expect(reportContext.mappingMetadata).toEqual(
      ingestionContext.mappingMetadata,
    );

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

    for (const row of validatedRows) {
      expect(Object.isFrozen(row.raw)).toBe(true);
      expect(Object.isFrozen(row.raw?.cells)).toBe(true);
    }
    expect(
      validatedRows.some((row) =>
        row.issues.some((issue) => issue.scope === "batch"),
      ),
    ).toBe(false);

    const diagnostics = engine.getExecutionDiagnostics();
    const issueCountsByRule: Record<string, number> = {};
    const issueCountsByCanonicalProblem: Record<string, number> = {};
    const suppressedBySourceRule: Record<string, number> = {};
    for (const row of validatedRows) {
      for (const issue of row.issues) {
        issueCountsByRule[issue.ruleId] =
          (issueCountsByRule[issue.ruleId] || 0) + 1;
        const canonical = issue.canonicalProblem || issue.ruleId;
        issueCountsByCanonicalProblem[canonical] =
          (issueCountsByCanonicalProblem[canonical] || 0) + 1;
        for (const suppressed of issue.suppressedRuleIds || []) {
          suppressedBySourceRule[suppressed] =
            (suppressedBySourceRule[suppressed] || 0) + 1;
        }
      }
    }

    const expectations = extractFixtureExpectations(validatedRows);
    const fixtureCoverage = calculateFixtureCoverage(
      expectations,
      validatedRows,
    );
    assertFixtureCoverageIntegrity(fixtureCoverage, validatedRows);

    const mappingRows = [
      ["copyrightStatus", "Copyright_Status"],
      ["sourceReference", "Source_Reference"],
      ["teacherVersion", "Teacher_Version"],
      ["submittedAt", "Submitted_At"],
      ["lastUpdatedAt", "Last_Updated_At"],
    ] as const;
    const activeNumericRows = validatedRows.filter((row) => {
      const question = row.normalizedQuestion as any;
      return (
        row.canonicalType === "TEXT_ENTRY" &&
        ["numeric", "integer"].includes(
          String(question?.responseMode || question?.mode),
        ) &&
        !!mapping.acceptedAnswers &&
        hasRawText(row, mapping.acceptedAnswers)
      );
    });
    const recognizedUnitRows = activeNumericRows.filter((row) =>
      row.issues.some(
        (issue) =>
          issue.canonicalProblem === "UNIT_EMBEDDED_IN_NUMERIC_ANSWER" ||
          issue.ruleId === "UNIT_EMBEDDED_IN_NUMERIC_ANSWER",
      ),
    );
    const rowsWithBothTimestamps = validatedRows.filter(
      (row) =>
        !!row.metadata.rawSubmittedAt?.trim() &&
        !!row.metadata.rawLastUpdatedAt?.trim(),
    );
    const timestampParseFailures = rowsWithBothTimestamps.filter(
      (row) =>
        !row.metadata.submittedTimestamp?.valid ||
        !row.metadata.lastUpdatedTimestamp?.valid,
    );
    const brokenRawRows = validatedRows.filter(hasBrokenRawText);
    const totalExecuted = Object.values(diagnostics).reduce(
      (sum, diagnostic) => sum + diagnostic.executed,
      0,
    );
    const totalSkipped = Object.values(diagnostics).reduce(
      (sum, diagnostic) => sum + diagnostic.skipped,
      0,
    );
    const totalSuppressed = Object.values(diagnostics).reduce(
      (sum, diagnostic) => sum + diagnostic.issuesSuppressed,
      0,
    );

    const lines: string[] = [
      "# Diagnostic Validation Report for test1.xlsx (Dataflow/Coverage Integrity)",
      "",
      "## Run Metadata",
      `- Validator Build: ${BUILD}`,
      `- Rule Set Version: ${RULE_SET}`,
      `- Normalizer Version: ${NORMALIZER}`,
      `- Input File SHA-256: ${inputChecksum}`,
      `- Mapping Version: ${mappingMetadata.version}`,
      `- Mapping Hash Used by Ingestion: ${ingestionContext.mappingMetadata.hash}`,
      `- Mapping Hash Used by Report: ${reportContext.mappingMetadata.hash}`,
      `- Registered Rules: ${registry.length}`,
      `- Executed Rule Evaluations: ${totalExecuted}`,
      `- Skipped Rule Evaluations: ${totalSkipped}`,
      `- Suppressed Issues: ${totalSuppressed}`,
      `- Batch-Level Issues: ${engine.getBatchIssues().length}`,
      "",
      "## Canonical Column Mapping",
      "```json",
      JSON.stringify(mapping, null, 2),
      "```",
      "",
      "| Canonical Field | Workbook Column | Header Exists | Populated Raw Rows |",
      "|---|---|---:|---:|",
    ];

    for (const [field, expectedHeader] of mappingRows) {
      const mappedColumn = mapping[field];
      const populated = mappedColumn
        ? validatedRows.filter((row) => hasRawText(row, mappedColumn)).length
        : 0;
      lines.push(
        `| ${field} | ${mappedColumn || "(unmapped)"} | ${mappedColumn && columns.includes(mappedColumn) ? "Yes" : "No"} | ${populated}/${validatedRows.length} |`,
      );
    }

    lines.push(
      "",
      "## Raw Field Population Diagnostics",
      ...mappingRows.map(([field, expectedHeader]) => {
        const mappedColumn = mapping[field];
        const populated = mappedColumn
          ? validatedRows.filter((row) => hasRawText(row, mappedColumn)).length
          : 0;
        return `- ${expectedHeader} populated: ${populated}/${validatedRows.length}`;
      }),
      `- Rows containing detectable raw encoding corruption: ${brokenRawRows.length}`,
      `- Raw encoding row IDs: ${list(brokenRawRows.map((row) => row.metadata.questionId || `source-row-${row.sourceRowNumber}`))}`,
      `- Active numeric/integer rows with raw Numerical_Answer: ${activeNumericRows.length}`,
      `- Active rows with recognized unit-bearing answers: ${recognizedUnitRows.length}`,
      `- UNIT_EMBEDDED_IN_NUMERIC_ANSWER final emitted rows: ${canonicalProblemRowIds(validatedRows, "UNIT_EMBEDDED_IN_NUMERIC_ANSWER").length}`,
      `- Rows with both timestamp fields populated: ${rowsWithBothTimestamps.length}`,
      `- Rows with both timestamps parsed successfully: ${rowsWithBothTimestamps.length - timestampParseFailures.length}`,
      `- Rows with timestamp parse failures: ${timestampParseFailures.length}`,
      `- Rows with chronological conflicts: ${canonicalProblemRowIds(validatedRows, "VERSION_TIMESTAMP_CONFLICT").length}`,
      "",
      "## Realistic Fixture Scope",
      "",
      `- Copyright fields: ${mapping.copyrightStatus || mapping.sourceReference ? "present" : "absent"}`,
      `- Version fields: ${mapping.teacherVersion || mapping.submittedAt || mapping.lastUpdatedAt ? "present" : "absent"}`,
      `- Detectable broken encoding rows: ${brokenRawRows.length}`,
      `- Active unit-bearing numeric answers: ${recognizedUnitRows.length}`,
      `- Expectation manifest attached: No`,
      "",
      "## Fixture Coverage",
      "",
      `- Expectation source column Known_Issue_Tag: ${columns.includes("Known_Issue_Tag") ? "present" : "absent"}`,
      columns.includes("Known_Issue_Tag")
        ? "- Coverage is calculated from final post-deduplication issues."
        : "- Fixture expectation metadata is unavailable in this workbook; no expected row IDs are inferred from intended counts.",
      brokenRawRows.length === 0
        ? "- BROKEN_ENCODING: Fixture mutation not present in workbook."
        : "- BROKEN_ENCODING: Detectable raw mutation is present.",
      "",
      "| Issue Tag | Expected | Applicable | Detected | Missed |",
      "|---|---:|---:|---:|---:|",
    );
    for (const coverage of fixtureCoverage) {
      lines.push(
        `| ${coverage.issueTag} | ${coverage.expectedRows.length} | ${coverage.applicableRows.length} | ${coverage.detectedRows.length} | ${coverage.missedRows.length} |`,
      );
    }

    lines.push("", "## Row-Level Fixture Proof", "");
    for (const coverage of fixtureCoverage) {
      lines.push(
        `### ${coverage.issueTag}`,
        `- Expected: ${list(coverage.expectedRows)}`,
        `- Applicable: ${list(coverage.applicableRows)}`,
        `- Detected from final issues: ${list(coverage.detectedRows)}`,
        `- Missed: ${list(coverage.missedRows)}`,
        `- Non-applicable: ${list(coverage.nonApplicableRows)}`,
        `- Reclassified as inactive-field conflict: ${list(coverage.reclassifiedAsInactiveFieldConflict)}`,
        `- All final emitted rows for canonical problem: ${list(canonicalProblemRowIds(validatedRows, coverage.expectedCanonicalProblem))}`,
        "",
      );
    }

    lines.push(
      "## Validation Summary",
      `- Total Rows Evaluated: ${validatedRows.length}`,
      `- Valid Rows: ${validatedRows.filter((row) => row.status === "valid").length}`,
      `- Caution Rows: ${validatedRows.filter((row) => row.status === "caution").length}`,
      `- Needs Review Rows: ${validatedRows.filter((row) => row.status === "needs_review").length}`,
      `- Rejected Rows: ${validatedRows.filter((row) => row.status === "rejected").length}`,
      "",
      "## Issue Counts by Rule ID",
      "```json",
      JSON.stringify(issueCountsByRule, null, 2),
      "```",
      "",
      "## Issue Counts by Canonical Problem",
      "```json",
      JSON.stringify(issueCountsByCanonicalProblem, null, 2),
      "```",
      "",
      "## Suppressed Issues by Source Rule",
      "```json",
      JSON.stringify(suppressedBySourceRule, null, 2),
      "```",
      "",
      "## Rule Execution Diagnostics",
      "",
      "| Source Rule | Pre-dedup Emitted | Suppressed | Final Rows Under Same Rule ID | Canonical Problem | Final Rows Under Canonical Problem |",
      "|---|---:|---:|---:|---|---:|",
    );
    for (const ruleId of Object.keys(diagnostics).sort()) {
      const diagnostic = diagnostics[ruleId];
      const canonicalProblem = getCanonicalProblem(ruleId);
      lines.push(
        `| ${ruleId} | ${diagnostic.issuesEmitted} | ${diagnostic.issuesSuppressed} | ${sourceRuleRowIds(validatedRows, ruleId).length} | ${canonicalProblem} | ${canonicalProblemRowIds(validatedRows, canonicalProblem).length} |`,
      );
    }

    lines.push("", "## Batch-Level Issues", "");
    const batchIssues = engine.getBatchIssues();
    if (batchIssues.length === 0) {
      lines.push("- None");
    } else {
      for (const issue of batchIssues) {
        lines.push(
          `- ${issue.ruleId} / ${issue.severity.toUpperCase()}: ${issue.message}`,
        );
      }
    }

    lines.push("", "## Row-by-Row Validation Results", "");
    for (const row of validatedRows) {
      lines.push(
        `### Row ${row.sourceRowNumber} - ${row.metadata.questionId || "unlabelled"} (${row.status.toUpperCase()})`,
        `- Raw Type: ${row.rawType || "missing"}`,
        `- Canonical Type: ${row.canonicalType || "UNKNOWN"}`,
        `- Skipped Rules: ${row.skippedRuleIds?.join(", ") || "None"}`,
      );
      for (const issue of row.issues) {
        lines.push(
          `- ${issue.ruleId} / ${issue.canonicalProblem || issue.ruleId} / ${issue.severity.toUpperCase()}: ${issue.message}`,
        );
        if (issue.suppressedRuleIds?.length) {
          lines.push(`  Suppressed: ${issue.suppressedRuleIds.join(", ")}`);
        }
        if (issue.evidence)
          lines.push(`  Evidence: ${JSON.stringify(issue.evidence)}`);
      }
      lines.push("");
    }

    fs.mkdirSync("artifacts", { recursive: true });
    const reportContent = lines.join("\n");
    fs.writeFileSync(
      "artifacts/validation-report-test1.md",
      reportContent,
      "utf8",
    );

    expect(inputChecksum).toMatch(/^[a-f0-9]{64}$/);
    expect(mappingMetadata.hash).toBe(reportContext.mappingMetadata.hash);
    expect(issueCountsByCanonicalProblem.WRONG_SUBJECT_TAG).toBe(3);
    expect(issueCountsByCanonicalProblem.INACTIVE_FIELD_CONTAINS_DATA).toBe(5);

    const getRow = (questionId: string) =>
      validatedRows.find((row) => row.metadata.questionId === questionId)!;
    const hasFinalIssue = (row: QuestionRow, problem: string) =>
      row.issues.some(
        (issue) =>
          issue.ruleId === problem || issue.canonicalProblem === problem,
      );
    expect(
      hasFinalIssue(getRow("JEE26-PHY-006"), "POSITIVE_MARKS_INVALID"),
    ).toBe(true);
    expect(hasFinalIssue(getRow("JEE26-PHY-006"), "MARKS_INVALID")).toBe(false);
    expect(
      hasFinalIssue(getRow("JEE26-PHY-006"), "NEGATIVE_MARKS_EXCEED_POSITIVE"),
    ).toBe(false);
    expect(
      (getRow("JEE26-PHY-007").normalizedQuestion as any).responseMode,
    ).toBe("integer");
    expect(
      hasFinalIssue(getRow("JEE26-PHY-007"), "INTEGER_ANSWER_NOT_INTEGER"),
    ).toBe(true);
    expect(
      hasFinalIssue(getRow("JEE26-PHY-015"), "MALFORMED_LATEX_DELIMITER"),
    ).toBe(true);
    expect(
      getRow("JEE26-PHY-015").issues.some(
        (issue) => issue.ruleId === "LATEX_STEM_DELIMITER_VALID",
      ),
    ).toBe(false);
    for (const row of validatedRows.filter(
      (item) => String(item.rawType).toLowerCase() === "matrix_match",
    )) {
      expect(row.canonicalType).toBe("UNSUPPORTED");
      expect(hasFinalIssue(row, "UNSUPPORTED_TYPE_FOR_TARGET_EXPORT")).toBe(
        true,
      );
    }
    const explanationIssue = getRow("JEE26-CHE-002").issues.find(
      (issue) => issue.ruleId === "EXPLANATION_RESULT_MISMATCH",
    );
    expect(explanationIssue?.severity).toBe("block");
    expect(
      Number(explanationIssue?.evidence?.confidence),
    ).toBeGreaterThanOrEqual(0.9);
    for (const coverage of fixtureCoverage) {
      expect(coverage.detectedRows.length).toBeLessThanOrEqual(
        issueCountsByCanonicalProblem[coverage.expectedCanonicalProblem] || 0,
      );
    }

    expect({
      total: validatedRows.length,
      valid: validatedRows.filter((row) => row.status === "valid").length,
      caution: validatedRows.filter((row) => row.status === "caution").length,
      needsReview: validatedRows.filter((row) => row.status === "needs_review")
        .length,
      rejected: validatedRows.filter((row) => row.status === "rejected").length,
    }).toEqual({
      total: 120,
      valid: 28,
      caution: 4,
      needsReview: 42,
      rejected: 46,
    });
    console.log(
      "DATAFLOW_COVERAGE_REPORT_TOTALS:",
      JSON.stringify({
        total: validatedRows.length,
        valid: validatedRows.filter((row) => row.status === "valid").length,
        caution: validatedRows.filter((row) => row.status === "caution").length,
        needsReview: validatedRows.filter(
          (row) => row.status === "needs_review",
        ).length,
        rejected: validatedRows.filter((row) => row.status === "rejected")
          .length,
        mappingHash: mappingMetadata.hash,
        expectationCount: expectations.length,
      }),
    );
  });
});
