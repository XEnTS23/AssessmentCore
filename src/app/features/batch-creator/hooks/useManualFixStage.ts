import { useState, useMemo, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { QuestionRow, RawSheetRow } from '../core/rowTypes';
import { ValidationIssue } from '../core/issueTypes';
import { FixSuggestion, SuggestionResult } from '../core/fixTypes';
import { ValidationEngine, ValidationContext } from '../validation/validationEngine';
import { getDefaultRuleRegistry } from '../validation/ruleRegistry';
import { ColumnMapping } from '../normalization/normalizeAnswer';
import { pass3GenerateSuggestions } from '../cleaning/pass3SuggestionEngine';
import { runCleaningPipeline } from '../cleaning/cleaningEngine';
import { CleaningResult } from '../core/cleaningTypes';
import { normalizeRow } from '../normalization/normalizeRow';
import {
  applyManualEdit,
  applySuggestion,
  questionToEditorState,
  buildQuestionFromEditor,
  EditorFormState,
} from '../fixing/manualFixEngine';

export type FixFilterStatus = 'all' | 'rejected' | 'needs_review' | 'caution' | 'valid';

export function useManualFixStage(rawRows: RawSheetRow[] = [], exportConfig?: any) {
  // ── Core state ─────────────────────────────────────────────────────
  const [rows, setRows] = useState<QuestionRow[]>([]);
  const [cleaningResult, setCleaningResult] = useState<CleaningResult | null>(null);
  const [suggestionResult, setSuggestionResult] = useState<SuggestionResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoFixedRowIds, setAutoFixedRowIds] = useState<Set<string>>(new Set());

  // ── UI state ───────────────────────────────────────────────────────
  const [filterStatus, setFilterStatus] = useState<FixFilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [editorState, setEditorState] = useState<EditorFormState | null>(null);
  const [undoStack, setUndoStack] = useState<Map<string, QuestionRow>>(new Map());

  // ── Engine (memoized) ──────────────────────────────────────────────
  const engine = useMemo(() => new ValidationEngine(getDefaultRuleRegistry()), []);

  // Compute dummy mapping dynamically based on headers
  const dummyMapping: ColumnMapping = useMemo(() => {
    if (rawRows.length === 0) return {};
    const availableColumns = Object.keys(rawRows[0] || {});
    const findMatch = (keywords: string[], excludeKeywords: string[] = []) => {
      const col = availableColumns.find(c => {
        const lower = c.toLowerCase();
        return keywords.some(k => lower.includes(k)) && !excludeKeywords.some(k => lower.includes(k));
      });
      return col || '';
    };

    const mapping: ColumnMapping = {
      stem: findMatch(['stem', 'question'], ['type', 'format', 'id', 'mark']),
      correctAnswer: findMatch(['answer', 'correct']),
      type: findMatch(['type', 'format']),
      explanation: findMatch(['explanation', 'solution']),
      subject: findMatch(['subject', 'category']),
      topic: findMatch(['topic', 'tag', 'subtopic']),
      mediaUrl: findMatch(['media', 'image', 'url']),
      options: []
    };

    const optionCols = availableColumns.filter(c => c.toLowerCase().includes('option') || c.toLowerCase().match(/^[a-d]$/));
    if (optionCols.length > 0) {
      mapping.options = optionCols;
    }
    return mapping;
  }, [rawRows]);

  const context: ValidationContext = useMemo(() => ({
    allRows: rows,
    columnMapping: dummyMapping,
  }), [rows, dummyMapping]);

  // ── Initialize: run cleaning pipeline + generate suggestions ──────
  useEffect(() => {
    if (rawRows.length === 0) {
      setRows([]);
      return;
    }

    setIsProcessing(true);

    // 1. Pre-validate to get original statuses
    const rawNormalized = rawRows.map(r => normalizeRow(r, dummyMapping));
    const preValidated = engine.validateBatch(rawNormalized, {
      allRows: rawNormalized,
      columnMapping: dummyMapping,
    });
    const originalStatusMap = new Map<string, string>();
    preValidated.forEach(r => originalStatusMap.set(r.id, r.status));

    // 2. Run Pass 1 + Pass 2 cleaning on the NORMALIZED rows
    const cleaned = runCleaningPipeline(preValidated);
    setCleaningResult(cleaned);

    // 3. Re-validate cleaned rows
    const revalidated = engine.validateBatch(cleaned.rows, {
      allRows: cleaned.rows,
      columnMapping: dummyMapping,
    });

    // 4. Compare status for auto-fix detection
    const newAutoFixed = new Set<string>();
    revalidated.forEach(r => {
      const oldStatus = originalStatusMap.get(r.id);
      if (oldStatus && oldStatus !== 'valid' && r.status === 'valid') {
        newAutoFixed.add(r.id);
      }
    });
    setAutoFixedRowIds(newAutoFixed);

    // Generate Pass 3 suggestions
    let suggestions = pass3GenerateSuggestions(revalidated, exportConfig);
    
    let finalRevalidated = [...revalidated];
    let autoApplyCount = 0;

    if (suggestions.autoApplicable.length > 0) {
      suggestions.autoApplicable.forEach(suggestion => {
        const rowIndex = finalRevalidated.findIndex(r => r.id === suggestion.patch.rowId);
        if (rowIndex !== -1) {
          const contextForPatch: ValidationContext = {
            allRows: finalRevalidated,
            columnMapping: dummyMapping,
          };
          const result = applySuggestion(finalRevalidated[rowIndex], suggestion, engine, contextForPatch);
          finalRevalidated[rowIndex] = result.row;
          autoApplyCount++;
          newAutoFixed.add(finalRevalidated[rowIndex].id);
        }
      });
      // Regenerate suggestions for the updated rows
      suggestions = pass3GenerateSuggestions(finalRevalidated, exportConfig);
    }

    if (autoApplyCount > 0) {
      toast.success('Autofix applied', { description: `${autoApplyCount} issues were automatically repaired.` });
    }

    setAutoFixedRowIds(newAutoFixed);
    setSuggestionResult(suggestions);
    setRows(finalRevalidated);
    setIsProcessing(false);
  }, [rawRows, engine, dummyMapping, exportConfig]);

  // ── Derived state ──────────────────────────────────────────────────

  const summary = useMemo(() => ({
    total: rows.length,
    valid: rows.filter(r => r.status === 'valid').length,
    caution: rows.filter(r => r.status === 'caution').length,
    needs_review: rows.filter(r => r.status === 'needs_review').length,
    rejected: rows.filter(r => r.status === 'rejected').length,
  }), [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const stem = (r.normalizedQuestion && 'stem' in r.normalizedQuestion
          ? r.normalizedQuestion.stem
          : r.normalizedQuestion?.type === 'UNKNOWN' ? r.normalizedQuestion.rawStem : ''
        )?.toLowerCase() || '';
        const rawValues = Object.values(r.rawRow).join(' ').toLowerCase();
        if (!stem.includes(q) && !rawValues.includes(q)) return false;
      }
      return true;
    });
  }, [rows, filterStatus, searchQuery]);

  const selectedRow = useMemo(() => {
    if (!selectedRowId) return null;
    return rows.find(r => r.id === selectedRowId) || null;
  }, [rows, selectedRowId]);

  const selectedRowSuggestions = useMemo<FixSuggestion[]>(() => {
    if (!selectedRowId || !suggestionResult) return [];
    return suggestionResult.byRow[selectedRowId] || [];
  }, [selectedRowId, suggestionResult]);

  // ── Actions ────────────────────────────────────────────────────────

  const selectRow = useCallback((rowId: string) => {
    setSelectedRowId(rowId);
    const row = rows.find(r => r.id === rowId);
    if (row) {
      setEditorState(questionToEditorState(row.normalizedQuestion));
    }
  }, [rows]);

  const saveEdit = useCallback(() => {
    if (!selectedRowId || !editorState) return;

    const row = rows.find(r => r.id === selectedRowId);
    if (!row) return;

    // Save undo snapshot
    setUndoStack(prev => {
      const next = new Map(prev);
      next.set(selectedRowId, structuredClone(row));
      return next;
    });

    // Build the updated question from editor state
    const updatedQuestion = buildQuestionFromEditor(row.normalizedQuestion, editorState);

    // Apply as a manual edit
    const result = applyManualEdit(
      row,
      'normalizedQuestion',
      updatedQuestion,
      engine,
      { ...context, allRows: rows },
    );

    // Update the row in state
    setRows(prev => prev.map(r => r.id === selectedRowId ? result.row : r));

    // Regenerate suggestions for this row
    const newSuggestions = pass3GenerateSuggestions([result.row], exportConfig);
    setSuggestionResult(prev => {
      if (!prev) return newSuggestions;
      return {
        ...prev,
        byRow: { ...prev.byRow, [selectedRowId]: newSuggestions.byRow[selectedRowId] || [] },
        suggestions: [
          ...prev.suggestions.filter(s => s.patch.rowId !== selectedRowId),
          ...newSuggestions.suggestions,
        ],
        autoApplicable: [
          ...prev.autoApplicable.filter(s => s.patch.rowId !== selectedRowId),
          ...newSuggestions.autoApplicable,
        ],
        requiresReview: [
          ...prev.requiresReview.filter(s => s.patch.rowId !== selectedRowId),
          ...newSuggestions.requiresReview,
        ],
      };
    });
  }, [selectedRowId, editorState, rows, engine, context]);

  const handleApplySuggestion = useCallback((suggestion: FixSuggestion) => {
    const row = rows.find(r => r.id === suggestion.patch.rowId);
    if (!row) return;

    // Save undo snapshot
    setUndoStack(prev => {
      const next = new Map(prev);
      next.set(row.id, structuredClone(row));
      return next;
    });

    const result = applySuggestion(row, suggestion, engine, { ...context, allRows: rows });

    setRows(prev => prev.map(r => r.id === row.id ? result.row : r));

    // Update editor if this row is selected
    if (selectedRowId === row.id) {
      setEditorState(questionToEditorState(result.row.normalizedQuestion));
    }

    // Regenerate suggestions
    const newSuggestions = pass3GenerateSuggestions([result.row], exportConfig);
    setSuggestionResult(prev => {
      if (!prev) return newSuggestions;
      return {
        ...prev,
        byRow: { ...prev.byRow, [row.id]: newSuggestions.byRow[row.id] || [] },
        suggestions: [
          ...prev.suggestions.filter(s => s.patch.rowId !== row.id),
          ...newSuggestions.suggestions,
        ],
        autoApplicable: [
          ...prev.autoApplicable.filter(s => s.patch.rowId !== row.id),
          ...newSuggestions.autoApplicable,
        ],
        requiresReview: [
          ...prev.requiresReview.filter(s => s.patch.rowId !== row.id),
          ...newSuggestions.requiresReview,
        ],
      };
    });
  }, [rows, engine, context, selectedRowId]);

  const undoLastEdit = useCallback(() => {
    if (!selectedRowId) return;
    const snapshot = undoStack.get(selectedRowId);
    if (!snapshot) return;

    // Re-validate the snapshot
    const revalidated = engine.validateRow(snapshot, { ...context, allRows: rows });

    setRows(prev => prev.map(r => r.id === selectedRowId ? revalidated : r));
    setEditorState(questionToEditorState(revalidated.normalizedQuestion));

    // Remove from undo stack
    setUndoStack(prev => {
      const next = new Map(prev);
      next.delete(selectedRowId);
      return next;
    });
  }, [selectedRowId, undoStack, engine, context, rows]);

  const canUndo = selectedRowId ? undoStack.has(selectedRowId) : false;

  return {
    rows,
    isProcessing,
    summary,
    filteredRows,
    cleaningResult,
    suggestionResult,

    // UI state
    filterStatus,
    setFilterStatus,
    searchQuery,
    setSearchQuery,
    selectedRowId,
    selectedRow,
    selectedRowSuggestions,
    editorState,
    setEditorState,
    autoFixedRowIds,

    // Actions
    selectRow,
    saveEdit,
    handleApplySuggestion,
    undoLastEdit,
    canUndo,
  };
}
