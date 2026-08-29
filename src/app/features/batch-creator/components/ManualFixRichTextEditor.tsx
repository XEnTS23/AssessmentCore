import React, { useEffect, useRef, useState } from "react";
import { canonicalizeEditorMathMarkup } from "../fixing/richContentEditing";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Highlighter,
  Italic,
  Paperclip,
  Palette,
  Pilcrow,
  Sigma,
  Table,
  Type,
  Underline,
  Code,
} from "lucide-react";

export function highlightHtml(html: string) {
  let escaped = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  escaped = escaped.replace(
    /(&lt;\/?[a-z0-9]+(?:(?!&gt;)[\s\S])*&gt;)/gi,
    (match) => {
      const lower = match.toLowerCase();
      if (lower.includes("math") || lower.includes("span") || lower.includes("div")) {
        return `<mark style="background-color: rgba(127, 29, 29, 0.6); color: #fca5a5; border-radius: 2px; padding: 0 2px;">${match}</mark>`;
      }
      return `<span style="color: #60a5fa">${match}</span>`;
    }
  );
  return escaped;
}

export function cleanMathHtml(html: string): string {
  return canonicalizeEditorMathMarkup(html);
}

export function getActiveTableHtml(
  targetEditor: HTMLDivElement | null,
): string {
  if (!targetEditor) return "";
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return "";
  const range = sel.getRangeAt(0);
  let node: Node | null = range.startContainer;
  while (node && node !== targetEditor) {
    if (node.nodeName === "TABLE") {
      const tableEl = node as HTMLTableElement;
      tableEl.setAttribute("data-editing", "true");
      return tableEl.outerHTML;
    }
    node = node.parentNode;
  }
  return "";
}

/* ─── ContentEditable Sub‑component ────────────────────────────────── */

interface ContentEditableProps {
  value: string;
  onChange: (html: string) => void;
  onOpenTable: (tableEl?: HTMLTableElement) => void;
  onOpenMatrixModal?: (initialLatex?: string, targetRef?: React.RefObject<HTMLDivElement | null>, onChange?: (html: string) => void) => void;
  onOpenEquationModal?: (initialLatex?: string, displayMode?: "inline"|"block", targetRef?: React.RefObject<HTMLDivElement | null>, onChange?: (html: string) => void) => void;
  onOpenImageModal?: (imageEl: HTMLImageElement) => void;
  className?: string;
  placeholder?: string;
  innerRef: React.RefObject<HTMLDivElement | null>;
}

import katex from "katex";

export function renderMathToHtml(latex: string, isDisplay: boolean = false): string {
  if (!latex) return "";
  try {
    const rendered = katex.renderToString(latex, {
      displayMode: isDisplay,
      throwOnError: false,
    });
    const escapedLatex = latex.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const modeClass = isDisplay ? "math-display my-1 inline-block" : "math-inline inline-block px-0.5";
    return `<span class="${modeClass} cursor-pointer select-none" data-math-rendered="true" data-latex="${escapedLatex}" title="Double-click to edit equation" contenteditable="false">${rendered}</span>`;
  } catch (_err) {
    const escapedLatex = latex.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `<span class="math-fallback font-mono text-xs cursor-pointer select-none" data-math-rendered="true" data-latex="${escapedLatex}" contenteditable="false">${escapedLatex}</span>`;
  }
}

function wrapRawLatexMatrices(html: string): string {
  if (!html || !html.includes("\\begin{")) return html;
  return html.replace(
    /(?:<span[^>]*data-matrix="true"[^>]*>[\s\S]*?<\/span>|(\$\$\s*\\begin\{(?:matrix|pmatrix|bmatrix|vmatrix|Vmatrix)\}[\s\S]*?\\end\{\1\}\s*\$\$|\$\s*\\begin\{(?:matrix|pmatrix|bmatrix|vmatrix|Vmatrix)\}[\s\S]*?\\end\{\1\}\s*\$|\\begin\{(?:matrix|pmatrix|bmatrix|vmatrix|Vmatrix)\}[\s\S]*?\\end\{\1\}))/gi,
    (match, latexGroup) => {
      if (!latexGroup) return match;
      const cleanLatex = latexGroup.trim();
      const escapedAttr = cleanLatex.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const escapedBody = cleanLatex.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      return `<span class="math-matrix inline-block cursor-pointer select-none" data-matrix="true" data-latex="${escapedAttr}" title="Double-click to edit matrix" contenteditable="false">${escapedBody}</span>`;
    },
  );
}

