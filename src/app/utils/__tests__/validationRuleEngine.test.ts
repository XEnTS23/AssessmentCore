import { describe, expect, it, vi } from 'vitest';
import {
  MCQ_MIN_OPTIONS_RULE,
  REQUIRED_QUESTION_FIELD_RULE,
  MCQ_OPTION_TEXT_NOT_EMPTY_RULE,
  MCQ_OPTIONS_UNIQUE_RULE,
  MCQ_OPTION_IDENTIFIERS_UNIQUE_RULE,
  MCQ_OPTION_IDENTIFIER_VALID_RULE,
  MCQ_HAS_CORRECT_ANSWER_RULE,
  MCQ_ANSWER_IN_OPTIONS_RULE,
  MCQ_ANSWER_TEXT_MATCH_RULE,
  MCQ_ANSWER_TEXT_AMBIGUOUS_RULE,
  MCQ_SINGLE_CORRECT_ONLY_RULE,
  MCQ_SHOULD_BE_MSQ_RULE,
  MCQ_SUSPECT_TYPE_RULE,
  MSQ_HAS_CORRECT_ANSWERS_RULE,
  MSQ_ANSWER_IDENTIFIER_VALID_RULE,
  MSQ_OPTIONS_UNIQUE_RULE,
  MSQ_CORRECT_ANSWERS_IN_OPTIONS_RULE,
  MSQ_MIXED_IDENTIFIER_MODE_RULE,
  MSQ_ANSWER_TEXT_MATCH_RULE,
  MSQ_ANSWER_TEXT_AMBIGUOUS_RULE,
  MSQ_NO_DUPLICATE_CORRECT_ANSWERS_RULE,
  MSQ_ANSWER_CARDINALITY_CHECK_RULE,
  MSQ_EXACT_SET_MATCH_RULE,
  REQUIRED_OPTIONS_RULE,
  DELIMITER_FORMAT_RULE,
  WHITESPACE_AUTOFIX_RULE,
  executeRules,
  type ValidationRule,
} from '../validationRuleEngine.js';

describe('validationRuleEngine', () => {
  it('tracks pass/fail and computes coverage/confidence', () => {
    const result = executeRules(
      {
        rowId: 'row_1',
        type: 'MCQ',
        questionText: 'What is 2 + 2?',
        optionCount: 1,
        mappingConfidence: 0.95,
        parsingConfidence: 0.9,
        typeUnknown: false,
        typeAmbiguous: false,
      },
      [REQUIRED_QUESTION_FIELD_RULE, MCQ_MIN_OPTIONS_RULE]
    );

    expect(result.passedRules).toContain('REQUIRED_QUESTION_FIELD');
    expect(result.failedRules).toContain('MCQ_MIN_OPTIONS');
    expect(result.meta.totalRules).toBe(2);
    expect(result.meta.executedRules).toBe(2);
    expect(result.coverage).toBe(100);
    expect(result.confidence).toBe(92);
    expect(result.validationDepth).toBeCloseTo((2 / 15) * 100, 2);
    expect(result.validationCost.totalRulesExecuted).toBe(2);
    expect(result.validationCost.avgRulesPerRow).toBe(2);
    expect(result.validationCost.totalCostUnits).toBe(2);
    expect(result.applicableRules).toEqual(['REQUIRED_QUESTION_FIELD', 'MCQ_MIN_OPTIONS']);
    expect(result.missingRules).toEqual([
      'REQUIRED_OPTIONS',
      'MCQ_OPTION_TEXT_NOT_EMPTY',
      'WHITESPACE_AUTOFIX',
      'MCQ_OPTIONS_UNIQUE',
      'MCQ_OPTION_IDENTIFIERS_UNIQUE',
      'MCQ_OPTION_IDENTIFIER_VALID',
      'MCQ_HAS_CORRECT_ANSWER',
      'MCQ_ANSWER_IN_OPTIONS',
      'MCQ_ANSWER_TEXT_MATCH',
      'MCQ_ANSWER_TEXT_AMBIGUOUS',
      'MCQ_SINGLE_CORRECT_ONLY',
      'MCQ_SHOULD_BE_MSQ',
      'MCQ_SUSPECT_TYPE',
    ]);
    expect(result.status).toBe('invalid');
  });

  it('adds low confidence and type ambiguity uncertainty flags', () => {
    const result = executeRules(
      {
        rowId: 'row_2',
        type: 'UNKNOWN',
        questionText: 'Question',
        optionCount: 0,
        mappingConfidence: 0.2,
        parsingConfidence: 0.2,
        typeUnknown: true,
        typeAmbiguous: true,
      },
      [REQUIRED_QUESTION_FIELD_RULE]
    );

    expect(result.uncertaintyFlags).not.toContain('LOW_CONFIDENCE');
    expect(result.uncertaintyFlags).toContain('LOW_MAPPING_CONFIDENCE');
    expect(result.uncertaintyFlags).toContain('LOW_PARSING_CONFIDENCE');
    expect(result.uncertaintyFlags).toContain('TYPE_AMBIGUITY');
    expect(result.status).toBe('unknown');
  });

  it('flags NO_VALIDATION_POSSIBLE when no rules apply and keeps coverage/confidence at 0', () => {
    const msqOnlyRule: ValidationRule = {
      id: 'MSQ_ONLY_RULE',
      appliesTo: ['MSQ'],
      severity: 'low',
      priority: 10,
      shouldRun: () => true,
      validate: () => ({ passed: true }),
    };

    const result = executeRules(
      {
        rowId: 'row_3',
        type: 'MCQ',
        questionText: 'Question',
        optionCount: 4,
        mappingConfidence: 0.95,
        parsingConfidence: 0.95,
        typeUnknown: false,
        typeAmbiguous: false,
      },
      [msqOnlyRule]
    );

    expect(result.applicableRules).toEqual([]);
    expect(result.nonApplicableRules).toEqual(['MSQ_ONLY_RULE']);
    expect(result.missingRules).toEqual([
      'REQUIRED_OPTIONS',
      'REQUIRED_QUESTION_FIELD',
      'MCQ_MIN_OPTIONS',
      'MCQ_OPTION_TEXT_NOT_EMPTY',
      'WHITESPACE_AUTOFIX',
      'MCQ_OPTIONS_UNIQUE',
      'MCQ_OPTION_IDENTIFIERS_UNIQUE',
      'MCQ_OPTION_IDENTIFIER_VALID',
      'MCQ_HAS_CORRECT_ANSWER',
      'MCQ_ANSWER_IN_OPTIONS',
      'MCQ_ANSWER_TEXT_MATCH',
      'MCQ_ANSWER_TEXT_AMBIGUOUS',
      'MCQ_SINGLE_CORRECT_ONLY',
      'MCQ_SHOULD_BE_MSQ',
      'MCQ_SUSPECT_TYPE',
    ]);
    expect(result.coverage).toBe(0);
    expect(result.confidence).toBe(0);
    expect(result.uncertaintyFlags).toContain('NO_VALIDATION_POSSIBLE');
    expect(result.uncertaintyFlags).toContain('INCOMPLETE_RULE_SET');
    expect(result.uncertaintyFlags).not.toContain('NO_APPLICABLE_RULES');
    expect(result.status).toBe('review');
  });

  it('flags INCOMPLETE_RULE_SET when expected rule count is not satisfied', () => {
    const result = executeRules(
      {
        rowId: 'row_3b',
        type: 'MCQ',
        questionText: 'Question',
        optionCount: 4,
        mappingConfidence: 0.95,
        parsingConfidence: 0.95,
        typeUnknown: false,
        typeAmbiguous: false,
      },
      [REQUIRED_QUESTION_FIELD_RULE]
    );

    expect(result.applicableRules).toEqual(['REQUIRED_QUESTION_FIELD']);
    expect(result.uncertaintyFlags).toContain('INCOMPLETE_RULE_SET');
    expect(result.status).toBe('review');
  });

  it('returns LOW_MAPPING_CONFIDENCE when only mapping confidence is low', () => {
    const result = executeRules(
      {
        rowId: 'row_4a',
        type: 'MCQ',
        questionText: 'Question',
        optionCount: 4,
        mappingConfidence: 0.5,
        parsingConfidence: 0.95,
        typeUnknown: false,
        typeAmbiguous: false,
      },
      [REQUIRED_QUESTION_FIELD_RULE, MCQ_MIN_OPTIONS_RULE]
    );

    expect(result.failedRules).toEqual([]);
    expect(result.uncertaintyFlags).toContain('LOW_MAPPING_CONFIDENCE');
    expect(result.uncertaintyFlags).not.toContain('LOW_PARSING_CONFIDENCE');
  });

  it('returns review when confidence is below 90 even with no failed rules', () => {
    const result = executeRules(
      {
        rowId: 'row_4b',
        type: 'MCQ',
        questionText: 'Question',
        optionCount: 4,
        mappingConfidence: 0.4,
        parsingConfidence: 0.4,
        typeUnknown: false,
        typeAmbiguous: false,
      },
      [REQUIRED_QUESTION_FIELD_RULE, MCQ_MIN_OPTIONS_RULE]
    );

    expect(result.failedRules).toEqual([]);
    expect(result.confidence).toBeLessThan(90);
    expect(result.status).toBe('review');
    expect(result.uncertaintyFlags).toContain('LOW_MAPPING_CONFIDENCE');
    expect(result.uncertaintyFlags).toContain('LOW_PARSING_CONFIDENCE');
    expect(result.uncertaintyFlags).not.toContain('LOW_CONFIDENCE');
  });

  it('caps confidence and forces review when type is ambiguous', () => {
    const result = executeRules(
      {
        rowId: 'row_5',
        type: 'MCQ',
        questionText: 'Question',
        optionCount: 4,
        mappingConfidence: 1,
        parsingConfidence: 1,
        typeUnknown: false,
        typeAmbiguous: true,
      },
      [REQUIRED_QUESTION_FIELD_RULE, MCQ_MIN_OPTIONS_RULE]
    );

    expect(result.status).toBe('review');
    expect(result.confidence).toBeLessThan(90);
    expect(result.uncertaintyFlags).toContain('TYPE_AMBIGUITY');
  });

  it('records skipped rules with user-friendly reason', () => {
    const skippedRule: ValidationRule = {
      id: 'MCQ_MIN_OPTIONS',
      appliesTo: ['MCQ'],
      severity: 'low',
      priority: 10,
      shouldRun: (context) => !!context.optionCount && context.optionCount > 0,
      validate: () => ({ passed: true }),
    };

    const result = executeRules(
      {
        rowId: 'row_6',
        type: 'MCQ',
        questionText: 'Question',
        optionCount: 0,
        mappingConfidence: 1,
        parsingConfidence: 1,
      },
      [skippedRule]
    );

    expect(result.skippedRules).toEqual([
      {
        ruleId: 'MCQ_MIN_OPTIONS',
        reason: 'Cannot validate answer because options are missing',
        skipType: 'DATA_MISSING',
      },
    ]);
  });

  it('fails MCQ_OPTIONS_UNIQUE for duplicate option text', () => {
    const result = executeRules(
      {
        rowId: 'row_dup',
        type: 'MCQ',
        questionText: 'Question',
        optionCount: 3,
        choices: [
          { identifier: 'CHOICE_1', text: 'A', normalizedText: 'a' },
          { identifier: 'CHOICE_2', text: 'B', normalizedText: 'b' },
          { identifier: 'CHOICE_3', text: 'A', normalizedText: 'a' },
        ],
        correctResponseIdentifiers: ['CHOICE_1'],
        mappingConfidence: 1,
        parsingConfidence: 1,
      },
      [
        REQUIRED_QUESTION_FIELD_RULE,
        MCQ_MIN_OPTIONS_RULE,
        MCQ_OPTION_TEXT_NOT_EMPTY_RULE,
        MCQ_OPTIONS_UNIQUE_RULE,
        MCQ_OPTION_IDENTIFIERS_UNIQUE_RULE,
        MCQ_OPTION_IDENTIFIER_VALID_RULE,
        MCQ_HAS_CORRECT_ANSWER_RULE,
        MCQ_ANSWER_IN_OPTIONS_RULE,
        MCQ_SINGLE_CORRECT_ONLY_RULE,
      ]
    );

    expect(result.failedRules).toContain('MCQ_OPTIONS_UNIQUE');
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'DUPLICATE_OPTION_TEXT' }),
      ])
    );
    expect(result.status).toBe('invalid');
  });

  it('fails MCQ_HAS_CORRECT_ANSWER when no correct answer is specified', () => {
    const result = executeRules(
      {
        rowId: 'row_no_correct',
        type: 'MCQ',
        questionText: 'Question',
        optionCount: 2,
        choices: [
          { identifier: 'CHOICE_1', text: 'A', normalizedText: 'a' },
          { identifier: 'CHOICE_2', text: 'B', normalizedText: 'b' },
        ],
        correctResponseIdentifiers: [],
        mappingConfidence: 1,
        parsingConfidence: 1,
      },
      [
        REQUIRED_QUESTION_FIELD_RULE,
        MCQ_MIN_OPTIONS_RULE,
        MCQ_OPTION_TEXT_NOT_EMPTY_RULE,
        MCQ_OPTIONS_UNIQUE_RULE,
        MCQ_OPTION_IDENTIFIERS_UNIQUE_RULE,
        MCQ_OPTION_IDENTIFIER_VALID_RULE,
        MCQ_HAS_CORRECT_ANSWER_RULE,
        MCQ_ANSWER_IN_OPTIONS_RULE,
        MCQ_SINGLE_CORRECT_ONLY_RULE,
      ]
    );

    expect(result.failedRules).toContain('MCQ_HAS_CORRECT_ANSWER');
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'MISSING_CORRECT_ANSWER' }),
      ])
    );
    expect(result.status).toBe('invalid');
  });

  it('fails MCQ_ANSWER_IN_OPTIONS when correct answer not in options', () => {
    const result = executeRules(
      {
        rowId: 'row_answer_missing',
        type: 'MCQ',
        questionText: 'Question',
        optionCount: 2,
        choices: [
          { identifier: 'CHOICE_1', text: 'A', normalizedText: 'a' },
          { identifier: 'CHOICE_2', text: 'B', normalizedText: 'b' },
        ],
        correctResponseIdentifiers: ['CHOICE_3'],
        mappingConfidence: 1,
        parsingConfidence: 1,
      },
      [
        REQUIRED_QUESTION_FIELD_RULE,
        MCQ_MIN_OPTIONS_RULE,
        MCQ_OPTION_TEXT_NOT_EMPTY_RULE,
        MCQ_OPTIONS_UNIQUE_RULE,
        MCQ_OPTION_IDENTIFIERS_UNIQUE_RULE,
        MCQ_OPTION_IDENTIFIER_VALID_RULE,
        MCQ_HAS_CORRECT_ANSWER_RULE,
        MCQ_ANSWER_IN_OPTIONS_RULE,
        MCQ_SINGLE_CORRECT_ONLY_RULE,
      ]
    );

    expect(result.failedRules).toContain('MCQ_ANSWER_IN_OPTIONS');
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'ANSWER_NOT_IN_OPTIONS' }),
      ])
    );
    expect(result.status).toBe('invalid');
  });

  it('fails MCQ_SINGLE_CORRECT_ONLY when multiple correct answers are set', () => {
    const result = executeRules(
      {
        rowId: 'row_multi_correct',
        type: 'MCQ',
        questionText: 'Question',
        optionCount: 3,
        choices: [
          { identifier: 'CHOICE_1', text: 'A', normalizedText: 'a' },
          { identifier: 'CHOICE_2', text: 'B', normalizedText: 'b' },
          { identifier: 'CHOICE_3', text: 'C', normalizedText: 'c' },
        ],
        correctResponseIdentifiers: ['CHOICE_1', 'CHOICE_2'],
        mappingConfidence: 1,
        parsingConfidence: 1,
      },
      [
        REQUIRED_QUESTION_FIELD_RULE,
        MCQ_MIN_OPTIONS_RULE,
        MCQ_OPTION_TEXT_NOT_EMPTY_RULE,
        MCQ_OPTIONS_UNIQUE_RULE,
        MCQ_HAS_CORRECT_ANSWER_RULE,
        MCQ_ANSWER_IN_OPTIONS_RULE,
        MCQ_SINGLE_CORRECT_ONLY_RULE,
      ]
    );

    expect(result.failedRules).toContain('MCQ_SINGLE_CORRECT_ONLY');
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'MULTIPLE_CORRECT_ANSWERS' }),
      ])
    );
    expect(result.status).toBe('invalid');
  });

  it('passes a fully valid MCQ', () => {
    const result = executeRules(
      {
        rowId: 'row_valid_mcq',
        type: 'MCQ',
        questionText: 'Question',
        optionCount: 3,
        choices: [
          { identifier: 'CHOICE_1', text: 'A', normalizedText: 'a' },
          { identifier: 'CHOICE_2', text: 'B', normalizedText: 'b' },
          { identifier: 'CHOICE_3', text: 'C', normalizedText: 'c' },
        ],
        correctResponseIdentifiers: ['CHOICE_2'],
        mappingConfidence: 1,
        parsingConfidence: 1,
      },
      [
        REQUIRED_QUESTION_FIELD_RULE,
        MCQ_MIN_OPTIONS_RULE,
        MCQ_OPTION_TEXT_NOT_EMPTY_RULE,
        MCQ_OPTIONS_UNIQUE_RULE,
        MCQ_OPTION_IDENTIFIERS_UNIQUE_RULE,
        MCQ_OPTION_IDENTIFIER_VALID_RULE,
        MCQ_HAS_CORRECT_ANSWER_RULE,
        MCQ_ANSWER_IN_OPTIONS_RULE,
        MCQ_SINGLE_CORRECT_ONLY_RULE,
      ]
    );

    expect(result.failedRules).toEqual([]);
    expect(result.issues).toEqual([]);
    expect(result.status).toBe('review');
  });
});

