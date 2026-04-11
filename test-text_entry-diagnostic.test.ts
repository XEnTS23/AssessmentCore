/**
 * Diagnostic test for text_entry.csv duplicate detection
 * Identify where duplicates are being flagged incorrectly
 * 
 * Run with: npx vitest run test-text_entry-diagnostic.test.ts
 */
import { describe, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { validateAllQuestions } from './src/app/utils/questionValidator';
import { detectQuestionColumns } from './src/app/utils/fileParser';

// ── Minimal CSV parser ──────────────────────────────────────────────────────
function parseCsv(content: string): Record<string, string>[] {
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(Boolean);
  if (lines.length === 0) return [];

  const parseLine = (line: string): string[] => {
    const fields: string[] = [];
    let i = 0;
    while (i < line.length) {
      if (line[i] === '"') {
        i++;
        let val = '';
        while (i < line.length) {
          if (line[i] === '"' && line[i + 1] === '"') { val += '"'; i += 2; }
          else if (line[i] === '"') { i++; break; }
          else { val += line[i++]; }
        }
        fields.push(val);
        if (line[i] === ',') i++;
      } else {
        const end = line.indexOf(',', i);
        if (end === -1) { fields.push(line.slice(i)); break; }
        fields.push(line.slice(i, end));
        i = end + 1;
      }
    }
    return fields;
  };

  const headers = parseLine(lines[0]);
  return lines.slice(1).map((line) => {
    const vals = parseLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = vals[i] ?? ''; });
    return row;
  });
}

// ── Main diagnostic ──────────────────────────────────────────────────────────
describe('TEXT ENTRY DUPLICATE DETECTION DIAGNOSTIC', () => {
  it('analyzes test-text_entry.csv for duplicate issues', () => {
    const csvPath = resolve('test-text_entry.csv');
    const csvContent = readFileSync(csvPath, 'utf-8');
    const rawRows = parseCsv(csvContent);

    console.log('\n\n════════════════════════════════════════════════════════════');
    console.log('     TEXT ENTRY DUPLICATE DETECTION DIAGNOSTIC');
    console.log('════════════════════════════════════════════════════════════\n');
    console.log(`📄 Loaded ${rawRows.length} rows from test-text_entry.csv\n`);

    // Simulate BatchCreator row key assignment
    const rows = rawRows.map((row, index) => ({
      ...row,
      id: row.ID || `row_${index + 1}`,
      __rowKey: `${row.ID || `row_${index + 1}`}#${index + 1}`,
      __sourceRowNumber: index + 1,
    }));

    // Auto-detect column mapping
    const columns = Object.keys(rows[0] || {}).filter(k => !k.startsWith('__'));
    const columnMapping = detectQuestionColumns(columns);

    console.log('📋 Detected Column Mapping:');
    console.log(`   Question: ${columnMapping.questionCol}`);
    console.log(`   Answer: ${columnMapping.answerCol}`);
    console.log(`   Options: ${columnMapping.optionCols?.join(', ') || 'none'}`);
    console.log(`   Type: ${columnMapping.typeCol}`);
    console.log(`\n`);

    // Run validation on all rows
    const results = validateAllQuestions(rows as any, columnMapping as any);

    // Analyze for duplicates and issues
    const hasDuplicateIssues = results.filter(r =>
      r.issues?.some(i => i.code.startsWith('DUPLICATE'))
    );

    console.log('🔍 VALIDATION RESULTS:\n');
    console.log(`   Total rows: ${results.length}`);
    console.log(`   ✓ Valid: ${results.filter(r => r.status === 'valid').length}`);
    console.log(`   ⚠️  Caution: ${results.filter(r => r.status === 'caution').length}`);
    console.log(`   ❌ Rejected: ${results.filter(r => r.status === 'rejected').length}`);
    console.log(`\n`);

    if (hasDuplicateIssues.length > 0) {
      console.log(`⚠️  DUPLICATE FLAGGED: ${hasDuplicateIssues.length} rows\n`);
      
      hasDuplicateIssues.forEach((result) => {
        const duplicateIssues = result.issues?.filter(i => i.code.startsWith('DUPLICATE')) || [];
        console.log(`   Row ${result.rowNumber} (${result.rowId}):`);
        duplicateIssues.forEach(issue => {
          console.log(`     - ${issue.code}: ${issue.message}`);
        });
        const question = rawRows[result.rowNumber - 1];
        console.log(`       Q: "${question['Question Text']}"`);
        console.log(`       A: "${question['Answer']}"`);
        console.log(`\n`);
      });
    } else {
      console.log('✓ No duplicates detected\n');
    }

    // Show all validation issues by row
    console.log('\n📌 DETAILED ROW-BY-ROW RESULTS:\n');
    results.forEach((result, idx) => {
      const question = rawRows[idx];
      const status = result.status === 'valid' ? '✓' : result.status === 'caution' ? '⚠️' : '❌';
      
      console.log(`${status} Row ${result.rowNumber}: ${result.rowId}`);
      console.log(`   Q: "${question['Question Text']}"`);
      console.log(`   A: "${question['Answer']}"`);
      console.log(`   Status: ${result.status.toUpperCase()} | Decision: ${result.decision}`);
      
      if (result.issues && result.issues.length > 0) {
        console.log(`   Issues:`);
        result.issues.forEach(issue => {
          console.log(`     • ${issue.code}: ${issue.message} (${issue.severity})`);
        });
      }
      console.log('');
    });

    console.log('\n════════════════════════════════════════════════════════════\n');
  });
});
