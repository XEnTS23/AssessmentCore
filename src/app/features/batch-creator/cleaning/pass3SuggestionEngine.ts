import { QuestionRow } from "../core/rowTypes";
import { ValidationIssue } from "../core/issueTypes";
import { FixSuggestion, RowPatch, SuggestionResult } from "../core/fixTypes";
import {
  McqQuestion,
  MsqQuestion,
  TextEntryQuestion,
  Option,
} from "../core/questionTypes";
import { generateLatexSuggestions } from "./latexStructuralAutoRepair";

// ─── Pass 3: Suggestion Engine ──────────────────────────────────────
//
// Generates deterministic fix suggestions for remaining validation
// issues. Every suggestion includes a patch, confidence level, and
// whether it can be auto-applied.
//
// Safety rules:
//  - No auto-apply for fuzzy match if multiple candidates are close.
//  - No auto-selecting the only option as MCQ answer.
//  - No silent MCQ → MSQ conversion.
//  - No auto-apply for low-confidence suggestions.
//  - Every applied patch must be re-validated by the patch engine.
// ─────────────────────────────────────────────────────────────────────

type SuggestionGenerator = (
  row: QuestionRow,
  issue: ValidationIssue,
) => FixSuggestion[];

/** Registry of rule-ID → suggestion generator functions */
const GENERATORS = new Map<string, SuggestionGenerator>();

// ─── Generator registration ─────────────────────────────────────────

function register(ruleId: string, gen: SuggestionGenerator) {
  GENERATORS.set(ruleId, gen);
}

// ─── Main API ────────────────────────────────────────────────────────

/**
 * Generate suggestions for all issues across a batch of rows.
 */
export function pass3GenerateSuggestions(
  rows: QuestionRow[],
  exportConfig?: any,
): SuggestionResult {
  const suggestions: FixSuggestion[] = [];
  const byRow: Record<string, FixSuggestion[]> = {};

  for (const row of rows) {
    const rowSuggestions: FixSuggestion[] = [];

    for (const issue of row.issues) {
      const generator = GENERATORS.get(issue.ruleId);
      if (generator) {
        const generated = generator(row, issue);
        rowSuggestions.push(...generated);
      }
    }

    const latexSuggestions = generateLatexSuggestions(row, exportConfig);
    rowSuggestions.push(...latexSuggestions);

    if (rowSuggestions.length > 0) {
      suggestions.push(...rowSuggestions);
      byRow[row.id] = rowSuggestions;
    }
  }

  return {
    suggestions,
    byRow,
    autoApplicable: suggestions.filter((s) => s.autoApplicable),
    requiresReview: suggestions.filter((s) => s.requiresUserApproval),
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────

function makeSuggestion(
  issueId: string,
  ruleId: string,
  label: string,
  confidence: "high" | "medium" | "low",
  autoApplicable: boolean,
  patch: RowPatch,
): FixSuggestion {
  return {
    id: crypto.randomUUID(),
    issueId,
    ruleId,
    label,
    confidence,
    autoApplicable: autoApplicable && confidence === "high",
    requiresUserApproval: !autoApplicable || confidence !== "high",
    patch,
  };
}

function makePatch(
  rowId: string,
  path: string,
  before: unknown,
  after: unknown,
): RowPatch {
  return { rowId, changes: [{ path, before, after }] };
}

/**
 * Compute Levenshtein distance between two strings (case-insensitive).
 */
function levenshtein(a: string, b: string): number {
  const la = a.toLowerCase();
  const lb = b.toLowerCase();
  const m = la.length;
  const n = lb.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0),
  );
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        la[i - 1] === lb[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }

  return dp[m][n];
}

// ─── Suggestion Generators ──────────────────────────────────────────

