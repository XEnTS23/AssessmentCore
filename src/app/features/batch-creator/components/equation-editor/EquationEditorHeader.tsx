import React from "react";
import { Sigma, Maximize2, X, ChevronDown, CheckCircle2 } from "lucide-react";
import { Button } from "../../../../components/ui/button";

interface Props {
  onClose: () => void;
  onInsert: (displayMode: "inline" | "block") => void;
  mode: "insert" | "edit";
  isSaved?: boolean;
  displayMode?: "inline" | "block";
}

export function EquationEditorHeader({ onClose, onInsert, mode, isSaved = true, displayMode = "inline" }: Props) {
  return (
    <div className="h-[56px] bg-card border-b border-border flex items-center justify-between px-5 flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
          <Sigma className="w-4 h-4" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-foreground m-0 leading-none">
            Equation Editor
          </h1>
          <p className="text-[11px] text-muted-foreground m-0 mt-0.5">
            Create and insert mathematical expressions
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isSaved && (
          <div className="flex items-center gap-1 text-muted-foreground text-[11px] mr-1">
            <CheckCircle2 className="w-3 h-3 text-green-500" />
            Saved
          </div>
        )}

        <Button
          variant="ghost"
          onClick={onClose}
          className="text-foreground border border-border h-7 rounded-md px-2.5 text-xs font-medium gap-1"
        >
          Clear
        </Button>

        {/* Insert split button */}
        <div className="flex items-center rounded-md bg-primary text-primary-foreground overflow-hidden ml-1">
          <button
            onClick={() => onInsert(displayMode ?? "inline")}
            className="px-3 py-1.5 text-xs font-medium hover:bg-primary/90 transition-colors h-[30px]"
          >
            {mode === "insert" ? "Insert" : "Update"}
          </button>
          <div className="w-px h-[30px] bg-primary-foreground/20" />
          <button className="px-1.5 h-[30px] hover:bg-primary/90 transition-colors">
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>

        <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground ml-0.5 h-7 w-7">
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
