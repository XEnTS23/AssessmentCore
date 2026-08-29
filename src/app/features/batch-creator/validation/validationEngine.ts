import { QuestionRow } from "../core/rowTypes";
import {
  BatchIssue,
  ValidationIssue,
  IssueSeverity,
  IssueCategory,
} from "../core/issueTypes";
import { ColumnMapping } from "../normalization/normalizeAnswer";
import {
  detectBatchScoringConvention,
  applyScoringConventionToBatch,
} from "./batchScoringConvention";
import { deduplicateRowIssues } from "./issueDeduplicator";
import { extractFinalResultFromExplanation } from "./explanationResultExtractor";
import { analyzeLatexDelimiters } from "./latexDelimiterValidator";
import type { CanonicalRuleSpec } from "./canonicalRuleCatalog";

export interface VersionedValidationProfile {
  id: string;
  version: string;
  [key: string]: unknown;
}

export interface CanonicalRuleEvaluation {
  triggered: boolean;
  values?: Record<string, unknown>;
  evidence?: Record<string, unknown>;
  field?: string;
  reasonCode?: string;
  confidence?: number;
  sourceReference?: string;
}

export interface ValidationContext {
  allRows: QuestionRow[];
  columnMapping: ColumnMapping;
  exportConfig?: any;
  featureFlags?: Record<string, boolean>;
  diagnosticMode?: boolean;
  policyProfile?: VersionedValidationProfile;
  targetProfile?: VersionedValidationProfile;
  packageSnapshot?: Record<string, unknown>;
  iterationSnapshot?: Record<string, unknown>;
  canonicalEvaluations?: Record<
    string,
    Record<string, CanonicalRuleEvaluation | undefined> | undefined
  >;
}

export type ValidationCapability =
  | "TYPE_RESOLVED"
  | "CANONICAL_TYPE_RESOLVED"
  | "STEM_PRESENT"
  | "STEM_VALID"
  | "STEM_INTEGRITY_VALID"
  | "OPTIONS_PRESENT"
  | "OPTIONS_VALID"
  | "OPTIONS_STRUCTURALLY_VALID"
  | "CORRECT_ANSWER_PRESENT"
  | "CORRECT_ANSWER_VALID"
  | "CORRECT_ANSWER_PARSEABLE"
  | "POSITIVE_MARKS_VALID"
  | "NEGATIVE_MARKS_VALID"
  | "NUMERIC_ANSWER_VALID"
  | "EXPLANATION_PRESENT"
  | "EXPLANATION_CONCLUSION_EXTRACTED"
  | "UNIT_POLICY_RESOLVED"
  | "MEDIA_MAPPING_RESOLVED";

export interface ValidationRule {
  id: string;
  name: string;
  category: IssueCategory;
  severity: IssueSeverity;
  priority: number;
  appliesTo:
    | "all"
    | Array<
        | "MCQ"
        | "MSQ"
        | "TEXT_ENTRY"
        | "ORDER"
        | "HOTSPOT"
        | "MATRIX_MATCH"
        | "UNSUPPORTED"
        | "UNKNOWN"
      >;
  requires?: ValidationCapability[];
  canonicalSpec?: CanonicalRuleSpec;
  implementationStatus?: "implemented";
  implementationMode?: "native" | "stage_adapter";
  getMissingPrerequisites?: (
    row: QuestionRow,
    context: ValidationContext,
  ) => string[];
  validate(row: QuestionRow, context: ValidationContext): ValidationIssue[];
}

export interface RuleExecutionDiagnostic {
  registered: boolean;
  executed: number;
  skipped: number;
  issuesEmitted: number;
  issuesSuppressed: number;
}