// 1. MCQ_ANSWER_IN_OPTIONS — answer doesn't match any option
register("MCQ_ANSWER_IN_OPTIONS", (row, issue) => {
  const q = row.normalizedQuestion as McqQuestion;
  if (!q || !q.options || !q.correctAnswerId) return [];

  const rawAnswer = q.correctAnswerId;
  const suggestions: FixSuggestion[] = [];

  // (a) Case-insensitive label match
  const upperAnswer = rawAnswer.trim().toUpperCase();
  const labelMatch = q.options.find(
    (o) => o.label.toUpperCase() === upperAnswer,
  );
  if (labelMatch) {
    suggestions.push(
      makeSuggestion(
        issue.id,
        issue.ruleId,
        `Match answer "${rawAnswer}" to option ${labelMatch.label} (case alignment)`,
        "high",
        true,
        makePatch(
          row.id,
          "normalizedQuestion.correctAnswerId",
          rawAnswer,
          labelMatch.id,
        ),
      ),
    );
    return suggestions;
  }

  // (b) Exact text match (case-insensitive)
  const exactTextMatches = q.options.filter(
    (o) => o.text.trim().toLowerCase() === rawAnswer.trim().toLowerCase(),
  );
  if (exactTextMatches.length === 1) {
    suggestions.push(
      makeSuggestion(
        issue.id,
        issue.ruleId,
        `Match answer text "${rawAnswer}" to option ${exactTextMatches[0].label}`,
        "high",
        true,
        makePatch(
          row.id,
          "normalizedQuestion.correctAnswerId",
          rawAnswer,
          exactTextMatches[0].id,
        ),
      ),
    );
    return suggestions;
  }

  // (c) Fuzzy match — only if a single option is close
  const fuzzyResults = q.options
    .map((o) => ({
      option: o,
      distance: levenshtein(rawAnswer.trim(), o.text.trim()),
    }))
    .filter(
      (r) => r.distance <= Math.max(2, Math.floor(rawAnswer.length * 0.3)),
    )
    .sort((a, b) => a.distance - b.distance);

  if (fuzzyResults.length === 1) {
    const best = fuzzyResults[0];
    suggestions.push(
      makeSuggestion(
        issue.id,
        issue.ruleId,
        `Fuzzy match: "${rawAnswer}" → option ${best.option.label} ("${best.option.text}", distance: ${best.distance})`,
        "medium",
        false, // NEVER auto-apply fuzzy
        makePatch(
          row.id,
          "normalizedQuestion.correctAnswerId",
          rawAnswer,
          best.option.id,
        ),
      ),
    );
  } else if (fuzzyResults.length > 1) {
    // Multiple close matches — generate individual suggestions, all require review
    for (const result of fuzzyResults.slice(0, 3)) {
      suggestions.push(
        makeSuggestion(
          issue.id,
          issue.ruleId,
          `Fuzzy match (ambiguous): "${rawAnswer}" → option ${result.option.label} ("${result.option.text}", distance: ${result.distance})`,
          "low",
          false,
          makePatch(
            row.id,
            "normalizedQuestion.correctAnswerId",
            rawAnswer,
            result.option.id,
          ),
        ),
      );
    }
  }

  // (d) If there are options but no match at all, suggest each option (user must pick)
  if (suggestions.length === 0 && q.options.length > 0) {
    for (const opt of q.options) {
      suggestions.push(
        makeSuggestion(
          issue.id,
          issue.ruleId,
          `Set correct answer to option ${opt.label} ("${opt.text}")`,
          "low",
          false,
          makePatch(
            row.id,
            "normalizedQuestion.correctAnswerId",
            rawAnswer,
            opt.id,
          ),
        ),
      );
    }
  }

  return suggestions;
});

