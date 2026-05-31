import { ValidationRule, ValidationContext } from '../validation/validationEngine';
import { QuestionRow } from '../core/rowTypes';
import { ValidationIssue } from '../core/issueTypes';
import { validateMediaUrl } from '../media/mediaValidator';

function createIssue(
  rule: Pick<ValidationRule, 'id' | 'category' | 'severity'>,
  rowId: string,
  message: string,
  field?: string,
  evidence?: Record<string, unknown>
): ValidationIssue {
  return {
    id: crypto.randomUUID(),
    ruleId: rule.id,
    rowId,
    category: rule.category,
    severity: rule.severity,
    message,
    field,
    evidence
  };
}

export const REQUIRED_QUESTION_FIELD: ValidationRule = {
  id: 'REQUIRED_QUESTION_FIELD',
  name: 'Required Question Field',
  category: 'structural',
  severity: 'block',
  priority: 100,
  appliesTo: 'all',
  validate(row) {
    const issues: ValidationIssue[] = [];
    if (!row.normalizedQuestion?.type) return issues; // Handled by UNKNOWN
    
    // Every question needs a stem
    const q = row.normalizedQuestion;
    if (q.type !== 'UNKNOWN' && (!q.stem || q.stem.trim() === '')) {
      issues.push(createIssue(this, row.id, 'Question stem is required.', 'stem'));
    }

    if (q.type === 'MCQ' || q.type === 'MSQ') {
      if (!q.options || q.options.length < 2) {
        issues.push(createIssue(this, row.id, 'At least 2 options are required.', 'options'));
      }
      if (q.type === 'MCQ' && (!q.correctAnswerId || q.correctAnswerId.trim() === '')) {
        issues.push(createIssue(this, row.id, 'Correct answer is required.', 'correctAnswer'));
      }
      if (q.type === 'MSQ' && (!q.correctAnswerIds || q.correctAnswerIds.length === 0)) {
        issues.push(createIssue(this, row.id, 'At least one correct answer is required.', 'correctAnswer'));
      }
    }

    if (q.type === 'TEXT_ENTRY') {
      if (!q.acceptedAnswers || q.acceptedAnswers.length === 0) {
        issues.push(createIssue(this, row.id, 'At least one accepted answer is required.', 'acceptedAnswers'));
      }
    }

    return issues;
  }
};

export const UNKNOWN_QUESTION_TYPE_BLOCK: ValidationRule = {
  id: 'UNKNOWN_QUESTION_TYPE_BLOCK',
  name: 'Unknown Question Type Block',
  category: 'structural',
  severity: 'block',
  priority: 99,
  appliesTo: ['UNKNOWN'],
  validate(row) {
    return [createIssue(this, row.id, 'Question type could not be determined.', 'type')];
  }
};

export const EMPTY_ROW_WARNING: ValidationRule = {
  id: 'EMPTY_ROW_WARNING',
  name: 'Empty Row Warning',
  category: 'content_quality',
  severity: 'warning',
  priority: 50,
  appliesTo: 'all',
  validate(row, context) {
    const q = row.normalizedQuestion;
    if (q?.type === 'UNKNOWN' && (!q.rawStem || q.rawStem.trim() === '')) {
      // Check if raw row has any data in the mapped columns
      const hasData = Object.keys(context.columnMapping).some(key => {
        const mappedCol = (context.columnMapping as any)[key];
        return mappedCol && row.rawRow[mappedCol] && String(row.rawRow[mappedCol]).trim() !== '';
      });

      if (!hasData) {
        return [createIssue(this, row.id, 'Row appears to be completely empty.')];
      }
    }
    return [];
  }
};

export const DUPLICATE_QUESTION_ID: ValidationRule = {
  id: 'DUPLICATE_QUESTION_ID',
  name: 'Duplicate Question ID',
  category: 'metadata',
  severity: 'block',
  priority: 90,
  appliesTo: 'all',
  validate(row, context) {
    if (!row.metadata?.questionId) return [];
    
    const duplicates = context.allRows.filter(
      r => r.id !== row.id && r.metadata?.questionId === row.metadata.questionId
    );

    if (duplicates.length > 0) {
      return [createIssue(this, row.id, `Duplicate Question ID found: ${row.metadata.questionId}`, 'questionId')];
    }
    return [];
  }
};

