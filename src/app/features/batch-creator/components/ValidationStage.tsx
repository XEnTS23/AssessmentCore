import React, { useMemo, useState, useEffect } from 'react';
import { ShieldCheck, Search, ChevronLeft, Download, ChevronRight } from 'lucide-react';
import { useValidationStage, FilterStatus } from '../hooks/useValidationStage';
import { Button } from '../../../components/ui/button';
import { ValidationIssue } from '../core/issueTypes';
import { QuestionRow } from '../core/rowTypes';
import { downloadValidationReport } from '../export/validationReportBuilder';

export function ValidationStage({ upload, wizard }: { upload: any, wizard: any }) {
  const v = useValidationStage(upload.output?.rawRows);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  useEffect(() => {
    setCurrentPage(1);
  }, [v.filteredRows?.length, v.filterStatus, v.searchQuery, v.selectedRuleId]);

  const totalPages = Math.ceil((v.filteredRows?.length || 0) / pageSize);
  const paginatedRows = v.filteredRows?.slice((currentPage - 1) * pageSize, currentPage * pageSize) || [];

  useEffect(() => {
    if (!v.isProcessing && v.rows.length > 0) {
      wizard.__mockSetComplete('VALIDATION', true);
    } else {
      wizard.__mockSetComplete('VALIDATION', false);
    }
  }, [v.isProcessing, v.rows.length, wizard.__mockSetComplete]);

  if (v.isProcessing) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground animate-pulse">Running Validation Engine...</p>
      </div>
    );
  }

  if (v.rows.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <ShieldCheck className="h-8 w-8" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">No Rows to Validate</h2>
        <p className="text-sm text-muted-foreground">Please complete the upload stage first.</p>
      </div>
    );
  }


  const total = v.summary.total || 1; // avoid divide by zero
  const validPct = Math.round((v.summary.valid / total) * 100);
  const cautionPct = Math.round((v.summary.caution / total) * 100);
  const rejectedPct = Math.round((v.summary.rejected / total) * 100);

  return (
    <div className="flex h-full flex-col bg-background text-sm">
      {/* ── Top Summary ────────────────────────────────────────────── */}
      <div className="flex gap-4 p-4 border-b">
        <SummaryCard title="Total rows" value={v.summary.total} />
        <SummaryCard title="Valid" value={v.summary.valid} variant="success" />
        <SummaryCard title="Caution" value={v.summary.caution} variant="warning" />
        <SummaryCard title="Rejected" value={v.summary.rejected} variant="destructive" />

        {/* Distribution Card */}
        <div className="flex flex-1 flex-col justify-center rounded-md border px-4 py-2">
          <span className="text-xs text-muted-foreground mb-2">Distribution</span>
          <div className="h-2 w-full flex rounded-full overflow-hidden mb-1">
            <div style={{ width: `${validPct}%` }} className="bg-success"></div>
            <div style={{ width: `${cautionPct}%` }} className="bg-warning"></div>
            <div style={{ width: `${rejectedPct}%` }} className="bg-destructive"></div>
          </div>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>{validPct}% valid</span>
            <span>{cautionPct}% caution</span>
            <span>{rejectedPct}% rejected</span>
          </div>
        </div>

        {/* By Type Card */}
        <div className="flex min-w-[120px] flex-col justify-center rounded-md border px-4 py-2">
          <span className="text-xs text-muted-foreground mb-1">By type</span>
          <div className="flex flex-wrap gap-1">
            {v.typeDistribution.map(t => (
              <span key={t.type} className="rounded bg-muted px-1.5 py-0.5 text-xs">
                {t.count} {t.type}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Layout (Sidebar + Content) ────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar: Triggered Rules */}
        <div className="w-64 border-r bg-background flex flex-col">
          <div className="flex h-14 px-4 items-center justify-between border-b uppercase text-xs font-bold text-muted-foreground tracking-wider">
            <span>Triggered Rules</span>
            <ChevronLeft className="h-4 w-4" />
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {v.ruleFrequencies.map(rule => (
              <button
                key={rule.ruleId}
                onClick={() => v.setSelectedRuleId(rule.ruleId === v.selectedRuleId ? 'all' : rule.ruleId)}
                className={`flex w-full items-center justify-between px-3 py-2 text-xs rounded-md transition-colors ${v.selectedRuleId === rule.ruleId ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:bg-muted/50'}`}
              >
                <span className="truncate pr-2">{rule.ruleId}</span>
                <span>{rule.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex flex-1 flex-col overflow-hidden">

          {/* Toolbar */}
          <div className="flex h-14 px-4 items-center justify-between border-b">
            <div className="flex items-center gap-4">
              <div className="relative w-64">
                <input
                  type="text"
                  placeholder="Search rows, IDs, stems..."
                  value={v.searchQuery}
                  onChange={e => v.setSearchQuery(e.target.value)}
                  className="w-full rounded-md border px-3 py-1.5 text-sm focus:outline-none focus:ring-1"
                />
              </div>

              {/* Status Toggle */}
              <div className="flex rounded-md border overflow-hidden text-[9px] scale-90 origin-left">
                {(['all', 'valid', 'caution', 'rejected'] as FilterStatus[]).map(status => (
                  <button
                    key={status}
                    onClick={() => v.setFilterStatus(status)}
                    className={`px-2.5 py-1 capitalize transition-colors ${v.filterStatus === status
                      ? 'bg-foreground text-background font-medium'
                      : 'bg-background text-muted-foreground hover:bg-muted/50'
                      }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <span className="text-xs text-muted-foreground pr-4">
              {v.filteredRows.length} / {v.rows.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 text-xs mr-2"
              onClick={() => downloadValidationReport({ rows: v.rows })}
              disabled={v.rows.length === 0}
            >
              <Download className="h-3 w-3" /> Report
            </Button>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto bg-background">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="sticky top-0 bg-background border-b z-10 text-xs font-medium text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">No.</th>
                  <th className="px-4 py-3 font-medium">Image</th>
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium w-full">Stem</th>
                  <th className="px-4 py-3 font-medium">Answer</th>
                  <th className="px-4 py-3 font-medium">Issues</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No rows found matching the current filters.
                    </td>
                  </tr>
                ) : paginatedRows.map(row => {
                  const q = row.normalizedQuestion;
                  const rowClass =
                    row.status === 'rejected' ? 'bg-destructive/10 border-l-[3px] border-l-destructive' :
                      row.status === 'caution' ? 'bg-warning/10 border-l-[3px] border-l-warning' :
                        row.status === 'needs_review' ? 'bg-primary/10 border-l-[3px] border-l-primary' :
                          'bg-success/5 border-l-[3px] border-l-success';

                  // FIX 1: Safely check mediaReferences
                  const hasImageError = row.mediaReferences?.some(m => m.status === 'failed') ?? false;
                  const stemText = (q && 'stem' in q ? q.stem : q?.type === 'UNKNOWN' ? q.rawStem : null) || '';

                  // FIX 2: Guarantee 'issues' is an array before slicing
                  const safeIssues = row.issues || [];
                  const displayIssues = safeIssues.slice(0, 2);
                  const extraIssuesCount = safeIssues.length - 2;

                  return (
                    <tr key={row.id} className={`${rowClass} transition-colors hover:opacity-90`}>
                      <td className="px-4 py-3">{row.sourceRowNumber}</td>
                      <td className="px-4 py-3">
                        {/* FIX 3: Safely check if any issue is a media category */}
                        {(hasImageError || safeIssues.some(i => i.category === 'media')) ? (
                          <div className="h-2 w-2 rounded-full bg-destructive mx-auto"></div>
                        ) : (
                          <span className="text-muted-foreground/30 mx-auto block w-max">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">row_{row.sourceRowNumber - 1}</td>
                      <td className="px-4 py-3 uppercase text-xs">{q?.type || 'UNKNOWN'}</td>
                      <td className="px-4 py-3 max-w-[400px] truncate" title={stemText}>{stemText || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground truncate max-w-[100px]">
                        {q && 'correctAnswerId' in q ? q.correctAnswerId : '—'}
                      </td>
                      <td className="px-4 py-3 flex items-center gap-1">
                        {displayIssues.map(issue => (
                          <IssueBadge key={issue.id} ruleId={issue.ruleId} severity={issue.severity} />
                        ))}
                        {extraIssuesCount > 0 && (
                          <span className="rounded border px-1.5 py-0.5 text-[10px] bg-background text-muted-foreground">
                            +{extraIssuesCount}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          <div className="flex shrink-0 items-center justify-between border-t border-border bg-muted/20 px-4 py-2">
            <div className="text-xs text-muted-foreground">
              Showing {Math.min((currentPage - 1) * pageSize + 1, v.filteredRows?.length || 0)} to {Math.min(currentPage * pageSize, v.filteredRows?.length || 0)} of {v.filteredRows?.length || 0}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-3 h-3 mr-1" /> Prev
              </Button>
              <div className="text-xs font-medium px-2">
                {currentPage} / {totalPages || 1}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
              >
                Next <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}

function SummaryCard({ title, value, variant = 'default' }: { title: string, value: number, variant?: 'default' | 'success' | 'warning' | 'destructive' }) {
  const borderColors = {
    default: 'border-border',
    success: 'border-success/40 bg-success/5',
    warning: 'border-warning/40 bg-warning/5',
    destructive: 'border-destructive/40 bg-destructive/5'
  };

  const textColors = {
    default: 'text-foreground',
    success: 'text-success',
    warning: 'text-warning',
    destructive: 'text-destructive'
  };

  return (
    <div className={`flex min-w-[120px] flex-col justify-center rounded-md border ${borderColors[variant]} px-4 py-2`}>
      <span className="text-xs text-muted-foreground mb-1">{title}</span>
      <span className={`text-xl font-medium ${textColors[variant]}`}>{value}</span>
    </div>
  );
}

function IssueBadge({ ruleId, severity }: { ruleId: string, severity: ValidationIssue['severity'] }) {
  let color = 'border-muted text-muted-foreground bg-background';
  if (severity === 'block') color = 'border-destructive/40 text-destructive bg-destructive/5';
  if (severity === 'warning' || severity === 'review') color = 'border-warning/40 text-warning bg-warning/5';

  return (
    <span className={`rounded border px-1.5 py-0.5 text-[10px] uppercase ${color}`}>
      {ruleId}
    </span>
  );
}
