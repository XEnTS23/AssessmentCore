import { QuestionRow } from '../core/rowTypes';
import { CleaningResult, CleaningLog, CleaningMetrics } from '../core/cleaningTypes';
import { pass1CharacterCleaning, Pass1Options } from './pass1CharacterCleaning';
import { pass2StructuralCleaning } from './pass2StructuralCleaning';

// ─── Cleaning Engine ─────────────────────────────────────────────────

export interface CleaningEngineOptions {
  /** Pass 1 options (character cleaning) */
  pass1?: Pass1Options;
  /** If true, skip Pass 2 (structural cleaning) */
  skipPass2?: boolean;
}

/**
 * Orchestrates the deterministic cleaning pipeline:
 *   Pass 1 → Character-level cleaning (BOM, invisible chars, smart quotes, etc.)
 *   Pass 2 → Structural cleaning (option labels, answer alignment, delimiters)
 *
 * Each pass is logged, reversible, and never destroys original raw data
 * (which stays on `row.rawRow`).
 */
export function runCleaningPipeline(
  rows: QuestionRow[],
  options: CleaningEngineOptions = {},
): CleaningResult {
  const allLogs: CleaningLog[] = [];
  let pass1Changes = 0;
  let pass2Changes = 0;
  const actionBreakdown: Record<string, number> = {};

  const cleanedRows = rows.map(row => {
    // ── Pass 1: Character cleaning ─────────────────────────────────
    const p1 = pass1CharacterCleaning(row, options.pass1);
    pass1Changes += p1.logs.length;
    allLogs.push(...p1.logs);
    countActions(p1.logs, actionBreakdown);

    let current = p1.row;

    // ── Pass 2: Structural cleaning ────────────────────────────────
    if (!options.skipPass2) {
      const p2 = pass2StructuralCleaning(current);
      pass2Changes += p2.logs.length;
      allLogs.push(...p2.logs);
      countActions(p2.logs, actionBreakdown);
      current = p2.row;
    }

    return current;
  });

  // Compute distinct fields cleaned
  const fieldSet = new Set(allLogs.map(l => `${l.rowId}::${l.field}`));

  const metrics: CleaningMetrics = {
    totalRowsProcessed: rows.length,
    totalFieldsCleaned: fieldSet.size,
    pass1Changes,
    pass2Changes,
    actionBreakdown,
  };

  return {
    rows: cleanedRows,
    logs: allLogs,
    metrics,
  };
}

// ─── Internal ────────────────────────────────────────────────────────

function countActions(logs: CleaningLog[], breakdown: Record<string, number>) {
  for (const log of logs) {
    breakdown[log.action] = (breakdown[log.action] || 0) + 1;
  }
}
