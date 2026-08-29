import React from "react";
import { X, History as HistoryIcon, User, Clock } from "lucide-react";
import { Button } from "../../../components/ui/button";

export interface HistoryItem {
  id: string;
  time: string;
  user: string;
  action: string;
  fieldPath?: string;
  before?: string;
  after?: string;
}

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRow: any;
}

export function HistoryDrawer({
  isOpen,
  onClose,
  selectedRow,
}: HistoryDrawerProps) {
  if (!isOpen) return null;

  const history: HistoryItem[] = selectedRow?.editHistory || [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-[440px] bg-background border-l border-border shadow-xl flex flex-col animate-in slide-in-from-right duration-200">
        <div className="h-14 border-b border-border flex items-center justify-between px-5 shrink-0">
          <div className="flex items-center gap-2.5">
            <HistoryIcon className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Edit History</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {history.length === 0 ? (
            <div className="text-center text-muted-foreground text-xs py-12">
              <HistoryIcon className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p>No edit history for this row yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="border border-border rounded-md p-3 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{item.action}</span>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {item.time}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <User className="h-3 w-3" /> {item.user}
                  </div>
                  {item.fieldPath && (
                    <div className="text-[10px] text-muted-foreground">
                      Field: <code className="bg-muted px-1 rounded">{item.fieldPath}</code>
                    </div>
                  )}
                  {item.before !== undefined && (
                    <div className="text-[10px] mt-1 bg-destructive/5 border-l-2 border-destructive px-2 py-1 rounded-r">
                      <span className="text-destructive font-mono">−</span> {item.before}
                    </div>
                  )}
                  {item.after !== undefined && (
                    <div className="text-[10px] bg-success/5 border-l-2 border-success px-2 py-1 rounded-r">
                      <span className="text-success font-mono">+</span> {item.after}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
