import { describe, it, expect } from "vitest";
import { buildMatrixLatex, parseMatrixLatex, buildMatrixElementHtml } from "./MatrixModal";

describe("buildMatrixLatex Helper", () => {
  it("generates standard inline bmatrix LaTeX for 2x2 grid", () => {
    const cells = [
      ["a", "b"],
      ["c", "d"],
    ];
    const latex = buildMatrixLatex(cells, 2, 2, "bmatrix", true, false);
    expect(latex).toBe("$\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}$");
  });

  it("generates inline vmatrix LaTeX for 2x2 determinant", () => {
    const cells = [
      ["1", "2"],
      ["3", "4"],
    ];
    const latex = buildMatrixLatex(cells, 2, 2, "vmatrix", true, false);
    expect(latex).toBe("$\\begin{vmatrix} 1 & 2 \\\\ 3 & 4 \\end{vmatrix}$");
  });

  it("generates row vector (1x3) LaTeX", () => {
    const cells = [["x_1", "x_2", "x_3"]];
    const latex = buildMatrixLatex(cells, 1, 3, "bmatrix", true, false);
    expect(latex).toBe("$\\begin{bmatrix} x_1 & x_2 & x_3 \\end{bmatrix}$");
  });

  it("generates column vector (3x1) LaTeX", () => {
    const cells = [["y_1"], ["y_2"], ["y_3"]];
    const latex = buildMatrixLatex(cells, 3, 1, "bmatrix", true, false);
    expect(latex).toBe("$\\begin{bmatrix} y_1 \\\\ y_2 \\\\ y_3 \\end{bmatrix}$");
  });

  it("applies transpose superscript when isTranspose is true", () => {
    const cells = [
      ["1", "0"],
      ["0", "1"],
    ];
    const latex = buildMatrixLatex(cells, 2, 2, "bmatrix", true, true);
    expect(latex).toBe("$\\begin{bmatrix} 1 & 0 \\\\ 0 & 1 \\end{bmatrix}^{T}$");
  });

  it("generates display mode LaTeX when isInline is false", () => {
    const cells = [["a"]];
    const latex = buildMatrixLatex(cells, 1, 1, "matrix", false, false);
    expect(latex).toBe("$$\\begin{matrix} a \\end{matrix}$$");
  });
});

describe("parseMatrixLatex Parser", () => {
  it("parses standard inline bmatrix LaTeX string", () => {
    const input = "$\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}$";
    const parsed = parseMatrixLatex(input);

    expect(parsed).not.toBeNull();
    expect(parsed?.style).toBe("bmatrix");
    expect(parsed?.rows).toBe(2);
    expect(parsed?.cols).toBe(2);
    expect(parsed?.cells).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
    expect(parsed?.isInline).toBe(true);
    expect(parsed?.isTranspose).toBe(false);
  });

  it("parses 2x2 determinant (vmatrix)", () => {
    const input = "$\\begin{vmatrix} 1 & 2 \\\\ 3 & 4 \\end{vmatrix}$";
    const parsed = parseMatrixLatex(input);

    expect(parsed).not.toBeNull();
    expect(parsed?.style).toBe("vmatrix");
    expect(parsed?.rows).toBe(2);
    expect(parsed?.cols).toBe(2);
    expect(parsed?.cells).toEqual([
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  it("parses transpose matrix with ^{T} superscript", () => {
    const input = "$\\begin{bmatrix} 1 & 0 \\\\ 0 & 1 \\end{bmatrix}^{T}$";
    const parsed = parseMatrixLatex(input);

    expect(parsed).not.toBeNull();
    expect(parsed?.style).toBe("bmatrix");
    expect(parsed?.isTranspose).toBe(true);
  });

  it("parses display mode matrix ($$...$$)", () => {
    const input = "$$\\begin{pmatrix} x_1 & x_2 \\end{pmatrix}$$";
    const parsed = parseMatrixLatex(input);

    expect(parsed).not.toBeNull();
    expect(parsed?.style).toBe("pmatrix");
    expect(parsed?.isInline).toBe(false);
    expect(parsed?.rows).toBe(1);
    expect(parsed?.cols).toBe(2);
    expect(parsed?.cells).toEqual([["x_1", "x_2"]]);
  });

  it("returns null for non-matrix input", () => {
    expect(parseMatrixLatex("plain text")).toBeNull();
  });
});

describe("buildMatrixElementHtml", () => {
  it("wraps matrix in a span with data-matrix and data-latex attributes", () => {
    const latex = "$\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}$";
    const html = buildMatrixElementHtml(latex);

    expect(html).toContain('data-matrix="true"');
    expect(html).toContain('data-latex="');
    expect(html).toContain("Double-click to edit matrix");
  });
});
