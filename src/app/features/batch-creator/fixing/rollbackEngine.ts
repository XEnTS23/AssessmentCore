import { QuestionRow } from '../core/rowTypes';
import { ValidationEngine, ValidationContext } from '../validation/validationEngine';

// ─── Rollback Engine ─────────────────────────────────────────────────

/**
 * Rollback a row to a previous snapshot.
 *
 * 1. Restores the full row state from the snapshot.
 * 2. Re-validates to get fresh issues.
 * 3. Appends a rollback entry to the history.
 */
export function rollbackRow(
  snapshot: QuestionRow,
  engine: ValidationEngine,
  context: ValidationContext,
): QuestionRow {
  // Deep-clone the snapshot so we don't mutate the original
  const restored: QuestionRow = structuredClone(snapshot);

  // Append rollback history
  restored.history = [
    ...restored.history,
    {
      timestamp: new Date().toISOString(),
      action: 'Rollback: restored to previous snapshot',
    },
  ];

  // Re-validate from the restored state
  const revalidated = engine.validateRow(restored, context);

  return revalidated;
}

/**
 * Rollback a batch of rows using their previous snapshots.
 * The `snapshots` map should be keyed by row ID.
 */
export function rollbackBatch(
  currentRows: QuestionRow[],
  snapshots: Map<string, QuestionRow>,
  engine: ValidationEngine,
  context: ValidationContext,
): QuestionRow[] {
  return currentRows.map(row => {
    const snapshot = snapshots.get(row.id);
    if (snapshot) {
      return rollbackRow(snapshot, engine, context);
    }
    // No snapshot = no patch was applied, return as-is
    return row;
  });
}

/**
 * Create a snapshot map from a list of rows.
 * Call this BEFORE applying patches to save rollback points.
 */
export function createSnapshotMap(rows: QuestionRow[]): Map<string, QuestionRow> {
  const map = new Map<string, QuestionRow>();
  for (const row of rows) {
    map.set(row.id, structuredClone(row));
  }
  return map;
}
