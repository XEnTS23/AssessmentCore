import { BuiltInEquation } from "../types/equation-editor.types";

export const BUILTIN_EQUATIONS: BuiltInEquation[] = [
  {
    id: "quadratic",
    name: "Quadratic Formula",
    latex: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}",
    category: "Algebra",
  },
  {
    id: "binomial",
    name: "Binomial Theorem",
    latex: "(x + y)^n = \\sum_{k=0}^{n} \\binom{n}{k} x^{n-k} y^k",
    category: "Algebra",
  },
  {
    id: "pythagorean",
    name: "Pythagorean Theorem",
    latex: "a^2 + b^2 = c^2",
    category: "Geometry",
  },
  {
    id: "circle-area",
    name: "Area of a Circle",
    latex: "A = \\pi r^2",
    category: "Geometry",
  },
  {
    id: "fourier",
    name: "Fourier Series",
    latex: "f(x) = \\frac{a_0}{2} + \\sum_{n=1}^{\\infty} \\left( a_n \\cos\\frac{n\\pi x}{L} + b_n \\sin\\frac{n\\pi x}{L} \\right)",
    category: "Analysis",
  },
  {
    id: "taylor",
    name: "Taylor Expansion",
    latex: "f(x) = \\sum_{n=0}^{\\infty} \\frac{f^{(n)}(a)}{n!} (x - a)^n",
    category: "Analysis",
  },
  {
    id: "cauchy-schwarz",
    name: "Cauchy–Schwarz Inequality",
    latex: "\\left| \\sum_{i=1}^{n} a_i b_i \\right|^2 \\leq \\left( \\sum_{i=1}^{n} a_i^2 \\right) \\left( \\sum_{i=1}^{n} b_i^2 \\right)",
    category: "Analysis",
  },
  {
    id: "std-dev",
    name: "Standard Deviation",
    latex: "\\sigma = \\sqrt{\\frac{1}{N} \\sum_{i=1}^{N} (x_i - \\mu)^2}",
    category: "Statistics",
  },
  {
    id: "newton",
    name: "Newton's Second Law",
    latex: "\\vec{F} = m\\vec{a}",
    category: "Physics",
  },
  {
    id: "euler",
    name: "Euler's Identity",
    latex: "e^{i\\pi} + 1 = 0",
    category: "Analysis",
  },
];
