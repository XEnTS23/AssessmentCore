import React from "react";
import { HelpCircle } from "lucide-react";

export function EquationShortcutBar() {
  return (
    <div className="flex items-center gap-6 px-6 py-2 border-t border-border bg-card text-[11px] text-muted-foreground">
      <div className="flex items-center gap-2">
        <span className="font-medium text-[var(--foreground)]">Shortcuts:</span>
        <kbd className="px-1.5 py-0.5 border border-border rounded bg-muted font-sans">Ctrl + Enter</kbd> Insert
      </div>
      <div className="flex items-center gap-2">
        <kbd className="px-1.5 py-0.5 border border-border rounded bg-muted font-sans">Ctrl + /</kbd> Toggle LaTeX
      </div>
      <div className="flex items-center gap-2">
        <kbd className="px-1.5 py-0.5 border border-border rounded bg-muted font-sans">Ctrl + Shift + M</kbd> MathML
      </div>
      <div className="flex items-center gap-2">
        <kbd className="px-1.5 py-0.5 border border-border rounded bg-muted font-sans">Tab</kbd> Next Placeholder
      </div>
      <div className="flex-1" />
      <button className="flex items-center gap-1 hover:text-[var(--foreground)]">
        <HelpCircle className="w-3.5 h-3.5" /> Help
      </button>
    </div>
  );
}
