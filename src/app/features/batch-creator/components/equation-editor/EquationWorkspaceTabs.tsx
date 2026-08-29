import React from "react";
import { cn } from "../../../../components/ui/utils";
import { Keyboard, LayoutTemplate, Scissors, Upload, PenTool } from "lucide-react";

interface Props {
  activeTab: "keyboard" | "templates" | "snippets" | "upload" | "handwriting";
  onChangeTab: (tab: "keyboard" | "templates" | "snippets" | "upload" | "handwriting") => void;
}

export function EquationWorkspaceTabs({ activeTab, onChangeTab }: Props) {
  const tabs = [
    { id: "keyboard", label: "Keyboard", icon: <Keyboard className="w-4 h-4" /> },
    { id: "templates", label: "Templates", icon: <LayoutTemplate className="w-4 h-4" /> },
    { id: "snippets", label: "Snippets", icon: <Scissors className="w-4 h-4" /> },
    { id: "upload", label: "Upload", icon: <Upload className="w-4 h-4" /> },
    { id: "handwriting", label: "Handwriting", icon: <PenTool className="w-4 h-4" />, beta: true },
  ] as const;

  return (
    <div className="flex items-center gap-4 px-4 pt-4 border-b border-border bg-card overflow-x-auto scrollbar-hide shrink-0">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChangeTab(tab.id)}
          className={cn(
            "flex items-center gap-2 pb-3 border-b-2 text-sm font-medium transition-colors relative top-px shrink-0 whitespace-nowrap",
            activeTab === tab.id
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-[var(--foreground)]"
          )}
        >
          {tab.icon}
          {tab.label}
          {tab.beta && (
            <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary">
              Beta
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
