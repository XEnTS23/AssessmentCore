export interface Issue {
  code: string;
  category: string;
  field: string;
  message: string;
  severity: "block" | "review" | "warning"; // Expanded to allow warnings for non-blocking cautions
  details?: {
    missing?: string[];
    extra?: string[];
  };
}

export interface ValidationResultV2 {
  rowId: string;
  status: "valid" | "invalid" | "review" | "unknown";

  confidence: number;
  coverage: number;
  validationDepth: number;
  validationCost: {
    totalRulesExecuted: number;
    avgRulesPerRow: number;
    totalCostUnits: number;
  };

  issues: Issue[];

  uncertaintyFlags: string[];
  executionTrace: Array<{
    ruleId: string;
    priority: number;
    result: "pass" | "fail" | "skip";
    reason?: string;
    severity?: RuleResultSeverity;
  }>;

  applicableRules: string[];
  nonApplicableRules: string[];
  missingRules: string[];

  passedRules: string[];
  failedRules: string[];
  skippedRules: Array<{
    ruleId: string;
    reason: string;
    skipType: "DATA_MISSING" | "RULE_CONDITION" | "SYSTEM_ERROR";
  }>;

  meta: {
    totalRules: number;
    executedRules: number;
    skippedRules: number;
  };
}

export type RuleSkipType = "DATA_MISSING" | "RULE_CONDITION" | "SYSTEM_ERROR";

export interface RuleValidationResult {
  passed: boolean;
  issue?: Issue;
  skip?: boolean;
  skipType?: RuleSkipType;
  skipReason?: string;
  severity?: RuleResultSeverity;
}

export type RuleSeverity = "critical" | "high" | "medium" | "low";
export type RuleResultSeverity = "block" | "high" | "medium";

export type RuleAppliesTo =
  | "MCQ"
  | "MSQ"
  | "ORDER"
  | "TRUE_FALSE"
  | "TEXT_ENTRY"
  | "NUMERIC"
  | "UNKNOWN"
  | "*";

export interface RuleContext {
  rowId: string;
  type: RuleAppliesTo;
  rawType?: string;
  questionText?: string;
  optionCount?: number;
  choices?: Array<{ identifier: string; text: string; normalizedText: string }>;
  correctResponseIdentifiers?: string[];
  userResponseIdentifiers?: string[];
  mappingConfidence: number;
  parsingConfidence: number;
  mappingConfidenceDefaulted?: boolean;
  parsingConfidenceDefaulted?: boolean;
  typeUnknown?: boolean;
  typeAmbiguous?: boolean;
  identifierMatchMode?: "strict" | "case_insensitive";
  traceMode?: "full" | "errors_only" | "off";
  priorityEnforcement?: "strict" | "warn";
  rawAnswerString?: string; // raw pre-split answer string for delimiter format validation
  /** Delimiters accepted by the parser for this row. Omit for strict pipe-only validation. */
  answerDelimiters?: string[];
}

export interface ValidationRule {
  id: string;
  appliesTo: RuleAppliesTo[];
  severity: RuleSeverity;
  priority: number;
  weight?: 1 | 2 | 3;

  shouldRun: (context: RuleContext) => boolean;

  validate: (context: RuleContext) => RuleValidationResult;
}

function normalizeWhitespace(text: string | null | undefined): string {
  // Normalize ALL whitespace: spaces, tabs, newlines, carriage returns, non-breaking spaces, etc.
  if (text == null) return "";
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[\s\u00A0]+/gu, " ");
}

const normalizedOptionTextCache = new WeakMap<
  RuleContext,
  Map<string, string[]>
>();

function getNormalizedOptionTextMap(
  context: RuleContext,
): Map<string, string[]> {
  const cached = normalizedOptionTextCache.get(context);
  if (cached) return cached;

  const map = new Map<string, string[]>();
  const choices = context.choices ?? [];
  choices.forEach((choice) => {
    const normalized = normalizeWhitespace(choice.text ?? "");
    if (!normalized) return;
    const existing = map.get(normalized);
    if (existing) {
      existing.push(choice.identifier);
    } else {
      map.set(normalized, [choice.identifier]);
    }
  });

  normalizedOptionTextCache.set(context, map);
  return map;
}

function normalizeId(
  text: string,
  mode: "strict" | "case_insensitive",
): string {
  const trimmed = String(text ?? "").trim();
  if (mode === "case_insensitive") {
    return trimmed.toLowerCase();
  }
  return trimmed;
}

function getIdentifierMatchMode(
  context: RuleContext,
): "strict" | "case_insensitive" {
  return context.identifierMatchMode ?? "strict";
}

function matchIdentifier(
  a: string | null | undefined,
  b: string | null | undefined,
  mode: "strict" | "case_insensitive",
): boolean {
  if (a == null || b == null) return false;
  if (String(a).trim().length === 0 || String(b).trim().length === 0)
    return false;
  try {
    return normalizeId(a, mode) === normalizeId(b, mode);
  } catch {
    return false;
  }
}

function resolveUserResponseIdentifiers(context: RuleContext): {
  resolved: string[];
  hasUnresolved: boolean;
  hasAmbiguous: boolean;
  usedTextFallback: boolean;
  usedDirectMatch: boolean;
} {
  const resolved: string[] = [];
  const userIds = context.userResponseIdentifiers ?? [];
  const choices = context.choices ?? [];
  const matchMode = getIdentifierMatchMode(context);
  const normalizedTextMap = getNormalizedOptionTextMap(context);

  let hasUnresolved = false;
  let hasAmbiguous = false;
  let usedTextFallback = false;
  let usedDirectMatch = false;

  userIds.forEach((userId) => {
    if (!isValidIdentifier(userId)) {
      hasUnresolved = true;
      return;
    }

    const directMatch = choices.find((choice) =>
      matchIdentifier(choice.identifier, userId, matchMode),
    );
    if (directMatch) {
      resolved.push(directMatch.identifier);
      usedDirectMatch = true;
      return;
    }

    const normalizedUserText = normalizeWhitespace(String(userId));
    const matches = normalizedTextMap.get(normalizedUserText) ?? [];

    if (matches.length === 1) {
      resolved.push(matches[0]);
      usedTextFallback = true;
      return;
    }

    if (matches.length > 1) {
      hasAmbiguous = true;
      return;
    }

    hasUnresolved = true;
  });

  return {
    resolved,
    hasUnresolved,
    hasAmbiguous,
    usedTextFallback,
    usedDirectMatch,
  };
}

function hasIdentifierMismatch(context: RuleContext): boolean {
  const choices = context.choices;
  if (!choices || choices.length === 0) return false;

  const correctIds = context.correctResponseIdentifiers || [];
  if (correctIds.length === 0) return false;

  const matchMode = getIdentifierMatchMode(context);
  return correctIds.some(
    (id) =>
      !choices.some((choice) =>
        matchIdentifier(choice.identifier, id, matchMode),
      ),
  );
}

function hasUserIdentifierMismatch(context: RuleContext): boolean {
  const choices = context.choices;
  if (!choices || choices.length === 0) return false;

  const userIds = context.userResponseIdentifiers || [];
  if (userIds.length === 0) return false;

  const matchMode = getIdentifierMatchMode(context);
  return userIds.some(
    (id) =>
      !choices.some((choice) =>
        matchIdentifier(choice.identifier, id, matchMode),
      ),
  );
}

function hasDuplicateCorrectResponseIdentifiers(context: RuleContext): boolean {
  const correctIds = context.correctResponseIdentifiers || [];
  if (correctIds.length <= 1) return false;

  const matchMode = getIdentifierMatchMode(context);
  return hasDuplicateIdentifiers(correctIds, matchMode);
}

function hasDuplicateIdentifiers(
  values: Array<string | null | undefined> | undefined,
  mode: "strict" | "case_insensitive",
): boolean {
  if (!values || values.length <= 1) return false;

  for (let i = 0; i < values.length; i++) {
    for (let j = i + 1; j < values.length; j++) {
      if (matchIdentifier(values[i], values[j], mode)) {
        return true;
      }
    }
  }
  return false;
}

