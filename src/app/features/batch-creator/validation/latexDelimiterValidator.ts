export const LATEX_DELIMITER_ISSUE_CODES = {
  UNCLOSED: "LATEX_DELIMITER_UNCLOSED",
  UNEXPECTED_CLOSING: "LATEX_DELIMITER_UNEXPECTED_CLOSING",
  MISMATCHED: "LATEX_DELIMITER_MISMATCHED",
  EMPTY_MATH: "LATEX_DELIMITER_EMPTY_MATH",
  MISSING: "LATEX_DELIMITER_MISSING",
} as const;

export type LatexDelimiterIssueCode =
  (typeof LATEX_DELIMITER_ISSUE_CODES)[keyof typeof LATEX_DELIMITER_ISSUE_CODES];

export interface LatexDelimiterIssue {
  code: LatexDelimiterIssueCode;
  message: string;
  index: number;
  delimiter?: string;
  expectedDelimiter?: string;
  commands?: string[];
}

export interface LatexDelimiterAnalysis {
  issues: LatexDelimiterIssue[];
  hasMathDelimiters: boolean;
  hasLatexOutsideMath: boolean;
}

type Delimiter = "$" | "$$" | "\\(" | "\\)" | "\\[" | "\\]";

interface DelimiterToken {
  value: Delimiter;
  index: number;
  length: number;
}

interface OpenDelimiter {
  token: DelimiterToken;
  expectedClose: Delimiter;
  contentStart: number;
}

const OPEN_TO_CLOSE: Partial<Record<Delimiter, Delimiter>> = {
  $: "$",
  $$: "$$",
  "\\(": "\\)",
  "\\[": "\\]",
};

const CLOSING_DELIMITERS = new Set<Delimiter>(["\\)", "\\]"]);

// Commands in this list have mathematical meaning and need a math container
// for reliable QTI/MathML rendering. Text-formatting and escaped-symbol
// commands are intentionally excluded to avoid false positives.
const STRONG_MATH_COMMAND =
  /\\(?:frac|dfrac|tfrac|sqrt|sum|prod|int|iint|iiint|oint|lim|log|ln|sin|cos|tan|sec|csc|cot|min|max|gcd|infty|pm|mp|times|cdot|div|leq|geq|neq|approx|equiv|subset|supset|cup|cap|forall|exists|partial|nabla|alpha|beta|gamma|delta|epsilon|varepsilon|theta|vartheta|lambda|mu|pi|rho|sigma|tau|phi|varphi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Pi|Sigma|Phi|Psi|Omega|left|right|begin|end)\b/g;

function isEscaped(value: string, index: number): boolean {
  let slashCount = 0;
  for (
    let cursor = index - 1;
    cursor >= 0 && value[cursor] === "\\";
    cursor -= 1
  ) {
    slashCount += 1;
  }
  return slashCount % 2 === 1;
}

function isCurrencyDollar(value: string, index: number): boolean {
  const remainder = value.slice(index + 1);
  if (!/^\d/.test(remainder)) return false;

  // "$5$" is a complete math region, while "$5" and "$5 to $10" are
  // ordinary currency. Only treat the numeric form as math when the closing
  // dollar immediately follows the number.
  return !/^\d+(?:[.,]\d+)?\$/.test(remainder);
}

function scanDelimiterTokens(value: string): DelimiterToken[] {
  const tokens: DelimiterToken[] = [];

  for (let index = 0; index < value.length; ) {
    if (value[index] === "\\" && !isEscaped(value, index)) {
      const pair = value.slice(index, index + 2) as Delimiter;
      if (
        pair === "\\(" ||
        pair === "\\)" ||
        pair === "\\[" ||
        pair === "\\]"
      ) {
        tokens.push({ value: pair, index, length: 2 });
        index += 2;
        continue;
      }
    }

    if (value[index] === "$" && !isEscaped(value, index)) {
      if (value[index + 1] === "$") {
        tokens.push({ value: "$$", index, length: 2 });
        index += 2;
        continue;
      }

      if (!isCurrencyDollar(value, index)) {
        tokens.push({ value: "$", index, length: 1 });
      }
    }

    index += 1;
  }

  return tokens;
}

function findMathCommands(value: string): string[] {
  return Array.from(value.matchAll(STRONG_MATH_COMMAND), (match) => match[0]);
}

function hasStrongBareMathSyntax(value: string): boolean {
  // Only treat backslash LaTeX commands as bare math outside containers.
  // Plain carets, underscores, and Unicode symbols in prose are allowed without mandatory LaTeX delimiters.
  return /\\(?:[a-zA-Z]+)/.test(value);
}

