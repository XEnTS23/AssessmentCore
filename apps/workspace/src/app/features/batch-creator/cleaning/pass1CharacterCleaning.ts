import { QuestionRow } from "../core/rowTypes";
import { CleaningLog } from "../core/cleaningTypes";

// ─── Constants ───────────────────────────────────────────────────────

/** Unicode BOM character */
const BOM = "\uFEFF";

/** Invisible / zero-width characters to strip (outside math delimiters) */
const INVISIBLE_RE = /[\u200B\u200C\u200D\u2060\uFEFF\u00AD]/g;

/** Soft hyphen */
const SOFT_HYPHEN = "\u00AD";

/** Smart quotes → straight quotes */
const SMART_QUOTE_MAP: [RegExp, string][] = [
  [/\u2018|\u2019/g, "'"], // ' ' → '
  [/\u201C|\u201D/g, '"'], // " " → "
];

/** Line-break normalization: \r\n → \n, lone \r → \n */
const CRLF_RE = /\r\n?/g;

/** Null-like sentinel values (case-insensitive) */
const NULL_TOKENS = new Set([
  "null",
  "nil",
  "none",
  "n/a",
  "na",
  "#n/a",
  "#null!",
  "undefined",
  "-",
  "--",
  "—",
]);

// ─── Helpers ─────────────────────────────────────────────────────────

/** Fields that are safe to trim leading/trailing whitespace. */
const TRIMMABLE_FIELDS = new Set([
  "stem",
  "explanation",
  "correctAnswerId",
  "rawStem",
]);

/** Fields that contain content which may have math/formula/code and
 *  should NOT have invisible characters blindly stripped from inside
 *  math delimiters.  We still strip around them. */
function isMathSensitiveField(field: string): boolean {
  return ["stem", "explanation", "text"].includes(field);
}

/**
 * For math-sensitive fields, split the text into segments that are
 * "inside math" vs "outside math". We only strip invisible chars
 * from "outside math" segments.
 *
 * Supported delimiters: $...$, $$...$$, \(...\), \[...\]
 */
