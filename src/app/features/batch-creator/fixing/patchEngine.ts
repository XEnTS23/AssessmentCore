import { QuestionRow } from "../core/rowTypes";
import {
  PatchFailureReason,
  PatchIssueProfile,
  PatchResult,
  RowPatch,
  RowPatchChange,
} from "../core/fixTypes";
import { ValidationIssue } from "../core/issueTypes";
import {
  ValidationEngine,
  ValidationContext,
} from "../validation/validationEngine";

// ─── Path utilities ──────────────────────────────────────────────────

/**
 * Get a nested value from an object using a dot-path string.
 * Supports bracket notation for arrays, e.g. "options[0].text"
 */
function getByPath(obj: any, segments: (string | number)[]): unknown {
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
  if (!segments) throw new Error(`Invalid patch path: ${path}`);
  let current = obj;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    current = current[seg];
  }
  current[segments[segments.length - 1]] = value;
}

/**
 * Parse a dot-path like "normalizedQuestion.options[0].text"
 * into segments: ["normalizedQuestion", "options", 0, "text"]
 */
function parsePath(path: string): (string | number)[] | null {
  if (
    !path ||
    path.startsWith(".") ||
    path.endsWith(".") ||
    path.includes("..")
  )
    return null;
  const segments: (string | number)[] = [];
  const parts = path.split(".");
  for (const part of parts) {
    const bracketMatch = part.match(/^([A-Za-z_$][\w$]*)\[(\d+)\]$/);
    if (bracketMatch) {
      segments.push(bracketMatch[1]);
      segments.push(Number(bracketMatch[2]));
    } else if (/^[A-Za-z_$][\w$]*$/.test(part)) {
      segments.push(part);
    } else {
      return null;
    }
  }
  return segments;
}

const ALLOWED_PATCH_ROOTS = new Set([
  "normalizedQuestion",
  "metadata",
  "mediaReferences",
  "mathReferences",
  "scoringConfig",
  "timeLimitConfig",
]);

const UNSAFE_PATH_SEGMENTS = new Set(["__proto__", "prototype", "constructor"]);

function inspectPath(
  row: QuestionRow,
  path: string,
): {
  segments?: (string | number)[];
  failureReason?: PatchFailureReason;
} {
  const segments = parsePath(path);
  if (!segments) return { failureReason: "invalid_path" };
  if (
    segments.some(
      (segment) =>
        typeof segment === "string" && UNSAFE_PATH_SEGMENTS.has(segment),
    )
  ) {
    return { failureReason: "unsafe_path" };
  }
  if (
    typeof segments[0] !== "string" ||
    !ALLOWED_PATCH_ROOTS.has(segments[0])
  ) {
    return { failureReason: "unsafe_path" };
  }

  let parent: any = row;
  for (const segment of segments.slice(0, -1)) {
    if (parent === null || parent === undefined)
      return { failureReason: "missing_parent" };
    if (
      typeof segment === "number" &&
      (!Array.isArray(parent) || segment >= parent.length)
    ) {
      return { failureReason: "missing_parent" };
    }
    parent = parent[segment];
  }
  if (parent === null || parent === undefined)
    return { failureReason: "missing_parent" };

  const finalSegment = segments[segments.length - 1];
  if (
    typeof finalSegment === "number" &&
    (!Array.isArray(parent) || finalSegment >= parent.length)
  ) {
    return { failureReason: "missing_parent" };
  }

  return { segments };
}

function valuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (typeof left !== typeof right || left === null || right === null)
    return false;
  if (typeof left !== "object") return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (
      !Array.isArray(left) ||
      !Array.isArray(right) ||
      left.length !== right.length
    )
      return false;
    return left.every((value, index) => valuesEqual(value, right[index]));
  }
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord);
  const rightKeys = Object.keys(rightRecord);
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key) =>
        Object.prototype.hasOwnProperty.call(rightRecord, key) &&
        valuesEqual(leftRecord[key], rightRecord[key]),
    )
  );
}

