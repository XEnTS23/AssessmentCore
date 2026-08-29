import { escapeXml } from "./xmlUtils";
import { MathMode } from "../../core/exportTypes";
import { normalizePublicHttpUrl } from "../../security/publicUrlPolicy";
import { sanitizeMathMl } from "../../security/safeMathMl";
import {
  protectAuthoringTableTags,
  restoreAuthoringTableTags,
} from "./safeAuthoringTable";

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

const LATEX_RE =
  /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\[[\s\S]+?\\\]|\\\(.+?\\\))/g;
const MEDIA_RE = /\[MEDIA:(https?:\/\/[^|\]]+)(?:\|([^\]]*))?\]/g;

interface ProtectedAuthoringAssets {
  content: string;
  assets: string[];
}

const ASSET_STYLE_RULES: Record<string, RegExp> = {
  width: /^(?:auto|0|\d+(?:\.\d+)?(?:px|%|em|rem|vw|vh))$/i,
  height: /^(?:auto|0|\d+(?:\.\d+)?(?:px|%|em|rem|vw|vh))$/i,
  "min-width": /^(?:0|\d+(?:\.\d+)?(?:px|%|em|rem|vw|vh))$/i,
  "min-height": /^(?:0|\d+(?:\.\d+)?(?:px|%|em|rem|vw|vh))$/i,
  "max-width": /^(?:none|0|\d+(?:\.\d+)?(?:px|%|em|rem|vw|vh))$/i,
  "max-height": /^(?:none|0|\d+(?:\.\d+)?(?:px|%|em|rem|vw|vh))$/i,
  "border-radius":
    /^(?:0|\d+(?:\.\d+)?(?:px|%|em|rem))(?:\s+(?:0|\d+(?:\.\d+)?(?:px|%|em|rem))){0,3}$/i,
  "object-fit": /^(?:contain|cover|fill|none|scale-down)$/i,
  display: /^(?:block|inline|inline-block)$/i,
};

