import { beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import {
  DEFAULT_FIXTURE_PATH,
  REGRESSION_FIXTURE_VERSION,
  TARGET_EXPECTED_COUNTS,
  TARGET_PROBLEMS,
  ValidatorRegressionRun,
  runValidatorRegressionFixture,
  validateManifest,
} from "../../../../../scripts/validator-regression-runner";
import { REQUIRED_HEADERS } from "../../../../../scripts/generate-validator-regression-fixture";
import { parseXlsx } from "../upload/parseXlsx";
import { parseTimestamp } from "../normalization/normalizeMetadata";
import { getCanonicalProblem } from "./issueDeduplicator";

describe("deterministic validator regression fixture", () => {
  let run: ValidatorRegressionRun;

  beforeAll(async () => {
    run = await runValidatorRegressionFixture();
  });

  it("uses the sidecar as the sole expectation source and final issues as detection proof", () => {
    expect(run.manifest.fixtureVersion).toBe(REGRESSION_FIXTURE_VERSION);
    expect(run.columns).not.toContain("Known_Issue_Tag");
    expect(run.ingestionMappingHash).toBe(run.reportMappingHash);

    for (const problem of TARGET_PROBLEMS) {
      const coverage = run.coverage.find(
        (item) => item.canonicalProblem === problem,
      )!;
      expect(coverage.expectedRowIds).toHaveLength(
        TARGET_EXPECTED_COUNTS[problem],
      );
      expect(coverage.detectedRowIds).toEqual(coverage.expectedRowIds);
      expect(coverage.missedRowIds).toEqual([]);
      expect(coverage.falsePositiveRowIds).toEqual([]);
    }
  });

  it("proves all raw workbook mutations survived production ingestion", () => {
    expect(run.rawProof.encodingReadBackRowIds).toEqual([
      "REG-ENC-001",
      "REG-ENC-002",
    ]);
    expect(run.rawProof.copyrightPopulation).toBeGreaterThan(0);
    expect(run.rawProof.sourceReferencePopulation).toBeGreaterThan(0);
    expect(run.rawProof.teacherVersionPopulation).toBeGreaterThan(0);
    expect(run.rawProof.submittedAtPopulation).toBeGreaterThan(0);
    expect(run.rawProof.lastUpdatedAtPopulation).toBeGreaterThan(0);
    expect(run.rawProof.activeUnitBearingNumericalRowIds).toEqual([
      "REG-UNIT-001",
      "REG-UNIT-002",
      "REG-UNIT-003",
    ]);
    expect(run.rawProof.inactiveNumericalAnswerRowIds).toEqual([
      "REG-INACTIVE-001",
      "REG-INACTIVE-002",
      "REG-INACTIVE-003",
      "REG-INACTIVE-004",
      "REG-INACTIVE-005",
    ]);
  });

  it("has no forbidden, unexpected, severity, or control-row contradictions", () => {
    for (const result of run.rowResults) {
      expect(result.missingRequired, result.rowId).toEqual([]);
      expect(result.forbiddenViolations, result.rowId).toEqual([]);
      expect(result.unexpectedAdditional, result.rowId).toEqual([]);
      expect(result.severityViolations, result.rowId).toEqual([]);
    }
    expect(run.batchIssues).toEqual([]);
    expect(
      run.rows
        .flatMap((row) => row.issues)
        .some((issue) => issue.scope === "batch"),
    ).toBe(false);
  });

  it("reads the generated XLSX using the production workbook reader (parseXlsx) and asserts workbook, worksheet, headers, and REG-BASE-001", async () => {
    const fixtureBuffer = fs.readFileSync(DEFAULT_FIXTURE_PATH);
    const file = new File(
      [fixtureBuffer],
      "validator-regression-fixture.xlsx",
      {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    );

    let resultData: any = null;
    let resultError: any = null;

    await parseXlsx({
      file,
      onSuccess: (data) => {
        resultData = data;
      },
      onError: (err) => {
        resultError = err;
      },
    });

    expect(resultError).toBeNull();
    expect(resultData).toBeDefined();

    // Assert: workbook opens and worksheet exists
    expect(resultData.columns).toBeDefined();
    expect(resultData.rawRows).toBeDefined();

    // Assert: all required headers exist and header names survive exactly
    for (const requiredHeader of REQUIRED_HEADERS) {
      expect(resultData.columns).toContain(requiredHeader);
    }
    expect(resultData.columns.slice(0, REQUIRED_HEADERS.length)).toEqual([
      ...REQUIRED_HEADERS,
    ]);

    // Assert: Question_ID survives exactly and REG-BASE-001 exists
    const regBaseRow = resultData.rawRows.find(
      (r: any) => String(r.Question_ID) === "REG-BASE-001",
    );
    expect(regBaseRow).toBeDefined();
    expect(regBaseRow.Question_ID).toBe("REG-BASE-001");
  });

  it("asserts U+FFFD read-back and BROKEN_ENCODING/BLOCK emissions for REG-ENC-001/002 and zero false positives for control", () => {
    const enc001 = run.rows.find(
      (r) => r.metadata.questionId === "REG-ENC-001",
    );
    const enc002 = run.rows.find(
      (r) => r.metadata.questionId === "REG-ENC-002",
    );
    const control = run.rows.find(
      (r) => r.metadata.questionId === "REG-ENC-CONTROL",
    );

    expect(enc001).toBeDefined();
    expect(enc002).toBeDefined();
    expect(control).toBeDefined();

    // Read-back assertion: U+FFFD is present in the raw cell data of the two mutation rows
    const enc001StemRaw = enc001?.raw?.cells["Question_Stem"]?.rawText || "";
    const enc002ExpRaw = enc002?.raw?.cells["Explanation"]?.rawText || "";
    const controlStemRaw = control?.raw?.cells["Question_Stem"]?.rawText || "";

    expect(enc001StemRaw).toContain("\uFFFD");
    expect(enc002ExpRaw).toContain("\uFFFD");
    expect(controlStemRaw).not.toContain("\uFFFD");

    // Required: REG-ENC-001 and REG-ENC-002 emit BROKEN_ENCODING/BLOCK
    const enc001Issue = enc001?.issues.find(
      (i) =>
        i.ruleId === "BROKEN_ENCODING" ||
        i.canonicalProblem === "BROKEN_ENCODING",
    );
    expect(enc001Issue).toBeDefined();
    expect(enc001Issue?.severity).toBe("block");

    const enc002Issue = enc002?.issues.find(
      (i) =>
        i.ruleId === "BROKEN_ENCODING" ||
        i.canonicalProblem === "BROKEN_ENCODING",
    );
    expect(enc002Issue).toBeDefined();
    expect(enc002Issue?.severity).toBe("block");

    // Required: control emits no BROKEN_ENCODING
    const controlBrokenEncodingIssue = control?.issues.find(
      (i) =>
        i.ruleId === "BROKEN_ENCODING" ||
        i.canonicalProblem === "BROKEN_ENCODING",
    );
    expect(controlBrokenEncodingIssue).toBeUndefined();
  });

  it("verifies raw read-back of Copyright_Status and Source_Reference and asserts COPYRIGHT_UNVERIFIED for 5 risk rows and 0 for control", () => {
    const riskIds = [
      "REG-COPY-001",
      "REG-COPY-002",
      "REG-COPY-003",
      "REG-COPY-004",
      "REG-COPY-005",
    ];

    for (const id of riskIds) {
      const row = run.rows.find((r) => r.metadata.questionId === id);
      expect(row).toBeDefined();

      // Verify raw read-back of Copyright_Status and Source_Reference
      const rawStatus = row?.raw?.cells["Copyright_Status"]?.rawText;
      const rawRef = row?.raw?.cells["Source_Reference"]?.rawText;
      expect(rawStatus).toBeDefined();
      expect(rawStatus?.trim().length).toBeGreaterThan(0);
      expect(rawRef).toBeDefined();
      expect(rawRef?.trim().length).toBeGreaterThan(0);

      // Assert COPYRIGHT_UNVERIFIED issue emitted
      const issue = row?.issues.find(
        (i) =>
          i.ruleId === "COPYRIGHT_UNVERIFIED" ||
          i.canonicalProblem === "COPYRIGHT_UNVERIFIED",
      );
      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("block");

      // Assert evidence structure includes raw status, normalized status, source and matched indicators
      expect(issue?.evidence).toBeDefined();
      expect(issue?.evidence?.rawCopyrightStatus).toBeDefined();
      expect(issue?.evidence?.normalizedCopyrightStatus).toBeDefined();
      expect(issue?.evidence?.rawSourceReference).toBeDefined();
      expect(issue?.evidence?.matchedIndicators).toBeDefined();
      expect(Array.isArray(issue?.evidence?.matchedIndicators)).toBe(true);
      expect(
        (issue?.evidence?.matchedIndicators as string[]).length,
      ).toBeGreaterThan(0);
    }

    // Control row check: Teacher Created + Created by faculty
    const controlRow = run.rows.find(
      (r) => r.metadata.questionId === "REG-COPY-CONTROL",
    );
    expect(controlRow).toBeDefined();
    const controlStatus = controlRow?.raw?.cells["Copyright_Status"]?.rawText;
    const controlRef = controlRow?.raw?.cells["Source_Reference"]?.rawText;
    expect(controlStatus).toBe("Teacher Created");
    expect(controlRef).toBe("Created by faculty");

    const controlCopyrightIssue = controlRow?.issues.find(
      (i) =>
        i.ruleId === "COPYRIGHT_UNVERIFIED" ||
        i.canonicalProblem === "COPYRIGHT_UNVERIFIED",
    );
    expect(controlCopyrightIssue).toBeUndefined();
  });

  it("asserts WRONG_SUBJECT_TAG (3/3, REVIEW), VERSION_TIMESTAMP_CONFLICT (3/3, REVIEW), evidence details, and invalid date behavior", () => {
    // 1. Subject Rows: REG-SUBJ-001, REG-SUBJ-002, REG-SUBJ-003
    const subjectIds = ["REG-SUBJ-001", "REG-SUBJ-002", "REG-SUBJ-003"];
    for (const id of subjectIds) {
      const row = run.rows.find((r) => r.metadata.questionId === id);
      expect(row).toBeDefined();
      const issue = row?.issues.find(
        (i) =>
          i.ruleId === "WRONG_SUBJECT_TAG" ||
          i.canonicalProblem === "WRONG_SUBJECT_TAG",
      );
      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("review");
    }

    // 2. Version Rows: REG-VERS-001, REG-VERS-002, REG-VERS-003
    const versionIds = ["REG-VERS-001", "REG-VERS-002", "REG-VERS-003"];
    for (const id of versionIds) {
      const row = run.rows.find((r) => r.metadata.questionId === id);
      expect(row).toBeDefined();
      const issue = row?.issues.find(
        (i) =>
          i.ruleId === "VERSION_TIMESTAMP_CONFLICT" ||
          i.canonicalProblem === "VERSION_TIMESTAMP_CONFLICT",
      );
      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("review");

      // Evidence contains raw and parsed timestamps
      expect(issue?.evidence).toBeDefined();
      expect(issue?.evidence?.rawSubmittedAt).toBe("2026-07-20T10:00:00Z");
      expect(issue?.evidence?.rawLastUpdatedAt).toBe("2026-07-19T10:00:00Z");
      expect(issue?.evidence?.submittedAt).toBeDefined();
      expect(issue?.evidence?.lastUpdatedAt).toBeDefined();
      expect(issue?.evidence?.submittedParser).toBe("Date.parse");
      expect(issue?.evidence?.updatedParser).toBe("Date.parse");
    }

    // 3. Version Control: REG-VERS-CONTROL has no conflict
    const controlRow = run.rows.find(
      (r) => r.metadata.questionId === "REG-VERS-CONTROL",
    );
    expect(controlRow).toBeDefined();
    const controlConflictIssue = controlRow?.issues.find(
      (i) =>
        i.ruleId === "VERSION_TIMESTAMP_CONFLICT" ||
        i.canonicalProblem === "VERSION_TIMESTAMP_CONFLICT",
    );
    expect(controlConflictIssue).toBeUndefined();

    // 4. Invalid dates are never replaced with current time
    const invalidParsed = parseTimestamp("not-a-valid-date-string");
    expect(invalidParsed).toBeDefined();
    expect(invalidParsed?.valid).toBe(false);
    expect(invalidParsed?.parsedValue).toBeUndefined();
  });

  it("asserts active numerical unit rows (3/3 BLOCK), numeric controls (0 false positives), inactive fields (5/5 REVIEW), and raw text preservation", () => {
    // 1. Active NUMERICAL unit rows: REG-UNIT-001 (9.8 m/s²), REG-UNIT-002 (3 mol), REG-UNIT-003 (8 m)
    const unitRows = [
      ["REG-UNIT-001", "9.8 m/s\u00B2"],
      ["REG-UNIT-002", "3 mol"],
      ["REG-UNIT-003", "8 m"],
    ] as const;

    for (const [id, expectedRawText] of unitRows) {
      const row = run.rows.find((r) => r.metadata.questionId === id);
      expect(row).toBeDefined();

      // Preserve raw Numerical_Answer before parsing
      const rawText = row?.raw?.cells["Numerical_Answer"]?.rawText;
      expect(rawText).toBe(expectedRawText);

      // UNIT_EMBEDDED_IN_NUMERIC_ANSWER = 3/3, BLOCK
      const issue = row?.issues.find(
        (i) =>
          i.ruleId === "UNIT_EMBEDDED_IN_NUMERIC_ANSWER" ||
          i.canonicalProblem === "UNIT_EMBEDDED_IN_NUMERIC_ANSWER",
      );
      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("block");
    }

    // 2. Numeric controls: REG-UNIT-CONTROL-001 (1e-3), REG-UNIT-CONTROL-002 (-4.5), REG-UNIT-CONTROL-003 (.5)
    const controlRows = [
      ["REG-UNIT-CONTROL-001", "1e-3"],
      ["REG-UNIT-CONTROL-002", "-4.5"],
      ["REG-UNIT-CONTROL-003", ".5"],
    ] as const;

    for (const [id, expectedRawText] of controlRows) {
      const row = run.rows.find((r) => r.metadata.questionId === id);
      expect(row).toBeDefined();

      // Preserve raw Numerical_Answer before parsing
      const rawText = row?.raw?.cells["Numerical_Answer"]?.rawText;
      expect(rawText).toBe(expectedRawText);

      // Zero unit false positives
      const issue = row?.issues.find(
        (i) =>
          i.ruleId === "UNIT_EMBEDDED_IN_NUMERIC_ANSWER" ||
          i.canonicalProblem === "UNIT_EMBEDDED_IN_NUMERIC_ANSWER",
      );
      expect(issue).toBeUndefined();
    }

    // 3. Inactive Numerical_Answer rows: REG-INACTIVE-001 to REG-INACTIVE-005
    const inactiveIds = [
      "REG-INACTIVE-001",
      "REG-INACTIVE-002",
      "REG-INACTIVE-003",
      "REG-INACTIVE-004",
      "REG-INACTIVE-005",
    ];

    for (const id of inactiveIds) {
      const row = run.rows.find((r) => r.metadata.questionId === id);
      expect(row).toBeDefined();

      // INACTIVE_FIELD_CONTAINS_DATA = 5/5, REVIEW
      const issue = row?.issues.find(
        (i) =>
          i.ruleId === "INACTIVE_FIELD_CONTAINS_DATA" ||
          i.canonicalProblem === "INACTIVE_FIELD_CONTAINS_DATA",
      );
      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("review");

      // Verify allowed issues for MATRIX_MATCH and Hotspot
      if (id === "REG-INACTIVE-004") {
        // MATRIX_MATCH allowed: UNSUPPORTED_TYPE_FOR_TARGET_EXPORT, MATRIX_MATCH_INCOMPLETE
        for (const issueItem of row?.issues || []) {
          const canonical = issueItem.canonicalProblem || issueItem.ruleId;
          expect([
            "INACTIVE_FIELD_CONTAINS_DATA",
            "UNSUPPORTED_TYPE_FOR_TARGET_EXPORT",
            "MATRIX_MATCH_INCOMPLETE",
          ]).toContain(canonical);
        }
      } else if (id === "REG-INACTIVE-005") {
        // Hotspot allowed: UNSUPPORTED_TYPE_FOR_TARGET_EXPORT, HOTSPOT_CONFIGURATION_INCOMPLETE
        for (const issueItem of row?.issues || []) {
          const canonical = issueItem.canonicalProblem || issueItem.ruleId;
          expect([
            "INACTIVE_FIELD_CONTAINS_DATA",
            "UNSUPPORTED_TYPE_FOR_TARGET_EXPORT",
            "HOTSPOT_CONFIGURATION_INCOMPLETE",
          ]).toContain(canonical);
        }
      }
    }
  });

  it("validates manifest sidecar integrity and fails on duplicate IDs, unknown severities, missing arrays, unknown workbook rows, and missing expected rows", () => {
    const validJson = JSON.stringify({
      fixtureVersion: "1.0.0",
      requiredHeaders: ["Question_ID"],
      rows: {
        "REG-001": {
          requiredCanonicalProblems: ["BROKEN_ENCODING"],
          forbiddenCanonicalProblems: [],
          allowedAdditionalCanonicalProblems: [],
          expectedSeverityByProblem: { BROKEN_ENCODING: "BLOCK" },
        },
      },
    });
    const validWorkbookRows = ["REG-001"];

    // 1. Valid manifest passes cleanly
    const validResult = validateManifest(validJson, validWorkbookRows);
    expect(validResult.errors).toEqual([]);

    // 2. Duplicate IDs fail
    const duplicateJson = `{
      "fixtureVersion": "1.0.0",
      "requiredHeaders": ["Question_ID"],
      "rows": {
        "REG-001": { "requiredCanonicalProblems": [], "forbiddenCanonicalProblems": [], "allowedAdditionalCanonicalProblems": [], "expectedSeverityByProblem": {} },
        "REG-001": { "requiredCanonicalProblems": [], "forbiddenCanonicalProblems": [], "allowedAdditionalCanonicalProblems": [], "expectedSeverityByProblem": {} }
      }
    }`;
    const duplicateResult = validateManifest(duplicateJson, validWorkbookRows);
    expect(
      duplicateResult.errors.some((e) => e.includes("duplicate row ID")),
    ).toBe(true);

    // 3. Unknown severities fail
    const unknownSeverityJson = JSON.stringify({
      fixtureVersion: "1.0.0",
      requiredHeaders: ["Question_ID"],
      rows: {
        "REG-001": {
          requiredCanonicalProblems: ["BROKEN_ENCODING"],
          forbiddenCanonicalProblems: [],
          allowedAdditionalCanonicalProblems: [],
          expectedSeverityByProblem: {
            BROKEN_ENCODING: "INVALID_SEVERITY_NAME",
          },
        },
      },
    });
    const unknownSevResult = validateManifest(
      unknownSeverityJson,
      validWorkbookRows,
    );
    expect(
      unknownSevResult.errors.some((e) => e.includes("unknown severity")),
    ).toBe(true);

    // 4. Missing arrays fail
    const missingArrayJson = JSON.stringify({
      fixtureVersion: "1.0.0",
      requiredHeaders: ["Question_ID"],
      rows: {
        "REG-001": {
          requiredCanonicalProblems: null,
          forbiddenCanonicalProblems: [],
          allowedAdditionalCanonicalProblems: [],
          expectedSeverityByProblem: {},
        },
      },
    });
    const missingArrayResult = validateManifest(
      missingArrayJson,
      validWorkbookRows,
    );
    expect(
      missingArrayResult.errors.some((e) => e.includes("missing array")),
    ).toBe(true);

    // 5. Unknown workbook rows fail
    const unknownWorkbookResult = validateManifest(validJson, [
      "REG-001",
      "REG-UNEXPECTED-WORKBOOK-ROW",
    ]);
    expect(
      unknownWorkbookResult.errors.some((e) => e.includes("unknown rows")),
    ).toBe(true);

    // 6. Missing expected rows fail
    const missingExpectedResult = validateManifest(validJson, []);
    expect(
      missingExpectedResult.errors.some((e) =>
        e.includes("expected rows missing in workbook"),
      ),
    ).toBe(true);
  });

  it("calculates fixture coverage strictly from final post-deduplication issues and asserts hard-fail rules", () => {
    // 1. Coverage detection comes ONLY from final post-deduplication issues on QuestionRow
    for (const item of run.coverage) {
      for (const detectedId of item.detectedRowIds) {
        const row = run.rows.find(
          (r) =>
            (r.metadata.questionId || `source-row-${r.sourceRowNumber}`) ===
            detectedId,
        );
        expect(row).toBeDefined();

        // Must match a final issue attached to row.issues
        const matchingFinalIssue = row?.issues.some((issue) => {
          const canonical =
            issue.canonicalProblem || getCanonicalProblem(issue.ruleId);
          return canonical === item.canonicalProblem;
        });
        expect(
          matchingFinalIssue,
          `Row ${detectedId} must have matching final issue for ${item.canonicalProblem}`,
        ).toBe(true);
      }
    }

    // 2. Mapping hashes must match exactly
    expect(run.ingestionMappingHash).toBe(run.reportMappingHash);

    // 3. Fixture headers must all be present
    expect(run.columns).toEqual(expect.arrayContaining([...REQUIRED_HEADERS]));

    // 4. Raw mutations must be present
    expect(run.rawProof.encodingReadBackRowIds).toHaveLength(2);
    expect(run.rawProof.activeUnitBearingNumericalRowIds).toHaveLength(3);
    expect(run.rawProof.inactiveNumericalAnswerRowIds).toHaveLength(5);

    // 5. Per-manifest-row checks
    for (const result of run.rowResults) {
      expect(
        result.missingRequired,
        `Row ${result.rowId} missing required`,
      ).toEqual([]);
      expect(
        result.forbiddenViolations,
        `Row ${result.rowId} forbidden violations`,
      ).toEqual([]);
      expect(
        result.unexpectedAdditional,
        `Row ${result.rowId} unexpected additional`,
      ).toEqual([]);
      expect(
        result.severityViolations,
        `Row ${result.rowId} severity violations`,
      ).toEqual([]);
    }
  });
});
