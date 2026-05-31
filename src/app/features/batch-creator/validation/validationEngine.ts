import { QuestionRow } from '../core/rowTypes';
import { ValidationIssue, IssueSeverity, IssueCategory } from '../core/issueTypes';
import { ColumnMapping } from '../normalization/normalizeAnswer';

export interface ValidationContext {
  allRows: QuestionRow[];
  columnMapping: ColumnMapping;
  exportConfig?: any;
  featureFlags?: Record<string, boolean>;
}

export interface ValidationRule {
  id: string;
  name: string;
  category: IssueCategory;
  severity: IssueSeverity;
  priority: number;
  appliesTo: 'all' | Array<'MCQ' | 'MSQ' | 'TEXT_ENTRY' | 'ORDER' | 'UNKNOWN'>;
  validate(row: QuestionRow, context: ValidationContext): ValidationIssue[];
}

export class ValidationEngine {
  private rules: ValidationRule[] = [];

  constructor(rules: ValidationRule[]) {
    this.rules = rules.sort((a, b) => b.priority - a.priority);
  }

  public validateRow(row: QuestionRow, context: ValidationContext): QuestionRow {
    const issues: ValidationIssue[] = [];

    for (const rule of this.rules) {
      const qType = row.normalizedQuestion?.type || 'UNKNOWN';
      
      if (rule.appliesTo === 'all' || rule.appliesTo.includes(qType)) {
        const ruleIssues = rule.validate(row, context);
        issues.push(...ruleIssues);
      }
    }

    const hasBlock = issues.some(i => i.severity === 'block');
    const hasReview = issues.some(i => i.severity === 'review');
    const hasWarning = issues.some(i => i.severity === 'warning');

    let status: QuestionRow['status'] = 'valid';
    if (hasBlock) {
      status = 'rejected';
    } else if (hasReview) {
      status = 'needs_review';
    } else if (hasWarning) {
      status = 'caution';
    }

    return {
      ...row,
      status,
      issues
    };
  }

  public validateBatch(rows: QuestionRow[], context: ValidationContext): QuestionRow[] {
    return rows.map(row => this.validateRow(row, context));
  }
}
