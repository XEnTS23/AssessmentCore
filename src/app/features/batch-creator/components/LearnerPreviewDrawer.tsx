import React, { useState, useMemo, useEffect } from "react";
import { X, Eye, Code } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { buildQuestionFromEditor } from "../fixing/manualFixEngine";
import { renderStudentPreviewHtml } from "../preview/studentPreviewEngine";
import { ExportConfig } from "../core/exportTypes";
import { DEFAULT_EXPORT_CONFIG } from "../configuration/defaultExportConfig";

interface LearnerPreviewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRow: any;
  editorState: any;
  exportConfig?: ExportConfig;
}

export function LearnerPreviewDrawer({
  isOpen,
  onClose,
  selectedRow,
  editorState,
  exportConfig,
}: LearnerPreviewDrawerProps) {
  const [profile, setProfile] = useState<"GENERIC" | "CANVAS" | "MOODLE">(
    "GENERIC",
  );
  const [isViewingCode, setIsViewingCode] = useState(false);
  const [editedHtml, setEditedHtml] = useState<string | null>(null);

  const previewHtml = useMemo(() => {
    if (!selectedRow || !editorState) return "";

    // 1. Build a valid normalized question structure from live editorState
    const question = buildQuestionFromEditor(
      selectedRow.normalizedQuestion,
      editorState,
    );

    // 2. Wrap it inside a mock QuestionRow so preview builder can process it
    const mockRow = {
      ...selectedRow,
      normalizedQuestion: question,
      manualFixSections: editorState.sections,
      metadata: {
        ...selectedRow.metadata,
        ...editorState.metadata,
      },
      scoringConfig: {
        ...selectedRow.scoringConfig,
        marks: editorState.marks,
        negativeMarks: editorState.negativeMarks,
      },
    };

    // 3. Define target math mode config (defaulting to mathjax)
    const config: ExportConfig = exportConfig || {
      ...DEFAULT_EXPORT_CONFIG,
      target: "qti_2_1",
      mathMode: "mathjax",
    };

    // 4. Build preview HTML using the student preview engine
    return renderStudentPreviewHtml(mockRow, config);
  }, [selectedRow, editorState, exportConfig]);

  useEffect(() => {
    setEditedHtml(null);
  }, [previewHtml]);

  const displayHtml = editedHtml !== null ? editedHtml : previewHtml;

  if (!isOpen || !editorState) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-[650px] bg-background border-l border-border shadow-xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="h-14 border-b border-border flex items-center justify-between px-5 shrink-0">
          <div className="flex items-center gap-2.5">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Learner Preview</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={isViewingCode ? "secondary" : "outline"}
              size="sm"
              className="h-7 text-[10px] px-2 gap-1"
              onClick={() => setIsViewingCode(!isViewingCode)}
              title="View/Edit Underlying HTML Code"
            >
              <Code className="h-3 w-3" /> Code
            </Button>
            <div className="flex border border-border rounded-md overflow-hidden">
              {(["GENERIC", "CANVAS", "MOODLE"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setProfile(p)}
                  className={`h-7 px-3 text-[10px] ${
                    profile === p
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "bg-background text-foreground"
                  }`}
                >
                  {p === "GENERIC"
                    ? "Generic"
                    : p.charAt(0) + p.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content containing preview iframe or code editor */}
        <div className="flex-1 overflow-hidden bg-muted/10 relative">
          {displayHtml ? (
            isViewingCode ? (
              <textarea
                className="w-full h-full border-0 p-4 font-mono text-xs outline-none resize-none"
                style={{ backgroundColor: '#18181b', color: '#f4f4f5' }}
                value={displayHtml}
                onChange={(e) => setEditedHtml(e.target.value)}
                spellCheck={false}
              />
            ) : (
              <iframe
                srcDoc={displayHtml}
                className="w-full h-full border-0 bg-background"
                sandbox="allow-scripts"
                title="Student View Preview"
              />
            )
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              No preview available.
            </div>
          )}
        </div>

        {/* Profile warning details */}
        {profile !== "GENERIC" && (
          <div className="border-t border-border p-3 bg-amber-50 text-[10px] text-amber-700 font-medium shrink-0">
            ⚠ {profile} rendering simulation mode active. Equation delivery
            depends on target platform plugin support.
          </div>
        )}
      </div>
    </div>
  );
}
