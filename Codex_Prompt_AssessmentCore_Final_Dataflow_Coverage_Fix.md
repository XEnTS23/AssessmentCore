# Codex Agent Prompt — Final AssessmentCore Data-Flow and Coverage Integrity Fix

You are working inside the **AssessmentCore** validation-engine repository.

Act as a senior TypeScript engineer specializing in:

- spreadsheet ingestion;
- canonical data modeling;
- raw-value preservation;
- rule execution;
- diagnostic reporting;
- fixture-driven regression testing.

Your task is to make a **surgical final correction** to the current validator.

Do not redesign the validation engine.

Do not weaken, remove, rename, or reclassify already working rules.

Do not modify the fixture merely to make tests pass.

The two real defects are:

1. New mapped columns are displayed in the report but their values are not reaching the raw/canonical rows used by the rules.
2. Fixture coverage reports success based on expected tags rather than actual emitted validation issues.

Fix those defects and prove the fixes with executable tests and a regenerated diagnostic report.

---

# 1. Current baseline

Latest build:

```text
Validator Build: 4.1.0-mapping-diagnostics-fix
Rule Set Version: 4.1.0
Normalizer Version: 1.6.1
```

Current summary:

```text
Total Rows: 120
Valid: 28
Caution: 1
Needs Review: 41
Rejected: 50
```

The following behavior is already working and must remain unchanged:

- `POSITIVE_MARKS_INVALID`
- suppression of `MARKS_INVALID`
- prerequisite suppression of `NEGATIVE_MARKS_EXCEED_POSITIVE`
- integer subtype preservation
- `INTEGER_ANSWER_NOT_INTEGER`
- malformed LaTeX detection
- suppression of duplicate LaTeX issues
- Unicode math acceptance
- `MATRIX_MATCH -> UNSUPPORTED`
- `Hotspot -> UNSUPPORTED`
- `UNSUPPORTED_TYPE_FOR_TARGET_EXPORT`
- `MATRIX_MATCH_INCOMPLETE`
- `HOTSPOT_CONFIGURATION_INCOMPLETE`
- explanation confidence and evidence
- `EXPLANATION_RESULT_MISMATCH`
- `EXPLANATION_KEY_MISMATCH`
- `EXPLANATION_FORMAT_INCOMPATIBLE`
- MCQ prerequisite suppression
- duplicate question ID detection
- duplicate stem related-row context
- subject/chapter taxonomy validation
- `WRONG_SUBJECT_TAG`
- `INACTIVE_FIELD_CONTAINS_DATA`
- rule execution diagnostics
- suppressed-rule diagnostics

Add non-regression tests for all of the above before changing the failing code.

---

# 2. Confirmed contradictions in the current report

The report displays these mappings:

```json
{
  "copyrightStatus": "Copyright_Status",
  "sourceReference": "Source_Reference",
  "teacherVersion": "Teacher_Version",
  "submittedAt": "Submitted_At",
  "lastUpdatedAt": "Last_Updated_At"
}
```

But raw population diagnostics say:

```text
Copyright_Status populated: 0/120
Source_Reference populated: 0/120
Teacher_Version populated: 0/120
Submitted_At populated: 0/120
Last_Updated_At populated: 0/120
```

The report also claims:

```text
BROKEN_ENCODING: 2/2
COPYRIGHT_UNVERIFIED: 5/5
VERSION_TIMESTAMP_CONFLICT: 3/3
UNIT_EMBEDDED_IN_NUMERIC_ANSWER: 3/3
```

while rule diagnostics show:

```text
BROKEN_ENCODING issues emitted: 0
COPYRIGHT_UNVERIFIED issues emitted: 0
VERSION_TIMESTAMP_CONFLICT issues emitted: 0
UNIT_EMBEDDED_IN_NUMERIC_ANSWER issues emitted: 0
```

This is a report-integrity failure.

Coverage must never report detection when no final emitted issue exists.

---

# 3. Work in phases

Use the following sequence:

```text
Phase 1: inspect and document current data flow
Phase 2: add failing regression tests
Phase 3: fix mapping-to-row propagation
Phase 4: fix raw-value preservation
Phase 5: fix actual validation rules
Phase 6: rebuild fixture coverage from emitted issues
Phase 7: regenerate report
Phase 8: run all non-regression tests
```

Do not skip directly to changing rule conditions.

---

# 4. Inspect the exact active data path

Before editing, identify the actual files and functions responsible for:

1. Reading workbook headers
2. Reading workbook cells
3. Building inferred column mappings
4. Serializing mappings into the report
5. Building raw rows
6. Building canonical questions
7. Normalizing text
8. Normalizing numerical answers
9. Parsing copyright fields
10. Parsing version/timestamp fields
11. Executing validation rules
12. Deduplicating issues
13. Calculating final row status
14. Generating issue counts
15. Generating fixture coverage
16. Rendering the final Markdown report

Return a concise inspection note before modifying code:

```text
A. Mapping source of truth
B. Raw-row source of truth
C. Canonical-row source of truth
D. Validation issue source of truth
E. Fixture coverage source of truth
F. Root cause for each contradiction
G. Files to change
```

Do not assume the object printed in the report is the same object used by ingestion.

Prove object flow with temporary assertions or tests.

---

# 5. Establish one source of truth for column mapping

There must be one active `CanonicalColumnMapping` instance per validation run.

That exact object must be used by:

```text
workbook extraction
raw row construction
canonical row construction
validation rules
raw population diagnostics
report rendering
```

Do not maintain separate mapping copies for:

- report display;
- ingestion;
- tests;
- diagnostics.

Required shape:

```ts
interface CanonicalColumnMapping {
  options?: string[];
  stem?: string;
  correctAnswer?: string;
  type?: string;
  explanation?: string;
  questionId?: string;
  subject?: string;
  topic?: string;
  chapter?: string;
  difficulty?: string;
  marks?: string;
  negativeMarks?: string;
  partialMarkingRule?: string;
  mediaRequired?: string;
  mediaFileName?: string;
  mediaSource?: string;
  acceptedAnswers?: string;
  tolerance?: string;
  units?: string;
  timeLimitSeconds?: string;
  language?: string;

  copyrightStatus?: string;
  sourceReference?: string;
  teacherVersion?: string;
  submittedAt?: string;
  lastUpdatedAt?: string;
}
```

Required mappings for the fixture:

```json
{
  "copyrightStatus": "Copyright_Status",
  "sourceReference": "Source_Reference",
  "teacherVersion": "Teacher_Version",
  "submittedAt": "Submitted_At",
  "lastUpdatedAt": "Last_Updated_At"
}
```

Add invariant:

```ts
expect(run.mapping).toBe(run.ingestionContext.mapping);
expect(run.mapping).toBe(run.reportContext.mapping);
```

If object identity is impractical, assert deep equality and version/hash equality.

Add mapping version/hash:

```ts
interface MappingMetadata {
  version: string;
  hash: string;
}
```

The report must show the same hash used by ingestion.

---

# 6. Fix header lookup and row extraction

The new mapping keys are displayed, but values are not populated.

Inspect whether row extraction still uses a fixed allowlist that excludes the new fields.

A common defect would look like:

```ts
const rawRow = {
  stem: row[mapping.stem],
  subject: row[mapping.subject],
  // new fields omitted
};
```

Replace ad hoc extraction with mapping-driven extraction or explicitly add all new fields.

Required canonical extraction:

```ts
const copyrightStatusRaw = getMappedCellText(
  sourceRow,
  mapping.copyrightStatus,
);

const sourceReferenceRaw = getMappedCellText(
  sourceRow,
  mapping.sourceReference,
);

const teacherVersionRaw = getMappedCellText(sourceRow, mapping.teacherVersion);

const submittedAtRaw = getMappedCellText(sourceRow, mapping.submittedAt);

const lastUpdatedAtRaw = getMappedCellText(sourceRow, mapping.lastUpdatedAt);
```

`getMappedCellText` must:

- accept undefined mappings safely;
- use the exact workbook header;
- preserve raw cell value;
- not normalize before raw storage;
- return explicit missing status.

Suggested return type:

```ts
interface MappedCellRead {
  mappedColumn?: string;
  found: boolean;
  rawValue?: unknown;
  rawText?: string;
}
```

Add tests proving:

```ts
expect(read.copyrightStatus.found).toBe(true);
expect(read.copyrightStatus.rawText).toBe("Unknown");
```

for an applicable fixture row.

---

# 7. Preserve immutable raw values

Use a raw row structure such as:

```ts
interface SourceCell {
  columnName: string;
  rawValue: unknown;
  rawText?: string;
  rowNumber: number;
  cellType?: string;
}

interface RawImportedRow {
  rowNumber: number;
  cells: Readonly<Record<string, Readonly<SourceCell>>>;
}
```

