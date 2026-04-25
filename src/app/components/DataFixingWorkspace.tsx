import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { RemediationSuggestion } from '../utils/dataCleaningPipeline';
import { ValidationResult, ValidationIssue } from '../utils/questionValidator';
import { Card, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
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
} from 'lucide-react';

const ROW_LIST_BATCH_SIZE = 100;

export interface DataFixingWorkspaceProps {
  suggestions: RemediationSuggestion[];
  rows: Record<string, any>[];
  columns: string[];
  validationResults: Map<string, ValidationResult>;
  manualFixedRows: Map<string, any>;
  manualFixInputs: Map<string, string>;
  setManualFixInputs: React.Dispatch<React.SetStateAction<Map<string, string>>>;
  applyManualFix: (rowKey: string, suggestion: RemediationSuggestion, value: string) => void;
  applyBulkManualEdits?: (rowKey: string, edits: Record<string, string>) => void;
  undoManualFix: (rowKey: string) => void;
  getRowOptionsForSuggestion: (rowIndex: number) => { label: string; text: string }[];
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
  source: 'suggestion' | 'validation_error';
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
  const explicit = row.__rowKey != null ? String(row.__rowKey).trim() : '';
  if (explicit) return explicit;
  const rawId = row.id != null ? String(row.id).trim() : '';
  return rawId ? `${rawId}#${idx + 1}` : `row_${idx + 1}`;
}

function getIssueSuggestions(issue: ValidationIssue): string[] {
  const supportedTypes = ['single_choice', 'multi_select', 'true_false', 'text_entry', 'numeric', 'order', 'matching'];

  switch (issue.code) {
    // ── ID / Stem ──
    case 'MISSING_ID':
      return ['Add a unique identifier (ID) for this question.'];
    case 'DUPLICATE_ID':
      return ['This ID is used by another row. Change it to a unique value.'];
    case 'MISSING_STEM':
      return ['Enter the question text in the question/stem field.'];
    case 'SHORT_STEM':
      return ['The question text is too short. Provide a more descriptive question (at least 5 characters).'];
    case 'ROW_EMPTY':
      return ['This row has no data. Fill in the required fields or remove the row.'];

    // ── Type ──
    case 'UNKNOWN_EXPLICIT_TYPE':
      return [
        `Unsupported explicit type: "${issue.message?.match(/\"(.+)\"/)?.[1] ?? 'unknown'}"`,
        `Use one of the supported types: ${supportedTypes.join(', ')}.`,
      ];
    case 'TYPE_REQUIRED':
      return [
        'Question Type is required when auto-detect is disabled.',
        `Set the Question Type to one of: ${supportedTypes.join(', ')}.`,
      ];
    case 'TYPE_NOT_SUPPORTED_BY_PROFILE':
      return [
        'This question type is not enabled in the current profile.',
        'Update the question type or configuration profile to include this type.',
      ];
    case 'UNKNOWN_TYPE':
      return [`Could not determine the question type. Set the type column to one of: ${supportedTypes.join(', ')}.`];
    case 'TYPE_MISMATCH_MSQ':
      return ['This question has multiple correct answers but is typed as single_choice. Change the type to multi_select.'];
    case 'SUSPECT_SINGLE_OPTION':
      return ['Only one option is provided. Add more options or change to text_entry type.'];
    case 'SUSPECT_TRUE_FALSE':
      return ['This looks like a True/False question. Consider setting the type to true_false.'];

    // ── Answer / Correct Answer ──
    case 'MISSING_ANSWER':
      return ['Enter the correct answer. Use an option label (A, B, C…) or the exact option text.'];
    case 'MISSING_CORRECT_ANSWERS':
    case 'MISSING_CORRECT_ANSWER':
      return ['At least one correct answer must be specified. Set the answer field to a valid option label or text.'];
    case 'ANSWER_NOT_IN_OPTIONS':
      return [
        'The answer value does not match any of the available options.',
        'Use the option label (e.g. A, B, C) or paste the exact option text as the answer.',
      ];
    case 'AMBIGUOUS_ANSWER_MAPPING':
    case 'AMBIGUOUS_ANSWER_MATCH':
      return [
        'The answer text matches more than one option.',
        'Use the option label (A, B, 1, 2…) instead of text to select the correct one deterministically.',
      ];
    case 'INVALID_ANSWER_FORMAT':
      return ['The answer format is not valid. Check that it follows the expected format for this question type.'];
    case 'INVALID_ANSWER_IDENTIFIER':
      return ['The answer identifier does not match any option identifier. Use a valid option label.'];
    case 'MIXED_ANSWER_IDENTIFIER_MODE':
      return ['Answers mix label-based (A, B) and text-based identifiers. Use one mode consistently.'];
    case 'MULTIPLE_CORRECT_ANSWERS':
      return ['Multiple correct answers found for a single-choice question. Keep only one correct answer or change type to multi_select.'];
    case 'DUPLICATE_ANSWER_TOKEN':
      return ['The same answer appears more than once. Remove the duplicate answer token.'];
    case 'DUPLICATE_CORRECT_ANSWERS':
      return ['Duplicate correct answers detected. Remove the repeated answer entries.'];

    // ── Multi-Select (MSQ) ──
    case 'MISSING_MULTI_SELECT_ANSWERS':
      return ['Multi-select questions require at least one correct answer. Separate multiple answers with commas or semicolons.'];
    case 'MSQ_ANSWER_TEXT_AMBIGUOUS':
      return ['One or more answer texts match multiple options. Use option labels (A, B, C) instead of text.'];
    case 'MSQ_CARDINALITY_MISMATCH':
      return ['The number of answers does not match expectations. Verify each answer maps to exactly one option.'];
    case 'MSQ_EXACT_SET_MISMATCH':
      return ['The answer set does not exactly match the expected correct options. Review and correct the answer list.'];
    case 'MCQ_SHOULD_BE_MSQ':
      return ['Multiple correct answers detected. Change the type to multi_select.'];

    // ── Options ──
    case 'INSUFFICIENT_OPTIONS':
    case 'MISSING_REQUIRED_OPTIONS':
      return ['At least 2 options are required. Add more options to the option columns (optionA, optionB, etc.).'];
    case 'TWO_CHOICE_NOT_ALLOWED':
      return ['Only two options are provided but two-choice mode is not allowed. Add a third option or more.'];
    case 'EMPTY_OPTION_TEXT':
      return ['One or more option fields are empty. Fill in all option text or remove unused option columns.'];
    case 'DUPLICATE_OPTION_TEXT':
      return ['Two or more options have the same text. Each option must be unique.'];
    case 'DUPLICATE_OPTION_IDENTIFIERS':
      return ['Option identifiers (labels) are duplicated. Ensure each option has a unique identifier.'];
    case 'INVALID_OPTION_IDENTIFIER':
      return ['An option identifier is not valid. Use standard labels like A, B, C or 1, 2, 3.'];

    // ── True/False ──
    case 'INVALID_TRUE_FALSE_ANSWER':
      return ['The answer must be "True" or "False" (case-insensitive).'];

    // ── Text Entry ──
    case 'MISSING_TEXT_ENTRY_ANSWER':
      return ['Text entry questions require an expected answer. Enter the correct response text.'];
    case 'TEXT_ENTRY_WITH_OPTIONS':
      return ['Text entry questions should not have options. Remove the options or change the question type.'];

    // ── Numeric ──
    case 'INVALID_NUMERIC_ANSWER':
      return ['The answer must be a valid number (e.g. 42, 3.14, -7).'];
    case 'MISSING_NUMERIC_TOLERANCE':
      return ['Consider adding a tolerance value for numeric comparison (e.g. ±0.01).'];

    // ── Order ──
    case 'INVALID_ORDER_ITEMS':
      return ['Order questions need at least 2 items to arrange. Add more items to the order column.'];
    case 'INVALID_ORDER_ANSWER':
      return ['The answer must specify the correct ordering of all items.'];
    case 'ORDER_ANSWER_AMBIGUOUS':
      return ['The order answer is ambiguous. Use item labels or exact text to specify the sequence clearly.'];
    case 'ORDER_ANSWER_MAPPING_FAILED':
      return ['Could not map the answer to the order items. Ensure the answer references each item exactly once.'];
    case 'ORDER_SEQUENCE_INCOMPLETE':
      return ['The answer sequence does not cover all items. Include every item exactly once in the correct order.'];

    // ── Duplicates ──
    case 'DUPLICATE_EXACT':
      return ['This question is an exact duplicate of another row. Remove one of the duplicates.'];
    case 'DUPLICATE_CONFLICT':
      return ['This question is nearly identical to another but with conflicting answers. Review both rows and resolve.'];
    case 'DUPLICATE_NEAR':
      return ['This question is very similar to another row. Review both to confirm they are intentionally different.'];
    case 'DUPLICATE_SUSPICIOUS':
      return ['This question has suspicious similarity to another row. Verify it is not an unintended duplicate.'];

    // ── Other ──
    case 'MISSING_REQUIRED_METADATA':
      return ['A required metadata field is missing. Check and fill in all required columns.'];
    case 'MISSING_SOLUTION':
      return ['Add a solution/explanation for this question.'];
    case 'NO_EXPORT_TARGET':
      return ['No export target configured. Select an export format before proceeding.'];
    case 'INVALID_FORMAT':
      return ['The data format is invalid. Check the field values match the expected format.'];
    case 'WHITESPACE_AUTOFIX':
      return ['Extra whitespace was detected and will be auto-trimmed.'];

    default:
      return [`Review the error above and correct the "${issue.field}" field.`];
  }
}

