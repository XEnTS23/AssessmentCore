import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { RemediationSuggestion } from "../utils/dataCleaningPipeline";
import { ValidationResult, ValidationIssue } from "../utils/questionValidator";
import { Card, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  CheckCircle2,
  AlertTriangle,
  LayoutPanelLeft,
  X,
  Edit3,
  ShieldAlert,
  ChevronRight,
  Maximize2,
  Minimize2,
  Wrench,
  Save,
} from "lucide-react";

const ROW_LIST_BATCH_SIZE = 100;

export interface DataFixingWorkspaceProps {
  suggestions: RemediationSuggestion[];
  rows: Record<string, any>[];
  columns: string[];
  validationResults: Map<string, ValidationResult>;
  onAddCustomColumn?: (colName: string) => void;
  manualFixedRows: Map<string, any>;
  manualFixInputs: Map<string, string>;
  setManualFixInputs: React.Dispatch<React.SetStateAction<Map<string, string>>>;
  applyManualFix: (
    rowKey: string,
    suggestion: RemediationSuggestion,
    value: string,
  ) => void;
  applyBulkManualEdits?: (
    rowKey: string,
    edits: Record<string, string>,
  ) => void;
  undoManualFix: (rowKey: string) => void;
  getRowOptionsForSuggestion: (
    rowIndex: number,
  ) => { label: string; text: string }[];
  onRowClick: (rowKey: string) => void;
  selectedRowKey: string | null;
  forceExpanded?: boolean;
  openFullscreen?: boolean;
  dedupDeletedRows?: DedupDeletedRowSummary[];
  onRequestMinimize?: () => void;
}

/** Unified item representing either a pipeline suggestion or a raw validation error. */
interface ActionableItem {
  rowKey: string;
  rowIndex: number;
  source: "suggestion" | "validation_error";
  suggestion?: RemediationSuggestion;
  blockIssues: ValidationIssue[];
  primaryMessage: string;
  primaryField: string;
}

interface DedupDeletedRowSummary {
  rowKey: string;
  rowNumber: number;
  questionText: string;
}

/** Derive a rowKey from a raw row + its position, matching the convention used elsewhere. */
function deriveRowKey(row: Record<string, any>, idx: number): string {
  const explicit = row.__rowKey != null ? String(row.__rowKey).trim() : "";
  if (explicit) return explicit;
  const rawId = row.id != null ? String(row.id).trim() : "";
  return rawId ? `${rawId}#${idx + 1}` : `row_${idx + 1}`;
}

