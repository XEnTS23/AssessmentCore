# Antigravity Coding Prompt — AssessmentCore Validation Engine Second-Pass Hardening

You are working inside the **AssessmentCore** codebase. Act as a senior TypeScript engineer, validation-engine architect, data-quality engineer, and test engineer.

The first overhaul improved the validation engine substantially. The latest 120-row fixture now produces:

- Valid: 36
- Needs review: 41
- Rejected: 43

That is materially better than the previous 109 rejected rows, but the engine still has important correctness defects. Your task is to inspect the real code, fix those remaining defects, add regression tests, run the complete validation pipeline, and prove the changes with before/after results.

Do not only describe the fix. Modify the code, add tests, execute them, and report the exact files changed.

---

# 1. Primary goals

Fix the following remaining problems without weakening rules that are already working:

1. Duplicate user-facing issues for the same root cause.
2. Rules executing despite invalid prerequisites.
3. Integer response subtype not preserved.
4. Plain Unicode mathematics incorrectly treated as malformed LaTeX.
5. Explicit unsupported types reduced to `UNKNOWN`.
6. Broken encoding not detected.
7. Compliance and metadata rules still missing.
8. Units embedded inside numerical answers not detected.
9. Explanation consistency incomplete across MCQ, MSQ, and text-entry questions.
10. Duplicate-stem issues lack related-row context.
11. Diagnostic reports lack build and rule-execution metadata.
12. Some issue severities and messages are inconsistent.
13. Several intentional fixture errors still pass as valid.

---

# 2. Non-negotiable engineering constraints

- Inspect the repository before editing.
- Locate the actual:
  - spreadsheet parser;
  - column mapper;
  - type normalizer;
  - canonical question model;
  - rule registry;
  - issue collector;
  - issue deduplicator;
  - row-status reducer;
  - batch/export-readiness validator;
  - diagnostic report generator.
- Do not assume filenames from this prompt.
- Do not rewrite unrelated parts of the application.
- Do not silently modify academic meaning.
- Preserve raw and normalized values separately.
- Preserve explicit source question types even when unsupported.
- Calculate final row status only after:
  1. dependency suppression;
  2. issue deduplication;
  3. severity normalization.
- Add unit tests and fixture-driven integration tests.
- Run formatter, type checker, existing test suite, new unit tests, and fixture tests.
- Do not claim success if mandatory assertions fail.
- Do not optimize for matching aggregate counts. Optimize for correct row-level decisions.

---

# 3. Implement canonical issue deduplication

## Current failure

The same root problem produces multiple user-facing issues.

Examples:

```text
MARKS_INVALID
POSITIVE_MARKS_INVALID
NEGATIVE_MARKS_EXCEED_POSITIVE
```

for one row where `Positive_Marks = -4`.

```text
MALFORMED_LATEX_DELIMITER
LATEX_STEM_DELIMITER_VALID
```

for one unclosed `\(` delimiter.

```text
MCQ_ANSWER_IN_OPTIONS
MCQ_ANSWER_TEXT_MATCH
```

for the same invalid answer `E`.

## Required implementation

Create a canonical root-problem model.

Suggested structure:

```ts
type CanonicalProblem =
  | "POSITIVE_MARKS_INVALID"
  | "NEGATIVE_MARKS_INVALID"
  | "NEGATIVE_MARKS_EXCEED_POSITIVE"
  | "MALFORMED_LATEX_DELIMITER"
  | "ANSWER_NOT_IN_OPTIONS"
  | "MULTIPLE_ANSWERS_FOR_SCQ"
  | "UNIT_POLICY_INVALID"
  | string;

interface InternalValidationIssue {
  ruleId: string;
  canonicalProblem: CanonicalProblem;
  severity: Severity;
  field?: string;
  evidence?: unknown;
  message: string;
  dedupeKey?: string;
}
```

Generate a stable deduplication key:

