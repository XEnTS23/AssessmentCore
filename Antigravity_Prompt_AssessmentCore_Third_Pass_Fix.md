# Antigravity Coding Prompt — AssessmentCore Third-Pass Validation Fix

You are working inside the **AssessmentCore** codebase. Act as a senior TypeScript validation-engine engineer and test engineer.

The second-pass hardened validator is substantially improved, but several mandatory regression requirements still fail. Do not overhaul the entire system again. Make a **focused third-pass correction** limited to the defects listed in this prompt.

The latest diagnostic run reports:

```text
Validator Build: 2.0.0-hardened
Rule Set Version: 2.1.0
Normalizer Version: 1.4.0
Total Rows: 120
Valid: 34
Caution: 1
Needs Review: 40
Rejected: 45
Registered Rules: 98
Suppressed Issues: 3
```

The architecture is partially working:

- batch-level negative-mark normalization works;
- Unicode mathematics is no longer broadly rejected;
- duplicate-stem messages now identify matching rows;
- some issue suppression works;
- report run metadata exists.

However, the validator still fails explicit regression requirements.

Your task is to inspect the current implementation, correct the six remaining defect groups below, add regression tests, rerun the fixture, and prove the fixes.

---

# 1. Scope restrictions

Only modify code required for:

1. canonical issue deduplication;
2. rule prerequisite suppression;
3. integer response subtype preservation;
4. supported/unsupported/unknown type resolution;
5. encoding, copyright, subject, and version rules;
6. explanation conclusion confidence and severity handling.

Do not redesign unrelated validation modules.

Do not remove currently working rules for:

- missing answers;
- missing media;
- invalid option keys;
- duplicate question IDs;
- truncated stems;
- missing context;
- malformed LaTeX;
- numeric tolerance;
- negative-mark magnitude normalization;
- language mismatch;
- ambiguous media filenames;
- non-standard difficulty;
- ambiguous partial marking.

Do not optimize for an aggregate row count. Optimize for correct row-level issues.

---

# 2. Inspect before modifying

Locate and inspect the actual implementation of:

- issue creation;
- canonical problem assignment;
- deduplication;
- rule ordering;
- prerequisite checks;
- canonical row normalization;
- type alias resolution;
- response subtype storage;
- text integrity validation;
- metadata validation;
- explanation conclusion extraction;
- row status calculation;
- diagnostic reporting;
- fixture-based validation tests.

Before editing, provide a concise implementation plan listing:

```text
A. Current files/modules involved
B. Root cause per defect group
C. Planned changes
D. Tests to be added
```

Then implement the changes.

---

# 3. Fix canonical issue deduplication

## Current failure

The report still shows duplicate user-facing issues for the same canonical problem.

Example:

```text
MARKS_INVALID
Canonical Problem: POSITIVE_MARKS_INVALID

POSITIVE_MARKS_INVALID
Canonical Problem: POSITIVE_MARKS_INVALID
```

Both are visible for the same row and field.

Malformed LaTeX also produces:

```text
MALFORMED_LATEX_DELIMITER
Canonical Problem: MALFORMED_LATEX_DELIMITER

LATEX_STEM_DELIMITER_VALID
Canonical Problem: MALFORMED_LATEX_DELIMITER
```

Both remain visible.

This proves the deduplicator is using an overly specific key such as:

- raw rule ID;
- message text;
- severity;
- evidence object serialization;
- or another unstable value.

## Required deduplication identity

For row-level issues, use:

```ts
interface CanonicalIssueIdentity {
  scope: "row";
  rowKey: string;
  canonicalProblem: string;
  canonicalField: string;
}
```

Recommended key:

```ts
function getIssueDedupeKey(
  issue: InternalValidationIssue,
  row: CanonicalQuestion,
): string {
  return [
    "row",
    row.internalRowId,
    issue.canonicalProblem,
    normalizeCanonicalField(issue.field),
  ].join(":");
}
```

