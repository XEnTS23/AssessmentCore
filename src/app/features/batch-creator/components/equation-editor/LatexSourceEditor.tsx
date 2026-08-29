import React, { useRef, useEffect } from "react";
import { CheckCircle2, ChevronDown, Trash2 } from "lucide-react";
import { cn } from "../../../../components/ui/utils";

interface Props {
  latex: string;
  onChange: (latex: string) => void;
  textAreaRef: React.RefObject<HTMLTextAreaElement | null>;
  isValid: boolean;
}

export function LatexSourceEditor({ latex, onChange, textAreaRef, isValid }: Props) {
  const lineCount = latex.split("\n").length;
  const lines = Array.from({ length: Math.max(1, lineCount) }, (_, i) => i + 1);

  return (
    <div className="flex flex-col bg-card border-t border-border">
      {/* Editor Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center gap-4">
          <button className="text-sm font-medium text-primary border-b-2 border-primary pb-1">
            LaTeX
          </button>
          <button className="text-sm font-medium text-muted-foreground hover:text-[var(--foreground)] pb-1">
            MathML
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 border border-border rounded px-2 py-1 text-[11px] text-muted-foreground cursor-pointer hover:bg-muted">
            Auto <ChevronDown className="w-3 h-3" />
          </div>
          <button className="flex items-center gap-1 border border-border rounded px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted">
            Format
          </button>
          <button 
            onClick={() => onChange("")}
            className="flex items-center gap-1 border border-border rounded px-2 py-1 text-[11px] text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
          >
            <Trash2 className="w-3 h-3" /> Clear
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex min-h-[120px] bg-muted">
        {/* Line Numbers Gutter */}
        <div className="w-10 flex flex-col items-end py-3 pr-2 border-r border-border bg-muted text-[11px] text-muted-foreground/70 select-none">
          {lines.map(n => (
            <div key={n} className="leading-5">{n}</div>
          ))}
        </div>
        
        {/* Text Area */}
        <textarea
          ref={textAreaRef}
          value={latex}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 p-3 bg-transparent text-sm font-mono text-[var(--foreground)] focus:outline-none resize-none leading-5"
          spellCheck={false}
          placeholder="Enter LaTeX here..."
        />
      </div>

      {/* Editor Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-card text-[11px] text-muted-foreground">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-green-600 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> Valid LaTeX
          </span>
          <span>Line: {lineCount} Col: {latex.length - latex.lastIndexOf("\n")}</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1 text-muted-foreground hover:text-[var(--foreground)] italic px-2 py-1">
            <span className="font-serif">fx</span> Detect
          </button>
          <button className="flex items-center gap-1 border border-border rounded px-2 py-1 hover:bg-muted">
            Convert <ChevronDown className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
