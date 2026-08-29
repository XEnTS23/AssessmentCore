import { ValidationRule } from "../validation/validationEngine";
import { QuestionRow } from "../core/rowTypes";
import { ValidationIssue } from "../core/issueTypes";

function createIssue(
  rule: Pick<ValidationRule, "id" | "category" | "severity">,
  rowId: string,
  message: string,
  field?: string,
  evidence?: Record<string, unknown>,
  options?: Partial<ValidationIssue>,
): ValidationIssue {
  return {
    id: crypto.randomUUID(),
    ruleId: rule.id,
    rowId,
    category: rule.category,
    severity: rule.severity,
    message,
    field,
    evidence,
    blocksExport:
      rule.severity === "block" || rule.severity === "engine_defect",
    ...options,
  };
}

export const TRUNCATED_STEM: ValidationRule = {
  id: "TRUNCATED_STEM",
  name: "Truncated Stem",
  category: "content_quality",
  severity: "block",
  priority: 95,
  appliesTo: "all",
  validate(row) {
    const q = row.normalizedQuestion;
    const stem =
      q && "stem" in q ? q.stem : q && "rawStem" in q ? q.rawStem : "";
    if (!stem) return [];

    const trimmed = stem.trim();

    // High confidence truncation triggers
    const endsWithEllipsis = /(?:\.\.\.|\u2026)\s*$/.test(trimmed);
    const abruptCutOff =
      /\b(?:the|a|an|is|are|of|in|to|with|and|or|for|if)\s*\.{0,3}\s*$/i.test(
        trimmed,
      );
    const unclosedParen =
      (trimmed.match(/\(/g) || []).length >
        (trimmed.match(/\)/g) || []).length && trimmed.endsWith("...");

    if (endsWithEllipsis || abruptCutOff || unclosedParen) {
      return [
        createIssue(
          this,
          row.id,
          `Question stem appears truncated or incomplete: '${trimmed.slice(-30)}'.`,
          "stem",
          { stemSnippet: trimmed },
        ),
      ];
    }
    return [];
  },
};

export const CONTEXT_MISSING: ValidationRule = {
  id: "CONTEXT_MISSING",
  name: "Context Missing",
  category: "content_quality",
  severity: "block",
  priority: 92,
  appliesTo: "all",
  validate(row, context) {
    const q = row.normalizedQuestion;
    const stem =
      q && "stem" in q ? q.stem : q && "rawStem" in q ? q.rawStem : "";
    if (!stem) return [];

    const lower = stem.toLowerCase();
    const referencesFigure =
      lower.includes("figure below") ||
      lower.includes("diagram below") ||
      lower.includes("shown in the figure");
    const referencesPassage =
      lower.includes("passage above") ||
      lower.includes("preceding information") ||
      lower.includes("following passage");
    const genericStemNoContext =
      /^find the correct answer from the following\.?\s*$/i.test(stem.trim());

    if (genericStemNoContext) {
      return [
        createIssue(
          this,
          row.id,
          "Question stem consists solely of generic text without essential proposition or stimulus.",
          "stem",
        ),
      ];
    }

    if (
      referencesFigure &&
      !row.mediaReferences?.length &&
      !(row.rawRow as any)?.Image_File_Name &&
      !(row.rawRow as any)?.Image_Required
    ) {
      return [
        createIssue(
          this,
          row.id,
          "Question stem references a figure or diagram below, but no image asset is associated. Media is optional, so this question can still be exported.",
          "stem",
          undefined,
          { severity: "caution", blocksExport: false },
        ),
      ];
    }

    if (referencesPassage && !(row.metadata as any)?.passageId) {
      return [
        createIssue(
          this,
          row.id,
          "Question stem references a reading passage, but no passage is linked.",
          "stem",
        ),
      ];
    }

    return [];
  },
};