export function DataFixingWorkspace({
  suggestions,
  rows,
  columns,
  validationResults,
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
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [rowCategoryFilters, setRowCategoryFilters] = useState<Set<string>>(new Set());
  const [loadedFilterBatches, setLoadedFilterBatches] = useState(1);
  // Track local edits in the grid before blur commits them
  const [gridEdits, setGridEdits] = useState<Map<string, Record<string, string>>>(new Map());
  const filterMenuRef = useRef<HTMLDivElement | null>(null);

  // Lock body scroll when fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
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
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [isFilterMenuOpen]);

  // Escape key to exit fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (forceExpanded && onRequestMinimize) {
          onRequestMinimize();
          return;
        }
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
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
          if (String(saved[field] ?? '') !== val) remaining[field] = val;
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
      (s) => s.confidence === 'MEDIUM' && s.type !== 'ORDER_MISMATCH'
    );
    const infoSugs = suggestions.filter(
      (s) => s.confidence === 'HIGH' || s.type === 'ORDER_MISMATCH'
    );

    // Collect rowKeys that already have a suggestion
    const suggestionRowKeys = new Set(actionableSugs.map((s) => s.rowKey));

    // Build items from suggestions
    const items: ActionableItem[] = actionableSugs.map((s) => {
      const vr = validationResults.get(s.rowKey);
      const blockIssues = (vr?.issues ?? []).filter((i) => i.severity === 'block');
      return {
        rowKey: s.rowKey,
        rowIndex: s.rowIndex,
        source: 'suggestion' as const,
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
      const blockIssues = (vr.issues ?? []).filter((i) => i.severity === 'block');
      if (blockIssues.length === 0) return;
      items.push({
        rowKey,
        rowIndex: vr.rowNumber,
        source: 'validation_error',
        blockIssues,
        primaryMessage: blockIssues.map((i) => `${i.field}: ${i.message}`).join('; '),
        primaryField: blockIssues[0].field,
      });
    });

    // Re-include manually fixed rows that dropped out of validationResults
    // (their block issues resolved after editing), so "You fixed" count stays accurate
    manualFixedRows.forEach((_, rowKey) => {
      if (items.some((i) => i.rowKey === rowKey)) return; // already included
      const vr = validationResults.get(rowKey);
      // Extract row number from rowKey (format: "{id}#{rowNumber}")
      const hashIdx = rowKey.lastIndexOf('#');
      const parsedRowNum = hashIdx >= 0 ? parseInt(rowKey.slice(hashIdx + 1), 10) : NaN;
      items.push({
        rowKey,
        rowIndex: vr?.rowNumber ?? (isNaN(parsedRowNum) ? 0 : parsedRowNum),
        source: 'validation_error',
        blockIssues: (vr?.issues ?? []).filter((i) => i.severity === 'block'),
        primaryMessage: 'Fixed by user',
        primaryField: '',
      });
    });

    // Sort by rowIndex for stable ordering
    items.sort((a, b) => a.rowIndex - b.rowIndex);

    return { actionableItems: items, informationalSuggestions: infoSugs };
  }, [suggestions, validationResults, manualFixedRows]);

  // ── Derived counts ─────────────────────────────────────────────────────
  const totalActionable = actionableItems.length;
  const userFixedCount = actionableItems.filter((i) => manualFixedRows.has(i.rowKey)).length;
  const ignoredCount = actionableItems.filter((i) => ignoredRowKeys.has(i.rowKey)).length;
  const pendingCount = totalActionable - userFixedCount - ignoredCount;
  const progressPercent =
    totalActionable > 0 ? ((userFixedCount + ignoredCount) / totalActionable) * 100 : 100;
  const autoFixedCount = informationalSuggestions.filter((s) => s.confidence === 'HIGH').length;

  const pendingItems = actionableItems.filter(
    (i) => !manualFixedRows.has(i.rowKey) && !ignoredRowKeys.has(i.rowKey)
  );
  const resolvedItems = actionableItems.filter(
    (i) => manualFixedRows.has(i.rowKey) || ignoredRowKeys.has(i.rowKey)
  );

  const actionableByRowKey = useMemo(() => {
    const map = new Map<string, ActionableItem>();
    actionableItems.forEach((item) => map.set(item.rowKey, item));
    return map;
  }, [actionableItems]);

  const autoFixedRowKeys = useMemo(() => {
    const set = new Set<string>();
    informationalSuggestions
      .filter((s) => s.confidence === 'HIGH')
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
      const candidates = ['question', 'questionText', 'stem', 'prompt', 'Question', 'Question Content'];
      for (const key of candidates) {
        const value = row[key];
        if (value != null && String(value).trim()) return String(value).trim();
      }
      return 'Untitled question';
    };

    rows.forEach((row, idx) => {
      const rowKey = deriveRowKey(row, idx);
      const vr = validationResults.get(rowKey) ?? validationResults.get(rowKey.split('#')[0]);
      const actionable = actionableByRowKey.get(rowKey);
      const issues = vr?.issues || [];
      const hasDuplicateIssue = issues.some((i) => i.category === 'duplicate' || i.field === 'Duplicate');

      let label = 'Needs Review';
      let tone = 'bg-warning-light border-warning text-amber-800';

      if (manualFixedRows.has(rowKey)) {
        label = 'Manual Fixed';
        tone = 'bg-muted border-border text-foreground';
      } else if (autoFixedRowKeys.has(rowKey)) {
        label = 'Auto Fixed';
        tone = 'bg-muted border-border text-foreground';
      } else if (ignoredRowKeys.has(rowKey)) {
        label = 'Ignored';
        tone = 'bg-muted border-border/60 text-foreground';
      } else if (actionable?.source === 'validation_error') {
        label = 'Hard Block';
        tone = 'bg-rose-50 border-rose-200 text-rose-800';
      } else if (hasDuplicateIssue) {
        label = 'Duplicate';
        tone = 'bg-orange-50 border-orange-200 text-orange-800';
      } else if (vr?.status === 'valid') {
        label = 'Valid';
        tone = 'bg-success-light border-success text-emerald-800';
      } else if (vr?.status === 'caution') {
        label = 'Needs Review';
        tone = 'bg-warning-light border-warning text-amber-800';
      } else if (vr?.status === 'rejected') {
        label = 'Rejected';
        tone = 'bg-rose-50 border-rose-200 text-rose-800';
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
        label: 'Deleted (Dedup)',
        tone: 'bg-rose-100 border-rose-300 text-rose-900',
        questionText: item.questionText || 'Removed duplicate question',
      });
    });

    return feed.sort((a, b) => a.rowNumber - b.rowNumber);
  }, [rows, validationResults, manualFixedRows, autoFixedRowKeys, dedupDeletedRows, actionableByRowKey, ignoredRowKeys]);

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
    return filteredRowsStatusFeed.slice(0, loadedFilterBatches * ROW_LIST_BATCH_SIZE);
  }, [filteredRowsStatusFeed, isRowFilterApplied, loadedFilterBatches]);

  const canLoadMoreFilteredRows =
    isRowFilterApplied && visibleRowsStatusFeed.length < filteredRowsStatusFeed.length;

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
      const currentIdx = pendingItems.findIndex((i) => i.rowKey === currentRowKey);
      const search = [...pendingItems.slice(currentIdx + 1), ...pendingItems.slice(0, currentIdx)];
      const next = search.find(
        (i) => !ignoredRowKeys.has(i.rowKey) && !manualFixedRows.has(i.rowKey)
      );
      onRowClick(next?.rowKey ?? '');
    },
    [pendingItems, ignoredRowKeys, manualFixedRows, onRowClick]
  );

  const handleIgnore = (rowKey: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIgnoredRowKeys((prev) => new Set(prev).add(rowKey));
    navigateToNextUnresolved(rowKey);
  };

  const wrappedApplyManualFix = (
    rowKey: string,
    suggestion: RemediationSuggestion,
    value: string
  ) => {
    applyManualFix(rowKey, suggestion, value);
    navigateToNextUnresolved(rowKey);
  };

  // ── Editable grid: onBlur handler ──────────────────────────────────────
  const handleFieldBlur = (rowKey: string, field: string, newValue: string, originalValue: string) => {
    if (newValue.trim() === String(originalValue ?? '').trim()) return; // no change

    // Find the row index from the rows array
    const rowIdx = rows.findIndex((r, idx) => deriveRowKey(r, idx) === rowKey);
    const syntheticSuggestion = {
      rowKey,
      rowIndex: rowIdx >= 0 ? rowIdx + 1 : 0,
      field,
      type: 'MANUAL_EDIT',
      message: `Manual edit: ${field}`,
      suggestedValue: newValue.trim(),
      confidence: 'MEDIUM',
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
  const handleSaveRow = useCallback((rowKey: string) => {
    const edits = gridEditsRef.current.get(rowKey);
    if (!edits || Object.keys(edits).length === 0) return;

    const baseRow = manualFixedRows.get(rowKey)
      ?? rows.find((r, idx) => deriveRowKey(r, idx) === rowKey);

    // Filter to only changed fields
    const changedEdits: Record<string, string> = {};
    for (const [field, value] of Object.entries(edits)) {
      const originalValue = baseRow ? String(baseRow[field] ?? '') : '';
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
      const rowIdx = rows.findIndex((r, idx) => deriveRowKey(r, idx) === rowKey);
      const syntheticSuggestion = {
        rowKey,
        rowIndex: rowIdx >= 0 ? rowIdx + 1 : 0,
        field,
        type: 'MANUAL_EDIT',
        message: `Manual edit: ${field}`,
        suggestedValue: value,
        confidence: 'MEDIUM',
      } as unknown as RemediationSuggestion;
      applyManualFix(rowKey, syntheticSuggestion, value);
    }
  }, [rows, manualFixedRows, applyManualFix, applyBulkManualEdits]);

  // ── Selected row data ──────────────────────────────────────────────────
  const selectedItem = actionableItems.find((i) => i.rowKey === selectedRowKey);
  const selectedRowStatusEntry = useMemo(() => {
    if (!selectedRowKey) return null;
    const exact = allRowsStatusFeed.find((row) => row.key === selectedRowKey);
    if (exact) return exact;
    const baseKey = selectedRowKey.split('#')[0];
    return allRowsStatusFeed.find((row) => {
      const rowBaseKey = row.key.split('#')[0];
      return row.key === baseKey || rowBaseKey === baseKey;
    }) ?? null;
  }, [selectedRowKey, allRowsStatusFeed]);

  const selectedRowData = useMemo(() => {
    if (!selectedRowKey) return null;
    // Try manualFixedRows first (has latest edits)
    if (manualFixedRows.has(selectedRowKey)) return manualFixedRows.get(selectedRowKey);

    const direct = rows.find((r, idx) => deriveRowKey(r, idx) === selectedRowKey);
    if (direct) return direct;

    // Fallback: rowKey may be stored without suffix or with a different row-index suffix.
    const baseKey = selectedRowKey.split('#')[0];
    return rows.find((r, idx) => {
      const computed = deriveRowKey(r, idx);
      return computed === baseKey || computed === selectedRowKey || computed.split('#')[0] === baseKey;
    }) ?? null;
  }, [selectedRowKey, rows, manualFixedRows]);

  const validationResult = selectedRowKey
    ? validationResults.get(selectedRowKey) ?? validationResults.get(selectedRowKey.split('#')[0])
    : null;

  const selectedLabel = selectedRowStatusEntry?.label ?? null;
  const isSelectedValidRow = selectedLabel === 'Valid';
  const isSelectedDeletedRow = selectedRowKey?.startsWith('deleted-') || selectedLabel === 'Deleted (Dedup)';
  const canEditSelectedRow = Boolean(selectedRowKey && selectedRowData && !isSelectedValidRow && !isSelectedDeletedRow);
  const activeRowKey = selectedRowKey ?? '';
  const currentRowEditCount = gridEdits.get(activeRowKey) ? Object.keys(gridEdits.get(activeRowKey)!).length : 0;
  const problematicFieldCount = selectedItem
    ? new Set([
      selectedItem.primaryField,
      ...selectedItem.blockIssues.map((issue) => issue.field),
    ].filter(Boolean)).size
    : 0;

  // ── Render ─────────────────────────────────────────────────────────────

  // Compact view when there are no pending issues left
  if (pendingCount === 0 && !forceExpanded) {
    return (
      <Card className="border border-border bg-card rounded-xl overflow-hidden shadow-sm transition-all duration-300">
        <CardHeader className="bg-card border-b border-border py-4 px-5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2 text-[#0f172a]">
              <span className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                <LayoutPanelLeft className="w-4 h-4 text-[#0052CC]" />
              </span>
              Fixing Workspace
            </CardTitle>
            <Badge className="hover:bg-inherit bg-muted text-foreground border border-border">
              Ready to export
            </Badge>
          </div>
        </CardHeader>
        <div className="flex items-center justify-center py-6 bg-card">
          <div className="text-center">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-[#1f2937]" />
            <p className="text-sm font-semibold text-[#1f2937]">
              {totalActionable > 0 ? 'All issues resolved' : 'No issues found'}
            </p>
            {totalActionable > 0 && (
              <p className="text-xs text-[#475569] mt-1">
                {userFixedCount} fixed &middot; {ignoredCount} ignored &middot; {autoFixedCount} auto-fixed
              </p>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={`border border-border bg-card rounded-xl overflow-hidden flex flex-col shadow-sm transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-0 z-50 h-screen w-screen rounded-none border-none'
          : 'h-[650px]'
      }`}
    >
      <CardHeader className="bg-card border-b border-border py-4 px-5 shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2 text-[#0f172a]">
            <span className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
              <LayoutPanelLeft className="w-4 h-4 text-[#0052CC]" />
            </span>
            Fixing Workspace
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              className="hover:bg-inherit bg-muted text-foreground border border-border"
            >
              {pendingCount} issues blocking export
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-[#475569] hover:text-[#0f172a] hover:bg-[#e2e8f0]"
              onClick={handleToggleWorkspaceView}
              title={isFullscreen && forceExpanded && onRequestMinimize
                ? 'Back to Fixing Workspace summary card'
                : isFullscreen
                ? 'Exit focus mode (Esc)'
                : 'Enter focus mode'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* ─── LEFT PANEL: Unified Issues List ─── */}
        <div className="w-1/3 border-r border-border flex flex-col min-h-0 bg-card">
          {/* Progress header */}
          <div className="p-4 bg-card border-b border-border shrink-0 space-y-3">
            <div className="text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1">
              Fix Progress
            </div>
            <div className="w-full bg-muted rounded-full h-2 mb-2">
              <div
                className="bg-[#1f2937] h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-1 text-center">
              <div className="bg-muted border border-border rounded-lg p-2">
                <div className="text-sm font-bold text-[#1f2937]">{autoFixedCount}</div>
                <div className="text-[10px] text-[#475569] leading-tight">Auto-fixed</div>
              </div>
              <div className="bg-muted border border-border rounded-lg p-2">
                <div className="text-sm font-bold text-[#111827]">{userFixedCount}</div>
                <div className="text-[10px] text-[#475569] leading-tight">You fixed</div>
              </div>
              <div className="bg-muted border border-border rounded-lg p-2">
                <div className="text-sm font-bold text-[#ba1a1a]">{pendingCount}</div>
                <div className="text-[10px] text-[#475569] leading-tight">Remaining</div>
              </div>
            </div>
            <div className="relative" ref={filterMenuRef}>
              <div className="mt-2 flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 text-xs font-semibold border-[#b4c5ff] text-[#111827] bg-[#eef4ff] hover:bg-[#f1f5f9]"
                  onClick={() => setIsFilterMenuOpen((prev) => !prev)}
                >
                  Filter Questions
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 border-[#b4c5ff] text-[#111827] bg-[#eef4ff] hover:bg-[#f1f5f9] disabled:opacity-40 disabled:cursor-not-allowed"
                  title={canLoadMoreFilteredRows ? `Load next ${ROW_LIST_BATCH_SIZE} rows` : 'Apply a filter to load additional rows'}
                  disabled={!canLoadMoreFilteredRows}
                  onClick={() => setLoadedFilterBatches((prev) => prev + 1)}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
              {isFilterMenuOpen && (
                <div className="absolute left-0 right-0 mt-2 z-30 rounded-lg border border-border bg-card shadow-lg p-3 space-y-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Filter by Category</p>
                  <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                    {availableRowCategories.map((category) => {
                      const checked = rowCategoryFilters.has(category);
                      return (
                        <label key={`row-filter-${category}`} className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleRowCategoryFilter(category)}
                            className="w-3.5 h-3.5 rounded border-border/60 text-[#111827] focus:ring-[#111827]"
                          />
                          <span>{category}</span>
                        </label>
                      );
                    })}
                  </div>
                  <div className="pt-1 border-t border-border flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setRowCategoryFilters(new Set())}
                      className="text-[11px] font-semibold text-[#111827] hover:text-[#1f2937]"
                    >
                      Clear all
                    </button>
                    <span className="text-[11px] text-muted-foreground">
                      {rowCategoryFilters.size === 0 ? 'Showing all' : `${rowCategoryFilters.size} selected`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Scrollable issue list */}
          <div className="overflow-y-auto flex-1 p-2 space-y-2">
            <div className="space-y-2">
              <div className="text-xs font-medium text-[#111827] mb-1 px-1 pt-1">
                All Question Rows ({visibleRowsStatusFeed.length}/{filteredRowsStatusFeed.length})
              </div>
              {visibleRowsStatusFeed.map((row) => (
                <div
                  key={row.key}
                  onClick={() => onRowClick(row.key)}
                  className={`p-2 rounded-lg border text-sm cursor-pointer transition-all ${row.tone} ${selectedRowKey === row.key ? 'ring-2 ring-[#111827]/25 border-[#111827]' : 'hover:shadow-sm'}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-semibold">Row {row.rowNumber}</span>
                    <Badge className="text-[10px] px-1.5 py-0 border-none bg-card/70 text-inherit">{row.label}</Badge>
                  </div>
                  <p className="text-xs line-clamp-1 opacity-90">{row.questionText}</p>
                </div>
              ))}
              {!isRowFilterApplied && filteredRowsStatusFeed.length > ROW_LIST_BATCH_SIZE && (
                <p className="px-1 text-[11px] text-[#64748b]">
                  Showing first {ROW_LIST_BATCH_SIZE} rows. Apply a filter to load more in batches.
                </p>
              )}
              {canLoadMoreFilteredRows && (
                <p className="px-1 text-[11px] text-[#111827]">
                  More rows available. Use the side arrow to load next {ROW_LIST_BATCH_SIZE}.
                </p>
              )}
            </div>

            <div className="border-t border-[#e2e8f0] mt-3 pt-3" />

            {/* Hard Blocks (raw validation errors without suggestions) */}
            {pendingItems.filter((i) => i.source === 'validation_error').length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-[#ba1a1a] mb-1 px-1 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Hard Blocks ({pendingItems.filter((i) => i.source === 'validation_error').length})
                </div>
                {pendingItems
                  .filter((i) => i.source === 'validation_error')
                  .map((item) => (
                    <IssueCard
                      key={item.rowKey}
                      item={item}
                      selected={selectedRowKey === item.rowKey}
                      badgeLabel="BLOCKED"
                      badgeClass="bg-[#ffdad6] text-[#ba1a1a]"
                      cardClass="border-rose-200 bg-rose-50/60 hover:border-rose-300"
                      selectedClass="border-rose-500 bg-rose-50 ring-2 ring-rose-500/20 shadow-sm"
                      onSelect={() => onRowClick(item.rowKey)}
                      onIgnore={(e) => handleIgnore(item.rowKey, e)}
                    />
                  ))}
              </div>
            )}

            {/* Suggestion-based pending items */}
            {pendingItems.filter((i) => i.source === 'suggestion').length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-[#8f4600] mb-1 px-1">
                  Needs User Action (
                  {pendingItems.filter((i) => i.source === 'suggestion').length})
                </div>
                {pendingItems
                  .filter((i) => i.source === 'suggestion')
                  .map((item) => (
                    <IssueCard
                      key={item.rowKey}
                      item={item}
                      selected={selectedRowKey === item.rowKey}
                      badgeLabel="PENDING"
                      badgeClass="bg-[#ffdcc6] text-[#8f4600]"
                      cardClass="border-warning bg-warning-light/50 hover:border-amber-300"
                      selectedClass="border-amber-500 bg-warning-light ring-2 ring-amber-500/20 shadow-sm"
                      onSelect={() => onRowClick(item.rowKey)}
                      onIgnore={(e) => handleIgnore(item.rowKey, e)}
                    />
                  ))}
              </div>
            )}

            {/* Resolved */}
            {resolvedItems.length > 0 && (
              <div className="space-y-2 mt-4">
                <div className="text-xs font-medium text-[#475569] mb-1 px-1 pt-2 border-t border-[#e2e8f0]">
                  Recently Resolved
                </div>
                {resolvedItems.map((item) => {
                  const isFixed = manualFixedRows.has(item.rowKey);
                  return (
                    <div
                      key={item.rowKey}
                      onClick={() => onRowClick(item.rowKey)}
                      className={`p-2 rounded-lg border text-sm cursor-pointer transition-all ${
                        selectedRowKey === item.rowKey
                          ? 'border-[#111827] bg-[#f1f5f9]'
                          : isFixed
                          ? 'border-[#e2e8f0] bg-[#f1f5f9]'
                          : 'border-[#e2e8f0] bg-[#f8fafc]'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-[#0f172a]">Row {item.rowIndex}</span>
                        {isFixed ? (
                          <Badge className="bg-[#f1f5f9] text-[#1f2937] text-[10px] px-1.5 py-0 border-none">
                            FIXED
                          </Badge>
                        ) : (
                          <Badge className="bg-[#f0f3ff] text-[#475569] text-[10px] px-1.5 py-0 border-none">
                            IGNORED
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-[#475569] line-clamp-1">{item.primaryMessage}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Informational / Auto-fixed */}
            {informationalSuggestions.length > 0 && (
              <div className="space-y-2 mt-4">
                <div className="text-xs font-medium text-[#1f2937] mb-1 px-1 pt-2 border-t border-[#e2e8f0]">
                  Informational / Auto-fixed
                </div>
                {informationalSuggestions.map((s) => {
                  const isAutoHigh = s.confidence === 'HIGH';
                  return (
                    <div
                      key={s.rowKey}
                      onClick={() => onRowClick(s.rowKey)}
                      className={`p-2 rounded-lg border text-sm cursor-pointer transition-all ${
                        selectedRowKey === s.rowKey
                          ? 'border-[#111827] bg-[#f1f5f9]'
                          : 'border-[#e2e8f0] bg-[#f8fafc]'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-[#0f172a]">Row {s.rowIndex}</span>
                        {isAutoHigh ? (
                          <Badge className="bg-[#f1f5f9] text-[#1f2937] text-[10px] px-1.5 py-0 border-none">
                            AUTO FIXED
                          </Badge>
                        ) : (
                          <Badge className="bg-[#f0f3ff] text-[#475569] text-[10px] px-1.5 py-0 border-none">
                            INFO
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-[#475569] line-clamp-1">{s.message}</p>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>

        {/* ─── RIGHT PANEL: Detail + Editable Grid ─── */}
        <div className="w-2/3 bg-[#f8fafc] flex flex-col min-h-0">
          {canEditSelectedRow ? (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Header with issue details — collapsible */}
              <div className="bg-card border-b border-[#e2e8f0] shrink-0 shadow-sm">
                <div
                  className="flex items-center justify-between px-4 py-2 cursor-pointer select-none hover:bg-[#f8fafc] transition-colors"
                  onClick={() => setIsDetailCollapsed((prev) => !prev)}
                >
                  <div className="flex items-center gap-2">
                    <Wrench className={`w-4 h-4 shrink-0 ${isDetailCollapsed ? 'text-[#475569]' : 'text-[#111827]'}`} />
                    <h3 className="font-semibold text-sm text-[#0f172a]">
                      Row {selectedItem?.rowIndex ?? selectedRowStatusEntry?.rowNumber ?? '-'}
                      {selectedItem?.source === 'validation_error' && (
                        <Badge className="ml-2 bg-[#ffdad6] text-[#ba1a1a] text-[10px] px-1.5 py-0 border-none align-middle">
                          HARD BLOCK
                        </Badge>
                      )}
                      {!selectedItem && selectedLabel && (
                        <Badge className="ml-2 bg-[#f0f3ff] text-[#111827] text-[10px] px-1.5 py-0 border-none align-middle">
                          {selectedLabel.toUpperCase()}
                        </Badge>
                      )}
                    </h3>
                  </div>
                  <span
                    className={`text-xs font-semibold ${isDetailCollapsed ? 'text-[#475569]' : 'text-[#111827]'}`}
                  >
                    {isDetailCollapsed ? 'Show suggested fix' : 'Hide suggested fix'}
                  </span>
                </div>

                {!isDetailCollapsed && (
                  <div className="px-4 pb-3">
                    <div className="p-3 bg-[#f8fafc] rounded border border-[#e2e8f0]">
                      <h4 className="text-xs font-semibold text-[#0f172a] mb-2 flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5 text-[#111827]" />
                        Suggested Fix
                      </h4>
                      {selectedItem?.source === 'suggestion' && selectedItem.suggestion ? (
                        <ul className="text-xs text-[#0f172a] list-disc list-inside space-y-1">
                          <li>Review the suggestion and update the row fields in the editable section below.</li>
                          {selectedItem.suggestion.suggestedValue !== '' && !manualFixedRows.has(selectedItem.rowKey) && (
                            <li>
                              Recommended value: <span className="font-semibold font-data">&quot;{selectedItem.suggestion.suggestedValue}&quot;</span>
                            </li>
                          )}
                        </ul>
                      ) : (selectedItem?.blockIssues.length ?? 0) > 0 ? (
                        <ul className="text-xs text-[#0f172a] list-disc list-inside space-y-1">
                          {selectedItem?.blockIssues.flatMap((issue, idx) =>
                            getIssueSuggestions(issue).map((hint, hintIndex) => (
                              <li key={`${issue.code}-${idx}-${hintIndex}`}>{hint}</li>
                            ))
                          )}
                        </ul>
                      ) : (
                        <p className="text-xs text-[#475569]">
                          This row is marked as <strong>{selectedLabel ?? 'Needs Review'}</strong>. Update relevant fields below and save.
                        </p>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="mt-3 pt-3 border-t border-[#e2e8f0] flex items-center gap-2 flex-wrap">
                      {selectedItem && manualFixedRows.has(selectedItem.rowKey) ? (
                        <div className="flex items-center gap-3">
                          <Badge className="bg-[#f1f5f9] text-[#1f2937] px-2 py-1 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Fix Applied
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs border-[#ba1a1a] text-[#ba1a1a] hover:bg-[#ffdad6]"
                            onClick={() => undoManualFix(selectedItem.rowKey)}
                          >
                            Undo Fix
                          </Button>
                        </div>
                      ) : selectedItem?.source === 'suggestion' && selectedItem.suggestion ? (
                        <SuggestionActions
                          item={selectedItem}
                          suggestion={selectedItem.suggestion}
                          manualFixInputs={manualFixInputs}
                          setManualFixInputs={setManualFixInputs}
                          wrappedApplyManualFix={wrappedApplyManualFix}
                          getRowOptionsForSuggestion={getRowOptionsForSuggestion}
                        />
                      ) : selectedItem?.source === 'validation_error' ? (
                        <p className="text-xs text-[#475569] italic flex items-center gap-1.5">
                          <Edit3 className="w-3.5 h-3.5" />
                          Edit the fields below to fix this row. Changes apply on blur.
                        </p>
                      ) : (
                        <p className="text-xs text-[#475569] italic flex items-center gap-1.5">
                          <Edit3 className="w-3.5 h-3.5" />
                          Edit fields below for this row and save your changes.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Editable Row Data Grid */}
              <div className="flex-1 overflow-y-auto p-4 bg-[#f4f7ff]">
                <div className="rounded-2xl border border-[#e2e8f0] bg-card shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#e2e8f0] bg-[#f5f8ff]">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <h4 className="text-xs font-semibold text-[#2a3550] uppercase tracking-wider flex items-center gap-1.5">
                        <Edit3 className="w-3.5 h-3.5" />
                        Editable Row Data
                      </h4>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className="bg-[#f0f3ff] text-[#111827] border border-[#e2e8f0] text-[10px] px-2 py-0.5">
                          {columns.length} fields
                        </Badge>
                        {problematicFieldCount > 0 && (
                          <Badge className="bg-[#fff4ea] text-[#8f4600] border border-[#ffdcc6] text-[10px] px-2 py-0.5">
                            {problematicFieldCount} needs attention
                          </Badge>
                        )}
                        {currentRowEditCount > 0 && (
                          <Badge className="bg-[#f1f5f9] text-[#1f2937] border border-[#c5d8ff] text-[10px] px-2 py-0.5">
                            {currentRowEditCount} unsaved change{currentRowEditCount > 1 ? 's' : ''}
                          </Badge>
                        )}
                        {currentRowEditCount > 0 && (
                          <Button
                            size="sm"
                            className="h-8 text-xs px-3 bg-[#111827] hover:bg-[#1f2937] text-primary-foreground shadow-sm"
                            onMouseDown={(e) => {
                              e.preventDefault(); // prevent blur from firing first
                              handleSaveRow(activeRowKey);
                            }}
                          >
                            <Save className="w-3.5 h-3.5 mr-1.5" />
                            Save Changes
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 md:p-4 grid grid-cols-1 xl:grid-cols-2 gap-3 items-start auto-rows-min">
                    {columns.map((col) => {
                      const isProblematic =
                        selectedItem?.primaryField === col ||
                        (selectedItem?.blockIssues.some((i) => i.field === col) ?? false);
                      const originalValue =
                        selectedRowData?.[col] !== null && selectedRowData?.[col] !== undefined
                          ? String(selectedRowData?.[col])
                          : '';
                      const localValue =
                        gridEdits.get(activeRowKey)?.[col] ?? undefined;
                      const displayValue = localValue !== undefined ? localValue : originalValue;

                      return (
                        <div
                          key={col}
                          className={`rounded-xl border p-3 transition-colors h-fit ${
                            isProblematic
                              ? 'bg-[#fff7f0] border-[#ffd0ad] focus-within:border-[#ffb786]'
                              : 'bg-[#fbfcff] border-[#dfe5f6] focus-within:border-[#9db6ff]'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[11px] font-semibold uppercase tracking-wide text-[#4a5570]">
                              {col}
                            </label>
                            {isProblematic && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md border border-[#ffb786] bg-[#ffdcc6] text-[#8f4600]">
                                <AlertTriangle className="w-3 h-3" />
                                Check
                              </span>
                            )}
                          </div>
                          <textarea
                            value={displayValue}
                            onChange={(e) =>
                              handleGridInput(activeRowKey, col, e.target.value)
                            }
                            onBlur={() =>
                              handleFieldBlur(
                                activeRowKey,
                                col,
                                displayValue,
                                originalValue
                              )
                            }
                            rows={2}
                            className={`w-full min-h-[2.5rem] max-h-[24rem] text-sm rounded-md px-2.5 py-1.5 bg-card text-[#0f172a] font-data focus:outline-none focus:ring-1 border transition-colors resize-y overflow-auto ${
                              isProblematic
                                ? 'border-[#ffb786] focus:border-[#8f4600] focus:ring-[#8f4600]'
                                : 'border-[#c5cfe8] focus:border-[#111827] focus:ring-[#111827]'
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Validation errors summary */}
                {validationResult && validationResult.issues.length > 0 && (
                  <div className="mt-4 p-3 rounded-lg bg-[#ffdad6] border border-[#ffdad6]">
                    <h4 className="text-xs font-semibold text-[#93000a] uppercase tracking-wider mb-2">
                      All Validation Errors
                    </h4>
                    <ul className="space-y-1">
                      {validationResult.issues.map((issue, i) => (
                        <li key={i} className="text-xs text-[#ba1a1a] flex gap-2">
                          <X className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                          <span>
                            <strong>{issue.field}:</strong> {issue.message}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-[#64748b] p-8 text-center">
              <LayoutPanelLeft className="w-12 h-12 mb-3 text-[#e2e8f0]" />
              <p className="text-base font-medium text-[#475569]">
                {isSelectedValidRow ? 'This row is already valid' : isSelectedDeletedRow ? 'This row was deleted during deduplication' : 'Select an issue to fix'}
              </p>
              <p className="text-sm mt-1">
                {isSelectedValidRow
                  ? 'Valid rows do not need edits, so editable row data is hidden.'
                  : isSelectedDeletedRow
                  ? 'Deleted duplicate rows are shown for traceability and cannot be edited.'
                  : 'Click on any non-valid row in the list to view details and apply fixes.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function IssueCard({
  item,
  selected,
  badgeLabel,
  badgeClass,
  cardClass,
  selectedClass,
  onSelect,
  onIgnore,
}: {
  item: ActionableItem;
  selected: boolean;
  badgeLabel: string;
  badgeClass: string;
  cardClass?: string;
  selectedClass?: string;
  onSelect: () => void;
  onIgnore: (e: React.MouseEvent) => void;
}) {
  const isBlocked = badgeLabel === 'BLOCKED';

  return (
    <div
      onClick={onSelect}
      className={`p-3 rounded-lg border text-sm cursor-pointer transition-all ${
        selected
          ? selectedClass ?? 'border-[#111827] bg-[#f1f5f9] shadow-sm'
          : cardClass ?? 'border-[#e2e8f0] bg-card hover:border-[#64748b]'
      }`}
    >
      <div className="flex justify-between items-start mb-1">
        <span className="font-semibold text-[#0f172a]">Row {item.rowIndex}</span>
        <Badge className={`${badgeClass} text-[10px] px-1.5 py-0 border-none`}>
          {badgeLabel}
        </Badge>
      </div>
      <p className="text-xs text-[#475569] line-clamp-2">{item.primaryMessage}</p>
      <div className="mt-2 flex gap-2">
        <Button
          size="sm"
          variant="default"
          className={`h-6 text-[10px] px-2 py-0 text-primary-foreground ${
            isBlocked
              ? 'bg-[#ba1a1a] hover:bg-[#93000a]'
              : 'bg-[#111827] hover:bg-[#1f2937]'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          Fix Now
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className={`h-6 text-[10px] px-2 py-0 ${
            isBlocked
              ? 'text-[#93000a] hover:text-[#93000a] hover:bg-[#ffdad6]'
              : 'text-[#475569] hover:text-[#475569] hover:bg-[#f0f3ff]'
          }`}
          onClick={onIgnore}
        >
          Ignore
        </Button>
      </div>
    </div>
  );
}

function SuggestionActions({
  item,
  suggestion,
  manualFixInputs,
  setManualFixInputs,
  wrappedApplyManualFix,
  getRowOptionsForSuggestion,
}: {
  item: ActionableItem;
  suggestion: RemediationSuggestion;
  manualFixInputs: Map<string, string>;
  setManualFixInputs: React.Dispatch<React.SetStateAction<Map<string, string>>>;
  wrappedApplyManualFix: (rowKey: string, suggestion: RemediationSuggestion, value: string) => void;
  getRowOptionsForSuggestion: (rowIndex: number) => { label: string; text: string }[];
}) {
  if (suggestion.suggestedValue !== '') {
    return (
      <Button
        size="sm"
        className="h-8 text-xs bg-[#8f4600] hover:bg-[#8f4600] text-primary-foreground shadow-sm"
        onClick={() =>
          wrappedApplyManualFix(suggestion.rowKey, suggestion, suggestion.suggestedValue)
        }
      >
        Apply &quot;{suggestion.suggestedValue}&quot;
      </Button>
    );
  }

  if (
    suggestion.type === 'MISSING_ANSWER_MULTIPLE_OPTIONS' &&
    getRowOptionsForSuggestion(suggestion.rowIndex).length > 0
  ) {
    const options = getRowOptionsForSuggestion(suggestion.rowIndex);
    return (
      <div className="flex flex-col gap-2 w-full mt-2">
        <p className="text-xs font-semibold text-[#0f172a]">Select the correct option:</p>
        <div className="grid grid-cols-2 gap-2">
          {options.map((o) => (
            <div
              key={o.label}
              onClick={() =>
                setManualFixInputs((prev) => new Map(prev).set(suggestion.rowKey, o.label))
              }
              className={`cursor-pointer border rounded-md p-2 text-xs flex items-center transition-all ${
                manualFixInputs.get(suggestion.rowKey) === o.label
                  ? 'border-[#111827] bg-[#f1f5f9] text-[#111827] ring-1 ring-[#111827]'
                  : 'border-[#e2e8f0] bg-card text-[#475569] hover:bg-[#f8fafc]'
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full border mr-2 flex items-center justify-center shrink-0 ${
                  manualFixInputs.get(suggestion.rowKey) === o.label
                    ? 'border-[#111827]'
                    : 'border-[#e2e8f0]'
                }`}
              >
                {manualFixInputs.get(suggestion.rowKey) === o.label && (
                  <div className="w-1.5 h-1.5 rounded-full bg-[#111827]" />
                )}
              </div>
              <span className="font-semibold mr-1">{o.label}:</span>
              <span className="truncate">{o.text}</span>
            </div>
          ))}
        </div>
        <Button
          size="sm"
          disabled={!manualFixInputs.get(suggestion.rowKey)}
          className="h-8 text-xs bg-[#8f4600] hover:bg-[#8f4600] text-primary-foreground disabled:opacity-50 self-start mt-2 shadow-sm"
          onClick={() => {
            const val = manualFixInputs.get(suggestion.rowKey);
            if (val) wrappedApplyManualFix(suggestion.rowKey, suggestion, val);
          }}
        >
          Apply Selection
        </Button>
      </div>
    );
  }

  // No special action — user can fix via the editable row data grid below
  return (
    <p className="text-xs text-[#475569] italic flex items-center gap-1.5">
      <Edit3 className="w-3.5 h-3.5" />
      Edit the fields below to fix this row, then click Save Changes.
    </p>
  );
}

