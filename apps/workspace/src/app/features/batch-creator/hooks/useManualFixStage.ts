import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { QuestionRow, RawSheetRow } from "../core/rowTypes";
import { ValidationIssue } from "../core/issueTypes";
import { FixSuggestion, SuggestionResult } from "../core/fixTypes";
import {
  ValidationEngine,
  ValidationContext,
} from "../validation/validationEngine";
import { getDefaultRuleRegistry } from "../validation/ruleRegistry";
import { ColumnMapping } from "../normalization/normalizeAnswer";
import { inferColumnMapping } from "../normalization/autoColumnMapping";
import { CanonicalColumnMapping } from "../normalization/canonicalColumnMapping";
import { pass3GenerateSuggestions } from "../cleaning/pass3SuggestionEngine";
import { runCleaningPipeline } from "../cleaning/cleaningEngine";
import { CleaningResult } from "../core/cleaningTypes";
import { normalizeRow } from "../normalization/normalizeRow";
import {
  applyManualEditorState,
  applySuggestion,
  rowToEditorState,
  buildRowFromEditor,
  EditorFormState,
} from "../fixing/manualFixEngine";
import {
  DraftValidationState,
  EMPTY_DRAFT_VALIDATION,
  MANUAL_FIX_VALIDATION_DEBOUNCE_MS,
  ManualFixDraftValidationInput,
  draftValidationStateFromRow,
  revalidateRowInBatch,
  validateManualFixDraft,
} from "../fixing/manualFixDraftValidation";
import {
  createLatestValidationScheduler,
  LatestValidationScheduler,
} from "../fixing/latestValidationScheduler";
import {
  AutofixAuditEntry,
  createCleaningAuditEntries,
  createSuggestionAuditEntry,
  isAutofixRollbackSafe,
} from "../fixing/autofixAudit";
import { createWorkflowOperation } from "../observability/workflowTelemetry";

export type FixFilterStatus =
  | "all"
  | "rejected"
  | "needs_review"
  | "caution"
  | "valid";