export const BROKEN_ENCODING: ValidationRule = {
  id: "BROKEN_ENCODING",
  name: "Broken Encoding",
  category: "content_quality",
  severity: "block",
  priority: 98,
  appliesTo: "all",
  validate(row, context) {
    const q = row.normalizedQuestion as any;
    const values: Array<{ field: string; value: unknown }> = [];
    const add = (field: string, value: unknown) =>
      values.push({ field, value });

    // 1. Scan immutable source cells first, before normalization can trim or coerce.
    if (row.raw) {
      for (const [columnName, sourceCell] of Object.entries(row.raw.cells)) {
        if (sourceCell.rawText) add(`raw:${columnName}`, sourceCell.rawText);
      }
    } else if (row.rawRow && typeof row.rawRow === "object") {
      for (const [columnName, cellValue] of Object.entries(row.rawRow)) {
        if (typeof cellValue === "string" && cellValue.length > 0) {
          add(`raw:${columnName}`, cellValue);
        }
      }
    }

    // 2. Then scan normalized question fields
    add("stem", q?.stem ?? q?.rawStem);
    (q?.options || []).forEach((option: any, index: number) => {
      add(`options[${index}].text`, option?.text);
    });
    add(
      "correctAnswer",
      q?.correctAnswerId ?? q?.correctAnswerIds ?? q?.correctSequenceIds,
    );
    (q?.acceptedAnswers || []).forEach((answer: unknown, index: number) => {
      add(`acceptedAnswers[${index}]`, answer);
    });
    add("explanation", q?.explanation);
    add("subject", row.metadata?.subject);
    add("chapter", row.metadata?.chapter);
    add("topic", row.metadata?.topic);
    row.mediaReferences?.forEach((media, index) =>
      add(`mediaReferences[${index}].altText`, media.altText),
    );

    const rawAnswerColumn =
      context.columnMapping.correctAnswer ||
      context.columnMapping.acceptedAnswers;
    if (rawAnswerColumn) add("correctAnswer", row.rawRow[rawAnswerColumn]);

    const issues: ValidationIssue[] = [];
    const seenFields = new Set<string>();
    for (const { field, value } of values) {
      const strings = Array.isArray(value)
        ? value.map(String)
        : typeof value === "string"
          ? [value]
          : [];
      for (const candidate of strings) {
        const containsReplacementCharacter = candidate.includes("\uFFFD");
        const containsNullByte = candidate.includes("\u0000");
        const containsDisallowedControl =
          /[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(candidate);
        // Target unmistakable UTF-8-as-Windows-1252 sequences without
        // classifying legitimate U+00C2 U+00B2 mathematics as corrupt.
        const mojibakeSequences =
          candidate.match(
            /(?:\u00C3[\u0080-\u00BF]|\u00E2(?:\u20AC[\u0080-\uFFFF]|\u0080[\u0080-\u00BF])|\u00EF\u00BF\u00BD)/g,
          ) || [];
        if (
          !containsReplacementCharacter &&
          !containsNullByte &&
          !containsDisallowedControl &&
          mojibakeSequences.length === 0
        )
          continue;

        // Deduplicate: only one issue per broken field
        const canonicalField = field.replace(/^raw:/, "");
        if (seenFields.has(canonicalField)) continue;
        seenFields.add(canonicalField);

        // Build evidence with snippet and code points
        const codePoints: string[] = [];
        const characterIndexes: number[] = [];
        for (let i = 0; i < candidate.length; i++) {
          const cp = candidate.codePointAt(i)!;
          if (
            cp === 0xfffd ||
            cp === 0 ||
            (cp >= 1 && cp <= 8) ||
            cp === 0x0b ||
            cp === 0x0c ||
            (cp >= 0x0e && cp <= 0x1f) ||
            cp === 0x7f ||
            (mojibakeSequences.length > 0 && cp > 0x7f)
          ) {
            codePoints.push(
              `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`,
            );
            characterIndexes.push(i);
          }
        }

        const snippetStart = Math.max(0, (characterIndexes[0] ?? 0) - 20);
        const snippetEnd = Math.min(
          candidate.length,
          (characterIndexes[0] ?? 0) + 30,
        );
        const rawSnippet = candidate.slice(snippetStart, snippetEnd);

        issues.push(
          createIssue(
            this,
            row.id,
            `Field '${canonicalField}' contains a Unicode replacement character, null byte, or disallowed control character.`,
            canonicalField,
            {
              sourceColumn: canonicalField,
              rawSnippet,
              codePoints,
              characterIndexes,
              containsReplacementCharacter,
              containsNullByte,
              containsDisallowedControl,
              mojibakeSequences,
              codePointTrace: Array.from(rawSnippet).map((char, index) => ({
                index: snippetStart + index,
                char,
                codePoint: `U+${char
                  .codePointAt(0)!
                  .toString(16)
                  .toUpperCase()
                  .padStart(4, "0")}`,
              })),
            },
            {
              allowedCorrections: [
                {
                  actionId: "open_original_source",
                  label: "Open the original source",
                  mode: "manual_only",
                },
                {
                  actionId: "restore_character",
                  label: "Restore the intended character manually",
                  mode: "manual_only",
                },
                {
                  actionId: "upload_corrected",
                  label: "Upload a corrected source file",
                  mode: "manual_only",
                },
                {
                  actionId: "exclude_row",
                  label: "Exclude the row",
                  mode: "manual_only",
                },
              ],
            },
          ),
        );
        break; // One issue per row is enough
      }
      if (issues.length > 0) break; // Stop after first broken field found
    }
    return issues;
  },
};
