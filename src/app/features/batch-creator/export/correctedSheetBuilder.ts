/**
 * Corrected Sheet Builder
 *
 * Converts the final QuestionRow[] into a downloadable CSV or XLSX-compatible
 * TSV file that reflects all cleaning and manual fixes applied during the wizard.
 *
 * Design decisions:
 *   - No third-party spreadsheet library dependency for CSV.
 *   - The exported rows match the original column order where possible, then
 *     append computed fields (status, issues, cleaned, question_type).
 *   - Each row's issues are serialised as a semicolon-separated list so the
 *     sheet remains a valid flat file.
 *   - Kept pure (no DOM calls) so it is testable without a browser.
 *   - A separate `downloadCorrectedSheet` helper handles the Blob + anchor dance.
 */

import { QuestionRow } from '../core/rowTypes';
import { McqQuestion, MsqQuestion, TextEntryQuestion } from '../core/questionTypes';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CorrectedSheetOptions {
  /** Include the original raw values alongside the corrected values. Default: false */
  includeRawValues?: boolean;
  /** Include per-row issue list. Default: true */
  includeIssues?: boolean;
  /** Include scoring config. Default: true */
  includeScoring?: boolean;
  /** File format: 'csv' (default) or 'tsv' */
  format?: 'csv' | 'tsv';
}

export interface CorrectedSheetOutput {
  /** CSV or TSV string */
  data: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  rowCount: number;
}

// ─── CSV / TSV helpers ────────────────────────────────────────────────────────

function csvCell(value: unknown, delimiter: string): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Always quote if delimiter, newline, or double-quote present
  if (str.includes(delimiter) || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildRow(cells: unknown[], delimiter: string): string {
  return cells.map(c => csvCell(c, delimiter)).join(delimiter);
}

// ─── Field extractors ─────────────────────────────────────────────────────────

function extractOptions(row: QuestionRow): { a?: string; b?: string; c?: string; d?: string; e?: string } {
  const q = row.normalizedQuestion;
  if (!q || (q.type !== 'MCQ' && q.type !== 'MSQ')) return {};
  const opts: Record<string, string> = {};
  for (const opt of (q as McqQuestion | MsqQuestion).options) {
    opts[opt.label?.toLowerCase() ?? ''] = opt.text;
  }
  return { a: opts['a'], b: opts['b'], c: opts['c'], d: opts['d'], e: opts['e'] };
}

function extractCorrectAnswer(row: QuestionRow): string {
  const q = row.normalizedQuestion;
  if (!q) return '';
  if (q.type === 'MCQ') return (q as McqQuestion).correctAnswerId ?? '';
  if (q.type === 'MSQ') return (q as MsqQuestion).correctAnswerIds?.join('; ') ?? '';
  if (q.type === 'TEXT_ENTRY') return (q as TextEntryQuestion).acceptedAnswers?.join(' | ') ?? '';
  return '';
}

function serializeIssues(row: QuestionRow): string {
  if (!row.issues?.length) return '';
  return row.issues
    .map(i => `[${i.severity.toUpperCase()}] ${i.message}`)
    .join('; ');
}

// ─── Main builder ─────────────────────────────────────────────────────────────

export function buildCorrectedSheet(
  rows: QuestionRow[],
  options: CorrectedSheetOptions = {},
): CorrectedSheetOutput {
  const {
    includeRawValues = false,
    includeIssues    = true,
    includeScoring   = true,
    format           = 'csv',
  } = options;

  const delim = format === 'tsv' ? '\t' : ',';

  // ── Header row ────────────────────────────────────────────────────────
  const headers: string[] = [
    'row_number',
    'question_id',
    'status',
    'question_type',
    'question_stem',
    'option_a',
    'option_b',
    'option_c',
    'option_d',
    'option_e',
    'correct_answer',
    'explanation',
    'subject',
    'chapter',
    'topic',
    'difficulty',
    'source_exam',
    'year',
    'language',
  ];

  if (includeScoring) {
    headers.push('marks', 'negative_marks');
  }

  if (includeIssues) {
    headers.push('issue_count', 'issues');
  }

  if (includeRawValues) {
    headers.push('_raw_stem', '_raw_correct_answer');
  }

  // ── Data rows ─────────────────────────────────────────────────────────
  const dataRows = rows.map(row => {
    const q    = row.normalizedQuestion;
    const meta = row.metadata ?? {};
    const opts = extractOptions(row);
    const stem = (q as any)?.stem ?? '';
    const explanation = (q as any)?.explanation ?? '';

    const cells: unknown[] = [
      row.sourceRowNumber,
      meta.questionId ?? row.id,
      row.status,
      q?.type ?? 'UNKNOWN',
      stem,
      opts.a ?? '',
      opts.b ?? '',
      opts.c ?? '',
      opts.d ?? '',
      opts.e ?? '',
      extractCorrectAnswer(row),
      explanation,
      meta.subject ?? '',
      meta.chapter ?? '',
      meta.topic ?? '',
      meta.difficulty ?? '',
      meta.sourceExam ?? '',
      meta.year ?? '',
      meta.language ?? '',
    ];

    if (includeScoring) {
      cells.push(
        row.scoringConfig?.marks ?? '',
        meta.negativeMarks ?? '',
      );
    }

    if (includeIssues) {
      cells.push(
        row.issues?.length ?? 0,
        serializeIssues(row),
      );
    }

    if (includeRawValues) {
      cells.push(
        row.rawRow?.['stem'] ?? row.rawRow?.['question'] ?? '',
        row.rawRow?.['answer'] ?? row.rawRow?.['correct_answer'] ?? '',
      );
    }

    return cells;
  });

  // ── Assemble ──────────────────────────────────────────────────────────
  const lines = [
    buildRow(headers, delim),
    ...dataRows.map(cells => buildRow(cells, delim)),
  ];

  const data     = lines.join('\r\n');
  const timestamp = new Date().toISOString().slice(0, 10);
  const ext      = format === 'tsv' ? 'tsv' : 'csv';
  const fileName = `corrected_sheet_${timestamp}.${ext}`;
  const mimeType = format === 'tsv' ? 'text/tab-separated-values;charset=utf-8' : 'text/csv;charset=utf-8';
  const sizeBytes = new TextEncoder().encode(data).length;

  return { data, fileName, mimeType, sizeBytes, rowCount: rows.length };
}

/**
 * Trigger a browser download of the corrected sheet.
 */
export function downloadCorrectedSheet(
  rows: QuestionRow[],
  options: CorrectedSheetOptions = {},
): void {
  const { data, fileName, mimeType } = buildCorrectedSheet(rows, options);
  // Prepend UTF-8 BOM so Excel opens CSV with correct encoding
  const bom  = '\uFEFF';
  const blob = new Blob([bom + data], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
