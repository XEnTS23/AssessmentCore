import React from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "../../../components/ui/button";

interface TypeConversionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentType: string;
  targetType: string;
  onPreserve: () => void;
  onConvertRemove: () => void;
}

export function TypeConversionModal({
  isOpen,
  onClose,
  currentType,
  targetType,
  onPreserve,
  onConvertRemove,
}: TypeConversionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-[420px] bg-background border border-border rounded-xl shadow-2xl animate-in zoom-in-95 duration-150">
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-orange-100 grid place-items-center">
              <AlertCircle className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Change Question Type</h3>
              <p className="text-xs text-muted-foreground">
                Converting from{" "}
                <strong className="text-foreground">{currentType}</strong> to{" "}
                <strong className="text-foreground">{targetType}</strong>
              </p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-xs text-amber-700">
            <strong>Warning:</strong> Changing question type may cause data
            loss. Options, correct answers, and type-specific settings may be
            removed or reset.
          </div>
        </div>

        <div className="border-t border-border p-4 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="outline" size="sm" onClick={onPreserve}>
            Convert (keep data)
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={onConvertRemove}
          >
            Convert (reset fields)
          </Button>
        </div>
      </div>
    </div>
  );
}
