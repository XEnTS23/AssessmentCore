import {
  defaultValidationRules,
  executeRules,
  type Issue as RuleIssue,
  type RuleAppliesTo,
  type ValidationResultV2,
} from './validationRuleEngine.js';

export type ValidationStatus = 'valid' | 'caution' | 'rejected';
export type ErrorLevel = 'critical' | 'warning';

export type ValidationDecision = 'pass' | 'review' | 'block';
export type ValidationCategory =
  | 'normalization'
  | 'structural'
  | 'mapping'
  | 'duplicate'
  | 'content_quality'
  | 'export_readiness';

export type CanonicalQuestionType =
  | 'single_choice'
  | 'multi_select'
  | 'true_false'
  | 'text_entry'
  | 'numeric'
  | 'order'
  | 'unknown';

export interface ValidationError {
  field: string;
  message: string;
  level: ErrorLevel;
}

export interface ValidationIssue {
  code: string;
  category: ValidationCategory;
  field: string;
  message: string;
  severity: 'block' | 'review';
}

export type Issue = ValidationIssue;

export interface TypeResolution {
  type: CanonicalQuestionType;
  detectedType: string;
  confidence: 'high' | 'medium' | 'low' | 'none';
  source: 'explicit' | 'detected' | 'unknown';
  explicitTypeRaw?: string;
}

export interface CanonicalChoice {
  identifier: string;
  displayLabel: string;
  sourceColumn: string;
  text: string;
  normalizedText: string;
}

export interface CanonicalItem {
  rowKey: string;
  sourceRowIndex: number;
  sourceRowId: string;
  canonicalId: string;
  canonicalType: CanonicalQuestionType;
  detectedType: string;
  confidence: TypeResolution['confidence'];
  stem: string;
  normalizedStem: string;
  rawStem: unknown;
  choices: CanonicalChoice[];
  correctResponseIdentifiers: string[];
  answerTokens: string[];
  answerRaw: unknown;
  orderItems: string[];
  tolerance?: number;
  numericAnswer?: number;
  textEntryMode: 'exact' | 'case_insensitive' | 'numeric';
  metadata: Record<string, string>;
  exportTargets: Array<'xml' | 'json'>;
  rawRow: Record<string, unknown>;
  normalizedRow: Record<string, unknown>;
}

export interface ValidationResult {
  rowId: string;
  rowNumber: number;
  rowKey: string;
  sourceItemId?: string;
  status: ValidationStatus;
  decision: ValidationDecision;
  categories: ValidationCategory[];
  data: Record<string, any>;
  rawData: Record<string, unknown>;
  criticalErrors: ValidationError[];
  warnings: ValidationError[];
  issues: ValidationIssue[];
  legacyIssues?: ValidationIssue[];
  ruleIssues?: RuleIssue[];
  detectedType?: string;
  typeConfidence?: TypeResolution['confidence'];
  canonicalItem?: CanonicalItem;
  exportReady: boolean;
  errorCount: number;
  warningCount: number;
  lastValidatedAt: string;
  validationVersion: string;
  validationV2?: ValidationResultV2;
}

export interface QuestionData {
  id: string;
  [key: string]: any;
}

export interface ValidationProfile {
  name: string;
  supportedTypes: CanonicalQuestionType[];
  allowAutoDetectType: boolean;
  requiredMetadataFields: string[];
  duplicatePolicy: 'allow' | 'review' | 'block';
  requireSolution: boolean;
  requireNumericTolerance: boolean;
  allowTwoChoiceSingleChoice: boolean;
  exportTargets: Array<'xml' | 'json'>;
  textEntryMode: 'exact' | 'case_insensitive' | 'numeric' | 'auto';
  strictTypeColumn: boolean;
}

export interface BuildProfileInput {
  outputFormat?: string;
  exportMode?: string;
  hasTemplateXml?: 'yes' | 'no' | '';
  containsMath?: 'yes' | 'no' | '';
  containsImages?: 'yes' | 'no' | '';
}

export interface ValidationEngineInput {
  mappingConfidence?: number;
  parsingConfidence?: number;
}

export interface ValidationEngineOptions {
  defaultConfidence?: ValidationEngineInput;
  rowConfidence?: (input: { row: QuestionData; canonical: CanonicalItem; result: ValidationResult; rowType: TypeResolution }) => ValidationEngineInput;
}

export interface ValidationSummary {
  totalRows: number;
  valid: number;
  invalid: number;
  review: number;
  highUncertainty: number;
}

export interface BatchInsights {
  highFallbackUsage: boolean;
  repeatedErrorTypes: string[];
}

export interface FallbackTypeBreakdown {
  casing_issue: number;
  identifier_missing: number;
  mapping_failure: number;
}

export interface ImpactedIssueSummary {
  code: string;
  count: number;
  severityWeight: number;
  impact: number;
}

export interface ValidationDatasetInsights {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  reviewRows: number;
  percentTextFallback: number;
  percentIdentifierMismatch: number;
  percentMissingAnswers: number;
  fallbackTypes: FallbackTypeBreakdown;
  topIssues: ImpactedIssueSummary[];
  validationSummary: ValidationSummary;
  batchInsights: BatchInsights;
  exampleRows: {
    fallback: string[];
    topIssues: Record<string, string[]>;
  };
}

export interface ValidationDebugRow {
  rowId: string;
  detectedType: string;
  normalizedType: CanonicalQuestionType;
  questionText: string;
  options: string[];
  correctAnswer: {
    raw: string;
    normalized: string[];
  };
  isAnswerInOptions: boolean;
  issues: Array<{ code: string; message: string; severity: ValidationIssue['severity'] }>;
  validationV2: {
    status: ValidationResultV2['status'];
    confidence: number;
    coverage: number;
    passedRules: string[];
    failedRules: string[];
    skippedRules: Array<{ ruleId: string; reason: string; skipType: string }>;
    uncertaintyFlags: string[];
  };
}

