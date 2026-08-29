import { QuestionRow } from "./rowTypes";

// ─── Row Patch ───────────────────────────────────────────────────────

export interface RowPatchChange {
  /** Dot-path to the field, e.g. "normalizedQuestion.correctAnswerId" */
  path: string;
  before: unknown;
  after: unknown;
}

export interface RowPatch {
  rowId: string;
  changes: RowPatchChange[];
}

export type PatchFailureReason =
  | "row_mismatch"
  | "empty_patch"
  | "invalid_path"
  | "unsafe_path"
  | "duplicate_path"
  | "missing_parent"
  | "stale_value"
  | "no_change"
  | "validation_regression"
  | "target_issue_not_resolved";

export interface PatchIssueProfile {
  block: number;
  review: number;
  warning: number;
  info: number;
}

// ─── Fix Suggestion ──────────────────────────────────────────────────

export interface FixSuggestion {
  id: string;
  /** The issue that triggered this suggestion */
  issueId: string;
  /** The rule that triggered the issue */
  ruleId: string;
  /** Human-readable label for UI display */
  label: string;
  /** How confident the system is about this fix */
  confidence: "high" | "medium" | "low";
  /** If true, the system may apply this fix without user confirmation */
  autoApplicable: boolean;
  /** If true, the user must explicitly approve before applying */
  requiresUserApproval: boolean;
  /** The patch to apply if this suggestion is accepted */
  patch: RowPatch;
}

// ─── Patch Application Result ────────────────────────────────────────

export interface PatchResult {
  success: boolean;
  /** The row after the patch was applied */
  patchedRow: QuestionRow;
  /** Snapshot of the row before the patch (for rollback) */
  previousSnapshot: QuestionRow;
  /** If validation got worse, this is set */
  regressionDetected: boolean;
  /** Validation issues before the patch */
  issuesBefore: number;
  /** Validation issues after the patch */
  issuesAfter: number;
  /** Machine-readable explanation when the patch was rejected. */
  failureReason?: PatchFailureReason;
  /** Field that caused a precondition or path failure, when applicable. */
  failurePath?: string;
  /** Severity-aware issue counts used for regression decisions. */
  issueProfileBefore: PatchIssueProfile;
  issueProfileAfter: PatchIssueProfile;
}

// ─── Suggestion Engine Result ────────────────────────────────────────

export interface SuggestionResult {
  /** All suggestions generated for a batch of rows */
  suggestions: FixSuggestion[];
  /** Suggestions grouped by row ID */
  byRow: Record<string, FixSuggestion[]>;
  /** Suggestions that are safe to auto-apply */
  autoApplicable: FixSuggestion[];
  /** Suggestions that require user review */
  requiresReview: FixSuggestion[];
}