The raw row must include **all workbook columns**, not only mapped canonical columns.

This is required for:

- broken encoding;
- inactive fields;
- future validation rules;
- auditability.

Create raw rows before normalization.

Required order:

```text
read workbook cell
store raw value
freeze raw row
run raw integrity checks
build canonical fields
normalize canonical values
run semantic rules
```

Add tests:

```ts
expect(Object.isFrozen(row.raw)).toBe(true);
expect(Object.isFrozen(row.raw.cells)).toBe(true);
```

Also verify:

```ts
expect(row.raw.cells["Copyright_Status"].rawText).toBe("Unknown");
```

for a tagged copyright row.

Do not reconstruct raw fields from canonical values.

---

# 8. Fix raw population diagnostics

Population diagnostics must read from raw workbook cells.

Do not read from:

- inferred mapping definitions;
- canonical normalized properties;
- fixture issue tags.

Use:

```ts
function countPopulatedRawColumn(
  rows: RawImportedRow[],
  columnName: string,
): number {
  return rows.filter((row) => {
    const value = row.cells[columnName]?.rawText;
    return typeof value === "string" && value.trim().length > 0;
  }).length;
}
```

The report must include:

```text
Copyright_Status populated: actual count
Source_Reference populated: actual count
Teacher_Version populated: actual count
Submitted_At populated: actual count
Last_Updated_At populated: actual count
```

If the actual workbook contains zero values, the fixture coverage must not claim the corresponding rule was applicable.

The report must distinguish:

```text
mapped column exists
column has populated cells
rule applicable rows
rule emitted issues
```

---

# 9. Fix `COPYRIGHT_UNVERIFIED`

Rule input must come from the raw/canonical values created by the active mapping.

Required canonical fields:

```ts
copyrightStatus?: string;
sourceReference?: string;
rawCopyrightStatus?: string;
rawSourceReference?: string;
```

Normalize deterministically:

```ts
type CopyrightStatus =
  | "approved"
  | "teacher_created"
  | "licensed"
  | "public_domain"
  | "permission_granted"
  | "unknown"
  | "unverified";
```

Trigger in production mode when:

```ts
status === "unknown" ||
status === "unverified" ||
status is missing while source suggests third-party material
```

Third-party indicators:

```text
screenshot
coaching material
textbook
book
website
pdf
question bank
previous paper
scanned
copied
```

Evidence:

```ts
{
  sourceColumnStatus: mapping.copyrightStatus,
  sourceColumnReference: mapping.sourceReference,
  rawCopyrightStatus,
  normalizedCopyrightStatus,
  rawSourceReference,
  matchedIndicators,
  policyMode
}
```

Add exact-row tests for all five expected fixture rows.

Do not rely only on count tests.

---

# 10. Fix `VERSION_TIMESTAMP_CONFLICT`

Required canonical fields:

```ts
rawTeacherVersion?: string;
rawSubmittedAt?: string;
rawLastUpdatedAt?: string;

teacherVersion?: string;
submittedAt?: Date;
lastUpdatedAt?: Date;
```

Use explicit parse objects:

```ts
interface ParsedTimestamp {
  rawValue: string;
  valid: boolean;
  parsedValue?: Date;
  parser?: string;
  error?: string;
}
```

Trigger when:

```ts
submitted.valid &&
  updated.valid &&
  updated.parsedValue! < submitted.parsedValue!;
```

Add exact-row tests for all three expected fixture rows.

Report:

```text
Rows with both timestamp fields populated
Rows parsed successfully
Rows with parse failures
Rows with chronological conflicts
```

Do not claim 3/3 unless those three final rows emit the canonical problem.

---

# 11. Diagnose `BROKEN_ENCODING` using actual code points

The current report says:

```text
Rows containing U+FFFD: 0
```

but coverage claims 2/2.

Remove that contradiction.

For each fixture row tagged `BROKEN_ENCODING`:

1. Locate the exact intended source column.
2. Read its actual raw workbook value.
3. Print a short code-point trace around the suspicious position.
4. Detect the actual stored corruption token.

Utility:

```ts
function getCodePointTrace(value: string) {
  return Array.from(value).map((char, index) => ({
    index,
    char,
    codePoint: `U+${char
      .codePointAt(0)!
      .toString(16)
      .toUpperCase()
      .padStart(4, "0")}`,
  }));
}
```

Do not assume corruption is always `U+FFFD`.

Detect:

- replacement character;
- null byte;
- disallowed controls;
- actual mojibake sequence present in the fixture.

