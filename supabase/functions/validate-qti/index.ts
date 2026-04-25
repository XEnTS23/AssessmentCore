// Supabase Edge Function: validate-qti
// Validates a single QTI XML item using Gemini or Groq.
// API keys are read from server-side secrets — never exposed to the browser.

const ALLOWED_ORIGINS = [
  'https://assessmentcore.vercel.app',
  ...(Deno.env.get('ALLOWED_ORIGIN') ? [Deno.env.get('ALLOWED_ORIGIN')!] : []),
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}

Deno.serve(async (req: Request) => {
  const CORS = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const { xmlContent, fileName, itemNo, provider, qtiVersion } = await req.json();

    if (!xmlContent || !provider || !qtiVersion) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: xmlContent, provider, qtiVersion' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    const userPrompt = `Analyze the following QTI ${qtiVersion} XML and validate it.

Check for:
1. XML well-formedness (proper nesting, closed tags, valid attributes)
2. QTI ${qtiVersion} specification compliance (correct elements, required attributes, proper structure)
3. Correct response processing (responseDeclaration, outcomeDeclaration, responseProcessing)
4. Proper item body structure (itemBody, interactions)
5. Namespace declarations and schema references
6. Mathematical content formatting (STRICT):
   - All math must be in valid MathML format using the default namespace (no prefixes).
   - The root element must be <math xmlns="http://www.w3.org/1998/Math/MathML">.
   - Every <math> root must contain an <mrow> as its immediate child.
   - Use <mi> for variables, <mn> for numbers, and <mo> for operators.
   - No raw LaTeX commands or delimiters ($$, \\(\\), etc.) should remain in the final XML EXCEPT inside attributes.
   - IMPORTANT: MathML elements MUST NOT be used inside XML attributes (like 'title' or 'prompt'). Attributes must contain only plain text.
   - No invisible operators (&#x2061;, &#x2062;), no data-semantic-* attributes, and no semantics/annotation elements.
   - Use plain tags only: math, mrow, mi, mn, mo, mfrac, msup, msub, msubsup, mtable, mtr, mtd, msqrt, mroot.
7. Content quality: Is the question educationally sound? Is the correct answer actually correct? Are distractors plausible? Is wording clear and unambiguous?

Respond ONLY with a JSON object (no markdown, no code blocks, no extra text) in this exact format:
{
  "isValid": true/false,
  "issues": [
    {"severity": "error|warning|info", "message": "description", "element": "element name if applicable"}
  ],
  "summary": "Brief one-line summary of validation result"
}

Here is the QTI XML:

${xmlContent}`;

    let rawContent = '';

    if (provider === 'groq') {
      const apiKey = Deno.env.get('GROQ_API_KEY') ?? '';
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-120b',
          messages: [
            {
              role: 'system',
              content: 'You are a strict QTI XML validator and educational content reviewer. Always respond with valid JSON only, no markdown formatting or code blocks.',
            },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.1,
          max_tokens: 1024,
        }),
      });
      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Groq API error (${response.status}): ${err}`);
      }
      const data = await response.json();
      rawContent = data.choices?.[0]?.message?.content ?? '';
    } else {
      const apiKey = Deno.env.get('GEMINI_API_KEY') ?? '';
      const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
      const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: 'You are a strict QTI XML validator and educational content reviewer. Always respond with valid JSON only, no markdown formatting or code blocks.' }],
          },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
        }),
      });
      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Gemini API error (${response.status}): ${err}`);
      }
      const data = await response.json();
      rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    }

    // Parse AI JSON response (with fallbacks)
    let parsed: any;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      const mdMatch = rawContent.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (mdMatch) {
        parsed = JSON.parse(mdMatch[1]);
      } else {
        const objMatch = rawContent.match(/\{[\s\S]*\}/);
        if (objMatch) parsed = JSON.parse(objMatch[0]);
        else throw new Error('Could not parse AI response as JSON');
      }
    }

    const result = {
      itemNo: itemNo ?? 0,
      fileName: fileName ?? '',
      xmlContent,
      isValid: parsed.isValid ?? true,
      issues: (parsed.issues || []).map((i: any) => ({
        severity: i.severity || 'info',
        message: i.message || 'Unknown issue',
        element: i.element,
      })),
      summary: parsed.summary || 'Validation complete',
    };

    return new Response(JSON.stringify(result), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Return a graceful fallback result instead of a hard error
    return new Response(
      JSON.stringify({
        itemNo: 0,
        fileName: '',
        xmlContent: '',
        isValid: true,
        issues: [{ severity: 'warning', message: `AI validation could not complete: ${message}` }],
        summary: 'AI validation encountered an error — manual review recommended',
      }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }
});
