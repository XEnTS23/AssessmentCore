import { ExportConfig } from '../core/exportTypes';
import { QuestionRow } from '../core/rowTypes';

export interface ExportReadinessIssue {
  id: string;
  type: 'row' | 'config';
  rowId?: string;
  severity: 'block' | 'warning';
  message: string;
}

export interface ExportReadinessResult {
  isReady: boolean;
  issues: ExportReadinessIssue[];
}

export type ReadinessRule = (config: ExportConfig, rows: QuestionRow[]) => ExportReadinessIssue[];

// ─── Row Status Rules ──────────────────────────────────────────────────

const noRejectedRows: ReadinessRule = (config, rows) => {
  return rows.filter(r => r.status === 'rejected').map(r => ({
    id: crypto.randomUUID(),
    type: 'row',
    rowId: r.id,
    severity: 'block',
    message: `Row ${r.sourceRowNumber} is rejected and cannot be exported.`
  }));
};

const noUnknownRows: ReadinessRule = (config, rows) => {
  return rows.filter(r => r.normalizedQuestion?.type === 'UNKNOWN').map(r => ({
    id: crypto.randomUUID(),
    type: 'row',
    rowId: r.id,
    severity: 'block',
    message: `Row ${r.sourceRowNumber} has an UNKNOWN question type.`
  }));
};

const reviewRowsNeedApproval: ReadinessRule = (config, rows) => {
  return rows.filter(r => r.status === 'needs_review').map(r => ({
    id: crypto.randomUUID(),
    type: 'row',
    rowId: r.id,
    severity: 'warning',
    message: `Row ${r.sourceRowNumber} is still marked for review. It will be exported as-is.`
  }));
};

// ─── QTI Compatibility Rules ───────────────────────────────────────────

const qtiCompatibility: ReadinessRule = (config, rows) => {
  const issues: ExportReadinessIssue[] = [];
  const isQti = config.target === 'qti_2_1' || config.target === 'qti_3_0';

  if (!isQti) return issues;

  if (config.mediaMode === 'keep_public_url') {
    issues.push({
      id: crypto.randomUUID(),
      type: 'config',
      severity: 'warning',
      message: 'QTI typically requires media to be packaged. Keeping public URLs may not render correctly in some LMS.'
    });
  }

  if (config.scoring.mode === 'advanced') {
    if (config.scoring.partialMarking.enabled && config.target === 'qti_2_1') {
      issues.push({
        id: crypto.randomUUID(),
        type: 'config',
        severity: 'warning',
        message: 'Partial marking support in QTI 2.1 is inconsistent across LMS platforms.'
      });
    }
  }

  return issues;
};

/**
 * QTI 3.0 specific checks.
 * Formula-mode TEXT_ENTRY cannot be represented in standard QTI 3.0 XML.
 */
const qti30Compatibility: ReadinessRule = (config, rows) => {
  if (config.target !== 'qti_3_0') return [];

  return rows
    .filter(r => r.normalizedQuestion?.type === 'TEXT_ENTRY' && (r.normalizedQuestion as any).mode === 'formula')
    .map(r => ({
      id: crypto.randomUUID(),
      type: 'row' as const,
      rowId: r.id,
      severity: 'block' as const,
      message: `Row ${r.sourceRowNumber}: formula-mode TEXT_ENTRY is not supported in QTI 3.0.`,
    }));
};

// ─── Identifiers Rules ─────────────────────────────────────────────────

const identifierIntegrity: ReadinessRule = (config, rows) => {
  const issues: ExportReadinessIssue[] = [];
  const ids = new Set<string>();

  for (const row of rows) {
    const qid = row.metadata.questionId;
    if (!qid) {
      issues.push({
        id: crypto.randomUUID(),
        type: 'row',
        rowId: row.id,
        severity: 'block',
        message: `Row ${row.sourceRowNumber} is missing a Question ID.`
      });
    } else {
      if (ids.has(qid)) {
        issues.push({
          id: crypto.randomUUID(),
          type: 'row',
          rowId: row.id,
          severity: 'block',
          message: `Row ${row.sourceRowNumber} has a duplicate Question ID: ${qid}`
        });
      }
      ids.add(qid);

      // XML-safe check
      if (!/^[a-zA-Z_][a-zA-Z0-9_.-]*$/.test(qid)) {
        issues.push({
          id: crypto.randomUUID(),
          type: 'row',
          rowId: row.id,
          severity: config.target.startsWith('qti') ? 'block' : 'warning',
          message: `Row ${row.sourceRowNumber} has an identifier that is not XML-safe: ${qid}`
        });
      }
    }
  }

  return issues;
};

// ─── Run All ───────────────────────────────────────────────────────────

export function checkExportReadiness(config: ExportConfig, rows: QuestionRow[]): ExportReadinessResult {
  const allRules: ReadinessRule[] = [
    noRejectedRows,
    noUnknownRows,
    reviewRowsNeedApproval,
    qtiCompatibility,
    qti30Compatibility,
    identifierIntegrity
  ];

  const issues = allRules.flatMap(rule => rule(config, rows));
  const hasBlockers = issues.some(i => i.severity === 'block');

  return {
    isReady: !hasBlockers,
    issues
  };
}
