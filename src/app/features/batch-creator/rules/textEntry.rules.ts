import { ValidationRule } from '../validation/validationEngine';
import { ValidationIssue } from '../core/issueTypes';
import { TextEntryQuestion } from '../core/questionTypes';

function createIssue(
  rule: Pick<ValidationRule, 'id' | 'category' | 'severity'>,
  rowId: string,
  message: string,
  field?: string,
  evidence?: Record<string, unknown>,
  suggestedFixes?: any[]
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
    suggestedFixes
  };
}

export const TEXT_ENTRY_HAS_ANSWER: ValidationRule = {
  id: 'TEXT_ENTRY_HAS_ANSWER',
  name: 'Text Entry Has Answer',
  category: 'structural',
  severity: 'block',
  priority: 100,
  appliesTo: ['TEXT_ENTRY'],
  validate(row) {
    const q = row.normalizedQuestion as TextEntryQuestion;
    if (!q.acceptedAnswers || q.acceptedAnswers.length === 0) {
      return [createIssue(this, row.id, 'At least one accepted answer is required.', 'acceptedAnswers')];
    }
    return [];
  }
};

export const TEXT_ENTRY_ACCEPTED_ANSWERS_NOT_EMPTY: ValidationRule = {
  id: 'TEXT_ENTRY_ACCEPTED_ANSWERS_NOT_EMPTY',
  name: 'Text Entry Accepted Answers Not Empty',
  category: 'content_quality',
  severity: 'block',
  priority: 95,
  appliesTo: ['TEXT_ENTRY'],
  validate(row) {
    const q = row.normalizedQuestion as TextEntryQuestion;
    if (!q.acceptedAnswers) return [];
    
    for (const ans of q.acceptedAnswers) {
      if (ans === undefined || ans === null || String(ans).trim() === '') {
        return [createIssue(this, row.id, 'Accepted answers cannot be empty strings.', 'acceptedAnswers')];
      }
    }
    return [];
  }
};

export const TEXT_ENTRY_MULTIPLE_ANSWERS_DELIMITER_VALID: ValidationRule = {
  id: 'TEXT_ENTRY_MULTIPLE_ANSWERS_DELIMITER_VALID',
  name: 'Text Entry Multiple Answers Delimiter Valid',
  category: 'content_quality',
  severity: 'warning',
  priority: 85,
  appliesTo: ['TEXT_ENTRY'],
  validate(row) {
    const q = row.normalizedQuestion as TextEntryQuestion;
    if (!q.acceptedAnswers || q.acceptedAnswers.length <= 1) return [];
    
    // Check if there are pipes or strange commas in answers which might mean they weren't delimited properly
    const issues: ValidationIssue[] = [];
    for (const ans of q.acceptedAnswers) {
      if (ans.includes('|')) {
        issues.push(createIssue(
          this, 
          row.id, 
          `Answer '${ans}' contains a pipe '|'. Make sure delimiters were parsed correctly.`, 
          'acceptedAnswers'
        ));
      }
    }
    return issues;
  }
};

export const TEXT_ENTRY_CASE_POLICY_DEFINED: ValidationRule = {
  id: 'TEXT_ENTRY_CASE_POLICY_DEFINED',
  name: 'Text Entry Case Policy Defined',
  category: 'scoring',
  severity: 'review',
  priority: 90,
  appliesTo: ['TEXT_ENTRY'],
  validate(row) {
    const q = row.normalizedQuestion as TextEntryQuestion;
    if (q.mode === 'text' && q.caseSensitive === undefined) {
      return [createIssue(
        this, 
        row.id, 
        'Case sensitivity policy should be explicitly defined for text mode.', 
        'caseSensitive',
        undefined,
        [{ id: 'set_case_insensitive', description: 'Set to case-insensitive', patch: { 'normalizedQuestion.caseSensitive': false } }]
      )];
    }
    return [];
  }
};

export const TEXT_ENTRY_TRIM_POLICY_DEFINED: ValidationRule = {
  id: 'TEXT_ENTRY_TRIM_POLICY_DEFINED',
  name: 'Text Entry Trim Policy Defined',
  category: 'scoring',
  severity: 'review',
  priority: 90,
  appliesTo: ['TEXT_ENTRY'],
  validate(row) {
    const q = row.normalizedQuestion as TextEntryQuestion;
    if (q.trimPolicy === undefined) {
      return [createIssue(
        this, 
        row.id, 
        'Trim whitespace policy should be explicitly defined.', 
        'trimPolicy',
        undefined,
        [{ id: 'set_trim', description: 'Enable whitespace trimming', patch: { 'normalizedQuestion.trimPolicy': 'trim' } }]
      )];
    }
    return [];
  }
};

