import React from "react";
import { RibbonTab } from "./types/equation-editor.types";
import { cn } from "../../../../components/ui/utils";
import {
  Sigma,
  Type,
  Braces,
  ArrowRightLeft,
  Paintbrush,
  ChevronDown,
} from "lucide-react";

interface Props {
  activeTab: RibbonTab;
  onChangeTab: (tab: RibbonTab) => void;
  onInsertBuiltIn?: () => void;
  onToggleLinear?: () => void;
  viewMode?: "professional" | "linear";
  displayMode?: "inline" | "block";
  onToggleDisplayMode?: () => void;
  onCopyLatex?: () => void;
  onCopyMathML?: () => void;
  onInsert?: (latex: string) => void;
  onExecuteCommand?: (command: string | string[]) => void;
}

const RIBBON_TABS: { id: RibbonTab; label: string; icon: React.ReactNode }[] = [
  { id: "equation", label: "Equation", icon: <Sigma className="w-3.5 h-3.5" /> },
  { id: "symbols", label: "Symbols", icon: <Type className="w-3.5 h-3.5" /> },
  { id: "structures", label: "Structures", icon: <Braces className="w-3.5 h-3.5" /> },
  { id: "formatting", label: "Formatting", icon: <Paintbrush className="w-3.5 h-3.5" /> },
  { id: "conversions", label: "Conversions", icon: <ArrowRightLeft className="w-3.5 h-3.5" /> },
];

export function EquationRibbon({
  activeTab,
  onChangeTab,
  onInsertBuiltIn,
  onToggleLinear,
  viewMode = "professional",
  displayMode = "inline",
  onToggleDisplayMode,
  onCopyLatex,
  onCopyMathML,
  onInsert,
  onExecuteCommand,
}: Props) {
  return (
    <div className="border-b border-border bg-card shrink-0">
      {/* Tab headers */}
      <div className="flex items-center gap-1 px-3 pt-1">
        {RIBBON_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChangeTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors border border-b-0",
              activeTab === tab.id
                ? "bg-card text-foreground border-border -mb-px z-10"
                : "bg-transparent text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/50"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab contents */}
      <div className="p-3 bg-card min-h-[70px] border-t border-border shadow-sm">
        {activeTab === "equation" && (
          <EquationTabContent 
            onInsertBuiltIn={onInsertBuiltIn}
            displayMode={displayMode}
            onToggleDisplayMode={onToggleDisplayMode}
          />
        )}
        {activeTab === "symbols" && <SymbolsTabContent />}
        {activeTab === "structures" && <StructuresTabContent />}
        {activeTab === "formatting" && <FormattingTabContent onInsert={onInsert} onExecuteCommand={onExecuteCommand} />}
        {activeTab === "conversions" && (
          <ConversionsTabContent
            viewMode={viewMode}
            onToggleLinear={onToggleLinear}
            onCopyLatex={onCopyLatex}
            onCopyMathML={onCopyMathML}
          />
        )}
      </div>
    </div>
  );
}

// ─── Sub-components for each ribbon tab ────────────────────

function EquationTabContent({
  onInsertBuiltIn,
  displayMode,
  onToggleDisplayMode,
}: {
  onInsertBuiltIn?: () => void;
  displayMode?: string;
  onToggleDisplayMode?: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <RibbonGroup label="Mode">
        <button
          onClick={onToggleDisplayMode}
          className={cn(
            "px-2.5 py-1 text-xs rounded-md border transition-colors",
            displayMode === "inline"
              ? "bg-primary/10 text-primary border-primary/20"
              : "bg-card text-foreground border-border hover:bg-muted"
          )}
        >
          Inline
        </button>
        <button
          onClick={onToggleDisplayMode}
          className={cn(
            "px-2.5 py-1 text-xs rounded-md border transition-colors",
            displayMode === "block"
              ? "bg-primary/10 text-primary border-primary/20"
              : "bg-card text-foreground border-border hover:bg-muted"
          )}
        >
          Block
        </button>
      </RibbonGroup>

      <RibbonSeparator />

      <RibbonGroup label="Templates">
        <button
          onClick={onInsertBuiltIn}
          className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md border border-border bg-card hover:bg-muted text-foreground transition-colors"
        >
          Built-in Equations
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </button>
      </RibbonGroup>
    </div>
  );
}

function SymbolsTabContent() {
  return (
    <div className="flex items-center">
      <span className="text-xs text-muted-foreground">
        Select a symbol category from the panel on the right →
      </span>
    </div>
  );
}

function StructuresTabContent() {
  return (
    <div className="flex items-center">
      <span className="text-xs text-muted-foreground">
        Select a structure template from the panel on the right →
      </span>
    </div>
  );
}

