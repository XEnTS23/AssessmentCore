/**
 * Validation Report Builder
 *
 * Accepts structured validation data and produces a self-contained HTML
 * report string.  All HTML is generated here — zero inline report HTML
 * lives in any React component.
 *
 * The report is intentionally kept testable:
 *   - The builder accepts a plain `ValidationReportInput` object.
 *   - No DOM APIs are called.
 *   - The returned string can be written to a Blob and downloaded.
 */

import { QuestionRow } from '../core/rowTypes';
import { ValidationIssue, IssueSeverity, IssueCategory } from '../core/issueTypes';
import { CleaningResult } from '../core/cleaningTypes';
import { SuggestionResult } from '../core/fixTypes';

// ─── Input / Output types ─────────────────────────────────────────────────────

export interface AiAuditSummary {
  totalChecked: number;
  flagged: number;
  autoFixed: number;
  notes?: string;
}

export interface ValidationReportInput {
  /** All rows after validation (and optionally after fixing). */
  rows: QuestionRow[];
  /** Result from the cleaning pipeline, if available. */
  cleaningResult?: CleaningResult | null;
  /** Result from the suggestion engine, if available. */
  suggestionResult?: SuggestionResult | null;
  /** Set of row IDs that were auto-fixed by the system. */
  autoFixedRowIds?: Set<string>;
  /** AI audit summary, if the audit stage was run. */
  aiAudit?: AiAuditSummary | null;
  /** Timestamp to embed in the report (defaults to now). */
  generatedAt?: string;
}

