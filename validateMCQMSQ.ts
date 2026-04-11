import fs from 'fs';
import path from 'path';
import {
  executeRules,
  defaultValidationRules,
  debugValidateMcqMsqAnswers,
  type RuleContext,
} from './src/app/utils/validationRuleEngine.js';

interface CsvRow {
  id: string;
  question_text: string;
  question_type: string;
  option_1?: string;
  option_2?: string;
  option_3?: string;
  option_4?: string;
  option_5?: string;
  correct_answer?: string;
  [key: string]: unknown;
}

function parseCSV(content: string): CsvRow[] {
  const lines = content.split('\n').filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row: any = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });
    rows.push(row);
  }

  return rows;
}

function normalizeType(type: string): 'MCQ' | 'MSQ' | 'TRUE_FALSE' | 'TEXT_ENTRY' | 'NUMERIC' | 'ORDER' | 'UNKNOWN' {
  const normalized = (type || '').trim().toLowerCase();
  if (normalized.includes('mcq') || normalized.includes('multiple choice')) return 'MCQ';
  if (normalized.includes('msq') || normalized.includes('multi')) return 'MSQ';
  if (normalized.includes('true') || normalized.includes('false') || normalized.includes('tf')) return 'TRUE_FALSE';
  if (normalized.includes('text') || normalized.includes('shortanswer')) return 'TEXT_ENTRY';
  if (normalized.includes('numeric')) return 'NUMERIC';
  if (normalized.includes('order')) return 'ORDER';
  return 'UNKNOWN';
}

function parseAnswer(answer: string): string[] {
  if (!answer || !answer.trim()) return [];
  // Split on pipe for multiple answers (e.g., "A|B|C")
  return answer
    .split('|')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function main() {
  console.log('📋 MCQ/MSQ Answer Validation Report\n');

  // Read CSV file
  const csvPath = path.join(process.cwd(), 'validation-csv-test-1.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(csvContent);

  console.log(`Total rows in CSV: ${rows.length}\n`);

  // Filter to MCQ/MSQ only
  const mcqMsqRows = rows.filter((row) => {
    const normalized = normalizeType(row.question_type);
    return normalized === 'MCQ' || normalized === 'MSQ';
  });

  console.log(`MCQ/MSQ rows: ${mcqMsqRows.length}\n`);

  // Validate each row
  const validationResults: Array<{
    rowId: string;
    type: string;
    result: ValidationResultV2;
    raw: CsvRow;
  }> = [];

  mcqMsqRows.forEach((row) => {
    const canonicalType = normalizeType(row.question_type);
    const questionText = (row.question_text || '').trim();

    // Extract options
    const optionColumns = ['option_1', 'option_2', 'option_3', 'option_4', 'option_5'];
    const choices = optionColumns
      .map((col, idx) => ({
        identifier: String.fromCharCode(65 + idx), // A, B, C, D, E
        text: (row[col] || '').trim(),
      }))
      .filter((choice) => choice.text.length > 0);

    // Parse correct answers
    const correctAnswers = parseAnswer(row.correct_answer || '');

    // Create rule context
    const context: RuleContext = {
      rowId: row.id || 'unknown',
      type: canonicalType,
      questionText,
      optionCount: choices.length,
      choices,
      correctResponseIdentifiers: correctAnswers, // Note: these are text answers from CSV
      userResponseIdentifiers: correctAnswers,
      mappingConfidence: 1.0,
      parsingConfidence: 1.0,
      traceMode: 'full',
      priorityEnforcement: 'warn',
    };

    // Execute validation
    const result = executeRules(context, defaultValidationRules);
    validationResults.push({
      rowId: row.id || 'unknown',
      type: canonicalType,
      result,
      raw: row,
    });
  });

  // Generate debug report — use issues[] as single source of truth
  const debugReport = debugValidateMcqMsqAnswers(
    validationResults.map((v) => {
      const optionColumns = ['option_1', 'option_2', 'option_3', 'option_4', 'option_5'];
      const optTexts = optionColumns
        .map((col, idx) => ({ id: String.fromCharCode(65 + idx), text: (v.raw[col] || '').trim() }))
        .filter((o) => o.text.length > 0);
      return {
        rowId: v.rowId,
        type: v.type,
        issues: v.result.issues.map((i) => ({ code: i.code, message: i.message })),
        normalizedAnswer: (v.raw.correct_answer || '').trim(),
        normalizedOptions: optTexts.map((o) => o.text.toLowerCase()),
        options: optTexts.map((o) => `${o.id}: ${o.text}`),
      };
    })
  );

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📊 VALIDATION SUMMARY\n');

  console.log(`Total MCQ rows:           ${debugReport.totalMcqRows}`);
  console.log(`Total MSQ rows:           ${debugReport.totalMsqRows}`);
  console.log(`MCQ rows with mismatch:   ${debugReport.mcqRowsWithMismatch}`);
  console.log(`MSQ rows with mismatch:   ${debugReport.msqRowsWithMismatch}`);
  console.log(`ANSWER_NOT_IN_OPTIONS:    ${debugReport.answerNotInOptionsCount}\n`);

  // Show top issues
  const allIssues: { code: string; count: number }[] = [];
  validationResults.forEach((v) => {
    v.result.issues.forEach((issue) => {
      const existing = allIssues.find((i) => i.code === issue.code);
      if (existing) {
        existing.count++;
      } else {
        allIssues.push({ code: issue.code, count: 1 });
      }
    });
  });

  allIssues.sort((a, b) => b.count - a.count);

  console.log('📈 TOP ISSUES:\n');
  allIssues.slice(0, 10).forEach((issue, idx) => {
    console.log(`${idx + 1}. ${issue.code}: ${issue.count} occurrences`);
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('❌ ANSWER MISMATCH EXAMPLES (up to 5):\n');

  // Show example mismatches
  const mismatches = validationResults
    .filter((v) => v.result.status === 'invalid')
    .filter((v) => v.result.issues.some((i) => i.code === 'ANSWER_NOT_IN_OPTIONS'))
    .slice(0, 5);

  mismatches.forEach((v, idx) => {
    console.log(`Example ${idx + 1}: Row ID = ${v.rowId} (${v.type})`);
    console.log(`  Question: "${v.raw.question_text}"`);
    console.log(`  Answer: "${v.raw.correct_answer}"`);
    const optionTexts = (['option_1', 'option_2', 'option_3', 'option_4', 'option_5'] as const)
      .map((col) => v.raw[col])
      .filter((opt) => opt && String(opt).trim().length > 0);
    console.log(`  Options: ${optionTexts.join(', ')}`);
    console.log(`  Issues:`);
    v.result.issues
      .filter((i) => i.code === 'ANSWER_NOT_IN_OPTIONS')
      .forEach((issue) => {
        console.log(`    - ${issue.code}: ${issue.message}`);
      });
    console.log('');
  });

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('✅ Validation complete!\n');
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
