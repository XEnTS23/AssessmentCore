import { describe, expect, it } from 'vitest';
import {
  buildValidationProfile,
  validateAllQuestions,
  type QuestionData,
} from '../questionValidator';
import { detectQuestionColumns } from '../fileParser';

const mapping = {
  questionCol: 'Question',
  answerCol: 'Answer',
  optionCols: ['Option A', 'Option B', 'Option C', 'Option D'],
  typeCol: 'Type',
  toleranceCol: 'Tolerance',
  solutionCol: 'Solution',
  subjectCol: 'Subject',
  topicCol: 'Topic',
  difficultyCol: 'Difficulty',
  orderCol: 'Order Items',
};

function row(data: Record<string, unknown>): QuestionData {
  return { id: String(data.id), ...data } as QuestionData;
}

function toReportRowLikeBatchCreator(
  row: Record<string, unknown>,
  rowIndex: number,
  result: ReturnType<typeof validateAllQuestions>[number],
  questionCol?: string
) {
  const issues = [...result.criticalErrors, ...result.warnings];
  const categories = new Set(result.categories || []);
  const issueLabels: string[] = [];
  if (categories.has('duplicate')) issueLabels.push('Duplicate Questions');
  if (categories.has('export_readiness')) issueLabels.push('Export Readiness');
  if (categories.has('mapping')) issueLabels.push('Mapping Issues');
  if (categories.has('structural') || categories.has('normalization')) issueLabels.push('Structural Issues');
  if (categories.has('content_quality')) issueLabels.push('Content Quality');
  if (issueLabels.length === 0) issueLabels.push('Validation Issues');

  const hasMissingId = (result.issues || []).some((issue) => issue.code === 'MISSING_ID');
  const rawId = row.id == null ? '' : String(row.id).trim();
  const displayQuestionId = hasMissingId ? '(missing)' : (result.sourceItemId && result.sourceItemId.trim() ? result.sourceItemId : (rawId || '-'));

  return {
    rowNumber: result.rowNumber,
    questionId: displayQuestionId,
    decision: result.decision ? result.decision.toUpperCase() : result.status.toUpperCase(),
    questionText: questionCol ? String(row[questionCol] || '') : '',
    categories: Array.from(new Set(issueLabels)).join(', '),
    messages: issues.map((issue) => `${issue.field}: ${issue.message}`).join(' | '),
    rowKey: result.rowId,
    sourceIndex: rowIndex + 1,
  };
}

