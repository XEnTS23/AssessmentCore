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

import { QuestionRow } from "../core/rowTypes";
import {
  ValidationIssue,
  IssueSeverity,
  IssueCategory,
} from "../core/issueTypes";
import { CleaningResult } from "../core/cleaningTypes";
import { SuggestionResult } from "../core/fixTypes";

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

// Palette mirrors the Husimi website theme tokens (src/styles/theme.css).
const THEME = {
  ink: "#111827",
  black: "#000000",
  muted: "#64748b",
  subtle: "#94a3b8",
  border: "#e2e8f0",
  borderLight: "#f1f5f9",
  surface: "#ffffff",
  background: "#f8fafc",
  accent: "#0b5a9a",
  accentLight: "#e0f0ff",
  success: "#16a34a",
  successLight: "#f0fdf4",
  warning: "#ea580c",
  warningLight: "#fff7ed",
  destructive: "#dc2626",
  destructiveLight: "#fef2f2",
};

const SEVERITY_COLOR: Record<IssueSeverity, string> = {
  block: THEME.destructive,
  engine_defect: "#991b1b",
  review: THEME.warning,
  warning: "#b45309",
  info: THEME.accent,
};

const SEVERITY_BG: Record<IssueSeverity, string> = {
  block: THEME.destructiveLight,
  engine_defect: "#fee2e2",
  review: THEME.warningLight,
  warning: "#fffbeb",
  info: THEME.accentLight,
};

const SEVERITY_LABEL: Record<IssueSeverity, string> = {
  block: "Block",
  engine_defect: "Engine Defect",
  review: "Review",
  warning: "Warning",
  info: "Info",
};

