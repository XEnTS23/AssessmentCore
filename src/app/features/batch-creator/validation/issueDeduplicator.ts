import { ValidationIssue, IssueSeverity } from "../core/issueTypes";

const SEVERITY_ORDER: Record<IssueSeverity, number> = {
  block: 5,
  engine_defect: 4,
  review: 3,
  warning: 2,
  info: 1,
};

const PRIMARY_RULE_PRIORITY: Record<string, number> = {
  POSITIVE_MARKS_INVALID: 100,
  NEGATIVE_MARKS_INVALID: 90,
  MATH_SYNTAX_INVALID: 80,
  ANSWER_NOT_IN_OPTIONS: 70,
  MCQ_ANSWER_IN_OPTIONS: 70,
  MSQ_CORRECT_ANSWERS_IN_OPTIONS: 70,
  MCQ_ANSWER_TEXT_MATCH: 60,
  MSQ_ANSWER_TEXT_MATCH: 60,
  UNIT_POLICY_INVALID: 60,
  INTEGER_ANSWER_NOT_INTEGER: 95,
  UNSUPPORTED_TYPE_FOR_TARGET_EXPORT: 95,
};

export function getCanonicalProblem(ruleId: string): string {
  switch (ruleId) {
    case "MARKS_INVALID":
    case "POSITIVE_MARKS_INVALID":
      return "POSITIVE_MARKS_INVALID";

    case "NEGATIVE_MARKS_INVALID":
      return "NEGATIVE_MARKS_INVALID";

    case "NEGATIVE_MARKS_EXCEED_POSITIVE":
      return "NEGATIVE_MARKS_EXCEED_POSITIVE";

    case "MALFORMED_LATEX_DELIMITER":
    case "LATEX_STEM_DELIMITER_VALID":
      return "MATH_SYNTAX_INVALID";

    case "MCQ_ANSWER_IN_OPTIONS":
    case "MCQ_ANSWER_TEXT_MATCH":
    case "MSQ_CORRECT_ANSWERS_IN_OPTIONS":
    case "MSQ_ANSWER_TEXT_MATCH":
      return "ANSWER_NOT_IN_OPTIONS";

    case "RESPONSE_SUBTYPE_LOST":
    case "INTEGER_ANSWER_NOT_INTEGER":
      return "INTEGER_ANSWER_NOT_INTEGER";

    case "EXPLICIT_TYPE_OVERRIDDEN":
    case "UNSUPPORTED_TYPE_FOR_TARGET_EXPORT":
      return "UNSUPPORTED_TYPE_FOR_TARGET_EXPORT";

    case "TEXT_ENTRY_UNIT_POLICY_VALID":
    case "UNIT_POLICY_INVALID":
      return "UNIT_POLICY_INVALID";

    case "TEXT_ENTRY_NUMERIC_ANSWER_VALID":
    case "NUMERIC_ANSWER_NOT_NUMERIC":
      return "NUMERIC_ANSWER_NOT_NUMERIC";

    default:
      return ruleId;
  }
}

export function normalizeCanonicalField(field?: string): string {
  if (!field) return "general";
  const f = field.toLowerCase();
  if (f.includes("mark") || f.includes("score")) return "marks";
  if (f.includes("answer") || f.includes("choice") || f.includes("option"))
    return "correctAnswer";
  if (f.includes("stem")) return "stem";
  if (f.includes("unit")) return "units";
  return field;
}

/**
 * Deduplicates issues for a row using canonical identity key:
 * ['row', rowId, canonicalProblem, normalizeCanonicalField(field)].join(':')
 */
export function deduplicateRowIssues(
  issues: ValidationIssue[],
  rowId?: string,
): ValidationIssue[] {
  if (!issues || issues.length === 0) return [];

  const groups = new Map<string, ValidationIssue[]>();

  for (const issue of issues) {
    const canonical =
      issue.canonicalProblem || getCanonicalProblem(issue.ruleId);
    const canonicalField = normalizeCanonicalField(issue.field);
    const targetRowId = issue.rowId || rowId || "unknown";
    const dedupeKey = ["row", targetRowId, canonical, canonicalField].join(":");

    const existing = groups.get(dedupeKey) || [];
    existing.push({ ...issue, canonicalProblem: canonical, dedupeKey });
    groups.set(dedupeKey, existing);
  }

  const result: ValidationIssue[] = [];

  for (const groupIssues of groups.values()) {
    if (groupIssues.length === 1) {
      result.push(groupIssues[0]);
      continue;
    }

    // Sort by primary rule priority, then severity, then message length
    groupIssues.sort((a, b) => {
      const prioA = PRIMARY_RULE_PRIORITY[a.ruleId] || 0;
      const prioB = PRIMARY_RULE_PRIORITY[b.ruleId] || 0;
      if (prioB !== prioA) return prioB - prioA;

      const sevDiff = SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity];
      if (sevDiff !== 0) return sevDiff;

      return (b.message?.length || 0) - (a.message?.length || 0);
    });

    const primary = groupIssues[0];
    const highestSeverity = groupIssues.reduce(
      (highest, issue) =>
        SEVERITY_ORDER[issue.severity] > SEVERITY_ORDER[highest]
          ? issue.severity
          : highest,
      primary.severity,
    );
    const suppressed = Array.from(
      new Set(
        groupIssues.flatMap((issue) => [
          ...(issue === primary ? [] : [issue.ruleId]),
          ...(issue.suppressedRuleIds || []),
        ]),
      ),
    );

    // Preserve every distinct evidence value instead of allowing later rules to
    // overwrite the primary rule's evidence for the same canonical problem.
    const mergedEvidence: Record<string, unknown> = { ...primary.evidence };
    const mergedCorrections = [...(primary.allowedCorrections || [])];

    for (const other of groupIssues.slice(1)) {
      for (const [key, value] of Object.entries(other.evidence || {})) {
        if (!(key in mergedEvidence)) {
          mergedEvidence[key] = value;
          continue;
        }
        if (JSON.stringify(mergedEvidence[key]) === JSON.stringify(value))
          continue;
        const current = Array.isArray(mergedEvidence[key])
          ? (mergedEvidence[key] as unknown[])
          : [mergedEvidence[key]];
        if (
          !current.some(
            (item) => JSON.stringify(item) === JSON.stringify(value),
          )
        ) {
          mergedEvidence[key] = [...current, value];
        }
      }
      for (const correction of other.allowedCorrections || []) {
        if (
          !mergedCorrections.some(
            (existing) => existing.actionId === correction.actionId,
          )
        ) {
          mergedCorrections.push(correction);
        }
      }
    }

    result.push({
      ...primary,
      severity: highestSeverity,
      blocksExport:
        groupIssues.some((issue) => issue.blocksExport === true) ||
        highestSeverity === "block" ||
        highestSeverity === "engine_defect",
      suppressedRuleIds: suppressed,
      evidence:
        Object.keys(mergedEvidence).length > 0 ? mergedEvidence : undefined,
      allowedCorrections:
        mergedCorrections.length > 0 ? mergedCorrections : undefined,
    });
  }

  return result;
}