export function autoRenderContentMath(html: string): string {
  if (!html) return "";
  let processed = wrapRawLatexMatrices(html);
  processed = processed.replace(
    /(?:<span[^>]*data-(?:math-rendered|matrix)="true"[^>]*>[\s\S]*?<\/span>|(\$\$\s*[\s\S]+?\s*\$\$|\$[^$\n]+?\$|\\\[[\s\S]+?\\\]|\\\([.\s\S]+?\\\)))/g,
    (match, latexGroup) => {
      if (!latexGroup) return match;
      const raw = latexGroup.trim();
      let isDisplay = false;
      let pureLatex = raw;
      if (pureLatex.startsWith("$$") && pureLatex.endsWith("$$")) {
        isDisplay = true;
        pureLatex = pureLatex.slice(2, -2).trim();
      } else if (pureLatex.startsWith("$") && pureLatex.endsWith("$")) {
        isDisplay = false;
        pureLatex = pureLatex.slice(1, -1).trim();
      } else if (pureLatex.startsWith("\\[") && pureLatex.endsWith("\\]")) {
        isDisplay = true;
        pureLatex = pureLatex.slice(2, -2).trim();
      } else if (pureLatex.startsWith("\\(") && pureLatex.endsWith("\\)")) {
        isDisplay = false;
        pureLatex = pureLatex.slice(2, -2).trim();
      }
      if (!pureLatex) return match;
      
      pureLatex = pureLatex
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"');
        
      return renderMathToHtml(pureLatex, isDisplay);
    },
  );
  return processed;
}

