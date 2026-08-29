# Codex Agent Prompt — Finish AssessmentCore Validation Once and for All

You are working inside the **AssessmentCore** validation-engine repository.

Act as a senior TypeScript validation engineer and test-infrastructure engineer.

This is the final stabilization task. Do not perform another broad validator rewrite.

The production validator is already working correctly for most rules. The remaining problem is that the current workbook does not contain the raw columns or mutations needed to test copyright, version, broken encoding, and active unit-bearing numerical answers.

Your job is to:

1. freeze all currently working validator behavior;
2. create a deterministic regression fixture that actually contains every required test case;
3. store expected issues in a sidecar manifest, not inside the teacher workbook;
4. validate fixture coverage only from final emitted issues;
5. fail the test suite and report generation on any contradiction;
6. fix the two remaining report-format defects;
7. prove all target rules and all existing rules work together.

Do not claim completion until every acceptance criterion below passes.

---

## 1. Current trusted baseline

Latest build:

```text
Validator Build: 4.2.0-dataflow-coverage-integrity
Rule Set Version: 4.2.0
Normalizer Version: 1.6.2
```

Current realistic workbook summary:

```text
Total Rows: 120
Valid: 28
Caution: 1
Needs Review: 41
Rejected: 50
```

The following behavior is working and must not change:

```text
POSITIVE_MARKS_INVALID
MARKS_INVALID suppression
NEGATIVE_MARKS_EXCEED_POSITIVE prerequisite suppression
INTEGER response-mode preservation
INTEGER_ANSWER_NOT_INTEGER
MALFORMED_LATEX_DELIMITER
LATEX_STEM_DELIMITER_VALID suppression
Unicode mathematics acceptance
MATRIX_MATCH -> UNSUPPORTED
Hotspot -> UNSUPPORTED
UNSUPPORTED_TYPE_FOR_TARGET_EXPORT
MATRIX_MATCH_INCOMPLETE
HOTSPOT_CONFIGURATION_INCOMPLETE
EXPLANATION_RESULT_MISMATCH
EXPLANATION_KEY_MISMATCH
EXPLANATION_FORMAT_INCOMPATIBLE
MCQ prerequisite suppression
DUPLICATE_QUESTION_ID
DUPLICATE_NORMALIZED_STEM_REVIEW
WRONG_SUBJECT_TAG
INACTIVE_FIELD_CONTAINS_DATA
rule execution diagnostics
suppressed issue diagnostics
```

Add regression assertions before changing any production logic.

---

## 2. Stop using `test1.xlsx` to prove absent scenarios

The latest report established that the current workbook does not contain:

```text
Copyright_Status
Source_Reference
Teacher_Version
Submitted_At
Last_Updated_At
Known_Issue_Tag
```

It also contains:

```text
0 detectable broken-encoding rows
0 active numeric rows with recognized unit-bearing answers
```

Keep `test1.xlsx` as a realistic mixed-data integration fixture.

Create a separate deterministic regression fixture specifically for rule verification.

---

## 3. Required new artifacts

Create:

```text
test/fixtures/validator-regression-fixture.xlsx
test/fixtures/validator-regression-expectations.json
scripts/generate-validator-regression-fixture.ts
```

Use the repository's existing XLSX library. Do not manually commit an opaque workbook without also committing the deterministic generator.

Add package scripts equivalent to:

```json
{
  "scripts": {
    "fixture:generate:validator": "...",
    "test:validator:regression": "...",
    "report:validator:regression": "..."
  }
}
```

Use actual repository conventions.

---

## 4. Regression workbook schema

Use the real production columns:

```text
Question_ID
Question_Type
Question_Stem
Option_A
Option_B
Option_C
Option_D
Correct_Answer
Numerical_Answer
Tolerance
Answer_Unit
Explanation
Subject
Chapter
Topic
Difficulty
Positive_Marks
Negative_Marks
Partial_Marking_Rule
Image_Required
Image_File_Name
Image_Source
Expected_Time_sec
Language
Copyright_Status
Source_Reference
Teacher_Version
Submitted_At
Last_Updated_At
```

Do not add `Known_Issue_Tag` to the workbook. Expectations belong only in the sidecar JSON.