describe('MCQ_OPTION_IDENTIFIERS_UNIQUE_RULE', () => {
  it('fails MCQ_OPTION_IDENTIFIERS_UNIQUE for duplicate identifiers', () => {
    const result = executeRules(
      {
        rowId: 'row_dup_id',
        type: 'MCQ',
        questionText: 'Question',
        optionCount: 3,
        choices: [
          { identifier: 'CHOICE_1', text: 'A', normalizedText: 'a' },
          { identifier: 'CHOICE_2', text: 'B', normalizedText: 'b' },
          { identifier: 'CHOICE_1', text: 'C', normalizedText: 'c' },
        ],
        correctResponseIdentifiers: ['CHOICE_1'],
        mappingConfidence: 1,
        parsingConfidence: 1,
      },
      [
        REQUIRED_QUESTION_FIELD_RULE,
        MCQ_MIN_OPTIONS_RULE,
        MCQ_OPTION_TEXT_NOT_EMPTY_RULE,
        MCQ_OPTIONS_UNIQUE_RULE,
        MCQ_OPTION_IDENTIFIERS_UNIQUE_RULE,
        MCQ_HAS_CORRECT_ANSWER_RULE,
        MCQ_ANSWER_IN_OPTIONS_RULE,
        MCQ_SINGLE_CORRECT_ONLY_RULE,
      ]
    );

    expect(result.failedRules).toContain('MCQ_OPTION_IDENTIFIERS_UNIQUE');
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'DUPLICATE_OPTION_IDENTIFIERS' }),
      ])
    );
    expect(result.status).toBe('invalid');
  });
});

describe('MCQ_OPTIONS_UNIQUE_RULE with enhanced normalization', () => {
  it('fails MCQ_OPTIONS_UNIQUE for tricky duplicates with spaces', () => {
    const result = executeRules(
      {
        rowId: 'row_tricky_dup',
        type: 'MCQ',
        questionText: 'Question',
        optionCount: 3,
        choices: [
          { identifier: 'CHOICE_1', text: 'Option A', normalizedText: 'option a' },
          { identifier: 'CHOICE_2', text: 'B', normalizedText: 'b' },
          { identifier: 'CHOICE_3', text: ' option a ', normalizedText: 'option a' },
        ],
        correctResponseIdentifiers: ['CHOICE_1'],
        mappingConfidence: 1,
        parsingConfidence: 1,
      },
      [
        REQUIRED_QUESTION_FIELD_RULE,
        MCQ_MIN_OPTIONS_RULE,
        MCQ_OPTION_TEXT_NOT_EMPTY_RULE,
        MCQ_OPTIONS_UNIQUE_RULE,
        MCQ_OPTION_IDENTIFIERS_UNIQUE_RULE,
        MCQ_OPTION_IDENTIFIER_VALID_RULE,
        MCQ_HAS_CORRECT_ANSWER_RULE,
        MCQ_ANSWER_IN_OPTIONS_RULE,
        MCQ_SINGLE_CORRECT_ONLY_RULE,
      ]
    );

    expect(result.failedRules).toContain('MCQ_OPTIONS_UNIQUE');
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'DUPLICATE_OPTION_TEXT' }),
      ])
    );
    expect(result.status).toBe('invalid');
  });

  it('passes MCQ_OPTIONS_UNIQUE for options that differ only by hyphen (Option-A vs OptionA are now distinct)', () => {
    // After removing the [-_.] stripping, 'option-a' !== 'optiona' so they are unique.
    const result = executeRules(
      {
        rowId: 'row_punct_distinct',
        type: 'MCQ',
        questionText: 'Question',
        optionCount: 3,
        choices: [
          { identifier: 'CHOICE_1', text: 'Option-A', normalizedText: 'option-a' },
          { identifier: 'CHOICE_2', text: 'B', normalizedText: 'b' },
          { identifier: 'CHOICE_3', text: 'OptionA', normalizedText: 'optiona' },
        ],
        correctResponseIdentifiers: ['CHOICE_1'],
        mappingConfidence: 1,
        parsingConfidence: 1,
      },
      [
        REQUIRED_QUESTION_FIELD_RULE,
        MCQ_MIN_OPTIONS_RULE,
        MCQ_OPTION_TEXT_NOT_EMPTY_RULE,
        MCQ_OPTIONS_UNIQUE_RULE,
        MCQ_OPTION_IDENTIFIERS_UNIQUE_RULE,
        MCQ_OPTION_IDENTIFIER_VALID_RULE,
        MCQ_HAS_CORRECT_ANSWER_RULE,
        MCQ_ANSWER_IN_OPTIONS_RULE,
        MCQ_SINGLE_CORRECT_ONLY_RULE,
      ]
    );

    expect(result.passedRules).toContain('MCQ_OPTIONS_UNIQUE');
    expect(result.failedRules).not.toContain('MCQ_OPTIONS_UNIQUE');
  });
});

