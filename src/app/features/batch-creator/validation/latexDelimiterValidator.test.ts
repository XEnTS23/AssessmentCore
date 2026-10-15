import { describe, expect, it } from "vitest";
import {
  analyzeLatexDelimiters,
  LATEX_DELIMITER_ISSUE_CODES,
} from "./latexDelimiterValidator";

function issueCodes(value: string): string[] {
  return analyzeLatexDelimiters(value).issues.map((issue) => issue.code);
}

describe("analyzeLatexDelimiters", () => {
  it("accepts plain prose and complete inline/display math regions", () => {
    expect(issueCodes("Which city is the capital of France?")).toEqual([]);
    expect(issueCodes("Solve $x^2 + 2x + 1 = 0$.")).toEqual([]);
    expect(issueCodes("Solve \\(x + 2 = 5\\).")).toEqual([]);
    expect(issueCodes("Evaluate \\[\\frac{1}{2} + \\frac{1}{4}\\].")).toEqual(
      [],
    );
    expect(issueCodes("Use $$x^2 + y^2 = z^2$$ in the proof.")).toEqual([]);
  });

  it("requires delimiters around strong LaTeX commands", () => {
    const analysis = analyzeLatexDelimiters(
      "Find the value of \\frac{1}{2} + \\frac{1}{4}.",
    );

    expect(analysis.issues.map((issue) => issue.code)).toEqual([
      LATEX_DELIMITER_ISSUE_CODES.MISSING,
    ]);
    expect(analysis.issues[0].commands).toEqual(["\\frac", "\\frac"]);
  });

  it("does not treat plain carets and underscores outside math containers as bare LaTeX", () => {
    expect(issueCodes("Simplify x^2 + y_1.")).toEqual([]);
  });

  it("detects every supported unclosed delimiter style", () => {
    expect(issueCodes("Solve $x + 1")).toContain(
      LATEX_DELIMITER_ISSUE_CODES.UNCLOSED,
    );
    expect(issueCodes("Solve $$x + 1")).toContain(
      LATEX_DELIMITER_ISSUE_CODES.UNCLOSED,
    );
    expect(issueCodes("Solve \\(x + 1")).toContain(
      LATEX_DELIMITER_ISSUE_CODES.UNCLOSED,
    );
    expect(issueCodes("Solve \\[x + 1")).toContain(
      LATEX_DELIMITER_ISSUE_CODES.UNCLOSED,
    );
  });

  it("detects unexpected and mismatched closing delimiters", () => {
    expect(issueCodes("Solve x + 1\\)")).toContain(
      LATEX_DELIMITER_ISSUE_CODES.UNEXPECTED_CLOSING,
    );
    expect(issueCodes("Solve \\(x + 1\\]")).toContain(
      LATEX_DELIMITER_ISSUE_CODES.MISMATCHED,
    );
    expect(issueCodes("Solve \\(x + 1$")).toContain(
      LATEX_DELIMITER_ISSUE_CODES.MISMATCHED,
    );
  });

  it("detects empty math regions", () => {
    expect(issueCodes("This contains $   $ with no equation.")).toContain(
      LATEX_DELIMITER_ISSUE_CODES.EMPTY_MATH,
    );
    expect(issueCodes("This contains \\[ \\] with no equation.")).toContain(
      LATEX_DELIMITER_ISSUE_CODES.EMPTY_MATH,
    );
  });

  it("does not mistake currency or escaped dollars for math delimiters", () => {
    expect(
      issueCodes("A book costs $100. What is the price after a discount?"),
    ).toEqual([]);
    expect(issueCodes("The values range from $5 to $10.")).toEqual([]);
    expect(
      issueCodes("The literal symbol is \\$ and does not start math."),
    ).toEqual([]);
  });

  it("recognizes a numeric expression enclosed in dollar delimiters", () => {
    expect(issueCodes("The answer is $5$.")).toEqual([]);
  });

  it("reports LaTeX commands that remain outside otherwise valid math regions", () => {
    expect(issueCodes("Use $x + 1$, then evaluate \\sqrt{y}.")).toEqual([
      LATEX_DELIMITER_ISSUE_CODES.MISSING,
    ]);
  });

  it("uses stable delimiter ranges when the stem contains astral Unicode characters", () => {
    expect(issueCodes("😀🚀 Use $\\frac{1}{2}$ in the answer.")).toEqual([]);
    expect(issueCodes("😀🚀 Use $x$, then evaluate \\sqrt{y}.")).toEqual([
      LATEX_DELIMITER_ISSUE_CODES.MISSING,
    ]);
  });
});
