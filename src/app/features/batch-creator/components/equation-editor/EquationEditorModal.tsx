import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  RibbonTab,
  SymbolCategory,
  StructureCategory,
  EquationEditorResult,
} from "./types/equation-editor.types";
import { EquationEditorHeader } from "./EquationEditorHeader";
import { EquationRibbon } from "./EquationRibbon";
import { EquationCanvas, EquationCanvasHandle } from "./EquationCanvas";
import { EquationStatusBar } from "./EquationStatusBar";
import { SymbolGalleryPanel } from "./SymbolGalleryPanel";
import { StructureGalleryPanel } from "./StructureGalleryPanel";
import { BuiltInEquationsDropdown } from "./BuiltInEquationsDropdown";
import { EquationContextMenu } from "./EquationContextMenu";
import katex from "katex";

import { renderMathToHtml } from "../ManualFixRichTextEditor";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (result: EquationEditorResult) => void;
  initialLatex?: string;
  mode?: "insert" | "edit";
  displayMode?: "inline" | "block";
}

export function EquationEditorModal({
  isOpen,
  onClose,
  onInsert,
  initialLatex = "",
  mode = "insert",
  displayMode: initialDisplayMode = "inline",
}: Props) {
  // ─── State ─────────────────────────────────────────────────
  const [latex, setLatex] = useState(initialLatex);
  const [displayMode, setDisplayMode] = useState<"inline" | "block">(initialDisplayMode);
  const [activeRibbonTab, setActiveRibbonTab] = useState<RibbonTab>("symbols");
  const [activeSymbolCategory, setActiveSymbolCategory] = useState<SymbolCategory>("basic-math");
  const [activeStructureCategory, setActiveStructureCategory] = useState<StructureCategory>("fractions");
  const [viewMode, setViewMode] = useState<"professional" | "linear">("professional");
  const [showSource, setShowSource] = useState(false);
  const [isBuiltInOpen, setIsBuiltInOpen] = useState(false);
  const [isValid, setIsValid] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const canvasRef = useRef<EquationCanvasHandle>(null);

  // ─── Reset on open ─────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setLatex(initialLatex);
      setDisplayMode(initialDisplayMode);
      setActiveRibbonTab("symbols");
      setActiveSymbolCategory("basic-math");
      setActiveStructureCategory("fractions");
      setViewMode("professional");
      setShowSource(false);
      setIsBuiltInOpen(false);
      setContextMenu(null);
    }
  }, [isOpen, initialLatex, initialDisplayMode]);

  // ─── Validation ────────────────────────────────────────────
  useEffect(() => {
    if (!latex) {
      setIsValid(true);
      setErrorMessage("");
      return;
    }
    try {
      katex.renderToString(latex, { throwOnError: true });
      setIsValid(true);
      setErrorMessage("");
    } catch (err: any) {
      setIsValid(false);
      setErrorMessage(err?.message?.replace(/^KaTeX parse error: /, "") || "Parse error");
    }
  }, [latex]);

  // ─── Handlers ──────────────────────────────────────────────
  const handleInsertSymbol = useCallback((symbolLatex: string) => {
    if (canvasRef.current) {
      canvasRef.current.insert(symbolLatex);
      canvasRef.current.focus();
    } else {
      setLatex((prev) => prev + symbolLatex);
    }
  }, []);

  const handleInsertStructure = useCallback((structureLatex: string) => {
    if (canvasRef.current) {
      canvasRef.current.insert(structureLatex);
      canvasRef.current.focus();
    } else {
      setLatex((prev) => prev + structureLatex);
    }
  }, []);

  const handleInsertBuiltIn = useCallback((eqLatex: string) => {
    if (canvasRef.current) {
      canvasRef.current.setValue(eqLatex);
      canvasRef.current.focus();
    } else {
      setLatex(eqLatex);
    }
  }, []);

  const handleCommit = useCallback(
    (finalDisplayMode: "inline" | "block") => {
      const renderedHTML = renderMathToHtml(latex, finalDisplayMode === "block");

      onInsert({
        latex,
        mathML: "",
        renderedHTML,
        plainText: latex,
        displayMode: finalDisplayMode,
        metadata: {
          sourceFormat: "latex",
          renderer: "katex",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });
      onClose();
    },
    [latex, onInsert, onClose]
  );

  const handleToggleDisplayMode = useCallback(() => {
    setDisplayMode((prev) => (prev === "inline" ? "block" : "inline"));
  }, []);

  const handleToggleLinear = useCallback(() => {
    setViewMode((prev) => (prev === "professional" ? "linear" : "professional"));
  }, []);

  const handleCopyLatex = useCallback(() => {
    navigator.clipboard.writeText(latex);
  }, [latex]);

  const handleCopyMathML = useCallback(() => {
    // placeholder
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  // ─── Keyboard shortcuts ────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      // Ctrl+Enter to insert
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleCommit(displayMode);
      }
      // Escape to close
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, handleCommit, displayMode, onClose]);

  if (!isOpen) return null;

  // Determine which right panel to show
  const showSymbolPanel = activeRibbonTab === "symbols";
  const showStructurePanel = activeRibbonTab === "structures";
  const showRightPanel = showSymbolPanel || showStructurePanel;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-[1100px] h-[600px] max-h-[85vh] bg-card rounded-xl shadow-2xl flex flex-col overflow-hidden border border-border"
        onClick={(e) => e.stopPropagation()}
        onContextMenu={handleContextMenu}
      >
        {/* Header */}
        <EquationEditorHeader
          onClose={onClose}
          onInsert={handleCommit}
          mode={mode}
          displayMode={displayMode}
        />

        {/* Ribbon Toolbar */}
        <EquationRibbon
          activeTab={activeRibbonTab}
          onChangeTab={setActiveRibbonTab}
          onInsertBuiltIn={() => setIsBuiltInOpen((v) => !v)}
          onToggleLinear={handleToggleLinear}
          viewMode={viewMode}
          displayMode={displayMode}
          onToggleDisplayMode={handleToggleDisplayMode}
          onCopyLatex={handleCopyLatex}
          onCopyMathML={handleCopyMathML}
          onInsert={handleInsertStructure}
          onExecuteCommand={(cmd) => canvasRef.current?.executeCommand(cmd)}
        />

        {/* Built-in Equations Dropdown (positioned relative to ribbon) */}
        <div className="relative">
          <BuiltInEquationsDropdown
            isOpen={isBuiltInOpen}
            onClose={() => setIsBuiltInOpen(false)}
            onInsertEquation={handleInsertBuiltIn}
          />
        </div>

        {/* Main content: Canvas + optional right panel */}
        <div className="flex flex-1 overflow-hidden">
          {/* MathLive Canvas */}
          <div className="flex-1 flex flex-col min-w-0">
            <EquationCanvas
              ref={canvasRef}
              value={latex}
              onChange={setLatex}
              displayMode={displayMode}
              readOnly={viewMode === "linear" && showSource}
            />

            {/* Inline LaTeX source editor (toggle) */}
            {showSource && (
              <div className="border-t border-border bg-muted/30 p-3 shrink-0">
                <textarea
                  value={latex}
                  onChange={(e) => {
                    setLatex(e.target.value);
                    if (canvasRef.current) {
                      canvasRef.current.setValue(e.target.value);
                    }
                  }}
                  className="w-full h-20 text-xs font-mono bg-card border border-border rounded-md p-2.5 resize-none focus:outline-none focus:border-primary/50 text-foreground"
                  placeholder="Type LaTeX here..."
                  spellCheck={false}
                />
              </div>
            )}
          </div>

          {/* Right Panel: Symbol or Structure Gallery */}
          {showSymbolPanel && (
            <SymbolGalleryPanel
              onInsertSymbol={handleInsertSymbol}
              activeCategory={activeSymbolCategory}
              onChangeCategory={setActiveSymbolCategory}
            />
          )}

          {showStructurePanel && (
            <StructureGalleryPanel
              onInsertStructure={handleInsertStructure}
              activeCategory={activeStructureCategory}
              onChangeCategory={setActiveStructureCategory}
            />
          )}
        </div>

        {/* Status Bar */}
        <EquationStatusBar
          latex={latex}
          isValid={isValid}
          errorMessage={errorMessage}
          displayMode={displayMode}
          showSource={showSource}
          onToggleSource={() => setShowSource((v) => !v)}
        />

        {/* Context Menu */}
        <EquationContextMenu
          x={contextMenu?.x ?? 0}
          y={contextMenu?.y ?? 0}
          isOpen={!!contextMenu}
          onClose={() => setContextMenu(null)}
          latex={latex}
          onCut={() => canvasRef.current?.executeCommand("cut")}
          onCopy={() => canvasRef.current?.executeCommand("copy")}
          onPaste={() => canvasRef.current?.executeCommand("paste")}
          onDelete={() => canvasRef.current?.executeCommand("deleteBackward")}
        />
      </div>
    </div>
  );
}
