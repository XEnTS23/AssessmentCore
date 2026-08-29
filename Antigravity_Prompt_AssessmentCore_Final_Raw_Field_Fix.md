# Antigravity Prompt — Fix Remaining AssessmentCore Raw-Field Validation Gaps Without Regressions

You are working inside the **AssessmentCore** validation-engine codebase.

Act as a senior TypeScript engineer specializing in spreadsheet ingestion, canonical data modeling, rule execution, and regression testing.

The validator is already functioning correctly in most areas. Do **not** perform a broad refactor. Fix only the remaining failures listed below while preserving every currently working behavior.

---

## Current confirmed baseline

Latest report:

```text
Validator Build: 3.0.0-third-pass
Rule Set Version: 3.0.0
Normalizer Version: 1.5.0

Total Rows: 120
Valid: 29
Caution: 1
Needs Review: 40
Rejected: 50
```

The following behavior is already correct and must not regress:

- Positive-mark issue deduplication
- Negative-mark prerequisite suppression
- Integer response subtype preservation
- `INTEGER_ANSWER_NOT_INTEGER`
- Malformed LaTeX deduplication
- Unicode math acceptance
- Unsupported `MATRIX_MATCH` and `Hotspot` preservation
- `UNSUPPORTED_TYPE_FOR_TARGET_EXPORT`
- Explanation mismatch confidence and evidence
- MCQ rule dependency suppression
- Duplicate-row matching context
- Missing media validation
- Missing answer validation
- Truncated stem detection
- Context-missing detection
- Ambiguous media filename detection
- Non-standard difficulty detection
- Partial-marking ambiguity detection
- Subject/chapter mismatch detection
- Diagnostic rule execution reporting

Do not weaken, rename, remove, or change the severity of these working rules unless required to fix a direct bug.

---

# Exact remaining failures

The latest report still shows:

```text
BROKEN_ENCODING
Executed: 120
Issues emitted: 0

COPYRIGHT_UNVERIFIED
Executed: 120
Issues emitted: 0

VERSION_TIMESTAMP_CONFLICT
Executed: 120
Issues emitted: 0

UNIT_EMBEDDED_IN_NUMERIC_ANSWER
Executed: 45
Issues emitted: 0
```

`WRONG_SUBJECT_TAG` is now working correctly and must remain unchanged.

The inferred mapping still does not include:

```json
{
  "copyrightStatus": "Copyright_Status",
  "sourceReference": "Source_Reference",
  "teacherVersion": "Teacher_Version",
  "submittedAt": "Submitted_At",
  "lastUpdatedAt": "Last_Updated_At"
}
```

The core problem is that some rules are registered but receive either:

- no mapped data;
- normalized data after raw evidence was removed;
- inactive source fields that are ignored;
- or undefined canonical properties.

---

# 1. Inspect before editing

Locate and inspect the real implementation of:

- workbook row extraction;
- raw-cell storage;
- column mapping inference;
- canonical row construction;
- Unicode/text sanitization;
- numeric-answer parsing;
- metadata normalization;
- rule registry;
- rule execution order;
- issue evidence generation;
- diagnostic report generation;
- fixture issue tags and expected outcomes.

Before changing code, provide:

```text
A. Files inspected
B. Root cause of each remaining failure
C. Fields currently missing from the canonical model
D. Rules currently reading normalized rather than raw values
E. Focused implementation plan
```

Do not begin with speculative edits.

---

# 2. Preserve immutable raw source values

Introduce or verify an immutable raw-row layer.

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
  cells: Record<string, SourceCell>;
}

interface CanonicalQuestion {
  raw: RawImportedRow;

  questionId?: string;
  rawType?: string;
  canonicalType?: string;
  responseMode?: string;

  stem?: string;
  options?: string[];
  acceptedAnswers?: string[];

  rawAcceptedAnswers?: string[];

  copyrightStatus?: string;
  sourceReference?: string;

  teacherVersion?: string;
  submittedAt?: Date;
  lastUpdatedAt?: Date;
}
```

Requirements:

- Store the original workbook value before trimming or parsing.
- Never mutate `raw`.
- Preserve raw strings before:
  - Unicode normalization;
  - trimming;
  - number parsing;
  - unit extraction;
  - date parsing;
  - HTML sanitization.
- Raw-sensitive rules must read from `row.raw`.
- Existing canonical rules must continue reading normalized fields.

Example API:

```ts
context.raw.getText("Question_Stem");
context.raw.getText("Numerical_Answer");
context.raw.getText("Copyright_Status");
```

---

# 3. Add the missing column mappings

Add canonical mapping support for:

```ts
copyrightStatus?: string;
sourceReference?: string;
teacherVersion?: string;
submittedAt?: string;
lastUpdatedAt?: string;
```

Expected fixture mappings:

```json
{
  "copyrightStatus": "Copyright_Status",
  "sourceReference": "Source_Reference",
  "teacherVersion": "Teacher_Version",
  "submittedAt": "Submitted_At",
  "lastUpdatedAt": "Last_Updated_At"
}
```

Add aliases:

```text
Copyright_Status
Copyright Status
Rights_Status
License_Status
Licence_Status

