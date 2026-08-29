import React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "../../../components/ui/button";

interface ConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverVersion: any;
  localDraft: any;
  onKeepDraft: () => void;
  onReloadLatest: () => void;
  onMergeLatest: () => void;
}

export function ConflictModal({
  isOpen,
  onClose,
  serverVersion,
  localDraft,
  onKeepDraft,
  onReloadLatest,
  onMergeLatest,
}: ConflictModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-[480px] bg-background border border-border rounded-xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-150">
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-100 grid place-items-center">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Version Conflict</h3>
              <p className="text-xs text-muted-foreground">
                This row was modified while you were editing.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="border border-border rounded-md p-3">
              <h5 className="text-[10px] font-bold uppercase text-muted-foreground mb-2">
                Server Version
              </h5>
              <pre className="text-[9px] font-mono max-h-[120px] overflow-auto text-foreground">
                {JSON.stringify(serverVersion, null, 2)?.slice(0, 300)}
              </pre>
            </div>
            <div className="border border-primary/30 rounded-md p-3 bg-primary/5">
              <h5 className="text-[10px] font-bold uppercase text-primary mb-2">
                Your Draft
              </h5>
              <pre className="text-[9px] font-mono max-h-[120px] overflow-auto text-foreground">
                {JSON.stringify(localDraft, null, 2)?.slice(0, 300)}
              </pre>
            </div>
          </div>
        </div>

        <div className="border-t border-border p-4 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onReloadLatest}>
            Reload server version
          </Button>
          <Button variant="outline" size="sm" onClick={onKeepDraft}>
            Keep my draft
          </Button>
          <Button size="sm" onClick={onMergeLatest}>
            Merge & save
          </Button>
        </div>
      </div>
    </div>
  );
}