export function ContentEditable({
  value,
  onChange,
  onOpenTable,
  onOpenMatrixModal,
  onOpenEquationModal,
  onOpenImageModal,
  className = "",
  placeholder = "",
  innerRef,
}: ContentEditableProps) {
  const [isSourceMode, setIsSourceMode] = useState(false);
  const isLocalChange = useRef(false);
  const isResizingRef = useRef(false);

  // Set innerHTML only if changed from outside (e.g. undo, redo, row selection)
  useEffect(() => {
    if (isSourceMode) return;
    const el = innerRef.current;
    if (!el) return;
    if (isLocalChange.current || isResizingRef.current) {
      isLocalChange.current = false;
      return;
    }
    const processedHtml = autoRenderContentMath(value || "");
    if (el.innerHTML !== processedHtml) {
      el.innerHTML = processedHtml;
    }
  }, [value, innerRef, isSourceMode]);

  const handleInput = () => {
    const el = innerRef.current;
    if (!el) return;
    isLocalChange.current = true;
    onChange(cleanMathHtml(el.innerHTML));
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    let target = e.target as HTMLElement | null;
    const matrixEl = target?.closest<HTMLElement>('[data-matrix="true"], .math-matrix');
    if (matrixEl && onOpenMatrixModal) {
      e.preventDefault();
      e.stopPropagation();
      innerRef.current
        ?.querySelectorAll('[data-editing="true"]')
        .forEach((el) => el.removeAttribute("data-editing"));
      matrixEl.setAttribute("data-editing", "true");
      const latex = matrixEl.getAttribute("data-latex") || matrixEl.textContent || "";
      onOpenMatrixModal(latex.trim(), innerRef, onChange);
      return;
    }

    const eqEl = target?.closest<HTMLElement>('[data-math-rendered="true"]');
    if (eqEl && onOpenEquationModal) {
      e.preventDefault();
      e.stopPropagation();
      innerRef.current
        ?.querySelectorAll('[data-editing="true"]')
        .forEach((el) => el.removeAttribute("data-editing"));
      eqEl.setAttribute("data-editing", "true");
      const latex = eqEl.getAttribute("data-latex") || eqEl.textContent || "";
      const displayMode = eqEl.classList.contains("math-display") ? "block" : "inline";
      onOpenEquationModal(latex.trim(), displayMode, innerRef, onChange);
      return;
    }

    if (target?.nodeName === "IMG" && onOpenImageModal) {
      e.preventDefault();
      e.stopPropagation();
      onOpenImageModal(target as HTMLImageElement);
      return;
    }

    while (target && target !== e.currentTarget) {
      if (target.nodeName === "TABLE") {
        e.preventDefault();
        e.stopPropagation();
        onOpenTable(target as HTMLTableElement);
        return;
      }
      target = target.parentElement;
    }
  };

  // Live mouse hover detection for table cell edges inside the editor panel
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isResizingRef.current) return;
    const target = e.target as HTMLElement | null;
    const cell = target?.closest("td, th") as HTMLElement | null;
    if (!cell) return;

    const rect = cell.getBoundingClientRect();
    const distanceRight = rect.right - e.clientX;
    const distanceBottom = rect.bottom - e.clientY;

    const isNearRight = distanceRight >= 0 && distanceRight <= 7;
    const isNearBottom = distanceBottom >= 0 && distanceBottom <= 7;

    if (isNearRight) {
      cell.style.cursor = "col-resize";
    } else if (isNearBottom) {
      cell.style.cursor = "row-resize";
    } else {
      cell.style.cursor = "text";
    }
  };

  // Live mouse down for starting column/row resizing directly in editor panel
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null;
    const cell = target?.closest("td, th") as HTMLElement | null;
    if (!cell) return;

    const rect = cell.getBoundingClientRect();
    const distanceRight = rect.right - e.clientX;
    const distanceBottom = rect.bottom - e.clientY;

    const isNearRight = distanceRight >= 0 && distanceRight <= 7;
    const isNearBottom = distanceBottom >= 0 && distanceBottom <= 7;

    if (!isNearRight && !isNearBottom) return;

    // Prevent selection & editor focus jump
    e.preventDefault();
    e.stopPropagation();

    isResizingRef.current = true;
    const table = cell.closest("table") as HTMLTableElement | null;
    if (table) {
      table.style.tableLayout = "fixed";
    }

    if (isNearRight) {
      const startX = e.clientX;
      const startWidth = cell.offsetWidth;
      const colIndex = Array.from(cell.parentElement?.children || []).indexOf(
        cell,
      );

      const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const newWidth = Math.max(30, startWidth + deltaX);
        cell.style.width = `${newWidth}px`;

        if (table) {
          const col = table.querySelectorAll("col")[
            colIndex
          ] as HTMLElement | null;
          if (col) {
            col.style.width = `${newWidth}px`;
          }
          const allCols = Array.from(table.querySelectorAll("col"));
          if (allCols.length > 0) {
            const sum = allCols.reduce(
              (acc, colEl) => acc + (parseInt(colEl.style.width) || 120),
              0,
            );
            table.style.width = `${sum}px`;
          }
        }
      };

      const onMouseUp = () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
        isResizingRef.current = false;
        if (innerRef.current) {
          isLocalChange.current = true;
          onChange(cleanMathHtml(innerRef.current.innerHTML));
        }
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    } else if (isNearBottom) {
      const startY = e.clientY;
      const startHeight = cell.offsetHeight;
      const row = cell.parentElement as HTMLTableRowElement | null;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaY = moveEvent.clientY - startY;
        const newHeight = Math.max(25, startHeight + deltaY);
        cell.style.height = `${newHeight}px`;
        if (row) {
          row.style.height = `${newHeight}px`;
        }
      };

      const onMouseUp = () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
        isResizingRef.current = false;
        if (innerRef.current) {
          isLocalChange.current = true;
          onChange(cleanMathHtml(innerRef.current.innerHTML));
        }
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    }
  };

  const latestValue = useRef(value);
  const latestOnChange = useRef(onChange);
  useEffect(() => {
    latestValue.current = value;
    latestOnChange.current = onChange;
  }, [value, onChange]);

  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const handler = () => {
      setIsSourceMode((s) => {
        if (!s) {
          const cleaned = cleanMathHtml(latestValue.current);
          if (cleaned !== latestValue.current) {
            isLocalChange.current = true;
            latestOnChange.current(cleaned);
          }
        }
        return !s;
      });
    };
    el.addEventListener("toggle-source-mode", handler);
    return () => el.removeEventListener("toggle-source-mode", handler);
  }, []);

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .wysiwyg-editor:empty:before {
          content: attr(data-placeholder);
          color: #a1a1aa;
          cursor: text;
        }
      `,
        }}
      />
      <div ref={wrapperRef} className="relative group/ce w-full h-full flex flex-col min-h-[120px]">
        {isSourceMode && (
          <div
            className={`relative w-full flex-1 flex flex-col ${className}`}
            style={{ backgroundColor: "#18181b" }}
          >
            <div
              className="absolute inset-0 p-4 font-mono text-xs leading-5 whitespace-pre-wrap break-words overflow-hidden pointer-events-none"
              style={{ color: "transparent", zIndex: 1 }}
              dangerouslySetInnerHTML={{ __html: highlightHtml(value) }}
            />
            <textarea
              className="absolute inset-0 w-full h-full p-4 font-mono text-xs leading-5 outline-none resize-none bg-transparent m-0 border-0 source-mode-textarea"
              style={{ color: "transparent", caretColor: "#f4f4f5", zIndex: 2 }}
              value={value}
              onChange={(e) => {
                isLocalChange.current = true;
                onChange(e.target.value);
              }}
              onScroll={(e) => {
                if (e.target.previousSibling) {
                  (e.target.previousSibling as HTMLElement).scrollTop = (
                    e.target as HTMLElement
                  ).scrollTop;
                  (e.target.previousSibling as HTMLElement).scrollLeft = (
                    e.target as HTMLElement
                  ).scrollLeft;
                }
              }}
              spellCheck={false}
              placeholder={placeholder}
            />
          </div>
        )}

        <div
          ref={innerRef}
          contentEditable
          onInput={handleInput}
          onDoubleClick={handleDoubleClick}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          className={`outline-none bg-background p-4 flex-1 font-serif text-sm leading-relaxed overflow-y-auto wysiwyg-editor ${className}`}
          style={{ display: isSourceMode ? "none" : "block" }}
          data-placeholder={placeholder}
        />
      </div>
    </>
  );
}

/* ─── Rich Toolbar Sub‑component ───────────────────────────────────── */

interface RichToolbarProps {
  textareaRef: React.RefObject<HTMLDivElement | null>;
  value: string;
  onChange: (v: string) => void;
  onOpenAsset: () => void;
  onOpenSource?: () => void;
  onOpenTable: () => void;
  onOpenMatrixModal?: (initialLatex?: string, targetRef?: React.RefObject<HTMLDivElement | null>, onChange?: (html: string) => void) => void;
  onOpenEquationModal?: (initialLatex?: string, displayMode?: "inline" | "block", targetRef?: React.RefObject<HTMLDivElement | null>, onChange?: (html: string) => void) => void;
  variant?: "full" | "compact";
}

export function RichToolbar({
  textareaRef,
  value,
  onChange,
  onOpenAsset,
  onOpenSource,
  onOpenTable,
  onOpenMatrixModal,
  onOpenEquationModal,
  variant = "full",
}: RichToolbarProps) {
  const act = (
    action:
      | { type: "command"; cmd: string; value?: string }
      | { type: "insertHTML"; html: string }
      | { type: "insertText"; text: string }
      | { type: "insert"; text: string }
      | { type: "wrap"; left: string; right: string; placeholder?: string },
  ) => {
    const el = textareaRef.current;
    if (!el) return;
    el.focus();

    let selectionText = "";
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      selectionText = sel.toString();
    }

    if (action.type === "command") {
      document.execCommand(action.cmd, false, action.value);
    } else if (action.type === "insertHTML") {
      document.execCommand("insertHTML", false, action.html);
    } else if (action.type === "insertText" || action.type === "insert") {
      document.execCommand("insertText", false, action.text);
    } else if (action.type === "wrap") {
      const val = selectionText || action.placeholder || "";
      const tagToFind = action.left
        .replace(/[<>]/g, "")
        .split(" ")[0]
        .toUpperCase();

      // Traverse up selection anchors to see if target wrap tag already wraps it
      const anchorNode = sel?.anchorNode;
      let matchingParent: HTMLElement | null = null;
      if (anchorNode) {
        let node: Node | null = anchorNode;
        while (node && node !== el) {
          if (node.nodeName === tagToFind) {
            matchingParent = node as HTMLElement;
            break;
          }
          node = node.parentNode;
        }
      }

      if (matchingParent) {
        // Strip the tag
        matchingParent.replaceWith(...Array.from(matchingParent.childNodes));
      } else {
        // Wrap with new HTML
        const htmlToInsert = action.left + val + action.right;
        document.execCommand("insertHTML", false, htmlToInsert);
      }
    }

    onChange(cleanMathHtml(el.innerHTML));
  };

  const [showMathToolbar, setShowMathToolbar] = useState(false);
  const [showSymbolToolbar, setShowSymbolToolbar] = useState(false);

  return (
    <div className="flex flex-col border-b border-border bg-muted/20">
      {/* ── Main Toolbar ─────────────────────────────────────────── */}
      <div className="min-h-[35px] flex items-center gap-1 px-2 py-1 flex-wrap">
        {/* Font Family Selector Menu */}
        <div className="relative group select-none">
          <button
            type="button"
            className="h-[25px] w-[27px] border border-border bg-background rounded flex items-center justify-center hover:bg-muted"
            title="Font Family"
            onMouseDown={(e) => e.preventDefault()}
          >
            <Type className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <div className="absolute left-0 top-[24px] hidden group-hover:block z-50 bg-background border border-border rounded-lg shadow-xl min-w-[140px] p-1.5 animate-in fade-in duration-100">
            {[
              { name: "Sans (Arial)", val: "Arial" },
              { name: "Serif (Georgia)", val: "Georgia" },
              { name: "Mono (Courier)", val: "Courier New" },
              { name: "Times", val: "Times New Roman" },
              { name: "Verdana", val: "Verdana" },
            ].map((f) => (
              <button
                key={f.val}
                type="button"
                onClick={() =>
                  act({
                    type: "wrap",
                    left: `<span style="font-family: ${f.val}">`,
                    right: "</span>",
                    placeholder: "text",
                  })
                }
                className="w-full text-left px-2 py-1.5 text-[11px] font-medium hover:bg-muted rounded-md transition-colors"
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>

        {/* Font Size Selector Menu */}
        <div className="relative group select-none">
          <button
            type="button"
            className="h-[25px] w-[27px] border border-border bg-background rounded flex items-center justify-center hover:bg-muted"
            title="Font Size"
            onMouseDown={(e) => e.preventDefault()}
          >
            <span className="font-bold text-[10px] flex items-end gap-0.5 leading-none">
              <span className="text-[8px]">A</span>A
            </span>
          </button>
          <div className="absolute left-0 top-[24px] hidden group-hover:block z-50 bg-background border border-border rounded-lg shadow-xl min-w-[100px] p-1.5 animate-in fade-in duration-100">
            {["12px", "14px", "16px", "18px", "24px"].map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() =>
                  act({
                    type: "wrap",
                    left: `<span style="font-size: ${sz}">`,
                    right: "</span>",
                    placeholder: "text",
                  })
                }
                className="w-full text-left px-2 py-1.5 text-[11px] font-medium hover:bg-muted rounded-md transition-colors"
              >
                {sz}
              </button>
            ))}
          </div>
        </div>

        {/* Font Color Selector Menu */}
        <div className="relative group select-none">
          <button
            type="button"
            className="h-[25px] w-[27px] border border-border bg-background rounded flex items-center justify-center hover:bg-muted"
            title="Font Color"
            onMouseDown={(e) => e.preventDefault()}
          >
            <Palette className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <div className="absolute left-0 top-[24px] hidden group-hover:block z-50 bg-background border border-border rounded-lg shadow-xl min-w-[120px] p-1.5 animate-in fade-in duration-100">
            {[
              { name: "Red", val: "#ff0000" },
              { name: "Green", val: "#00aa00" },
              { name: "Blue", val: "#0000ff" },
              { name: "Orange", val: "#ffa500" },
              { name: "Purple", val: "#800080" },
              { name: "Black", val: "#000000" },
            ].map((c) => (
              <button
                key={c.val}
                type="button"
                onClick={() =>
                  act({
                    type: "wrap",
                    left: `<font color="${c.val}">`,
                    right: "</font>",
                    placeholder: "text",
                  })
                }
                className="w-full text-left px-2 py-1.5 text-[11px] font-medium hover:bg-muted rounded-md transition-colors flex items-center gap-2"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full border border-border"
                  style={{ backgroundColor: c.val }}
                />
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <span className="h-[19px] w-px bg-border mx-1" />

        {/* Basic Formatting Buttons */}
        <TBtn
          onClick={() => act({ type: "command", cmd: "bold" })}
          title="Bold (<b>)"
        >
          <Bold className="h-3 w-3" />
        </TBtn>
        <TBtn
          onClick={() => act({ type: "command", cmd: "italic" })}
          title="Italic (<i>)"
        >
          <Italic className="h-3 w-3" />
        </TBtn>
        <TBtn
          onClick={() => act({ type: "command", cmd: "underline" })}
          title="Underline (<u>)"
        >
          <Underline className="h-3 w-3" />
        </TBtn>
        <TBtn
          onClick={() =>
            act({
              type: "wrap",
              left: "<mark>",
              right: "</mark>",
              placeholder: "highlight",
            })
          }
          title="Highlight (<mark>)"
        >
          <Highlighter className="h-3 w-3" />
        </TBtn>
        <TBtn
          onClick={() =>
            act({
              type: "wrap",
              left: "<p>",
              right: "</p>",
              placeholder: "paragraph",
            })
          }
          title="Paragraph (<p>)"
        >
          <Pilcrow className="h-3 w-3" />
        </TBtn>

        <span className="h-[19px] w-px bg-border mx-1" />

        {/* Alignment Controls */}
        <TBtn
          onClick={() => act({ type: "command", cmd: "justifyLeft" })}
          title="Align Left"
        >
          <AlignLeft className="h-3 w-3" />
        </TBtn>
        <TBtn
          onClick={() => act({ type: "command", cmd: "justifyCenter" })}
          title="Align Center"
        >
          <AlignCenter className="h-3 w-3" />
        </TBtn>
        <TBtn
          onClick={() => act({ type: "command", cmd: "justifyRight" })}
          title="Align Right"
        >
          <AlignRight className="h-3 w-3" />
        </TBtn>
        <TBtn
          onClick={() => act({ type: "command", cmd: "justifyFull" })}
          title="Justify"
        >
          <AlignJustify className="h-3 w-3" />
        </TBtn>

        <span className="h-[19px] w-px bg-border mx-1" />

        {/* Line Spacing Selector */}
        <select
          onChange={(e) => {
            if (e.target.value) {
              act({
                type: "wrap",
                left: `<div style="line-height: ${e.target.value}">`,
                right: "</div>",
                placeholder: "spaced text",
              });
              e.target.value = "";
            }
          }}
          onMouseDown={(e) => {
            // Do not prevent default for select, otherwise dropdown won't open
          }}
          className="h-[25px] px-1 text-[10px] border border-border bg-background rounded outline-none font-medium cursor-pointer"
          aria-label="Line Height"
        >
          <option value="">Line Space</option>
          <option value="1.0">1.0 (Single)</option>
          <option value="1.15">1.15</option>
          <option value="1.5">1.5 (1.5x)</option>
          <option value="2.0">2.0 (Double)</option>
          <option value="2.5">2.5</option>
        </select>

        <span className="h-[19px] w-px bg-border mx-1" />

        {/* Math & Symbols Toggle Buttons */}
        <button
          type="button"
          onClick={() => {
            if (onOpenEquationModal) {
              onOpenEquationModal(undefined, undefined, textareaRef, onChange);
            } else {
              setShowMathToolbar(!showMathToolbar);
              setShowSymbolToolbar(false);
            }
          }}
          onMouseDown={(e) => e.preventDefault()}
          className={`h-[25px] px-2 text-[10px] border rounded flex items-center gap-1 font-medium transition-colors ${
            showMathToolbar
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border bg-background hover:bg-muted"
          }`}
          title="Equation Editor"
        >
          <Sigma className="h-3.5 w-3.5" /> Equation
        </button>

        <button
          type="button"
          onClick={() => {
            setShowSymbolToolbar(!showSymbolToolbar);
            setShowMathToolbar(false);
          }}
          onMouseDown={(e) => e.preventDefault()}
          className={`h-[25px] px-2 text-[10px] border rounded flex items-center gap-1 font-medium transition-colors ${
            showSymbolToolbar
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border bg-background hover:bg-muted"
          }`}
          title="Insert Symbols"
        >
          <span className="font-semibold text-xs leading-none">Ω</span> Symbol
        </button>

        <span className="h-[19px] w-px bg-border mx-1" />

        <TBtn
          onClick={onOpenAsset}
          title="Attach asset (image, audio, video, document, graph, or diagram)"
        >
          <Paperclip className="h-3.5 w-3.5" />
        </TBtn>
        <TBtn onClick={onOpenTable} title="Insert / Edit HTML Table">
          <Table className="h-3.5 w-3.5" />
        </TBtn>
        <span className="flex-1" />
        <TBtn
          onClick={() => {
            if (textareaRef.current) {
              textareaRef.current.dispatchEvent(
                new CustomEvent("toggle-source-mode", { bubbles: true })
              );
            }
          }}
          title="Toggle HTML Source Code Mode"
        >
          <Code className="h-3.5 w-3.5 text-primary" />
        </TBtn>
      </div>

      {/* ── Collapsible Equations Sub‑Toolbar ───────────────────── */}
      {showMathToolbar && (
        <div className="min-h-[30px] border-t border-border flex items-center gap-1 px-3 py-1 bg-muted/10 flex-wrap animate-in slide-in-from-top-1 duration-150">
          <span className="text-[9px] font-bold text-primary uppercase tracking-wider mr-2">
            Math:
          </span>
          <TBtn
            onClick={() =>
              act({
                type: "wrap",
                left: "$",
                right: "$",
                placeholder: "inline math",
              })
            }
            title="Inline Math ($...$)"
          >
            Inline
          </TBtn>
          <TBtn
            onClick={() =>
              act({
                type: "wrap",
                left: "$$\n",
                right: "\n$$",
                placeholder: "display math",
              })
            }
            title="Display Math ($$...$$)"
          >
            Display
          </TBtn>
          <TBtn
            onClick={() =>
              act({
                type: "insertHTML",
                html: renderMathToHtml("\\frac{a}{b}"),
              })
            }
            title="Fraction (\frac{a}{b})"
          >
            ½
          </TBtn>
          <TBtn
            onClick={() =>
              act({
                type: "insertHTML",
                html: renderMathToHtml("\\sqrt{x}"),
              })
            }
            title="Square Root (\sqrt{x})"
          >
            √
          </TBtn>
          <TBtn
            onClick={() =>
              act({
                type: "insertHTML",
                html: renderMathToHtml("x^{2}"),
              })
            }
            title="Power (x^2)"
          >
            x²
          </TBtn>
          <TBtn
            onClick={() =>
              act({
                type: "insertHTML",
                html: renderMathToHtml("\\sqrt[n]{x}"),
              })
            }
            title="N-th Root (\sqrt[n]{x})"
          >
            <sup>n</sup>√
          </TBtn>
          <TBtn
            onClick={() =>
              act({
                type: "insertHTML",
                html: renderMathToHtml("\\log_{b}(x)"),
              })
            }
            title="Logarithm (\log_b(x))"
          >
            log
          </TBtn>
          <TBtn
            onClick={() =>
              act({
                type: "insertHTML",
                html: renderMathToHtml("\\lim_{x \\to \\infty}"),
              })
            }
            title="Limit (\lim)"
          >
            lim
          </TBtn>
          <TBtn
            onClick={() =>
              act({
                type: "insertHTML",
                html: renderMathToHtml("\\int_{a}^{b} x \\,dx"),
              })
            }
            title="Integral (\int)"
          >
            ∫
          </TBtn>
          <TBtn
            onClick={() =>
              act({
                type: "insertHTML",
                html: renderMathToHtml("\\frac{dy}{dx}"),
              })
            }
            title="Derivative (dy/dx)"
          >
            dy/dx
          </TBtn>
          <TBtn
            onClick={() =>
              act({
                type: "insertHTML",
                html: renderMathToHtml("\\sum_{i=1}^{n}"),
              })
            }
            title="Summation (\sum)"
          >
            ∑
          </TBtn>
          <TBtn
            onClick={() =>
              act({
                type: "insertHTML",
                html: renderMathToHtml("\\prod_{i=1}^{n}"),
              })
            }
            title="Product (\prod)"
          >
            ∏
          </TBtn>
          <TBtn
            onClick={() => {
              act({
                type: "insertHTML",
                html: renderMathToHtml("\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}"),
              });
            }}
            title="Configure & Insert Matrix"
          >
            Matrix
          </TBtn>
        </div>
      )}

      {/* ── Collapsible Symbols Sub‑Toolbar ─────────────────────── */}
      {showSymbolToolbar && (
        <div className="min-h-[30px] border-t border-border flex items-center gap-1 px-3 py-1 bg-muted/10 flex-wrap animate-in slide-in-from-top-1 duration-150">
          <span className="text-[9px] font-bold text-primary uppercase tracking-wider mr-2">
            Symbols:
          </span>
          <TBtn
            onClick={() => act({ type: "insertText", text: "±" })}
            title="Plus-minus (±)"
          >
            ±
          </TBtn>
          <TBtn
            onClick={() => act({ type: "insertText", text: "θ" })}
            title="Theta (θ)"
          >
            θ
          </TBtn>
          <TBtn
            onClick={() => act({ type: "insertText", text: "∞" })}
            title="Infinity (∞)"
          >
            ∞
          </TBtn>
          <TBtn
            onClick={() => act({ type: "insertText", text: "α" })}
            title="Alpha (α)"
          >
            α
          </TBtn>
          <TBtn
            onClick={() => act({ type: "insertText", text: "β" })}
            title="Beta (β)"
          >
            β
          </TBtn>
          <TBtn
            onClick={() => act({ type: "insertText", text: "γ" })}
            title="Gamma (γ)"
          >
            γ
          </TBtn>
          <TBtn
            onClick={() => act({ type: "insertText", text: "λ" })}
            title="Lambda (λ)"
          >
            λ
          </TBtn>
          <TBtn
            onClick={() => act({ type: "insertText", text: "π" })}
            title="Pi (π)"
          >
            π
          </TBtn>
          <TBtn
            onClick={() => act({ type: "insertText", text: "Δ" })}
            title="Delta (Δ)"
          >
            Δ
          </TBtn>
          <TBtn
            onClick={() => act({ type: "insertText", text: "Ω" })}
            title="Omega (Ω)"
          >
            Ω
          </TBtn>
          <TBtn
            onClick={() => act({ type: "insertText", text: "μ" })}
            title="Mu (μ)"
          >
            μ
          </TBtn>
          <TBtn
            onClick={() => act({ type: "insertText", text: "≈" })}
            title="Approximately equal (≈)"
          >
            ≈
          </TBtn>
          <TBtn
            onClick={() => act({ type: "insertText", text: "≠" })}
            title="Not equal (≠)"
          >
            ≠
          </TBtn>
          <TBtn
            onClick={() => act({ type: "insertText", text: "≤" })}
            title="Less than or equal (≤)"
          >
            ≤
          </TBtn>
          <TBtn
            onClick={() => act({ type: "insertText", text: "≥" })}
            title="Greater than or equal (≥)"
          >
            ≥
          </TBtn>
          <TBtn
            onClick={() => act({ type: "insertText", text: "∪" })}
            title="Set Union (∪)"
          >
            ∪
          </TBtn>
          <TBtn
            onClick={() => act({ type: "insertText", text: "∩" })}
            title="Set Intersection (∩)"
          >
            ∩
          </TBtn>
          <TBtn
            onClick={() => act({ type: "insertText", text: "∈" })}
            title="Element of (∈)"
          >
            ∈
          </TBtn>
          <TBtn
            onClick={() => act({ type: "insertText", text: "∅" })}
            title="Empty Set (∅)"
          >
            ∅
          </TBtn>
        </div>
      )}
    </div>
  );
}

function TBtn({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
      title={title}
      aria-label={title}
      className="h-[25px] min-w-[25px] px-1.5 text-[11px] border-0 bg-transparent rounded hover:bg-background hover:shadow-[inset_0_0_0_1px_var(--border)] transition-colors"
    >
      {children}
    </button>
  );
}
