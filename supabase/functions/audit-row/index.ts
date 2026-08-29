// Supabase Edge Function: audit-row
// Performs semantic quality audit on a single assessment question row using OpenRouter.
// OPENROUTER_API_KEY is read from server-side secrets — never exposed to the browser.

const ALLOWED_ORIGINS = [
  "https://assessmentcore.vercel.app",
  ...(Deno.env.get("ALLOWED_ORIGIN") ? [Deno.env.get("ALLOWED_ORIGIN")!] : []),
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    Vary: "Origin",
  };
}

interface AuditIssue {
  issue_type: "grammar" | "logic" | "clarity" | "factual";
  description: string;
  suggestion: string;
}

interface AuditResponse {
  rowKey: string;
  status: "ai_certified" | "ai_rejected";
  issues: AuditIssue[];
  error?: string;
}

interface OpenRouterChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const BASE_DELAY_MS = 300;

function loadOpenRouterKeys(): string[] {
  const keys = [
    Deno.env.get("OPENROUTER_API_KEY"),
    Deno.env.get("OPENROUTER_API_KEY_2"),
    Deno.env.get("OPENROUTER_API_KEY_3"),
    Deno.env.get("OPENROUTER_API_KEY_4"),
  ]
    .map((k) => (k ?? "").trim())
    .filter(Boolean);

  // Preserve order while removing duplicates.
  return Array.from(new Set(keys));
}

function getRetryDelayMs(res: Response, attempt: number): number {
  const retryAfter = res.headers.get("retry-after");
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

async function callOpenRouterWithFailover(
  body: Record<string, unknown>,
): Promise<OpenRouterChatResponse> {
  const keys = loadOpenRouterKeys();
  if (keys.length === 0) {
    throw new Error(
      "OPENROUTER_API_KEY (and optional _2/_3/_4) are not configured in Edge Function secrets.",
    );
  }

  let lastError = "No request attempted";

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const keyAlias = `key_${i + 1}`;

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://dqusycmqpsadwdpxqhhv.supabase.co",
        "X-Title": "AssessmentCore AI Audit",
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      return (await response.json()) as OpenRouterChatResponse;
    }

    const errText = await response.text();
    lastError = `OpenRouter API error (${response.status}) using ${keyAlias}: ${errText}`;
    console.error("[audit-row] OpenRouter request failed:", lastError);

    if (response.status === 429 && i < keys.length - 1) {
      await sleep(getRetryDelayMs(response, i + 1));
      continue;
    }

    // For non-429 or final key, stop and throw.
    throw new Error(lastError);
  }

  throw new Error(lastError);
}

function inferStructuralIssues(
  questionType: string | undefined,
  stem: string,
  choices: Array<{ identifier: string; text: string }> | undefined,
  correctResponseIdentifiers: string[] | undefined,
): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const typeLower = String(questionType ?? "").toLowerCase();
  const isTextEntryLike =
    typeLower.includes("text") ||
    typeLower.includes("short") ||
    typeLower.includes("open") ||
    typeLower.includes("fill");

  const normalizedStem = String(stem ?? "").trim();
  const normalizedChoices = Array.isArray(choices)
    ? choices.map((c) => String(c?.text ?? "").trim()).filter(Boolean)
    : [];
  const normalizedAnswers = Array.isArray(correctResponseIdentifiers)
    ? correctResponseIdentifiers
        .map((a) => String(a ?? "").trim())
        .filter(Boolean)
    : [];

  if (!normalizedStem) {
    issues.push({
      issue_type: "clarity",
      description: "Question stem is empty or missing.",
      suggestion: "Add a clear question stem before running AI audit.",
    });
  }

  if (!isTextEntryLike && normalizedChoices.length === 0) {
    issues.push({
      issue_type: "logic",
      description: "No answer options were found for this question.",
      suggestion:
        "Provide valid options (for MCQ/MSQ) or switch to an open-ended question type.",
    });
  }

  if (
    !isTextEntryLike &&
    normalizedChoices.length > 0 &&
    normalizedChoices.length < 2
  ) {
    issues.push({
      issue_type: "logic",
      description:
        "Only one option was found; this is structurally invalid for choice-based questions.",
      suggestion:
        "Add at least two options so the answer can be evaluated correctly.",
    });
  }

  if (normalizedAnswers.length === 0) {
    issues.push({
      issue_type: "logic",
      description: "Correct answer is missing.",
      suggestion: "Set the correct answer identifier before AI audit.",
    });
  }

  if (
    !isTextEntryLike &&
    normalizedChoices.length > 0 &&
    normalizedAnswers.length > 0
  ) {
    const choiceLabels = new Set(
      normalizedChoices.map((_, idx) => String.fromCharCode(65 + idx)),
    );
    const unmatched = normalizedAnswers.filter((ans) => {
      const upper = ans.toUpperCase();
      if (choiceLabels.has(upper)) return false;
      return !normalizedChoices.some(
        (opt) => opt.toLowerCase() === ans.toLowerCase(),
      );
    });
    if (unmatched.length > 0) {
      issues.push({
        issue_type: "logic",
        description: `Correct answer does not match provided options (${unmatched.join(", ")}).`,
        suggestion:
          "Use option labels (A/B/C...) or exact option text that exists in this row.",
      });
    }
  }

  return issues;
}

