/**
 * LaTeX Exporter Utility
 *
 * Converts OCR results (questions with diagrams, LaTeX math, and spatial
 * metadata) into a standalone LaTeX document.
 *
 * Key features:
 *  - Dynamically injects `\usepackage{float}` into the preamble.
 *  - Wraps every diagram in `\begin{figure}[H] ... \end{figure}` to
 *    override the compiler's floating behaviour and enforce inline placement.
 *  - Sorts questions and their diagrams into reading order before emitting
 *    LaTeX so the visual order in the compiled PDF matches the page layout.
 */

import type { OCRResult, OCRQuestion } from "../../services/ocrService";
import { sortByReadingOrder } from "./spatialMediaMapper";

// ── Public API ──────────────────────────────────────────────────────────────────

/**
 * Generate a complete, compilable LaTeX document from OCR results.
 *
 * @param results  Array of filename+OCRResult pairs (same shape as the
 *                 OCRProcessor component's `results` state).
 * @returns A UTF-8 string containing the full `.tex` source.
 */
export function generateLatexDocument(
  results: Array<{ filename: string; data: OCRResult }>,
): string {
  const preamble = buildPreamble();
  const body = results
    .map((res) => buildPageSection(res.filename, res.data))
    .join("\n\n");

  return `${preamble}

\\begin{document}

${body}

\\end{document}
`;
}

// ── Internal Helpers ────────────────────────────────────────────────────────────

function buildPreamble(): string {
  return `\\documentclass[12pt,a4paper]{article}

% ── Encoding & Language ──────────────────────────────────────────────────────
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{lmodern}

% ── Math ─────────────────────────────────────────────────────────────────────
\\usepackage{amsmath}
\\usepackage{amssymb}

% ── Graphics ─────────────────────────────────────────────────────────────────
\\usepackage{graphicx}

% ── CRITICAL: Float override for strict inline placement ─────────────────────
\\usepackage{float}

% ── Layout ───────────────────────────────────────────────────────────────────
\\usepackage[margin=1in]{geometry}
\\usepackage{enumitem}
\\usepackage{hyperref}

\\title{OCR Extracted Assessment}
\\date{\\today}`;
}

/**
 * Build a LaTeX section for a single source page/file.
 */
function buildPageSection(filename: string, data: OCRResult): string {
  const questions = data.questions ?? [];
  if (questions.length === 0) {
    return `\\section*{${escapeLatex(filename)}}
\\textit{No questions detected on this page.}`;
  }

  // Sort questions into reading order using spatial metadata
  const sortedIndices = sortByReadingOrder(
    questions.map((q, idx) => ({
      index: idx,
      y_min: q.stem_box?.[0] ?? idx / questions.length,
      x_min: q.stem_box?.[1] ?? 0,
    })),
  );

  const questionBlocks = sortedIndices.map((el, displayIdx) => {
    const q = questions[el.index];
    return buildQuestionBlock(q, displayIdx + 1);
  });

  return `\\section*{${escapeLatex(filename)}}

${questionBlocks.join("\n\n\\bigskip\n\\hrule\n\\bigskip\n\n")}`;
}

/**
 * Build a single question block with its stem, diagrams, and options.
 */