describe('questionValidator v2 pipeline', () => {
  it('validates a clean single-choice row', () => {
    const rows = [
      row({
        id: 'q1',
        Type: 'mcq',
        Question: 'What is 2 + 2?',
        'Option A': '3',
        'Option B': '4',
        'Option C': '5',
        Answer: 'B',
      }),
    ];

    const result = validateAllQuestions(rows, mapping)[0];
    expect(result.decision).toBe('pass');
    expect(result.status).toBe('valid');
    expect(result.exportReady).toBe(true);
    expect(result.canonicalItem?.correctResponseIdentifiers.length).toBe(1);
  });

  it('normalizes messy recoverable row values', () => {
    const rows = [
      row({
        id: 'q2',
        Type: '  MCQ  ',
        Question: '  Capital of   France?  ',
        'Option A': ' Paris ',
        'Option B': ' London ',
        Answer: ' option a ',
      }),
    ];

    const result = validateAllQuestions(rows, mapping)[0];
    expect(result.status).toBe('valid');
    expect(result.canonicalItem?.stem).toBe('Capital of France?');
    expect(result.canonicalItem?.choices[0].text).toBe('Paris');
  });

  it('supports true/false boolean variants', () => {
    const rows = [
      row({
        id: 'q3',
        Type: 'true_false',
        Question: 'The sky is blue.',
        Answer: 'YES',
      }),
    ];

    const result = validateAllQuestions(rows, mapping)[0];
    expect(result.status).toBe('valid');
    expect(result.canonicalItem?.correctResponseIdentifiers).toEqual(['TRUE']);
  });

  it('supports numeric rows with tolerance in strict profile', () => {
    const rows = [
      row({
        id: 'q4',
        Type: 'numeric',
        Question: 'Value of pi (1 d.p.)',
        Answer: '3.1',
        Tolerance: '0.05',
      }),
    ];

    const profile = buildValidationProfile({ containsMath: 'yes' });
    const result = validateAllQuestions(rows, mapping, profile)[0];
    expect(result.status).toBe('valid');
    expect(result.canonicalItem?.numericAnswer).toBe(3.1);
    expect(result.canonicalItem?.tolerance).toBe(0.05);
  });

  it('keeps tolerance 0 and points 0 as valid values', () => {
    const rows = [
      row({
        id: 'q4b',
        Type: 'numeric',
        Question: 'Zero tolerance case',
        Answer: '10',
        Tolerance: '0',
        Points: 0,
      }),
    ];

    const result = validateAllQuestions(rows, { ...mapping, pointsCol: 'Points' }, buildValidationProfile({ containsMath: 'yes' }))[0];
    expect(result.status).toBe('valid');
    expect(result.canonicalItem?.tolerance).toBe(0);
  });

  it('keeps blank-id row in output and blocks it', () => {
    const rows = [
      row({
        id: '',
        Type: 'mcq',
        Question: 'Blank id row should still be validated',
        'Option A': 'Yes',
        'Option B': 'No',
        Answer: 'A',
      }),
    ];

    const result = validateAllQuestions(rows, mapping);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('rejected');
    expect(result[0].rowKey).toContain('#1');
    expect(result[0].criticalErrors.some((e) => e.field === 'Identifier')).toBe(true);
  });

  it('blocks parser-fallback id rows when explicit id metadata is missing', () => {
    const rows = [
      {
        id: 'row_14',
        __explicitIdMissing: true,
        __sourceIdRaw: '',
        Type: 'mcq',
        Question: 'Parser fallback id case',
        'Option A': 'One',
        'Option B': 'Two',
        Answer: 'One',
      } as unknown as QuestionData,
    ];

    const result = validateAllQuestions(rows, mapping)[0];
    expect(result.status).toBe('rejected');
    expect(result.sourceItemId).toBe('');
    expect(result.issues.some((issue) => issue.code === 'MISSING_ID')).toBe(true);
  });

  it('blocks unknown explicit type', () => {
    const rows = [
      row({
        id: 'q5',
        Type: 'matrix-match-extended',
        Question: 'Unknown type sample',
        Answer: 'A',
      }),
    ];

    const result = validateAllQuestions(rows, mapping)[0];
    expect(result.status).toBe('rejected');
    expect(result.criticalErrors.some((e) => e.message.includes('Unsupported explicit type'))).toBe(true);
  });

  it('blocks unsupported explicit type essay', () => {
    const rows = [
      row({
        id: 'q5b',
        Type: 'essay',
        Question: 'Explain gravity',
        Answer: 'Long text',
      }),
    ];

    const result = validateAllQuestions(rows, mapping)[0];
    expect(result.status).toBe('rejected');
    expect(result.criticalErrors.some((e) => e.message.includes('Unsupported explicit type'))).toBe(true);
  });

  it('blocks duplicate identifiers across batch', () => {
    const rows = [
      row({ id: 'dup1', Type: 'mcq', Question: 'Q1', 'Option A': '1', 'Option B': '2', Answer: 'A' }),
      row({ id: 'dup1', Type: 'mcq', Question: 'Q2', 'Option A': '1', 'Option B': '2', Answer: 'A' }),
    ];

    const results = validateAllQuestions(rows, mapping);
    expect(results[0].status).toBe('rejected');
    expect(results[1].status).toBe('rejected');
    expect(results[0].rowNumber).toBe(1);
    expect(results[1].rowNumber).toBe(2);
    expect(results[0].criticalErrors.some((e) => e.field === 'Identifier')).toBe(true);
  });

  it('blocks answer not present in options', () => {
    const rows = [
      row({
        id: 'q6b',
        Type: 'mcq',
        Question: 'Pick one',
        'Option A': 'Alpha',
        'Option B': 'Beta',
        Answer: 'Gamma',
      }),
    ];

    const result = validateAllQuestions(rows, mapping)[0];
    expect(result.status).toBe('rejected');
    expect(result.criticalErrors.some((e) => e.message.includes('could not be resolved'))).toBe(true);
  });

  it('blocks numeric answer token not present in numeric options for single-choice', () => {
    const rows = [
      row({
        id: 'q6c',
        Type: 'mcq',
        Question: 'Select the right number',
        'Option A': '2',
        'Option B': '4',
        'Option C': '6',
        'Option D': '8',
        Answer: '3',
      }),
    ];

    const result = validateAllQuestions(rows, mapping)[0];
    expect(result.status).toBe('rejected');
    expect(result.criticalErrors.some((e) => e.message.includes('could not be resolved'))).toBe(true);
  });

  it('blocks single-choice rows with multi-answer payload', () => {
    const rows = [
      row({
        id: 'q6',
        Type: 'mcq',
        Question: 'Select one',
        'Option A': 'Alpha',
        'Option B': 'Beta',
        Answer: 'A,B',
      }),
    ];

    const result = validateAllQuestions(rows, mapping)[0];
    expect(result.decision).toBe('block');
    expect(result.criticalErrors.some((e) => e.message.includes('exactly one answer token'))).toBe(true);
  });

  it('blocks multi-select rows with invalid answer tokens', () => {
    const rows = [
      row({
        id: 'q7',
        Type: 'msq',
        Question: 'Select primes',
        'Option A': '2',
        'Option B': '3',
        'Option C': '4',
        Answer: 'A,Z',
      }),
    ];

    const result = validateAllQuestions(rows, mapping)[0];
    expect(result.status).toBe('rejected');
    expect(result.criticalErrors.some((e) => e.message.includes('not a valid option'))).toBe(true);
  });

  it('blocks text-entry rows that include options', () => {
    const rows = [
      row({
        id: 'q7b',
        Type: 'shortanswer',
        Question: 'Name a color',
        'Option A': 'Red',
        Answer: 'Red',
      }),
    ];

    const result = validateAllQuestions(rows, mapping)[0];
    expect(result.status).toBe('rejected');
    expect(result.criticalErrors.some((e) => e.message.includes('should not include options'))).toBe(true);
  });

  it('blocks invalid true/false answer', () => {
    const rows = [
      row({
        id: 'q7c',
        Type: 'true_false',
        Question: 'Earth is flat',
        Answer: 'maybe',
      }),
    ];

    const result = validateAllQuestions(rows, mapping)[0];
    expect(result.status).toBe('rejected');
    expect(result.criticalErrors.some((e) => e.message.includes('True/False answer'))).toBe(true);
  });

  it('blocks invalid order mapping', () => {
    const rows = [
      row({
        id: 'q8',
        Type: 'order',
        Question: 'Arrange in ascending order',
        'Order Items': '1,2,3',
        Answer: '1,2',
      }),
    ];

    const result = validateAllQuestions(rows, mapping)[0];
    expect(result.status).toBe('rejected');
    expect(result.criticalErrors.some((e) => e.message.includes('include each order item exactly once'))).toBe(true);
  });

  it('parses order items with configured delimiter and preserves sequence', () => {
    const rows = [
      row({
        id: 'q8b',
        Type: 'order',
        Question: 'Arrange letters',
        'Order Items': 'A > B > C',
        Answer: '1,2,3',
      }),
    ];

    const result = validateAllQuestions(rows, { ...mapping, orderDelimiter: '>' }, { exportTargets: ['json'] })[0];
    expect(result.canonicalItem?.orderItems).toEqual(['A', 'B', 'C']);
    expect(result.criticalErrors.some((e) => e.message.includes('requires at least two items'))).toBe(false);
  });

  it('parses valid order rows with pipe separators by default', () => {
    const rows = [
      row({
        id: 'q8b_pipe',
        Type: 'order',
        Question: 'Water cycle order',
        'Order Items': 'Evaporation|Condensation|Precipitation|Collection',
        Answer: 'Evaporation|Condensation|Precipitation|Collection',
      }),
    ];

    const result = validateAllQuestions(rows, mapping, { exportTargets: ['json'] })[0];
    expect(result.status).toBe('valid');
    expect(result.canonicalItem?.orderItems).toEqual([
      'Evaporation',
      'Condensation',
      'Precipitation',
      'Collection',
    ]);
  });

  it('preserves order sequence for order answers with pipe separators', () => {
    const rows = [
      row({
        id: 'q8b_pipe_seq',
        Type: 'order',
        Question: 'Arrange planets by distance',
        'Order Items': 'Mercury|Venus|Earth|Mars',
        Answer: 'Mercury|Venus|Earth|Mars',
      }),
    ];

    const result = validateAllQuestions(rows, mapping, { exportTargets: ['json'] })[0];
    expect(result.status).toBe('valid');
    expect(result.canonicalItem?.correctResponseIdentifiers).toEqual([
      'ORDER_1',
      'ORDER_2',
      'ORDER_3',
      'ORDER_4',
    ]);
  });

  it('keeps invalid order rows blocked when answer cannot map to all items', () => {
    const rows = [
      row({
        id: 'q8b_pipe_bad',
        Type: 'order',
        Question: 'Arrange phases',
        'Order Items': 'Solid|Liquid|Gas',
        Answer: 'Solid|Plasma|Gas',
      }),
    ];

    const result = validateAllQuestions(rows, mapping, { exportTargets: ['json'] })[0];
    expect(result.status).toBe('rejected');
    expect(result.criticalErrors.some((e) => e.message.includes('cannot be mapped'))).toBe(true);
  });

  it('parses order items from array payloads using shared delimiter logic', () => {
    const rows = [
      {
        id: 'order_array_1',
        Type: 'order',
        Question: 'Arrange deployment lifecycle',
        'Order Items': ['Plan | Build | Test | Release'],
        Answer: 'Plan | Build | Test | Release',
      } as unknown as QuestionData,
    ];

    const result = validateAllQuestions(rows, mapping, { exportTargets: ['json'] })[0];
    expect(result.status).toBe('valid');
    expect(result.canonicalItem?.orderItems).toEqual(['Plan', 'Build', 'Test', 'Release']);
    expect(result.canonicalItem?.correctResponseIdentifiers).toEqual([
      'ORDER_1',
      'ORDER_2',
      'ORDER_3',
      'ORDER_4',
    ]);
  });

  it('does not split HTML-escaped answer entities during tokenization', () => {
    const rows = [
      row({
        id: 'q8c',
        Type: 'mcq',
        Question: 'Select escaped token',
        'Option A': '&lt;br&gt;',
        'Option B': 'plain',
        Answer: '&lt;br&gt;',
      }),
    ];

    const result = validateAllQuestions(rows, mapping)[0];
    expect(result.status).toBe('valid');
    expect(result.canonicalItem?.answerTokens).toEqual(['&lt;br&gt;']);
  });

  it('resolves case-normalized answer tokens against options for multi-select', () => {
    const rows = [
      row({
        id: 'q8e',
        Type: 'msq',
        Question: 'Select process terms',
        'Option A': 'Photosynthesis',
        'Option B': 'Respiration',
        'Option C': 'Transpiration',
        Answer: 'photosynthesis|RESPIRATION',
      }),
    ];

    const result = validateAllQuestions(rows, mapping, { exportTargets: ['json'] })[0];
    expect(result.status).toBe('valid');
    expect(result.canonicalItem?.correctResponseIdentifiers.length).toBe(2);
  });

  it('blocks ambiguous answer mapping when duplicate option texts exist', () => {
    const rows = [
      row({
        id: 'q8d',
        Type: 'mcq',
        Question: 'Duplicate text ambiguity',
        'Option A': 'Same',
        'Option B': 'Same',
        Answer: 'Same',
      }),
    ];

    const result = validateAllQuestions(rows, mapping)[0];
    expect(result.status).toBe('rejected');
    expect(result.criticalErrors.some((e) => e.message.includes('matches multiple options'))).toBe(true);
  });

  it('flags exact and near duplicates', () => {
    const dupFlagRows = [
      row({ id: 'd1', Type: 'mcq', Question: 'Capital of Spain?', 'Option A': 'Madrid', 'Option B': 'Paris', Answer: 'A' }),
      row({ id: 'd2', Type: 'mcq', Question: 'Capital of Spain?', 'Option A': 'Madrid', 'Option B': 'Paris', Answer: 'A' }),
      row({ id: 'd3', Type: 'mcq', Question: 'Capital of Spain?', 'Option A': 'Madrid', 'Option B': 'Paris', Answer: 'B' }),
    ];

    const dupFlagResults = validateAllQuestions(dupFlagRows, mapping);
    expect(dupFlagResults[0].warnings.some((w) => w.field === 'Duplicate')).toBe(false);
    expect(dupFlagResults[1].warnings.some((w) => w.field === 'Duplicate')).toBe(true);
    expect(dupFlagResults[2].warnings.some((w) => w.field === 'Duplicate')).toBe(true);
  });

  it('keeps exact duplicates classified as exact duplicates', () => {
    const exactDupRows = [
      row({ id: 'q002', Type: 'mcq', Question: '2 + 2 = ?', 'Option A': '3', 'Option B': '4', Answer: 'B' }),
      row({ id: 'q073', Type: 'mcq', Question: '2 + 2 = ?', 'Option A': '3', 'Option B': '4', Answer: 'B' }),
    ];

    const exactDupResults = validateAllQuestions(exactDupRows, mapping);
    expect(exactDupResults[0].issues.some((issue) => issue.code === 'DUPLICATE_EXACT')).toBe(false);
    expect(exactDupResults[1].issues.some((issue) => issue.code === 'DUPLICATE_EXACT')).toBe(true);
  });

  it('marks conflict duplicates when stem/options match but answer model differs', () => {
    const conflictRows = [
      row({ id: 'd4', Type: 'mcq', Question: 'Largest planet?', 'Option A': 'Earth', 'Option B': 'Jupiter', Answer: 'B' }),
      row({ id: 'd5', Type: 'mcq', Question: 'Largest planet?', 'Option A': 'Earth', 'Option B': 'Jupiter', Answer: 'A' }),
    ];

    const conflictResults = validateAllQuestions(conflictRows, mapping);
    expect(conflictResults[0].issues.some((issue) => issue.code === 'DUPLICATE_CONFLICT')).toBe(false);
    expect(conflictResults[1].issues.some((issue) => issue.code === 'DUPLICATE_CONFLICT')).toBe(true);
  });


  it('marks conflict duplicates when only trivial punctuation differs but answer model conflicts', () => {
    const rows = [
      row({ id: 'dup_conflict_fmt_1', Type: 'mcq', Question: 'Largest planet?', 'Option A': 'Earth', 'Option B': 'Jupiter', Answer: 'B' }),
      row({ id: 'dup_conflict_fmt_2', Type: 'mcq', Question: 'Largest planet', 'Option A': 'Earth', 'Option B': 'Jupiter', Answer: 'A' }),
    ];

    const results = validateAllQuestions(rows, mapping);
    expect(results[0].issues.some((issue) => issue.code === 'DUPLICATE_CONFLICT')).toBe(false);
    expect(results[1].issues.some((issue) => issue.code === 'DUPLICATE_CONFLICT')).toBe(true);
  });

  it('keeps order-sensitive duplicates from collapsing when order differs', () => {
    const rows = [
      row({
        id: 'd6',
        Type: 'order',
        Question: 'Arrange release steps',
        'Order Items': 'Build|Test|Deploy',
        Answer: 'Build|Test|Deploy',
      }),
      row({
        id: 'd7',
        Type: 'order',
        Question: 'Arrange release steps',
        'Order Items': 'Build|Deploy|Test',
        Answer: 'Build|Deploy|Test',
      }),
    ];

    const results = validateAllQuestions(rows, mapping, { exportTargets: ['json'] });
    const firstExact = results[0].issues.some((i) => i.code === 'DUPLICATE_EXACT');
    const secondExact = results[1].issues.some((i) => i.code === 'DUPLICATE_EXACT');
    expect(firstExact).toBe(false);
    expect(secondExact).toBe(false);
  });

  it('surfaces exact, near, and conflict duplicate classes in one batch', () => {
    const batchRows = [
      row({ id: 'dup_batch_exact_1', Type: 'mcq', Question: 'Capital of Italy?', 'Option A': 'Rome', 'Option B': 'Milan', 'Option C': 'Venice', Answer: 'A' }),
      row({ id: 'dup_batch_exact_2', Type: 'mcq', Question: 'Capital of Italy?', 'Option A': 'Rome', 'Option B': 'Milan', 'Option C': 'Venice', Answer: 'A' }),
      row({ id: 'dup_batch_near_1', Type: 'mcq', Question: 'Capital of Italy?', 'Option A': 'Rome', 'Option B': 'Milan', 'Option C': 'Florence', Answer: 'A' }),
      row({ id: 'dup_batch_exact_3', Type: 'mcq', Question: '2 + 2 = ?', 'Option A': '3', 'Option B': '4', 'Option C': '5', Answer: 'B' }),
      row({ id: 'dup_batch_exact_4', Type: 'mcq', Question: '2 + 2 = ?', 'Option A': '3', 'Option B': '4', 'Option C': '5', Answer: 'B' }),
      row({ id: 'dup_batch_conflict_1', Type: 'mcq', Question: '2 + 2 = ?', 'Option A': '3', 'Option B': '4', 'Option C': '5', Answer: 'A' }),
    ];

    const batchResults = validateAllQuestions(batchRows, mapping);

    expect(batchResults[0].issues.some((i) => i.code === 'DUPLICATE_EXACT')).toBe(false);
    expect(batchResults[1].issues.some((i) => i.code === 'DUPLICATE_EXACT')).toBe(true);
    expect(batchResults[2].issues.some((i) => i.code === 'DUPLICATE_NEAR')).toBe(true);

    expect(batchResults[3].issues.some((i) => i.code === 'DUPLICATE_EXACT')).toBe(false);
    expect(batchResults[4].issues.some((i) => i.code === 'DUPLICATE_EXACT')).toBe(true);
    expect(batchResults[5].issues.some((i) => i.code === 'DUPLICATE_CONFLICT')).toBe(true);
  });

  it('keeps order exact duplicates exact and sequence variants non-exact', () => {
    const orderRows = [
      row({ id: 'order_exact_1', Type: 'order', Question: 'Arrange release flow', 'Order Items': 'Build|Test|Deploy', Answer: 'Build|Test|Deploy' }),
      row({ id: 'order_exact_2', Type: 'order', Question: 'Arrange release flow', 'Order Items': 'Build|Test|Deploy', Answer: 'Build|Test|Deploy' }),
      row({ id: 'order_sequence_variant_1', Type: 'order', Question: 'Arrange release flow', 'Order Items': 'Build|Deploy|Test', Answer: 'Build|Deploy|Test' }),
    ];

    const orderResults = validateAllQuestions(orderRows, mapping, { exportTargets: ['json'] });

    expect(orderResults[0].issues.some((i) => i.code === 'DUPLICATE_EXACT')).toBe(false);
    expect(orderResults[1].issues.some((i) => i.code === 'DUPLICATE_EXACT')).toBe(true);
    expect(orderResults[2].issues.some((i) => i.code === 'DUPLICATE_EXACT')).toBe(false);
    expect(orderResults[2].issues.some((i) => i.code === 'DUPLICATE_NEAR')).toBe(true);
  });

  it('validates lowercase answer token against normalized options', () => {
    const normRows = [
      row({
        id: 'norm_match_1',
        Type: 'mcq',
        Question: 'Choose the matching symbol',
        'Option A': 'x',
        'Option B': '  u  ',
        'Option C': 'v',
        Answer: 'u',
      }),
    ];

    const normResult = validateAllQuestions(normRows, mapping)[0];
    expect(normResult.status).toBe('valid');
  });

  it('keeps invalid answer token blocked when not in options', () => {
    const rows = [
      row({
        id: 'norm_mismatch_1',
        Type: 'mcq',
        Question: 'Answer mismatch case',
        'Option A': 'p',
        'Option B': 'q',
        'Option C': 'r',
        Answer: 'u',
      }),
    ];

    const result = validateAllQuestions(rows, mapping)[0];
    expect(result.status).toBe('rejected');
    expect(result.criticalErrors.some((e) => e.message.includes('could not be resolved'))).toBe(true);
  });

  it('does not block export-readiness for xml profiles (validation is data-only)', () => {
    const rows = [
      row({
        id: 'q9',
        Type: 'msq',
        Question: 'Select all vowels',
        'Option A': 'A',
        'Option B': 'E',
        'Option C': 'B',
        Answer: 'A,B',
      }),
    ];

    const profile = buildValidationProfile({ outputFormat: 'qti-2.1', exportMode: 'xml-media-folder' });
    const result = validateAllQuestions(rows, mapping, profile)[0];
    expect(result.status).toBe('valid');
    expect(result.criticalErrors.length).toBe(0);
    expect(result.issues.some((issue) => issue.code === 'EXPORTER_TYPE_NOT_SUPPORTED')).toBe(false);
  });

  it('can require mapped metadata fields from profile', () => {
    const rows = [
      row({
        id: 'q10',
        Type: 'mcq',
        Question: 'Metadata required sample',
        'Option A': 'A',
        'Option B': 'B',
        Answer: 'A',
      }),
    ];

    const result = validateAllQuestions(rows, mapping, {
      requiredMetadataFields: ['subjectCol', 'topicCol'],
    })[0];

    expect(result.status).toBe('rejected');
    expect(result.criticalErrors.some((e) => e.field === 'subjectCol')).toBe(true);
    expect(result.criticalErrors.some((e) => e.field === 'topicCol')).toBe(true);
  });

  it('keeps invalid single-choice multi-answer row blocked', () => {
    const rows = [
      row({
        id: 'single_choice_cardinality_1',
        Type: 'mcq',
        Question: 'Invalid cardinality',
        'Option A': 'A',
        'Option B': 'B',
        Answer: 'A|B',
      }),
    ];

    const result = validateAllQuestions(rows, mapping)[0];
    expect(result.status).toBe('rejected');
  });

  it('keeps unsupported explicit type blocked', () => {
    const rows = [
      row({
        id: 'unsupported_type_1',
        Type: 'essay',
        Question: 'Long response question',
        Answer: 'Any',
      }),
    ];

    const result = validateAllQuestions(rows, mapping)[0];
    expect(result.status).toBe('rejected');
  });

  it('keeps ambiguous duplicate-option mapping blocked', () => {
    const rows = [
      row({
        id: 'ambiguous_mapping_1',
        Type: 'mcq',
        Question: 'Ambiguous duplicate option row',
        'Option A': '4',
        'Option B': '4',
        'Option C': '5',
        Answer: '4',
      }),
    ];

    const result = validateAllQuestions(rows, mapping)[0];
    expect(result.status).toBe('rejected');
    expect(result.criticalErrors.some((e) => e.message.includes('matches multiple options'))).toBe(true);
  });
});

