import { ValidationRule } from '../validation/validationEngine';
import { ValidationIssue } from '../core/issueTypes';
import { McqQuestion } from '../core/questionTypes';

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

export const MCQ_MIN_OPTIONS: ValidationRule = {
  id: 'MCQ_MIN_OPTIONS',
  name: 'MCQ Minimum Options',
  category: 'structural',
  severity: 'block',
  priority: 100,
  appliesTo: ['MCQ'],
  validate(row) {
    const q = row.normalizedQuestion as McqQuestion;
    if (!q.options || q.options.length < 2) {
      return [createIssue(this, row.id, 'MCQ must have at least 2 options.', 'options')];
    }
    return [];
  }
};

export const MCQ_OPTION_TEXT_NOT_EMPTY: ValidationRule = {
  id: 'MCQ_OPTION_TEXT_NOT_EMPTY',
  name: 'MCQ Option Text Not Empty',
  category: 'content_quality',
  severity: 'block',
  priority: 95,
  appliesTo: ['MCQ'],
  validate(row) {
    const q = row.normalizedQuestion as McqQuestion;
    const issues: ValidationIssue[] = [];
    q.options?.forEach((opt, idx) => {
      if (!opt.text || opt.text.trim() === '') {
        issues.push(createIssue(this, row.id, `Option ${opt.label || idx + 1} has empty text.`, `options[${idx}]`));
      }
    });
    return issues;
  }
};