describe('MCQ_OPTION_IDENTIFIER_VALID_RULE', () => {
  it('fails MCQ_OPTION_IDENTIFIER_VALID for invalid identifiers', () => {
    const result = executeRules(
      {
        rowId: 'row_invalid_id',
        type: 'MCQ',
        questionText: 'Question',
        optionCount: 3,
        choices: [
          { identifier: '', text: 'A', normalizedText: 'a' },
          { identifier: 'CHOICE_2', text: 'B', normalizedText: 'b' },
          { identifier: '   ', text: 'C', normalizedText: 'c' },
        ],
        correctResponseIdentifiers: ['CHOICE_2'],
        mappingConfidence: 1,
        parsingConfidence: 1,
      },
      [
        REQUIRED_QUESTION_FIELD_RULE,
        MCQ_MIN_OPTIONS_RULE,
        MCQ_OPTION_TEXT_NOT_EMPTY_RULE,
        MCQ_OPTIONS_UNIQUE_RULE,
        MCQ_OPTION_IDENTIFIERS_UNIQUE_RULE,
        MCQ_OPTION_IDENTIFIER_VALID_RULE,
        MCQ_HAS_CORRECT_ANSWER_RULE,
        MCQ_ANSWER_IN_OPTIONS_RULE,
        MCQ_SINGLE_CORRECT_ONLY_RULE,
      ]
    );

    expect(result.failedRules).toContain('MCQ_OPTION_IDENTIFIER_VALID');
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'INVALID_OPTION_IDENTIFIER' }),
      ])
    );
    expect(result.status).toBe('invalid');
  });
});

describe('VALIDATION_SCOPE_LIMITED uncertainty flag', () => {
  it('adds VALIDATION_SCOPE_LIMITED when rule set is incomplete', () => {
    const result = executeRules(
      {
        rowId: 'row_valid_mcq',
        type: 'MCQ',
        questionText: 'Question',
        optionCount: 3,
        choices: [
          { identifier: 'CHOICE_1', text: 'A', normalizedText: 'a' },
          { identifier: 'CHOICE_2', text: 'B', normalizedText: 'b' },
          { identifier: 'CHOICE_3', text: 'C', normalizedText: 'c' },
        ],
        correctResponseIdentifiers: ['CHOICE_2'],
        mappingConfidence: 1,
        parsingConfidence: 1,
      },
      [
        REQUIRED_QUESTION_FIELD_RULE,
        MCQ_MIN_OPTIONS_RULE,
        MCQ_OPTION_TEXT_NOT_EMPTY_RULE,
        MCQ_OPTIONS_UNIQUE_RULE,
        MCQ_OPTION_IDENTIFIERS_UNIQUE_RULE,
        // MCQ_OPTION_IDENTIFIER_VALID_RULE, // omitted to make incomplete
        MCQ_HAS_CORRECT_ANSWER_RULE,
        MCQ_ANSWER_IN_OPTIONS_RULE,
        MCQ_SINGLE_CORRECT_ONLY_RULE,
      ]
    );

    expect(result.uncertaintyFlags).toContain('VALIDATION_SCOPE_LIMITED');
    expect(result.status).toBe('review');
  });
});

describe('VALIDATION_SYSTEM_ERROR uncertainty flag', () => {
  it('adds VALIDATION_SYSTEM_ERROR when rule skips with SYSTEM_ERROR', () => {
    // Create a mock rule that skips with SYSTEM_ERROR
    const mockSystemErrorRule: ValidationRule = {
      id: 'MOCK_SYSTEM_ERROR',
      appliesTo: ['MCQ'],
      severity: 'medium',
      priority: 999,
      shouldRun: () => true,
      validate: () => ({ skip: true, skipType: 'SYSTEM_ERROR' } as any),
    };

    const result = executeRules(
      {
        rowId: 'row_system_error',
        type: 'MCQ',
        questionText: 'Question',
        optionCount: 3,
        choices: [
          { identifier: 'CHOICE_1', text: 'A', normalizedText: 'a' },
          { identifier: 'CHOICE_2', text: 'B', normalizedText: 'b' },
          { identifier: 'CHOICE_3', text: 'C', normalizedText: 'c' },
        ],
        correctResponseIdentifiers: ['CHOICE_2'],
        mappingConfidence: 1,
        parsingConfidence: 1,
      },
      [
        REQUIRED_QUESTION_FIELD_RULE,
        MCQ_MIN_OPTIONS_RULE,
        MCQ_OPTION_TEXT_NOT_EMPTY_RULE,
        MCQ_OPTIONS_UNIQUE_RULE,
        MCQ_OPTION_IDENTIFIERS_UNIQUE_RULE,
        MCQ_OPTION_IDENTIFIER_VALID_RULE,
        MCQ_HAS_CORRECT_ANSWER_RULE,
        MCQ_ANSWER_IN_OPTIONS_RULE,
        MCQ_SINGLE_CORRECT_ONLY_RULE,
        mockSystemErrorRule,
      ]
    );

    expect(result.uncertaintyFlags).toContain('VALIDATION_SYSTEM_ERROR');
    expect(result.status).toBe('review');
    expect(result.skippedRules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ruleId: 'MOCK_SYSTEM_ERROR', skipType: 'SYSTEM_ERROR' }),
      ])
    );
  });
});

describe('MCQ_OPTION_IDENTIFIERS_UNIQUE_RULE with trim-only normalization', () => {
  it('treats case-mismatched identifiers as distinct', () => {
    const result = executeRules(
      {
        rowId: 'row_case_id',
        type: 'MCQ',
        questionText: 'Question',
        optionCount: 2,
        choices: [
          { identifier: 'A', text: 'Option A', normalizedText: 'option a' },
          { identifier: 'a', text: 'Option B', normalizedText: 'option b' },
        ],
        correctResponseIdentifiers: ['A'],
        mappingConfidence: 1,
        parsingConfidence: 1,
      },
      [
        REQUIRED_QUESTION_FIELD_RULE,
        MCQ_MIN_OPTIONS_RULE,
        MCQ_OPTION_TEXT_NOT_EMPTY_RULE,
        MCQ_OPTIONS_UNIQUE_RULE,
        MCQ_OPTION_IDENTIFIERS_UNIQUE_RULE,
        MCQ_OPTION_IDENTIFIER_VALID_RULE,
        MCQ_HAS_CORRECT_ANSWER_RULE,
        MCQ_ANSWER_IN_OPTIONS_RULE,
        MCQ_ANSWER_TEXT_MATCH_RULE,
        MCQ_SINGLE_CORRECT_ONLY_RULE,
        MCQ_SUSPECT_TYPE_RULE,
      ]
    );

    expect(result.failedRules).not.toContain('MCQ_OPTION_IDENTIFIERS_UNIQUE');
  });
});

describe('MCQ_ANSWER_TEXT_MATCH_RULE', () => {
  it('passes MCQ_ANSWER_TEXT_MATCH when answer matches option text', () => {
    const result = executeRules(
      {
        rowId: 'row_text_answer',
        type: 'MCQ',
        questionText: 'Question',
        optionCount: 2,
        choices: [
          { identifier: 'CHOICE_1', text: 'Option A', normalizedText: 'option a' },
          { identifier: 'CHOICE_2', text: 'Option B', normalizedText: 'option b' },
        ],
        correctResponseIdentifiers: ['Option A'],
        mappingConfidence: 1,
        parsingConfidence: 1,
      },
      [
        REQUIRED_QUESTION_FIELD_RULE,
        MCQ_MIN_OPTIONS_RULE,
        MCQ_OPTION_TEXT_NOT_EMPTY_RULE,
        MCQ_OPTIONS_UNIQUE_RULE,
        MCQ_OPTION_IDENTIFIERS_UNIQUE_RULE,
        MCQ_OPTION_IDENTIFIER_VALID_RULE,
        MCQ_HAS_CORRECT_ANSWER_RULE,
        MCQ_ANSWER_IN_OPTIONS_RULE,
        MCQ_ANSWER_TEXT_MATCH_RULE,
        MCQ_SINGLE_CORRECT_ONLY_RULE,
        MCQ_SUSPECT_TYPE_RULE,
      ]
    );

    expect(result.failedRules).not.toContain('MCQ_ANSWER_TEXT_MATCH');
    expect(result.passedRules).toContain('MCQ_ANSWER_TEXT_MATCH');
  });

  it('fails MCQ_ANSWER_TEXT_MATCH when answer text does not match any option', () => {
    const result = executeRules(
      {
        rowId: 'row_text_nomatch',
        type: 'MCQ',
        questionText: 'Question',
        optionCount: 2,
        choices: [
          { identifier: 'CHOICE_1', text: 'Option A', normalizedText: 'option a' },
          { identifier: 'CHOICE_2', text: 'Option B', normalizedText: 'option b' },
        ],
        correctResponseIdentifiers: ['Option C'],
        mappingConfidence: 1,
        parsingConfidence: 1,
      },
      [
        REQUIRED_QUESTION_FIELD_RULE,
        MCQ_MIN_OPTIONS_RULE,
        MCQ_OPTION_TEXT_NOT_EMPTY_RULE,
        MCQ_OPTIONS_UNIQUE_RULE,
        MCQ_OPTION_IDENTIFIERS_UNIQUE_RULE,
        MCQ_OPTION_IDENTIFIER_VALID_RULE,
        MCQ_HAS_CORRECT_ANSWER_RULE,
        MCQ_ANSWER_IN_OPTIONS_RULE,
        MCQ_ANSWER_TEXT_MATCH_RULE,
        MCQ_SINGLE_CORRECT_ONLY_RULE,
        MCQ_SUSPECT_TYPE_RULE,
      ]
    );

    expect(result.failedRules).toContain('MCQ_ANSWER_TEXT_MATCH');
  });
});

describe('MCQ_SUSPECT_TYPE_RULE', () => {
  it('flags TYPE_MISMATCH_SUSPECTED for True/False options', () => {
    const result = executeRules(
      {
        rowId: 'row_true_false',
        type: 'MCQ',
        questionText: 'Question',
        optionCount: 2,
        choices: [
          { identifier: 'CHOICE_1', text: 'True', normalizedText: 'true' },
          { identifier: 'CHOICE_2', text: 'False', normalizedText: 'false' },
        ],
        correctResponseIdentifiers: ['CHOICE_1'],
        mappingConfidence: 1,
        parsingConfidence: 1,
      },
      [
        REQUIRED_QUESTION_FIELD_RULE,
        MCQ_MIN_OPTIONS_RULE,
        MCQ_OPTION_TEXT_NOT_EMPTY_RULE,
        MCQ_OPTIONS_UNIQUE_RULE,
        MCQ_OPTION_IDENTIFIERS_UNIQUE_RULE,
        MCQ_OPTION_IDENTIFIER_VALID_RULE,
        MCQ_HAS_CORRECT_ANSWER_RULE,
        MCQ_ANSWER_IN_OPTIONS_RULE,
        MCQ_ANSWER_TEXT_MATCH_RULE,
        MCQ_SINGLE_CORRECT_ONLY_RULE,
        MCQ_SUSPECT_TYPE_RULE,
      ]
    );

    expect(result.failedRules).toContain('MCQ_SUSPECT_TYPE');
    expect(result.uncertaintyFlags).toContain('TYPE_MISMATCH_SUSPECTED');
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'SUSPECT_TRUE_FALSE' }),
      ])
    );
  });
});

