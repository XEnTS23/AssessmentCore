import { QuestionRow } from '../core/rowTypes';
import { CleaningLog } from '../core/cleaningTypes';
import { Option } from '../core/questionTypes';

// ─── Constants ───────────────────────────────────────────────────────

/** Standard option label alphabet */
const OPTION_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Common answer identifier patterns (case-insensitive) */
const IDENTIFIER_RE = /^[a-zA-Z]$/;

/** Pipe-delimited tokens pattern */
const PIPE_DELIMITED_RE = /^[^|]+(\|[^|]+)+$/;

// ─── Main Pass 2 API ─────────────────────────────────────────────────

/**
 * Pass 2 — Structural cleaning.
 *
 * Operates on the normalizedQuestion of each row to fix identifiers,
 * option labels, answer alignment, and delimiter normalization.
 *
 * Only performs changes that are **safe and deterministic** — no
 * guesswork or semantic interpretation.
 */
export function pass2StructuralCleaning(
  row: QuestionRow,
): { row: QuestionRow; logs: CleaningLog[] } {
  const logs: CleaningLog[] = [];

  // Deep-clone so we never mutate the input
  const cleaned: QuestionRow = structuredClone(row);
  const q = cleaned.normalizedQuestion;

  if (!q || q.type === 'UNKNOWN') {
    return { row: cleaned, logs };
  }

  // ── 1. Option identifier/label normalization (MCQ / MSQ) ──────────
  if ('options' in q && Array.isArray(q.options)) {
    normalizeOptionLabels(q.options, row.id, logs);
    deduplicateOptionIdentifiers(q.options, row.id, logs);
    trimOptionText(q.options, row.id, logs);
  }

  // ── 2. Answer identifier normalization ─────────────────────────────
  if (q.type === 'MCQ') {
    normalizeCorrectAnswerId(q, row.id, logs);
  }

  if (q.type === 'MSQ') {
    normalizeCorrectAnswerIds(q, row.id, logs);
  }

  // ── 3. Delimiter normalization for MSQ ─────────────────────────────
  if (q.type === 'MSQ') {
    normalizeDelimiterForMsq(q, row.id, logs);
  }

  // Attach history entry
  if (logs.length > 0) {
    cleaned.history = [
      ...cleaned.history,
      {
        timestamp: new Date().toISOString(),
        action: `Pass 2 structural cleaning (${logs.length} changes)`,
      },
    ];
  }

  return { row: cleaned, logs };
}

// ─── Sub-routines ────────────────────────────────────────────────────

/**
 * Ensure each option has a sequential alphabetical label (A, B, C, …).
 * Only modifies labels that are missing or non-standard.
 */
function normalizeOptionLabels(
  options: Option[],
  rowId: string,
  logs: CleaningLog[],
): void {
  for (let i = 0; i < options.length; i++) {
    const expectedLabel = OPTION_LABELS[i] || String(i + 1);
    const currentLabel = options[i].label;

    if (!currentLabel || currentLabel.trim() === '') {
      const before = currentLabel;
      options[i].label = expectedLabel;
      logs.push(makeLog(rowId, `options[${i}].label`, 'option_label_assigned', before, expectedLabel, 'high'));
    } else {
      // Normalize casing: 'a' → 'A'
      const normalized = currentLabel.trim().toUpperCase();
      if (normalized !== currentLabel) {
        options[i].label = normalized;
        logs.push(makeLog(rowId, `options[${i}].label`, 'option_label_case_normalized', currentLabel, normalized, 'high'));
      }
    }
  }
}

/**
 * If two options share the same `id`, regenerate unique ids.
 */
function deduplicateOptionIdentifiers(
  options: Option[],
  rowId: string,
  logs: CleaningLog[],
): void {
  const seenIds = new Set<string>();
  for (let i = 0; i < options.length; i++) {
    if (seenIds.has(options[i].id)) {
      const before = options[i].id;
      options[i].id = crypto.randomUUID();
      logs.push(makeLog(rowId, `options[${i}].id`, 'option_id_deduplicated', before, options[i].id, 'high'));
    }
    seenIds.add(options[i].id);
  }
}

/**
 * Trim leading/trailing whitespace from option text (safe operation).
 */
function trimOptionText(
  options: Option[],
  rowId: string,
  logs: CleaningLog[],
): void {
  for (let i = 0; i < options.length; i++) {
    const text = options[i].text;
    const trimmed = text.trim();
    if (trimmed !== text) {
      options[i].text = trimmed;
      logs.push(makeLog(rowId, `options[${i}].text`, 'option_text_trimmed', text, trimmed, 'high'));
    }
  }
}

