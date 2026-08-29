import { EquationSymbol } from "../types/equation-editor.types";

export const SYMBOLS: EquationSymbol[] = [
  // --- BASIC TAB ---
  // Basic
  { id: "x", category: "basic", subCategory: "Basic", label: "x", latex: "x", insertion: { type: "text", value: "x" } },
  { id: "y", category: "basic", subCategory: "Basic", label: "y", latex: "y", insertion: { type: "text", value: "y" } },
  { id: "z", category: "basic", subCategory: "Basic", label: "z", latex: "z", insertion: { type: "text", value: "z" } },
  { id: "a", category: "basic", subCategory: "Basic", label: "a", latex: "a", insertion: { type: "text", value: "a" } },
  { id: "b", category: "basic", subCategory: "Basic", label: "b", latex: "b", insertion: { type: "text", value: "b" } },
  { id: "c", category: "basic", subCategory: "Basic", label: "c", latex: "c", insertion: { type: "text", value: "c" } },
  { id: "alpha-b", category: "basic", subCategory: "Basic", label: "α", latex: "\\alpha", insertion: { type: "text", value: "\\alpha" } },
  { id: "beta-b", category: "basic", subCategory: "Basic", label: "β", latex: "\\beta", insertion: { type: "text", value: "\\beta" } },
  { id: "gamma-b", category: "basic", subCategory: "Basic", label: "γ", latex: "\\gamma", insertion: { type: "text", value: "\\gamma" } },
  { id: "theta-b", category: "basic", subCategory: "Basic", label: "θ", latex: "\\theta", insertion: { type: "text", value: "\\theta" } },
  { id: "pi-b", category: "basic", subCategory: "Basic", label: "π", latex: "\\pi", insertion: { type: "text", value: "\\pi" } },
  { id: "e-b", category: "basic", subCategory: "Basic", label: "e", latex: "e", insertion: { type: "text", value: "e" } },
  { id: "i-b", category: "basic", subCategory: "Basic", label: "i", latex: "i", insertion: { type: "text", value: "i" } },
  { id: "infinity-b", category: "basic", subCategory: "Basic", label: "∞", latex: "\\infty", insertion: { type: "text", value: "\\infty" } },
  
  // Operators
  { id: "plus-b", category: "basic", subCategory: "Operators", label: "+", latex: "+", insertion: { type: "text", value: "+" } },
  { id: "minus-b", category: "basic", subCategory: "Operators", label: "−", latex: "-", insertion: { type: "text", value: "-" } },
  { id: "pm-b", category: "basic", subCategory: "Operators", label: "±", latex: "\\pm", insertion: { type: "text", value: "\\pm" } },
  { id: "times-b", category: "basic", subCategory: "Operators", label: "×", latex: "\\times", insertion: { type: "text", value: "\\times" } },
  { id: "div-b", category: "basic", subCategory: "Operators", label: "÷", latex: "\\div", insertion: { type: "text", value: "\\div" } },
  { id: "cdot-b", category: "basic", subCategory: "Operators", label: "·", latex: "\\cdot", insertion: { type: "text", value: "\\cdot" } },
  
  // Relations
  { id: "eq-b", category: "basic", subCategory: "Relations", label: "=", latex: "=", insertion: { type: "text", value: "=" } },
  { id: "neq-b", category: "basic", subCategory: "Relations", label: "≠", latex: "\\neq", insertion: { type: "text", value: "\\neq" } },
  { id: "lt-b", category: "basic", subCategory: "Relations", label: "<", latex: "<", insertion: { type: "text", value: "<" } },
  { id: "gt-b", category: "basic", subCategory: "Relations", label: ">", latex: ">", insertion: { type: "text", value: ">" } },
  { id: "leq-b", category: "basic", subCategory: "Relations", label: "≤", latex: "\\leq", insertion: { type: "text", value: "\\leq" } },
  { id: "geq-b", category: "basic", subCategory: "Relations", label: "≥", latex: "\\geq", insertion: { type: "text", value: "\\geq" } },
  { id: "approx-b", category: "basic", subCategory: "Relations", label: "≈", latex: "\\approx", insertion: { type: "text", value: "\\approx" } },
  { id: "sim-b", category: "basic", subCategory: "Relations", label: "∼", latex: "\\sim", insertion: { type: "text", value: "\\sim" } },
  
  // Arrows
  { id: "rightarrow-b", category: "basic", subCategory: "Arrows", label: "→", latex: "\\rightarrow", insertion: { type: "text", value: "\\rightarrow" } },
  { id: "leftarrow-b", category: "basic", subCategory: "Arrows", label: "←", latex: "\\leftarrow", insertion: { type: "text", value: "\\leftarrow" } },
  { id: "leftrightarrow-b", category: "basic", subCategory: "Arrows", label: "↔", latex: "\\leftrightarrow", insertion: { type: "text", value: "\\leftrightarrow" } },
  { id: "Rightarrow-b", category: "basic", subCategory: "Arrows", label: "⇒", latex: "\\Rightarrow", insertion: { type: "text", value: "\\Rightarrow" } },
  { id: "Leftarrow-b", category: "basic", subCategory: "Arrows", label: "⇐", latex: "\\Leftarrow", insertion: { type: "text", value: "\\Leftarrow" } },
  
  // Common Structures
  { id: "fraction", category: "basic", subCategory: "Common Structures", label: "Fraction", latex: "\\frac{a}{b}", insertion: { type: "template", value: "\\frac{${1:numerator}}{${2:denominator}}", placeholders: ["numerator", "denominator"] } },
  { id: "superscript", category: "basic", subCategory: "Common Structures", label: "Superscript", latex: "a^b", insertion: { type: "template", value: "{${1:base}}^{${2:power}}", placeholders: ["base", "power"] } },
  { id: "subscript", category: "basic", subCategory: "Common Structures", label: "Subscript", latex: "a_b", insertion: { type: "template", value: "{${1:base}}_{${2:subscript}}", placeholders: ["base", "subscript"] } },
  { id: "sqrt", category: "basic", subCategory: "Common Structures", label: "Square Root", latex: "\\sqrt{a}", insertion: { type: "template", value: "\\sqrt{${1:value}}", placeholders: ["value"] } },
  { id: "integral", category: "basic", subCategory: "Common Structures", label: "Integral", latex: "\\int_a^b", insertion: { type: "template", value: "\\int_{${1:a}}^{${2:b}} ${3:expr} dx", placeholders: ["a", "b", "expr"] } },
  { id: "summation", category: "basic", subCategory: "Common Structures", label: "Sum", latex: "\\sum_{i=1}^n", insertion: { type: "template", value: "\\sum_{${1:i=1}}^{${2:n}} ${3:expr}", placeholders: ["i=1", "n", "expr"] } },
  { id: "product", category: "basic", subCategory: "Common Structures", label: "Product", latex: "\\prod_{i=1}^n", insertion: { type: "template", value: "\\prod_{${1:i=1}}^{${2:n}} ${3:expr}", placeholders: ["i=1", "n", "expr"] } },
  { id: "limit", category: "basic", subCategory: "Common Structures", label: "Limit", latex: "\\lim_{x \\to a}", insertion: { type: "template", value: "\\lim_{${1:x} \\to ${2:a}} ${3:expr}", placeholders: ["x", "a", "expr"] } },
  { id: "matrix", category: "basic", subCategory: "Common Structures", label: "Matrix", latex: "\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}", insertion: { type: "template", value: "\\begin{bmatrix} ${1:a} & ${2:b} \\\\ ${3:c} & ${4:d} \\end{bmatrix}", placeholders: ["a", "b", "c", "d"] } },

  // --- GREEK TAB ---
  { id: "alpha", category: "greek", subCategory: "Greek Letters", label: "α", latex: "\\alpha", insertion: { type: "text", value: "\\alpha" } },
  { id: "beta", category: "greek", subCategory: "Greek Letters", label: "β", latex: "\\beta", insertion: { type: "text", value: "\\beta" } },
  { id: "gamma", category: "greek", subCategory: "Greek Letters", label: "γ", latex: "\\gamma", insertion: { type: "text", value: "\\gamma" } },
  { id: "theta", category: "greek", subCategory: "Greek Letters", label: "θ", latex: "\\theta", insertion: { type: "text", value: "\\theta" } },
  { id: "delta", category: "greek", subCategory: "Greek Letters", label: "Δ", latex: "\\Delta", insertion: { type: "text", value: "\\Delta" } },
  { id: "mu", category: "greek", subCategory: "Greek Letters", label: "μ", latex: "\\mu", insertion: { type: "text", value: "\\mu" } },
  { id: "sigma", category: "greek", subCategory: "Greek Letters", label: "σ", latex: "\\sigma", insertion: { type: "text", value: "\\sigma" } },
  { id: "omega", category: "greek", subCategory: "Greek Letters", label: "Ω", latex: "\\Omega", insertion: { type: "text", value: "\\Omega" } },

];