Source_Reference
Source Reference
Question_Source
Content_Source

Teacher_Version
Teacher Version
Question_Version
Content_Version

Submitted_At
Submitted At
Submission_Date
Created_At

Last_Updated_At
Last Updated At
Updated_At
Modified_At
```

Mapping safety tests must prove these are not incorrectly mapped:

```text
Image_Source != sourceReference
Image_Required != mediaUrl
Partial_Marking_Rule != section
```

The diagnostic report must display the new mappings.

---

# 4. Fix `BROKEN_ENCODING`

Run `BROKEN_ENCODING` against raw source-cell text before normalization.

Rule:

```text
BROKEN_ENCODING
Severity: BLOCK
```

Scan all textual cells, including:

```text
Question_Stem
Option_A
Option_B
Option_C
Option_D
Correct_Answer
Numerical_Answer
Explanation
Subject
Chapter
Topic
Answer_Unit
```

Minimum detection:

```ts
function findBrokenEncoding(value: string) {
  const findings = [];

  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);

    if (value[i] === "\uFFFD") {
      findings.push({
        index: i,
        codePoint: "U+FFFD",
        type: "replacement_character",
      });
    }

    if (code === 0x0000) {
      findings.push({
        index: i,
        codePoint: "U+0000",
        type: "null_byte",
      });
    }
  }

  const controlRegex = /[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu;

  for (const match of value.matchAll(controlRegex)) {
    findings.push({
      index: match.index,
      codePoint: `U+${match[0].codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}`,
      type: "disallowed_control_character",
    });
  }

  return findings;
}
```

Evidence:

```ts
{
  sourceColumn: "Question_Stem",
  rawSnippet: "...",
  findings: [
    {
      index: 12,
      codePoint: "U+FFFD",
      type: "replacement_character"
    }
  ]
}
```

Do not automatically replace corrupted characters.

Allowed corrections:

```text
Open original source
Restore intended character manually
Upload corrected file
Exclude row
```

Mode: `manual_only`.

Mandatory tests:

```ts
expect(validateRawText("x� + y� = 4")).toHaveIssue("BROKEN_ENCODING");

expect(validateRawText("x² + y² = 4")).not.toHaveIssue("BROKEN_ENCODING");
```

Fixture target:

```text
BROKEN_ENCODING: 2/2
```

---

# 5. Fix `COPYRIGHT_UNVERIFIED`

The rule cannot work until `Copyright_Status` and `Source_Reference` are mapped.

Normalize rights status:

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

Do not treat blank or `Unknown` as approved.

Rule:

```text
COPYRIGHT_UNVERIFIED
Severity:
- BLOCK in production/publish mode
- REVIEW in draft-only mode
```

Trigger when:

```ts
copyrightStatus === "unknown" ||
copyrightStatus === "unverified" ||
copyrightStatus is missing in production mode
```

and the source indicates third-party material:

```text
screenshot
coaching material
book
textbook
website
pdf
question bank
previous paper
scanned
copied
```

Example:

```text
Copyright_Status = Unknown
Source_Reference = Screenshot from coaching material
```

Evidence:

```ts
{
  rawCopyrightStatus: "Unknown",
  normalizedCopyrightStatus: "unknown",
  sourceReference: "Screenshot from coaching material",
  matchedIndicators: ["screenshot", "coaching material"],
  policyMode: "production"
}
```

Correction actions:

```text
Confirm teacher-created content
Upload licence or permission
Add attribution
Replace with approved content
Exclude from export
```

Do not auto-resolve this issue.

Mandatory tests:

```ts
expect(
  validateMetadata({
    copyrightStatus: "Unknown",
    sourceReference: "Screenshot from coaching material",
  }),
).toHaveIssue("COPYRIGHT_UNVERIFIED");

