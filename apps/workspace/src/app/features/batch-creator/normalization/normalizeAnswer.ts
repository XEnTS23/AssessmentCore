import {
  CanonicalQuestionType,
  Question,
  Option,
  McqQuestion,
  MsqQuestion,
  TextEntryQuestion,
  OrderQuestion,
  TextEntryResponseMode,
  TypeResolution,
  UnknownQuestion,
} from "../core/questionTypes";

export interface ColumnMapping {
  type?: string;
  stem?: string;
  explanation?: string;
  options?: string[]; // Multiple columns mapped to option choices
  correctAnswer?: string;

  // Text entry specific
  acceptedAnswers?: string;
  tolerance?: string;
  units?: string;

  // Media
  mediaUrl?: string;
  mediaRequired?: string;
  mediaFileName?: string;
  mediaSource?: string;

  // Metadata
  subject?: string;
  chapter?: string;
  topic?: string;
  difficulty?: string;
  marks?: string;
  negativeMarks?: string;
  partialMarkingRule?: string;
  section?: string;
  questionId?: string;
  sourceExam?: string;
  year?: string;
  language?: string;

  // Scoring / time
  timeLimitSeconds?: string;

  // Rights and version metadata
  copyrightStatus?: string;
  sourceReference?: string;
  teacherVersion?: string;
  submittedAt?: string;
  lastUpdatedAt?: string;
}

/**
 * Basic text cleaner that doesn't destroy raw data but standardizes spacing
 */
const cleanStr = (val: any): string => {
  if (val === null || val === undefined) return "";
  return String(val).trim();
};

/**
 * Maps common human-readable question type labels to internal type codes.
 * This handles sheets that use descriptive names like "Multiple Choice"
 * instead of the code "MCQ".
 */
const TYPE_ALIASES: Record<string, string> = {
  // MCQ aliases
  MCQ: "MCQ",
  SINGLE: "MCQ",
  MC: "MCQ",
  "SINGLE CHOICE": "MCQ",
  "SINGLE SELECT": "MCQ",
  "MULTIPLE CHOICE": "MCQ",
  "MULTIPLE CHOICE QUESTION": "MCQ",
  OBJECTIVE: "MCQ",
  OBJ: "MCQ",
  "CHOOSE ONE": "MCQ",
  "SINGLE ANSWER": "MCQ",
  "SINGLE CORRECT": "MCQ",
  SCQ: "MCQ",

  // MSQ aliases
  MSQ: "MSQ",
  MULTIPLE: "MSQ",
  MS: "MSQ",
  "MULTI SELECT": "MSQ",
  "MULTIPLE SELECT": "MSQ",
  "MULTIPLE SELECTION": "MSQ",
  "MULTI CHOICE": "MSQ",
  "MULTIPLE CORRECT": "MSQ",
  "CHOOSE MANY": "MSQ",
  "MULTI ANSWER": "MSQ",
  MAQ: "MSQ",
  MRQ: "MSQ",
  "MULTIPLE RESPONSE": "MSQ",
  CHECKBOX: "MSQ",
  "CHECK ALL": "MSQ",

  // TRUE/FALSE → MCQ (special case handled by MCQ_SUSPECT_TRUE_FALSE_REVIEW)
  "TRUE FALSE": "MCQ",
  "TRUE/FALSE": "MCQ",
  "T/F": "MCQ",
  TF: "MCQ",
  "YES NO": "MCQ",
  "YES/NO": "MCQ",
  BOOLEAN: "MCQ",

  // TEXT_ENTRY aliases
  TEXT_ENTRY: "TEXT_ENTRY",
  "TEXT ENTRY": "TEXT_ENTRY",
  TEXT: "TEXT_ENTRY",
  "FILL IN THE BLANK": "TEXT_ENTRY",
  "FILL IN THE BLANKS": "TEXT_ENTRY",
  "FILL IN BLANK": "TEXT_ENTRY",
  FIB: "TEXT_ENTRY",
  FITB: "TEXT_ENTRY",
  "SHORT ANSWER": "TEXT_ENTRY",
  SHORT: "TEXT_ENTRY",
  "FREE RESPONSE": "TEXT_ENTRY",
  "FREE TEXT": "TEXT_ENTRY",
  "OPEN ENDED": "TEXT_ENTRY",
  SUBJECTIVE: "TEXT_ENTRY",
  DESCRIPTIVE: "TEXT_ENTRY",
  ESSAY: "TEXT_ENTRY",
  "LONG ANSWER": "TEXT_ENTRY",
  INPUT: "TEXT_ENTRY",

  // NUMERIC aliases → TEXT_ENTRY with numeric mode
  NUMERIC: "NUMERIC",
  NUMERICAL: "NUMERIC",
  INTEGER: "NUMERIC",
  "INTEGER TYPE": "NUMERIC",
  NUMBER: "NUMERIC",
  "NUMERICAL VALUE": "NUMERIC",
  NUM: "NUMERIC",
  NV: "NUMERIC",
  NAT: "NUMERIC",
  "NUMERICAL ANSWER TYPE": "NUMERIC",

  // FORMULA aliases -> TEXT_ENTRY with formula response mode
  FORMULA: "FORMULA",
  "FORMULA ENTRY": "FORMULA",
  "FORMULA RESPONSE": "FORMULA",

  // ORDER aliases
  ORDER: "ORDER",
  ORDERING: "ORDER",
  SEQUENCE: "ORDER",
  ARRANGE: "ORDER",
  ARRANGEMENT: "ORDER",
  SORT: "ORDER",
  SORTING: "ORDER",
  RANK: "ORDER",
  RANKING: "ORDER",
  SEQUENCING: "ORDER",
  REARRANGE: "ORDER",
  "MATCH THE FOLLOWING": "ORDER",

  // HOTSPOT aliases
  HOTSPOT: "UNSUPPORTED",
  "HOT SPOT": "UNSUPPORTED",
  "IMAGE REGION": "UNSUPPORTED",

  // MATRIX_MATCH aliases
  MATRIX: "UNSUPPORTED",
  "MATRIX MATCH": "UNSUPPORTED",
  "MATCH MATRIX": "UNSUPPORTED",
  "COLUMN MATCH": "UNSUPPORTED",
  "MATRIX TYPE": "UNSUPPORTED",

  // ASSERTION_REASON aliases
  "ASSERTION REASON": "MCQ",
  "ASSERTION-REASON": "MCQ",
  ASSERTION_REASON: "MCQ",
  "ASSERTION AND REASON": "MCQ",
  "ASSERTION AND REASONING": "MCQ",
};

