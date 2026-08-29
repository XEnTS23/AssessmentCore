import React from "react";
import { ChevronDown, AlignLeft, AlignCenter, AlignRight, AlignJustify, Info } from "lucide-react";
import { cn } from "../../../../components/ui/utils";

export function EquationOptionsPanel() {
  const tabs = ["Options", "Accessibility", "History"];

  return (
    <div className="flex-1 flex flex-col bg-card overflow-y-auto">
      {/* Tabs */}
      <div className="flex items-center gap-6 px-6 pt-2 border-b border-border">
        {tabs.map((tab, i) => (
          <button
            key={tab}
            className={cn(
              "pb-3 text-[13px] font-medium transition-colors border-b-2 relative top-px",
              i === 0
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-[var(--foreground)]"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="p-6 space-y-6 flex-1 text-[13px]">
        {/* Equation Numbering */}
        <div className="flex items-center justify-between">
          <span className="font-medium text-[var(--foreground)]">Equation Numbering</span>
          <div className="flex items-center gap-3">
            <div className="w-8 h-4 bg-border rounded-full relative cursor-pointer">
              <div className="w-3.5 h-3.5 bg-card rounded-full absolute left-0.5 top-[1px] shadow-sm" />
            </div>
            <span className="text-muted-foreground">Auto</span>
          </div>
        </div>

        {/* Label */}
        <div className="flex items-center justify-between">
          <span className="font-medium text-[var(--foreground)]">Label (for reference)</span>
          <input 
            type="text" 
            placeholder="e.g. eq:newton" 
            className="border border-border rounded-md px-3 py-1.5 w-[160px] text-sm focus:outline-none focus:border-primary"
          />
        </div>

        {/* Alignment */}
        <div className="flex items-center justify-between">
          <span className="font-medium text-[var(--foreground)]">Alignment</span>
          <div className="flex border border-border rounded-md overflow-hidden bg-card">
            <button className="p-2 border-r border-border text-muted-foreground hover:bg-muted"><AlignLeft className="w-4 h-4" /></button>
            <button className="p-2 border-r border-border bg-primary/10 text-primary"><AlignCenter className="w-4 h-4" /></button>
            <button className="p-2 border-r border-border text-muted-foreground hover:bg-muted"><AlignRight className="w-4 h-4" /></button>
            <button className="p-2 text-muted-foreground hover:bg-muted"><AlignJustify className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Checkboxes */}
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="w-4 h-4 bg-[#5B3FE6] rounded border border-primary flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="font-medium text-[var(--foreground)]">Display Style (Large)</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="w-4 h-4 bg-[#5B3FE6] rounded border border-primary flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="font-medium text-[var(--foreground)] flex items-center gap-1">Allow Line Breaks <Info className="w-3 h-3 text-muted-foreground/70" /></span>
          </label>
        </div>

        {/* Accordions */}
        <div className="space-y-0.5 border-t border-border pt-4">
          <div className="flex justify-between items-center py-2 cursor-pointer group">
            <span className="font-medium text-[var(--foreground)] group-hover:text-primary">Spacing</span>
            <ChevronDown className="w-4 h-4 text-muted-foreground/70" />
          </div>
          <div className="flex justify-between items-center py-2 cursor-pointer group">
            <span className="font-medium text-[var(--foreground)] group-hover:text-primary">Borders & Background</span>
            <ChevronDown className="w-4 h-4 text-muted-foreground/70" />
          </div>
          <div className="py-2">
            <div className="flex justify-between items-center cursor-pointer group mb-2">
              <span className="font-medium text-[var(--foreground)] group-hover:text-primary">Math Fonts</span>
              <ChevronDown className="w-4 h-4 text-muted-foreground/70" />
            </div>
            <select className="w-full border border-border rounded-md px-3 py-2 text-sm text-muted-foreground focus:outline-none focus:border-primary appearance-none bg-card">
              <option>Default (Computer Modern)</option>
            </select>
          </div>
          <div className="flex justify-between items-center py-2 cursor-pointer group">
            <span className="font-medium text-[var(--foreground)] group-hover:text-primary">Custom CSS</span>
            <ChevronDown className="w-4 h-4 text-muted-foreground/70" />
          </div>
        </div>
      </div>
    </div>
  );
}
