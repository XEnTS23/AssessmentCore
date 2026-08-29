import React from "react";
import { toast } from "sonner";
import {
  Scissors,
  Copy,
  ClipboardPaste,
  Trash2,
  Code2,
  FileCode2,
  Image,
  Eye,
} from "lucide-react";

interface Props {
  x: number;
  y: number;
  isOpen: boolean;
  onClose: () => void;
  latex: string;
  onCut?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onDelete?: () => void;
}

export function EquationContextMenu({ x, y, isOpen, onClose, latex, onCut, onCopy, onPaste, onDelete }: Props) {
  if (!isOpen) return null;

  const handleCopyLatex = () => {
    navigator.clipboard.writeText(latex);
    toast.success("LaTeX copied");
    onClose();
  };

  const handleCopyMathML = () => {
    // Placeholder - would need MathLive's MathML export
    toast.info("MathML copy coming soon");
    onClose();
  };

  const menuItems: { label: string; icon: React.ReactNode; onClick: () => void; separator?: boolean; disabled?: boolean }[] = [
    { label: "Cut", icon: <Scissors className="w-3.5 h-3.5" />, onClick: () => { onCut?.(); onClose(); } },
    { label: "Copy", icon: <Copy className="w-3.5 h-3.5" />, onClick: () => { onCopy?.(); onClose(); } },
    { label: "Paste", icon: <ClipboardPaste className="w-3.5 h-3.5" />, onClick: () => { onPaste?.(); onClose(); } },
    { label: "Delete", icon: <Trash2 className="w-3.5 h-3.5" />, onClick: () => { onDelete?.(); onClose(); }, separator: true },
    { label: "Copy as LaTeX", icon: <Code2 className="w-3.5 h-3.5" />, onClick: handleCopyLatex },
    { label: "Copy as MathML", icon: <FileCode2 className="w-3.5 h-3.5" />, onClick: handleCopyMathML },
  ];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[60]" onClick={onClose} />

      {/* Menu */}
      <div
        className="fixed z-[61] min-w-[180px] bg-card border border-border rounded-lg shadow-xl py-1"
        style={{ left: x, top: y }}
      >
        {menuItems.map((item, i) => (
          <React.Fragment key={item.label}>
            {item.separator && <div className="h-px bg-border my-1" />}
            <button
              onClick={item.onClick}
              disabled={item.disabled}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              <span className="text-muted-foreground">{item.icon}</span>
              {item.label}
            </button>
          </React.Fragment>
        ))}
      </div>
    </>
  );
}
