import { validateExportConfig } from "../configuration/exportConfigValidation";
import { ExportConfig } from "../core/exportTypes";
import { QuestionRow } from "../core/rowTypes";
import { checkExportReadiness } from "../rules/exportReadiness.rules";
import { getDefaultRuleRegistry } from "../validation/ruleRegistry";
import {
  ValidationContext,
  ValidationEngine,
} from "../validation/validationEngine";
import { BuildError, BuildWarning } from "../core/buildTypes";

export interface ExportReadinessSummary {
  total: number;
  valid: number;
  caution: number;
  needsReview: number;
  rejected: number;
  refreshed: number;
}

export interface ExportReadinessGateResult {
  isReady: boolean;
  rows: QuestionRow[];
  blockers: BuildError[];
  warnings: BuildWarning[];
  summary: ExportReadinessSummary;
}

const EMPTY_SUMMARY: ExportReadinessSummary = {
  total: 0,
  valid: 0,
  caution: 0,
  needsReview: 0,
  rejected: 0,
  refreshed: 0,
};

function issueSignature(row: QuestionRow): string {
  return JSON.stringify(
    row.issues
      .map((issue) => ({
        ruleId: issue.ruleId,
        severity: issue.severity,
        field: issue.field ?? "",
        message: issue.message,
      }))
      .sort((left, right) =>
        `${left.ruleId}|${left.severity}|${left.field}|${left.message}`.localeCompare(
          `${right.ruleId}|${right.severity}|${right.field}|${right.message}`,
        ),
      ),
  );
}

function isQuestionRow(value: unknown): value is QuestionRow {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<QuestionRow>;
  return (
    typeof row.id === "string" &&
    Number.isFinite(row.sourceRowNumber) &&
    !!row.rawRow &&
    typeof row.rawRow === "object" &&
    !!row.metadata &&
    typeof row.metadata === "object" &&
    Array.isArray(row.mediaReferences) &&
    Array.isArray(row.mathReferences) &&
    Array.isArray(row.history) &&
    Array.isArray(row.issues) &&
    !!row.scoringConfig &&
    typeof row.scoringConfig === "object" &&
    [
      "raw",
      "normalized",
      "rejected",
      "needs_review",
      "caution",
      "valid",
    ].includes(row.status ?? "")
  );
}

function dedupeWarnings(warnings: BuildWarning[]): BuildWarning[] {
  const seen = new Set<string>();
  return warnings.filter((warning) => {
    const key = `${warning.code}|${warning.rowId ?? ""}|${warning.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Final, authoritative validation boundary used immediately before artifacts
 * are built. Stored row statuses are treated as cache only: every row is
 * revalidated against the current batch and current export configuration.
 */
export function evaluateExportReadinessGate(
  inputRows: QuestionRow[],
  config: ExportConfig,
): ExportReadinessGateResult {
  if (!Array.isArray(inputRows) || inputRows.length === 0) {
    return {
      isReady: false,
      rows: [],
      blockers: [
        {
          code: "EMPTY_EXPORT_BATCH",
          message: "At least one validated question is required before export.",
        },
      ],
      warnings: [],
      summary: EMPTY_SUMMARY,
    };
  }

  const malformed = inputRows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => !isQuestionRow(row));

  if (malformed.length > 0) {
    return {
      isReady: false,
      rows: [],
      blockers: malformed.map(({ row, index }) => ({
        code: "MALFORMED_EXPORT_ROW",
        rowId:
          typeof (row as QuestionRow | undefined)?.id === "string"
            ? (row as QuestionRow).id
            : undefined,
        message: `Export row ${index + 1} is not a normalized QuestionRow and must pass through validation first.`,
      })),
      warnings: [],
      summary: { ...EMPTY_SUMMARY, total: inputRows.length },
    };
  }

  const configValidation = validateExportConfig(config);
  const blockers: BuildError[] = configValidation.errors.map((message) => ({
    code: "EXPORT_CONFIG_INVALID",
    message,
  }));
  const warnings: BuildWarning[] = configValidation.warnings.map((message) => ({
    code: "EXPORT_CONFIG_WARNING",
    message,
  }));

  let rows: QuestionRow[];
  try {
    const engine = new ValidationEngine(getDefaultRuleRegistry());
    const context: ValidationContext = {
      allRows: inputRows,
      columnMapping: {},
      exportConfig: config,
    };
    rows = engine.validateBatch(inputRows, context);
  } catch (error) {
    return {
      isReady: false,
      rows: [],
      blockers: [
        ...blockers,
        {
          code: "VALIDATION_GATE_EXCEPTION",
          message: `Final validation could not complete: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      warnings,
      summary: { ...EMPTY_SUMMARY, total: inputRows.length },
    };
  }

  let refreshed = 0;
  rows.forEach((row, index) => {
    const previous = inputRows[index];
    if (
      previous.status !== row.status ||
      issueSignature(previous) !== issueSignature(row)
    ) {
      refreshed += 1;
      warnings.push({
        code: "ROW_VALIDATION_REFRESHED",
        rowId: row.id,
        message: `Row ${row.sourceRowNumber} validation was refreshed before export (${previous.status} → ${row.status}).`,
      });
    }
  });

  const readiness = checkExportReadiness(config, rows);
  readiness.issues.forEach((issue) => {
    const target = issue.severity === "block" ? blockers : warnings;
    target.push({
      code:
        issue.severity === "block"
          ? "EXPORT_READINESS_BLOCKED"
          : "EXPORT_READINESS_WARNING",
      rowId: issue.rowId,
      message: issue.message,
    });
  });

  const summary: ExportReadinessSummary = {
    total: rows.length,
    valid: rows.filter((row) => row.status === "valid").length,
    caution: rows.filter((row) => row.status === "caution").length,
    needsReview: rows.filter((row) => row.status === "needs_review").length,
    rejected: rows.filter((row) => row.status === "rejected").length,
    refreshed,
  };

  return {
    isReady: blockers.length === 0,
    rows,
    blockers,
    warnings: dedupeWarnings(warnings),
    summary,
  };
}