If the fixture tag claims broken encoding but the workbook contains no detectable corruption, report:

```text
Fixture mutation not present in workbook
```

and fail the fixture coverage test.

Do not mark it detected merely because the expected tag exists.

---

# 12. Verify numerical-answer applicability

Preserve current:

```text
INACTIVE_FIELD_CONTAINS_DATA = 5 emitted issues
```

Do not modify that rule.

For active numeric/integer rows:

```ts
const active =
  row.canonicalType === "TEXT_ENTRY" &&
  ["numeric", "integer"].includes(row.responseMode);
```

Calculate:

```text
Active numeric rows with raw Numerical_Answer
Active rows with recognized unit-bearing answers
UNIT_EMBEDDED_IN_NUMERIC_ANSWER emitted rows
```

Unit rule must compare exact row IDs.

If the three fixture tags are on inactive rows, fixture coverage must classify them as:

```text
non-applicable to UNIT_EMBEDDED_IN_NUMERIC_ANSWER
covered by INACTIVE_FIELD_CONTAINS_DATA
```

Do not claim active unit detection unless an active numeric row emits the issue.

---

# 13. Rebuild fixture coverage from actual final issues

This is the most important fix.

Coverage must be calculated from the final post-deduplication issue collection.

Source of truth:

```ts
row.finalIssues;
```

or the actual equivalent used to generate the row-level report.

Required implementation:

```ts
function calculateFixtureCoverage(
  expectedRows: FixtureExpectation[],
  validatedRows: ValidatedRow[],
): FixtureCoverage[] {
  const rowById = new Map(validatedRows.map((row) => [row.questionId, row]));

  return groupExpectations(expectedRows).map((group) => {
    const applicableRows = group.rows.filter((expectation) =>
      isExpectationApplicable(expectation, rowById.get(expectation.questionId)),
    );

    const detectedRows = applicableRows.filter((expectation) => {
      const row = rowById.get(expectation.questionId);

      return row?.finalIssues.some(
        (issue) =>
          issue.canonicalProblem === expectation.expectedCanonicalProblem,
      );
    });

    return {
      issueTag: group.issueTag,
      expectedRows: group.rows.map((row) => row.questionId),
      applicableRows: applicableRows.map((row) => row.questionId),
      detectedRows: detectedRows.map((row) => row.questionId),
      missedRows: applicableRows
        .filter((row) => !detectedRows.includes(row))
        .map((row) => row.questionId),
    };
  });
}
```

Never use these as proof of detection:

- `Known_Issue_Tag`;
- expected issue metadata;
- mutation metadata;
- test-case declaration;
- intended issue count.

They define expectations only.

---

# 14. Add coverage integrity assertions

Add invariants:

```ts
for (const coverage of report.fixtureCoverage) {
  for (const rowId of coverage.detectedRows) {
    const row = report.validatedRows.find((item) => item.questionId === rowId);

    expect(
      row?.finalIssues.some(
        (issue) => issue.canonicalProblem === coverage.expectedCanonicalProblem,
      ),
    ).toBe(true);
  }
}
```

Aggregate consistency:

```ts
const emittedCount =
  report.issueCountsByCanonicalProblem["COPYRIGHT_UNVERIFIED"] ?? 0;

const detectedCount =
  report.fixtureCoverage.find(
    (item) => item.issueTag === "COPYRIGHT_UNVERIFIED",
  )?.detectedRows.length ?? 0;

expect(detectedCount).toBeLessThanOrEqual(emittedCount);
```

For fixture tags expected to be unique to injected rows, exact equality may be used.

Add report-integrity failure:

```ts
if (coverage.detectedRows.length > 0 && emittedIssueCount === 0) {
  throw new Error(`Fixture coverage contradiction for ${coverage.issueTag}`);
}
```

The report generator must fail instead of producing contradictory output.

---

# 15. Add row-level proof for target rules

For each target category, report exact row IDs:

```text
BROKEN_ENCODING
Expected: [...]
Applicable: [...]
Detected: [...]
Missed: [...]

COPYRIGHT_UNVERIFIED
Expected: [...]
Applicable: [...]
Detected: [...]
Missed: [...]

VERSION_TIMESTAMP_CONFLICT
Expected: [...]
Applicable: [...]
Detected: [...]
Missed: [...]

UNIT_EMBEDDED_IN_NUMERIC_ANSWER
Expected: [...]
Applicable: [...]
Detected: [...]
Missed: [...]
Reclassified as inactive-field conflict: [...]
```