// 2. MSQ_CORRECT_ANSWERS_IN_OPTIONS — same logic for MSQ
register("MSQ_CORRECT_ANSWERS_IN_OPTIONS", (row, issue) => {
  const q = row.normalizedQuestion as MsqQuestion;
  if (!q || !q.options || !q.correctAnswerIds) return [];

  const optionIds = new Set(q.options.map((o) => o.id));
  const invalid = q.correctAnswerIds.filter((id) => !optionIds.has(id));
  const replacements = new Map<string, Option>();

  for (const badId of invalid) {
    const upperBad = badId.trim().toUpperCase();
    const labelMatches = q.options.filter(
      (o) => o.label.toUpperCase() === upperBad,
    );
    const textMatches = q.options.filter(
      (o) => o.text.trim().toLowerCase() === badId.trim().toLowerCase(),
    );
    const matches = labelMatches.length === 1 ? labelMatches : textMatches;
    if (matches.length !== 1) return [];
    replacements.set(badId, matches[0]);
  }

  if (!invalid.length || replacements.size !== invalid.length) return [];
  const newIds = q.correctAnswerIds.map((id) => replacements.get(id)?.id || id);
  const resolvedLabels = invalid
    .map((id) => `${id} → ${replacements.get(id)!.label}`)
    .join(", ");

  return [
    makeSuggestion(
      issue.id,
      issue.ruleId,
      `Resolve all answer identifiers (${resolvedLabels})`,
      "high",
      true,
      makePatch(
        row.id,
        "normalizedQuestion.correctAnswerIds",
        q.correctAnswerIds,
        newIds,
      ),
    ),
  ];
});

// 3. MCQ_SHOULD_BE_MSQ_REVIEW — type conversion suggestion
register("MCQ_SHOULD_BE_MSQ_REVIEW", (row, issue) => {
  const q = row.normalizedQuestion as McqQuestion;
  if (!q) return [];

  // NEVER auto-apply type conversion
  return [
    makeSuggestion(
      issue.id,
      issue.ruleId,
      "Convert question type from MCQ to MSQ (multiple correct answers detected)",
      "medium",
      false,
      {
        rowId: row.id,
        changes: [
          { path: "normalizedQuestion.type", before: "MCQ", after: "MSQ" },
          {
            path: "normalizedQuestion.correctAnswerIds",
            before: undefined,
            after: q.correctAnswerId
              ? q.correctAnswerId
                  .split(/[,;|]/)
                  .map((s) => s.trim())
                  .filter(Boolean)
              : [],
          },
        ],
      },
    ),
  ];
});

// 4. MCQ_SINGLE_CORRECT_ONLY — multiple answers in MCQ
register("MCQ_SINGLE_CORRECT_ONLY", (row, issue) => {
  const q = row.normalizedQuestion as McqQuestion;
  if (!q || !q.correctAnswerId) return [];

  const parts = q.correctAnswerId
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length <= 1) return [];

  const suggestions: FixSuggestion[] = [];

  // Suggest keeping only the first answer
  suggestions.push(
    makeSuggestion(
      issue.id,
      issue.ruleId,
      `Keep only the first answer: "${parts[0]}"`,
      "low",
      false,
      makePatch(
        row.id,
        "normalizedQuestion.correctAnswerId",
        q.correctAnswerId,
        parts[0],
      ),
    ),
  );

  return suggestions;
});

// 5. MCQ_HAS_CORRECT_ANSWER — missing answer
register("MCQ_HAS_CORRECT_ANSWER", (row, issue) => {
  const q = row.normalizedQuestion as McqQuestion;
  if (!q || !q.options || q.options.length === 0) return [];

  // Do NOT auto-select any option — user must pick
  return q.options.map((opt) =>
    makeSuggestion(
      issue.id,
      issue.ruleId,
      `Set correct answer to option ${opt.label} ("${opt.text}")`,
      "low",
      false,
      makePatch(row.id, "normalizedQuestion.correctAnswerId", "", opt.id),
    ),
  );
});

// 6. MSQ_HAS_CORRECT_ANSWERS — missing answers
register("MSQ_HAS_CORRECT_ANSWERS", (row, issue) => {
  // Can't guess which options are correct — require user input
  return [
    makeSuggestion(
      issue.id,
      issue.ruleId,
      "No correct answers defined. Please select the correct options manually.",
      "low",
      false,
      makePatch(row.id, "normalizedQuestion.correctAnswerIds", [], []),
    ),
  ];
});

