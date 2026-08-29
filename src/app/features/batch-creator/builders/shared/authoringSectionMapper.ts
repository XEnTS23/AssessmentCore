import type {
  AuthoringSection,
  ConditionalFeedbackCondition,
  ConditionalFeedbackRule,
} from "../../core/authoringTypes";
import type { ExportConfig } from "../../core/exportTypes";
import type { Question } from "../../core/questionTypes";
import type { QuestionRow } from "../../core/rowTypes";
import { renderRichContent } from "./richContentRenderer";
import { escapeXml } from "./xmlUtils";

export interface ExportAuthoringComponent {
  id: string;
  type: AuthoringSection["type"];
  position: number;
  required: boolean;
  content?: string;
  conditionalFeedbackRules?: ConditionalFeedbackRule[];
  data?: unknown;
}

export interface QtiAuthoringSupport {
  declarations: string;
  body: string;
  processing: string;
  skippedRuleIds: string[];
}

type QtiDialect = "2.1" | "3.0";

const REQUIRED_TYPES = new Set(["question", "response", "metadata"]);

function defaultSections(row: QuestionRow): AuthoringSection[] {
  const sections: AuthoringSection[] = [
    { id: "question", type: "question" },
    { id: "response", type: "response" },
    { id: "metadata", type: "metadata" },
  ];
  const explanation =
    row.normalizedQuestion && "explanation" in row.normalizedQuestion
      ? row.normalizedQuestion.explanation
      : undefined;
  if (explanation?.trim()) {
    sections.push({
      id: "explanation",
      type: "explanation",
      content: explanation,
    });
  }
  return sections;
}

export function getExportAuthoringSections(
  row: QuestionRow,
): AuthoringSection[] {
  return row.manualFixSections !== undefined
    ? row.manualFixSections.map((section) => ({
        ...section,
        conditionalFeedbackRules: section.conditionalFeedbackRules?.map(
          (rule) => ({
            ...rule,
            condition: { ...rule.condition },
          }),
        ),
      }))
    : defaultSections(row);
}

export function buildExportAuthoringComponents(
  row: QuestionRow,
): ExportAuthoringComponent[] {
  const question = row.normalizedQuestion;
  return getExportAuthoringSections(row).map((section, position) => {
    const base: ExportAuthoringComponent = {
      id: section.id,
      type: section.type,
      position,
      required: REQUIRED_TYPES.has(section.type),
    };
    if (section.type === "question") {
      return {
        ...base,
        data: { stem: question && "stem" in question ? question.stem : "" },
      };
    }
    if (section.type === "response") {
      return {
        ...base,
        data: question
          ? Object.fromEntries(
              Object.entries(question).filter(
                ([key]) => key !== "stem" && key !== "explanation",
              ),
            )
          : null,
      };
    }
    if (section.type === "metadata") {
      return {
        ...base,
        data: {
          metadata: row.metadata,
          scoring: row.scoringConfig,
          timeLimit: row.timeLimitConfig,
          mediaReferences: row.mediaReferences,
        },
      };
    }
    return {
      ...base,
      content: section.content || "",
      conditionalFeedbackRules: section.conditionalFeedbackRules,
    };
  });
}

export function buildAssessmentCoreManifestMetadata(row: QuestionRow): string {
  const fields: Array<[string, unknown]> = [
    ["questionId", row.metadata.questionId],
    ["subject", row.metadata.subject],
    ["chapter", row.metadata.chapter],
    ["topic", row.metadata.topic],
    ["difficulty", row.metadata.difficulty],
    ["language", row.metadata.language],
    ["marks", row.scoringConfig.marks],
    ["negativeMarks", row.metadata.negativeMarks],
    ["timeLimitSeconds", row.timeLimitConfig?.timeLimitSeconds],
    [
      "componentOrder",
      getExportAuthoringSections(row)
        .map((section) => section.type)
        .join(","),
    ],
  ];
  const values = fields
    .filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    )
    .map(
      ([name, value]) => `<ac:${name}>${escapeXml(String(value))}</ac:${name}>`,
    )
    .join("");
  return `<ac:questionMetadata>${values}</ac:questionMetadata>`;
}
function tag(dialect: QtiDialect, qti21: string, qti30?: string): string {
  return dialect === "3.0" ? `qti-${qti30 || qti21}` : qti21;
}

function attribute(dialect: QtiDialect, qti21: string, qti30: string): string {
  return dialect === "3.0" ? qti30 : qti21;
}

