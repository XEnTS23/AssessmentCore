import React from "react";
import { EquationCategory, EquationSubCategory, EquationSymbol } from "./types/equation-editor.types";
import { SYMBOLS } from "./data/symbols";
import katex from "katex";

interface Props {
  activeCategory: EquationCategory;
  onInsertSymbol: (symbol: EquationSymbol) => void;
}

export function SymbolPalette({ activeCategory, onInsertSymbol }: Props) {
  // Group symbols by subCategory for the active category
  const symbolsForCategory = SYMBOLS.filter(s => s.category === activeCategory);
  
  const groupedSymbols = symbolsForCategory.reduce((acc, symbol) => {
    if (!acc[symbol.subCategory]) {
      acc[symbol.subCategory] = [];
    }
    acc[symbol.subCategory].push(symbol);
    return acc;
  }, {} as Record<EquationSubCategory, EquationSymbol[]>);

  const subCategories = Object.keys(groupedSymbols) as EquationSubCategory[];

  if (symbolsForCategory.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground bg-card h-full">
        More symbols coming soon...
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 bg-card overflow-y-auto">
      {subCategories.map((subCat) => (
        <div key={subCat} className="mb-6 last:mb-0">
          <h4 className="text-xs font-medium text-muted-foreground mb-3">{subCat}</h4>
          <div className="flex flex-wrap gap-2">
            {groupedSymbols[subCat].map((symbol) => {
              // Try to render the latex as HTML for the button
              let html = "";
              try {
                html = katex.renderToString(symbol.latex, {
                  throwOnError: false,
                  displayMode: false,
                });
              } catch (e) {
                html = symbol.label;
              }

              const isWide = symbol.insertion.type === "template" && symbol.label !== "Fraction" && symbol.label !== "Square Root";
              
              return (
                <button
                  key={symbol.id}
                  onClick={() => onInsertSymbol(symbol)}
                  className={`
                    flex flex-col items-center justify-center 
                    border border-border rounded-md bg-card 
                    hover:bg-muted hover:border-border hover:shadow-sm
                    transition-all text-[var(--foreground)] 
                    ${isWide ? "w-24 h-16" : "w-16 h-12"}
                  `}
                  title={symbol.label}
                >
                  <span
                    dangerouslySetInnerHTML={{ __html: html }}
                    className="text-base pointer-events-none"
                  />
                  {symbol.insertion.type === "template" && (
                    <span className="text-[10px] text-muted-foreground mt-1 hidden">{symbol.label}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
