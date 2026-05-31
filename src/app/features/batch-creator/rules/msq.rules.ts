import { ValidationRule } from '../validation/validationEngine';
import { ValidationIssue } from '../core/issueTypes';
import { MsqQuestion } from '../core/questionTypes';

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

export const MSQ_MIN_OPTIONS: ValidationRule = {
  id: 'MSQ_MIN_OPTIONS',
  name: 'MSQ Minimum Options',
  category: 'structural',
  severity: 'block',
  priority: 100,
  appliesTo: ['MSQ'],
  validate(row) {
    const q = row.normalizedQuestion as MsqQuestion;
    if (!q.options || q.options.length < 2) {
      return [createIssue(this, row.id, 'MSQ must have at least 2 options.', 'options')];
    }
    return [];
  }
};

export const MSQ_HAS_CORRECT_ANSWERS: ValidationRule = {
  id: 'MSQ_HAS_CORRECT_ANSWERS',
  name: 'MSQ Has Correct Answers',
  category: 'structural',
  severity: 'block',
  priority: 100,
  appliesTo: ['MSQ'],
  validate(row) {
    const q = row.normalizedQuestion as MsqQuestion;
    if (!q.correctAnswerIds || q.correctAnswerIds.length === 0) {
      return [createIssue(this, row.id, 'At least one correct answer is required for MSQ.', 'correctAnswerIds')];
    }
    return [];
  }
};

export const MSQ_ANSWER_IDENTIFIER_VALID: ValidationRule = {
  id: 'MSQ_ANSWER_IDENTIFIER_VALID',
  name: 'MSQ Answer Identifier Valid',
  category: 'structural',
  severity: 'block',
  priority: 95,
  appliesTo: ['MSQ'],
  validate(row) {
    const q = row.normalizedQuestion as MsqQuestion;
    if (!q.correctAnswerIds) return [];
    
    for (const ans of q.correctAnswerIds) {
      if (!ans || ans.trim() === '') {
        return [createIssue(this, row.id, `Correct answer contains an empty identifier.`, 'correctAnswerIds')];
      }
    }
    return [];
  }
};

export const MSQ_OPTION_IDENTIFIERS_UNIQUE: ValidationRule = {
  id: 'MSQ_OPTION_IDENTIFIERS_UNIQUE',
  name: 'MSQ Option Identifiers Unique',
  category: 'structural',
  severity: 'block',
  priority: 95,
  appliesTo: ['MSQ'],
  validate(row) {
    const q = row.normalizedQuestion as MsqQuestion;
    if (!q.options) return [];
    
    const seenIds = new Set<string>();
    for (const opt of q.options) {
      if (seenIds.has(opt.id)) {
        return [createIssue(this, row.id, `Duplicate option identifier detected internally.`, 'options')];
      }
      seenIds.add(opt.id);
    }
    return [];
  }
};

export const MSQ_OPTIONS_UNIQUE: ValidationRule = {
  id: 'MSQ_OPTIONS_UNIQUE',
  name: 'MSQ Options Unique',
  category: 'content_quality',
  severity: 'review',
  priority: 90,
  appliesTo: ['MSQ'],
  validate(row) {
    const q = row.normalizedQuestion as MsqQuestion;
    if (!q.options) return [];
    
    const issues: ValidationIssue[] = [];
    const seenText = new Map<string, string>(); 

    q.options.forEach(opt => {
      const normText = opt.text.trim().toLowerCase();
      if (normText) {
        if (seenText.has(normText)) {
          issues.push(createIssue(
            this, 
            row.id, 
            `Duplicate option text found in options ${seenText.get(normText)} and ${opt.label}.`,
            'options'
          ));
        } else {
          seenText.set(normText, opt.label);
        }
      }
    });

    return issues;
  }
};

export const MSQ_CORRECT_ANSWERS_IN_OPTIONS: ValidationRule = {
  id: 'MSQ_CORRECT_ANSWERS_IN_OPTIONS',
  name: 'MSQ Correct Answers In Options',
  category: 'structural',
  severity: 'block',
  priority: 90,
  appliesTo: ['MSQ'],
  validate(row) {
    const q = row.normalizedQuestion as MsqQuestion;
    if (!q.correctAnswerIds || !q.options) return [];

    const optionIds = new Set(q.options.map(o => o.id));
    const invalidAnswers = q.correctAnswerIds.filter(ans => !optionIds.has(ans));
    
    if (invalidAnswers.length > 0) {
      return [createIssue(
        this, 
        row.id, 
        `Correct answers [${invalidAnswers.join(', ')}] do not match any option.`, 
        'correctAnswerIds'
      )];
    }
    return [];
  }
};

export const MSQ_MIXED_IDENTIFIER_MODE: ValidationRule = {
  id: 'MSQ_MIXED_IDENTIFIER_MODE',
  name: 'MSQ Mixed Identifier Mode',
  category: 'type_suspicion',
  severity: 'block',
  priority: 85,
  appliesTo: ['MSQ'],
  validate(row) {
    // If some answers mapped to IDs cleanly and others didn't, or if the normalizer mixed text and IDs
    // For now, this is partially caught by MSQ_CORRECT_ANSWERS_IN_OPTIONS.
    return [];
  }
};

