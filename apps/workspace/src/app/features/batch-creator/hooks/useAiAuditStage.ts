import { useState, useCallback, useMemo } from "react";
import { QuestionRow } from "../core/rowTypes";
import {
  ValidationEngine,
  ValidationContext,
} from "../validation/validationEngine";
import { getDefaultRuleRegistry } from "../validation/ruleRegistry";
import { ColumnMapping } from "../normalization/normalizeAnswer";
import {
  AiAuditResult,
  buildAuditPayload,
  simulateAiAudit,
} from "../audit/aiAuditEngine";
import { applyPatch } from "../fixing/patchEngine";

export function useAiAuditStage(inputRows: QuestionRow[] = []) {
  const [rows, setRows] = useState<QuestionRow[]>(inputRows);
  const [auditResults, setAuditResults] = useState<
    Record<string, AiAuditResult>
  >({});
  const [isAuditing, setIsAuditing] = useState(false);
  const [progress, setProgress] = useState(0);

  // Engine for re-validation if a fix is applied
  const engine = useMemo(
    () => new ValidationEngine(getDefaultRuleRegistry()),
    [],
  );
  const dummyMapping: ColumnMapping = useMemo(
    () => ({
      stem: "stem",
      correctAnswer: "answer",
      type: "type",
    }),
    [],
  );

  const runAudit = useCallback(async () => {
    setIsAuditing(true);
    setProgress(0);

    const results: Record<string, AiAuditResult> = {};
    const total = rows.length;

    // Process in batches so we don't block the UI completely
    for (let i = 0; i < total; i++) {
      const row = rows[i];
      const payload = buildAuditPayload(row);

      if (payload) {
        try {
          const result = await simulateAiAudit(payload);
          results[row.id] = result;
        } catch (e) {
          // Fallback if AI call fails
          results[row.id] = {
            rowId: row.id,
            status: "warning",
            categories: ["system"],
            message: "Failed to reach AI service.",
            userAction: "none",
          };
        }
      }

      setProgress(Math.round(((i + 1) / total) * 100));
    }

    setAuditResults(results);
    setIsAuditing(false);
  }, [rows]);

  const handleAction = useCallback(
    (rowId: string, action: "ignored" | "accepted") => {
      setAuditResults((prev) => {
        const current = prev[rowId];
        if (!current) return prev;
        return {
          ...prev,
          [rowId]: { ...current, userAction: action },
        };
      });

      if (action === "accepted") {
        const currentResult = auditResults[rowId];
        if (currentResult?.suggestedFix) {
          // Apply patch and revalidate
          setRows((prevRows) => {
            const rowIdx = prevRows.findIndex((r) => r.id === rowId);
            if (rowIdx === -1) return prevRows;

            const row = prevRows[rowIdx];
            const patchResult = applyPatch(
              row,
              currentResult.suggestedFix!,
              engine,
              {
                allRows: prevRows,
                columnMapping: dummyMapping,
              },
            );

            if (patchResult.success) {
              const nextRows = [...prevRows];
              nextRows[rowIdx] = patchResult.patchedRow;
              return nextRows;
            }
            return prevRows;
          });
        }
      }
    },
    [auditResults, engine, dummyMapping],
  );

  const summary = useMemo(() => {
    const results = Object.values(auditResults);
    return {
      total: results.length,
      passed: results.filter((r) => r.status === "passed").length,
      warning: results.filter((r) => r.status === "warning").length,
      failed: results.filter((r) => r.status === "failed").length,
      pending: rows.length - results.length,
    };
  }, [auditResults, rows.length]);

  return {
    rows,
    auditResults,
    isAuditing,
    progress,
    summary,
    runAudit,
    handleAction,
  };
}
