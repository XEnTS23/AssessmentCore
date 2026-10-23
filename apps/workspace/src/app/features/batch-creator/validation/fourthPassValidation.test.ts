import { describe, expect, it } from "vitest";
import { ValidationEngine, ValidationContext } from "./validationEngine";
import { getDefaultRuleRegistry } from "./ruleRegistry";
import { QuestionRow } from "../core/rowTypes";
import { ColumnMapping } from "../normalization/normalizeAnswer";
import { inferColumnMapping } from "../normalization/autoColumnMapping";
import { normalizeRow } from "../normalization/normalizeRow";
import { TextEntryQuestion, McqQuestion } from "../core/questionTypes";
import { ValidationIssue } from "../core/issueTypes";

// ── Helpers ─────────────────────────────────────────────────────────────

function makeTextEntryRow(
  overrides: Partial<QuestionRow> & {
    acceptedAnswers?: string[];
    mode?: string;
    responseMode?: string;
    rawRow?: Record<string, any>;
    metadata?: any;
  },
): QuestionRow {
  const id = overrides.id || "test-row-1";
  const acceptedAnswers = overrides.acceptedAnswers || ["42"];
  const mode = overrides.mode || "numeric";
  const responseMode = overrides.responseMode || "numeric";
  const stem = "Test question stem";

  const q: TextEntryQuestion = {
    type: "TEXT_ENTRY",
    stem,
    mode: mode as any,
    responseMode: responseMode as any,
    acceptedAnswers,
    caseSensitive: false,
    trimPolicy: "trim",
    rawType: "NUMERICAL",
    canonicalType: "TEXT_ENTRY",
    typeResolution: {
      status: "supported",
      rawType: "NUMERICAL",
      canonicalType: "TEXT_ENTRY",
      responseMode: responseMode as any,
    },
  };

  return {
    id,
    sourceRowNumber: 2,
    rawRow: overrides.rawRow || {},
    normalizedQuestion: q,
    rawType: "NUMERICAL",
    canonicalType: "TEXT_ENTRY",
    typeResolution: q.typeResolution,
    metadata: overrides.metadata || { questionId: id },
    mediaReferences: [],
    mathReferences: [],
    scoringConfig: { marks: 4, partialMarking: false },
    history: [],
    status: "normalized",
    issues: [],
    ...overrides,
  };
}

function makeMcqRow(
  overrides: Partial<QuestionRow> & {
    rawRow?: Record<string, any>;
    metadata?: any;
    stem?: string;
  },
): QuestionRow {
  const id = overrides.id || "test-mcq-1";
  const stem = overrides.stem || "Test MCQ question";

  const q: McqQuestion = {
    type: "MCQ",
    stem,
    options: [
      { id: "A", label: "A", text: "Option A" },
      { id: "B", label: "B", text: "Option B" },
      { id: "C", label: "C", text: "Option C" },
      { id: "D", label: "D", text: "Option D" },
    ],
    correctAnswerId: "A",
    rawType: "MCQ",
    canonicalType: "MCQ",
    typeResolution: {
      status: "supported",
      rawType: "MCQ",
      canonicalType: "MCQ",
    },
  };

  return {
    id,
    sourceRowNumber: 2,
    rawRow: overrides.rawRow || {},
    normalizedQuestion: q,
    rawType: "MCQ",
    canonicalType: "MCQ",
    typeResolution: q.typeResolution,
    metadata: overrides.metadata || { questionId: id },
    mediaReferences: [],
    mathReferences: [],
    scoringConfig: { marks: 4, partialMarking: false },
    history: [],
    status: "normalized",
    issues: [],
    ...overrides,
  };
}