Do not include:

- rule ID;
- severity;
- message;
- evidence hash;
- timestamp.

Evidence differences must be merged, not treated as separate root issues.

For batch/package issues, use a scope-appropriate key.

## Merge behavior

When multiple issues have the same canonical identity:

1. Keep the highest severity.
2. Select a primary rule using configured priority.
3. Merge unique evidence.
4. Merge allowed correction actions.
5. Record all suppressed rule IDs.
6. Display only one user-facing issue.
7. Increment the suppressed issue count.

Suggested priority:

```ts
const primaryRulePriority = [
  "POSITIVE_MARKS_INVALID",
  "MALFORMED_LATEX_DELIMITER",
  "ANSWER_NOT_IN_OPTIONS",
];
```

Example expected result:

```text
Rule ID: POSITIVE_MARKS_INVALID
Canonical Problem: POSITIVE_MARKS_INVALID
Severity: BLOCK
Field: marks
Message: Positive marks must be a finite number greater than 0. Found '-4'.
Suppressed Rules:
- MARKS_INVALID
```

Expected malformed-LaTeX result:

```text
Rule ID: MALFORMED_LATEX_DELIMITER
Canonical Problem: MALFORMED_LATEX_DELIMITER
Severity: BLOCK
Suppressed Rules:
- LATEX_STEM_DELIMITER_VALID
```

## Mandatory tests

```ts
it("deduplicates generic and specific positive-mark issues", () => {
  const row = validateFixtureRow("JEE26-PHY-006");

  expect(row.userFacingIssues).toContainRule("POSITIVE_MARKS_INVALID");
  expect(row.userFacingIssues).not.toContainRule("MARKS_INVALID");

  const issue = row.getIssue("POSITIVE_MARKS_INVALID");
  expect(issue.suppressedRuleIds).toContain("MARKS_INVALID");
});

it("deduplicates malformed LaTeX issues", () => {
  const row = validateFixtureRow("JEE26-PHY-015");

  expect(row.userFacingIssues).toContainRule("MALFORMED_LATEX_DELIMITER");

  expect(row.userFacingIssues).not.toContainRule("LATEX_STEM_DELIMITER_VALID");
});
```

Also verify equivalent rows:

```text
JEE26-CHE-007
JEE26-MAT-007
JEE26-PHY-034
JEE26-CHE-026
JEE26-MAT-025
```

---

# 4. Fix prerequisite suppression before issue generation

## Current failure

For `Positive_Marks = -4`, the engine still evaluates:

```text
NEGATIVE_MARKS_EXCEED_POSITIVE
```

and produces:

```text
Absolute penalty magnitude (1) exceeds positive marks (+-4).
```

This rule must not run when positive marks are invalid.

The same problem exists in MCQ validation: answer-membership checks run when the option set is structurally invalid.

## Required prerequisite engine

Rules must declare prerequisites:

```ts
type ValidationCapability =
  | "TYPE_RESOLVED"
  | "STEM_PRESENT"
  | "STEM_INTEGRITY_VALID"
  | "OPTIONS_PRESENT"
  | "OPTIONS_STRUCTURALLY_VALID"
  | "CORRECT_ANSWER_PRESENT"
  | "CORRECT_ANSWER_PARSEABLE"
  | "POSITIVE_MARKS_VALID"
  | "NEGATIVE_MARKS_VALID"
  | "NUMERIC_ANSWER_VALID"
  | "EXPLANATION_PRESENT"
  | "EXPLANATION_CONCLUSION_EXTRACTED";

interface ValidationRule {
  id: string;
  requires?: ValidationCapability[];
  evaluate(context: ValidationContext): ValidationIssue[];
}
```

Build capabilities once per row after normalization and foundational validation.

Before a rule executes:

```ts
const missingPrerequisites = rule.requires?.filter(
  (capability) => !context.capabilities.has(capability),
);

if (missingPrerequisites?.length) {
  context.diagnostics.recordSkippedRule({
    ruleId: rule.id,
    missingPrerequisites,
  });
  return [];
}
```

## Required prerequisites

### `NEGATIVE_MARKS_EXCEED_POSITIVE`

```ts
requires: ["POSITIVE_MARKS_VALID", "NEGATIVE_MARKS_VALID"];
```

### Answer-in-options validation

```ts
requires: [
  "TYPE_RESOLVED",
  "OPTIONS_PRESENT",
  "OPTIONS_STRUCTURALLY_VALID",
  "CORRECT_ANSWER_PRESENT",
  "CORRECT_ANSWER_PARSEABLE",
];
```

### Explanation numeric comparison

```ts
requires: [
  "NUMERIC_ANSWER_VALID",
  "EXPLANATION_PRESENT",
  "EXPLANATION_CONCLUSION_EXTRACTED",
];
```

### Duplicate semantic comparison

Require valid, non-empty, non-corrupted stem.

## Expected fixture behavior

For `JEE26-PHY-006`:

```text
Visible:
POSITIVE_MARKS_INVALID

Not visible:
MARKS_INVALID
NEGATIVE_MARKS_EXCEED_POSITIVE
```

Diagnostic skip:

```text
Rule: NEGATIVE_MARKS_EXCEED_POSITIVE
Skipped because:
POSITIVE_MARKS_VALID failed
```

For `JEE26-PHY-028`, where MCQ options are absent and the answer is `A,C`:

Visible:

```text
MCQ_MIN_OPTIONS
MCQ_SINGLE_CORRECT_ONLY
MCQ_SHOULD_BE_MSQ_REVIEW
```

Do not emit `ANSWER_NOT_IN_OPTIONS` until a valid option set exists.

## Mandatory tests

```ts
it("skips penalty comparison when positive marks are invalid", () => {
  const row = validateFixtureRow("JEE26-PHY-006");

  expect(row).toHaveIssue("POSITIVE_MARKS_INVALID");
  expect(row).not.toHaveIssue("NEGATIVE_MARKS_EXCEED_POSITIVE");

  expect(row.skippedRules).toContainEqual(
    expect.objectContaining({
      ruleId: "NEGATIVE_MARKS_EXCEED_POSITIVE",
    }),
  );
});

it("skips answer membership when options are invalid", () => {
  const row = validateFixtureRow("JEE26-PHY-028");

  expect(row).toHaveIssue("MCQ_MIN_OPTIONS");
  expect(row).not.toHaveIssue("ANSWER_NOT_IN_OPTIONS");
});
```

---

# 5. Preserve integer response mode

## Current failure

Raw `INTEGER` questions are normalized to generic `TEXT_ENTRY`.

Example:

```text
Question ID: JEE26-PHY-007
Raw type: INTEGER
Accepted answer: 1.5
```

The report identifies only `TRUNCATED_STEM` and misses:

```text
INTEGER_ANSWER_NOT_INTEGER
```

## Required canonical model

Add or preserve:

```ts
type TextEntryResponseMode = "text" | "numeric" | "integer" | "formula";

interface CanonicalTextEntryQuestion {
  type: "TEXT_ENTRY";
  rawType: string;
  responseMode: TextEntryResponseMode;
  acceptedAnswers: string[];
}
```

Alias behavior:

```text
NUMERICAL -> TEXT_ENTRY / numeric
INTEGER -> TEXT_ENTRY / integer
FORMULA -> TEXT_ENTRY / formula
TEXT_ENTRY -> TEXT_ENTRY / text unless another mode is explicit
```

Do not infer integer mode merely from the current answer value. Preserve it from the source type.

## Required rule

```text
INTEGER_ANSWER_NOT_INTEGER
Severity: BLOCK
Field: acceptedAnswers
```

Trigger:

```ts
if (
  row.type === "TEXT_ENTRY" &&
  row.responseMode === "integer" &&
  row.acceptedAnswers.some((answer) => {
    const value = Number(answer);
    return !Number.isFinite(value) || !Number.isInteger(value);
  })
) {
  // issue
}
```

Do not round automatically.

Correction options:

```text
Change response mode to numeric
Correct accepted answer
Request academic review
```

All must be manual or suggested, never safe auto-fixes.

## Mandatory test

```ts
it("preserves integer subtype and rejects decimal integer answers", () => {
  const row = validateFixtureRow("JEE26-PHY-007");

  expect(row.rawType).toBe("INTEGER");
  expect(row.type).toBe("TEXT_ENTRY");
  expect(row.responseMode).toBe("integer");

  expect(row).toHaveIssue("INTEGER_ANSWER_NOT_INTEGER");
  expect(row).toHaveIssue("TRUNCATED_STEM");
});
```

---

# 6. Preserve known unsupported types

## Current failure

Known explicit types such as:

```text
MATRIX_MATCH
Hotspot
```

still become:

```text
UNKNOWN
UNKNOWN_QUESTION_TYPE_BLOCK
```

This destroys source-type information.

## Required distinction

Use three states:

```ts
type TypeResolution =
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

- Known supported alias → supported
- Known but currently unsupported type → unsupported
- Missing or unrecognized type → unknown

Maintain a registry:

```ts
const questionTypeRegistry = {
  SCQ: { status: "supported", canonicalType: "MCQ" },
  MCQ: { status: "supported", canonicalType: "MCQ" },
  MSQ: { status: "supported", canonicalType: "MSQ" },
  NUMERICAL: {
    status: "supported",
    canonicalType: "TEXT_ENTRY",
    responseMode: "numeric",
  },
  INTEGER: {
    status: "supported",
    canonicalType: "TEXT_ENTRY",
    responseMode: "integer",
  },
  ASSERTION_REASON: {
    status: "supported",
    canonicalType: "MCQ",
    subtype: "ASSERTION_REASON",
  },
  MATRIX_MATCH: {
    status: "unsupported",
  },
  HOTSPOT: {
    status: "unsupported",
  },
};
```

Normalize case and common punctuation variants.

## Required issues

Known unsupported:

```text
UNSUPPORTED_TYPE_FOR_TARGET_EXPORT
Severity: BLOCK
```

Unknown:

```text
UNKNOWN_QUESTION_TYPE_BLOCK
Severity: BLOCK
```

Do not use the unknown rule for a known unsupported type.

For matrix match, preserve:

```ts
rawType: "MATRIX_MATCH";
canonicalType: "UNSUPPORTED";
rawAnswer: "P-1,Q-2";
```

For hotspot, preserve:

```ts
rawType: "Hotspot"
canonicalType: "UNSUPPORTED"
media fields
raw answer
```

If configuration is incomplete, add a distinct issue:

```text
MATRIX_MATCH_INCOMPLETE
HOTSPOT_CONFIGURATION_INCOMPLETE
```

## Mandatory tests

```ts
for (const row of fixtureRowsWithRawType("MATRIX_MATCH")) {
  expect(row.typeResolution.status).toBe("unsupported");
  expect(row.rawType).toBe("MATRIX_MATCH");
  expect(row.canonicalType).toBe("UNSUPPORTED");
  expect(row).toHaveIssue("UNSUPPORTED_TYPE_FOR_TARGET_EXPORT");
  expect(row).not.toHaveIssue("UNKNOWN_QUESTION_TYPE_BLOCK");
}

