export type IssueSeverity =
  | "block"
  | "review"
  | "warning"
  | "info"
  | "engine_defect";

export type IssueCategory =
  | "structural"
  | "content_quality"
  | "type_suspicion"
  | "metadata"
  | "media"
  | "scoring"
  | "export_readiness"
  | "ingestion"
  | "academic_consistency"
  | "rendering"
  | "export_assembly"
  | "system_defect";

export interface FixSuggestion {
  id: string;
  description: string;
  patch: Record<string, any>;
}

export interface AllowedCorrection {
  actionId: string;
  label: string;
  mode: "safe_auto" | "suggested" | "manual_only";
  proposedValue?: unknown;
}

export interface RelatedRowRef {
  submissionId?: string;
  questionId?: string;
  similarityScore?: number;
}

export type CanonicalProblem =
  | "POSITIVE_MARKS_INVALID"
  | "NEGATIVE_MARKS_INVALID"
  | "NEGATIVE_MARKS_EXCEED_POSITIVE"
  | "MALFORMED_LATEX_DELIMITER"
  | "ANSWER_NOT_IN_OPTIONS"
  | "MULTIPLE_ANSWERS_FOR_SCQ"
  | "UNIT_POLICY_INVALID"
  | "INTEGER_ANSWER_NOT_INTEGER"
  | "UNIT_EMBEDDED_IN_NUMERIC_ANSWER"
  | "COPYRIGHT_UNVERIFIED"
  | "BROKEN_ENCODING"
  | "AMBIGUOUS_MEDIA_FILENAME"
  | "WRONG_SUBJECT_TAG"
  | "NONSTANDARD_DIFFICULTY"
  | "VERSION_TIMESTAMP_CONFLICT"
  | "PARTIAL_MARKING_AMBIGUOUS"
  | "EXPLANATION_FORMAT_INCOMPATIBLE"
  | string;

export interface ValidationIssue {
  id: string;
  issueId?: string;
  ruleId: string;
  canonicalProblem?: CanonicalProblem;
  dedupeKey?: string;
  suppressedRuleIds?: string[];
  duplicateGroupId?: string;
  rowId: string;
  submissionId?: string;
  questionId?: string;
  field?: string;
  category: IssueCategory;
  severity: IssueSeverity;
  scope?: "cell" | "row" | "batch" | "package";
  rawValue?: unknown;
  normalizedValue?: unknown;
  message: string;
  evidence?: Record<string, unknown>;
  suggestedFixes?: FixSuggestion[];
  relatedRows?: RelatedRowRef[];
  allowedCorrections?: AllowedCorrection[];
  blocksExport?: boolean;
  invalidatesApprovals?: string[];
}

export interface BatchIssue extends ValidationIssue {
  scope: "batch";
}

export interface RowIssue extends ValidationIssue {
  scope: "row";
  rowNumber: number;
  questionId: string;
}