export interface ValidationDebugReport {
  rows: ValidationDebugRow[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
  reviewRows: number;
  issueCounts: Record<string, number>;
  topIssues: Array<{ code: string; count: number }>;
  issueCodes: string[];
}

export interface DataQualityMetrics {
  totalRows: number;
  rawValidRows: number;
  adjustedValidRows: number;
  duplicatesCount: number;
  usableAfterCleanupPercentage: number;
  readyForExportPercentage: number;
}

export interface DatasetRecoveryMetrics {
  totalRows: number;
  uniqueRows: number;
  deduplicationGain: number;
  validInUnique: number;
  fixableInUnique: number;
  blockedInUnique: number;
  conservativeRecoverable: number;
  realisticRecoverable: number;
  finalUsablePercent: number;
  immediatelyUsablePercent: number;
  recoveryPotentialPercent: number;
}

const TYPE_ALIASES: Record<string, CanonicalQuestionType> = {
  mcq: 'single_choice',
  singlechoice: 'single_choice',
  single_choice: 'single_choice',
  singleanswer: 'single_choice',
  multiplechoice: 'single_choice',
  choice: 'single_choice',

  msq: 'multi_select',
  multiselect: 'multi_select',
  multiple_select: 'multi_select',
  multipleanswer: 'multi_select',

  truefalse: 'true_false',
  true_false: 'true_false',
  boolean: 'true_false',
  tf: 'true_false',

  shortanswer: 'text_entry',
  short_answer: 'text_entry',
  textentry: 'text_entry',
  text_entry: 'text_entry',
  fib: 'text_entry',
  fillintheblank: 'text_entry',

  numeric: 'numeric',
  numerical: 'numeric',
  number: 'numeric',

  order: 'order',
  ordering: 'order',
  sequence: 'order',
  arrange: 'order',
};

const TF_TRUE = new Set(['true', 't', 'yes', 'y', '1']);
const TF_FALSE = new Set(['false', 'f', 'no', 'n', '0']);

export function createDefaultValidationProfile(): ValidationProfile {
  return {
    name: 'default',
    supportedTypes: ['single_choice', 'multi_select', 'true_false', 'text_entry', 'numeric', 'order'],
    allowAutoDetectType: true,
    requiredMetadataFields: [],
    duplicatePolicy: 'review',
    requireSolution: false,
    requireNumericTolerance: false,
    allowTwoChoiceSingleChoice: true,
    exportTargets: ['xml'],
    textEntryMode: 'auto',
    strictTypeColumn: true,
  };
}

export function buildValidationProfile(input: BuildProfileInput = {}): ValidationProfile {
  const profile = createDefaultValidationProfile();
  profile.name = 'configuration-tab-profile';

  if (input.outputFormat && input.outputFormat.toLowerCase().includes('json')) {
    profile.exportTargets = ['json'];
  }

  if (input.exportMode && input.exportMode.toLowerCase().includes('xml')) {
    profile.exportTargets = ['xml'];
  }

  if (input.hasTemplateXml === 'yes') {
    profile.requireSolution = true;
  }

  if (input.containsMath === 'yes') {
    profile.requireNumericTolerance = true;
  }

  return profile;
}

interface NormalizedRow {
  rowKey: string;
  rowNumber: number;
  sourceRowId: string;
  canonicalId: string;
  rawRow: Record<string, unknown>;
  normalizedRow: Record<string, unknown>;
}

interface StructuralContext {
  duplicateIds: Set<string>;
  idToRows: Map<string, number[]>;
}

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

function normalizeCellValue(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (trimmed === '') return '';
  return trimmed.replace(/\s+/g, ' ');
}

function normalizeData(data: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  Object.entries(data).forEach(([key, value]) => {
    normalized[key] = normalizeCellValue(value);
  });
  return normalized;
}

function toStableString(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function normalizeTypeToken(value: string): string {
  return value.toLowerCase().trim().replace(/[\s_-]+/g, '');
}

function tokenizeWithDelimiterPattern(value: string, delimiterPattern: RegExp): string[] {
  const entities: string[] = [];
  const entitySafe = value.replace(/&(?:#\d+|#x[\da-fA-F]+|[a-zA-Z][a-zA-Z0-9]+);/g, (m) => {
    const token = `__ENTITY_${entities.length}__`;
    entities.push(m);
    return token;
  });

  return entitySafe
    .split(delimiterPattern)
    .map((token) => token.trim())
    .map((token) => token.replace(/__ENTITY_(\d+)__/g, (_, idx) => entities[Number(idx)] || ''))
    .filter((token) => token.length > 0);
}

function tokenize(value: string): string[] {
  return tokenizeWithDelimiterPattern(value, /[\n,;|]+/g);
}

function parseNumber(value: unknown): number | null {
  if (!hasValue(value)) return null;
  const n = Number(String(value).trim());
  return Number.isFinite(n) ? n : null;
}

function normalizeTextFingerprint(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function normalizeChoiceMatchValue(value: string): string {
  return value
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeRow(row: Record<string, unknown>, rowNumber: number): NormalizedRow {
  const explicitInternalRowKey = toStableString(row.__rowKey);
  const sourceRowId = toStableString(row.id) || `row_${rowNumber}`;
  const rowKey = explicitInternalRowKey || `${sourceRowId}#${rowNumber}`;
  const normalizedRow = normalizeData(row);
  const canonicalId = toStableString(normalizedRow.id) || sourceRowId;

  return {
    rowKey,
    rowNumber,
    sourceRowId,
    canonicalId,
    rawRow: { ...row },
    normalizedRow,
  };
}

function getExplicitType(row: NormalizedRow, columnMapping: any): string {
  if (!columnMapping?.typeCol) return '';
  return toStableString(row.normalizedRow[columnMapping.typeCol]);
}

function getOptionValues(row: NormalizedRow, columnMapping: any): Array<{ col: string; text: string }> {
  const optionCols: string[] = Array.isArray(columnMapping?.optionCols) ? columnMapping.optionCols : [];
  const values: Array<{ col: string; text: string }> = [];

  optionCols.forEach((col) => {
    // FIX: Pull directly from rawRow to preserve empty cells and whitespace
    const rawValue = row.rawRow[col];
    const text = rawValue == null ? '' : String(rawValue);
    values.push({ col, text });
  });

  // Remove unused trailing empty options (allows legitimate 2-option MCQ questions to pass)
  while (values.length > 0 && !hasValue(values[values.length - 1].text)) {
    values.pop();
  }

  if (values.length === 1) {
    const singleText = values[0].text;
    if (!singleText.trim()) return values;
    
    const delimiterMatch = singleText.match(/[|;,]/g);
    const hasDelimiter = delimiterMatch && delimiterMatch.length >= 2;

    if (hasDelimiter) {
      const delimiter = delimiterMatch[0];
      const splitTokens = singleText.split(delimiter).map(s => s.trim()).filter(Boolean);
      
      const avgTokenLength = splitTokens.reduce((sum, t) => sum + t.length, 0) / splitTokens.length;
      const uniqueTokens = new Set(splitTokens);

      if (avgTokenLength < 30 && uniqueTokens.size === splitTokens.length) {
        const splitValues: Array<{ col: string; text: string }> = [];
        splitTokens.forEach((token, index) => {
          splitValues.push({
            col: `${values[0].col} part ${index + 1}`,
            text: token,
          });
        });
        return splitValues;
      }
    }
  }

  return values;
}

function detectTypeFromStructure(row: NormalizedRow, columnMapping: any): TypeResolution {
  const explicitRaw = getExplicitType(row, columnMapping);
  if (explicitRaw) {
    const alias = TYPE_ALIASES[normalizeTypeToken(explicitRaw)];
    if (alias) {
      return {
        type: alias,
        detectedType: alias,
        confidence: 'high',
        source: 'explicit',
        explicitTypeRaw: explicitRaw,
      };
    }
    return {
      type: 'unknown',
      detectedType: 'unknown',
      confidence: 'none',
      source: 'explicit',
      explicitTypeRaw: explicitRaw,
    };
  }

  const optionValues = getOptionValues(row, columnMapping).map((v) => normalizeTextFingerprint(v.text));
  const answerText = toStableString(columnMapping?.answerCol ? row.normalizedRow[columnMapping.answerCol] : '');
  let answerTokens = tokenize(answerText);
  
  if (getOptionValues(row, columnMapping).some(opt => normalizeChoiceMatchValue(opt.text) === normalizeChoiceMatchValue(answerText))) {
    answerTokens = [answerText];
  }

  if (columnMapping?.orderCol && hasValue(row.normalizedRow[columnMapping.orderCol])) {
    return { type: 'order', detectedType: 'order', confidence: 'high', source: 'detected' };
  }

  if (optionValues.length >= 2) {
    if (
      optionValues.length === 2 &&
      optionValues.includes('true') &&
      optionValues.includes('false')
    ) {
      return { type: 'true_false', detectedType: 'true_false', confidence: 'high', source: 'detected' };
    }

    if (answerTokens.length > 1) {
      return { type: 'multi_select', detectedType: 'multi_select', confidence: 'medium', source: 'detected' };
    }

    return { type: 'single_choice', detectedType: 'single_choice', confidence: 'medium', source: 'detected' };
  }

  // FIX: If the template maps option columns but the row is completely blank, it's an invalid MCQ, not a Text Entry.
  if (optionValues.length === 0 && Array.isArray(columnMapping?.optionCols) && columnMapping.optionCols.length > 0) {
    return { type: 'unknown', detectedType: 'unknown', confidence: 'none', source: 'detected' };
  }

  const numericCandidate = parseNumber(answerText);
  if (numericCandidate !== null) {
    return { type: 'numeric', detectedType: 'numeric', confidence: 'medium', source: 'detected' };
  }

  return { type: 'text_entry', detectedType: 'text_entry', confidence: 'low', source: 'detected' };
}

function toLegacyDetectedType(type: CanonicalQuestionType): string {
  switch (type) {
    case 'single_choice': return 'mcq';
    case 'multi_select': return 'msq';
    case 'true_false': return 'truefalse';
    case 'text_entry': return 'shortanswer';
    case 'numeric': return 'numeric';
    case 'order': return 'order';
    default: return 'unknown';
  }
}

function toRuleType(type: CanonicalQuestionType): RuleAppliesTo {
  switch (type) {
    case 'single_choice': return 'MCQ';
    case 'multi_select': return 'MSQ';
    case 'order': return 'ORDER';
    case 'true_false': return 'TRUE_FALSE';
    case 'text_entry': return 'TEXT_ENTRY';
    case 'numeric': return 'NUMERIC';
    default: return 'UNKNOWN';
  }
}

function confidenceToNumber(value: TypeResolution['confidence']): number {
  switch (value) {
    case 'high': return 0.95;
    case 'medium': return 0.8;
    case 'low': return 0.6;
    case 'none':
    default: return 0.3;
  }
}

function toRuleIssue(issue: ValidationIssue): RuleIssue {
  return {
    code: issue.code,
    category: issue.category,
    field: issue.field,
    message: issue.message,
    severity: issue.severity as 'block' | 'review',
  };
}

function toValidationIssueFromRuleIssue(issue: RuleIssue): ValidationIssue {
  const category = (issue.category as ValidationCategory) || 'mapping';
  return {
    code: issue.code,
    category,
    field: issue.field,
    message: issue.message,
    severity: issue.severity === 'warning' ? 'review' : issue.severity as 'block' | 'review',
  };
}

function typeIsAmbiguous(typeResolution: TypeResolution): boolean {
  if (typeResolution.type === 'unknown') return true;
  return typeResolution.source === 'detected' && typeResolution.confidence !== 'high';
}

function buildStructuralContext(rows: NormalizedRow[]): StructuralContext {
  const idToRows = new Map<string, number[]>();
  rows.forEach((row) => {
    const key = row.canonicalId;
    if (!key) return;
    if (!idToRows.has(key)) idToRows.set(key, []);
    idToRows.get(key)!.push(row.rowNumber);
  });

  const duplicateIds = new Set<string>();
  idToRows.forEach((indices, id) => {
    if (indices.length > 1) duplicateIds.add(id);
  });

  return { duplicateIds, idToRows };
}

function addIssue(issues: ValidationIssue[], issue: ValidationIssue): void {
  issues.push(issue);
}

function buildChoices(optionValues: Array<{ col: string; text: string }>): CanonicalChoice[] {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return optionValues.map((opt, idx) => ({
    identifier: `CHOICE_${idx + 1}`,
    displayLabel: letters[idx] || String(idx + 1),
    sourceColumn: opt.col,
    text: opt.text,
    normalizedText: normalizeChoiceMatchValue(opt.text),
  }));
}

function getConfiguredOrderDelimiters(columnMapping: any): string[] {
  const configuredDelimiters: string[] = Array.isArray(columnMapping?.orderDelimiters)
    ? columnMapping.orderDelimiters
    : typeof columnMapping?.orderDelimiter === 'string' && columnMapping.orderDelimiter.trim()
      ? [columnMapping.orderDelimiter]
      : [];

  return configuredDelimiters
    .map((d) => String(d || '').trim())
    .filter((d) => d.length > 0);
}

function getOrderDelimiters(columnMapping: any): string[] {
  const configuredDelimiters = getConfiguredOrderDelimiters(columnMapping);

  const delimiters = [',', ';', '|', '\\n', ...configuredDelimiters]
    .map((d) => String(d || '').trim())
    .filter((d) => d.length > 0);

  return Array.from(new Set(delimiters));
}

function buildDelimiterPattern(delimiters: string[]): RegExp {
  const escaped = delimiters
    .map((d) => d === '\\n' ? '\\n' : d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(escaped.join('|'), 'g');
}

function tokenizeOrderValue(value: unknown, columnMapping: any): string[] {
  const raw = toStableString(value);
  if (!raw) return [];

  const configuredDelimiters = getConfiguredOrderDelimiters(columnMapping);
  const configuredPattern = configuredDelimiters.length > 0
    ? buildDelimiterPattern(['\\n', ...configuredDelimiters])
    : null;
  const useConfiguredOnly = configuredPattern ? configuredPattern.test(raw) : false;
  if (configuredPattern) configuredPattern.lastIndex = 0;

  const delimiterPattern = useConfiguredOnly
    ? buildDelimiterPattern(['\\n', ...configuredDelimiters])
    : buildDelimiterPattern(getOrderDelimiters(columnMapping));
  return tokenizeWithDelimiterPattern(raw, delimiterPattern);
}

function parseOrderItems(row: NormalizedRow, columnMapping: any): string[] {
  if (!columnMapping?.orderCol) return [];
  const rawValue = row.normalizedRow[columnMapping.orderCol];

  if (Array.isArray(rawValue)) {
    const items: string[] = [];
    rawValue.forEach((value) => {
      const raw = toStableString(value);
      if (!raw) return;
      const tokenized = tokenizeOrderValue(raw, columnMapping);
      if (tokenized.length > 1) {
        items.push(...tokenized);
      } else {
        items.push(raw);
      }
    });
    return items.filter((x) => x.length > 0);
  }

  const raw = toStableString(rawValue);
  if (!raw) return [];

  if ((raw.startsWith('[') && raw.endsWith(']')) || (raw.startsWith('{') && raw.endsWith('}'))) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .map((x) => toStableString(x))
          .filter((x) => x.length > 0);
      }
    } catch {
      // Fall through to delimiter parsing.
    }
  }

  const tokens = tokenizeOrderValue(raw, columnMapping);
  const avgTokenLength = tokens.reduce((sum, t) => sum + t.length, 0) / tokens.length;
  const uniqueTokens = new Set(tokens);
  
  if (tokens.length >= 2 && avgTokenLength < 30 && uniqueTokens.size === tokens.length) {
    return tokens;
  }
  
  return [raw];
}

function resolveChoiceToken(token: string, choices: CanonicalChoice[]): { id?: string; ambiguous?: boolean } {
  const trimmed = token.trim();
  const upper = trimmed.toUpperCase();
  if (!upper) return {};

  const exactNormalized = normalizeChoiceMatchValue(trimmed);
  const exactMatches = choices.filter((choice) => choice.normalizedText === exactNormalized);
  if (exactMatches.length === 1) return { id: exactMatches[0].identifier };
  if (exactMatches.length > 1) return { ambiguous: true };

  const originalNormalized = normalizeChoiceMatchValue(trimmed);
  if (exactNormalized !== originalNormalized) {
    const originalTextMatches = choices.filter((choice) => choice.normalizedText === originalNormalized);
    if (originalTextMatches.length === 1) return { id: originalTextMatches[0].identifier };
    if (originalTextMatches.length > 1) return { ambiguous: true };
  }

  if (/^[A-Z]$/.test(upper)) {
    const idx = upper.charCodeAt(0) - 65;
    if (idx >= 0 && idx < choices.length) {
      const aliasNormalized = normalizeChoiceMatchValue(choices[idx].text);
      const aliasMatches = choices.filter((choice) => choice.normalizedText === aliasNormalized);
      if (aliasMatches.length === 1) return { id: aliasMatches[0].identifier };
      if (aliasMatches.length > 1) return { ambiguous: true };
    }
  }

  const optionAlias = upper.match(/^(OPTION|CHOICE)\s*([A-Z]|\d+)$/);
  if (optionAlias) {
    return resolveChoiceToken(optionAlias[2], choices);
  }

  if (/^[A-Z]$/.test(upper)) {
    const idx = upper.charCodeAt(0) - 65;
    if (idx >= 0 && idx < choices.length) return { id: choices[idx].identifier };
  }

  return {};
}

function resolveOrderToken(token: string, orderItems: string[]): { id?: string; ambiguous?: boolean } {
  const trimmed = token.trim();
  if (!trimmed) return {};

  const idx = Number(trimmed);
  if (Number.isFinite(idx) && idx >= 1 && idx <= orderItems.length) {
    return { id: `ORDER_${idx}` };
  }

  const upper = trimmed.toUpperCase();
  if (/^[A-Z]$/.test(upper)) {
    const letterIndex = upper.charCodeAt(0) - 65;
    if (letterIndex >= 0 && letterIndex < orderItems.length) {
      return { id: `ORDER_${letterIndex + 1}` };
    }
  }

  const normalizedToken = normalizeChoiceMatchValue(trimmed);
  const matches: number[] = [];
  orderItems.forEach((item, index) => {
    if (normalizeChoiceMatchValue(item) === normalizedToken) {
      matches.push(index);
    }
  });

  if (matches.length > 1) return { ambiguous: true };
  if (matches.length === 1) return { id: `ORDER_${matches[0] + 1}` };
  return {};
}

function validateWithProfile(
  row: NormalizedRow,
  rowType: TypeResolution,
  columnMapping: any,
  context: StructuralContext,
  profile: ValidationProfile
): { issues: ValidationIssue[]; canonical: CanonicalItem } {
  const issues: ValidationIssue[] = [];

  // FIX: Read directly from rawRow to preserve required text characteristics
  const stemRaw = columnMapping?.questionCol ? row.rawRow[columnMapping.questionCol] : '';
  const stem = toStableString(stemRaw);
  
  const answerRaw = columnMapping?.answerCol ? row.rawRow[columnMapping.answerCol] : '';
  const answerText = toStableString(answerRaw);
  
  let answerTokens = tokenize(answerText);
  if (getOptionValues(row, columnMapping).some(opt => normalizeChoiceMatchValue(opt.text) === normalizeChoiceMatchValue(answerText))) {
    answerTokens = [answerText];
  }
  const optionValues = getOptionValues(row, columnMapping);
  const choices = buildChoices(optionValues);
  const orderItems = parseOrderItems(row, columnMapping);
  const tolerance = parseNumber(columnMapping?.toleranceCol ? row.normalizedRow[columnMapping.toleranceCol] : null) ?? undefined;

  const explicitIdMissing =
    row.rawRow.__explicitIdMissing === true ||
    toStableString(row.rawRow.__sourceIdRaw ?? row.rawRow.id) === '';
  if (explicitIdMissing) {
    addIssue(issues, {
      code: 'MISSING_ID',
      category: 'normalization',
      field: 'Identifier',
      message: `Missing explicit identifier. Row is tracked internally as "${row.rowKey}" but export is blocked until id is provided.`,
      severity: 'block',
    });
  }

  if (!stem) {
    addIssue(issues, {
      code: 'MISSING_STEM',
      category: 'structural',
      field: 'Question Stem',
      message: 'Question text is required for export mapping.',
      severity: 'block',
    });
  }

  if (stem.length > 0 && stem.length < 5) {
    addIssue(issues, {
      code: 'SHORT_STEM',
      category: 'content_quality',
      field: 'Question Stem',
      message: 'Question text is very short (minimum 5 characters recommended).',
      severity: 'review',
    });
  }

  if (rowType.source === 'explicit' && rowType.type === 'unknown') {
    addIssue(issues, {
      code: 'UNKNOWN_EXPLICIT_TYPE',
      category: 'structural',
      field: 'Question Type',
      message: `Unsupported explicit type "${rowType.explicitTypeRaw}". Use one of the supported types.`,
      severity: 'block',
    });
  }

  if (rowType.source !== 'explicit' && !profile.allowAutoDetectType) {
    addIssue(issues, {
      code: 'TYPE_REQUIRED',
      category: 'structural',
      field: 'Question Type',
      message: 'Question type is required by configuration. Auto-detection is disabled.',
      severity: 'block',
    });
  }

  if (!profile.supportedTypes.includes(rowType.type) && rowType.type !== 'unknown') {
    addIssue(issues, {
      code: 'TYPE_NOT_SUPPORTED_BY_PROFILE',
      category: 'export_readiness',
      field: 'Question Type',
      message: `Type ${rowType.type} is not enabled in the selected configuration profile.`,
      severity: 'block',
    });
  }

  if (context.duplicateIds.has(row.canonicalId)) {
    const rowsForId = context.idToRows.get(row.canonicalId) || [];
    addIssue(issues, {
      code: 'DUPLICATE_ID',
      category: 'structural',
      field: 'Identifier',
      message: `Duplicate identifier detected (${row.canonicalId}). Appears in row(s): ${rowsForId.join(', ')}.`,
      severity: 'block',
    });
  }

  profile.requiredMetadataFields.forEach((field) => {
    const mappedCol = columnMapping?.[field];
    const value = mappedCol ? row.normalizedRow[mappedCol] : undefined;
    if (!hasValue(value)) {
      addIssue(issues, {
        code: 'MISSING_REQUIRED_METADATA',
        category: 'structural',
        field,
        message: `Required field ${field} is missing for this configuration.`,
        severity: 'block',
      });
    }
  });

  if (profile.requireSolution) {
    const solutionValue = columnMapping?.solutionCol ? row.normalizedRow[columnMapping.solutionCol] : '';
    if (!hasValue(solutionValue)) {
      addIssue(issues, {
        code: 'MISSING_SOLUTION',
        category: 'export_readiness',
        field: 'Solution',
        message: 'Solution/explanation is required by the selected configuration.',
        severity: 'block',
      });
    }
  }

  const correctResponseIdentifiers: string[] = [];

  if (!answerText) {
    addIssue(issues, {
      code: 'MISSING_ANSWER',
      category: 'structural',
      field: 'Correct Answer',
      message: 'Correct answer is missing.',
      severity: 'block',
    });
  }

  switch (rowType.type) {
    case 'single_choice': {
      if (choices.length < 2) {
        addIssue(issues, {
          code: 'INSUFFICIENT_OPTIONS',
          category: 'structural',
          field: 'Options',
          message: `Single-choice requires at least 2 options. Found ${choices.length}.`,
          severity: 'block',
        });
        break;
      }

      if (!profile.allowTwoChoiceSingleChoice && choices.length === 2) {
        addIssue(issues, {
          code: 'TWO_CHOICE_NOT_ALLOWED',
          category: 'export_readiness',
          field: 'Options',
          message: 'Two-option single-choice items are disabled by configuration.',
          severity: 'block',
        });
      }

      if (answerTokens.length !== 1) {
        addIssue(issues, {
          code: 'INVALID_FORMAT',
          category: 'mapping',
          field: 'Correct Answer',
          message: `MCQ requires exactly one answer token. Found ${answerTokens.length} values: "${answerText}".`,
          severity: 'block',
        });
        break;
      }

      const resolved = resolveChoiceToken(answerTokens[0], choices);
      if (resolved.ambiguous) {
        addIssue(issues, {
          code: 'AMBIGUOUS_ANSWER_MAPPING',
          category: 'mapping',
          field: 'Correct Answer',
          message: `Answer "${answerTokens[0]}" matches multiple options. Use label (A/B/1/2) for deterministic mapping.`,
          severity: 'block',
        });
      } else if (!resolved.id) {
        addIssue(issues, {
          code: 'ANSWER_NOT_IN_OPTIONS',
          category: 'mapping',
          field: 'Correct Answer',
          message: `Answer "${answerTokens[0]}" could not be resolved to a valid option.`,
          severity: 'block',
        });
      } else {
        correctResponseIdentifiers.push(resolved.id);
      }
      break;
    }

    case 'multi_select': {
      if (choices.length < 2) {
        addIssue(issues, {
          code: 'INSUFFICIENT_OPTIONS',
          category: 'structural',
          field: 'Options',
          message: `Multi-select requires at least 2 options. Found ${choices.length}.`,
          severity: 'block',
        });
        break;
      }

      if (answerTokens.length < 1) {
        addIssue(issues, {
          code: 'MISSING_MULTI_SELECT_ANSWERS',
          category: 'mapping',
          field: 'Correct Answers',
          message: 'Multi-select requires one or more correct answers.',
          severity: 'block',
        });
      }

      const seen = new Set<string>();
      answerTokens.forEach((token) => {
        const resolved = resolveChoiceToken(token, choices);
        if (resolved.ambiguous) {
          addIssue(issues, {
            code: 'AMBIGUOUS_ANSWER_MAPPING',
            category: 'mapping',
            field: 'Correct Answers',
            message: `Answer token "${token}" is ambiguous across options.`,
            severity: 'block',
          });
          return;
        }
        if (!resolved.id) {
          addIssue(issues, {
            code: 'ANSWER_NOT_IN_OPTIONS',
            category: 'mapping',
            field: 'Correct Answers',
            message: `Answer token "${token}" is not a valid option.`,
            severity: 'block',
          });
          return;
        }
        if (seen.has(resolved.id)) {
          addIssue(issues, {
            code: 'DUPLICATE_ANSWER_TOKEN',
            category: 'mapping',
            field: 'Correct Answers',
            message: `Duplicate answer token resolves to the same option (${token}).`,
            severity: 'review',
          });
          return;
        }
        seen.add(resolved.id);
        correctResponseIdentifiers.push(resolved.id);
      });
      break;
    }

    case 'true_false': {
      const normalized = normalizeTextFingerprint(answerText);
      if (TF_TRUE.has(normalized)) {
        correctResponseIdentifiers.push('TRUE');
      } else if (TF_FALSE.has(normalized)) {
        correctResponseIdentifiers.push('FALSE');
      } else {
        addIssue(issues, {
          code: 'INVALID_TRUE_FALSE_ANSWER',
          category: 'mapping',
          field: 'Correct Answer',
          message: `True/False answer "${answerText}" is invalid. Use true/false (or equivalent variants).`,
          severity: 'block',
        });
      }
      break;
    }

    case 'text_entry': {
      if (!answerText) {
        addIssue(issues, {
          code: 'MISSING_TEXT_ENTRY_ANSWER',
          category: 'mapping',
          field: 'Correct Answer',
          message: 'Text entry requires a non-empty answer.',
          severity: 'block',
        });
      }

      if (choices.length > 0) {
        addIssue(issues, {
          code: 'TEXT_ENTRY_WITH_OPTIONS',
          category: 'structural',
          field: 'Options',
          message: 'Text-entry rows should not include options.',
          severity: 'block',
        });
      }
      break;
    }

    case 'numeric': {
      const numeric = parseNumber(answerText);
      if (numeric === null) {
        addIssue(issues, {
          code: 'INVALID_NUMERIC_ANSWER',
          category: 'mapping',
          field: 'Correct Answer',
          message: `Numeric question requires a parseable number. Found "${answerText}".`,
          severity: 'block',
        });
      }

      if (profile.requireNumericTolerance && tolerance === undefined) {
        addIssue(issues, {
          code: 'MISSING_NUMERIC_TOLERANCE',
          category: 'export_readiness',
          field: 'Tolerance',
          message: 'Numeric tolerance is required by the selected configuration.',
          severity: 'block',
        });
      }
      break;
    }

    case 'order': {
      const orderAnswerTokens = tokenizeOrderValue(answerText, columnMapping);

      if (orderItems.length < 2) {
        addIssue(issues, {
          code: 'INVALID_ORDER_ITEMS',
          category: 'mapping',
          field: 'Order Items',
          message: `Order question requires at least two items. Found ${orderItems.length}.`,
          severity: 'block',
        });
      }

      if (orderAnswerTokens.length < 2) {
        addIssue(issues, {
          code: 'INVALID_ORDER_ANSWER',
          category: 'mapping',
          field: 'Correct Answer',
          message: 'Order question answer must provide a sequence with at least two tokens.',
          severity: 'block',
        });
      } else {
        const resolvedOrder = orderAnswerTokens.map((token) => resolveOrderToken(token, orderItems));

        if (resolvedOrder.some((value) => value.ambiguous)) {
          addIssue(issues, {
            code: 'ORDER_ANSWER_AMBIGUOUS',
            category: 'mapping',
            field: 'Correct Answer',
            message: 'Order answer contains tokens that map to multiple duplicate order items.',
            severity: 'block',
          });
        } else if (resolvedOrder.some((value) => !value.id)) {
          addIssue(issues, {
            code: 'ORDER_ANSWER_MAPPING_FAILED',
            category: 'mapping',
            field: 'Correct Answer',
            message: 'Order answer contains tokens that cannot be mapped to order items.',
            severity: 'block',
          });
        } else {
          const expected = new Set(orderItems.map((_, i) => `ORDER_${i + 1}`));
          const orderedIds = resolvedOrder.map((value) => value.id as string);
          const observed = new Set(orderedIds);
          if (expected.size !== observed.size || orderedIds.length !== orderItems.length) {
            addIssue(issues, {
              code: 'ORDER_SEQUENCE_INCOMPLETE',
              category: 'mapping',
              field: 'Correct Answer',
              message: 'Order answer must include each order item exactly once.',
              severity: 'block',
            });
          }
          correctResponseIdentifiers.push(...orderedIds);
        }
      }
      break;
    }

    case 'unknown':
    default:
      addIssue(issues, {
        code: 'UNKNOWN_TYPE',
        category: 'structural',
        field: 'Question Type',
        message: 'Could not determine a supported question type for this row.',
        severity: 'block',
      });
  }

  const textEntryMode =
    profile.textEntryMode === 'auto'
      ? rowType.type === 'numeric'
        ? 'numeric'
        : 'case_insensitive'
      : profile.textEntryMode;

  const metadata: Record<string, string> = {};
  const metadataFields = ['subjectCol', 'topicCol', 'difficultyCol', 'pointsCol', 'solutionCol'];
  metadataFields.forEach((field) => {
    const colName = columnMapping?.[field];
    if (!colName) return;
    metadata[field] = toStableString(row.normalizedRow[colName]);
  });

  const canonical: CanonicalItem = {
    rowKey: row.rowKey,
    sourceRowIndex: row.rowNumber,
    sourceRowId: row.sourceRowId,
    canonicalId: row.canonicalId,
    canonicalType: rowType.type,
    detectedType: toLegacyDetectedType(rowType.type),
    confidence: rowType.confidence,
    stem,
    normalizedStem: normalizeTextFingerprint(stem),
    rawStem: stemRaw,
    choices,
    correctResponseIdentifiers,
    answerTokens,
    answerRaw,
    orderItems,
    tolerance,
    numericAnswer: parseNumber(answerText) ?? undefined,
    textEntryMode,
    metadata,
    exportTargets: profile.exportTargets,
    rawRow: row.rawRow,
    normalizedRow: row.normalizedRow,
  };

  const shouldValidateAnswerInOptions =
    rowType.type === 'single_choice' ||
    rowType.type === 'multi_select' ||
    rowType.type === 'true_false';

  if (shouldValidateAnswerInOptions && !issues.some((issue) => issue.code === 'ANSWER_NOT_IN_OPTIONS')) {
    const hasChoices = choices.length > 0;
    const hasAnswer = answerText.trim().length > 0;
    let answerInOptions = false;

    if (rowType.type === 'true_false') {
      const normalized = normalizeTextFingerprint(answerText);
      answerInOptions = TF_TRUE.has(normalized) || TF_FALSE.has(normalized);
    } else if (hasChoices && hasAnswer) {
      if (rowType.type === 'single_choice') {
        if (answerTokens.length !== 1) {
          answerInOptions = false;
        } else {
          const resolved = resolveChoiceToken(answerTokens[0], choices);
          answerInOptions = !!resolved.id && !resolved.ambiguous;
        }
      } else {
        answerInOptions = answerTokens.length > 0 && answerTokens.every((token) => {
          const resolved = resolveChoiceToken(token, choices);
          return !!resolved.id && !resolved.ambiguous;
        });
      }
    }

    if (!answerInOptions) {
      addIssue(issues, {
        code: 'ANSWER_NOT_IN_OPTIONS',
        category: 'mapping',
        field: rowType.type === 'multi_select' ? 'Correct Answers' : 'Correct Answer',
        message: 'Correct answer does not match any available option.',
        severity: 'block',
      });
    }
  }

  if (profile.exportTargets.length === 0) {
    addIssue(issues, {
      code: 'NO_EXPORT_TARGET',
      category: 'export_readiness',
      field: 'Configuration',
      message: 'No export target selected in configuration.',
      severity: 'block',
    });
  }

  return { issues, canonical };
}

function stemTokenSet(stem: string): Set<string> {
  const tokens = stem
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/g)
    .map((t) => t.trim())
    .filter((t) => t.length > 1);
  return new Set(tokens);
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  a.forEach((token) => {
    if (b.has(token)) intersection += 1;
  });
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function fingerprintExact(item: CanonicalItem): string {
  const options = item.choices.map((c) => c.normalizedText).join('||');
  const orderItems = item.orderItems.map((x) => normalizeTextFingerprint(x)).join('||');
  const answers = item.correctResponseIdentifiers.join('||');
  return [item.canonicalType, item.normalizedStem, options, orderItems, answers, item.textEntryMode].join('::');
}

function fingerprintConflict(item: CanonicalItem): string {
  const options = item.canonicalType === 'order'
    ? item.choices.map((c) => c.normalizedText).join('||')
    : item.choices.map((c) => c.normalizedText).sort().join('||');
  const orderItems = item.orderItems.map((x) => normalizeTextFingerprint(x)).join('||');
  return [item.canonicalType, item.normalizedStem, options, orderItems].join('::');
}

function fingerprintConflictLoose(item: CanonicalItem): string {
  const options = item.canonicalType === 'order'
    ? item.choices.map((c) => c.normalizedText).join('||')
    : item.choices.map((c) => c.normalizedText).sort().join('||');
  const orderItems = item.orderItems.map((x) => normalizeTextFingerprint(x)).join('||');
  const stemTokens = Array.from(stemTokenSet(item.normalizedStem)).sort().join(' ');
  return [item.canonicalType, stemTokens || item.normalizedStem, options, orderItems].join('::');
}

function semanticAnswerModel(item: CanonicalItem): string {
  const normalizedValues = item.correctResponseIdentifiers.map((identifier) => {
    if (identifier.startsWith('ORDER_')) {
      const orderIndex = Number(identifier.replace('ORDER_', '')) - 1;
      const orderText = item.orderItems[orderIndex] || '';
      return normalizeTextFingerprint(orderText);
    }
    if (identifier.startsWith('CHOICE_')) {
      const choiceIndex = Number(identifier.replace('CHOICE_', '')) - 1;
      const choiceText = item.choices[choiceIndex]?.normalizedText || '';
      return choiceText;
    }
    return normalizeTextFingerprint(identifier);
  });
  return normalizedValues.join('|');
}

function applyDuplicateAnalysis(
  rows: Array<{ result: ValidationResult; canonical: CanonicalItem }>,
  profile: ValidationProfile
): void {
  const exactMap = new Map<string, number[]>();
  const conflictMap = new Map<string, number[]>();
  const conflictLooseMap = new Map<string, number[]>();

  rows.forEach((entry, index) => {
    const key = fingerprintExact(entry.canonical);
    if (!exactMap.has(key)) exactMap.set(key, []);
    exactMap.get(key)!.push(index);

    const conflictKey = fingerprintConflict(entry.canonical);
    if (!conflictMap.has(conflictKey)) conflictMap.set(conflictKey, []);
    conflictMap.get(conflictKey)!.push(index);

    const conflictLooseKey = fingerprintConflictLoose(entry.canonical);
    if (!conflictLooseMap.has(conflictLooseKey)) conflictLooseMap.set(conflictLooseKey, []);
    conflictLooseMap.get(conflictLooseKey)!.push(index);
  });

  exactMap.forEach((indices) => {
    if (indices.length < 2) return;
    const sortedIndices = [...indices].sort((a, b) => rows[a].result.rowNumber - rows[b].result.rowNumber);
    const originalRowNumber = rows[sortedIndices[0]].result.rowNumber;

    for (let i = 1; i < sortedIndices.length; i++) {
      const row = rows[sortedIndices[i]];
      if (row.result.issues.some(iss => iss.category === 'duplicate')) continue;

      row.result.issues.push({
        code: 'DUPLICATE_EXACT',
        category: 'duplicate',
        field: 'Duplicate',
        message: `Exact duplicate detected. Original row: ${originalRowNumber}.`,
        severity: profile.duplicatePolicy === 'block' ? 'block' : profile.duplicatePolicy === 'review' ? 'review' : 'review',
      });
    }
  });

  conflictMap.forEach((indices) => {
    if (indices.length < 2) return;

    const answerModels = new Set(
      indices.map((idx) => semanticAnswerModel(rows[idx].canonical))
    );
    if (answerModels.size <= 1) return;

    const sortedIndices = [...indices].sort((a, b) => rows[a].result.rowNumber - rows[b].result.rowNumber);
    const originalRowNumber = rows[sortedIndices[0]].result.rowNumber;

    for (let i = 1; i < sortedIndices.length; i++) {
      const row = rows[sortedIndices[i]];
      if (row.result.issues.some(iss => iss.category === 'duplicate')) continue;

      row.result.issues.push({
        code: 'DUPLICATE_CONFLICT',
        category: 'duplicate',
        field: 'Duplicate',
        message: `Conflict duplicate detected (same/similar item model but different answer model). Original row: ${originalRowNumber}.`,
        severity: 'review',
      });
    }
  });

  conflictLooseMap.forEach((indices) => {
    if (indices.length < 2) return;

    const exactConflictBuckets = new Set(indices.map((idx) => fingerprintConflict(rows[idx].canonical)));
    if (exactConflictBuckets.size <= 1) return;

    const answerModels = new Set(
      indices.map((idx) => semanticAnswerModel(rows[idx].canonical))
    );
    if (answerModels.size <= 1) return;

    const sortedIndices = [...indices].sort((a, b) => rows[a].result.rowNumber - rows[b].result.rowNumber);
    const originalRowNumber = rows[sortedIndices[0]].result.rowNumber;

    for (let i = 1; i < sortedIndices.length; i++) {
      const row = rows[sortedIndices[i]];
      if (row.result.issues.some(iss => iss.category === 'duplicate')) continue;

      row.result.issues.push({
        code: 'DUPLICATE_CONFLICT',
        category: 'duplicate',
        field: 'Duplicate',
        message: `Conflict duplicate detected (same/similar item model but different answer model). Original row: ${originalRowNumber}.`,
        severity: 'review',
      });
    }
  });

  const buckets = new Map<string, number[]>();
  rows.forEach((entry, index) => {
    const stemSignature = Array.from(stemTokenSet(entry.canonical.normalizedStem))
      .sort()
      .slice(0, 10)
      .join('|');
    const bucketKey = `${entry.canonical.canonicalType}:${stemSignature || entry.canonical.normalizedStem}`;
    if (!buckets.has(bucketKey)) buckets.set(bucketKey, []);
    buckets.get(bucketKey)!.push(index);
  });

  buckets.forEach((indices) => {
    if (indices.length < 2) return;
    for (let i = 0; i < indices.length; i += 1) {
      for (let j = i + 1; j < indices.length; j += 1) {
        const left = rows[indices[i]];
        const right = rows[indices[j]];

        const similarity = jaccardSimilarity(
          stemTokenSet(left.canonical.normalizedStem),
          stemTokenSet(right.canonical.normalizedStem)
        );

        if (left.canonical.canonicalType !== right.canonical.canonicalType) {
          continue;
        }

        const leftModel = left.canonical.canonicalType === 'order'
          ? new Set(left.canonical.orderItems.map((item) => normalizeTextFingerprint(item)))
          : new Set(left.canonical.choices.map((choice) => choice.normalizedText));
        const rightModel = right.canonical.canonicalType === 'order'
          ? new Set(right.canonical.orderItems.map((item) => normalizeTextFingerprint(item)))
          : new Set(right.canonical.choices.map((choice) => choice.normalizedText));
        const modelSimilarity = jaccardSimilarity(leftModel, rightModel);

        const sameConflictModel = fingerprintConflict(left.canonical) === fingerprintConflict(right.canonical);
        const sameAnswerModel = semanticAnswerModel(left.canonical) === semanticAnswerModel(right.canonical);

        if (sameConflictModel) {
          continue;
        }

        if (similarity >= 0.92 && modelSimilarity >= 0.5 && !sameAnswerModel) {
          left.result.issues.push({
            code: 'DUPLICATE_NEAR',
            category: 'duplicate',
            field: 'Duplicate',
            message: `Near duplicate with row ${right.result.rowNumber} (similar stem, different answer model).`,
            severity: 'review',
          });
          right.result.issues.push({
            code: 'DUPLICATE_NEAR',
            category: 'duplicate',
            field: 'Duplicate',
            message: `Near duplicate with row ${left.result.rowNumber} (similar stem, different answer model).`,
            severity: 'review',
          });
        } else if (similarity >= 0.92 && modelSimilarity >= 0.5) {
          left.result.issues.push({
            code: 'DUPLICATE_NEAR',
            category: 'duplicate',
            field: 'Duplicate',
            message: `Near duplicate with row ${right.result.rowNumber} (similar stem/item model).`,
            severity: 'review',
          });
          right.result.issues.push({
            code: 'DUPLICATE_NEAR',
            category: 'duplicate',
            field: 'Duplicate',
            message: `Near duplicate with row ${left.result.rowNumber} (similar stem/item model).`,
            severity: 'review',
          });
        } else if (similarity >= 0.85 && similarity < 0.92 && modelSimilarity >= 0.5) {
          left.result.issues.push({
            code: 'DUPLICATE_SUSPICIOUS',
            category: 'duplicate',
            field: 'Duplicate',
            message: `Suspiciously similar stem to row ${right.result.rowNumber}.`,
            severity: 'review',
          });
          right.result.issues.push({
            code: 'DUPLICATE_SUSPICIOUS',
            category: 'duplicate',
            field: 'Duplicate',
            message: `Suspiciously similar stem to row ${left.result.rowNumber}.`,
            severity: 'review',
          });
        }
      }
    }
  });
}

function finalizeLegacyShape(result: ValidationResult): ValidationResult {
  const blockIssues = result.issues.filter((i) => i.severity === 'block');
  const reviewIssues = result.issues.filter((i) => i.severity === 'review');

  result.decision = blockIssues.length > 0 ? 'block' : reviewIssues.length > 0 ? 'review' : 'pass';

  result.status =
    result.decision === 'block'
      ? 'rejected'
      : result.decision === 'review'
        ? 'caution'
        : 'valid';

  result.categories = Array.from(new Set(result.issues.map((i) => i.category)));
  result.exportReady = result.decision !== 'block';

  result.criticalErrors = blockIssues.map((issue) => ({
    field: issue.field,
    message: issue.message,
    level: 'critical',
  }));

  result.warnings = reviewIssues.map((issue) => ({
    field: issue.field,
    message: issue.message,
    level: 'warning',
  }));

  result.errorCount = result.criticalErrors.length;
  result.warningCount = result.warnings.length;

  return result;
}

function validateRowsCore(
  rows: QuestionData[],
  columnMapping: any,
  profileInput?: Partial<ValidationProfile>,
  engineOptions?: ValidationEngineOptions
): ValidationResult[] {
  return validateRowsCoreInternal(rows, columnMapping, profileInput, engineOptions, null);
}

function normalizeAnswerTokens(tokens: string[]): string[] {
  return tokens.map((token) => normalizeChoiceMatchValue(token));
}

function validateRowsCoreWithInsights(
  rows: QuestionData[],
  columnMapping: any,
  profileInput?: Partial<ValidationProfile>,
  engineOptions?: ValidationEngineOptions
): { results: ValidationResult[]; insights: ValidationDatasetInsights } {
  if (!rows || rows.length === 0) {
    return { results: [], insights: buildValidationDatasetInsights([]) };
  }

  const accumulator = createInsightsAccumulator(rows.length);
  const results = validateRowsCoreInternal(
    rows,
    columnMapping,
    profileInput,
    engineOptions,
    accumulator
  );
  const insights = finalizeDatasetInsights(accumulator);
  return { results, insights };
}

function validateRowsCoreInternal(
  rows: QuestionData[],
  columnMapping: any,
  profileInput: Partial<ValidationProfile> | undefined,
  engineOptions: ValidationEngineOptions | undefined,
  accumulator: DatasetInsightsAccumulator | null
): ValidationResult[] {
  if (!rows || rows.length === 0) return [];

  const profile: ValidationProfile = {
    ...createDefaultValidationProfile(),
    ...(profileInput || {}),
  };

  const normalizedRows = rows.map((row, idx) => normalizeRow((row || {}) as Record<string, unknown>, idx + 1));
  const context = buildStructuralContext(normalizedRows);

  const resultsWithCanonical: Array<{
    row: NormalizedRow;
    rowType: TypeResolution;
    result: ValidationResult;
    canonical: CanonicalItem;
  }> = normalizedRows.map((row) => {
    const typeResolution = detectTypeFromStructure(row, columnMapping);
    const { issues, canonical } = validateWithProfile(row, typeResolution, columnMapping, context, profile);

    const result: ValidationResult = {
      rowId: row.rowKey,
      rowNumber: row.rowNumber,
      rowKey: row.rowKey,
      sourceItemId: toStableString(row.rawRow.__sourceIdRaw),
      status: 'valid',
      decision: 'pass',
      categories: [],
      data: row.normalizedRow,
      rawData: row.rawRow,
      criticalErrors: [],
      warnings: [],
      issues,
      detectedType: toLegacyDetectedType(typeResolution.type),
      typeConfidence: typeResolution.confidence,
      canonicalItem: canonical,
      exportReady: true,
      errorCount: 0,
      warningCount: 0,
      lastValidatedAt: new Date().toISOString(),
      validationVersion: '2.0',
    };

    return { row, rowType: typeResolution, result, canonical };
  });

  applyDuplicateAnalysis(resultsWithCanonical, profile);

  resultsWithCanonical.forEach((entry) => {
    const inferredConfidence = confidenceToNumber(entry.rowType.confidence);
    const rowConfidence = engineOptions?.rowConfidence?.({
      row: entry.row.rawRow as QuestionData,
      canonical: entry.canonical,
      result: entry.result,
      rowType: entry.rowType,
    });

    const mappingConfidence =
      rowConfidence?.mappingConfidence ??
      engineOptions?.defaultConfidence?.mappingConfidence ??
      inferredConfidence;
    const parsingConfidence =
      rowConfidence?.parsingConfidence ??
      engineOptions?.defaultConfidence?.parsingConfidence ??
      inferredConfidence;

    const legacyIssues = [...entry.result.issues];
    entry.result.legacyIssues = legacyIssues;

    const typeUnknown = entry.rowType.type === 'unknown';

    // FIX: Removed the typeUnknown bypass. The engine now correctly handles 'UNKNOWN' types natively.
    
    const ruleResult = executeRules(
      {
        rowId: entry.result.rowId,
        type: toRuleType(entry.rowType.type),
        rawType: entry.result.detectedType,
        // FIX: Provide raw un-trimmed stem so WHITESPACE_AUTOFIX can detect spaces
        questionText: typeof entry.canonical.rawStem === 'string' ? entry.canonical.rawStem : String(entry.canonical.rawStem ?? ''),
        optionCount: entry.canonical.choices.length,
        choices: entry.canonical.choices.map((choice) => ({
          identifier: choice.identifier,
          text: choice.text, // This is now raw un-trimmed text from getOptionValues
          normalizedText: choice.normalizedText,
        })),
        correctResponseIdentifiers: entry.canonical.correctResponseIdentifiers,
        userResponseIdentifiers: entry.canonical.answerTokens,
        // FIX: Provide actual raw answer string for DELIMITER_FORMAT_RULE
        rawAnswerString: typeof entry.canonical.answerRaw === 'string' ? entry.canonical.answerRaw : String(entry.canonical.answerRaw ?? ''),
        mappingConfidence,
        parsingConfidence,
        typeUnknown,
        typeAmbiguous: typeIsAmbiguous(entry.rowType),
      },
      defaultValidationRules
    );

    const ruleIssues = ruleResult.issues;
    entry.result.ruleIssues = ruleIssues;
    entry.result.validationV2 = ruleResult;

    const mergedRuleIssuesAsLegacyShape = ruleIssues.map(toValidationIssueFromRuleIssue);
    const legacyCodes = new Set(legacyIssues.map((i) => i.code));
    const ruleCodes = new Set(mergedRuleIssuesAsLegacyShape.map((i) => i.code));
    const dedupedLegacy = legacyIssues.filter((i) => !ruleCodes.has(i.code));
    entry.result.issues = [...dedupedLegacy, ...mergedRuleIssuesAsLegacyShape];

    const hasBlockIssue = entry.result.issues.some((issue) => issue.severity === 'block');
    const hasNonBlockIssue = entry.result.issues.some((issue) => issue.severity !== 'block');
    if (typeUnknown) {
      ruleResult.status = 'unknown';
    } else if (hasBlockIssue) {
      ruleResult.status = 'invalid';
    } else if ((ruleResult.uncertaintyFlags || []).length > 0 || hasNonBlockIssue) {
      ruleResult.status = 'review';
    } else {
      ruleResult.status = 'valid';
    }

    if (accumulator) {
      recordDatasetInsight(accumulator, entry.result);
    }
  });

  return resultsWithCanonical.map((entry) => finalizeLegacyShape(entry.result));
}

export function validateAllQuestions(
  rows: QuestionData[],
  columnMapping: any,
  profileInput?: Partial<ValidationProfile>,
  engineOptions?: ValidationEngineOptions
): ValidationResult[] {
  return validateRowsCoreInternal(rows, columnMapping, profileInput, engineOptions, null);
}

export function validateAllQuestionsWithInsights(
  rows: QuestionData[],
  columnMapping: any,
  profileInput?: Partial<ValidationProfile>,
  engineOptions?: ValidationEngineOptions
): { results: ValidationResult[]; insights: ValidationDatasetInsights } {
  return validateRowsCoreWithInsights(rows, columnMapping, profileInput, engineOptions);
}

export function validateSingleRow(
  row: QuestionData,
  rowNumber: number,
  columnMapping: any,
  profileInput?: Partial<ValidationProfile>,
  engineOptions?: ValidationEngineOptions
): ValidationResult {
  const rows = validateRowsCoreInternal([row], columnMapping, profileInput, engineOptions, null);
  if (rows.length === 0) {
    return {
      rowId: toStableString(row?.id) || `row_${rowNumber}`,
      rowNumber,
      rowKey: `${toStableString(row?.id) || `row_${rowNumber}`}#${rowNumber}`,
      sourceItemId: '',
      status: 'rejected',
      decision: 'block',
      categories: ['structural'],
      data: row || {},
      rawData: row || {},
      criticalErrors: [{ field: 'Row', message: 'Row is empty', level: 'critical' }],
      warnings: [],
      issues: [{ code: 'ROW_EMPTY', category: 'structural', field: 'Row', message: 'Row is empty', severity: 'block' }],
      detectedType: 'unknown',
      typeConfidence: 'none',
      exportReady: false,
      errorCount: 1,
      warningCount: 0,
      lastValidatedAt: new Date().toISOString(),
      validationVersion: '2.0',
    };
  }

  const first = rows[0];
  first.rowNumber = rowNumber;
  return first;
}

function normalizePercent(count: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((count / total) * 1000) / 10;
}

function severityWeightForIssue(severity: ValidationIssue['severity']): number {
  return severity === 'block' ? 3 : 1;
}

function mapLegacyStatus(result: ValidationResult): ValidationResultV2['status'] {
  if (result.status === 'valid') return 'valid';
  if (result.status === 'rejected') return 'invalid';
  return 'review';
}

function normalizeStatus(status: ValidationResultV2['status']): 'valid' | 'invalid' | 'review' {
  if (status === 'valid') return 'valid';
  if (status === 'invalid') return 'invalid';
  return 'review';
}

function extractIssueCodes(result: ValidationResult): Set<string> {
  const codes = new Set<string>();
  result.issues.forEach((issue) => codes.add(issue.code));
  return codes;
}

function hasMissingAnswers(issueCodes: Set<string>, issues: ValidationIssue[], ruleIssues?: RuleIssue[]): boolean {
  if (issueCodes.has('MISSING_CORRECT_ANSWER') || issueCodes.has('MISSING_CORRECT_ANSWERS')) {
    return true;
  }
  if (issueCodes.has('MISSING_ANSWER') || issueCodes.has('MISSING_MULTI_SELECT_ANSWERS')) {
    return true;
  }

  const allIssues = [
    ...(ruleIssues || []).map((issue) => ({
      code: issue.code,
      message: issue.message,
    })),
    ...issues.map((issue) => ({
      code: issue.code,
      message: issue.message,
    })),
  ];

  return allIssues.some((issue) => {
    if (issue.code === 'MSQ_CARDINALITY_MISMATCH' || issue.code === 'MSQ_EXACT_SET_MISMATCH') {
      return issue.message === 'missing_answers' || issue.message === 'both';
    }
    return false;
  });
}

function detectTextFallbackUsage(result: ValidationResult): boolean {
  const trace = result.validationV2?.executionTrace ?? [];
  if (trace.some((entry) => entry.ruleId === 'MCQ_ANSWER_TEXT_MATCH' && entry.result !== 'skip')) {
    return true;
  }
  if (trace.some((entry) => entry.ruleId === 'MSQ_ANSWER_TEXT_MATCH' && entry.result !== 'skip')) {
    return true;
  }
  return result.validationV2?.uncertaintyFlags.includes('ANSWER_RESOLVED_BY_TEXT_MATCH') ?? false;
}

function classifyFallbackType(result: ValidationResult): keyof FallbackTypeBreakdown | null {
  if (!detectTextFallbackUsage(result)) return null;

  const trace = result.validationV2?.executionTrace ?? [];
  const textMatchFailure = trace.some((entry) =>
    (entry.ruleId === 'MCQ_ANSWER_TEXT_MATCH' || entry.ruleId === 'MSQ_ANSWER_TEXT_MATCH') &&
    entry.result === 'fail'
  );
  if (textMatchFailure) return 'mapping_failure';

  const canonical = result.canonicalItem;
  const answerTokens = canonical?.answerTokens ?? [];
  const choiceIdentifiers = canonical?.choices.map((choice) => choice.identifier) ?? [];

  const casingOnly = answerTokens.some((token) =>
    choiceIdentifiers.some((identifier) =>
      identifier.toLowerCase() === token.toLowerCase() && identifier !== token
    )
  );

  return casingOnly ? 'casing_issue' : 'identifier_missing';
}

function hasIdentifierMismatch(result: ValidationResult): boolean {
  const ruleIssues = result.validationV2?.issues ?? result.ruleIssues ?? [];
  const issueCodes = new Set(ruleIssues.map((issue) => issue.code));
  if (
    issueCodes.has('ANSWER_NOT_IN_OPTIONS') ||
    issueCodes.has('ANSWER_TEXT_NOT_MATCH') ||
    issueCodes.has('AMBIGUOUS_ANSWER_MATCH') ||
    issueCodes.has('MSQ_ANSWER_TEXT_NOT_MATCH') ||
    issueCodes.has('MSQ_ANSWER_TEXT_AMBIGUOUS')
  ) {
    return true;
  }
  return detectTextFallbackUsage(result);
}

interface DatasetInsightsAccumulator {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  reviewRows: number;
  textFallbackRows: number;
  identifierMismatchRows: number;
  missingAnswerRows: number;
  highUncertaintyRows: number;
  fallbackTypes: FallbackTypeBreakdown;
  errorTypeCounts: Map<string, number>;
  errorTypeSeverity: Map<string, number>;
  errorTypeRowIds: Map<string, string[]>;
  fallbackRowIds: string[];
}

function createInsightsAccumulator(totalRows: number): DatasetInsightsAccumulator {
  return {
    totalRows,
    validRows: 0,
    invalidRows: 0,
    reviewRows: 0,
    textFallbackRows: 0,
    identifierMismatchRows: 0,
    missingAnswerRows: 0,
    highUncertaintyRows: 0,
    fallbackTypes: {
      casing_issue: 0,
      identifier_missing: 0,
      mapping_failure: 0,
    },
    errorTypeCounts: new Map<string, number>(),
    errorTypeSeverity: new Map<string, number>(),
    errorTypeRowIds: new Map<string, string[]>(),
    fallbackRowIds: [],
  };
}

function recordDatasetInsight(acc: DatasetInsightsAccumulator, result: ValidationResult): void {
  const status = normalizeStatus(result.validationV2?.status ?? mapLegacyStatus(result));
  if (status === 'valid') acc.validRows += 1;
  else if (status === 'invalid') acc.invalidRows += 1;
  else acc.reviewRows += 1;

  const uncertaintyFlags = result.validationV2?.uncertaintyFlags ?? [];
  const confidence = result.validationV2?.confidence ?? 0;
  if (confidence < 90 || uncertaintyFlags.length >= 2) {
    acc.highUncertaintyRows += 1;
  }

  if (detectTextFallbackUsage(result)) {
    acc.textFallbackRows += 1;
    acc.fallbackRowIds.push(result.rowId);
    const fallbackType = classifyFallbackType(result);
    if (fallbackType) acc.fallbackTypes[fallbackType] += 1;
  }

  if (hasIdentifierMismatch(result)) {
    acc.identifierMismatchRows += 1;
  }

  const issueCodes = extractIssueCodes(result);
  if (hasMissingAnswers(issueCodes, result.issues, result.ruleIssues)) {
    acc.missingAnswerRows += 1;
  }

  const uniqueCodes = new Set(issueCodes);
  uniqueCodes.forEach((code) => {
    acc.errorTypeCounts.set(code, (acc.errorTypeCounts.get(code) ?? 0) + 1);
    if (!acc.errorTypeRowIds.has(code)) acc.errorTypeRowIds.set(code, []);
    acc.errorTypeRowIds.get(code)!.push(result.rowId);
  });

  result.issues.forEach((issue) => {
    const weight = severityWeightForIssue(issue.severity);
    const current = acc.errorTypeSeverity.get(issue.code) ?? 0;
    if (weight > current) acc.errorTypeSeverity.set(issue.code, weight);
  });
}

function finalizeDatasetInsights(acc: DatasetInsightsAccumulator): ValidationDatasetInsights {
  const percentTextFallback = normalizePercent(acc.textFallbackRows, acc.totalRows);
  const percentIdentifierMismatch = normalizePercent(acc.identifierMismatchRows, acc.totalRows);
  const percentMissingAnswers = normalizePercent(acc.missingAnswerRows, acc.totalRows);

  const topIssues = Array.from(acc.errorTypeCounts.entries()).map(([code, count]) => {
    const severityWeight = acc.errorTypeSeverity.get(code) ?? 1;
    const impact = count * severityWeight;
    return { code, count, severityWeight, impact };
  }).sort((a, b) => b.impact - a.impact || b.count - a.count || a.code.localeCompare(b.code));

  const repeatedErrorTypes = topIssues
    .filter((issue) => issue.count >= 2)
    .map((issue) => issue.code);

  const validationSummary: ValidationSummary = {
    totalRows: acc.totalRows,
    valid: acc.validRows,
    invalid: acc.invalidRows,
    review: acc.reviewRows,
    highUncertainty: acc.highUncertaintyRows,
  };

  const batchInsights: BatchInsights = {
    highFallbackUsage: percentTextFallback >= 30,
    repeatedErrorTypes,
  };

  const exampleRows: ValidationDatasetInsights['exampleRows'] = {
    fallback: acc.fallbackRowIds.slice(0, 5),
    topIssues: {},
  };

  topIssues.slice(0, 5).forEach((issue) => {
    exampleRows.topIssues[issue.code] = (acc.errorTypeRowIds.get(issue.code) || []).slice(0, 5);
  });

  return {
    totalRows: acc.totalRows,
    validRows: acc.validRows,
    invalidRows: acc.invalidRows,
    reviewRows: acc.reviewRows,
    percentTextFallback,
    percentIdentifierMismatch,
    percentMissingAnswers,
    fallbackTypes: acc.fallbackTypes,
    topIssues,
    validationSummary,
    batchInsights,
    exampleRows,
  };
}

export function buildValidationDatasetInsights(results: ValidationResult[]): ValidationDatasetInsights {
  const totalRows = results.length;
  const acc = createInsightsAccumulator(totalRows);
  results.forEach((result) => recordDatasetInsight(acc, result));
  return finalizeDatasetInsights(acc);
}

function computeIsAnswerInOptions(canonical?: CanonicalItem): boolean {
  if (!canonical) return true;

  const type = canonical.canonicalType;
  if (type !== 'single_choice' && type !== 'multi_select' && type !== 'true_false') {
    return true;
  }

  const raw = typeof canonical.answerRaw === 'string' ? canonical.answerRaw : String(canonical.answerRaw ?? '');
  if (type === 'true_false') {
    const normalized = normalizeTextFingerprint(raw);
    return TF_TRUE.has(normalized) || TF_FALSE.has(normalized);
  }

  const choices = canonical.choices;
  if (!choices || choices.length === 0) return false;

  const answerTokens = canonical.answerTokens || [];
  if (answerTokens.length === 0) return false;

  if (type === 'single_choice') {
    const resolved = answerTokens.length === 1
      ? resolveChoiceToken(answerTokens[0], choices)
      : resolveChoiceToken(raw, choices);
    return !!resolved.id && !resolved.ambiguous;
  }

  return answerTokens.every((token) => {
    const resolved = resolveChoiceToken(token, choices);
    return !!resolved.id && !resolved.ambiguous;
  });
}

export function buildValidationDebugReport(results: ValidationResult[]): ValidationDebugReport {
  const rows: ValidationDebugRow[] = [];
  const issueCounts = new Map<string, number>();
  let validRows = 0;
  let invalidRows = 0;
  let reviewRows = 0;

  results.forEach((result) => {
    const canonical = result.canonicalItem;
    const normalizedType = canonical?.canonicalType ?? 'unknown';
    const detectedType = result.detectedType ?? 'unknown';
    const questionText = canonical?.stem ?? '';
    const options = canonical?.choices?.map((choice) => choice.normalizedText) ?? [];
    const answerRaw = canonical?.answerRaw ?? '';
    const normalizedAnswerTokens = normalizeAnswerTokens(canonical?.answerTokens ?? []);

    const validationV2 = result.validationV2;
    const status = validationV2?.status ?? mapLegacyStatus(result);
    const normalizedStatus = normalizeStatus(status);
    if (normalizedStatus === 'valid') validRows += 1;
    else if (normalizedStatus === 'invalid') invalidRows += 1;
    else reviewRows += 1;

    const issues = (result.issues || []).map((issue) => ({
      code: issue.code,
      message: issue.message,
      severity: issue.severity,
    }));
    issues.forEach((issue) => {
      issueCounts.set(issue.code, (issueCounts.get(issue.code) ?? 0) + 1);
    });

    rows.push({
      rowId: result.rowId,
      detectedType,
      normalizedType,
      questionText,
      options,
      correctAnswer: {
        raw: String(answerRaw ?? ''),
        normalized: normalizedAnswerTokens,
      },
      isAnswerInOptions: computeIsAnswerInOptions(canonical),
      issues,
      validationV2: {
        status: status,
        confidence: validationV2?.confidence ?? 0,
        coverage: validationV2?.coverage ?? 0,
        passedRules: validationV2?.passedRules ?? [],
        failedRules: validationV2?.failedRules ?? [],
        skippedRules: validationV2?.skippedRules ?? [],
        uncertaintyFlags: validationV2?.uncertaintyFlags ?? [],
      },
    });
  });

  const topIssues = Array.from(issueCounts.entries())
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));

