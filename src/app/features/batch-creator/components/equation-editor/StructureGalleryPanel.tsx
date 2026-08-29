import React, { useState, useMemo } from "react";
import { StructureCategory, StructureTemplate } from "./types/equation-editor.types";
import { STRUCTURE_DATA, STRUCTURE_CATEGORY_LABELS } from "./data/structures";
import { cn } from "../../../../components/ui/utils";
import katex from "katex";

interface Props {
  onInsertStructure: (latex: string) => void;
  activeCategory: StructureCategory;
  onChangeCategory: (category: StructureCategory) => void;
}

const CATEGORIES: StructureCategory[] = [
  "fractions",
  "scripts",
  "radicals",
  "integrals",
  "large-operators",
  "brackets",
  "functions",
  "accents",
  "limits",
  "matrices",
];

export function StructureGalleryPanel({ onInsertStructure, activeCategory, onChangeCategory }: Props) {
  const filteredStructures = useMemo(
    () => STRUCTURE_DATA.filter((s) => s.category === activeCategory),
    [activeCategory]
  );

  const handleInsert = (structure: StructureTemplate) => {
    // Replace #0 placeholders with MathLive-friendly placeholder syntax
    const latex = structure.latex.replace(/#0/g, "\\placeholder{}");
    onInsertStructure(latex);
  };

  return (
    <div className="w-[260px] shrink-0 flex flex-col border-l border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <h3 className="text-xs font-semibold text-foreground">Structures</h3>
        <p className="text-[10px] text-muted-foreground mt-0.5">Click to insert a template</p>
      </div>

      {/* Category tabs (scrollable) */}
      <div className="flex gap-1 px-3 pb-2 overflow-x-auto scrollbar-hide shrink-0">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => onChangeCategory(cat)}
            className={cn(
              "px-2 py-1 text-[10px] font-medium rounded-md whitespace-nowrap transition-colors",
              activeCategory === cat
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {STRUCTURE_CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Structure grid */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <div className="grid grid-cols-2 gap-2">
          {filteredStructures.map((structure) => (
            <StructureCard
              key={structure.id}
              structure={structure}
              onClick={() => handleInsert(structure)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function StructureCard({ structure, onClick }: { structure: StructureTemplate; onClick: () => void }) {
  // Render the template preview by replacing #0 with a small square placeholder
  const previewLatex = structure.latex.replace(/#0/g, "\\square");

  let html = "";
  try {
    html = katex.renderToString(previewLatex, {
      throwOnError: false,
      displayMode: false,
    });
  } catch {
    html = `<span>${structure.label}</span>`;
  }

  return (
    <button
      onClick={onClick}
      title={structure.label}
      className="flex flex-col items-center justify-center p-2 min-h-[56px] border border-border rounded-lg bg-card hover:bg-muted hover:border-primary/30 transition-all group"
    >
      <span
        className="[&_.katex]:text-[13px] text-foreground"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <span className="text-[9px] text-muted-foreground mt-1 truncate w-full text-center group-hover:text-foreground transition-colors">
        {structure.label}
      </span>
    </button>
  );
}
