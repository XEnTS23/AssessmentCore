import { StructureTemplate } from "../types/equation-editor.types";

export const STRUCTURE_DATA: StructureTemplate[] = [
  // ─── Fractions ─────────────────────────────────────────────
  { id: "frac", label: "Stacked Fraction", latex: "\\frac{#0}{#0}", category: "fractions" },
  { id: "dfrac", label: "Display Fraction", latex: "\\dfrac{#0}{#0}", category: "fractions" },
  { id: "tfrac", label: "Text Fraction", latex: "\\tfrac{#0}{#0}", category: "fractions" },
  { id: "cfrac", label: "Continued Fraction", latex: "\\cfrac{#0}{#0}", category: "fractions" },
  { id: "binom", label: "Binomial", latex: "\\binom{#0}{#0}", category: "fractions" },
  { id: "frac-diff", label: "Differential", latex: "\\frac{d#0}{d#0}", category: "fractions" },
  { id: "frac-partial", label: "Partial Derivative", latex: "\\frac{\\partial #0}{\\partial #0}", category: "fractions" },

  // ─── Scripts ───────────────────────────────────────────────
  { id: "superscript", label: "Superscript", latex: "#0^{#0}", category: "scripts" },
  { id: "subscript", label: "Subscript", latex: "#0_{#0}", category: "scripts" },
  { id: "subsup", label: "Sub + Superscript", latex: "#0_{#0}^{#0}", category: "scripts" },
  { id: "presub", label: "Prescript", latex: "{}_{#0}^{#0}#0", category: "scripts" },

  // ─── Radicals ──────────────────────────────────────────────
  { id: "sqrt", label: "Square Root", latex: "\\sqrt{#0}", category: "radicals" },
  { id: "cbrt", label: "Cube Root", latex: "\\sqrt[3]{#0}", category: "radicals" },
  { id: "nthrt", label: "nth Root", latex: "\\sqrt[#0]{#0}", category: "radicals" },

  // ─── Integrals ─────────────────────────────────────────────
  { id: "int", label: "Integral", latex: "\\int #0 \\,d#0", category: "integrals" },
  { id: "int-limits", label: "Definite Integral", latex: "\\int_{#0}^{#0} #0 \\,d#0", category: "integrals" },
  { id: "iint", label: "Double Integral", latex: "\\iint #0 \\,d#0\\,d#0", category: "integrals" },
  { id: "iiint", label: "Triple Integral", latex: "\\iiint #0 \\,d#0\\,d#0\\,d#0", category: "integrals" },
  { id: "oint", label: "Contour Integral", latex: "\\oint #0 \\,d#0", category: "integrals" },
  { id: "oint-limits", label: "Contour w/ Limits", latex: "\\oint_{#0} #0 \\,d#0", category: "integrals" },

  // ─── Large Operators ───────────────────────────────────────
  { id: "sum", label: "Summation", latex: "\\sum_{#0}^{#0} #0", category: "large-operators" },
  { id: "prod", label: "Product", latex: "\\prod_{#0}^{#0} #0", category: "large-operators" },
  { id: "coprod", label: "Coproduct", latex: "\\coprod_{#0}^{#0} #0", category: "large-operators" },
  { id: "bigcup", label: "Big Union", latex: "\\bigcup_{#0}^{#0} #0", category: "large-operators" },
  { id: "bigcap", label: "Big Intersection", latex: "\\bigcap_{#0}^{#0} #0", category: "large-operators" },
  { id: "bigvee", label: "Big Logical Or", latex: "\\bigvee_{#0}^{#0} #0", category: "large-operators" },
  { id: "bigwedge", label: "Big Logical And", latex: "\\bigwedge_{#0}^{#0} #0", category: "large-operators" },
  { id: "bigoplus", label: "Big Direct Sum", latex: "\\bigoplus_{#0}^{#0} #0", category: "large-operators" },

  // ─── Brackets & Delimiters ─────────────────────────────────
  { id: "paren", label: "Parentheses", latex: "\\left( #0 \\right)", category: "brackets" },
  { id: "bracket", label: "Square Brackets", latex: "\\left[ #0 \\right]", category: "brackets" },
  { id: "brace", label: "Braces", latex: "\\left\\{ #0 \\right\\}", category: "brackets" },
  { id: "angle", label: "Angle Brackets", latex: "\\left\\langle #0 \\right\\rangle", category: "brackets" },
  { id: "abs", label: "Absolute Value", latex: "\\left| #0 \\right|", category: "brackets" },
  { id: "norm", label: "Norm", latex: "\\left\\| #0 \\right\\|", category: "brackets" },
  { id: "floor", label: "Floor", latex: "\\left\\lfloor #0 \\right\\rfloor", category: "brackets" },
  { id: "ceil", label: "Ceiling", latex: "\\left\\lceil #0 \\right\\rceil", category: "brackets" },
  { id: "cases", label: "Cases", latex: "\\begin{cases} #0 & #0 \\\\ #0 & #0 \\end{cases}", category: "brackets" },

  // ─── Functions ─────────────────────────────────────────────
  { id: "sin", label: "sin", latex: "\\sin{#0}", category: "functions" },
  { id: "cos", label: "cos", latex: "\\cos{#0}", category: "functions" },
  { id: "tan", label: "tan", latex: "\\tan{#0}", category: "functions" },
  { id: "arcsin", label: "arcsin", latex: "\\arcsin{#0}", category: "functions" },
  { id: "arccos", label: "arccos", latex: "\\arccos{#0}", category: "functions" },
  { id: "arctan", label: "arctan", latex: "\\arctan{#0}", category: "functions" },
  { id: "log", label: "log", latex: "\\log{#0}", category: "functions" },
  { id: "log-base", label: "log with base", latex: "\\log_{#0}{#0}", category: "functions" },
  { id: "ln", label: "ln", latex: "\\ln{#0}", category: "functions" },
  { id: "exp", label: "exp", latex: "\\exp{#0}", category: "functions" },
  { id: "min", label: "min", latex: "\\min{#0}", category: "functions" },
  { id: "max", label: "max", latex: "\\max{#0}", category: "functions" },
  { id: "det", label: "det", latex: "\\det{#0}", category: "functions" },
  { id: "gcd", label: "gcd", latex: "\\gcd{#0}", category: "functions" },

  // ─── Accents ───────────────────────────────────────────────
  { id: "hat", label: "Hat", latex: "\\hat{#0}", category: "accents" },
  { id: "check", label: "Check", latex: "\\check{#0}", category: "accents" },
  { id: "tilde", label: "Tilde", latex: "\\tilde{#0}", category: "accents" },
  { id: "acute", label: "Acute", latex: "\\acute{#0}", category: "accents" },
  { id: "grave", label: "Grave", latex: "\\grave{#0}", category: "accents" },
  { id: "dot", label: "Dot", latex: "\\dot{#0}", category: "accents" },
  { id: "ddot", label: "Double Dot", latex: "\\ddot{#0}", category: "accents" },
  { id: "breve", label: "Breve", latex: "\\breve{#0}", category: "accents" },
  { id: "bar", label: "Bar", latex: "\\bar{#0}", category: "accents" },
  { id: "vec", label: "Vector Arrow", latex: "\\vec{#0}", category: "accents" },
  { id: "overline", label: "Overline", latex: "\\overline{#0}", category: "accents" },
  { id: "underline", label: "Underline", latex: "\\underline{#0}", category: "accents" },
  { id: "overbrace", label: "Overbrace", latex: "\\overbrace{#0}^{#0}", category: "accents" },
  { id: "underbrace", label: "Underbrace", latex: "\\underbrace{#0}_{#0}", category: "accents" },
  { id: "boxed", label: "Boxed", latex: "\\boxed{#0}", category: "accents" },
  { id: "cancel", label: "Cancel", latex: "\\cancel{#0}", category: "accents" },
  { id: "widehat", label: "Wide Hat", latex: "\\widehat{#0}", category: "accents" },
  { id: "widetilde", label: "Wide Tilde", latex: "\\widetilde{#0}", category: "accents" },

  // ─── Limits ────────────────────────────────────────────────
  { id: "lim", label: "Limit", latex: "\\lim_{#0 \\to #0} #0", category: "limits" },
  { id: "lim-inf", label: "Limit Inferior", latex: "\\liminf_{#0 \\to #0} #0", category: "limits" },
  { id: "lim-sup", label: "Limit Superior", latex: "\\limsup_{#0 \\to #0} #0", category: "limits" },
  { id: "sup", label: "Supremum", latex: "\\sup_{#0} #0", category: "limits" },
  { id: "inf", label: "Infimum", latex: "\\inf_{#0} #0", category: "limits" },

  // ─── Matrices ──────────────────────────────────────────────
  { id: "matrix-2x2", label: "2×2 Matrix", latex: "\\begin{pmatrix} #0 & #0 \\\\ #0 & #0 \\end{pmatrix}", category: "matrices" },
  { id: "matrix-3x3", label: "3×3 Matrix", latex: "\\begin{pmatrix} #0 & #0 & #0 \\\\ #0 & #0 & #0 \\\\ #0 & #0 & #0 \\end{pmatrix}", category: "matrices" },
  { id: "bmatrix-2x2", label: "2×2 [Matrix]", latex: "\\begin{bmatrix} #0 & #0 \\\\ #0 & #0 \\end{bmatrix}", category: "matrices" },
  { id: "vmatrix-2x2", label: "2×2 Determinant", latex: "\\begin{vmatrix} #0 & #0 \\\\ #0 & #0 \\end{vmatrix}", category: "matrices" },
  { id: "Bmatrix-2x2", label: "2×2 {Matrix}", latex: "\\begin{Bmatrix} #0 & #0 \\\\ #0 & #0 \\end{Bmatrix}", category: "matrices" },
  { id: "Vmatrix-2x2", label: "2×2 ‖Matrix‖", latex: "\\begin{Vmatrix} #0 & #0 \\\\ #0 & #0 \\end{Vmatrix}", category: "matrices" },
  { id: "cases-struct", label: "Piecewise Function", latex: "f(x) = \\begin{cases} #0 & \\text{if } #0 \\\\ #0 & \\text{if } #0 \\end{cases}", category: "matrices" },
  { id: "aligned", label: "Aligned Equations", latex: "\\begin{aligned} #0 &= #0 \\\\ #0 &= #0 \\end{aligned}", category: "matrices" },
  { id: "col-vector", label: "Column Vector", latex: "\\begin{pmatrix} #0 \\\\ #0 \\\\ #0 \\end{pmatrix}", category: "matrices" },
  { id: "augmented", label: "Augmented Matrix", latex: "\\left[\\begin{array}{cc|c} #0 & #0 & #0 \\\\ #0 & #0 & #0 \\end{array}\\right]", category: "matrices" },
];

/** Label map for display in UI */
export const STRUCTURE_CATEGORY_LABELS: Record<string, string> = {
  "fractions": "Fractions",
  "scripts": "Scripts",
  "radicals": "Radicals",
  "integrals": "Integrals",
  "large-operators": "Large Operators",
  "brackets": "Brackets",
  "functions": "Functions",
  "accents": "Accents",
  "limits": "Limits",
  "matrices": "Matrices",
};
