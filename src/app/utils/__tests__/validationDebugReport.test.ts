import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import Papa from 'papaparse';
import {
  buildValidationDebugReport,
  buildValidationProfile,
  validateAllQuestions,
} from '../questionValidator.js';
import { detectQuestionColumns } from '../fileParser.js';

const CSV_PATH = 'C:\\Users\\krish\\Downloads\\AC\\validation-csv-test-1.csv';

function parseCsvFile(path: string): { columns: string[]; rows: Record<string, any>[] } {
  const csvText = fs.readFileSync(path, 'utf8');
  const results = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  const rows = results.data as Record<string, any>[];
  const columns = (results.meta.fields || Object.keys(rows[0] || {})) as string[];

  const rowsWithId = rows.map((row, index) => {
    const idKey = Object.keys(row).find((key) => key.toLowerCase() === 'id');
    const sourceIdRaw = idKey ? row[idKey] : undefined;
    const sourceIdNormalized = sourceIdRaw == null ? '' : String(sourceIdRaw).trim();
    const explicitIdMissing = sourceIdNormalized.length === 0;

    return {
      ...row,
      id: explicitIdMissing ? `row_${index}` : sourceIdRaw,
      __sourceRowNumber: index + 1,
      __sourceIdRaw: sourceIdRaw ?? '',
      __explicitIdMissing: explicitIdMissing,
    };
  });

  return { columns, rows: rowsWithId };
}

describe('validation debug report (csv)', () => {
  it('builds debug report and prints verification outputs', () => {
    const { columns, rows } = parseCsvFile(CSV_PATH);
    const columnMapping = detectQuestionColumns(columns);
    const profile = buildValidationProfile();
    const results = validateAllQuestions(rows as any, columnMapping, profile);
    const debugReport = buildValidationDebugReport(results);

    const notInOptionsRows = debugReport.rows.filter((row) => !row.isAnswerInOptions);
    const notInOptionsMcqMsqRows = notInOptionsRows.filter(
      (row) => row.detectedType === 'mcq' || row.detectedType === 'msq'
    );
    const validRows = debugReport.rows.filter((row) => row.validationV2.status === 'valid');
    const statusCounts = {
      valid: debugReport.validRows,
      invalid: debugReport.invalidRows,
      review: debugReport.reviewRows,
    };

    // Verification outputs (required)
    console.log('DEBUG_REPORT_SUMMARY=', JSON.stringify({
      totalRows: debugReport.totalRows,
      validRows: debugReport.validRows,
      invalidRows: debugReport.invalidRows,
      reviewRows: debugReport.reviewRows,
      issueCounts: debugReport.issueCounts,
      topIssues: debugReport.topIssues,
      issueCodes: debugReport.issueCodes,
    }, null, 2));

    console.log('COUNT_ANSWER_NOT_IN_OPTIONS=', notInOptionsRows.length);
    console.log('COUNT_ANSWER_NOT_IN_OPTIONS_MCQ_MSQ=', notInOptionsMcqMsqRows.length);
    console.log('EXAMPLES_ANSWER_NOT_IN_OPTIONS=', JSON.stringify(notInOptionsRows.slice(0, 5), null, 2));
    console.log('EXAMPLES_VALID_ROWS=', JSON.stringify(validRows.slice(0, 5), null, 2));
    console.log('STATUS_DISTRIBUTION=', JSON.stringify(statusCounts, null, 2));
    console.log('ALL_ISSUE_CODES=', JSON.stringify(debugReport.issueCodes, null, 2));

    expect(debugReport.totalRows).toBeGreaterThan(0);
  });
});