function stripInvisiblePreservingMath(text: string): string {
  // This regex matches any of the 4 math delimiter pairs (non-greedy inside)
  const mathPattern =
    /(\$\$[\s\S]*?\$\$|\$[^$]*?\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/g;
  const parts: string[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mathPattern.exec(text)) !== null) {
    // Text before this math block → strip invisible chars
    parts.push(text.slice(lastIndex, match.index).replace(INVISIBLE_RE, ""));
    // Math block → keep as-is
    parts.push(match[0]);
    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last math block
  parts.push(text.slice(lastIndex).replace(INVISIBLE_RE, ""));

  return parts.join("");
}

// ─── Main Pass 1 API ─────────────────────────────────────────────────

export interface Pass1Options {
  /** If true, detect null-tokens and log them but do NOT replace them.
   *  Actual replacement is left to a manual fix step. Default true. */
  nullTokenDetectOnly?: boolean;
}

/**
 * Pass 1 — Character-level cleaning.
 *
 * Operates on every string value inside `rawRow` and every text field
 * inside `normalizedQuestion`.  Produces a new QuestionRow (original
 * rawRow is left attached so original data is always recoverable).
 */
export function pass1CharacterCleaning(
  row: QuestionRow,
  options: Pass1Options = {},
): { row: QuestionRow; logs: CleaningLog[] } {
  const { nullTokenDetectOnly = true } = options;
  const logs: CleaningLog[] = [];

  // Deep-clone so we never mutate the input
  const cleaned: QuestionRow = structuredClone(row);

  // 1. Clean rawRow string values
  for (const [key, value] of Object.entries(cleaned.rawRow || {})) {
    if (typeof value !== "string") continue;
    const result = cleanStringValue(value, key, row.id, false);
    if (result.changed) {
      cleaned.rawRow[key] = result.value;
      logs.push(...result.logs);
    }
  }

  // 2. Clean normalizedQuestion text fields
  if (cleaned.normalizedQuestion) {
    const q = cleaned.normalizedQuestion;

    // Stem / rawStem
    if ("stem" in q && typeof q.stem === "string") {
      const r = cleanStringValue(q.stem, "stem", row.id, true);
      if (r.changed) {
        (q as any).stem = r.value;
        logs.push(...r.logs);
      }
    }
    if ("rawStem" in q && typeof q.rawStem === "string") {
      const r = cleanStringValue(q.rawStem, "rawStem", row.id, true);
      if (r.changed) {
        (q as any).rawStem = r.value;
        logs.push(...r.logs);
      }
    }

    // Explanation
    if ("explanation" in q && typeof q.explanation === "string") {
      const r = cleanStringValue(q.explanation, "explanation", row.id, true);
      if (r.changed) {
        (q as any).explanation = r.value;
        logs.push(...r.logs);
      }
    }

    // Options text
    if ("options" in q && Array.isArray(q.options)) {
      for (let i = 0; i < q.options.length; i++) {
        const opt = q.options[i];
        const fieldName = `options[${i}].text`;
        const r = cleanStringValue(opt.text, fieldName, row.id, true);
        if (r.changed) {
          opt.text = r.value;
          logs.push(...r.logs);
        }
      }
    }

    // Text Entry accepted answers
    if ("acceptedAnswers" in q && Array.isArray(q.acceptedAnswers)) {
      for (let i = 0; i < q.acceptedAnswers.length; i++) {
        const fieldName = `acceptedAnswers[${i}]`;
        const r = cleanStringValue(
          q.acceptedAnswers[i],
          fieldName,
          row.id,
          true,
        );
        if (r.changed) {
          q.acceptedAnswers[i] = r.value;
          logs.push(...r.logs);
        }
      }
    }
  }

  // 3. Null-token detection (on rawRow values only, as a log marker)
  if (nullTokenDetectOnly) {
    for (const [key, value] of Object.entries(cleaned.rawRow || {})) {
      if (typeof value !== "string") continue;
      if (NULL_TOKENS.has(value.trim().toLowerCase())) {
        logs.push({
          rowId: row.id,
          field: `rawRow.${key}`,
          action: "null_token_detected",
          before: value,
          after: value, // not replaced
          reversible: true,
          confidence: "medium",
        });
      }
    }
  }

  // Attach history entry
  if (logs.length > 0) {
    cleaned.history = [
      ...cleaned.history,
      {
        timestamp: new Date().toISOString(),
        action: `Pass 1 character cleaning (${logs.length} changes)`,
      },
    ];
  }

  return { row: cleaned, logs };
}

// ─── Internal ────────────────────────────────────────────────────────

function cleanStringValue(
  input: string,
  field: string,
  rowId: string,
  mathSafe: boolean,
): { value: string; changed: boolean; logs: CleaningLog[] } {
  const logs: CleaningLog[] = [];
  let value = input;

  // (a) BOM removal
  if (value.includes(BOM)) {
    const before = value;
    value = value.split(BOM).join("");
    logs.push(makeLog(rowId, field, "bom_removal", before, value));
  }

  // (b) Line-break normalization
  if (CRLF_RE.test(value)) {
    const before = value;
    value = value.replace(CRLF_RE, "\n");
    if (value !== before) {
      logs.push(
        makeLog(rowId, field, "linebreak_normalization", before, value),
      );
    }
  }

  // (c) Invisible character removal (math-aware)
  if (INVISIBLE_RE.test(value)) {
    const before = value;
    if (mathSafe && isMathSensitiveField(field)) {
      value = stripInvisiblePreservingMath(value);
    } else {
      value = value.replace(INVISIBLE_RE, "");
    }
    if (value !== before) {
      logs.push(makeLog(rowId, field, "invisible_char_removal", before, value));
    }
  }

  // (d) Soft-hyphen removal (outside math for safe fields)
  if (value.includes(SOFT_HYPHEN)) {
    const before = value;
    if (mathSafe && isMathSensitiveField(field)) {
      value = stripInvisiblePreservingMath(value);
    } else {
      value = value.split(SOFT_HYPHEN).join("");
    }
    if (value !== before) {
      logs.push(makeLog(rowId, field, "soft_hyphen_removal", before, value));
    }
  }

  // (e) Smart quote normalization
  for (const [pattern, replacement] of SMART_QUOTE_MAP) {
    if (pattern.test(value)) {
      const before = value;
      value = value.replace(pattern, replacement);
      if (value !== before) {
        logs.push(
          makeLog(rowId, field, "smart_quote_normalization", before, value),
        );
      }
    }
  }

  // (f) Trim leading/trailing whitespace for safe fields
  if (
    TRIMMABLE_FIELDS.has(field) ||
    field.startsWith("options[") ||
    field.startsWith("acceptedAnswers[")
  ) {
    const before = value;
    value = value.trim();
    if (value !== before) {
      logs.push(makeLog(rowId, field, "whitespace_trim", before, value));
    }
  }

  return { value, changed: value !== input, logs };
}

function makeLog(
  rowId: string,
  field: string,
  action: string,
  before: string,
  after: string,
): CleaningLog {
  return {
    rowId,
    field,
    action,
    before,
    after,
    reversible: true,
    confidence: "high",
  };
}
