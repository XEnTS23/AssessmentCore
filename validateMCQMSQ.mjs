#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Manual CSV parser
function parseCSV(content) {
  const lines = content.split('\n').filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });
    rows.push(row);
  }

  return rows;
}

function normalizeType(type) {
  const normalized = (type || '').trim().toLowerCase();
  if (normalized.includes('mcq') || normalized.includes('multiple choice')) return 'MCQ';
  if (normalized.includes('msq') || normalized.includes('multi')) return 'MSQ';
  if (normalized.includes('true') || normalized.includes('false') || normalized.includes('tf')) return 'TRUE_FALSE';
  if (normalized.includes('text') || normalized.includes('shortanswer')) return 'TEXT_ENTRY';
  if (normalized.includes('numeric')) return 'NUMERIC';
  if (normalized.includes('order')) return 'ORDER';
  return 'UNKNOWN';
}

function parseAnswer(answer) {
  if (!answer || !answer.trim()) return [];
  return answer
    .split('|')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function main() {
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

  // Import validation functions
  const { executeRules, defaultValidationRules } = await import('./src/app/utils/validationRuleEngine.js');

  // Validate each row
  const validationResults = [];

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
    const context = {
      rowId: row.id || 'unknown',
      type: canonicalType,
      questionText,
      optionCount: choices.length,
      choices,
      correctResponseIdentifiers: correctAnswers,
      userResponseIdentifiers: correctAnswers,
      mappingConfidence: 1.0,
      parsingConfidence: 1.0,
      traceMode: 'full',
      priorityEnforcement: 'warn',
    };

    // Execute validation
    try {
      const result = executeRules(context, defaultValidationRules);
      validationResults.push({
        rowId: row.id || 'unknown',
        type: canonicalType,
        result,
        raw: row,
      });
    } catch (error) {
      console.error(`Error validating row ${row.id}:`, error.message);
    }
  });

  // Summary stats
  const mcqRows = validationResults.filter((r) => r.type === 'MCQ');
  const msqRows = validationResults.filter((r) => r.type === 'MSQ');
  
  const mcqMismatches = mcqRows.filter((r) => r.result.status === 'invalid');
  const msqMismatches = msqRows.filter((r) => r.result.status === 'invalid');

  const allMismatches = validationResults.filter((v) =>
    v.result.issues.some((i) => i.code === 'ANSWER_NOT_IN_OPTIONS' || i.code === 'CORRECT_ANSWER_NOT_IN_OPTIONS')
  );

  // Collect all issues
  const allIssues = {};
  validationResults.forEach((v) => {
    v.result.issues.forEach((issue) => {
      allIssues[issue.code] = (allIssues[issue.code] || 0) + 1;
    });
  });

  const issuesList = Object.entries(allIssues)
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📊 VALIDATION SUMMARY\n');

  console.log(`Total MCQ rows:           ${mcqRows.length}`);
  console.log(`Total MSQ rows:           ${msqRows.length}`);
  console.log(`MCQ rows with mismatch:   ${mcqMismatches.length}`);
  console.log(`MSQ rows with mismatch:   ${msqMismatches.length}`);
  console.log(`ANSWER_NOT_IN_OPTIONS:    ${allMismatches.length}\n`);

  console.log('📈 TOP ISSUES:\n');
  issuesList.slice(0, 10).forEach((issue, idx) => {
    console.log(`${idx + 1}. ${issue.code}: ${issue.count} occurrences`);
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('❌ ANSWER MISMATCH EXAMPLES (up to 5):\n');

  // Show example mismatches
  const mismatches = allMismatches.slice(0, 5);

  mismatches.forEach((v, idx) => {
    console.log(`Example ${idx + 1}: Row ID = ${v.rowId} (${v.type})`);
    console.log(`  Question: "${v.raw.question_text}"`);
    console.log(`  Answer: "${v.raw.correct_answer}"`);
    const optionTexts = ['option_1', 'option_2', 'option_3', 'option_4', 'option_5']
      .map((col) => v.raw[col])
      .filter((opt) => opt && String(opt).trim().length > 0);
    console.log(`  Options: ${optionTexts.join(', ')}`);
    console.log(`  Issues:`);
    v.result.issues
      .filter((i) => i.code === 'ANSWER_NOT_IN_OPTIONS' || i.code === 'CORRECT_ANSWER_NOT_IN_OPTIONS')
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
