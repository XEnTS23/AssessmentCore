import { escapeXml } from "./xmlUtils";

export interface ProtectedAuthoringTableTags {
  content: string;
  tags: string[];
}

const AUTHORING_TABLE_TAG_RE =
  /<\/?(?:table|caption|colgroup|col|thead|tbody|tfoot|tr|th|td)\b[^>]*>/gi;

const TABLE_STYLE_RULES: Record<string, RegExp> = {
  "background-color": /^(?:#[0-9a-f]{3,8}|rgba?\([\d.%\s,]+\)|[a-z]+)$/i,
  "border-collapse": /^(?:collapse|separate)$/i,
  "border-color": /^(?:#[0-9a-f]{3,8}|rgba?\([\d.%\s,]+\)|[a-z]+)$/i,
  "border-style": /^(?:none|solid|dashed|dotted|double)$/i,
  "border-width": /^(?:0|\d+(?:\.\d+)?(?:px|em|rem)?)$/i,
  height: /^(?:auto|0|\d+(?:\.\d+)?(?:px|%|em|rem)?)$/i,
  padding:
    /^(?:0|\d+(?:\.\d+)?(?:px|em|rem)?)(?:\s+(?:0|\d+(?:\.\d+)?(?:px|em|rem)?)){0,3}$/i,
  "table-layout": /^(?:auto|fixed)$/i,
  "text-align": /^(?:left|right|center|justify|start|end)$/i,
  "vertical-align": /^(?:top|middle|bottom|baseline)$/i,
  width: /^(?:auto|0|\d+(?:\.\d+)?(?:px|%|em|rem)?)$/i,
};

function decodeEscapedXml(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function sanitizeTableStyle(value: string): string {
  return value
    .split(";")
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .map((declaration) => {
      const separator = declaration.indexOf(":");
      if (separator < 1) return "";
      const property = declaration.slice(0, separator).trim().toLowerCase();
      const propertyValue = declaration.slice(separator + 1).trim();
      const rule = TABLE_STYLE_RULES[property];
      return rule?.test(propertyValue) ? `${property}: ${propertyValue}` : "";
    })
    .filter(Boolean)
    .join("; ");
}

function sanitizePositiveInteger(value: string, maximum: number): string {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= maximum
    ? String(parsed)
    : "";
}

function sanitizeAuthoringTableTag(rawTag: string): string {
  const tagMatch = rawTag.match(/^<\s*(\/?)\s*([a-z]+)/i);
  if (!tagMatch) return "";

  const closing = Boolean(tagMatch[1]);
  const tag = tagMatch[2].toLowerCase();
  if (closing) return tag === "col" ? "" : `</${tag}>`;

  const attributes: string[] = [];
  const attributeSource = rawTag
    .slice(tagMatch[0].length)
    .replace(/\/?\s*>$/, "");
  const attributePattern =
    /([a-z][\w:-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/gi;
  let attributeMatch: RegExpExecArray | null;
  while ((attributeMatch = attributePattern.exec(attributeSource))) {
    const name = attributeMatch[1].toLowerCase();
    const value = decodeEscapedXml(
      attributeMatch[2] ?? attributeMatch[3] ?? attributeMatch[4] ?? "",
    );

    if (name === "style") {
      const style = sanitizeTableStyle(value);
      if (style) attributes.push(`style="${escapeXml(style)}"`);
      continue;
    }

    if (
      (name === "colspan" || name === "rowspan") &&
      (tag === "td" || tag === "th")
    ) {
      const span = sanitizePositiveInteger(value, 100);
      if (span) attributes.push(`${name}="${span}"`);
      continue;
    }

    if (name === "span" && (tag === "col" || tag === "colgroup")) {
      const span = sanitizePositiveInteger(value, 100);
      if (span) attributes.push(`span="${span}"`);
      continue;
    }

    if (name === "scope" && tag === "th") {
      const scope = value.toLowerCase();
      if (["row", "col", "rowgroup", "colgroup"].includes(scope)) {
        attributes.push(`scope="${scope}"`);
      }
      continue;
    }

    if (name === "border" && tag === "table") {
      const border = sanitizePositiveInteger(value, 10);
      if (border) attributes.push(`border="${border}"`);
    }
  }

  const serializedAttributes =
    attributes.length > 0 ? ` ${attributes.join(" ")}` : "";
  return tag === "col"
    ? `<col${serializedAttributes} />`
    : `<${tag}${serializedAttributes}>`;
}

export function protectAuthoringTableTags(
  value: string,
): ProtectedAuthoringTableTags {
  const tags: string[] = [];
  const unwrappedTableContainers = value.replace(
    /<div\b[^>]*>\s*(<table\b[\s\S]*?<\/table>)\s*<\/div>/gi,
    "$1",
  );
  const normalized = unwrappedTableContainers.replace(
    /<table\b[\s\S]*?<\/table>/gi,
    (tableMarkup) =>
      tableMarkup
        .replace(/>\s+</g, "><")
        .replace(/<(td|th)(\b[^>]*)>\s+/gi, "<$1$2>")
        .replace(/\s+<\/(td|th)>/gi, "</$1>"),
  );
  const content = normalized.replace(AUTHORING_TABLE_TAG_RE, (rawTag) => {
    const safeTag = sanitizeAuthoringTableTag(rawTag);
    if (!safeTag) return "";
    const index = tags.push(safeTag) - 1;
    return `AUTHORINGTABLETOKEN${index}END`;
  });
  return { content, tags };
}

export function restoreAuthoringTableTags(
  value: string,
  tags: string[],
): string {
  return value.replace(
    /AUTHORINGTABLETOKEN(\d+)END/g,
    (_match, index) => tags[Number(index)] || "",
  );
}