function validateRows(
  rows: QuestionRow[],
  mappingOverrides?: Partial<ColumnMapping>,
): QuestionRow[] {
  const registry = getDefaultRuleRegistry();
  const engine = new ValidationEngine(registry);
  const mapping: ColumnMapping = {
    options: ["Option_A", "Option_B", "Option_C", "Option_D"],
    stem: "Question_Stem",
    correctAnswer: "Correct_Answer",
    type: "Question_Type",
    explanation: "Explanation",
    questionId: "Question_ID",
    subject: "Subject",
    chapter: "Chapter",
    topic: "Topic",
    acceptedAnswers: "Numerical_Answer",
    ...mappingOverrides,
  };
  return engine.validateBatch(rows, {
    allRows: rows,
    columnMapping: mapping,
  });
}

function getIssues(row: QuestionRow, ruleId: string): ValidationIssue[] {
  return row.issues.filter(
    (i) => i.ruleId === ruleId || i.canonicalProblem === ruleId,
  );
}

function hasIssue(row: QuestionRow, ruleId: string): boolean {
  return getIssues(row, ruleId).length > 0;
}

// ── BROKEN_ENCODING ─────────────────────────────────────────────────────

describe("BROKEN_ENCODING rule", () => {
  it("detects Unicode replacement characters in raw cells", () => {
    const row = makeMcqRow({
      id: "broken-1",
      stem: "x\uFFFD + y\uFFFD = 4",
      rawRow: { Question_Stem: "x\uFFFD + y\uFFFD = 4" },
    });
    const [validated] = validateRows([row]);
    expect(hasIssue(validated, "BROKEN_ENCODING")).toBe(true);
    const issue = getIssues(validated, "BROKEN_ENCODING")[0];
    expect(issue.severity).toBe("block");
    expect(issue.evidence?.codePoints).toContain("U+FFFD");
  });

  it("detects null bytes in raw cells", () => {
    const row = makeMcqRow({
      id: "broken-2",
      stem: "What is\u0000the answer?",
      rawRow: { Question_Stem: "What is\u0000the answer?" },
    });
    const [validated] = validateRows([row]);
    expect(hasIssue(validated, "BROKEN_ENCODING")).toBe(true);
    const issue = getIssues(validated, "BROKEN_ENCODING")[0];
    expect(issue.evidence?.containsNullByte).toBe(true);
  });

  it("does not flag valid Unicode mathematics", () => {
    const row = makeMcqRow({
      id: "clean-1",
      stem: "x² + y² = 4",
      rawRow: { Question_Stem: "x² + y² = 4" },
    });
    const [validated] = validateRows([row]);
    expect(hasIssue(validated, "BROKEN_ENCODING")).toBe(false);
  });

  it("does not flag standard ASCII text", () => {
    const row = makeMcqRow({
      id: "clean-2",
      stem: "What is the capital of France?",
      rawRow: { Question_Stem: "What is the capital of France?" },
    });
    const [validated] = validateRows([row]);
    expect(hasIssue(validated, "BROKEN_ENCODING")).toBe(false);
  });

  it("detects control characters in raw row even if normalized field is clean", () => {
    const row = makeMcqRow({
      id: "broken-raw",
      stem: "Clean stem after normalization",
      rawRow: {
        Question_Stem: "Clean stem",
        Explanation: "Text with\u0007bell char",
      },
    });
    const [validated] = validateRows([row]);
    expect(hasIssue(validated, "BROKEN_ENCODING")).toBe(true);
  });
});

// ── COPYRIGHT_UNVERIFIED ────────────────────────────────────────────────

