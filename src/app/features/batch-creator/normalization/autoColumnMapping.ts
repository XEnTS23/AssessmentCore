import { ColumnMapping } from "./normalizeAnswer";

/**
 * Score-based auto-column-mapping that examines spreadsheet column headers
 * and maps them to the internal ColumnMapping fields.
 *
 * Each field defines a set of weighted keyword patterns (positive matches)
 * and exclusion keywords.  The column with the highest score wins.
 * Ties are broken by the order the column appears in the sheet (leftmost wins).
 *
 * The scoring approach avoids the "first keyword match wins" bug where
 * ambiguous headers like "Question Level" or "Question ID" would be
 * incorrectly mapped to `stem` before the actual question text column.
 */

// ─── Types ───────────────────────────────────────────────────────────

interface FieldSpec {
  /** Positive match keywords → weight.  Higher weight = stronger signal. */
  keywords: Array<{ pattern: string; weight: number }>;
  /** If the column header contains any of these, skip it entirely. */
  exclude: string[];
  /** If true, only accept columns where the keyword is the FULL header (after trimming). */
  exactOnly?: boolean;
}

// ─── Field Specifications ────────────────────────────────────────────

const FIELD_SPECS: Record<string, FieldSpec> = {
  stem: {
    keywords: [
      { pattern: "question text", weight: 10 },
      { pattern: "question stem", weight: 10 },
      { pattern: "stem", weight: 8 },
      { pattern: "ques ", weight: 6 },
      { pattern: "question", weight: 4 },
    ],
    exclude: [
      "type",
      "format",
      "id",
      "mark",
      "level",
      "score",
      "quality",
      "no",
      "number",
      "serial",
      "final",
      "category",
      "paper",
      "set",
      "difficulty",
      "section",
    ],
  },

  correctAnswer: {
    keywords: [
      { pattern: "correct answer", weight: 10 },
      { pattern: "correct option", weight: 10 },
      { pattern: "correct", weight: 6 },
      { pattern: "answer key", weight: 8 },
      { pattern: "answer", weight: 5 },
      { pattern: "key", weight: 3 },
    ],
    exclude: ["explanation", "solution", "accepted", "tolerance"],
  },

  type: {
    keywords: [
      { pattern: "question type", weight: 10 },
      { pattern: "q type", weight: 10 },
      { pattern: "qtype", weight: 10 },
      { pattern: "type", weight: 5 },
      { pattern: "format", weight: 4 },
    ],
    exclude: ["media", "file", "content", "answer"],
  },

  explanation: {
    keywords: [
      { pattern: "explanation", weight: 10 },
      { pattern: "solution", weight: 8 },
      { pattern: "rationale", weight: 8 },
      { pattern: "hint", weight: 5 },
    ],
    exclude: [],
  },

  subject: {
    keywords: [
      { pattern: "subject", weight: 10 },
      { pattern: "category", weight: 5 },
      { pattern: "course", weight: 5 },
    ],
    exclude: [],
  },

  questionId: {
    keywords: [
      { pattern: "question id", weight: 10 },
      { pattern: "questionid", weight: 10 },
      { pattern: "qid", weight: 10 },
      { pattern: "q.no", weight: 9 },
      { pattern: "q no", weight: 9 },
      { pattern: "serial", weight: 8 },
      { pattern: "s.no", weight: 8 },
      { pattern: "s no", weight: 8 },
      { pattern: "sl no", weight: 8 },
      { pattern: "sl.no", weight: 8 },
      { pattern: "question no", weight: 8 },
      { pattern: "q.no.", weight: 8 },
      { pattern: "id", weight: 3 },
    ],
    exclude: [
      "media",
      "image",
      "file",
      "submission",
      "sub_id",
      "intake",
      "batch_id",
    ],
  },

  topic: {
    keywords: [
      { pattern: "topic", weight: 10 },
      { pattern: "subtopic", weight: 10 },
      { pattern: "tag", weight: 5 },
      { pattern: "chapter", weight: 8 },
    ],
    exclude: [],
  },

  chapter: {
    keywords: [
      { pattern: "chapter", weight: 10 },
      { pattern: "unit", weight: 5 },
    ],
    exclude: [],
  },

  mediaUrl: {
    keywords: [
      { pattern: "image url", weight: 10 },
      { pattern: "media url", weight: 10 },
      { pattern: "diagram url", weight: 10 },
      { pattern: "figure url", weight: 10 },
      { pattern: "image link", weight: 9 },
      { pattern: "media link", weight: 9 },
    ],
    exclude: [
      "required",
      "file",
      "filename",
      "name",
      "source",
      "credit",
      "flag",
      "has",
    ],
  },

  mediaRequired: {
    keywords: [
      { pattern: "image required", weight: 10 },
      { pattern: "media required", weight: 10 },
      { pattern: "has image", weight: 8 },
      { pattern: "image_required", weight: 10 },
    ],
    exclude: ["url", "file", "filename", "name", "source", "credit", "link"],
  },

  mediaFileName: {
    keywords: [
      { pattern: "image file name", weight: 10 },
      { pattern: "image filename", weight: 10 },
      { pattern: "image name", weight: 10 },
      { pattern: "media file name", weight: 10 },
      { pattern: "asset name", weight: 8 },
      { pattern: "file name", weight: 6 },
    ],
    exclude: ["url", "required", "source", "credit", "link"],
  },

  mediaSource: {
    keywords: [
      { pattern: "image source", weight: 10 },
      { pattern: "media source", weight: 10 },
      { pattern: "image credit", weight: 8 },
    ],
    exclude: ["exam", "paper", "required", "file", "filename", "url", "link"],
  },

  copyrightStatus: {
    keywords: [
      { pattern: "copyright status", weight: 12 },
      { pattern: "copyright_status", weight: 12 },
      { pattern: "rights status", weight: 10 },
      { pattern: "rights_status", weight: 10 },
      { pattern: "license status", weight: 10 },
      { pattern: "license_status", weight: 10 },
      { pattern: "licence status", weight: 10 },
      { pattern: "licence_status", weight: 10 },
      { pattern: "copyright", weight: 7 },
    ],
    exclude: ["source", "reference"],
  },

  sourceReference: {
    keywords: [
      { pattern: "source reference", weight: 12 },
      { pattern: "source_reference", weight: 12 },
      { pattern: "content source", weight: 10 },
      { pattern: "content_source", weight: 10 },
      { pattern: "question source", weight: 10 },
      { pattern: "question_source", weight: 10 },
      { pattern: "reference source", weight: 10 },
      { pattern: "reference_source", weight: 10 },
      { pattern: "source", weight: 5 },
    ],
    exclude: ["exam", "image", "media"],
  },

  teacherVersion: {
    keywords: [
      { pattern: "teacher version", weight: 12 },
      { pattern: "teacher_version", weight: 12 },
      { pattern: "question version", weight: 10 },
      { pattern: "question_version", weight: 10 },
      { pattern: "content version", weight: 10 },
      { pattern: "content_version", weight: 10 },
      { pattern: "version label", weight: 10 },
      { pattern: "version", weight: 6 },
    ],
    exclude: [],
  },

  submittedAt: {
    keywords: [
      { pattern: "submitted at", weight: 12 },
      { pattern: "submitted_at", weight: 12 },
      { pattern: "submitted date", weight: 10 },
      { pattern: "submission date", weight: 10 },
      { pattern: "submission_date", weight: 10 },
      { pattern: "submission timestamp", weight: 10 },
      { pattern: "created at", weight: 10 },
      { pattern: "created_at", weight: 10 },
    ],
    exclude: [],
  },

  lastUpdatedAt: {
    keywords: [
      { pattern: "last updated at", weight: 12 },
      { pattern: "last_updated_at", weight: 12 },
      { pattern: "updated at", weight: 10 },
      { pattern: "updated_at", weight: 10 },
      { pattern: "updated date", weight: 10 },
      { pattern: "modified at", weight: 10 },
      { pattern: "modified_at", weight: 10 },
    ],
    exclude: [],
  },

  difficulty: {
    keywords: [
      { pattern: "difficulty", weight: 10 },
      { pattern: "difficulty level", weight: 10 },
      { pattern: "level", weight: 3 },
    ],
    exclude: ["question"],
  },

  marks: {
    keywords: [
      { pattern: "marks", weight: 10 },
      { pattern: "mark", weight: 8 },
      { pattern: "score", weight: 5 },
      { pattern: "points", weight: 5 },
      { pattern: "weightage", weight: 8 },
    ],
    exclude: ["negative", "penalty"],
  },

  negativeMarks: {
    keywords: [
      { pattern: "negative mark", weight: 10 },
      { pattern: "negative marks", weight: 10 },
      { pattern: "penalty", weight: 8 },
    ],
    exclude: [],
  },

  partialMarkingRule: {
    keywords: [
      { pattern: "partial marking rule", weight: 10 },
      { pattern: "partial marking", weight: 10 },
      { pattern: "partial rule", weight: 8 },
    ],
    exclude: [],
  },

  year: {
    keywords: [
      { pattern: "year", weight: 10 },
      { pattern: "exam year", weight: 10 },
    ],
    exclude: [],
  },

  section: {
    keywords: [
      { pattern: "section", weight: 10 },
      { pattern: "part", weight: 5 },
    ],
    exclude: ["marking", "rule", "partial"],
  },

  sourceExam: {
    keywords: [
      { pattern: "source exam", weight: 10 },
      { pattern: "exam name", weight: 10 },
      { pattern: "exam", weight: 5 },
      { pattern: "paper", weight: 5 },
    ],
    exclude: [
      "year",
      "image",
      "media",
      "file",
      "filename",
      "diagram",
      "figure",
    ],
  },

  acceptedAnswers: {
    keywords: [
      { pattern: "accepted answer", weight: 10 },
      { pattern: "accepted answers", weight: 10 },
      { pattern: "acceptable answer", weight: 10 },
      { pattern: "numerical answer", weight: 10 },
      { pattern: "numeric answer", weight: 10 },
      { pattern: "text answer", weight: 10 },
      { pattern: "numerical", weight: 8 },
      { pattern: "numeric", weight: 8 },
      { pattern: "number answer", weight: 8 },
    ],
    exclude: [],
  },

  tolerance: {
    keywords: [
      { pattern: "tolerance", weight: 10 },
      { pattern: "margin", weight: 5 },
    ],
    exclude: [],
  },

  units: {
    keywords: [
      { pattern: "unit", weight: 10 },
      { pattern: "units", weight: 10 },
      { pattern: "answer unit", weight: 10 },
    ],
    exclude: [],
  },

  timeLimitSeconds: {
    keywords: [
      { pattern: "time limit", weight: 10 },
      { pattern: "time", weight: 5 },
      { pattern: "duration", weight: 8 },
    ],
    exclude: [],
  },

  language: {
    keywords: [
      { pattern: "language", weight: 10 },
      { pattern: "lang", weight: 8 },
    ],
    exclude: [],
  },
};

