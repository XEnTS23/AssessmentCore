import { ValidationRule } from "../validation/validationEngine";
import { QuestionRow } from "../core/rowTypes";
import { ValidationIssue } from "../core/issueTypes";
import { analyzeLatexDelimiters } from "../validation/latexDelimiterValidator";

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

export const MALFORMED_LATEX_DELIMITER: ValidationRule = {
  id: "MALFORMED_LATEX_DELIMITER",
  name: "Malformed LaTeX Delimiter",
  category: "rendering",
  severity: "block",
  priority: 95,
  appliesTo: "all",
  validate(row) {
    const q = row.normalizedQuestion;
    if (!q || q.type === "UNKNOWN" || !("stem" in q) || !q.stem) return [];

    const analysis = analyzeLatexDelimiters(q.stem);
    const structuralIssue = analysis.issues.find(
      (i) => i.code !== "LATEX_DELIMITER_MISSING",
    );
    if (structuralIssue) {
      return [
        createIssue(
          this,
          row.id,
          `Malformed LaTeX delimiter in stem: ${structuralIssue.message}`,
          "stem",
          {
            issueCode: structuralIssue.code,
            index: structuralIssue.index,
            delimiter: structuralIssue.delimiter,
          },
        ),
      ];
    }
    return [];
  },
};

export const MATH_RENDER_FAILED: ValidationRule = {
  id: "MATH_RENDER_FAILED",
  name: "Math Render Failed",
  category: "rendering",
  severity: "block",
  priority: 96,
  appliesTo: "all",
  validate(row) {
    if ((row as any).__mathRenderError) {
      return [
        createIssue(
          this,
          row.id,
          `KaTeX/MathJax rendering failed: ${(row as any).__mathRenderError}`,
          "stem",
          { error: (row as any).__mathRenderError },
        ),
      ];
    }
    return [];
  },
};

export const UNSUPPORTED_MATH_FORMAT: ValidationRule = {
  id: "UNSUPPORTED_MATH_FORMAT",
  name: "Unsupported Math Format",
  category: "rendering",
  severity: "review",
  priority: 85,
  appliesTo: "all",
  validate(row) {
    const stem =
      (row.normalizedQuestion && "stem" in row.normalizedQuestion
        ? row.normalizedQuestion.stem
        : "") || "";
    if (
      stem.includes("<math") ||
      stem.includes("MathType") ||
      stem.includes("w:object")
    ) {
      return [
        createIssue(
          this,
          row.id,
          "Source text contains MathType or MathML objects requiring LaTeX conversion.",
          "stem",
        ),
      ];
    }
    return [];
  },
};

export const UNICODE_MATH_FALSE_POSITIVE: ValidationRule = {
  id: "UNICODE_MATH_FALSE_POSITIVE",
  name: "Unicode Math False Positive Check",
  category: "system_defect",
  severity: "engine_defect",
  priority: 50,
  appliesTo: "all",
  validate(row) {
    const stem =
      (row.normalizedQuestion && "stem" in row.normalizedQuestion
        ? row.normalizedQuestion.stem
        : "") || "";
    // If a rule flagged valid Unicode math (e.g. ∫₀¹ x² dx) as a block error when renderer succeeds, trigger defect
    if (
      /[∫∑√αβγπ∞±≠≤≥]/.test(stem) &&
      (row as any).__unicodeMathFlaggedAsBlock
    ) {
      return [
        createIssue(
          this,
          row.id,
          "Validator defect: Valid Unicode math symbol flagged as a blocking LaTeX error.",
          "stem",
        ),
      ];
    }
    return [];
  },
};

export const LANGUAGE_METADATA_MISMATCH: ValidationRule = {
  id: "LANGUAGE_METADATA_MISMATCH",
  name: "Language Metadata Mismatch",
  category: "metadata",
  severity: "review",
  priority: 75,
  appliesTo: "all",
  validate(row) {
    const lang = row.metadata?.language?.toLowerCase();
    const stem =
      (row.normalizedQuestion && "stem" in row.normalizedQuestion
        ? row.normalizedQuestion.stem
        : "") || "";
    // Hindi Devanagari detection
    const containsDevanagari = /[\u0900-\u097F]/.test(stem);
    if (lang === "english" && containsDevanagari) {
      return [
        createIssue(
          this,
          row.id,
          "Language metadata is set to English, but text contains Devanagari (Hindi) script.",
          "language",
          { declaredLanguage: lang, stemSnippet: stem.slice(0, 40) },
        ),
      ];
    }
    return [];
  },
};

export const UNSUPPORTED_HTML_OR_SCRIPT: ValidationRule = {
  id: "UNSUPPORTED_HTML_OR_SCRIPT",
  name: "Unsupported HTML or Script",
  category: "rendering",
  severity: "block",
  priority: 98,
  appliesTo: "all",
  validate(row) {
    const stem =
      (row.normalizedQuestion && "stem" in row.normalizedQuestion
        ? row.normalizedQuestion.stem
        : "") || "";
    if (/<script|onerror=|onload=|javascript:/i.test(stem)) {
      return [
        createIssue(
          this,
          row.id,
          "Unsafe HTML script or event handler detected in question text.",
          "stem",
        ),
      ];
    }
    return [];
  },
};