describe("COPYRIGHT_UNVERIFIED rule", () => {
  it("blocks unknown rights for copied coaching material", () => {
    const row = makeMcqRow({
      id: "copyright-1",
      metadata: {
        questionId: "copyright-1",
        copyrightStatus: "Unknown",
        sourceReference: "Screenshot from coaching material",
      },
      rawRow: {
        Copyright_Status: "Unknown",
        Source_Reference: "Screenshot from coaching material",
      },
    });
    const [validated] = validateRows([row]);
    expect(hasIssue(validated, "COPYRIGHT_UNVERIFIED")).toBe(true);
    const issue = getIssues(validated, "COPYRIGHT_UNVERIFIED")[0];
    expect(issue.severity).toBe("block");
  });

  it("blocks unknown rights for scanned textbook content", () => {
    const row = makeMcqRow({
      id: "copyright-2",
      metadata: {
        questionId: "copyright-2",
        copyrightStatus: "Unknown",
        sourceReference: "Scanned from textbook",
      },
    });
    const [validated] = validateRows([row]);
    expect(hasIssue(validated, "COPYRIGHT_UNVERIFIED")).toBe(true);
  });

  it("blocks unknown rights for copied from book", () => {
    const row = makeMcqRow({
      id: "copyright-3",
      metadata: {
        questionId: "copyright-3",
        copyrightStatus: "Unknown",
        sourceReference: "Copied from HC Verma book",
      },
    });
    const [validated] = validateRows([row]);
    expect(hasIssue(validated, "COPYRIGHT_UNVERIFIED")).toBe(true);
  });

  it("blocks unknown rights for PDF source", () => {
    const row = makeMcqRow({
      id: "copyright-4",
      metadata: {
        questionId: "copyright-4",
        copyrightStatus: "Unknown",
        sourceReference: "Downloaded from coaching PDF",
      },
    });
    const [validated] = validateRows([row]);
    expect(hasIssue(validated, "COPYRIGHT_UNVERIFIED")).toBe(true);
  });

  it("blocks missing rights for third-party website", () => {
    const row = makeMcqRow({
      id: "copyright-5",
      metadata: {
        questionId: "copyright-5",
        copyrightStatus: "",
        sourceReference: "Screenshot from coaching website",
      },
    });
    const [validated] = validateRows([row]);
    expect(hasIssue(validated, "COPYRIGHT_UNVERIFIED")).toBe(true);
  });

  it("does not block approved teacher-created content", () => {
    const row = makeMcqRow({
      id: "copyright-ok-1",
      metadata: {
        questionId: "copyright-ok-1",
        copyrightStatus: "Teacher-Created",
        sourceReference: "Created by faculty",
      },
    });
    const [validated] = validateRows([row]);
    expect(hasIssue(validated, "COPYRIGHT_UNVERIFIED")).toBe(false);
  });

  it("does not block licensed content", () => {
    const row = makeMcqRow({
      id: "copyright-ok-2",
      metadata: {
        questionId: "copyright-ok-2",
        copyrightStatus: "Licensed",
        sourceReference: "Pearson textbook license #12345",
      },
    });
    const [validated] = validateRows([row]);
    expect(hasIssue(validated, "COPYRIGHT_UNVERIFIED")).toBe(false);
  });

  it("does not block approved original content", () => {
    const row = makeMcqRow({
      id: "copyright-ok-3",
      metadata: {
        questionId: "copyright-ok-3",
        copyrightStatus: "Original",
        sourceReference: "Created by department",
      },
    });
    const [validated] = validateRows([row]);
    expect(hasIssue(validated, "COPYRIGHT_UNVERIFIED")).toBe(false);
  });
});

// ── WRONG_SUBJECT_TAG ───────────────────────────────────────────────────

