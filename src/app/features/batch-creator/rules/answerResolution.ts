import { Option } from "../core/questionTypes";
import { QuestionRow } from "../core/rowTypes";
import { ValidationContext } from "../validation/validationEngine";

export type AnswerTokenResolutionKind =
  | "direct"
  | "text"
  | "ambiguous"
  | "unmatched";

export interface AnswerTokenResolution {
  token: string;
  kind: AnswerTokenResolutionKind;
  matchingOptionIds: string[];
}

function normalizeToken(value: unknown): string {
  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en-US");
}

function hasAuthoritativeQuestionOverride(row: QuestionRow): boolean {
  return row.history.some((entry) => {
    const changes = (
      entry.previousState as
        | {
            patchChanges?: Array<{ path?: unknown }>;
          }
        | undefined
    )?.patchChanges;
    if (!Array.isArray(changes)) return false;

    return changes.some((change) => {
      if (typeof change.path !== "string") return false;
      return (
        change.path === "normalizedQuestion" ||
        change.path.startsWith("normalizedQuestion.options") ||
        change.path.startsWith("normalizedQuestion.correctAnswer")
      );
    });
  });
}

function inferAnswerColumn(row: QuestionRow): string | undefined {
  const keys = Object.keys(row.rawRow);
  const exact = keys.find((key) => {
    const normalized = key.toLocaleLowerCase("en-US").replace(/[^a-z0-9]/g, "");
    return [
      "answer",
      "correctanswer",
      "correctanswers",
      "correctresponse",
      "response",
    ].includes(normalized);
  });
  if (exact) return exact;

  return keys.find((key) => {
    const normalized = key.toLocaleLowerCase("en-US");
    return (
      (normalized.includes("answer") ||
        normalized.includes("correct response")) &&
      !normalized.includes("explanation")
    );
  });
}

/**
 * Raw answer provenance is useful only until an explicit option/answer edit is
 * applied. After that, the normalized question is the authoritative revision.
 */
export function readRawAnswer(
  row: QuestionRow,
  context: ValidationContext,
): string | undefined {
  if (hasAuthoritativeQuestionOverride(row)) return undefined;

  const mappedColumn = context.columnMapping.correctAnswer;
  const column =
    mappedColumn &&
    Object.prototype.hasOwnProperty.call(row.rawRow, mappedColumn)
      ? mappedColumn
      : inferAnswerColumn(row);
  if (!column) return undefined;

  const value = row.rawRow[column];
  if (value === null || value === undefined) return undefined;
  const normalized = String(value).trim();
  return normalized === "" ? undefined : normalized;
}

export function splitMsqAnswer(rawAnswer: string): string[] {
  return rawAnswer
    .split(/[,|;]/)
    .map((token) => token.trim())
    .filter(Boolean);
}

export function resolveAnswerTokens(
  tokens: string[],
  options: Option[],
): AnswerTokenResolution[] {
  return tokens.map((token) => {
    const normalizedToken = normalizeToken(token);
    const directMatches = options.filter(
      (option) =>
        normalizeToken(option.id) === normalizedToken ||
        normalizeToken(option.label) === normalizedToken,
    );
    if (directMatches.length > 0) {
      return {
        token,
        kind: "direct" as const,
        matchingOptionIds: directMatches.map((option) => option.id),
      };
    }

    const textMatches = options.filter(
      (option) => normalizeToken(option.text) === normalizedToken,
    );
    if (textMatches.length === 1) {
      return {
        token,
        kind: "text" as const,
        matchingOptionIds: [textMatches[0].id],
      };
    }
    if (textMatches.length > 1) {
      return {
        token,
        kind: "ambiguous" as const,
        matchingOptionIds: textMatches.map((option) => option.id),
      };
    }

    return {
      token,
      kind: "unmatched" as const,
      matchingOptionIds: [],
    };
  });
}
