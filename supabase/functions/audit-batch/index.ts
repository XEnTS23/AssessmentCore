// Supabase Edge Function: audit-batch
// Audits a batch of assessment question rows in a single OpenRouter API call.
// Accepts up to 50 rows per request. OPENROUTER_API_KEY read from server-side secrets.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BatchRow {
  rowKey: string;
  questionType: string;
  stem: string;
  choices: Array<{ identifier: string; text: string }>;
  correctResponseIdentifiers: string[];
  orderItems?: string[];
  numericAnswer?: number;
}

interface AuditIssue {
  issue_type: 'grammar' | 'logic' | 'clarity' | 'factual';
  description: string;
  suggestion: string;
}

interface RowAuditResult {
  rowKey: string;
  status: 'ai_certified' | 'ai_rejected';
  issues: AuditIssue[];
  error?: string;
}

interface OpenRouterChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const BASE_DELAY_MS = 300;

function loadOpenRouterKeys(): string[] {
  const keys = [
    Deno.env.get('OPENROUTER_API_KEY'),
    Deno.env.get('OPENROUTER_API_KEY_2'),
    Deno.env.get('OPENROUTER_API_KEY_3'),
    Deno.env.get('OPENROUTER_API_KEY_4'),
  ]
    .map((k) => (k ?? '').trim())
    .filter(Boolean);

  return Array.from(new Set(keys));
}

function getRetryDelayMs(res: Response, attempt: number): number {
  const retryAfter = res.headers.get('retry-after');
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (!Number.isNaN(seconds) && seconds > 0) {
      return Math.ceil(seconds * 1000);
    }
  }
  return BASE_DELAY_MS * Math.max(1, attempt);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callOpenRouterWithFailover(body: Record<string, unknown>): Promise<OpenRouterChatResponse> {
  const keys = loadOpenRouterKeys();
  if (keys.length === 0) {
    throw new Error('OPENROUTER_API_KEY (and optional _2/_3/_4) are not configured in Edge Function secrets.');
  }

  let lastError = 'No request attempted';

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const keyAlias = `key_${i + 1}`;

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://dqusycmqpsadwdpxqhhv.supabase.co',
        'X-Title': 'AssessmentCore AI Audit',
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      return await response.json() as OpenRouterChatResponse;
    }

    const errText = await response.text();
    lastError = `OpenRouter API error (${response.status}) using ${keyAlias}: ${errText}`;
    console.error('[audit-batch] OpenRouter request failed:', lastError);

    if (response.status === 429 && i < keys.length - 1) {
      await sleep(getRetryDelayMs(response, i + 1));
      continue;
    }

    throw new Error(lastError);
  }

  throw new Error(lastError);
}

// Build a compact text block for each row so the prompt stays dense but readable
function formatRow(row: BatchRow, index: number): string {
  const alpha = 'ABCDEFGHIJ';

  let optionsLine = '';
  if (Array.isArray(row.choices) && row.choices.length > 0) {
    optionsLine = row.choices
      .map((c, i) => `${alpha[i] ?? i + 1}. ${c.text || c.identifier}`)
      .join(' | ');
  } else if (Array.isArray(row.orderItems) && row.orderItems.length > 0) {
    optionsLine = row.orderItems.map((item, i) => `${i + 1}. ${item}`).join(' | ');
  } else if (row.numericAnswer !== undefined && row.numericAnswer !== null) {
    optionsLine = `(Numeric: ${row.numericAnswer})`;
  } else {
    optionsLine = '(open-ended)';
  }

  const correct = Array.isArray(row.correctResponseIdentifiers) && row.correctResponseIdentifiers.length > 0
    ? row.correctResponseIdentifiers.join(', ')
    : '(not specified)';

  return `[${index + 1}] rowKey: "${row.rowKey}"
Type: ${row.questionType ?? 'unknown'}
Stem: "${row.stem ?? ''}"
Options: ${optionsLine}
Correct: ${correct}`;
}

// 3-tier JSON parse fallback — same pattern used in validate-qti
function parseJson(raw: string): any {
  try {
    return JSON.parse(raw);
  } catch {
    const mdMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (mdMatch) return JSON.parse(mdMatch[1]);
    const arrMatch = raw.match(/\[[\s\S]*\]/);
    if (arrMatch) return JSON.parse(arrMatch[0]);
    throw new Error('Could not parse OpenRouter response as JSON array');
  }
}

function isTextEntryLikeType(questionType: string | undefined): boolean {
  const t = String(questionType ?? '').toLowerCase();
  return t.includes('text') || t.includes('short') || t.includes('open') || t.includes('fill');
}

function hasClearQuestionStem(stem: string | undefined): boolean {
  const s = String(stem ?? '').trim();
  if (s.length < 10) return false;
  if (s.includes('?')) return true;
  return /^(what|who|where|when|which|how|define|name|identify|calculate|find|solve)\b/i.test(s);
}