function getIssueSuggestions(issue: ValidationIssue): string[] {
  const supportedTypes = [
    "single_choice",
    "multi_select",
    "true_false",
    "text_entry",
    "numeric",
    "order",
    "matching",
  ];

  switch (issue.code) {
    // ── ID / Stem ──
    case "MISSING_ID":
      return ["Add a unique identifier (ID) for this question."];
    case "DUPLICATE_ID":
      return ["This ID is used by another row. Change it to a unique value."];
    case "MISSING_STEM":
      return ["Enter the question text in the question/stem field."];
    case "SHORT_STEM":
      return [
        "The question text is too short. Provide a more descriptive question (at least 5 characters).",
      ];
    case "ROW_EMPTY":
      return [
        "This row has no data. Fill in the required fields or remove the row.",
      ];

    // ── Type ──
    case "UNKNOWN_EXPLICIT_TYPE":
      return [
        `Unsupported explicit type: "${issue.message?.match(/\"(.+)\"/)?.[1] ?? "unknown"}"`,
        `Use one of the supported types: ${supportedTypes.join(", ")}.`,
      ];
    case "TYPE_REQUIRED":
      return [
        "Question Type is required when auto-detect is disabled.",
        `Set the Question Type to one of: ${supportedTypes.join(", ")}.`,
      ];
    case "TYPE_NOT_SUPPORTED_BY_PROFILE":
      return [
        "This question type is not enabled in the current profile.",
        "Update the question type or configuration profile to include this type.",
      ];
    case "UNKNOWN_TYPE":
      return [
        `Could not determine the question type. Set the type column to one of: ${supportedTypes.join(", ")}.`,
      ];
    case "TYPE_MISMATCH_MSQ":
      return [
        "This question has multiple correct answers but is typed as single_choice. Change the type to multi_select.",
      ];
    case "SUSPECT_SINGLE_OPTION":
      return [
        "Only one option is provided. Add more options or change to text_entry type.",
      ];
    case "SUSPECT_TRUE_FALSE":
      return [
        "This looks like a True/False question. Consider setting the type to true_false.",
      ];

    // ── Answer / Correct Answer ──
    case "MISSING_ANSWER":
      return [
        "Enter the correct answer. Use an option label (A, B, C…) or the exact option text.",
      ];
    case "MISSING_CORRECT_ANSWERS":
    case "MISSING_CORRECT_ANSWER":
      return [
        "At least one correct answer must be specified. Set the answer field to a valid option label or text.",
      ];
    case "ANSWER_NOT_IN_OPTIONS":
      return [
        "The answer value does not match any of the available options.",
        "Use the option label (e.g. A, B, C) or paste the exact option text as the answer.",
      ];
    case "AMBIGUOUS_ANSWER_MAPPING":
    case "AMBIGUOUS_ANSWER_MATCH":
      return [
        "The answer text matches more than one option.",
        "Use the option label (A, B, 1, 2…) instead of text to select the correct one deterministically.",
      ];
    case "INVALID_ANSWER_FORMAT":
      return [
        "The answer format is not valid. Check that it follows the expected format for this question type.",
      ];
    case "INVALID_ANSWER_IDENTIFIER":
      return [
        "The answer identifier does not match any option identifier. Use a valid option label.",
      ];
    case "MIXED_ANSWER_IDENTIFIER_MODE":
      return [
        "Answers mix label-based (A, B) and text-based identifiers. Use one mode consistently.",
      ];
    case "MULTIPLE_CORRECT_ANSWERS":
      return [
        "Multiple correct answers found for a single-choice question. Keep only one correct answer or change type to multi_select.",
      ];
    case "DUPLICATE_ANSWER_TOKEN":
      return [
        "The same answer appears more than once. Remove the duplicate answer token.",
      ];
    case "DUPLICATE_CORRECT_ANSWERS":
      return [
        "Duplicate correct answers detected. Remove the repeated answer entries.",
      ];

    // ── Multi-Select (MSQ) ──
    case "MISSING_MULTI_SELECT_ANSWERS":
      return [
        "Multi-select questions require at least one correct answer. Separate multiple answers with commas or semicolons.",
      ];
    case "MSQ_ANSWER_TEXT_AMBIGUOUS":
      return [
        "One or more answer texts match multiple options. Use option labels (A, B, C) instead of text.",
      ];
    case "MSQ_CARDINALITY_MISMATCH":
      return [
        "The number of answers does not match expectations. Verify each answer maps to exactly one option.",
      ];
    case "MSQ_EXACT_SET_MISMATCH":
      return [
        "The answer set does not exactly match the expected correct options. Review and correct the answer list.",
      ];
    case "MCQ_SHOULD_BE_MSQ":
      return [
        "Multiple correct answers detected. Change the type to multi_select.",
      ];

    // ── Options ──
    case "INSUFFICIENT_OPTIONS":
    case "MISSING_REQUIRED_OPTIONS":
      return [
        "At least 2 options are required. Add more options to the option columns (optionA, optionB, etc.).",
      ];
    case "TWO_CHOICE_NOT_ALLOWED":
      return [
        "Only two options are provided but two-choice mode is not allowed. Add a third option or more.",
      ];
    case "EMPTY_OPTION_TEXT":
      return [
        "One or more option fields are empty. Fill in all option text or remove unused option columns.",
      ];
    case "DUPLICATE_OPTION_TEXT":
      return [
        "Two or more options have the same text. Each option must be unique.",
      ];
    case "DUPLICATE_OPTION_IDENTIFIERS":
      return [
        "Option identifiers (labels) are duplicated. Ensure each option has a unique identifier.",
      ];
    case "INVALID_OPTION_IDENTIFIER":
      return [
        "An option identifier is not valid. Use standard labels like A, B, C or 1, 2, 3.",
      ];

    // ── True/False ──
    case "INVALID_TRUE_FALSE_ANSWER":
      return ['The answer must be "True" or "False" (case-insensitive).'];

    // ── Text Entry ──
    case "MISSING_TEXT_ENTRY_ANSWER":
      return [
        "Text entry questions require an expected answer. Enter the correct response text.",
      ];
    case "TEXT_ENTRY_WITH_OPTIONS":
      return [
        "Text entry questions should not have options. Remove the options or change the question type.",
      ];

    // ── Numeric ──
    case "INVALID_NUMERIC_ANSWER":
      return ["The answer must be a valid number (e.g. 42, 3.14, -7)."];
    case "MISSING_NUMERIC_TOLERANCE":
      return [
        "Consider adding a tolerance value for numeric comparison (e.g. ±0.01).",
      ];

    // ── Order ──
    case "INVALID_ORDER_ITEMS":
      return [
        "Order questions need at least 2 items to arrange. Add more items to the order column.",
      ];
    case "INVALID_ORDER_ANSWER":
      return ["The answer must specify the correct ordering of all items."];
    case "ORDER_ANSWER_AMBIGUOUS":
      return [
        "The order answer is ambiguous. Use item labels or exact text to specify the sequence clearly.",
      ];
    case "ORDER_ANSWER_MAPPING_FAILED":
      return [
        "Could not map the answer to the order items. Ensure the answer references each item exactly once.",
      ];
    case "ORDER_SEQUENCE_INCOMPLETE":
      return [
        "The answer sequence does not cover all items. Include every item exactly once in the correct order.",
      ];

    // ── Duplicates ──
    case "DUPLICATE_EXACT":
      return [
        "This question is an exact duplicate of another row. Remove one of the duplicates.",
      ];
    case "DUPLICATE_CONFLICT":
      return [
        "This question is nearly identical to another but with conflicting answers. Review both rows and resolve.",
      ];
    case "DUPLICATE_NEAR":
      return [
        "This question is very similar to another row. Review both to confirm they are intentionally different.",
      ];
    case "DUPLICATE_SUSPICIOUS":
      return [
        "This question has suspicious similarity to another row. Verify it is not an unintended duplicate.",
      ];

    // ── Other ──
    case "MISSING_REQUIRED_METADATA":
      return [
        "A required metadata field is missing. Check and fill in all required columns.",
      ];
    case "MISSING_SOLUTION":
      return ["Add a solution/explanation for this question."];
    case "NO_EXPORT_TARGET":
      return [
        "No export target configured. Select an export format before proceeding.",
      ];
    case "INVALID_FORMAT":
      return [
        "The data format is invalid. Check the field values match the expected format.",
      ];
    case "WHITESPACE_AUTOFIX":
      return ["Extra whitespace was detected and will be auto-trimmed."];

    default:
      return [`Review the error above and correct the "${issue.field}" field.`];
  }
}

