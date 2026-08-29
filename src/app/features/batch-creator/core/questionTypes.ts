export interface Option {
  id: string;
  label: string;
  text: string;
}

export type CanonicalQuestionType =
  | "MCQ"
  | "MSQ"
  | "TEXT_ENTRY"
  | "ORDER"
  | "UNSUPPORTED"
  | "UNKNOWN";

export type TextEntryResponseMode = "text" | "numeric" | "integer" | "formula";

export type TypeResolution =
  | {
      status: "supported";
      rawType: string;
      canonicalType: Exclude<CanonicalQuestionType, "UNSUPPORTED" | "UNKNOWN">;
      subtype?: string;
      responseMode?: TextEntryResponseMode;
    }
  | {
      status: "unsupported";
      rawType: string;
      canonicalType: "UNSUPPORTED";
      reason: string;
    }
  | {
      status: "unknown";
      rawType?: string;
      canonicalType: "UNKNOWN";
      reason: string;
    };

interface QuestionTypeMetadata {
  rawType?: string;
  canonicalType?: CanonicalQuestionType;
  typeResolution?: TypeResolution;
}

export interface McqQuestion extends QuestionTypeMetadata {
  type: "MCQ";
  stem: string;
  options: Option[];
  correctAnswerId: string;
  explanation?: string;
}

export interface MsqQuestion extends QuestionTypeMetadata {
  type: "MSQ";
  stem: string;
  options: Option[];
  correctAnswerIds: string[];
  explanation?: string;
}

export interface OrderQuestion extends QuestionTypeMetadata {
  type: "ORDER";
  stem: string;
  options: Option[];
  correctSequenceIds: string[];
  explanation?: string;
}

export interface TextEntryQuestion extends QuestionTypeMetadata {
  type: "TEXT_ENTRY";
  stem: string;
  mode: "text" | "numeric" | "formula";
  responseMode?: TextEntryResponseMode;
  responseSubtype?:
    | "integer"
    | "decimal"
    | "formula"
    | "case_sensitive_text"
    | "exact_text";
  acceptedAnswers: string[];
  numericTolerance?: number;
  units?: string;
  caseSensitive: boolean;
  trimPolicy: "trim" | "none";
  explanation?: string;
}

export interface HotspotQuestion extends QuestionTypeMetadata {
  type: "HOTSPOT";
  stem: string;
  imageUrl?: string;
  regions?: Array<{ id: string; label: string; coords: number[] }>;
  rawType?: string;
  explanation?: string;
}

export interface MatrixMatchQuestion extends QuestionTypeMetadata {
  type: "MATRIX_MATCH";
  stem: string;
  leftEntities?: string[];
  rightEntities?: string[];
  matchMappings?: Record<string, string[]>;
  rawType?: string;
  explanation?: string;
}

export interface UnsupportedQuestion extends QuestionTypeMetadata {
  type: "UNSUPPORTED";
  rawType: string;
  rawStem?: string;
  stem?: string;
  rawAnswer?: string;
  mediaFields?: Record<string, unknown>;
  options?: Option[];
  explanation?: string;
}

export interface UnknownQuestion extends QuestionTypeMetadata {
  type: "UNKNOWN";
  stem?: string;
  rawType?: string;
  rawStem?: string;
  options?: Option[];
}

export type Question =
  | McqQuestion
  | MsqQuestion
  | TextEntryQuestion
  | OrderQuestion
  | HotspotQuestion
  | MatrixMatchQuestion
  | UnsupportedQuestion
  | UnknownQuestion;