export const TEXT_ENTRY_NUMERIC_ANSWER_VALID: ValidationRule = {
  id: 'TEXT_ENTRY_NUMERIC_ANSWER_VALID',
  name: 'Text Entry Numeric Answer Valid',
  category: 'content_quality',
  severity: 'block',
  priority: 95,
  appliesTo: ['TEXT_ENTRY'],
  validate(row) {
    const q = row.normalizedQuestion as TextEntryQuestion;
    if (q.mode !== 'numeric' || !q.acceptedAnswers) return [];
    
    const issues: ValidationIssue[] = [];
    for (const ans of q.acceptedAnswers) {
      const num = Number(ans);
      if (isNaN(num)) {
        issues.push(createIssue(
          this, 
          row.id, 
          `Numeric mode selected, but answer '${ans}' cannot be parsed as a number.`, 
          'acceptedAnswers'
        ));
      }
    }
    return issues;
  }
};

export const TEXT_ENTRY_NUMERIC_TOLERANCE_VALID: ValidationRule = {
  id: 'TEXT_ENTRY_NUMERIC_TOLERANCE_VALID',
  name: 'Text Entry Numeric Tolerance Valid',
  category: 'scoring',
  severity: 'block',
  priority: 90,
  appliesTo: ['TEXT_ENTRY'],
  validate(row) {
    const q = row.normalizedQuestion as TextEntryQuestion;
    if (q.mode !== 'numeric' || q.numericTolerance === undefined) return [];
    
    if (typeof q.numericTolerance !== 'number' || isNaN(q.numericTolerance) || q.numericTolerance < 0) {
      return [createIssue(
        this, 
        row.id, 
        'Numeric tolerance must be a non-negative number.', 
        'numericTolerance'
      )];
    }
    return [];
  }
};

export const TEXT_ENTRY_UNIT_POLICY_VALID: ValidationRule = {
  id: 'TEXT_ENTRY_UNIT_POLICY_VALID',
  name: 'Text Entry Unit Policy Valid',
  category: 'scoring',
  severity: 'warning',
  priority: 80,
  appliesTo: ['TEXT_ENTRY'],
  validate(row) {
    const q = row.normalizedQuestion as TextEntryQuestion;
    if (q.mode === 'numeric' && q.units) {
      if (q.units.trim() === '') {
        return [createIssue(
          this, 
          row.id, 
          'Units defined but empty string provided.', 
          'units'
        )];
      }
    }
    return [];
  }
};

export const TEXT_ENTRY_FORMULA_FORMAT_VALID: ValidationRule = {
  id: 'TEXT_ENTRY_FORMULA_FORMAT_VALID',
  name: 'Text Entry Formula Format Valid',
  category: 'content_quality',
  severity: 'block',
  priority: 90,
  appliesTo: ['TEXT_ENTRY'],
  validate(row) {
    const q = row.normalizedQuestion as TextEntryQuestion;
    if (q.mode !== 'formula' || !q.acceptedAnswers) return [];
    
    for (const ans of q.acceptedAnswers) {
      if (ans.trim() === '') {
        return [createIssue(
          this, 
          row.id, 
          'Formula answer cannot be empty.', 
          'acceptedAnswers'
        )];
      }
    }
    return [];
  }
};

export const TEXT_ENTRY_LATEX_VALID: ValidationRule = {
  id: 'TEXT_ENTRY_LATEX_VALID',
  name: 'Text Entry LaTeX Valid',
  category: 'content_quality',
  severity: 'warning',
  priority: 85,
  appliesTo: ['TEXT_ENTRY'],
  validate(row) {
    const q = row.normalizedQuestion as TextEntryQuestion;
    if (q.mode !== 'formula' || !q.acceptedAnswers) return [];
    
    const issues: ValidationIssue[] = [];
    for (const ans of q.acceptedAnswers) {
      let dollarCount = 0;
      for (let i = 0; i < ans.length; i++) {
        if (ans[i] === '$' && ans[i-1] !== '\\') {
          dollarCount++;
        }
      }
      if (dollarCount % 2 !== 0) {
        issues.push(createIssue(
          this, 
          row.id, 
          `Unclosed LaTeX delimiter detected in formula answer '${ans}'.`, 
          'acceptedAnswers'
        ));
      }
    }
    return issues;
  }
};
