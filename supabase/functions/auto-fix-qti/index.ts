// Supabase Edge Function: auto-fix-qti
// Auto-fixes a single QTI XML item using Gemini or Groq.
// API keys are read from server-side secrets — never exposed to the browser.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const { xmlContent, provider, qtiVersion } = await req.json();

    if (!xmlContent || !provider || !qtiVersion) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: xmlContent, provider, qtiVersion' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    let rawContent = '';

    if (provider === 'groq') {
      const apiKey = Deno.env.get('GROQ_API_KEY') ?? '';
      const userPrompt = `You are a QTI ${qtiVersion} and MathML fixer.

Given the following QTI XML, return a corrected version that:
- Keeps the same educational content, structure, identifiers, and scoring logic.
- Fixes any XML well-formedness or QTI structural issues.
- Ensures all MathML is clean Presentation MathML only.
- Every mathematical expression must be wrapped inside exactly: <math xmlns="http://www.w3.org/1998/Math/MathML"><mrow> ... </mrow></math>
- Do NOT use namespace prefixes (like m:). Use plain tags: math, mrow, mi, mn, mo, etc.
- Never place operators or identifiers directly inside <math>; they must be inside <mrow>.
- Map elements STRICTLY: variables -> <mi>, numbers -> <mn>, operators -> <mo>.
- Fractions must use <mfrac>. Superscripts must use <msup>. Do NOT use <mo>^</mo>.
- Subscripts must use <msub>. Subscript + Superscript must use <msubsup>.
- Matrices must use <mtable>, <mtr>, <mtd>.
- The AI must NOT generate: &#x2062;, &#x2061;, empty <mrow>, <semantics>, <annotation>, or non-standard attributes like data-semantic*.
- No raw LaTeX commands remain (\\frac, \\sqrt, etc).

Respond ONLY with a JSON object (no markdown, no code blocks) in this exact format:
{
  "fixedXml": "FULL_QTI_XML_HERE"
}

Here is the original QTI XML:

${xmlContent}`;

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
              content: 'You are a strict QTI XML and MathML fixer. Always respond with valid JSON only, no markdown formatting or code blocks.',
            },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.1,
          max_tokens: 2048,
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
      const userPrompt = `You are a QTI ${qtiVersion} and MathML fixer.

Given the following QTI XML, return a corrected version that:
- Keeps the same educational content, structure, identifiers, and scoring logic.
- Fixes any XML well-formedness or QTI structural issues.
- Ensure all mathematical content is converted to valid, strictly formatted MathML.
- Every <math> block MUST use the xmlns="http://www.w3.org/1998/Math/MathML" attribute and NO namespace prefix.
- Every <math> root MUST contain exactly one <mrow> as its immediate child which wraps the expression.
- Use <mi> for variables/identifiers, <mn> for numbers, and <mo> for operators.
- Fractions must use <mfrac>. Superscripts must <msup>. Subscripts <msub>.
- Matrices must use <mtable>, <mtr>, <mtd>.
- The output must NOT contain: invisible characters (&#x2061;, &#x2062;), data-semantic-* attributes, empty <mrow>, <semantics> or <annotation> elements.
- Ensure no raw LaTeX or delimiters ($$, \\(\\), etc.) remain in text content.
- IMPORTANT: MathML elements MUST NOT be used inside XML attributes (like 'title'). Attributes must be plain text only.
- Ensure the 'title' attribute of assessmentItem contains NO MathML and NO LaTeX. It should be plain text.

Respond ONLY with a JSON object (no markdown, no code blocks) in this exact format:
{
  "fixedXml": "FULL_QTI_XML_HERE"
}

Here is the original QTI XML:

${xmlContent}`;

      const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: 'You are a strict QTI XML and MathML fixer. Always respond with valid JSON only, no markdown formatting or code blocks.' }],
          },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
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
        if (objMatch) {
          parsed = JSON.parse(objMatch[0]);
        } else if (rawContent.trim().startsWith('<')) {
          return new Response(JSON.stringify({ fixedXml: rawContent.trim() }), {
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        } else {
          throw new Error('Could not parse AI fix response as JSON');
        }
      }
    }

    if (!parsed.fixedXml || typeof parsed.fixedXml !== 'string') {
      if (rawContent.trim().startsWith('<')) {
        return new Response(JSON.stringify({ fixedXml: rawContent.trim() }), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
      throw new Error('AI fix response did not include fixedXml');
    }

    return new Response(JSON.stringify({ fixedXml: parsed.fixedXml }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }
});