```ts
const dedupeKey = [
  issue.canonicalProblem,
  issue.field ?? "",
  stableHash(issue.evidence ?? null),
].join(":");
```

When multiple issues share a root cause:

1. Keep the highest severity.
2. Prefer the most specific message.
3. Merge useful evidence.
4. Preserve suppressed rule IDs for diagnostics.
5. Show only one user-facing issue.

Example final output:

```text
POSITIVE_MARKS_INVALID
BLOCK
Field: marks
Found: -4
Expected: finite number greater than 0
Suppressed rules: MARKS_INVALID
```

For answer `E`, emit one issue:

```text
ANSWER_NOT_IN_OPTIONS
BLOCK
Correct answer: E
Available options: A, B, C, D
```

Do not emit both identifier and text-match errors when they originate from the same raw token and same failed lookup.

---

# 4. Implement rule prerequisites and suppression

## Current failure

Dependent rules execute even when prerequisite data is invalid.

Example:

```text
Positive marks = -4
Negative marks = 1
```

The engine reports:

```text
NEGATIVE_MARKS_EXCEED_POSITIVE
Absolute penalty magnitude (1) exceeds positive marks (+-4)
```

This is logically invalid.

## Required architecture

Add rule prerequisites:

```ts
interface ValidationRule {
  id: string;
  category: string;
  severity: Severity;
  requires?: Array<
    | "CANONICAL_TYPE_RESOLVED"
    | "STEM_VALID"
    | "OPTIONS_VALID"
    | "CORRECT_ANSWER_VALID"
    | "POSITIVE_MARKS_VALID"
    | "NEGATIVE_MARKS_VALID"
    | "NUMERIC_ANSWER_VALID"
    | "UNIT_POLICY_RESOLVED"
    | "MEDIA_MAPPING_RESOLVED"
  >;
  evaluate(context: ValidationContext): ValidationIssue[];
}
```

Before executing a rule, evaluate prerequisites.

Record diagnostic skip data:

```ts
{
  ruleId: "NEGATIVE_MARKS_EXCEED_POSITIVE",
  skipped: true,
  reason: "POSITIVE_MARKS_VALID prerequisite failed"
}
```

Mandatory suppressions:

- Skip `NEGATIVE_MARKS_EXCEED_POSITIVE` if positive marks are invalid.
- Skip answer-in-options checks if options are structurally invalid, but retain the more useful root issue where possible.
- Skip explanation numeric comparison if the accepted answer is missing or invalid.
- Skip type-specific rules if canonical type is unresolved.
- Skip unit-required rules unless unit policy is `required`.
- Skip duplicate semantic checks for missing, corrupted, or contextless stems.
- Skip media URL validation when the mapped field is a boolean media-required field.
- Skip export-compatibility checks when the row is already structurally impossible, unless the extra issue provides distinct actionable information.

---

# 5. Preserve integer and numeric response subtypes

## Current failure

Raw `INTEGER` questions normalize to generic `TEXT_ENTRY`, losing integer constraints.

Example fixture row:

```text
Raw type: INTEGER
Accepted answer: 1.5
```

The engine detects truncation but misses the invalid integer answer.

## Required model

Use:

```ts
type CanonicalQuestionType =
  | "MCQ"
  | "MSQ"
  | "TEXT_ENTRY"
  | "ORDER"
  | "UNSUPPORTED";

type TextEntryResponseMode = "text" | "numeric" | "integer" | "formula";

interface CanonicalTextEntryQuestion {
  type: "TEXT_ENTRY";
  rawType: string;
  responseMode: TextEntryResponseMode;
  acceptedAnswers: string[];
  numericTolerance?: number;
  exactMatchPolicy?: {
    decimalPlaces?: number;
    roundingMode?: string;
  };
  units?: string[];
}
```

Required aliases:

```text
NUMERICAL -> TEXT_ENTRY + responseMode=numeric
INTEGER -> TEXT_ENTRY + responseMode=integer
TEXT_ENTRY -> TEXT_ENTRY + responseMode=text unless configured otherwise
FORMULA -> TEXT_ENTRY + responseMode=formula
```

Add:

```text
INTEGER_ANSWER_NOT_INTEGER
Severity: BLOCK
```

Trigger when:

```ts
responseMode === "integer" &&
  acceptedAnswers.some((answer) => !Number.isInteger(Number(answer)));
```

Do not round automatically.

Add regression assertion:

```ts
expect(row("JEE26-PHY-007").responseMode).toBe("integer");
expect(row("JEE26-PHY-007")).toHaveIssue("INTEGER_ANSWER_NOT_INTEGER");
```

---

# 6. Stop applying LaTeX rules to plain Unicode mathematics

## Current failure

Valid plain-text mathematics still receives:

```text
LATEX_STEM_DELIMITER_VALID
Mathematical superscript or subscript notation should be enclosed...
```

Examples:

```text
Evaluate ∫₀¹ x^2 dx.
Evaluate ∫₀¹ x^3 dx.
Evaluate ∫₀¹ x^5 dx.
```

These are not malformed LaTeX.

## Required implementation

Separate detection into three stages:

### A. Detect actual LaTeX

Only run delimiter analysis when the text contains actual LaTeX evidence, such as:

```text
$
$$
\(
\)
\[
\]
\frac
\sqrt
\begin{
\end{
```

Do not treat a caret, Unicode subscript, Unicode superscript, Greek letter, integral symbol, combining vector arrow, or matrix-like brackets as proof of LaTeX.

### B. Validate Unicode content

Allow valid Unicode mathematical characters.

Possible optional issue:

```text
MATH_NORMALIZATION_RECOMMENDED
Severity: INFO
```

only when conversion to MathML or LaTeX is desirable.

### C. Production rendering

Use:

```text
MATH_RENDER_FAILED
Severity: BLOCK
```

only when the production-equivalent renderer actually fails.

Mandatory regression tests:

```ts
expect(validateStem("Evaluate ∫₀¹ x^2 dx.")).not.toContainRule(
  "LATEX_STEM_DELIMITER_VALID",
);

expect(validateStem("Evaluate ∫₀¹ x^2 dx.")).not.toContainRule(
  "MALFORMED_LATEX_DELIMITER",
);

expect(validateStem("Use \\(v^2=u^2+2as.")).toContainRule(
  "MALFORMED_LATEX_DELIMITER",
);
```

Remove the duplicate `LATEX_STEM_DELIMITER_VALID` issue when `MALFORMED_LATEX_DELIMITER` already exists.

---

# 7. Preserve explicit unsupported question types

## Current failure

Explicit source types such as:

```text
MATRIX_MATCH
Hotspot
```

are reduced to:

```text
UNKNOWN
```

This loses source meaning and makes correction harder.

## Required behavior

Distinguish:

```ts
type CanonicalTypeResolution =
  | {
      status: "supported";
      rawType: string;
      canonicalType: CanonicalQuestionType;
      subtype?: string;
    }
  | {
      status: "unsupported";
      rawType: string;
      canonicalType: "UNSUPPORTED";
      reason: string;
    }
  | {
      status: "unknown";
      rawType?: string;
      canonicalType: "UNKNOWN";
      reason: string;
    };
```

Rules:

- Explicit known-but-unsupported type → `UNSUPPORTED`
- Missing/unrecognizable type → `UNKNOWN`
- Never collapse known unsupported types into unknown.

Emit:

```text
UNSUPPORTED_TYPE_FOR_TARGET_EXPORT
Severity: BLOCK
```

Include:

- raw type;
- target export profile;
- required supporting fields;
- allowed manual conversion actions.

For matrix match, preserve:

- left entities;
- right entities;
- mappings;
- raw answer.

For hotspot, preserve:

- image requirement;
- filename/URL;
- coordinates;
- region IDs;
- raw answer.

