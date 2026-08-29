export type RequiredAuthoringSectionType = "question" | "response" | "metadata";

export type OptionalAuthoringSectionType =
  | "explanation"
  | "feedback_correct"
  | "feedback_incorrect"
  | "conditional_feedback"
  | "feedback_partial"
  | "hint"
  | "instructions";

export type AuthoringSectionType =
  | RequiredAuthoringSectionType
  | OptionalAuthoringSectionType;

export type ConditionalFeedbackOperator =
  | "choice_selected"
  | "equals"
  | "contains"
  | "numeric_range"
  | "greater_than"
  | "less_than";

export interface ConditionalFeedbackCondition {
  operator: ConditionalFeedbackOperator;
  optionId?: string;
  value?: string;
  min?: number;
  max?: number;
  caseSensitive?: boolean;
}

export interface ConditionalFeedbackRule {
  id: string;
  condition: ConditionalFeedbackCondition;
  content: string;
  priority: number;
}

export interface AuthoringSection {
  id: string;
  type: AuthoringSectionType;
  content?: string;
  conditionalFeedbackRules?: ConditionalFeedbackRule[];
}

export const REQUIRED_AUTHORING_SECTIONS: ReadonlyArray<AuthoringSection> = [
  { id: "question", type: "question" },
  { id: "response", type: "response" },
  { id: "metadata", type: "metadata" },
];

export const OPTIONAL_AUTHORING_SECTION_LABELS: Record<
  OptionalAuthoringSectionType,
  string
> = {
  explanation: "Explanation",
  feedback_correct: "Correct-answer feedback",
  feedback_incorrect: "Incorrect-answer feedback",
  conditional_feedback: "Conditional feedback",
  feedback_partial: "Partial-credit feedback",
  hint: "Hint",
  instructions: "Additional instructions",
};

export function isRequiredAuthoringSection(
  type: AuthoringSectionType,
): type is RequiredAuthoringSectionType {
  return type === "question" || type === "response" || type === "metadata";
}