const ISSUE_SEVERITIES: readonly IssueSeverity[] = [
  "block",
  "review",
  "warning",
  "info",
  "engine_defect",
];
const ISSUE_CATEGORIES: readonly IssueCategory[] = [
  "structural",
  "content_quality",
  "type_suspicion",
  "metadata",
  "media",
  "scoring",
  "export_readiness",
  "ingestion",
  "academic_consistency",
  "rendering",
  "export_assembly",
  "system_defect",
];
const QUESTION_TYPES = [
  "MCQ",
  "MSQ",
  "TEXT_ENTRY",
  "ORDER",
  "HOTSPOT",
  "MATRIX_MATCH",
  "UNSUPPORTED",
  "UNKNOWN",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function stableSerialize(value: unknown, seen = new WeakSet<object>()): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number")
    return Number.isFinite(value)
      ? String(value)
      : JSON.stringify(String(value));
  if (typeof value === "boolean" || typeof value === "bigint")
    return String(value);
  if (typeof value !== "object") return JSON.stringify(String(value));

  if (seen.has(value)) return '"[Circular]"';
  seen.add(value);

  let serialized: string;
  if (Array.isArray(value)) {
    serialized = `[${value.map((item) => stableSerialize(item, seen)).join(",")}]`;
  } else {
    const objectValue = value as Record<string, unknown>;
    serialized = `{${Object.keys(objectValue)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${stableSerialize(objectValue[key], seen)}`,
      )
      .join(",")}}`;
  }

  seen.delete(value);
  return serialized;
}

function hashIdentity(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${(hash >>> 0).toString(36)}-${value.length.toString(36)}`;
}

function issueIdentity(
  issue: Omit<ValidationIssue, "id"> | ValidationIssue,
): string {
  return stableSerialize({
    rowId: issue.rowId,
    ruleId: issue.ruleId,
    category: issue.category,
    severity: issue.severity,
    field: issue.field ?? "",
    message: issue.message,
    evidence: issue.evidence ?? null,
  });
}

function withStableIssueId(
  issue: Omit<ValidationIssue, "id"> | ValidationIssue,
): ValidationIssue {
  const identity = issueIdentity(issue);
  return {
    ...issue,
    id: `validation-${hashIdentity(identity)}`,
  } as ValidationIssue;
}

function normalizeRuleIssue(
  candidate: unknown,
  rule: ValidationRule,
  row: QuestionRow,
  index: number,
): ValidationIssue {
  if (!isRecord(candidate)) {
    throw new TypeError(
      `Rule ${rule.id} returned a non-object issue at index ${index}.`,
    );
  }

  const severity = candidate.severity;
  const category = candidate.category;
  const message = candidate.message;
  const field = candidate.field;
  const evidence = candidate.evidence;

  if (!ISSUE_SEVERITIES.includes(severity as IssueSeverity)) {
    throw new TypeError(
      `Rule ${rule.id} returned an invalid issue severity at index ${index}.`,
    );
  }
  if (!ISSUE_CATEGORIES.includes(category as IssueCategory)) {
    throw new TypeError(
      `Rule ${rule.id} returned an invalid issue category at index ${index}.`,
    );
  }
  if (typeof message !== "string" || message.trim() === "") {
    throw new TypeError(
      `Rule ${rule.id} returned an empty issue message at index ${index}.`,
    );
  }
  if (field !== undefined && typeof field !== "string") {
    throw new TypeError(
      `Rule ${rule.id} returned an invalid issue field at index ${index}.`,
    );
  }
  if (evidence !== undefined && !isRecord(evidence)) {
    throw new TypeError(
      `Rule ${rule.id} returned invalid issue evidence at index ${index}.`,
    );
  }

  return withStableIssueId({
    ...(candidate as unknown as ValidationIssue),
    ruleId: rule.id,
    rowId: row.id,
    category: category as IssueCategory,
    severity: severity as IssueSeverity,
    message,
    field: field as string | undefined,
    evidence: evidence as Record<string, unknown> | undefined,
  });
}

