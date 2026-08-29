// Supabase Edge Function: auto-fix-stem
// Given a question stem, its options, and the AI-detected issues,
// returns a single rewritten stem that resolves all issues.

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

Deno.serve(async (req: Request) => {
  const CORS = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const { stem, questionType, choices, correctResponseIdentifiers, issues } =
      await req.json();

    if (!stem || !issues?.length) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: stem, issues" }),
        {
          status: 400,
          headers: { ...CORS, "Content-Type": "application/json" },
        },
      );
    }

    const alphabet = "ABCDEFGHIJ";
    const optionsBlock =
      Array.isArray(choices) && choices.length > 0
        ? choices
            .map(
              (c: any, i: number) =>
                `  ${alphabet[i] ?? i + 1}. ${c.text || c.identifier}`,
            )
            .join("\n")
        : "  (no options)";

    const correctText =
      Array.isArray(correctResponseIdentifiers) &&
      correctResponseIdentifiers.length > 0
        ? correctResponseIdentifiers.join(", ")
        : "(not specified)";

    const issuesList = issues
      .map(
        (issue: any, i: number) =>
          `${i + 1}. [${issue.issue_type}] ${issue.description}\n   Fix: ${issue.suggestion}`,
      )
      .join("\n");

    const prompt = `You are fixing an assessment question stem. Rewrite the stem to resolve ALL of the issues listed below while keeping the meaning and intent of the original question intact.

Question Type: ${questionType ?? "unknown"}
Original Stem: "${stem}"
Options:
${optionsBlock}
Correct Answer(s): ${correctText}

Issues to fix:
${issuesList}

Rules:
- Output ONLY the rewritten stem text — no explanation, no quotes, no JSON, no preamble
- Keep the question testing the same concept
- The rewritten stem must remain compatible with the existing options and correct answer
- Be concise and clear`;

    const apiKey = Deno.env.get("GROQ_API_KEY") ?? "";

    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "system",
              content:
                "You are an expert educational content editor. You fix assessment questions. Output only the corrected stem text — nothing else.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.2,
          max_tokens: 256,
        }),
      },
    );

    if (!groqResponse.ok) {
      const err = await groqResponse.text();
      throw new Error(`Groq API error (${groqResponse.status}): ${err}`);
    }

    const groqData = await groqResponse.json();
    const fixedStem = (groqData.choices?.[0]?.message?.content ?? "").trim();

    if (!fixedStem) throw new Error("Groq returned an empty response");

    return new Response(JSON.stringify({ fixedStem }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
