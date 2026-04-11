import fs from 'fs';
import { validateAllQuestions, computeDataQualityMetrics } from './src/app/utils/questionValidator.js';
import { debugValidateMcqMsqAnswers } from './src/app/utils/validationRuleEngine.js';

const csv = fs.readFileSync('./validation-csv-test-1.csv', 'utf-8');
const lines = csv.split('\n').filter((l: string) => l.trim());
const headers = lines[0].split(',').map((h: string) => h.trim());

const rows = lines.slice(1).map((line: string, i: number) => {
  const vals = line.split(',').map((v: string) => v.trim());
  const row: any = {};
  headers.forEach((h: string, idx: number) => { row[h] = vals[idx] || ''; });
  const sourceIdRaw = row['id'];
  const explicitIdMissing = !sourceIdRaw || String(sourceIdRaw).trim() === '';
  row.id = explicitIdMissing ? 'row_' + i : sourceIdRaw;
  row.__sourceRowNumber = i + 1;
  row.__sourceIdRaw = sourceIdRaw ?? '';
  row.__explicitIdMissing = explicitIdMissing;
  return row;
});

const columnMapping = {
  questionCol: 'question_text',
  answerCol: 'correct_answer',
  typeCol: 'question_type',
  optionCols: ['option_1','option_2','option_3','option_4','option_5'],
  orderCol: 'order_items',
  difficultyCol: 'difficulty',
  solutionCol: 'solution',
  pointsCol: 'points',
  subjectCol: 'subject',
  topicCol: 'topic',
  toleranceCol: 'tolerance',
};

const results = validateAllQuestions(rows, columnMapping);
const dataQuality = computeDataQualityMetrics(results as any);

const debugInput = results
  .filter((r: any) => r.detectedType === 'mcq' || r.detectedType === 'msq')
  .map((r: any) => ({
    rowId: r.rowId,
    type: r.detectedType?.toUpperCase() ?? 'UNKNOWN',
    // Use result.issues[] as single source of truth — not validationV2.issues
    issues: (r.issues || []).map((i: any) => ({ code: i.code, message: i.message })),
    normalizedAnswer: r.canonicalItem?.answerTokens?.join(', ') ?? '',
    normalizedOptions: r.canonicalItem?.choices?.map((c: any) => c.normalizedText) ?? [],
    options: r.canonicalItem?.choices?.map((c: any) => `${c.identifier}: ${c.text}`) ?? [],
  }));

const debug = debugValidateMcqMsqAnswers(debugInput);

const issueCounts: Record<string, number> = {};
results.forEach((r: any) => r.issues.forEach((i: any) => {
  issueCounts[i.code] = (issueCounts[i.code] || 0) + 1;
}));
const topIssues = Object.entries(issueCounts)
  .sort((a, b) => b[1] - a[1])
  .map(([code, count]) => ({ code, count }));

const output = {
  summary: {
    totalRows: results.length,
    valid: results.filter((r: any) => r.status === 'valid').length,
    caution: results.filter((r: any) => r.status === 'caution').length,
    rejected: results.filter((r: any) => r.status === 'rejected').length,
  },
  dataQuality,
  mcqMsqDebugReport: debug,
  topIssues,
  rows: results.map((r: any) => ({
    rowId: r.rowId,
    rowNumber: r.rowNumber,
    status: r.status,
    decision: r.decision,
    detectedType: r.detectedType,
    typeConfidence: r.typeConfidence,
    exportReady: r.exportReady,
    errorCount: r.errorCount,
    warningCount: r.warningCount,
    issues: r.issues.map((i: any) => ({
      code: i.code,
      category: i.category,
      field: i.field,
      message: i.message,
      severity: i.severity,
    })),
  })),
};

fs.writeFileSync('./validation-output.json', JSON.stringify(output, null, 2));
console.log('Done');
console.log(JSON.stringify({ summary: output.summary, dataQuality: output.dataQuality, mcqMsqDebugReport: output.mcqMsqDebugReport, topIssues: output.topIssues }, null, 2));