Do not provide only aggregate counts.

---

# 16. Non-regression test suite

Before completing, confirm:

```ts
expect(getRow("JEE26-PHY-006")).toHaveIssue("POSITIVE_MARKS_INVALID");

expect(getRow("JEE26-PHY-006")).not.toHaveIssue("MARKS_INVALID");

expect(getRow("JEE26-PHY-006")).not.toHaveIssue(
  "NEGATIVE_MARKS_EXCEED_POSITIVE",
);
```

```ts
expect(getRow("JEE26-PHY-007").responseMode).toBe("integer");

expect(getRow("JEE26-PHY-007")).toHaveIssue("INTEGER_ANSWER_NOT_INTEGER");
```

```ts
expect(getRow("JEE26-PHY-015")).toHaveIssue("MALFORMED_LATEX_DELIMITER");

expect(getRow("JEE26-PHY-015")).not.toHaveIssue("LATEX_STEM_DELIMITER_VALID");
```

```ts
expect(report.issueCountsByCanonicalProblem.WRONG_SUBJECT_TAG).toBe(3);

expect(report.issueCountsByCanonicalProblem.INACTIVE_FIELD_CONTAINS_DATA).toBe(
  5,
);
```

```ts
for (const row of rowsWithRawType("MATRIX_MATCH")) {
  expect(row.canonicalType).toBe("UNSUPPORTED");
  expect(row).toHaveIssue("UNSUPPORTED_TYPE_FOR_TARGET_EXPORT");
}
```

```ts
const explanationIssue = getRow("JEE26-CHE-002").getIssue(
  "EXPLANATION_RESULT_MISMATCH",
);

expect(explanationIssue.severity).toBe("BLOCK");
expect(explanationIssue.evidence.confidence).toBeGreaterThanOrEqual(0.9);
```

---

# 17. Version update

After the fixes and only after tests pass, update:

```text
Validator Build: 4.2.0-dataflow-coverage-integrity
Rule Set Version: 4.2.0
Normalizer Version: 1.6.2
```

---

# 18. Required commands

Run the repository's actual commands for:

```text
formatter
TypeScript type checker
existing unit tests
mapping propagation tests
raw row immutability tests
copyright tests
timestamp tests
encoding code-point tests
numerical applicability tests
fixture coverage integrity tests
full fixture integration test
diagnostic report generation
```

Do not stop after compilation.

---

# 19. Acceptance criteria

The task is complete only when all of the following are true:

```text
1. The five mapping fields appear in the report.
2. Their raw population counts reflect actual workbook values.
3. Copyright rows emit COPYRIGHT_UNVERIFIED where applicable.
4. Version rows emit VERSION_TIMESTAMP_CONFLICT where applicable.
5. Broken encoding is based on actual raw code points.
6. Unit applicability is classified correctly.
7. Fixture coverage is derived from final emitted issues.
8. No coverage row can claim detection when emitted issue count is zero.
9. Exact detected and missed row IDs are reported.
10. All existing non-regression tests pass.
```

Do not claim completion if:

- mapped fields still show `0/120` despite populated workbook cells;
- a coverage table contradicts issue diagnostics;
- target rules emit zero issues but coverage says all detected;
- existing working validation behavior changes unexpectedly.

---

# 20. Final response format

Return:

```text
A. Root causes confirmed
B. Files changed
C. Mapping source-of-truth fix
D. Raw row propagation fix
E. Copyright validation result
F. Version validation result
G. Broken encoding code-point findings
H. Numerical applicability result
I. Fixture coverage integrity fix
J. Exact detected/missed row IDs
K. Non-regression results
L. Before/after totals
M. Remaining limitations
N. Exact commands executed
```

Also include:

| Requirement                 |  Before |   After | Evidence            |
| --------------------------- | ------: | ------: | ------------------- |
| Copyright raw population    |       0 |     ... | report              |
| Version raw population      |       0 |     ... | report              |
| Broken encoding detected    |       0 |     ... | row IDs             |
| Copyright detected          |       0 |     ... | row IDs             |
| Version conflicts detected  |       0 |     ... | row IDs             |
| Unit applicability verified |      No |     ... | applicability table |
| Coverage contradictions     | Present |       0 | integrity tests     |
| Existing working rules      | Passing | Passing | regression suite    |

Begin by inspecting the exact active data flow and showing the concise plan. Then add failing tests before changing production code.