function baseValue(
  dialect: QtiDialect,
  baseType: "identifier" | "string" | "float",
  value: string | number,
): string {
  const element = tag(dialect, "baseValue", "base-value");
  const typeAttribute = attribute(dialect, "baseType", "base-type");
  return `<${element} ${typeAttribute}="${baseType}">${escapeXml(String(value))}</${element}>`;
}

function variable(dialect: QtiDialect, identifier = "RESPONSE"): string {
  const element = tag(dialect, "variable");
  return `<${element} identifier="${identifier}"/>`;
}

function correctExpression(
  dialect: QtiDialect,
  question: Question | undefined,
): string {
  if (question?.type === "TEXT_ENTRY") {
    if (
      question.mode === "numeric" &&
      question.numericTolerance != null &&
      Number.isFinite(Number(question.acceptedAnswers[0]))
    ) {
      const answer = Number(question.acceptedAnswers[0]);
      const tolerance = Math.max(0, question.numericTolerance);
      return andExpression(dialect, [
        binaryExpression(
          dialect,
          "gte",
          variable(dialect),
          baseValue(dialect, "float", answer - tolerance),
        ),
        binaryExpression(
          dialect,
          "lte",
          variable(dialect),
          baseValue(dialect, "float", answer + tolerance),
        ),
      ]);
    }
    if (question.mode !== "numeric" && question.acceptedAnswers.length) {
      const stringMatch = tag(dialect, "stringMatch", "string-match");
      const caseAttribute = attribute(
        dialect,
        "caseSensitive",
        "case-sensitive",
      );
      const expressions = question.acceptedAnswers
        .filter(Boolean)
        .map(
          (answer) =>
            `<${stringMatch} ${caseAttribute}="${question.caseSensitive ? "true" : "false"}">${variable(dialect)}${baseValue(dialect, "string", answer)}</${stringMatch}>`,
        );
      if (expressions.length === 1) return expressions[0];
      const or = tag(dialect, "or");
      if (expressions.length > 1)
        return `<${or}>${expressions.join("")}</${or}>`;
    }
  }
  const match = tag(dialect, "match");
  const correct = tag(dialect, "correct");
  return `<${match}>${variable(dialect)}<${correct} identifier="RESPONSE"/></${match}>`;
}

function notExpression(dialect: QtiDialect, expression: string): string {
  const not = tag(dialect, "not");
  return `<${not}>${expression}</${not}>`;
}

function binaryExpression(
  dialect: QtiDialect,
  operator: "match" | "member" | "gte" | "lte" | "gt" | "lt",
  left: string,
  right: string,
): string {
  const element = tag(dialect, operator);
  return `<${element}>${left}${right}</${element}>`;
}

function andExpression(dialect: QtiDialect, expressions: string[]): string {
  if (expressions.length === 1) return expressions[0];
  const and = tag(dialect, "and");
  return `<${and}>${expressions.join("")}</${and}>`;
}

function conditionExpression(
  dialect: QtiDialect,
  condition: ConditionalFeedbackCondition,
  question: Question | undefined,
): string | undefined {
  if (!question || question.type === "UNKNOWN" || question.type === "ORDER") {
    return undefined;
  }

  if (condition.operator === "choice_selected") {
    if (
      !condition.optionId ||
      (question.type !== "MCQ" && question.type !== "MSQ")
    ) {
      return undefined;
    }
    const selectedValue = baseValue(dialect, "identifier", condition.optionId);
    return question.type === "MSQ"
      ? binaryExpression(dialect, "member", selectedValue, variable(dialect))
      : binaryExpression(dialect, "match", variable(dialect), selectedValue);
  }

  if (question.type !== "TEXT_ENTRY") return undefined;
  const numeric = question.mode === "numeric";
  if (condition.operator === "equals") {
    if (numeric) {
      const number = Number(condition.value);
      return Number.isFinite(number)
        ? binaryExpression(
            dialect,
            "match",
            variable(dialect),
            baseValue(dialect, "float", number),
          )
        : undefined;
    }
    const stringMatch = tag(dialect, "stringMatch", "string-match");
    const caseAttribute = attribute(dialect, "caseSensitive", "case-sensitive");
    return `<${stringMatch} ${caseAttribute}="${condition.caseSensitive ? "true" : "false"}">${variable(dialect)}${baseValue(dialect, "string", condition.value || "")}</${stringMatch}>`;
  }
  if (condition.operator === "contains" && !numeric) {
    const substring = tag(dialect, "substring");
    const caseAttribute = attribute(dialect, "caseSensitive", "case-sensitive");
    return `<${substring} ${caseAttribute}="${condition.caseSensitive ? "true" : "false"}">${baseValue(dialect, "string", condition.value || "")}${variable(dialect)}</${substring}>`;
  }
  if (!numeric) return undefined;

  if (condition.operator === "numeric_range") {
    const expressions: string[] = [];
    if (Number.isFinite(condition.min)) {
      expressions.push(
        binaryExpression(
          dialect,
          "gte",
          variable(dialect),
          baseValue(dialect, "float", Number(condition.min)),
        ),
      );
    }
    if (Number.isFinite(condition.max)) {
      expressions.push(
        binaryExpression(
          dialect,
          "lte",
          variable(dialect),
          baseValue(dialect, "float", Number(condition.max)),
        ),
      );
    }
    return expressions.length ? andExpression(dialect, expressions) : undefined;
  }

  const comparison = Number(condition.value);
  if (!Number.isFinite(comparison)) return undefined;
  return binaryExpression(
    dialect,
    condition.operator === "greater_than" ? "gt" : "lt",
    variable(dialect),
    baseValue(dialect, "float", comparison),
  );
}

