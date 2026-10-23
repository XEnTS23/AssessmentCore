import React from "react";
import { CheckCircle2, AlertCircle, Copy, Code2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  latex: string;
  isValid: boolean;
  errorMessage?: string;
  displayMode: "inline" | "block";
  showSource?: boolean;
  onToggleSource?: () => void;
}

export function EquationStatusBar({
  latex,
  isValid,
  errorMessage,
  displayMode,
  showSource = false,
  onToggleSource,
}: Props) {
  const handleCopyLatex = () => {
    if (latex) {
      navigator.clipboard.writeText(latex);
      toast.success("LaTeX copied to clipboard");
    }
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/50 shrink-0 min-h-[36px]">
      {/* Left: Validation status */}
      <div className="flex items-center gap-3">
        {isValid ? (
          <div className="flex items-center gap-1.5 text-green-500 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Valid</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-destructive text-xs">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{errorMessage || "Invalid expression"}</span>
          </div>
        )}

        <div className="w-px h-4 bg-border" />

        <span className="text-xs text-muted-foreground">
          {displayMode === "inline" ? "Inline" : "Block"} mode
        </span>
      </div>

      {/* Center: LaTeX source preview (truncated) */}
      {latex && (
        <div className="flex-1 mx-4 overflow-hidden">
          <code className="text-xs text-muted-foreground font-mono truncate block max-w-[400px]">
            {latex}
          </code>
        </div>
      )}

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleSource}
          title="Toggle LaTeX source"
          className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground rounded transition-colors"
        >
          <Code2 className="w-3.5 h-3.5" />
          Source
        </button>

        <button
          onClick={handleCopyLatex}
          title="Copy LaTeX"
          className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground rounded transition-colors"
        >
          <Copy className="w-3.5 h-3.5" />
          Copy
        </button>
      </div>
    </div>
  );
}
