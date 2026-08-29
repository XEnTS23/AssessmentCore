// ─── QTI Identifier Utilities (shared across all QTI builders) ─────────────
//
// QTI identifiers must match the XML Name production. This module provides:
//   • toQtiIdentifier  — NFKC-normalize, sanitize, prefix, validate
//   • buildOptionIdMap — map raw option IDs to stable CHOICE_A..Z identifiers
//   • resolveItemId    — resolve a row's question ID to a safe item identifier
//
// These are shared by both QTI 2.1 and 3.0 builders.

/**
 * Typed error thrown when a valid QTI identifier cannot be produced.
 */
export class QtiIdentifierError extends Error {
  constructor(
    public readonly rawValue: string,
    public readonly reason: string,
  ) {
    super(`Cannot produce QTI identifier from "${rawValue}": ${reason}`);
    this.name = "QtiIdentifierError";
  }
}

/**
 * The regex that every finished QTI identifier must match.
 * Conforms to: NameStartChar (letter or _) followed by NameChar (letter, digit, _, ., -).
 */
const QTI_IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_.\-]*$/;

/**
 * Normalize a raw string into a valid QTI / XML Name identifier.
 *
 * Steps:
 *   1. Unicode NFKC normalization.
 *   2. Trim whitespace.
 *   3. Replace every character that is not [A-Za-z0-9_.-] with `_`.
 *   4. Collapse consecutive underscores.
 *   5. Prefix with the given prefix if the value does not start with a letter or `_`.
 *   6. Validate against the QTI identifier regex.
 *   7. Throw QtiIdentifierError if the result is empty or invalid.
 *
 * Deterministic: the same (raw, prefix) pair always produces the same output.
 */
export function toQtiIdentifier(raw: string, prefix: string): string {
  if (!raw && !prefix) {
    throw new QtiIdentifierError("", "Input is empty and no prefix provided.");
  }

  // 1. NFKC normalization
  let normalized = (raw || "").normalize("NFKC");

  // 2. Trim
  normalized = normalized.trim();

  if (!normalized) {
    // Empty after trim — use prefix as the identifier
    if (!prefix) {
      throw new QtiIdentifierError(raw, "Input is empty after normalization.");
    }
    return prefix;
  }

  // 3. Replace unsupported characters
  let safe = normalized.replace(/[^A-Za-z0-9_.\-]/g, "_");

  // 4. Collapse consecutive underscores
  safe = safe.replace(/_+/g, "_");

  // Remove trailing underscore
  safe = safe.replace(/_$/, "");

  // 5. Prefix if needed
  if (/^[^A-Za-z_]/.test(safe)) {
    safe = prefix ? `${prefix}${safe}` : `_${safe}`;
  }

  // 6. Validate
  if (!safe || !QTI_IDENTIFIER_RE.test(safe)) {
    throw new QtiIdentifierError(
      raw,
      `Normalized value "${safe}" does not match the QTI identifier pattern.`,
    );
  }

  return safe;
}

/**
 * Option ID map entry — maps a raw option ID to a stable QTI identifier.
 */
export interface OptionIdMap {
  /** Raw source option ID → QTI-safe identifier */
  readonly map: ReadonlyMap<string, string>;
  /** Reverse lookup: QTI identifier → raw option ID */
  readonly reverse: ReadonlyMap<string, string>;
}

/**
 * Build a single source-to-QTI option-ID map for one item.
 *
 * Produces stable identifiers: CHOICE_A, CHOICE_B, …, CHOICE_Z, CHOICE_AA, …
 * This map must be reused everywhere that references option IDs:
 *   • simpleChoice/@identifier
 *   • correctResponse/value
 *   • response mappings
 *   • feedback references
 *
 * Detects collisions after normalization and throws if any occur.
 */
export function buildOptionIdMap(
  options: ReadonlyArray<{ id: string }>,
): OptionIdMap {
  const map = new Map<string, string>();
  const reverse = new Map<string, string>();

  for (let i = 0; i < options.length; i++) {
    const rawId = options[i].id;
    const qtiId = choiceLabel(i);

    if (map.has(rawId)) {
      throw new QtiIdentifierError(
        rawId,
        `Duplicate raw option ID "${rawId}" in the same item.`,
      );
    }
    if (reverse.has(qtiId)) {
      throw new QtiIdentifierError(
        rawId,
        `Collision: QTI identifier "${qtiId}" is already mapped to raw ID "${reverse.get(qtiId)}".`,
      );
    }

    map.set(rawId, qtiId);
    reverse.set(qtiId, rawId);
  }

  return { map, reverse };
}

/**
 * Generate the Nth choice label: CHOICE_A, CHOICE_B, …, CHOICE_Z, CHOICE_AA, …
 */
function choiceLabel(index: number): string {
  let label = "";
  let n = index;
  do {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return `CHOICE_${label}`;
}

/**
 * Translate a raw option ID through the option map.
 * Throws if the raw ID is not found in the map.
 */
export function resolveOptionId(
  optionMap: OptionIdMap,
  rawId: string,
): string {
  const qtiId = optionMap.map.get(rawId);
  if (!qtiId) {
    throw new QtiIdentifierError(
      rawId,
      `Raw option ID "${rawId}" not found in the option map.`,
    );
  }
  return qtiId;
}

/**
 * Return the best available identifier for a question row,
 * falling back to the internal row UUID if no questionId is set.
 * Always guaranteed to be QTI-safe.
 */
export function resolveItemId(
  questionId: string | undefined,
  rowId: string,
): string {
  return toQtiIdentifier(questionId || rowId, "ITEM_");
}

/**
 * @deprecated Use `toQtiIdentifier` instead. Kept for backward compatibility
 * with the QTI 3.0 builder.
 */
export function toXmlSafeId(raw: string | undefined | null): string {
  if (!raw) return "_unknown";
  try {
    return toQtiIdentifier(raw, "_");
  } catch {
    // Fallback to legacy behavior for edge cases
    let safe = raw.replace(/[^a-zA-Z0-9_.\-]/g, "_");
    if (/^[^a-zA-Z_]/.test(safe)) {
      safe = "_" + safe;
    }
    return safe || "_unknown";
  }
}
