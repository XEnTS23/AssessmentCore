// ── AI Audit Service ─────────────────────────────────────────────────────────
// Uses Supabase Edge Function `audit-row` so provider keys stay server-side.

import { supabase } from './supabaseClient';

// ── Types ────────────────────────────────────────────────────────────────────

export type AuditBucket = 'AI_CERTIFIED' | 'NEEDS_MANUAL_REVIEW' | 'LOW_CONFIDENCE_FAIL';

export interface AuditResult {
  rowKey: string;
  bucket: AuditBucket;
  confidence: number;       // 0.0 – 1.0
  explanation: string;
  suggestedFix?: string;
  issues?: EdgeAuditIssue[];
  error?: string;           // populated when the request failed for this row
}

export interface AuditRowPayload {
  stem: string;
  options: string[];
  items?: string[];          // for order-type questions
  answer: string;
}

interface EdgeAuditIssue {
  issue_type: 'grammar' | 'logic' | 'clarity' | 'factual';
  description: string;
  suggestion: string;
}

interface EdgeAuditResponse {
  rowKey: string;
  status: 'ai_certified' | 'ai_rejected';
  issues: EdgeAuditIssue[];
  error?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function classifyConfidence(score: number): AuditBucket {
  if (score > 0.85) return 'AI_CERTIFIED';
  if (score >= 0.5) return 'NEEDS_MANUAL_REVIEW';
  return 'LOW_CONFIDENCE_FAIL';
}

function getRowKey(row: Record<string, any>): string {
  const explicit = row.__rowKey != null ? String(row.__rowKey).trim() : '';
  if (explicit) return explicit;
  const rawId = row.id != null ? String(row.id).trim() : '';
  return rawId || `row_${Date.now()}`;
}

function normalizeChoiceIdentifier(token: string): string {
  const t = token.trim().toUpperCase();
  if (/^[A-Z]$/.test(t)) return t;
  if (/^\d+$/.test(t)) {
    const n = Number(t);
    if (n >= 1 && n <= 26) return String.fromCharCode(64 + n);
  }
  return t;
}

function getFirstNonEmptyString(row: Record<string, any>, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (value != null) {
      const normalized = String(value).trim();
      if (normalized) return normalized;
    }
  }
  return '';
}

function getFirstByKeyPattern(row: Record<string, any>, pattern: RegExp): string {
  for (const [key, value] of Object.entries(row)) {
    if (!pattern.test(key)) continue;
    if (value == null) continue;
    const normalized = String(value).trim();
    if (normalized) return normalized;
  }
  return '';
}

function getFallbackStemByKeyPattern(row: Record<string, any>): string {
  for (const [key, value] of Object.entries(row)) {
    if (!/question|stem|prompt/i.test(key)) continue;
    // Avoid mapping metadata fields like "Question Type" into stem text.
    if (/type|interaction|format|template|id|code/i.test(key)) continue;
    if (value == null) continue;
    const normalized = String(value).trim();
    if (normalized) return normalized;
  }
  return '';
}

function detectQuestionType(row: Record<string, any>): string {
  const explicit = getFirstNonEmptyString(row, [
    'questionType',
    'type',
    'Question Type',
    'question_type',
    'interactionType',
    'interaction_type',
  ]) || getFirstByKeyPattern(row, /question\s*type|interaction\s*type|^type$/i);

  if (!explicit) return 'unknown';
  return explicit.toLowerCase();
}

function isTextEntryLikeType(typeRaw: string): boolean {
  const t = String(typeRaw || '').toLowerCase();
  return t.includes('text') || t.includes('short') || t.includes('open') || t.includes('fill');
}

function buildStructuralFallbackMessages(row: Record<string, any>): string[] {
  const messages: string[] = [];
  const questionType = detectQuestionType(row);
  const textEntryLike = isTextEntryLikeType(questionType);

  const stem =
    getFirstNonEmptyString(row, [
      'questionText',
      'question',
      'stem',
      'prompt',
      'Question',
      'question_text',
      'question_stem',
      'item_stem',
      'q_text',
      'qstem',
    ]) || getFallbackStemByKeyPattern(row);

  if (!stem) messages.push('Question stem is missing.');

  const options: string[] = [];
  for (let i = 0; i < 10; i++) {
    const key = `option${String.fromCharCode(65 + i)}`;
    const val = String(row[key] ?? '').trim();
    if (val) options.push(val);
  }
  if (!textEntryLike) {
    if (options.length === 0) messages.push('No options were detected for this row.');
    if (options.length > 0 && options.length < 2) messages.push('Only one option is present; at least two are required for choice-based questions.');
  }

  const answer =
    getFirstNonEmptyString(row, [
      'correctAnswer',
      'answer',
      'correct_answer',
      'expectedAnswer',
      'response',
      'Correct Answer',
      'Answer',
    ]) || getFirstByKeyPattern(row, /correct\s*answer|^answer$|expected\s*answer|response/i);

  if (!answer) messages.push('Correct answer is missing.');
  return messages;
}

// ── Payload mapping ──────────────────────────────────────────────────────────