describe("WRONG_SUBJECT_TAG rule", () => {
  it("detects deterministic chapter-subject mismatch (Physics chapter tagged as Chemistry)", () => {
    const row = makeMcqRow({
      id: "subject-1",
      metadata: {
        questionId: "subject-1",
        subject: "Chemistry",
        chapter: "Current Electricity",
      },
    });
    const [validated] = validateRows([row]);
    expect(hasIssue(validated, "WRONG_SUBJECT_TAG")).toBe(true);
    const issue = getIssues(validated, "WRONG_SUBJECT_TAG")[0];
    expect(issue.severity).toBe("review");
    expect(issue.evidence?.expectedSubject).toBe("Physics");
  });

  it("detects Chemistry chapter tagged as Mathematics", () => {
    const row = makeMcqRow({
      id: "subject-2",
      metadata: {
        questionId: "subject-2",
        subject: "Mathematics",
        chapter: "Periodic Classification",
      },
    });
    const [validated] = validateRows([row]);
    expect(hasIssue(validated, "WRONG_SUBJECT_TAG")).toBe(true);
    const issue = getIssues(validated, "WRONG_SUBJECT_TAG")[0];
    expect(issue.evidence?.expectedSubject).toBe("Chemistry");
  });

  it("detects Mathematics chapter tagged as Physics", () => {
    const row = makeMcqRow({
      id: "subject-3",
      metadata: {
        questionId: "subject-3",
        subject: "Physics",
        chapter: "Permutations and Combinations",
      },
    });
    const [validated] = validateRows([row]);
    expect(hasIssue(validated, "WRONG_SUBJECT_TAG")).toBe(true);
    const issue = getIssues(validated, "WRONG_SUBJECT_TAG")[0];
    expect(issue.evidence?.expectedSubject).toBe("Mathematics");
  });

  it("does not flag an unknown taxonomy chapter", () => {
    const row = makeMcqRow({
      id: "subject-ok-1",
      metadata: {
        questionId: "subject-ok-1",
        subject: "Physics",
        chapter: "Experimental Topic A",
      },
    });
    const [validated] = validateRows([row]);
    expect(hasIssue(validated, "WRONG_SUBJECT_TAG")).toBe(false);
  });

  it("does not flag a correct chapter-subject pair", () => {
    const row = makeMcqRow({
      id: "subject-ok-2",
      metadata: {
        questionId: "subject-ok-2",
        subject: "Physics",
        chapter: "Kinematics",
      },
    });
    const [validated] = validateRows([row]);
    expect(hasIssue(validated, "WRONG_SUBJECT_TAG")).toBe(false);
  });

  it("does not flag Thermodynamics (ambiguous: both Physics and Chemistry)", () => {
    const row = makeMcqRow({
      id: "subject-ok-3",
      metadata: {
        questionId: "subject-ok-3",
        subject: "Chemistry",
        chapter: "Thermodynamics",
      },
    });
    const [validated] = validateRows([row]);
    expect(hasIssue(validated, "WRONG_SUBJECT_TAG")).toBe(false);
  });
});

// ── VERSION_TIMESTAMP_CONFLICT ──────────────────────────────────────────