export function analyzeLatexDelimiters(value: string): LatexDelimiterAnalysis {
  if (!value) {
    return { issues: [], hasMathDelimiters: false, hasLatexOutsideMath: false };
  }

  const tokens = scanDelimiterTokens(value);
  const issues: LatexDelimiterIssue[] = [];
  const validMathRanges: Array<{ start: number; end: number }> = [];
  let open: OpenDelimiter | null = null;

  for (const token of tokens) {
    if (!open) {
      if (CLOSING_DELIMITERS.has(token.value)) {
        issues.push({
          code: LATEX_DELIMITER_ISSUE_CODES.UNEXPECTED_CLOSING,
          message: `Found closing LaTeX delimiter ${token.value} without a matching opening delimiter.`,
          index: token.index,
          delimiter: token.value,
        });
        continue;
      }

      const expectedClose = OPEN_TO_CLOSE[token.value];
      if (expectedClose) {
        open = {
          token,
          expectedClose,
          contentStart: token.index + token.length,
        };
      }
      continue;
    }

    if (token.value === open.expectedClose) {
      const content = value.slice(open.contentStart, token.index);
      if (content.trim() === "") {
        issues.push({
          code: LATEX_DELIMITER_ISSUE_CODES.EMPTY_MATH,
          message: `LaTeX delimiter pair ${open.token.value}...${token.value} contains no mathematical content.`,
          index: open.token.index,
          delimiter: open.token.value,
          expectedDelimiter: token.value,
        });
      }
      validMathRanges.push({
        start: open.token.index,
        end: token.index + token.length,
      });
      open = null;
      continue;
    }

    issues.push({
      code: LATEX_DELIMITER_ISSUE_CODES.MISMATCHED,
      message: `LaTeX math opened with ${open.token.value} but encountered ${token.value}; expected ${open.expectedClose}.`,
      index: token.index,
      delimiter: token.value,
      expectedDelimiter: open.expectedClose,
    });

    // Recover at an explicit closer so later independent math regions can
    // still be checked. An opening-style token remains inside the bad region.
    if (CLOSING_DELIMITERS.has(token.value)) {
      open = null;
    }
  }

  if (open) {
    issues.push({
      code: LATEX_DELIMITER_ISSUE_CODES.UNCLOSED,
      message: `LaTeX math opened with ${open.token.value} but is not closed; expected ${open.expectedClose}.`,
      index: open.token.index,
      delimiter: open.token.value,
      expectedDelimiter: open.expectedClose,
    });
  }

  // Mask valid math regions before looking for LaTeX that was written in
  // prose without a math container.
  // Delimiter positions are UTF-16 code-unit offsets. split('') preserves the
  // same indexing model, unlike Array.from(), which collapses astral Unicode
  // characters and can mask the wrong part of stems containing emoji.
  const outsideCharacters = value.split("");
  for (const range of validMathRanges) {
    for (let index = range.start; index < range.end; index += 1) {
      outsideCharacters[index] = " ";
    }
  }

  // Also mask out <math>...</math> blocks to prevent false positives from LaTeX embedded in MathML annotations
  const mathTagPattern = /<math\b[^>]*>[\s\S]*?<\/math>/gi;
  let match;
  while ((match = mathTagPattern.exec(value)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    for (let index = start; index < end; index += 1) {
      outsideCharacters[index] = " ";
    }
  }

  const outsideMath = outsideCharacters.join("");
  const commands = findMathCommands(outsideMath);
  const hasLatexOutsideMath =
    commands.length > 0 || hasStrongBareMathSyntax(outsideMath);

  // Structural delimiter errors are more specific. Do not add a secondary
  // missing-delimiter warning until those errors are repaired.
  if (issues.length === 0 && hasLatexOutsideMath) {
    const firstCommand = commands[0];
    const index = firstCommand
      ? value.indexOf(firstCommand)
      : value.search(/[\^_]/);
    issues.push({
      code: LATEX_DELIMITER_ISSUE_CODES.MISSING,
      message:
        commands.length > 0
          ? `LaTeX command${commands.length === 1 ? "" : "s"} ${commands.join(", ")} must be enclosed in an inline or display math delimiter.`
          : "Mathematical superscript or subscript notation should be enclosed in an inline or display math delimiter.",
      index: Math.max(0, index),
      commands,
    });
  }

  return {
    issues,
    hasMathDelimiters: tokens.length > 0,
    hasLatexOutsideMath,
  };
}
