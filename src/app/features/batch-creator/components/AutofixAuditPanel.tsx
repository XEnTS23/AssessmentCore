import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  History,
  RotateCcw,
  ShieldX,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { QuestionRow } from "../core/rowTypes";
import {
  AutofixAuditEntry,
  AutofixAuditStatus,
  describeAutofixFailure,
  formatAutofixValue,
  isAutofixRollbackSafe,
} from "../fixing/autofixAudit";

type AuditFilter = "all" | AutofixAuditStatus;

interface AutofixAuditPanelProps {
  entries: AutofixAuditEntry[];
  rows: QuestionRow[];
  onRollback: (entryId: string) => void;
  onSelectRow: (rowId: string) => void;
}

function statusClasses(status: AutofixAuditStatus): string {
  if (status === "applied") return "bg-success/10 text-success";
  if (status === "rolled_back") return "bg-muted text-muted-foreground";
  return "bg-warning/10 text-warning";
}

function validationClasses(status: QuestionRow["status"]): string {
  if (status === "valid") return "text-success";
  if (status === "rejected") return "text-destructive";
  if (status === "needs_review") return "text-primary";
  return "text-warning";
}

export function AutofixAuditPanel({
  entries,
  rows,
  onRollback,
  onSelectRow,
}: AutofixAuditPanelProps) {
  const [filter, setFilter] = useState<AuditFilter>("all");
  const rowById = useMemo(
    () => new Map(rows.map((row) => [row.id, row])),
    [rows],
  );
  const counts = useMemo(
    () => ({
      applied: entries.filter((entry) => entry.status === "applied").length,
      skipped: entries.filter((entry) => entry.status === "skipped").length,
      rolled_back: entries.filter((entry) => entry.status === "rolled_back")
        .length,
    }),
    [entries],
  );
  const visibleEntries = useMemo(
    () =>
      entries
        .filter((entry) => filter === "all" || entry.status === filter)
        .slice()
        .reverse(),
    [entries, filter],
  );

  return (
    <div className="flex-1 overflow-y-auto bg-muted/10">
      <div className="mx-auto max-w-5xl space-y-5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 text-base font-semibold">
              <History className="h-4 w-4" />
              Autofix audit
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Review deterministic cleaning and suggestion attempts with
              field-level evidence.
            </p>
          </div>
          <div className="flex overflow-hidden rounded-md border bg-background text-[11px]">
            {(
              [
                ["all", `All ${entries.length}`],
                ["applied", `Applied ${counts.applied}`],
                ["skipped", `Skipped ${counts.skipped}`],
                ["rolled_back", `Rolled back ${counts.rolled_back}`],
              ] as Array<[AuditFilter, string]>
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`px-3 py-1.5 transition-colors ${
                  filter === value
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {visibleEntries.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-background p-10 text-center">
            <History className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
            <p className="font-medium">No autofix records in this view</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Audit records appear when cleaning or suggestion engines attempt a
              change.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleEntries.map((entry) => {
              const currentRow = rowById.get(entry.rowId);
              const rollbackSafe = isAutofixRollbackSafe(entry, currentRow);
              return (
                <article
                  key={entry.id}
                  className="rounded-lg border bg-background shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b p-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {entry.status === "applied" ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : entry.status === "skipped" ? (
                          <ShieldX className="h-4 w-4 text-warning" />
                        ) : (
                          <RotateCcw className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="font-medium">{entry.label}</span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${statusClasses(entry.status)}`}
                        >
                          {entry.status.replace("_", " ")}
                        </span>
                        <span className="rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase text-muted-foreground">
                          {entry.confidence} confidence
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                        <span>Row {entry.sourceRowNumber}</span>
                        <span>{entry.ruleId}</span>
                        <span>
                          {entry.source === "cleaning"
                            ? "Cleaning pipeline"
                            : `${entry.mode} suggestion`}
                        </span>
                        <time dateTime={entry.createdAt}>
                          {new Date(entry.createdAt).toLocaleString()}
                        </time>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => onSelectRow(entry.rowId)}
                        disabled={!currentRow}
                      >
                        <Eye className="mr-1.5 h-3.5 w-3.5" />
                        View question
                      </Button>
                      {entry.status === "applied" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => onRollback(entry.id)}
                          disabled={!rollbackSafe}
                          title={
                            rollbackSafe
                              ? "Restore the question revision from before this autofix"
                              : "Rollback is unavailable because a later change modified this question"
                          }
                        >
                          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                          Roll back
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 p-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                    <div className="space-y-2 text-xs">
                      <p className="font-medium text-muted-foreground">
                        Validation comparison
                      </p>
                      <div className="flex items-center gap-2 rounded border bg-muted/20 p-2">
                        <div>
                          <div
                            className={`font-semibold capitalize ${validationClasses(entry.beforeValidation.status)}`}
                          >
                            {entry.beforeValidation.status.replace("_", " ")}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {entry.beforeValidation.issueCount} issue
                            {entry.beforeValidation.issueCount === 1 ? "" : "s"}
                          </div>
                        </div>
                        <span className="text-muted-foreground">→</span>
                        <div>
                          <div
                            className={`font-semibold capitalize ${validationClasses(entry.afterValidation.status)}`}
                          >
                            {entry.afterValidation.status.replace("_", " ")}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {entry.afterValidation.issueCount} issue
                            {entry.afterValidation.issueCount === 1 ? "" : "s"}
                          </div>
                        </div>
                      </div>
                      {entry.failureReason && (
                        <div className="flex items-start gap-1.5 rounded border border-warning/20 bg-warning/5 p-2 text-warning">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>
                            {describeAutofixFailure(entry.failureReason)}
                          </span>
                        </div>
                      )}
                      {entry.status === "applied" && !rollbackSafe && (
                        <p className="text-[10px] text-muted-foreground">
                          Rollback is locked after a later content change to
                          prevent data loss.
                        </p>
                      )}
                    </div>

                    <div className="min-w-0 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        Field changes ({entry.changes.length})
                      </p>
                      <div className="overflow-hidden rounded border">
                        {entry.changes.map((change, index) => (
                          <div
                            key={`${entry.id}-${change.path}-${index}`}
                            className="grid gap-2 border-b p-2 text-xs last:border-b-0 md:grid-cols-[160px_minmax(0,1fr)_20px_minmax(0,1fr)]"
                          >
                            <code className="break-all text-[10px] text-muted-foreground">
                              {change.path}
                            </code>
                            <div className="min-w-0 break-words rounded bg-destructive/5 px-2 py-1 text-destructive">
                              {formatAutofixValue(change.before)}
                            </div>
                            <span className="hidden self-center text-center text-muted-foreground md:block">
                              →
                            </span>
                            <div className="min-w-0 break-words rounded bg-success/5 px-2 py-1 text-success">
                              {formatAutofixValue(change.after)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