  return {
    rows,
    totalRows: results.length,
    validRows,
    invalidRows,
    reviewRows,
    issueCounts: Object.fromEntries(issueCounts.entries()),
    topIssues,
    issueCodes: Array.from(issueCounts.keys()).sort(),
  };
}

export function detectQuestionType(
  row: QuestionData,
  columnMapping: any,
  profileInput?: Partial<ValidationProfile>
): string {
  const profile: ValidationProfile = {
    ...createDefaultValidationProfile(),
    ...(profileInput || {}),
  };
  const normalized = normalizeRow((row || {}) as Record<string, unknown>, 1);
  const resolution = detectTypeFromStructure(normalized, columnMapping);

  if (resolution.source !== 'explicit' && !profile.allowAutoDetectType) {
    return 'unknown';
  }

  return toLegacyDetectedType(resolution.type);
}

export function computeDataQualityMetrics(results: ValidationResult[]): DataQualityMetrics {
  const DEDUP_CODES = new Set(['DUPLICATE_EXACT', 'DUPLICATE_CONFLICT']);

  const totalRows = results.length;

  const rawValidRows = results.filter((r) => r.status === 'valid').length;

  const duplicatesCount = results.filter((r) =>
    r.issues.some((i) => DEDUP_CODES.has(i.code))
  ).length;

  const duplicateRows = results.filter(
    (r) => r.status === 'caution' && r.issues.some((i) => DEDUP_CODES.has(i.code))
  ).length;

  const validRows = results.filter((r) => r.status !== 'rejected').length; // valid + caution
  const adjustedValidRows = Math.max(0, validRows - duplicateRows);

  const usableAfterCleanupPercentage =
    totalRows > 0 ? Math.round((adjustedValidRows / totalRows) * 1000) / 10 : 0;
  const readyForExportPercentage =
    totalRows > 0 ? Math.round((rawValidRows / totalRows) * 1000) / 10 : 0;

  return { totalRows, rawValidRows, adjustedValidRows, duplicatesCount, usableAfterCleanupPercentage, readyForExportPercentage };
}