function issueProfile(issues: ValidationIssue[]): PatchIssueProfile {
  return issues.reduce<PatchIssueProfile>(
    (profile, issue) => {
      if (issue.severity in profile) {
        profile[issue.severity as keyof PatchIssueProfile] += 1;
      }
      return profile;
    },
    { block: 0, review: 0, warning: 0, info: 0 },
  );
}

function profileRegressed(
  before: PatchIssueProfile,
  after: PatchIssueProfile,
): boolean {
  const severities: Array<keyof PatchIssueProfile> = [
    "block",
    "review",
    "warning",
    "info",
  ];
  for (const severity of severities) {
    if (after[severity] !== before[severity])
      return after[severity] > before[severity];
  }
  return false;
}

function rejectedResult(
  snapshot: QuestionRow,
  reason: PatchFailureReason,
  failurePath?: string,
): PatchResult {
  const profile = issueProfile(snapshot.issues);
  return {
    success: false,
    patchedRow: snapshot,
    previousSnapshot: snapshot,
    regressionDetected: reason === "validation_regression",
    issuesBefore: snapshot.issues.length,
    issuesAfter: snapshot.issues.length,
    failureReason: reason,
    failurePath,
    issueProfileBefore: profile,
    issueProfileAfter: profile,
  };
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
  const profileBefore = issueProfile(row.issues);

  if (patch.rowId !== row.id)
    return rejectedResult(previousSnapshot, "row_mismatch");
  if (!patch.changes.length)
    return rejectedResult(previousSnapshot, "empty_patch");

  const seenPaths = new Set<string>();
  const inspectedChanges: Array<{
    change: RowPatchChange;
    segments: (string | number)[];
  }> = [];
  for (const change of patch.changes) {
    if (seenPaths.has(change.path))
      return rejectedResult(previousSnapshot, "duplicate_path", change.path);
    seenPaths.add(change.path);

    const inspection = inspectPath(previousSnapshot, change.path);
    if (!inspection.segments) {
      return rejectedResult(
        previousSnapshot,
        inspection.failureReason || "invalid_path",
        change.path,
      );
    }
    const currentValue = getByPath(previousSnapshot, inspection.segments);
    if (!valuesEqual(currentValue, change.before)) {
      return rejectedResult(previousSnapshot, "stale_value", change.path);
    }
    inspectedChanges.push({ change, segments: inspection.segments });
  }

  const effectiveChanges = inspectedChanges.filter(
    ({ change, segments }) =>
      !valuesEqual(getByPath(previousSnapshot, segments), change.after),
  );
  if (!effectiveChanges.length)
    return rejectedResult(previousSnapshot, "no_change");

  // Deep-clone and apply changes
  const patched: QuestionRow = structuredClone(row);

  for (const { change } of effectiveChanges) {
    setByPath(patched, change.path, change.after);
  }

  // Add history entry
  patched.history = [
    ...patched.history,
    {
      timestamp: new Date().toISOString(),
      action: `Patch applied: ${effectiveChanges.map(({ change }) => change.path).join(", ")}`,
      previousState: {
        patchChanges: effectiveChanges.map(({ change }) => change),
      },
    },
  ];

  // Re-validate
  const candidateRows = context.allRows.some(
    (candidate) => candidate.id === patched.id,
  )
    ? context.allRows.map((candidate) =>
        candidate.id === patched.id ? patched : candidate,
      )
    : [...context.allRows, patched];
  const revalidated = engine.validateRow(patched, {
    ...context,
    allRows: candidateRows,
  });

  const issuesAfter = revalidated.issues.length;
  const profileAfter = issueProfile(revalidated.issues);
  const regressionDetected = profileRegressed(profileBefore, profileAfter);

  return {
    success: !regressionDetected,
    patchedRow: revalidated,
    previousSnapshot,
    regressionDetected,
    issuesBefore,
    issuesAfter,
    failureReason: regressionDetected ? "validation_regression" : undefined,
    issueProfileBefore: profileBefore,
    issueProfileAfter: profileAfter,
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

    if (!result.success) {
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
    changes: changes.map((c) => ({
      path: c.path,
      before: c.before,
      after: c.after,
    })),
  };
}
