// ─── XML Utilities (shared across all QTI builders) ────────────────────────

/**
 * Escape a string for safe embedding in XML text content or attribute values.
 */
export function escapeXml(unsafe: string | undefined | null): string {
  if (!unsafe) return "";
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return c;
    }
  });
}

/**
 * Convert HTML / XML formatted text into clean plain text.
 * Strips all HTML tags, decodes common entities, replaces non-breaking spaces,
 * and collapses consecutive whitespace.
 */
export function stripHtmlToPlainText(html: string | undefined | null): string {
  if (!html) return "";

  // 1. Remove script and style tags completely
  let clean = html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "");

  // 2. Replace all HTML / XML tags with spaces so adjacent text across tags doesn't merge
  clean = clean.replace(/<[^>]+>/g, " ");

  // 3. Decode common HTML entities
  clean = clean
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&(apos|#39);/gi, "'");

  // 4. Replace non-breaking spaces (\u00A0) and collapse whitespace runs
  clean = clean.replace(/[\s\u00A0]+/g, " ").trim();

  return clean;
}

/**
 * Convert item stem/text to a clean, untruncated plain-text title attribute value.
 * Strips HTML tags, removes truncation ellipsis, normalizes whitespace,
 * and XML-escapes the resulting plain text for attribute safety.
 */
export function xmlTitle(text: string | undefined | null): string {
  if (!text) return "";
  const plainText = stripHtmlToPlainText(text);
  return escapeXml(plainText);
}

/**
 * Sanitize XML content by replacing non-breaking space characters (\u00A0)
 * in indentation and whitespace outside text nodes with standard spaces (' ').
 * Strict XML parsers throw fatal errors on non-breaking spaces in indentation.
 */
export function sanitizeXmlSpaces(xml: string | undefined | null): string {
  if (!xml) return "";

  // Replace non-breaking spaces in line indentation and inter-element whitespace
  return xml
    .replace(/^[\s\u00A0]+/gm, (indent) => indent.replace(/\u00A0/g, " "))
    .replace(
      />([\s\u00A0]+)</g,
      (_match, whitespace) => ">" + whitespace.replace(/\u00A0/g, " ") + "<",
    );
}
