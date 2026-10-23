import { CleaningLog } from "../core/cleaningTypes";
import { FixSuggestion, PatchFailureReason } from "../core/fixTypes";
import { QuestionRow } from "../core/rowTypes";

export type AutofixAuditStatus = "applied" | "skipped" | "rolled_back";
export type AutofixAuditSource = "cleaning" | "suggestion";
export type AutofixAuditMode = "automatic" | "manual";

export interface AutofixAuditChange {
  path: string;
  before: unknown;
  after: unknown;
}

export interface AutofixAuditEntry {
  id: string;
  rowId: string;
  sourceRowNumber: number;
  source: AutofixAuditSource;
  mode: AutofixAuditMode;
  ruleId: string;
  label: string;
  confidence: "high" | "medium" | "low";
  status: AutofixAuditStatus;
  changes: AutofixAuditChange[];
  failureReason?: PatchFailureReason | "detection_only";
  beforeValidation: {
    status: QuestionRow["status"];
    issueCount: number;
  };
  afterValidation: {
    status: QuestionRow["status"];
    issueCount: number;
  };
  createdAt: string;
  rolledBackAt?: string;
  beforeSnapshot?: QuestionRow;
  afterSnapshot?: QuestionRow;
}

interface SuggestionApplicationResult {
  row: QuestionRow;
  success: boolean;
  failureReason?: PatchFailureReason;
}

const MUTABLE_ROW_FIELDS: Array<keyof QuestionRow> = [
  "normalizedQuestion",
  "metadata",
  "mediaReferences",
  "mathReferences",
  "scoringConfig",
  "timeLimitConfig",
];

function validationSummary(row: QuestionRow) {
  return { status: row.status, issueCount: row.issues.length };
}

function mutableRevision(row: QuestionRow): Record<string, unknown> {
  return Object.fromEntries(
    MUTABLE_ROW_FIELDS.map((field) => [field, row[field]]),
  );
}

export function createCleaningAuditEntries(
  beforeRows: QuestionRow[],
  afterRows: QuestionRow[],
  logs: CleaningLog[],
  now = new Date().toISOString(),
): AutofixAuditEntry[] {
  const logsByRow = new Map<string, CleaningLog[]>();
  for (const log of logs) {
    const current = logsByRow.get(log.rowId) || [];
    current.push(log);
    logsByRow.set(log.rowId, current);
  }

  const beforeById = new Map(beforeRows.map((row) => [row.id, row]));
  const afterById = new Map(afterRows.map((row) => [row.id, row]));
  const entries: AutofixAuditEntry[] = [];

  for (const [rowId, rowLogs] of logsByRow) {
    const before = beforeById.get(rowId);
    const after = afterById.get(rowId);
    if (!before || !after) continue;

    const effectiveLogs = rowLogs.filter((log) => log.before !== log.after);
    const applied = effectiveLogs.length > 0;
    entries.push({
      id: crypto.randomUUID(),
      rowId,
      sourceRowNumber: before.sourceRowNumber,
      source: "cleaning",
      mode: "automatic",
      ruleId: "DETERMINISTIC_CLEANING",
      label: applied
        ? `${effectiveLogs.length} deterministic cleaning change${effectiveLogs.length === 1 ? "" : "s"}`
        : "Cleaning pipeline detection only",
      confidence: rowLogs.every((log) => log.confidence === "high")
        ? "high"
        : rowLogs.some((log) => log.confidence === "low")
          ? "low"
          : "medium",
      status: applied ? "applied" : "skipped",
      changes: rowLogs.map((log) => ({
        path: log.field,
        before: log.before,
        after: log.after,
      })),
      failureReason: applied ? undefined : "detection_only",
      beforeValidation: validationSummary(before),
      afterValidation: validationSummary(after),
      createdAt: now,
      beforeSnapshot: applied ? structuredClone(before) : undefined,
      afterSnapshot: applied ? structuredClone(after) : undefined,
    });
  }

  return entries;
}

export function createSuggestionAuditEntry(
  before: QuestionRow,
  suggestion: FixSuggestion,
  result: SuggestionApplicationResult,
  mode: AutofixAuditMode,
  now = new Date().toISOString(),
): AutofixAuditEntry {
  return {
    id: crypto.randomUUID(),
    rowId: before.id,
    sourceRowNumber: before.sourceRowNumber,
    source: "suggestion",
    mode,
    ruleId: suggestion.ruleId,
    label: suggestion.label,
    confidence: suggestion.confidence,
    status: result.success ? "applied" : "skipped",
    changes: suggestion.patch.changes.map((change) => ({
      path: change.path,
      before: structuredClone(change.before),
      after: structuredClone(change.after),
    })),
    failureReason: result.success ? undefined : result.failureReason,
    beforeValidation: validationSummary(before),
    afterValidation: validationSummary(result.row),
    createdAt: now,
    beforeSnapshot: result.success ? structuredClone(before) : undefined,
    afterSnapshot: result.success ? structuredClone(result.row) : undefined,
  };
}

export function isAutofixRollbackSafe(
  entry: AutofixAuditEntry,
  currentRow: QuestionRow | undefined,
): boolean {
  if (
    entry.status !== "applied" ||
    !entry.beforeSnapshot ||
    !entry.afterSnapshot ||
    !currentRow
  ) {
    return false;
  }
  if (currentRow.id !== entry.rowId) return false;
  return (
    JSON.stringify(mutableRevision(currentRow)) ===
    JSON.stringify(mutableRevision(entry.afterSnapshot))
  );
}

export function describeAutofixFailure(
  reason: AutofixAuditEntry["failureReason"],
): string {
  switch (reason) {
    case "row_mismatch":
      return "The suggestion targeted a different question revision.";
    case "empty_patch":
      return "The suggestion contained no changes.";
    case "invalid_path":
      return "The suggestion referenced an invalid field path.";
    case "unsafe_path":
      return "The suggestion attempted to change a protected field.";
    case "duplicate_path":
      return "The suggestion changed the same field more than once.";
    case "missing_parent":
      return "The suggestion referenced content that no longer exists.";
    case "stale_value":
      return "The question changed after the suggestion was generated.";
    case "no_change":
      return "The suggestion would not change the question.";
    case "validation_regression":
      return "Validation became more severe after the proposed change.";
    case "target_issue_not_resolved":
      return "The proposed change did not resolve its target rule.";
    case "detection_only":
      return "The pipeline detected a value but intentionally made no change.";
    default:
      return "The suggestion was not applied.";
  }
}

export function formatAutofixValue(value: unknown, maxLength = 180): string {
  let formatted: string;
  if (value === undefined) formatted = "Not set";
  else if (value === null) formatted = "null";
  else if (typeof value === "string") formatted = value || "(empty)";
  else {
    try {
      formatted = JSON.stringify(value);
    } catch {
      formatted = String(value);
    }
  }
  return formatted.length > maxLength
    ? `${formatted.slice(0, maxLength - 1)}…`
    : formatted;
}