describe('questionValidator minimal synthetic regressions', () => {
  it('A1 parses and validates pipe-delimited order items and answer', () => {
    const rows = [
      row({
        id: 'syn_order_valid_1',
        Type: 'order',
        Question: 'Arrange lifecycle',
        'Order Items': 'Plan|Build|Test|Release',
        Answer: 'Plan|Build|Test|Release',
      }),
    ];

    const result = validateAllQuestions(rows, mapping, { exportTargets: ['json'] })[0];
    expect(result.status).toBe('valid');
  });

  it('A2 rejects order rows with too few parsed tokens', () => {
    const rows = [
      row({
        id: 'syn_order_invalid_1',
        Type: 'order',
        Question: 'Arrange lifecycle',
        'Order Items': 'Plan',
        Answer: 'Plan',
      }),
    ];

    const result = validateAllQuestions(rows, mapping, { exportTargets: ['json'] })[0];
    expect(result.status).toBe('rejected');
    expect(result.issues.some((i) => i.code === 'INVALID_ORDER_ITEMS')).toBe(true);
  });

  it('A3 rejects order rows when answer tokens cannot map to order items', () => {
    const rows = [
      row({
        id: 'syn_order_invalid_2',
        Type: 'order',
        Question: 'Arrange lifecycle',
        'Order Items': 'Plan|Build|Test',
        Answer: 'Plan|Ship|Test',
      }),
    ];

    const result = validateAllQuestions(rows, mapping, { exportTargets: ['json'] })[0];
    expect(result.status).toBe('rejected');
    expect(result.issues.some((i) => i.code === 'ORDER_ANSWER_MAPPING_FAILED')).toBe(true);
  });

  it('A4 keeps delimiter-like punctuation inside order token text when mapping remains valid', () => {
    const rows = [
      row({
        id: 'syn_order_valid_2',
        Type: 'order',
        Question: 'Arrange phases',
        'Order Items': 'Research, Design|Build|Test',
        Answer: 'Research, Design|Build|Test',
      }),
    ];

    const result = validateAllQuestions(rows, { ...mapping, orderDelimiter: '|' }, { exportTargets: ['json'] })[0];
    expect(result.status).toBe('valid');
    expect(result.canonicalItem?.orderItems).toEqual(['Research, Design', 'Build', 'Test']);
  });

  it('B1/B2/B3 surfaces exact, near, and conflict duplicates', () => {
    const rows = [
      row({ id: 'syn_dup_exact_1', Type: 'mcq', Question: 'Largest ocean?', 'Option A': 'Pacific', 'Option B': 'Atlantic', 'Option C': 'Indian', Answer: 'A' }),
      row({ id: 'syn_dup_exact_2', Type: 'mcq', Question: 'Largest ocean?', 'Option A': 'Pacific', 'Option B': 'Atlantic', 'Option C': 'Indian', Answer: 'A' }),
      row({ id: 'syn_dup_near_1', Type: 'mcq', Question: 'Largest ocean', 'Option A': 'Pacific', 'Option B': 'Atlantic', 'Option C': 'Arctic', Answer: 'A' }),
      row({ id: 'syn_dup_conflict_1', Type: 'mcq', Question: 'Largest ocean?', 'Option A': 'Pacific', 'Option B': 'Atlantic', 'Option C': 'Indian', Answer: 'B' }),
    ];

    const results = validateAllQuestions(rows, mapping);
    expect(results[0].issues.some((i) => i.code === 'DUPLICATE_EXACT')).toBe(false);
    expect(results[1].issues.some((i) => i.code === 'DUPLICATE_EXACT')).toBe(true);
    expect(results[2].issues.some((i) => i.code === 'DUPLICATE_NEAR')).toBe(true);
    expect(results[3].issues.some((i) => i.code === 'DUPLICATE_CONFLICT')).toBe(true);
  });

  it('B4 keeps order-sensitive sequence variants from being exact duplicates', () => {
    const rows = [
      row({ id: 'syn_order_dup_1', Type: 'order', Question: 'Arrange deployment', 'Order Items': 'Build|Test|Deploy', Answer: 'Build|Test|Deploy' }),
      row({ id: 'syn_order_dup_2', Type: 'order', Question: 'Arrange deployment', 'Order Items': 'Build|Deploy|Test', Answer: 'Build|Deploy|Test' }),
    ];

    const results = validateAllQuestions(rows, mapping, { exportTargets: ['json'] });
    expect(results[0].issues.some((i) => i.code === 'DUPLICATE_EXACT')).toBe(false);
    expect(results[1].issues.some((i) => i.code === 'DUPLICATE_EXACT')).toBe(false);
  });

  it('B5 marks semantic conflicts even when option order differs between rows', () => {
    const rows = [
      row({ id: 'syn_dup_perm_1', Type: 'mcq', Question: 'Select color', 'Option A': 'Red', 'Option B': 'Blue', Answer: 'Red' }),
      row({ id: 'syn_dup_perm_2', Type: 'mcq', Question: 'Select color', 'Option A': 'Blue', 'Option B': 'Red', Answer: 'Blue' }),
    ];

    const results = validateAllQuestions(rows, mapping);
    expect(results[0].issues.some((i) => i.code === 'DUPLICATE_CONFLICT')).toBe(false);
    expect(results[1].issues.some((i) => i.code === 'DUPLICATE_CONFLICT')).toBe(true);
  });

  it('C1/C2/C3 enforces shared normalization while preserving mismatch and ambiguity blocking', () => {
    const rows = [
      row({ id: 'syn_norm_valid_1', Type: 'mcq', Question: 'Pick one', 'Option A': '  Alpha  Beta ', 'Option B': 'Gamma', Answer: 'alpha beta' }),
      row({ id: 'syn_norm_invalid_1', Type: 'mcq', Question: 'Pick one', 'Option A': 'Alpha', 'Option B': 'Beta', Answer: 'Delta' }),
      row({ id: 'syn_norm_ambiguous_1', Type: 'mcq', Question: 'Pick one', 'Option A': 'Same', 'Option B': 'Same', Answer: 'same' }),
    ];

    const results = validateAllQuestions(rows, mapping);
    expect(results[0].status).toBe('valid');
    expect(results[1].issues.some((i) => i.code === 'ANSWER_NOT_IN_OPTIONS')).toBe(true);
    expect(results[2].issues.some((i) => i.code === 'AMBIGUOUS_ANSWER_MAPPING')).toBe(true);
  });

  it('C4 allows literal single-choice answer text containing comma when it exactly matches an option', () => {
    const rows = [
      row({
        id: 'syn_norm_valid_2',
        Type: 'mcq',
        Question: 'Pick location',
        'Option A': 'Paris, France',
        'Option B': 'Berlin, Germany',
        Answer: 'Paris, France',
      }),
    ];

    const result = validateAllQuestions(rows, mapping)[0];
    expect(result.status).toBe('valid');
  });

  it('C5 diagnostic: preserves 5th option and resolves last-option selection', () => {
    const rows = [
      row({
        id: 'syn_option5_diag_1',
        Type: 'msq',
        Question: 'Select terminal option',
        'Option A': 'alpha',
        'Option B': 'beta',
        'Option C': 'gamma',
        'Option D': 'delta',
        'Option E': 'u',
        Answer: 'u',
      }),
    ];

    const detected = detectQuestionColumns(Object.keys(rows[0]));
    const result = validateAllQuestions(rows, detected, { exportTargets: ['json'] })[0];

    const rawOptionColumnsSeen = (detected.optionCols || []).map((col) => ({ col, value: rows[0][col] }));
    const parsedAnswerTokens = result.canonicalItem?.answerTokens || [];
    const normalizedAnswerTokens = parsedAnswerTokens.map((token) => token.toLowerCase().replace(/\s+/g, ' ').trim());

    console.log('[DEBUG:C5] raw_option_columns_seen=', rawOptionColumnsSeen);
    console.log('[DEBUG:C5] canonical_options=', result.canonicalItem?.choices.map((c) => ({ identifier: c.identifier, text: c.text, normalizedText: c.normalizedText })));
    console.log('[DEBUG:C5] parsed_answer_tokens=', parsedAnswerTokens);
    console.log('[DEBUG:C5] normalized_answer_tokens=', normalizedAnswerTokens);
    console.log('[DEBUG:C5] resolved_answer_identifiers=', result.canonicalItem?.correctResponseIdentifiers || []);

    expect((result.canonicalItem?.choices || []).some((choice) => choice.normalizedText === 'u')).toBe(true);
    expect(result.canonicalItem?.correctResponseIdentifiers.length).toBe(1);
    expect(result.status).toBe('valid');
  });

  it('C6 diagnostic: mixed-case last-option selection resolves correctly', () => {
    const rows = [
      row({
        id: 'syn_option5_diag_2',
        Type: 'msq',
        Question: 'Select terminal option mixed case',
        'Option A': 'Alpha',
        'Option B': 'Beta',
        'Option C': 'Gamma',
        'Option D': 'Delta',
        'Option E': 'U',
        Answer: 'u',
      }),
    ];

    const detected = detectQuestionColumns(Object.keys(rows[0]));
    const result = validateAllQuestions(rows, detected, { exportTargets: ['json'] })[0];

    const rawOptionColumnsSeen = (detected.optionCols || []).map((col) => ({ col, value: rows[0][col] }));
    const parsedAnswerTokens = result.canonicalItem?.answerTokens || [];
    const normalizedAnswerTokens = parsedAnswerTokens.map((token) => token.toLowerCase().replace(/\s+/g, ' ').trim());

    console.log('[DEBUG:C6] raw_option_columns_seen=', rawOptionColumnsSeen);
    console.log('[DEBUG:C6] canonical_options=', result.canonicalItem?.choices.map((c) => ({ identifier: c.identifier, text: c.text, normalizedText: c.normalizedText })));
    console.log('[DEBUG:C6] parsed_answer_tokens=', parsedAnswerTokens);
    console.log('[DEBUG:C6] normalized_answer_tokens=', normalizedAnswerTokens);
    console.log('[DEBUG:C6] resolved_answer_identifiers=', result.canonicalItem?.correctResponseIdentifiers || []);

    expect((result.canonicalItem?.choices || []).some((choice) => choice.normalizedText === 'u')).toBe(true);
    expect(result.canonicalItem?.correctResponseIdentifiers.length).toBe(1);
    expect(result.status).toBe('valid');
  });
});

