// ─── Identifier Utilities (shared across all QTI builders) ─────────────────

/**
 * Sanitise a raw string so it conforms to the XML Name production:
 *   NameStartChar ::= [A-Z] | "_" | [a-z] | ...
 *   NameChar      ::= NameStartChar | "-" | "." | [0-9] | ...
 *
 * Strategy:
 *   1. Prefix with "_" if the first character is a digit or illegal start.
 *   2. Replace every illegal character with "_".
 */
export function toXmlSafeId(raw: string | undefined | null): string {
  if (!raw) return '_unknown';
  // Replace all non-word, non-dash, non-dot characters with _
  let safe = raw.replace(/[^a-zA-Z0-9_.\-]/g, '_');
  // Ensure it doesn't start with a digit or hyphen
  if (/^[^a-zA-Z_]/.test(safe)) {
    safe = '_' + safe;
  }
  return safe;
}

/**
 * Return the best available identifier for a question row,
 * falling back to the internal row UUID if no questionId is set.
 * Always guaranteed to be XML-safe.
 */
export function resolveItemId(questionId: string | undefined, rowId: string): string {
  return toXmlSafeId(questionId || rowId);
}