// ─── Option Column Detection ─────────────────────────────────────────

/** Patterns that identify option/choice columns. */
const OPTION_PATTERNS: RegExp[] = [
  /^option[_\-\s\.]*[a-z0-9]+/i, // "Option A", "Option 1", "Option_A", "Option-1", "Option 10"
  /^option[_\-\s\.]*[(\[][a-z0-9]+[)\]]/i, // "Option (A)", "Option [1]"
  /^choice[_\-\s\.]*[a-z0-9]+/i, // "Choice A", "Choice 1"
  /^opt[_\-\s\.]*[a-z0-9]+/i, // "Opt A", "Opt 1", "opt_a"
  /^val(ue)?[_\-\s\.]*[a-z0-9]+/i, // "Value A", "Value 1"
  /^[a-h]$/i, // Single letters A through H (case-insensitive)
  /^option$/i, // just "option"
];

const OPTION_KEYWORD_PATTERNS: RegExp[] = [
  /option[_\-\s\.]*[a-z0-9]/i,
  /\boption\b/i,
  /\bchoice\b/i,
];

function isOptionColumn(header: string): boolean {
  const trimmed = header.trim();
  // Check exact patterns first
  if (OPTION_PATTERNS.some((re) => re.test(trimmed))) return true;
  // Then check if header contains an option-like keyword
  if (OPTION_KEYWORD_PATTERNS.some((re) => re.test(trimmed))) return true;
  return false;
}

