/**
 * dataCleaningPipeline.ts
 *
 * Deterministic, scope-controlled field cleaning pipeline.
 * PASS 1: character-level cleaning (trim, invisible chars, delimiter norm, null coercion, etc.)
 * PASS 2: structural cleaning & alignment (column fallback, option dedup, answer alignment, etc.)
 *
 * Runs: raw validation → PASS 1 → PASS 2 → re-validation → improvement metrics.
 *
 * Rules for this module:
 * - No AI, no fuzzy matching, no randomness.
 * - PASS 2 runs AFTER PASS 1 and BEFORE the clean validation pass.
 * - All operations are deterministic and safe — no value is guessed or inferred.
 * - Cleaning is applied ONLY to mapped / known-alias columns.
 * - Internal metadata fields (__*) are NEVER touched.
 * - cleaningEffectiveness is null when there were no issues before cleaning.
 */

import {
  validateAllQuestions,
  type QuestionData,
  type ValidationResult,
  type ValidationProfile,
} from './questionValidator.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export const CleanType = {
  // PASS 1 — character-level
  INVISIBLE_CHAR_REMOVAL:              'INVISIBLE_CHAR_REMOVAL',
  LINE_BREAK_NORMALIZATION:            'LINE_BREAK_NORMALIZATION',
  TRIM:                                'TRIM',
  WHITESPACE_NORMALIZATION:            'WHITESPACE_NORMALIZATION',
  DELIMITER_NORMALIZATION:             'DELIMITER_NORMALIZATION',
  QUOTE_NORMALIZATION:                 'QUOTE_NORMALIZATION',
  NULL_COERCION:                       'NULL_COERCION',
  // PASS 2 — structural
  COLUMN_FALLBACK:                     'COLUMN_FALLBACK',
  STRUCTURE_FIX:                       'STRUCTURE_FIX',
  OPTION_CLEANUP:                      'OPTION_CLEANUP',
  ANSWER_ALIGNMENT:                    'ANSWER_ALIGNMENT',
  /** Emitted when a rule matched but safety check blocked the change. */
  SKIPPED_UNSAFE_TRANSFORMATION:       'SKIPPED_UNSAFE_TRANSFORMATION',
} as const;

export type CleanType = typeof CleanType[keyof typeof CleanType];
export type Pass1CleanType = typeof CleanType.INVISIBLE_CHAR_REMOVAL
  | typeof CleanType.LINE_BREAK_NORMALIZATION | typeof CleanType.TRIM
  | typeof CleanType.WHITESPACE_NORMALIZATION | typeof CleanType.DELIMITER_NORMALIZATION
  | typeof CleanType.QUOTE_NORMALIZATION | typeof CleanType.NULL_COERCION;
export type Pass2CleanType = typeof CleanType.COLUMN_FALLBACK
  | typeof CleanType.STRUCTURE_FIX | typeof CleanType.OPTION_CLEANUP
  | typeof CleanType.ANSWER_ALIGNMENT | typeof CleanType.SKIPPED_UNSAFE_TRANSFORMATION;

/** Strict execution order — do not reorder. */
const CLEANING_PIPELINE_ORDER: CleanType[] = [
  CleanType.INVISIBLE_CHAR_REMOVAL,
  CleanType.LINE_BREAK_NORMALIZATION,
  CleanType.TRIM,
  CleanType.WHITESPACE_NORMALIZATION,
  CleanType.DELIMITER_NORMALIZATION,
  CleanType.QUOTE_NORMALIZATION,
  CleanType.NULL_COERCION,
];

export interface CleanLog {
  rowKey:    string;
  rowIndex:  number;
  field:     string;
  cleanType: CleanType;
  before:    string;
  after:     string;
  pass:      'PASS_1' | 'PASS_2';
}

export interface RowImprovementRecord {
  rowKey:       string;
  statusBefore: ValidationResult['status'];
  statusAfter:  ValidationResult['status'];
  improved:     boolean;
  unchanged:    boolean;
  degraded:     boolean;
}

export interface ImprovementMetrics {
  totalRows:              number;
  totalIssuesBefore:      number;
  totalIssuesAfter:       number;
  issuesResolved:         number;
  issuesRevealed:         number;
  rowsImproved:           number;
  rowsUnchanged:          number;
  rowsDegraded:           number;
  /** Rows where no CleanLog was emitted (already clean). */
  rowsUnmodified:         number;
  percentRowsImproved:    number;
  /**
   * issuesResolved / totalIssuesBefore, rounded to 2 decimal places.
   * null when totalIssuesBefore === 0 (metric is not meaningful).
   */
  cleaningEffectiveness:  number | null;
  issueReductionByType:   Record<string, number>;
  cleanLogCount:          number;
}

/** Safety metrics specific to PASS 2. */
export interface Pass2SafetyMetrics {
  /** Rows skipped entirely because raw validation status was already 'valid'. */
  rowsSkippedDueToSafety:     number;
  /** Rows where PASS 2 tried changes but single-row re-validation showed degradation → rolled back. */
  rowsAttemptedButRolledBack: number;
}

export interface DualValidationResult {
  rawResults:           Record<string, ValidationResult>;
  /** Rows after PASS 1 (character cleaning) + PASS 2 (structural cleaning). */
  cleanedRows:          QuestionData[];
  /** All logs from both PASS 1 and PASS 2, in order. */
  cleanLogs:            CleanLog[];
  pass2Logs:            CleanLog[];
  cleanResults:         Record<string, ValidationResult>;
  rowImprovements:      RowImprovementRecord[];
  metrics:              ImprovementMetrics;
  pass2SafetyMetrics:   Pass2SafetyMetrics;
  /** PASS 3 — suggestion-only remediation for remaining issues. */
  pass3Result:          Pass3RemediationResult;
  /** PASS 3 Execution — applied fixes with rollback safety. */
  pass3ExecutionResult: Pass3ExecutionResult;
}

// ---------------------------------------------------------------------------
// Column-mapping helpers
// ---------------------------------------------------------------------------

/** Known alias patterns that may represent option/answer columns even if not
 * explicitly in the columnMapping object itself.  These follow common CSV
 * export conventions.  Any field matching these patterns is eligible for
 * cleaning but NOT for scoped rules (whitespace/delimiter/null) unless it is
 * also the mapped answerCol / orderCol / optionCols.
 */
const KNOWN_ALIAS_PATTERNS: RegExp[] = [
  /^option[_\s-]?[a-z0-9]+$/i,   // option_a, optionA, option1, option_two
  /^choice[_\s-]?[a-z0-9]+$/i,   // choice_a, choiceA, choice1, choiceTwo
  /^answer([_\s-]?[a-z0-9]+)?$/i, // answer, answer_key, answerKey, answerCol
  /^opt[_\s-]?[a-z0-9]+$/i,      // opt_a, optA, opt1
];


