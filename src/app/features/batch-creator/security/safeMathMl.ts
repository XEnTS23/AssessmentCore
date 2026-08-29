import { escapeXml } from "../builders/shared/xmlUtils";

const SAFE_TAGS = new Set([
  "math",
  "mrow",
  "mi",
  "mn",
  "mo",
  "mtext",
  "mspace",
  "ms",
  "mfrac",
  "msqrt",
  "mroot",
  "mstyle",
  "merror",
  "mpadded",
  "mphantom",
  "mfenced",
  "menclose",
  "msub",
  "msup",
  "msubsup",
  "munder",
  "mover",
  "munderover",
  "mmultiscripts",
  "mprescripts",
  "none",
  "mtable",
  "mtr",
  "mtd",
  "mlabeledtr",
  "maligngroup",
  "malignmark",
  "semantics",
  "annotation",
]);

const SAFE_ATTRIBUTES = new Set([
  "xmlns",
  "display",
  "mathvariant",
  "mathsize",
  "mathcolor",
  "mathbackground",
  "scriptlevel",
  "displaystyle",
  "maxsize",
  "minsize",
  "stretchy",
  "symmetric",
  "largeop",
  "movablelimits",
  "accent",
  "accentunder",
  "fence",
  "separator",
  "lspace",
  "rspace",
  "form",
  "notation",
  "rowalign",
  "columnalign",
  "rowspacing",
  "columnspacing",
  "columnspan",
  "rowspan",
  "open",
  "close",
  "separators",
  "encoding",
]);

const SAFE_ENTITY = /&(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);/gi;

export interface SafeMathMlResult {
  content: string;
  isSafeMathMl: boolean;
  rejectionReason?: string;
}

function reject(input: string, reason: string): SafeMathMlResult {
  return {
    content: escapeXml(input),
    isSafeMathMl: false,
    rejectionReason: reason,
  };
}

function entitiesAreSafe(value: string): boolean {
  return !value.replace(SAFE_ENTITY, "").includes("&");
}

function attributesAreSafe(raw: string, tagName: string): boolean {
  let remaining = raw.trim().replace(/\/$/, "").trim();
  while (remaining) {
    const match = remaining.match(
      /^([A-Za-z][A-Za-z0-9-]*)\s*=\s*("[^"]*"|'[^']*')\s*/,
    );
    if (!match) return false;
    const name = match[1].toLowerCase();
    const value = match[2].slice(1, -1);
    if (
      !SAFE_ATTRIBUTES.has(name) ||
      /[\u0000-\u001f\u007f<>]/.test(value) ||
      !entitiesAreSafe(value)
    )
      return false;
    if (
      name === "xmlns" &&
      (tagName !== "math" || value !== "http://www.w3.org/1998/Math/MathML")
    )
      return false;
    remaining = remaining.slice(match[0].length);
  }
  return true;
}

export function sanitizeMathMl(input: string): SafeMathMlResult {
  const trimmed = input.trim();
  if (!trimmed)
    return { content: "", isSafeMathMl: false, rejectionReason: "empty" };
  if (/<!--|<!doctype|<!entity|<\?|<!\[cdata\[/i.test(trimmed)) {
    return reject(
      input,
      "declarations and processing instructions are not allowed",
    );
  }

  const tagPattern = /<\/?([A-Za-z][A-Za-z0-9]*)([^<>]*?)\/?>/g;
  const stack: string[] = [];
  let cursor = 0;
  let sawRoot = false;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(trimmed))) {
    const text = trimmed.slice(cursor, match.index);
    if (/[<>]/.test(text) || !entitiesAreSafe(text))
      return reject(input, "malformed XML content");

    const fullTag = match[0];
    const name = match[1].toLowerCase();
    const closing = fullTag.startsWith("</");
    const selfClosing = /\/>$/.test(fullTag);
    if (!SAFE_TAGS.has(name))
      return reject(input, `MathML tag <${name}> is not allowed`);
    if (!attributesAreSafe(match[2], name))
      return reject(input, `Unsafe or malformed attribute on <${name}>`);

    if (!sawRoot) {
      if (closing || name !== "math")
        return reject(input, "MathML must have a <math> root");
      sawRoot = true;
    }
    if (closing) {
      if (match[2].trim() || stack.pop() !== name)
        return reject(input, "mismatched MathML tags");
    } else if (!selfClosing) {
      stack.push(name);
    }
    cursor = tagPattern.lastIndex;
  }

  const tail = trimmed.slice(cursor);
  if (
    !sawRoot ||
    stack.length > 0 ||
    /[<>]/.test(tail) ||
    !entitiesAreSafe(tail)
  ) {
    return reject(input, "incomplete or malformed MathML");
  }
  return { content: trimmed, isSafeMathMl: true };
}
