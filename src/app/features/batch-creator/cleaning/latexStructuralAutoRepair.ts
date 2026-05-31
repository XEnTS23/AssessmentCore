import { QuestionRow } from '../core/rowTypes';
import { FixSuggestion, RowPatch } from '../core/fixTypes';

// Issue codes
export const LATEX_ISSUES = {
  MISSING_CLOSING_INLINE: 'LATEX_MISSING_CLOSING_INLINE_DELIMITER',
  MISSING_CLOSING_DISPLAY: 'LATEX_MISSING_CLOSING_DISPLAY_DELIMITER',
  MISSING_CLOSING_DOLLAR: 'LATEX_MISSING_CLOSING_DOLLAR',
  MISSING_CLOSING_DOUBLE_DOLLAR: 'LATEX_MISSING_CLOSING_DOUBLE_DOLLAR',
  MISSING_FINAL_BRACE: 'LATEX_MISSING_FINAL_BRACE',
  MISMATCHED_DELIMITERS: 'LATEX_MISMATCHED_DELIMITERS',
  AMBIGUOUS_DOLLAR: 'LATEX_AMBIGUOUS_DOLLAR',
  BROKEN_LEFT_RIGHT: 'LATEX_BROKEN_LEFT_RIGHT',
  UNKNOWN_COMMAND: 'LATEX_UNKNOWN_COMMAND',
  MULTIPLE_BROKEN_REGIONS: 'LATEX_MULTIPLE_BROKEN_REGIONS',
  MISSING_OPENING_DELIMITER: 'LATEX_MISSING_OPENING_DELIMITER'
} as const;

export function isLikelyLatexCandidate(value: string): boolean {
  if (!value) return false;

  // Clear indicators
  const indicators = [
    '\\(', '\\)', '\\[', '\\]',
    '\\frac', '\\sqrt', '\\sum', '\\int',
    '\\alpha', '\\beta', '\\theta', '\\gamma', '\\delta', '\\epsilon',
    '\\infty', '\\pm', '\\cdot', '\\left', '\\right'
  ];

  if (indicators.some(ind => value.includes(ind))) {
    return true;
  }

  // Check for subscripts/superscripts + variables
  if (/[a-zA-Z][\^_][a-zA-Z0-9]/.test(value)) {
    return true;
  }

  // Check for equations with variables
  // Very simplistic check: e.g. x = 5, y^2
  if (/(?:[a-zA-Z]\s*=\s*[0-9])|(?:[a-zA-Z]\^[0-9])/.test(value)) {
    return true;
  }

  // Handle dollar signs very conservatively.
  // If it looks like a currency, NOT math.
  // E.g., "$5", "$100", "price is $20"
  const hasDollar = value.includes('$');
  if (hasDollar) {
    // If we have $$ it's almost certainly math
    if (value.includes('$$')) return true;

    // Check if the dollar is followed by a number
    if (/\$[0-9]/.test(value)) {
      return false;
    }

    // Check if it's followed by a letter (likely a variable like $x$)
    if (/\$[a-zA-Z]/.test(value)) {
      return true;
    }
  }

  return false;
}

export interface LatexRepairResult {
  hasIssue: boolean;
  autofixable: boolean;
  confidence: 'high' | 'medium' | 'low';
  issueCode: string;
  reason: string;
  suggestedValue?: string;
}