expect(
  validateMetadata({
    copyrightStatus: "Teacher Created",
    sourceReference: "Created by faculty",
  }),
).not.toHaveIssue("COPYRIGHT_UNVERIFIED");
```

Fixture target:

```text
COPYRIGHT_UNVERIFIED: 5/5
```

---

# 6. Fix `VERSION_TIMESTAMP_CONFLICT`

Map:

```text
Teacher_Version -> teacherVersion
Submitted_At -> submittedAt
Last_Updated_At -> lastUpdatedAt
```

Preserve:

```ts
rawTeacherVersion;
rawSubmittedAt;
rawLastUpdatedAt;
```

Use explicit date parse results:

```ts
interface ParsedTimestamp {
  rawValue: string;
  parsedValue?: Date;
  valid: boolean;
  parsingMode?: string;
}
```

Do not silently replace invalid values with the current date.

Rule:

```text
VERSION_TIMESTAMP_CONFLICT
Severity: REVIEW
```

Trigger:

```ts
submittedAt.valid &&
  lastUpdatedAt.valid &&
  lastUpdatedAt.parsedValue < submittedAt.parsedValue;
```

Evidence:

```ts
{
  teacherVersion: "final_final_latest2",
  submittedAtRaw: "...",
  submittedAtIso: "...",
  lastUpdatedAtRaw: "...",
  lastUpdatedAtIso: "...",
  conflict: "last_updated_before_submitted"
}
```

Correction actions:

```text
Correct submitted timestamp
Correct updated timestamp
Choose authoritative version
Mark version as superseded
```

Mode: `manual_only`.

Mandatory tests:

```ts
expect(
  validateVersionMetadata({
    teacherVersion: "final_final_latest2",
    submittedAt: "2026-07-20T10:00:00Z",
    lastUpdatedAt: "2026-07-19T10:00:00Z",
  }),
).toHaveIssue("VERSION_TIMESTAMP_CONFLICT");

expect(
  validateVersionMetadata({
    teacherVersion: "v2",
    submittedAt: "2026-07-19T10:00:00Z",
    lastUpdatedAt: "2026-07-20T10:00:00Z",
  }),
).not.toHaveIssue("VERSION_TIMESTAMP_CONFLICT");
```

Fixture target:

```text
VERSION_TIMESTAMP_CONFLICT: 3/3
```

---

# 7. Fix raw numerical-answer field behavior

The existing fixture may contain unit-bearing values inside inactive `Numerical_Answer` cells on MCQ/MSQ rows.

Do not force every case into one rule.

Implement two distinct rules.

## A. Active numerical/integer interaction

When:

```ts
canonicalType === "TEXT_ENTRY" && responseMode in ["numeric", "integer"];
```

and raw `Numerical_Answer` contains a recognized unit:

```text
9.8 m/s²
3 mol
8 m
```

emit:

```text
UNIT_EMBEDDED_IN_NUMERIC_ANSWER
Severity: BLOCK
```

Preserve:

```ts
rawAcceptedAnswers: ["9.8 m/s²"];
```

Do not silently split it.

Evidence:

```ts
{
  rawAnswer: "9.8 m/s²",
  parsedNumericCandidate: "9.8",
  parsedUnitCandidate: "m/s²",
  parserConfidence: 1
}
```

Suggested correction:

```text
Numerical Answer = 9.8
Answer Unit = m/s²
```

Mode: `suggested`.

## B. Inactive numerical field contains data

When the question is MCQ/MSQ/unsupported and `Numerical_Answer` is populated, emit:

```text
INACTIVE_FIELD_CONTAINS_DATA
Severity: REVIEW
Field: Numerical_Answer
```

Evidence:

```ts
{
  rawType: "SCQ",
  inactiveField: "Numerical_Answer",
  rawValue: "8 m"
}
```

Do not silently ignore populated inactive fields.

## Numeric grammar

Allow:

```text
9.8
-3
+4
1e-3
1.25E+4
.5
5.
```

Suggested pattern:

```ts
const numericPattern = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
```

Use the existing unit parser if available.

Mandatory tests:

```ts
expect(
  validateNumericAnswer({
    rawType: "NUMERICAL",
    rawAnswer: "9.8 m/s²",
  }),
).toHaveIssue("UNIT_EMBEDDED_IN_NUMERIC_ANSWER");

expect(
  validateNumericAnswer({
    rawType: "SCQ",
    rawAnswer: "8 m",
  }),
).toHaveIssue("INACTIVE_FIELD_CONTAINS_DATA");