// 7. MSQ_NO_DUPLICATE_CORRECT_ANSWERS — deduplicate
register("MSQ_NO_DUPLICATE_CORRECT_ANSWERS", (row, issue) => {
  const q = row.normalizedQuestion as MsqQuestion;
  if (!q || !q.correctAnswerIds) return [];

  const deduped = Array.from(new Set(q.correctAnswerIds));

  return [
    makeSuggestion(
      issue.id,
      issue.ruleId,
      `Remove duplicate correct answer IDs (${q.correctAnswerIds.length} → ${deduped.length})`,
      "high",
      true,
      makePatch(
        row.id,
        "normalizedQuestion.correctAnswerIds",
        q.correctAnswerIds,
        deduped,
      ),
    ),
  ];
});

// 8. TEXT_ENTRY_CASE_POLICY_DEFINED — default case policy
register("TEXT_ENTRY_CASE_POLICY_DEFINED", (row, issue) => {
  return [
    makeSuggestion(
      issue.id,
      issue.ruleId,
      "Set case sensitivity to false (case-insensitive comparison)",
      "high",
      true,
      makePatch(row.id, "normalizedQuestion.caseSensitive", undefined, false),
    ),
  ];
});

// 9. TEXT_ENTRY_TRIM_POLICY_DEFINED — default trim policy
register("TEXT_ENTRY_TRIM_POLICY_DEFINED", (row, issue) => {
  return [
    makeSuggestion(
      issue.id,
      issue.ruleId,
      "Enable whitespace trimming for answer comparison",
      "high",
      true,
      makePatch(row.id, "normalizedQuestion.trimPolicy", undefined, "trim"),
    ),
  ];
});

// 10. TEXT_ENTRY_NUMERIC_ANSWER_VALID — numeric parse suggestion
register("TEXT_ENTRY_NUMERIC_ANSWER_VALID", (row, issue) => {
  const q = row.normalizedQuestion as TextEntryQuestion;
  if (!q || !q.acceptedAnswers) return [];

  const suggestions: FixSuggestion[] = [];

  for (let i = 0; i < q.acceptedAnswers.length; i++) {
    const ans = q.acceptedAnswers[i];
    const num = Number(ans);
    if (isNaN(num)) {
      // Try cleaning common issues: commas as thousands separators, trailing units
      const cleaned = ans
        .replace(/,/g, "")
        .replace(/[^0-9.\-+eE]/g, "")
        .trim();
      const cleanedNum = Number(cleaned);
      if (!isNaN(cleanedNum) && cleaned !== "") {
        const newAnswers = [...q.acceptedAnswers];
        newAnswers[i] = cleaned;
        suggestions.push(
          makeSuggestion(
            issue.id,
            issue.ruleId,
            `Clean numeric answer: "${ans}" → "${cleaned}"`,
            "medium",
            false,
            makePatch(
              row.id,
              "normalizedQuestion.acceptedAnswers",
              q.acceptedAnswers,
              newAnswers,
            ),
          ),
        );
      }
    }
  }

  return suggestions;
});

// 11. TEXT_ENTRY_NUMERIC_TOLERANCE_VALID — suggest default tolerance
register("TEXT_ENTRY_NUMERIC_TOLERANCE_VALID", (row, issue) => {
  return [
    makeSuggestion(
      issue.id,
      issue.ruleId,
      "Set numeric tolerance to 0 (exact match)",
      "medium",
      false,
      makePatch(row.id, "normalizedQuestion.numericTolerance", undefined, 0),
    ),
  ];
});

// 12. GENERAL_STEM_NOT_EMPTY — can't fix, but hint
register("GENERAL_STEM_NOT_EMPTY", (_row, issue) => {
  return [
    makeSuggestion(
      issue.id,
      issue.ruleId,
      "Question stem is empty. Please provide the question text manually.",
      "low",
      false,
      makePatch(_row.id, "normalizedQuestion.stem", "", ""),
    ),
  ];
});