If required fields are missing, also emit:

```text
MATRIX_MATCH_INCOMPLETE
HOTSPOT_CONFIGURATION_INCOMPLETE
```

but only if the type remains preserved.

Regression assertions:

```ts
expect(rowWithRawType("MATRIX_MATCH").canonicalType).toBe("UNSUPPORTED");

expect(rowWithRawType("MATRIX_MATCH")).toHaveIssue(
  "UNSUPPORTED_TYPE_FOR_TARGET_EXPORT",
);

expect(rowWithRawType("MATRIX_MATCH")).not.toHaveIssue(
  "UNKNOWN_QUESTION_TYPE_BLOCK",
);
```

---

# 8. Add broken-encoding validation

## Current failure

Injected replacement characters are not detected.

## Required rule

```text
BROKEN_ENCODING
Severity: BLOCK
```

Detect:

```ts
text.includes("\uFFFD");
```

Also detect:

- null byte `\u0000`;
- unexpected control characters except tab/newline/carriage return;
- high-confidence mojibake patterns, if implemented safely.

Scan:

- stem;
- options;
- answer;
- explanation;
- topic/chapter metadata;
- media alt text.

Do not guess the intended character.

Correction actions:

```text
Open original source
Restore original symbol
Replace corrupted value manually
Upload corrected source file
```

Audit before/after values.

Tests:

```ts
expect(validateText("x� + y� = 4")).toHaveIssue("BROKEN_ENCODING");

expect(validateText("x² + y² = 4")).not.toHaveIssue("BROKEN_ENCODING");
```

---

# 9. Add compliance and metadata validation

The following intentional fixture errors are still missed.

## A. Copyright

Add:

```text
COPYRIGHT_UNVERIFIED
Severity: BLOCK for production publishing
```

Trigger when:

- copyright status is `Unknown`;
- source says screenshot/copied/coaching material;
- attribution is required but missing;
- no licence/permission record exists.

Example:

```text
Source_Reference = Screenshot from coaching material
Copyright_Status = Unknown
```

Correction must require:

- ownership confirmation;
- licence;
- permission;
- approved adaptation;
- or replacement content.

Do not auto-clear this issue.

## B. Ambiguous media filename

Add:

```text
AMBIGUOUS_MEDIA_FILENAME
Severity: REVIEW
```

Trigger for:

```text
image1.png
final.png
diagram-new.png
```

especially when names are reused.

Include:

- candidate rows;
- candidate assets;
- thumbnail/previews if available.

Require manual mapping.

## C. Wrong subject tag

Add:

```text
WRONG_SUBJECT_TAG
Severity: REVIEW
```

Use deterministic chapter-subject taxonomy first.

Example:

```text
Chapter = Current Electricity
Subject = Chemistry
```

Suggest the likely correction but require confirmation.

## D. Non-standard difficulty

Add:

```text
NONSTANDARD_DIFFICULTY
Severity: WARNING
```

Approved values:

```text
Easy
Medium
Hard
```

Example:

```text
Very Hard
```

Support configured alias mappings, but preserve the raw teacher value.

## E. Version/timestamp conflict

Add:

```text
VERSION_TIMESTAMP_CONFLICT
Severity: REVIEW
```

Examples:

- updated time earlier than submitted time;
- “latest/final revised” version predates prior version;
- multiple final versions.

Require selection of authoritative version.

## F. Ambiguous partial marking

Add:

```text
PARTIAL_MARKING_AMBIGUOUS
Severity: BLOCK
```

Example:

```text
Award 3, 2, or 1 depending on closeness.
```

Require a deterministic scoring matrix.

---

# 10. Detect units embedded in numeric answers

## Current failure

Values such as:

```text
8 m
9.8 m/s²
3 mol
```

inside the numerical-answer field are not detected reliably.

## Required rule

```text
UNIT_EMBEDDED_IN_NUMERIC_ANSWER
Severity: BLOCK
```

