# Antigravity Coding Prompt — AssessmentCore Fourth-Pass Raw-Field and Metadata Validation Fix

You are working inside the **AssessmentCore** codebase. Act as a senior TypeScript validation-engine engineer, data-ingestion engineer, and regression-test engineer.

The third-pass validator is now structurally sound. Most of the core validation pipeline is working correctly. Your task is to make a **narrow fourth-pass correction** for the remaining raw-field and metadata validation gaps **without breaking any working behavior**.

Do not perform another broad refactor.

## 1. Current baseline that must be preserved

The latest diagnostic run reports:

```text
Validator Build: 3.0.0-third-pass
Rule Set Version: 3.0.0
Normalizer Version: 1.5.0
Total Rows: 120
Valid: 31
Caution: 1
Needs Review: 38
Rejected: 50
Registered Rules: 101
Executed Rule Evaluations: 7028
Skipped Rule Evaluations: 74
Suppressed Issues: 16
```

The following behavior is now correct and must not regress.

### Working ingestion and normalization

- Correct Question ID mapping
- Batch-level positive penalty magnitude normalization
- Raw and canonical question type reporting
- `INTEGER -> TEXT_ENTRY + responseMode=integer`
- `MATRIX_MATCH -> UNSUPPORTED`
- `Hotspot -> UNSUPPORTED`
- `ASSERTION_REASON -> MCQ subtype`
- Unicode mathematics is not falsely rejected as malformed LaTeX

### Working issue architecture

- Canonical issue deduplication
- `MARKS_INVALID` suppressed by `POSITIVE_MARKS_INVALID`
- `LATEX_STEM_DELIMITER_VALID` suppressed by `MALFORMED_LATEX_DELIMITER`
- `MCQ_ANSWER_TEXT_MATCH` suppressed by the canonical answer-not-in-options issue
- Rule prerequisite suppression
- Skipped-rule diagnostics
- Related-row information for duplicate stems
- Rule execution diagnostics
- Evidence objects in row-level issues

### Working rules

Do not weaken, remove, rename, or change the expected severity of these currently working rules unless strictly required to fix a direct defect:

```text
REQUIRED_MEDIA_MISSING
NUMERIC_TOLERANCE_MISSING
TEXT_ENTRY_HAS_ANSWER
DUPLICATE_QUESTION_ID
POSITIVE_MARKS_INVALID
TRUNCATED_STEM
INTEGER_ANSWER_NOT_INTEGER
DUPLICATE_NORMALIZED_STEM_REVIEW
ANSWER_NOT_IN_OPTIONS
AMBIGUOUS_MEDIA_FILENAME
EXPLANATION_KEY_MISMATCH
MALFORMED_LATEX_DELIMITER
CONTEXT_MISSING
MSQ_OPTIONS_UNIQUE
NEGATIVE_MARKS_EXCEED_POSITIVE
NONSTANDARD_DIFFICULTY
MCQ_HAS_CORRECT_ANSWER
MCQ_MIN_OPTIONS
MCQ_SINGLE_CORRECT_ONLY
MCQ_SHOULD_BE_MSQ_REVIEW
LANGUAGE_METADATA_MISMATCH
PARTIAL_MARKING_AMBIGUOUS_PROSE
EXPLANATION_INSUFFICIENT
EXPLANATION_FORMAT_INCOMPATIBLE
UNSUPPORTED_TYPE_FOR_TARGET_EXPORT
MATRIX_MATCH_INCOMPLETE
HOTSPOT_CONFIGURATION_INCOMPLETE
EXPLANATION_RESULT_MISMATCH
MCQ_OPTIONS_UNIQUE
MULTIPLE_CORRECT_OPTIONS_SUSPECTED
```

## 2. Scope of this task

Fix only these remaining areas:

1. Raw-value preservation before normalization
2. Broken encoding detection
3. Copyright/source mapping and validation
4. Subject/chapter taxonomy validation
5. Version/timestamp mapping and validation
6. Units embedded in numerical answer detection
7. Fixture coverage proving each injected issue is detected
8. Diagnostic evidence proving the rules executed against populated data

Do not redesign unrelated validation behavior.

## 3. First inspect the actual pipeline

Before editing, locate and read:

- spreadsheet row extraction;
- raw-cell representation;
- column inference and mapping;
- canonical-row creation;
- text normalization and sanitization;
- accepted-answer normalization;
- metadata-field normalization;
- rule registry;
- rule execution order;
- issue evidence construction;
- fixture loader;
- diagnostic report generator.