describe("VERSION_TIMESTAMP_CONFLICT rule", () => {
  it("flags update timestamp before submission", () => {
    const row = makeMcqRow({
      id: "version-1",
      metadata: {
        questionId: "version-1",
        teacherVersion: "final_final_latest2",
        submittedAt: "2026-07-20T10:00:00Z",
        lastUpdatedAt: "2026-07-19T10:00:00Z",
      },
      rawRow: {
        Teacher_Version: "final_final_latest2",
        Submitted_At: "2026-07-20T10:00:00Z",
        Last_Updated_At: "2026-07-19T10:00:00Z",
      },
    });
    const [validated] = validateRows([row]);
    expect(hasIssue(validated, "VERSION_TIMESTAMP_CONFLICT")).toBe(true);
    const issue = getIssues(validated, "VERSION_TIMESTAMP_CONFLICT")[0];
    expect(issue.severity).toBe("review");
  });

  it("flags significantly earlier lastUpdated", () => {
    const row = makeMcqRow({
      id: "version-2",
      metadata: {
        questionId: "version-2",
        teacherVersion: "v3",
        submittedAt: "2026-07-15T10:00:00Z",
        lastUpdatedAt: "2026-06-01T10:00:00Z",
      },
    });
    const [validated] = validateRows([row]);
    expect(hasIssue(validated, "VERSION_TIMESTAMP_CONFLICT")).toBe(true);
  });

  it("flags one-hour-early lastUpdated", () => {
    const row = makeMcqRow({
      id: "version-3",
      metadata: {
        questionId: "version-3",
        teacherVersion: "revised_draft",
        submittedAt: "2026-07-20T12:00:00Z",
        lastUpdatedAt: "2026-07-20T11:00:00Z",
      },
    });
    const [validated] = validateRows([row]);
    expect(hasIssue(validated, "VERSION_TIMESTAMP_CONFLICT")).toBe(true);
  });

  it("accepts chronological timestamps", () => {
    const row = makeMcqRow({
      id: "version-ok-1",
      metadata: {
        questionId: "version-ok-1",
        teacherVersion: "v2",
        submittedAt: "2026-07-19T10:00:00Z",
        lastUpdatedAt: "2026-07-20T10:00:00Z",
      },
    });
    const [validated] = validateRows([row]);
    expect(hasIssue(validated, "VERSION_TIMESTAMP_CONFLICT")).toBe(false);
  });

  it("accepts equal timestamps", () => {
    const row = makeMcqRow({
      id: "version-ok-2",
      metadata: {
        questionId: "version-ok-2",
        submittedAt: "2026-07-20T10:00:00Z",
        lastUpdatedAt: "2026-07-20T10:00:00Z",
      },
    });
    const [validated] = validateRows([row]);
    expect(hasIssue(validated, "VERSION_TIMESTAMP_CONFLICT")).toBe(false);
  });

  it("does not flag when timestamps are missing", () => {
    const row = makeMcqRow({
      id: "version-ok-3",
      metadata: {
        questionId: "version-ok-3",
      },
    });
    const [validated] = validateRows([row]);
    expect(hasIssue(validated, "VERSION_TIMESTAMP_CONFLICT")).toBe(false);
  });
});

// ── UNIT_EMBEDDED_IN_NUMERIC_ANSWER ─────────────────────────────────────

describe("UNIT_EMBEDDED_IN_NUMERIC_ANSWER rule", () => {
  it("detects unit suffix in numeric answer (space-separated)", () => {
    const row = makeTextEntryRow({
      id: "unit-1",
      acceptedAnswers: ["9.8 m/s²"],
      rawRow: { Numerical_Answer: "9.8 m/s²" },
    });
    const [validated] = validateRows([row]);
    expect(hasIssue(validated, "UNIT_EMBEDDED_IN_NUMERIC_ANSWER")).toBe(true);
    const issue = getIssues(validated, "UNIT_EMBEDDED_IN_NUMERIC_ANSWER")[0];
    expect(issue.severity).toBe("block");
    expect(issue.evidence?.parsedNumericCandidate).toBe("9.8");
    expect(issue.evidence?.parsedUnitCandidate).toBe("m/s²");
  });

  it("detects unit suffix in numeric answer (no space)", () => {
    const row = makeTextEntryRow({
      id: "unit-2",
      acceptedAnswers: ["3mol"],
      rawRow: { Numerical_Answer: "3mol" },
    });
    const [validated] = validateRows([row]);
    expect(hasIssue(validated, "UNIT_EMBEDDED_IN_NUMERIC_ANSWER")).toBe(true);
  });

  it("detects currency symbol in numeric answer", () => {
    const row = makeTextEntryRow({
      id: "unit-3",
      acceptedAnswers: ["50 kg"],
      rawRow: { Numerical_Answer: "50 kg" },
    });
    const [validated] = validateRows([row]);
    expect(hasIssue(validated, "UNIT_EMBEDDED_IN_NUMERIC_ANSWER")).toBe(true);
  });

  it("accepts plain numeric answers", () => {
    const row = makeTextEntryRow({
      id: "unit-ok-1",
      acceptedAnswers: ["9.8"],
      rawRow: { Numerical_Answer: "9.8" },
    });
    const [validated] = validateRows([row]);
    expect(hasIssue(validated, "UNIT_EMBEDDED_IN_NUMERIC_ANSWER")).toBe(false);
  });

  it("accepts scientific notation", () => {
    const row = makeTextEntryRow({
      id: "unit-ok-2",
      acceptedAnswers: ["1e-3"],
      rawRow: { Numerical_Answer: "1e-3" },
    });
    const [validated] = validateRows([row]);
    expect(hasIssue(validated, "UNIT_EMBEDDED_IN_NUMERIC_ANSWER")).toBe(false);
  });

  it("accepts negative numbers", () => {
    const row = makeTextEntryRow({
      id: "unit-ok-3",
      acceptedAnswers: ["-3.14"],
      rawRow: { Numerical_Answer: "-3.14" },
    });
    const [validated] = validateRows([row]);
    expect(hasIssue(validated, "UNIT_EMBEDDED_IN_NUMERIC_ANSWER")).toBe(false);
  });

  it("detects unit from raw answer even when normalized answer is clean", () => {
    const row = makeTextEntryRow({
      id: "unit-raw",
      acceptedAnswers: ["9.8"], // normalized: clean
      rawRow: { Numerical_Answer: "9.8 m/s²" }, // raw: has unit
    });
    const [validated] = validateRows([row]);
    expect(hasIssue(validated, "UNIT_EMBEDDED_IN_NUMERIC_ANSWER")).toBe(true);
  });
});

