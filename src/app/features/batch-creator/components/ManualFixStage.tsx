import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  Search,
  AlertTriangle,
  ShieldCheck,
  Undo2,
  Wrench,
  ChevronRight,
  ChevronLeft,
  XCircle,
  AlertCircle,
  Info,
  Image as ImageIcon,
  Sparkles,
  Download,
  Loader2,
  History,
  Trash2,
  Copy,
  ExternalLink,
  Filter,
  MoreHorizontal,
  Plus,
  Eye,
  Bold,
  Italic,
  Underline,
  Highlighter,
  Pilcrow,
  Type,
  Palette,
  Sigma,
  Calculator,
  Table,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  GripVertical,
} from "lucide-react";
import { toast } from "sonner";
import { useManualFixStage, FixFilterStatus } from "../hooks/useManualFixStage";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Checkbox } from "../../../components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { EditorFormState } from "../fixing/manualFixEngine";
import { downloadCorrectedSheet } from "../export/correctedSheetBuilder";
import { ManualFixDetailsFields } from "./ManualFixDetailsFields";
import { AutofixAuditPanel } from "./AutofixAuditPanel";
import { SourceDrawer } from "./SourceDrawer";
import { HistoryDrawer } from "./HistoryDrawer";
import { ImagePropertiesModal } from "./ImagePropertiesModal";
import { LearnerPreviewDrawer } from "./LearnerPreviewDrawer";
import {
  ManualFixAssetModal,
  type ManualFixAsset,
} from "./ManualFixAssetModal";
import { ManualFixOptionalSections } from "./ManualFixOptionalSections";
import type { MediaRole } from "../core/mediaTypes";
import { ConflictModal } from "./ConflictModal";
import { TypeConversionModal } from "./TypeConversionModal";
import { ShortcutsModal } from "./ShortcutsModal";
import { TableModal } from "./TableModal";
import { MatrixModal, buildMatrixElementHtml } from "./MatrixModal";
import { EquationEditorModal } from "./equation-editor";
import { buildAssetMarkup } from "../fixing/assetMarkup";
import { reorderAuthoringSections } from "../fixing/manualFixSections";
import {
  ContentEditable,
  cleanMathHtml,
  getActiveTableHtml,
  RichToolbar,
  renderMathToHtml,
} from "./ManualFixRichTextEditor";

/* ─── Toolbar Helpers ──────────────────────────────────────────────── */

/* ─── Main Component ───────────────────────────────────────────────── */

