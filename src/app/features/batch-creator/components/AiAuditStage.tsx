import React from "react";
import {
  Bot,
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronRight,
  Check,
} from "lucide-react";
import { useAiAuditStage } from "../hooks/useAiAuditStage";
import { Button } from "../../../components/ui/button";
import { Progress } from "../../../components/ui/progress";

export function AiAuditStage({ upload, wizard }: { upload: any; wizard: any }) {
  const {
    rows,
    auditResults,
    isAuditing,
    progress,
    summary,
    runAudit,
    handleAction,
  } = useAiAuditStage(
    wizard.__processedRows.length > 0
      ? wizard.__processedRows
      : upload.output?.rawRows,
  );

  const hasRun = Object.keys(auditResults).length > 0;

  // Sync any AI-applied fixes down the pipeline for Export/Build
  React.useEffect(() => {
    wizard.__setProcessedRows(rows);
  }, [rows, wizard]);

  return (
    <div className="flex flex-col h-full bg-background">
      {isAuditing && (
        <div className="p-6 border-b shrink-0 bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Auditing {rows.length} rows...
            </span>
            <span className="text-sm font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {hasRun && !isAuditing && (
        <div className="flex gap-4 p-6 border-b shrink-0 bg-muted/10">
          <SummaryCard title="Total Reviewed" value={summary.total} />
          <SummaryCard
            title="Passed"
            value={summary.passed}
            variant="success"
          />
          <SummaryCard
            title="Warnings"
            value={summary.warning}
            variant="warning"
          />
          <SummaryCard
            title="Failed Check"
            value={summary.failed}
            variant="destructive"
          />
        </div>
      )}

      {/* ── Results List ──────────────────────────────────────────────── */}
      {hasRun && (
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {rows.map((row) => {
            const res = auditResults[row.id];
            if (!res || res.status === "passed") return null; // Only show issues

            return (
              <div
                key={row.id}
                className="border rounded-lg overflow-hidden bg-card"
              >
                <div
                  className={`p-4 border-b flex items-start justify-between
                  ${res.status === "failed" ? "bg-destructive/5 border-destructive/10" : "bg-warning/5 border-warning/10"}`}
                >
                  <div className="flex gap-3">
                    <div className="mt-0.5">
                      {res.status === "failed" ? (
                        <XCircle className="h-5 w-5 text-destructive" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-warning" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">
                          Row {row.sourceRowNumber}
                        </span>
                        <div className="flex gap-1">
                          {res.categories.map((cat) => (
                            <span
                              key={cat}
                              className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-background/50 border text-muted-foreground"
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                        {res.userAction === "accepted" && (
                          <span className="text-[10px] uppercase font-bold text-success flex items-center gap-1 ml-2">
                            <Check className="h-3 w-3" /> Fix Applied
                          </span>
                        )}
                        {res.userAction === "ignored" && (
                          <span className="text-[10px] uppercase font-bold text-muted-foreground ml-2">
                            Ignored
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-foreground">{res.message}</p>

                      {/* Show context */}
                      <div className="mt-3 text-xs text-muted-foreground p-2 rounded bg-background/50 border font-mono">
                        {row.normalizedQuestion &&
                        "stem" in row.normalizedQuestion
                          ? row.normalizedQuestion.stem
                          : (row.normalizedQuestion as any)?.rawStem || ""}
                      </div>

                      {/* Suggested Fix */}
                      {res.suggestedFix && res.userAction === "none" && (
                        <div className="mt-4 p-3 rounded-md bg-background border shadow-sm">
                          <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2 flex items-center gap-1">
                            <Bot className="h-3.5 w-3.5" /> Suggested Edit
                          </p>
                          <div className="text-sm p-2 rounded bg-muted/50 font-mono mb-3 text-muted-foreground">
                            <del className="text-destructive/70">
                              {res.suggestedFix.changes[0].before as string}
                            </del>
                            <br />
                            <ins className="text-success no-underline">
                              {res.suggestedFix.changes[0].after as string}
                            </ins>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleAction(row.id, "accepted")}
                              className="h-7 text-xs"
                            >
                              Accept Fix
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAction(row.id, "ignored")}
                              className="h-7 text-xs"
                            >
                              Ignore
                            </Button>
                          </div>
                        </div>
                      )}

                      {!res.suggestedFix && res.userAction === "none" && (
                        <div className="mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAction(row.id, "ignored")}
                            className="h-7 text-xs"
                          >
                            Acknowledge / Ignore
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {summary.warning === 0 &&
            summary.failed === 0 &&
            summary.total > 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 text-success mb-3" />
                <h3 className="text-lg font-medium text-foreground">
                  All Clear!
                </h3>
                <p className="text-sm max-w-md">
                  The AI audit didn't find any significant issues with grammar,
                  clarity, or logic in this batch.
                </p>
              </div>
            )}
        </div>
      )}

      {!hasRun && !isAuditing && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <Bot className="h-16 w-16 mx-auto text-muted mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Ready for AI Review
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Click the "Run AI Audit" button to start the analysis. This is
              completely optional.
            </p>
            <Button
              onClick={runAudit}
              disabled={true}
              className="min-w-[140px]"
            >
              <Play className="h-4 w-4 mr-2" />
              Run AI Audit
            </Button>
            <p className="text-xs text-muted-foreground mt-3">
              Note: AI Audit is temporarily deactivated while under maintenance.
              You can skip this step.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  variant = "default",
}: {
  title: string;
  value: number;
  variant?: "default" | "success" | "warning" | "destructive";
}) {
  const borderColors = {
    default: "border-border",
    success: "border-success/40 bg-success/5",
    warning: "border-warning/40 bg-warning/5",
    destructive: "border-destructive/40 bg-destructive/5",
  };

  const textColors = {
    default: "text-foreground",
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive",
  };

  return (
    <div
      className={`flex min-w-[140px] flex-col justify-center rounded-md border ${borderColors[variant]} px-4 py-3`}
    >
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
        {title}
      </span>
      <span className={`text-2xl font-bold ${textColors[variant]}`}>
        {value}
      </span>
    </div>
  );
}
