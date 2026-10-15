import { describe, expect, it } from "vitest";
import {
  appendRichContent,
  canonicalizeEditorMathMarkup,
  createMediaMarker,
  extractMathReferences,
  normalizeLatexForInsertion,
} from "./richContentEditing";

describe("rich-content editing helpers", () => {
  it("wraps raw LaTeX while preserving already valid delimiters", () => {
    expect(normalizeLatexForInsertion("\\frac{1}{2}", false)).toBe(
      "$\\frac{1}{2}$",
    );
    expect(normalizeLatexForInsertion("x^2 + y^2", true)).toBe(
      "\\[x^2 + y^2\\]",
    );
    expect(normalizeLatexForInsertion("$x+1$", false)).toBe("$x+1$");
    expect(normalizeLatexForInsertion("\\(x+1$", false)).toBe("$x+1$");
  });

  it("appends rich content without damaging existing whitespace", () => {
    expect(appendRichContent("Question text", "$x+1$")).toBe(
      "Question text\n$x+1$",
    );
    expect(appendRichContent("", "$x+1$")).toBe("$x+1$");
  });

  it("creates the existing portable media marker format", () => {
    expect(createMediaMarker(" https://example.com/graph.png ")).toBe(
      "[MEDIA:https://example.com/graph.png]",
    );
    expect(
      createMediaMarker("https://example.com/graph.png", "Quadratic graph"),
    ).toBe("[MEDIA:https://example.com/graph.png|Quadratic graph]");
  });

  it("extracts inline and display math but does not treat currency as math", () => {
    const references = extractMathReferences([
      "Use $x^2$ and \\[\\frac{1}{2}\\].",
      "The price ranges from $5 to $10.",
    ]);

    expect(references).toHaveLength(2);
    expect(references.map((reference) => reference.format)).toEqual([
      "inline",
      "block",
    ]);
    expect(references.map((reference) => reference.normalizedLatex)).toEqual([
      "x^2",
      "\\frac{1}{2}",
    ]);
  });

  it("serializes nested KaTeX equation widgets to canonical delimiters", () => {
    const inline =
      '<span class="math-inline" data-math-rendered="true" data-latex="\\frac{1}{2}">' +
      '<span class="katex"><span class="katex-mathml"><math><mfrac /></math></span>' +
      '<span class="katex-html"><span>1/2</span></span></span></span>';
    const display =
      '<span data-latex="x^2 + y^2" data-math-rendered="true" class="math-display">' +
      '<span><span><math>x</math></span></span></span>';

    expect(
      canonicalizeEditorMathMarkup(`Find ${inline}, then use ${display}.`),
    ).toBe("Find $\\frac{1}{2}$, then use \\[x^2 + y^2\\].");
  });

  it("decodes LaTeX attributes and does not double-wrap matrix delimiters", () => {
    const matrix =
      '<span data-matrix="true" data-latex="$\\begin{matrix}a &amp; b\\end{matrix}$">' +
      "rendered matrix</span>";

    expect(canonicalizeEditorMathMarkup(matrix)).toBe(
      "$\\begin{matrix}a & b\\end{matrix}$",
    );
  });

  it("leaves genuine unsupported MathML and malformed editor markup untouched", () => {
    const mathMl = "<math><mi>x</mi></math>";
    const unclosed =
      '<span data-math-rendered="true" data-latex="x+1"><span>preview';

    expect(canonicalizeEditorMathMarkup(mathMl)).toBe(mathMl);
    expect(canonicalizeEditorMathMarkup(unclosed)).toBe(unclosed);
  });
});