Provide a concise implementation plan before changing code:

```text
A. Files/modules inspected
B. Root cause of each missing rule outcome
C. Exact fields currently lost or unmapped
D. Planned changes
E. Regression tests to add
```

Do not start with speculative edits.

## 4. Introduce an immutable raw-row layer

### Current architectural problem

Rules such as:

```text
BROKEN_ENCODING
UNIT_EMBEDDED_IN_NUMERIC_ANSWER
COPYRIGHT_UNVERIFIED
VERSION_TIMESTAMP_CONFLICT
```

are registered and executed, but emit zero issues.

The likely cause is that the rules receive sanitized text instead of raw text, parsed numeric values instead of raw answer strings, or undefined canonical metadata because source columns are not mapped.

### Required data model

Create or confirm a three-layer row model:

```ts
interface SourceCell {
  columnName: string;
  rawValue: unknown;
  rawText?: string;
  cellType?: string;
  rowNumber: number;
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
  correctAnswer?: string;
  acceptedAnswers?: string[];

  subject?: string;
  chapter?: string;
  topic?: string;

  copyrightStatus?: string;
  sourceReference?: string;

  teacherVersion?: string;
  submittedAt?: Date;
  lastUpdatedAt?: Date;
}
```

The `raw` object must be immutable after extraction.

Do not replace or mutate original raw strings during trimming, Unicode normalization, number parsing, unit extraction, date parsing, HTML sanitization, or option parsing.

### Required access pattern

Raw-sensitive rules must explicitly request the raw source field:

```ts
const rawAnswer = context.raw.getText("Numerical_Answer");
const rawStem = context.raw.getText("Question_Stem");
const rawExplanation = context.raw.getText("Explanation");
```

Canonical rules should continue using normalized values.

Do not change existing canonical validation rules to use raw values unless their meaning explicitly requires raw evidence.

## 5. Expand column mappings

The inferred mapping currently omits several required fields.

Add these canonical mapping targets:

```ts
interface CanonicalColumnMapping {
  copyrightStatus?: string;
  sourceReference?: string;
  teacherVersion?: string;
  submittedAt?: string;
  lastUpdatedAt?: string;
}
```

Expected mappings for the current fixture:

```json
{
  "copyrightStatus": "Copyright_Status",
  "sourceReference": "Source_Reference",
  "teacherVersion": "Teacher_Version",
  "submittedAt": "Submitted_At",
  "lastUpdatedAt": "Last_Updated_At"
}
```

Add aliases where appropriate.

### Copyright status aliases

```text
Copyright_Status
Copyright Status
Rights_Status
Rights Status
Licence_Status
License_Status
```

### Source reference aliases

```text
Source_Reference
Source Reference
Question_Source
Content_Source
Reference_Source
```

### Teacher version aliases

```text
Teacher_Version
Teacher Version
Version
Content_Version
Question_Version
```

### Submitted timestamp aliases

```text
Submitted_At
Submitted At
Submission_Date
Created_At
Created At
```

### Updated timestamp aliases

```text
Last_Updated_At
Last Updated At
Updated_At
Modified_At
Modified At
```

### Mapping safety

Do not map unrelated columns merely because their names are semantically similar.

Examples that must remain invalid mappings:

```text
Image_Source -> sourceReference
Image_Source -> sourceExam
Image_Required -> mediaUrl
Partial_Marking_Rule -> section
```

Add mapping tests to prevent regression.

## 6. Fix broken encoding validation

### Current failure

The report shows:

```text
BROKEN_ENCODING
Executed: 120
Issues emitted: 0
```

although fixture rows intentionally contain corrupted replacement characters.

### Required rule behavior

Rule:

```text
BROKEN_ENCODING
Severity: BLOCK
Scope: row or cell
```

Run this rule against **raw text before normalization or sanitization**.

Scan all textual source cells, including:

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
Image_Alt_Text
```

Detect at minimum:

```ts
const hasReplacementCharacter = value.includes("\uFFFD");
const hasNullByte = value.includes("\u0000");