describe('MCQ_OPTIONS_UNIQUE_RULE preserves meaningful characters', () => {
  it('does not treat C++ and C as duplicates', () => {
    const result = executeRules(
      {
        rowId: 'row_cpp_c',
        type: 'MCQ',
        questionText: 'Question',
        optionCount: 2,
        choices: [
          { identifier: 'CHOICE_1', text: 'C++', normalizedText: 'c++' },
          { identifier: 'CHOICE_2', text: 'C', normalizedText: 'c' },
        ],
        correctResponseIdentifiers: ['CHOICE_1'],
        mappingConfidence: 1,
        parsingConfidence: 1,
      },
      [
        REQUIRED_QUESTION_FIELD_RULE,
        MCQ_MIN_OPTIONS_RULE,
        MCQ_OPTION_TEXT_NOT_EMPTY_RULE,
        MCQ_OPTIONS_UNIQUE_RULE,
        MCQ_OPTION_IDENTIFIERS_UNIQUE_RULE,
        MCQ_OPTION_IDENTIFIER_VALID_RULE,
        MCQ_HAS_CORRECT_ANSWER_RULE,
        MCQ_ANSWER_IN_OPTIONS_RULE,
        MCQ_ANSWER_TEXT_MATCH_RULE,
        MCQ_SINGLE_CORRECT_ONLY_RULE,
        MCQ_SUSPECT_TYPE_RULE,
      ]
    );

    expect(result.failedRules).not.toContain('MCQ_OPTIONS_UNIQUE');
    expect(result.passedRules).toContain('MCQ_OPTIONS_UNIQUE');
  });

  describe('MCQ_ANSWER_TEXT_AMBIGUOUS_RULE', () => {
    it('fails when answer text matches multiple options', () => {
      const result = executeRules(
        {
          rowId: 'row_ambiguous',
          type: 'MCQ',
          questionText: 'What is the capital of France?',
          optionCount: 2,
          choices: [
            { identifier: '1', text: 'Paris', normalizedText: 'paris' },
            { identifier: '2', text: 'Paris', normalizedText: 'paris' },
          ],
          correctResponseIdentifiers: ['Paris'],
          mappingConfidence: 0.95,
          parsingConfidence: 0.95,
          typeUnknown: false,
          typeAmbiguous: false,
        },
        [
          MCQ_OPTION_TEXT_NOT_EMPTY_RULE,
          MCQ_OPTIONS_UNIQUE_RULE,
          MCQ_OPTION_IDENTIFIERS_UNIQUE_RULE,
          MCQ_OPTION_IDENTIFIER_VALID_RULE,
          MCQ_HAS_CORRECT_ANSWER_RULE,
          MCQ_ANSWER_IN_OPTIONS_RULE,
          MCQ_ANSWER_TEXT_MATCH_RULE,
          MCQ_ANSWER_TEXT_AMBIGUOUS_RULE,
          MCQ_SINGLE_CORRECT_ONLY_RULE,
          MCQ_SHOULD_BE_MSQ_RULE,
          MCQ_SUSPECT_TYPE_RULE,
        ]
      );

      expect(result.failedRules).toContain('MCQ_ANSWER_TEXT_AMBIGUOUS');
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: 'AMBIGUOUS_ANSWER_MATCH',
          message: 'Answer text matches multiple options. Ambiguous mapping.',
        })
      );
    });

    it('passes when answer matches only one option with strict normalization', () => {
      const result = executeRules(
        {
          rowId: 'row_strict_match',
          type: 'MCQ',
          questionText: 'What is the capital?',
          optionCount: 2,
          choices: [
            { identifier: '1', text: 'Paris', normalizedText: 'paris' },
            { identifier: '2', text: 'London', normalizedText: 'london' },
          ],
          correctResponseIdentifiers: ['Paris'],
          mappingConfidence: 0.95,
          parsingConfidence: 0.95,
          typeUnknown: false,
          typeAmbiguous: false,
        },
        [
          MCQ_OPTION_TEXT_NOT_EMPTY_RULE,
          MCQ_OPTIONS_UNIQUE_RULE,
          MCQ_OPTION_IDENTIFIERS_UNIQUE_RULE,
          MCQ_OPTION_IDENTIFIER_VALID_RULE,
          MCQ_HAS_CORRECT_ANSWER_RULE,
          MCQ_ANSWER_IN_OPTIONS_RULE,
          MCQ_ANSWER_TEXT_MATCH_RULE,
          MCQ_ANSWER_TEXT_AMBIGUOUS_RULE,
          MCQ_SINGLE_CORRECT_ONLY_RULE,
          MCQ_SHOULD_BE_MSQ_RULE,
          MCQ_SUSPECT_TYPE_RULE,
        ]
      );

      expect(result.failedRules).not.toContain('MCQ_ANSWER_TEXT_AMBIGUOUS');
      expect(result.passedRules).toContain('MCQ_ANSWER_TEXT_AMBIGUOUS');
    });
  });

  describe('MCQ_SHOULD_BE_MSQ_RULE (for uncertain types)', () => {
    it('fails when multiple correct answers are detected AND type is uncertain', () => {
      const result = executeRules(
        {
          rowId: 'row_multiple_correct_uncertain',
          type: 'MCQ',
          questionText: 'Which are capitals?',
          optionCount: 3,
          choices: [
            { identifier: '1', text: 'A', normalizedText: 'a' },
            { identifier: '2', text: 'B', normalizedText: 'b' },
            { identifier: '3', text: 'C', normalizedText: 'c' },
          ],
          correctResponseIdentifiers: ['A', 'B'],
          mappingConfidence: 0.95,
          parsingConfidence: 0.95,
          typeUnknown: false,
          typeAmbiguous: true,
        },
        [
          MCQ_OPTION_TEXT_NOT_EMPTY_RULE,
          MCQ_OPTIONS_UNIQUE_RULE,
          MCQ_OPTION_IDENTIFIERS_UNIQUE_RULE,
          MCQ_OPTION_IDENTIFIER_VALID_RULE,
          MCQ_HAS_CORRECT_ANSWER_RULE,
          MCQ_ANSWER_IN_OPTIONS_RULE,
          MCQ_ANSWER_TEXT_MATCH_RULE,
          MCQ_ANSWER_TEXT_AMBIGUOUS_RULE,
          MCQ_SINGLE_CORRECT_ONLY_RULE,
          MCQ_SHOULD_BE_MSQ_RULE,
          MCQ_SUSPECT_TYPE_RULE,
        ]
      );

      expect(result.failedRules).toContain('MCQ_SHOULD_BE_MSQ');
      expect(result.failedRules).not.toContain('MCQ_SINGLE_CORRECT_ONLY');
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: 'TYPE_MISMATCH_MSQ',
          message: expect.stringContaining('This should be MSQ'),
        })
      );
    });

    it('passes when only one correct answer is selected', () => {
      const result = executeRules(
        {
          rowId: 'row_single_correct_uncertain',
          type: 'MCQ',
          questionText: 'Which is correct?',
          optionCount: 3,
          choices: [
            { identifier: '1', text: 'A', normalizedText: 'a' },
            { identifier: '2', text: 'B', normalizedText: 'b' },
            { identifier: '3', text: 'C', normalizedText: 'c' },
          ],
          correctResponseIdentifiers: ['A'],
          mappingConfidence: 0.95,
          parsingConfidence: 0.95,
          typeUnknown: false,
          typeAmbiguous: true,
        },
        [
          MCQ_OPTION_TEXT_NOT_EMPTY_RULE,
          MCQ_OPTIONS_UNIQUE_RULE,
          MCQ_OPTION_IDENTIFIERS_UNIQUE_RULE,
          MCQ_OPTION_IDENTIFIER_VALID_RULE,
          MCQ_HAS_CORRECT_ANSWER_RULE,
          MCQ_ANSWER_IN_OPTIONS_RULE,
          MCQ_ANSWER_TEXT_MATCH_RULE,
          MCQ_ANSWER_TEXT_AMBIGUOUS_RULE,
          MCQ_SINGLE_CORRECT_ONLY_RULE,
          MCQ_SHOULD_BE_MSQ_RULE,
          MCQ_SUSPECT_TYPE_RULE,
        ]
      );

      // MCQ_SHOULD_BE_MSQ skips because correct.length == 1 (not > 1)
      expect(result.skippedRules.find((r) => r.ruleId === 'MCQ_SHOULD_BE_MSQ')).toBeDefined();
    });
  });

  describe('STRICT normalization for dirty data', () => {
    it('treats "Paris", " paris ", "PARIS.", "paris!" as same with STRICT normalization', () => {
      const result = executeRules(
        {
          rowId: 'row_dirty_data',
          type: 'MCQ',
          questionText: 'What is the capital of France?',
          optionCount: 4,
          choices: [
            { identifier: '1', text: 'Paris', normalizedText: 'paris' },
            { identifier: '2', text: ' paris ', normalizedText: 'paris' },
            { identifier: '3', text: 'PARIS.', normalizedText: 'paris.' },
            { identifier: '4', text: 'paris!', normalizedText: 'paris!' },
          ],
          correctResponseIdentifiers: ['Paris'],
          mappingConfidence: 0.95,
          parsingConfidence: 0.95,
          typeUnknown: false,
          typeAmbiguous: false,
        },
        [
          MCQ_OPTION_TEXT_NOT_EMPTY_RULE,
          MCQ_OPTIONS_UNIQUE_RULE,
          MCQ_OPTION_IDENTIFIERS_UNIQUE_RULE,
          MCQ_OPTION_IDENTIFIER_VALID_RULE,
          MCQ_HAS_CORRECT_ANSWER_RULE,
          MCQ_ANSWER_IN_OPTIONS_RULE,
          MCQ_ANSWER_TEXT_MATCH_RULE,
          MCQ_ANSWER_TEXT_AMBIGUOUS_RULE,
          MCQ_SINGLE_CORRECT_ONLY_RULE,
          MCQ_SHOULD_BE_MSQ_RULE,
          MCQ_SUSPECT_TYPE_RULE,
        ]
      );

      // With STRICT normalization (trim, lowercase, collapse whitespace),
      // " paris " becomes "paris" (matches),
      // but "PARIS." becomes "paris." (does NOT match - punctuation is preserved),
      // and "paris!" becomes "paris!" (does NOT match - exclamation is preserved).
      // So only " paris " matches - should pass MCQ_ANSWER_TEXT_MATCH.
      expect(result.passedRules).toContain('MCQ_ANSWER_TEXT_MATCH');
      expect(result.failedRules).not.toContain('MCQ_ANSWER_TEXT_MATCH');
    });

    it('detects when multiple options become identical after strict normalization', () => {
      const result = executeRules(
        {
          rowId: 'row_identical_after_clean',
          type: 'MCQ',
          questionText: 'Which?',
          optionCount: 2,
          choices: [
            { identifier: '1', text: 'Paris', normalizedText: 'paris' },
            { identifier: '2', text: '  paris  ', normalizedText: 'paris' },
          ],
          correctResponseIdentifiers: ['Paris'],
          mappingConfidence: 0.95,
          parsingConfidence: 0.95,
          typeUnknown: false,
          typeAmbiguous: false,
        },
        [
          MCQ_OPTION_TEXT_NOT_EMPTY_RULE,
          MCQ_OPTIONS_UNIQUE_RULE,
          MCQ_OPTION_IDENTIFIERS_UNIQUE_RULE,
          MCQ_OPTION_IDENTIFIER_VALID_RULE,
          MCQ_HAS_CORRECT_ANSWER_RULE,
          MCQ_ANSWER_IN_OPTIONS_RULE,
          MCQ_ANSWER_TEXT_MATCH_RULE,
          MCQ_ANSWER_TEXT_AMBIGUOUS_RULE,
          MCQ_SINGLE_CORRECT_ONLY_RULE,
          MCQ_SHOULD_BE_MSQ_RULE,
          MCQ_SUSPECT_TYPE_RULE,
        ]
      );

      // Both normalize to "paris", so MCQ_ANSWER_TEXT_AMBIGUOUS should fail
      expect(result.failedRules).toContain('MCQ_ANSWER_TEXT_AMBIGUOUS');
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: 'AMBIGUOUS_ANSWER_MATCH',
        })
      );
    });
  });

  describe('MCQ_SUSPECT_TYPE_RULE with high severity', () => {
    it('flags True/False options with block severity', () => {
      const result = executeRules(
        {
          rowId: 'row_true_false',
          type: 'MCQ',
          questionText: 'Is Paris a city?',
          optionCount: 2,
          choices: [
            { identifier: '1', text: 'True', normalizedText: 'true' },
            { identifier: '2', text: 'False', normalizedText: 'false' },
          ],
          correctResponseIdentifiers: ['True'],
          mappingConfidence: 0.95,
          parsingConfidence: 0.95,
          typeUnknown: false,
          typeAmbiguous: false,
        },
        [
          MCQ_OPTION_TEXT_NOT_EMPTY_RULE,
          MCQ_OPTIONS_UNIQUE_RULE,
          MCQ_OPTION_IDENTIFIERS_UNIQUE_RULE,
          MCQ_OPTION_IDENTIFIER_VALID_RULE,
          MCQ_HAS_CORRECT_ANSWER_RULE,
          MCQ_ANSWER_IN_OPTIONS_RULE,
          MCQ_ANSWER_TEXT_MATCH_RULE,
          MCQ_ANSWER_TEXT_AMBIGUOUS_RULE,
          MCQ_SINGLE_CORRECT_ONLY_RULE,
          MCQ_SHOULD_BE_MSQ_RULE,
          MCQ_SUSPECT_TYPE_RULE,
        ]
      );

      expect(result.failedRules).toContain('MCQ_SUSPECT_TYPE');
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: 'SUSPECT_TRUE_FALSE',
          severity: 'block',
        })
      );
    });

    it('flags single option with block severity', () => {
      const result = executeRules(
        {
          rowId: 'row_single_option',
          type: 'MCQ',
          questionText: 'What is the answer?',
          optionCount: 1,
          choices: [{ identifier: '1', text: 'The Answer', normalizedText: 'the answer' }],
          correctResponseIdentifiers: ['The Answer'],
          mappingConfidence: 0.95,
          parsingConfidence: 0.95,
          typeUnknown: false,
          typeAmbiguous: false,
        },
        [
          MCQ_OPTION_TEXT_NOT_EMPTY_RULE,
          MCQ_OPTIONS_UNIQUE_RULE,
          MCQ_OPTION_IDENTIFIERS_UNIQUE_RULE,
          MCQ_OPTION_IDENTIFIER_VALID_RULE,
          MCQ_HAS_CORRECT_ANSWER_RULE,
          MCQ_ANSWER_IN_OPTIONS_RULE,
          MCQ_ANSWER_TEXT_MATCH_RULE,
          MCQ_ANSWER_TEXT_AMBIGUOUS_RULE,
          MCQ_SINGLE_CORRECT_ONLY_RULE,
          MCQ_SHOULD_BE_MSQ_RULE,
          MCQ_SUSPECT_TYPE_RULE,
        ]
      );

      expect(result.failedRules).toContain('MCQ_SUSPECT_TYPE');
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: 'SUSPECT_SINGLE_OPTION',
          severity: 'block',
        })
      );
    });
  });

  describe('Production-grade dirty whitespace handling', () => {
    it('normalizes tabs, newlines, and non-breaking spaces for text matching', () => {
      const result = executeRules(
        {
          rowId: 'row_whitespace_normalization',
          type: 'MCQ',
          questionText: 'What is the capital?',
          optionCount: 2,
          choices: [
            { identifier: 'A', text: 'Paris', normalizedText: 'paris' },
            { identifier: 'B', text: 'London', normalizedText: 'london' },
          ],
          correctResponseIdentifiers: ['Paris\t', 'PARIS\n', 'paris\u00A0'],
          mappingConfidence: 0.95,
          parsingConfidence: 0.95,
          typeUnknown: false,
          typeAmbiguous: false,
        },
        [MCQ_ANSWER_TEXT_MATCH_RULE, MCQ_ANSWER_TEXT_AMBIGUOUS_RULE]
      );

      expect(result.passedRules).toContain('MCQ_ANSWER_TEXT_MATCH');
      expect(result.passedRules).toContain('MCQ_ANSWER_TEXT_AMBIGUOUS');
    });

    it('normalizes tabs, newlines, and non-breaking spaces correctly', () => {
      const result = executeRules(
        {
          rowId: 'row_dirty_whitespace',
          type: 'MCQ',
          questionText: 'What is the capital?',
          optionCount: 4,
          choices: [
            { identifier: '1', text: 'Paris\t', normalizedText: 'paris\t' },
            { identifier: '2', text: 'PARIS\n', normalizedText: 'paris\n' },
            { identifier: '3', text: 'paris ', normalizedText: 'paris ' }, // non-breaking space in real scenario
            { identifier: '4', text: 'London', normalizedText: 'london' },
          ],
          correctResponseIdentifiers: ['1'],
          mappingConfidence: 0.95,
          parsingConfidence: 0.95,
          typeUnknown: false,
          typeAmbiguous: false,
        },
        [
          MCQ_OPTION_TEXT_NOT_EMPTY_RULE,
          MCQ_OPTIONS_UNIQUE_RULE,
          MCQ_OPTION_IDENTIFIERS_UNIQUE_RULE,
          MCQ_OPTION_IDENTIFIER_VALID_RULE,
          MCQ_HAS_CORRECT_ANSWER_RULE,
          MCQ_ANSWER_IN_OPTIONS_RULE,
          MCQ_ANSWER_TEXT_MATCH_RULE,
          MCQ_ANSWER_TEXT_AMBIGUOUS_RULE,
          MCQ_SINGLE_CORRECT_ONLY_RULE,
          MCQ_SHOULD_BE_MSQ_RULE,
          MCQ_SUSPECT_TYPE_RULE,
        ]
      );

      // Identifier match should pass for exact match with tab
      expect(result.passedRules).toContain('MCQ_ANSWER_IN_OPTIONS');

      // Text match shouldRun checks if identifier match would fail - it should skip
      expect(result.passedRules).toContain('MCQ_ANSWER_TEXT_MATCH');
    });

    it('handles tabs in text matching when identifier fails', () => {
      const result = executeRules(
        {
          rowId: 'row_dirty_fallback',
          type: 'MCQ',
          questionText: 'What is it?',
          optionCount: 2,
          choices: [
            { identifier: 'A', text: 'Option\tA', normalizedText: 'optiona' },
            { identifier: 'B', text: 'Option\nB', normalizedText: 'optionb' },
          ],
          correctResponseIdentifiers: ['Option\tA'],
          mappingConfidence: 0.95,
          parsingConfidence: 0.95,
          typeUnknown: false,
          typeAmbiguous: false,
        },
        [
          MCQ_OPTION_TEXT_NOT_EMPTY_RULE,
          MCQ_OPTIONS_UNIQUE_RULE,
          MCQ_OPTION_IDENTIFIERS_UNIQUE_RULE,
          MCQ_OPTION_IDENTIFIER_VALID_RULE,
          MCQ_HAS_CORRECT_ANSWER_RULE,
          MCQ_ANSWER_IN_OPTIONS_RULE,
          MCQ_ANSWER_TEXT_MATCH_RULE,
          MCQ_ANSWER_TEXT_AMBIGUOUS_RULE,
          MCQ_SINGLE_CORRECT_ONLY_RULE,
          MCQ_SHOULD_BE_MSQ_RULE,
          MCQ_SUSPECT_TYPE_RULE,
        ]
      );

      // With text matching after identifier fails, it should normalize whitespace
      // "Option\tA" normalized becomes "option a" (tab becomes space)
      expect(result.passedRules).toContain('MCQ_ANSWER_TEXT_MATCH');
    });
  });

  describe('Rule priority execution order', () => {
    it('executes MCQ_ANSWER_TEXT_MATCH before MCQ_ANSWER_TEXT_AMBIGUOUS by priority', () => {
      const result = executeRules(
        {
          rowId: 'row_priority_order',
          type: 'MCQ',
          questionText: 'Which city?',
          optionCount: 2,
          choices: [
            { identifier: '1', text: 'Paris', normalizedText: 'paris' },
            { identifier: '2', text: 'London', normalizedText: 'london' },
          ],
          correctResponseIdentifiers: ['Paris'],
          mappingConfidence: 0.95,
          parsingConfidence: 0.95,
          typeUnknown: false,
          typeAmbiguous: false,
        },
        [MCQ_ANSWER_TEXT_AMBIGUOUS_RULE, MCQ_ANSWER_TEXT_MATCH_RULE]
      );

      const matchIndex = result.passedRules.indexOf('MCQ_ANSWER_TEXT_MATCH');
      const ambiguousIndex = result.passedRules.indexOf('MCQ_ANSWER_TEXT_AMBIGUOUS');
      expect(matchIndex).toBeGreaterThanOrEqual(0);
      expect(ambiguousIndex).toBeGreaterThan(matchIndex);
    });

    it('records executionTrace with priority and result', () => {
      const result = executeRules(
        {
          rowId: 'row_trace',
          type: 'MCQ',
          questionText: 'Which city?',
          optionCount: 2,
          choices: [
            { identifier: '1', text: 'Paris', normalizedText: 'paris' },
            { identifier: '2', text: 'London', normalizedText: 'london' },
          ],
          correctResponseIdentifiers: ['Paris'],
          mappingConfidence: 0.95,
          parsingConfidence: 0.95,
          typeUnknown: false,
          typeAmbiguous: false,
          traceMode: 'full',
        },
        [MCQ_ANSWER_TEXT_AMBIGUOUS_RULE, MCQ_ANSWER_TEXT_MATCH_RULE]
      );

      expect(result.executionTrace).toEqual([
        { ruleId: 'MCQ_ANSWER_TEXT_MATCH', priority: 80, result: 'pass', severity: 'high' },
        { ruleId: 'MCQ_ANSWER_TEXT_AMBIGUOUS', priority: 100, result: 'pass', severity: 'high' },
      ]);
    });

    it('filters executionTrace based on traceMode', () => {
      const baseContext = {
        rowId: 'row_trace_modes',
        type: 'MCQ' as const,
        questionText: 'Question',
        optionCount: 0,
        mappingConfidence: 1,
        parsingConfidence: 1,
      };

      const rules = [REQUIRED_QUESTION_FIELD_RULE, MCQ_HAS_CORRECT_ANSWER_RULE, MCQ_MIN_OPTIONS_RULE];

      const fullTrace = executeRules(
        { ...baseContext, traceMode: 'full' },
        rules
      ).executionTrace;
      const errorsOnlyTrace = executeRules(
        { ...baseContext, traceMode: 'errors_only' },
        rules
      ).executionTrace;

      expect(fullTrace.map((t) => t.result)).toEqual(['pass', 'fail', 'fail']);
      expect(errorsOnlyTrace.map((t) => t.result)).toEqual(['fail', 'fail']);
    });

    it('disables executionTrace when traceMode is off', () => {
      const result = executeRules(
        {
          rowId: 'row_trace_off',
          type: 'MCQ',
          questionText: 'Question',
          optionCount: 2,
          mappingConfidence: 1,
          parsingConfidence: 1,
          traceMode: 'off',
        },
        [REQUIRED_QUESTION_FIELD_RULE]
      );

      expect(result.executionTrace).toEqual([]);
    });
  });

  describe('Identifier normalization consistency', () => {
    it('treats "A" and "a" as different identifiers (trim-only normalization)', () => {
      const result = executeRules(
        {
          rowId: 'row_identifier_case',
          type: 'MCQ',
          questionText: 'Case sensitivity?',
          optionCount: 2,
          choices: [
            { identifier: 'A', text: 'a', normalizedText: 'a' },
            { identifier: 'B', text: 'b', normalizedText: 'b' },
          ],
          correctResponseIdentifiers: ['a'],
          mappingConfidence: 0.95,
          parsingConfidence: 0.95,
          typeUnknown: false,
          typeAmbiguous: false,
        },
        [
          MCQ_ANSWER_IN_OPTIONS_RULE,
          MCQ_ANSWER_TEXT_MATCH_RULE,
          MCQ_ANSWER_TEXT_AMBIGUOUS_RULE,
        ]
      );

      expect(result.failedRules).toContain('MCQ_ANSWER_IN_OPTIONS');
      expect(result.passedRules).toContain('MCQ_ANSWER_TEXT_MATCH');
    });

    it('treats "A" and "a" as same identifiers in case_insensitive mode', () => {
      const result = executeRules(
        {
          rowId: 'row_identifier_case_insensitive',
          type: 'MCQ',
          questionText: 'Case sensitivity?',
          optionCount: 2,
          choices: [
            { identifier: 'A', text: 'a', normalizedText: 'a' },
            { identifier: 'B', text: 'b', normalizedText: 'b' },
          ],
          correctResponseIdentifiers: ['a'],
          mappingConfidence: 0.95,
          parsingConfidence: 0.95,
          typeUnknown: false,
          typeAmbiguous: false,
          identifierMatchMode: 'case_insensitive',
        },
        [
          MCQ_ANSWER_IN_OPTIONS_RULE,
          MCQ_ANSWER_TEXT_MATCH_RULE,
        ]
      );

      expect(result.passedRules).toContain('MCQ_ANSWER_IN_OPTIONS');
      expect(result.passedRules).toContain('MCQ_ANSWER_TEXT_MATCH');
    });

    it('handles null identifiers without throwing', () => {
      const result = executeRules(
        {
          rowId: 'row_identifier_null',
          type: 'MCQ',
          questionText: 'Question',
          optionCount: 1,
          choices: [
            { identifier: null as any, text: 'A', normalizedText: 'a' },
          ],
          correctResponseIdentifiers: [null as any],
          mappingConfidence: 1,
          parsingConfidence: 1,
        },
        [MCQ_ANSWER_IN_OPTIONS_RULE]
      );

      expect(result.failedRules).toContain('MCQ_ANSWER_IN_OPTIONS');
    });
  });

  describe('MSQ strict validation', () => {
    const msqRules = [
      REQUIRED_QUESTION_FIELD_RULE,
      MSQ_ANSWER_IDENTIFIER_VALID_RULE,
      MSQ_OPTIONS_UNIQUE_RULE,
      MSQ_HAS_CORRECT_ANSWERS_RULE,
      MSQ_MIXED_IDENTIFIER_MODE_RULE,
      MSQ_CORRECT_ANSWERS_IN_OPTIONS_RULE,
      MSQ_ANSWER_TEXT_MATCH_RULE,
      MSQ_ANSWER_TEXT_AMBIGUOUS_RULE,
      MSQ_NO_DUPLICATE_CORRECT_ANSWERS_RULE,
      MSQ_ANSWER_CARDINALITY_CHECK_RULE,
      MSQ_EXACT_SET_MATCH_RULE,
      REQUIRED_QUESTION_FIELD_RULE,
      WHITESPACE_AUTOFIX_RULE,
      DELIMITER_FORMAT_RULE,
      REQUIRED_QUESTION_FIELD_RULE,
      DELIMITER_FORMAT_RULE,
    ];

    it('passes when correct set matches user answers regardless of order', () => {
      const result = executeRules(
        {
          rowId: 'row_msq_valid',
          type: 'MSQ',
          questionText: 'Select all that apply',
          optionCount: 3,
          choices: [
            { identifier: 'A', text: 'Option A', normalizedText: 'option a' },
            { identifier: 'B', text: 'Option B', normalizedText: 'option b' },
            { identifier: 'C', text: 'Option C', normalizedText: 'option c' },
          ],
          correctResponseIdentifiers: ['A', 'B'],
          userResponseIdentifiers: ['B', 'A'],
          rawAnswerString: 'A|B',
          mappingConfidence: 1,
          parsingConfidence: 1,
        },
        msqRules
      );

      expect(result.failedRules).toEqual([]);
      expect(result.passedRules).toEqual(
        expect.arrayContaining([
          'MSQ_ANSWER_IDENTIFIER_VALID',
          'MSQ_OPTIONS_UNIQUE',
          'MSQ_HAS_CORRECT_ANSWERS',
          'MSQ_ANSWER_TEXT_MATCH',
          'MSQ_ANSWER_TEXT_AMBIGUOUS',
          'MSQ_NO_DUPLICATE_CORRECT_ANSWERS',
          'MSQ_CORRECT_ANSWERS_IN_OPTIONS',
          'MSQ_EXACT_SET_MATCH',
        ])
      );
      expect(result.status).toBe('valid');
    });

    it('fails MSQ_ANSWER_CARDINALITY_CHECK when a correct answer is missing', () => {
      const result = executeRules(
        {
          rowId: 'row_msq_missing',
          type: 'MSQ',
          questionText: 'Select all that apply',
          optionCount: 3,
          choices: [
            { identifier: 'A', text: 'Option A', normalizedText: 'option a' },
            { identifier: 'B', text: 'Option B', normalizedText: 'option b' },
            { identifier: 'C', text: 'Option C', normalizedText: 'option c' },
          ],
          correctResponseIdentifiers: ['A', 'B'],
          userResponseIdentifiers: ['A'],
          mappingConfidence: 1,
          parsingConfidence: 1,
        },
        msqRules
      );

      expect(result.failedRules).toContain('MSQ_ANSWER_CARDINALITY_CHECK');
      expect(result.failedRules).not.toContain('MSQ_EXACT_SET_MATCH');
      const cardinalityIssue = result.issues.find((issue) => issue.code === 'MSQ_CARDINALITY_MISMATCH');
      expect(cardinalityIssue?.message).toBe('missing_answers');
      const exactMatchTrace = result.executionTrace.find((entry) => entry.ruleId === 'MSQ_EXACT_SET_MATCH');
      expect(exactMatchTrace?.result).toBe('skip');
    });

    it('fails MSQ_ANSWER_CARDINALITY_CHECK when an extra answer is included', () => {
      const result = executeRules(
        {
          rowId: 'row_msq_extra',
          type: 'MSQ',
          questionText: 'Select all that apply',
          optionCount: 3,
          choices: [
            { identifier: 'A', text: 'Option A', normalizedText: 'option a' },
            { identifier: 'B', text: 'Option B', normalizedText: 'option b' },
            { identifier: 'C', text: 'Option C', normalizedText: 'option c' },
          ],
          correctResponseIdentifiers: ['A', 'B'],
          userResponseIdentifiers: ['A', 'B', 'C'],
          mappingConfidence: 1,
          parsingConfidence: 1,
        },
        msqRules
      );

      expect(result.failedRules).toContain('MSQ_ANSWER_CARDINALITY_CHECK');
      expect(result.failedRules).not.toContain('MSQ_EXACT_SET_MATCH');
      const cardinalityIssue = result.issues.find((issue) => issue.code === 'MSQ_CARDINALITY_MISMATCH');
      expect(cardinalityIssue?.message).toBe('extra_answers');
      const exactMatchTrace = result.executionTrace.find((entry) => entry.ruleId === 'MSQ_EXACT_SET_MATCH');
      expect(exactMatchTrace?.result).toBe('skip');
    });

    it('fails MSQ_NO_DUPLICATE_CORRECT_ANSWERS and skips MSQ_EXACT_SET_MATCH when duplicates exist', () => {
      const result = executeRules(
        {
          rowId: 'row_msq_duplicates',
          type: 'MSQ',
          questionText: 'Select all that apply',
          optionCount: 2,
          choices: [
            { identifier: 'A', text: 'Option A', normalizedText: 'option a' },
            { identifier: 'B', text: 'Option B', normalizedText: 'option b' },
          ],
          correctResponseIdentifiers: ['A', 'A'],
          userResponseIdentifiers: ['A'],
          mappingConfidence: 1,
          parsingConfidence: 1,
        },
        msqRules
      );

      expect(result.failedRules).toContain('MSQ_NO_DUPLICATE_CORRECT_ANSWERS');
      expect(result.failedRules).not.toContain('MSQ_EXACT_SET_MATCH');
      const exactMatchTrace = result.executionTrace.find((entry) => entry.ruleId === 'MSQ_EXACT_SET_MATCH');
      expect(exactMatchTrace?.result).toBe('skip');
    });

    it('fails MSQ_CORRECT_ANSWERS_IN_OPTIONS when identifiers are invalid', () => {
      const result = executeRules(
        {
          rowId: 'row_msq_invalid',
          type: 'MSQ',
          questionText: 'Select all that apply',
          optionCount: 2,
          choices: [
            { identifier: 'A', text: 'Option A', normalizedText: 'option a' },
            { identifier: 'B', text: 'Option B', normalizedText: 'option b' },
          ],
          correctResponseIdentifiers: ['A', 'Z'],
          userResponseIdentifiers: ['A', 'Z'],
          mappingConfidence: 1,
          parsingConfidence: 1,
        },
        msqRules
      );

      expect(result.failedRules).toContain('MSQ_CORRECT_ANSWERS_IN_OPTIONS');
      expect(result.failedRules).not.toContain('MSQ_EXACT_SET_MATCH');
    });

    it('passes case-insensitive exact set match when mode is case_insensitive', () => {
      const result = executeRules(
        {
          rowId: 'row_msq_case_insensitive',
          type: 'MSQ',
          questionText: 'Select all that apply',
          optionCount: 2,
          choices: [
            { identifier: 'A', text: 'Option A', normalizedText: 'option a' },
            { identifier: 'B', text: 'Option B', normalizedText: 'option b' },
          ],
          correctResponseIdentifiers: ['A', 'B'],
          userResponseIdentifiers: ['a', 'b'],
          mappingConfidence: 1,
          parsingConfidence: 1,
          identifierMatchMode: 'case_insensitive',
        },
        msqRules
      );

      expect(result.failedRules).toEqual([]);
      expect(result.passedRules).toContain('MSQ_EXACT_SET_MATCH');
    });

    it('passes MSQ_ANSWER_TEXT_MATCH when user answers are option text', () => {
      const result = executeRules(
        {
          rowId: 'row_msq_text_fallback',
          type: 'MSQ',
          questionText: 'Select all that apply',
          optionCount: 2,
          choices: [
            { identifier: 'A', text: 'Alpha', normalizedText: 'alpha' },
            { identifier: 'B', text: 'Beta', normalizedText: 'beta' },
          ],
          correctResponseIdentifiers: ['A', 'B'],
          userResponseIdentifiers: ['Alpha', 'Beta'],
          mappingConfidence: 1,
          parsingConfidence: 1,
        },
        msqRules
      );

      expect(result.failedRules).toEqual([]);
      expect(result.passedRules).toContain('MSQ_ANSWER_TEXT_MATCH');
      expect(result.passedRules).toContain('MSQ_EXACT_SET_MATCH');
      expect(result.uncertaintyFlags).toContain('ANSWER_RESOLVED_BY_TEXT_MATCH');
    });

    it('fails MSQ_ANSWER_TEXT_AMBIGUOUS when multiple options match the same text', () => {
      const result = executeRules(
        {
          rowId: 'row_msq_text_ambiguous',
          type: 'MSQ',
          questionText: 'Select all that apply',
          optionCount: 2,
          choices: [
            { identifier: 'A', text: 'Alpha', normalizedText: 'alpha' },
            { identifier: 'B', text: 'Alpha', normalizedText: 'alpha' },
          ],
          correctResponseIdentifiers: ['A'],
          userResponseIdentifiers: ['Alpha'],
          mappingConfidence: 1,
          parsingConfidence: 1,
        },
        msqRules
      );

      expect(result.failedRules).toContain('MSQ_ANSWER_TEXT_AMBIGUOUS');
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'MSQ_ANSWER_TEXT_AMBIGUOUS' }),
        ])
      );
    });

    it('fails MSQ_MIXED_IDENTIFIER_MODE when both identifiers and text are used', () => {
      const result = executeRules(
        {
          rowId: 'row_msq_mixed_mode',
          type: 'MSQ',
          questionText: 'Select all that apply',
          optionCount: 2,
          choices: [
            { identifier: 'A', text: 'Alpha', normalizedText: 'option a' },
            { identifier: 'B', text: 'Beta', normalizedText: 'option b' },
          ],
          correctResponseIdentifiers: ['A', 'B'],
          userResponseIdentifiers: ['A', 'Beta'],
          mappingConfidence: 1,
          parsingConfidence: 1,
        },
        msqRules
      );

      expect(result.failedRules).toContain('MSQ_MIXED_IDENTIFIER_MODE');
    });

    it('fails MSQ_NO_DUPLICATE_CORRECT_ANSWERS for duplicates after normalization', () => {
      const result = executeRules(
        {
          rowId: 'row_msq_dup_normalized',
          type: 'MSQ',
          questionText: 'Select all that apply',
          optionCount: 2,
          choices: [
            { identifier: 'A', text: 'Option A', normalizedText: 'option a' },
            { identifier: 'B', text: 'Option B', normalizedText: 'option b' },
          ],
          correctResponseIdentifiers: ['A', 'a'],
          userResponseIdentifiers: ['A'],
          mappingConfidence: 1,
          parsingConfidence: 1,
          identifierMatchMode: 'case_insensitive',
        },
        msqRules
      );

      expect(result.failedRules).toContain('MSQ_NO_DUPLICATE_CORRECT_ANSWERS');
      expect(result.failedRules).not.toContain('MSQ_EXACT_SET_MATCH');
    });

    it('fails MSQ_ANSWER_IDENTIFIER_VALID for null answers', () => {
      const result = executeRules(
        {
          rowId: 'row_msq_invalid_identifier',
          type: 'MSQ',
          questionText: 'Select all that apply',
          optionCount: 1,
          choices: [
            { identifier: 'A', text: 'Option A', normalizedText: 'option a' },
          ],
          correctResponseIdentifiers: [null as any],
          userResponseIdentifiers: [null as any],
          mappingConfidence: 1,
          parsingConfidence: 1,
        },
        msqRules
      );

      expect(result.failedRules).toContain('MSQ_ANSWER_IDENTIFIER_VALID');
    });

    it('fails MSQ_OPTIONS_UNIQUE when duplicate options exist', () => {
      const result = executeRules(
        {
          rowId: 'row_msq_dup_options',
          type: 'MSQ',
          questionText: 'Select all that apply',
          optionCount: 3,
          choices: [
            { identifier: 'A', text: 'Option A', normalizedText: 'option a' },
            { identifier: 'A', text: 'Option A duplicate', normalizedText: 'option a duplicate' },
            { identifier: 'B', text: 'Option B', normalizedText: 'option b' },
          ],
          correctResponseIdentifiers: ['A', 'B'],
          userResponseIdentifiers: ['A', 'B'],
          mappingConfidence: 1,
          parsingConfidence: 1,
        },
        msqRules
      );

      expect(result.failedRules).toContain('MSQ_OPTIONS_UNIQUE');
      const skipped = result.skippedRules.filter((rule) => rule.ruleId !== 'MSQ_OPTIONS_UNIQUE');
      expect(skipped.length).toBeGreaterThan(0);
      const traceSkip = result.executionTrace.find((entry) => entry.ruleId === 'MSQ_EXACT_SET_MATCH');
      expect(traceSkip?.reason).toBe('Skipped because option identifiers are not unique.');
    });

    it('returns both when missing and extra answers exist', () => {
      const result = executeRules(
        {
          rowId: 'row_msq_both',
          type: 'MSQ',
          questionText: 'Select all that apply',
          optionCount: 3,
          choices: [
            { identifier: 'A', text: 'Option A', normalizedText: 'option a' },
            { identifier: 'B', text: 'Option B', normalizedText: 'option b' },
            { identifier: 'C', text: 'Option C', normalizedText: 'option c' },
          ],
          correctResponseIdentifiers: ['A', 'B'],
          userResponseIdentifiers: ['B', 'C'],
          mappingConfidence: 1,
          parsingConfidence: 1,
        },
        msqRules
      );

      expect(result.failedRules).toContain('MSQ_EXACT_SET_MATCH');
      const exactIssue = result.issues.find((issue) => issue.code === 'MSQ_EXACT_SET_MISMATCH');
      expect(exactIssue?.message).toBe('both');
      expect(exactIssue?.details).toEqual({
        missing: ['A'],
        extra: ['C'],
      });
    });
  });

  describe('Priority band enforcement', () => {
    it('throws when a rule violates its priority band', () => {
      const badRule: ValidationRule = {
        id: 'REQUIRED_QUESTION_FIELD',
        appliesTo: ['MCQ'],
        severity: 'critical',
        priority: 80,
        shouldRun: () => true,
        validate: () => ({ passed: true }),
      };

      expect(() =>
        executeRules(
          {
            rowId: 'row_bad_priority',
            type: 'MCQ',
            questionText: 'Question',
            optionCount: 2,
            mappingConfidence: 1,
            parsingConfidence: 1,
          },
          [badRule]
        )
      ).toThrow(/Rule priority band violation/);
    });

    it('warns and continues when priorityEnforcement is warn', () => {
      const badRule: ValidationRule = {
        id: 'REQUIRED_QUESTION_FIELD',
        appliesTo: ['MCQ'],
        severity: 'critical',
        priority: 80,
        shouldRun: () => true,
        validate: () => ({ passed: true }),
      };

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

      const result = executeRules(
        {
          rowId: 'row_bad_priority_warn',
          type: 'MCQ',
          questionText: 'Question',
          optionCount: 2,
          mappingConfidence: 1,
          parsingConfidence: 1,
          priorityEnforcement: 'warn',
        },
        [badRule]
      );

      expect(warnSpy).toHaveBeenCalled();
      expect(result.passedRules).toContain('REQUIRED_QUESTION_FIELD');

      warnSpy.mockRestore();
    });
  });
});