export const DUPLICATE_NORMALIZED_STEM_REVIEW: ValidationRule = {
  id: 'DUPLICATE_NORMALIZED_STEM_REVIEW',
  name: 'Duplicate Stem Review',
  category: 'content_quality',
  severity: 'review',
  priority: 80,
  appliesTo: ['MCQ', 'MSQ', 'TEXT_ENTRY'],
  validate(row, context) {
    const q = row.normalizedQuestion;
    if (!q || q.type === 'UNKNOWN' || !q.stem) return [];
    
    const stemClean = q.stem.trim().toLowerCase();
    
    const duplicates = context.allRows.filter(r => {
      if (r.id === row.id) return false;
      const otherQ = r.normalizedQuestion;
      if (!otherQ || otherQ.type === 'UNKNOWN' || !otherQ.stem) return false;
      return otherQ.stem.trim().toLowerCase() === stemClean;
    });

    if (duplicates.length > 0) {
      return [createIssue(this, row.id, 'This question stem is identical to another row.', 'stem')];
    }
    return [];
  }
};

export const LATEX_DELIMITER_UNCLOSED: ValidationRule = {
  id: 'LATEX_DELIMITER_UNCLOSED',
  name: 'Unclosed LaTeX Delimiter',
  category: 'content_quality',
  severity: 'review',
  priority: 85,
  appliesTo: ['MCQ', 'MSQ', 'TEXT_ENTRY'],
  validate(row) {
    const q = row.normalizedQuestion;
    if (!q || q.type === 'UNKNOWN' || !q.stem) return [];
    
    const issues: ValidationIssue[] = [];
    const openDelims = ['$$', '\\[', '\\(', '$'];
    
    // Very naive check: just checking if the string has an unclosed delimiter.
    // The tokenizer handles this better, but as a simple rule without importing the tokenizer:
    // If the stem has an odd number of $ signs (not counting $$), etc.
    let dollarCount = 0;
    for (let i = 0; i < q.stem.length; i++) {
      if (q.stem[i] === '$' && q.stem[i-1] !== '\\') {
        dollarCount++;
      }
    }
    
    if (dollarCount % 2 !== 0) {
      issues.push(createIssue(this, row.id, 'Possibly unclosed LaTeX delimiter ($) detected in stem.', 'stem'));
    }

    return issues;
  }
};

export const MEDIA_URL_INVALID_FORMAT: ValidationRule = {
  id: 'MEDIA_URL_INVALID_FORMAT',
  name: 'Invalid Media URL',
  category: 'media',
  severity: 'block',
  priority: 95,
  appliesTo: 'all',
  validate(row) {
    const issues: ValidationIssue[] = [];
    
    for (const ref of (row.mediaReferences || [])) {
      const urlIssues = validateMediaUrl(ref.publicUrlSource);
      for (const ui of urlIssues) {
        issues.push({
          id: crypto.randomUUID(),
          ruleId: this.id,
          rowId: row.id,
          category: 'media',
          severity: ui.severity,
          message: ui.message,
          field: 'mediaUrl'
        });
      }
    }
    
    return issues;
  }
};

export const MARKS_INVALID: ValidationRule = {
  id: 'MARKS_INVALID',
  name: 'Invalid Marks',
  category: 'scoring',
  severity: 'block',
  priority: 90,
  appliesTo: 'all',
  validate(row) {
    if (row.scoringConfig?.marks !== undefined) {
      if (row.scoringConfig.marks <= 0) {
        return [createIssue(this, row.id, 'Marks must be greater than 0.', 'marks')];
      }
    }
    return [];
  }
};

export const NEGATIVE_MARKS_INVALID: ValidationRule = {
  id: 'NEGATIVE_MARKS_INVALID',
  name: 'Invalid Negative Marks',
  category: 'scoring',
  severity: 'block',
  priority: 90,
  appliesTo: 'all',
  validate(row) {
    if (row.metadata?.negativeMarks !== undefined) {
      if (row.metadata.negativeMarks > 0) {
        return [createIssue(this, row.id, 'Negative marks should be a negative number or 0.', 'negativeMarks')];
      }
    }
    return [];
  }
};

export const YEAR_INVALID: ValidationRule = {
  id: 'YEAR_INVALID',
  name: 'Invalid Year',
  category: 'metadata',
  severity: 'warning',
  priority: 60,
  appliesTo: 'all',
  validate(row) {
    if (row.metadata?.year) {
      const year = parseInt(row.metadata.year, 10);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < 1900 || year > currentYear + 5) {
        return [createIssue(this, row.id, `Unusual year value: ${row.metadata.year}`, 'year')];
      }
    }
    return [];
  }
};
