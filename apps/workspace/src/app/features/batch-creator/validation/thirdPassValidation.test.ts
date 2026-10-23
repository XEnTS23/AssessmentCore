import { describe, expect, it } from "vitest";
import { ValidationIssue } from "../core/issueTypes";
import { RawSheetRow } from "../core/rowTypes";
import {
  ColumnMapping,
  resolveQuestionType,
} from "../normalization/normalizeAnswer";
import { normalizeRow } from "../normalization/normalizeRow";
import { getDefaultRuleRegistry } from "./ruleRegistry";
import { deduplicateRowIssues } from "./issueDeduplicator";
import {
  assertMandatoryRulesRegistered,
  MANDATORY_RULE_IDS,
  ValidationEngine,
} from "./validationEngine";

const mapping: ColumnMapping = {
  type: "Question_Type",
  stem: "Question_Stem",
  explanation: "Explanation",
  options: ["Option_A", "Option_B", "Option_C", "Option_D"],
  correctAnswer: "Correct_Answer",
  acceptedAnswers: "Numerical_Answer",
  tolerance: "Tolerance",
  units: "Answer_Unit",
  subject: "Subject",
  chapter: "Chapter",
  topic: "Topic",
  marks: "Positive_Marks",
  negativeMarks: "Negative_Marks",
  questionId: "Question_ID",
  copyrightStatus: "Copyright_Status",
  sourceReference: "Source_Reference",
  teacherVersion: "Teacher_Version",
  submittedAt: "Submitted_At",
  lastUpdatedAt: "Last_Updated_At",
};

let rowSequence = 0;
function rawRow(overrides: Record<string, unknown> = {}): RawSheetRow {
  rowSequence += 1;
  return {
    __internalId: `third-pass-${rowSequence}`,
    __sourceRowNumber: rowSequence + 1,
    Question_ID: `TP-${rowSequence}`,
    Question_Type: "SCQ",
    Question_Stem: "Which statement is correct?",
    Option_A: "First",
    Option_B: "Second",
    Option_C: "Third",
    Option_D: "Fourth",
    Correct_Answer: "A",
    Numerical_Answer: "",
    Tolerance: "",
    Answer_Unit: "",
    Explanation: "Final answer: Option A",
    Subject: "Physics",
    Chapter: "Kinematics",
    Topic: "Motion",
    Positive_Marks: 4,
    Negative_Marks: 0,
    Copyright_Status: "Approved",
    Source_Reference: "Teacher-created",
    ...overrides,
  };
}

function validate(
  overrides: Record<string, unknown> = {},
  diagnosticMode = false,
) {
  const normalized = normalizeRow(rawRow(overrides), mapping);
  const engine = new ValidationEngine(getDefaultRuleRegistry());
  const [validated] = engine.validateBatch([normalized], {
    allRows: [normalized],
    columnMapping: mapping,
    diagnosticMode,
  });
  return { row: validated, engine };
}

function hasIssue(
  row: ReturnType<typeof validate>["row"],
  ruleId: string,
): boolean {
  return row.issues.some(
    (issue) => issue.ruleId === ruleId || issue.canonicalProblem === ruleId,
  );
}