function buildQuestionBlock(q: OCRQuestion, displayNumber: number): string {
  const parts: string[] = [];

  // ── Stem ────────────────────────────────────────────────────────────────────
  const cleanStem = stripMediaTag(q.stem || "");
  parts.push(
    `\\noindent\\textbf{Q${displayNumber}.} ${convertStemToLatex(cleanStem)}`,
  );

  // ── Diagrams (strict inline placement with [H]) ─────────────────────────────
  const diagrams = q.diagrams ?? [];
  for (const diagram of diagrams) {
    const imageUrl = diagram.url || "";
    if (!imageUrl) continue;

    const caption = escapeLatex(diagram.description || "Diagram");
    parts.push(buildFigureH(imageUrl, caption));
  }

  // Also handle media_url if present and not already covered by diagrams
  if (q.media_url && !diagrams.some((d) => d.url === q.media_url)) {
    parts.push(buildFigureH(q.media_url, "Diagram"));
  }

  // Handle media URLs from the media_urls array
  if (q.media_urls) {
    for (const url of q.media_urls) {
      if (url && !diagrams.some((d) => d.url === url) && url !== q.media_url) {
        parts.push(buildFigureH(url, "Diagram"));
      }
    }
  }

  // ── Options ─────────────────────────────────────────────────────────────────
  if (q.options && q.options.length > 0) {
    const optionItems = q.options.map((opt, idx) => {
      const label = String.fromCharCode(65 + idx); // A, B, C, D...
      const cleanOpt = stripMediaTag(opt || "");
      return `  \\item[${label}.] ${convertStemToLatex(cleanOpt)}`;
    });

    parts.push(`\\begin{enumerate}[label=\\Alph*., leftmargin=2em]
${optionItems.join("\n")}
\\end{enumerate}`);
  }

  return parts.join("\n\n");
}

/**
 * Build a `\begin{figure}[H]` block with strict inline placement.
 *
 * The `[H]` specifier from the `float` package completely overrides the
 * compiler's floating behaviour and forces the diagram to stay exactly
 * where the sorting algorithm placed it.
 */
function buildFigureH(imageSource: string, caption: string): string {
  // For URLs we use the raw path; for local files we'd use just the filename
  const includePath = escapeLatex(imageSource);

  return `\\begin{figure}[H]
  \\centering
  \\includegraphics[max width=0.9\\textwidth]{${includePath}}
  \\caption{${caption}}
\\end{figure}`;
}

// ── Text Processing ─────────────────────────────────────────────────────────────

/**
 * Strip `[MEDIA:url]` tags that the Edge Function injects into stems/options.
 */
function stripMediaTag(text: string): string {
  return text.replace(/\s*\[MEDIA:[^\]]*\]/g, "").trim();
}

/**
 * Convert OCR stem text (which may already contain LaTeX math delimiters
 * like `$...$` or `$$...$$`) into LaTeX-safe text.
 *
 * We preserve `$...$` and `$$...$$` as-is (they are valid LaTeX) and only
 * escape special characters in the non-math portions.
 */
function convertStemToLatex(text: string): string {
  if (!text) return "";

  // Split into math and non-math segments.
  // This regex matches $$ ... $$ (display math) and $ ... $ (inline math).
  const segments: string[] = [];
  let remaining = text;

  // Process display math first ($$...$$)
  const displayMathRegex = /\$\$([\s\S]*?)\$\$/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Collect all math segments with their positions
  const mathSegments: Array<{ start: number; end: number; content: string }> =
    [];

  while ((match = displayMathRegex.exec(text)) !== null) {
    mathSegments.push({
      start: match.index,
      end: match.index + match[0].length,
      content: match[0],
    });
  }

  // Process inline math ($...$) — but skip positions already covered by display math
  const inlineMathRegex = /\$([^$]+?)\$/g;
  while ((match = inlineMathRegex.exec(text)) !== null) {
    const overlaps = mathSegments.some(
      (seg) => match!.index >= seg.start && match!.index < seg.end,
    );
    if (!overlaps) {
      mathSegments.push({
        start: match.index,
        end: match.index + match[0].length,
        content: match[0],
      });
    }
  }

  // Sort by position
  mathSegments.sort((a, b) => a.start - b.start);

  // Build output: escape non-math, preserve math
  lastIndex = 0;
  for (const seg of mathSegments) {
    if (seg.start > lastIndex) {
      segments.push(escapeLatex(text.slice(lastIndex, seg.start)));
    }
    segments.push(seg.content); // Math — keep as-is
    lastIndex = seg.end;
  }
  if (lastIndex < text.length) {
    segments.push(escapeLatex(text.slice(lastIndex)));
  }

  return segments.join("");
}

/**
 * Escape LaTeX special characters in plain text.
 * Does NOT escape `$` since we handle math delimiters separately.
 */
function escapeLatex(text: string): string {
  if (!text) return "";
  return text
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/[&%#_{}]/g, (ch) => `\\${ch}`)
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}