/** Collect every column name that appears as a *value* in the mapping object. */
function getMappedColumnNames(columnMapping: Record<string, unknown>): Set<string> {
  const names = new Set<string>();
  for (const value of Object.values(columnMapping)) {
    if (typeof value === 'string' && value.trim()) {
      names.add(value.trim());
    } else if (Array.isArray(value)) {
      for (const v of value) {
        if (typeof v === 'string' && v.trim()) names.add(v.trim());
      }
    }
  }
  return names;
}

/**
 * Determine if a field is eligible for ANY cleaning.
 *
 * Allows:
 * - Fields that appear as values in columnMapping.
 * - Fields that match known alias patterns.
 * Blocks:
 * - Fields starting with "__".
 * - Everything else.
 */
export function shouldCleanField(fieldName: string, columnMapping: Record<string, unknown>): boolean {
  if (fieldName.startsWith('__')) return false;
  const mapped = getMappedColumnNames(columnMapping);
  if (mapped.has(fieldName)) return true;
  return KNOWN_ALIAS_PATTERNS.some((re) => re.test(fieldName));
}

/** Return the set of columns that are answer/order/option (scoped rules). */
function getScopedColumns(columnMapping: Record<string, unknown>): Set<string> {
  const scoped = new Set<string>();
  const cm = columnMapping as Record<string, unknown>;

  const answerCol = cm.answerCol;
  if (typeof answerCol === 'string' && answerCol.trim()) scoped.add(answerCol.trim());

  const orderCol = cm.orderCol;
  if (typeof orderCol === 'string' && orderCol.trim()) scoped.add(orderCol.trim());

  const optionCols = cm.optionCols;
  if (Array.isArray(optionCols)) {
    for (const col of optionCols) {
      if (typeof col === 'string' && col.trim()) scoped.add(col.trim());
    }
  }

  return scoped;
}

/** Return the idCol column name (if any). */
function getIdCol(columnMapping: Record<string, unknown>): string | null {
  const cm = columnMapping as Record<string, unknown>;
  return typeof cm.idCol === 'string' && cm.idCol.trim() ? cm.idCol.trim() : null;
}

/** Normalized persistent row key, matching questionValidator rowKey scheme. */
function getRowKey(row: QuestionData, index: number): string {
  // Take existing __rowKey when present (ensured by BatchCreator.ensureInternalRowKeys).
  if (typeof row.__rowKey === 'string' && row.__rowKey.trim()) {
    return row.__rowKey.trim();
  }

  // Fall back to explicit id-derived row key.
  const sourceId = row.id != null && String(row.id).trim() ? String(row.id).trim() : `row_${index + 1}`;
  return `${sourceId}#${index + 1}`;
}

// ---------------------------------------------------------------------------
// Individual rule appliers
// Each returns the modified string, or the original string if unchanged.
// A log entry is emitted only when the value actually changes.
// ---------------------------------------------------------------------------

const INVISIBLE_CHARS_RE = /[\u200B\u200C\u200D\uFEFF\u00AD]/g;
const SMART_QUOTE_RE = /[\u201C\u201D]/g;
const SMART_APOS_RE = /[\u2018\u2019]/g;

const NULL_COERCION_VALUES = new Set([
  'null', 'undefined', 'na', 'n/a', '-', '',
]);

/** Normalise delimiter spacing: "A , B" → "A,B", "A | B" → "A|B". */
function normalizeDelimiters(value: string, isMsqOrOrder: boolean, isAnswerOrOrderField: boolean): string {
  // Space-padded comma/pipe: remove the surrounding spaces.
  let ans = value
    .replace(/\s*,\s*/g, ',')
    .replace(/\s*\|\s*/g, '|');

  if (isMsqOrOrder && isAnswerOrOrderField) {
    ans = ans.replace(/,/g, '|'); // convert commas to pipes
    ans = ans.replace(/\|{2,}/g, '|'); // collapse double pipes
    ans = ans.replace(/^\|+/, ''); // strip leading
    ans = ans.replace(/\|+$/, ''); // strip trailing
  }
  return ans;
}

function applyRule(
  value: string,
  rule: CleanType,
  isScoped: boolean,
  isIdField: boolean,
  isMsqOrOrder: boolean,
  isAnswerOrOrderField: boolean
): string {
  switch (rule) {
    case CleanType.INVISIBLE_CHAR_REMOVAL:
      return value.replace(INVISIBLE_CHARS_RE, '');

    case CleanType.LINE_BREAK_NORMALIZATION:
      return value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    case CleanType.TRIM:
      return value.trim();

    case CleanType.WHITESPACE_NORMALIZATION:
      // Only for answer/option/order fields (scoped). Never for stems or IDs.
      if (!isScoped || isIdField) return value;
      return value.replace(/[ \t\u00A0]+/g, ' ');

    case CleanType.DELIMITER_NORMALIZATION:
      // Only for answer/option/order fields (scoped).
      if (!isScoped || isIdField) return value;
      return normalizeDelimiters(value, isMsqOrOrder, isAnswerOrOrderField);

    case CleanType.QUOTE_NORMALIZATION:
      if (isIdField) return value; // preserve IDs as-is except trim
      return value
        .replace(SMART_QUOTE_RE, '"')
        .replace(SMART_APOS_RE, "'");

    case CleanType.NULL_COERCION:
      // Only for answer/option/order fields (scoped). Never for stems/IDs/metadata.
      if (!isScoped || isIdField) return value;
      // Checked after all prior transforms (especially trim).
      if (NULL_COERCION_VALUES.has(value.toLowerCase())) return '\x00NULL\x00';
      return value;

    default:
      return value;
  }
}

// ---------------------------------------------------------------------------
// Row cleaning
// ---------------------------------------------------------------------------