describe('questionValidator production-path diagnostics', () => {
  it('P1 traces one failing order row through ingest->mapping->validation->fingerprint->report path', () => {
    const uploadedRows: Array<Record<string, unknown>> = [
      {
        id: 'prod_order_row_1',
        Type: 'order',
        Question: 'Arrange release stages',
        'Display Order': '',
        'Order Items': 'Plan|Build|Test',
        Answer: 'Plan|Build|Test',
      },
    ];

    const detected = detectQuestionColumns(Object.keys(uploadedRows[0]));
    const results = validateAllQuestions(uploadedRows as unknown as QuestionData[], detected, { exportTargets: ['json'] });
    const result = results[0];
    const canonical = result.canonicalItem;
    const exactFingerprint = canonical
      ? [
          canonical.canonicalType,
          canonical.normalizedStem,
          canonical.choices.map((c) => c.normalizedText).join('||'),
          canonical.orderItems.map((x) => x.toLowerCase().replace(/\s+/g, ' ').trim()).join('||'),
          canonical.correctResponseIdentifiers.join('||'),
          canonical.textEntryMode,
        ].join('::')
      : '';
    const nearConflictFingerprint = canonical
      ? [
          canonical.canonicalType,
          canonical.normalizedStem,
          canonical.choices.map((c) => c.normalizedText).join('||'),
          canonical.orderItems.map((x) => x.toLowerCase().replace(/\s+/g, ' ').trim()).join('||'),
        ].join('::')
      : '';
    const reportRow = toReportRowLikeBatchCreator(uploadedRows[0], 0, result, detected.questionCol);

    console.log('[DEBUG:P1] raw_ingest_row=', uploadedRows[0]);
    console.log('[DEBUG:P1] normalized_before_validation=', result.data);
    console.log('[DEBUG:P1] detected_column_mapping=', detected);
    console.log('[DEBUG:P1] raw_order_value_read=', detected.orderCol ? uploadedRows[0][detected.orderCol] : undefined);
    console.log('[DEBUG:P1] raw_answer_value_read=', detected.answerCol ? uploadedRows[0][detected.answerCol] : undefined);
    console.log('[DEBUG:P1] parsed_order_items=', canonical?.orderItems || []);
    console.log('[DEBUG:P1] parsed_answer_tokens=', canonical?.answerTokens || []);
    console.log('[DEBUG:P1] canonical_order_model=', canonical?.correctResponseIdentifiers || []);
    console.log('[DEBUG:P1] validation_result=', { status: result.status, issues: result.issues.map((i) => i.code) });
    console.log('[DEBUG:P1] duplicate_fingerprint_inputs=', {
      canonicalType: canonical?.canonicalType,
      normalizedStem: canonical?.normalizedStem,
      orderItems: canonical?.orderItems || [],
      answers: canonical?.correctResponseIdentifiers || [],
    });
    console.log('[DEBUG:P1] exact_fingerprint=', exactFingerprint);
    console.log('[DEBUG:P1] near_conflict_fingerprint=', nearConflictFingerprint);
    console.log('[DEBUG:P1] report_layer_row=', reportRow);

    expect(detected.orderCol).toBe('Order Items');
    expect(result.status).toBe('valid');
    expect(canonical?.orderItems).toEqual(['Plan', 'Build', 'Test']);
  });

  it('P2 traces one normalization row through production mapping and report path', () => {
    const uploadedRows: Array<Record<string, unknown>> = [
      {
        id: 'prod_norm_row_1',
        Type: 'mcq',
        Question: 'Choose symbol',
        'Option A': 'x',
        'Option B': 'y',
        'Option C': 'z',
        'Option D': 'w',
        'Option E': '  U  ',
        Answer: 'u',
      },
    ];

    const detected = detectQuestionColumns(Object.keys(uploadedRows[0]));
    const results = validateAllQuestions(uploadedRows as unknown as QuestionData[], detected, { exportTargets: ['json'] });
    const result = results[0];
    const reportRow = toReportRowLikeBatchCreator(uploadedRows[0], 0, result, detected.questionCol);

    const rawOptionCols = (detected.optionCols || []).map((col) => ({ col, raw: uploadedRows[0][col] }));
    const parsedTokens = result.canonicalItem?.answerTokens || [];
    const normalizedTokens = parsedTokens.map((t) => t.toLowerCase().replace(/\s+/g, ' ').trim());

    console.log('[DEBUG:P2] raw_ingest_row=', uploadedRows[0]);
    console.log('[DEBUG:P2] normalized_before_validation=', result.data);
    console.log('[DEBUG:P2] detected_column_mapping=', detected);
    console.log('[DEBUG:P2] raw_option_columns_seen=', rawOptionCols);
    console.log('[DEBUG:P2] canonical_options=', result.canonicalItem?.choices.map((c) => ({ identifier: c.identifier, text: c.text, normalizedText: c.normalizedText })) || []);
    console.log('[DEBUG:P2] raw_answer=', detected.answerCol ? uploadedRows[0][detected.answerCol] : undefined);
    console.log('[DEBUG:P2] parsed_answer_tokens=', parsedTokens);
    console.log('[DEBUG:P2] normalized_answer_tokens=', normalizedTokens);
    console.log('[DEBUG:P2] resolved_identifiers=', result.canonicalItem?.correctResponseIdentifiers || []);
    console.log('[DEBUG:P2] validation_result=', { status: result.status, issues: result.issues.map((i) => i.code) });
    console.log('[DEBUG:P2] report_layer_row=', reportRow);

    expect((result.canonicalItem?.choices || []).some((c) => c.normalizedText === 'u')).toBe(true);
    expect(result.canonicalItem?.correctResponseIdentifiers.length).toBe(1);
    expect(result.status).toBe('valid');
  });

  it('P3 traces one order duplicate group through real mapping and fingerprint inputs', () => {
    const uploadedRows: Array<Record<string, unknown>> = [
      {
        id: 'prod_dup_order_1',
        Type: 'order',
        Question: 'Arrange release flow',
        'Display Order': '',
        'Order Items': 'Build|Test|Deploy',
        Answer: 'Build|Test|Deploy',
      },
      {
        id: 'prod_dup_order_2',
        Type: 'order',
        Question: 'Arrange release flow',
        'Display Order': '',
        'Order Items': 'Build|Deploy|Test',
        Answer: 'Build|Deploy|Test',
      },
    ];

    const detected = detectQuestionColumns(Object.keys(uploadedRows[0]));
    const results = validateAllQuestions(uploadedRows as unknown as QuestionData[], detected, { exportTargets: ['json'] });
    const c1 = results[0].canonicalItem;
    const c2 = results[1].canonicalItem;

    const exactFp1 = c1
      ? [c1.canonicalType, c1.normalizedStem, c1.choices.map((c) => c.normalizedText).join('||'), c1.orderItems.map((x) => x.toLowerCase().replace(/\s+/g, ' ').trim()).join('||'), c1.correctResponseIdentifiers.join('||'), c1.textEntryMode].join('::')
      : '';
    const exactFp2 = c2
      ? [c2.canonicalType, c2.normalizedStem, c2.choices.map((c) => c.normalizedText).join('||'), c2.orderItems.map((x) => x.toLowerCase().replace(/\s+/g, ' ').trim()).join('||'), c2.correctResponseIdentifiers.join('||'), c2.textEntryMode].join('::')
      : '';
    const nearFp1 = c1
      ? [c1.canonicalType, c1.normalizedStem, c1.choices.map((c) => c.normalizedText).join('||'), c1.orderItems.map((x) => x.toLowerCase().replace(/\s+/g, ' ').trim()).join('||')].join('::')
      : '';
    const nearFp2 = c2
      ? [c2.canonicalType, c2.normalizedStem, c2.choices.map((c) => c.normalizedText).join('||'), c2.orderItems.map((x) => x.toLowerCase().replace(/\s+/g, ' ').trim()).join('||')].join('::')
      : '';

    console.log('[DEBUG:P3] raw_row_1=', uploadedRows[0]);
    console.log('[DEBUG:P3] raw_row_2=', uploadedRows[1]);
    console.log('[DEBUG:P3] detected_column_mapping=', detected);
    console.log('[DEBUG:P3] parsed_order_items_row_1=', c1?.orderItems || []);
    console.log('[DEBUG:P3] parsed_order_items_row_2=', c2?.orderItems || []);
    console.log('[DEBUG:P3] exact_fingerprint_row_1=', exactFp1);
    console.log('[DEBUG:P3] exact_fingerprint_row_2=', exactFp2);
    console.log('[DEBUG:P3] near_conflict_fingerprint_row_1=', nearFp1);
    console.log('[DEBUG:P3] near_conflict_fingerprint_row_2=', nearFp2);
    console.log('[DEBUG:P3] classification_row_1=', results[0].issues.map((i) => i.code));
    console.log('[DEBUG:P3] classification_row_2=', results[1].issues.map((i) => i.code));

    expect(results[0].issues.some((i) => i.code === 'DUPLICATE_EXACT')).toBe(false);
    expect(results[1].issues.some((i) => i.code === 'DUPLICATE_EXACT')).toBe(false);
  });
});