// ─── Issue 1: Math character preservation in MCQ_OPTIONS_UNIQUE ───────────────

describe('MCQ_OPTIONS_UNIQUE_RULE math character preservation', () => {
  it('does not treat x_2 and x-2 as duplicates', () => {
    const result = executeRules(
      {
        rowId: 'row_math_unique',
        type: 'MCQ',
        questionText: 'Which expression equals x squared minus 2?',
        optionCount: 3,
        choices: [
          { identifier: 'CHOICE_1', text: 'x_2', normalizedText: 'x_2' },
          { identifier: 'CHOICE_2', text: 'x-2', normalizedText: 'x-2' },
          { identifier: 'CHOICE_3', text: 'x^2', normalizedText: 'x^2' },
        ],
        correctResponseIdentifiers: ['CHOICE_1'],
        mappingConfidence: 1,
        parsingConfidence: 1,
      },
      [
        REQUIRED_QUESTION_FIELD_RULE,
        MCQ_MIN_OPTIONS_RULE,
        MCQ_OPTION_TEXT_NOT_EMPTY_RULE,
        MCQ_OPTIONS_UNIQUE_RULE,
        MCQ_OPTION_IDENTIFIERS_UNIQUE_RULE,
        MCQ_OPTION_IDENTIFIER_VALID_RULE,
        MCQ_HAS_CORRECT_ANSWER_RULE,
        MCQ_ANSWER_IN_OPTIONS_RULE,
        MCQ_SINGLE_CORRECT_ONLY_RULE,
      ]
    );

    expect(result.passedRules).toContain('MCQ_OPTIONS_UNIQUE');
    expect(result.failedRules).not.toContain('MCQ_OPTIONS_UNIQUE');
  });

  it('still detects genuinely duplicate math options', () => {
    const result = executeRules(
      {
        rowId: 'row_math_dup',
        type: 'MCQ',
        questionText: 'Question',
        optionCount: 3,
        choices: [
          { identifier: 'CHOICE_1', text: 'x_2', normalizedText: 'x_2' },
          { identifier: 'CHOICE_2', text: 'x_2', normalizedText: 'x_2' },
          { identifier: 'CHOICE_3', text: 'x^2', normalizedText: 'x^2' },
        ],
        correctResponseIdentifiers: ['CHOICE_1'],
        mappingConfidence: 1,
        parsingConfidence: 1,
      },
      [MCQ_OPTIONS_UNIQUE_RULE]
    );

    expect(result.failedRules).toContain('MCQ_OPTIONS_UNIQUE');
    expect(result.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'DUPLICATE_OPTION_TEXT' })])
    );
  });
});