---

## 5. Stable regression row IDs and test cases

### Broken encoding

Create:

```text
REG-ENC-001
REG-ENC-002
```

Both must contain an actual `U+FFFD` replacement character in a raw textual cell.

Examples:

```text
REG-ENC-001 Question_Stem = "The value of x� is:"
REG-ENC-002 Explanation = "Using the relation E = h�."
```

After writing and re-reading the workbook, assert the raw cell still contains `\uFFFD`.

Expected:

```text
BROKEN_ENCODING
Severity: BLOCK
```

No unrelated issue should be introduced.

### Copyright

Create:

```text
REG-COPY-001
REG-COPY-002
REG-COPY-003
REG-COPY-004
REG-COPY-005
```

Use otherwise valid questions with:

```text
Unknown + Screenshot from coaching material
Unverified + Scanned textbook page
Unknown + Copied from question bank PDF
Unverified + Previous examination paper screenshot
Unknown + Website content
```

Expected:

```text
COPYRIGHT_UNVERIFIED
```

Add:

```text
REG-COPY-CONTROL
Copyright_Status = Teacher Created
Source_Reference = Created by faculty
```

It must not emit `COPYRIGHT_UNVERIFIED`.

### Subject mismatch

Create:

```text
REG-SUBJ-001: Chemistry + Dual Nature of Matter
REG-SUBJ-002: Mathematics + Periodic Classification
REG-SUBJ-003: Physics + Permutations and Combinations
```

Expected:

```text
WRONG_SUBJECT_TAG
Severity: REVIEW
```

### Version conflict

Create:

```text
REG-VERS-001
REG-VERS-002
REG-VERS-003
```

Each must satisfy:

```text
Last_Updated_At < Submitted_At
```

Example:

```text
Teacher_Version = final_final_latest2
Submitted_At = 2026-07-20T10:00:00Z
Last_Updated_At = 2026-07-19T10:00:00Z
```

Expected:

```text
VERSION_TIMESTAMP_CONFLICT
Severity: REVIEW
```

Add `REG-VERS-CONTROL` with correct chronology and forbid this issue.

### Active unit-bearing numerical answers

Create active `NUMERICAL` rows:

```text
REG-UNIT-001 Numerical_Answer = 9.8 m/s²
REG-UNIT-002 Numerical_Answer = 3 mol
REG-UNIT-003 Numerical_Answer = 8 m
```

Expected:

```text
UNIT_EMBEDDED_IN_NUMERIC_ANSWER
Severity: BLOCK
```

Do not normalize or split the raw value before the rule runs.

Add controls:

```text
REG-UNIT-CONTROL-001 = 1e-3
REG-UNIT-CONTROL-002 = -4.5
REG-UNIT-CONTROL-003 = .5
```

They must not emit the unit issue.

### Inactive numerical fields

Create:

```text
REG-INACTIVE-001
REG-INACTIVE-002
REG-INACTIVE-003
REG-INACTIVE-004
REG-INACTIVE-005
```

Use otherwise valid:

```text
SCQ
MSQ
ASSERTION_REASON
MATRIX_MATCH
Hotspot
```

Populate `Numerical_Answer`.

Expected:

```text
INACTIVE_FIELD_CONTAINS_DATA
Severity: REVIEW
```

For matrix-match and hotspot, allow unavoidable type/configuration issues explicitly in the manifest.

---

## 6. Sidecar expectation manifest

Create `test/fixtures/validator-regression-expectations.json`.

Suggested structure:

```json
{
  "fixtureVersion": "1.0.0",
  "rows": {
    "REG-ENC-001": {
      "requiredCanonicalProblems": ["BROKEN_ENCODING"],
      "forbiddenCanonicalProblems": [],
      "allowedAdditionalCanonicalProblems": [],
      "expectedSeverityByProblem": {
        "BROKEN_ENCODING": "BLOCK"
      }
    }
  }
}
```

The manifest is the only source of expected outcomes.

Do not infer expectations from issue counts.

---

## 7. Coverage must use final emitted issues only

Use the same final post-deduplication issue collection that generates row-level output:

```ts
const actualProblems = new Set(
  row.finalIssues.map((issue) => issue.canonicalProblem),
);
```

For every row:

```ts
for (const required of expectation.requiredCanonicalProblems) {
  assert(actualProblems.has(required));
}

for (const forbidden of expectation.forbiddenCanonicalProblems) {
  assert(!actualProblems.has(forbidden));
}
```

Only allow additional issues explicitly listed in `allowedAdditionalCanonicalProblems`.

Never use the manifest itself as proof of detection.

---

## 8. Hard report-integrity invariants

Report generation and CI must fail when:

```text
coverage says detected > 0 but final emitted rows = 0
a detected row lacks the matching final canonical problem
mapping hash used by ingestion differs from report hash
an expected fixture row is missing
a required fixture header is missing
a raw mutation is absent after workbook read-back
```

Print exact:

```text
Expected row IDs
Applicable row IDs
Detected row IDs
Missed row IDs
Forbidden issue violations
Unexpected additional issues
```

Do not print only aggregate counts.

---

## 9. Verify raw mutations after workbook write/read

Read the generated workbook back using the production ingestion library.

Assert:

```ts
rawRow("REG-ENC-001").cells["Question_Stem"].rawText.includes("\uFFFD") ===
  true;
```

Assert non-zero raw populations for copyright and version columns.

Assert:

```text
Active unit-bearing numerical rows: 3
Inactive Numerical_Answer rows: 5
```

The regression report must include this proof.

---

## 10. Keep the realistic 120-row integration test

Continue running `test1.xlsx`.

For it, report honestly:

```text
Copyright fields absent
Version fields absent
No detectable broken encoding
No active unit-bearing numeric answers
No expectation manifest attached
```

That is not a failure.

The dedicated regression fixture proves the missing rules.

---

## 11. Fix batch-level issue reporting

`NEGATIVE_MARKS_CONVENTION_AMBIGUOUS` is batch-level.

It must appear only under:

```text
## Batch-Level Issues
```

Do not attach it to the first row.

Use separate types:

```ts
interface BatchIssue {
  scope: "batch";
}

interface RowIssue {
  scope: "row";
  rowNumber: number;
  questionId: string;
}
```

Do not mix batch counts into row statuses unless product policy explicitly requires it.

---

## 12. Fix source-rule versus canonical-problem diagnostics

Show separate columns:

```text
Source Rule
Pre-dedup Emitted
Suppressed
Final Rows Under Same Rule ID
Canonical Problem
Final Rows Under Canonical Problem
```

Example:

```text
MCQ_ANSWER_IN_OPTIONS | 2 | 0 | 0 | ANSWER_NOT_IN_OPTIONS | 2
```

Do not imply an issue disappeared when it was retained under a canonical problem.

---

## 13. Non-regression assertions for `test1.xlsx`

Keep these passing:

```ts
expect(getRow("JEE26-PHY-006")).toHaveProblem("POSITIVE_MARKS_INVALID");

expect(getRow("JEE26-PHY-006")).not.toHaveRule("MARKS_INVALID");

expect(getRow("JEE26-PHY-006")).not.toHaveProblem(
  "NEGATIVE_MARKS_EXCEED_POSITIVE",
);
```

```ts
expect(getRow("JEE26-PHY-007").responseMode).toBe("integer");

expect(getRow("JEE26-PHY-007")).toHaveProblem("INTEGER_ANSWER_NOT_INTEGER");
```

```ts
expect(getRow("JEE26-PHY-015")).toHaveProblem("MALFORMED_LATEX_DELIMITER");

expect(getRow("JEE26-PHY-015")).not.toHaveRule("LATEX_STEM_DELIMITER_VALID");
```

```ts
expect(issueCount("WRONG_SUBJECT_TAG")).toBe(3);
expect(issueCount("INACTIVE_FIELD_CONTAINS_DATA")).toBe(5);
```

```ts
for (const row of rowsWithRawType("MATRIX_MATCH")) {
  expect(row.canonicalType).toBe("UNSUPPORTED");
  expect(row).toHaveProblem("UNSUPPORTED_TYPE_FOR_TARGET_EXPORT");
}
```

The 120-row totals must remain:

```text
Valid: 28
Caution: 1
Needs Review: 41
Rejected: 50
```

Any change must be explained by exact row IDs and an intentional rule change.

---

## 14. Required dedicated fixture results

The regression fixture must produce:

```text
BROKEN_ENCODING: 2/2
COPYRIGHT_UNVERIFIED: 5/5
WRONG_SUBJECT_TAG: 3/3
VERSION_TIMESTAMP_CONFLICT: 3/3
UNIT_EMBEDDED_IN_NUMERIC_ANSWER: 3/3
INACTIVE_FIELD_CONTAINS_DATA: 5/5
```

Controls:

```text
COPYRIGHT false positives: 0
VERSION false positives: 0
UNIT false positives: 0
BROKEN_ENCODING false positives on valid Unicode math: 0
```

Every count must be backed by exact row IDs.

---

## 15. Required reports

Generate:

```text
artifacts/validation-report-test1.md
artifacts/validation-report-regression-fixture.md
```

The regression report must include:

```text
mapping hash
raw field population
raw encoding read-back proof
expected row IDs
actual row IDs
missed rows
unexpected issues
control-row results
batch issues
source-rule/canonical-problem diagnostics
```

---

## 16. Build-failing conditions

CI must exit non-zero when:

```text
a required issue is missed
a forbidden issue is emitted
an unexpected issue is emitted without allowlisting
a fixture row is missing
a required column is missing
a raw mutation was not preserved
coverage contradicts final issues
mapping hashes differ
the realistic 120-row regression changes unexpectedly
```

Do not downgrade these to warnings.

---

## 17. Version update

After every test passes:

```text
Validator Build: 5.0.0-regression-fixture-stable
Rule Set Version: 5.0.0
Normalizer Version: 1.7.0
Regression Fixture Version: 1.0.0
```

---

## 18. Required commands

Run actual repository commands for:

```text
formatter
TypeScript type check
existing unit tests
fixture generator
fixture read-back verification
raw mutation tests
rule-specific regression tests
control negative tests
coverage integrity tests
test1 integration test
regression fixture integration test
both report generators
```

Provide exact commands and exit codes.

---

## 19. Final acceptance checklist

```text
[ ] Existing 120-row totals preserved
[ ] Existing working rules preserved
[ ] Dedicated regression workbook generated
[ ] Sidecar expectation manifest generated
[ ] Broken encoding 2/2
[ ] Copyright 5/5
[ ] Subject mismatch 3/3
[ ] Version conflict 3/3
[ ] Active embedded units 3/3
[ ] Inactive field data 5/5
[ ] Control false positives 0
[ ] Coverage derived from final issues
[ ] Coverage contradictions impossible
[ ] Batch issues separated from row issues
[ ] Source-rule and canonical diagnostics separated
[ ] CI exits non-zero on mismatch
[ ] Both reports generated
```

---

## 20. Final Codex response format

Return:

```text
A. Files inspected
B. Root causes
C. Files created
D. Files modified
E. Regression fixture schema
F. Expectation manifest structure
G. Raw mutation read-back proof
H. Rule coverage results
I. Control-row results
J. Existing validator non-regression results
K. Batch reporting fix
L. Rule/canonical diagnostics fix
M. Report paths
N. Exact commands and exit codes
O. Remaining limitations
```

Include:

| Rule                            | Expected | Detected | Missed | False positives |
| ------------------------------- | -------: | -------: | -----: | --------------: |
| BROKEN_ENCODING                 |        2 |      ... |    ... |             ... |
| COPYRIGHT_UNVERIFIED            |        5 |      ... |    ... |             ... |
| WRONG_SUBJECT_TAG               |        3 |      ... |    ... |             ... |
| VERSION_TIMESTAMP_CONFLICT      |        3 |      ... |    ... |             ... |
| UNIT_EMBEDDED_IN_NUMERIC_ANSWER |        3 |      ... |    ... |             ... |
| INACTIVE_FIELD_CONTAINS_DATA    |        5 |      ... |    ... |             ... |

Begin by inspecting the repository and presenting a concise plan.

Then add failing tests and the deterministic fixture generator before changing production code.