function parseJson(raw: string): any {
  try {
    return JSON.parse(raw);
  } catch {
    const mdMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (mdMatch) return JSON.parse(mdMatch[1]);
    const objMatch = raw.match(/\{[\s\S]*\}/);
    if (objMatch) return JSON.parse(objMatch[0]);
    throw new Error("Could not parse OpenRouter response as JSON");
  }
}

function isTextEntryLikeType(questionType: string | undefined): boolean {
  const t = String(questionType ?? "").toLowerCase();
  return (
    t.includes("text") ||
    t.includes("short") ||
    t.includes("open") ||
    t.includes("fill")
  );
}

function hasClearQuestionStem(stem: string | undefined): boolean {
  const s = String(stem ?? "").trim();
  if (s.length < 10) return false;
  if (s.includes("?")) return true;
  return /^(what|who|where|when|which|how|define|name|identify|calculate|find|solve)\b/i.test(
    s,
  );
}

function hasMeaningfulAnswer(
  correctResponseIdentifiers: string[] | undefined,
): boolean {
  return (
    Array.isArray(correctResponseIdentifiers) &&
    correctResponseIdentifiers.some((v) => String(v ?? "").trim().length > 0)
  );
}

function isGenericStemHallucination(issues: AuditIssue[]): boolean {
  if (!Array.isArray(issues) || issues.length === 0) return false;
  const combined = issues
    .map((i) => `${i.description ?? ""} ${i.suggestion ?? ""}`.toLowerCase())
    .join(" ");
  return /stem is incomplete|provides no context|does not pose a clear question|impossible for respondents to know/i.test(
    combined,
  );
}