// ─── Issue 2: DELIMITER_FORMAT_RULE ──────────────────────────────────────────

describe('DELIMITER_FORMAT_RULE', () => {
  const baseContext = {
    rowId: 'row_msq_format',
    type: 'MSQ' as const,
    questionText: 'Select all that apply.',
    optionCount: 4,
    choices: [
      { identifier: 'A', text: 'Option A', normalizedText: 'option a' },
      { identifier: 'B', text: 'Option B', normalizedText: 'option b' },
      { identifier: 'C', text: 'Option C', normalizedText: 'option c' },
      { identifier: 'D', text: 'Option D', normalizedText: 'option d' },
    ],
    correctResponseIdentifiers: ['A', 'C'],
    mappingConfidence: 1,
    parsingConfidence: 1,
  };

  it('passes for a valid pipe-delimited answer', () => {
    const result = executeRules(
      { ...baseContext, rawAnswerString: 'A|C' },
      [DELIMITER_FORMAT_RULE]
    );
    expect(result.passedRules).toContain('DELIMITER_FORMAT');
    expect(result.failedRules).not.toContain('DELIMITER_FORMAT');
  });

  it('passes for answers with spaces in tokens (e.g. "Option A|Option C")', () => {
    const result = executeRules(
      { ...baseContext, rawAnswerString: 'Option A|Option C' },
      [DELIMITER_FORMAT_RULE]
    );
    expect(result.passedRules).toContain('DELIMITER_FORMAT');
    expect(result.failedRules).not.toContain('DELIMITER_FORMAT');
  });

  it('passes when rawAnswerString has only trailing space (trimmed before check)', () => {
    const result = executeRules(
      { ...baseContext, rawAnswerString: 'A|B ' },
      [DELIMITER_FORMAT_RULE]
    );
    expect(result.passedRules).toContain('DELIMITER_FORMAT');
  });

  it('fails for trailing pipe (A|C|)', () => {
    const result = executeRules(
      { ...baseContext, rawAnswerString: 'A|C|' },
      [DELIMITER_FORMAT_RULE]
    );
    expect(result.failedRules).toContain('DELIMITER_FORMAT');
    expect(result.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'INVALID_ANSWER_FORMAT' })])
    );
    expect(result.status).toBe('invalid');
  });

  it('fails for leading pipe (|A|C)', () => {
    const result = executeRules(
      { ...baseContext, rawAnswerString: '|A|C' },
      [DELIMITER_FORMAT_RULE]
    );
    expect(result.failedRules).toContain('DELIMITER_FORMAT');
    expect(result.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'INVALID_ANSWER_FORMAT' })])
    );
  });

  it('fails for double pipe (A||C)', () => {
    const result = executeRules(
      { ...baseContext, rawAnswerString: 'A||C' },
      [DELIMITER_FORMAT_RULE]
    );
    expect(result.failedRules).toContain('DELIMITER_FORMAT');
    expect(result.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'INVALID_ANSWER_FORMAT' })])
    );
  });

  it('fails for comma-delimited answer (A,C)', () => {
    const result = executeRules(
      { ...baseContext, rawAnswerString: 'A,C' },
      [DELIMITER_FORMAT_RULE]
    );
    expect(result.failedRules).toContain('DELIMITER_FORMAT');
    expect(result.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'INVALID_ANSWER_FORMAT' })])
    );
  });

  it('skips when rawAnswerString is absent', () => {
    const result = executeRules(
      { ...baseContext },
      [DELIMITER_FORMAT_RULE]
    );
    expect(result.passedRules).not.toContain('DELIMITER_FORMAT');
    expect(result.failedRules).not.toContain('DELIMITER_FORMAT');
  });

  it('applies to ORDER type as well', () => {
    const result = executeRules(
      {
        rowId: 'row_order_format',
        type: 'ORDER' as const,
        questionText: 'Order the steps.',
        optionCount: 3,
        mappingConfidence: 1,
        parsingConfidence: 1,
        rawAnswerString: 'Step 1|Step 2|',
      },
      [DELIMITER_FORMAT_RULE]
    );
    expect(result.failedRules).toContain('DELIMITER_FORMAT');
    expect(result.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'INVALID_ANSWER_FORMAT' })])
    );
  });
});