function createRuleExecutionIssue(
  rule: ValidationRule,
  row: QuestionRow,
  error: unknown,
): ValidationIssue {
  return withStableIssueId({
    ruleId: "VALIDATION_RULE_EXECUTION_ERROR",
    rowId: row.id,
    category: rule.category,
    severity: "block",
    message: `Validation rule ${rule.id} could not complete. This row is blocked until the rule error is resolved.`,
    evidence: {
      failedRuleId: rule.id,
      errorName: error instanceof Error ? error.name : "Error",
      errorMessage: error instanceof Error ? error.message : String(error),
    },
  });
}

function validateRuleDefinition(rule: ValidationRule, index: number): void {
  if (!rule || typeof rule !== "object") {
    throw new TypeError(`Validation rule at index ${index} is not an object.`);
  }
  if (typeof rule.id !== "string" || rule.id.trim() === "") {
    throw new TypeError(
      `Validation rule at index ${index} must have a non-empty id.`,
    );
  }
  if (typeof rule.name !== "string" || rule.name.trim() === "") {
    throw new TypeError(
      `Validation rule ${rule.id} must have a non-empty name.`,
    );
  }
  if (!ISSUE_CATEGORIES.includes(rule.category)) {
    throw new TypeError(`Validation rule ${rule.id} has an invalid category.`);
  }
  if (!ISSUE_SEVERITIES.includes(rule.severity)) {
    throw new TypeError(`Validation rule ${rule.id} has an invalid severity.`);
  }
  if (!Number.isFinite(rule.priority)) {
    throw new TypeError(
      `Validation rule ${rule.id} must have a finite priority.`,
    );
  }
  if (typeof rule.validate !== "function") {
    throw new TypeError(
      `Validation rule ${rule.id} must provide a validate function.`,
    );
  }
  if (
    rule.appliesTo !== "all" &&
    (!Array.isArray(rule.appliesTo) ||
      rule.appliesTo.length === 0 ||
      rule.appliesTo.some((type) => !QUESTION_TYPES.includes(type)))
  ) {
    throw new TypeError(
      `Validation rule ${rule.id} has invalid appliesTo values.`,
    );
  }
}

export const MANDATORY_RULE_IDS = [
  "INTEGER_ANSWER_NOT_INTEGER",
  "UNSUPPORTED_TYPE_FOR_TARGET_EXPORT",
  "BROKEN_ENCODING",
  "COPYRIGHT_UNVERIFIED",
  "WRONG_SUBJECT_TAG",
  "VERSION_TIMESTAMP_CONFLICT",
  "INACTIVE_FIELD_CONTAINS_DATA",
] as const;

export function assertMandatoryRulesRegistered(rules: ValidationRule[]): void {
  const registered = new Set(rules.map((rule) => rule.id));
  for (const ruleId of MANDATORY_RULE_IDS) {
    if (!registered.has(ruleId)) {
      throw new Error(`Mandatory validation rule is not registered: ${ruleId}`);
    }
  }
}