// ── Non-regression ──────────────────────────────────────────────────────

describe("Fourth-pass non-regression checks", () => {
  it("POSITIVE_MARKS_INVALID still fires for invalid marks", () => {
    const row = makeMcqRow({
      id: "nonreg-marks",
      metadata: { questionId: "nonreg-marks", marks: -4 },
    });
    row.scoringConfig = { marks: -4, partialMarking: false };
    const [validated] = validateRows([row]);
    expect(hasIssue(validated, "POSITIVE_MARKS_INVALID")).toBe(true);
  });

  it("INTEGER_ANSWER_NOT_INTEGER still fires for decimal in integer mode", () => {
    const row = makeTextEntryRow({
      id: "nonreg-integer",
      acceptedAnswers: ["1.5"],
      responseMode: "integer",
    });
    const [validated] = validateRows([row]);
    expect(hasIssue(validated, "INTEGER_ANSWER_NOT_INTEGER")).toBe(true);
  });

  it("MALFORMED_LATEX_DELIMITER still fires for undelimited LaTeX", () => {
    const row = makeMcqRow({
      id: "nonreg-latex",
      stem: "Find the value of \\frac{1}{2} + \\frac{1}{4}.",
    });
    const [validated] = validateRows([row]);
    expect(hasIssue(validated, "MALFORMED_LATEX_DELIMITER")).toBe(true);
  });

  it("verifies immutable raw-row freezing invariant", () => {
    const rawSheetRow = {
      Question_Stem: "Test stem",
      __internalId: "row-1",
      __sourceRowNumber: 2,
    };
    const mapping = { stem: "Question_Stem" };
    const row = normalizeRow(rawSheetRow, mapping as any);

    expect(row.raw).toBeDefined();
    expect(Object.isFrozen(row.raw)).toBe(true);
    expect(Object.isFrozen(row.raw?.cells)).toBe(true);
    if (row.raw?.cells?.Question_Stem) {
      expect(Object.isFrozen(row.raw.cells.Question_Stem)).toBe(true);
    }
  });

  it("verifies column mapping safety (negative tests)", () => {
    const columns = [
      "Image_Source",
      "Image_Required",
      "Partial_Marking_Rule",
      "Question_Stem",
      "Answer",
    ];
    const mapping = inferColumnMapping(columns);

    expect(mapping.sourceReference).not.toBe("Image_Source");
    expect(mapping.sourceExam).not.toBe("Image_Source");
    expect(mapping.mediaUrl).not.toBe("Image_Required");
    expect(mapping.section).not.toBe("Partial_Marking_Rule");
  });
});