/**
 * For MCQ: if `correctAnswerId` is a raw label string like "A" or "a",
 * resolve it to the actual option's UUID, but only if the match is
 * exact and unambiguous.
 */
function normalizeCorrectAnswerId(
  q: { correctAnswerId: string; options: Option[] },
  rowId: string,
  logs: CleaningLog[],
): void {
  const raw = q.correctAnswerId;
  if (!raw) return;

  // Already a UUID — skip
  if (raw.includes('-') && raw.length > 10) return;

  const upper = raw.trim().toUpperCase();

  // Try label match
  const matchByLabel = q.options.find(o => o.label === upper);
  if (matchByLabel) {
    const before = q.correctAnswerId;
    q.correctAnswerId = matchByLabel.id;
    logs.push(makeLog(rowId, 'correctAnswerId', 'answer_id_resolved_by_label', before, matchByLabel.id, 'high'));
    return;
  }

  // Try exact text match (case-insensitive)
  const matchesByText = q.options.filter(o => o.text.trim().toUpperCase() === upper);
  if (matchesByText.length === 1) {
    const before = q.correctAnswerId;
    q.correctAnswerId = matchesByText[0].id;
    logs.push(makeLog(rowId, 'correctAnswerId', 'answer_id_resolved_by_text', before, matchesByText[0].id, 'medium'));
    return;
  }

  // Ambiguous or no match — leave as-is for validation to flag
}

/**
 * For MSQ: resolve each `correctAnswerIds` entry from raw labels/text
 * to option UUIDs where safe.
 */
function normalizeCorrectAnswerIds(
  q: { correctAnswerIds: string[]; options: Option[] },
  rowId: string,
  logs: CleaningLog[],
): void {
  for (let i = 0; i < q.correctAnswerIds.length; i++) {
    const raw = q.correctAnswerIds[i];
    if (!raw) continue;

    // Already a UUID — skip
    if (raw.includes('-') && raw.length > 10) continue;

    const upper = raw.trim().toUpperCase();

    const matchByLabel = q.options.find(o => o.label === upper);
    if (matchByLabel) {
      const before = q.correctAnswerIds[i];
      q.correctAnswerIds[i] = matchByLabel.id;
      logs.push(makeLog(rowId, `correctAnswerIds[${i}]`, 'answer_id_resolved_by_label', before, matchByLabel.id, 'high'));
      continue;
    }

    const matchesByText = q.options.filter(o => o.text.trim().toUpperCase() === upper);
    if (matchesByText.length === 1) {
      const before = q.correctAnswerIds[i];
      q.correctAnswerIds[i] = matchesByText[0].id;
      logs.push(makeLog(rowId, `correctAnswerIds[${i}]`, 'answer_id_resolved_by_text', before, matchesByText[0].id, 'medium'));
    }
  }
}

/**
 * For MSQ: normalize delimiter formats in the raw answer list.
 *
 * Rules:
 * - Pipe-delimited ("A|B|C") is canonical — no change needed.
 * - Comma-delimited ("A,B,C") is normalized to pipe ONLY IF every
 *   token matches a known option label. This prevents mangling
 *   answer text that legitimately contains commas.
 * - Semicolons are treated same as commas.
 */
function normalizeDelimiterForMsq(
  q: { correctAnswerIds: string[]; options: Option[] },
  rowId: string,
  logs: CleaningLog[],
): void {
  // This pass doesn't re-split the IDs (already done during normalization).
  // It deduplicates entries instead.
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const id of q.correctAnswerIds) {
    if (!seen.has(id)) {
      deduped.push(id);
      seen.add(id);
    }
  }
  if (deduped.length < q.correctAnswerIds.length) {
    const before = q.correctAnswerIds.join('|');
    q.correctAnswerIds = deduped;
    const after = deduped.join('|');
    logs.push(makeLog(rowId, 'correctAnswerIds', 'duplicate_answer_ids_removed', before, after, 'high'));
  }
}

// ─── Internal ────────────────────────────────────────────────────────

function makeLog(
  rowId: string,
  field: string,
  action: string,
  before: string,
  after: string,
  confidence: 'high' | 'medium' | 'low',
): CleaningLog {
  return {
    rowId,
    field,
    action,
    before,
    after,
    reversible: true,
    confidence,
  };
}