function setOutcome(
  dialect: QtiDialect,
  identifier: string,
  value: string,
): string {
  const set = tag(dialect, "setOutcomeValue", "set-outcome-value");
  return `<${set} identifier="${identifier}">${baseValue(
    dialect,
    "identifier",
    value,
  )}</${set}>`;
}

function feedbackBlock(
  dialect: QtiDialect,
  outcomeIdentifier: string,
  identifier: string,
  label: string,
  content: string,
  config: ExportConfig,
): string {
  const block = tag(dialect, "feedbackBlock", "feedback-block");
  const outcomeAttribute = attribute(
    dialect,
    "outcomeIdentifier",
    "outcome-identifier",
  );
  const showHideAttribute = attribute(dialect, "showHide", "show-hide");
  return `\n    <${block} ${outcomeAttribute}="${outcomeIdentifier}" identifier="${identifier}" ${showHideAttribute}="show"><div><strong>${escapeXml(label)}:</strong> ${renderRichContent(content, config.mathMode)}</div></${block}>`;
}

function outcomeDeclaration(dialect: QtiDialect, identifier: string): string {
  const declaration = tag(dialect, "outcomeDeclaration", "outcome-declaration");
  const baseTypeAttribute = attribute(dialect, "baseType", "base-type");
  return `\n  <${declaration} identifier="${identifier}" cardinality="single" ${baseTypeAttribute}="identifier" />`;
}

function responseCondition(
  dialect: QtiDialect,
  branches: Array<{ expression: string; action: string }>,
  fallbackAction?: string,
): string {
  if (!branches.length && !fallbackAction) return "";
  const condition = tag(dialect, "responseCondition", "response-condition");
  const responseIf = tag(dialect, "responseIf", "response-if");
  const responseElseIf = tag(dialect, "responseElseIf", "response-else-if");
  const responseElse = tag(dialect, "responseElse", "response-else");
  const branchXml = branches
    .map(
      (branch, index) =>
        `<${index === 0 ? responseIf : responseElseIf}>${branch.expression}${branch.action}</${index === 0 ? responseIf : responseElseIf}>`,
    )
    .join("");
  const fallback = fallbackAction
    ? `<${responseElse}>${fallbackAction}</${responseElse}>`
    : "";
  return `\n    <${condition}>${branchXml}${fallback}</${condition}>`;
}

function instructionBlock(
  dialect: QtiDialect,
  content: string,
  config: ExportConfig,
): string {
  const block = tag(dialect, "rubricBlock", "rubric-block");
  return `\n    <${block} view="candidate"><div>${renderRichContent(content, config.mathMode)}</div></${block}>`;
}