describe("focused third-pass validator corrections", () => {
  it("merges canonical issues using primary priority while preserving maximum severity and evidence", () => {
    const base = (
      ruleId: string,
      severity: ValidationIssue["severity"],
      evidence: Record<string, unknown>,
    ): ValidationIssue => ({
      id: ruleId,
      ruleId,
      rowId: "row-1",
      field: "Positive_Marks",
      category: "scoring",
      severity,
      message: ruleId,
      evidence,
      allowedCorrections: [
        { actionId: ruleId, label: ruleId, mode: "manual_only" },
      ],
    });
    const [issue] = deduplicateRowIssues(
      [
        base("POSITIVE_MARKS_INVALID", "review", { specific: -4 }),
        base("MARKS_INVALID", "block", { generic: -4 }),
      ],
      "row-1",
    );

    expect(issue.ruleId).toBe("POSITIVE_MARKS_INVALID");
    expect(issue.severity).toBe("block");
    expect(issue.suppressedRuleIds).toContain("MARKS_INVALID");
    expect(issue.evidence).toMatchObject({ specific: -4, generic: -4 });
    expect(issue.allowedCorrections).toHaveLength(2);
  });

  it("skips dependent marks and answer-membership checks when prerequisites fail", () => {
    const { row } = validate({
      Question_ID: "JEE26-PHY-028",
      Positive_Marks: -4,
      Option_A: "",
      Option_B: "",
      Option_C: "",
      Option_D: "",
      Correct_Answer: "A,C",
    });

    expect(hasIssue(row, "POSITIVE_MARKS_INVALID")).toBe(true);
    expect(hasIssue(row, "MARKS_INVALID")).toBe(false);
    expect(hasIssue(row, "NEGATIVE_MARKS_EXCEED_POSITIVE")).toBe(false);
    expect(hasIssue(row, "MCQ_MIN_OPTIONS")).toBe(true);
    expect(hasIssue(row, "ANSWER_NOT_IN_OPTIONS")).toBe(false);
    expect(row.skippedRuleIds).toEqual(
      expect.arrayContaining([
        "NEGATIVE_MARKS_EXCEED_POSITIVE",
        "MCQ_ANSWER_IN_OPTIONS",
      ]),
    );
  });

  it("preserves integer response mode and rejects a decimal accepted answer", () => {
    const { row } = validate({
      Question_ID: "JEE26-PHY-007",
      Question_Type: "INTEGER",
      Question_Stem: "The stopping potential is...",
      Option_A: "",
      Option_B: "",
      Option_C: "",
      Option_D: "",
      Correct_Answer: "",
      Numerical_Answer: "1.5",
      Tolerance: 0,
      Explanation: "Final answer is 1.5",
    });

    expect(row.rawType).toBe("INTEGER");
    expect(row.canonicalType).toBe("TEXT_ENTRY");
    expect(row.typeResolution?.status).toBe("supported");
    expect((row.normalizedQuestion as any).responseMode).toBe("integer");
    expect(hasIssue(row, "INTEGER_ANSWER_NOT_INTEGER")).toBe(true);
    expect(hasIssue(row, "TRUNCATED_STEM")).toBe(true);
  });

  it.each(["MATRIX_MATCH", "Hotspot"])(
    "preserves known unsupported type %s",
    (rawType) => {
      const { row } = validate({
        Question_Type: rawType,
        Correct_Answer: "P-1,Q-2",
      });
      expect(row.rawType).toBe(rawType);
      expect(row.canonicalType).toBe("UNSUPPORTED");
      expect(row.typeResolution?.status).toBe("unsupported");
      expect((row.normalizedQuestion as any).rawAnswer).toBe("P-1,Q-2");
      expect(hasIssue(row, "UNSUPPORTED_TYPE_FOR_TARGET_EXPORT")).toBe(true);
      expect(hasIssue(row, "UNKNOWN_QUESTION_TYPE_BLOCK")).toBe(false);
    },
  );

  it("keeps unregistered explicit types unknown instead of unsupported", () => {
    expect(resolveQuestionType("brand-new interaction").status).toBe("unknown");
    const { row } = validate({ Question_Type: "brand-new interaction" });
    expect(row.canonicalType).toBe("UNKNOWN");
    expect(hasIssue(row, "UNKNOWN_QUESTION_TYPE_BLOCK")).toBe(true);
    expect(hasIssue(row, "UNSUPPORTED_TYPE_FOR_TARGET_EXPORT")).toBe(false);
  });

  it("detects replacement/null/control characters across canonical text fields without flagging valid mojibake-looking text", () => {
    for (const overrides of [
      { Question_Stem: "x\uFFFD + y = 4" },
      { Option_B: "bad\u0000option" },
      { Explanation: "bad\u0007explanation" },
      { Subject: "Phy\uFFFDbics" },
    ]) {
      expect(hasIssue(validate(overrides).row, "BROKEN_ENCODING")).toBe(true);
    }
    expect(
      hasIssue(
        validate({ Question_Stem: "x\u00C2\u00B2 + y\u00C2\u00B2 = 4" }).row,
        "BROKEN_ENCODING",
      ),
    ).toBe(false);
  });

  it("enforces copyright, deterministic subject taxonomy, and version chronology", () => {
    expect(
      hasIssue(
        validate({
          Copyright_Status: "Unknown",
          Source_Reference: "Screenshot from coaching material",
        }).row,
        "COPYRIGHT_UNVERIFIED",
      ),
    ).toBe(true);

    const subject = validate({
      Subject: "Chemistry",
      Chapter: "Current Electricity",
    }).row;
    expect(hasIssue(subject, "WRONG_SUBJECT_TAG")).toBe(true);
    expect(
      subject.issues.find((issue) => issue.ruleId === "WRONG_SUBJECT_TAG")
        ?.allowedCorrections?.[0].mode,
    ).toBe("suggested");

    const version = validate({
      Teacher_Version: "Final v2",
      Submitted_At: "2026-05-10T10:00:00Z",
      Last_Updated_At: "2026-05-01T10:00:00Z",
    }).row;
    const versionIssue = version.issues.find(
      (issue) => issue.ruleId === "VERSION_TIMESTAMP_CONFLICT",
    );
    expect(versionIssue?.message).toContain("Final v2");
    expect(versionIssue?.evidence).toMatchObject({
      submittedAt: "2026-05-10T10:00:00Z",
      lastUpdatedAt: "2026-05-01T10:00:00Z",
    });
  });

  it("blocks high-confidence numeric mismatches and reports complete comparison evidence", () => {
    const { row } = validate({
      Question_Type: "NUMERICAL",
      Option_A: "",
      Option_B: "",
      Option_C: "",
      Option_D: "",
      Correct_Answer: "",
      Numerical_Answer: "1.25",
      Tolerance: 0,
      Explanation: "Therefore, the final answer is 2.",
    });
    const issue = row.issues.find(
      (candidate) => candidate.ruleId === "EXPLANATION_RESULT_MISMATCH",
    );
    expect(issue?.severity).toBe("block");
    expect(issue?.evidence).toMatchObject({
      extractedValue: 2,
      structuredValue: ["1.25"],
      extractionMethod: "explicit_final_marker",
    });
    expect(Number(issue?.evidence?.confidence)).toBeGreaterThanOrEqual(0.9);
    expect(issue?.evidence?.sourceSpan).toBeDefined();
    expect(issue?.evidence?.comparisonPolicy).toBeDefined();
  });

  it("does not compare intermediate values and flags option conclusions for text entry", () => {
    const matching = validate({
      Question_Type: "NUMERICAL",
      Option_A: "",
      Option_B: "",
      Option_C: "",
      Option_D: "",
      Correct_Answer: "",
      Numerical_Answer: "0.1",
      Tolerance: 0,
      Explanation: "n = 4.4 / 44 = 0.1 mol. Therefore, answer = 0.1 mol.",
    }).row;
    expect(hasIssue(matching, "EXPLANATION_RESULT_MISMATCH")).toBe(false);

    const incompatible = validate({
      Question_Type: "TEXT_ENTRY",
      Option_A: "",
      Option_B: "",
      Option_C: "",
      Option_D: "",
      Correct_Answer: "1.5",
      Numerical_Answer: "",
      Explanation: "Final answer: Option D",
    }).row;
    expect(hasIssue(incompatible, "EXPLANATION_FORMAT_INCOMPATIBLE")).toBe(
      true,
    );
  });

  it("normalizes MSQ option sets before explanation comparison", () => {
    const equal = validate({
      Question_Type: "MSQ",
      Correct_Answer: "C,A",
      Explanation: "Final answer: A,C",
    }).row;
    expect(hasIssue(equal, "EXPLANATION_KEY_MISMATCH")).toBe(false);

    const mismatch = validate({
      Question_Type: "MSQ",
      Correct_Answer: "A,C",
      Explanation: "Final answer: A,B,C",
    }).row;
    expect(
      mismatch.issues.find(
        (issue) => issue.ruleId === "EXPLANATION_KEY_MISMATCH",
      )?.severity,
    ).toBe("block");
  });

  it("records actual mandatory-rule execution and skipped evaluations in diagnostic mode", () => {
    const { row, engine } = validate({ Positive_Marks: -4 }, true);
    const diagnostics = engine.getExecutionDiagnostics();
    for (const ruleId of MANDATORY_RULE_IDS) {
      expect(diagnostics[ruleId]).toBeDefined();
      expect(diagnostics[ruleId].registered).toBe(true);
    }
    expect(row.skippedRules?.length).toBeGreaterThan(0);
    expect(diagnostics.NEGATIVE_MARKS_EXCEED_POSITIVE.skipped).toBe(1);
    expect(() => assertMandatoryRulesRegistered([])).toThrow(
      "Mandatory validation rule is not registered",
    );
  });
});