const hasDisallowedControlCharacter =
  /[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(value);
```

Optional high-confidence mojibake detection may be added, but do not create broad false positives.

### Issue evidence

```ts
{
  sourceColumn: "Question_Stem",
  rawSnippet: "...",
  codePoints: ["U+FFFD"],
  characterIndexes: [12, 28]
}
```

Do not include the complete source content when a small snippet is sufficient.

### Correction behavior

Allowed actions:

```text
Open the original source
Restore the intended character manually
Upload a corrected source file
Exclude the row
```

Mode: `manual_only`.

Do not auto-replace `�`.

### Mandatory tests

```ts
it("detects Unicode replacement characters in raw cells", () => {
  const issue = validateRawText("x� + y� = 4");

  expect(issue.ruleId).toBe("BROKEN_ENCODING");
  expect(issue.severity).toBe("BLOCK");
});

it("does not flag valid Unicode mathematics", () => {
  expect(validateRawText("x² + y² = 4")).not.toContainRule("BROKEN_ENCODING");
});

it("runs before Unicode normalization", () => {
  const row = importFixtureRowWithReplacementCharacter();

  expect(row.raw.cells.Question_Stem.rawText).toContain("\uFFFD");

  expect(row).toHaveIssue("BROKEN_ENCODING");
});
```

## 7. Fix copyright and source validation

### Current failure

The report shows:

```text
COPYRIGHT_UNVERIFIED
Executed: 120
Issues emitted: 0
```

The current inferred mapping does not include copyright or source-reference fields.

### Required mapping

Map and normalize:

```ts
copyrightStatus?: string;
sourceReference?: string;
```

Canonical normalization should preserve the raw values and produce a normalized status:

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

Do not convert `Unknown` to approved.

### Rule

```text
COPYRIGHT_UNVERIFIED
Severity: BLOCK in production/publishing mode
Severity: REVIEW in draft-only mode
```

Trigger when copyright status is `unknown` or `unverified` and the source reference indicates potentially third-party material:

```text
screenshot
coaching material
book
textbook
website
PDF
question bank
previous paper
scanned
copied
```

Also trigger when production policy requires copyright approval and the status is missing.

### Evidence

```ts
{
  rawCopyrightStatus: "Unknown",
  normalizedCopyrightStatus: "unknown",
  sourceReference: "Screenshot from coaching material",
  matchedSourceIndicators: ["screenshot", "coaching material"],
  policyMode: "production"
}
```

### Correction actions

```text
Confirm teacher-created content
Upload licence or written permission
Provide attribution
Replace with approved original content
Exclude from publication
```

All are `manual_only` except exclusion may be a safe workflow action.

### Mandatory tests

```ts
it("blocks unknown rights for copied coaching material", () => {
  const row = validateMetadata({
    copyrightStatus: "Unknown",
    sourceReference: "Screenshot from coaching material",
  });

  expect(row).toHaveIssue("COPYRIGHT_UNVERIFIED");
});

it("does not block approved teacher-created content", () => {
  const row = validateMetadata({
    copyrightStatus: "Teacher Created",
    sourceReference: "Created by faculty",
  });

  expect(row).not.toHaveIssue("COPYRIGHT_UNVERIFIED");
});
```

## 8. Fix subject/chapter taxonomy validation

### Current failure

The report shows:

```text
WRONG_SUBJECT_TAG
Executed: 120
Issues emitted: 0
```

`Subject` and `Chapter` are already mapped, so the issue is likely a missing taxonomy, taxonomy not loaded, normalization mismatch, or lack of deterministic evidence.

### Required taxonomy service

Locate and reuse the application's existing curriculum taxonomy if available.

Otherwise, add a versioned deterministic taxonomy module:

```ts
interface TaxonomyEntry {
  canonicalSubject: "Physics" | "Chemistry" | "Mathematics";
  canonicalChapter: string;
  aliases: string[];
}
```

Example entries:

```ts
[
  {
    canonicalSubject: "Physics",
    canonicalChapter: "Current Electricity",
    aliases: ["current electricity", "electric current"],
  },
  {
    canonicalSubject: "Physics",
    canonicalChapter: "Kinematics",
    aliases: ["kinematics", "motion in one dimension"],
  },
  {
    canonicalSubject: "Chemistry",
    canonicalChapter: "Coordination Compounds",
    aliases: ["coordination compounds", "coordination chemistry"],
  },
  {
    canonicalSubject: "Chemistry",
    canonicalChapter: "Chemical Bonding",
    aliases: ["chemical bonding", "molecular structure"],
  },
  {
    canonicalSubject: "Mathematics",
    canonicalChapter: "Quadratic Equations",
    aliases: ["quadratic equations", "quadratics"],
  },
  {
    canonicalSubject: "Mathematics",
    canonicalChapter: "Integral Calculus",
    aliases: ["integral calculus", "integration"],
  },
];
```

Normalize taxonomy values using Unicode normalization, trim, case folding, whitespace normalization, and punctuation normalization.

Do not use fuzzy semantic classification as the only blocking evidence.

### Rule

```text
WRONG_SUBJECT_TAG
Severity: REVIEW
```

Trigger when the chapter resolves deterministically to subject X, the declared subject resolves to Y, and `X !== Y`.

Do not trigger if the chapter is unknown to the taxonomy.

### Evidence

```ts
{
  declaredSubject: "Chemistry",
  normalizedDeclaredSubject: "Chemistry",
  chapter: "Current Electricity",
  expectedSubject: "Physics",
  taxonomyVersion: "..."
}
```

### Correction action

Suggest:

```text
Change Subject from Chemistry to Physics
```

Mode: `suggested`.

Require user confirmation.

### Mandatory tests

```ts
it("detects deterministic chapter-subject mismatch", () => {
  const row = validateMetadata({
    subject: "Chemistry",
    chapter: "Current Electricity",
  });

  expect(row).toHaveIssue("WRONG_SUBJECT_TAG");
});

it("does not flag an unknown taxonomy chapter", () => {
  const row = validateMetadata({
    subject: "Physics",
    chapter: "Experimental Topic A",
  });

  expect(row).not.toHaveIssue("WRONG_SUBJECT_TAG");
});
```

## 9. Fix version and timestamp validation

### Current failure

The report shows:

```text
VERSION_TIMESTAMP_CONFLICT
Executed: 120
Issues emitted: 0
```

The current inferred mapping does not include version or timestamp columns.

### Required mapping and parsing

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

Parse timestamps with explicit success/failure state:

```ts
interface ParsedTimestamp {
  rawValue: string;
  parsedValue?: Date;
  valid: boolean;
  parsingMode?: string;
}
```

Do not silently replace invalid timestamps with the current date.

### Rule

```text
VERSION_TIMESTAMP_CONFLICT
Severity: REVIEW
```

Trigger when:

```ts
submittedAt.valid &&
  lastUpdatedAt.valid &&
  lastUpdatedAt.parsedValue < submittedAt.parsedValue;
```

Also detect suspicious version labels where reliable version-history context exists, such as:

```text
final
final2
final_final
latest
latest2
revised_final
```

Do not block solely because a filename or version contains `final`; combine it with chronological evidence.

### Evidence

```ts
{
  teacherVersion: "final_final_latest2",
  submittedAtRaw: "...",
  submittedAtIso: "...",
  lastUpdatedAtRaw: "...",
  lastUpdatedAtIso: "...",
  conflict: "lastUpdatedAt_before_submittedAt"
}
```

### Correction actions

```text
Correct submitted timestamp
Correct last-updated timestamp
Choose the authoritative version
Mark current version as superseded
```

Mode: `manual_only`.

### Mandatory tests

```ts
it("flags update timestamp before submission", () => {
  const row = validateVersionMetadata({
    teacherVersion: "final_final_latest2",
    submittedAt: "2026-07-20T10:00:00Z",
    lastUpdatedAt: "2026-07-19T10:00:00Z",
  });

  expect(row).toHaveIssue("VERSION_TIMESTAMP_CONFLICT");
});

it("accepts chronological timestamps", () => {
  const row = validateVersionMetadata({
    teacherVersion: "v2",
    submittedAt: "2026-07-19T10:00:00Z",
    lastUpdatedAt: "2026-07-20T10:00:00Z",
  });

  expect(row).not.toHaveIssue("VERSION_TIMESTAMP_CONFLICT");
});
```

## 10. Fix units embedded in numerical answers

### Current failure

The report shows:

```text
UNIT_EMBEDDED_IN_NUMERIC_ANSWER
Executed: 45
Issues emitted: 0
```

The rule likely checks the normalized numeric value after units were stripped or parsing failed silently.

### Required raw-answer handling

For every text-entry question preserve:

```ts
rawAcceptedAnswers: string[];
acceptedAnswers: string[];
```

Example:

```ts
rawAcceptedAnswers: ["9.8 m/s²"];
acceptedAnswers: ["9.8"];
units: ["m/s²"];
```

Do not produce the normalized split silently.

The raw rule must execute before optional splitting.

### Numeric grammar

Allow valid numeric forms:

```text
9.8
-3
+4
1e-3
1.25E+4
.5
5.
```

Use a strict full-token numeric parser:

```ts
const numericPattern = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
```

Detect values such as:

```text
9.8 m/s²
3 mol
₹50
approximately 7
7 units
```

If the raw answer starts with a valid numeric token followed by a recognized unit, emit `UNIT_EMBEDDED_IN_NUMERIC_ANSWER`.

If it is non-numeric text without a recognized unit, use `NUMERIC_ANSWER_NOT_NUMERIC`.

### Unit recognition

Use the existing unit parser if available.

Otherwise support a conservative, extensible grammar for units such as:

```text
m
cm
mm
km
s
ms
min
h
kg
g
mol
K
°C
N
J
W
Pa
C
V
A
Ω
Hz
m/s
m/s²
kg m/s
kg·m/s
```

### Issue

```text
UNIT_EMBEDDED_IN_NUMERIC_ANSWER
Severity: BLOCK
```

Evidence:

```ts
{
  rawAnswer: "9.8 m/s²",
  parsedNumericCandidate: "9.8",
  parsedUnitCandidate: "m/s²",
  parserConfidence: 1
}
```

### Correction behavior

Suggested action:

```text
Move 9.8 into Numerical Answer
Move m/s² into Answer Unit
```

Mode: `suggested`.

Require confirmation. Do not silently rewrite the row.

### Mandatory tests

```ts
it("detects unit suffix in numeric answer", () => {
  const row = validateNumericAnswer("9.8 m/s²");

  expect(row).toHaveIssue("UNIT_EMBEDDED_IN_NUMERIC_ANSWER");
});

it("accepts scientific notation", () => {
  expect(validateNumericAnswer("1e-3")).not.toHaveIssue(
    "UNIT_EMBEDDED_IN_NUMERIC_ANSWER",
  );
});

it("keeps raw answer after normalization", () => {
  const row = importNumericAnswer("9.8 m/s²");

  expect(row.rawAcceptedAnswers).toEqual(["9.8 m/s²"]);
});
```

## 11. Execution order requirements

The corrected pipeline must follow:

```text
1. Read raw workbook cells
2. Store immutable raw row
3. Run raw-integrity validation:
   - BROKEN_ENCODING
4. Infer and validate column mappings
5. Build canonical row while preserving raw values
6. Normalize:
   - types
   - marks
   - dates
   - answers
   - metadata
7. Run canonical structural validation
8. Run raw-sensitive semantic validation:
   - UNIT_EMBEDDED_IN_NUMERIC_ANSWER
   - COPYRIGHT_UNVERIFIED
   - VERSION_TIMESTAMP_CONFLICT
9. Run taxonomy validation:
   - WRONG_SUBJECT_TAG
10. Deduplicate issues
11. Calculate row status
12. Generate diagnostics
```

Do not sanitize or destroy raw evidence before raw-integrity rules execute.

## 12. Fixture-to-rule coverage audit

The fixture contains intentional issue tags. Add an integration audit that compares injected issue tags with emitted canonical problems.

```ts
const fixtureIssueToCanonicalProblem = {
  BROKEN_ENCODING: "BROKEN_ENCODING",
  COPYRIGHT_UNVERIFIED: "COPYRIGHT_UNVERIFIED",
  WRONG_SUBJECT_TAG: "WRONG_SUBJECT_TAG",
  VERSION_TIMESTAMP_CONFLICT: "VERSION_TIMESTAMP_CONFLICT",
  UNIT_EMBEDDED_IN_NUMERIC_ANSWER: "UNIT_EMBEDDED_IN_NUMERIC_ANSWER",
};
```

For every fixture row carrying one of these tags:

```ts
expect(row.canonicalProblems).toContain(fixtureIssueToCanonicalProblem[tag]);
```

Report coverage:

```text
BROKEN_ENCODING: detected 2/2
COPYRIGHT_UNVERIFIED: detected 5/5
WRONG_SUBJECT_TAG: detected 3/3
VERSION_TIMESTAMP_CONFLICT: detected 3/3
UNIT_EMBEDDED_IN_NUMERIC_ANSWER: detected 3/3
```

Do not hide failures by changing expected fixture tags.

## 13. Non-regression tests

Run the existing fixture and assert that all currently working behavior remains intact.

### Marks deduplication

```ts
const row = getRow("JEE26-PHY-006");

expect(row).toHaveIssue("POSITIVE_MARKS_INVALID");
expect(row).not.toHaveIssue("MARKS_INVALID");
expect(row).not.toHaveIssue("NEGATIVE_MARKS_EXCEED_POSITIVE");
```

### Integer subtype

```ts
const row = getRow("JEE26-PHY-007");

expect(row.rawType).toBe("INTEGER");
expect(row.responseMode).toBe("integer");
expect(row).toHaveIssue("INTEGER_ANSWER_NOT_INTEGER");
expect(row).toHaveIssue("TRUNCATED_STEM");
```

### Malformed LaTeX deduplication

```ts
const row = getRow("JEE26-PHY-015");

expect(row).toHaveIssue("MALFORMED_LATEX_DELIMITER");
expect(row).not.toHaveIssue("LATEX_STEM_DELIMITER_VALID");
```

### Unsupported types

```ts
for (const row of rowsWithRawType("MATRIX_MATCH")) {
  expect(row.canonicalType).toBe("UNSUPPORTED");
  expect(row).toHaveIssue("UNSUPPORTED_TYPE_FOR_TARGET_EXPORT");
}

for (const row of rowsWithRawType("Hotspot")) {
  expect(row.canonicalType).toBe("UNSUPPORTED");
  expect(row).toHaveIssue("UNSUPPORTED_TYPE_FOR_TARGET_EXPORT");
}
```

### Explanation evidence

```ts
const row = getRow("JEE26-CHE-002");
const issue = row.getIssue("EXPLANATION_RESULT_MISMATCH");

expect(issue.severity).toBe("BLOCK");
expect(issue.evidence.confidence).toBeGreaterThanOrEqual(0.9);
expect(issue.evidence.sourceSpan).toBeDefined();
```

### Unicode mathematics

```ts
expect(getRow("JEE26-MAT-002")).not.toHaveIssue("MALFORMED_LATEX_DELIMITER");
```

## 14. Diagnostic report changes

Extend the inferred mapping section so the report visibly shows:

```json
{
  "copyrightStatus": "Copyright_Status",
  "sourceReference": "Source_Reference",
  "teacherVersion": "Teacher_Version",
  "submittedAt": "Submitted_At",
  "lastUpdatedAt": "Last_Updated_At"
}
```

Add raw-sensitive rule diagnostics:

```text
Rule ID
Rows with required source fields populated
Rows with source fields missing
Rows evaluated
Issues emitted
```

Example:

```text
COPYRIGHT_UNVERIFIED
Rows with copyright/source data: 120
Issues emitted: 5
```

For every newly emitted issue, display evidence and correction actions.

Do not expose full raw cells unnecessarily; use concise snippets.

## 15. Required commands and validation run

Use the actual repository commands to run:

```text
formatter
TypeScript type checker
existing unit tests
new unit tests
integration tests
fixture validation
diagnostic report generation
```

Do not stop after code compilation.

Run the exact same fixture workflow used to generate the third-pass diagnostic report.

## 16. Acceptance criteria

The task is complete only when all of these pass:

```text
BROKEN_ENCODING detected for all injected corrupted rows
COPYRIGHT_UNVERIFIED detected for all injected rights rows
WRONG_SUBJECT_TAG detected for all deterministic subject mismatches
VERSION_TIMESTAMP_CONFLICT detected for all injected timestamp conflicts
UNIT_EMBEDDED_IN_NUMERIC_ANSWER detected for all injected unit-answer rows
```

And all non-regression assertions pass.

Expected fixture coverage:

```text
BROKEN_ENCODING: 2/2
COPYRIGHT_UNVERIFIED: 5/5
WRONG_SUBJECT_TAG: 3/3
VERSION_TIMESTAMP_CONFLICT: 3/3
UNIT_EMBEDDED_IN_NUMERIC_ANSWER: 3/3
```

Do not claim success if a rule is merely registered and executed but emits zero issues against its tagged fixture rows.

## 17. Required final response

Return:

```text
A. Files/modules inspected
B. Root causes confirmed
C. Mapping changes
D. Raw-row preservation changes
E. New or corrected rule behavior
F. Taxonomy changes
G. Tests added
H. Test command results
I. Fixture issue coverage before/after
J. Validation totals before/after
K. Non-regression verification
L. Remaining limitations
M. Exact commands executed
```

Also provide:

| Issue category         | Before | After | Coverage test |
| ---------------------- | -----: | ----: | ------------- |
| Broken encoding        |    0/2 |   ... | ...           |
| Copyright              |    0/5 |   ... | ...           |
| Subject mismatch       |    0/3 |   ... | ...           |
| Version conflict       |    0/3 |   ... | ...           |
| Unit in numeric answer |    0/3 |   ... | ...           |

Do not modify the fixture to make tests pass.

Do not weaken existing validation rules.

Begin by inspecting the actual current implementation and presenting the concise plan. Then implement the focused changes.