export function mapRowToAuditPayload(row: Record<string, any>): AuditRowPayload {
  const questionType = detectQuestionType(row);

  const stem = (
    getFirstNonEmptyString(row, [
      'questionText',
      'question',
      'stem',
      'prompt',
      'Question',
      'question_text',
      'question_stem',
      'item_stem',
      'q_text',
      'qstem',
    ]) || getFallbackStemByKeyPattern(row)
  ).trim();

  const options: string[] = [];
  if (!isTextEntryLikeType(questionType)) {
    // Assume options are optionA, optionB, optionC, optionD, etc.
    for (let i = 0; i < 10; i++) {
      const key = `option${String.fromCharCode(65 + i)}`;
      const val = String(row[key] ?? '').trim();
      if (val) options.push(val);
    }

    // Fallback: detect option-like keys with common naming patterns.
    if (options.length === 0) {
      const optionCandidates = Object.entries(row)
        .filter(([k, v]) => /option|choice|^ans[_\s-]?[a-j]$/i.test(k) && String(v ?? '').trim())
        .map(([, v]) => String(v).trim());
      options.push(...optionCandidates.slice(0, 10));
    }
  }

  const answer = (
    getFirstNonEmptyString(row, [
      'correctAnswer',
      'answer',
      'correct_answer',
      'expectedAnswer',
      'response',
      'Correct Answer',
      'Answer',
    ]) || getFirstByKeyPattern(row, /correct\s*answer|^answer$|expected\s*answer|response/i)
  ).trim();

  const items: string[] = [];
  if (row.orderItems) {
    const raw = String(row.orderItems ?? '').trim();
    if (raw) {
      raw.split(/[;|,]/).forEach((s: string) => {
        const t = s.trim();
        if (t) items.push(t);
      });
    }
  }

  return {
    stem,
    options,
    answer,
    ...(items.length > 0 ? { items } : {}),
  };
}

function mapRowToEdgePayload(row: Record<string, any>) {
  const payload = mapRowToAuditPayload(row);
  const choices = payload.options.map((text, idx) => ({
    identifier: String.fromCharCode(65 + idx),
    text,
  }));

  const tokens = payload.answer
    .split(/[;,|]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const correctResponseIdentifiers = tokens.length > 0
    ? tokens.map(normalizeChoiceIdentifier)
    : (payload.answer ? [normalizeChoiceIdentifier(payload.answer)] : []);

  let inferredQuestionType = detectQuestionType(row) || 'unknown';
  if (!inferredQuestionType || inferredQuestionType === 'unknown' || inferredQuestionType === '—' || inferredQuestionType === '-') {
    const hasChoices = choices.length > 0;
    const answerLooksLikeChoiceLabel = /^[A-J](\s*[,;|]\s*[A-J])*$/i.test(payload.answer || '');
    inferredQuestionType = hasChoices || answerLooksLikeChoiceLabel ? 'mcq' : 'textentry';
  }

  return {
    rowKey: getRowKey(row),
    questionType: inferredQuestionType,
    stem: payload.stem,
    choices,
    correctResponseIdentifiers,
    orderItems: payload.items,
  };
}

function extractEdgeErrorDetail(error: any): Promise<string> {
  return (async () => {
    let detail = error?.message ?? 'Unknown error';
    try {
      const ctx = error?.context;
      if (ctx) {
        const body = typeof ctx.json === 'function' ? await ctx.json() : await ctx.text();
        detail = typeof body === 'string' ? body : JSON.stringify(body);
      }
    } catch {
      // ignore extraction failure
    }
    return detail;
  })();
}

// ── Single-row audit ─────────────────────────────────────────────────────────

export async function runAiAudit(
  row: Record<string, any>,
  _legacyUrl?: string,
  accessToken?: string,
): Promise<AuditResult> {
  const payload = mapRowToEdgePayload(row);

  try {
    let authToken = accessToken;
    if (!authToken) {
      const { data: { session } } = await supabase.auth.getSession();
      authToken = session?.access_token;
    }

    const { data, error } = await supabase.functions.invoke('audit-row', {
      body: payload,
      headers: authToken
        ? { Authorization: `Bearer ${authToken}` }
        : undefined,
    });

    if (error || !data) {
      const detail = await extractEdgeErrorDetail(error);
      console.error('[AI Audit] Edge function error:', detail);
      return {
        rowKey: payload.rowKey,
        bucket: 'LOW_CONFIDENCE_FAIL',
        confidence: 0,
        explanation: 'AI audit failed',
        error: detail,
      };
    }

    const edgeResult = data as EdgeAuditResponse;
    const normalizedIssues = (edgeResult.issues ?? []).filter((iss) => String(iss.description ?? '').trim().length > 0);
    const fallbackMsgs = buildStructuralFallbackMessages(row);
    const firstIssue = normalizedIssues[0];
    const isCertified = edgeResult.status === 'ai_certified';
    const confidence = isCertified ? 0.95 : 0.35;

    const finalIssues = normalizedIssues.length > 0
      ? normalizedIssues
      : fallbackMsgs.map((msg) => ({
          issue_type: 'clarity' as const,
          description: msg,
          suggestion: 'Fix this field and re-run AI audit for this question.',
        }));

    const finalExplanation = isCertified
      ? 'AI audit passed for this question.'
      : (finalIssues[0]?.description || 'AI marked this question as failed but did not return detailed reasons.');

    return {
      rowKey: payload.rowKey,
      bucket: classifyConfidence(confidence),
      confidence,
      explanation: finalExplanation,
      suggestedFix: finalIssues[0]?.suggestion,
      issues: finalIssues,
      ...(edgeResult.error ? { error: edgeResult.error } : {}),
    };
  } catch (err: any) {
    const message =
      err?.message ?? String(err);
    console.error('[AI Audit] Unexpected error:', message);
    return {
      rowKey: payload.rowKey,
      bucket: 'LOW_CONFIDENCE_FAIL',
      confidence: 0,
      explanation: 'AI audit failed',
      error: message,
    };
  }
}

// ── Health check ─────────────────────────────────────────────────────────────

export async function checkAuditServerHealth(
  _legacyUrl?: string,
): Promise<{ available: boolean; error?: string }> {
  try {
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      return { available: false, error: 'Supabase env is missing (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).' };
    }
    return { available: true };
  } catch (err: any) {
    const message =
      err?.message ?? String(err);
    return { available: false, error: message };
  }
}