export function useManualFixStage(
  rawRows: RawSheetRow[] = [],
  exportConfig?: any,
  canonicalMapping?: CanonicalColumnMapping,
  initialProcessedRows?: QuestionRow[],
) {
  // ── Core state ─────────────────────────────────────────────────────
  const [rows, setRows] = useState<QuestionRow[]>([]);
  const [cleaningResult, setCleaningResult] = useState<CleaningResult | null>(
    null,
  );
  const [suggestionResult, setSuggestionResult] =
    useState<SuggestionResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoFixedRowIds, setAutoFixedRowIds] = useState<Set<string>>(
    new Set(),
  );
  const [autofixAudit, setAutofixAudit] = useState<AutofixAuditEntry[]>([]);

  // Track initialization to avoid re-initializing during local component updates
  const isInitializedRef = useRef(false);
  const prevRawRowsRef = useRef(rawRows);

  if (prevRawRowsRef.current !== rawRows) {
    prevRawRowsRef.current = rawRows;
    isInitializedRef.current = false;
  }

  // ── UI state ───────────────────────────────────────────────────────
  const [filterStatus, setFilterStatus] = useState<FixFilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [editorState, setEditorState] = useState<EditorFormState | null>(null);
  const [undoStack, setUndoStack] = useState<Map<string, QuestionRow>>(
    new Map(),
  );
  const [draftValidation, setDraftValidation] = useState<DraftValidationState>(
    EMPTY_DRAFT_VALIDATION,
  );
  const draftValidationSchedulerRef = useRef<LatestValidationScheduler<
    ManualFixDraftValidationInput,
    QuestionRow
  > | null>(null);

  // ── Engine (memoized) ──────────────────────────────────────────────
  const engine = useMemo(
    () => new ValidationEngine(getDefaultRuleRegistry()),
    [],
  );

  if (!draftValidationSchedulerRef.current) {
    draftValidationSchedulerRef.current = createLatestValidationScheduler(
      validateManualFixDraft,
      MANUAL_FIX_VALIDATION_DEBOUNCE_MS,
    );
  }

  useEffect(
    () => () => {
      // cancel() is safe during React Strict Mode's development effect replay.
      draftValidationSchedulerRef.current?.cancel();
    },
    [],
  );

  // Compute column mapping dynamically based on headers
  const dummyMapping: ColumnMapping = useMemo(() => {
    if (canonicalMapping) return canonicalMapping;
    if (rawRows.length === 0) return {};
    const availableColumns = Object.keys(rawRows[0] || {}).filter(
      (c) => !c.startsWith("__"),
    );
    return inferColumnMapping(availableColumns);
  }, [rawRows, canonicalMapping]);

  const context: ValidationContext = useMemo(
    () => ({
      allRows: rows,
      columnMapping: dummyMapping,
    }),
    [rows, dummyMapping],
  );

  // ── Initialize: run cleaning pipeline + generate suggestions ──────
  useEffect(() => {
    if (rawRows.length === 0) {
      setRows([]);
      setAutofixAudit([]);
      isInitializedRef.current = false;
      return;
    }

    if (isInitializedRef.current) {
      return;
    }

    if (
      initialProcessedRows &&
      initialProcessedRows.length > 0 &&
      initialProcessedRows.length === rawRows.length
    ) {
      const suggestions = pass3GenerateSuggestions(
        initialProcessedRows,
        exportConfig,
      );
      setSuggestionResult(suggestions);
      setRows(initialProcessedRows);
      setIsProcessing(false);
      isInitializedRef.current = true;
      return;
    }

    setIsProcessing(true);
    const operation = createWorkflowOperation("autofix", {
      rows: rawRows.length,
    });

    // 1. Pre-validate to get original statuses
    const rawNormalized = rawRows.map((r) => normalizeRow(r, dummyMapping));
    const preValidated = engine.validateBatch(rawNormalized, {
      allRows: rawNormalized,
      columnMapping: dummyMapping,
    });
    const originalStatusMap = new Map<string, string>();
    preValidated.forEach((r) => originalStatusMap.set(r.id, r.status));

    // 2. Run Pass 1 + Pass 2 cleaning on the NORMALIZED rows
    const cleaned = runCleaningPipeline(preValidated);
    setCleaningResult(cleaned);

    // 3. Re-validate cleaned rows
    const revalidated = engine.validateBatch(cleaned.rows, {
      allRows: cleaned.rows,
      columnMapping: dummyMapping,
    });
    const auditEntries = createCleaningAuditEntries(
      preValidated,
      revalidated,
      cleaned.logs,
    );

    // 4. Compare status for auto-fix detection
    const newAutoFixed = new Set<string>();
    revalidated.forEach((r) => {
      const oldStatus = originalStatusMap.get(r.id);
      if (oldStatus && oldStatus !== "valid" && r.status === "valid") {
        newAutoFixed.add(r.id);
      }
    });
    setAutoFixedRowIds(newAutoFixed);

    // Generate Pass 3 suggestions
    let suggestions = pass3GenerateSuggestions(revalidated, exportConfig);

    let finalRevalidated = [...revalidated];
    let autoApplyCount = 0;
    let autoRejectedCount = 0;

    if (suggestions.autoApplicable.length > 0) {
      suggestions.autoApplicable.forEach((suggestion) => {
        const rowIndex = finalRevalidated.findIndex(
          (r) => r.id === suggestion.patch.rowId,
        );
        if (rowIndex !== -1) {
          const beforeRow = finalRevalidated[rowIndex];
          const contextForPatch: ValidationContext = {
            allRows: finalRevalidated,
            columnMapping: dummyMapping,
          };
          const result = applySuggestion(
            beforeRow,
            suggestion,
            engine,
            contextForPatch,
          );
          auditEntries.push(
            createSuggestionAuditEntry(
              beforeRow,
              suggestion,
              result,
              "automatic",
            ),
          );
          if (result.success) {
            finalRevalidated[rowIndex] = result.row;
            autoApplyCount++;
            newAutoFixed.add(finalRevalidated[rowIndex].id);
          } else {
            autoRejectedCount++;
          }
        }
      });
      // Regenerate suggestions for the updated rows
      suggestions = pass3GenerateSuggestions(finalRevalidated, exportConfig);
    }

    if (autoApplyCount > 0) {
      toast.success("Autofix applied", {
        description: `${autoApplyCount} issues were automatically repaired.`,
      });
    }
    if (autoRejectedCount > 0) {
      toast.warning("Unsafe autofixes skipped", {
        description: `${autoRejectedCount} stale, ineffective, or regressive suggestion${autoRejectedCount === 1 ? " was" : "s were"} left for review.`,
      });
    }

    setAutoFixedRowIds(newAutoFixed);
    setAutofixAudit(auditEntries);
    setSuggestionResult(suggestions);
    setRows(finalRevalidated);
    setIsProcessing(false);
    isInitializedRef.current = true;
    operation.complete({
      rows: finalRevalidated.length,
      applied: autoApplyCount,
      skipped: autoRejectedCount,
    });
  }, [rawRows, engine, dummyMapping, exportConfig, initialProcessedRows]);

  // ── Derived state ──────────────────────────────────────────────────

  const summary = useMemo(
    () => ({
      total: rows.length,
      valid: rows.filter((r) => r.status === "valid").length,
      caution: rows.filter((r) => r.status === "caution").length,
      needs_review: rows.filter((r) => r.status === "needs_review").length,
      rejected: rows.filter((r) => r.status === "rejected").length,
    }),
    [rows],
  );

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
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
        const rawValues = Object.values(r.rawRow).join(" ").toLowerCase();
        if (!stem.includes(q) && !rawValues.includes(q)) return false;
      }
      return true;
    });
  }, [rows, filterStatus, searchQuery]);

  const selectedRow = useMemo(() => {
    if (!selectedRowId) return null;
    return rows.find((r) => r.id === selectedRowId) || null;
  }, [rows, selectedRowId]);

  const hasUnsavedChanges = useMemo(() => {
    if (!selectedRow || !editorState) return false;
    const savedState = rowToEditorState(selectedRow);
    return JSON.stringify(savedState) !== JSON.stringify(editorState);
  }, [selectedRow, editorState]);

  const selectedRowSuggestions = useMemo<FixSuggestion[]>(() => {
    if (!selectedRowId || !suggestionResult) return [];
    return suggestionResult.byRow[selectedRowId] || [];
  }, [selectedRowId, suggestionResult]);

  // Validate an immutable snapshot of the current draft after typing settles.
  // The scheduler cancels pending work and suppresses stale async completions.
  useEffect(() => {
    const scheduler = draftValidationSchedulerRef.current;
    if (!scheduler) return;

    if (!selectedRow || !editorState) {
      scheduler.cancel();
      setDraftValidation(EMPTY_DRAFT_VALIDATION);
      return;
    }

    if (!hasUnsavedChanges) {
      scheduler.cancel();
      return;
    }

    const rowId = selectedRow.id;
    scheduler.schedule(
      {
        row: selectedRow,
        editorState: structuredClone(editorState),
        engine,
        context,
      },
      {
        onStart: () =>
          setDraftValidation({
            phase: "validating",
            rowId,
            issues: [],
          }),
        onComplete: (validatedRow) => {
          setDraftValidation(draftValidationStateFromRow(validatedRow));
        },
        onError: (error) => {
          setDraftValidation({
            phase: "error",
            rowId,
            issues: [],
            errorMessage:
              error instanceof Error
                ? error.message
                : "Draft validation failed unexpectedly.",
          });
        },
      },
    );

    return () => scheduler.cancel();
  }, [selectedRow, editorState, hasUnsavedChanges, engine, context]);

  // ── Actions ────────────────────────────────────────────────────────

  const selectRow = useCallback(
    (rowId: string) => {
      if (selectedRowId && selectedRowId !== rowId && hasUnsavedChanges) {
        toast.warning("Unsaved manual changes", {
          description:
            "Save or discard the current draft before opening another question.",
        });
        return;
      }

      draftValidationSchedulerRef.current?.cancel();
      setSelectedRowId(rowId);
      const row = rows.find((r) => r.id === rowId);
      if (row) {
        setEditorState(rowToEditorState(row));
        setDraftValidation(draftValidationStateFromRow(row));
      }
    },
    [rows, selectedRowId, hasUnsavedChanges],
  );

  const discardDraft = useCallback(() => {
    if (!selectedRow) return;
    draftValidationSchedulerRef.current?.cancel();
    setEditorState(rowToEditorState(selectedRow));
    setDraftValidation(draftValidationStateFromRow(selectedRow));
  }, [selectedRow]);

  const saveEdit = useCallback(() => {
    if (!selectedRowId || !editorState) return;

    const row = rows.find((r) => r.id === selectedRowId);
    if (!row) return;
    const operation = createWorkflowOperation("manual_fix", {
      issuesBefore: row.issues.length,
    });

    // Prevent a pending background result from overwriting this immediate,
    // authoritative save validation.
    draftValidationSchedulerRef.current?.cancel();

    // Save undo snapshot
    setUndoStack((prev) => {
      const next = new Map(prev);
      next.set(selectedRowId, structuredClone(row));
      return next;
    });

    // Cross-row rules must see the same revision that is being validated.
    const candidateRow = buildRowFromEditor(row, editorState);
    const candidateRows = rows.map((candidate) =>
      candidate.id === selectedRowId ? candidateRow : candidate,
    );

    // Apply as a manual edit
    const result = applyManualEditorState(row, editorState, engine, {
      ...context,
      allRows: candidateRows,
    });

    // Update the row in state
    setRows((prev) =>
      prev.map((r) => (r.id === selectedRowId ? result.row : r)),
    );
    // The row builder serializes editor-only equation widgets to delimited
    // LaTeX. Keep the form on that same canonical revision after saving so the
    // draft does not remain falsely dirty.
    setEditorState(rowToEditorState(result.row));
    setDraftValidation(draftValidationStateFromRow(result.row));
    operation.complete({
      issuesAfter: result.row.issues.length,
      valid: result.row.status === "valid" ? 1 : 0,
    });

    if (result.row.status === "valid") {
      toast.success("Changes saved", {
        description: "Background validation passed with no remaining issues.",
      });
    } else {
      toast.warning("Changes saved with validation issues", {
        description: `${result.row.issues.length} issue${result.row.issues.length === 1 ? "" : "s"} remain for this question.`,
      });
    }

    // Regenerate suggestions for this row
    const newSuggestions = pass3GenerateSuggestions([result.row], exportConfig);
    setSuggestionResult((prev) => {
      if (!prev) return newSuggestions;
      return {
        ...prev,
        byRow: {
          ...prev.byRow,
          [selectedRowId]: newSuggestions.byRow[selectedRowId] || [],
        },
        suggestions: [
          ...prev.suggestions.filter((s) => s.patch.rowId !== selectedRowId),
          ...newSuggestions.suggestions,
        ],
        autoApplicable: [
          ...prev.autoApplicable.filter((s) => s.patch.rowId !== selectedRowId),
          ...newSuggestions.autoApplicable,
        ],
        requiresReview: [
          ...prev.requiresReview.filter((s) => s.patch.rowId !== selectedRowId),
          ...newSuggestions.requiresReview,
        ],
      };
    });
  }, [selectedRowId, editorState, rows, engine, context, exportConfig]);

  const handleApplySuggestion = useCallback(
    (suggestion: FixSuggestion) => {
      const row = rows.find((r) => r.id === suggestion.patch.rowId);
      if (!row) return;

      if (selectedRowId === row.id && hasUnsavedChanges) {
        toast.warning("Unsaved manual changes", {
          description:
            "Save or undo the current draft before applying a suggested fix.",
        });
        return;
      }

      draftValidationSchedulerRef.current?.cancel();

      const result = applySuggestion(row, suggestion, engine, {
        ...context,
        allRows: rows,
      });
      setAutofixAudit((previous) => [
        ...previous,
        createSuggestionAuditEntry(row, suggestion, result, "manual"),
      ]);
      if (!result.success) {
        toast.warning("Suggested fix was not applied", {
          description:
            result.failureReason === "stale_value"
              ? "The question changed after this suggestion was created. A fresh suggestion is required."
              : "The fix did not resolve its target issue safely, so the original question was preserved.",
        });
        return;
      }

      // Save undo only after the safety boundary accepts the suggestion.
      setUndoStack((prev) => {
        const next = new Map(prev);
        next.set(row.id, structuredClone(row));
        return next;
      });

      const revalidatedRow = revalidateRowInBatch(result.row, engine, {
        ...context,
        allRows: rows,
      });

      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? revalidatedRow : r)),
      );

      // Update editor if this row is selected
      if (selectedRowId === row.id) {
        setEditorState(rowToEditorState(revalidatedRow));
        setDraftValidation(draftValidationStateFromRow(revalidatedRow));
      }

      // Regenerate suggestions
      const newSuggestions = pass3GenerateSuggestions(
        [revalidatedRow],
        exportConfig,
      );
      setSuggestionResult((prev) => {
        if (!prev) return newSuggestions;
        return {
          ...prev,
          byRow: {
            ...prev.byRow,
            [row.id]: newSuggestions.byRow[row.id] || [],
          },
          suggestions: [
            ...prev.suggestions.filter((s) => s.patch.rowId !== row.id),
            ...newSuggestions.suggestions,
          ],
          autoApplicable: [
            ...prev.autoApplicable.filter((s) => s.patch.rowId !== row.id),
            ...newSuggestions.autoApplicable,
          ],
          requiresReview: [
            ...prev.requiresReview.filter((s) => s.patch.rowId !== row.id),
            ...newSuggestions.requiresReview,
          ],
        };
      });
    },
    [rows, engine, context, selectedRowId, hasUnsavedChanges, exportConfig],
  );

  const rollbackAutofix = useCallback(
    (entryId: string) => {
      const entry = autofixAudit.find((candidate) => candidate.id === entryId);
      if (!entry || entry.status !== "applied" || !entry.beforeSnapshot) return;

      const currentRow = rows.find((row) => row.id === entry.rowId);
      if (!currentRow) return;

      if (selectedRowId === entry.rowId && hasUnsavedChanges) {
        toast.warning("Unsaved manual changes", {
          description:
            "Save or discard the current draft before rolling back an autofix.",
        });
        return;
      }

      if (!isAutofixRollbackSafe(entry, currentRow)) {
        toast.warning("Autofix rollback locked", {
          description:
            "A later content change modified this question, so rollback was blocked to prevent data loss.",
        });
        return;
      }

      draftValidationSchedulerRef.current?.cancel();
      const restored = revalidateRowInBatch(
        structuredClone(entry.beforeSnapshot),
        engine,
        { ...context, allRows: rows },
      );

      setRows((previous) =>
        previous.map((row) => (row.id === entry.rowId ? restored : row)),
      );
      setAutofixAudit((previous) =>
        previous.map((candidate) =>
          candidate.id === entryId
            ? {
                ...candidate,
                status: "rolled_back",
                rolledBackAt: new Date().toISOString(),
              }
            : candidate,
        ),
      );
      setUndoStack((previous) => {
        const next = new Map(previous);
        next.delete(entry.rowId);
        return next;
      });

      const hasOtherAppliedFix = autofixAudit.some(
        (candidate) =>
          candidate.id !== entryId &&
          candidate.rowId === entry.rowId &&
          candidate.status === "applied",
      );
      if (!hasOtherAppliedFix) {
        setAutoFixedRowIds((previous) => {
          const next = new Set(previous);
          next.delete(entry.rowId);
          return next;
        });
      }

      if (selectedRowId === entry.rowId) {
        setEditorState(rowToEditorState(restored));
        setDraftValidation(draftValidationStateFromRow(restored));
      }

      const newSuggestions = pass3GenerateSuggestions([restored], exportConfig);
      setSuggestionResult((previous) => {
        if (!previous) return newSuggestions;
        return {
          ...previous,
          byRow: {
            ...previous.byRow,
            [entry.rowId]: newSuggestions.byRow[entry.rowId] || [],
          },
          suggestions: [
            ...previous.suggestions.filter(
              (suggestion) => suggestion.patch.rowId !== entry.rowId,
            ),
            ...newSuggestions.suggestions,
          ],
          autoApplicable: [
            ...previous.autoApplicable.filter(
              (suggestion) => suggestion.patch.rowId !== entry.rowId,
            ),
            ...newSuggestions.autoApplicable,
          ],
          requiresReview: [
            ...previous.requiresReview.filter(
              (suggestion) => suggestion.patch.rowId !== entry.rowId,
            ),
            ...newSuggestions.requiresReview,
          ],
        };
      });

      toast.success("Autofix rolled back", {
        description: `Row ${entry.sourceRowNumber} was restored and revalidated.`,
      });
    },
    [
      autofixAudit,
      rows,
      selectedRowId,
      hasUnsavedChanges,
      engine,
      context,
      exportConfig,
    ],
  );

  const undoLastEdit = useCallback(() => {
    if (!selectedRowId) return;
    const snapshot = undoStack.get(selectedRowId);
    if (!snapshot) return;

    draftValidationSchedulerRef.current?.cancel();

    // Re-validate the snapshot
    const revalidated = revalidateRowInBatch(snapshot, engine, {
      ...context,
      allRows: rows,
    });

    setRows((prev) =>
      prev.map((r) => (r.id === selectedRowId ? revalidated : r)),
    );
    setEditorState(rowToEditorState(revalidated));
    setDraftValidation(draftValidationStateFromRow(revalidated));

    // Remove from undo stack
    setUndoStack((prev) => {
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
    draftValidation,
    hasUnsavedChanges,
    autoFixedRowIds,
    autofixAudit,

    // Actions
    selectRow,
    discardDraft,
    saveEdit,
    handleApplySuggestion,
    rollbackAutofix,
    undoLastEdit,
    canUndo,
  };
}