/**
 * Extract the sort key for option columns so they appear in logical order.
 * Returns a comparable string: "A" < "B" < "C" etc.
 */
function optionSortKey(header: string): string {
  const trimmed = header.trim().toUpperCase();
  // Try to extract the letter/number suffix
  const match = trimmed.match(/([A-Z0-9])$/);
  return match ? match[1] : trimmed;
}

// ─── Scoring Engine ──────────────────────────────────────────────────

function scoreColumn(header: string, spec: FieldSpec): number {
  const lower = header.toLowerCase().trim().replace(/_/g, " ");

  // If the header matches any exclusion keyword, reject immediately
  if (spec.exclude.some((ex) => lower.includes(ex))) return -1;

  // Sum weights of all matching keywords
  let score = 0;
  for (const kw of spec.keywords) {
    if (lower.includes(kw.pattern)) {
      score += kw.weight;
      // Bonus: if the header is (nearly) an exact match for the keyword, boost
      if (lower === kw.pattern || lower === kw.pattern.replace(/\s+/g, "")) {
        score += 3;
      }
    }
  }

  return score;
}

function bestMatchColumn(
  availableColumns: string[],
  spec: FieldSpec,
  alreadyClaimed: Set<string>,
): string {
  let bestCol = "";
  let bestScore = 0;

  for (const col of availableColumns) {
    if (alreadyClaimed.has(col)) continue;
    const s = scoreColumn(col, spec);
    if (s > bestScore) {
      bestScore = s;
      bestCol = col;
    }
  }

  return bestCol;
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Automatically infer a ColumnMapping from the column headers of a spreadsheet.
 * Uses a weighted keyword scoring system rather than naive first-match,
 * ensuring that "Question Level" is never picked over the actual question stem.
 *
 * Columns are mapped greedily in priority order (stem first, then options, etc.)
 * so that a column claimed for `stem` won't also be claimed for `subject`.
 */
export function inferColumnMapping(availableColumns: string[]): ColumnMapping {
  const claimed = new Set<string>();

  // Priority-ordered mapping: more important fields claim columns first.
  const fieldPriority: Array<{ field: keyof ColumnMapping; specKey: string }> =
    [
      { field: "stem", specKey: "stem" },
      { field: "correctAnswer", specKey: "correctAnswer" },
      { field: "type", specKey: "type" },
      { field: "explanation", specKey: "explanation" },
      { field: "questionId", specKey: "questionId" },
      { field: "subject", specKey: "subject" },
      { field: "topic", specKey: "topic" },
      { field: "chapter", specKey: "chapter" },
      { field: "difficulty", specKey: "difficulty" },
      { field: "copyrightStatus", specKey: "copyrightStatus" },
      { field: "sourceReference", specKey: "sourceReference" },
      { field: "teacherVersion", specKey: "teacherVersion" },
      { field: "submittedAt", specKey: "submittedAt" },
      { field: "lastUpdatedAt", specKey: "lastUpdatedAt" },
      { field: "marks", specKey: "marks" },
      { field: "negativeMarks", specKey: "negativeMarks" },
      { field: "partialMarkingRule", specKey: "partialMarkingRule" },
      { field: "mediaRequired", specKey: "mediaRequired" },
      { field: "mediaFileName", specKey: "mediaFileName" },
      { field: "mediaSource", specKey: "mediaSource" },
      { field: "mediaUrl", specKey: "mediaUrl" },
      { field: "year", specKey: "year" },
      { field: "section", specKey: "section" },
      { field: "sourceExam", specKey: "sourceExam" },
      { field: "acceptedAnswers", specKey: "acceptedAnswers" },
      { field: "tolerance", specKey: "tolerance" },
      { field: "units", specKey: "units" },
      { field: "timeLimitSeconds", specKey: "timeLimitSeconds" },
      { field: "language", specKey: "language" },
    ];

  const mapping: ColumnMapping = {
    options: [],
  };

  // 1. Detect option columns first (they are multi-valued and special)
  const optionCols = availableColumns
    .filter((c) => isOptionColumn(c))
    .sort((a, b) => optionSortKey(a).localeCompare(optionSortKey(b)));

  if (optionCols.length > 0) {
    mapping.options = optionCols;
    optionCols.forEach((c) => claimed.add(c));
  }

  // 2. Claim the rest in priority order
  for (const { field, specKey } of fieldPriority) {
    const spec = FIELD_SPECS[specKey];
    if (!spec) continue;
    const col = bestMatchColumn(availableColumns, spec, claimed);
    if (col) {
      (mapping as any)[field] = field === "options" ? [col] : col;
      claimed.add(col);
    }
  }

  return mapping;
}