export const MCQ_OPTIONS_UNIQUE: ValidationRule = {
  id: 'MCQ_OPTIONS_UNIQUE',
  name: 'MCQ Options Unique',
  category: 'content_quality',
  severity: 'review',
  priority: 90,
  appliesTo: ['MCQ'],
  validate(row) {
    const q = row.normalizedQuestion as McqQuestion;
    if (!q.options) return [];
    
    const issues: ValidationIssue[] = [];
    const seenText = new Map<string, string>(); // normalizedText -> option label

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

export const MCQ_OPTION_IDENTIFIERS_UNIQUE: ValidationRule = {
  id: 'MCQ_OPTION_IDENTIFIERS_UNIQUE',
  name: 'MCQ Option Identifiers Unique',
  category: 'structural',
  severity: 'block',
  priority: 95,
  appliesTo: ['MCQ'],
  validate(row) {
    const q = row.normalizedQuestion as McqQuestion;
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

export const MCQ_OPTION_IDENTIFIER_VALID: ValidationRule = {
  id: 'MCQ_OPTION_IDENTIFIER_VALID',
  name: 'MCQ Option Identifier Valid',
  category: 'structural',
  severity: 'block',
  priority: 95,
  appliesTo: ['MCQ'],
  validate(row) {
    const q = row.normalizedQuestion as McqQuestion;
    if (!q.options) return [];
    
    for (const opt of q.options) {
      if (!opt.id || opt.id.trim() === '') {
        return [createIssue(this, row.id, `Option is missing an internal identifier.`, 'options')];
      }
    }
    return [];
  }
};

export const MCQ_HAS_CORRECT_ANSWER: ValidationRule = {
  id: 'MCQ_HAS_CORRECT_ANSWER',
  name: 'MCQ Has Correct Answer',
  category: 'structural',
  severity: 'block',
  priority: 100,
  appliesTo: ['MCQ'],
  validate(row) {
    const q = row.normalizedQuestion as McqQuestion;
    if (q.correctAnswerId === undefined || q.correctAnswerId === null || String(q.correctAnswerId).trim() === '') {
      return [createIssue(this, row.id, 'Correct answer is required.', 'correctAnswerId')];
    }
    return [];
  }
};

export const MCQ_ANSWER_IN_OPTIONS: ValidationRule = {
  id: 'MCQ_ANSWER_IN_OPTIONS',
  name: 'MCQ Answer In Options',
  category: 'structural',
  severity: 'block',
  priority: 90,
  appliesTo: ['MCQ'],
  validate(row) {
    const q = row.normalizedQuestion as McqQuestion;
    if (!q.correctAnswerId || !q.options) return [];

    // Valid if it matches an internal ID
    if (q.options.some(opt => opt.id === q.correctAnswerId)) {
      return [];
    }

    // It didn't match an ID. Normalizer might have passed raw string because it failed to map.
    // If it's literally not in the options array (and didn't match by label or text in normalizer), it's invalid.
    return [createIssue(this, row.id, `Correct answer '${q.correctAnswerId}' does not match any option.`, 'correctAnswerId')];
  }
};

export const MCQ_ANSWER_TEXT_MATCH: ValidationRule = {
  id: 'MCQ_ANSWER_TEXT_MATCH',
  name: 'MCQ Answer Text Match',
  category: 'content_quality',
  severity: 'block',
  priority: 85,
  appliesTo: ['MCQ'],
  validate(row) {
    // Already largely handled by normalizer + MCQ_ANSWER_IN_OPTIONS, 
    // but if the user passed literal text that we want to enforce exactly matched one option...
    // The normalizer mapped it to ID if it matched one text exactly. 
    // If it didn't match ID, we return nothing here and let ANSWER_IN_OPTIONS fail.
    return [];
  }
};

export const MCQ_ANSWER_TEXT_AMBIGUOUS: ValidationRule = {
  id: 'MCQ_ANSWER_TEXT_AMBIGUOUS',
  name: 'MCQ Answer Text Ambiguous',
  category: 'content_quality',
  severity: 'review',
  priority: 85,
  appliesTo: ['MCQ'],
  validate(row) {
    const q = row.normalizedQuestion as McqQuestion;
    // Normalizer picked the FIRST text match if ambiguous. 
    // Let's check if the normalizer's raw answer actually matches multiple option texts.
    // For this rule, we need to inspect the raw row's answer field or assume if option texts are duplicate, 
    // we already flagged it in MCQ_OPTIONS_UNIQUE. 
    // We will just rely on MCQ_OPTIONS_UNIQUE for now.
    return [];
  }
};

export const MCQ_SINGLE_CORRECT_ONLY: ValidationRule = {
  id: 'MCQ_SINGLE_CORRECT_ONLY',
  name: 'MCQ Single Correct Only',
  category: 'structural',
  severity: 'block',
  priority: 90,
  appliesTo: ['MCQ'],
  validate(row) {
    const q = row.normalizedQuestion as McqQuestion;
    if (!q.correctAnswerId) return [];
    
    if (q.correctAnswerId.includes(',') || q.correctAnswerId.includes(';')) {
      return [createIssue(
        this, 
        row.id, 
        'MCQ must have exactly one correct answer. Found multiple delimited values.', 
        'correctAnswerId'
      )];
    }
    return [];
  }
};

export const MCQ_SHOULD_BE_MSQ_REVIEW: ValidationRule = {
  id: 'MCQ_SHOULD_BE_MSQ_REVIEW',
  name: 'MCQ Should Be MSQ Review',
  category: 'type_suspicion',
  severity: 'review',
  priority: 80,
  appliesTo: ['MCQ'],
  validate(row) {
    const q = row.normalizedQuestion as McqQuestion;
    if (!q.correctAnswerId) return [];
    
    if (q.correctAnswerId.includes(',') || q.correctAnswerId.includes(';')) {
      return [createIssue(
        this, 
        row.id, 
        'Row is marked as MCQ but answer contains multiple values. Consider changing to MSQ.', 
        'type',
        undefined,
        [{ id: 'convert_to_msq', description: 'Change type to MSQ', patch: { 'normalizedQuestion.type': 'MSQ' } }]
      )];
    }
    return [];
  }
};

export const MCQ_SUSPECT_TRUE_FALSE_REVIEW: ValidationRule = {
  id: 'MCQ_SUSPECT_TRUE_FALSE_REVIEW',
  name: 'MCQ Suspect True False Review',
  category: 'type_suspicion',
  severity: 'info',
  priority: 70,
  appliesTo: ['MCQ'],
  validate(row) {
    const q = row.normalizedQuestion as McqQuestion;
    if (!q.options || q.options.length !== 2) return [];
    
    const optTexts = q.options.map(o => o.text.trim().toLowerCase());
    if (optTexts.includes('true') && optTexts.includes('false')) {
      return [createIssue(
        this, 
        row.id, 
        'Question has True/False options. This could be mapped to a TRUE_FALSE question type later.',
        'options'
      )];
    }
    return [];
  }
};
