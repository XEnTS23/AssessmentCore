import React, { useState, useEffect, useMemo } from "react";
import { X, Grid, Check, Sparkles, MoveRight, MoveDown, Layers } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";

export type MatrixStyle = "pmatrix" | "bmatrix" | "vmatrix" | "Vmatrix" | "matrix";
export type MatrixPreset =
  | "custom"
  | "row"
  | "column"
  | "square"
  | "identity"
  | "zero"
  | "determinant"
  | "transpose";

interface MatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (latex: string) => void;
  initialLatex?: string;
}

const BRACKET_OPTIONS: Array<{
  style: MatrixStyle;
  label: string;
  brackets: string;
  desc: string;
}> = [
  { style: "bmatrix", label: "Square Brackets", brackets: "[  ]", desc: "Standard matrix with square brackets" },
  { style: "pmatrix", label: "Parentheses", brackets: "(  )", desc: "Matrix with round parentheses" },
  { style: "vmatrix", label: "Determinant", brackets: "|  |", desc: "Single vertical bars for determinant" },
  { style: "Vmatrix", label: "Norm", brackets: "|| ||", desc: "Double vertical bars for matrix norm" },
  { style: "matrix", label: "Plain", brackets: "   ", desc: "Unbracketed matrix layout" },
];

const PRESETS: Array<{
  id: MatrixPreset;
  label: string;
  rows: number;
  cols: number;
  style: MatrixStyle;
  desc: string;
}> = [
  { id: "custom", label: "Custom Grid", rows: 2, cols: 2, style: "bmatrix", desc: "Custom size and bracket type" },
  { id: "row", label: "Row Vector (1×3)", rows: 1, cols: 3, style: "bmatrix", desc: "Single row matrix (1 × N)" },
  { id: "column", label: "Column Vector (3×1)", rows: 3, cols: 1, style: "bmatrix", desc: "Single column matrix (M × 1)" },
  { id: "square", label: "3×3 Matrix", rows: 3, cols: 3, style: "bmatrix", desc: "Standard 3×3 square matrix" },
  { id: "identity", label: "Identity Matrix (3×3)", rows: 3, cols: 3, style: "bmatrix", desc: "Diagonal ones with zeroes" },
  { id: "zero", label: "Zero Matrix (2×2)", rows: 2, cols: 2, style: "bmatrix", desc: "Matrix filled with zeroes" },
  { id: "determinant", label: "Determinant |A|", rows: 2, cols: 2, style: "vmatrix", desc: "2×2 Determinant notation" },
  { id: "transpose", label: "Transpose Aᵀ", rows: 2, cols: 2, style: "bmatrix", desc: "Matrix with transpose superscript" },
];

export interface ParsedMatrix {
  style: MatrixStyle;
  rows: number;
  cols: number;
  cells: string[][];
  isInline: boolean;
  isTranspose: boolean;
}

export function parseMatrixLatex(rawLatex: string): ParsedMatrix | null {
  if (!rawLatex) return null;
  let str = rawLatex.trim();

  let isInline = true;
  if (str.startsWith("$$") && str.endsWith("$$")) {
    isInline = false;
    str = str.slice(2, -2).trim();
  } else if (str.startsWith("$") && str.endsWith("$")) {
    isInline = true;
    str = str.slice(1, -1).trim();
  }

  let isTranspose = false;
  const transposeMatch = str.match(/(?:\^{T}|\^T|\^{\\top}|\^\\top)$/);
  if (transposeMatch) {
    isTranspose = true;
    str = str.slice(0, -transposeMatch[0].length).trim();
  }

  const envMatch = str.match(/\\begin\{(matrix|pmatrix|bmatrix|vmatrix|Vmatrix)\}([\s\S]*?)\\end\{\1\}/);
  if (!envMatch) return null;

  const style = envMatch[1] as MatrixStyle;
  const body = envMatch[2].trim();

  const rawRows = body.split(/\\\\|\\cr/);
  const parsedCells: string[][] = [];

  for (const rawRow of rawRows) {
    const trimmedRow = rawRow.trim();
    if (!trimmedRow && parsedCells.length > 0) continue;
    const rowCells = trimmedRow.split("&").map((cell) => cell.trim());
    parsedCells.push(rowCells);
  }

  if (parsedCells.length === 0) return null;

  const rows = parsedCells.length;
  const cols = Math.max(1, ...parsedCells.map((r) => r.length));

  const normalizedCells: string[][] = parsedCells.map((r) => {
    const rowArr = [...r];
    while (rowArr.length < cols) {
      rowArr.push("0");
    }
    return rowArr;
  });

  return {
    style,
    rows,
    cols,
    cells: normalizedCells,
    isInline,
    isTranspose,
  };
}

