import React, { useState, useEffect } from "react";
import {
  X,
  Table,
  Plus,
  Trash2,
  Maximize2,
  Minimize2,
  Grid,
} from "lucide-react";
import { Button } from "../../../components/ui/button";

interface TableCellState {
  text: string;
  bgColor: string;
  borderColor: string;
  borderWidth: string;
  colSpan: number;
  rowSpan: number;
}

interface TableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (html: string) => void;
  initialHtml?: string;
}

export function TableModal({
  isOpen,
  onClose,
  onInsert,
  initialHtml,
}: TableModalProps) {
  const [step, setStep] = useState<"create" | "edit">("create");
  const [rowsCount, setRowsCount] = useState(3);
  const [colsCount, setColsCount] = useState(3);
  const [grid, setGrid] = useState<TableCellState[][]>([]);
  const [selectedCell, setSelectedCell] = useState<{
    r: number;
    c: number;
  } | null>(null);
  const [colWidths, setColWidths] = useState<number[]>([]);
  const [rowHeights, setRowHeights] = useState<number[]>([]);

  // Parse initial HTML if editing
  useEffect(() => {
    if (isOpen) {
      if (initialHtml && initialHtml.includes("<table")) {
        try {
          const parsed = parseHtmlTable(initialHtml);
          if (parsed && parsed.grid.length > 0) {
            setGrid(parsed.grid);
            setColWidths(parsed.colWidths);
            setRowHeights(parsed.rowHeights);
            setStep("edit");
            setSelectedCell({ r: 0, c: 0 });
            return;
          }
        } catch (e) {
          console.error("Failed to parse initial HTML table", e);
        }
      }
      // Reset to create state
      setStep("create");
      setRowsCount(3);
      setColsCount(3);
      setGrid([]);
      setColWidths([]);
      setRowHeights([]);
      setSelectedCell(null);
    }
  }, [isOpen, initialHtml]);

  if (!isOpen) return null;

  // Initialize fresh grid
  const handleInitialize = () => {
    const newGrid: TableCellState[][] = [];
    const initialColWidths: number[] = [];
    for (let c = 0; c < colsCount; c++) {
      initialColWidths.push(120);
    }
    const initialRowHeights: number[] = [];
    for (let r = 0; r < rowsCount; r++) {
      initialRowHeights.push(45);
      const rowCells: TableCellState[] = [];
      for (let c = 0; c < colsCount; c++) {
        rowCells.push({
          text: r === 0 ? `Header ${c + 1}` : `Cell ${r}-${c}`,
          bgColor: r === 0 ? "#f3f4f6" : "",
          borderColor: "#cccccc",
          borderWidth: "1px",
          colSpan: 1,
          rowSpan: 1,
        });
      }
      newGrid.push(rowCells);
    }
    setGrid(newGrid);
    setColWidths(initialColWidths);
    setRowHeights(initialRowHeights);
    setSelectedCell({ r: 0, c: 0 });
    setStep("edit");
  };

  // Cell color changes
  const updateSelectedCellProperty = (key: keyof TableCellState, val: any) => {
    if (!selectedCell) return;
    const { r, c } = selectedCell;
    setGrid((current) => {
      const next = [...current.map((row) => [...row])];
      next[r][c] = { ...next[r][c], [key]: val };
      return next;
    });
  };

  // Row operations
  const addRow = () => {
    setGrid((current) => {
      const next = [...current.map((row) => [...row])];
      const cols = next[0]?.length || 3;
      const insertAt = selectedCell ? selectedCell.r + 1 : next.length;

      const newRow: TableCellState[] = Array.from({ length: cols }, (_, c) => ({
        text: `New Cell`,
        bgColor: "",
        borderColor: "#cccccc",
        borderWidth: "1px",
        colSpan: 1,
        rowSpan: 1,
      }));

      next.splice(insertAt, 0, newRow);
      return next;
    });

    setRowHeights((prev) => {
      const next = [...prev];
      const insertAt = selectedCell ? selectedCell.r + 1 : next.length;
      next.splice(insertAt, 0, 45);
      return next;
    });
  };

  const deleteRow = () => {
    if (!selectedCell || grid.length <= 1) return;
    const targetRow = selectedCell.r;
    setGrid((current) => {
      const next = current.filter((_, idx) => idx !== targetRow);
      return next;
    });
    setRowHeights((prev) => prev.filter((_, idx) => idx !== targetRow));
    setSelectedCell({ r: Math.max(0, targetRow - 1), c: 0 });
  };

  // Column operations
  const addColumn = () => {
    setGrid((current) => {
      const next = current.map((row) => {
        const nextRow = [...row];
        const insertAt = selectedCell ? selectedCell.c + 1 : nextRow.length;
        nextRow.splice(insertAt, 0, {
          text: `New Cell`,
          bgColor: "",
          borderColor: "#cccccc",
          borderWidth: "1px",
          colSpan: 1,
          rowSpan: 1,
        });
        return nextRow;
      });
      return next;
    });

    setColWidths((prev) => {
      const next = [...prev];
      const insertAt = selectedCell ? selectedCell.c + 1 : next.length;
      next.splice(insertAt, 0, 120);
      return next;
    });
  };

  const deleteColumn = () => {
    if (!selectedCell || (grid[0]?.length || 0) <= 1) return;
    const targetCol = selectedCell.c;
    setGrid((current) => {
      return current.map((row) => row.filter((_, idx) => idx !== targetCol));
    });
    setColWidths((prev) => prev.filter((_, idx) => idx !== targetCol));
    setSelectedCell({ r: 0, c: Math.max(0, targetCol - 1) });
  };

  // Merging right
  const mergeRight = () => {
    if (!selectedCell) return;
    const { r, c } = selectedCell;
    const row = grid[r];
    if (c + 1 >= row.length) return; // boundary check

    const currentCell = row[c];
    const adjacentCell = row[c + 1];

    if (adjacentCell.colSpan === 0 || adjacentCell.rowSpan === 0) return;

    setGrid((current) => {
      const next = [...current.map((rw) => [...rw])];
      next[r][c].colSpan =
        (currentCell.colSpan || 1) + (adjacentCell.colSpan || 1);
      next[r][c + 1].colSpan = 0; // Mark merged cell as inactive
      return next;
    });
  };

  // Merging down
  const mergeDown = () => {
    if (!selectedCell) return;
    const { r, c } = selectedCell;
    if (r + 1 >= grid.length) return; // boundary check

    const currentCell = grid[r][c];
    const cellBelow = grid[r + 1][c];

    if (cellBelow.colSpan === 0 || cellBelow.rowSpan === 0) return;

    setGrid((current) => {
      const next = [...current.map((rw) => [...rw])];
      next[r][c].rowSpan =
        (currentCell.rowSpan || 1) + (cellBelow.rowSpan || 1);
      next[r + 1][c].rowSpan = 0; // Mark merged cell as inactive
      return next;
    });
  };

  // Split selected cell
  const splitCell = () => {
    if (!selectedCell) return;
    const { r, c } = selectedCell;
    const cell = grid[r][c];
    if (cell.colSpan <= 1 && cell.rowSpan <= 1) return;

    setGrid((current) => {
      const next = [...current.map((rw) => [...rw])];
      const origColSpan = cell.colSpan;
      const origRowSpan = cell.rowSpan;

      // Restore cells
      for (let ri = 0; ri < origRowSpan; ri++) {
        for (let ci = 0; ci < origColSpan; ci++) {
          if (r + ri < next.length && c + ci < next[r + ri].length) {
            next[r + ri][c + ci] = {
              text: next[r + ri][c + ci].text || "Cell",
              bgColor: "",
              borderColor: "#cccccc",
              borderWidth: "1px",
              colSpan: 1,
              rowSpan: 1,
            };
          }
        }
      }
      return next;
    });
  };

  // Column and Row Drag-Resize Handlers
  const handleColResizeStart = (e: React.MouseEvent, colIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = colWidths[colIndex] || 120;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(50, startWidth + deltaX);
      setColWidths((prev) => {
        const next = [...prev];
        next[colIndex] = newWidth;
        return next;
      });
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleRowResizeStart = (e: React.MouseEvent, rowIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const startHeight = rowHeights[rowIndex] || 45;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const newHeight = Math.max(30, startHeight + deltaY);
      setRowHeights((prev) => {
        const next = [...prev];
        next[rowIndex] = newHeight;
        return next;
      });
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // Compile grid to raw html
  const handleInsert = () => {
    const html = compileGridToHtmlTable(grid, colWidths, rowHeights);
    onInsert(html);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-3xl bg-background border border-border shadow-2xl rounded-xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary grid place-items-center">
              <Table className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Interactive Table Builder</h3>
              <p className="text-[10px] text-muted-foreground">
                Build styled XHTML tables visually with cell merge and borders
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full border border-border bg-background flex items-center justify-center hover:bg-muted"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Create Screen */}
        {step === "create" && (
          <div className="p-8 flex flex-col items-center justify-center space-y-6">
            <Grid className="h-16 w-16 text-muted-foreground/30" />
            <h4 className="text-sm font-semibold">Define Table Dimensions</h4>
            <div className="flex items-center gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">
                  Rows
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={rowsCount}
                  onChange={(e) => setRowsCount(parseInt(e.target.value) || 1)}
                  className="w-20 h-9 border border-border rounded-lg text-center font-semibold text-sm outline-none focus:border-primary bg-background"
                />
              </div>
              <div className="text-muted-foreground font-bold">×</div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">
                  Columns
                </label>
                <input
                  type="number"
                  min={1}
                  max={15}
                  value={colsCount}
                  onChange={(e) => setColsCount(parseInt(e.target.value) || 1)}
                  className="w-20 h-9 border border-border rounded-lg text-center font-semibold text-sm outline-none focus:border-primary bg-background"
                />
              </div>
            </div>
            <Button onClick={handleInitialize} className="w-48">
              Generate Grid
            </Button>
          </div>
        )}

        {/* Edit Screen */}
        {step === "edit" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="p-3 border-b border-border bg-muted/5 flex flex-wrap gap-2 items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addRow}
                  className="h-8 gap-1 text-[10px]"
                >
                  <Plus className="h-3 w-3" /> Row
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={deleteRow}
                  className="h-8 gap-1 text-[10px] text-destructive hover:bg-destructive/5"
                >
                  <Trash2 className="h-3 w-3" /> Row
                </Button>
                <span className="h-5 w-px bg-border mx-1" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addColumn}
                  className="h-8 gap-1 text-[10px]"
                >
                  <Plus className="h-3 w-3" /> Col
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={deleteColumn}
                  className="h-8 gap-1 text-[10px] text-destructive hover:bg-destructive/5"
                >
                  <Trash2 className="h-3 w-3" /> Col
                </Button>
                <span className="h-5 w-px bg-border mx-1" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={mergeRight}
                  className="h-8 gap-1 text-[10px]"
                >
                  <Maximize2 className="h-3 w-3" /> Merge Right
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={mergeDown}
                  className="h-8 gap-1 text-[10px]"
                >
                  <Maximize2 className="h-3 w-3 rotate-90" /> Merge Down
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={splitCell}
                  className="h-8 gap-1 text-[10px]"
                >
                  <Minimize2 className="h-3 w-3" /> Split
                </Button>
              </div>

              {selectedCell && grid[selectedCell.r]?.[selectedCell.c] && (
                <div className="flex items-center gap-2">
                  {/* Fill Color */}
                  <select
                    value={grid[selectedCell.r][selectedCell.c].bgColor}
                    onChange={(e) =>
                      updateSelectedCellProperty("bgColor", e.target.value)
                    }
                    className="h-8 text-[10px] border border-border bg-background rounded-lg outline-none font-medium px-2"
                  >
                    <option value="">No Fill</option>
                    <option value="#f3f4f6">Light Gray</option>
                    <option value="#fee2e2">Red Fill</option>
                    <option value="#dcfce7">Green Fill</option>
                    <option value="#dbeafe">Blue Fill</option>
                    <option value="#fef9c3">Yellow Fill</option>
                  </select>

                  {/* Border Width */}
                  <select
                    value={grid[selectedCell.r][selectedCell.c].borderWidth}
                    onChange={(e) =>
                      updateSelectedCellProperty("borderWidth", e.target.value)
                    }
                    className="h-8 text-[10px] border border-border bg-background rounded-lg outline-none font-medium px-2"
                  >
                    <option value="1px">Thin Border (1px)</option>
                    <option value="2px">Medium (2px)</option>
                    <option value="3px">Thick (3px)</option>
                    <option value="0px">No Border</option>
                  </select>

                  {/* Border Color */}
                  <input
                    type="color"
                    value={
                      grid[selectedCell.r][selectedCell.c].borderColor ||
                      "#cccccc"
                    }
                    onChange={(e) =>
                      updateSelectedCellProperty("borderColor", e.target.value)
                    }
                    className="w-8 h-8 rounded border border-border cursor-pointer p-0.5"
                    title="Border Color"
                  />
                </div>
              )}
            </div>

            {/* Editable Grid View */}
            <div className="flex-1 overflow-auto p-6 bg-muted/10 grid place-items-center">
              {(() => {
                const totalWidth = colWidths.reduce((a, b) => a + b, 0);
                return (
                  <table
                    className="border-collapse bg-background shadow-lg rounded-lg overflow-hidden"
                    style={{
                      width: `${totalWidth}px`,
                      tableLayout: "fixed",
                      maxWidth: "none",
                    }}
                  >
                    <colgroup>
                      {colWidths.map((width, idx) => (
                        <col key={idx} style={{ width: `${width}px` }} />
                      ))}
                    </colgroup>
                    <tbody>
                      {grid.map((row, r) => (
                        <tr
                          key={r}
                          style={{ height: `${rowHeights[r] || 45}px` }}
                        >
                          {row.map((cell, c) => {
                            if (cell.colSpan === 0 || cell.rowSpan === 0)
                              return null;
                            const isSelected =
                              selectedCell?.r === r && selectedCell?.c === c;
                            const targetColIdx = c + cell.colSpan - 1;
                            const targetRowIdx = r + cell.rowSpan - 1;

                            return (
                              <td
                                key={c}
                                colSpan={cell.colSpan}
                                rowSpan={cell.rowSpan}
                                onClick={() => setSelectedCell({ r, c })}
                                style={{
                                  backgroundColor: cell.bgColor || undefined,
                                  border: `${cell.borderWidth} solid ${cell.borderColor}`,
                                  padding: "0px",
                                  width:
                                    cell.colSpan === 1
                                      ? `${colWidths[c]}px`
                                      : undefined,
                                  height:
                                    cell.rowSpan === 1
                                      ? `${rowHeights[r]}px`
                                      : undefined,
                                }}
                                className={`relative transition-colors ${
                                  isSelected
                                    ? "ring-2 ring-primary ring-inset bg-primary/5"
                                    : "hover:bg-muted/30"
                                }`}
                              >
                                <input
                                  type="text"
                                  value={cell.text}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setGrid((current) => {
                                      const next = [
                                        ...current.map((rw) => [...rw]),
                                      ];
                                      next[r][c].text = val;
                                      return next;
                                    });
                                  }}
                                  className="w-full h-full bg-transparent outline-none border-0 text-xs px-3 py-2 text-center"
                                  placeholder="Cell value"
                                />

                                {/* Column Resize Handle (Right edge) */}
                                <div
                                  onMouseDown={(e) =>
                                    handleColResizeStart(e, targetColIdx)
                                  }
                                  className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize z-20 group"
                                  title="Drag to resize column"
                                >
                                  <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-transparent group-hover:bg-primary group-active:bg-primary transition-colors" />
                                </div>

                                {/* Row Resize Handle (Bottom edge) */}
                                <div
                                  onMouseDown={(e) =>
                                    handleRowResizeStart(e, targetRowIdx)
                                  }
                                  className="absolute bottom-0 left-0 right-0 h-2 cursor-row-resize z-20 group"
                                  title="Drag to resize row"
                                >
                                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-transparent group-hover:bg-primary group-active:bg-primary transition-colors" />
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>

            {/* Footer actions */}
            <div className="h-14 border-t border-border flex items-center justify-between px-6 shrink-0 bg-muted/20">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep("create")}
              >
                Reset Layout
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleInsert}>
                  {initialHtml && initialHtml.includes("<table")
                    ? "OK"
                    : "Insert Table"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── XML Table Compiler / Parsers ──────────────────────────────────── */

function compileGridToHtmlTable(
  grid: TableCellState[][],
  colWidths: number[],
  rowHeights: number[],
): string {
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  const html: string[] = [
    `<table border="1" style="border-collapse: collapse; border-color: #cccccc; width: ${totalWidth}px;">`,
  ];

  if (colWidths.length > 0) {
    html.push("<colgroup>");
    colWidths.forEach((width) => {
      html.push(`<col style="width: ${width}px;" />`);
    });
    html.push("</colgroup>");
  }

  html.push("<tbody>");
  grid.forEach((row, rowIndex) => {
    const rowHeight = rowHeights[rowIndex];
    const rowHeightAttr = rowHeight ? ` style="height: ${rowHeight}px;"` : "";
    html.push(`<tr${rowHeightAttr}>`);

    row.forEach((cell, columnIndex) => {
      if (cell.colSpan === 0 || cell.rowSpan === 0) return;

      const styles: string[] = [];
      if (cell.bgColor) styles.push(`background-color: ${cell.bgColor}`);
      if (cell.borderColor) styles.push(`border-color: ${cell.borderColor}`);
      if (cell.borderWidth) styles.push(`border-width: ${cell.borderWidth}`);
      if (cell.colSpan === 1 && colWidths[columnIndex]) {
        styles.push(`width: ${colWidths[columnIndex]}px`);
      }
      if (cell.rowSpan === 1 && rowHeight) {
        styles.push(`height: ${rowHeight}px`);
      }
      styles.push("padding: 8px");

      const styleAttr = ` style="${styles.join("; ")}"`;
      const colSpanAttr = cell.colSpan > 1 ? ` colspan="${cell.colSpan}"` : "";
      const rowSpanAttr = cell.rowSpan > 1 ? ` rowspan="${cell.rowSpan}"` : "";
      html.push(
        `<td${colSpanAttr}${rowSpanAttr}${styleAttr}>${escapeTableCellText(cell.text)}</td>`,
      );
    });
    html.push("</tr>");
  });
  html.push("</tbody>", "</table>");
  return html.join("");
}

function escapeTableCellText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
interface ParsedTable {
  grid: TableCellState[][];
  colWidths: number[];
  rowHeights: number[];
}

function parseHtmlTable(html: string): ParsedTable {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const table = doc.querySelector("table");
  if (!table) {
    return { grid: [], colWidths: [], rowHeights: [] };
  }

  const rows = Array.from(table.querySelectorAll("tr"));
  const tempGrid: TableCellState[][] = [];

  // Determine actual maximum columns
  let maxCols = 0;
  rows.forEach((tr) => {
    let colCount = 0;
    tr.querySelectorAll("td, th").forEach((cell) => {
      colCount += parseInt(cell.getAttribute("colspan") || "1");
    });
    if (colCount > maxCols) {
      maxCols = colCount;
    }
  });

  // Parse colWidths
  const colWidths: number[] = Array.from({ length: maxCols }, () => 120);
  const colElements = Array.from(table.querySelectorAll("col"));
  if (colElements.length > 0) {
    colElements.forEach((col, idx) => {
      if (idx < maxCols) {
        const w = parseInt(col.style.width || col.getAttribute("width") || "");
        if (!isNaN(w)) {
          colWidths[idx] = w;
        }
      }
    });
  } else {
    // Traverse cell widths in first row or any row to approximate
    rows.forEach((tr) => {
      let colIdx = 0;
      tr.querySelectorAll("td, th").forEach((td) => {
        const el = td as HTMLElement;
        const w = parseInt(el.style.width || el.getAttribute("width") || "");
        const colSpan = parseInt(el.getAttribute("colspan") || "1");
        if (!isNaN(w) && colSpan === 1 && colIdx < maxCols) {
          colWidths[colIdx] = w;
        }
        colIdx += colSpan;
      });
    });
  }

  // Parse rowHeights
  const rowHeights: number[] = [];
  rows.forEach((tr) => {
    const el = tr as HTMLElement;
    let h = parseInt(el.style.height || el.getAttribute("height") || "");
    if (isNaN(h)) {
      const cell = tr.querySelector("td, th") as HTMLElement | null;
      if (cell) {
        const cellH = parseInt(
          cell.style.height || cell.getAttribute("height") || "",
        );
        if (!isNaN(cellH)) {
          h = cellH;
        }
      }
    }
    rowHeights.push(isNaN(h) ? 45 : h);
  });

  // Determine actual row & col dimensions including spans
  rows.forEach((tr) => {
    const rowCells: TableCellState[] = [];
    const tdList = Array.from(tr.querySelectorAll("td, th"));
    tdList.forEach((td) => {
      const el = td as HTMLElement;

      let bgColor = el.style.backgroundColor || "";
      if (bgColor.startsWith("rgb")) {
        bgColor = rgbToHex(bgColor) || bgColor;
      }
      const borderColor = el.style.borderColor || "#cccccc";
      const borderWidth = el.style.borderWidth || "1px";
      const colSpan = parseInt(el.getAttribute("colspan") || "1");
      const rowSpan = parseInt(el.getAttribute("rowspan") || "1");

      rowCells.push({
        text: el.innerText || el.textContent || "",
        bgColor,
        borderColor,
        borderWidth,
        colSpan,
        rowSpan,
      });
    });
    tempGrid.push(rowCells);
  });

  return {
    grid: tempGrid,
    colWidths,
    rowHeights,
  };
}

function rgbToHex(rgb: string): string | null {
  const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (!match) return null;
  const hex = (x: string) => ("0" + parseInt(x).toString(16)).slice(-2);
  return "#" + hex(match[1]) + hex(match[2]) + hex(match[3]);
}