Trigger when numeric mode is configured and the accepted-answer token contains:

- letters;
- recognized unit symbols;
- whitespace plus unit text;
- non-numeric suffixes.

Allow legitimate numeric forms:

```text
-3
2.5
1e-3
+4
0.3333
```

Do not split automatically.

Provide a suggested correction only when parsing is unambiguous:

```ts
{
  answer: 9.8,
  unit: "m/s²"
}
```

Mark the correction mode as `suggested`, not `safe_auto`.

Tests:

```ts
expect(validateNumericAnswer("9.8 m/s²")).toHaveIssue(
  "UNIT_EMBEDDED_IN_NUMERIC_ANSWER",
);

expect(validateNumericAnswer("9.8")).not.toHaveIssue(
  "UNIT_EMBEDDED_IN_NUMERIC_ANSWER",
);
```

---

# 11. Expand explanation consistency validation

## Current state

`EXPLANATION_KEY_MISMATCH` detects some explicit MCQ conflicts but misses others across text-entry and MSQ rows.

## Required architecture

Create a final-conclusion extractor that can return:

```ts
interface ExplanationConclusion {
  mode: "option" | "option_set" | "numeric" | "text";
  value: string | string[] | number;
  unit?: string;
  confidence: number;
  sourceSpan: string;
  extractionMethod:
    | "explicit_final_marker"
    | "last_equation"
    | "structured_section";
}
```

### MCQ

If explanation says:

```text
Final answer: Option D
```

and structured answer is `A`, emit:

```text
EXPLANATION_KEY_MISMATCH
BLOCK
```

### MSQ

If explanation conclusion contains option set `{A,C}` but structured answer is `{A,B,C}`, emit:

```text
EXPLANATION_KEY_MISMATCH
BLOCK
```

Normalize option order before comparing.

### Text entry

If the explanation ends with an option label such as:

```text
Final answer: Option D
```

for a numeric/text-entry question, emit:

```text
EXPLANATION_FORMAT_INCOMPATIBLE
REVIEW or BLOCK
```

because the explanation conclusion is incompatible with the interaction.

If a high-confidence numeric conclusion conflicts with the accepted answer beyond tolerance:

```text
EXPLANATION_NUMERIC_RESULT_MISMATCH
BLOCK
```

If confidence is below threshold:

```text
POSSIBLE_EXPLANATION_RESULT_MISMATCH
REVIEW
```

Include:

- extracted span;
- extracted value;
- structured value;
- confidence;
- comparison method.

Do not compare arbitrary intermediate numbers.

---

# 12. Improve duplicate reporting

## Current failure

The report says:

```text
This question stem is identical to another row.
```

without identifying the matching row.

## Required output

Create duplicate groups:

```ts
interface DuplicateGroup {
  groupId: string;
  type: "question_id" | "exact_stem" | "near_duplicate";
  members: Array<{
    rowNumber: number;
    submissionId?: string;
    questionId?: string;
  }>;
}
```

Every duplicate issue must include:

- duplicate group ID;
- current row;
- matching rows;
- relevant differences;
- similarity score for near duplicates.

Example:

```text
DUPLICATE_NORMALIZED_STEM_REVIEW
Group: DUP-STEM-004
Current: JEE26-CHE-024
Matches:
- JEE26-CHE-004
- JEE26-CHE-014
- JEE26-CHE-034
```

For duplicate IDs, flag both/all conflicting rows.

---

# 13. Normalize severity behavior

Use explicit confidence rules.

## Explanation mismatch

```text
High-confidence final result mismatch -> BLOCK
Low-confidence possible mismatch -> REVIEW
```

## Truncated stem

```text
Strong deterministic truncation -> BLOCK
Possible stylistic/incomplete wording -> REVIEW
```

## Duplicate options

```text
Exact duplicate visible option text -> REVIEW
Duplicate correct-answer ambiguity -> BLOCK
```

