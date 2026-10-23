import { afterEach, describe, expect, it, vi } from "vitest";
import type { QuestionRow } from "../core/rowTypes";
import { rowToEditorState } from "./manualFixEngine";
import { ValidationEngine } from "../validation/validationEngine";
import { getDefaultRuleRegistry } from "../validation/ruleRegistry";
import { validateManualFixDraft } from "./manualFixDraftValidation";
import { createLatestValidationScheduler } from "./latestValidationScheduler";

function createRow(stem: string): QuestionRow {
  return {
    id: "manual-fix-row",
    sourceRowNumber: 2,
    rawRow: {},
    normalizedQuestion: {
      type: "MCQ",
      stem,
      options: [
        { id: "A", label: "A", text: "3/4" },
        { id: "B", label: "B", text: "1/2" },
      ],
      correctAnswerId: "A",
      explanation:
        "Calculated by adding fractions with a common denominator 4.",
    },
    metadata: { subject: "Mathematics" },
    mediaReferences: [],
    mathReferences: [],
    scoringConfig: { marks: 1, partialMarking: false },
    history: [],
    status: "normalized",
    issues: [],
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("Manual Fix draft validation", () => {
  it("validates the unsaved draft without mutating the saved row", () => {
    const engine = new ValidationEngine(getDefaultRuleRegistry());
    const savedRow = createRow("Find \\frac{1}{2} + \\frac{1}{4}.");
    const editorState = rowToEditorState(savedRow);
    editorState.stem = "Find $\\frac{1}{2} + \\frac{1}{4}$.";

    const validated = validateManualFixDraft({
      row: savedRow,
      editorState,
      engine,
      context: { allRows: [savedRow], columnMapping: {} },
    });

    expect(validated.status).toBe("valid");
    expect(validated.issues).toEqual([]);
    expect(
      savedRow.normalizedQuestion && "stem" in savedRow.normalizedQuestion
        ? savedRow.normalizedQuestion.stem
        : "",
    ).toBe("Find \\frac{1}{2} + \\frac{1}{4}.");
  });

  it("returns current validation issues for an invalid draft", () => {
    const engine = new ValidationEngine(getDefaultRuleRegistry());
    const savedRow = createRow("Find $\\frac{1}{2} + \\frac{1}{4}$.");
    const editorState = rowToEditorState(savedRow);
    editorState.stem = "Find \\frac{1}{2} + \\frac{1}{4}.";

    const validated = validateManualFixDraft({
      row: savedRow,
      editorState,
      engine,
      context: { allRows: [savedRow], columnMapping: {} },
    });

    expect(validated.status).toBe("needs_review");
    expect(validated.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ruleId: "LATEX_STEM_DELIMITER_VALID" }),
      ]),
    );
  });

  it("accepts equation-editor KaTeX markup by validating its canonical LaTeX", () => {
    const engine = new ValidationEngine(getDefaultRuleRegistry());
    const savedRow = createRow("Find the value.");
    const editorState = rowToEditorState(savedRow);
    editorState.stem =
      'Find <span class="math-inline" data-math-rendered="true" ' +
      'data-latex="\\frac{1}{2}"><span class="katex">' +
      '<span class="katex-mathml"><math><mfrac /></math></span>' +
      '<span class="katex-html"><span>1/2</span></span></span></span>.';

    const validated = validateManualFixDraft({
      row: savedRow,
      editorState,
      engine,
      context: { allRows: [savedRow], columnMapping: {} },
    });
    const ruleIds = validated.issues.map((issue) => issue.ruleId);

    expect(ruleIds).not.toContain("LATEX_STEM_DELIMITER_VALID");
    expect(ruleIds).not.toContain("MALFORMED_LATEX_DELIMITER");
    expect(ruleIds).not.toContain("UNSUPPORTED_MATH_FORMAT");
    expect(
      validated.normalizedQuestion &&
        "stem" in validated.normalizedQuestion &&
        validated.normalizedQuestion.stem,
    ).toBe("Find $\\frac{1}{2}$.");
  });
});

describe("latest validation scheduler", () => {
  it("debounces rapid edits and publishes only the newest result", async () => {
    vi.useFakeTimers();
    const validate = vi.fn((value: string) => value.toUpperCase());
    const completed: string[] = [];
    const scheduler = createLatestValidationScheduler(validate, 400);
    const handlers = {
      onStart: vi.fn(),
      onComplete: (result: string) => completed.push(result),
      onError: vi.fn(),
    };

    scheduler.schedule("first", handlers);
    vi.advanceTimersByTime(200);
    scheduler.schedule("latest", handlers);
    await vi.runAllTimersAsync();

    expect(validate).toHaveBeenCalledTimes(1);
    expect(validate).toHaveBeenCalledWith("latest");
    expect(completed).toEqual(["LATEST"]);
  });

  it("ignores an older asynchronous result that finishes last", async () => {
    vi.useFakeTimers();
    const resolvers: Array<(value: string) => void> = [];
    const scheduler = createLatestValidationScheduler(
      () => new Promise<string>((resolve) => resolvers.push(resolve)),
      0,
    );
    const completed: string[] = [];
    const handlers = {
      onStart: vi.fn(),
      onComplete: (result: string) => completed.push(result),
      onError: vi.fn(),
    };

    scheduler.schedule("first", handlers);
    await vi.runOnlyPendingTimersAsync();
    scheduler.schedule("latest", handlers);
    await vi.runOnlyPendingTimersAsync();

    resolvers[1]("latest-result");
    await Promise.resolve();
    resolvers[0]("stale-result");
    await Promise.resolve();

    expect(completed).toEqual(["latest-result"]);
  });

  it("does not publish after cancellation", async () => {
    vi.useFakeTimers();
    const completed = vi.fn();
    const scheduler = createLatestValidationScheduler(
      (value: string) => value,
      400,
    );

    scheduler.schedule("cancelled", {
      onStart: vi.fn(),
      onComplete: completed,
      onError: vi.fn(),
    });
    scheduler.cancel();
    await vi.runAllTimersAsync();

    expect(completed).not.toHaveBeenCalled();
  });
});
