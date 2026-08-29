import type {
  ConditionalFeedbackRule,
  ConditionalFeedbackCondition,
} from "../core/authoringTypes";

export type ConditionalFeedbackResponse = string | string[];

function normalizedText(value: unknown, caseSensitive = false): string {
  const text = String(value ?? "").trim();
  return caseSensitive ? text : text.toLocaleLowerCase();
}

export function matchesConditionalFeedbackCondition(
  condition: ConditionalFeedbackCondition,
  response: ConditionalFeedbackResponse,
): boolean {
  if (condition.operator === "choice_selected") {
    const selected = Array.isArray(response) ? response : [response];
    return Boolean(
      condition.optionId &&
        selected.some((value) => String(value) === condition.optionId),
    );
  }

  const rawResponse = Array.isArray(response) ? response.join(", ") : response;
  if (condition.operator === "equals") {
    return (
      normalizedText(rawResponse, condition.caseSensitive) ===
      normalizedText(condition.value, condition.caseSensitive)
    );
  }
  if (condition.operator === "contains") {
    const expected = normalizedText(condition.value, condition.caseSensitive);
    return (
      expected.length > 0 &&
      normalizedText(rawResponse, condition.caseSensitive).includes(expected)
    );
  }

  const numericResponse = Number(String(rawResponse).trim());
  if (!Number.isFinite(numericResponse)) return false;
  if (condition.operator === "numeric_range") {
    const hasMin = Number.isFinite(condition.min);
    const hasMax = Number.isFinite(condition.max);
    return (
      (hasMin || hasMax) &&
      (!hasMin || numericResponse >= Number(condition.min)) &&
      (!hasMax || numericResponse <= Number(condition.max))
    );
  }
  const comparisonValue = Number(condition.value);
  if (!Number.isFinite(comparisonValue)) return false;
  return condition.operator === "greater_than"
    ? numericResponse > comparisonValue
    : numericResponse < comparisonValue;
}

export function resolveConditionalFeedback(
  rules: ConditionalFeedbackRule[],
  response: ConditionalFeedbackResponse,
): ConditionalFeedbackRule | undefined {
  return [...rules]
    .sort((left, right) => left.priority - right.priority)
    .find(
      (rule) =>
        rule.content.trim().length > 0 &&
        matchesConditionalFeedbackCondition(rule.condition, response),
    );
}

export function getConditionalFeedbackRuleProblem(
  rule: ConditionalFeedbackRule,
  validOptionIds: string[] = [],
): string | undefined {
  const condition = rule.condition;
  const hasText = rule.content.replace(/<[^>]*>/g, "").trim().length > 0;
  const hasRichAsset = /<(img|audio|video|table|figure|iframe)\b/i.test(
    rule.content,
  );
  if (!hasText && !hasRichAsset) {
    return "Add the feedback shown when this response matches.";
  }
  if (condition.operator === "choice_selected") {
    if (!condition.optionId) return "Select an answer option.";
    if (
      validOptionIds.length > 0 &&
      !validOptionIds.includes(condition.optionId)
    ) {
      return "The selected option no longer exists.";
    }
  } else if (
    condition.operator === "equals" ||
    condition.operator === "contains" ||
    condition.operator === "greater_than" ||
    condition.operator === "less_than"
  ) {
    if (!String(condition.value ?? "").trim()) {
      return "Enter the answer value to match.";
    }
    if (
      (condition.operator === "greater_than" ||
        condition.operator === "less_than") &&
      !Number.isFinite(Number(condition.value))
    ) {
      return "Enter a valid number.";
    }
  } else if (
    !Number.isFinite(condition.min) &&
    !Number.isFinite(condition.max)
  ) {
    return "Enter at least one range boundary.";
  } else if (
    Number.isFinite(condition.min) &&
    Number.isFinite(condition.max) &&
    Number(condition.min) > Number(condition.max)
  ) {
    return "Minimum cannot be greater than maximum.";
  }
  return undefined;
}