for (const row of fixtureRowsWithRawType("Hotspot")) {
  expect(row.typeResolution.status).toBe("unsupported");
  expect(row.rawType.toLowerCase()).toBe("hotspot");
  expect(row).toHaveIssue("UNSUPPORTED_TYPE_FOR_TARGET_EXPORT");
}
```

---

# 7. Add missing encoding, copyright, subject, and version rules

These rules must be registered, executed, and included in diagnostic rule counts.

## 7.1 Broken encoding

Rule:

```text
BROKEN_ENCODING
Severity: BLOCK
```

Scan these fields:

```text
stem
options
correct answer
accepted answers
explanation
subject
chapter
topic
media alt text
```

Detect at minimum:

```ts
value.includes("\uFFFD");
value.includes("\u0000");
```

Also detect disallowed C0 controls, except:

```text
\t
\n
\r
```

Do not auto-replace the value.

Tests:

```ts
expect(validateText("x� + y� = 4")).toHaveIssue("BROKEN_ENCODING");

expect(validateText("x² + y² = 4")).not.toHaveIssue("BROKEN_ENCODING");
```

Fixture rows containing replacement characters must receive the issue.

## 7.2 Copyright

Ensure these columns are mapped:

```ts
copyrightStatus?: string;
sourceReference?: string;
```

Expected source columns:

```text
Copyright_Status
Source_Reference
```

Rule:

```text
COPYRIGHT_UNVERIFIED
Severity: BLOCK for production mode
```

Trigger when:

```ts
copyrightStatus is missing or "Unknown"
AND
sourceReference indicates copied/screenshot/coaching/textbook material
```

Also trigger when policy requires rights approval and status is not approved.

Do not auto-resolve.

Correction actions:

```text
Upload permission or licence
Confirm teacher-created content
Add attribution
Replace content
Exclude from export
```

## 7.3 Subject mismatch

Map a deterministic taxonomy:

```ts
const chapterSubjectTaxonomy = {
  "Current Electricity": "Physics",
  Kinematics: "Physics",
  "Chemical Bonding": "Chemistry",
  "Coordination Compounds": "Chemistry",
  "Quadratic Equations": "Mathematics",
  "Integral Calculus": "Mathematics",
};
```

Use the real project taxonomy if one exists.

Rule:

```text
WRONG_SUBJECT_TAG
Severity: REVIEW
```

Trigger only when deterministic metadata conflicts.

Do not use an LLM as the sole source of truth.

Correction must be suggested, not automatic.

## 7.4 Version/timestamp conflict

Ensure these fields are mapped:

```ts
teacherVersion?: string;
submittedAt?: string | Date;
lastUpdatedAt?: string | Date;
```

Source columns:

```text
Teacher_Version
Submitted_At
Last_Updated_At
```

Rule:

```text
VERSION_TIMESTAMP_CONFLICT
Severity: REVIEW
```

Trigger when:

```ts
lastUpdatedAt < submittedAt;
```

Also flag suspicious multiple-final labels where version history is available.

Message must include both timestamps and the version label.

## Mandatory fixture assertions

```ts
expect(fixtureRowWithReplacementCharacter()).toHaveIssue("BROKEN_ENCODING");

expect(
  fixtureRowWith({
    copyrightStatus: "Unknown",
    sourceReference: "Screenshot from coaching material",
  }),
).toHaveIssue("COPYRIGHT_UNVERIFIED");

expect(fixtureRowWithDeterministicSubjectMismatch()).toHaveIssue(
  "WRONG_SUBJECT_TAG",
);

expect(fixtureRowWithUpdateBeforeSubmission()).toHaveIssue(
  "VERSION_TIMESTAMP_CONFLICT",
);
```

---

# 8. Fix explanation conclusion confidence and severity

## Current failure

The report says:

```text
Explanation concludes with result '2',
but accepted answer is '1.25'.
Severity: REVIEW
```

If the extractor has high confidence that this is the final conclusion, it must be a block.

The report also omits:

- extraction confidence;
- source span;
- extraction method;
- comparison mode.

## Required model

```ts
interface ExplanationConclusion {
  mode: "option" | "option_set" | "numeric" | "text";
  value: string | string[] | number;
  unit?: string;
  confidence: number;
  sourceSpan: string;
  extractionMethod:
    | "explicit_final_marker"
    | "therefore_clause"
    | "last_equation_result"
    | "structured_field";
}
```

## Required severity behavior

```ts
if (confidence >= 0.9 && valuesConflict) {
  emit({
    ruleId: "EXPLANATION_RESULT_MISMATCH",
    severity: "BLOCK"
  });
}