function FormattingTabContent({ onInsert, onExecuteCommand }: { onInsert?: (latex: string) => void, onExecuteCommand?: (cmd: string | string[]) => void }) {
  return (
    <div className="flex items-center gap-3">
      <RibbonGroup label="Style">
        <RibbonButton label="Bold" shortLabel="B" className="font-bold" onClick={() => onInsert?.("\\mathbf{#?}")} />
        <RibbonButton label="Italic" shortLabel="𝐼" className="italic" onClick={() => onInsert?.("\\mathit{#?}")} />
        <RibbonButton label="Roman" shortLabel="R" onClick={() => onInsert?.("\\mathrm{#?}")} />
      </RibbonGroup>
      <RibbonSeparator />
      <RibbonGroup label="Font">
        <RibbonButton label="Blackboard" shortLabel="𝔹" onClick={() => onInsert?.("\\mathbb{#?}")} />
        <RibbonButton label="Script" shortLabel="𝒮" onClick={() => onInsert?.("\\mathcal{#?}")} />
        <RibbonButton label="Fraktur" shortLabel="𝔉" onClick={() => onInsert?.("\\mathfrak{#?}")} />
      </RibbonGroup>
      <RibbonSeparator />
      <RibbonGroup label="Size">
        <RibbonButton label="Small" shortLabel="A" className="text-[10px]" onClick={() => onInsert?.("{\\small #?}")} />
        <RibbonButton label="Large" shortLabel="A" className="text-[14px]" onClick={() => onInsert?.("{\\large #?}")} />
      </RibbonGroup>
      <RibbonSeparator />
      <RibbonGroup label="Color">
        <RibbonButton label="Red" shortLabel="A" className="text-red-500 font-bold" onClick={() => onInsert?.("\\textcolor{red}{#?}")} />
        <RibbonButton label="Blue" shortLabel="A" className="text-blue-500 font-bold" onClick={() => onInsert?.("\\textcolor{blue}{#?}")} />
      </RibbonGroup>
      <RibbonSeparator />
      <RibbonGroup label="Spacing">
        <RibbonButton label="Thin Space" shortLabel="⎵" onClick={() => onInsert?.("\\,")} />
        <RibbonButton label="Quad Space" shortLabel="⬜" onClick={() => onInsert?.("\\quad")} />
      </RibbonGroup>
      <RibbonSeparator />
      <RibbonGroup label="Content">
        <button
          type="button"
          onClick={() => onExecuteCommand?.(["switchMode", "text"])}
          onMouseDown={(e) => e.preventDefault()}
          title="Switch to Text Mode"
          className="px-2.5 py-1 text-xs rounded-md border border-border bg-card hover:bg-muted text-foreground transition-colors h-7 flex items-center"
        >
          Text Mode
        </button>
      </RibbonGroup>
    </div>
  );
}

function ConversionsTabContent({
  viewMode,
  onToggleLinear,
  onCopyLatex,
  onCopyMathML,
}: {
  viewMode?: string;
  onToggleLinear?: () => void;
  onCopyLatex?: () => void;
  onCopyMathML?: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <RibbonGroup label="View">
        <button
          onClick={onToggleLinear}
          className={cn(
            "px-2.5 py-1 text-xs rounded-md border transition-colors",
            viewMode === "professional"
              ? "bg-primary/10 text-primary border-primary/20"
              : "bg-card text-foreground border-border hover:bg-muted"
          )}
        >
          Professional
        </button>
        <button
          onClick={onToggleLinear}
          className={cn(
            "px-2.5 py-1 text-xs rounded-md border transition-colors",
            viewMode === "linear"
              ? "bg-primary/10 text-primary border-primary/20"
              : "bg-card text-foreground border-border hover:bg-muted"
          )}
        >
          Linear
        </button>
      </RibbonGroup>
      <RibbonSeparator />
      <RibbonGroup label="Copy As">
        <button
          onClick={onCopyLatex}
          className="px-2.5 py-1 text-xs rounded-md border border-border bg-card hover:bg-muted text-foreground transition-colors"
        >
          LaTeX
        </button>
        <button
          onClick={onCopyMathML}
          className="px-2.5 py-1 text-xs rounded-md border border-border bg-card hover:bg-muted text-foreground transition-colors"
        >
          MathML
        </button>
      </RibbonGroup>
    </div>
  );
}

// ─── Shared ribbon primitives ──────────────────────────────

function RibbonGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex items-center gap-1">{children}</div>
      <span className="text-[10px] text-muted-foreground/70 leading-none">{label}</span>
    </div>
  );
}

function RibbonSeparator() {
  return <div className="w-px h-8 bg-border mx-1" />;
}

function RibbonButton({
  label,
  shortLabel,
  className = "",
  onClick,
}: {
  label: string;
  shortLabel: string;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
      title={label}
      className={cn(
        "w-7 h-7 flex items-center justify-center text-xs rounded-md border border-border bg-card hover:bg-muted text-foreground transition-colors",
        className
      )}
    >
      {shortLabel}
    </button>
  );
}
