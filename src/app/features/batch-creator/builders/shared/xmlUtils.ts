// ─── XML Utilities (shared across all QTI builders) ────────────────────────

/**
 * Escape a string for safe embedding in XML text content or attribute values.
 */
export function escapeXml(unsafe: string | undefined | null): string {
  if (!unsafe) return '';
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':  return '&lt;';
      case '>':  return '&gt;';
      case '&':  return '&amp;';
      case "'":  return '&apos;';
      case '"':  return '&quot;';
      default:   return c;
    }
  });
}

/**
 * Truncate a string to `max` characters and XML-escape it.
 * Useful for `title` attributes which should be concise.
 */
export function xmlTitle(text: string | undefined | null, max = 60): string {
  if (!text) return '';
  return escapeXml(text.length > max ? text.substring(0, max) + '…' : text);
}