export function DataFixingWorkspace({
  suggestions,
  rows,
  columns,
  validationResults,
  onAddCustomColumn,
  manualFixedRows,
  manualFixInputs,
  setManualFixInputs,
  applyManualFix,
  applyBulkManualEdits,
  undoManualFix,
  getRowOptionsForSuggestion,
  onRowClick,
  selectedRowKey,
  forceExpanded = false,
  openFullscreen = false,
  dedupDeletedRows = [],
  onRequestMinimize,
}: DataFixingWorkspaceProps) {
  const [ignoredRowKeys, setIgnoredRowKeys] = useState<Set<string>>(new Set());
  const [isFullscreen, setIsFullscreen] = useState(openFullscreen);
  const [isDetailCollapsed, setIsDetailCollapsed] = useState(false);
  const [isAddingField, setIsAddingField] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [rowCategoryFilters, setRowCategoryFilters] = useState<Set<string>>(
    new Set(),
  );
  const [loadedFilterBatches, setLoadedFilterBatches] = useState(1);
  // Track local edits in the grid before blur commits them
  const [gridEdits, setGridEdits] = useState<
    Map<string, Record<string, string>>
  >(new Map());
  const filterMenuRef = useRef<HTMLDivElement | null>(null);

  // Lock body scroll when fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isFullscreen]);

  useEffect(() => {
    if (openFullscreen) {
      setIsFullscreen(true);
    }
  }, [openFullscreen]);

  useEffect(() => {
    if (!isFilterMenuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!filterMenuRef.current) return;
      if (!filterMenuRef.current.contains(event.target as Node)) {
        setIsFilterMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [isFilterMenuOpen]);

  // Escape key to exit fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (forceExpanded && onRequestMinimize) {
          onRequestMinimize();
          return;
        }
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isFullscreen, forceExpanded, onRequestMinimize]);

  const handleToggleWorkspaceView = () => {
    if (isFullscreen && forceExpanded && onRequestMinimize) {
      onRequestMinimize();
      return;
    }
    setIsFullscreen((prev) => !prev);
  };

  // Clear stale gridEdits once manualFixedRows confirms the save
  useEffect(() => {
    if (gridEdits.size === 0) return;
    setGridEdits((prev) => {
      let changed = false;
      const next = new Map(prev);
      next.forEach((edits, rowKey) => {
        const saved = manualFixedRows.get(rowKey);
        if (!saved) return;
        const remaining: Record<string, string> = {};
        for (const [field, val] of Object.entries(edits)) {
          if (String(saved[field] ?? "") !== val) remaining[field] = val;
        }
        changed = true;
        if (Object.keys(remaining).length === 0) next.delete(rowKey);
        else next.set(rowKey, remaining);
      });
      return changed ? next : prev;
    });
  }, [manualFixedRows]);

  // ── Build unified actionable items ─────────────────────────────────────
  const { actionableItems, informationalSuggestions } = useMemo(() => {
    // Actionable suggestions (MEDIUM confidence, not ORDER_MISMATCH)
    const actionableSugs = suggestions.filter(
      (s) => s.confidence === "MEDIUM" && s.type !== "ORDER_MISMATCH",
    );
    const infoSugs = suggestions.filter(
      (s) => s.confidence === "HIGH" || s.type === "ORDER_MISMATCH",
    );

    // Collect rowKeys that already have a suggestion
    const suggestionRowKeys = new Set(actionableSugs.map((s) => s.rowKey));

    // Build items from suggestions
    const items: ActionableItem[] = actionableSugs.map((s) => {
      const vr = validationResults.get(s.rowKey);
      const blockIssues = (vr?.issues ?? []).filter(
        (i) => i.severity === "block",
      );
      return {
        rowKey: s.rowKey,
        rowIndex: s.rowIndex,
        source: "suggestion" as const,
        suggestion: s,
        blockIssues,
        primaryMessage: s.message,
        primaryField: s.field,
      };
    });

    // Track which rowKeys are already included
    const includedKeys = new Set(items.map((i) => i.rowKey));

    // Merge in raw validation errors for rows WITHOUT a suggestion
    validationResults.forEach((vr, rowKey) => {
      if (suggestionRowKeys.has(rowKey) || includedKeys.has(rowKey)) return;
      const blockIssues = (vr.issues ?? []).filter(
        (i) => i.severity === "block",
      );
      if (blockIssues.length === 0) return;
      items.push({
        rowKey,
        rowIndex: vr.rowNumber,
        source: "validation_error",
        blockIssues,
        primaryMessage: blockIssues
          .map((i) => `${i.field}: ${i.message}`)
          .join("; "),
        primaryField: blockIssues[0].field,
      });
    });

    // Re-include manually fixed rows that dropped out of validationResults
    // (their block issues resolved after editing), so "You fixed" count stays accurate
    manualFixedRows.forEach((_, rowKey) => {
      if (items.some((i) => i.rowKey === rowKey)) return; // already included
      const vr = validationResults.get(rowKey);
      // Extract row number from rowKey (format: "{id}#{rowNumber}")
      const hashIdx = rowKey.lastIndexOf("#");
      const parsedRowNum =
        hashIdx >= 0 ? parseInt(rowKey.slice(hashIdx + 1), 10) : NaN;
      items.push({
        rowKey,
        rowIndex: vr?.rowNumber ?? (isNaN(parsedRowNum) ? 0 : parsedRowNum),
        source: "validation_error",
        blockIssues: (vr?.issues ?? []).filter((i) => i.severity === "block"),
        primaryMessage: "Fixed by user",
        primaryField: "",
      });
    });

    // Sort by rowIndex for stable ordering
    items.sort((a, b) => a.rowIndex - b.rowIndex);

    return { actionableItems: items, informationalSuggestions: infoSugs };
  }, [suggestions, validationResults, manualFixedRows]);

  // ── Derived counts ─────────────────────────────────────────────────────
  const totalActionable = actionableItems.length;
  const userFixedCount = actionableItems.filter((i) =>
    manualFixedRows.has(i.rowKey),
  ).length;
  const ignoredCount = actionableItems.filter((i) =>
    ignoredRowKeys.has(i.rowKey),
  ).length;
  const pendingCount = totalActionable - userFixedCount - ignoredCount;
  const progressPercent =
    totalActionable > 0
      ? ((userFixedCount + ignoredCount) / totalActionable) * 100
      : 100;
  const autoFixedCount = informationalSuggestions.filter(
    (s) => s.confidence === "HIGH",
  ).length;

  const pendingItems = actionableItems.filter(
    (i) => !manualFixedRows.has(i.rowKey) && !ignoredRowKeys.has(i.rowKey),
  );
  const resolvedItems = actionableItems.filter(
    (i) => manualFixedRows.has(i.rowKey) || ignoredRowKeys.has(i.rowKey),
  );

  const actionableByRowKey = useMemo(() => {
    const map = new Map<string, ActionableItem>();
    actionableItems.forEach((item) => map.set(item.rowKey, item));
    return map;
  }, [actionableItems]);

  const autoFixedRowKeys = useMemo(() => {
    const set = new Set<string>();
    informationalSuggestions
      .filter((s) => s.confidence === "HIGH")
      .forEach((s) => set.add(s.rowKey));
    return set;
  }, [informationalSuggestions]);

  const allRowsStatusFeed = useMemo(() => {
    const feed: Array<{
      key: string;
      rowNumber: number;
      label: string;
      tone: string;
      questionText: string;
    }> = [];

    const getQuestionText = (row: Record<string, any>) => {
      const candidates = [
        "question",
        "questionText",
        "stem",
        "prompt",
        "Question",
        "Question Content",
      ];
      for (const key of candidates) {
        const value = row[key];
        if (value != null && String(value).trim()) return String(value).trim();
      }
      return "Untitled question";
    };

    rows.forEach((row, idx) => {
      const rowKey = deriveRowKey(row, idx);
      const vr =
        validationResults.get(rowKey) ??
        validationResults.get(rowKey.split("#")[0]);
      const actionable = actionableByRowKey.get(rowKey);
      const issues = vr?.issues || [];
      const hasDuplicateIssue = issues.some(
        (i) => i.category === "duplicate" || i.field === "Duplicate",
      );

      let label = "Needs Review";
      let tone = "bg-warning-light border-warning text-amber-800";

      if (manualFixedRows.has(rowKey)) {
        label = "Manual Fixed";
        tone = "bg-muted border-border text-foreground";
      } else if (autoFixedRowKeys.has(rowKey)) {
        label = "Auto Fixed";
        tone = "bg-muted border-border text-foreground";
      } else if (ignoredRowKeys.has(rowKey)) {
        label = "Ignored";
        tone = "bg-muted border-border/60 text-foreground";
      } else if (actionable?.source === "validation_error") {
        label = "Hard Block";
        tone = "bg-rose-50 border-rose-200 text-rose-800";
      } else if (hasDuplicateIssue) {
        label = "Duplicate";
        tone = "bg-orange-50 border-orange-200 text-orange-800";
      } else if (vr?.status === "valid") {
        label = "Valid";
        tone = "bg-success-light border-success text-emerald-800";
      } else if (vr?.status === "caution") {
        label = "Needs Review";
        tone = "bg-warning-light border-warning text-amber-800";
      } else if (vr?.status === "rejected") {
        label = "Rejected";
        tone = "bg-rose-50 border-rose-200 text-rose-800";
      }

      feed.push({
        key: rowKey,
        rowNumber: idx + 1,
        label,
        tone,
        questionText: getQuestionText(row),
      });
    });

    dedupDeletedRows.forEach((item) => {
      feed.push({
        key: `deleted-${item.rowKey}`,
        rowNumber: item.rowNumber,
        label: "Deleted (Dedup)",
        tone: "bg-rose-100 border-rose-300 text-rose-900",
        questionText: item.questionText || "Removed duplicate question",
      });
    });

    return feed.sort((a, b) => a.rowNumber - b.rowNumber);
  }, [
    rows,
    validationResults,
    manualFixedRows,
    autoFixedRowKeys,
    dedupDeletedRows,
    actionableByRowKey,
    ignoredRowKeys,
  ]);

  const availableRowCategories = useMemo(() => {
    const set = new Set<string>();
    allRowsStatusFeed.forEach((row) => set.add(row.label));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allRowsStatusFeed]);

  const filteredRowsStatusFeed = useMemo(() => {
    if (rowCategoryFilters.size === 0) return allRowsStatusFeed;
    return allRowsStatusFeed.filter((row) => rowCategoryFilters.has(row.label));
  }, [allRowsStatusFeed, rowCategoryFilters]);

  const isRowFilterApplied = rowCategoryFilters.size > 0;

  const visibleRowsStatusFeed = useMemo(() => {
    if (!isRowFilterApplied) {
      return filteredRowsStatusFeed.slice(0, ROW_LIST_BATCH_SIZE);
    }
    return filteredRowsStatusFeed.slice(
      0,
      loadedFilterBatches * ROW_LIST_BATCH_SIZE,
    );
  }, [filteredRowsStatusFeed, isRowFilterApplied, loadedFilterBatches]);

  const canLoadMoreFilteredRows =
    isRowFilterApplied &&
    visibleRowsStatusFeed.length < filteredRowsStatusFeed.length;

  useEffect(() => {
    setLoadedFilterBatches(1);
  }, [rowCategoryFilters]);

  const toggleRowCategoryFilter = (category: string) => {
    setRowCategoryFilters((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  // ── Navigation helpers ─────────────────────────────────────────────────
  const navigateToNextUnresolved = useCallback(
    (currentRowKey: string) => {
      const currentIdx = pendingItems.findIndex(
        (i) => i.rowKey === currentRowKey,
      );
      const search = [
        ...pendingItems.slice(currentIdx + 1),
        ...pendingItems.slice(0, currentIdx),
      ];
      const next = search.find(
        (i) => !ignoredRowKeys.has(i.rowKey) && !manualFixedRows.has(i.rowKey),
      );
      onRowClick(next?.rowKey ?? "");
    },
    [pendingItems, ignoredRowKeys, manualFixedRows, onRowClick],
  );

  const handleIgnore = (rowKey: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIgnoredRowKeys((prev) => new Set(prev).add(rowKey));
    navigateToNextUnresolved(rowKey);
  };

  const wrappedApplyManualFix = (
    rowKey: string,
    suggestion: RemediationSuggestion,
    value: string,
  ) => {
    applyManualFix(rowKey, suggestion, value);
    navigateToNextUnresolved(rowKey);
  };

  // ── Editable grid: onBlur handler ──────────────────────────────────────
  const handleFieldBlur = (
    rowKey: string,
    field: string,
    newValue: string,
    originalValue: string,
  ) => {
    if (newValue.trim() === String(originalValue ?? "").trim()) return; // no change

    // Find the row index from the rows array
    const rowIdx = rows.findIndex((r, idx) => deriveRowKey(r, idx) === rowKey);
    const syntheticSuggestion = {
      rowKey,
      rowIndex: rowIdx >= 0 ? rowIdx + 1 : 0,
      field,
      type: "MANUAL_EDIT",
      message: `Manual edit: ${field}`,
      suggestedValue: newValue.trim(),
      confidence: "MEDIUM",
    } as unknown as RemediationSuggestion;

    applyManualFix(rowKey, syntheticSuggestion, newValue.trim());
    // gridEdits is NOT cleared here — the useEffect on manualFixedRows handles
    // cleanup once the parent confirms the save, preventing a flash-revert.
  };

  const handleGridInput = (rowKey: string, field: string, value: string) => {
    setGridEdits((prev) => {
      const next = new Map(prev);
      next.set(rowKey, { ...(next.get(rowKey) ?? {}), [field]: value });
      return next;
    });
  };

  // Keep a ref to gridEdits so the save handler always reads the latest value
  const gridEditsRef = useRef(gridEdits);
  gridEditsRef.current = gridEdits;

  /** Save all pending grid edits for a row at once. */
  const handleSaveRow = useCallback(
    (rowKey: string) => {
      const edits = gridEditsRef.current.get(rowKey);
      if (!edits || Object.keys(edits).length === 0) return;

      const baseRow =
        manualFixedRows.get(rowKey) ??
        rows.find((r, idx) => deriveRowKey(r, idx) === rowKey);

      // Filter to only changed fields
      const changedEdits: Record<string, string> = {};
      for (const [field, value] of Object.entries(edits)) {
        const originalValue = baseRow ? String(baseRow[field] ?? "") : "";
        if (value.trim() !== originalValue.trim()) {
          changedEdits[field] = value.trim();
        }
      }
      if (Object.keys(changedEdits).length === 0) return;

      if (applyBulkManualEdits) {
        applyBulkManualEdits(rowKey, changedEdits);
      } else {
        // Fallback: apply last field only (single-field path)
        const entries = Object.entries(changedEdits);
        const [field, value] = entries[entries.length - 1];
        const rowIdx = rows.findIndex(
          (r, idx) => deriveRowKey(r, idx) === rowKey,
        );
        const syntheticSuggestion = {
          rowKey,
          rowIndex: rowIdx >= 0 ? rowIdx + 1 : 0,
          field,
          type: "MANUAL_EDIT",
          message: `Manual edit: ${field}`,
          suggestedValue: value,
          confidence: "MEDIUM",
        } as unknown as RemediationSuggestion;
        applyManualFix(rowKey, syntheticSuggestion, value);
      }
    },
    [rows, manualFixedRows, applyManualFix, applyBulkManualEdits],
  );

  // ── Selected row data ──────────────────────────────────────────────────
  const selectedItem = actionableItems.find((i) => i.rowKey === selectedRowKey);
  const selectedRowStatusEntry = useMemo(() => {
    if (!selectedRowKey) return null;
    const exact = allRowsStatusFeed.find((row) => row.key === selectedRowKey);
    if (exact) return exact;
    const baseKey = selectedRowKey.split("#")[0];
    return (
      allRowsStatusFeed.find((row) => {
        const rowBaseKey = row.key.split("#")[0];
        return row.key === baseKey || rowBaseKey === baseKey;
      }) ?? null
    );
  }, [selectedRowKey, allRowsStatusFeed]);

  const selectedRowData = useMemo(() => {
    if (!selectedRowKey) return null;
    // Try manualFixedRows first (has latest edits)
    if (manualFixedRows.has(selectedRowKey))
      return manualFixedRows.get(selectedRowKey);

    const direct = rows.find(
      (r, idx) => deriveRowKey(r, idx) === selectedRowKey,
    );
    if (direct) return direct;

    // Fallback: rowKey may be stored without suffix or with a different row-index suffix.
    const baseKey = selectedRowKey.split("#")[0];
    return (
      rows.find((r, idx) => {
        const computed = deriveRowKey(r, idx);
        return (
          computed === baseKey ||
          computed === selectedRowKey ||
          computed.split("#")[0] === baseKey
        );
      }) ?? null
    );
  }, [selectedRowKey, rows, manualFixedRows]);

  const validationResult = selectedRowKey
    ? (validationResults.get(selectedRowKey) ??
      validationResults.get(selectedRowKey.split("#")[0]))
    : null;

  const selectedLabel = selectedRowStatusEntry?.label ?? null;
  const isSelectedValidRow = selectedLabel === "Valid";
  const isSelectedDeletedRow =
    selectedRowKey?.startsWith("deleted-") ||
    selectedLabel === "Deleted (Dedup)";
  const canEditSelectedRow = Boolean(
    selectedRowKey &&
      selectedRowData &&
      !isSelectedValidRow &&
      !isSelectedDeletedRow,
  );
  const activeRowKey = selectedRowKey ?? "";
  const currentRowEditCount = gridEdits.get(activeRowKey)
    ? Object.keys(gridEdits.get(activeRowKey)!).length
    : 0;
  const problematicFieldCount = selectedItem
    ? new Set(
        [
          selectedItem.primaryField,
          ...selectedItem.blockIssues.map((issue) => issue.field),
        ].filter(Boolean),
      ).size
    : 0;

  // ── Render ─────────────────────────────────────────────────────────────

  if (pendingCount === 0 && !forceExpanded) {
    return (
      <div className="flex flex-col items-center justify-center p-12 h-full bg-[#f8fafc] rounded-lg border border-[#e2e8f0]">
        <div className="w-16 h-16 bg-[#eefaf2] rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-[#059669]" />
        </div>
        <h3 className="text-lg font-bold text-[#0f172a] mb-1">
          All issues resolved!
        </h3>
        <p className="text-sm text-[#475569]">
          You have successfully cleared {userFixedCount} manual fixes and{" "}
          {autoFixedCount} auto-fixes.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col flex-1 overflow-hidden bg-card transition-all duration-300 ${
        isFullscreen ? "fixed inset-0 z-50 h-screen w-screen" : "h-full"
      }`}
    >
      {/* Header */}
      <header className="h-14 px-5 border-b border-[#e2e8f0] bg-card flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-md bg-[#f1f5f9] text-[#1f2937] border border-[#e2e8f0] flex items-center justify-center">
            <Wrench className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-[#0f172a]">
            Data Fixing Workspace
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-[#475569]">
            <span className="font-semibold text-[#1f2937]">
              {userFixedCount}
            </span>{" "}
            fixed
            <span>&middot;</span>
            <span className="font-semibold text-[#ba1a1a]">
              {pendingCount}
            </span>{" "}
            remaining
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleWorkspaceView}
            className="h-8 w-8 p-0 text-[#64748b]"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </Button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Left Sidebar */}
        <aside className="w-[320px] flex flex-col border-r border-[#e2e8f0] bg-card min-h-0">
          <div className="p-3 border-b border-[#e2e8f0] bg-[#f8fafc]">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#64748b] mb-2">
              Rows to Review
            </p>
            <div className="w-full bg-[#e2e8f0] rounded-full h-1.5 mb-1 overflow-hidden">
              <div
                className="bg-[#0f172a] h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            {visibleRowsStatusFeed.map((row) => {
              const isActive = activeRowKey === row.key;
              const isResolved =
                manualFixedRows.has(row.key) ||
                autoFixedRowKeys.has(row.key) ||
                ignoredRowKeys.has(row.key) ||
                row.label === "Valid";

              return (
                <button
                  key={`nav-${row.key}`}
                  onClick={() => onRowClick(row.key)}
                  className={`w-full text-left px-4 py-3 border-b border-[#f1f5f9] flex flex-col gap-1 transition-colors ${
                    isActive
                      ? "bg-[#eef2ff] border-l-2 border-l-[#4f46e5]"
                      : "hover:bg-[#f8fafc] border-l-2 border-l-transparent"
                  } ${isResolved ? "opacity-50" : "opacity-100"}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider">
                      Row {row.rowNumber}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${row.tone}`}
                    >
                      {row.label}
                    </span>
                  </div>
                  <p className="text-xs text-[#0f172a] truncate font-medium w-full">
                    {row.questionText}
                  </p>
                </button>
              );
            })}
            {canLoadMoreFilteredRows && (
              <button
                onClick={() => setLoadedFilterBatches((prev) => prev + 1)}
                className="w-full p-3 text-xs text-[#4f46e5] font-semibold hover:bg-[#f8fafc]"
              >
                Load more...
              </button>
            )}
          </div>
        </aside>

        {/* Right Content */}
        <section className="flex-1 min-h-0 overflow-auto bg-[#f8fafc] p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {!selectedRowData ? (
              <div className="h-full flex flex-col items-center justify-center text-[#64748b] py-20">
                <LayoutPanelLeft className="w-8 h-8 mb-3 opacity-50" />
                <p className="text-sm font-medium">
                  Select a row from the sidebar to begin.
                </p>
              </div>
            ) : (
              <>
                {/* Status Bar */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm text-[#475569]">
                    <span className="font-bold text-[#0f172a]">
                      Row {selectedRowStatusEntry?.rowNumber || "Unknown"}
                    </span>
                    <span className="text-[#cbd5e1]">/</span>
                    <span className="truncate max-w-sm">
                      {selectedRowStatusEntry?.questionText}
                    </span>
                  </div>
                  {manualFixedRows.has(activeRowKey) && (
                    <span className="px-2 py-1 bg-[#eefaf2] border border-[#b7e2c6] text-[#059669] text-xs font-semibold rounded-md flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Fixed
                    </span>
                  )}
                </div>

                {/* Issues & Suggestions */}
                {selectedItem && !manualFixedRows.has(activeRowKey) && (
                  <div className="space-y-4">
                    {/* Suggestions (AI/Automated) */}
                    {selectedItem.suggestion && (
                      <div className="bg-[#fff4e9] border border-[#ffd8a8] rounded-xl p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <Edit3 className="w-4 h-4 text-[#8f4600]" />
                          <h4 className="text-sm font-bold text-[#8f4600]">
                            Suggested Fix
                          </h4>
                          <span className="text-[10px] font-bold bg-[#8f4600] text-white px-1.5 py-0.5 rounded tracking-wide uppercase">
                            Medium Confidence
                          </span>
                        </div>
                        <p className="text-xs text-[#8f4600]/80 mb-3">
                          {selectedItem.primaryMessage}
                        </p>
                        <div className="bg-white/60 border border-[#ffd8a8]/50 rounded-lg p-3 text-sm text-[#1f2937] font-medium flex items-center justify-between">
                          <span className="truncate flex-1 pr-4">
                            {selectedItem.suggestion.suggestedValue}
                          </span>
                          <Button
                            onClick={() =>
                              wrappedApplyManualFix(
                                activeRowKey,
                                selectedItem.suggestion!,
                                String(selectedItem.suggestion!.suggestedValue),
                              )
                            }
                            size="sm"
                            className="bg-[#8f4600] hover:bg-[#7a3b00] text-white text-xs h-7 shrink-0"
                          >
                            Accept Fix
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Hard Errors (Blocking) */}
                    {selectedItem.blockIssues.length > 0 &&
                      !selectedItem.suggestion && (
                        <div className="bg-[#fff4f2] border border-[#ffb4ab] rounded-xl p-4 shadow-sm">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-4 h-4 text-[#ba1a1a]" />
                            <h4 className="text-sm font-bold text-[#ba1a1a]">
                              Validation Error
                            </h4>
                          </div>
                          <ul className="space-y-2">
                            {selectedItem.blockIssues.map((issue, idx) => (
                              <li
                                key={idx}
                                className="text-xs text-[#93000a] bg-white/50 border border-[#ffb4ab]/30 p-2 rounded-md"
                              >
                                <span className="font-semibold">
                                  {issue.field}:
                                </span>{" "}
                                {issue.message}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                  </div>
                )}

                {/* Editing Grid */}
                {canEditSelectedRow && (
                  <div className="bg-card border border-[#e2e8f0] rounded-xl overflow-hidden shadow-sm flex flex-col">
                    <div className="px-4 py-3 bg-[#f8fafc] border-b border-[#e2e8f0] flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <h4 className="text-xs font-bold text-[#334155] uppercase tracking-wider">
                          Manual Editor
                        </h4>
                        {onAddCustomColumn && (
                          <div className="flex items-center gap-2">
                            {isAddingField ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={newFieldName}
                                  onChange={(e) =>
                                    setNewFieldName(e.target.value)
                                  }
                                  placeholder="New field name..."
                                  className="h-7 px-2 text-xs rounded border border-[#cbd5e1] focus:outline-none focus:border-[#4f46e5]"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      if (newFieldName.trim()) {
                                        onAddCustomColumn(newFieldName.trim());
                                        setNewFieldName("");
                                        setIsAddingField(false);
                                      }
                                    } else if (e.key === "Escape") {
                                      setIsAddingField(false);
                                      setNewFieldName("");
                                    }
                                  }}
                                  autoFocus
                                />
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    if (newFieldName.trim()) {
                                      onAddCustomColumn(newFieldName.trim());
                                      setNewFieldName("");
                                      setIsAddingField(false);
                                    }
                                  }}
                                  className="h-7 text-xs bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#0f172a]"
                                >
                                  Add
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setIsAddingField(false);
                                    setNewFieldName("");
                                  }}
                                  className="h-7 w-7 p-0 text-[#64748b]"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsAddingField(true)}
                                className="h-7 text-xs border-dashed border-[#cbd5e1] text-[#64748b] hover:text-[#0f172a]"
                              >
                                + Custom Field
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                      {currentRowEditCount > 0 && (
                        <Button
                          onClick={() => handleSaveRow(activeRowKey)}
                          size="sm"
                          className="h-7 text-xs bg-[#111827] hover:bg-[#1f2937] text-white flex items-center gap-1.5"
                        >
                          <Save className="w-3.5 h-3.5" /> Save Edits
                        </Button>
                      )}
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {columns.map((col) => {
                        const val =
                          gridEdits.get(activeRowKey)?.[col] ??
                          selectedRowData[col] ??
                          "";
                        const hasError = selectedItem?.blockIssues.some(
                          (i) => i.field === col,
                        );
                        return (
                          <div key={col} className="space-y-1.5">
                            <label
                              className={`text-[11px] font-bold uppercase tracking-wide ${hasError ? "text-[#ba1a1a]" : "text-[#64748b]"}`}
                            >
                              {col}
                            </label>
                            <input
                              type="text"
                              value={String(val)}
                              onChange={(e) =>
                                handleGridInput(
                                  activeRowKey,
                                  col,
                                  e.target.value,
                                )
                              }
                              onBlur={(e) =>
                                handleFieldBlur(
                                  activeRowKey,
                                  col,
                                  e.target.value,
                                  String(selectedRowData[col] ?? ""),
                                )
                              }
                              className={`w-full h-9 px-3 text-sm rounded-md border focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all ${
                                hasError
                                  ? "border-[#ffb4ab] focus:border-[#ba1a1a] focus:ring-[#ffb4ab] bg-[#fff4f2]"
                                  : "border-[#cbd5e1] focus:border-[#4f46e5] focus:ring-[#eef2ff]"
                              }`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