if (confidence >= 0.65 && confidence < 0.9 && valuesConflict) {
  emit({
    ruleId: "POSSIBLE_EXPLANATION_RESULT_MISMATCH",
    severity: "REVIEW"
  });
}

if (confidence < 0.65) {
  emit nothing;
}
```

Thresholds may be configurable, but behavior must be deterministic.

## MCQ

Explicit:

```text
Final answer: Option D
```

versus structured `A`:

```text
EXPLANATION_KEY_MISMATCH
BLOCK
```

## MSQ

Normalize option sets:

```text
A,C
C,A
```

as equivalent.

A mismatch between `{A,C}` and `{A,B,C}` is a block when extracted with high confidence.

## Text entry

If the explanation concludes:

```text
Final answer: Option D
```

for a numerical or text-entry question, emit:

```text
EXPLANATION_FORMAT_INCOMPATIBLE
Severity: REVIEW or BLOCK
```

Use block when it clearly proves the explanation belongs to a different interaction.

## Numeric comparison

Compare against:

- numeric tolerance;
- exact match policy;
- accepted range;
- unit policy.

Never compare arbitrary intermediate numbers.

## Report evidence

Every explanation issue must show:

```text
Extracted value
Structured value
Confidence
Extraction method
Source span
Comparison policy
```

## Mandatory tests

```ts
it("blocks high-confidence numeric conclusion mismatch", () => {
  const issue = validateExplanation({
    explanation: "Therefore, the final answer is 2.",
    acceptedAnswer: "1.25",
    tolerance: 0,
  });

  expect(issue.ruleId).toBe("EXPLANATION_RESULT_MISMATCH");
  expect(issue.severity).toBe("BLOCK");
  expect(issue.evidence.confidence).toBeGreaterThanOrEqual(0.9);
});

it("does not compare intermediate numbers", () => {
  const issues = validateExplanation({
    explanation: "n = 4.4 / 44 = 0.1 mol. Therefore, answer = 0.1 mol.",
    acceptedAnswer: "0.1",
    tolerance: 0,
  });

  expect(issues).not.toContainRule("EXPLANATION_RESULT_MISMATCH");
});

it("flags incompatible option conclusion for text entry", () => {
  const issues = validateExplanation({
    questionType: "TEXT_ENTRY",
    explanation: "Final answer: Option D",
    acceptedAnswer: "1.5",
  });

  expect(issues).toContainRule("EXPLANATION_FORMAT_INCOMPATIBLE");
});
```

---

# 9. Improve diagnostic report evidence

The report already includes useful run metadata. Extend it with:

```text
Skipped rule evaluations
Issue counts by Rule ID
Issue counts by canonical problem
Suppressed issues by source rule
Registered-but-never-executed rules
Input file checksum
Batch-level issues
```

Add a section:

```text
## Rule Execution Diagnostics

| Rule ID | Registered | Executed | Skipped | Issues Emitted | Issues Suppressed |
```

This must make it obvious whether these rules ran:

```text
INTEGER_ANSWER_NOT_INTEGER
UNSUPPORTED_TYPE_FOR_TARGET_EXPORT
BROKEN_ENCODING
COPYRIGHT_UNVERIFIED
WRONG_SUBJECT_TAG
VERSION_TIMESTAMP_CONFLICT
```

Add a failure check in diagnostic mode:

```ts
const mandatoryRules = [...];

