import { describe, expect, it } from "vitest";
import { RawSheetRow } from "../core/rowTypes";
import {
  createCanonicalColumnMapping,
  getMappingMetadata,
} from "../normalization/canonicalColumnMapping";
import { normalizeRow } from "../normalization/normalizeRow";
import { createRawImportedRow, getMappedCellText } from "../upload/rawCellData";
import {
  assertFixtureCoverageIntegrity,
  calculateFixtureCoverage,
  FixtureExpectation,
} from "./fixtureCoverage";
import { BROKEN_ENCODING } from "../rules/contentIntegrity.rules";

describe("final data-flow and coverage integrity", () => {
  it("does not invent mapped columns that are absent from workbook headers", () => {
    const mapping = createCanonicalColumnMapping([
      "Question_ID",
      "Question_Type",
      "Question_Stem",
    ]);

    expect(mapping.copyrightStatus).toBeUndefined();
    expect(mapping.sourceReference).toBeUndefined();
    expect(mapping.teacherVersion).toBeUndefined();
    expect(mapping.submittedAt).toBeUndefined();
    expect(mapping.lastUpdatedAt).toBeUndefined();
    expect(getMappingMetadata(mapping).hash).toMatch(/^[a-f0-9]{8}$/);
  });

  it("uses the exact canonical mapping object throughout a validation run", () => {
    const mapping = createCanonicalColumnMapping([
      "Question_ID",
      "Copyright_Status",
      "Source_Reference",
    ]);
    const ingestionContext = { mapping };
    const reportContext = { mapping };

    expect(mapping).toBe(ingestionContext.mapping);
    expect(mapping).toBe(reportContext.mapping);
    expect(Object.isFrozen(mapping)).toBe(true);
  });

  it("preserves every source cell before normalization and exposes explicit mapped reads", () => {
    const raw = createRawImportedRow(12, {
      Question_ID: {
        rawValue: "Q-12",
        rawText: "Q-12",
        cellType: "String",
      },
      Copyright_Status: {
        rawValue: "  Unknown  ",
        rawText: "  Unknown  ",
        cellType: "String",
      },
      Unmapped_Audit_Column: {
        rawValue: 42,
        rawText: "42",
        cellType: "Number",
      },
    });

    const read = getMappedCellText(raw, "Copyright_Status");
    expect(read).toMatchObject({
      mappedColumn: "Copyright_Status",
      found: true,
      rawValue: "  Unknown  ",
      rawText: "  Unknown  ",
    });
    expect(raw.cells.Unmapped_Audit_Column.rawValue).toBe(42);
    expect(Object.isFrozen(raw)).toBe(true);
    expect(Object.isFrozen(raw.cells)).toBe(true);
    expect(Object.isFrozen(raw.cells.Copyright_Status)).toBe(true);
  });

  it("propagates raw copyright and parsed timestamp metadata from mapped source cells", () => {
    const mapping = createCanonicalColumnMapping([
      "Question_ID",
      "Question_Type",
      "Question_Stem",
      "Option_A",
      "Option_B",
      "Correct_Answer",
      "Copyright_Status",
      "Source_Reference",
      "Teacher_Version",
      "Submitted_At",
      "Last_Updated_At",
    ]);
    const values = {
      Question_ID: "Q-1",
      Question_Type: "MCQ",
      Question_Stem: "Which answer is correct?",
      Option_A: "A",
      Option_B: "B",
      Correct_Answer: "A",
      Copyright_Status: "Unknown",
      Source_Reference: "Screenshot from coaching material",
      Teacher_Version: "v2",
      Submitted_At: "2026-07-20T10:00:00Z",
      Last_Updated_At: "2026-07-19T10:00:00Z",
    };
    const raw = createRawImportedRow(
      2,
      Object.fromEntries(
        Object.entries(values).map(([columnName, rawValue]) => [
          columnName,
          { rawValue, rawText: rawValue },
        ]),
      ),
    );
    const row = normalizeRow(
      {
        ...values,
        __internalId: "row-2",
        __sourceRowNumber: 2,
        __rawImportedRow: raw,
      } as RawSheetRow,
      mapping,
    );

    expect(row.raw).toBe(raw);
    expect(row.metadata.rawCopyrightStatus).toBe("Unknown");
    expect(row.metadata.copyrightStatus).toBe("unknown");
    expect(row.metadata.rawSourceReference).toBe(
      "Screenshot from coaching material",
    );
    expect(row.metadata.submittedTimestamp).toMatchObject({
      valid: true,
      rawValue: "2026-07-20T10:00:00Z",
    });
    expect(row.metadata.lastUpdatedTimestamp).toMatchObject({
      valid: true,
      rawValue: "2026-07-19T10:00:00Z",
    });
  });

  it("reports actual code points for an unmistakable mojibake sequence", () => {
    const raw = createRawImportedRow(3, {
      Question_Stem: {
        rawValue: "Fran\u00C3\u00A7ais",
        rawText: "Fran\u00C3\u00A7ais",
      },
    });
    const issues = BROKEN_ENCODING.validate(
      {
        id: "row-3",
        sourceRowNumber: 3,
        raw,
        rawRow: { Question_Stem: "Fran\u00C3\u00A7ais" },
        normalizedQuestion: { type: "MCQ", stem: "Francais", options: [] },
        metadata: { questionId: "Q-3" },
        mediaReferences: [],
        mathReferences: [],
        scoringConfig: { marks: 1, partialMarking: false },
        history: [],
        status: "normalized",
        issues: [],
      } as any,
      { allRows: [], columnMapping: { stem: "Question_Stem" } },
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].evidence?.mojibakeSequences).toEqual(["\u00C3\u00A7"]);
    expect(issues[0].evidence?.codePointTrace).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ codePoint: "U+00C3" }),
        expect.objectContaining({ codePoint: "U+00A7" }),
      ]),
    );
  });

  it("derives detections only from final post-deduplication row issues", () => {
    const expectations: FixtureExpectation[] = [
      {
        questionId: "Q-1",
        issueTag: "COPYRIGHT_UNVERIFIED",
        expectedCanonicalProblem: "COPYRIGHT_UNVERIFIED",
      },
      {
        questionId: "Q-2",
        issueTag: "COPYRIGHT_UNVERIFIED",
        expectedCanonicalProblem: "COPYRIGHT_UNVERIFIED",
      },
    ];
    const rows = [
      {
        id: "row-1",
        metadata: { questionId: "Q-1" },
        issues: [
          {
            id: "issue-1",
            ruleId: "COPYRIGHT_UNVERIFIED",
            canonicalProblem: "COPYRIGHT_UNVERIFIED",
          },
        ],
      },
      {
        id: "row-2",
        metadata: { questionId: "Q-2" },
        issues: [],
      },
    ] as any;

    const coverage = calculateFixtureCoverage(expectations, rows).find(
      (item) => item.issueTag === "COPYRIGHT_UNVERIFIED",
    )!;
    expect(coverage.expectedRows).toEqual(["Q-1", "Q-2"]);
    expect(coverage.detectedRows).toEqual(["Q-1"]);
    expect(coverage.missedRows).toEqual(["Q-2"]);
    expect(() =>
      assertFixtureCoverageIntegrity([coverage], rows),
    ).not.toThrow();
  });

  it("fails report integrity when coverage claims a detection with no final issue", () => {
    const impossibleCoverage = [
      {
        issueTag: "BROKEN_ENCODING",
        expectedCanonicalProblem: "BROKEN_ENCODING",
        expectedRows: ["Q-1"],
        applicableRows: ["Q-1"],
        detectedRows: ["Q-1"],
        missedRows: [],
        nonApplicableRows: [],
        reclassifiedAsInactiveFieldConflict: [],
      },
    ];
    const rows = [
      { id: "row-1", metadata: { questionId: "Q-1" }, issues: [] },
    ] as any;

    expect(() =>
      assertFixtureCoverageIntegrity(impossibleCoverage, rows),
    ).toThrow(/Fixture coverage contradiction/);
  });
});