function areIdentifiersInOptions(
  identifiers: Array<string | null | undefined>,
  choices: Array<{ identifier: string }>,
  mode: "strict" | "case_insensitive",
): boolean {
  return identifiers.every((id) =>
    choices.some((choice) => matchIdentifier(choice.identifier, id, mode)),
  );
}

function normalizeIdentifierSet(
  identifiers: Array<string | null | undefined>,
  mode: "strict" | "case_insensitive",
): Set<string> {
  const normalized = identifiers
    .map((id) => normalizeId(String(id ?? ""), mode))
    .filter((value) => value.length > 0);
  return new Set(normalized);
}

function isValidIdentifier(value: string | null | undefined): boolean {
  return value != null && String(value).trim().length > 0;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function toPercentUnit(value: number): number {
  if (value <= 1) return clamp(value * 100, 0, 100);
  return clamp(value, 0, 100);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function toCoverage(executedRules: number, totalRules: number): number {
  if (totalRules <= 0) return 0;
  return round2((executedRules / totalRules) * 100);
}

function computeConfidence(
  coverage: number,
  mappingConfidence: number,
  parsingConfidence: number,
): number {
  const mapping = toPercentUnit(mappingConfidence);
  const parsing = toPercentUnit(parsingConfidence);

  return round2(coverage * 0.6 + mapping * 0.2 + parsing * 0.2);
}

function getStatus(input: {
  typeUnknown: boolean;
  hasBlockIssue: boolean;
  hasNonBlockIssue: boolean;
  uncertaintyFlags: string[];
}): ValidationResultV2["status"] {
  if (input.typeUnknown) return "unknown";
  if (input.hasBlockIssue) return "invalid";
  if (input.uncertaintyFlags.length > 0 || input.hasNonBlockIssue)
    return "review";
  return "valid";
}

const LOW_CONFIDENCE_THRESHOLD = 90;
const LOW_MAPPING_CONFIDENCE_THRESHOLD = 90;
const LOW_PARSING_CONFIDENCE_THRESHOLD = 90;
const LOW_COVERAGE_THRESHOLD = 95;

const expectedRulesByType: Partial<Record<RuleAppliesTo, string[]>> = {
  MCQ: [
    "REQUIRED_OPTIONS",
    "REQUIRED_QUESTION_FIELD",
    "MCQ_MIN_OPTIONS",
    "MCQ_OPTION_TEXT_NOT_EMPTY",
    "WHITESPACE_AUTOFIX",
    "MCQ_OPTIONS_UNIQUE",
    "MCQ_OPTION_IDENTIFIERS_UNIQUE",
    "MCQ_OPTION_IDENTIFIER_VALID",
    "MCQ_HAS_CORRECT_ANSWER",
    "MCQ_ANSWER_IN_OPTIONS",
    "MCQ_ANSWER_TEXT_MATCH",
    "MCQ_ANSWER_TEXT_AMBIGUOUS",
    "MCQ_SINGLE_CORRECT_ONLY",
    "MCQ_SHOULD_BE_MSQ",
    "MCQ_SUSPECT_TYPE",
  ],
  MSQ: [
    "REQUIRED_OPTIONS",
    "REQUIRED_QUESTION_FIELD",
    "WHITESPACE_AUTOFIX",
    "DELIMITER_FORMAT",
    "MSQ_ANSWER_IDENTIFIER_VALID",
    "MSQ_OPTIONS_UNIQUE",
    "MSQ_HAS_CORRECT_ANSWERS",
    "MSQ_MIXED_IDENTIFIER_MODE",
    "MSQ_CORRECT_ANSWERS_IN_OPTIONS",
    "MSQ_NO_DUPLICATE_CORRECT_ANSWERS",
    "MSQ_ANSWER_CARDINALITY_CHECK",
    "MSQ_EXACT_SET_MATCH",
    "MSQ_ANSWER_TEXT_MATCH",
    "MSQ_ANSWER_TEXT_AMBIGUOUS",
  ],
  ORDER: ["REQUIRED_QUESTION_FIELD", "DELIMITER_FORMAT", "WHITESPACE_AUTOFIX"],
  TRUE_FALSE: ["REQUIRED_QUESTION_FIELD", "WHITESPACE_AUTOFIX"],
  TEXT_ENTRY: ["REQUIRED_QUESTION_FIELD", "WHITESPACE_AUTOFIX"],
  NUMERIC: ["REQUIRED_QUESTION_FIELD", "WHITESPACE_AUTOFIX"],
  UNKNOWN: [
    "REQUIRED_OPTIONS",
    "REQUIRED_QUESTION_FIELD",
    "WHITESPACE_AUTOFIX",
  ],
};

function isRuleApplicable(context: RuleContext, rule: ValidationRule): boolean {
  return rule.appliesTo.includes("*") || rule.appliesTo.includes(context.type);
}

function getPriorityBand(
  priority: number,
): "structural" | "semantic" | "fallback" | "ambiguity" {
  if (priority >= 0 && priority <= 49) return "structural";
  if (priority >= 50 && priority <= 79) return "semantic";
  if (priority >= 80 && priority <= 99) return "fallback";
  return "ambiguity";
}

function toRuleResultSeverity(severity: RuleSeverity): RuleResultSeverity {
  if (severity === "critical") return "block";
  if (severity === "high") return "high";
  return "medium";
}

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

function enforcePriorityBands(
  rules: ValidationRule[],
  enforcement: "strict" | "warn",
): void {
  const expectations: Array<{
    id: string;
    band: "structural" | "semantic" | "fallback" | "ambiguity";
  }> = [
    { id: "REQUIRED_OPTIONS", band: "structural" },
    { id: "DELIMITER_FORMAT", band: "structural" },
    { id: "WHITESPACE_AUTOFIX", band: "structural" },
    { id: "REQUIRED_QUESTION_FIELD", band: "structural" },
    { id: "MCQ_MIN_OPTIONS", band: "structural" },
    { id: "MCQ_OPTION_TEXT_NOT_EMPTY", band: "structural" },
    { id: "MCQ_OPTIONS_UNIQUE", band: "structural" },
    { id: "MCQ_OPTION_IDENTIFIERS_UNIQUE", band: "structural" },
    { id: "MCQ_OPTION_IDENTIFIER_VALID", band: "structural" },
    { id: "MCQ_HAS_CORRECT_ANSWER", band: "semantic" },
    { id: "MCQ_ANSWER_IN_OPTIONS", band: "semantic" },
    { id: "MCQ_SINGLE_CORRECT_ONLY", band: "semantic" },
    { id: "MCQ_ANSWER_TEXT_MATCH", band: "fallback" },
    { id: "MCQ_ANSWER_TEXT_AMBIGUOUS", band: "ambiguity" },
    { id: "MCQ_SHOULD_BE_MSQ", band: "ambiguity" },
    { id: "MCQ_SUSPECT_TYPE", band: "ambiguity" },
    { id: "MSQ_HAS_CORRECT_ANSWERS", band: "structural" },
    { id: "MSQ_ANSWER_IDENTIFIER_VALID", band: "structural" },
    { id: "MSQ_OPTIONS_UNIQUE", band: "structural" },
    { id: "MSQ_MIXED_IDENTIFIER_MODE", band: "structural" },
    { id: "MSQ_CORRECT_ANSWERS_IN_OPTIONS", band: "semantic" },
    { id: "MSQ_NO_DUPLICATE_CORRECT_ANSWERS", band: "structural" },
    { id: "MSQ_ANSWER_CARDINALITY_CHECK", band: "semantic" },
    { id: "MSQ_EXACT_SET_MATCH", band: "fallback" },
    { id: "MSQ_ANSWER_TEXT_MATCH", band: "fallback" },
    { id: "MSQ_ANSWER_TEXT_AMBIGUOUS", band: "ambiguity" },
  ];

  expectations.forEach(({ id, band }) => {
    const rule = rules.find((candidate) => candidate.id === id);
    if (!rule) return;
    const actualBand = getPriorityBand(rule.priority);
    if (actualBand !== band) {
      const message = `Rule priority band violation for ${id}: expected ${band}, got ${actualBand} (priority ${rule.priority})`;
      if (enforcement === "strict") {
        throw new Error(message);
      }
      logger.warn(message);
    }
  });
}

export function executeRules(
  rowContext: RuleContext,
  rules: ValidationRule[],
): ValidationResultV2 {
  const traceMode = rowContext.traceMode ?? "full";
  const priorityEnforcement = rowContext.priorityEnforcement ?? "strict";
  enforcePriorityBands(rules, priorityEnforcement);
  const applicableRules = rules
    .filter((rule) => isRuleApplicable(rowContext, rule))
    .slice()
    .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
  const nonApplicableRules = rules
    .filter((rule) => !isRuleApplicable(rowContext, rule))
    .map((rule) => rule.id);
  const applicableRuleIds = applicableRules.map((rule) => rule.id);

  const expectedRules = expectedRulesByType[rowContext.type] || [];
  const missingRules = expectedRules.filter(
    (ruleId) => !applicableRuleIds.includes(ruleId),
  );

  const passedRules: string[] = [];
  const failedRules: string[] = [];
  const skippedRules: Array<{
    ruleId: string;
    reason: string;
    skipType: "DATA_MISSING" | "RULE_CONDITION" | "SYSTEM_ERROR";
  }> = [];
  const issues: Issue[] = [];
  const executionTrace: Array<{
    ruleId: string;
    priority: number;
    result: "pass" | "fail" | "skip";
    reason?: string;
    severity?: RuleResultSeverity;
  }> | null = traceMode === "off" ? null : [];
  let hasFailedCriticalRule = false;
  let systemErrorCount = 0;
  let suspectTypeFlagged = false;
  let totalCostUnits = 0;
  let msqOptionsUniqueFailed = false;
  let msqCardinalityFailed = false;

  applicableRules.forEach((rule) => {
    const mappedSeverity = toRuleResultSeverity(rule.severity);
    if (
      msqOptionsUniqueFailed &&
      rule.appliesTo.includes("MSQ") &&
      rule.id !== "MSQ_OPTIONS_UNIQUE" &&
      rule.id !== "REQUIRED_QUESTION_FIELD" &&
      rule.id !== "REQUIRED_OPTIONS"
    ) {
      const reason = "Skipped because option identifiers are not unique.";
      skippedRules.push({
        ruleId: rule.id,
        reason,
        skipType: "RULE_CONDITION",
      });
      if (executionTrace) {
        executionTrace.push({
          ruleId: rule.id,
          priority: rule.priority,
          result: "skip",
          reason,
          severity: mappedSeverity,
        });
      }
      return;
    }
    if (msqCardinalityFailed && rule.id === "MSQ_EXACT_SET_MATCH") {
      const reason = "Skipped because answer cardinality check failed.";
      skippedRules.push({
        ruleId: rule.id,
        reason,
        skipType: "RULE_CONDITION",
      });
      if (executionTrace) {
        executionTrace.push({
          ruleId: rule.id,
          priority: rule.priority,
          result: "skip",
          reason,
          severity: mappedSeverity,
        });
      }
      return;
    }
    if (!rule.shouldRun(rowContext)) {
      let reason = `Rule ${rule.id} precondition failed. type=${rowContext.type}`;
      let skipType: RuleSkipType = "RULE_CONDITION";

      if (
        rule.id === "MCQ_MIN_OPTIONS" &&
        (!rowContext.optionCount || rowContext.optionCount === 0)
      ) {
        reason = "Cannot validate answer because options are missing";
        skipType = "DATA_MISSING";
      } else if (
        rule.id.includes("MCQ_MIN_OPTIONS") &&
        rowContext.optionCount === 0
      ) {
        reason = "Cannot validate answer because options are missing";
        skipType = "DATA_MISSING";
      } else if (
        !rowContext.questionText ||
        rowContext.questionText.trim().length === 0
      ) {
        reason = "Cannot validate question because stem is missing";
        skipType = "DATA_MISSING";
      }

      skippedRules.push({
        ruleId: rule.id,
        reason,
        skipType,
      });
      if (executionTrace) {
        const skipMessage =
          skipType === "DATA_MISSING"
            ? "Skipped due to missing data."
            : "Skipped because preconditions were not met.";
        executionTrace.push({
          ruleId: rule.id,
          priority: rule.priority,
          result: "skip",
          reason: skipMessage,
          severity: mappedSeverity,
        });
      }
      return;
    }

    const result = rule.validate(rowContext);

    if (result.skip) {
      skippedRules.push({
        ruleId: rule.id,
        reason: result.skipReason || "Rule skipped.",
        skipType: result.skipType ?? "RULE_CONDITION",
      });
      if (result.skipType === "SYSTEM_ERROR") {
        systemErrorCount++;
      }
      if (executionTrace) {
        const skipMessage = result.skipReason
          ? result.skipReason
          : result.skipType === "DATA_MISSING"
            ? "Skipped due to missing data."
            : result.skipType === "SYSTEM_ERROR"
              ? "Skipped due to a system error."
              : "Skipped because preconditions were not met.";
        executionTrace.push({
          ruleId: rule.id,
          priority: rule.priority,
          result: "skip",
          reason: skipMessage,
          severity: result.severity ?? mappedSeverity,
        });
      }
      return;
    }

    if (result.passed) {
      passedRules.push(rule.id);
      totalCostUnits += rule.weight ?? 1;
      if (traceMode === "full" && executionTrace) {
        executionTrace.push({
          ruleId: rule.id,
          priority: rule.priority,
          result: "pass",
          severity: result.severity ?? mappedSeverity,
        });
      }
      return;
    }

    failedRules.push(rule.id);
    totalCostUnits += rule.weight ?? 1;
    if (executionTrace) {
      executionTrace.push({
        ruleId: rule.id,
        priority: rule.priority,
        result: "fail",
        reason: result.issue?.message || "Rule failed",
        severity: result.severity ?? mappedSeverity,
      });
    }
    if (rule.id === "MSQ_OPTIONS_UNIQUE") {
      msqOptionsUniqueFailed = true;
    }
    if (rule.id === "MSQ_ANSWER_CARDINALITY_CHECK") {
      msqCardinalityFailed = true;
    }
    if (rule.id === "MCQ_SUSPECT_TYPE") {
      suspectTypeFlagged = true;
    }
    if (result.issue) {
      issues.push(result.issue);
    }

    if (rule.severity === "critical") {
      hasFailedCriticalRule = true;
    }
  });

  const totalRules = applicableRules.length;
  const executedRules = passedRules.length + failedRules.length;
  const coverage = toCoverage(executedRules, totalRules);
  const validationDepth =
    expectedRules.length === 0
      ? 0
      : round2((applicableRules.length / expectedRules.length) * 100);
  const computedConfidence = computeConfidence(
    coverage,
    rowContext.mappingConfidence,
    rowContext.parsingConfidence,
  );
  let confidence = applicableRules.length === 0 ? 0 : computedConfidence;

  // Apply confidence adjustment if rule set is incomplete
  if (missingRules.length > 0) {
    confidence = clamp(confidence - 5, 0, 100);
  }

  if (rowContext.typeAmbiguous) {
    confidence = Math.min(confidence, 89.99);
  }

  const uncertaintyFlags: string[] = [];

  const mappingPercent = toPercentUnit(rowContext.mappingConfidence);
  const parsingPercent = toPercentUnit(rowContext.parsingConfidence);
  const textFallbackResolution =
    rowContext.type === "MSQ"
      ? resolveUserResponseIdentifiers(rowContext)
      : null;

  if (applicableRules.length === 0) {
    uncertaintyFlags.push("NO_VALIDATION_POSSIBLE");
  }

  if (missingRules.length > 0) {
    uncertaintyFlags.push("INCOMPLETE_RULE_SET");
    uncertaintyFlags.push("VALIDATION_SCOPE_LIMITED");
    uncertaintyFlags.push("CONFIDENCE_ADJUSTED_INCOMPLETE_RULE_SET");
  }

  if (textFallbackResolution?.usedTextFallback) {
    uncertaintyFlags.push("ANSWER_RESOLVED_BY_TEXT_MATCH");
  }

  if (systemErrorCount > 0) {
    uncertaintyFlags.push("VALIDATION_SYSTEM_ERROR");
  }

  if (suspectTypeFlagged) {
    uncertaintyFlags.push("TYPE_MISMATCH_SUSPECTED");
  }

  if (mappingPercent < LOW_MAPPING_CONFIDENCE_THRESHOLD) {
    uncertaintyFlags.push("LOW_MAPPING_CONFIDENCE");
  }

  if (parsingPercent < LOW_PARSING_CONFIDENCE_THRESHOLD) {
    uncertaintyFlags.push("LOW_PARSING_CONFIDENCE");
  }

  if (applicableRules.length > 0 && coverage < LOW_COVERAGE_THRESHOLD) {
    uncertaintyFlags.push("LOW_COVERAGE");
  }

  if (rowContext.typeAmbiguous) {
    uncertaintyFlags.push("TYPE_AMBIGUITY");
  }

  const specificCoverageFlags = [
    "LOW_MAPPING_CONFIDENCE",
    "LOW_PARSING_CONFIDENCE",
    "LOW_COVERAGE",
    "TYPE_AMBIGUITY",
    "NO_VALIDATION_POSSIBLE",
  ];

  if (
    confidence < LOW_CONFIDENCE_THRESHOLD &&
    !uncertaintyFlags.some((flag) => specificCoverageFlags.includes(flag))
  ) {
    uncertaintyFlags.push("LOW_CONFIDENCE");
  }

  const hasBlockIssue =
    hasFailedCriticalRule || issues.some((issue) => issue.severity === "block");
  const hasNonBlockIssue = issues.some((issue) => issue.severity !== "block");
  const finalStatus = getStatus({
    typeUnknown: !!rowContext.typeUnknown,
    hasBlockIssue,
    hasNonBlockIssue,
    uncertaintyFlags,
  });

  const finalExecutionTrace =
    traceMode === "errors_only"
      ? executionTrace
        ? executionTrace.filter((entry) => entry.result !== "pass")
        : []
      : (executionTrace ?? []);

  return {
    rowId: rowContext.rowId,
    status: finalStatus,
    confidence,
    coverage,
    validationDepth,
    validationCost: {
      totalRulesExecuted: executedRules,
      avgRulesPerRow: executedRules,
      totalCostUnits,
    },
    issues,
    uncertaintyFlags,
    executionTrace: finalExecutionTrace,
    applicableRules: applicableRuleIds,
    nonApplicableRules,
    missingRules,
    passedRules,
    failedRules,
    skippedRules,
    meta: {
      totalRules,
      executedRules,
      skippedRules: skippedRules.length,
    },
  };
}

export const REQUIRED_OPTIONS_RULE: ValidationRule = {
  id: "REQUIRED_OPTIONS",
  appliesTo: ["MCQ", "MSQ", "UNKNOWN"], // Added UNKNOWN to catch completely blank rows
  severity: "critical",
  priority: 5,
  shouldRun: (context) =>
    context.type === "MCQ" ||
    context.type === "MSQ" ||
    context.type === "UNKNOWN",
  validate: (context) => {
    const choices = context.choices ?? [];
    const firstTwo = choices.slice(0, 2);
    const missingOrEmpty =
      firstTwo.length < 2 || firstTwo.some((c) => !c.text || !c.text.trim());
    if (missingOrEmpty) {
      return {
        passed: false,
        issue: {
          code: "MISSING_REQUIRED_OPTIONS",
          category: "structural",
          field: "Options",
          message:
            "Missing Required Options: optionA and optionB must be non-empty.",
          severity: "block",
        },
      };
    }
    return { passed: true };
  },
};

export const DELIMITER_FORMAT_RULE: ValidationRule = {
  id: "DELIMITER_FORMAT",
  appliesTo: ["MSQ", "ORDER"],
  severity: "high",
  priority: 5,
  shouldRun: (context) =>
    (context.type === "MSQ" || context.type === "ORDER") &&
    !!context.rawAnswerString,
  validate: (context) => {
    const raw = context.rawAnswerString!.trim();
    const normalizeDelimiter = (delimiter: string) =>
      delimiter === "\\n" ? "\n" : delimiter;
    const configuredMode = Array.isArray(context.answerDelimiters);
    const allowedDelimiters = Array.from(
      new Set(
        (context.answerDelimiters?.length ? context.answerDelimiters : ["|"])
          .map(normalizeDelimiter)
          .filter(Boolean),
      ),
    );
    const presentDelimiters = allowedDelimiters.filter((delimiter) =>
      raw.includes(delimiter),
    );
    const strictDisallowedDelimiter =
      !configuredMode &&
      [",", ";", "\n"].some((delimiter) => raw.includes(delimiter));
    const usesMixedDelimiters = presentDelimiters.length > 1;
    const activeDelimiter = presentDelimiters[0];
    const hasEmptyToken = activeDelimiter
      ? raw.split(activeDelimiter).some((token) => token.trim().length === 0)
      : false;

    if (strictDisallowedDelimiter || usesMixedDelimiters || hasEmptyToken) {
      const printable = allowedDelimiters
        .map((delimiter) => (delimiter === "\n" ? "newline" : delimiter))
        .join(", ");
      return {
        passed: false,
        issue: {
          code: "INVALID_ANSWER_FORMAT",
          category: "structural",
          field: "Answer",
          message: `Invalid delimiter format. Use one consistent delimiter (${printable}) with no leading, trailing, or empty tokens. Got: "${raw}"`,
          severity: "block",
        },
      };
    }
    return { passed: true };
  },
};

export const WHITESPACE_AUTOFIX_RULE: ValidationRule = {
  id: "WHITESPACE_AUTOFIX",
  appliesTo: [
    "MCQ",
    "MSQ",
    "ORDER",
    "TRUE_FALSE",
    "TEXT_ENTRY",
    "NUMERIC",
    "UNKNOWN",
  ],
  severity: "low",
  priority: 25,
  shouldRun: () => true,
  validate: (context) => {
    const hasDirty = (text: string | undefined): boolean => {
      if (!text) return false;
      return (
        text !== text.trim() ||
        /[\t\n\r\u00A0]/.test(text) ||
        /\s{2,}/.test(text)
      );
    };
    const questionDirty = hasDirty(context.questionText);
    const optionDirty = (context.choices ?? []).some((c) => hasDirty(c.text));
    if (questionDirty || optionDirty) {
      return {
        passed: false,
        issue: {
          code: "WHITESPACE_AUTOFIX",
          category: "content_quality",
          field: questionDirty ? "Question" : "Options",
          message: "Autofix Required: Contains leading/trailing/extra spaces.",
          severity: "warning", // Changed from review to warning to ensure exporter picks it up
        },
      };
    }
    return { passed: true };
  },
};

export const REQUIRED_QUESTION_FIELD_RULE: ValidationRule = {
  id: "REQUIRED_QUESTION_FIELD",
  appliesTo: [
    "MCQ",
    "MSQ",
    "ORDER",
    "TRUE_FALSE",
    "TEXT_ENTRY",
    "NUMERIC",
    "UNKNOWN",
  ],
  severity: "critical",
  priority: 10,
  shouldRun: () => true,
  validate: (context) => {
    if (context.questionText && context.questionText.trim().length > 0) {
      return { passed: true };
    }

    return {
      passed: false,
      issue: {
        code: "MISSING_STEM",
        category: "structural",
        field: "Question Stem",
        message: "Question text is required for export mapping.",
        severity: "block",
      },
    };
  },
};

export const MCQ_MIN_OPTIONS_RULE: ValidationRule = {
  id: "MCQ_MIN_OPTIONS",
  appliesTo: ["MCQ"],
  severity: "high",
  priority: 20,
  shouldRun: (context) => context.type === "MCQ",
  validate: (context) => {
    const optionCount = context.optionCount ?? 0;

    if (optionCount >= 2) {
      return { passed: true };
    }

    return {
      passed: false,
      issue: {
        code: "INSUFFICIENT_OPTIONS",
        category: "structural",
        field: "Options",
        message: `Single-choice requires at least 2 options. Found ${optionCount}.`,
        severity: "block",
      },
    };
  },
};

export const MCQ_OPTION_TEXT_NOT_EMPTY_RULE: ValidationRule = {
  id: "MCQ_OPTION_TEXT_NOT_EMPTY",
  appliesTo: ["MCQ"],
  severity: "medium",
  priority: 30,
  shouldRun: (context) => context.type === "MCQ",
  validate: (context) => {
    if (!context.choices || context.choices.length === 0) {
      return { skip: true, skipType: "DATA_MISSING", passed: false } as any;
    }

    const missing = context.choices.find(
      (choice) => !choice.text || !choice.text.trim(),
    );
    if (missing) {
      return {
        passed: false,
        issue: {
          code: "EMPTY_OPTION_TEXT",
          category: "content_quality",
          field: "Options",
          message: "Every option must have non-empty text.",
          severity: "block",
        },
      };
    }

    return { passed: true };
  },
};

export const MCQ_OPTIONS_UNIQUE_RULE: ValidationRule = {
  id: "MCQ_OPTIONS_UNIQUE",
  appliesTo: ["MCQ"],
  severity: "medium",
  priority: 40,
  weight: 2,
  shouldRun: (context) => context.type === "MCQ",
  validate: (context) => {
    if (!context.choices || context.choices.length === 0) {
      return { skip: true, skipType: "DATA_MISSING", passed: false } as any;
    }

    const normalized = context.choices.map((choice) =>
      normalizeWhitespace(choice.text ?? ""),
    );
    const duplicates = normalized.filter((v, i) => normalized.indexOf(v) !== i);

    if (duplicates.length > 0) {
      return {
        passed: false,
        issue: {
          code: "DUPLICATE_OPTION_TEXT",
          category: "content_quality",
          field: "Options",
          message: "Options must be unique.",
          severity: "block",
        },
      };
    }

    return { passed: true };
  },
};

export const MCQ_OPTION_IDENTIFIERS_UNIQUE_RULE: ValidationRule = {
  id: "MCQ_OPTION_IDENTIFIERS_UNIQUE",
  appliesTo: ["MCQ"],
  severity: "high",
  priority: 45,
  shouldRun: (context) => context.type === "MCQ",
  validate: (context) => {
    if (!context.choices || context.choices.length === 0) {
      return { skip: true, skipType: "DATA_MISSING", passed: false } as any;
    }

    const identifiers = context.choices.map(
      (choice) => choice.identifier || "",
    );
    let hasDuplicate = false;
    for (let i = 0; i < identifiers.length; i++) {
      for (let j = i + 1; j < identifiers.length; j++) {
        if (matchIdentifier(identifiers[i], identifiers[j], "strict")) {
          hasDuplicate = true;
          break;
        }
      }
      if (hasDuplicate) break;
    }

    if (hasDuplicate) {
      return {
        passed: false,
        issue: {
          code: "DUPLICATE_OPTION_IDENTIFIERS",
          category: "structural",
          field: "Options",
          message: "Option identifiers must be unique.",
          severity: "block",
        },
      };
    }

    return { passed: true };
  },
};

export const MCQ_OPTION_IDENTIFIER_VALID_RULE: ValidationRule = {
  id: "MCQ_OPTION_IDENTIFIER_VALID",
  appliesTo: ["MCQ"],
  severity: "high",
  priority: 49,
  shouldRun: (context) => context.type === "MCQ",
  validate: (context) => {
    if (!context.choices || context.choices.length === 0) {
      return { skip: true, skipType: "DATA_MISSING", passed: false } as any;
    }

    const invalid = context.choices.find((choice) => {
      const id = choice.identifier;
      return !id || typeof id !== "string" || id.trim().length === 0;
    });

    if (invalid) {
      return {
        passed: false,
        issue: {
          code: "INVALID_OPTION_IDENTIFIER",
          category: "structural",
          field: "Options",
          message: "Option identifiers must be non-empty strings.",
          severity: "block",
        },
      };
    }

    return { passed: true };
  },
};

export const MSQ_HAS_CORRECT_ANSWERS_RULE: ValidationRule = {
  id: "MSQ_HAS_CORRECT_ANSWERS",
  appliesTo: ["MSQ"],
  severity: "high",
  priority: 20,
  shouldRun: (context) => context.type === "MSQ",
  validate: (context) => {
    const correct = context.correctResponseIdentifiers;
    if (!correct || correct.length === 0) {
      return {
        passed: false,
        issue: {
          code: "MISSING_CORRECT_ANSWERS",
          category: "content_quality",
          field: "Answer",
          message: "At least one correct answer must be provided for MSQ.",
          severity: "block",
        },
      };
    }
    return { passed: true };
  },
};

export const MSQ_ANSWER_IDENTIFIER_VALID_RULE: ValidationRule = {
  id: "MSQ_ANSWER_IDENTIFIER_VALID",
  appliesTo: ["MSQ"],
  severity: "high",
  priority: 25,
  shouldRun: (context) => context.type === "MSQ",
  validate: (context) => {
    const correctIds = context.correctResponseIdentifiers || [];
    const userIds = context.userResponseIdentifiers || [];

    const hasInvalidCorrect = correctIds.some((id) => !isValidIdentifier(id));
    const hasInvalidUser = userIds.some((id) => !isValidIdentifier(id));

    if (hasInvalidCorrect || hasInvalidUser) {
      return {
        passed: false,
        issue: {
          code: "INVALID_ANSWER_IDENTIFIER",
          category: "content_quality",
          field: "Answer",
          message: "Answer identifiers must be non-empty values.",
          severity: "block",
        },
      };
    }

    return { passed: true };
  },
};

export const MSQ_OPTIONS_UNIQUE_RULE: ValidationRule = {
  id: "MSQ_OPTIONS_UNIQUE",
  appliesTo: ["MSQ"],
  severity: "high",
  priority: 15,
  shouldRun: (context) => context.type === "MSQ",
  validate: (context) => {
    const choices = context.choices;
    if (!choices || choices.length === 0) {
      return { skip: true, skipType: "DATA_MISSING", passed: false } as any;
    }

    const matchMode = getIdentifierMatchMode(context);
    const identifiers = choices.map((choice) => choice.identifier);
    if (hasDuplicateIdentifiers(identifiers, matchMode)) {
      return {
        passed: false,
        issue: {
          code: "DUPLICATE_OPTION_IDENTIFIERS",
          category: "structural",
          field: "Options",
          message: "Option identifiers must be unique.",
          severity: "block",
        },
      };
    }

    return { passed: true };
  },
};

export const MSQ_CORRECT_ANSWERS_IN_OPTIONS_RULE: ValidationRule = {
  id: "MSQ_CORRECT_ANSWERS_IN_OPTIONS",
  appliesTo: ["MSQ"],
  severity: "high",
  priority: 55,
  shouldRun: (context) => context.type === "MSQ",
  validate: (context) => {
    const choices = context.choices;
    if (!choices || choices.length === 0) {
      return { skip: true, skipType: "DATA_MISSING", passed: false } as any;
    }

    const correctIds = context.correctResponseIdentifiers || [];
    if (correctIds.length === 0) {
      return { skip: true, skipType: "RULE_CONDITION", passed: false } as any;
    }

    const matchMode = getIdentifierMatchMode(context);

    const unmatched = correctIds.filter(
      (answer) =>
        !choices.some((choice) =>
          matchIdentifier(choice.identifier, answer, matchMode),
        ),
    );

    if (unmatched.length > 0) {
      return {
        passed: false,
        issue: {
          code: "ANSWER_NOT_IN_OPTIONS",
          category: "content_quality",
          field: "Answer",
          message: `Answer not found in options: ${unmatched.join(", ")}`,
          severity: "block",
        },
      };
    }

    return { passed: true };
  },
};

export const MSQ_MIXED_IDENTIFIER_MODE_RULE: ValidationRule = {
  id: "MSQ_MIXED_IDENTIFIER_MODE",
  appliesTo: ["MSQ"],
  severity: "high",
  priority: 35,
  shouldRun: (context) => context.type === "MSQ",
  validate: (context) => {
    const choices = context.choices;
    if (!choices || choices.length === 0) {
      return {
        skip: true,
        skipType: "DATA_MISSING",
        passed: false,
        severity: "high",
      } as any;
    }

    const userIds = context.userResponseIdentifiers || [];
    if (userIds.length === 0) {
      return {
        skip: true,
        skipType: "RULE_CONDITION",
        passed: false,
        severity: "high",
      } as any;
    }

    const resolved = resolveUserResponseIdentifiers(context);
    if (resolved.usedDirectMatch && resolved.usedTextFallback) {
      return {
        passed: false,
        issue: {
          code: "MIXED_ANSWER_IDENTIFIER_MODE",
          category: "content_quality",
          field: "Answer",
          message:
            "Answers mix identifiers and text values. Use one mode consistently.",
          severity: "block",
        },
        severity: "high",
      };
    }

    return { passed: true, severity: "high" };
  },
};

export const MSQ_ANSWER_TEXT_MATCH_RULE: ValidationRule = {
  id: "MSQ_ANSWER_TEXT_MATCH",
  appliesTo: ["MSQ"],
  severity: "high",
  priority: 82,
  weight: 2,
  shouldRun: (context) => context.type === "MSQ",
  validate: (context) => {
    if (!hasIdentifierMismatch(context)) {
      return { passed: true, severity: "high" };
    }
    const choices = context.choices;
    if (!choices || choices.length === 0) {
      return {
        skip: true,
        skipType: "DATA_MISSING",
        passed: false,
        severity: "high",
      } as any;
    }
    const correctIds = context.correctResponseIdentifiers || [];
    if (correctIds.length === 0) {
      return {
        skip: true,
        skipType: "RULE_CONDITION",
        passed: false,
        severity: "high",
      } as any;
    }

    const textToMatch = new Map<string, boolean>();
    choices.forEach((choice) => {
      const normalized = normalizeWhitespace(choice.text ?? "");
      if (normalized) textToMatch.set(normalized, true);
    });

    const unmatched = correctIds.filter((answer) => {
      const normalized = normalizeWhitespace(answer);
      return !textToMatch.has(normalized);
    });

    if (unmatched.length > 0) {
      return {
        passed: false,
        issue: {
          code: "ANSWER_TEXT_NOT_IN_OPTIONS",
          category: "content_quality",
          field: "Answer",
          message: `Answer text not found in options: ${unmatched.join(", ")}`,
          severity: "block",
        },
        severity: "high",
      };
    }
    return { passed: true, severity: "high" };
  },
};

export const MSQ_ANSWER_TEXT_AMBIGUOUS_RULE: ValidationRule = {
  id: "MSQ_ANSWER_TEXT_AMBIGUOUS",
  appliesTo: ["MSQ"],
  severity: "high",
  priority: 105,
  weight: 3,
  shouldRun: (context) => context.type === "MSQ",
  validate: (context) => {
    if (!hasUserIdentifierMismatch(context)) {
      return { passed: true, severity: "high" };
    }

    const choices = context.choices;
    if (!choices || choices.length === 0) {
      return {
        skip: true,
        skipType: "DATA_MISSING",
        passed: false,
        severity: "high",
      } as any;
    }

    const userIds = context.userResponseIdentifiers || [];
    if (userIds.length === 0) {
      return {
        skip: true,
        skipType: "RULE_CONDITION",
        passed: false,
        severity: "high",
      } as any;
    }

    const resolved = resolveUserResponseIdentifiers(context);
    if (resolved.hasAmbiguous) {
      return {
        passed: false,
        issue: {
          code: "MSQ_ANSWER_TEXT_AMBIGUOUS",
          category: "content_quality",
          field: "Answer",
          message: "Answer text matches multiple options.",
          severity: "block",
        },
        severity: "high",
      };
    }

    return { passed: true, severity: "high" };
  },
};

export const MSQ_ANSWER_CARDINALITY_CHECK_RULE: ValidationRule = {
  id: "MSQ_ANSWER_CARDINALITY_CHECK",
  appliesTo: ["MSQ"],
  severity: "high",
  priority: 70,
  shouldRun: (context) => {
    if (context.type !== "MSQ") return false;
    const correctIds = context.correctResponseIdentifiers || [];
    const userIds = context.userResponseIdentifiers || [];
    if (correctIds.length === 0 || userIds.length === 0) return false;
    return true;
  },
  validate: (context) => {
    const correctIds = context.correctResponseIdentifiers || [];
    const userIds = context.userResponseIdentifiers || [];
    const matchMode = getIdentifierMatchMode(context);
    const choices = context.choices;

    if (
      correctIds.some((id) => !isValidIdentifier(id)) ||
      userIds.some((id) => !isValidIdentifier(id))
    ) {
      return {
        skip: true,
        skipType: "RULE_CONDITION",
        skipReason: "Skipped because answer identifiers are invalid.",
        severity: "high",
      } as any;
    }

    if (
      hasDuplicateCorrectResponseIdentifiers(context) ||
      hasDuplicateIdentifiers(userIds, matchMode)
    ) {
      return {
        skip: true,
        skipType: "RULE_CONDITION",
        skipReason: "Skipped because duplicate answers were provided.",
        severity: "high",
      } as any;
    }

    if (!choices || choices.length === 0) {
      return {
        skip: true,
        skipType: "DATA_MISSING",
        passed: false,
        severity: "high",
      } as any;
    }

    const resolved = resolveUserResponseIdentifiers(context);
    if (resolved.hasUnresolved) {
      return {
        skip: true,
        skipType: "RULE_CONDITION",
        skipReason:
          "Skipped because some answers could not be matched to option text.",
        severity: "high",
      } as any;
    }
    if (resolved.hasAmbiguous) {
      return {
        skip: true,
        skipType: "RULE_CONDITION",
        skipReason: "Skipped because answer text matches multiple options.",
        severity: "high",
      } as any;
    }

    const resolvedUserIds = resolved.resolved;
    if (correctIds.length !== resolvedUserIds.length) {
      const message =
        correctIds.length > resolvedUserIds.length
          ? "missing_answers"
          : "extra_answers";
      return {
        passed: false,
        issue: {
          code: "MSQ_CARDINALITY_MISMATCH",
          category: "content_quality",
          field: "Answer",
          message,
          severity: "block",
        },
        severity: "high",
      };
    }

    return { passed: true, severity: "high" };
  },
};

export const MSQ_NO_DUPLICATE_CORRECT_ANSWERS_RULE: ValidationRule = {
  id: "MSQ_NO_DUPLICATE_CORRECT_ANSWERS",
  appliesTo: ["MSQ"],
  severity: "high",
  priority: 30,
  shouldRun: (context) => context.type === "MSQ",
  validate: (context) => {
    if (hasDuplicateCorrectResponseIdentifiers(context)) {
      return {
        passed: false,
        issue: {
          code: "DUPLICATE_CORRECT_ANSWERS",
          category: "content_quality",
          field: "Answer",
          message: "Correct answers must not contain duplicate identifiers.",
          severity: "block",
        },
      };
    }

    return { passed: true };
  },
};

export const MSQ_EXACT_SET_MATCH_RULE: ValidationRule = {
  id: "MSQ_EXACT_SET_MATCH",
  appliesTo: ["MSQ"],
  severity: "high",
  priority: 85,
  shouldRun: (context) => {
    if (context.type !== "MSQ") return false;

    const correctIds = context.correctResponseIdentifiers || [];
    if (correctIds.length === 0) return false;
    if (!context.userResponseIdentifiers) return false;

    return true;
  },
  validate: (context) => {
    const correctIds = context.correctResponseIdentifiers || [];
    const userIds = context.userResponseIdentifiers || [];

    const matchMode = getIdentifierMatchMode(context);

    if (
      correctIds.some((id) => !isValidIdentifier(id)) ||
      userIds.some((id) => !isValidIdentifier(id))
    ) {
      return {
        skip: true,
        skipType: "RULE_CONDITION",
        skipReason: "Skipped because answer identifiers are invalid.",
        severity: "high",
      } as any;
    }

    if (
      hasDuplicateCorrectResponseIdentifiers(context) ||
      hasDuplicateIdentifiers(userIds, matchMode)
    ) {
      return {
        skip: true,
        skipType: "RULE_CONDITION",
        skipReason: "Skipped because duplicate answers were provided.",
        severity: "high",
      } as any;
    }

    const choices = context.choices;
    if (!choices || !areIdentifiersInOptions(correctIds, choices, matchMode)) {
      return {
        skip: true,
        skipType: "RULE_CONDITION",
        skipReason: "Skipped because correct answers are not in options.",
        severity: "high",
      } as any;
    }

    const resolved = resolveUserResponseIdentifiers(context);
    if (resolved.hasUnresolved) {
      return {
        skip: true,
        skipType: "RULE_CONDITION",
        skipReason:
          "Skipped because some answers could not be matched to option text.",
        severity: "high",
      } as any;
    }
    if (resolved.hasAmbiguous) {
      return {
        skip: true,
        skipType: "RULE_CONDITION",
        skipReason: "Skipped because answer text matches multiple options.",
        severity: "high",
      } as any;
    }

    const normalizedCorrect = normalizeIdentifierSet(correctIds, matchMode);
    const normalizedUser = normalizeIdentifierSet(resolved.resolved, matchMode);

    const missing = Array.from(normalizedCorrect).filter(
      (id) => !normalizedUser.has(id),
    );
    const extra = Array.from(normalizedUser).filter(
      (id) => !normalizedCorrect.has(id),
    );

    if (missing.length > 0 || extra.length > 0) {
      const message =
        missing.length > 0 && extra.length > 0
          ? "both"
          : missing.length > 0
            ? "missing_answers"
            : "extra_answers";
      return {
        passed: false,
        issue: {
          code: "MSQ_EXACT_SET_MISMATCH",
          category: "content_quality",
          field: "Answer",
          message,
          severity: "block",
          details: {
            missing,
            extra,
          },
        },
        severity: "high",
      };
    }

    return { passed: true, severity: "high" };
  },
};

export const MCQ_HAS_CORRECT_ANSWER_RULE: ValidationRule = {
  id: "MCQ_HAS_CORRECT_ANSWER",
  appliesTo: ["MCQ"],
  severity: "high",
  priority: 55,
  shouldRun: (context) => context.type === "MCQ",
  validate: (context) => {
    const correct = context.correctResponseIdentifiers;
    if (!correct || correct.length === 0) {
      return {
        passed: false,
        issue: {
          code: "MISSING_CORRECT_ANSWER",
          category: "content_quality",
          field: "Answer",
          message: "At least one correct answer must be selected.",
          severity: "block",
        },
      };
    }
    return { passed: true };
  },
};

export const MCQ_ANSWER_IN_OPTIONS_RULE: ValidationRule = {
  id: "MCQ_ANSWER_IN_OPTIONS",
  appliesTo: ["MCQ"],
  severity: "high",
  priority: 60,
  shouldRun: (context) => context.type === "MCQ",
  validate: (context) => {
    const choices = context.choices;
    if (!choices || choices.length === 0) {
      return { skip: true, skipType: "DATA_MISSING", passed: false } as any;
    }

    const correctIds = context.correctResponseIdentifiers || [];
    if (correctIds.length === 0) {
      return { skip: true, skipType: "RULE_CONDITION", passed: false } as any;
    }

    const matchMode = getIdentifierMatchMode(context);

    const unmatched = correctIds.filter(
      (answer) =>
        !choices.some((choice) =>
          matchIdentifier(choice.identifier, answer, matchMode),
        ),
    );

    if (unmatched.length > 0) {
      return {
        passed: false,
        issue: {
          code: "ANSWER_NOT_IN_OPTIONS",
          category: "content_quality",
          field: "Answer",
          message: `Answer not found in options: ${unmatched.join(", ")}`,
          severity: "block",
        },
      };
    }

    return { passed: true };
  },
};

export const MCQ_ANSWER_TEXT_MATCH_RULE: ValidationRule = {
  id: "MCQ_ANSWER_TEXT_MATCH",
  appliesTo: ["MCQ"],
  severity: "high",
  priority: 80,
  weight: 2,
  shouldRun: (context) => context.type === "MCQ",
  validate: (context) => {
    if (!hasIdentifierMismatch(context)) {
      return { passed: true };
    }
    const choices = context.choices;
    if (!choices || choices.length === 0) {
      return { skip: true, skipType: "DATA_MISSING", passed: false } as any;
    }
    const correctIds = context.correctResponseIdentifiers || [];
    if (correctIds.length === 0) {
      return { skip: true, skipType: "RULE_CONDITION", passed: false } as any;
    }

    const textToMatch = new Map<string, boolean>();
    choices.forEach((choice) => {
      const normalized = normalizeWhitespace(choice.text ?? "");
      if (normalized) textToMatch.set(normalized, true);
    });

    const unmatched = correctIds.filter((answer) => {
      const normalized = normalizeWhitespace(answer);
      return !textToMatch.has(normalized);
    });

    if (unmatched.length > 0) {
      return {
        passed: false,
        issue: {
          code: "ANSWER_TEXT_NOT_IN_OPTIONS",
          category: "content_quality",
          field: "Answer",
          message: `Answer text not found in options: ${unmatched.join(", ")}`,
          severity: "block",
        },
      };
    }
    return { passed: true };
  },
};

export const MCQ_ANSWER_TEXT_AMBIGUOUS_RULE: ValidationRule = {
  id: "MCQ_ANSWER_TEXT_AMBIGUOUS",
  appliesTo: ["MCQ"],
  severity: "high",
  priority: 100,
  weight: 3,
  shouldRun: (context) => {
    if (context.type !== "MCQ") return false;
    return hasIdentifierMismatch(context);
  },
  validate: (context) => {
    const choices = context.choices;
    if (!choices || choices.length === 0) {
      return { skip: true, skipType: "DATA_MISSING", passed: false } as any;
    }

    const correctIds = context.correctResponseIdentifiers || [];
    if (correctIds.length === 0) {
      return { skip: true, skipType: "RULE_CONDITION", passed: false } as any;
    }

    const normalizedTexts = choices.map((c) =>
      normalizeWhitespace(c.text ?? ""),
    );
    const normalizedAnswers = correctIds.map((id) => normalizeWhitespace(id));

    for (const answer of normalizedAnswers) {
      const matchCount = normalizedTexts.filter(
        (text) => text === answer,
      ).length;
      if (matchCount > 1) {
        return {
          passed: false,
          issue: {
            code: "AMBIGUOUS_ANSWER_MATCH",
            category: "content_quality",
            field: "Answer",
            message: "Answer text matches multiple options. Ambiguous mapping.",
            severity: "block",
          },
        };
      }
    }

    return { passed: true };
  },
};

export const MCQ_SINGLE_CORRECT_ONLY_RULE: ValidationRule = {
  id: "MCQ_SINGLE_CORRECT_ONLY",
  appliesTo: ["MCQ"],
  severity: "high",
  priority: 65,
  shouldRun: (context) =>
    context.type === "MCQ" && !context.typeAmbiguous && !context.typeUnknown,
  validate: (context) => {
    const correct = context.correctResponseIdentifiers;
    if (!correct) {
      return { skip: true, skipType: "RULE_CONDITION", passed: false } as any;
    }

    if (correct.length > 1) {
      return {
        passed: false,
        issue: {
          code: "MULTIPLE_CORRECT_ANSWERS",
          category: "content_quality",
          field: "Answer",
          message: "Only one correct answer should be selected for MCQ.",
          severity: "block",
        },
      };
    }

    return { passed: true };
  },
};

export const MCQ_SHOULD_BE_MSQ_RULE: ValidationRule = {
  id: "MCQ_SHOULD_BE_MSQ",
  appliesTo: ["MCQ"],
  severity: "high",
  priority: 110,
  shouldRun: (context) => {
    if (context.type !== "MCQ") return false;
    if (!context.typeAmbiguous && !context.typeUnknown) return false;

    const correct = context.correctResponseIdentifiers;
    if (!correct || correct.length <= 1) return false;

    return true;
  },
  validate: (context) => {
    const correct = context.correctResponseIdentifiers;
    if (!correct) {
      return { skip: true, skipType: "RULE_CONDITION", passed: false } as any;
    }

    if (correct.length > 1) {
      return {
        passed: false,
        issue: {
          code: "TYPE_MISMATCH_MSQ",
          category: "content_quality",
          field: "Answer",
          message:
            "Multiple correct answers detected. This should be MSQ (not MCQ).",
          severity: "block",
        },
      };
    }

    return { passed: true };
  },
};

export const MCQ_SUSPECT_TYPE_RULE: ValidationRule = {
  id: "MCQ_SUSPECT_TYPE",
  appliesTo: ["MCQ"],
  severity: "high",
  priority: 120,
  weight: 2,
  shouldRun: (context) => context.type === "MCQ",
  validate: (context) => {
    const choices = context.choices;
    if (!choices || choices.length === 0) {
      return { skip: true, skipType: "DATA_MISSING", passed: false } as any;
    }

    const optionCount = context.optionCount ?? choices.length;
    if (optionCount === 1) {
      return {
        passed: false,
        issue: {
          code: "SUSPECT_SINGLE_OPTION",
          category: "type_suspicion",
          field: "Options",
          message: "Single option detected - may be incorrect question type.",
          severity: "block",
        },
      };
    }

    if (choices.length === 2) {
      const normalizedTexts = choices.map((c) =>
        normalizeWhitespace(c.text ?? ""),
      );
      const sorted = normalizedTexts.sort();
      if (sorted[0] === "false" && sorted[1] === "true") {
        return {
          passed: false,
          issue: {
            code: "SUSPECT_TRUE_FALSE",
            category: "type_suspicion",
            field: "Options",
            message:
              "True/False options detected - may be incorrect question type.",
            severity: "block",
          },
        };
      }
    }

    return { passed: true };
  },
};

export const defaultValidationRules: ValidationRule[] = [
  REQUIRED_OPTIONS_RULE,
  REQUIRED_QUESTION_FIELD_RULE,
  MCQ_MIN_OPTIONS_RULE,
  MCQ_OPTION_TEXT_NOT_EMPTY_RULE,
  WHITESPACE_AUTOFIX_RULE,
  MCQ_OPTIONS_UNIQUE_RULE,
  MCQ_OPTION_IDENTIFIERS_UNIQUE_RULE,
  MCQ_OPTION_IDENTIFIER_VALID_RULE,
  MCQ_HAS_CORRECT_ANSWER_RULE,
  MCQ_ANSWER_IN_OPTIONS_RULE,
  MCQ_ANSWER_TEXT_MATCH_RULE,
  MCQ_ANSWER_TEXT_AMBIGUOUS_RULE,
  MCQ_SINGLE_CORRECT_ONLY_RULE,
  MCQ_SHOULD_BE_MSQ_RULE,
  MCQ_SUSPECT_TYPE_RULE,
  DELIMITER_FORMAT_RULE,
  MSQ_ANSWER_IDENTIFIER_VALID_RULE,
  MSQ_OPTIONS_UNIQUE_RULE,
  MSQ_HAS_CORRECT_ANSWERS_RULE,
  MSQ_MIXED_IDENTIFIER_MODE_RULE,
  MSQ_CORRECT_ANSWERS_IN_OPTIONS_RULE,
  MSQ_ANSWER_TEXT_MATCH_RULE,
  MSQ_ANSWER_TEXT_AMBIGUOUS_RULE,
  MSQ_NO_DUPLICATE_CORRECT_ANSWERS_RULE,
  MSQ_ANSWER_CARDINALITY_CHECK_RULE,
  MSQ_EXACT_SET_MATCH_RULE,
];

const MISMATCH_CODES = new Set([
  "ANSWER_NOT_IN_OPTIONS",
  "MISSING_ANSWER",
  "AMBIGUOUS_ANSWER_MAPPING",
  "AMBIGUOUS_ANSWER_MATCH",
  "INVALID_FORMAT",
]);

export interface DebugMismatchExample {
  rowId: string;
  type: string;
  issueCodes: string[];
  issueMessages: string[];
  normalizedAnswer: string;
  normalizedOptions: string[];
  options: string[];
}

export interface DebugMismatchReport {
  totalMcqRows: number;
  totalMsqRows: number;
  mcqRowsWithMismatch: number;
  msqRowsWithMismatch: number;
  answerNotInOptionsCount: number;
  exampleMismatches: DebugMismatchExample[];
}

export interface DebugMismatchInput {
  rowId: string;
  type: string;
  issues: Array<{ code: string; message: string }>;
  normalizedAnswer?: string;
  normalizedOptions?: string[];
  options?: string[];
}

function hasMismatchIssue(issues: Array<{ code: string }>): boolean {
  return issues.some((i) => MISMATCH_CODES.has(i.code));
}

export function debugValidateMcqMsqAnswers(
  results: DebugMismatchInput[],
): DebugMismatchReport {
  const mcqRows = results.filter((r) => r.type === "MCQ" || r.type === "mcq");
  const msqRows = results.filter(
    (r) =>
      r.type === "MSQ" ||
      r.type === "msq" ||
      r.type === "MsQ" ||
      r.type === "Msq",
  );

  const mcqMismatches = mcqRows.filter((r) => hasMismatchIssue(r.issues));
  const msqMismatches = msqRows.filter((r) => hasMismatchIssue(r.issues));

  let answerNotInOptionsCount = 0;
  [...mcqRows, ...msqRows].forEach((r) => {
    r.issues.forEach((i) => {
      if (i.code === "ANSWER_NOT_IN_OPTIONS") answerNotInOptionsCount++;
    });
  });

  const exampleMismatches: DebugMismatchExample[] = [];
  [...mcqMismatches, ...msqMismatches].forEach((row) => {
    const mismatchIssues = row.issues.filter((i) => MISMATCH_CODES.has(i.code));
    exampleMismatches.push({
      rowId: row.rowId,
      type: row.type,
      issueCodes: mismatchIssues.map((i) => i.code),
      issueMessages: mismatchIssues.map((i) => i.message),
      normalizedAnswer: row.normalizedAnswer ?? "",
      normalizedOptions: row.normalizedOptions ?? [],
      options: row.options ?? [],
    });
  });

  return {
    totalMcqRows: mcqRows.length,
    totalMsqRows: msqRows.length,
    mcqRowsWithMismatch: mcqMismatches.length,
    msqRowsWithMismatch: msqMismatches.length,
    answerNotInOptionsCount,
    exampleMismatches: exampleMismatches.slice(0, 5),
  };
}
