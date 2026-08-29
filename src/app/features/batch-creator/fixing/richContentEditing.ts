import type { MathReference } from "../core/mathTypes";
import { analyzeLatexDelimiters } from "../validation/latexDelimiterValidator";

const COMPLETE_MATH_REGION =
  /\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\[[\s\S]+?\\\]|\\\(.+?\\\)/g;

function stableMathId(value: string, index: number): string {
  let hash = 2166136261;
  for (let cursor = 0; cursor < value.length; cursor += 1) {
    hash ^= value.charCodeAt(cursor);
    hash = Math.imul(hash, 16777619);
  }
  return `math-${index}-${(hash >>> 0).toString(16)}`;
}

export function normalizeLatexForInsertion(
  value: string,
  displayMode: boolean,
): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const analysis = analyzeLatexDelimiters(trimmed);
  if (analysis.hasMathDelimiters && analysis.issues.length === 0)
    return trimmed;

  // If a user pasted a malformed or partial delimiter pair, remove only the
  // boundary tokens before applying one known-good pair. Inner LaTeX remains
  // untouched and will still be checked by background validation.
  const unwrapped = trimmed
    .replace(/^(?:\$\$|\$|\\\[|\\\()/, "")
    .replace(/(?:\$\$|\$|\\\]|\\\))$/, "")
    .trim();
  if (!unwrapped) return "";

  return displayMode ? `\\[${unwrapped}\\]` : `$${unwrapped}$`;
}

function decodeHtmlAttribute(value: string): string {
  return value.replace(
    /&(?:amp|quot|apos|lt|gt|#\d+|#x[\da-f]+);/gi,
    (entity) => {
      const normalized = entity.toLowerCase();
      if (normalized === "&amp;") return "&";
      if (normalized === "&quot;") return '"';
      if (normalized === "&apos;") return "'";
      if (normalized === "&lt;") return "<";
      if (normalized === "&gt;") return ">";
      const isHex = normalized.startsWith("&#x");
      const digits = normalized.slice(isHex ? 3 : 2, -1);
      const codePoint = Number.parseInt(digits, isHex ? 16 : 10);
      if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10ffff)
        return entity;
      try {
        return String.fromCodePoint(codePoint);
      } catch {
        return entity;
      }
    },
  );
}

function readHtmlAttribute(tag: string, name: string): string | undefined {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const quoted = tag.match(
    new RegExp(`(?:\\s|^)${escapedName}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i"),
  );
  if (quoted) return decodeHtmlAttribute(quoted[2]);
  const unquoted = tag.match(
    new RegExp(`(?:\\s|^)${escapedName}\\s*=\\s*([^\\s>]+)`, "i"),
  );
  return unquoted ? decodeHtmlAttribute(unquoted[1]) : undefined;
}

function hasHtmlClass(tag: string, className: string): boolean {
  return (readHtmlAttribute(tag, "class") || "")
    .split(/\s+/)
    .some((candidate) => candidate === className);
}

function isEditorMathSpan(tag: string): boolean {
  if (!/^<span\b/i.test(tag) || readHtmlAttribute(tag, "data-latex") === undefined)
    return false;
  return (
    readHtmlAttribute(tag, "data-math-rendered") === "true" ||
    readHtmlAttribute(tag, "data-matrix") === "true" ||
    hasHtmlClass(tag, "lms-equation")
  );
}

function findMatchingSpanEnd(value: string, openingEnd: number): number | null {
  const spanTag = /<\/?span\b[^>]*>/gi;
  spanTag.lastIndex = openingEnd;
  let depth = 1;
  for (let match = spanTag.exec(value); match; match = spanTag.exec(value)) {
    const tag = match[0];
    if (/^<\/span\b/i.test(tag)) {
      depth -= 1;
      if (depth === 0) return spanTag.lastIndex;
    } else if (!/\/>$/.test(tag)) {
      depth += 1;
    }
  }
  return null;
}

/**
 * Convert equation widgets emitted by the Manual Fix rich editor back into
 * portable LaTeX source. KaTeX's rendered HTML contains an internal <math>
 * tree and duplicates the LaTeX in data attributes; neither representation
 * should reach source validation or exports.
 *
 * This intentionally recognizes only editor-owned marker spans. Genuine
 * pasted MathML remains unchanged so UNSUPPORTED_MATH_FORMAT can still report
 * it. The scanner is DOM-independent because validation also runs in tests,
 * workers, and other non-browser contexts.
 */
export function canonicalizeEditorMathMarkup(value: string): string {
  if (
    !value ||
    (!value.includes("data-math-rendered") &&
      !value.includes("data-matrix") &&
      !value.includes("lms-equation"))
  ) {
    return value;
  }
  const openingSpan = /<span\b[^>]*>/gi;
  let cursor = 0;
  let output = "";
  for (
    let match = openingSpan.exec(value);
    match;
    match = openingSpan.exec(value)
  ) {
    const tag = match[0];
    if (!isEditorMathSpan(tag)) continue;
    const closingEnd = findMatchingSpanEnd(value, openingSpan.lastIndex);
    if (closingEnd === null) continue;
    const latex = (readHtmlAttribute(tag, "data-latex") || "").trim();
    if (!latex) continue;
    const isMatrix = readHtmlAttribute(tag, "data-matrix") === "true";
    const isDisplay =
      isMatrix ||
      hasHtmlClass(tag, "math-display") ||
      readHtmlAttribute(tag, "data-display-mode") === "block";
    const canonicalLatex = normalizeLatexForInsertion(latex, isDisplay);
    if (!canonicalLatex) continue;
    output += value.slice(cursor, match.index) + canonicalLatex;
    cursor = closingEnd;
    openingSpan.lastIndex = closingEnd;
  }
  return cursor === 0 ? value : output + value.slice(cursor);
}

export function appendRichContent(existing: string, content: string): string {
  const left = existing.trimEnd();
  const right = content.trim();
  if (!right) return existing;
  if (!left) return right;
  return `${left}\n${right}`;
}

export function createMediaMarker(url: string, altText = ""): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  const safeAltText = altText.trim().replace(/[\]\r\n|]+/g, " ");
  return safeAltText
    ? `[MEDIA:${trimmed}|${safeAltText}]`
    : `[MEDIA:${trimmed}]`;
}

export function extractMathReferences(
  values: Array<string | undefined>,
): MathReference[] {
  const references: MathReference[] = [];

  for (const value of values) {
    if (!value) continue;

    for (const match of value.matchAll(COMPLETE_MATH_REGION)) {
      const originalLatex = match[0];
      const analysis = analyzeLatexDelimiters(originalLatex);
      if (!analysis.hasMathDelimiters || analysis.issues.length > 0) continue;

      const isBlock =
        originalLatex.startsWith("$$") || originalLatex.startsWith("\\[");
      const delimiterLength =
        originalLatex.startsWith("$") && !originalLatex.startsWith("$$")
          ? 1
          : 2;
      const normalizedLatex = originalLatex
        .slice(delimiterLength, -delimiterLength)
        .trim();

      references.push({
        id: stableMathId(originalLatex, references.length),
        originalLatex,
        normalizedLatex,
        format: isBlock ? "block" : "inline",
        status: "valid",
      });
    }
  }

  return references;
}