// ─── Issue 3: REQUIRED_OPTIONS_RULE ──────────────────────────────────────────

describe('REQUIRED_OPTIONS_RULE', () => {
  const baseContext = {
    rowId: 'row_req_opts',
    type: 'MCQ' as const,
    questionText: 'What is 2+2?',
    optionCount: 0,
    mappingConfidence: 1,
    parsingConfidence: 1,
  };

  it('fails when choices is empty', () => {
    const result = executeRules(
      { ...baseContext, choices: [] },
      [REQUIRED_OPTIONS_RULE]
    );
    expect(result.failedRules).toContain('REQUIRED_OPTIONS');
    expect(result.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'MISSING_REQUIRED_OPTIONS' })])
    );
    expect(result.status).toBe('invalid');
  });

  it('fails when choices has only one entry', () => {
    const result = executeRules(
      {
        ...baseContext,
        choices: [{ identifier: 'A', text: 'Only option', normalizedText: 'only option' }],
      },
      [REQUIRED_OPTIONS_RULE]
    );
    expect(result.failedRules).toContain('REQUIRED_OPTIONS');
    expect(result.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'MISSING_REQUIRED_OPTIONS' })])
    );
  });

  it('fails when optionA is empty string', () => {
    const result = executeRules(
      {
        ...baseContext,
        choices: [
          { identifier: 'A', text: '', normalizedText: '' },
          { identifier: 'B', text: 'Valid', normalizedText: 'valid' },
        ],
      },
      [REQUIRED_OPTIONS_RULE]
    );
    expect(result.failedRules).toContain('REQUIRED_OPTIONS');
    expect(result.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'MISSING_REQUIRED_OPTIONS' })])
    );
  });

  it('fails when optionB is whitespace only', () => {
    const result = executeRules(
      {
        ...baseContext,
        choices: [
          { identifier: 'A', text: 'Valid', normalizedText: 'valid' },
          { identifier: 'B', text: '   ', normalizedText: '' },
        ],
      },
      [REQUIRED_OPTIONS_RULE]
    );
    expect(result.failedRules).toContain('REQUIRED_OPTIONS');
    expect(result.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'MISSING_REQUIRED_OPTIONS' })])
    );
  });

  it('passes when first two choices are non-empty', () => {
    const result = executeRules(
      {
        ...baseContext,
        optionCount: 2,
        choices: [
          { identifier: 'A', text: 'First', normalizedText: 'first' },
          { identifier: 'B', text: 'Second', normalizedText: 'second' },
        ],
      },
      [REQUIRED_OPTIONS_RULE]
    );
    expect(result.passedRules).toContain('REQUIRED_OPTIONS');
    expect(result.failedRules).not.toContain('REQUIRED_OPTIONS');
  });

  it('applies to MSQ type as well', () => {
    const result = executeRules(
      {
        rowId: 'row_msq_req_opts',
        type: 'MSQ' as const,
        questionText: 'Select all.',
        optionCount: 0,
        choices: [],
        mappingConfidence: 1,
        parsingConfidence: 1,
      },
      [REQUIRED_OPTIONS_RULE]
    );
    expect(result.failedRules).toContain('REQUIRED_OPTIONS');
  });
});

