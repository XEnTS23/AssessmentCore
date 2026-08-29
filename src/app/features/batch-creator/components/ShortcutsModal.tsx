import React from "react";
import { X, Keyboard } from "lucide-react";
import { Button } from "../../../components/ui/button";

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: ["J", "↓"], action: "Next row" },
  { keys: ["K", "↑"], action: "Previous row" },
  { keys: ["Shift", "J"], action: "Next unresolved row" },
  { keys: ["Shift", "K"], action: "Previous unresolved row" },
  { keys: ["Ctrl", "S"], action: "Save draft" },
  { keys: ["Ctrl", "Enter"], action: "Save & validate" },
  { keys: ["Alt", "Enter"], action: "Save & go to next unresolved" },
  { keys: ["/"], action: "Focus search" },
  { keys: ["?"], action: "Show this dialog" },
  { keys: ["Escape"], action: "Close drawers / modals" },
];

export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-[420px] bg-background border border-border rounded-xl shadow-2xl animate-in zoom-in-95 duration-150">
        <div className="h-14 border-b border-border flex items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <Keyboard className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Keyboard Shortcuts</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 space-y-1">
          {SHORTCUTS.map((s, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0"
            >
              <span className="text-xs text-foreground">{s.action}</span>
              <div className="flex items-center gap-1">
                {s.keys.map((k, j) => (
                  <span key={j}>
                    {j > 0 && (
                      <span className="text-muted-foreground mx-0.5 text-[10px]">
                        +
                      </span>
                    )}
                    <kbd className="inline-flex h-6 min-w-[24px] items-center justify-center rounded border border-border bg-muted px-1.5 text-[10px] font-mono">
                      {k}
                    </kbd>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