export function buildMatrixElementHtml(latex: string): string {
  const cleanLatex = latex.trim();
  const escapedAttr = cleanLatex.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const escapedBody = cleanLatex.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<span class="math-matrix inline-block cursor-pointer select-none" data-matrix="true" data-latex="${escapedAttr}" title="Double-click to edit matrix" contenteditable="false">${escapedBody}</span>`;
}

export function buildMatrixLatex(
  cells: string[][],
  rows: number,
  cols: number,
  style: MatrixStyle,
  isInline: boolean,
  isTranspose: boolean,
): string {
  const rowStrings = cells.slice(0, rows).map((rowArr) =>
    rowArr.slice(0, cols).map((val) => val.trim() || "0").join(" & ")
  );
  const body = rowStrings.join(" \\\\ ");
  let latexEnv = `\\begin{${style}} ${body} \\end{${style}}`;
  if (isTranspose) {
    latexEnv = `${latexEnv}^{T}`;
  }
  return isInline ? `$${latexEnv}$` : `$$${latexEnv}$$`;
}

export function MatrixModal({ isOpen, onClose, onInsert, initialLatex }: MatrixModalProps) {
  const [preset, setPreset] = useState<MatrixPreset>("custom");
  const [rows, setRows] = useState<number>(2);
  const [cols, setCols] = useState<number>(2);
  const [style, setStyle] = useState<MatrixStyle>("bmatrix");
  const [isInline, setIsInline] = useState<boolean>(true);
  const [isTranspose, setIsTranspose] = useState<boolean>(false);
  const [cells, setCells] = useState<string[][]>([
    ["a", "b"],
    ["c", "d"],
  ]);

  // Pre-fill state when opening to edit an existing matrix
  useEffect(() => {
    if (isOpen && initialLatex) {
      const parsed = parseMatrixLatex(initialLatex);
      if (parsed) {
        setPreset("custom");
        setRows(parsed.rows);
        setCols(parsed.cols);
        setStyle(parsed.style);
        setIsInline(parsed.isInline);
        setIsTranspose(parsed.isTranspose);
        setCells(parsed.cells);
      }
    }
  }, [isOpen, initialLatex]);

  // Handle Preset Changes
  const applyPreset = (selectedPreset: MatrixPreset) => {
    setPreset(selectedPreset);
    const target = PRESETS.find((p) => p.id === selectedPreset);
    if (!target) return;

    let targetRows = target.rows;
    let targetCols = target.cols;
    let targetStyle = target.style;
    let transpose = false;

    if (selectedPreset === "transpose") {
      transpose = true;
    } else {
      transpose = false;
    }

    setRows(targetRows);
    setCols(targetCols);
    setStyle(targetStyle);
    setIsTranspose(transpose);

    // Initialize cells according to preset
    const newCells: string[][] = [];
    for (let r = 0; r < targetRows; r++) {
      const rowArr: string[] = [];
      for (let c = 0; c < targetCols; c++) {
        if (selectedPreset === "identity") {
          rowArr.push(r === c ? "1" : "0");
        } else if (selectedPreset === "zero") {
          rowArr.push("0");
        } else if (selectedPreset === "row") {
          rowArr.push(`x_${c + 1}`);
        } else if (selectedPreset === "column") {
          rowArr.push(`y_${r + 1}`);
        } else {
          rowArr.push(targetRows <= 2 && targetCols <= 2 ? ["a", "b", "c", "d"][r * targetCols + c] || "0" : `a_{${r + 1}${c + 1}}`);
        }
      }
      newCells.push(rowArr);
    }
    setCells(newCells);
  };

  // Sync cell grid when rows or cols change manually
  const updateDimensions = (newRows: number, newCols: number) => {
    const validRows = Math.max(1, Math.min(6, newRows));
    const validCols = Math.max(1, Math.min(6, newCols));
    setRows(validRows);
    setCols(validCols);

    setCells((prev) => {
      const updated: string[][] = [];
      for (let r = 0; r < validRows; r++) {
        const rowArr: string[] = [];
        for (let c = 0; c < validCols; c++) {
          rowArr.push(prev[r]?.[c] ?? `a_{${r + 1}${c + 1}}`);
        }
        updated.push(rowArr);
      }
      return updated;
    });
  };

  const handleCellChange = (r: number, c: number, val: string) => {
    setCells((prev) => {
      const copy = prev.map((rowArr) => [...rowArr]);
      if (copy[r]) copy[r][c] = val;
      return copy;
    });
  };

  const generatedLatex = useMemo(() => {
    return buildMatrixLatex(cells, rows, cols, style, isInline, isTranspose);
  }, [cells, rows, cols, style, isInline, isTranspose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="matrix-modal-title"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <header className="flex min-h-14 items-center justify-between border-b border-border px-5 bg-muted/20">
          <div className="flex items-center gap-2">
            <Grid className="h-4 w-4 text-primary" />
            <h3 id="matrix-modal-title" className="text-sm font-semibold text-foreground">
              Insert Matrix / Determinant
            </h3>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close matrix modal"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </header>

        {/* Content Body */}
        <div className="overflow-y-auto p-5 space-y-5">
          {/* Preset Selector */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-2">
              Matrix Category / Preset
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p.id)}
                  className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all ${
                    preset === p.id
                      ? "border-primary bg-primary/5 text-primary font-medium shadow-xs"
                      : "border-border hover:bg-muted/50 text-foreground"
                  }`}
                >
                  <span className="text-xs font-medium">{p.label}</span>
                  <span className="text-[10px] text-muted-foreground line-clamp-1">
                    {p.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Dimension Controls & Bracket Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border pt-4">
            {/* Dimensions */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-foreground">
                Dimensions (Rows × Columns)
              </label>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground font-medium">Rows:</span>
                  <Input
                    type="number"
                    min={1}
                    max={6}
                    value={rows}
                    onChange={(e) => updateDimensions(parseInt(e.target.value) || 1, cols)}
                    className="h-8 w-16 text-center text-xs"
                  />
                </div>
                <span className="text-xs text-muted-foreground">×</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground font-medium">Cols:</span>
                  <Input
                    type="number"
                    min={1}
                    max={6}
                    value={cols}
                    onChange={(e) => updateDimensions(rows, parseInt(e.target.value) || 1)}
                    className="h-8 w-16 text-center text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Formatting Toggles */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-foreground">
                Layout & Style Options
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={isInline}
                    onChange={(e) => setIsInline(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                  />
                  <span>Inline Math (<code>$...$</code>)</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={isTranspose}
                    onChange={(e) => setIsTranspose(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                  />
                  <span>Transpose (<code>Aᵀ</code>)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Bracket Style Selector */}
          <div className="border-t border-border pt-4">
            <label className="block text-xs font-semibold text-foreground mb-2">
              Bracket Style
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {BRACKET_OPTIONS.map((opt) => (
                <button
                  key={opt.style}
                  type="button"
                  onClick={() => setStyle(opt.style)}
                  className={`flex flex-col items-center justify-center p-2 rounded-md border text-center transition-all ${
                    style === opt.style
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-border hover:bg-muted/50 text-foreground"
                  }`}
                >
                  <span className="text-xs font-mono">{opt.brackets}</span>
                  <span className="text-[10px] mt-0.5">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Cell Grid Editor */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-foreground">
                Cell Values ({rows} × {cols})
              </label>
              <span className="text-[10px] text-muted-foreground">
                Type numbers, variables (e.g. x, y), or fractions (\frac&#123;a&#125;&#123;b&#125;)
              </span>
            </div>
            <div
              className="grid gap-2 p-3 bg-muted/20 border border-border rounded-lg overflow-x-auto max-w-full"
              style={{
                gridTemplateColumns: `repeat(${cols}, minmax(64px, 1fr))`,
              }}
            >
              {cells.slice(0, rows).map((rowArr, r) =>
                rowArr.slice(0, cols).map((val, c) => (
                  <Input
                    key={`cell-${r}-${c}`}
                    value={val}
                    onChange={(e) => handleCellChange(r, c, e.target.value)}
                    placeholder={`a${r + 1}${c + 1}`}
                    className="h-8 text-center text-xs font-mono bg-background"
                  />
                ))
              )}
            </div>
          </div>

          {/* Generated Code & Visual Preview */}
          <div className="border-t border-border pt-4 space-y-2">
            <label className="block text-xs font-semibold text-foreground">
              Generated LaTeX Output
            </label>
            <div className="p-3 bg-muted/40 border border-border rounded-md font-mono text-xs text-foreground overflow-x-auto select-all">
              {generatedLatex}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="flex min-h-14 items-center justify-end gap-2 border-t border-border px-5 bg-muted/20">
          <Button type="button" variant="outline" onClick={onClose} className="h-8 text-xs">
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              onInsert(generatedLatex);
              onClose();
            }}
            className="h-8 text-xs gap-1.5"
          >
            <Check className="h-3.5 w-3.5" />
            {initialLatex ? "Update Matrix" : "Insert Matrix"}
          </Button>
        </footer>
      </div>
    </div>
  );
}