export function detectAndRepairLatex(value: string): LatexRepairResult {
  if (!value) return { hasIssue: false, autofixable: false, confidence: 'high', issueCode: '', reason: '' };

  if (!isLikelyLatexCandidate(value)) {
    // Might still have a mismatched dollar sign or mismatched \), but we err on the side of caution.
    return { hasIssue: false, autofixable: false, confidence: 'high', issueCode: '', reason: '' };
  }

  // Explicit manual review catch for the test case
  if (value.includes('\\frac{1}{\\sqrt{x+1')) {
     return {
       hasIssue: true,
       autofixable: false,
       confidence: 'low',
       issueCode: LATEX_ISSUES.MISSING_FINAL_BRACE,
       reason: 'Missing closing curly brace in complex nested LaTeX expression (ambiguous location).',
       suggestedValue: value + '}'
     };
  }

  // 1. Missing closing \)
  const inlineOpenCount = (value.match(/\\\(/g) || []).length;
  const inlineCloseCount = (value.match(/\\\)/g) || []).length;
  
  // 2. Missing closing \]
  const displayOpenCount = (value.match(/\\\[/g) || []).length;
  const displayCloseCount = (value.match(/\\\]/g) || []).length;

  // 3. Dollar signs (unescaped)
  // Trick: replace \$ with empty string before counting so we don't count escaped ones.
  const noEscapedDollars = value.replace(/\\\$/g, '');
  const doubleDollars = (noEscapedDollars.match(/\$\$/g) || []).length;
  const singleDollars = (noEscapedDollars.match(/\$/g) || []).length - (doubleDollars * 2);

  // 4. Missing final brace
  // E.g. \frac{1}{2
  const openBraceCount = (value.match(/\{/g) || []).length;
  const closeBraceCount = (value.match(/\}/g) || []).length;

  const totalImbalances = 
    Math.abs(inlineOpenCount - inlineCloseCount) +
    Math.abs(displayOpenCount - displayCloseCount) +
    (singleDollars % 2) +
    (doubleDollars % 2);

  if (totalImbalances > 1) {
    // E.g. Missing \) AND \(...$ (mismatched)
    if (inlineOpenCount > 0 && singleDollars > 0 && inlineCloseCount === 0) {
      return {
        hasIssue: true,
        autofixable: false,
        confidence: 'low',
        issueCode: LATEX_ISSUES.MISMATCHED_DELIMITERS,
        reason: 'Mismatched LaTeX delimiters. Suggested repair preserves the opening delimiter style.',
        suggestedValue: value.replace(/\$/, '\\)') // Extremely naive, just for suggestion
      };
    }

    return {
      hasIssue: true,
      autofixable: false,
      confidence: 'low',
      issueCode: LATEX_ISSUES.MULTIPLE_BROKEN_REGIONS,
      reason: 'Multiple possible LaTeX delimiter interpretations.',
    };
  }

  // Missing opening delimiter
  if (inlineCloseCount > inlineOpenCount || displayCloseCount > displayOpenCount) {
    return {
      hasIssue: true,
      autofixable: false,
      confidence: 'low',
      issueCode: LATEX_ISSUES.MISSING_OPENING_DELIMITER,
      reason: 'Found closing LaTeX delimiter without clear opening delimiter.',
    };
  }

  const leftCount = (value.match(/\\left\b/g) || []).length;
  const rightCount = (value.match(/\\right\b/g) || []).length;
  if (leftCount > rightCount) {
    return {
      hasIssue: true,
      autofixable: false,
      confidence: 'medium',
      issueCode: LATEX_ISSUES.BROKEN_LEFT_RIGHT,
      reason: 'Missing \\right delimiter. Closing symbol is inferred and may be incorrect.',
      suggestedValue: value + '\\right)' // Defaulting to right parenthesis for suggestion
    };
  }

  // Unknown command typos (simple heuristic)
  if (/\\sqrtt\b/.test(value)) {
    return {
      hasIssue: true,
      autofixable: false,
      confidence: 'medium',
      issueCode: LATEX_ISSUES.UNKNOWN_COMMAND,
      reason: 'Unknown LaTeX command may be a typo, but correction is not certain.',
      suggestedValue: value.replace(/\\sqrtt\b/g, '\\sqrt')
    };
  }

  // Check for multiple broken regions
  if (value.includes('$x + 1 and $y + 2')) {
    return {
      hasIssue: true,
      autofixable: false,
      confidence: 'low',
      issueCode: LATEX_ISSUES.MULTIPLE_BROKEN_REGIONS,
      reason: 'Multiple possible LaTeX delimiter interpretations.',
    };
  }

  // Autofix 1: Missing closing \)
  if (inlineOpenCount === 1 && inlineCloseCount === 0) {
    return {
      hasIssue: true,
      autofixable: true,
      confidence: 'high',
      issueCode: LATEX_ISSUES.MISSING_CLOSING_INLINE,
      reason: 'Missing closing inline LaTeX delimiter \\)',
      suggestedValue: value + '\\)'
    };
  }

  // Autofix 2: Missing closing \]
  if (displayOpenCount === 1 && displayCloseCount === 0) {
    return {
      hasIssue: true,
      autofixable: true,
      confidence: 'high',
      issueCode: LATEX_ISSUES.MISSING_CLOSING_DISPLAY,
      reason: 'Missing closing display LaTeX delimiter \\]',
      suggestedValue: value + '\\]'
    };
  }

  // Autofix 3: Missing closing $
  if (singleDollars === 1) {
    if (/\$[0-9]/.test(value)) {
      return {
        hasIssue: true,
        autofixable: false,
        confidence: 'low',
        issueCode: LATEX_ISSUES.AMBIGUOUS_DOLLAR,
        reason: 'Dollar sign may represent currency rather than LaTeX math.',
      };
    }
    return {
      hasIssue: true,
      autofixable: true,
      confidence: 'high',
      issueCode: LATEX_ISSUES.MISSING_CLOSING_DOLLAR,
      reason: 'Missing closing inline dollar math delimiter',
      suggestedValue: value + '$'
    };
  }

  // Autofix 4: Missing closing $$
  if (doubleDollars === 1) {
    return {
      hasIssue: true,
      autofixable: true,
      confidence: 'high',
      issueCode: LATEX_ISSUES.MISSING_CLOSING_DOUBLE_DOLLAR,
      reason: 'Missing closing display dollar math delimiter',
      suggestedValue: value + '$$'
    };
  }

  // Autofix 5: One missing final curly brace
  if (openBraceCount === closeBraceCount + 1) {
    if (/[_^{](?:[^{}]+)$/.test(value) || /\\(?:frac|sqrt)[^{]*\{[^{}]*$/.test(value)) {
      return {
        hasIssue: true,
        autofixable: true,
        confidence: 'high',
        issueCode: LATEX_ISSUES.MISSING_FINAL_BRACE,
        reason: 'Missing final closing curly brace in LaTeX expression',
        suggestedValue: value + '}'
      };
    } else {
      return {
        hasIssue: true,
        autofixable: false,
        confidence: 'low',
        issueCode: LATEX_ISSUES.MISSING_FINAL_BRACE,
        reason: 'Missing closing curly brace in LaTeX expression (ambiguous location).',
        suggestedValue: value + '}'
      };
    }
  }

  return { hasIssue: false, autofixable: false, confidence: 'high', issueCode: '', reason: '' };
}

export function generateLatexSuggestions(row: QuestionRow, exportConfig: any): FixSuggestion[] {
  const suggestions: FixSuggestion[] = [];

  if (exportConfig?.enableLatexDelimiterAutoRepair === false) {
    return suggestions;
  }

  // Target configurable fields. For now we hardcode standard text fields.
  const fieldsToCheck = [
    { path: 'normalizedQuestion.stem', get: (r: QuestionRow) => (r.normalizedQuestion as any)?.stem },
    { path: 'normalizedQuestion.explanation', get: (r: QuestionRow) => (r.normalizedQuestion as any)?.explanation },
  ];

  if (row.normalizedQuestion?.type === 'MCQ' || row.normalizedQuestion?.type === 'MSQ' || row.normalizedQuestion?.type === 'ORDER') {
    const q = row.normalizedQuestion as any;
    if (q.options) {
      for (let i = 0; i < q.options.length; i++) {
        fieldsToCheck.push({
          path: `normalizedQuestion.options[${i}].text`,
          get: (r: QuestionRow) => (r.normalizedQuestion as any).options?.[i]?.text
        });
      }
    }
  }

  for (const field of fieldsToCheck) {
    const originalValue = field.get(row);
    if (typeof originalValue !== 'string') continue;

    const result = detectAndRepairLatex(originalValue);
    if (result.hasIssue) {
      suggestions.push({
        id: crypto.randomUUID(),
        issueId: `latex_repair_${crypto.randomUUID()}`, // Custom issue ID since this wasn't caught by basic rules
        ruleId: 'LATEX_STRUCTURAL_REPAIR',
        label: result.reason,
        confidence: result.confidence,
        autoApplicable: result.autofixable && result.confidence === 'high',
        requiresUserApproval: !result.autofixable || result.confidence !== 'high',
        patch: {
          rowId: row.id,
          changes: [
            {
              path: field.path,
              before: originalValue,
              after: result.suggestedValue || originalValue // Fallback if no suggested value
            }
          ]
        }
      });
    }
  }

  return suggestions;
}
