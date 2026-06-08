import { escapeXml } from './xmlUtils';
import { MathMode } from '../../core/exportTypes';

// ─── Rich-Content / Math renderer (shared) ─────────────────────────────────
//
// This module is the single place where stem / option text is converted to
// the XML fragment that goes inside an item body.  Both QTI 2.1 and 3.0
// embed the same XHTML-compatible inline content, so they share this helper.
//
// Current approach:
//   • LaTeX  → emitted as a <span> with a data attribute so a MathJax/KaTeX
//              runtime in the LMS can render it.  The raw LaTeX is XML-escaped.
//   • MathML → assumed to already be valid XML; we pass it through verbatim.
//              (A full MathML parser is out of scope for this builder.)
//   • mathjax → treated identically to latex (same pass-through).
//
// "Do not destroy code/math/formula content" – per project rule, we never
// discard mathematical expressions; we always preserve them in some form.

const LATEX_RE = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\[[\s\S]+?\\\]|\\\(.+?\\\))/g;
const MEDIA_RE = /\[MEDIA:(https?:\/\/[^\]]+)\]/g;

/**
 * Convert a raw stem / option string to an XHTML-safe fragment.
 *
 * LaTeX delimiters ($…$, $$…$$, \(…\), \[…\]) are wrapped in a
 * <span class="math"> element so downstream LMS JavaScript can render them.
 *
 * The rest of the text is plain XML-escaped.
 */
export function renderRichContent(text: string | undefined | null, mathMode: MathMode, forPreview: boolean = false): string {
  if (!text) return '';

  // MathML mode: treat the whole value as opaque XML (no escaping at top level)
  if (mathMode === 'mathml') {
    // We can't safely parse MathML here, so return as-is and let the validator catch it.
    return text;
  }

  // LaTeX / mathjax: wrap detected math spans, escape plain text
  const parts = text.split(LATEX_RE);
  return parts.map((part, i) => {
    if (LATEX_RE.test(part)) {
      // Reset lastIndex after test()
      LATEX_RE.lastIndex = 0;
      return `<span class="math">${escapeXml(part)}</span>`;
    }
    // Reset lastIndex
    LATEX_RE.lastIndex = 0;
    let escaped = escapeXml(part);
    // Convert [MEDIA:url] into <img> tags
    escaped = escaped.replace(MEDIA_RE, (match, url) => {
      // The url inside might have been XML-escaped by the browser, but escapeXml(part) already did it if it was raw text.
      // We shouldn't double-escape, so since escapeXml runs on `part`, the url inside match is now escaped.
      // Wait, MEDIA_RE runs on the ALREADY escaped string.
      const finalUrl = forPreview ? `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}` : url;
      return `<img src="${finalUrl}" style="max-width: 100%; height: auto; border-radius: 8px;" alt="Question Media" />`;
    });
    return escaped;
  }).join('');
}

/**
 * Convenience: wrap content in a paragraph element.
 */
export function renderParagraph(text: string | undefined | null, mathMode: MathMode, forPreview: boolean = false): string {
  return `<p>${renderRichContent(text, mathMode, forPreview)}</p>`;
}