export interface ValidationReportOutput {
  html: string;
  /** Suggested filename for download. */
  fileName: string;
  sizeBytes: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SEVERITY_COLOR: Record<IssueSeverity, string> = {
  block:   '#dc2626',
  review:  '#d97706',
  warning: '#ca8a04',
  info:    '#2563eb',
};

const SEVERITY_BG: Record<IssueSeverity, string> = {
  block:   '#fef2f2',
  review:  '#fffbeb',
  warning: '#fefce8',
  info:    '#eff6ff',
};

const CATEGORY_LABEL: Record<IssueCategory, string> = {
  structural:       'Structural',
  content_quality:  'Content Quality',
  type_suspicion:   'Type Suspicion',
  metadata:         'Metadata',
  media:            'Media',
  scoring:          'Scoring',
  export_readiness: 'Export Readiness',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function esc(s: string | undefined | null): string {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
}

function statusBadge(status: QuestionRow['status']): string {
  const map: Record<string, [string, string]> = {
    valid:        ['#16a34a', '#dcfce7'],
    rejected:     ['#dc2626', '#fef2f2'],
    needs_review: ['#d97706', '#fffbeb'],
    caution:      ['#ca8a04', '#fefce8'],
    raw:          ['#6b7280', '#f3f4f6'],
    normalized:   ['#2563eb', '#eff6ff'],
  };
  const [color, bg] = map[status] ?? ['#6b7280', '#f3f4f6'];
  return `<span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:2px 8px;border-radius:99px;background:${bg};color:${color}">${esc(status.replace('_', ' '))}</span>`;
}

// ─── Section builders (each returns an HTML string) ──────────────────────────

function buildStyles(): string {
  return `<style>
    *,*::before,*::after{box-sizing:border-box}
    body{font-family:system-ui,-apple-system,sans-serif;font-size:13px;line-height:1.55;
         color:#1e1e2e;background:#f8f8fc;margin:0;padding:24px}
    .page{max-width:1100px;margin:0 auto}
    h1{font-size:22px;font-weight:800;color:#1e1e2e;margin:0 0 4px}
    h2{font-size:15px;font-weight:700;color:#1e1e2e;margin:24px 0 12px;
       border-bottom:2px solid #e5e7eb;padding-bottom:6px}
    h3{font-size:13px;font-weight:700;color:#374151;margin:16px 0 8px}
    .meta{font-size:11px;color:#6b7280;margin-bottom:24px}
    .card{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:20px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,.05)}
    .stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:20px}
    .stat{background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;text-align:center;box-shadow:0 1px 2px rgba(0,0,0,.04)}
    .stat-num{font-size:28px;font-weight:800;line-height:1}
    .stat-lbl{font-size:11px;color:#6b7280;margin-top:4px;text-transform:uppercase;letter-spacing:.05em}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th{background:#f1f5f9;text-align:left;padding:8px 10px;font-weight:600;border:1px solid #e5e7eb;white-space:nowrap}
    td{padding:7px 10px;border:1px solid #e5e7eb;vertical-align:top}
    tr:nth-child(even) td{background:#f9fafb}
    .issue-block{border-left:3px solid;border-radius:4px;padding:8px 12px;margin:4px 0;font-size:11px}
    .tag{display:inline-block;font-size:10px;font-weight:600;padding:1px 6px;border-radius:4px;background:#f1f5f9;color:#374151;margin-right:4px}
    .progress-bar{height:8px;background:#e5e7eb;border-radius:99px;overflow:hidden;margin-top:6px}
    .progress-fill{height:100%;border-radius:99px}
    .two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    @media(max-width:640px){.two-col{grid-template-columns:1fr}.stat-grid{grid-template-columns:repeat(2,1fr)}}
  </style>`;
}

function buildHeader(generatedAt: string): string {
  return `
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
    <div style="width:40px;height:40px;background:linear-gradient(135deg,#6d28d9,#4f46e5);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px">📋</div>
    <div>
      <h1>Validation Report</h1>
      <p class="meta">Generated ${esc(generatedAt)}</p>
    </div>
  </div>`;
}

function buildSummaryStats(rows: QuestionRow[]): string {
  const counts = { valid: 0, rejected: 0, needs_review: 0, caution: 0, other: 0 };
  for (const r of rows) {
    if (r.status === 'valid')        counts.valid++;
    else if (r.status === 'rejected')    counts.rejected++;
    else if (r.status === 'needs_review') counts.needs_review++;
    else if (r.status === 'caution')  counts.caution++;
    else                              counts.other++;
  }
  const total = rows.length;
  const pct = (n: number) => total > 0 ? ((n / total) * 100).toFixed(1) : '0.0';

  const stats = [
    { num: total,               lbl: 'Total Rows',   color: '#6d28d9' },
    { num: counts.valid,        lbl: 'Valid',         color: '#16a34a' },
    { num: counts.rejected,     lbl: 'Rejected',      color: '#dc2626' },
    { num: counts.needs_review, lbl: 'Needs Review',  color: '#d97706' },
    { num: counts.caution,      lbl: 'Caution',       color: '#ca8a04' },
  ];

  const statHtml = stats.map(s =>
    `<div class="stat">
      <div class="stat-num" style="color:${s.color}">${s.num}</div>
      <div class="stat-lbl">${esc(s.lbl)}</div>
    </div>`
  ).join('');

  const passRate = pct(counts.valid + counts.caution);
  return `
  <h2>Summary</h2>
  <div class="stat-grid">${statHtml}</div>
  <div class="card" style="padding:14px 16px">
    <div style="display:flex;justify-content:space-between;font-size:11px;color:#6b7280;margin-bottom:4px">
      <span>Pass rate (valid + caution)</span><span style="font-weight:700;color:#1e1e2e">${passRate}%</span>
    </div>
    <div class="progress-bar">
      <div class="progress-fill" style="width:${passRate}%;background:linear-gradient(90deg,#16a34a,#4ade80)"></div>
    </div>
  </div>`;
}

function buildIssueSummary(rows: QuestionRow[]): string {
  // Aggregate issues by category and severity
  const catCounts: Record<string, number> = {};
  const sevCounts: Record<IssueSeverity, number> = { block: 0, review: 0, warning: 0, info: 0 };
  let totalIssues = 0;

  for (const row of rows) {
    for (const issue of (row.issues ?? [])) {
      totalIssues++;
      catCounts[issue.category] = (catCounts[issue.category] ?? 0) + 1;
      sevCounts[issue.severity] = (sevCounts[issue.severity] ?? 0) + 1;
    }
  }

  if (totalIssues === 0) {
    return `<h2>Issue Summary</h2><div class="card" style="text-align:center;color:#16a34a;padding:20px">✅ No validation issues found.</div>`;
  }

  const catRows = Object.entries(catCounts).map(([cat, count]) =>
    `<tr><td>${esc(CATEGORY_LABEL[cat as IssueCategory] ?? cat)}</td><td style="text-align:right;font-weight:700">${count}</td></tr>`
  ).join('');

  const sevRows = (Object.entries(sevCounts) as [IssueSeverity, number][]).filter(([,c]) => c > 0).map(([sev, count]) =>
    `<tr>
      <td><span style="color:${SEVERITY_COLOR[sev]};font-weight:700">${esc(sev.toUpperCase())}</span></td>
      <td style="text-align:right;font-weight:700">${count}</td>
    </tr>`
  ).join('');

  return `
  <h2>Issue Summary <span style="font-size:12px;font-weight:400;color:#6b7280">(${totalIssues} total)</span></h2>
  <div class="two-col">
    <div class="card">
      <h3>By Category</h3>
      <table><tbody>${catRows}</tbody></table>
    </div>
    <div class="card">
      <h3>By Severity</h3>
      <table><tbody>${sevRows}</tbody></table>
    </div>
  </div>`;
}

function buildCleaningSummary(cleaningResult: CleaningResult): string {
  const { metrics, logs } = cleaningResult;
  const topActions = Object.entries(metrics.actionBreakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  const actionRows = topActions.map(([action, count]) =>
    `<tr><td><span class="tag">${esc(action.replace(/_/g, ' '))}</span></td><td style="text-align:right;font-weight:700">${count}</td></tr>`
  ).join('');

  return `
  <h2>Cleaning Summary</h2>
  <div class="stat-grid" style="grid-template-columns:repeat(4,1fr)">
    ${[
      ['Rows Processed',   metrics.totalRowsProcessed],
      ['Fields Cleaned',   metrics.totalFieldsCleaned],
      ['Pass 1 Changes',   metrics.pass1Changes],
      ['Pass 2 Changes',   metrics.pass2Changes],
    ].map(([lbl, num]) => `<div class="stat"><div class="stat-num" style="color:#6d28d9">${num}</div><div class="stat-lbl">${lbl}</div></div>`).join('')}
  </div>
  ${topActions.length > 0 ? `<div class="card"><h3>Top Cleaning Actions</h3><table><tbody>${actionRows}</tbody></table></div>` : ''}`;
}

function buildManualFixSummary(
  suggestionResult: SuggestionResult,
  autoFixedRowIds: Set<string>,
): string {
  const auto  = autoFixedRowIds.size;
  const total = suggestionResult.suggestions.length;
  const applied = suggestionResult.autoApplicable.length;

  return `
  <h2>Manual Fix &amp; Suggestion Summary</h2>
  <div class="stat-grid" style="grid-template-columns:repeat(3,1fr)">
    ${[
      ['Suggestions Generated', total,   '#6d28d9'],
      ['Auto-Applied',          applied,  '#16a34a'],
      ['Rows Auto-Fixed',       auto,     '#2563eb'],
    ].map(([lbl, num, color]) => `<div class="stat"><div class="stat-num" style="color:${color}">${num}</div><div class="stat-lbl">${lbl}</div></div>`).join('')}
  </div>`;
}

function buildAiAuditSummary(audit: AiAuditSummary): string {
  return `
  <h2>AI Audit Summary</h2>
  <div class="stat-grid" style="grid-template-columns:repeat(3,1fr)">
    ${[
      ['Checked',    audit.totalChecked, '#6d28d9'],
      ['Flagged',    audit.flagged,      '#dc2626'],
      ['Auto-Fixed', audit.autoFixed,    '#16a34a'],
    ].map(([lbl, num, color]) => `<div class="stat"><div class="stat-num" style="color:${color}">${num}</div><div class="stat-lbl">${lbl}</div></div>`).join('')}
  </div>
  ${audit.notes ? `<div class="card" style="font-size:12px;color:#374151">${esc(audit.notes)}</div>` : ''}`;
}

function buildRowTable(rows: QuestionRow[]): string {
  const rowHtml = rows.map(row => {
    const qid  = esc(row.metadata?.questionId || row.id);
    const stem = esc((row.normalizedQuestion as any)?.stem?.slice(0, 80) ?? '—');
    const type = esc(row.normalizedQuestion?.type ?? '—');
    const issueHtml = (row.issues ?? []).map(issue =>
      `<div class="issue-block" style="border-color:${SEVERITY_COLOR[issue.severity]};background:${SEVERITY_BG[issue.severity]}">
        <span style="color:${SEVERITY_COLOR[issue.severity]};font-weight:700">${esc(issue.severity.toUpperCase())}</span>
        <span style="color:#6b7280;margin-left:4px">[${esc(CATEGORY_LABEL[issue.category] ?? issue.category)}]</span>
        <span style="margin-left:6px">${esc(issue.message)}</span>
        ${issue.field ? `<span class="tag" style="margin-left:6px">${esc(issue.field)}</span>` : ''}
      </div>`
    ).join('');

    return `<tr>
      <td style="font-family:monospace;font-size:11px;white-space:nowrap">${row.sourceRowNumber}</td>
      <td style="font-family:monospace;font-size:11px">${qid}</td>
      <td>${statusBadge(row.status)}</td>
      <td><span class="tag">${type}</span></td>
      <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${stem}">${stem}</td>
      <td style="min-width:220px">${issueHtml || '<span style="color:#16a34a;font-size:11px">✓ No issues</span>'}</td>
    </tr>`;
  }).join('');

  return `
  <h2>Row-Level Detail</h2>
  <div class="card" style="padding:0;overflow-x:auto">
    <table>
      <thead>
        <tr>
          <th>#</th><th>Question ID</th><th>Status</th><th>Type</th><th>Stem (preview)</th><th>Issues</th>
        </tr>
      </thead>
      <tbody>${rowHtml}</tbody>
    </table>
  </div>`;
}

// ─── Main builder ─────────────────────────────────────────────────────────────

export function buildValidationReport(input: ValidationReportInput): ValidationReportOutput {
  const generatedAt = input.generatedAt ?? new Date().toLocaleString();
  const { rows, cleaningResult, suggestionResult, autoFixedRowIds, aiAudit } = input;

  const sections: string[] = [
    buildStyles(),
    '<div class="page">',
    buildHeader(generatedAt),
    buildSummaryStats(rows),
    buildIssueSummary(rows),
    cleaningResult ? buildCleaningSummary(cleaningResult) : '',
    suggestionResult && autoFixedRowIds ? buildManualFixSummary(suggestionResult, autoFixedRowIds) : '',
    aiAudit ? buildAiAuditSummary(aiAudit) : '',
    buildRowTable(rows),
    '</div>',
  ];

  const html = `<!DOCTYPE html>\n<html lang="en">\n<head><meta charset="UTF-8"><title>Validation Report</title></head>\n<body>\n${sections.join('\n')}\n</body>\n</html>`;

  const timestamp = new Date().toISOString().slice(0, 10);
  const fileName = `validation_report_${timestamp}.html`;

  return {
    html,
    fileName,
    sizeBytes: new TextEncoder().encode(html).length,
  };
}

/**
 * Trigger a browser download of the validation report HTML.
 */
export function downloadValidationReport(input: ValidationReportInput): void {
  const { html, fileName } = buildValidationReport(input);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