## Unsupported type

```text
Known unsupported type -> BLOCK with preserved raw type
Unknown/unmapped type -> BLOCK as UNKNOWN
```

Do not use inconsistent severity for the same evidence.

---

# 14. Add diagnostic build metadata

Every diagnostic report must show:

```text
Validator build
Git commit
Rule-set version
Normalizer version
Column-mapping version
Validation run ID
Execution timestamp
Input file checksum
Registered rule count
Executed rule count
Skipped rule count
Suppressed issue count
Batch-level issue count
Issue count by rule ID
```

Suggested model:

```ts
interface ValidationRunMetadata {
  validationRunId: string;
  validatorBuild: string;
  gitCommit?: string;
  ruleSetVersion: string;
  normalizerVersion: string;
  mappingVersion: string;
  executedAt: string;
  inputChecksum: string;
  registeredRules: number;
  executedRuleEvaluations: number;
  skippedRuleEvaluations: number;
  suppressedIssues: number;
}
```

The report must also show batch-level normalization decisions, such as:

```text
Negative marks input mode:
positive_penalty_magnitude

Normalization:
1 -> -1
2 -> -2
5 -> -5
```

---

# 15. Correction-action metadata

Every issue should include correction actions.

```ts
interface AllowedCorrection {
  actionId: string;
  label: string;
  mode: "safe_auto" | "suggested" | "manual_only";
  proposedValue?: unknown;
  fieldsChanged?: string[];
  invalidatesApprovals?: string[];
}
```

Examples:

### Duplicate issue

```text
Compare matching rows
Keep this row
Keep matching row
Mark as intentional version
Assign new Question_ID
```

### Unit embedded in answer

```text
Suggested split:
answer = 9.8
unit = m/s²
Mode: suggested
```

### Unsupported hotspot

```text
Provide image and coordinates
Convert manually to MCQ
Exclude from current export
```

### Copyright

```text
Upload permission
Mark teacher-created with author confirmation
Replace content
Exclude from publication
```

Every applied correction must create an audit record.

---

# 16. Mandatory regression tests

Use the 120-row fixture.

## Deduplication

```ts
const row = getRow("JEE26-PHY-006");

expect(row).toHaveIssue("POSITIVE_MARKS_INVALID");
expect(row).not.toHaveIssue("MARKS_INVALID");
expect(row).not.toHaveIssue("NEGATIVE_MARKS_EXCEED_POSITIVE");
```

The last rule should be skipped because marks are invalid.

## LaTeX deduplication

```ts
const row = getRow("JEE26-PHY-015");

expect(row).toHaveIssue("MALFORMED_LATEX_DELIMITER");
expect(row).not.toHaveIssue("LATEX_STEM_DELIMITER_VALID");
```

## Invalid answer deduplication

```ts
const row = getRow("JEE26-CHE-017");

expect(row).toHaveIssue("ANSWER_NOT_IN_OPTIONS");
expect(row).not.toHaveIssue("MCQ_ANSWER_IN_OPTIONS");
expect(row).not.toHaveIssue("MCQ_ANSWER_TEXT_MATCH");
```

Use the actual canonical naming chosen by implementation.

## Integer subtype

```ts
const row = getRow("JEE26-PHY-007");

expect(row.responseMode).toBe("integer");
expect(row).toHaveIssue("INTEGER_ANSWER_NOT_INTEGER");
expect(row).toHaveIssue("TRUNCATED_STEM");
```

## Unicode math

```ts
for (const id of ["JEE26-MAT-002", "JEE26-MAT-012", "JEE26-MAT-032"]) {
  expect(getRow(id)).not.toHaveIssue("LATEX_STEM_DELIMITER_VALID");

  expect(getRow(id)).not.toHaveIssue("MALFORMED_LATEX_DELIMITER");
}
```

## Unsupported types