export function buildQtiAuthoringSupport(
  row: QuestionRow,
  config: ExportConfig,
  dialect: QtiDialect,
): QtiAuthoringSupport {
  const optionalSections = getExportAuthoringSections(row).filter(
    (section) => !REQUIRED_TYPES.has(section.type),
  );
  const activeSections = optionalSections.filter(
    (section) =>
      section.type === "instructions" || config.feedbackMode !== "strip",
  );
  if (!activeSections.length) {
    return { declarations: "", body: "", processing: "", skippedRuleIds: [] };
  }

  let declarations = "";
  let body = "";
  let processing = "";
  const skippedRuleIds: string[] = [];
  const declaredOutcomes = new Set<string>();
  const responseBodies = new Map<string, string>();
  const conditionalRules: ConditionalFeedbackRule[] = [];
  let auxiliaryIndex = 0;

  const declare = (identifier: string) => {
    if (declaredOutcomes.has(identifier)) return;
    declaredOutcomes.add(identifier);
    declarations += outcomeDeclaration(dialect, identifier);
  };

  for (const section of activeSections) {
    const content = section.content || "";
    if (section.type === "instructions") {
      if (content.trim()) body += instructionBlock(dialect, content, config);
      continue;
    }
    if (section.type === "conditional_feedback") {
      conditionalRules.push(...(section.conditionalFeedbackRules || []));
      continue;
    }
    if (!content.trim()) continue;

    if (
      section.type === "feedback_correct" ||
      section.type === "feedback_incorrect" ||
      section.type === "feedback_partial"
    ) {
      declare("AUTHORING_FEEDBACK");
      const identifier =
        section.type === "feedback_correct"
          ? "CORRECT"
          : section.type === "feedback_partial"
            ? "PARTIAL"
            : "INCORRECT";
      const label =
        section.type === "feedback_correct"
          ? "Correct feedback"
          : section.type === "feedback_partial"
            ? "Partial-credit feedback"
            : "Incorrect feedback";
      responseBodies.set(identifier, content);
      body += feedbackBlock(
        dialect,
        "AUTHORING_FEEDBACK",
        identifier,
        label,
        content,
        config,
      );
      continue;
    }
    if (dialect === "2.1") {
      // In QTI 2.1, explanations are handled by the main builder via EXPLANATION_STATE.
      // Hints are not natively supported in standard 2.1 without extensions, so we drop them
      // here rather than emitting AUTHORING_SECTION_X blocks that duplicate the explanation.
      if (section.type === "hint") {
         skippedRuleIds.push(`hint_${auxiliaryIndex}`);
      }
      continue;
    }

    const outcomeIdentifier = `AUTHORING_SECTION_${auxiliaryIndex}`;
    auxiliaryIndex += 1;
    declare(outcomeIdentifier);
    const label = section.type === "hint" ? "Hint" : "Explanation";
    body += feedbackBlock(
      dialect,
      outcomeIdentifier,
      "SHOW",
      label,
      content,
      config,
    );
    processing += `\n    ${setOutcome(dialect, outcomeIdentifier, "SHOW")}`;
  }

  const sortedRules = [...conditionalRules].sort(
    (left, right) => left.priority - right.priority,
  );
  const conditionalBranches: Array<{ expression: string; action: string }> = [];
  sortedRules.forEach((rule, index) => {
    if (!rule.content.trim()) return;
    const expression = conditionExpression(
      dialect,
      rule.condition,
      row.normalizedQuestion,
    );
    if (!expression) {
      skippedRuleIds.push(rule.id);
      return;
    }
    declare("AUTHORING_FEEDBACK");
    const identifier = `CONDITIONAL_${index + 1}`;
    body += feedbackBlock(
      dialect,
      "AUTHORING_FEEDBACK",
      identifier,
      "Response feedback",
      rule.content,
      config,
    );
    conditionalBranches.push({
      expression: andExpression(dialect, [
        notExpression(
          dialect,
          correctExpression(dialect, row.normalizedQuestion),
        ),
        expression,
      ]),
      action: setOutcome(dialect, "AUTHORING_FEEDBACK", identifier),
    });
  });

  if (declaredOutcomes.has("AUTHORING_FEEDBACK")) {
    const branches: Array<{ expression: string; action: string }> = [
      {
        expression: correctExpression(dialect, row.normalizedQuestion),
        action: setOutcome(
          dialect,
          "AUTHORING_FEEDBACK",
          responseBodies.has("CORRECT") ? "CORRECT" : "NONE",
        ),
      },
      ...conditionalBranches,
    ];
    if (responseBodies.has("PARTIAL")) {
      const gt = binaryExpression(
        dialect,
        "gt",
        variable(dialect, "SCORE"),
        baseValue(dialect, "float", 0),
      );
      const lt = binaryExpression(
        dialect,
        "lt",
        variable(dialect, "SCORE"),
        baseValue(dialect, "float", row.scoringConfig.marks || 1),
      );
      branches.push({
        expression: andExpression(dialect, [gt, lt]),
        action: setOutcome(dialect, "AUTHORING_FEEDBACK", "PARTIAL"),
      });
    }
    const fallback = setOutcome(
      dialect,
      "AUTHORING_FEEDBACK",
      responseBodies.has("INCORRECT") ? "INCORRECT" : "NONE",
    );
    processing += responseCondition(dialect, branches, fallback);
  }

  return { declarations, body, processing, skippedRuleIds };
}