function nonEmpty(value: unknown): boolean {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function containsBrokenEncoding(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return (
    value.includes("\uFFFD") ||
    value.includes("\u0000") ||
    /[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value)
  );
}

export function buildValidationCapabilities(
  row: QuestionRow,
): Set<ValidationCapability> {
  const capabilities = new Set<ValidationCapability>();
  const question = row.normalizedQuestion;
  const resolution = row.typeResolution || question?.typeResolution;
  const typeResolved = resolution
    ? resolution.status !== "unknown"
    : !!question && question.type !== "UNKNOWN";
  if (typeResolved) {
    capabilities.add("TYPE_RESOLVED");
    capabilities.add("CANONICAL_TYPE_RESOLVED");
  }

  const stem =
    question && "stem" in question
      ? question.stem
      : question && "rawStem" in question
        ? question.rawStem
        : undefined;
  if (nonEmpty(stem)) {
    capabilities.add("STEM_PRESENT");
    if (
      !containsBrokenEncoding(stem) &&
      analyzeLatexDelimiters(String(stem)).issues.length === 0
    ) {
      capabilities.add("STEM_VALID");
      capabilities.add("STEM_INTEGRITY_VALID");
    }
  }

  const options =
    question && "options" in question ? question.options : undefined;
  if (options?.length) capabilities.add("OPTIONS_PRESENT");
  const optionIds = options?.map((option) => option.id) || [];
  if (
    options &&
    options.length >= 2 &&
    options.every((option) => nonEmpty(option.id) && nonEmpty(option.text)) &&
    new Set(optionIds).size === optionIds.length
  ) {
    capabilities.add("OPTIONS_VALID");
    capabilities.add("OPTIONS_STRUCTURALLY_VALID");
  }

  let answerPresent = false;
  let answerParseable = false;
  if (question?.type === "MCQ") {
    answerPresent = nonEmpty(question.correctAnswerId);
    answerParseable = answerPresent && !/[,;|]/.test(question.correctAnswerId);
  } else if (question?.type === "MSQ") {
    answerPresent =
      question.correctAnswerIds.length > 0 &&
      question.correctAnswerIds.every(nonEmpty);
    answerParseable = answerPresent;
  } else if (question?.type === "TEXT_ENTRY") {
    answerPresent =
      question.acceptedAnswers.length > 0 &&
      question.acceptedAnswers.every(nonEmpty);
    answerParseable = answerPresent;
  } else if (question?.type === "ORDER") {
    answerPresent =
      question.correctSequenceIds.length > 0 &&
      question.correctSequenceIds.every(nonEmpty);
    answerParseable = answerPresent;
  }
  if (answerPresent) capabilities.add("CORRECT_ANSWER_PRESENT");
  if (answerParseable) {
    capabilities.add("CORRECT_ANSWER_VALID");
    capabilities.add("CORRECT_ANSWER_PARSEABLE");
  }

  const positiveMarks = row.scoringConfig?.marks;
  if (
    typeof positiveMarks === "number" &&
    Number.isFinite(positiveMarks) &&
    positiveMarks > 0
  ) {
    capabilities.add("POSITIVE_MARKS_VALID");
  }
  const negativeMarks = row.metadata?.negativeMarks;
  if (
    negativeMarks === undefined ||
    (Number.isFinite(negativeMarks) && negativeMarks <= 0)
  ) {
    capabilities.add("NEGATIVE_MARKS_VALID");
  }

  if (
    question?.type === "TEXT_ENTRY" &&
    (question.responseMode === "numeric" ||
      question.responseMode === "integer" ||
      question.mode === "numeric") &&
    question.acceptedAnswers.length > 0 &&
    question.acceptedAnswers.every((answer) => Number.isFinite(Number(answer)))
  ) {
    capabilities.add("NUMERIC_ANSWER_VALID");
  }

  const explanation =
    question && "explanation" in question ? question.explanation : undefined;
  if (nonEmpty(explanation)) {
    capabilities.add("EXPLANATION_PRESENT");
    if (extractFinalResultFromExplanation(explanation!)) {
      capabilities.add("EXPLANATION_CONCLUSION_EXTRACTED");
    }
  }

  return capabilities;
}

export class ValidationEngine {
  private readonly rules: ValidationRule[];
  private diagnostics: Record<string, RuleExecutionDiagnostic> = {};
  private batchIssues: BatchIssue[] = [];

  constructor(rules: ValidationRule[]) {
    if (!Array.isArray(rules)) {
      throw new TypeError("Validation rules must be provided as an array.");
    }

    const seenRuleIds = new Set<string>();
    rules.forEach((rule, index) => {
      validateRuleDefinition(rule, index);
      if (seenRuleIds.has(rule.id)) {
        throw new Error(`Duplicate validation rule id: ${rule.id}`);
      }
      seenRuleIds.add(rule.id);
    });

    // Copy before sorting so registry order is never mutated by the engine.
    this.rules = [...rules].sort(
      (left, right) => right.priority - left.priority,
    );
    this.resetDiagnostics();
  }

  private resetDiagnostics(): void {
    this.diagnostics = Object.fromEntries(
      this.rules.map((rule) => [
        rule.id,
        {
          registered: true,
          executed: 0,
          skipped: 0,
          issuesEmitted: 0,
          issuesSuppressed: 0,
        },
      ]),
    );
    this.batchIssues = [];
  }

  public getExecutionDiagnostics(): Record<string, RuleExecutionDiagnostic> {
    return Object.fromEntries(
      Object.entries(this.diagnostics).map(([ruleId, diagnostic]) => [
        ruleId,
        { ...diagnostic },
      ]),
    );
  }

  public getBatchIssues(): BatchIssue[] {
    return [...this.batchIssues];
  }

  public validateRow(
    row: QuestionRow,
    context: ValidationContext,
  ): QuestionRow {
    const rawIssues: ValidationIssue[] = [];
    const skippedRules: Array<{
      ruleId: string;
      missingPrerequisites: string[];
    }> = [];
    const seenIssues = new Set<string>();
    const capabilities = buildValidationCapabilities(row);
    const qType = row.normalizedQuestion?.type || "UNKNOWN";

    for (const rule of this.rules) {
      if (rule.appliesTo !== "all" && !rule.appliesTo.includes(qType)) continue;

      const missingPrerequisites: string[] = (rule.requires || []).filter(
        (capability) => !capabilities.has(capability),
      );
      missingPrerequisites.push(
        ...(rule.getMissingPrerequisites?.(row, context) || []),
      );
      if (missingPrerequisites.length > 0) {
        skippedRules.push({ ruleId: rule.id, missingPrerequisites });
        this.diagnostics[rule.id].skipped += 1;
        continue;
      }

      this.diagnostics[rule.id].executed += 1;
      try {
        const candidates = rule.validate(row, context);
        if (!Array.isArray(candidates)) {
          throw new TypeError(
            `Rule ${rule.id} must return an array of validation issues.`,
          );
        }

        const normalized = candidates.map((candidate, index) =>
          normalizeRuleIssue(candidate, rule, row, index),
        );
        this.diagnostics[rule.id].issuesEmitted += normalized.length;
        normalized.forEach((issue) => {
          const identity = issueIdentity(issue);
          if (seenIssues.has(identity)) return;
          seenIssues.add(identity);
          rawIssues.push(issue);
        });
      } catch (error) {
        const issue = createRuleExecutionIssue(rule, row, error);
        const identity = issueIdentity(issue);
        if (!seenIssues.has(identity)) {
          seenIssues.add(identity);
          rawIssues.push(issue);
        }
      }
    }

    const issues = deduplicateRowIssues(rawIssues, row.id);
    for (const issue of issues) {
      for (const suppressedRuleId of issue.suppressedRuleIds || []) {
        if (this.diagnostics[suppressedRuleId]) {
          this.diagnostics[suppressedRuleId].issuesSuppressed += 1;
        }
      }
    }

    const hasBlock = issues.some(
      (i) =>
        i.severity === "block" ||
        i.severity === "engine_defect" ||
        i.blocksExport === true,
    );
    const hasReview = issues.some((i) => i.severity === "review");
    const hasWarning = issues.some((i) => i.severity === "warning");

    let status: QuestionRow["status"] = "valid";
    if (hasBlock) status = "rejected";
    else if (hasReview) status = "needs_review";
    else if (hasWarning) status = "caution";

    return {
      ...row,
      status,
      issues,
      skippedRules,
      skippedRuleIds: skippedRules.map((skipped) => skipped.ruleId),
    };
  }

  public validateBatch(
    rows: QuestionRow[],
    context: ValidationContext,
  ): QuestionRow[] {
    this.resetDiagnostics();
    if (context.diagnosticMode) assertMandatoryRulesRegistered(this.rules);

    const scoringConvention = detectBatchScoringConvention(rows);
    const { rows: normalizedRows, batchIssues } = applyScoringConventionToBatch(
      rows,
      scoringConvention,
    );
    this.batchIssues = [...batchIssues];

    return normalizedRows.map((row) =>
      this.validateRow(row, {
        ...context,
        allRows: normalizedRows,
      }),
    );
  }
}
