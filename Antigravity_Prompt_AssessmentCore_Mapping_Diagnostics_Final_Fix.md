# Antigravity Prompt — Final AssessmentCore Mapping and Raw-Field Diagnostics Fix

You are working inside the **AssessmentCore** validation-engine codebase.

Act as a senior TypeScript engineer specializing in spreadsheet ingestion, column mapping, immutable raw-data preservation, validation-rule diagnostics, and regression testing.

The validator is already working correctly in most areas. This task is a **surgical final correction**. Do not refactor the overall architecture. Do not rename or weaken existing working rules. Fix only the remaining mapping, raw-value, and applicability-reporting gaps described below.

---

# 1. Current confirmed baseline

Latest report:

```text
Validator Build: 4.0.0-raw-field-fix
Rule Set Version: 4.0.0
Normalizer Version: 1.6.0

Total Rows: 120
Valid: 28
Caution: 1
Needs Review: 41
Rejected: 50
```

The following behavior is confirmed working and must not regress:

- Positive-mark deduplication
- Negative-mark prerequisite suppression
- Integer response-mode preservation
- `INTEGER_ANSWER_NOT_INTEGER`
- Malformed LaTeX deduplication
- Unicode math acceptance
- Unsupported `MATRIX_MATCH` preservation
- Unsupported `Hotspot` preservation
- `UNSUPPORTED_TYPE_FOR_TARGET_EXPORT`
- Explanation mismatch confidence and evidence
- MCQ answer-membership dependency suppression
- Duplicate-row matching context
- Missing-media validation
- Missing-answer validation
- Truncated-stem detection
- Context-missing detection
- Ambiguous media filename validation
- Non-standard difficulty validation
- Partial-marking ambiguity validation
- Subject/chapter mismatch validation
- `INACTIVE_FIELD_CONTAINS_DATA`
- Diagnostic rule execution tables
- Suppressed-rule reporting

Do not alter the currently working behavior of these rules.

---

# 2. Exact remaining failures

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

The inferred column mapping still does not include:

```json
{
  "copyrightStatus": "Copyright_Status",
  "sourceReference": "Source_Reference",
  "teacherVersion": "Teacher_Version",
  "submittedAt": "Submitted_At",
  "lastUpdatedAt": "Last_Updated_At"
}
```

The report also does not show:

- raw-field population counts;
- raw code-point diagnostics;
- active versus inactive numerical-answer applicability;
- fixture-to-rule coverage.

The primary objective is to make the data flow observable and fix only the missing mappings and raw-sensitive rule inputs.

---

# 3. Do not start by editing

First inspect the actual code paths for:

- workbook header extraction;
- column alias registry;
- inferred mapping construction;
- canonical mapping serialization;
- raw row creation;
- canonical row creation;
- text sanitization;
- date parsing;
- accepted-answer parsing;
- `BROKEN_ENCODING`;
- `COPYRIGHT_UNVERIFIED`;
- `VERSION_TIMESTAMP_CONFLICT`;
- `UNIT_EMBEDDED_IN_NUMERIC_ANSWER`;
- report mapping output;
- fixture issue-tag loading.

Before modifying code, return a concise plan:

```text
A. Files inspected
B. Exact mapping registry used by the report
C. Exact canonical properties read by each failing rule
D. Whether raw values exist before sanitization
E. Exact root cause for every zero-emission rule
F. Files to change
G. Tests to add
```

Do not assume that a mapping added to an unused interface is sufficient. Confirm that the same mapping object is used by:

1. ingestion;
2. canonical normalization;
3. validation rules;
4. diagnostic report generation.

---

# 4. Fix the canonical column mapping end to end

## Required mapping targets

Add these properties to the actual active mapping model:

```ts
interface CanonicalColumnMapping {
  copyrightStatus?: string;
  sourceReference?: string;
  teacherVersion?: string;
  submittedAt?: string;
  lastUpdatedAt?: string;
}
```

## Required mappings for this fixture

```json
{
  "copyrightStatus": "Copyright_Status",
  "sourceReference": "Source_Reference",
  "teacherVersion": "Teacher_Version",
  "submittedAt": "Submitted_At",
  "lastUpdatedAt": "Last_Updated_At"
}
```