function readHtmlAttribute(attributes: string, name: string): string {
  const match = attributes.match(
    new RegExp(`${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i"),
  );
  return match ? decodeEscapedXml(match[2]) : "";
}

function normalizeAuthoredDimension(value: string): string {
  const trimmed = value.trim();
  if (/^\d+(?:\.\d+)?$/.test(trimmed)) return `${trimmed}px`;
  return ASSET_STYLE_RULES.width.test(trimmed) ? trimmed : "";
}

function sanitizeAssetStyle(
  attributes: string,
  kind: "image" | "audio" | "video",
): string {
  const declarations = new Map<string, string>();
  const authoredStyleProperties = new Set<string>();
  declarations.set("max-width", "100%");
  declarations.set("height", "auto");
  if (kind === "image") declarations.set("border-radius", "8px");

  for (const declaration of readHtmlAttribute(attributes, "style").split(";")) {
    const separator = declaration.indexOf(":");
    if (separator < 1) continue;
    const property = declaration.slice(0, separator).trim().toLowerCase();
    const value = declaration.slice(separator + 1).trim();
    const rule = ASSET_STYLE_RULES[property];
    if (rule?.test(value)) {
      declarations.set(property, value);
      authoredStyleProperties.add(property);
    }
  }

  for (const property of ["width", "height"] as const) {
    const authoredValue = normalizeAuthoredDimension(
      readHtmlAttribute(attributes, property),
    );
    if (authoredValue && !authoredStyleProperties.has(property)) {
      declarations.set(property, authoredValue);
    }
  }

  return Array.from(
    declarations,
    ([property, value]) => `${property}: ${value};`,
  ).join(" ");
}

function safeOptionalAttribute(
  attributes: string,
  name: string,
): string {
  const value = readHtmlAttribute(attributes, name).trim();
  return value ? ` ${name}="${escapeXml(value)}"` : "";
}

function protectAuthoringAssets(value: string): ProtectedAuthoringAssets {
  const assets: string[] = [];
  const content = value.replace(
    /<img\b([^>]*)\/?\s*>|<(audio|video)\b([^>]*)>[\s\S]*?<\/\2>|<a\b([^>]*)>([\s\S]*?)<\/a>/gi,
    (
      match,
      imageAttributes,
      mediaTag,
      mediaAttributes,
      linkAttributes,
      linkText,
    ) => {
      const attributes =
        imageAttributes || mediaAttributes || linkAttributes || "";
      const sourceAttribute = linkAttributes ? "href" : "src";
      const normalizedUrl = normalizePublicHttpUrl(
        readHtmlAttribute(attributes, sourceAttribute),
      );
      if (!normalizedUrl) return match;

      const description =
        readHtmlAttribute(attributes, imageAttributes ? "alt" : "aria-label") ||
        String(linkText || "Attached media")
          .replace(/<[^>]*>/g, "")
          .trim() ||
        "Attached media";
      let safeMarkup = "";
      if (imageAttributes) {
        const style = sanitizeAssetStyle(attributes, "image");
        safeMarkup = `<img src="${escapeXml(normalizedUrl)}" alt="${escapeXml(description)}"${safeOptionalAttribute(attributes, "title")} style="${escapeXml(style)}" />`;
      } else if (mediaTag) {
        const tag = mediaTag.toLowerCase() as "audio" | "video";
        const style = sanitizeAssetStyle(attributes, tag);
        const poster =
          tag === "video"
            ? normalizePublicHttpUrl(readHtmlAttribute(attributes, "poster"))
            : null;
        safeMarkup = `<${tag} controls="controls" src="${escapeXml(normalizedUrl)}" aria-label="${escapeXml(description)}"${safeOptionalAttribute(attributes, "title")}${poster ? ` poster="${escapeXml(poster)}"` : ""} style="${escapeXml(style)}"></${tag}>`;
      } else {
        safeMarkup = `<a href="${escapeXml(normalizedUrl)}" target="_blank" rel="noopener noreferrer"${safeOptionalAttribute(attributes, "title")}>${escapeXml(description)}</a>`;
      }
      const index = assets.push(safeMarkup) - 1;
      return `AUTHORINGASSETTOKEN${index}END`;
    },
  );
  return { content, assets };
}

function restoreAuthoringAssets(value: string, assets: string[]): string {
  return value.replace(
    /AUTHORINGASSETTOKEN(\d+)END/g,
    (_match, index) => assets[Number(index)] || "",
  );
}

function renderSafeFormatting(value: string): string {
  const fontFamilies: Record<string, string> = {
    sans: "Arial, Helvetica, sans-serif",
    serif: "Georgia, serif",
    mono: "Consolas, monospace",
  };
  const fontSizes: Record<string, string> = {
    small: "0.85em",
    normal: "1em",
    large: "1.2em",
  };

  return value
    .replace(/\[b\]([\s\S]*?)\[\/b\]/g, "<strong>$1</strong>")
    .replace(/\[i\]([\s\S]*?)\[\/i\]/g, "<em>$1</em>")
    .replace(/\[u\]([\s\S]*?)\[\/u\]/g, "<u>$1</u>")
    .replace(/\[code\]([\s\S]*?)\[\/code\]/g, "<code>$1</code>")
    .replace(
      /\[font=(sans|serif|mono)\]([\s\S]*?)\[\/font\]/g,
      (_match, font, content) =>
        `<span style="font-family: ${fontFamilies[font]}">${content}</span>`,
    )
    .replace(
      /\[size=(small|normal|large)\]([\s\S]*?)\[\/size\]/g,
      (_match, size, content) =>
        `<span style="font-size: ${fontSizes[size]}">${content}</span>`,
    )
    .replace(
      /\[link=(https?:\/\/[^\]]+)\]([\s\S]*?)\[\/link\]/g,
      (match, escapedUrl, content) => {
        const normalized = normalizePublicHttpUrl(decodeEscapedXml(escapedUrl));
        return normalized
          ? `<a href="${escapeXml(normalized)}" rel="noopener noreferrer">${content}</a>`
          : match;
      },
    )
    .replace(/\r?\n/g, "<br />");
}

function decodeEscapedXml(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/**
 * Convert a raw stem / option string to an XHTML-safe fragment.
 *
 * LaTeX delimiters ($…$, $$…$$, \(…\), \[…\]) are wrapped in a
 * <span class="math"> element so downstream LMS JavaScript can render them.
 *
 * The rest of the text is plain XML-escaped.
 */
export function renderRichContent(
  text: string | undefined | null,
  mathMode: MathMode,
  forPreview: boolean = false,
): string {
  if (!text) return "";

  // MathML mode: treat the whole value as opaque XML (no escaping at top level)
  if (mathMode === "mathml") {
    return sanitizeMathMl(text).content;
  }

  // LaTeX / mathjax: preserve sanitized authoring tables/assets, then render
  // cell text, regular text, and math through the same safe renderer.
  const protectedTables = protectAuthoringTableTags(text);
  const protectedAssets = protectAuthoringAssets(protectedTables.content);
  const parts = protectedAssets.content.split(LATEX_RE);
  const rendered = parts
    .map((part, i) => {
      if (LATEX_RE.test(part)) {
        // Reset lastIndex after test()
        LATEX_RE.lastIndex = 0;
        // For preview: emit raw LaTeX so MathJax can recognise delimiters.
        // For QTI XML export: wrap in <span class="math"> with XML-escaped content.
        return forPreview
          ? part
          : `<span class="math">${escapeXml(part)}</span>`;
      }
      // Reset lastIndex
      LATEX_RE.lastIndex = 0;
      let escaped = escapeXml(part);
      // Convert [MEDIA:url] into <img> tags
      escaped = escaped.replace(MEDIA_RE, (match, url, altText) => {
        const normalized = normalizePublicHttpUrl(decodeEscapedXml(url));
        if (!normalized) return match;
        const finalUrl = forPreview
          ? `${normalized}${normalized.includes("?") ? "&" : "?"}t=${Date.now()}`
          : normalized;
        return `<img src="${escapeXml(finalUrl)}" style="max-width: 100%; height: auto; border-radius: 8px;" alt="${altText || "Question Media"}" />`;
      });
      return escaped;
    })
    .join("");
  const formatted = renderSafeFormatting(rendered);
  return restoreAuthoringTableTags(
    restoreAuthoringAssets(
      decodeSafeHtmlTags(formatted),
      protectedAssets.assets,
    ),
    protectedTables.tags,
  );
}

function decodeSafeHtmlTags(html: string): string {
  return html
    .replace(
      /&lt;(b|i|u|p|br|span|mark|font|sup|sub|div)(\s[^>]*)?&gt;/gi,
      (match, tag, attrs) => {
        const decodedAttrs = attrs ? decodeEscapedXml(attrs) : "";
        return `<${tag}${decodedAttrs}>`;
      },
    )
    .replace(/&lt;\/(b|i|u|p|br|span|mark|font|sup|sub|div)&gt;/gi, "</$1>");
}

/**
 * Convenience: wrap content in a paragraph element.
 */
export function renderParagraph(
  text: string | undefined | null,
  mathMode: MathMode,
  forPreview: boolean = false,
): string {
  return `<p>${renderRichContent(text, mathMode, forPreview)}</p>`;
}
