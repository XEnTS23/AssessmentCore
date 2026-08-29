import { RichContent, ContentToken } from "../core/mathTypes";

const DELIMITERS = [
  { open: "$$", close: "$$", display: true },
  { open: "\\[", close: "\\]", display: true },
  { open: "\\(", close: "\\)", display: false },
  { open: "$", close: "$", display: false },
];

export function tokenizeRichContent(
  text: string | undefined | null,
): RichContent {
  if (!text) {
    return { raw: "", tokens: [] };
  }

  const raw = String(text);
  const tokens: ContentToken[] = [];

  let currentIndex = 0;

  while (currentIndex < raw.length) {
    // Find the next opening delimiter
    let nextDelimiter = null;
    let nextDelimiterIndex = -1;

    for (const delim of DELIMITERS) {
      const idx = raw.indexOf(delim.open, currentIndex);
      if (idx !== -1) {
        if (nextDelimiterIndex === -1 || idx < nextDelimiterIndex) {
          nextDelimiter = delim;
          nextDelimiterIndex = idx;
        } else if (
          idx === nextDelimiterIndex &&
          nextDelimiter &&
          delim.open.length > nextDelimiter.open.length
        ) {
          // Prefer longer delimiters (e.g. $$ over $)
          nextDelimiter = delim;
        }
      }
    }

    if (!nextDelimiter) {
      // No more math delimiters, add remaining text
      tokens.push({ type: "text", value: raw.slice(currentIndex) });
      break;
    }

    // Add text before the delimiter
    if (nextDelimiterIndex > currentIndex) {
      tokens.push({
        type: "text",
        value: raw.slice(currentIndex, nextDelimiterIndex),
      });
    }

    // Find closing delimiter
    const innerStartIndex = nextDelimiterIndex + nextDelimiter.open.length;
    const closeIndex = raw.indexOf(nextDelimiter.close, innerStartIndex);

    if (closeIndex !== -1) {
      // Math token successfully closed
      const latex = raw.slice(innerStartIndex, closeIndex);
      tokens.push({
        type: "math",
        latex,
        displayMode: nextDelimiter.display,
      });
      currentIndex = closeIndex + nextDelimiter.close.length;
    } else {
      // Unclosed delimiter, treat the opening delimiter as text and move on by 1 char
      // (or by delimiter length). Validation can flag this later.
      // For tokenization, we just consume the opening as text so we don't get stuck in a loop.
      tokens.push({ type: "text", value: nextDelimiter.open });
      currentIndex = nextDelimiterIndex + nextDelimiter.open.length;
    }
  }

  // Merge consecutive text tokens
  const mergedTokens: ContentToken[] = [];
  for (const token of tokens) {
    if (
      token.type === "text" &&
      mergedTokens.length > 0 &&
      mergedTokens[mergedTokens.length - 1].type === "text"
    ) {
      const last = mergedTokens[mergedTokens.length - 1] as Extract<
        ContentToken,
        { type: "text" }
      >;
      last.value += token.value;
    } else if (token.type === "text" && token.value === "") {
      continue;
    } else {
      mergedTokens.push(token);
    }
  }

  return {
    raw,
    tokens: mergedTokens,
  };
}
