import React, { useState, useRef, useEffect } from "react";
import { BUILTIN_EQUATIONS } from "./data/builtin-equations";
import katex from "katex";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onInsertEquation: (latex: string) => void;
}

export function BuiltInEquationsDropdown({ isOpen, onClose, onInsertEquation }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Group equations by category
  const grouped = BUILTIN_EQUATIONS.reduce<Record<string, typeof BUILTIN_EQUATIONS>>((acc, eq) => {
    if (!acc[eq.category]) acc[eq.category] = [];
    acc[eq.category].push(eq);
    return acc;
  }, {});

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 mt-1 z-50 w-[420px] max-h-[400px] overflow-y-auto bg-card border border-border rounded-lg shadow-xl p-3"
    >
      <h4 className="text-xs font-semibold text-foreground mb-2">Built-in Equations</h4>

      {Object.entries(grouped).map(([category, equations]) => (
        <div key={category} className="mb-3 last:mb-0">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            {category}
          </span>
          <div className="grid grid-cols-2 gap-2 mt-1.5">
            {equations.map((eq) => (
              <BuiltInEquationCard
                key={eq.id}
                name={eq.name}
                latex={eq.latex}
                onClick={() => {
                  onInsertEquation(eq.latex);
                  onClose();
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function BuiltInEquationCard({
  name,
  latex,
  onClick,
}: {
  name: string;
  latex: string;
  onClick: () => void;
}) {
  let html = "";
  try {
    html = katex.renderToString(latex, { throwOnError: false, displayMode: false });
  } catch {
    html = `<code>${latex}</code>`;
  }

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start p-2.5 border border-border rounded-lg bg-card hover:bg-muted hover:border-primary/30 transition-all text-left group"
    >
      <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground mb-1.5 transition-colors">
        {name}
      </span>
      <span
        className="[&_.katex]:text-[11px] text-foreground overflow-hidden w-full"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </button>
  );
}
