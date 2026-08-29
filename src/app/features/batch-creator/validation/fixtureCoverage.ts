import { QuestionRow } from "../core/rowTypes";

export interface FixtureExpectation {
  questionId: string;
  issueTag: string;
  expectedCanonicalProblem: string;
}

export interface FixtureCoverage {
  issueTag: string;
  expectedCanonicalProblem: string;
  expectedRows: string[];
  applicableRows: string[];
  detectedRows: string[];
  missedRows: string[];
  nonApplicableRows: string[];
  reclassifiedAsInactiveFieldConflict: string[];
}

export const REPORTED_FIXTURE_CATEGORIES = [
  "BROKEN_ENCODING",
  "COPYRIGHT_UNVERIFIED",
  "WRONG_SUBJECT_TAG",
  "VERSION_TIMESTAMP_CONFLICT",
  "UNIT_EMBEDDED_IN_NUMERIC_ANSWER",
  "INACTIVE_FIELD_CONTAINS_DATA",
] as const;

function finalIssueMatches(
  row: QuestionRow | undefined,
  problem: string,
): boolean {
  return !!row?.issues.some(
    (issue) =>
      issue.canonicalProblem === problem ||
      (!issue.canonicalProblem && issue.ruleId === problem),
  );
}

function isExpectationApplicable(
  expectation: FixtureExpectation,
  row: QuestionRow | undefined,
): boolean {
  if (!row) return false;
  if (
    expectation.expectedCanonicalProblem !== "UNIT_EMBEDDED_IN_NUMERIC_ANSWER"
  ) {
    return true;
  }
  const question = row.normalizedQuestion as any;
  return (
    row.canonicalType === "TEXT_ENTRY" &&
    ["numeric", "integer"].includes(
      String(question?.responseMode || question?.mode),
    )
  );
}

export function calculateFixtureCoverage(
  expectations: FixtureExpectation[],
  validatedRows: QuestionRow[],
  categories: readonly string[] = REPORTED_FIXTURE_CATEGORIES,
): FixtureCoverage[] {
  const rowById = new Map(
    validatedRows
      .filter((row) => row.metadata.questionId)
      .map((row) => [row.metadata.questionId!, row]),
  );
  const categoryOrder = Array.from(
    new Set([...categories, ...expectations.map((item) => item.issueTag)]),
  );

  return categoryOrder.map((issueTag) => {
    const grouped = expectations.filter((item) => item.issueTag === issueTag);
    const expectedCanonicalProblem =
      grouped[0]?.expectedCanonicalProblem || issueTag;
    const applicable = grouped.filter((expectation) =>
      isExpectationApplicable(expectation, rowById.get(expectation.questionId)),
    );
    const detected = applicable.filter((expectation) =>
      finalIssueMatches(
        rowById.get(expectation.questionId),
        expectation.expectedCanonicalProblem,
      ),
    );
    const detectedIds = new Set(detected.map((item) => item.questionId));
    const applicableIds = new Set(applicable.map((item) => item.questionId));
    const nonApplicable = grouped.filter(
      (expectation) => !applicableIds.has(expectation.questionId),
    );

    return {
      issueTag,
      expectedCanonicalProblem,
      expectedRows: grouped.map((item) => item.questionId),
      applicableRows: applicable.map((item) => item.questionId),
      detectedRows: detected.map((item) => item.questionId),
      missedRows: applicable
        .filter((item) => !detectedIds.has(item.questionId))
        .map((item) => item.questionId),
      nonApplicableRows: nonApplicable.map((item) => item.questionId),
      reclassifiedAsInactiveFieldConflict: nonApplicable
        .filter((item) =>
          finalIssueMatches(
            rowById.get(item.questionId),
            "INACTIVE_FIELD_CONTAINS_DATA",
          ),
        )
        .map((item) => item.questionId),
    };
  });
}

export function assertFixtureCoverageIntegrity(
  coverage: FixtureCoverage[],
  validatedRows: QuestionRow[],
): void {
  const rowById = new Map(
    validatedRows
      .filter((row) => row.metadata.questionId)
      .map((row) => [row.metadata.questionId!, row]),
  );

  for (const item of coverage) {
    const emittedCount = validatedRows.reduce(
      (count, row) =>
        count + (finalIssueMatches(row, item.expectedCanonicalProblem) ? 1 : 0),
      0,
    );
    if (item.detectedRows.length > emittedCount) {
      throw new Error(
        `Fixture coverage contradiction for ${item.issueTag}: ${item.detectedRows.length} detected rows but only ${emittedCount} final emitted issues.`,
      );
    }
    for (const rowId of item.detectedRows) {
      if (
        !finalIssueMatches(rowById.get(rowId), item.expectedCanonicalProblem)
      ) {
        throw new Error(
          `Fixture coverage contradiction for ${item.issueTag} on row ${rowId}.`,
        );
      }
    }
  }
}

export function extractFixtureExpectations(
  rows: QuestionRow[],
  tagColumn = "Known_Issue_Tag",
): FixtureExpectation[] {
  const expectations: FixtureExpectation[] = [];
  for (const row of rows) {
    const questionId = row.metadata.questionId;
    const rawTag = row.raw?.cells[tagColumn]?.rawText ?? row.rawRow[tagColumn];
    if (!questionId || !rawTag) continue;
    for (const issueTag of String(rawTag)
      .split(/[,;|]/)
      .map((tag) => tag.trim())
      .filter(Boolean)) {
      expectations.push({
        questionId,
        issueTag,
        expectedCanonicalProblem: issueTag,
      });
    }
  }
  return expectations;
}