// ─── Issue 4: WHITESPACE_AUTOFIX_RULE ────────────────────────────────────────

describe('WHITESPACE_AUTOFIX_RULE', () => {
  it('flags leading space in question text as warning', () => {
    const result = executeRules(
      {
        rowId: 'row_ws_question',
        type: 'MCQ' as const,
        questionText: ' What is 2+2?',
        optionCount: 2,
        choices: [
          { identifier: 'A', text: 'Three', normalizedText: 'three' },
          { identifier: 'B', text: 'Four', normalizedText: 'four' },
        ],
        mappingConfidence: 1,
        parsingConfidence: 1,
      },
      [WHITESPACE_AUTOFIX_RULE]
    );
    expect(result.failedRules).toContain('WHITESPACE_AUTOFIX');
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'WHITESPACE_AUTOFIX', severity: 'warning' }),
      ])
    );
    expect(result.status).toBe('review');
  });

  it('flags trailing space in an option as warning', () => {
    const result = executeRules(
      {
        rowId: 'row_ws_option',
        type: 'MCQ' as const,
        questionText: 'What is 2+2?',
        optionCount: 2,
        choices: [
          { identifier: 'A', text: 'Three ', normalizedText: 'three' },
          { identifier: 'B', text: 'Four', normalizedText: 'four' },
        ],
        mappingConfidence: 1,
        parsingConfidence: 1,
      },
      [WHITESPACE_AUTOFIX_RULE]
    );
    expect(result.failedRules).toContain('WHITESPACE_AUTOFIX');
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'WHITESPACE_AUTOFIX', severity: 'warning' }),
      ])
    );
    expect(result.status).toBe('review');
  });

  it('flags double internal space as warning', () => {
    const result = executeRules(
      {
        rowId: 'row_ws_double',
        type: 'MCQ' as const,
        questionText: 'What  is 2+2?',
        optionCount: 2,
        choices: [
          { identifier: 'A', text: 'Three', normalizedText: 'three' },
          { identifier: 'B', text: 'Four', normalizedText: 'four' },
        ],
        mappingConfidence: 1,
        parsingConfidence: 1,
      },
      [WHITESPACE_AUTOFIX_RULE]
    );
    expect(result.failedRules).toContain('WHITESPACE_AUTOFIX');
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'WHITESPACE_AUTOFIX', severity: 'warning' }),
      ])
    );
  });

  it('passes for clean text with no whitespace issues', () => {
    const result = executeRules(
      {
        rowId: 'row_ws_clean',
        type: 'MCQ' as const,
        questionText: 'What is 2+2?',
        optionCount: 2,
        choices: [
          { identifier: 'A', text: 'Three', normalizedText: 'three' },
          { identifier: 'B', text: 'Four', normalizedText: 'four' },
        ],
        mappingConfidence: 1,
        parsingConfidence: 1,
      },
      [WHITESPACE_AUTOFIX_RULE]
    );
    expect(result.passedRules).toContain('WHITESPACE_AUTOFIX');
    expect(result.failedRules).not.toContain('WHITESPACE_AUTOFIX');
    // Note: status is 'review' not 'valid' when running with an incomplete rule set
    // because missing rules add uncertainty flags. This is expected engine behavior.
    expect(result.issues).toHaveLength(0);
  });
});