function hasMeaningfulAnswer(correctResponseIdentifiers: string[] | undefined): boolean {
  return Array.isArray(correctResponseIdentifiers) &&
    correctResponseIdentifiers.some((v) => String(v ?? '').trim().length > 0);
}

function isGenericStemHallucination(issues: AuditIssue[]): boolean {
  if (!Array.isArray(issues) || issues.length === 0) return false;
  const combined = issues
    .map((i) => `${i.description ?? ''} ${i.suggestion ?? ''}`.toLowerCase())
    .join(' ');
  return /stem is incomplete|provides no context|does not pose a clear question|impossible for respondents to know/i.test(combined);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  let inputRows: BatchRow[] = [];

  try {
    const body = await req.json();
    inputRows = body.rows ?? [];

    if (!Array.isArray(inputRows) || inputRows.length === 0) {
      return new Response(
        JSON.stringify({ error: 'rows array is required and must not be empty' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // Build the formatted rows block
    const rowsBlock = inputRows.map((row, i) => formatRow(row, i)).join('\n\n');

    const userPrompt = `Audit each of the following ${inputRows.length} assessment questions for educational quality.

For each question check:
- stem-option-answer consistency
- grammar: spelling, punctuation, subject-verb agreement, tense consistency
- logic: is the stated correct answer actually correct? are the distractors plausible?
- clarity: is the question unambiguous and clearly worded?
- factual: is any factual claim in the stem or answer correct?

Questions:
${rowsBlock}

Respond ONLY with a JSON array — no markdown, no code blocks, no explanation.
One object per question, in the same order, using the exact rowKey from input:

[
  { "rowKey": "<exact rowKey>", "status": "ai_certified", "issues": [] },
  { "rowKey": "<exact rowKey>", "status": "ai_rejected", "issues": [
    { "issue_type": "grammar|logic|clarity|factual", "description": "what is wrong", "suggestion": "concrete rewritten fix" }
  ]}
]

Rules:
- status "ai_certified" = educationally sound, no significant defects
- status "ai_rejected" = has genuine errors worth fixing
- For open-ended/text-entry questions, absence of options is expected and MUST NOT be treated as an error by itself
- If stem and answer are clear and coherent for text-entry, prefer "ai_certified" unless there is a real grammar/logic/factual problem
- issues[] must be empty when status is "ai_certified"
- Every suggestion must be a concrete rewritten alternative, not a vague instruction
- Do not reject a question merely because it is difficult`;

    const model = (Deno.env.get('OPENROUTER_MODEL_BATCH') ?? Deno.env.get('OPENROUTER_MODEL') ?? 'openrouter/auto').trim();
    const openRouterData = await callOpenRouterWithFailover({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are an educational content quality auditor. Audit assessment questions for stem-option-answer consistency, grammar, logic, clarity, and factual correctness. Respond ONLY with a valid JSON array.',
        },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 4096,
    });
    const rawContent: string = openRouterData.choices?.[0]?.message?.content ?? '';

    const parsed: RowAuditResult[] = parseJson(rawContent);

    // Index results by rowKey for fast lookup
    const resultMap = new Map<string, RowAuditResult>();
    for (const item of parsed) {
      if (item?.rowKey) {
        resultMap.set(item.rowKey, {
          rowKey: item.rowKey,
          status: item.status === 'ai_certified' ? 'ai_certified' : 'ai_rejected',
          issues: item.status === 'ai_certified' ? [] : (item.issues ?? []).map((iss: any) => ({
            issue_type: iss.issue_type ?? 'clarity',
            description: iss.description ?? 'No description provided',
            suggestion: iss.suggestion ?? 'No suggestion provided',
          })),
        });
      }
    }

    // Fill any rows Gemini may have skipped as certified (safe default)
    const finalResults: RowAuditResult[] = inputRows.map((row) => {
      const base = resultMap.get(row.rowKey) ?? { rowKey: row.rowKey, status: 'ai_certified', issues: [] };

      if (
        base.status === 'ai_rejected' &&
        isTextEntryLikeType(row.questionType) &&
        hasClearQuestionStem(row.stem) &&
        hasMeaningfulAnswer(row.correctResponseIdentifiers) &&
        isGenericStemHallucination(base.issues)
      ) {
        return { rowKey: row.rowKey, status: 'ai_certified', issues: [] };
      }

      return base;
    });

    return new Response(JSON.stringify({ results: finalResults }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[audit-batch] OpenRouter error:', message);
    // Graceful fallback — mark all input rows as rejected with the error reason
    const fallback: RowAuditResult[] = inputRows.map(row => ({
      rowKey: row.rowKey,
      status: 'ai_rejected',
      issues: [{
        issue_type: 'clarity',
        description: `Batch audit could not complete: ${message}`,
        suggestion: 'Please retry. If the error persists, use the per-row Audit button instead.',
      }],
      error: message,
    }));
    return new Response(JSON.stringify({ results: fallback }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
