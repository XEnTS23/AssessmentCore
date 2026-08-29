import React, { useEffect, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { Maximize2, MoveVertical } from "lucide-react";
import { cn } from "../../../../components/ui/utils";

interface Props {
  latex: string;
  displayMode: "inline" | "block";
}

export function EquationPreview({ latex, displayMode }: Props) {
  let renderedHTML = "";
  let error = "";

  try {
    renderedHTML = katex.renderToString(latex || "\\text{ }", {
      throwOnError: true,
      displayMode: displayMode === "block",
    });
  } catch (err: any) {
    error = err.message;
  }

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-lg overflow-hidden m-4 mb-2">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <h3 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
          <MoveVertical className="w-4 h-4 text-muted-foreground/70" />
          Preview
        </h3>
        <button className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-[var(--foreground)]">
          <Maximize2 className="w-3 h-3" /> Full Screen
        </button>
      </div>
      
      <div className="flex-1 flex items-center justify-center p-6 bg-card overflow-auto min-h-[160px]">
        {error ? (
          <div className="text-red-500 text-sm">{error}</div>
        ) : (
          <div 
            className={cn("text-2xl", displayMode === "block" ? "lms-equation--block" : "")}
            dangerouslySetInnerHTML={{ __html: renderedHTML }}
          />
        )}
      </div>

      <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted text-[11px]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Style:</span>
            <select className="border border-border rounded px-2 py-1 bg-card focus:outline-none">
              <option>Default</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Size:</span>
            <select className="border border-border rounded px-2 py-1 bg-card focus:outline-none">
              <option>100%</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2 border border-border rounded px-2 py-1 bg-card">
          <div className="w-3 h-3 bg-black rounded-sm" />
          <span className="text-muted-foreground font-mono">#000000</span>
        </div>
      </div>
    </div>
  );
}
