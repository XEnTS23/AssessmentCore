import { useState, useMemo, useEffect } from "react";
import { QuestionRow, RawSheetRow } from "../core/rowTypes";
import { ValidationEngine } from "../validation/validationEngine";
import { getDefaultRuleRegistry } from "../validation/ruleRegistry";
import { normalizeRow } from "../normalization/normalizeRow";
import { ColumnMapping } from "../normalization/normalizeAnswer";
import { CanonicalColumnMapping } from "../normalization/canonicalColumnMapping";
import { inferColumnMapping } from "../normalization/autoColumnMapping";
import { DEFAULT_BATCH_PROCESSING_LIMITS } from "../core/batchLimits";
import {
  BatchProcessingCancelledError,
  processInChunks,
} from "../validation/chunkedBatchProcessor";
import { createWorkflowOperation } from "../observability/workflowTelemetry";

export type FilterStatus =
  | "all"
  | "valid"
  | "caution"
  | "needs_review"
  | "rejected";

export type ValidationProcessingPhase =
  | "idle"
  | "normalizing"
  | "validating"
  | "complete"
  | "error";

export interface ValidationProcessingProgress {
  phase: ValidationProcessingPhase;
  processed: number;
  total: number;
  percent: number;
}

const EMPTY_RAW_ROWS: RawSheetRow[] = [];
const INITIAL_PROGRESS: ValidationProcessingProgress = {
  phase: "idle",
  processed: 0,
  total: 0,
  percent: 0,
};

export function useValidationStage(
  rawRows: RawSheetRow[] = EMPTY_RAW_ROWS,
  canonicalMapping?: CanonicalColumnMapping,
) {
  const [rows, setRows] = useState<QuestionRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] =
    useState<ValidationProcessingProgress>(INITIAL_PROGRESS);
  const [processingError, setProcessingError] = useState<string | null>(null);

  // UI State
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRuleId, setSelectedRuleId] = useState<string>("all");
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // Process rows on mount / change
  useEffect(() => {
    if (rawRows.length === 0) {
      setRows([]);
      setIsProcessing(false);
      setProcessingError(null);
      setProgress(INITIAL_PROGRESS);
      return;
    }

    const controller = new AbortController();
    const operation = createWorkflowOperation("validation", {
      rows: rawRows.length,
    });
    setRows([]);
    setSelectedRowId(null);
    setIsProcessing(true);
    setProcessingError(null);
    setProgress({
      phase: "normalizing",
      processed: 0,
      total: rawRows.length,
      percent: 0,
    });

    // Auto-detect column mapping from the spreadsheet headers
    const availableColumns = Object.keys(rawRows[0] || {}).filter(
      (c) => !c.startsWith("__"),
    );
    const dummyMapping: ColumnMapping =
      canonicalMapping ?? inferColumnMapping(availableColumns);

    const engine = new ValidationEngine(getDefaultRuleRegistry());
    const chunkSize = DEFAULT_BATCH_PROCESSING_LIMITS.processingChunkSize;

    void (async () => {
      try {
        const normalized = await processInChunks<RawSheetRow, QuestionRow>(
          rawRows,
          (chunk) => chunk.map((raw) => normalizeRow(raw, dummyMapping)),
          {
            chunkSize,
            signal: controller.signal,
            onProgress: (update) => {
              const percent = Math.round(update.percent * 0.35);
              setProgress({
                phase: "normalizing",
                processed: update.processed,
                total: update.total,
                percent,
              });
              operation.progress(percent, { processed: update.processed });
            },
          },
        );

        const validated = await processInChunks<QuestionRow, QuestionRow>(
          normalized,
          (chunk) =>
            engine.validateBatch([...chunk], {
              allRows: normalized,
              columnMapping: dummyMapping,
            }),
          {
            chunkSize,
            signal: controller.signal,
            onProgress: (update) => {
              const percent = 35 + Math.round(update.percent * 0.65);
              setProgress({
                phase: "validating",
                processed: update.processed,
                total: update.total,
                percent,
              });
              operation.progress(percent, { processed: update.processed });
            },
          },
        );

        if (controller.signal.aborted) return;
        setRows(validated);
        setProgress({
          phase: "complete",
          processed: validated.length,
          total: validated.length,
          percent: 100,
        });
        setIsProcessing(false);
        operation.complete({
          rows: validated.length,
          valid: validated.filter((row) => row.status === "valid").length,
          rejected: validated.filter((row) => row.status === "rejected").length,
        });
      } catch (error) {
        if (
          controller.signal.aborted ||
          error instanceof BatchProcessingCancelledError
        )
          return;
        const message =
          error instanceof Error
            ? error.message
            : "Validation failed unexpectedly.";
        setRows([]);
        setProcessingError(message);
        setProgress((current) => ({ ...current, phase: "error" }));
        setIsProcessing(false);
        operation.fail("VALIDATION_ERROR");
      }
    })();

    return () => {
      controller.abort();
      operation.cancel("effect_disposed");
    };
  }, [rawRows, canonicalMapping]);

  // Derived state
  const summary = useMemo(() => {
    return {
      total: rows.length,
      valid: rows.filter((r) => r.status === "valid").length,
      caution: rows.filter((r) => r.status === "caution").length,
      needs_review: rows.filter((r) => r.status === "needs_review").length,
      rejected: rows.filter((r) => r.status === "rejected").length,
    };
  }, [rows]);

  const ruleFrequencies = useMemo(() => {
    const counts = new Map<string, { count: number; message: string }>();
    rows.forEach((r) => {
      const seenRules = new Set<string>();
      r.issues.forEach((i) => {
        if (!seenRules.has(i.ruleId)) {
          seenRules.add(i.ruleId);
          const current = counts.get(i.ruleId);
          if (current) {
            current.count += 1;
          } else {
            counts.set(i.ruleId, { count: 1, message: i.message });
          }
        }
      });
    });
    // Sort by count descending
    return Array.from(counts.entries())
      .map(([ruleId, { count, message }]) => ({ ruleId, count, message }))
      .sort((a, b) => b.count - a.count);
  }, [rows]);

  const typeDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    rows.forEach((r) => {
      const type = r.normalizedQuestion?.type || "UNKNOWN";
      counts.set(type, (counts.get(type) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([type, count]) => ({
      type,
      count,
    }));
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      // Status filter
      if (filterStatus !== "all" && r.status !== filterStatus) return false;

      // Rule filter
      if (selectedRuleId !== "all") {
        const hasRule = r.issues.some((i) => i.ruleId === selectedRuleId);
        if (!hasRule) return false;
      }

      // Search
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
        if (!stem.includes(q) && !rawValues.includes(q)) return false;
      }

      return true;
    });
  }, [rows, filterStatus, selectedRuleId, searchQuery]);

  const selectedRow = useMemo(() => {
    if (!selectedRowId) return null;
    return rows.find((r) => r.id === selectedRowId) || null;
  }, [rows, selectedRowId]);

  return {
    rows,
    isProcessing,
    progress,
    processingError,
    summary,
    filteredRows,
    ruleFrequencies,
    typeDistribution,

    // UI State
    filterStatus,
    setFilterStatus,
    searchQuery,
    setSearchQuery,
    selectedRuleId,
    setSelectedRuleId,
    selectedRowId,
    setSelectedRowId,
    selectedRow,
  };
}
