export interface MathReference {
  id: string;
  originalLatex: string;
  normalizedLatex: string;
  mathMl?: string;
  format: "inline" | "block";
  status: "valid" | "invalid";
}

export type ContentToken =
  | { type: "text"; value: string }
  | { type: "math"; latex: string; displayMode: boolean }
  | { type: "image"; refId: string }; // placeholder for later

export interface RichContent {
  raw: string;
  tokens: ContentToken[];
}