const CATEGORY_LABEL: Record<IssueCategory, string> = {
  structural: "Structural",
  content_quality: "Content Quality",
  type_suspicion: "Type Suspicion",
  metadata: "Metadata",
  media: "Media",
  scoring: "Scoring",
  export_readiness: "Export Readiness",
  ingestion: "Ingestion",
  academic_consistency: "Academic Consistency",
  rendering: "Rendering",
  export_assembly: "Export Assembly",
  system_defect: "System Defect",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function esc(s: string | undefined | null): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function statusBadge(status: QuestionRow["status"]): string {
  const map: Record<string, [string, string]> = {
    valid: [THEME.success, THEME.successLight],
    rejected: [THEME.destructive, THEME.destructiveLight],
    needs_review: [THEME.warning, THEME.warningLight],
    caution: ["#b45309", "#fffbeb"],
    raw: [THEME.muted, THEME.borderLight],
    normalized: [THEME.accent, THEME.accentLight],
  };
  const [color, bg] = map[status] ?? [THEME.muted, THEME.borderLight];
  return `<span class="pill" style="background:${bg};color:${color}"><span class="dot" style="background:${color}"></span>${esc(status.replace("_", " "))}</span>`;
}

function statTile(label: string, value: number | string, dotColor?: string): string {
  return `<div class="stat">
      <div class="stat-lbl">${dotColor ? `<span class="dot" style="background:${dotColor}"></span>` : ""}${esc(label)}</div>
      <div class="stat-num">${value}</div>
    </div>`;
}

/** Label / count row with a proportional bar, used in the issue breakdowns. */
function barRow(label: string, count: number, max: number, color: string): string {
  const width = max > 0 ? Math.max(2, (count / max) * 100) : 0;
  return `<tr>
      <td class="bar-lbl">${label}</td>
      <td class="bar-cell"><div class="bar"><div class="bar-fill" style="width:${width.toFixed(1)}%;background:${color}"></div></div></td>
      <td class="num">${count}</td>
    </tr>`;
}

function sectionHeading(index: number, title: string, aside = ""): string {
  return `<div class="section-head">
    <span class="section-idx">${String(index).padStart(2, "0")}</span>
    <h2>${title}</h2>
    ${aside ? `<span class="section-aside">${aside}</span>` : ""}
  </div>`;
}

// ─── Section builders (each returns an HTML string) ──────────────────────────

function buildStyles(): string {
  return `<link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=Roboto+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    *,*::before,*::after{box-sizing:border-box}
    body{font-family:"Archivo","Segoe UI",Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.55;
         color:${THEME.ink};background:${THEME.background};margin:0;padding:32px 24px;
         -webkit-font-smoothing:antialiased}
    .mono{font-family:"Roboto Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
    .page{max-width:1100px;margin:0 auto;background:${THEME.surface};border:1px solid ${THEME.border};
          border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.06);overflow:hidden}
    .page-inner{padding:32px 40px 40px}

    /* Brand bar */
    .brandbar{display:flex;align-items:center;justify-content:space-between;gap:16px;
              padding:16px 40px;border-bottom:1px solid ${THEME.border}}
    .brand{display:flex;align-items:center;gap:10px;text-decoration:none}
    .brand-mark{display:flex;align-items:center;justify-content:center;width:30px;height:30px;
                border-radius:8px;background:${THEME.black};color:#fff;font-weight:800;font-size:15px;letter-spacing:-.04em}
    .brand-name{display:flex;flex-direction:column;line-height:1.05}
    .brand-name b{font-size:14px;font-weight:600;letter-spacing:-.01em;color:${THEME.ink}}
    .brand-name span{font-size:12px;color:${THEME.muted}}
    .doc-type{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.12em;color:${THEME.muted}}

    /* Title block */
    .title-block{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;flex-wrap:wrap;
                 padding-bottom:24px;border-bottom:1px solid ${THEME.border};margin-bottom:8px}
    .eyebrow{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.12em;color:${THEME.accent};margin:0 0 6px}
    h1{font-size:26px;font-weight:700;letter-spacing:-.02em;color:${THEME.black};margin:0}
    .subtitle{font-size:13px;color:${THEME.muted};margin:6px 0 0}
    .meta-grid{display:grid;grid-template-columns:auto auto;gap:4px 16px;font-size:12px}
    .meta-grid dt{color:${THEME.muted}}
    .meta-grid dd{margin:0;font-weight:600;text-align:right}

    /* Sections */
    .section{margin-top:32px}
    .section-head{display:flex;align-items:baseline;gap:10px;margin-bottom:14px}
    .section-idx{font-family:"Roboto Mono",ui-monospace,monospace;font-size:11px;color:${THEME.subtle}}
    h2{font-size:16px;font-weight:600;letter-spacing:-.01em;color:${THEME.black};margin:0}
    .section-aside{margin-left:auto;font-size:12px;color:${THEME.muted}}
    h3{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:${THEME.muted};margin:0 0 12px}
    .card{background:${THEME.surface};border:1px solid ${THEME.border};border-radius:10px;padding:20px}
    .note{font-size:12px;color:#374151;margin-top:12px}

    /* Stats */
    .stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:0;
               border:1px solid ${THEME.border};border-radius:10px;overflow:hidden}
    .stat{padding:16px 18px;border-right:1px solid ${THEME.border};background:${THEME.surface}}
    .stat:last-child{border-right:none}
    .stat-lbl{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:500;color:${THEME.muted};
              text-transform:uppercase;letter-spacing:.06em}
    .stat-num{font-size:26px;font-weight:700;letter-spacing:-.02em;color:${THEME.black};margin-top:6px;line-height:1}
    .dot{display:inline-block;width:7px;height:7px;border-radius:99px;flex:none}

    /* Pass rate */
    .rate{display:flex;align-items:center;gap:20px;margin-top:16px;padding:16px 18px;
          background:${THEME.background};border:1px solid ${THEME.border};border-radius:10px}
    .rate-num{font-size:22px;font-weight:700;letter-spacing:-.02em;min-width:76px}
    .rate-body{flex:1}
    .rate-lbl{font-size:12px;color:${THEME.muted};margin-bottom:8px}
    .track{height:6px;background:${THEME.border};border-radius:99px;overflow:hidden}
    .track-fill{height:100%;border-radius:99px;background:${THEME.black}}

    /* Tables */
    table{width:100%;border-collapse:collapse;font-size:12px}
    .bars td{padding:7px 0;border-bottom:1px solid ${THEME.borderLight};vertical-align:middle}
    .bars tr:last-child td{border-bottom:none}
    .bar-lbl{width:42%;padding-right:12px!important;color:#374151}
    .bar-cell{width:46%}
    .bar{height:6px;background:${THEME.borderLight};border-radius:99px;overflow:hidden}
    .bar-fill{height:100%;border-radius:99px}
    .num{text-align:right;font-weight:600;font-variant-numeric:tabular-nums;padding-left:12px!important}
    .two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px}

    .detail{border:1px solid ${THEME.border};border-radius:10px;overflow-x:auto}
    .detail th{background:${THEME.background};text-align:left;padding:10px 12px;font-size:10px;font-weight:600;
               text-transform:uppercase;letter-spacing:.08em;color:${THEME.muted};
               border-bottom:1px solid ${THEME.border};white-space:nowrap}
    .detail td{padding:10px 12px;border-bottom:1px solid ${THEME.borderLight};vertical-align:top}
    .detail tr:last-child td{border-bottom:none}
    .detail tbody tr:hover td{background:#fbfcfe}

    .pill{display:inline-flex;align-items:center;gap:5px;font-size:10px;font-weight:600;text-transform:uppercase;
          letter-spacing:.06em;padding:2px 8px;border-radius:99px;white-space:nowrap}
    .tag{display:inline-block;font-size:10px;font-weight:500;padding:1px 6px;border-radius:4px;
         background:${THEME.borderLight};color:#334155;border:1px solid ${THEME.border};margin-right:4px}
    .issue{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 8px;border-left:2px solid;
           padding:6px 10px;margin:0 0 4px;font-size:11px;border-radius:0 6px 6px 0}
    .issue:last-child{margin-bottom:0}
    .issue-sev{font-weight:700;text-transform:uppercase;letter-spacing:.06em;font-size:10px}
    .issue-cat{color:${THEME.muted}}
    .issue-msg{color:${THEME.ink};flex-basis:100%}
    .ok{display:inline-flex;align-items:center;gap:6px;color:${THEME.success};font-size:11px;font-weight:500}
    .empty{display:flex;align-items:center;gap:10px;color:${THEME.success};font-weight:500}

    /* Footer */
    .footer{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:16px 40px;
            border-top:1px solid ${THEME.border};background:${THEME.background};font-size:11px;color:${THEME.muted}}

    @media(max-width:720px){
      body{padding:16px}
      .page-inner{padding:24px 20px 28px}
      .brandbar,.footer{padding-left:20px;padding-right:20px}
      .two-col{grid-template-columns:1fr}
      .stat-grid{grid-template-columns:repeat(2,1fr)}
      .stat{border-bottom:1px solid ${THEME.border}}
    }
    @media print{
      body{background:#fff;padding:0}
      .page{border:none;box-shadow:none;border-radius:0;max-width:none}
      .section{break-inside:avoid-page}
      .detail{overflow:visible}
      .detail tr{break-inside:avoid}
      *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    }
  </style>`;
}

function buildBrandBar(): string {
  return `
  <div class="brandbar">
    <div class="brand">
      <span class="brand-mark">H</span>
      <span class="brand-name"><b>Husimi</b><span>Solutions</span></span>
    </div>
    <span class="doc-type">Quality Assurance Report</span>
  </div>`;
}

function buildHeader(generatedAt: string, rows: QuestionRow[]): string {
  return `
  <div class="title-block">
    <div>
      <p class="eyebrow">Question Bank Validation</p>
      <h1>Validation Report</h1>
      <p class="subtitle">Structural, content and export-readiness checks across all imported questions.</p>
    </div>
    <dl class="meta-grid" style="margin:0">
      <dt>Generated</dt><dd>${esc(generatedAt)}</dd>
      <dt>Questions</dt><dd>${rows.length}</dd>
    </dl>
  </div>`;
}

function buildSummaryStats(rows: QuestionRow[], index: number): string {
  const counts = {
    valid: 0,
    rejected: 0,
    needs_review: 0,
    caution: 0,
    other: 0,
  };
  for (const r of rows) {
    if (r.status === "valid") counts.valid++;
    else if (r.status === "rejected") counts.rejected++;
    else if (r.status === "needs_review") counts.needs_review++;
    else if (r.status === "caution") counts.caution++;
    else counts.other++;
  }
  const total = rows.length;
  const pct = (n: number) =>
    total > 0 ? ((n / total) * 100).toFixed(1) : "0.0";

  const statHtml = [
    statTile("Total Rows", total),
    statTile("Valid", counts.valid, THEME.success),
    statTile("Rejected", counts.rejected, THEME.destructive),
    statTile("Needs Review", counts.needs_review, THEME.warning),
    statTile("Caution", counts.caution, "#b45309"),
  ].join("");

  const passRate = pct(counts.valid + counts.caution);
  return `
  <section class="section">
    ${sectionHeading(index, "Summary")}
    <div class="stat-grid">${statHtml}</div>
    <div class="rate">
      <div class="rate-num">${passRate}%</div>
      <div class="rate-body">
        <div class="rate-lbl">Pass rate (valid + caution)</div>
        <div class="track"><div class="track-fill" style="width:${passRate}%"></div></div>
      </div>
    </div>
  </section>`;
}

function buildIssueSummary(rows: QuestionRow[], index: number): string {
  // Aggregate issues by category and severity
  const catCounts: Record<string, number> = {};
  const sevCounts: Record<IssueSeverity, number> = {
    block: 0,
    engine_defect: 0,
    review: 0,
    warning: 0,
    info: 0,
  };
  let totalIssues = 0;

  for (const row of rows) {
    for (const issue of row.issues ?? []) {
      totalIssues++;
      catCounts[issue.category] = (catCounts[issue.category] ?? 0) + 1;
      sevCounts[issue.severity] = (sevCounts[issue.severity] ?? 0) + 1;
    }
  }

  if (totalIssues === 0) {
    return `
  <section class="section">
    ${sectionHeading(index, "Issue Summary")}
    <div class="card empty"><span class="dot" style="background:${THEME.success}"></span>No validation issues found.</div>
  </section>`;
  }

  const catEntries = Object.entries(catCounts).sort(([, a], [, b]) => b - a);
  const catMax = Math.max(...catEntries.map(([, c]) => c));
  const catRows = catEntries
    .map(([cat, count]) =>
      barRow(
        esc(CATEGORY_LABEL[cat as IssueCategory] ?? cat),
        count,
        catMax,
        THEME.accent,
      ),
    )
    .join("");

  const sevEntries = (
    Object.entries(sevCounts) as [IssueSeverity, number][]
  ).filter(([, c]) => c > 0);
  const sevMax = Math.max(...sevEntries.map(([, c]) => c));
  const sevRows = sevEntries
    .map(([sev, count]) =>
      barRow(
        `<span style="display:inline-flex;align-items:center;gap:6px"><span class="dot" style="background:${SEVERITY_COLOR[sev]}"></span>${esc(SEVERITY_LABEL[sev])}</span>`,
        count,
        sevMax,
        SEVERITY_COLOR[sev],
      ),
    )
    .join("");

  return `
  <section class="section">
    ${sectionHeading(index, "Issue Summary", `${totalIssues} total`)}
    <div class="two-col">
      <div class="card">
        <h3>By Category</h3>
        <table class="bars"><tbody>${catRows}</tbody></table>
      </div>
      <div class="card">
        <h3>By Severity</h3>
        <table class="bars"><tbody>${sevRows}</tbody></table>
      </div>
    </div>
  </section>`;
}

function buildCleaningSummary(
  cleaningResult: CleaningResult,
  index: number,
): string {
  const { metrics } = cleaningResult;
  const topActions = Object.entries(metrics.actionBreakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);
  const actionMax = topActions.length > 0 ? topActions[0][1] : 0;

  const actionRows = topActions
    .map(([action, count]) =>
      barRow(
        `<span class="tag">${esc(action.replace(/_/g, " "))}</span>`,
        count,
        actionMax,
        THEME.ink,
      ),
    )
    .join("");

  return `
  <section class="section">
    ${sectionHeading(index, "Cleaning Summary")}
    <div class="stat-grid">
      ${statTile("Rows Processed", metrics.totalRowsProcessed)}
      ${statTile("Fields Cleaned", metrics.totalFieldsCleaned)}
      ${statTile("Pass 1 Changes", metrics.pass1Changes)}
      ${statTile("Pass 2 Changes", metrics.pass2Changes)}
    </div>
    ${topActions.length > 0 ? `<div class="card" style="margin-top:16px"><h3>Top Cleaning Actions</h3><table class="bars"><tbody>${actionRows}</tbody></table></div>` : ""}
  </section>`;
}

function buildManualFixSummary(
  suggestionResult: SuggestionResult,
  autoFixedRowIds: Set<string>,
  index: number,
): string {
  const auto = autoFixedRowIds.size;
  const total = suggestionResult.suggestions.length;
  const applied = suggestionResult.autoApplicable.length;

  return `
  <section class="section">
    ${sectionHeading(index, "Manual Fix &amp; Suggestion Summary")}
    <div class="stat-grid">
      ${statTile("Suggestions Generated", total)}
      ${statTile("Auto-Applied", applied, THEME.success)}
      ${statTile("Rows Auto-Fixed", auto, THEME.accent)}
    </div>
  </section>`;
}

function buildAiAuditSummary(audit: AiAuditSummary, index: number): string {
  return `
  <section class="section">
    ${sectionHeading(index, "AI Audit Summary")}
    <div class="stat-grid">
      ${statTile("Checked", audit.totalChecked)}
      ${statTile("Flagged", audit.flagged, THEME.destructive)}
      ${statTile("Auto-Fixed", audit.autoFixed, THEME.success)}
    </div>
    ${audit.notes ? `<div class="card note">${esc(audit.notes)}</div>` : ""}
  </section>`;
}

function buildRowTable(rows: QuestionRow[], index: number): string {
  const rowHtml = rows
    .map((row) => {
      const qid = esc(row.metadata?.questionId || row.id);
      const stem = esc(
        (row.normalizedQuestion as any)?.stem?.slice(0, 80) ?? "—",
      );
      const type = esc(row.normalizedQuestion?.type ?? "—");
      const issueHtml = (row.issues ?? [])
        .map(
          (issue) =>
            `<div class="issue" style="border-color:${SEVERITY_COLOR[issue.severity]};background:${SEVERITY_BG[issue.severity]}">
        <span class="issue-sev" style="color:${SEVERITY_COLOR[issue.severity]}">${esc(SEVERITY_LABEL[issue.severity] ?? issue.severity)}</span>
        <span class="issue-cat">${esc(CATEGORY_LABEL[issue.category] ?? issue.category)}</span>
        ${issue.field ? `<span class="tag mono">${esc(issue.field)}</span>` : ""}
        <span class="issue-msg">${esc(issue.message)}</span>
      </div>`,
        )
        .join("");

      return `<tr>
      <td class="mono" style="font-size:11px;white-space:nowrap;color:${THEME.muted}">${row.sourceRowNumber}</td>
      <td class="mono" style="font-size:11px">${qid}</td>
      <td>${statusBadge(row.status)}</td>
      <td><span class="tag">${type}</span></td>
      <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${stem}">${stem}</td>
      <td style="min-width:240px">${issueHtml || `<span class="ok"><span class="dot" style="background:${THEME.success}"></span>No issues</span>`}</td>
    </tr>`;
    })
    .join("");

  return `
  <section class="section">
    ${sectionHeading(index, "Row-Level Detail", `${rows.length} rows`)}
    <div class="detail">
      <table>
        <thead>
          <tr>
            <th>#</th><th>Question ID</th><th>Status</th><th>Type</th><th>Stem (preview)</th><th>Issues</th>
          </tr>
        </thead>
        <tbody>${rowHtml}</tbody>
      </table>
    </div>
  </section>`;
}

function buildFooter(generatedAt: string): string {
  return `
  <div class="footer">
    <span>Prepared by <b style="color:${THEME.ink};font-weight:600">Husimi Solutions</b> &middot; Confidential</span>
    <span>${esc(generatedAt)}</span>
  </div>`;
}

// ─── Main builder ─────────────────────────────────────────────────────────────

export function buildValidationReport(
  input: ValidationReportInput,
): ValidationReportOutput {
  const generatedAt = input.generatedAt ?? new Date().toLocaleString();
  const { rows, cleaningResult, suggestionResult, autoFixedRowIds, aiAudit } =
    input;

  // Section numbers follow only the sections actually present.
  let n = 0;
  const sections: string[] = [
    '<div class="page">',
    buildBrandBar(),
    '<div class="page-inner">',
    buildHeader(generatedAt, rows),
    buildSummaryStats(rows, ++n),
    buildIssueSummary(rows, ++n),
    cleaningResult ? buildCleaningSummary(cleaningResult, ++n) : "",
    suggestionResult && autoFixedRowIds
      ? buildManualFixSummary(suggestionResult, autoFixedRowIds, ++n)
      : "",
    aiAudit ? buildAiAuditSummary(aiAudit, ++n) : "",
    buildRowTable(rows, ++n),
    "</div>",
    buildFooter(generatedAt),
    "</div>",
  ];

  const html = `<!DOCTYPE html>\n<html lang="en">\n<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Validation Report · Husimi Solutions</title>\n${buildStyles()}\n</head>\n<body>\n${sections.join("\n")}\n</body>\n</html>`;

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
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
