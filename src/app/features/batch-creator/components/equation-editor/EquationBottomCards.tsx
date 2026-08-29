import React from "react";
import { Trash2 } from "lucide-react";
import katex from "katex";

export function EquationBottomCards() {
  const templates = [
    { name: "Quadratic Formula", latex: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}" },
    { name: "Binomial Theorem", latex: "(x + y)^n = \\sum_{k=0}^{n} \\binom{n}{k} x^{n-k} y^k" },
    { name: "Integrate by Parts", latex: "\\int u \\, dv = uv - \\int v \\, du" }
  ];

  const snippets = [
    { name: "Partial Derivative", latex: "\\frac{\\partial f}{\\partial x}" },
    { name: "Gradient", latex: "\\nabla f" },
    { name: "Taylor Series", latex: "f(x) = \\sum_{n=0}^{\\infty} \\frac{f^{(n)}(a)}{n!} (x-a)^n" }
  ];

  const recentlyUsed = [
    "\\frac{a}{b}",
    "\\sqrt{x^2 + y^2}",
    "\\sum_{i=1}^{n} i",
    "\\int_{0}^{\\infty} e^{-x} dx"
  ];

  const renderMath = (latex: string) => {
    try {
      return { __html: katex.renderToString(latex, { throwOnError: false }) };
    } catch {
      return { __html: latex };
    }
  };

  return (
    <div className="flex gap-6 p-6 bg-card border-t border-border">
      {/* Templates */}
      <div className="flex-1">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-[13px] font-semibold text-[var(--foreground)]">Templates</h3>
          <button className="text-[11px] font-medium text-primary hover:underline">View All</button>
        </div>
        <div className="space-y-3 text-xs">
          {templates.map((item, i) => (
            <div key={i} className="flex justify-between items-center group cursor-pointer hover:bg-muted p-1.5 -mx-1.5 rounded">
              <span className="text-muted-foreground">{item.name}</span>
              <span dangerouslySetInnerHTML={renderMath(item.latex)} />
            </div>
          ))}
        </div>
      </div>

      {/* Snippets */}
      <div className="flex-1 px-6 border-l border-r border-border">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-[13px] font-semibold text-[var(--foreground)]">Snippets</h3>
          <button className="text-[11px] font-medium text-primary hover:underline">View All</button>
        </div>
        <div className="space-y-3 text-xs">
          {snippets.map((item, i) => (
            <div key={i} className="flex justify-between items-center group cursor-pointer hover:bg-muted p-1.5 -mx-1.5 rounded">
              <span className="text-muted-foreground">{item.name}</span>
              <span dangerouslySetInnerHTML={renderMath(item.latex)} />
            </div>
          ))}
        </div>
      </div>

      {/* Recently Used */}
      <div className="flex-1">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-[13px] font-semibold text-[var(--foreground)]">Recently Used</h3>
        </div>
        <div className="space-y-3 text-xs">
          {recentlyUsed.map((latex, i) => (
            <div key={i} className="flex justify-between items-center group cursor-pointer hover:bg-muted p-1.5 -mx-1.5 rounded">
              <span className="font-mono text-muted-foreground truncate pr-4">{latex}</span>
              <button className="opacity-0 group-hover:opacity-100 text-muted-foreground/70 hover:text-red-500 transition-opacity">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