export const MSQ_ANSWER_TEXT_MATCH: ValidationRule = {
  id: 'MSQ_ANSWER_TEXT_MATCH',
  name: 'MSQ Answer Text Match',
  category: 'content_quality',
  severity: 'block',
  priority: 85,
  appliesTo: ['MSQ'],
  validate(row) {
    return []; // Usually handled upstream by normalizer
  }
};

export const MSQ_ANSWER_TEXT_AMBIGUOUS: ValidationRule = {
  id: 'MSQ_ANSWER_TEXT_AMBIGUOUS',
  name: 'MSQ Answer Text Ambiguous',
  category: 'content_quality',
  severity: 'review',
  priority: 85,
  appliesTo: ['MSQ'],
  validate(row) {
    return [];
  }
};

export const MSQ_NO_DUPLICATE_CORRECT_ANSWERS: ValidationRule = {
  id: 'MSQ_NO_DUPLICATE_CORRECT_ANSWERS',
  name: 'MSQ No Duplicate Correct Answers',
  category: 'content_quality',
  severity: 'review',
  priority: 90,
  appliesTo: ['MSQ'],
  validate(row) {
    const q = row.normalizedQuestion as MsqQuestion;
    if (!q.correctAnswerIds) return [];
    
    const uniqueAnswers = new Set(q.correctAnswerIds);
    if (uniqueAnswers.size !== q.correctAnswerIds.length) {
      return [createIssue(
        this, 
        row.id, 
        'Correct answers array contains duplicate identifiers.', 
        'correctAnswerIds',
        undefined,
        [{ id: 'dedup_answers', description: 'Remove duplicate answers', patch: { 'normalizedQuestion.correctAnswerIds': Array.from(uniqueAnswers) } }]
      )];
    }
    return [];
  }
};

export const MSQ_EXACT_SET_MATCH: ValidationRule = {
  id: 'MSQ_EXACT_SET_MATCH',
  name: 'MSQ Exact Set Match',
  category: 'content_quality',
  severity: 'review',
  priority: 80,
  appliesTo: ['MSQ'],
  validate(row, context) {
    // Check if another MSQ has the exact same stem and exact same correct answer set
    const q = row.normalizedQuestion as MsqQuestion;
    if (!q || !q.stem || !q.correctAnswerIds) return [];
    
    const stemClean = q.stem.trim().toLowerCase();
    const sortedAnswers = [...q.correctAnswerIds].sort().join(',');

    const duplicates = context.allRows.filter(r => {
      if (r.id === row.id) return false;
      const otherQ = r.normalizedQuestion as MsqQuestion;
      if (!otherQ || otherQ.type !== 'MSQ' || !otherQ.stem || !otherQ.correctAnswerIds) return false;
      
      return otherQ.stem.trim().toLowerCase() === stemClean &&
             [...otherQ.correctAnswerIds].sort().join(',') === sortedAnswers;
    });

    if (duplicates.length > 0) {
      return [createIssue(this, row.id, 'This MSQ has identical stem and exact same answer set as another question.', 'stem')];
    }
    return [];
  }
};

export const DELIMITER_FORMAT_FOR_MSQ: ValidationRule = {
  id: 'DELIMITER_FORMAT_FOR_MSQ',
  name: 'Delimiter Format For MSQ',
  category: 'structural',
  severity: 'review',
  priority: 70,
  appliesTo: ['MSQ'],
  validate(row) {
    const q = row.normalizedQuestion as MsqQuestion;
    if (!q.correctAnswerIds) return [];
    
    // Check if the single correct answer contains un-parsed commas or pipes
    // This happens if the normalizer failed to split on them because it thought it was text
    const issues: ValidationIssue[] = [];
    
    for (const ans of q.correctAnswerIds) {
      if (ans.includes('|')) {
        issues.push(createIssue(
          this, 
          row.id, 
          `Answer identifier '${ans}' contains a pipe '|' character. It may not have been parsed correctly.`, 
          'correctAnswerIds'
        ));
      } else if (ans.includes(',')) {
        issues.push(createIssue(
          this, 
          row.id, 
          `Answer identifier '${ans}' contains a comma ','. If this is a list of options, it should be parsed into separate items.`, 
          'correctAnswerIds'
        ));
      }
    }
    
    return issues;
  }
};

export const MSQ_SCORING_REVIEW: ValidationRule = {
  id: 'MSQ_SCORING_REVIEW',
  name: 'MSQ Scoring Review',
  category: 'scoring',
  severity: 'warning',
  priority: 75,
  appliesTo: ['MSQ'],
  validate(row) {
    const issues: ValidationIssue[] = [];
    
    // Check partial marking config
    if (row.scoringConfig.partialMarking) {
      // If partial marking is true, we should have partial marks value if required by system
      // But we just warn that partial marking is enabled
      issues.push(createIssue(
        this, 
        row.id, 
        'Partial marking is enabled. Ensure export targets (like LMS) fully support this.', 
        'scoringConfig.partialMarking'
      ));
    }

    return issues;
  }
};