for (const ruleId of mandatoryRules) {
  if (!registry.has(ruleId)) {
    throw new Error(`Mandatory validation rule is not registered: ${ruleId}`);
  }
}
```

Do not fail normal production requests solely because a non-mandatory rule emitted zero issues.

---

# 10. Acceptance tests for the 120-row fixture

These are mandatory.

## Marks

```ts
const row = getRow("JEE26-PHY-006");

expect(row).toHaveIssue("POSITIVE_MARKS_INVALID");
expect(row).not.toHaveIssue("MARKS_INVALID");
expect(row).not.toHaveIssue("NEGATIVE_MARKS_EXCEED_POSITIVE");
expect(row.skippedRuleIds).toContain("NEGATIVE_MARKS_EXCEED_POSITIVE");
```

Repeat for:

```text
JEE26-CHE-007
JEE26-MAT-007
```

## LaTeX

```ts
const row = getRow("JEE26-PHY-015");

expect(row).toHaveIssue("MALFORMED_LATEX_DELIMITER");
expect(row).not.toHaveIssue("LATEX_STEM_DELIMITER_VALID");
```

## Integer

```ts
const row = getRow("JEE26-PHY-007");

expect(row.rawType).toBe("INTEGER");
expect(row.responseMode).toBe("integer");
expect(row).toHaveIssue("INTEGER_ANSWER_NOT_INTEGER");
expect(row).toHaveIssue("TRUNCATED_STEM");
```

## Unsupported types

For every `MATRIX_MATCH` and `Hotspot` fixture row:

```ts
expect(row.canonicalType).toBe("UNSUPPORTED");
expect(row).toHaveIssue("UNSUPPORTED_TYPE_FOR_TARGET_EXPORT");
expect(row).not.toHaveIssue("UNKNOWN_QUESTION_TYPE_BLOCK");
```

## Broken encoding

The intentionally corrupted fixture rows must contain:

```text
BROKEN_ENCODING
```

## Copyright

All rows with:

```text
Copyright_Status = Unknown
Source_Reference = Screenshot from coaching material
```

must contain:

```text
COPYRIGHT_UNVERIFIED
```

## Subject

All deterministic subject/chapter mismatches must contain:

```text
WRONG_SUBJECT_TAG
```

## Version

Rows where:

```text
Last_Updated_At < Submitted_At
```

must contain:

```text
VERSION_TIMESTAMP_CONFLICT
```

## Explanation

High-confidence mismatches must be blocks and show evidence.

## Diagnostic report

```ts
expect(report.metadata.inputChecksum).toBeDefined();
expect(report.executionDiagnostics.skippedRuleEvaluations).toBeGreaterThan(0);

for (const ruleId of [
  "INTEGER_ANSWER_NOT_INTEGER",
  "UNSUPPORTED_TYPE_FOR_TARGET_EXPORT",
  "BROKEN_ENCODING",
  "COPYRIGHT_UNVERIFIED",
  "WRONG_SUBJECT_TAG",
  "VERSION_TIMESTAMP_CONFLICT",
]) {
  expect(report.ruleDiagnostics[ruleId]).toBeDefined();
}
```

---

# 11. Required execution

Run:

```text
formatter
TypeScript type checker
existing unit tests
new unit tests
integration tests
fixture validation
diagnostic report generation
```

Use the actual project commands.

Do not stop after unit tests. Run the same workflow used to generate the diagnostic report.

---

# 12. Required final response

Return:

```text
A. Root causes
B. Files changed
C. Deduplication changes
D. Prerequisite-suppression changes
E. Type-normalization changes
F. New validation rules
G. Explanation-parser changes
H. Tests added
I. Test command output
J. Before/after fixture totals
K. Rule-execution diagnostics
L. Remaining limitations
M. Exact commands used
```

Also include:

| Regression requirement | Before | After | Passing test |
| ---------------------- | ------ | ----- | ------------ |

Do not claim completion unless every mandatory acceptance test in this prompt passes.

Begin by inspecting the current implementation and showing the concise implementation plan. Then make the changes.
