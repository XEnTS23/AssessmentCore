/**
 * Diagnostic test: run test1.csv through the full dual-validation pipeline
 * and print the numbers that would appear on the validation page.
 *
 * Run with:  npx vitest run src/app/utils/__tests__/pipelineDiagnostic.test.ts
 */
import { describe, it } from 'vitest';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { runDualValidation } from '../dataCleaningPipeline';
import { detectQuestionColumns } from '../fileParser';

// ── Minimal CSV parser (no external dep needed) ──────────────────────────────
function parseCsv(content: string): Record<string, string>[] {
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(Boolean);
  if (lines.length === 0) return [];

  // Parse a single CSV line into fields
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
describe('Pipeline Diagnostic — test1.csv', () => {
  it('prints validation page numbers', () => {
    const csvPath = resolve('test1.csv');
    const csvContent = readFileSync(csvPath, 'utf-8');
    const rawRows = parseCsv(csvContent);

    // Simulate BatchCreator row key assignment
    const rows = rawRows.map((row, index) => ({
      ...row,
      id: row.id || `row_${index + 1}`,
      __rowKey: `${row.id || `row_${index + 1}`}#${index + 1}`,
      __sourceRowNumber: index + 1,
    }));

    // Auto-detect column mapping (same as BatchCreator)
    const columns = Object.keys(rows[0] || {}).filter(k => !k.startsWith('__'));
    const columnMapping = detectQuestionColumns(columns);

    // Run the dual validation pipeline (PASS 1 + PASS 2 + PASS 3)
    const result = runDualValidation(rows as any, columnMapping as any);
    const { metrics, pass2SafetyMetrics, rawResults, cleanResults, rowImprovements, pass3Result, pass3ExecutionResult } = result;

    // Count statuses
    const countStatuses = (map: Record<string, any>) => {
      let valid = 0, caution = 0, rejected = 0;
      Object.values(map).forEach(r => {
        if (r.status === 'valid') valid++;
        else if (r.status === 'caution') caution++;
        else rejected++;
      });
      return { valid, caution, rejected, total: Object.values(map).length };
    };

    const before = countStatuses(rawResults);
    const after  = countStatuses(cleanResults);

    const lines: string[] = [];
    const log = (s: string) => lines.push(s);

    const line = (label: string, valA: string | number, valB?: string | number) => {
      const a = String(valA).padEnd(14);
      const b = valB !== undefined ? String(valB) : '';
      log(`  ${label.padEnd(28)} ${a} ${b}`);
    };

    log('');
    log('==================================================');
    log('  VALIDATION PAGE -- NUMBERS (test1.csv)');
    log('==================================================');
    log('');
    log('  -- STATS CARDS ----------------------------------');
    log(`  ${''.padEnd(28)} ${'ORIGINAL'.padEnd(14)} AFTER CLEANING`);
    line('Total', before.total, after.total);
    line('Valid', before.valid, after.valid);
    line('Caution', before.caution, after.caution);
    line('Rejected', before.rejected, after.rejected);

    log('');
    log('  -- AUTOMATED CLEANING IMPACT --------------------');
    log(`  ${''.padEnd(28)} ${'ORIGINAL'.padEnd(14)} AFTER CLEANING`);
    line('Issues Before / After', metrics.totalIssuesBefore, metrics.totalIssuesAfter);
    line('Issues Resolved', '+' + metrics.issuesResolved);
    line('Issues Revealed', '-' + metrics.issuesRevealed);
    line('Rows Improved', metrics.rowsImproved);
    line('Rows Degraded', metrics.rowsDegraded);
    line('Rows Unmodified (already clean)', metrics.rowsUnmodified);
    const eff = metrics.cleaningEffectiveness;
    line('Effectiveness', eff !== null ? Math.round(eff * 100) + '%' : 'N/A');
    line('Field-level ops applied', metrics.cleanLogCount);

    log('');
    log('  -- PASS 2 SAFETY --------------------------------');
    line('Rows skipped (already valid)', pass2SafetyMetrics.rowsSkippedDueToSafety);
    line('Rows rolled back', pass2SafetyMetrics.rowsAttemptedButRolledBack);

    log('');
    log('  -- PER-ROW CHANGES ------------------------------');
    rowImprovements.forEach(r => {
      const id = r.rowKey.split('#')[0].padEnd(5);
      const arrow = r.improved ? 'IMPROVED ' : r.degraded ? 'DEGRADED ' : 'unchanged';
      log(`  Row ${id} ${r.statusBefore.padEnd(9)} ${arrow} -> ${r.statusAfter}`);
    });

    log('');
    log('  -- PASS 3: REMEDIATION SUGGESTIONS --------------');
    const p3 = pass3Result;
    line('Suggestions generated', p3.pass3Metrics.suggestionsGenerated);
    line('High-confidence suggestions', p3.pass3Metrics.highConfidenceSuggestions);
    line('Medium-confidence suggestions', p3.pass3Metrics.mediumConfidenceSuggestions);
    line('Rows with suggestions', (p3.pass3Metrics as any).rowsWithSuggestions);
    line('Suggestion coverage (%)', (p3.pass3Metrics as any).suggestionCoverage + '%');
    line('Rows skipped (already valid)', p3.pass3Metrics.skippedRows);
    log('');
    log('  Suggestions by type:');
    Object.entries(p3.pass3Metrics.suggestionsByType).forEach(([type, count]) => {
      log(`    ${type.padEnd(36)} ${count}`);
    });
    log('');
    log('  Per-row suggestions:');
    p3.suggestions.forEach(s => {
      const suggested = s.suggestedValue !== '' ? ` -> "${s.suggestedValue}"` : ' -> (blank)';
      log(`  Row ${String(s.rowIndex).padEnd(4)} [${s.confidence.padEnd(6)}] ${s.type.padEnd(36)} ${s.message.slice(0, 60)}${suggested}`);
    });

    log('');
    log('  -- PASS 3 EXECUTION (applied fixes) -------------');
    const p3e = pass3ExecutionResult.executionMetrics;
    line('Suggestions attempted', p3e.suggestionsAttempted);
    line('Suggestions applied', p3e.suggestionsApplied);
    line('  of which HIGH-confidence', p3e.highConfidenceApplied);
    line('Suggestions rolled back', p3e.suggestionsRolledBack);
    line('Suggestions skipped (MEDIUM / no-op)', p3e.suggestionsSkipped);
    line('Rows fixed by PASS 3', p3e.rowsFixedByPass3);
    line('Rejected before execution', p3e.rejectedBefore);
    line('Rejected after execution', p3e.rejectedAfter);
    log('');
    log('  Execution logs:');
    pass3ExecutionResult.executionLogs.forEach(l => {
      const status = l.applied ? 'APPLIED  ' : 'ROLLBACK ';
      log(`  Row ${String(l.rowIndex).padEnd(4)} [${status}] ${l.suggestionType.padEnd(36)} "${l.before}" -> "${l.after}"`);
    });

    log('==================================================');
    log('');

    const outPath = resolve('tmp_pipeline_results.txt');
    writeFileSync(outPath, lines.join('\n'), 'utf8');
  });
});