```ts
for (const row of rowsWithRawType("MATRIX_MATCH")) {
  expect(row.canonicalType).toBe("UNSUPPORTED");
  expect(row.rawType).toBe("MATRIX_MATCH");
  expect(row).toHaveIssue("UNSUPPORTED_TYPE_FOR_TARGET_EXPORT");
  expect(row).not.toHaveIssue("UNKNOWN_QUESTION_TYPE_BLOCK");
}
```

Repeat for `Hotspot`.

## Broken encoding

```ts
expect(rowContaining("\uFFFD")).toHaveIssue("BROKEN_ENCODING");
```

## Copyright

```ts
expect(
  rowWith({
    copyrightStatus: "Unknown",
    sourceReference: "Screenshot from coaching material",
  }),
).toHaveIssue("COPYRIGHT_UNVERIFIED");
```

## Ambiguous media filename

```ts
expect(rowWithMediaFile("image1.png")).toHaveIssue("AMBIGUOUS_MEDIA_FILENAME");
```

## Metadata

```ts
expect(rowWithSubjectChapterMismatch()).toHaveIssue("WRONG_SUBJECT_TAG");

expect(rowWithDifficulty("Very Hard")).toHaveIssue("NONSTANDARD_DIFFICULTY");

expect(rowWithVersionTimestampConflict()).toHaveIssue(
  "VERSION_TIMESTAMP_CONFLICT",
);
```

## Partial marking

```ts
expect(
  rowWithPartialRule("Award 3, 2, or 1 depending on closeness"),
).toHaveIssue("PARTIAL_MARKING_AMBIGUOUS");
```

## Embedded unit

```ts
expect(rowWithNumericAnswer("8 m")).toHaveIssue(
  "UNIT_EMBEDDED_IN_NUMERIC_ANSWER",
);
```

## Duplicate context

```ts
const issue = getRow("JEE26-CHE-024").getIssue(
  "DUPLICATE_NORMALIZED_STEM_REVIEW",
);

expect(issue.relatedRows.length).toBeGreaterThan(0);
expect(issue.duplicateGroupId).toBeDefined();
```

## Report metadata

```ts
expect(report.metadata.validationRunId).toBeDefined();
expect(report.metadata.ruleSetVersion).toBeDefined();
expect(report.metadata.normalizerVersion).toBeDefined();
expect(report.metadata.registeredRules).toBeGreaterThan(0);
expect(report.metadata.suppressedIssues).toBeGreaterThanOrEqual(0);
```

---

# 17. Expected outcome

After the second-pass fixes:

- The engine must retain all currently working detections.
- Duplicate root issues must collapse into one user-facing issue.
- Invalid prerequisite chains must no longer create nonsense messages.
- Integer violations must be detected.
- Valid Unicode math must stop generating LaTeX warnings.
- Matrix-match and hotspot types must remain identifiable.
- Broken encoding must be blocked.
- Copyright, media naming, subject, difficulty, version, partial-marking, and embedded-unit issues must be detected.
- Explanation consistency must work across MCQ, MSQ, and text-entry questions.
- Duplicate issues must identify related rows.
- Reports must show version/build/run metadata.

Do not force the final totals to a predetermined number. Correctness of each row and issue is the acceptance criterion.

---

# 18. Deliverables

Return all of the following:

```text
A. Repository areas inspected
B. Root causes found
C. Architecture changes made
D. Rules added
E. Rules modified
F. Rules removed or suppressed
G. Issue deduplication behavior
H. Rule dependency behavior
I. Files changed
J. Unit test results
K. Integration/fixture test results
L. Before/after validation totals
M. Remaining unsupported types
N. Remaining known limitations
O. Exact commands executed
```

Also provide a compact table:

| Rule/Defect | Before | After | Test |
| ----------- | ------ | ----- | ---- |

Do not leave placeholder TODOs for the listed critical fixes.

Begin by reading the real validation pipeline and presenting a concise implementation plan. Then make the changes.