Deno.serve(async (req: Request) => {
  const CORS = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const {
      rowKey,
      questionType,
      stem,
      choices,
      correctResponseIdentifiers,
      orderItems,
      numericAnswer,
    } = await req.json();

    if (rowKey == null || stem == null) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: rowKey, stem" }),
        {
          status: 400,
          headers: { ...CORS, "Content-Type": "application/json" },
        },
      );
    }

    // Build the options block for the prompt
    const alphabet = "ABCDEFGHIJ";
    let optionsBlock = "";
    if (Array.isArray(choices) && choices.length > 0) {
      optionsBlock = choices
        .map(
          (c: { identifier: string; text: string }, i: number) =>
            `  ${alphabet[i] ?? i + 1}. ${c.text || c.identifier}`,
        )
        .join("\n");
    } else if (Array.isArray(orderItems) && orderItems.length > 0) {
      optionsBlock = orderItems
        .map((item: string, i: number) => `  ${i + 1}. ${item}`)
        .join("\n");
    } else if (numericAnswer !== undefined && numericAnswer !== null) {
      optionsBlock = `  (Numeric answer: ${numericAnswer})`;
    } else {
      optionsBlock = "  (Open-ended / text entry)";
    }

    const correctAnswerText =
      Array.isArray(correctResponseIdentifiers) &&
      correctResponseIdentifiers.length > 0
        ? correctResponseIdentifiers.join(", ")
        : "(not specified)";

    const userPrompt = `Review this assessment question for educational quality.

Type: ${questionType ?? "unknown"}
Stem: "${stem}"
Options:
${optionsBlock}
Correct Answer(s): ${correctAnswerText}

Respond ONLY with this exact JSON structure (no markdown, no code blocks, no extra text):
{
  "status": "ai_certified",
  "issues": []
}
OR
{
  "status": "ai_rejected",
  "issues": [
    {
      "issue_type": "grammar" | "logic" | "clarity" | "factual",
      "description": "What is wrong with the question",
      "suggestion": "A concrete, rewritten alternative or fix"
    }
  ]
}

Rules:
- Must-check categories: stem-option-answer consistency, grammar, and factual correctness
- Set status to "ai_certified" if the question is educationally sound with no significant defects
- Set status to "ai_rejected" for grammar errors, logical flaws, ambiguous wording, or factual incorrectness
- For open-ended/text-entry questions, absence of options is expected and MUST NOT be treated as an error by itself
- If the stem is a clear question and a valid text answer is provided, prefer "ai_certified" unless there is an actual grammar/logic/factual issue
- issues[] MUST be empty when status is "ai_certified"
- Each suggestion must be a concrete rewritten alternative — not a vague instruction
- Do not reject a question simply because it is difficult or tests advanced knowledge`;

    const model = (
      Deno.env.get("OPENROUTER_MODEL_ROW") ??
      Deno.env.get("OPENROUTER_MODEL") ??
      "openrouter/auto"
    ).trim();
    const openRouterData = await callOpenRouterWithFailover({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are an educational content quality auditor. Check stem-option-answer consistency, grammar, and factual correctness. Respond with valid JSON only — no markdown formatting, no code blocks, no extra commentary.",
        },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 700,
    });
    const rawContent: string =
      openRouterData.choices?.[0]?.message?.content ?? "";
    const parsed: any = parseJson(rawContent);

    const result: AuditResponse = {
      rowKey,
      status: parsed.status === "ai_certified" ? "ai_certified" : "ai_rejected",
      issues: (parsed.issues ?? []).map((issue: any) => ({
        issue_type: issue.issue_type ?? "clarity",
        description: issue.description ?? "No description provided",
        suggestion: issue.suggestion ?? "No suggestion provided",
      })),
    };

    // Enforce invariant: ai_certified must have empty issues
    if (result.status === "ai_certified") {
      result.issues = [];
    } else {
      const nonEmptyIssues = result.issues.filter(
        (iss) => String(iss.description ?? "").trim().length > 0,
      );
      if (nonEmptyIssues.length === 0) {
        result.issues = inferStructuralIssues(
          questionType,
          stem,
          choices,
          correctResponseIdentifiers,
        );
      }

      // Guardrail: prevent generic false negatives on clear text-entry questions.
      if (
        isTextEntryLikeType(questionType) &&
        hasClearQuestionStem(stem) &&
        hasMeaningfulAnswer(correctResponseIdentifiers) &&
        isGenericStemHallucination(result.issues)
      ) {
        result.status = "ai_certified";
        result.issues = [];
      }

      if (result.issues.length === 0) {
        result.issues = [
          {
            issue_type: "clarity",
            description:
              "AI marked this question as rejected but did not return a specific reason.",
            suggestion:
              "Re-run AI audit. If it fails again, check stem, options, answer mapping, and delimiters.",
          },
        ];
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[audit-row] OpenRouter error:", message);
    // Graceful fallback — never return HTTP 500 to the client
    const fallback: AuditResponse = {
      rowKey: "",
      status: "ai_rejected",
      issues: [
        {
          issue_type: "clarity",
          description: `AI audit could not complete: ${message}`,
          suggestion:
            "Please retry the audit. If the error persists, review the question manually.",
        },
      ],
      error: message,
    };
    return new Response(JSON.stringify(fallback), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
