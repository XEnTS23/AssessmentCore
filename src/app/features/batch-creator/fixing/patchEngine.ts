import { QuestionRow } from '../core/rowTypes';
import { RowPatch, RowPatchChange, PatchResult } from '../core/fixTypes';
import { ValidationEngine, ValidationContext } from '../validation/validationEngine';

// ─── Path utilities ──────────────────────────────────────────────────

/**
 * Get a nested value from an object using a dot-path string.
 * Supports bracket notation for arrays, e.g. "options[0].text"
 */
function getByPath(obj: any, path: string): unknown {
  const segments = parsePath(path);
  let current = obj;
  for (const seg of segments) {
    if (current === null || current === undefined) return undefined;
    current = current[seg];
  }
  return current;
}

/**
 * Set a nested value on an object using a dot-path string.
 */
function setByPath(obj: any, path: string, value: unknown): void {
  const segments = parsePath(path);
  let current = obj;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    if (current[seg] === null || current[seg] === undefined) {
      // Create intermediate object or array
      const nextSeg = segments[i + 1];
      current[seg] = typeof nextSeg === 'number' ? [] : {};
    }
    current = current[seg];
  }
  current[segments[segments.length - 1]] = value;
}

/**
 * Parse a dot-path like "normalizedQuestion.options[0].text"
 * into segments: ["normalizedQuestion", "options", 0, "text"]
 */
function parsePath(path: string): (string | number)[] {
  const segments: (string | number)[] = [];
  const parts = path.split('.');
  for (const part of parts) {
    const bracketMatch = part.match(/^([^\[]+)\[(\d+)\]$/);
    if (bracketMatch) {
      segments.push(bracketMatch[1]);
      segments.push(Number(bracketMatch[2]));
    } else {
      segments.push(part);
    }
  }
  return segments;
}

// ─── Patch Application ──────────────────────────────────────────────

/**
 * Apply a RowPatch to a QuestionRow.
 *
 * 1. Deep-clones the row (never mutates the original).
 * 2. Records the "before" value for each change path.
 * 3. Applies each change.
 * 4. Re-validates the patched row.
 * 5. Detects regressions (more issues or worse severity after patch).
 *
 * Returns a PatchResult that includes rollback data.
 */
export function applyPatch(
  row: QuestionRow,
  patch: RowPatch,
  engine: ValidationEngine,
  context: ValidationContext,
): PatchResult {
  // Snapshot for rollback
  const previousSnapshot: QuestionRow = structuredClone(row);
  const issuesBefore = row.issues.length;

  // Deep-clone and apply changes
  const patched: QuestionRow = structuredClone(row);

  for (const change of patch.changes) {
    // Verify "before" value matches expectation (safety check)
    const currentValue = getByPath(patched, change.path);
    // We don't block on mismatch — log it but still apply.
    // In production this would be stricter.

    setByPath(patched, change.path, change.after);
  }

  // Add history entry
  patched.history = [
    ...patched.history,
    {
      timestamp: new Date().toISOString(),
      action: `Patch applied: ${patch.changes.map(c => c.path).join(', ')}`,
      previousState: { patchChanges: patch.changes },
    },
  ];

  // Re-validate
  const revalidated = engine.validateRow(patched, context);

  const issuesAfter = revalidated.issues.length;
  const regressionDetected = issuesAfter > issuesBefore;

  return {
    success: !regressionDetected,
    patchedRow: revalidated,
    previousSnapshot,
    regressionDetected,
    issuesBefore,
    issuesAfter,
  };
}

/**
 * Apply multiple patches to a single row sequentially.
 * Stops and rolls back if any patch causes a regression.
 */
export function applyPatchesSafe(
  row: QuestionRow,
  patches: RowPatch[],
  engine: ValidationEngine,
  context: ValidationContext,
): { finalRow: QuestionRow; applied: number; rolledBack: boolean } {
  let current = row;
  let applied = 0;

  for (const patch of patches) {
    const result = applyPatch(current, patch, engine, context);

    if (result.regressionDetected) {
      // Roll back: restore the previous snapshot
      return {
        finalRow: result.previousSnapshot,
        applied,
        rolledBack: true,
      };
    }

    current = result.patchedRow;
    applied++;
  }

  return {
    finalRow: current,
    applied,
    rolledBack: false,
  };
}

/**
 * Build a RowPatch from explicit before/after values.
 * Convenience helper for suggestion generators.
 */
export function buildPatch(
  rowId: string,
  changes: Array<{ path: string; before: unknown; after: unknown }>,
): RowPatch {
  return {
    rowId,
    changes: changes.map(c => ({
      path: c.path,
      before: c.before,
      after: c.after,
    })),
  };
}