export function ManualFixStage({
  upload,
  wizard,
}: {
  upload: any;
  wizard: any;
}) {
  const fixStage = useManualFixStage(
    upload.output?.rawRows,
    wizard.exportConfig,
    upload.output?.mapping,
    wizard.__processedRows,
  );

  /* ── Local UI state ────────────────────────────────────────────────── */
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"ROW_ASC" | "STATUS" | "UPDATED">(
    "ROW_ASC",
  );
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [changedOnly, setChangedOnly] = useState(false);
  const [unresolvedOnly, setUnresolvedOnly] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Drawers & Modals
  const [isSourceDrawerOpen, setIsSourceDrawerOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [isPreviewDrawerOpen, setIsPreviewDrawerOpen] = useState(false);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [assetTarget, setAssetTarget] = useState<
    | { kind: "stem"; range?: Range | null }
    | { kind: "section"; sectionId: string; ruleId?: string; range?: Range | null }
    | { kind: "option"; optionId: string; range?: Range | null }
  >({ kind: "stem" });
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [tableTarget, setTableTarget] = useState<{ kind: "stem" | "option"; optionId?: string } | null>(null);
  const [tableInitialHtml, setTableInitialHtml] = useState("");
  const [isMatrixModalOpen, setIsMatrixModalOpen] = useState(false);
  const [matrixInitialLatex, setMatrixInitialLatex] = useState<string | undefined>(undefined);

  const [matrixTarget, setMatrixTarget] = useState<{
    ref?: React.RefObject<HTMLDivElement | null>;
    onChange?: (html: string) => void;
    range: Range | null;
  } | null>(null);

  const openMatrixEditor = (
    initial?: string,
    targetRef?: React.RefObject<HTMLDivElement | null>,
    onChange?: (html: string) => void
  ) => {
    setMatrixInitialLatex(initial);
    
    let range = null;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      range = sel.getRangeAt(0);
    }
    
    setMatrixTarget({ ref: targetRef, onChange, range });
    setIsMatrixModalOpen(true);
  };

  const [isEquationModalOpen, setIsEquationModalOpen] = useState(false);
  const [equationInitialLatex, setEquationInitialLatex] = useState<string | undefined>(undefined);
  const [equationDisplayMode, setEquationDisplayMode] = useState<"inline" | "block">("inline");
  const [equationMode, setEquationMode] = useState<"insert" | "edit">("insert");

  const [equationTarget, setEquationTarget] = useState<{
    ref?: React.RefObject<HTMLDivElement | null>;
    onChange?: (html: string) => void;
    range: Range | null;
  } | null>(null);

  const [isImagePropertiesOpen, setIsImagePropertiesOpen] = useState(false);
  const [imageTarget, setImageTarget] = useState<HTMLImageElement | null>(null);

  const openImageProperties = (imageEl: HTMLImageElement) => {
    setImageTarget(imageEl);
    setIsImagePropertiesOpen(true);
  };

  const openEquationEditor = (
    initialLatex?: string, 
    displayMode?: "inline" | "block",
    targetRef?: React.RefObject<HTMLDivElement | null>,
    onChange?: (html: string) => void
  ) => {
    setEquationInitialLatex(initialLatex || "");
    setEquationDisplayMode(displayMode || "inline");
    setEquationMode(initialLatex ? "edit" : "insert");
    
    let range = null;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      range = sel.getRangeAt(0);
    }
    
    setEquationTarget({ ref: targetRef, onChange, range });
    setIsEquationModalOpen(true);
  };

  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [pendingTypeChange, setPendingTypeChange] = useState<string | null>(
    null,
  );
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [simulatedServerVersion, setSimulatedServerVersion] =
    useState<any>(null);
  const [isMetadataCollapsed, setIsMetadataCollapsed] = useState(false);
  const [previewProfile, setPreviewProfile] = useState<
    "GENERIC" | "CANVAS" | "MOODLE"
  >("GENERIC");

  // Div refs for contentEditable operations
  const stemRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Map<string, React.RefObject<HTMLDivElement | null>>>(new Map());
  
  const getOptionRef = useCallback((optionId: string): React.RefObject<HTMLDivElement | null> => {
    let ref = optionRefs.current.get(optionId);
    if (!ref) {
      ref = React.createRef<HTMLDivElement>();
      optionRefs.current.set(optionId, ref);
    }
    return ref;
  }, []);

  const handleInsertTable = (html: string) => {
    const editor = tableTarget?.kind === "option" && tableTarget.optionId
      ? getOptionRef(tableTarget.optionId).current
      : stemRef.current;
    if (!editor) return;
    editor.focus();

    const editingTable = editor.querySelector('table[data-editing="true"]');
    if (editingTable) {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = html;
      const newTable = tempDiv.firstElementChild;
      if (newTable) {
        editingTable.parentNode?.replaceChild(newTable, editingTable);
      }
    } else {
      document.execCommand("insertHTML", false, html);
    }

    // Clean up any remaining data-editing attributes
    editor.querySelectorAll('table[data-editing="true"]').forEach((el) => {
      el.removeAttribute("data-editing");
    });

    setEditorState((current) => {
      if (!current) return current;
      return {
        ...current,
        stem: cleanMathHtml(editor.innerHTML),
      };
    });
  };

  /* ── Extract hook values ───────────────────────────────────────────── */
  const {
    rows,
    summary,
    filterStatus,
    setFilterStatus,
    searchQuery,
    setSearchQuery,
    selectedRowId,
    selectedRow,
    selectedRowSuggestions,
    editorState,
    setEditorState,
    draftValidation,
    hasUnsavedChanges,
    autoFixedRowIds,
    autofixAudit,
    selectRow,
    discardDraft,
    saveEdit,
    handleApplySuggestion,
    rollbackAutofix,
    undoLastEdit,
    canUndo,
  } = fixStage;

  // Existing Media for Batch — scan HTML content of all rows for embedded media
  const existingBatchMedia = useMemo(() => {
    const assets = new Map<string, ManualFixAsset>();

    const extractFromHtml = (html: string | undefined) => {
      if (!html) return;
      const imgRegex = /<img\s[^>]*src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["])?[^>]*\/?>/gi;
      const audioRegex = /<audio\s[^>]*src=["']([^"']+)["'][^>]*>/gi;
      const videoRegex = /<video\s[^>]*src=["']([^"']+)["'][^>]*>/gi;

      let match;
      while ((match = imgRegex.exec(html)) !== null) {
        const url = match[1];
        if (!assets.has(url)) {
          assets.set(url, { url, altText: match[2] || "", contentType: "image" });
        }
      }
      while ((match = audioRegex.exec(html)) !== null) {
        const url = match[1];
        if (!assets.has(url)) {
          assets.set(url, { url, altText: "", contentType: "audio" });
        }
      }
      while ((match = videoRegex.exec(html)) !== null) {
        const url = match[1];
        if (!assets.has(url)) {
          assets.set(url, { url, altText: "", contentType: "video" });
        }
      }
    };

    // Scan current (unsaved) editor state first
    if (editorState) {
      extractFromHtml(editorState.stem);
      extractFromHtml(editorState.explanation);
      for (const opt of editorState.options) {
        extractFromHtml(opt.text);
      }
      for (const section of editorState.sections) {
        extractFromHtml(section.content);
        if (section.conditionalFeedbackRules) {
          for (const rule of section.conditionalFeedbackRules) {
            extractFromHtml(rule.content);
          }
        }
      }
      for (const ref of editorState.mediaReferences) {
        if (!assets.has(ref.publicUrlSource)) {
          assets.set(ref.publicUrlSource, {
            url: ref.publicUrlSource,
            altText: ref.altText || "",
            contentType: ref.contentType || "image",
          });
        }
      }
    }

    for (const row of rows) {
      const q = row.normalizedQuestion;
      if (q) {
        extractFromHtml(q.stem);
        if ("explanation" in q) extractFromHtml(q.explanation);
        if ("options" in q && Array.isArray(q.options)) {
          for (const opt of q.options) {
            extractFromHtml(opt.text);
          }
        }
      }
      if (row.manualFixSections) {
        for (const section of row.manualFixSections) {
          extractFromHtml(section.content);
          if (section.conditionalFeedbackRules) {
            for (const rule of section.conditionalFeedbackRules) {
              extractFromHtml(rule.content);
            }
          }
        }
      }
      if (row.rawRow) {
        for (const val of Object.values(row.rawRow)) {
          if (typeof val === "string" && val.includes("<img")) {
            extractFromHtml(val);
          }
        }
      }
      if (row.metadata?.mediaUrl) {
        const url = row.metadata.mediaUrl;
        if (!assets.has(url)) {
          assets.set(url, { url, altText: "", contentType: "image" });
        }
      }
    }
    return Array.from(assets.values());
  }, [rows, editorState]);

  // Dynamic MathJax initialization for live previews in main window
  useEffect(() => {
    if (!(window as any).MathJax) {
      (window as any).MathJax = {
        tex: {
          inlineMath: [
            ["$", "$"],
            ["\\(", "\\)"],
          ],
          displayMath: [
            ["$$", "$$"],
            ["\\[", "\\]"],
          ],
        },
        svg: {
          fontCache: "global",
        },
      };
      const script = document.createElement("script");
      script.id = "MathJax-script-main-editor";
      script.src =
        "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js";
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  // Typeset updates automatically
  useEffect(() => {
    const mathjax = (window as any).MathJax;
    if (mathjax && typeof mathjax.typesetPromise === "function") {
      const timer = setTimeout(() => {
        mathjax
          .typesetPromise()
          .catch((err: any) => console.log("MathJax error:", err));
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [editorState?.stem, editorState?.explanation]);

  /* ── Wizard sync ──────────────────────────────────────────────────── */
  useEffect(() => {
    if (!fixStage.isProcessing && rows.length > 0) {
      wizard.__mockSetComplete(
        "MANUAL_FIX",
        summary.rejected === 0 && !hasUnsavedChanges,
      );
    } else {
      wizard.__mockSetComplete("MANUAL_FIX", false);
    }
  }, [
    fixStage.isProcessing,
    rows.length,
    summary.rejected,
    hasUnsavedChanges,
    wizard,
  ]);
  useEffect(() => {
    wizard.__setProcessedRows(rows);
  }, [rows, wizard]);

  /* ── Reset pagination on filter/search change ─────────────────────── */
  useEffect(() => {
    setCurrentPage(1);
  }, [
    filterStatus,
    searchQuery,
    typeFilter,
    severityFilter,
    changedOnly,
    unresolvedOnly,
    sortBy,
  ]);

  /* ── Advanced filtering & sorting ─────────────────────────────────── */
  const processedRows = useMemo(() => {
    let result = rows.filter((r) => {
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const stem =
          (r.normalizedQuestion && "stem" in r.normalizedQuestion
            ? r.normalizedQuestion.stem
            : r.normalizedQuestion?.type === "UNKNOWN"
              ? r.normalizedQuestion.rawStem
              : ""
          )?.toLowerCase() || "";
        const rawValues = Object.values(r.rawRow || {})
          .join(" ")
          .toLowerCase();
        const ruleIds = r.issues
          .map((i) => i.ruleId)
          .join(" ")
          .toLowerCase();
        if (
          !stem.includes(q) &&
          !rawValues.includes(q) &&
          !ruleIds.includes(q) &&
          !r.id.toLowerCase().includes(q)
        )
          return false;
      }
      if (typeFilter !== "ALL") {
        if ((r.normalizedQuestion?.type || "UNKNOWN") !== typeFilter)
          return false;
      }
      if (severityFilter !== "ALL") {
        if (
          !r.issues.some(
            (i) => i.severity.toLowerCase() === severityFilter.toLowerCase(),
          )
        )
          return false;
      }
      if (changedOnly && !autoFixedRowIds.has(r.id)) return false;
      if (unresolvedOnly && r.status === "valid") return false;
      return true;
    });
    if (sortBy === "STATUS") {
      const order: Record<string, number> = {
        rejected: 1,
        needs_review: 2,
        caution: 3,
        valid: 4,
      };
      result = [...result].sort(
        (a, b) => (order[a.status] || 99) - (order[b.status] || 99),
      );
    } else if (sortBy === "UPDATED") {
      result = [...result].sort(
        (a, b) =>
          Number(autoFixedRowIds.has(b.id)) - Number(autoFixedRowIds.has(a.id)),
      );
    } else {
      result = [...result].sort(
        (a, b) => a.sourceRowNumber - b.sourceRowNumber,
      );
    }
    return result;
  }, [
    rows,
    filterStatus,
    searchQuery,
    typeFilter,
    severityFilter,
    changedOnly,
    unresolvedOnly,
    sortBy,
    autoFixedRowIds,
  ]);

  const totalPages = Math.ceil(processedRows.length / pageSize);
  const paginatedRows = processedRows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  /* ── Navigation ───────────────────────────────────────────────────── */
  const handleNextRow = useCallback(
    (dir: number) => {
      const idx = rows.findIndex((r) => r.id === selectedRowId);
      if (idx === -1) return;
      const next = Math.min(Math.max(idx + dir, 0), rows.length - 1);
      selectRow(rows[next].id);
    },
    [rows, selectedRowId, selectRow],
  );

  const handleNextUnresolved = useCallback(
    (dir = 1) => {
      const unresolved = rows.filter((r) => r.status !== "valid");
      if (!unresolved.length) return toast.info("All rows are valid!");
      const idx = unresolved.findIndex((r) => r.id === selectedRowId);
      const nextPos = (idx + dir + unresolved.length) % unresolved.length;
      selectRow(unresolved[nextPos].id);
    },
    [rows, selectedRowId, selectRow],
  );

  /* ── Keyboard Shortcuts ───────────────────────────────────────────── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        // Only handle Ctrl/Alt combos inside inputs
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
          e.preventDefault();
          saveEdit();
        }
        if (e.ctrlKey && e.key === "Enter") {
          e.preventDefault();
          saveEdit();
        }
        if (e.altKey && e.key === "Enter") {
          e.preventDefault();
          saveEdit();
          handleNextUnresolved(1);
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveEdit();
      }
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        saveEdit();
      }
      if (e.altKey && e.key === "Enter") {
        e.preventDefault();
        saveEdit();
        handleNextUnresolved(1);
      }
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        e.shiftKey ? handleNextUnresolved(1) : handleNextRow(1);
      }
      if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        e.shiftKey ? handleNextUnresolved(-1) : handleNextRow(-1);
      }
      if (e.key === "/") {
        e.preventDefault();
        document.getElementById("manual-fix-search")?.focus();
      }
      if (e.key === "?") setIsShortcutsModalOpen(true);
      if (e.key === "Escape") {
        setIsSourceDrawerOpen(false);
        setIsHistoryDrawerOpen(false);
        setIsPreviewDrawerOpen(false);
        setIsShortcutsModalOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saveEdit, handleNextRow, handleNextUnresolved]);

  /* ── Media attachment helper ──────────────────────────────────────── */
  const attachRichMedia = useCallback(
    (role: MediaRole, media: ManualFixAsset, ownerId?: string) => {
      setEditorState((current) => {
        if (!current) return current;
        if (
          current.mediaReferences.some(
            (ref) =>
              ref.publicUrlSource === media.url &&
              ref.role === role &&
              ref.ownerId === ownerId,
          )
        )
          return current;
        return {
          ...current,
          mediaReferences: [
            ...current.mediaReferences,
            {
              id: crypto.randomUUID(),
              publicUrlSource: media.url,
              role,
              altText: media.altText,
              contentType: media.contentType,
              ownerId,
            },
          ],
        };
      });
      toast.success("Media asset attached.");
    },
    [setEditorState],
  );

  const sectionOrder = (sectionId: string) => {
    const index = editorState?.sections.findIndex(
      (section) => section.id === sectionId,
    );
    return index === undefined || index < 0 ? 0 : index;
  };

  const handleSectionDrop = (targetSectionId: string) => {
    if (!draggedSectionId || draggedSectionId === targetSectionId) {
      setDraggedSectionId(null);
      return;
    }
    setEditorState((current) =>
      current
        ? {
            ...current,
            sections: reorderAuthoringSections(
              current.sections,
              draggedSectionId,
              targetSectionId,
            ),
          }
        : current,
    );
    setDraggedSectionId(null);
  };

  /* ─── Loading / Empty states ─────────────────────────────────────── */
  if (fixStage.isProcessing) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground animate-pulse text-xs">
          Running Cleaning & Suggestion Engines…
        </p>
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Wrench className="h-8 w-8" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">
          No Rows to Fix
        </h2>
        <p className="text-sm text-muted-foreground">
          Please complete the upload stage first.
        </p>
      </div>
    );
  }

  /* ─── Derived data ───────────────────────────────────────────────── */
  const reviewedCount = summary.valid + summary.caution;
  const remainingCount = rows.length - reviewedCount;
  const progressPct = Math.round((reviewedCount / (rows.length || 1)) * 100);

  const mathPattern = new RegExp("\\$|\\\\\\(|\\\\\\[");
  const stemHasMath = editorState ? mathPattern.test(editorState.stem) : false;

  /* ─── Render ─────────────────────────────────────────────────────── */
  return (
    <div className="flex h-full text-xs select-none">
      {/* ════════ LEFT PANEL — Question Browser ════════════════════════ */}
      <aside
        className={`shrink-0 border-r border-border flex flex-col min-h-0 bg-background transition-all duration-300 ${isSidebarCollapsed ? "w-0 border-r-0 overflow-hidden" : "w-[390px]"}`}
      >
        {!isSidebarCollapsed && (
          <>
            {/* ── Browser Top Controls ───────────────────────────────────── */}
            <div className="p-4 space-y-3 relative">
              {/* Title */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h1 className="text-lg font-bold text-foreground">
                    Manual Fix
                  </h1>
                  <span className="bg-muted rounded-full px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
                    {rows.length} Total Rows
                  </span>
                </div>
                <button
                  onClick={() => setIsSidebarCollapsed(true)}
                  className="h-8 w-8 border border-border rounded-md bg-background grid place-items-center hover:bg-muted"
                  title="Collapse Sidebar"
                >
                  <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              {/* Progress Summary */}
              <div className="grid grid-cols-[auto_auto_1fr] gap-3 items-center p-2 border border-border bg-muted/20 rounded-md">
                <div className="flex flex-col">
                  <strong className="text-sm font-bold text-foreground">
                    {reviewedCount}
                  </strong>
                  <span className="text-[9px] text-muted-foreground">
                    Reviewed
                  </span>
                </div>
                <div className="flex flex-col">
                  <strong className="text-sm font-bold text-muted-foreground">
                    {remainingCount}
                  </strong>
                  <span className="text-[9px] text-muted-foreground">
                    Remaining
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              {/* Search */}
              <div className="h-9 border border-border rounded-md flex items-center gap-2 px-2.5 bg-background">
                <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <input
                  id="manual-fix-search"
                  type="text"
                  placeholder="Search ID, stem, subject, issue..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent border-0 outline-none text-xs text-foreground placeholder:text-muted-foreground"
                />
                <kbd className="border border-border rounded px-1.5 py-0.5 text-[9px] text-muted-foreground bg-muted">
                  /
                </kbd>
              </div>

              {/* Status Filter Tabs */}
              <div className="grid grid-cols-5 gap-1.5">
                {(
                  [
                    { key: "all", label: "All", count: summary.total },
                    {
                      key: "rejected",
                      label: "Rejected",
                      count: summary.rejected,
                    },
                    {
                      key: "needs_review",
                      label: "Review",
                      count: summary.needs_review,
                    },
                    {
                      key: "caution",
                      label: "Caution",
                      count: summary.caution,
                    },
                    { key: "valid", label: "Valid", count: summary.valid },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setFilterStatus(tab.key as FixFilterStatus)}
                    className={`py-2 px-1 border rounded-md text-center text-[10px] font-medium transition-all ${
                      filterStatus === tab.key
                        ? "border-primary shadow-[inset_0_0_0_1px_var(--primary)] font-bold text-foreground"
                        : "border-border bg-background text-muted-foreground hover:bg-muted/30"
                    }`}
                  >
                    {tab.label}{" "}
                    <b className="text-[9px] bg-muted rounded-full px-1.5 py-0.5 ml-0.5">
                      {tab.count}
                    </b>
                  </button>
                ))}
              </div>

              {/* Sort + Filter row */}
              <div className="flex items-center justify-between gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="h-[30px] border border-border rounded-md bg-background px-2.5 text-[10px] text-foreground"
                >
                  <option value="ROW_ASC">Sort: Row ID (Asc)</option>
                  <option value="STATUS">Sort: Status</option>
                  <option value="UPDATED">Sort: Recently edited</option>
                </select>
                <button
                  onClick={() => setIsFilterPopoverOpen(!isFilterPopoverOpen)}
                  className="h-[30px] min-w-[88px] border border-border rounded-md bg-background px-2.5 text-[10px] flex items-center gap-1.5"
                >
                  <Filter className="h-3 w-3" /> Filters ⌄
                </button>
              </div>

              {/* Filter Popover */}
              {isFilterPopoverOpen && (
                <div className="absolute right-4 top-[230px] w-[260px] bg-background border border-border rounded-lg shadow-xl z-30 p-3 space-y-2.5">
                  <label className="block space-y-1">
                    <span className="text-[10px] font-bold text-foreground">
                      Question type
                    </span>
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="w-full h-[30px] border border-border rounded-md px-2 text-[10px]"
                    >
                      <option value="ALL">All types</option>
                      <option value="MCQ">MCQ</option>
                      <option value="MSQ">MSQ</option>
                      <option value="TEXT_ENTRY">Text Entry</option>
                      <option value="ORDER">Order</option>
                      <option value="UNKNOWN">Unsupported</option>
                    </select>
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[10px] font-bold text-foreground">
                      Severity
                    </span>
                    <select
                      value={severityFilter}
                      onChange={(e) => setSeverityFilter(e.target.value)}
                      className="w-full h-[30px] border border-border rounded-md px-2 text-[10px]"
                    >
                      <option value="ALL">All severities</option>
                      <option value="BLOCK">Blocking</option>
                      <option value="REVIEW">Review</option>
                      <option value="WARNING">Caution</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2 text-[10px]">
                    <input
                      type="checkbox"
                      checked={changedOnly}
                      onChange={(e) => setChangedOnly(e.target.checked)}
                    />
                    Changed only
                  </label>
                  <label className="flex items-center gap-2 text-[10px]">
                    <input
                      type="checkbox"
                      checked={unresolvedOnly}
                      onChange={(e) => setUnresolvedOnly(e.target.checked)}
                    />
                    Unresolved only
                  </label>
                  <button
                    onClick={() => {
                      setTypeFilter("ALL");
                      setSeverityFilter("ALL");
                      setChangedOnly(false);
                      setUnresolvedOnly(false);
                    }}
                    className="text-[10px] text-primary font-medium"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>

            {/* ── Row List ──────────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-4 pb-2" role="list">
              {paginatedRows.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No rows matching the current filters.
                </div>
              ) : (
                paginatedRows.map((row) => {
                  const isSelected = row.id === selectedRowId;
                  const isRowDirty = isSelected && hasUnsavedChanges;
                  const hasBlock = row.issues.some(
                    (i) => i.severity === "block",
                  );
                  const hasReview = row.issues.some(
                    (i) => i.severity === "review",
                  );
                  const isAutoFixed = autoFixedRowIds.has(row.id);

                  let leftBorder = "border-l-muted-foreground/30";
                  if (row.status === "rejected")
                    leftBorder = "border-l-destructive";
                  else if (row.status === "needs_review")
                    leftBorder = "border-l-amber-400";
                  else if (row.status === "valid")
                    leftBorder = "border-l-emerald-500";
                  else if (row.status === "caution")
                    leftBorder = "border-l-yellow-400";

                  const stem =
                    row.normalizedQuestion && "stem" in row.normalizedQuestion
                      ? row.normalizedQuestion.stem
                      : row.normalizedQuestion?.type === "UNKNOWN"
                        ? row.normalizedQuestion.rawStem
                        : "";

                  return (
                    <article
                      key={row.id}
                      role="listitem"
                      tabIndex={0}
                      onClick={() => selectRow(row.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          selectRow(row.id);
                        }
                      }}
                      className={`border border-border border-l-[3px] ${leftBorder} rounded-lg mb-2 p-3 bg-background cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-destructive/5 border-destructive/40 border-l-destructive"
                          : "hover:bg-muted/30"
                      } ${isRowDirty ? "shadow-[inset_0_0_0_1px_var(--primary)]" : ""}`}
                    >
                      {/* Top: row number + badges */}
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2.5">
                          <span className="w-3 h-3 border border-border rounded-sm shrink-0" />
                          <span className="font-bold text-[12px] text-foreground">
                            Row {row.sourceRowNumber}
                          </span>
                          {isRowDirty && (
                            <span
                              className="text-primary text-[10px] font-bold"
                              title="Unsaved changes"
                            >
                              ●
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1.5">
                          <span
                            className={`text-[9px] rounded px-2 py-0.5 font-semibold border ${
                              row.status === "rejected"
                                ? "text-destructive border-destructive/40 bg-destructive/5"
                                : row.status === "needs_review"
                                  ? "text-orange-600 border-orange-300 bg-orange-50"
                                  : row.status === "caution"
                                    ? "text-yellow-700 border-yellow-300 bg-yellow-50"
                                    : "text-emerald-600 border-emerald-300 bg-emerald-50"
                            }`}
                          >
                            {row.status === "needs_review"
                              ? "NEEDS REVIEW"
                              : row.status.toUpperCase()}
                          </span>
                          <span className="text-[9px] rounded px-2 py-0.5 font-semibold text-indigo-600 border border-indigo-200 bg-indigo-50">
                            {row.normalizedQuestion?.type || "UNKNOWN"}
                          </span>
                        </div>
                      </div>

                      {/* Stem preview */}
                      <p className="text-[10px] text-muted-foreground truncate ml-[26px] mb-1.5 italic">
                        {stem || "No stem text…"}
                      </p>

                      {/* Meta line */}
                      <p className="text-[9px] text-muted-foreground/70 ml-[26px]">
                        {editorState &&
                        row.id === selectedRowId &&
                        editorState.metadata
                          ? `${editorState.metadata.subject || "—"} · ${editorState.metadata.chapter || "—"}`
                          : "—"}{" "}
                        · v1
                      </p>

                      {/* Issue tags */}
                      {row.issues.length > 0 && (
                        <div className="flex gap-1.5 flex-wrap mt-2 ml-[26px]">
                          {row.issues.slice(0, 2).map((issue) => (
                            <span
                              key={issue.id}
                              className={`text-[9px] px-2 py-0.5 rounded border font-semibold truncate max-w-[200px] inline-block align-bottom ${
                                issue.severity === "block"
                                  ? "border-destructive/40 bg-destructive/5 text-destructive"
                                  : issue.severity === "review"
                                    ? "border-orange-300 bg-orange-50 text-orange-600"
                                    : "border-yellow-300 bg-yellow-50 text-yellow-600"
                              }`}
                              title={issue.message}
                            >
                              {issue.message}
                            </span>
                          ))}
                          {row.issues.length > 2 && (
                            <span className="text-[8px] px-2 py-0.5 rounded border border-border bg-muted text-muted-foreground">
                              +{row.issues.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })
              )}
            </div>

            {/* ── Pagination Footer ─────────────────────────────────────── */}
            <div className="h-[54px] border-t border-border grid grid-cols-3 items-center px-4 text-[10px] shrink-0">
              <div className="flex items-center gap-1.5">
                Rows per page:
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-[26px] border border-border rounded-md bg-background px-1 text-[10px]"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <div className="text-center text-muted-foreground">
                {processedRows.length
                  ? `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, processedRows.length)} of ${processedRows.length}`
                  : "0 results"}
              </div>
              <div className="flex gap-1.5 items-center justify-end">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="text-sm disabled:opacity-40"
                >
                  ‹
                </button>
                <span className="w-6 h-6 border border-border rounded-md grid place-items-center bg-background font-semibold">
                  {currentPage}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage >= totalPages}
                  className="text-sm disabled:opacity-40"
                >
                  ›
                </button>
              </div>
            </div>
          </>
        )}
      </aside>

      {/* ════════ RIGHT PANEL — Editor Area ════════════════════════════ */}
      <section className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
        {selectedRow && editorState ? (
          <>
            {/* ── Editor Top Bar ────────────────────────────────────── */}
            <div className="h-[57px] border-b border-border flex items-center justify-between px-5 bg-background shrink-0">
              <div className="flex items-center gap-2">
                {isSidebarCollapsed && (
                  <button
                    onClick={() => setIsSidebarCollapsed(false)}
                    className="h-8 w-8 border border-border rounded-md bg-background grid place-items-center hover:bg-muted mr-1.5"
                    title="Expand Sidebar"
                  >
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
                <span className="w-3 h-3 border border-muted-foreground/40 rounded-sm" />
                <strong className="text-sm font-bold text-foreground">
                  Editing Row {selectedRow.sourceRowNumber}
                </strong>
                <span className="text-muted-foreground text-xs">
                  of {rows.length}
                </span>
                <button
                  onClick={() => handleNextRow(-1)}
                  className="h-[29px] px-2 border border-border rounded-md bg-background text-sm"
                >
                  ‹
                </button>
                <button
                  onClick={() => handleNextRow(1)}
                  className="h-[29px] px-2 border border-border rounded-md bg-background text-sm"
                >
                  ›
                </button>
                <button
                  onClick={() => handleNextUnresolved(1)}
                  className="text-primary font-medium text-xs"
                >
                  Next unresolved
                </button>
                {hasUnsavedChanges ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary">
                    Unsaved
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-success/10 text-success">
                    Saved
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                    className="h-[29px] w-[29px] border border-border rounded-md bg-background grid place-items-center"
                    title="More actions"
                  >
                    ⋯
                  </button>
                  {isMoreMenuOpen && (
                    <div className="absolute right-0 top-[32px] w-[230px] bg-background border border-border rounded-lg shadow-xl z-40 p-1.5 space-y-0.5">
                      <button
                        className="w-full text-left px-3 py-2 rounded-md hover:bg-muted text-[10px]"
                        onClick={() => {
                          setSimulatedServerVersion({
                            ...selectedRow,
                            stem:
                              (editorState.stem || "") +
                              " [edited by reviewer]",
                          });
                          toast.warning("Server version simulated.");
                          setIsMoreMenuOpen(false);
                        }}
                      >
                        Simulate version conflict
                      </button>
                      <button
                        className="w-full text-left px-3 py-2 rounded-md hover:bg-muted text-[10px]"
                        onClick={() => {
                          toast.warning("Simulation noted (UI only).");
                          setIsMoreMenuOpen(false);
                        }}
                      >
                        Simulate save failure
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => saveEdit()}
                  disabled={!hasUnsavedChanges}
                  className="h-[30px] px-2.5 border border-border rounded-md bg-background text-[10px] font-medium disabled:opacity-40"
                >
                  ▣ Save Draft
                </button>
                <button
                  onClick={() => {
                    saveEdit();
                    handleNextRow(1);
                  }}
                  className="h-[30px] px-3 rounded-md bg-primary text-primary-foreground text-[10px] font-semibold border border-primary"
                >
                  ▣ Save & Validate
                </button>
              </div>
            </div>

            {/* ── Issue Banner ──────────────────────────────────────── */}
            {selectedRow.issues.length > 0 ? (
              <div className="mx-5 mt-3 border border-destructive/30 bg-gradient-to-r from-destructive/5 to-destructive/[0.03] rounded-md p-3">
                <div className="flex items-center gap-2.5 text-[11px] mb-2">
                  <span className="w-[17px] h-[17px] border border-destructive rounded-full grid place-items-center text-destructive font-bold text-[10px]">
                    !
                  </span>
                  <strong className="text-foreground">
                    {
                      selectedRow.issues.filter((i) => i.severity === "block")
                        .length
                    }{" "}
                    blocking issue(s)
                  </strong>
                  <span className="text-muted-foreground">
                    must be resolved before export.
                  </span>
                </div>
                <div className="flex gap-2 flex-wrap ml-[26px]">
                  {selectedRow.issues.map((issue) => (
                    <button
                      key={issue.id}
                      className={`min-h-[23px] px-2 py-1 rounded text-[10px] font-medium border text-left leading-tight ${
                        issue.severity === "block"
                          ? "border-purple-300 text-purple-700 bg-purple-50"
                          : issue.severity === "review"
                            ? "border-orange-300 text-orange-600 bg-orange-50"
                            : "border-yellow-300 text-yellow-700 bg-yellow-50"
                      }`}
                    >
                      {issue.message}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mx-5 mt-3 border border-success/30 bg-success/5 rounded-md p-3 flex items-center gap-2 text-success text-[11px] font-medium">
                <ShieldCheck className="h-4 w-4" />
                <span>✓ No unresolved validation issues.</span>
              </div>
            )}

            {/* ── Single‑Column Editor Layout ──────────────────────── */}
            <div className="flex-1 overflow-y-auto p-5 flex justify-center">
              <div className="flex w-full max-w-5xl flex-col gap-4">
                {/* ▸ Question Stem Panel */}
                <section
                  className="shrink-0 border border-border rounded-lg bg-background overflow-hidden"
                  style={{ order: sectionOrder("question") }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handleSectionDrop("question")}
                  data-authoring-section="question"
                >
                  <div className="min-h-[43px] border-b border-border flex items-center justify-between px-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        draggable
                        onDragStart={() => setDraggedSectionId("question")}
                        className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
                        aria-label="Drag question section"
                        title="Drag to reorder"
                      >
                        <GripVertical className="h-4 w-4" />
                      </button>
                      <strong className="text-[11px] font-semibold">
                        Question Stem{" "}
                        <em className="text-destructive not-italic">*</em>
                      </strong>
                      <span
                        className="inline-grid place-items-center w-[13px] h-[13px] border border-muted-foreground/50 rounded-full text-[9px] text-muted-foreground cursor-help"
                        title="Learner-facing question text"
                      >
                        ?
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setIsPreviewDrawerOpen(true)}
                        className="h-[27px] px-2 border border-border rounded-md bg-background text-[10px] flex items-center gap-1.5 hover:bg-muted font-medium"
                        title="Preview Question"
                      >
                        <Eye className="h-3.5 w-3.5 text-muted-foreground" />{" "}
                        Preview
                      </button>
                      <button
                        onClick={undoLastEdit}
                        disabled={!canUndo}
                        className="h-[27px] px-2 border border-border rounded-md bg-background text-[10px] flex items-center gap-1.5 hover:bg-muted font-medium disabled:opacity-40 disabled:hover:bg-background"
                        title="Undo Last Edit"
                      >
                        <Undo2 className="h-3.5 w-3.5 text-muted-foreground" />{" "}
                        Undo
                      </button>
                      <button
                        onClick={() => setIsSourceDrawerOpen(true)}
                        className="h-[27px] px-2 border border-border rounded-md bg-background text-[10px]"
                      >
                        Compare
                      </button>

                    </div>
                  </div>
                  <RichToolbar
                    textareaRef={stemRef}
                    value={editorState.stem}
                    onChange={(v) =>
                      setEditorState({ ...editorState, stem: v })
                    }
                    onOpenAsset={() => {
                      let range = null;
                      const sel = window.getSelection();
                      if (sel && sel.rangeCount > 0) {
                        range = sel.getRangeAt(0);
                      }
                      setAssetTarget({ kind: "stem", range });
                      setIsAssetModalOpen(true);
                    }}
                    onOpenSource={() => setIsSourceDrawerOpen(true)}
                    onOpenTable={() => {
                      const tableHtml = getActiveTableHtml(stemRef.current);
                      setTableInitialHtml(tableHtml);
                      setIsTableModalOpen(true);
                    }}
                    onOpenMatrixModal={openMatrixEditor}
                    onOpenEquationModal={openEquationEditor}
                    variant="full"
                  />
                  <ContentEditable
                    innerRef={stemRef}
                    value={editorState.stem}
                    onChange={(html) =>
                      setEditorState({ ...editorState, stem: html })
                    }
                    onOpenTable={(tableEl) => {
                      let tableHtml = "";
                      if (tableEl) {
                        tableEl.setAttribute("data-editing", "true");
                        tableHtml = tableEl.outerHTML;
                      } else {
                        tableHtml = getActiveTableHtml(stemRef.current);
                      }
                      setTableInitialHtml(tableHtml);
                      setIsTableModalOpen(true);
                    }}
                    onOpenMatrixModal={openMatrixEditor}
                    onOpenEquationModal={openEquationEditor}
                    onOpenImageModal={openImageProperties}
                    className="min-h-[112px] border-0"
                    placeholder="Type question stem..."
                  />
                  <div className="h-[27px] border-t border-border/50 flex justify-between items-center px-3 text-[10px] text-muted-foreground bg-muted/5">
                    <span>
                      chars: {editorState.stem.replace(/<[^>]*>/g, "").length}
                    </span>
                    <span>
                      Math{" "}
                      {stemHasMath ? (
                        <b className="bg-success text-success-foreground rounded-full px-1.5 py-0.5 text-[8px]">
                          ON
                        </b>
                      ) : (
                        <b className="text-muted-foreground text-[8px]">OFF</b>
                      )}
                    </span>
                  </div>
                </section>

                {/* ▸ Question Type & Options Panel */}
                <section
                  className="shrink-0 border border-border rounded-lg bg-background overflow-hidden"
                  style={{ order: sectionOrder("response") }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handleSectionDrop("response")}
                  data-authoring-section="response"
                >
                  <div className="h-[45px] border-b border-border grid grid-cols-[24px_125px_1fr] items-center px-3">
                    <button
                      type="button"
                      draggable
                      onDragStart={() => setDraggedSectionId("response")}
                      className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
                      aria-label="Drag response section"
                      title="Drag to reorder"
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>
                    <strong className="text-[10px]">
                      Response interaction
                    </strong>
                    <Select
                      value={editorState.type}
                      onValueChange={(val) => {
                        if (val !== editorState.type) setPendingTypeChange(val);
                      }}
                    >
                      <SelectTrigger className="h-[30px] text-[10px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MCQ">Single choice</SelectItem>
                        <SelectItem value="MSQ">Multiple choice</SelectItem>
                        <SelectItem value="TEXT_ENTRY">
                          Free response
                        </SelectItem>
                        <SelectItem value="ORDER">Ordering</SelectItem>
                        <SelectItem value="DRAG_DROP" disabled>
                          Drag and drop (not exportable yet)
                        </SelectItem>
                        <SelectItem value="HOTSPOT" disabled>
                          Hotspot (not exportable yet)
                        </SelectItem>
                        <SelectItem value="MATCHING" disabled>
                          Matching (not exportable yet)
                        </SelectItem>
                        <SelectItem value="FILE_UPLOAD" disabled>
                          File upload (not exportable yet)
                        </SelectItem>
                        <SelectItem value="UNKNOWN">
                          Unsupported / Unknown
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="h-[36px] flex items-center px-3 text-[10px] font-bold text-foreground">
                    {editorState.type === "TEXT_ENTRY"
                      ? "Accepted Answers"
                      : editorState.type === "ORDER"
                        ? "Sequence Items"
                        : "Options"}{" "}
                    <em className="text-destructive not-italic ml-0.5">*</em>
                    <span className="ml-1.5 inline-grid place-items-center w-[13px] h-[13px] border border-muted-foreground/50 rounded-full text-[9px] text-muted-foreground">
                      ?
                    </span>
                  </div>

                  {/* MCQ / MSQ option table */}
                  {(editorState.type === "MCQ" ||
                    editorState.type === "MSQ") && (
                    <>
                      <div className="grid grid-cols-[20px_28px_minmax(0,1fr)_75px_52px] items-center h-[30px] bg-muted/30 border-y border-border px-2.5 text-[9px] font-semibold text-muted-foreground uppercase">
                        <span>#</span>
                        <span></span>
                        <span>Option Text</span>
                        <span className="text-center">Is Correct</span>
                        <span className="text-center">Actions</span>
                      </div>
                      {editorState.options.map((opt, i) => {
                        const letter = String.fromCharCode(65 + i);
                        const isCorrect =
                          editorState.type === "MCQ"
                            ? editorState.correctAnswerId === opt.id
                            : editorState.correctAnswerIds.includes(opt.id);
                        return (
                          <div
                            key={opt.id}
                            className="grid grid-cols-[20px_28px_minmax(0,1fr)_75px_52px] items-center min-h-[47px] border-b border-border px-2.5 py-1.5"
                          >
                            <span className="text-sm text-muted-foreground cursor-grab">
                              ⠿
                            </span>
                            <span className="text-xs font-semibold">
                              {letter}
                            </span>
                            <div className="flex flex-col border border-border rounded overflow-hidden">
                              <RichToolbar
                                textareaRef={getOptionRef(opt.id)}
                                value={opt.text}
                                onChange={(v) => {
                                  const newOpts = editorState.options.map(
                                    (o, idx) =>
                                      idx === i
                                        ? { ...o, text: v }
                                        : o,
                                  );
                                  setEditorState({
                                    ...editorState,
                                    options: newOpts,
                                  });
                                }}
                                onOpenAsset={() => {
                                  let range = null;
                                  const sel = window.getSelection();
                                  if (sel && sel.rangeCount > 0) {
                                    range = sel.getRangeAt(0);
                                  }
                                  setAssetTarget({ kind: "option", optionId: opt.id, range });
                                  setIsAssetModalOpen(true);
                                }}
                                onOpenTable={() => {
                                  const ref = getOptionRef(opt.id);
                                  const tableHtml = ref.current ? getActiveTableHtml(ref.current) : "";
                                  setTableInitialHtml(tableHtml);
                                  setTableTarget({ kind: "option", optionId: opt.id });
                                  setIsTableModalOpen(true);
                                }}
                                onOpenMatrixModal={openMatrixEditor}
                                onOpenEquationModal={openEquationEditor}
                                variant="compact"
                              />
                              <ContentEditable
                                innerRef={getOptionRef(opt.id)}
                                value={opt.text}
                                onChange={(html) => {
                                  const newOpts = editorState.options.map(
                                    (o, idx) =>
                                      idx === i
                                        ? { ...o, text: html }
                                        : o,
                                  );
                                  setEditorState({
                                    ...editorState,
                                    options: newOpts,
                                  });
                                }}
                                onOpenTable={(tableEl) => {
                                  let tableHtml = "";
                                  if (tableEl) {
                                    tableEl.setAttribute("data-editing", "true");
                                    tableHtml = tableEl.outerHTML;
                                  } else {
                                    const ref = getOptionRef(opt.id);
                                    tableHtml = ref.current ? getActiveTableHtml(ref.current) : "";
                                  }
                                  setTableInitialHtml(tableHtml);
                                  setTableTarget({ kind: "option", optionId: opt.id });
                                  setIsTableModalOpen(true);
                                }}
                                onOpenMatrixModal={openMatrixEditor}
                                onOpenEquationModal={openEquationEditor}
                                onOpenImageModal={openImageProperties}
                                className="min-h-[40px] border-0 text-xs"
                                placeholder={`Option ${letter}`}
                              />
                            </div>
                            <span className="text-center">
                              <input
                                type={
                                  editorState.type === "MCQ"
                                    ? "radio"
                                    : "checkbox"
                                }
                                name="correctOption"
                                checked={isCorrect}
                                onChange={() => {
                                  if (editorState.type === "MCQ") {
                                    setEditorState({
                                      ...editorState,
                                      correctAnswerId: opt.id,
                                    });
                                  } else {
                                    const set = new Set(
                                      editorState.correctAnswerIds,
                                    );
                                    isCorrect
                                      ? set.delete(opt.id)
                                      : set.add(opt.id);
                                    setEditorState({
                                      ...editorState,
                                      correctAnswerIds: [...set],
                                    });
                                  }
                                }}
                                className="accent-primary"
                              />
                            </span>
                            <span className="text-center">
                              <button
                                onClick={() => {
                                  if (editorState.options.length <= 2) {
                                    toast.error(
                                      "At least two options required.",
                                    );
                                    return;
                                  }
                                  setEditorState({
                                    ...editorState,
                                    options: editorState.options.filter(
                                      (_, idx) => idx !== i,
                                    ),
                                    correctAnswerId:
                                      editorState.correctAnswerId === opt.id
                                        ? ""
                                        : editorState.correctAnswerId,
                                    correctAnswerIds:
                                      editorState.correctAnswerIds.filter(
                                        (id) => id !== opt.id,
                                      ),
                                  });
                                }}
                                className="text-muted-foreground hover:text-destructive transition-colors"
                              >
                                ⌫
                              </button>
                            </span>
                          </div>
                        );
                      })}
                      <button
                        onClick={() => {
                          const newId = crypto.randomUUID();
                          setEditorState({
                            ...editorState,
                            options: [
                              ...editorState.options,
                              { id: newId, text: "" },
                            ],
                          });
                        }}
                        className="h-[31px] mx-2.5 my-2 w-[calc(100%-20px)] border border-dashed border-primary/40 rounded bg-primary/5 text-primary text-[10px] font-medium"
                      >
                        ＋ Add Option
                      </button>
                    </>
                  )}

                  {/* TEXT_ENTRY */}
                  {editorState.type === "TEXT_ENTRY" && (
                    <div className="p-3 space-y-3">
                      <div className="inline-flex border border-border rounded-md overflow-hidden">
                        {(["text", "numeric", "formula"] as const).map((m) => (
                          <button
                            key={m}
                            onClick={() =>
                              setEditorState({
                                ...editorState,
                                textEntryMode: m,
                              })
                            }
                            className={`h-[29px] px-3 text-[10px] border-0 ${
                              editorState.textEntryMode === m
                                ? "bg-primary text-primary-foreground font-semibold"
                                : "bg-background text-foreground"
                            }`}
                          >
                            {m.charAt(0).toUpperCase() + m.slice(1)}
                          </button>
                        ))}
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold">
                          Accepted answers
                        </label>
                        <textarea
                          value={editorState.acceptedAnswers?.join(", ") || ""}
                          onChange={(e) =>
                            setEditorState({
                              ...editorState,
                              acceptedAnswers: e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            })
                          }
                          className="w-full h-16 border border-border rounded-md p-2 text-xs font-mono outline-none resize-y"
                          placeholder="e.g. 9.8, 9.81"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold">
                            Tolerance
                          </label>
                          <input
                            type="text"
                            value={editorState.numericTolerance ?? ""}
                            onChange={(e) =>
                              setEditorState({
                                ...editorState,
                                numericTolerance:
                                  e.target.value === ""
                                    ? undefined
                                    : Number(e.target.value),
                              })
                            }
                            className="h-[31px] w-full border border-border rounded px-2 text-xs"
                            disabled={editorState.textEntryMode !== "numeric"}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold">Unit</label>
                          <input
                            type="text"
                            value={editorState.units || ""}
                            onChange={(e) =>
                              setEditorState({
                                ...editorState,
                                units: e.target.value,
                              })
                            }
                            className="h-[31px] w-full border border-border rounded px-2 text-xs"
                            disabled={editorState.textEntryMode !== "numeric"}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold">
                            Rounding
                          </label>
                          <select className="h-[31px] w-full border border-border rounded px-2 text-xs">
                            <option>Exact</option>
                            <option>Decimal places</option>
                            <option>Sig. figures</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-3 text-[10px] text-muted-foreground">
                        <label className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={editorState.caseSensitive}
                            onChange={(e) =>
                              setEditorState({
                                ...editorState,
                                caseSensitive: e.target.checked,
                              })
                            }
                          />{" "}
                          Case-sensitive
                        </label>
                        <label className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={editorState.trimPolicy === "trim"}
                            onChange={(e) =>
                              setEditorState({
                                ...editorState,
                                trimPolicy: e.target.checked ? "trim" : "none",
                              })
                            }
                          />{" "}
                          Trim whitespace
                        </label>
                      </div>
                    </div>
                  )}

                  {/* ORDER */}
                  {editorState.type === "ORDER" && (
                    <div className="p-3 space-y-2">
                      {editorState.options.map((item, i) => (
                        <div
                          key={item.id}
                          className="grid grid-cols-[25px_1fr_54px] gap-2 items-center"
                        >
                          <span className="text-xs font-bold text-muted-foreground text-center">
                            {i + 1}
                          </span>
                          <div className="flex flex-col border border-border rounded overflow-hidden">
                            <RichToolbar
                              textareaRef={getOptionRef(item.id)}
                              value={item.text}
                              onChange={(v) => {
                                const newOpts = editorState.options.map(
                                  (o, idx) =>
                                    idx === i
                                      ? { ...o, text: v }
                                      : o,
                                );
                                setEditorState({
                                  ...editorState,
                                  options: newOpts,
                                });
                              }}
                              onOpenAsset={() => {
                                let range = null;
                                const sel = window.getSelection();
                                if (sel && sel.rangeCount > 0) {
                                  range = sel.getRangeAt(0);
                                }
                                setAssetTarget({ kind: "option", optionId: item.id, range });
                                setIsAssetModalOpen(true);
                              }}
                              onOpenTable={() => {
                                const ref = getOptionRef(item.id);
                                const tableHtml = ref.current ? getActiveTableHtml(ref.current) : "";
                                setTableInitialHtml(tableHtml);
                                setTableTarget({ kind: "option", optionId: item.id });
                                setIsTableModalOpen(true);
                              }}
                              onOpenMatrixModal={openMatrixEditor}
                              onOpenEquationModal={openEquationEditor}
                              variant="compact"
                            />
                            <ContentEditable
                              innerRef={getOptionRef(item.id)}
                              value={item.text}
                              onChange={(html) => {
                                const newOpts = editorState.options.map(
                                  (o, idx) =>
                                    idx === i
                                      ? { ...o, text: html }
                                      : o,
                                );
                                setEditorState({
                                  ...editorState,
                                  options: newOpts,
                                });
                              }}
                              onOpenTable={(tableEl) => {
                                let tableHtml = "";
                                if (tableEl) {
                                  tableEl.setAttribute("data-editing", "true");
                                  tableHtml = tableEl.outerHTML;
                                } else {
                                  const ref = getOptionRef(item.id);
                                  tableHtml = ref.current ? getActiveTableHtml(ref.current) : "";
                                }
                                setTableInitialHtml(tableHtml);
                                setTableTarget({ kind: "option", optionId: item.id });
                                setIsTableModalOpen(true);
                              }}
                              onOpenMatrixModal={openMatrixEditor}
                              onOpenEquationModal={openEquationEditor}
                              onOpenImageModal={openImageProperties}
                              className="min-h-[40px] border-0 text-xs"
                            />
                          </div>
                          <div className="flex gap-1">
                            <button
                              disabled={i === 0}
                              onClick={() => {
                                const reordered = [...editorState.options];
                                [reordered[i - 1], reordered[i]] = [
                                  reordered[i],
                                  reordered[i - 1],
                                ];
                                setEditorState({
                                  ...editorState,
                                  options: reordered,
                                  correctSequenceIds: reordered.map(
                                    (o) => o.id,
                                  ),
                                });
                              }}
                              className="h-[28px] px-1.5 border border-border rounded bg-background text-xs disabled:opacity-30"
                            >
                              ↑
                            </button>
                            <button
                              disabled={i === editorState.options.length - 1}
                              onClick={() => {
                                const reordered = [...editorState.options];
                                [reordered[i], reordered[i + 1]] = [
                                  reordered[i + 1],
                                  reordered[i],
                                ];
                                setEditorState({
                                  ...editorState,
                                  options: reordered,
                                  correctSequenceIds: reordered.map(
                                    (o) => o.id,
                                  ),
                                });
                              }}
                              className="h-[28px] px-1.5 border border-border rounded bg-background text-xs disabled:opacity-30"
                            >
                              ↓
                            </button>
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          const newId = crypto.randomUUID();
                          setEditorState({
                            ...editorState,
                            options: [
                              ...editorState.options,
                              { id: newId, text: "" },
                            ],
                            correctSequenceIds: [
                              ...editorState.correctSequenceIds,
                              newId,
                            ],
                          });
                        }}
                        className="w-full h-[31px] border border-dashed border-primary/40 rounded bg-primary/5 text-primary text-[10px]"
                      >
                        + Add sequence item
                      </button>
                    </div>
                  )}
                </section>

                {/* ▸ Metadata & Scoring Panel */}
                <section
                  className="shrink-0 border border-border rounded-lg bg-background overflow-hidden"
                  style={{ order: sectionOrder("metadata") }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handleSectionDrop("metadata")}
                  data-authoring-section="metadata"
                >
                  <div className="min-h-[35px] border-b border-border flex items-center justify-between px-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        draggable
                        onDragStart={() => setDraggedSectionId("metadata")}
                        className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
                        aria-label="Drag metadata section"
                        title="Drag to reorder"
                      >
                        <GripVertical className="h-4 w-4" />
                      </button>
                      <strong className="text-[11px]">
                        Metadata & Scoring
                      </strong>
                    </div>
                    <button
                      onClick={() =>
                        setIsMetadataCollapsed(!isMetadataCollapsed)
                      }
                      className="h-[27px] px-2 border border-border rounded-md bg-background text-[10px]"
                    >
                      {isMetadataCollapsed ? "Expand" : "Collapse"}
                    </button>
                  </div>
                  {!isMetadataCollapsed && (
                    <div className="p-3 space-y-3">
                      <ManualFixDetailsFields
                        editorState={editorState}
                        setEditorState={setEditorState}
                      />
                    </div>
                  )}
                </section>

                <ManualFixOptionalSections
                  editorState={editorState}
                  setEditorState={setEditorState}
                  draggedSectionId={draggedSectionId}
                  onDragStart={setDraggedSectionId}
                  onDrop={handleSectionDrop}
                  onOpenAsset={(sectionId, ruleId) => {
                    let range = null;
                    const sel = window.getSelection();
                    if (sel && sel.rangeCount > 0) {
                      range = sel.getRangeAt(0);
                    }
                    setAssetTarget({ kind: "section", sectionId, ruleId, range });
                    setIsAssetModalOpen(true);
                  }}
                  onOpenSource={() => setIsSourceDrawerOpen(true)}
                  onOpenMatrixModal={openMatrixEditor}
                  onOpenEquationModal={openEquationEditor}
                  onOpenImageModal={openImageProperties}
                />
              </div>
            </div>
          </>
        ) : (
          /* ── Empty state (no row selected) ──────────────────────── */
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-background">
            {isSidebarCollapsed && (
              <button
                onClick={() => setIsSidebarCollapsed(false)}
                className="mb-4 h-[30px] px-3 border border-border rounded-md bg-background text-[10px] font-medium flex items-center gap-1.5 hover:bg-muted"
              >
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />{" "}
                Show Sidebar
              </button>
            )}
            <Wrench className="h-12 w-12 mb-4 opacity-20" />
            <h3 className="text-lg font-medium text-foreground mb-1">
              Manual Fix Editor
            </h3>
            <p className="text-sm max-w-sm">
              Select a row from the left panel to review its validation issues,
              apply suggested fixes, or edit fields manually.
            </p>
          </div>
        )}
      </section>

      {/* ════════ Drawers & Modals ═════════════════════════════════════ */}
      <SourceDrawer
        isOpen={isSourceDrawerOpen}
        onClose={() => setIsSourceDrawerOpen(false)}
        selectedRow={selectedRow}
        editorState={editorState}
      />
      <HistoryDrawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        selectedRow={selectedRow}
      />
      <LearnerPreviewDrawer
        isOpen={isPreviewDrawerOpen}
        onClose={() => setIsPreviewDrawerOpen(false)}
        selectedRow={selectedRow}
        editorState={editorState}
        exportConfig={wizard.__exportConfig || wizard.exportConfig}
      />
      <ManualFixAssetModal
        isOpen={isAssetModalOpen}
        onClose={() => setIsAssetModalOpen(false)}
        existingMedia={existingBatchMedia}
        onAddAsset={(asset) => {
          const targetSection =
            assetTarget.kind === "section"
              ? editorState?.sections.find(
                  (section) => section.id === assetTarget.sectionId,
                )
              : undefined;
          const role: MediaRole =
            assetTarget.kind === "stem"
              ? "question_stem"
              : assetTarget.kind === "option"
                ? "option"
                : ((targetSection?.type || "explanation") as MediaRole);
          attachRichMedia(
            role,
            asset,
            assetTarget.kind === "stem"
              ? "question"
              : assetTarget.kind === "option"
                ? assetTarget.optionId
                : assetTarget.ruleId || assetTarget.sectionId,
          );
          const html = buildAssetMarkup(asset);
          if (assetTarget.kind === "stem" && stemRef.current) {
            const editor = stemRef.current;
            editor.focus();
            
            if (assetTarget.range) {
              const sel = window.getSelection();
              if (sel) {
                sel.removeAllRanges();
                sel.addRange(assetTarget.range);
              }
            }
            
            document.execCommand("insertHTML", false, ` ${html} `);
            setEditorState((current) =>
              current
                ? { ...current, stem: cleanMathHtml(editor.innerHTML) }
                : current,
            );
          } else if (assetTarget.kind === "section") {
            let updatedContent: string | null = null;
            
            if (assetTarget.range) {
              const node = assetTarget.range.startContainer;
              const editor = node.nodeType === Node.ELEMENT_NODE 
                ? (node as Element).closest('[contenteditable]') 
                : node.parentElement?.closest('[contenteditable]');
                
              if (editor) {
                (editor as HTMLElement).focus();
                const sel = window.getSelection();
                if (sel) {
                  sel.removeAllRanges();
                  sel.addRange(assetTarget.range);
                }
                document.execCommand("insertHTML", false, ` ${html} `);
                updatedContent = editor.innerHTML;
              }
            }

            setEditorState((current) => {
              if (!current) return current;
              const section = current.sections.find(
                (candidate) => candidate.id === assetTarget.sectionId,
              );
              if (!section) return current;

              if (assetTarget.ruleId) {
                return {
                  ...current,
                  sections: current.sections.map((candidate) =>
                    candidate.id === section.id
                      ? {
                          ...candidate,
                          conditionalFeedbackRules: (
                            candidate.conditionalFeedbackRules || []
                          ).map((rule) => {
                            if (rule.id === assetTarget.ruleId) {
                              const content = updatedContent !== null 
                                ? updatedContent 
                                : `${rule.content}${rule.content ? "\n" : ""}${html}`;
                              return { ...rule, content };
                            }
                            return rule;
                          }),
                        }
                      : candidate,
                  ),
                };
              }

              const content = updatedContent !== null 
                ? updatedContent 
                : `${section.content || ""}${section.content ? "\n" : ""}${html}`;
              return {
                ...current,
                explanation:
                  section.type === "explanation"
                    ? content
                    : current.explanation,
                sections: current.sections.map((candidate) =>
                  candidate.id === section.id
                    ? { ...candidate, content }
                    : candidate,
                ),
              };
            });
          } else if (assetTarget.kind === "option") {
            const editor = getOptionRef(assetTarget.optionId).current;
            if (editor) {
              editor.focus();
              if (assetTarget.range) {
                const sel = window.getSelection();
                if (sel) {
                  sel.removeAllRanges();
                  sel.addRange(assetTarget.range);
                }
              }
              document.execCommand("insertHTML", false, ` ${html} `);
              setEditorState((current) => {
                if (!current || !Array.isArray(current.options)) return current;
                return {
                  ...current,
                  options: current.options.map((opt) =>
                    opt.id === assetTarget.optionId
                      ? { ...opt, text: editor.innerHTML }
                      : opt
                  ),
                };
              });
            }
          }
        }}
      />
      <ShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
      <ConflictModal
        isOpen={isConflictModalOpen}
        onClose={() => setIsConflictModalOpen(false)}
        serverVersion={simulatedServerVersion}
        localDraft={editorState}
        onKeepDraft={() => {
          setIsConflictModalOpen(false);
          toast.info("Keeping local draft.");
        }}
        onReloadLatest={() => {
          setSimulatedServerVersion(null);
          setIsConflictModalOpen(false);
          toast.success("Reloaded server version.");
        }}
        onMergeLatest={() => {
          setSimulatedServerVersion(null);
          setIsConflictModalOpen(false);
          saveEdit();
          toast.success("Merged and saved.");
        }}
      />
      <TypeConversionModal
        isOpen={!!pendingTypeChange}
        onClose={() => setPendingTypeChange(null)}
        currentType={editorState?.type || ""}
        targetType={pendingTypeChange || ""}
        onPreserve={() => {
          if (pendingTypeChange && editorState)
            setEditorState({ ...editorState, type: pendingTypeChange });
          setPendingTypeChange(null);
        }}
        onConvertRemove={() => {
          if (pendingTypeChange && editorState) {
            const clean: any = {
              ...editorState,
              type: pendingTypeChange,
            };
            if (!["MCQ", "MSQ"].includes(pendingTypeChange)) {
              clean.options = [];
              clean.correctAnswerId = "";
              clean.correctAnswerIds = [];
            }
            if (pendingTypeChange !== "TEXT_ENTRY") {
              clean.acceptedAnswers = [];
              clean.numericTolerance = undefined;
              clean.units = "";
            }
            setEditorState(clean);
          }
          setPendingTypeChange(null);
        }}
      />
      <TableModal
        isOpen={isTableModalOpen}
        onClose={() => {
          setIsTableModalOpen(false);
          stemRef.current
            ?.querySelectorAll('table[data-editing="true"]')
            .forEach((el) => el.removeAttribute("data-editing"));
        }}
        initialHtml={tableInitialHtml}
        onInsert={handleInsertTable}
      />
      <MatrixModal
        isOpen={isMatrixModalOpen}
        onClose={() => {
          setIsMatrixModalOpen(false);
          setMatrixInitialLatex(undefined);
          if (matrixTarget?.ref?.current) {
            matrixTarget.ref.current
              .querySelectorAll('[data-editing="true"]')
              .forEach((el) => el.removeAttribute("data-editing"));
          } else {
            stemRef.current
              ?.querySelectorAll('[data-editing="true"]')
              .forEach((el) => el.removeAttribute("data-editing"));
          }
          setMatrixTarget(null);
        }}
        initialLatex={matrixInitialLatex}
        onInsert={(latexString) => {
          if (matrixTarget?.ref?.current) {
            const editor = matrixTarget.ref.current;
            editor.focus();

            if (matrixTarget.range) {
              const sel = window.getSelection();
              if (sel) {
                sel.removeAllRanges();
                sel.addRange(matrixTarget.range);
              }
            }

            const existingMatrix = editor.querySelector('[data-editing="true"]');
            const matrixHtml = buildMatrixElementHtml(latexString);
            if (existingMatrix) {
              existingMatrix.outerHTML = matrixHtml;
            } else {
              document.execCommand("insertHTML", false, ` ${matrixHtml} `);
            }
            if (matrixTarget.onChange) {
              matrixTarget.onChange(cleanMathHtml(editor.innerHTML));
            }
          }
          setIsMatrixModalOpen(false);
          setMatrixInitialLatex(undefined);
          setMatrixTarget(null);
        }}
      />
      
      <EquationEditorModal
        isOpen={isEquationModalOpen}
        onClose={() => {
          setIsEquationModalOpen(false);
          setEquationInitialLatex(undefined);
          if (equationTarget?.ref?.current) {
            equationTarget.ref.current
              .querySelectorAll('[data-editing="true"]')
              .forEach((el) => el.removeAttribute("data-editing"));
          } else {
            stemRef.current
              ?.querySelectorAll('[data-editing="true"]')
              .forEach((el) => el.removeAttribute("data-editing"));
          }
          setEquationTarget(null);
        }}
        initialLatex={equationInitialLatex}
        mode={equationMode}
        displayMode={equationDisplayMode}
        onInsert={(result) => {
          if (equationTarget?.ref?.current) {
            const editor = equationTarget.ref.current;
            editor.focus();

            if (equationTarget.range) {
              const sel = window.getSelection();
              if (sel) {
                sel.removeAllRanges();
                sel.addRange(equationTarget.range);
              }
            }

            const existingEq = editor.querySelector('[data-editing="true"]');
            
            const eqHtml = result.renderedHTML;

            if (existingEq) {
              existingEq.outerHTML = eqHtml;
            } else {
              document.execCommand("insertHTML", false, ` ${eqHtml} `);
            }
            if (equationTarget.onChange) {
              equationTarget.onChange(cleanMathHtml(editor.innerHTML));
            }
          }
          setIsEquationModalOpen(false);
          setEquationInitialLatex(undefined);
          setEquationTarget(null);
        }}
      />

      <ImagePropertiesModal
        isOpen={isImagePropertiesOpen}
        onClose={() => {
          setIsImagePropertiesOpen(false);
          setImageTarget(null);
        }}
        imageEl={imageTarget}
        onSave={(updates) => {
          if (!imageTarget) return;
          
          if (updates.width) {
            imageTarget.style.width = updates.width;
            imageTarget.setAttribute("width", updates.width);
          } else {
            imageTarget.style.removeProperty("width");
            imageTarget.removeAttribute("width");
          }
          
          if (updates.height) {
            imageTarget.style.height = updates.height;
            imageTarget.setAttribute("height", updates.height);
          } else {
            imageTarget.style.removeProperty("height");
            imageTarget.removeAttribute("height");
          }
          
          if (updates.alt) {
            imageTarget.setAttribute("alt", updates.alt);
          } else {
            imageTarget.removeAttribute("alt");
          }
          
          if (updates.title) {
            imageTarget.setAttribute("title", updates.title);
          } else {
            imageTarget.removeAttribute("title");
          }

          if (updates.src) {
            imageTarget.setAttribute("src", updates.src);
          }

          // Trigger change on the content editable
          const editor = imageTarget.closest("[contenteditable]");
          if (editor) {
            const inputEvent = new Event("input", { bubbles: true });
            editor.dispatchEvent(inputEvent);
          }
        }}
      />
    </div>
  );
}
