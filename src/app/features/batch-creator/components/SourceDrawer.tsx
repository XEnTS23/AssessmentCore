import React, { useState } from "react";
import { X, FileCode } from "lucide-react";
import { Button } from "../../../components/ui/button";

interface SourceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRow: any;
  editorState: any;
}

export function SourceDrawer({
  isOpen,
  onClose,
  selectedRow,
  editorState,
}: SourceDrawerProps) {
  const [activeTab, setActiveTab] = useState<"raw" | "canonical" | "draft">(
    "raw",
  );

  if (!isOpen) return null;

  const rawJson = selectedRow?.rawRow
    ? JSON.stringify(selectedRow.rawRow, null, 2)
    : "No raw data available";
  const canonicalJson = selectedRow?.normalizedQuestion
    ? JSON.stringify(selectedRow.normalizedQuestion, null, 2)
    : "No canonical data available";
  const draftJson = editorState
    ? JSON.stringify(editorState, null, 2)
    : "No draft data available";

  const tabs = [
    { key: "raw" as const, label: "Raw Spreadsheet", data: rawJson },
    { key: "canonical" as const, label: "Canonical", data: canonicalJson },
    { key: "draft" as const, label: "Current Draft", data: draftJson },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-[560px] bg-background border-l border-border shadow-xl flex flex-col animate-in slide-in-from-right duration-200">
        <div className="h-14 border-b border-border flex items-center justify-between px-5 shrink-0">
          <div className="flex items-center gap-2.5">
            <FileCode className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Source Inspector</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 h-10 text-xs font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "text-primary border-primary"
                  : "text-muted-foreground border-transparent hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-4">
          <pre className="text-[10px] font-mono leading-relaxed text-foreground whitespace-pre-wrap bg-muted/30 rounded-md border p-4">
            {tabs.find((t) => t.key === activeTab)?.data}
          </pre>
        </div>
      </div>
    </div>
  );
}