/**
 * Normalize an explicit type string from the spreadsheet to an internal code.
 * Strips whitespace, converts to uppercase, and looks up in the alias table.
 * Returns empty string if not recognized (will fall through to explicit raw handling).
 */
function normalizeTypeKey(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[_\-]+/g, " ")
    .replace(/[^A-Z0-9/ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeExplicitType(raw: string): string {
  if (!raw) return "";
  return TYPE_ALIASES[normalizeTypeKey(raw)] || "";
}

export function resolveQuestionType(rawType: string): TypeResolution {
  if (!rawType.trim()) {
    return {
      status: "unknown",
      canonicalType: "UNKNOWN",
      reason: "Question type is missing.",
    };
  }

  const key = normalizeTypeKey(rawType);
  const alias = TYPE_ALIASES[key];
  if (alias === "UNSUPPORTED") {
    return {
      status: "unsupported",
      rawType,
      canonicalType: "UNSUPPORTED",
      reason:
        "Known interaction type is not supported by the current export profile.",
    };
  }
  if (!alias) {
    return {
      status: "unknown",
      rawType,
      canonicalType: "UNKNOWN",
      reason: "Question type is not present in the type registry.",
    };
  }

  const canonicalType: Exclude<
    CanonicalQuestionType,
    "UNSUPPORTED" | "UNKNOWN"
  > =
    alias === "NUMERIC" || alias === "FORMULA"
      ? "TEXT_ENTRY"
      : (alias as Exclude<CanonicalQuestionType, "UNSUPPORTED" | "UNKNOWN">);
  const responseMode: TextEntryResponseMode | undefined =
    canonicalType === "TEXT_ENTRY"
      ? key.startsWith("INTEGER")
        ? "integer"
        : alias === "NUMERIC"
          ? "numeric"
          : alias === "FORMULA"
            ? "formula"
            : "text"
      : undefined;

  return {
    status: "supported",
    rawType,
    canonicalType,
    responseMode,
    subtype: key.includes("ASSERTION") ? "ASSERTION_REASON" : undefined,
  };
}

/**
 * Infers and normalizes the question type and its core answer fields
 */
export function normalizeAnswer(
  rawRow: Record<string, any>,
  mapping: ColumnMapping,
): Question {
  const rawTypeValue = mapping.type ? cleanStr(rawRow[mapping.type]) : "";
  const explicitType = normalizeExplicitType(rawTypeValue);
  const stem = mapping.stem ? cleanStr(rawRow[mapping.stem]) : "";
  const explanation = mapping.explanation
    ? cleanStr(rawRow[mapping.explanation])
    : undefined;

  const optionsMap = (mapping.options || [])
    .map((col) => ({ col, val: cleanStr(rawRow[col]) }))
    .filter((o) => o.val !== "");

  const answerRaw = mapping.correctAnswer
    ? cleanStr(rawRow[mapping.correctAnswer])
    : "";

  // Resolve explicit types before structural inference so known unsupported
  // interactions and genuinely unknown values remain distinguishable.
  let typeResolution = resolveQuestionType(rawTypeValue);
  let inferredType = explicitType;

  if (typeResolution.status === "unsupported") {
    const options: Option[] = optionsMap.map((o, idx) => ({
      id: crypto.randomUUID(),
      label: String.fromCharCode(65 + idx),
      text: o.val,
    }));
    return {
      type: "UNSUPPORTED",
      rawType: rawTypeValue,
      canonicalType: "UNSUPPORTED",
      typeResolution,
      stem,
      rawStem: stem,
      rawAnswer: answerRaw,
      mediaFields: {
        mediaUrl: mapping.mediaUrl ? rawRow[mapping.mediaUrl] : undefined,
        mediaFileName: mapping.mediaFileName
          ? rawRow[mapping.mediaFileName]
          : undefined,
        mediaSource: mapping.mediaSource
          ? rawRow[mapping.mediaSource]
          : undefined,
      },
      options,
      explanation,
    };
  }

  if (typeResolution.status === "unknown" && rawTypeValue) {
    return {
      type: "UNKNOWN",
      rawType: rawTypeValue,
      canonicalType: "UNKNOWN",
      typeResolution,
      rawStem: stem,
    } as UnknownQuestion;
  }

  if (!inferredType) {
    if (optionsMap.length > 0 && answerRaw.includes(",")) inferredType = "MSQ";
    else if (optionsMap.length > 0) inferredType = "MCQ";
    else if (optionsMap.length === 0 && answerRaw) inferredType = "TEXT_ENTRY";
    else inferredType = "UNKNOWN";

    if (inferredType !== "UNKNOWN") {
      const canonicalType = inferredType as Exclude<
        CanonicalQuestionType,
        "UNSUPPORTED" | "UNKNOWN"
      >;
      typeResolution = {
        status: "supported",
        rawType: "",
        canonicalType,
        responseMode: canonicalType === "TEXT_ENTRY" ? "text" : undefined,
      };
    }
  }

  // Map to structured Options
  const options: Option[] = optionsMap.map((o, idx) => {
    // Generate a stable ID based on index: A, B, C, D
    const label = String.fromCharCode(65 + idx);
    return {
      id: crypto.randomUUID(),
      label,
      text: o.val,
    };
  });

  if (inferredType === "MCQ") {
    // Try to match correctAnswer to an option label or text
    let correctAnswerId = "";
    const ansUpper = answerRaw.toUpperCase();

    // First try exact match on label (e.g. "A", "B")
    const matchByLabel = options.find((o) => o.label === ansUpper);
    if (matchByLabel) {
      correctAnswerId = matchByLabel.id;
    } else {
      // Then try exact match on text
      const matchByText = options.find(
        (o) => o.text.toUpperCase() === ansUpper,
      );
      if (matchByText) {
        correctAnswerId = matchByText.id;
      } else {
        // Fallback: Just use the raw answer string (validation will catch this later)
        correctAnswerId = answerRaw;
      }
    }

    return {
      type: "MCQ",
      rawType: rawTypeValue,
      canonicalType: "MCQ",
      typeResolution,
      stem,
      options,
      correctAnswerId,
      explanation,
    } as McqQuestion;
  }

  if (inferredType === "MSQ") {
    const rawAnswers = answerRaw
      .split(/[,|;]/)
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s);
    const correctAnswerIds: string[] = [];

    for (const ans of rawAnswers) {
      const matchByLabel = options.find((o) => o.label === ans);
      if (matchByLabel) {
        correctAnswerIds.push(matchByLabel.id);
      } else {
        const matchByText = options.find((o) => o.text.toUpperCase() === ans);
        if (matchByText) {
          correctAnswerIds.push(matchByText.id);
        } else {
          correctAnswerIds.push(ans); // Fallback for validation to catch
        }
      }
    }

    return {
      type: "MSQ",
      rawType: rawTypeValue,
      canonicalType: "MSQ",
      typeResolution,
      stem,
      options,
      correctAnswerIds,
      explanation,
    } as MsqQuestion;
  }

  if (inferredType === "ORDER") {
    const rawAnswers = answerRaw
      .split(/[,|;]/)
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s);
    const correctSequenceIds: string[] = [];

    for (const ans of rawAnswers) {
      const matchByLabel = options.find((o) => o.label === ans);
      if (matchByLabel) {
        correctSequenceIds.push(matchByLabel.id);
      } else {
        const matchByText = options.find((o) => o.text.toUpperCase() === ans);
        if (matchByText) {
          correctSequenceIds.push(matchByText.id);
        } else {
          correctSequenceIds.push(ans); // Fallback for validation to catch
        }
      }
    }

    return {
      type: "ORDER",
      rawType: rawTypeValue,
      canonicalType: "ORDER",
      typeResolution,
      stem,
      options,
      correctSequenceIds,
      explanation,
    } as OrderQuestion;
  }

  if (
    inferredType === "TEXT_ENTRY" ||
    inferredType === "NUMERIC" ||
    inferredType === "FORMULA"
  ) {
    const responseMode =
      typeResolution.status === "supported"
        ? typeResolution.responseMode || "text"
        : "text";
    const isInteger = responseMode === "integer";
    const mode: "text" | "numeric" | "formula" =
      responseMode === "integer" ? "numeric" : responseMode;

    // Resolve accepted answers from mapping.acceptedAnswers, fallback to mapping.correctAnswer, or scan rawRow for numeric/answer keys
    let acceptedAnswersRaw = mapping.acceptedAnswers
      ? cleanStr(rawRow[mapping.acceptedAnswers])
      : "";
    if (!acceptedAnswersRaw && mapping.correctAnswer) {
      acceptedAnswersRaw = cleanStr(rawRow[mapping.correctAnswer]);
    }
    if (!acceptedAnswersRaw) {
      const altKey = Object.keys(rawRow).find((k) => {
        const l = k.toLowerCase();
        return (
          (l.includes("numeric") ||
            l.includes("accepted") ||
            l.includes("answer")) &&
          !l.includes("unit") &&
          !l.includes("type") &&
          !l.includes("format")
        );
      });
      if (altKey && rawRow[altKey]) {
        acceptedAnswersRaw = cleanStr(rawRow[altKey]);
      }
    }

    const acceptedAnswers = acceptedAnswersRaw
      ? acceptedAnswersRaw
          .split(/[,|;]/)
          .map((s) => s.trim())
          .filter((s) => s)
      : [];

    const toleranceRaw = mapping.tolerance
      ? cleanStr(rawRow[mapping.tolerance])
      : "";
    const numericTolerance =
      toleranceRaw && !isNaN(Number(toleranceRaw))
        ? Number(toleranceRaw)
        : undefined;

    const unitsRaw = mapping.units
      ? cleanStr(rawRow[mapping.units])
      : undefined;
    const units =
      unitsRaw && unitsRaw.trim() !== "" ? unitsRaw.trim() : undefined;

    return {
      type: "TEXT_ENTRY",
      rawType: rawTypeValue,
      canonicalType: "TEXT_ENTRY",
      typeResolution,
      stem,
      mode,
      responseMode,
      responseSubtype: isInteger
        ? "integer"
        : responseMode === "numeric"
          ? "decimal"
          : responseMode,
      acceptedAnswers,
      numericTolerance,
      units,
      caseSensitive: false,
      trimPolicy: "trim",
      explanation,
    } as TextEntryQuestion;
  }

  const unknownResolution: TypeResolution =
    typeResolution.status === "unknown"
      ? typeResolution
      : {
          status: "unknown",
          rawType: rawTypeValue || undefined,
          canonicalType: "UNKNOWN",
          reason: "Question type could not be inferred.",
        };
  return {
    type: "UNKNOWN",
    rawType: rawTypeValue || undefined,
    canonicalType: "UNKNOWN",
    typeResolution: unknownResolution,
    rawStem: stem,
    options: options.length > 0 ? options : undefined,
  } as UnknownQuestion;
}