## Required aliases

```ts
const columnAliases = {
  copyrightStatus: [
    "Copyright_Status",
    "Copyright Status",
    "Rights_Status",
    "Rights Status",
    "License_Status",
    "Licence_Status",
  ],

  sourceReference: [
    "Source_Reference",
    "Source Reference",
    "Question_Source",
    "Content_Source",
    "Reference_Source",
  ],

  teacherVersion: [
    "Teacher_Version",
    "Teacher Version",
    "Question_Version",
    "Content_Version",
    "Version",
  ],

  submittedAt: [
    "Submitted_At",
    "Submitted At",
    "Submission_Date",
    "Created_At",
    "Created At",
  ],

  lastUpdatedAt: [
    "Last_Updated_At",
    "Last Updated At",
    "Updated_At",
    "Modified_At",
    "Modified At",
  ],
};
```

## Mapping safety

Add explicit negative tests:

```text
Image_Source must not map to sourceReference
Image_Source must not map to sourceExam
Image_Required must not map to mediaUrl
Partial_Marking_Rule must not map to section
```

## Required proof

The generated report must show:

```json
{
  "copyrightStatus": "Copyright_Status",
  "sourceReference": "Source_Reference",
  "teacherVersion": "Teacher_Version",
  "submittedAt": "Submitted_At",
  "lastUpdatedAt": "Last_Updated_At"
}
```

Do not claim the mapping is fixed unless those five entries are visible in the final report.

---

# 5. Prove raw values are preserved

Create or confirm an immutable raw representation.

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

Canonical question:

```ts
interface CanonicalQuestion {
  raw: RawImportedRow;

  questionId?: string;
  rawType?: string;
  canonicalType?: string;
  responseMode?: string;

  rawAcceptedAnswers?: string[];
  acceptedAnswers?: string[];

  copyrightStatus?: string;
  sourceReference?: string;

  rawTeacherVersion?: string;
  rawSubmittedAt?: string;
  rawLastUpdatedAt?: string;

  teacherVersion?: string;
  submittedAt?: Date;
  lastUpdatedAt?: Date;
}
```

Requirements:

- Preserve the workbook value before trimming.
- Preserve the raw text before Unicode normalization.
- Preserve the raw numerical answer before number parsing.
- Preserve timestamp strings before date parsing.
- Never mutate raw cells.
- Do not rebuild “raw” values from normalized values.

Add an invariant test:

```ts
expect(Object.isFrozen(row.raw)).toBe(true);
expect(Object.isFrozen(row.raw.cells)).toBe(true);
```

Use deep freezing or an equivalent immutable structure.

---

# 6. Add raw-field population diagnostics

Before running raw-sensitive rules, calculate:

```ts
interface RawFieldPopulationDiagnostics {
  rowsWithCopyrightStatus: number;
  rowsWithSourceReference: number;
  rowsWithTeacherVersion: number;
  rowsWithSubmittedAt: number;
  rowsWithLastUpdatedAt: number;

  rowsWithRawNumericalAnswer: number;
  activeNumericRowsWithRawAnswer: number;
  inactiveRowsWithRawNumericalAnswer: number;

  rowsContainingReplacementCharacter: number;
  rowsContainingNullByte: number;
  rowsContainingDisallowedControlCharacter: number;
}
```

Add this to the diagnostic report:

```text
## Raw Field Population Diagnostics

Copyright_Status populated: X/120
Source_Reference populated: X/120
Teacher_Version populated: X/120
Submitted_At populated: X/120
Last_Updated_At populated: X/120

Rows containing U+FFFD: X
Rows containing null bytes: X
Rows containing disallowed controls: X

Active numeric/integer rows with Numerical_Answer: X
Inactive rows with Numerical_Answer: 5
```

This report must use raw values directly.

Do not infer population from canonical fields.

---

# 7. Fix and diagnose `BROKEN_ENCODING`

## Required behavior

Run against raw text before sanitization.

Scan every raw textual cell.

Minimum checks:

```ts
function scanRawEncoding(value: string) {
  const findings: Array<{
    index: number;
    codePoint: string;
    kind:
      | "replacement_character"
      | "null_byte"
      | "disallowed_control_character";
  }> = [];

  for (const [index, char] of Array.from(value).entries()) {
    const codePoint = char.codePointAt(0)!;

    if (codePoint === 0xfffd) {
      findings.push({
        index,
        codePoint: "U+FFFD",
        kind: "replacement_character",
      });
    }

    if (codePoint === 0x0000) {
      findings.push({
        index,
        codePoint: "U+0000",
        kind: "null_byte",
      });
    }

    const isAllowedWhitespace =
      codePoint === 0x0009 || codePoint === 0x000a || codePoint === 0x000d;

    const isDisallowedControl =
      (codePoint >= 0x0001 && codePoint <= 0x001f) || codePoint === 0x007f;

    if (isDisallowedControl && !isAllowedWhitespace) {
      findings.push({
        index,
        codePoint: `U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`,
        kind: "disallowed_control_character",
      });
    }
  }

  return findings;
}
```

Rule:

```text
BROKEN_ENCODING
Severity: BLOCK
```

## Mandatory diagnostic for intended corrupted rows

For every fixture row tagged `BROKEN_ENCODING`, print:

```text
Question ID
Source column
Raw text snippet
Raw code points
Detected findings
```

Example:

```text
Question ID: JEE26-PHY-029
Column: Question_Stem
Code points near corruption:
U+0078 U+FFFD U+0020
```

Do not log the full row unnecessarily.

## Important fallback

If the workbook parser has already replaced the original malformed bytes before your raw layer receives them, document that fact.

Then detect the resulting stored value, such as:

- `U+FFFD`;
- mojibake sequence;
- another replacement token.

Do not keep hard-coding `U+FFFD` if the actual raw code point is different.

## Acceptance

```text
BROKEN_ENCODING applicable rows: 2
Detected: 2
Missed: 0
```

---

# 8. Fix `COPYRIGHT_UNVERIFIED`

The rule must read mapped canonical values and retain raw evidence.

Normalize statuses:

```ts
function normalizeCopyrightStatus(
  value: string | undefined,
):
  | "approved"
  | "teacher_created"
  | "licensed"
  | "public_domain"
  | "permission_granted"
  | "unknown"
  | "unverified" {
  // deterministic mapping
}
```

Do not map blank or unknown to approved.

Rule:

```text
COPYRIGHT_UNVERIFIED
Severity:
- BLOCK in production/publish mode
- REVIEW in draft-only mode
```

Trigger when:

```ts
status is "unknown" or "unverified"
```

and source contains one or more:

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

Also trigger when production mode requires rights metadata and status is missing.

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

Acceptance:

```text
COPYRIGHT_UNVERIFIED applicable rows: 5
Detected: 5
Missed: 0
```

---

# 9. Fix `VERSION_TIMESTAMP_CONFLICT`

Use mapped source fields:

```text
Teacher_Version
Submitted_At
Last_Updated_At
```

Parse dates with explicit diagnostics:

```ts
interface ParsedTimestamp {
  rawValue: string;
  valid: boolean;
  parsedValue?: Date;
  parser?: string;
  error?: string;
}
```

Do not silently replace an invalid timestamp.

Rule:

```text
VERSION_TIMESTAMP_CONFLICT
Severity: REVIEW
```

Trigger:

```ts
submitted.valid &&
  updated.valid &&
  updated.parsedValue! < submitted.parsedValue!;
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

Add diagnostics:

```text
Rows with both timestamps populated
Rows with both timestamps parsed successfully
Rows with parse failure
Rows with chronological conflict
```

Acceptance:

```text
VERSION_TIMESTAMP_CONFLICT applicable rows: 3
Detected: 3
Missed: 0
```

---

# 10. Verify active embedded-unit applicability

The new inactive-field rule already works and emits five issues. Preserve it unchanged.

For `UNIT_EMBEDDED_IN_NUMERIC_ANSWER`, determine applicability from raw source data.

Applicable only when:

```ts
canonicalType === "TEXT_ENTRY" &&
responseMode is "numeric" or "integer" &&
raw Numerical_Answer is populated
```

Add diagnostics:

```text
Active numeric/integer rows with raw Numerical_Answer: X
Active rows containing a recognized unit suffix: Y
UNIT_EMBEDDED_IN_NUMERIC_ANSWER emitted: Y
```

Unit examples:

```text
9.8 m/s²
3 mol
8 m
```

Valid plain numbers:

```text
9.8
-3
+4
1e-3
1.25E+4
.5
5.
```

Use a strict numeric parser:

```ts
const numericPattern = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
```

If there are zero applicable active rows with embedded units, the report must explicitly say:

```text
UNIT_EMBEDDED_IN_NUMERIC_ANSWER:
Applicable tagged active rows: 0
Zero emitted issues is expected.
```

Do not claim failure or success without applicability counts.

Do not convert inactive-field cases into unit errors.

---

# 11. Fixture-to-rule coverage table

Add a final report section:

```text
## Fixture Coverage

