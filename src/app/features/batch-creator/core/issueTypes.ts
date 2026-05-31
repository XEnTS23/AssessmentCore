export type IssueSeverity = 'block' | 'review' | 'warning' | 'info';

export type IssueCategory = 
  | "structural"
  | "content_quality"
  | "type_suspicion"
  | "metadata"
  | "media"
  | "scoring"
  | "export_readiness";

export interface FixSuggestion {
  id: string;
  description: string;
  patch: Record<string, any>;
}

export interface ValidationIssue {
  id: string;
  ruleId: string;
  rowId: string;
  field?: string;
  category: IssueCategory;
  severity: IssueSeverity;
  message: string;
  evidence?: Record<string, unknown>;
  suggestedFixes?: FixSuggestion[];
}