function toStableString(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

/** Convert the sentinel back to actual null. */
const NULL_SENTINEL = '\x00NULL\x00';

/**
 * Clean a single row.
 * Returns `cleanedRow` where coerced-null fields hold actual `null`,
 * and `logs` of every change that was made.
 */
export function cleanRow(
  row: QuestionData,
  rowIndex: number,
  rowKey: string,
  columnMapping: Record<string, unknown>,
  rawResult?: ValidationResult
): { cleanedRow: QuestionData; logs: CleanLog[] } {
  const logs: CleanLog[] = [];
  const cleanedRow: Record<string, unknown> = { ...row };

  const scopedCols = getScopedColumns(columnMapping);
  const idCol = getIdCol(columnMapping);
  const answerCol = typeof columnMapping.answerCol === 'string' ? columnMapping.answerCol.trim() : null;
  const orderCol = typeof columnMapping.orderCol === 'string' ? columnMapping.orderCol.trim() : null;

  // Use the raw baseline result to safely determine if this row needs MSQ delimiter rules
  const detectedType = rawResult?.detectedType || String(row.type || '').toLowerCase();
  const isMsqOrOrder = detectedType === 'msq' || detectedType === 'multi_select' || detectedType === 'order';

  for (const fieldName of Object.keys(row)) {
    if (!shouldCleanField(fieldName, columnMapping)) continue;

    const rawValue = row[fieldName];
    if (rawValue === null || rawValue === undefined) continue;
    // Only clean string values; other types (numbers, booleans) are preserved.
    if (typeof rawValue !== 'string') continue;

    const isScoped   = scopedCols.has(fieldName);
    const isIdField  = idCol === fieldName;
    const isAnswerOrOrderField = fieldName === answerCol || fieldName === orderCol;

    let current = rawValue;

    for (const rule of CLEANING_PIPELINE_ORDER) {
      const next = applyRule(current, rule, isScoped, isIdField, isMsqOrOrder, isAnswerOrOrderField);
      if (next !== current) {
        const actualBefore = current === NULL_SENTINEL ? 'null' : current;
        const actualAfter  = next   === NULL_SENTINEL ? 'null' : next;
        logs.push({
          rowKey,
          rowIndex,
          field:     fieldName,
          cleanType: rule,
          before:    actualBefore,
          after:     actualAfter,
          pass:      'PASS_1',
        });
        current = next;
      }
    }

    // Resolve the sentinel to actual null if NULL_COERCION fired.
    cleanedRow[fieldName] = current === NULL_SENTINEL ? null : current;
  }

  return { cleanedRow: cleanedRow as QuestionData, logs };
}

/**
 * Clean a batch of rows.
 * Returns cleaned rows and flat log array.
 */
export function cleanRows(
  rows: QuestionData[],
  columnMapping: Record<string, unknown>,
  rawResults?: Record<string, ValidationResult>
): { cleanedRows: QuestionData[]; logs: CleanLog[] } {
  const allLogs: CleanLog[] = [];
  const cleanedRows: QuestionData[] = [];

  rows.forEach((row, index) => {
    // Derive a stable row key the same way questionValidator does.
    const rowKey = getRowKey(row, index);

    const rawResult = rawResults?.[rowKey] ?? (typeof row.__rowKey === 'string' ? rawResults?.[row.__rowKey] : undefined);
    const { cleanedRow, logs } = cleanRow(row, index + 1, rowKey, columnMapping, rawResult);
    
    cleanedRows.push(cleanedRow);
    allLogs.push(...logs);
  });

  return { cleanedRows, logs: allLogs };
}

// ---------------------------------------------------------------------------
// Metrics computation
// ---------------------------------------------------------------------------

function statusRank(status: ValidationResult['status']): number {
  if (status === 'valid')    return 2;
  if (status === 'caution')  return 1;
  return 0; // rejected
}

function buildResultsMap(results: ValidationResult[]): Record<string, ValidationResult> {
  const map: Record<string, ValidationResult> = {};
  for (const r of results) {
    map[r.rowKey] = r;
  }
  return map;
}

/** Count total issues across all results. */
function totalIssueCount(results: ValidationResult[]): number {
  return results.reduce((sum, r) => sum + (r.issues?.length ?? 0), 0);
}

/** Count per-code issues across all results. */
function issueCountByCode(results: ValidationResult[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const r of results) {
    for (const issue of r.issues ?? []) {
      counts[issue.code] = (counts[issue.code] ?? 0) + 1;
    }
  }
  return counts;
}

/**
 * Compute improvement metrics from raw and clean result sets.
 */
export function computeImprovementMetrics(
  rawResults:  ValidationResult[],
  cleanResults: ValidationResult[],
  cleanLogs:   CleanLog[],
): ImprovementMetrics {
  const rawMap   = buildResultsMap(rawResults);
  const cleanMap = buildResultsMap(cleanResults);

  const totalRows = rawResults.length;
  const totalIssuesBefore = totalIssueCount(rawResults);
  const totalIssuesAfter  = totalIssueCount(cleanResults);

  // Per-code reduction
  const beforeByCode = issueCountByCode(rawResults);
  const afterByCode  = issueCountByCode(cleanResults);
  const issueReductionByType: Record<string, number> = {};
  for (const code of Object.keys(beforeByCode)) {
    const reduction = (beforeByCode[code] ?? 0) - (afterByCode[code] ?? 0);
    if (reduction !== 0) issueReductionByType[code] = reduction;
  }

  // Row-level improvement tracking
  const rowImprovements: RowImprovementRecord[] = [];
  let issuesResolved = 0;
  let issuesRevealed = 0;
  let rowsImproved  = 0;
  let rowsUnchanged = 0;
  let rowsDegraded  = 0;

  for (const rawResult of rawResults) {
    const { rowKey } = rawResult;
    const cleanResult = cleanMap[rowKey];
    if (!cleanResult) continue;

    const before = rawResult.status;
    const after  = cleanResult.status;
    const rankBefore = statusRank(before);
    const rankAfter  = statusRank(after);

    const improved  = rankAfter > rankBefore;
    const degraded  = rankAfter < rankBefore;
    const unchanged = !improved && !degraded;

    const countBefore = (rawResult.issues || []).length;
    const countAfter  = (cleanResult.issues || []).length;

    if (countAfter < countBefore) {
      issuesResolved += (countBefore - countAfter);
    } else if (countAfter > countBefore && !degraded) {
      issuesRevealed += (countAfter - countBefore);
    }

    rowImprovements.push({ rowKey, statusBefore: before, statusAfter: after, improved, unchanged, degraded });
    if (improved)  rowsImproved  += 1;
    else if (degraded) rowsDegraded += 1;
    else rowsUnchanged += 1;
  }

  // Rows that received no clean log at all
  const modifiedRowKeys = new Set(cleanLogs.map((l) => l.rowKey));
  const rowsUnmodified = rawResults.filter((r) => !modifiedRowKeys.has(r.rowKey)).length;

  const percentRowsImproved =
    totalRows > 0 ? Math.round((rowsImproved / totalRows) * 1000) / 10 : 0;

  const cleaningEffectiveness =
    totalIssuesBefore === 0
      ? null
      : Math.round((issuesResolved / totalIssuesBefore) * 100) / 100;

  return {
    totalRows,
    totalIssuesBefore,
    totalIssuesAfter,
    issuesResolved,
    issuesRevealed,
    rowsImproved,
    rowsUnchanged,
    rowsDegraded,
    rowsUnmodified,
    percentRowsImproved,
    cleaningEffectiveness,
    issueReductionByType,
    cleanLogCount: cleanLogs.length,
  };
}

// ---------------------------------------------------------------------------
// PASS 2: Structural cleaning & alignment
// ---------------------------------------------------------------------------

/**
 * Tokenise an order / delimiter-separated string into non-empty items.
 * Respects commas, pipes, semicolons, and newlines.
 */
function tokenizeOrderString(value: string): string[] {
  return value
    .split(/[,|;\n]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/** Resolve columnMapping key helpers. */
function cm(columnMapping: Record<string, unknown>, key: string): string | null {
  const v = (columnMapping as Record<string, unknown>)[key];
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}
function cmArr(columnMapping: Record<string, unknown>, key: string): string[] {
  const v = (columnMapping as Record<string, unknown>)[key];
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((x) => x.trim());
}

/**
 * Return true if a string value looks like a valid delimiter-separated list
 * (at least 2 tokens, each non-empty, each under 200 chars).
 */
function looksLikeDelimitedList(value: string): boolean {
  const tokens = tokenizeOrderString(value);
  return tokens.length >= 2 && tokens.every((t) => t.length > 0 && t.length < 200);
}

/** normalise a string for case-insensitive comparison (similar to questionValidator). */
function normalizeForMatch(value: string): string {
  return value
    .replace(/[\u200B\u200C\u200D\uFEFF\u00AD]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * PASS 2 — Structural Cleaning & Alignment.
 *
 * Safety model:
 * - Rows already 'valid' in raw results are NEVER touched (FIX 1).
 * - After applying all structural rules to a row, we re-validate it once.
 * If the new status is worse than the raw status → ALL changes for that
 * row are rolled back and a SKIPPED_UNSAFE_TRANSFORMATION log is emitted (FIX 4).
 * - Only exact, deterministic, single-step fixes are applied (FIX 3, 6).
 *
 * @param rawResults  Optional map of raw validation results keyed by rowKey.
 * When supplied, valid rows are skipped and rollback is enabled.
 */
export function applyPass2StructuralCleaning(
  rows: QuestionData[],
  columnMapping: Record<string, unknown>,
  rawResults?: Record<string, ValidationResult>,
): { updatedRows: QuestionData[]; pass2Logs: CleanLog[]; pass2SafetyMetrics: Pass2SafetyMetrics } {
  const allLogs: CleanLog[] = [];
  const updatedRows: QuestionData[] = [];
  const safetyMetrics: Pass2SafetyMetrics = {
    rowsSkippedDueToSafety:     0,
    rowsAttemptedButRolledBack: 0,
  };

  // Mapping keys resolved once for the whole batch
  const answerColName   = cm(columnMapping, 'answerCol');
  const orderColName    = cm(columnMapping, 'orderCol');
  const questionColName = cm(columnMapping, 'questionCol');
  const optionColNames  = cmArr(columnMapping, 'optionCols');
  const allMappedCols   = new Set<string>([...getMappedColumnNames(columnMapping)]);

  rows.forEach((row, index) => {
    // Derive a stable lookup key (mirrors what validateAllQuestions produces).
    // Prefer __rowKey directly (set by ensureInternalRowKeys in BatchCreator),
    // then fall back to id#index+1.
    const rowKey = getRowKey(row, index);
    const rowIndex = index + 1;

    // ── FIX 1: Skip rows that are already valid ──────────────────────────────
    // Look up by computed key OR by __rowKey directly (validator may use either).
    const rawResult: ValidationResult | undefined =
      rawResults
        ? (rawResults[rowKey] ?? (typeof row.__rowKey === 'string' ? rawResults[row.__rowKey] : undefined))
        : undefined;

    if (rawResult?.status === 'valid') {
      safetyMetrics.rowsSkippedDueToSafety++;
      updatedRows.push(row);
      return; // never touch valid rows
    }

    // Work on a mutable copy of the row
    const candidate: Record<string, unknown> = { ...row };
    const candidateLogs: CleanLog[] = [];

    const emit = (field: string, cleanType: CleanType, before: string, after: string) => {
      candidateLogs.push({ rowKey, rowIndex, field, cleanType, before, after, pass: 'PASS_2' });
    };

    // ── RULE 1: Column fallback (CONSERVATIVE) ────────────────────────────────
    // Only fires when: primary col is null/empty AND a sibling mapped col
    // clearly carries delimiter-separated data (≥2 tokens, no ambiguity).

    if (orderColName) {
      const orderVal = candidate[orderColName];
      const isEmpty = orderVal === null || orderVal === undefined ||
                      (typeof orderVal === 'string' && orderVal.trim() === '');
      if (isEmpty) {
        for (const col of allMappedCols) {
          if (col === orderColName || col === answerColName || col === questionColName) continue;
          const v = candidate[col];
          if (typeof v !== 'string') continue;
          if (looksLikeDelimitedList(v)) {
            emit(orderColName, CleanType.COLUMN_FALLBACK, '', v);
            candidate[orderColName] = v;
            break;
          }
        }
      }
    }

    // Answer fallback: only if answer is empty AND a short, non-stem sibling exists.
    if (answerColName) {
      const answerVal = candidate[answerColName];
      const isEmpty = answerVal === null || answerVal === undefined ||
                      (typeof answerVal === 'string' && answerVal.trim() === '');
      if (isEmpty) {
        const skipCols = new Set<string>([
          answerColName, questionColName ?? '', orderColName ?? '', ...optionColNames,
        ]);
        for (const col of allMappedCols) {
          if (skipCols.has(col)) continue;
          const v = candidate[col];
          if (typeof v !== 'string' || v.trim() === '') continue;
          if (v.trim().length <= 100) {
            emit(answerColName, CleanType.COLUMN_FALLBACK, '', v.trim());
            candidate[answerColName] = v.trim();
            break;
          }
        }
      }
    }

    // ── RULE 2: Order structure normalisation ─────────────────────────────────
    // Rebuild delimiter-separated order string into canonical comma form.
    // Only fires when token count is consistent (≥2 and no empty tokens).

    if (orderColName) {
      const orderVal = candidate[orderColName];
      if (typeof orderVal === 'string' && orderVal.trim().length > 0) {
        const tokens = tokenizeOrderString(orderVal);
        const rebuilt = tokens.join(',');
        if (rebuilt !== orderVal && tokens.length >= 2) {
          emit(orderColName, CleanType.STRUCTURE_FIX, orderVal, rebuilt);
          candidate[orderColName] = rebuilt;
        }
      }
    }

    // ── RULE 3: Option cleanup (CONSERVATIVE) ────────────────────────────────
    // Remove empty options and EXACT case-insensitive duplicates.
    // Additional guard: if the current answer identifier still resolves to
    // a non-null option slot after compaction, proceed; otherwise skip.

    if (optionColNames.length > 0) {
      const originalValues: Array<string | null> = optionColNames.map((col) => {
        const v = candidate[col];
        if (v === null || v === undefined) return null;
        return typeof v === 'string' ? v : String(v);
      });

      const seen = new Set<string>();
      const compacted: Array<string | null> = [];
      for (const val of originalValues) {
        if (val === null || val.trim() === '') continue;
        const norm = normalizeForMatch(val);
        if (seen.has(norm)) continue;
        seen.add(norm);
        compacted.push(val);
      }

      // Answer-slot safety: if answer is a single letter identifier (A/B/C…),
      // verify the corresponding slot in the compacted list is still non-null.
      let answerSlotSafe = true;
      if (answerColName) {
        const answerVal = candidate[answerColName];
        if (typeof answerVal === 'string' && /^[A-Za-z]$/.test(answerVal.trim())) {
          const slotIdx = answerVal.trim().toUpperCase().charCodeAt(0) - 65;
          answerSlotSafe = slotIdx < compacted.length && compacted[slotIdx] !== null;
        }
      }

      if (answerSlotSafe) {
        optionColNames.forEach((col, idx) => {
          const newVal = idx < compacted.length ? compacted[idx] : null;
          const oldVal = originalValues[idx];
          const oldStr = oldVal ?? 'null';
          const newStr = newVal ?? 'null';
          if (newStr !== oldStr) {
            emit(col, CleanType.OPTION_CLEANUP, oldStr, newStr);
            candidate[col] = newVal;
          }
        });
      }
    }

    // ── RULE 4: Answer-option alignment (CONSERVATIVE) ───────────────────────
    // Only when: answer text == option text (exact case-insensitive).
    // Do NOT apply when answer is already a single-letter identifier.

    if (answerColName && optionColNames.length > 0) {
      const answerVal = candidate[answerColName];
      if (typeof answerVal === 'string' && answerVal.trim().length > 0) {
        const answerNorm = normalizeForMatch(answerVal);
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const optionTexts = optionColNames
          .map((col, idx) => {
            const v = candidate[col];
            if (typeof v !== 'string' || v.trim() === '') return null;
            return { label: letters[idx] ?? String(idx + 1), norm: normalizeForMatch(v) };
          })
          .filter((x): x is { label: string; norm: string } => x !== null);

        const alreadyLabel = /^[A-Za-z]$/.test(answerVal.trim()) &&
          optionColNames.length > (answerVal.trim().toUpperCase().charCodeAt(0) - 65);
        const matchedOption = optionTexts.find((o) => o.norm === answerNorm);

        if (!alreadyLabel && matchedOption) {
          emit(answerColName, CleanType.ANSWER_ALIGNMENT, answerVal, matchedOption.label);
          candidate[answerColName] = matchedOption.label;
        }
      }
    }

    // ── FIX 4: Per-row rollback ───────────────────────────────────────────────
    // If any change was made, validate the candidate row in isolation.
    // If validation status regresses → discard ALL changes for this row.

    if (candidateLogs.length > 0) {
      const [candidateResult] = validateAllQuestions(
        [candidate as QuestionData],
        columnMapping as any,
      );
      const newRank = statusRank(candidateResult?.status ?? 'rejected');
      const oldRank = statusRank(rawResult?.status ?? 'rejected');

      if (newRank < oldRank) {
        // Rollback: discard all candidate changes
        safetyMetrics.rowsAttemptedButRolledBack++;
        allLogs.push({
          rowKey, rowIndex,
          field:     '__row__',
          cleanType: CleanType.SKIPPED_UNSAFE_TRANSFORMATION,
          before:    rawResult?.status ?? 'unknown',
          after:     candidateResult?.status ?? 'unknown',
          pass:      'PASS_2',
        });
        updatedRows.push(row); // original row, not candidate
        return;
      }
    }

    // Accept changes (or pass through unchanged row)
    allLogs.push(...candidateLogs);
    updatedRows.push(candidate as QuestionData);
  });

  return { updatedRows, pass2Logs: allLogs, pass2SafetyMetrics: safetyMetrics };
}


// ---------------------------------------------------------------------------
// PASS 3: Suggestion-Based Remediation
// ---------------------------------------------------------------------------

export type RemediationType =
  | 'MISSING_ANSWER_SINGLE_OPTION'
  | 'MISSING_ANSWER_MULTIPLE_OPTIONS'
  | 'PLACEHOLDER_ANSWER'
  | 'ORDER_MISMATCH'
  | 'CASE_ALIGNMENT'
  | 'FUZZY_MATCH'
  | 'ANSWER_NOT_IN_OPTIONS'
  | 'MANUAL_EDIT';

export type RemediationConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface RemediationSuggestion {
  rowKey:         string;
  rowIndex:       number;
  field:          string;
  type:           RemediationType;
  message:        string;
  suggestedValue: string;
  confidence:     RemediationConfidence;
}

export interface Pass3Metrics {
  suggestionsGenerated:        number;
  highConfidenceSuggestions:   number;
  mediumConfidenceSuggestions: number;
  rowsPotentiallyFixable:      number;
  /** Alias for rowsPotentiallyFixable — rows that received at least one suggestion. */
  rowsWithSuggestions:         number;
  /** Percentage of non-valid rows that received at least one suggestion (0–100). */
  suggestionCoverage:          number;
  skippedRows:                 number;
  suggestionsByType:           Record<string, number>;
}

export interface Pass3RemediationResult {
  /** Same rows as input — PASS 3 is suggestion-only, no mutations. */
  updatedRows:  QuestionData[];
  suggestions:  RemediationSuggestion[];
  pass3Metrics: Pass3Metrics;
}

export interface Pass3ExecutionLog {
  rowKey:         string;
  rowIndex:       number;
  field:          string;
  suggestionType: RemediationType;
  before:         string;
  after:          string;
  /** true when the change was accepted (validation did not regress). */
  applied:        boolean;
  /** true when the change was reverted after single-row re-validation. */
  rolledBack:     boolean;
}

export interface Pass3ExecutionMetrics {
  suggestionsAttempted:    number;
  suggestionsApplied:      number;
  /** Of those applied, how many were HIGH confidence (should equal suggestionsApplied since only HIGH is executed). */
  highConfidenceApplied:   number;
  suggestionsRolledBack:   number;
  /** Suggestions skipped: non-actionable type, MEDIUM confidence, or no suggestedValue. */
  suggestionsSkipped:      number;
  rowsFixedByPass3:        number;
  rejectedBefore:          number;
  rejectedAfter:           number;
}

export interface Pass3ExecutionResult {
  /** Rows after PASS 3 execution (may be identical to pass2Rows if no fixes applied). */
  executedRows:     QuestionData[];
  executionLogs:    Pass3ExecutionLog[];
  /** Validation results after executing PASS 3 suggestions. */
  executionResults: Record<string, ValidationResult>;
  executionMetrics: Pass3ExecutionMetrics;
}

/**
 * Placeholder tokens that were null-coerced by PASS 1 and should trigger a
 * PLACEHOLDER_ANSWER suggestion (detected via cleanLogs, not live row values).
 * Does NOT include '' (empty string) — that is a MISSING_ANSWER case.
 */
const PLACEHOLDER_NULL_COERCION_TOKENS = new Set([
  'null', 'undefined', 'na', 'n/a',
]);

/**
 * Dice coefficient over character trigrams (base similarity).
 * Returns 0–1 (1 = identical strings).
 */
function trigramSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  const buildTrigrams = (s: string): Map<string, number> => {
    const map = new Map<string, number>();
    const padded = ` ${s} `;
    for (let i = 0; i < padded.length - 2; i++) {
      const tri = padded.slice(i, i + 3);
      map.set(tri, (map.get(tri) ?? 0) + 1);
    }
    return map;
  };

  const aMap = buildTrigrams(a);
  const bMap = buildTrigrams(b);

  let intersection = 0;
  let aTotal = 0;
  let bTotal = 0;

  for (const [tri, cnt] of aMap) {
    aTotal += cnt;
    if (bMap.has(tri)) intersection += Math.min(cnt, bMap.get(tri)!);
  }
  for (const [, cnt] of bMap) bTotal += cnt;

  return (2 * intersection) / (aTotal + bTotal);
}

/**
 * Combined fuzzy similarity: trigram Dice coefficient + word-containment bonus.
 *
 * The word-containment bonus (+0.15) fires when any content word (>2 chars)
 * from one string appears verbatim in the other.  This catches near-matches
 * like "paris city" → "Paris" (trigram ≈ 0.67, bonus → 0.82) that pure
 * trigram similarity would miss.
 *
 * Result is capped at 1.0.
 */
function computeFuzzySimilarity(answerNorm: string, optionNorm: string): number {
  const base = trigramSimilarity(answerNorm, optionNorm);

  const answerWords = answerNorm.split(/\s+/).filter((w) => w.length > 2);
  const optionWords = optionNorm.split(/\s+/).filter((w) => w.length > 2);

  const hasWordOverlap =
    answerWords.length > 0 && optionWords.length > 0 &&
    (answerWords.some((w) => optionWords.includes(w)) ||
     optionWords.some((w) => answerWords.includes(w)));

  return Math.min(1.0, base + (hasWordOverlap ? 0.15 : 0));
}

/**
 * PASS 3 — Suggestion-Based Remediation.
 *
 * Analyses rows that still have validation issues after PASS 1 + PASS 2 and
 * generates human-readable correction suggestions.  Does NOT mutate any row.
 *
 * Safety model:
 * - Valid rows are always skipped.
 * - At most ONE suggestion is emitted per row (highest-priority rule wins).
 * - Fuzzy matching requires BOTH a similarity threshold (>0.70) AND a
 * clear gap over the second-best match (>0.20) to prevent ambiguous picks.
 * - MEDIUM suggestions are informational only — never auto-applied.
 * - HIGH suggestions represent unambiguous, safe fixes (future auto-apply).
 *
 * Rules (evaluated in priority order, first match wins):
 * 1. MISSING_ANSWER_SINGLE_OPTION    — answer null + exactly 1 option → HIGH
 * 2. PLACEHOLDER_ANSWER              — answer was null-coerced from a known
 * placeholder token (via cleanLogs) → MEDIUM
 * 3. MISSING_ANSWER_MULTIPLE_OPTIONS — answer null + 2+ options → MEDIUM
 * 4. ORDER_MISMATCH                  — ORDER type with structural issues → MEDIUM
 * (exits early; option-based rules don't apply)
 * 5. CASE_ALIGNMENT                  — answer matches one option after
 * normalisation, unambiguous → HIGH
 * 6. FUZZY_MATCH                     — combined similarity >0.70 AND gap
 * over second-best >0.20:
 * score >0.80 → HIGH (auto-applicable)
 * score 0.70–0.80 → MEDIUM (informational)
 * 7. ANSWER_NOT_IN_OPTIONS           — answer present but matches nothing;
 * fallback when no other rule fired → MEDIUM
 *
 * @param cleanLogs  Optional PASS 1 + PASS 2 logs.  Used to detect rows where
 * a placeholder token was null-coerced so the original value is recoverable.
 */
export function applyPass3Remediation(
  rows:              QuestionData[],
  columnMapping:     Record<string, unknown>,
  validationResults: Record<string, ValidationResult>,
  cleanLogs?:        CleanLog[],
): Pass3RemediationResult {
  const suggestions: RemediationSuggestion[] = [];
  const rowsWithSuggestion = new Set<string>();

  const answerColName  = cm(columnMapping, 'answerCol');
  const optionColNames = cmArr(columnMapping, 'optionCols');
  const LETTERS        = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  let skippedRows = 0;

  // ── Pre-build: placeholder coercion lookup from PASS 1 logs ──────────────
  // Key: `${rowIndex}:${fieldName}` → original pre-coercion value (e.g. "N/A").
  // Only populated when cleanLogs are provided and the original token was a
  // recognised placeholder (not just an empty string).
  const placeholderCoercions = new Map<string, string>();
  if (cleanLogs && answerColName) {
    for (const log of cleanLogs) {
      if (
        log.cleanType === CleanType.NULL_COERCION &&
        log.field === answerColName &&
        PLACEHOLDER_NULL_COERCION_TOKENS.has(log.before.toLowerCase().trim())
      ) {
        placeholderCoercions.set(`${log.rowIndex}:${log.field}`, log.before);
      }
    }
  }

  rows.forEach((row, index) => {
    const rowKey  = getRowKey(row, index);
    const rowIndex = index + 1;

    // Resolve result — try computed key first, then __rowKey directly.
    const result =
      validationResults[rowKey] ??
      (typeof row.__rowKey === 'string' ? validationResults[row.__rowKey] : undefined);

    if (!result || result.status === 'valid') {
      skippedRows++;
      return;
    }

    if (!answerColName) return;

    const answerRaw = row[answerColName];
    const answerStr =
      answerRaw === null || answerRaw === undefined ? null : String(answerRaw).trim();
    const answerIsEmpty = answerStr === null || answerStr === '';

    // Collect non-null, non-empty option texts with letter labels.
    const validOptions: Array<{ label: string; text: string; norm: string }> = [];
    for (let i = 0; i < optionColNames.length; i++) {
      const val = row[optionColNames[i]];
      if (val === null || val === undefined) continue;
      const text = String(val).trim();
      if (text === '') continue;
      validOptions.push({
        label: LETTERS[i] ?? String(i + 1),
        text,
        norm: normalizeForMatch(text),
      });
    }

    // ── RULE 1: Missing Answer — exactly one option (HIGH) ─────────────────
    if (answerIsEmpty && validOptions.length === 1) {
      suggestions.push({
        rowKey, rowIndex, field: answerColName,
        type:           'MISSING_ANSWER_SINGLE_OPTION',
        message:        `Answer is empty but only one option exists ("${validOptions[0].text}"). This is likely the correct answer.`,
        suggestedValue: validOptions[0].label,
        confidence:     'HIGH',
      });
      rowsWithSuggestion.add(rowKey);
      return;
    }

    // ── RULE 2: Placeholder Answer — detected via PASS 1 null-coercion ─────
    // Removed. Validation already flags this.

    // ── RULE 3: Missing Answer — multiple options ─────────────────
    // Removed. Validation already flags this.

    // ── RULE 4: ORDER_MISMATCH ───────────────────────────────────────
    // Removed. Validation already flags this.
    const ORDER_ISSUE_CODES = new Set([
      'INVALID_ORDER_ITEMS',
      'INVALID_ORDER_ANSWER',
      'ORDER_SEQUENCE_INCOMPLETE',
      'MISSING_ORDER_ITEMS',
    ]);
    const orderIssues = (result.issues ?? []).filter(
      (i) => ORDER_ISSUE_CODES.has((i as any).code as string),
    );
    if (orderIssues.length > 0) {
      return; // option-based rules are not applicable to ORDER type rows
    }

    // Rules 5, 6 & 7 require a non-empty answer and at least one option.
    if (!answerStr || validOptions.length === 0) return;

    const answerNorm = normalizeForMatch(answerStr);

    // Skip rows where the answer is already a valid single-letter label.
    const isAlreadyLabel =
      /^[A-Za-z]$/.test(answerStr) &&
      validOptions.some((o) => o.label === answerStr.toUpperCase());

    if (!isAlreadyLabel) {
      // ── RULE 5: Case Alignment (HIGH) ─────────────────────────────────────
      // Fires when exactly one option normalises to the same text as the answer.
      const caseMatches = validOptions.filter((o) => o.norm === answerNorm);
      if (caseMatches.length === 1 && answerStr !== caseMatches[0].label) {
        suggestions.push({
          rowKey, rowIndex, field: answerColName,
          type:           'CASE_ALIGNMENT',
          message:        `Answer "${answerStr}" matches option ${caseMatches[0].label} ("${caseMatches[0].text}") after case normalisation.`,
          suggestedValue: caseMatches[0].label,
          confidence:     'HIGH',
        });
        rowsWithSuggestion.add(rowKey);
        return;
      }

      // ── RULE 6: Fuzzy Match ────────────────────────────────────────────────
      // Entry threshold: combined similarity > 0.70 AND gap > 0.20.
      // Combined score = trigram Dice + word-containment bonus (see computeFuzzySimilarity).
      //
      // Confidence bands:
      //   HIGH   — score > 0.75 AND gap > 0.25  (auto-applicable)
      //   MEDIUM — all other passing cases       (informational only)
      //
      // The HIGH band requires a stricter gap (0.25) to prevent ambiguous
      // near-ties even when the raw score is above 0.75.
      const scored = validOptions
        .map((o) => ({ ...o, score: computeFuzzySimilarity(answerNorm, o.norm) }))
        .sort((a, b) => b.score - a.score);

      const best       = scored[0];
      const secondBest = scored[1];
      const gap        = secondBest !== undefined ? (best?.score ?? 0) - secondBest.score : Infinity;

      if (best && best.score > 0.7 && gap > 0.2) {
        const fuzzyConfidence: RemediationConfidence =
          (best.score > 0.75 && gap > 0.25) ? 'HIGH' : 'MEDIUM';
        suggestions.push({
          rowKey, rowIndex, field: answerColName,
          type:       'FUZZY_MATCH',
          message:    `Answer "${answerStr}" closely matches option ${best.label} ("${best.text}") with ${Math.round(best.score * 100)}% similarity. Possible typo or near-match.`,
          suggestedValue: best.label,
          confidence: fuzzyConfidence,
        });
        rowsWithSuggestion.add(rowKey);
        return;
      }

      // ── RULE 7: ANSWER_NOT_IN_OPTIONS (Removed) ──────
      // This rule previously added a suggestion when the answer was not in options,
      // but since it has no automated fix and the row is already flagged by validation,
      // it was removed to avoid cluttering the UI with unactionable suggestions.

    }
  });

  // ── Aggregate metrics ─────────────────────────────────────────────────────
  const suggestionsByType: Record<string, number> = {};
  let highConfidenceSuggestions   = 0;
  let mediumConfidenceSuggestions = 0;
  for (const s of suggestions) {
    suggestionsByType[s.type] = (suggestionsByType[s.type] ?? 0) + 1;
    if (s.confidence === 'HIGH')   highConfidenceSuggestions++;
    if (s.confidence === 'MEDIUM') mediumConfidenceSuggestions++;
  }

  // suggestionCoverage = % of non-valid rows that received a suggestion.
  const totalNonValidRows = Object.values(validationResults).filter(
    (r) => r.status !== 'valid',
  ).length;
  const rowsWithSuggestionsCount = rowsWithSuggestion.size;
  const suggestionCoverage =
    totalNonValidRows > 0
      ? Math.round((rowsWithSuggestionsCount / totalNonValidRows) * 100)
      : 0;

  return {
    updatedRows:  rows,
    suggestions,
    pass3Metrics: {
      suggestionsGenerated:        suggestions.length,
      highConfidenceSuggestions,
      mediumConfidenceSuggestions,
      rowsPotentiallyFixable:      rowsWithSuggestionsCount,
      rowsWithSuggestions:         rowsWithSuggestionsCount,
      suggestionCoverage,
      skippedRows,
      suggestionsByType,
    },
  };
}

// ---------------------------------------------------------------------------
// PASS 3 Execution — apply suggestions with per-row rollback safety
// ---------------------------------------------------------------------------

/**
 * Suggestion types that can produce an actual field change.
 * All other types are informational only and produce no row mutation.
 */
const ACTIONABLE_SUGGESTION_TYPES = new Set<RemediationType>([
  'MISSING_ANSWER_SINGLE_OPTION',
  'CASE_ALIGNMENT',
  'FUZZY_MATCH',
]);

/**
 * Apply PASS 3 suggestions to rows.
 *
 * Safety model (mirrors PASS 2):
 * - Each actionable suggestion is applied to a candidate copy of the row.
 * - The candidate is validated in isolation.
 * - If validation status regresses → the change is reverted immediately.
 * - Non-actionable types (PLACEHOLDER_ANSWER, ORDER_MISMATCH, etc.) are
 * counted as "skipped" and the original row is passed through unchanged.
 * - Only HIGH confidence suggestions are auto-applied. MEDIUM suggestions
 * are informational only and never mutate rows.
 *
 * @param rows              Rows after PASS 1 + PASS 2 (input to PASS 3 suggestions).
 * @param suggestions       Output of applyPass3Remediation().
 * @param columnMapping     Same mapping used throughout the pipeline.
 * @param validationResults Clean validation results (after PASS 1 + PASS 2).
 */
export function applySuggestions(
  rows:              QuestionData[],
  suggestions:       RemediationSuggestion[],
  columnMapping:     Record<string, unknown>,
  validationResults: Record<string, ValidationResult>,
): Pass3ExecutionResult {
  // Index suggestions by rowKey for O(1) lookup.
  // At most one suggestion per row (enforced by applyPass3Remediation).
  const suggestionByRowKey = new Map<string, RemediationSuggestion>();
  for (const s of suggestions) {
    if (!suggestionByRowKey.has(s.rowKey)) {
      suggestionByRowKey.set(s.rowKey, s);
    }
  }

  const executionLogs:  Pass3ExecutionLog[] = [];
  const executedRows:   QuestionData[]      = [];

  let suggestionsAttempted    = 0;
  let suggestionsApplied      = 0;
  let highConfidenceApplied   = 0;
  let suggestionsRolledBack   = 0;
  let suggestionsSkipped      = 0;

  const rejectedBefore = Object.values(validationResults).filter(
    (r) => r.status === 'rejected',
  ).length;

  rows.forEach((row, index) => {
    const rowKey  = getRowKey(row, index);
    const rowIndex = index + 1;

    // Resolve suggestion — same double-lookup pattern as PASS 3 generation.
    const suggestion =
      suggestionByRowKey.get(rowKey) ??
      (typeof row.__rowKey === 'string' ? suggestionByRowKey.get(row.__rowKey) : undefined);

    // No suggestion, type does not produce a field change, or not HIGH confidence → pass through.
    if (!suggestion || !ACTIONABLE_SUGGESTION_TYPES.has(suggestion.type) || !suggestion.suggestedValue) {
      if (suggestion && !ACTIONABLE_SUGGESTION_TYPES.has(suggestion.type)) suggestionsSkipped++;
      executedRows.push(row);
      return;
    }
    // Only auto-apply HIGH confidence. MEDIUM suggestions remain informational only.
    if (suggestion.confidence !== 'HIGH') {
      suggestionsSkipped++;
      executedRows.push(row);
      return;
    }

    suggestionsAttempted++;

    const beforeStr = (() => {
      const v = row[suggestion.field];
      return v === null || v === undefined ? '' : String(v);
    })();

    // Apply the suggested value to a candidate copy.
    const candidate = { ...row, [suggestion.field]: suggestion.suggestedValue } as QuestionData;

    // Validate candidate in isolation.
    const [candidateResult] = validateAllQuestions([candidate], columnMapping as any);

    // Resolve current status — same double-lookup as above.
    const currentResult =
      validationResults[rowKey] ??
      (typeof row.__rowKey === 'string' ? validationResults[row.__rowKey] : undefined);

    const currentRank  = statusRank(currentResult?.status ?? 'rejected');
    const newRank      = statusRank(candidateResult?.status ?? 'rejected');

    if (newRank >= currentRank) {
      // Accept: validation did not regress.
      executionLogs.push({
        rowKey, rowIndex, field: suggestion.field,
        suggestionType: suggestion.type,
        before:     beforeStr,
        after:      suggestion.suggestedValue,
        applied:    true,
        rolledBack: false,
      });
      suggestionsApplied++;
      if (suggestion.confidence === 'HIGH') highConfidenceApplied++;
      executedRows.push(candidate);
    } else {
      // Rollback: discard change, keep original row.
      executionLogs.push({
        rowKey, rowIndex, field: suggestion.field,
        suggestionType: suggestion.type,
        before:     beforeStr,
        after:      suggestion.suggestedValue,
        applied:    false,
        rolledBack: true,
      });
      suggestionsRolledBack++;
      executedRows.push(row);
    }
  });

  // Re-validate all rows after execution (includes unchanged rows).
  const executedValidationArr = validateAllQuestions(executedRows, columnMapping as any);
  const executionResults      = buildResultsMap(executedValidationArr);

  const rejectedAfter  = Object.values(executionResults).filter(
    (r) => r.status === 'rejected',
  ).length;

  return {
    executedRows,
    executionLogs,
    executionResults,
    executionMetrics: {
      suggestionsAttempted,
      suggestionsApplied,
      highConfidenceApplied,
      suggestionsRolledBack,
      suggestionsSkipped,
      rowsFixedByPass3: rejectedBefore - rejectedAfter,
      rejectedBefore,
      rejectedAfter,
    },
  };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Run a full multi-pass validation cycle:
 * 1. Validate raw rows (baseline).
 * 2. PASS 1: character-level cleaning.
 * 3. PASS 2: structural cleaning & alignment (safe, rollback-guarded).
 * 4. Re-validate the fully cleaned rows.
 * 5. Compute improvement metrics.
 *
 * The raw validation results are guaranteed to be identical to calling
 * `validateAllQuestions(rows, columnMapping, profileInput)` directly.
 */
export function runDualValidation(
  rows:          QuestionData[],
  columnMapping: Record<string, unknown>,
  profileInput?: Partial<ValidationProfile>,
): DualValidationResult {
  // Baseline: validate raw rows (untouched)
  const rawValidationResults = validateAllQuestions(rows, columnMapping as any, profileInput);
  const rawResults = buildResultsMap(rawValidationResults);

  // PASS 1: character-level cleaning
  const { cleanedRows: pass1Rows, logs: pass1Logs } = cleanRows(rows, columnMapping, rawResults);

  // PASS 2: structural cleaning (safe, with valid-row skip + per-row rollback)
  const { updatedRows: pass2Rows, pass2Logs, pass2SafetyMetrics } =
    applyPass2StructuralCleaning(pass1Rows, columnMapping, rawResults);

  // Merged log set (PASS 1 first, then PASS 2)
  const allLogs: CleanLog[] = [...pass1Logs, ...pass2Logs];

  // Final validation on fully cleaned rows
  const cleanValidationResults = validateAllQuestions(pass2Rows, columnMapping as any, profileInput);
  const cleanResults = buildResultsMap(cleanValidationResults);

  // Metrics compare raw → fully-cleaned
  const metrics = computeImprovementMetrics(rawValidationResults, cleanValidationResults, allLogs);

  const rowImprovements: RowImprovementRecord[] = rawValidationResults.map((raw) => {
    const clean = cleanResults[raw.rowKey];
    if (!clean) {
      return { rowKey: raw.rowKey, statusBefore: raw.status, statusAfter: raw.status, improved: false, unchanged: true, degraded: false };
    }
    const rankBefore = statusRank(raw.status);
    const rankAfter  = statusRank(clean.status);
    return {
      rowKey:       raw.rowKey,
      statusBefore: raw.status,
      statusAfter:  clean.status,
      improved:     rankAfter > rankBefore,
      unchanged:    rankAfter === rankBefore,
      degraded:     rankAfter < rankBefore,
    };
  });

  // PASS 3: suggestion-based remediation on the fully-cleaned rows.
  // Pass allLogs so PASS 3 can detect which answers were null-coerced from
  // placeholder tokens (and recover the original value for the suggestion).
  const pass3Result = applyPass3Remediation(pass2Rows, columnMapping, cleanResults, allLogs);

  // PASS 3 Execution: apply actionable suggestions with rollback safety.
  const pass3ExecutionResult = applySuggestions(
    pass2Rows,
    pass3Result.suggestions,
    columnMapping,
    cleanResults,
  );

  return {
    rawResults,
    cleanedRows:          pass2Rows,
    cleanLogs:            allLogs,
    pass2Logs,
    cleanResults,
    rowImprovements,
    metrics,
    pass2SafetyMetrics,
    pass3Result,
    pass3ExecutionResult,
  };
}