| Issue Tag | Expected Rows | Applicable Rows | Detected | Missed |
|---|---:|---:|---:|---:|
| BROKEN_ENCODING | 2 | 2 | 2 | 0 |
| COPYRIGHT_UNVERIFIED | 5 | 5 | 5 | 0 |
| WRONG_SUBJECT_TAG | 3 | 3 | 3 | 0 |
| VERSION_TIMESTAMP_CONFLICT | 3 | 3 | 3 | 0 |
| UNIT_EMBEDDED_IN_NUMERIC_ANSWER | 3 | X | Y | Z |
| INACTIVE_FIELD_CONTAINS_DATA | 5 | 5 | 5 | 0 |
```

For unit-tagged rows, explain which are:

- active numerical/integer cases;
- inactive-field cases;
- non-applicable fixture mutations.

Do not change fixture tags to hide a mismatch.

---

# 12. Non-regression requirements

All existing working assertions must remain green.

At minimum:

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
expect(report.issueCounts.WRONG_SUBJECT_TAG).toBe(3);

expect(report.issueCounts.INACTIVE_FIELD_CONTAINS_DATA).toBe(5);
```

---

# 13. Version updates

Update:

```text
Validator Build: 4.1.0-mapping-diagnostics-fix
Rule Set Version: 4.1.0
Normalizer Version: 1.6.1
```

Do not update version strings without actual code changes and passing tests.

---

# 14. Required commands

Run the real repository commands for:

```text
formatter
TypeScript type checking
existing unit tests
new mapping tests
raw encoding tests
copyright tests
timestamp tests
numeric applicability tests
fixture integration test
full validation run
diagnostic report generation
```

Do not stop after compilation.

---

# 15. Acceptance criteria

The task is complete only when:

```text
The five new mappings appear in the report.

BROKEN_ENCODING:
Applicable = 2
Detected = 2
Missed = 0

COPYRIGHT_UNVERIFIED:
Applicable = 5
Detected = 5
Missed = 0

WRONG_SUBJECT_TAG:
Detected = 3
No regression

VERSION_TIMESTAMP_CONFLICT:
Applicable = 3
Detected = 3
Missed = 0

INACTIVE_FIELD_CONTAINS_DATA:
Detected = 5
No regression

UNIT_EMBEDDED_IN_NUMERIC_ANSWER:
Applicability is explicitly calculated and correctly reported.
```

Do not claim completion when a rule only executes but receives no mapped or applicable data.

---

# 16. Final response format

Return:

```text
A. Root causes
B. Files changed
C. Mapping fixes
D. Raw-value preservation proof
E. Raw code-point findings
F. Copyright-rule results
G. Version-rule results
H. Unit applicability results
I. Fixture coverage table
J. Non-regression test results
K. Before/after validation totals
L. Remaining limitations
M. Exact commands executed
```

Also include:

| Requirement                |     Before | After | Proof                |
| -------------------------- | ---------: | ----: | -------------------- |
| Copyright mappings visible |         No |   ... | report               |
| Version mappings visible   |         No |   ... | report               |
| Broken encoding            |        0/2 |   ... | fixture test         |
| Copyright                  |        0/5 |   ... | fixture test         |
| Version conflict           |        0/3 |   ... | fixture test         |
| Subject mismatch           |        3/3 |   3/3 | regression           |
| Inactive field conflict    |        5/5 |   5/5 | regression           |
| Active embedded units      | unverified |   ... | applicability report |

Begin by inspecting the exact active mapping and raw-value code paths. Then present the focused plan before editing.