expect(
  validateNumericAnswer({
    rawType: "NUMERICAL",
    rawAnswer: "1e-3",
  }),
).not.toHaveIssue("UNIT_EMBEDDED_IN_NUMERIC_ANSWER");
```

For fixture coverage, report both:

```text
Active unit-bearing numerical answers detected: X/X
Inactive Numerical_Answer conflicts detected: Y/Y
```

Do not claim `UNIT_EMBEDDED_IN_NUMERIC_ANSWER: 3/3` unless all three rows are active numerical/integer questions.

---

# 8. Keep `WRONG_SUBJECT_TAG` unchanged

The current subject taxonomy validation is working correctly.

It already detects three deterministic mismatches.

Do not modify its behavior except for additional unit tests that protect it.

Regression assertion:

```ts
expect(report.issueCounts.WRONG_SUBJECT_TAG).toBe(3);
```

---

# 9. Execution order

Use:

```text
1. Read workbook cells
2. Preserve immutable raw rows
3. Run BROKEN_ENCODING on raw text
4. Infer column mappings
5. Build canonical row
6. Normalize metadata, answers, dates and types
7. Run structural rules
8. Run raw-sensitive rules:
   - COPYRIGHT_UNVERIFIED
   - VERSION_TIMESTAMP_CONFLICT
   - UNIT_EMBEDDED_IN_NUMERIC_ANSWER
   - INACTIVE_FIELD_CONTAINS_DATA
9. Run existing canonical rules
10. Deduplicate
11. Calculate status
12. Generate diagnostics
```

Do not sanitize before raw-integrity checks.

---

# 10. Fixture coverage audit

Use the fixture's intentional issue tags.

Create coverage diagnostics:

```ts
interface FixtureCoverage {
  issueTag: string;
  expectedRows: string[];
  detectedRows: string[];
  missedRows: string[];
}
```

Output:

```text
BROKEN_ENCODING: 2/2
COPYRIGHT_UNVERIFIED: 5/5
WRONG_SUBJECT_TAG: 3/3
VERSION_TIMESTAMP_CONFLICT: 3/3

UNIT_EMBEDDED_IN_NUMERIC_ANSWER:
- Active applicable rows: X/X

INACTIVE_FIELD_CONTAINS_DATA:
- Inactive-field rows: Y/Y
```

Do not change the fixture to make tests pass.

Do not hide non-applicable injected mutations. Report them clearly.

---

# 11. Mandatory non-regression tests

Keep these passing:

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
for (const row of rowsWithRawType("MATRIX_MATCH")) {
  expect(row.canonicalType).toBe("UNSUPPORTED");
  expect(row).toHaveIssue("UNSUPPORTED_TYPE_FOR_TARGET_EXPORT");
}
```

```ts
expect(
  getRow("JEE26-CHE-002").getIssue("EXPLANATION_RESULT_MISMATCH").severity,
).toBe("BLOCK");
```

```ts
expect(report.issueCounts.WRONG_SUBJECT_TAG).toBe(3);
```

---

# 12. Diagnostic report requirements

Update versions:

```text
Validator Build: 4.0.0-raw-field-fix
Rule Set Version: 4.0.0
Normalizer Version: 1.6.0
```

The report must display the new inferred mappings.

Add:

```text
Rows with raw copyright fields populated
Rows with raw version fields populated
Rows containing raw replacement characters
Rows with active numerical answers
Rows with inactive Numerical_Answer data
```

For each target rule show:

```text
Registered
Executed
Applicable rows
Skipped
Issues emitted
```

Do not report a rule as successful merely because it executed.

---

# 13. Required commands

Run the actual project commands for:

```text
formatter
TypeScript type checking
existing tests
new tests
fixture integration test
full diagnostic validation
report generation
```

Do not stop after compilation.

---

# 14. Acceptance criteria

The task is complete only when:

```text
BROKEN_ENCODING: 2/2
COPYRIGHT_UNVERIFIED: 5/5
WRONG_SUBJECT_TAG: 3/3
VERSION_TIMESTAMP_CONFLICT: 3/3
```

And numerical-answer coverage is correctly divided into active and inactive field cases.

All existing regression tests must remain green.

Do not claim success if the new mappings are absent from the report.

Do not claim success if rules emit zero issues against applicable tagged rows.

---

# 15. Final response format

Return:

```text
A. Root causes
B. Files changed
C. Raw-row architecture changes
D. Column mapping changes
E. Rule changes
F. Active vs inactive numerical-field behavior
G. Tests added
H. Test results
I. Fixture coverage
J. Before/after validation totals
K. Non-regression results
L. Remaining limitations
M. Exact commands executed
```

Also include:

| Issue                           | Before | After | Applicable rows | Test       |
| ------------------------------- | -----: | ----: | --------------: | ---------- |
| Broken encoding                 |    0/2 |   ... |               2 | ...        |
| Copyright                       |    0/5 |   ... |               5 | ...        |
| Subject mismatch                |    3/3 |   3/3 |               3 | regression |
| Version conflict                |    0/3 |   ... |               3 | ...        |
| Unit in active numeric answer   |    0/X |   ... |               X | ...        |
| Inactive numeric field conflict |    0/Y |   ... |               Y | ...        |

Begin by inspecting the current implementation and showing the focused plan. Then implement the changes.