export function computeDatasetRecoveryMetrics(results: ValidationResult[]): DatasetRecoveryMetrics {
  const ALL_DUPLICATE_CODES = new Set([
    'DUPLICATE_EXACT', 'DUPLICATE_CONFLICT', 'DUPLICATE_NEAR', 'DUPLICATE_SUSPICIOUS',
  ]);

  const totalRows = results.length;

  // --- Union-Find to count redundant rows (synced with Report 2) ---
  const extractPartners = (msg: string): number[] => {
    const listMatch = msg.match(/row\(s\):\s*([\d,\s]+)/i);
    if (listMatch) return listMatch[1].split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    const singleMatch = msg.match(/\brow\s+(\d+)\b/i);
    if (singleMatch) return [parseInt(singleMatch[1], 10)];
    return [];
  };
  const ufParent = new Map<number, number>();
  const ufFind = (x: number): number => {
    if (!ufParent.has(x)) ufParent.set(x, x);
    if (ufParent.get(x) !== x) ufParent.set(x, ufFind(ufParent.get(x)!));
    return ufParent.get(x)!;
  };
  const ufUnion = (x: number, y: number) => {
    const px = ufFind(x), py = ufFind(y);
    if (px !== py) ufParent.set(px, py);
  };
  const dupRowNumbers = new Set<number>();
  results.forEach((r) => {
    if (!r.rowNumber) return;
    (r.issues ?? []).forEach((i) => {
      if (!ALL_DUPLICATE_CODES.has(i.code)) return;
      const partners = extractPartners(i.message ?? '');
      if (partners.length > 0) {
        ufFind(r.rowNumber!);
        partners.forEach(p => ufUnion(r.rowNumber!, p));
      }
    });
  });
  const clusterSizes = new Map<number, number>();
  results.forEach((r) => {
    if (!r.rowNumber || !ufParent.has(r.rowNumber)) return;
    const root = ufFind(r.rowNumber);
    clusterSizes.set(root, (clusterSizes.get(root) ?? 0) + 1);
    dupRowNumbers.add(r.rowNumber);
  });
  let deduplicationGain = 0;
  clusterSizes.forEach((size) => { if (size > 1) deduplicationGain += size - 1; });

  const uniqueRows = totalRows - deduplicationGain;
  const uniqueResults = results.filter(
    (r) => !r.rowNumber || !dupRowNumbers.has(r.rowNumber) ||
           ufFind(r.rowNumber) === r.rowNumber // keep cluster root as the "original"
  );

  const FIXABLE_CODES = new Set([
    'MISSING_ANSWER', 
    'MISSING_MULTI_SELECT_ANSWERS', 
    'MISSING_CORRECT_ANSWERS',
    'ANSWER_NOT_IN_OPTIONS', 
    'MSQ_EXACT_SET_MISMATCH', 
    'MSQ_CARDINALITY_MISMATCH',
    'AMBIGUOUS_ANSWER_MAPPING', 
    'AMBIGUOUS_ANSWER_MATCH', 
    'INVALID_FORMAT',
    'SHORT_STEM', 
    'DUPLICATE_NEAR', 
    'DUPLICATE_SUSPICIOUS',
    'MISSING_REQUIRED_OPTIONS',
    'EMPTY_OPTION_TEXT',
    'INVALID_ANSWER_FORMAT',
    'WHITESPACE_AUTOFIX'
  ]);

  let validInUnique = 0;
  let fixableInUnique = 0;
  let blockedInUnique = 0;

  uniqueResults.forEach((r) => {
    if (r.status === 'valid') {
      validInUnique += 1;
    } else {
      const codes = (r.issues || []).map((i) => i.code);
      if (codes.length > 0 && codes.every((c) => FIXABLE_CODES.has(c))) {
        fixableInUnique += 1;
      } else {
        blockedInUnique += 1;
      }
    }
  });

  const conservativeRecoverable = validInUnique;
  const realisticRecoverable = validInUnique + fixableInUnique;

  const conservativePct = totalRows > 0 ? Math.round((conservativeRecoverable / totalRows) * 100) : 0;
  const realisticPct = totalRows > 0 ? Math.round((realisticRecoverable / totalRows) * 100) : 0;

  const immediatelyUsablePercent = totalRows > 0 ? Math.round((validInUnique / totalRows) * 100) : 0;
  const recoveryPotentialPercent = totalRows > 0 ? Math.round((fixableInUnique / totalRows) * 100) : 0;

  return {
    totalRows,
    uniqueRows,
    deduplicationGain,
    validInUnique,
    fixableInUnique,
    blockedInUnique,
    conservativeRecoverable,
    realisticRecoverable,
    finalUsablePercent: realisticPct,
    immediatelyUsablePercent: immediatelyUsablePercent,
    recoveryPotentialPercent: recoveryPotentialPercent,
  };
}