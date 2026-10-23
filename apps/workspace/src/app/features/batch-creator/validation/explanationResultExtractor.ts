export interface ExplanationConclusion {
  mode: "option" | "option_set" | "numeric" | "text";
  value: string | string[] | number;
  unit?: string;
  confidence: number;
  sourceSpan: string;
  extractionMethod:
    | "explicit_final_marker"
    | "therefore_clause"
    | "last_equation_result"
    | "structured_field";
}

export type ExtractedFinalResult = ExplanationConclusion & {
  optionLabel?: string;
  extractionMode: ExplanationConclusion["extractionMethod"];
};

const VALUE_PATTERN = String.raw`(?:option\s*)?([A-D](?:\s*[,;]\s*[A-D])*|[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)`;

function toConclusion(
  match: RegExpMatchArray,
  confidence: number,
  extractionMethod: ExplanationConclusion["extractionMethod"],
): ExtractedFinalResult | null {
  const rawValue = match[1]?.trim();
  if (!rawValue) return null;
  const unit = match[2]?.trim().replace(/[.,;:]$/, "") || undefined;
  const optionTokens = rawValue
    .toUpperCase()
    .split(/\s*[,;]\s*/)
    .filter(Boolean);
  const isOptionValue = optionTokens.every((token) => /^[A-D]$/.test(token));

  if (isOptionValue) {
    const mode = optionTokens.length > 1 ? "option_set" : "option";
    const value = mode === "option_set" ? optionTokens : optionTokens[0];
    return {
      mode,
      value,
      optionLabel: mode === "option" ? optionTokens[0] : undefined,
      confidence,
      sourceSpan: match[0],
      extractionMethod,
      extractionMode: extractionMethod,
    };
  }

  const numericValue = Number(rawValue);
  if (!Number.isFinite(numericValue)) return null;
  return {
    mode: "numeric",
    value: numericValue,
    unit,
    confidence,
    sourceSpan: match[0],
    extractionMethod,
    extractionMode: extractionMethod,
  };
}

/** Extract only a terminal or explicitly marked conclusion, never arbitrary intermediate numbers. */
export function extractFinalResultFromExplanation(
  explanation: string,
): ExtractedFinalResult | null {
  if (!explanation || typeof explanation !== "string") return null;
  const text = explanation.trim();
  if (!text) return null;

  const explicit = new RegExp(
    String.raw`(?:final\s*answer|correct\s*(?:answer|option)|answer\s*key|ans)\s*(?::|=|is)\s*${VALUE_PATTERN}\s*([a-zA-Z\u00B0%/\u00B2\u00B3^-]+)?`,
    "i",
  );
  const explicitMatch = text.match(explicit);
  if (explicitMatch)
    return toConclusion(explicitMatch, 0.98, "explicit_final_marker");

  const therefore = new RegExp(
    String.raw`(?:therefore|hence|thus|\u2234)\s*[,;:]?\s*(?:the\s+)?(?:final\s+)?(?:answer|result)?\s*(?::|=|is)\s*${VALUE_PATTERN}\s*([a-zA-Z\u00B0%/\u00B2\u00B3^-]+)?`,
    "i",
  );
  const thereforeMatch = text.match(therefore);
  if (thereforeMatch)
    return toConclusion(thereforeMatch, 0.92, "therefore_clause");

  const lastEquation = new RegExp(
    String.raw`=\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)\s*([a-zA-Z\u00B0%/\u00B2\u00B3^-]+)?\s*[.)]?\s*$`,
    "i",
  );
  const lastEquationMatch = text.match(lastEquation);
  if (lastEquationMatch) {
    const confidence = lastEquationMatch[0].trim().endsWith(".") ? 0.9 : 0.82;
    return toConclusion(lastEquationMatch, confidence, "last_equation_result");
  }

  return null;
}
