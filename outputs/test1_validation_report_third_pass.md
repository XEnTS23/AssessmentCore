# Diagnostic Validation Report for test1.xlsx (Dataflow/Coverage Integrity)

## Run Metadata

- Validator Build: 4.2.0-dataflow-coverage-integrity
- Rule Set Version: 4.2.0
- Normalizer Version: 1.6.2
- Input File SHA-256: 627b944269e0c16e04246c9ed29281e9d39e03e2a3f88b104a790f45a6869825
- Mapping Version: 1.0.0
- Mapping Hash Used by Ingestion: 557eb0cb
- Mapping Hash Used by Report: 557eb0cb
- Registered Rules: 102
- Executed Rule Evaluations: 7148
- Skipped Rule Evaluations: 74
- Suppressed Issues: 16
- Batch-Level Issues: 1

## Canonical Column Mapping

```json
{
  "options": ["Option_A", "Option_B", "Option_C", "Option_D"],
  "stem": "Question_Stem",
  "correctAnswer": "Correct_Answer",
  "type": "Question_Type",
  "explanation": "Explanation",
  "questionId": "Question_ID",
  "subject": "Subject",
  "topic": "Topic",
  "chapter": "Chapter",
  "difficulty": "Difficulty",
  "marks": "Positive_Marks",
  "negativeMarks": "Negative_Marks",
  "partialMarkingRule": "Partial_Marking_Rule",
  "mediaRequired": "Image_Required",
  "mediaFileName": "Image_File_Name",
  "mediaSource": "Image_Source",
  "acceptedAnswers": "Numerical_Answer",
  "tolerance": "Tolerance",
  "units": "Answer_Unit",
  "timeLimitSeconds": "Expected_Time_sec",
  "language": "Language"
}
```

| Canonical Field | Workbook Column | Header Exists | Populated Raw Rows |
| --------------- | --------------- | ------------: | -----------------: |
| copyrightStatus | (unmapped)      |            No |              0/120 |
| sourceReference | (unmapped)      |            No |              0/120 |
| teacherVersion  | (unmapped)      |            No |              0/120 |
| submittedAt     | (unmapped)      |            No |              0/120 |
| lastUpdatedAt   | (unmapped)      |            No |              0/120 |

## Raw Field Population Diagnostics

- Copyright_Status populated: 0/120
- Source_Reference populated: 0/120
- Teacher_Version populated: 0/120
- Submitted_At populated: 0/120
- Last_Updated_At populated: 0/120
- Rows containing detectable raw encoding corruption: 0
- Raw encoding row IDs: []
- Active numeric/integer rows with raw Numerical_Answer: 42
- Active rows with recognized unit-bearing answers: 0
- UNIT_EMBEDDED_IN_NUMERIC_ANSWER final emitted rows: 0
- Rows with both timestamp fields populated: 0
- Rows with both timestamps parsed successfully: 0
- Rows with timestamp parse failures: 0
- Rows with chronological conflicts: 0

## Fixture Coverage

- Expectation source column Known_Issue_Tag: absent
- Fixture expectation metadata is unavailable in this workbook; no expected row IDs are inferred from intended counts.
- BROKEN_ENCODING: Fixture mutation not present in workbook.

| Issue Tag                       | Expected | Applicable | Detected | Missed |
| ------------------------------- | -------: | ---------: | -------: | -----: |
| BROKEN_ENCODING                 |        0 |          0 |        0 |      0 |
| COPYRIGHT_UNVERIFIED            |        0 |          0 |        0 |      0 |
| WRONG_SUBJECT_TAG               |        0 |          0 |        0 |      0 |
| VERSION_TIMESTAMP_CONFLICT      |        0 |          0 |        0 |      0 |
| UNIT_EMBEDDED_IN_NUMERIC_ANSWER |        0 |          0 |        0 |      0 |
| INACTIVE_FIELD_CONTAINS_DATA    |        0 |          0 |        0 |      0 |

## Row-Level Fixture Proof

### BROKEN_ENCODING

- Expected: []
- Applicable: []
- Detected from final issues: []
- Missed: []
- Non-applicable: []
- Reclassified as inactive-field conflict: []
- All final emitted rows for canonical problem: []

### COPYRIGHT_UNVERIFIED

- Expected: []
- Applicable: []
- Detected from final issues: []
- Missed: []
- Non-applicable: []
- Reclassified as inactive-field conflict: []
- All final emitted rows for canonical problem: []

### WRONG_SUBJECT_TAG

- Expected: []
- Applicable: []
- Detected from final issues: []
- Missed: []
- Non-applicable: []
- Reclassified as inactive-field conflict: []
- All final emitted rows for canonical problem: [JEE26-PHY-017, JEE26-CHE-018, JEE26-MAT-017]

### VERSION_TIMESTAMP_CONFLICT

- Expected: []
- Applicable: []
- Detected from final issues: []
- Missed: []
- Non-applicable: []
- Reclassified as inactive-field conflict: []
- All final emitted rows for canonical problem: []

### UNIT_EMBEDDED_IN_NUMERIC_ANSWER

- Expected: []
- Applicable: []
- Detected from final issues: []
- Missed: []
- Non-applicable: []
- Reclassified as inactive-field conflict: []
- All final emitted rows for canonical problem: []

### INACTIVE_FIELD_CONTAINS_DATA

- Expected: []
- Applicable: []
- Detected from final issues: []
- Missed: []
- Non-applicable: []
- Reclassified as inactive-field conflict: []
- All final emitted rows for canonical problem: [JEE26-PHY-028, JEE26-PHY-035, JEE26-CHE-023, JEE26-CHE-040, JEE26-MAT-013]

## Validation Summary

- Total Rows Evaluated: 120
- Valid Rows: 28
- Caution Rows: 1
- Needs Review Rows: 41
- Rejected Rows: 50

## Issue Counts by Rule ID

```json
{
  "NEGATIVE_MARKS_CONVENTION_AMBIGUOUS": 1,
  "REQUIRED_MEDIA_MISSING": 4,
  "NUMERIC_TOLERANCE_MISSING": 5,
  "TEXT_ENTRY_HAS_ANSWER": 3,
  "DUPLICATE_QUESTION_ID": 6,
  "POSITIVE_MARKS_INVALID": 3,
  "TRUNCATED_STEM": 3,
  "INTEGER_ANSWER_NOT_INTEGER": 2,
  "DUPLICATE_NORMALIZED_STEM_REVIEW": 41,
  "MCQ_ANSWER_IN_OPTIONS": 2,
  "AMBIGUOUS_MEDIA_FILENAME": 3,
  "EXPLANATION_KEY_MISMATCH": 3,
  "MALFORMED_LATEX_DELIMITER": 4,
  "WRONG_SUBJECT_TAG": 3,
  "CONTEXT_MISSING": 3,
  "MSQ_OPTIONS_UNIQUE": 1,
  "NEGATIVE_MARKS_EXCEED_POSITIVE": 3,
  "NONSTANDARD_DIFFICULTY": 2,
  "MCQ_HAS_CORRECT_ANSWER": 2,
  "MCQ_MIN_OPTIONS": 2,
  "MCQ_SINGLE_CORRECT_ONLY": 3,
  "INACTIVE_FIELD_CONTAINS_DATA": 5,
  "MCQ_SHOULD_BE_MSQ_REVIEW": 3,
  "LANGUAGE_METADATA_MISMATCH": 3,
  "PARTIAL_MARKING_AMBIGUOUS_PROSE": 2,
  "EXPLANATION_INSUFFICIENT": 3,
  "EXPLANATION_FORMAT_INCOMPATIBLE": 2,
  "UNSUPPORTED_TYPE_FOR_TARGET_EXPORT": 5,
  "MATRIX_MATCH_INCOMPLETE": 3,
  "EXPLANATION_RESULT_MISMATCH": 1,
  "HOTSPOT_CONFIGURATION_INCOMPLETE": 2,
  "MCQ_OPTIONS_UNIQUE": 2,
  "MULTIPLE_CORRECT_OPTIONS_SUSPECTED": 2
}
```

## Issue Counts by Canonical Problem

```json
{
  "NEGATIVE_MARKS_CONVENTION_AMBIGUOUS": 1,
  "REQUIRED_MEDIA_MISSING": 4,
  "NUMERIC_TOLERANCE_MISSING": 5,
  "TEXT_ENTRY_HAS_ANSWER": 3,
  "DUPLICATE_QUESTION_ID": 6,
  "POSITIVE_MARKS_INVALID": 3,
  "TRUNCATED_STEM": 3,
  "INTEGER_ANSWER_NOT_INTEGER": 2,
  "DUPLICATE_NORMALIZED_STEM_REVIEW": 41,
  "ANSWER_NOT_IN_OPTIONS": 2,
  "AMBIGUOUS_MEDIA_FILENAME": 3,
  "EXPLANATION_KEY_MISMATCH": 3,
  "MALFORMED_LATEX_DELIMITER": 4,
  "WRONG_SUBJECT_TAG": 3,
  "CONTEXT_MISSING": 3,
  "MSQ_OPTIONS_UNIQUE": 1,
  "NEGATIVE_MARKS_EXCEED_POSITIVE": 3,
  "NONSTANDARD_DIFFICULTY": 2,
  "MCQ_HAS_CORRECT_ANSWER": 2,
  "MCQ_MIN_OPTIONS": 2,
  "MCQ_SINGLE_CORRECT_ONLY": 3,
  "INACTIVE_FIELD_CONTAINS_DATA": 5,
  "MCQ_SHOULD_BE_MSQ_REVIEW": 3,
  "LANGUAGE_METADATA_MISMATCH": 3,
  "PARTIAL_MARKING_AMBIGUOUS_PROSE": 2,
  "EXPLANATION_INSUFFICIENT": 3,
  "EXPLANATION_FORMAT_INCOMPATIBLE": 2,
  "UNSUPPORTED_TYPE_FOR_TARGET_EXPORT": 5,
  "MATRIX_MATCH_INCOMPLETE": 3,
  "EXPLANATION_RESULT_MISMATCH": 1,
  "HOTSPOT_CONFIGURATION_INCOMPLETE": 2,
  "MCQ_OPTIONS_UNIQUE": 2,
  "MULTIPLE_CORRECT_OPTIONS_SUSPECTED": 2
}
```

## Suppressed Issues by Source Rule

```json
{
  "MARKS_INVALID": 3,
  "RESPONSE_SUBTYPE_LOST": 2,
  "MCQ_ANSWER_TEXT_MATCH": 2,
  "LATEX_STEM_DELIMITER_VALID": 4,
  "EXPLICIT_TYPE_OVERRIDDEN": 5
}
```

## Rule Execution Diagnostics

| Rule ID                                     | Executed | Skipped | Pre-dedup Emitted | Suppressed | Final Issue Rows |
| ------------------------------------------- | -------: | ------: | ----------------: | ---------: | ---------------: |
| AMBIGUOUS_MEDIA_FILENAME                    |      120 |       0 |                 3 |          0 |                3 |
| BROKEN_ENCODING                             |      120 |       0 |                 0 |          0 |                0 |
| COLUMN_MAPPING_AMBIGUOUS                    |      120 |       0 |                 0 |          0 |                0 |
| CONTEXT_MISSING                             |      120 |       0 |                 3 |          0 |                3 |
| COPYRIGHT_UNVERIFIED                        |      120 |       0 |                 0 |          0 |                0 |
| CORRECTION_ACTION_AMBIGUOUS                 |      120 |       0 |                 0 |          0 |                0 |
| CORRECTION_AUDIT_TRAIL_MISSING              |      120 |       0 |                 0 |          0 |                0 |
| DELIMITER_FORMAT_FOR_MSQ                    |       12 |       0 |                 0 |          0 |                0 |
| DUPLICATE_MATCH_CONTEXT_MISSING             |      120 |       0 |                 0 |          0 |                0 |
| DUPLICATE_NORMALIZED_STEM_REVIEW            |      111 |       4 |                41 |          0 |               41 |
| DUPLICATE_QUESTION_ID                       |      120 |       0 |                 6 |          0 |                6 |
| EMPTY_ROW_WARNING                           |      120 |       0 |                 0 |          0 |                0 |
| EXPLANATION_FORMAT_INCOMPATIBLE             |       41 |       4 |                 2 |          0 |                2 |
| EXPLANATION_INSUFFICIENT                    |      120 |       0 |                 3 |          0 |                3 |
| EXPLANATION_KEY_MISMATCH                    |       29 |      41 |                 3 |          0 |                3 |
| EXPLANATION_MISSING                         |      120 |       0 |                 0 |          0 |                0 |
| EXPLANATION_RESULT_MISMATCH                 |       39 |       6 |                 1 |          0 |                1 |
| EXPLANATION_UNIT_MISMATCH                   |       45 |       0 |                 0 |          0 |                0 |
| EXPLICIT_TYPE_OVERRIDDEN                    |      120 |       0 |                 5 |          5 |                0 |
| HOTSPOT_CONFIGURATION_INCOMPLETE            |        5 |       0 |                 2 |          0 |                2 |
| INACTIVE_FIELD_CONTAINS_DATA                |      120 |       0 |                 5 |          0 |                5 |
| INTEGER_ANSWER_NOT_INTEGER                  |       45 |       0 |                 2 |          0 |                2 |
| ISSUE_MESSAGE_TRUNCATED                     |      120 |       0 |                 0 |          0 |                0 |
| LANGUAGE_METADATA_MISMATCH                  |      120 |       0 |                 3 |          0 |                3 |
| LATEX_STEM_DELIMITER_VALID                  |      115 |       0 |                 4 |          4 |                0 |
| MALFORMED_LATEX_DELIMITER                   |      120 |       0 |                 4 |          0 |                4 |
| MARKS_INVALID                               |      120 |       0 |                 3 |          3 |                0 |
| MATH_RENDER_FAILED                          |      120 |       0 |                 0 |          0 |                0 |
| MATRIX_MATCH_INCOMPLETE                     |        5 |       0 |                 3 |          0 |                3 |
| MCQ_ANSWER_IN_OPTIONS                       |       53 |       5 |                 2 |          0 |                0 |
| MCQ_ANSWER_TEXT_AMBIGUOUS                   |       58 |       0 |                 0 |          0 |                0 |
| MCQ_ANSWER_TEXT_MATCH                       |       53 |       5 |                 2 |          2 |                0 |
| MCQ_HAS_CORRECT_ANSWER                      |       58 |       0 |                 2 |          0 |                2 |
| MCQ_MIN_OPTIONS                             |       58 |       0 |                 2 |          0 |                2 |
| MCQ_OPTIONS_UNIQUE                          |       58 |       0 |                 2 |          0 |                2 |
| MCQ_OPTION_IDENTIFIERS_UNIQUE               |       58 |       0 |                 0 |          0 |                0 |
| MCQ_OPTION_IDENTIFIER_VALID                 |       58 |       0 |                 0 |          0 |                0 |
| MCQ_OPTION_TEXT_NOT_EMPTY                   |       58 |       0 |                 0 |          0 |                0 |
| MCQ_SHOULD_BE_MSQ_REVIEW                    |       58 |       0 |                 3 |          0 |                3 |
| MCQ_SINGLE_CORRECT_ONLY                     |       58 |       0 |                 3 |          0 |                3 |
| MCQ_SUSPECT_TRUE_FALSE_REVIEW               |       58 |       0 |                 0 |          0 |                0 |
| MEDIA_REFERENCE_NOT_FOUND                   |      120 |       0 |                 0 |          0 |                0 |
| MEDIA_URL_INVALID_FORMAT                    |      120 |       0 |                 0 |          0 |                0 |
| MSQ_ANSWER_IDENTIFIER_VALID                 |       12 |       0 |                 0 |          0 |                0 |
| MSQ_ANSWER_TEXT_AMBIGUOUS                   |       12 |       0 |                 0 |          0 |                0 |
| MSQ_ANSWER_TEXT_MATCH                       |       12 |       0 |                 0 |          0 |                0 |
| MSQ_CORRECT_ANSWERS_IN_OPTIONS              |       12 |       0 |                 0 |          0 |                0 |
| MSQ_EXACT_SET_MATCH                         |       12 |       0 |                 0 |          0 |                0 |
| MSQ_HAS_CORRECT_ANSWERS                     |       12 |       0 |                 0 |          0 |                0 |
| MSQ_MIN_OPTIONS                             |       12 |       0 |                 0 |          0 |                0 |
| MSQ_MIXED_IDENTIFIER_MODE                   |       12 |       0 |                 0 |          0 |                0 |
| MSQ_NO_DUPLICATE_CORRECT_ANSWERS            |       12 |       0 |                 0 |          0 |                0 |
| MSQ_OPTIONS_UNIQUE                          |       12 |       0 |                 1 |          0 |                1 |
| MSQ_OPTION_IDENTIFIERS_UNIQUE               |       12 |       0 |                 0 |          0 |                0 |
| MSQ_SCORING_REVIEW                          |       12 |       0 |                 0 |          0 |                0 |
| MULTIPLE_CORRECT_OPTIONS_SUSPECTED          |       58 |       0 |                 2 |          0 |                2 |
| NEGATIVE_MARKS_CONVENTION_AMBIGUOUS         |      120 |       0 |                 0 |          0 |                1 |
| NEGATIVE_MARKS_EXCEED_POSITIVE              |      117 |       3 |                 3 |          0 |                3 |
| NEGATIVE_MARKS_INVALID                      |      120 |       0 |                 0 |          0 |                0 |
| NONSTANDARD_DIFFICULTY                      |      120 |       0 |                 2 |          0 |                2 |
| NORMALIZATION_AUDIT_MISSING                 |      120 |       0 |                 0 |          0 |                0 |
| NUMERIC_ANSWER_NOT_NUMERIC                  |       45 |       0 |                 0 |          0 |                0 |
| NUMERIC_TOLERANCE_INVALID                   |       45 |       0 |                 0 |          0 |                0 |
| NUMERIC_TOLERANCE_MISSING                   |       45 |       0 |                 5 |          0 |                5 |
| ORDER_HAS_CORRECT_SEQUENCE                  |        0 |       0 |                 0 |          0 |                0 |
| ORDER_MIN_OPTIONS                           |        0 |       0 |                 0 |          0 |                0 |
| ORDER_SEQUENCE_INVALID                      |        0 |       0 |                 0 |          0 |                0 |
| ORDER_SEQUENCE_MATCH                        |        0 |       0 |                 0 |          0 |                0 |
| PARTIAL_MARKING_AMBIGUOUS                   |       12 |       0 |                 0 |          0 |                0 |
| PARTIAL_MARKING_AMBIGUOUS_PROSE             |      120 |       0 |                 2 |          0 |                2 |
| PASSAGE_LINK_BROKEN                         |      120 |       0 |                 0 |          0 |                0 |
| POSITIVE_MARKS_INVALID                      |      120 |       0 |                 3 |          0 |                3 |
| POSSIBLE_EXPLANATION_RESULT_MISMATCH        |       39 |       6 |                 0 |          0 |                0 |
| QUESTION_ID_FIELD_MISMAPPED                 |      120 |       0 |                 0 |          0 |                0 |
| QUESTION_SCORING_CONFLICTS_WITH_SECTION     |      120 |       0 |                 0 |          0 |                0 |
| QUESTION_TYPE_ALIAS_UNMAPPED                |        0 |       0 |                 0 |          0 |                0 |
| REPORT_FIELD_MISLABELED                     |      120 |       0 |                 0 |          0 |                0 |
| REQUIRED_MEDIA_MISSING                      |      120 |       0 |                 4 |          0 |                4 |
| REQUIRED_QUESTION_FIELD                     |      120 |       0 |                 0 |          0 |                0 |
| RESPONSE_SUBTYPE_LOST                       |       45 |       0 |                 2 |          2 |                0 |
| TEXT_ENTRY_ACCEPTED_ANSWERS_NOT_EMPTY       |       45 |       0 |                 0 |          0 |                0 |
| TEXT_ENTRY_CASE_POLICY_DEFINED              |       45 |       0 |                 0 |          0 |                0 |
| TEXT_ENTRY_FORMULA_FORMAT_VALID             |       45 |       0 |                 0 |          0 |                0 |
| TEXT_ENTRY_HAS_ANSWER                       |       45 |       0 |                 3 |          0 |                3 |
| TEXT_ENTRY_LATEX_VALID                      |       45 |       0 |                 0 |          0 |                0 |
| TEXT_ENTRY_MULTIPLE_ANSWERS_DELIMITER_VALID |       45 |       0 |                 0 |          0 |                0 |
| TEXT_ENTRY_NUMERIC_ANSWER_VALID             |       45 |       0 |                 0 |          0 |                0 |
| TEXT_ENTRY_NUMERIC_TOLERANCE_VALID          |       45 |       0 |                 0 |          0 |                0 |
| TEXT_ENTRY_TRIM_POLICY_DEFINED              |       45 |       0 |                 0 |          0 |                0 |
| TEXT_ENTRY_UNIT_POLICY_VALID                |       45 |       0 |                 0 |          0 |                0 |
| TIME_LIMIT_INVALID                          |      120 |       0 |                 0 |          0 |                0 |
| TRUNCATED_STEM                              |      120 |       0 |                 3 |          0 |                3 |
| UNICODE_MATH_FALSE_POSITIVE                 |      120 |       0 |                 0 |          0 |                0 |
| UNIT_EMBEDDED_IN_NUMERIC_ANSWER             |       45 |       0 |                 0 |          0 |                0 |
| UNIT_POLICY_INVALID                         |       45 |       0 |                 0 |          0 |                0 |
| UNKNOWN_QUESTION_TYPE_BLOCK                 |        0 |       0 |                 0 |          0 |                0 |
| UNSUPPORTED_HTML_OR_SCRIPT                  |      120 |       0 |                 0 |          0 |                0 |
| UNSUPPORTED_MATH_FORMAT                     |      120 |       0 |                 0 |          0 |                0 |
| UNSUPPORTED_TYPE_FOR_TARGET_EXPORT          |        5 |       0 |                 5 |          0 |                5 |
| VERSION_TIMESTAMP_CONFLICT                  |      120 |       0 |                 0 |          0 |                0 |
| WRONG_SUBJECT_TAG                           |      120 |       0 |                 3 |          0 |                3 |
| YEAR_INVALID                                |      120 |       0 |                 0 |          0 |                0 |

## Row-by-Row Validation Results

### Row 2 - JEE26-PHY-001 (REJECTED)

- Raw Type: SCQ
- Canonical Type: MCQ
- Skipped Rules: None
- NEGATIVE_MARKS_CONVENTION_AMBIGUOUS / NEGATIVE_MARKS_CONVENTION_AMBIGUOUS / REVIEW: Negative marks detected as positive penalty magnitudes (e.g., +1). Automatically normalized to deductions (-1). Please confirm.
- REQUIRED_MEDIA_MISSING / REQUIRED_MEDIA_MISSING / BLOCK: Image is flagged as required for this question, but no file name or asset URL is attached.

### Row 3 - JEE26-PHY-002 (NEEDS_REVIEW)

- Raw Type: NUMERICAL
- Canonical Type: TEXT_ENTRY
- Skipped Rules: None
- NUMERIC_TOLERANCE_MISSING / NUMERIC_TOLERANCE_MISSING / REVIEW: Numeric response question has no tolerance or exact-match rounding policy defined.

### Row 4 - JEE26-PHY-003 (VALID)

- Raw Type: SCQ
- Canonical Type: MCQ
- Skipped Rules: EXPLANATION_KEY_MISMATCH

### Row 5 - JEE26-PHY-004 (REJECTED)

- Raw Type: NUMERICAL
- Canonical Type: TEXT_ENTRY
- Skipped Rules: EXPLANATION_RESULT_MISMATCH, POSSIBLE_EXPLANATION_RESULT_MISMATCH
- TEXT_ENTRY_HAS_ANSWER / TEXT_ENTRY_HAS_ANSWER / BLOCK: At least one accepted answer is required.

### Row 6 - JEE26-PHY-005 (REJECTED)

- Raw Type: SCQ
- Canonical Type: MCQ
- Skipped Rules: None
- DUPLICATE_QUESTION_ID / DUPLICATE_QUESTION_ID / BLOCK: Duplicate Question ID found: JEE26-PHY-005

### Row 7 - JEE26-PHY-006 (REJECTED)

- Raw Type: SCQ
- Canonical Type: MCQ
- Skipped Rules: NEGATIVE_MARKS_EXCEED_POSITIVE
- POSITIVE_MARKS_INVALID / POSITIVE_MARKS_INVALID / BLOCK: Positive marks must be a finite number greater than 0. Found '-4'.
  Suppressed: MARKS_INVALID
  Evidence: {"marks":-4}

### Row 8 - JEE26-PHY-007 (REJECTED)

- Raw Type: INTEGER
- Canonical Type: TEXT_ENTRY
- Skipped Rules: None
- TRUNCATED_STEM / TRUNCATED_STEM / BLOCK: Question stem appears truncated or incomplete: 'hotoelectrons is 1.5 V. The...'.
  Evidence: {"stemSnippet":"The stopping potential for photoelectrons is 1.5 V. The..."}
- INTEGER_ANSWER_NOT_INTEGER / INTEGER_ANSWER_NOT_INTEGER / BLOCK: Integer response mode required, but answer '1.5' contains decimals or non-integer characters.
  Suppressed: RESPONSE_SUBTYPE_LOST
  Evidence: {"rawAnswer":"1.5","nonIntegers":["1.5"]}

### Row 9 - JEE26-PHY-008 (VALID)

- Raw Type: NUMERICAL
- Canonical Type: TEXT_ENTRY
- Skipped Rules: None

### Row 10 - JEE26-PHY-009 (NEEDS_REVIEW)

- Raw Type: MSQ
- Canonical Type: MSQ
- Skipped Rules: EXPLANATION_KEY_MISMATCH
- DUPLICATE_NORMALIZED_STEM_REVIEW / DUPLICATE_NORMALIZED_STEM_REVIEW / REVIEW: Question stem is identical to matching rows: `JEE26-PHY-019`, `JEE26-PHY-029`, `JEE26-PHY-039`.
  Evidence: {"duplicateGroupId":"DUP-STEM-10","matchingCount":3}

### Row 11 - JEE26-PHY-010 (REJECTED)

- Raw Type: ASSERTION_REASON
- Canonical Type: MCQ
- Skipped Rules: EXPLANATION_KEY_MISMATCH
- MCQ_ANSWER_IN_OPTIONS / ANSWER_NOT_IN_OPTIONS / BLOCK: Correct answer 'E' does not match any option.
  Suppressed: MCQ_ANSWER_TEXT_MATCH
  Evidence: {"rawAnswer":"E"}
- DUPLICATE_NORMALIZED_STEM_REVIEW / DUPLICATE_NORMALIZED_STEM_REVIEW / REVIEW: Question stem is identical to matching rows: `JEE26-PHY-020`, `JEE26-PHY-040`.
  Evidence: {"duplicateGroupId":"DUP-STEM-11","matchingCount":2}

### Row 12 - JEE26-PHY-011 (NEEDS_REVIEW)

- Raw Type: SCQ
- Canonical Type: MCQ
- Skipped Rules: None
- DUPLICATE_NORMALIZED_STEM_REVIEW / DUPLICATE_NORMALIZED_STEM_REVIEW / REVIEW: Question stem is identical to matching rows: `JEE26-PHY-031`.
  Evidence: {"duplicateGroupId":"DUP-STEM-12","matchingCount":1}

### Row 13 - JEE26-PHY-012 (NEEDS_REVIEW)

- Raw Type: NUMERICAL
- Canonical Type: TEXT_ENTRY
- Skipped Rules: None
- AMBIGUOUS_MEDIA_FILENAME / AMBIGUOUS_MEDIA_FILENAME / REVIEW: Media filename 'image1.png' is generic or ambiguous. Re-link with unique asset name to prevent collisions.
  Evidence: {"fileName":"image1.png"}

### Row 14 - JEE26-PHY-013 (REJECTED)

- Raw Type: SCQ
- Canonical Type: MCQ
- Skipped Rules: None
- EXPLANATION_KEY_MISMATCH / EXPLANATION_KEY_MISMATCH / BLOCK: Explanation concludes with option set 'D', but structured answer is 'A'.
  Evidence: {"extractedValue":["D"],"structuredValue":["A"],"confidence":0.98,"extractionMethod":"explicit_final_marker","sourceSpan":"Final answer: Option D","comparisonPolicy":"normalized_option_set_exact_match"}

### Row 15 - JEE26-PHY-014 (VALID)

- Raw Type: NUMERICAL
- Canonical Type: TEXT_ENTRY
- Skipped Rules: None

### Row 16 - JEE26-PHY-015 (REJECTED)

- Raw Type: SCQ
- Canonical Type: MCQ
- Skipped Rules: DUPLICATE_NORMALIZED_STEM_REVIEW
- MALFORMED_LATEX_DELIMITER / MALFORMED_LATEX_DELIMITER / BLOCK: Malformed LaTeX delimiter in stem: LaTeX math opened with \( but is not closed; expected \).
  Suppressed: LATEX_STEM_DELIMITER_VALID
  Evidence: {"issueCode":"LATEX_DELIMITER_UNCLOSED","index":125,"delimiter":"\\(","expectedDelimiter":"\\)"}

### Row 17 - JEE26-PHY-016 (VALID)

- Raw Type: SCQ
- Canonical Type: MCQ
- Skipped Rules: None

### Row 18 - JEE26-PHY-017 (NEEDS_REVIEW)

- Raw Type: INTEGER
- Canonical Type: TEXT_ENTRY
- Skipped Rules: None
- WRONG_SUBJECT_TAG / WRONG_SUBJECT_TAG / REVIEW: Chapter 'Dual Nature of Matter' belongs to Physics, but the row is tagged as 'Chemistry'.
  Evidence: {"subject":"Chemistry","chapter":"Dual Nature of Matter","expectedSubject":"Physics","taxonomyMatch":"deterministic"}

### Row 19 - JEE26-PHY-018 (REJECTED)

- Raw Type: NUMERICAL
- Canonical Type: TEXT_ENTRY
- Skipped Rules: None
- CONTEXT_MISSING / CONTEXT_MISSING / BLOCK: Question stem consists solely of generic text without essential proposition or stimulus.
- DUPLICATE_NORMALIZED_STEM_REVIEW / DUPLICATE_NORMALIZED_STEM_REVIEW / REVIEW: Question stem is identical to matching rows: `JEE26-CHE-027`, `JEE26-MAT-030`.
  Evidence: {"duplicateGroupId":"DUP-STEM-19","matchingCount":2}

### Row 20 - JEE26-PHY-019 (NEEDS_REVIEW)

- Raw Type: MSQ
- Canonical Type: MSQ
- Skipped Rules: EXPLANATION_KEY_MISMATCH
- MSQ_OPTIONS_UNIQUE / MSQ_OPTIONS_UNIQUE / REVIEW: Duplicate option text found in options B and D.
- DUPLICATE_NORMALIZED_STEM_REVIEW / DUPLICATE_NORMALIZED_STEM_REVIEW / REVIEW: Question stem is identical to matching rows: `JEE26-PHY-009`, `JEE26-PHY-029`, `JEE26-PHY-039`.
  Evidence: {"duplicateGroupId":"DUP-STEM-20","matchingCount":3}

### Row 21 - JEE26-PHY-020 (REJECTED)

- Raw Type: ASSERTION_REASON
- Canonical Type: MCQ
- Skipped Rules: EXPLANATION_KEY_MISMATCH
- NEGATIVE_MARKS_EXCEED_POSITIVE / NEGATIVE_MARKS_EXCEED_POSITIVE / BLOCK: Absolute penalty magnitude (5) exceeds positive marks (+4).
  Evidence: {"pos":4,"neg":-5}
- DUPLICATE_NORMALIZED_STEM_REVIEW / DUPLICATE_NORMALIZED_STEM_REVIEW / REVIEW: Question stem is identical to matching rows: `JEE26-PHY-010`, `JEE26-PHY-040`.
  Evidence: {"duplicateGroupId":"DUP-STEM-21","matchingCount":2}

### Row 22 - JEE26-PHY-021 (VALID)

- Raw Type: SCQ
- Canonical Type: MCQ
- Skipped Rules: None

### Row 23 - JEE26-PHY-022 (CAUTION)

- Raw Type: NUMERICAL
- Canonical Type: TEXT_ENTRY
- Skipped Rules: None
- NONSTANDARD_DIFFICULTY / NONSTANDARD_DIFFICULTY / WARNING: Difficulty rating 'Very Hard' is non-standard. Expected one of: Easy, Medium, Hard.
  Evidence: {"difficulty":"Very Hard"}

### Row 24 - JEE26-PHY-023 (REJECTED)

- Raw Type: SCQ
- Canonical Type: MCQ
- Skipped Rules: EXPLANATION_KEY_MISMATCH, MCQ_ANSWER_IN_OPTIONS, MCQ_ANSWER_TEXT_MATCH
- MCQ_HAS_CORRECT_ANSWER / MCQ_HAS_CORRECT_ANSWER / BLOCK: Correct answer is required.

### Row 25 - JEE26-PHY-024 (NEEDS_REVIEW)

- Raw Type: NUMERICAL
- Canonical Type: TEXT_ENTRY
- Skipped Rules: None
- NUMERIC_TOLERANCE_MISSING / NUMERIC_TOLERANCE_MISSING / REVIEW: Numeric response question has no tolerance or exact-match rounding policy defined.

### Row 26 - JEE26-PHY-005 (REJECTED)

- Raw Type: SCQ
- Canonical Type: MCQ
- Skipped Rules: None
- DUPLICATE_QUESTION_ID / DUPLICATE_QUESTION_ID / BLOCK: Duplicate Question ID found: JEE26-PHY-005

### Row 27 - JEE26-PHY-026 (VALID)

- Raw Type: SCQ
- Canonical Type: MCQ
- Skipped Rules: None

### Row 28 - JEE26-PHY-027 (REJECTED)

- Raw Type: INTEGER
- Canonical Type: TEXT_ENTRY
- Skipped Rules: None
- INTEGER_ANSWER_NOT_INTEGER / INTEGER_ANSWER_NOT_INTEGER / BLOCK: Integer response mode required, but answer '2.5' contains decimals or non-integer characters.
  Suppressed: RESPONSE_SUBTYPE_LOST
  Evidence: {"rawAnswer":"2.5","nonIntegers":["2.5"]}

### Row 29 - JEE26-PHY-028 (REJECTED)

- Raw Type: SCQ
- Canonical Type: MCQ
- Skipped Rules: MCQ_ANSWER_IN_OPTIONS, MCQ_ANSWER_TEXT_MATCH
- MCQ_MIN_OPTIONS / MCQ_MIN_OPTIONS / BLOCK: MCQ must have at least 2 options.
- MCQ_SINGLE_CORRECT_ONLY / MCQ_SINGLE_CORRECT_ONLY / BLOCK: MCQ must have exactly one correct answer. Found multiple delimited values.
- INACTIVE_FIELD_CONTAINS_DATA / INACTIVE_FIELD_CONTAINS_DATA / REVIEW: Inactive field 'Numerical_Answer' contains data ('1.5') for question type 'SCQ'.
  Evidence: {"rawType":"SCQ","inactiveField":"Numerical_Answer","rawValue":"1.5"}
- MCQ_SHOULD_BE_MSQ_REVIEW / MCQ_SHOULD_BE_MSQ_REVIEW / REVIEW: Row is marked as MCQ but answer contains multiple values. Consider changing to MSQ.

### Row 30 - JEE26-PHY-029 (NEEDS_REVIEW)

- Raw Type: MSQ
- Canonical Type: MSQ
- Skipped Rules: EXPLANATION_KEY_MISMATCH
- DUPLICATE_NORMALIZED_STEM_REVIEW / DUPLICATE_NORMALIZED_STEM_REVIEW / REVIEW: Question stem is identical to matching rows: `JEE26-PHY-009`, `JEE26-PHY-019`, `JEE26-PHY-039`.
  Evidence: {"duplicateGroupId":"DUP-STEM-30","matchingCount":3}

### Row 31 - JEE26-PHY-030 (NEEDS_REVIEW)

- Raw Type: ASSERTION_REASON
- Canonical Type: MCQ
- Skipped Rules: EXPLANATION_KEY_MISMATCH
- LANGUAGE_METADATA_MISMATCH / LANGUAGE_METADATA_MISMATCH / REVIEW: Language metadata is set to English, but text contains Devanagari (Hindi) script.
  Evidence: {"declaredLanguage":"english","stemSnippet":"Assertion: A solid sphere rolling withou"}

### Row 32 - JEE26-PHY-031 (NEEDS_REVIEW)

- Raw Type: SCQ
- Canonical Type: MCQ
- Skipped Rules: None
- DUPLICATE_NORMALIZED_STEM_REVIEW / DUPLICATE_NORMALIZED_STEM_REVIEW / REVIEW: Question stem is identical to matching rows: `JEE26-PHY-011`.
  Evidence: {"duplicateGroupId":"DUP-STEM-32","matchingCount":1}

### Row 33 - JEE26-PHY-032 (REJECTED)

- Raw Type: NUMERICAL
- Canonical Type: TEXT_ENTRY
- Skipped Rules: None
- PARTIAL_MARKING_AMBIGUOUS_PROSE / PARTIAL_MARKING_AMBIGUOUS_PROSE / BLOCK: Partial marking rule 'Award 3, 2, 1 depending on closeness' is ambiguous and non-deterministic for automated scoring.
  Evidence: {"rawPartial":"Award 3, 2, 1 depending on closeness"}

### Row 34 - JEE26-PHY-033 (VALID)

- Raw Type: SCQ
- Canonical Type: MCQ
- Skipped Rules: EXPLANATION_KEY_MISMATCH

### Row 35 - JEE26-PHY-034 (REJECTED)

- Raw Type: NUMERICAL
- Canonical Type: TEXT_ENTRY
- Skipped Rules: DUPLICATE_NORMALIZED_STEM_REVIEW
- MALFORMED_LATEX_DELIMITER / MALFORMED_LATEX_DELIMITER / BLOCK: Malformed LaTeX delimiter in stem: LaTeX math opened with \( but is not closed; expected \).
  Suppressed: LATEX_STEM_DELIMITER_VALID
  Evidence: {"issueCode":"LATEX_DELIMITER_UNCLOSED","index":136,"delimiter":"\\(","expectedDelimiter":"\\)"}

### Row 36 - JEE26-PHY-035 (NEEDS_REVIEW)

- Raw Type: SCQ
- Canonical Type: MCQ
- Skipped Rules: None
- INACTIVE_FIELD_CONTAINS_DATA / INACTIVE_FIELD_CONTAINS_DATA / REVIEW: Inactive field 'Numerical_Answer' contains data ('Hz') for question type 'SCQ'.
  Evidence: {"rawType":"SCQ","inactiveField":"Numerical_Answer","rawValue":"Hz"}

### Row 37 - JEE26-PHY-036 (NEEDS_REVIEW)

- Raw Type: SCQ
- Canonical Type: MCQ
- Skipped Rules: EXPLANATION_KEY_MISMATCH
- EXPLANATION_INSUFFICIENT / EXPLANATION_INSUFFICIENT / REVIEW: Explanation text 'Ans is obvious. Use shortcut.' appears vague or insufficient. Detail derivation or reasoning.
  Evidence: {"explanation":"Ans is obvious. Use shortcut."}

### Row 38 - JEE26-PHY-037 (VALID)

- Raw Type: INTEGER
- Canonical Type: TEXT_ENTRY
- Skipped Rules: None

### Row 39 - JEE26-PHY-038 (REJECTED)

- Raw Type: NUMERICAL
- Canonical Type: TEXT_ENTRY
- Skipped Rules: None
- EXPLANATION_FORMAT_INCOMPATIBLE / EXPLANATION_FORMAT_INCOMPATIBLE / BLOCK: Explanation concludes with an option answer, which is incompatible with a text-entry interaction.
  Evidence: {"extractedValue":"D","structuredValue":["1.5"],"confidence":0.98,"extractionMethod":"explicit_final_marker","sourceSpan":"Final answer: Option D","comparisonPolicy":"interaction_mode_compatibility"}

### Row 40 - JEE26-PHY-039 (NEEDS_REVIEW)

- Raw Type: MSQ
- Canonical Type: MSQ
- Skipped Rules: EXPLANATION_KEY_MISMATCH
- DUPLICATE_NORMALIZED_STEM_REVIEW / DUPLICATE_NORMALIZED_STEM_REVIEW / REVIEW: Question stem is identical to matching rows: `JEE26-PHY-009`, `JEE26-PHY-019`, `JEE26-PHY-029`.
  Evidence: {"duplicateGroupId":"DUP-STEM-40","matchingCount":3}

### Row 41 - JEE26-PHY-040 (REJECTED)

- Raw Type: MATRIX_MATCH
- Canonical Type: UNSUPPORTED
- Skipped Rules: None
- UNSUPPORTED_TYPE_FOR_TARGET_EXPORT / UNSUPPORTED_TYPE_FOR_TARGET_EXPORT / BLOCK: Question type 'MATRIX_MATCH' is unsupported for the current target export profile.
  Suppressed: EXPLICIT_TYPE_OVERRIDDEN
  Evidence: {"rawType":"MATRIX_MATCH"}
- MATRIX_MATCH_INCOMPLETE / MATRIX_MATCH_INCOMPLETE / BLOCK: Matrix-match interaction requires non-empty left and right entity columns.

### Row 42 - JEE26-CHE-001 (VALID)

- Raw Type: NUMERICAL
- Canonical Type: TEXT_ENTRY
- Skipped Rules: None

### Row 43 - JEE26-CHE-002 (REJECTED)

- Raw Type: NUMERICAL
- Canonical Type: TEXT_ENTRY
- Skipped Rules: None
- EXPLANATION_RESULT_MISMATCH / EXPLANATION_RESULT_MISMATCH / BLOCK: Explanation concludes with high-confidence result '2', but accepted answer is '1.25'.
  Evidence: {"extractedValue":2,"structuredValue":["1.25"],"confidence":0.9,"extractionMethod":"last_equation_result","sourceSpan":"= 2.","comparisonPolicy":{"mode":"exact_numeric","tolerance":0,"unit":null}}
- NUMERIC_TOLERANCE_MISSING / NUMERIC_TOLERANCE_MISSING / REVIEW: Numeric response question has no tolerance or exact-match rounding policy defined.

### Row 44 - JEE26-CHE-003 (VALID)

- Raw Type: NUMERICAL
- Canonical Type: TEXT_ENTRY
- Skipped Rules: None

### Row 45 - JEE26-CHE-004 (REJECTED)

- Raw Type: SCQ
- Canonical Type: MCQ
- Skipped Rules: EXPLANATION_KEY_MISMATCH
- DUPLICATE_QUESTION_ID / DUPLICATE_QUESTION_ID / BLOCK: Duplicate Question ID found: JEE26-CHE-004
- DUPLICATE_NORMALIZED_STEM_REVIEW / DUPLICATE_NORMALIZED_STEM_REVIEW / REVIEW: Question stem is identical to matching rows: `JEE26-CHE-024`, `JEE26-CHE-034`.
  Evidence: {"duplicateGroupId":"DUP-STEM-45","matchingCount":2}

### Row 46 - JEE26-CHE-005 (REJECTED)

- Raw Type: INTEGER
- Canonical Type: TEXT_ENTRY
- Skipped Rules: None
- REQUIRED_MEDIA_MISSING / REQUIRED_MEDIA_MISSING / BLOCK: Image is flagged as required for this question, but no file name or asset URL is attached.
- DUPLICATE_NORMALIZED_STEM_REVIEW / DUPLICATE_NORMALIZED_STEM_REVIEW / REVIEW: Question stem is identical to matching rows: `JEE26-CHE-015`, `JEE26-CHE-004`, `JEE26-CHE-035`, `JEE26-MAT-005`.
  Evidence: {"duplicateGroupId":"DUP-STEM-46","matchingCount":4}

### Row 47 - JEE26-CHE-006 (REJECTED)

- Raw Type: SCQ
- Canonical Type: MCQ
- Skipped Rules: EXPLANATION_KEY_MISMATCH, MCQ_ANSWER_IN_OPTIONS, MCQ_ANSWER_TEXT_MATCH
- MCQ_HAS_CORRECT_ANSWER / MCQ_HAS_CORRECT_ANSWER / BLOCK: Correct answer is required.

### Row 48 - JEE26-CHE-007 (REJECTED)

- Raw Type: SCQ
- Canonical Type: MCQ
- Skipped Rules: EXPLANATION_KEY_MISMATCH, NEGATIVE_MARKS_EXCEED_POSITIVE
- POSITIVE_MARKS_INVALID / POSITIVE_MARKS_INVALID / BLOCK: Positive marks must be a finite number greater than 0. Found '-4'.
  Suppressed: MARKS_INVALID
  Evidence: {"marks":-4}
- DUPLICATE_NORMALIZED_STEM_REVIEW / DUPLICATE_NORMALIZED_STEM_REVIEW / REVIEW: Question stem is identical to matching rows: `JEE26-CHE-017`, `JEE26-CHE-037`.
  Evidence: {"duplicateGroupId":"DUP-STEM-48","matchingCount":2}

### Row 49 - JEE26-CHE-008 (NEEDS_REVIEW)

- Raw Type: MSQ
- Canonical Type: MSQ
- Skipped Rules: EXPLANATION_KEY_MISMATCH
- DUPLICATE_NORMALIZED_STEM_REVIEW / DUPLICATE_NORMALIZED_STEM_REVIEW / REVIEW: Question stem is identical to matching rows: `JEE26-CHE-018`, `JEE26-CHE-028`, `JEE26-CHE-038`.
  Evidence: {"duplicateGroupId":"DUP-STEM-49","matchingCount":3}

### Row 50 - JEE26-CHE-009 (REJECTED)

- Raw Type: Hotspot
- Canonical Type: UNSUPPORTED
- Skipped Rules: None
- UNSUPPORTED_TYPE_FOR_TARGET_EXPORT / UNSUPPORTED_TYPE_FOR_TARGET_EXPORT / BLOCK: Question type 'Hotspot' is unsupported for the current target export profile.
  Suppressed: EXPLICIT_TYPE_OVERRIDDEN
  Evidence: {"rawType":"Hotspot"}
- HOTSPOT_CONFIGURATION_INCOMPLETE / HOTSPOT_CONFIGURATION_INCOMPLETE / BLOCK: Hotspot interaction requires a background image URL and at least one coordinate region.

### Row 51 - JEE26-CHE-010 (NEEDS_REVIEW)

- Raw Type: NUMERICAL
- Canonical Type: TEXT_ENTRY
- Skipped Rules: EXPLANATION_RESULT_MISMATCH, EXPLANATION_FORMAT_INCOMPATIBLE, POSSIBLE_EXPLANATION_RESULT_MISMATCH
- DUPLICATE_NORMALIZED_STEM_REVIEW / DUPLICATE_NORMALIZED_STEM_REVIEW / REVIEW: Question stem is identical to matching rows: `JEE26-CHE-020`, `JEE26-CHE-030`, `JEE26-CHE-040`.
  Evidence: {"duplicateGroupId":"DUP-STEM-51","matchingCount":3}

### Row 52 - JEE26-CHE-011 (VALID)

- Raw Type: NUMERICAL
- Canonical Type: TEXT_ENTRY
- Skipped Rules: None

### Row 53 - JEE26-CHE-012 (NEEDS_REVIEW)

- Raw Type: SCQ
- Canonical Type: MCQ
- Skipped Rules: None
- AMBIGUOUS_MEDIA_FILENAME / AMBIGUOUS_MEDIA_FILENAME / REVIEW: Media filename 'image1.png' is generic or ambiguous. Re-link with unique asset name to prevent collisions.
  Evidence: {"fileName":"image1.png"}

### Row 54 - JEE26-CHE-013 (VALID)

- Raw Type: NUMERICAL
- Canonical Type: TEXT_ENTRY
- Skipped Rules: None

### Row 55 - JEE26-CHE-014 (REJECTED)

- Raw Type: SCQ
- Canonical Type: MCQ
- Skipped Rules: EXPLANATION_KEY_MISMATCH
- TRUNCATED_STEM / TRUNCATED_STEM / BLOCK: Question stem appears truncated or incomplete: 'ecular geometry of BF₃ are:...'.
  Evidence: {"stemSnippet":"The hybridisation and molecular geometry of BF₃ are:..."}

### Row 56 - JEE26-CHE-015 (NEEDS_REVIEW)

- Raw Type: INTEGER
- Canonical Type: TEXT_ENTRY
- Skipped Rules: None
- DUPLICATE_NORMALIZED_STEM_REVIEW / DUPLICATE_NORMALIZED_STEM_REVIEW / REVIEW: Question stem is identical to matching rows: `JEE26-CHE-005`, `JEE26-CHE-004`, `JEE26-CHE-035`, `JEE26-MAT-005`.
  Evidence: {"duplicateGroupId":"DUP-STEM-56","matchingCount":4}

### Row 57 - JEE26-CHE-016 (NEEDS_REVIEW)

- Raw Type: SCQ
- Canonical Type: MCQ
- Skipped Rules: EXPLANATION_KEY_MISMATCH
- LANGUAGE_METADATA_MISMATCH / LANGUAGE_METADATA_MISMATCH / REVIEW: Language metadata is set to English, but text contains Devanagari (Hindi) script.
  Evidence: {"declaredLanguage":"english","stemSnippet":"For a reaction, ΔH = -50 kJ mol⁻¹. Which"}

### Row 58 - JEE26-CHE-017 (REJECTED)

- Raw Type: SCQ
- Canonical Type: MCQ
- Skipped Rules: EXPLANATION_KEY_MISMATCH
- MCQ_ANSWER_IN_OPTIONS / ANSWER_NOT_IN_OPTIONS / BLOCK: Correct answer 'E' does not match any option.
  Suppressed: MCQ_ANSWER_TEXT_MATCH
  Evidence: {"rawAnswer":"E"}
- DUPLICATE_NORMALIZED_STEM_REVIEW / DUPLICATE_NORMALIZED_STEM_REVIEW / REVIEW: Question stem is identical to matching rows: `JEE26-CHE-007`, `JEE26-CHE-037`.
  Evidence: {"duplicateGroupId":"DUP-STEM-58","matchingCount":2}

### Row 59 - JEE26-CHE-018 (NEEDS_REVIEW)

- Raw Type: MSQ
- Canonical Type: MSQ
- Skipped Rules: EXPLANATION_KEY_MISMATCH
- DUPLICATE_NORMALIZED_STEM_REVIEW / DUPLICATE_NORMALIZED_STEM_REVIEW / REVIEW: Question stem is identical to matching rows: `JEE26-CHE-008`, `JEE26-CHE-028`, `JEE26-CHE-038`.
  Evidence: {"duplicateGroupId":"DUP-STEM-59","matchingCount":3}
- WRONG_SUBJECT_TAG / WRONG_SUBJECT_TAG / REVIEW: Chapter 'Periodic Classification' belongs to Chemistry, but the row is tagged as 'Mathematics'.
  Evidence: {"subject":"Mathematics","chapter":"Periodic Classification","expectedSubject":"Chemistry","taxonomyMatch":"deterministic"}

### Row 60 - JEE26-CHE-019 (REJECTED)

- Raw Type: ASSERTION_REASON
- Canonical Type: MCQ
- Skipped Rules: EXPLANATION_KEY_MISMATCH
- NEGATIVE_MARKS_EXCEED_POSITIVE / NEGATIVE_MARKS_EXCEED_POSITIVE / BLOCK: Absolute penalty magnitude (5) exceeds positive marks (+4).
  Evidence: {"pos":4,"neg":-5}
- DUPLICATE_NORMALIZED_STEM_REVIEW / DUPLICATE_NORMALIZED_STEM_REVIEW / REVIEW: Question stem is identical to matching rows: `JEE26-CHE-009`, `JEE26-CHE-029`, `JEE26-CHE-039`.
  Evidence: {"duplicateGroupId":"DUP-STEM-60","matchingCount":3}

### Row 61 - JEE26-CHE-020 (NEEDS_REVIEW)

- Raw Type: NUMERICAL
- Canonical Type: TEXT_ENTRY
- Skipped Rules: EXPLANATION_RESULT_MISMATCH, EXPLANATION_FORMAT_INCOMPATIBLE, POSSIBLE_EXPLANATION_RESULT_MISMATCH
- DUPLICATE_NORMALIZED_STEM_REVIEW / DUPLICATE_NORMALIZED_STEM_REVIEW / REVIEW: Question stem is identical to matching rows: `JEE26-CHE-010`, `JEE26-CHE-030`, `JEE26-CHE-040`.
  Evidence: {"duplicateGroupId":"DUP-STEM-61","matchingCount":3}

### Row 62 - JEE26-CHE-021 (VALID)

- Raw Type: NUMERICAL
- Canonical Type: TEXT_ENTRY
- Skipped Rules: None

### Row 63 - JEE26-CHE-022 (REJECTED)

- Raw Type: SCQ
- Canonical Type: MCQ
- Skipped Rules: None
- EXPLANATION_KEY_MISMATCH / EXPLANATION_KEY_MISMATCH / BLOCK: Explanation concludes with option set 'D', but structured answer is 'A'.
  Evidence: {"extractedValue":["D"],"structuredValue":["A"],"confidence":0.98,"extractionMethod":"explicit_final_marker","sourceSpan":"Final answer: Option D","comparisonPolicy":"normalized_option_set_exact_match"}

### Row 64 - JEE26-CHE-023 (REJECTED)

- Raw Type: SCQ
- Canonical Type: MCQ
- Skipped Rules: MCQ_ANSWER_IN_OPTIONS, MCQ_ANSWER_TEXT_MATCH
- MCQ_MIN_OPTIONS / MCQ_MIN_OPTIONS / BLOCK: MCQ must have at least 2 options.
- MCQ_SINGLE_CORRECT_ONLY / MCQ_SINGLE_CORRECT_ONLY / BLOCK: MCQ must have exactly one correct answer. Found multiple delimited values.
- INACTIVE_FIELD_CONTAINS_DATA / INACTIVE_FIELD_CONTAINS_DATA / REVIEW: Inactive field 'Numerical_Answer' contains data ('3') for question type 'SCQ'.
  Evidence: {"rawType":"SCQ","inactiveField":"Numerical_Answer","rawValue":"3"}
- MCQ_SHOULD_BE_MSQ_REVIEW / MCQ_SHOULD_BE_MSQ_REVIEW / REVIEW: Row is marked as MCQ but answer contains multiple values. Consider changing to MSQ.

### Row 65 - JEE26-CHE-024 (NEEDS_REVIEW)

- Raw Type: SCQ
- Canonical Type: MCQ
- Skipped Rules: EXPLANATION_KEY_MISMATCH
- DUPLICATE_NORMALIZED_STEM_REVIEW / DUPLICATE_NORMALIZED_STEM_REVIEW / REVIEW: Question stem is identical to matching rows: `JEE26-CHE-004`, `JEE26-CHE-034`.
  Evidence: {"duplicateGroupId":"DUP-STEM-65","matchingCount":2}

### Row 66 - JEE26-CHE-004 (REJECTED)

- Raw Type: INTEGER
- Canonical Type: TEXT_ENTRY
- Skipped Rules: None
- DUPLICATE_QUESTION_ID / DUPLICATE_QUESTION_ID / BLOCK: Duplicate Question ID found: JEE26-CHE-004
- DUPLICATE_NORMALIZED_STEM_REVIEW / DUPLICATE_NORMALIZED_STEM_REVIEW / REVIEW: Question stem is identical to matching rows: `JEE26-CHE-005`, `JEE26-CHE-015`, `JEE26-CHE-035`, `JEE26-MAT-005`.
  Evidence: {"duplicateGroupId":"DUP-STEM-66","matchingCount":4}

### Row 67 - JEE26-CHE-026 (REJECTED)

- Raw Type: SCQ
- Canonical Type: MCQ
- Skipped Rules: EXPLANATION_KEY_MISMATCH, DUPLICATE_NORMALIZED_STEM_REVIEW
- MALFORMED_LATEX_DELIMITER / MALFORMED_LATEX_DELIMITER / BLOCK: Malformed LaTeX delimiter in stem: LaTeX math opened with \( but is not closed; expected \).
  Suppressed: LATEX_STEM_DELIMITER_VALID
  Evidence: {"issueCode":"LATEX_DELIMITER_UNCLOSED","index":66,"delimiter":"\\(","expectedDelimiter":"\\)"}

### Row 68 - JEE26-CHE-027 (REJECTED)

- Raw Type: SCQ
- Canonical Type: MCQ
- Skipped Rules: EXPLANATION_KEY_MISMATCH
- CONTEXT_MISSING / CONTEXT_MISSING / BLOCK: Question stem consists solely of generic text without essential proposition or stimulus.
- DUPLICATE_NORMALIZED_STEM_REVIEW / DUPLICATE_NORMALIZED_STEM_REVIEW / REVIEW: Question stem is identical to matching rows: `JEE26-PHY-018`, `JEE26-MAT-030`.
  Evidence: {"duplicateGroupId":"DUP-STEM-68","matchingCount":2}

### Row 69 - JEE26-CHE-028 (NEEDS_REVIEW)

- Raw Type: MSQ
- Canonical Type: MSQ
- Skipped Rules: EXPLANATION_KEY_MISMATCH
- DUPLICATE_NORMALIZED_STEM_REVIEW / DUPLICATE_NORMALIZED_STEM_REVIEW / REVIEW: Question stem is identical to matching rows: `JEE26-CHE-008`, `JEE26-CHE-018`, `JEE26-CHE-038`.
  Evidence: {"duplicateGroupId":"DUP-STEM-69","matchingCount":3}

### Row 70 - JEE26-CHE-029 (REJECTED)

- Raw Type: ASSERTION_REASON
- Canonical Type: MCQ
- Skipped Rules: EXPLANATION_KEY_MISMATCH
- PARTIAL_MARKING_AMBIGUOUS_PROSE / PARTIAL_MARKING_AMBIGUOUS_PROSE / BLOCK: Partial marking rule 'Award 3, 2, 1 depending on closeness' is ambiguous and non-deterministic for automated scoring.
  Evidence: {"rawPartial":"Award 3, 2, 1 depending on closeness"}
- DUPLICATE_NORMALIZED_STEM_REVIEW / DUPLICATE_NORMALIZED_STEM_REVIEW / REVIEW: Question stem is identical to matching rows: `JEE26-CHE-009`, `JEE26-CHE-019`, `JEE26-CHE-039`.
  Evidence: {"duplicateGroupId":"DUP-STEM-70","matchingCount":3}

### Row 71 - JEE26-CHE-030 (REJECTED)

- Raw Type: NUMERICAL
- Canonical Type: TEXT_ENTRY
- Skipped Rules: EXPLANATION_RESULT_MISMATCH, EXPLANATION_FORMAT_INCOMPATIBLE, POSSIBLE_EXPLANATION_RESULT_MISMATCH
- TEXT_ENTRY_HAS_ANSWER / TEXT_ENTRY_HAS_ANSWER / BLOCK: At least one accepted answer is required.
- DUPLICATE_NORMALIZED_STEM_REVIEW / DUPLICATE_NORMALIZED_STEM_REVIEW / REVIEW: Question stem is identical to matching rows: `JEE26-CHE-010`, `JEE26-CHE-020`, `JEE26-CHE-040`.
  Evidence: {"duplicateGroupId":"DUP-STEM-71","matchingCount":3}

### Row 72 - JEE26-CHE-031 (NEEDS_REVIEW)

- Raw Type: NUMERICAL
- Canonical Type: TEXT_ENTRY
- Skipped Rules: None
- NUMERIC_TOLERANCE_MISSING / NUMERIC_TOLERANCE_MISSING / REVIEW: Numeric response question has no tolerance or exact-match rounding policy defined.

### Row 73 - JEE26-CHE-032 (VALID)

- Raw Type: SCQ
- Canonical Type: MCQ
- Skipped Rules: None

### Row 74 - JEE26-CHE-033 (VALID)

- Raw Type: NUMERICAL
- Canonical Type: TEXT_ENTRY
- Skipped Rules: None

### Row 75 - JEE26-CHE-034 (NEEDS_REVIEW)

- Raw Type: SCQ
- Canonical Type: MCQ
- Skipped Rules: EXPLANATION_KEY_MISMATCH
- DUPLICATE_NORMALIZED_STEM_REVIEW / DUPLICATE_NORMALIZED_STEM_REVIEW / REVIEW: Question stem is identical to matching rows: `JEE26-CHE-004`, `JEE26-CHE-024`.
  Evidence: {"duplicateGroupId":"DUP-STEM-75","matchingCount":2}
- NONSTANDARD_DIFFICULTY / NONSTANDARD_DIFFICULTY / WARNING: Difficulty rating 'Very Hard' is non-standard. Expected one of: Easy, Medium, Hard.
  Evidence: {"difficulty":"Very Hard"}

### Row 76 - JEE26-CHE-035 (NEEDS_REVIEW)

- Raw Type: INTEGER
- Canonical Type: TEXT_ENTRY
- Skipped Rules: EXPLANATION_RESULT_MISMATCH, EXPLANATION_FORMAT_INCOMPATIBLE, POSSIBLE_EXPLANATION_RESULT_MISMATCH
- DUPLICATE_NORMALIZED_STEM_REVIEW / DUPLICATE_NORMALIZED_STEM_REVIEW / REVIEW: Question stem is identical to matching rows: `JEE26-CHE-005`, `JEE26-CHE-015`, `JEE26-CHE-004`, `JEE26-MAT-005`.
  Evidence: {"duplicateGroupId":"DUP-STEM-76","matchingCount":4}
- EXPLANATION_INSUFFICIENT / EXPLANATION_INSUFFICIENT / REVIEW: Explanation text 'Ans is obvious. Use shortcut.' appears vague or insufficient. Detail derivation or reasoning.
  Evidence: {"explanation":"Ans is obvious. Use shortcut."}

### Row 77 - JEE26-CHE-036 (VALID)

- Raw Type: SCQ
- Canonical Type: MCQ
- Skipped Rules: EXPLANATION_KEY_MISMATCH

### Row 78 - JEE26-CHE-037 (NEEDS_REVIEW)

- Raw Type: SCQ
- Canonical Type: MCQ
- Skipped Rules: EXPLANATION_KEY_MISMATCH
- DUPLICATE_NORMALIZED_STEM_REVIEW / DUPLICATE_NORMALIZED_STEM_REVIEW / REVIEW: Question stem is identical to matching rows: `JEE26-CHE-007`, `JEE26-CHE-017`.
  Evidence: {"duplicateGroupId":"DUP-STEM-78","matchingCount":2}

### Row 79 - JEE26-CHE-038 (NEEDS_REVIEW)

- Raw Type: MSQ
- Canonical Type: MSQ
- Skipped Rules: EXPLANATION_KEY_MISMATCH
- DUPLICATE_NORMALIZED_STEM_REVIEW / DUPLICATE_NORMALIZED_STEM_REVIEW / REVIEW: Question stem is identical to matching rows: `JEE26-CHE-008`, `JEE26-CHE-018`, `JEE26-CHE-028`.
  Evidence: {"duplicateGroupId":"DUP-STEM-79","matchingCount":3}

### Row 80 - JEE26-CHE-039 (NEEDS_REVIEW)

- Raw Type: ASSERTION_REASON
- Canonical Type: MCQ
- Skipped Rules: EXPLANATION_KEY_MISMATCH
- DUPLICATE_NORMALIZED_STEM_REVIEW / DUPLICATE_NORMALIZED_STEM_REVIEW / REVIEW: Question stem is identical to matching rows: `JEE26-CHE-009`, `JEE26-CHE-019`, `JEE26-CHE-029`.
  Evidence: {"duplicateGroupId":"DUP-STEM-80","matchingCount":3}

### Row 81 - JEE26-CHE-040 (REJECTED)

- Raw Type: MATRIX_MATCH
- Canonical Type: UNSUPPORTED
- Skipped Rules: None
- UNSUPPORTED_TYPE_FOR_TARGET_EXPORT / UNSUPPORTED_TYPE_FOR_TARGET_EXPORT / BLOCK: Question type 'MATRIX_MATCH' is unsupported for the current target export profile.
  Suppressed: EXPLICIT_TYPE_OVERRIDDEN
  Evidence: {"rawType":"MATRIX_MATCH"}
- MATRIX_MATCH_INCOMPLETE / MATRIX_MATCH_INCOMPLETE / BLOCK: Matrix-match interaction requires non-empty left and right entity columns.
- INACTIVE_FIELD_CONTAINS_DATA / INACTIVE_FIELD_CONTAINS_DATA / REVIEW: Inactive field 'Numerical_Answer' contains data ('1') for question type 'MATRIX_MATCH'.
  Evidence: {"rawType":"MATRIX_MATCH","inactiveField":"Numerical_Answer","rawValue":"1"}

### Row 82 - JEE26-MAT-001 (REJECTED)

- Raw Type: SCQ
- Canonical Type: MCQ
- Skipped Rules: None
- REQUIRED_MEDIA_MISSING / REQUIRED_MEDIA_MISSING / BLOCK: Image is flagged as required for this question, but no file name or asset URL is attached.

### Row 83 - JEE26-MAT-002 (VALID)

- Raw Type: NUMERICAL
- Canonical Type: TEXT_ENTRY
- Skipped Rules: None

### Row 84 - JEE26-MAT-003 (REJECTED)

- Raw Type: INTEGER
- Canonical Type: TEXT_ENTRY
- Skipped Rules: None
- DUPLICATE_QUESTION_ID / DUPLICATE_QUESTION_ID / BLOCK: Duplicate Question ID found: JEE26-MAT-003

### Row 85 - JEE26-MAT-004 (NEEDS_REVIEW)

- Raw Type: SCQ
- Canonical Type: MCQ
- Skipped Rules: EXPLANATION_KEY_MISMATCH
- MCQ_OPTIONS_UNIQUE / MCQ_OPTIONS_UNIQUE / REVIEW: Duplicate option text found in options B and D.
- MULTIPLE_CORRECT_OPTIONS_SUSPECTED / MULTIPLE_CORRECT_OPTIONS_SUSPECTED / REVIEW: Suspected multiple correct or equivalent options found in single-choice question.

### Row 86 - JEE26-MAT-005 (NEEDS_REVIEW)

- Raw Type: NUMERICAL
- Canonical Type: TEXT_ENTRY
- Skipped Rules: None
- DUPLICATE_NORMALIZED_STEM_REVIEW / DUPLICATE_NORMALIZED_STEM_REVIEW / REVIEW: Question stem is identical to matching rows: `JEE26-CHE-005`, `JEE26-CHE-015`, `JEE26-CHE-004`, `JEE26-CHE-035`.
  Evidence: {"duplicateGroupId":"DUP-STEM-86","matchingCount":4}

### Row 87 - JEE26-MAT-006 (NEEDS_REVIEW)

- Raw Type: SCQ
- Canonical Type: MCQ
- Skipped Rules: None
- MCQ_OPTIONS_UNIQUE / MCQ_OPTIONS_UNIQUE / REVIEW: Duplicate option text found in options B and C.
- MULTIPLE_CORRECT_OPTIONS_SUSPECTED / MULTIPLE_CORRECT_OPTIONS_SUSPECTED / REVIEW: Suspected multiple correct or equivalent options found in single-choice question.
- LANGUAGE_METADATA_MISMATCH / LANGUAGE_METADATA_MISMATCH / REVIEW: Language metadata is set to English, but text contains Devanagari (Hindi) script.
  Evidence: {"declaredLanguage":"english","stemSnippet":"The equation x² + y² = 4 represents a ci"}

### Row 88 - JEE26-MAT-007 (REJECTED)

- Raw Type: INTEGER
- Canonical Type: TEXT_ENTRY
- Skipped Rules: NEGATIVE_MARKS_EXCEED_POSITIVE
- POSITIVE_MARKS_INVALID / POSITIVE_MARKS_INVALID / BLOCK: Positive marks must be a finite number greater than 0. Found '-4'.
  Suppressed: MARKS_INVALID
  Evidence: {"marks":-4}

### Row 89 - JEE26-MAT-008 (NEEDS_REVIEW)

- Raw Type: SCQ
- Canonical Type: MCQ
- Skipped Rules: None
- DUPLICATE_NORMALIZED_STEM_REVIEW / DUPLICATE_NORMALIZED_STEM_REVIEW / REVIEW: Question stem is identical to matching rows: `JEE26-MAT-028`, `JEE26-MAT-038`.
  Evidence: {"duplicateGroupId":"DUP-STEM-89","matchingCount":2}

### Row 90 - JEE26-MAT-009 (REJECTED)

- Raw Type: MSQ
- Canonical Type: MSQ
- Skipped Rules: None
- EXPLANATION_KEY_MISMATCH / EXPLANATION_KEY_MISMATCH / BLOCK: Explanation concludes with option set 'D', but structured answer is 'A,B,C'.
  Evidence: {"extractedValue":["D"],"structuredValue":["A","B","C"],"confidence":0.98,"extractionMethod":"explicit_final_marker","sourceSpan":"Final answer: Option D","comparisonPolicy":"normalized_option_set_exact_match"}
- DUPLICATE_NORMALIZED_STEM_REVIEW / DUPLICATE_NORMALIZED_STEM_REVIEW / REVIEW: Question stem is identical to matching rows: `JEE26-MAT-019`, `JEE26-MAT-029`, `JEE26-MAT-039`.
  Evidence: {"duplicateGroupId":"DUP-STEM-90","matchingCount":3}

### Row 91 - JEE26-MAT-010 (NEEDS_REVIEW)

- Raw Type: ASSERTION_REASON
- Canonical Type: MCQ
- Skipped Rules: EXPLANATION_KEY_MISMATCH
- DUPLICATE_NORMALIZED_STEM_REVIEW / DUPLICATE_NORMALIZED_STEM_REVIEW / REVIEW: Question stem is identical to matching rows: `JEE26-MAT-020`, `JEE26-MAT-040`.
  Evidence: {"duplicateGroupId":"DUP-STEM-91","matchingCount":2}

### Row 92 - JEE26-MAT-011 (VALID)

- Raw Type: SCQ
- Canonical Type: MCQ
- Skipped Rules: None

### Row 93 - JEE26-MAT-012 (NEEDS_REVIEW)

- Raw Type: NUMERICAL
- Canonical Type: TEXT_ENTRY
- Skipped Rules: None
- AMBIGUOUS_MEDIA_FILENAME / AMBIGUOUS_MEDIA_FILENAME / REVIEW: Media filename 'image1.png' is generic or ambiguous. Re-link with unique asset name to prevent collisions.
  Evidence: {"fileName":"image1.png"}

### Row 94 - JEE26-MAT-013 (REJECTED)

- Raw Type: Hotspot
- Canonical Type: UNSUPPORTED
- Skipped Rules: None
- UNSUPPORTED_TYPE_FOR_TARGET_EXPORT / UNSUPPORTED_TYPE_FOR_TARGET_EXPORT / BLOCK: Question type 'Hotspot' is unsupported for the current target export profile.
  Suppressed: EXPLICIT_TYPE_OVERRIDDEN
  Evidence: {"rawType":"Hotspot"}
- HOTSPOT_CONFIGURATION_INCOMPLETE / HOTSPOT_CONFIGURATION_INCOMPLETE / BLOCK: Hotspot interaction requires a background image URL and at least one coordinate region.
- INACTIVE_FIELD_CONTAINS_DATA / INACTIVE_FIELD_CONTAINS_DATA / REVIEW: Inactive field 'Numerical_Answer' contains data ('3') for question type 'Hotspot'.
  Evidence: {"rawType":"Hotspot","inactiveField":"Numerical_Answer","rawValue":"3"}

### Row 95 - JEE26-MAT-014 (VALID)

- Raw Type: SCQ
- Canonical Type: MCQ
- Skipped Rules: EXPLANATION_KEY_MISMATCH

### Row 96 - JEE26-MAT-015 (VALID)

- Raw Type: NUMERICAL
- Canonical Type: TEXT_ENTRY
- Skipped Rules: None

### Row 97 - JEE26-MAT-016 (VALID)

- Raw Type: SCQ
- Canonical Type: MCQ
- Skipped Rules: None

### Row 98 - JEE26-MAT-017 (NEEDS_REVIEW)

- Raw Type: INTEGER
- Canonical Type: TEXT_ENTRY
- Skipped Rules: None
- WRONG_SUBJECT_TAG / WRONG_SUBJECT_TAG / REVIEW: Chapter 'Permutations and Combinations' belongs to Mathematics, but the row is tagged as 'Physics'.
  Evidence: {"subject":"Physics","chapter":"Permutations and Combinations","expectedSubject":"Mathematics","taxonomyMatch":"deterministic"}

### Row 99 - JEE26-MAT-018 (REJECTED)

- Raw Type: SCQ
- Canonical Type: MCQ
- Skipped Rules: None
- TRUNCATED_STEM / TRUNCATED_STEM / BLOCK: Question stem appears truncated or incomplete: 'The modulus of 3 + 4i is:...'.
  Evidence: {"stemSnippet":"The modulus of 3 + 4i is:..."}

### Row 100 - JEE26-MAT-019 (NEEDS_REVIEW)

- Raw Type: MSQ
- Canonical Type: MSQ
- Skipped Rules: EXPLANATION_KEY_MISMATCH
- DUPLICATE_NORMALIZED_STEM_REVIEW / DUPLICATE_NORMALIZED_STEM_REVIEW / REVIEW: Question stem is identical to matching rows: `JEE26-MAT-009`, `JEE26-MAT-029`, `JEE26-MAT-039`.
  Evidence: {"duplicateGroupId":"DUP-STEM-100","matchingCount":3}

### Row 101 - JEE26-MAT-020 (REJECTED)

- Raw Type: ASSERTION_REASON
- Canonical Type: MCQ
- Skipped Rules: EXPLANATION_KEY_MISMATCH
- NEGATIVE_MARKS_EXCEED_POSITIVE / NEGATIVE_MARKS_EXCEED_POSITIVE / BLOCK: Absolute penalty magnitude (5) exceeds positive marks (+4).
  Evidence: {"pos":4,"neg":-5}
- DUPLICATE_NORMALIZED_STEM_REVIEW / DUPLICATE_NORMALIZED_STEM_REVIEW / REVIEW: Question stem is identical to matching rows: `JEE26-MAT-010`, `JEE26-MAT-040`.
  Evidence: {"duplicateGroupId":"DUP-STEM-101","matchingCount":2}

### Row 102 - JEE26-MAT-021 (VALID)

- Raw Type: SCQ
- Canonical Type: MCQ
- Skipped Rules: None

### Row 103 - JEE26-MAT-022 (REJECTED)

- Raw Type: NUMERICAL
- Canonical Type: TEXT_ENTRY
- Skipped Rules: EXPLANATION_RESULT_MISMATCH, POSSIBLE_EXPLANATION_RESULT_MISMATCH
- TEXT_ENTRY_HAS_ANSWER / TEXT_ENTRY_HAS_ANSWER / BLOCK: At least one accepted answer is required.

### Row 104 - JEE26-MAT-023 (NEEDS_REVIEW)

- Raw Type: INTEGER
- Canonical Type: TEXT_ENTRY
- Skipped Rules: None
- NUMERIC_TOLERANCE_MISSING / NUMERIC_TOLERANCE_MISSING / REVIEW: Numeric response question has no tolerance or exact-match rounding policy defined.

### Row 105 - JEE26-MAT-024 (VALID)

- Raw Type: SCQ
- Canonical Type: MCQ
- Skipped Rules: EXPLANATION_KEY_MISMATCH

### Row 106 - JEE26-MAT-025 (REJECTED)

- Raw Type: NUMERICAL
- Canonical Type: TEXT_ENTRY
- Skipped Rules: DUPLICATE_NORMALIZED_STEM_REVIEW
- MALFORMED_LATEX_DELIMITER / MALFORMED_LATEX_DELIMITER / BLOCK: Malformed LaTeX delimiter in stem: LaTeX math opened with \( but is not closed; expected \).
  Suppressed: LATEX_STEM_DELIMITER_VALID
  Evidence: {"issueCode":"LATEX_DELIMITER_UNCLOSED","index":57,"delimiter":"\\(","expectedDelimiter":"\\)"}

### Row 107 - JEE26-MAT-026 (VALID)

- Raw Type: SCQ
- Canonical Type: MCQ
- Skipped Rules: None

### Row 108 - JEE26-MAT-027 (VALID)

- Raw Type: INTEGER
- Canonical Type: TEXT_ENTRY
- Skipped Rules: None

### Row 109 - JEE26-MAT-028 (NEEDS_REVIEW)

- Raw Type: SCQ
- Canonical Type: MCQ
- Skipped Rules: EXPLANATION_KEY_MISMATCH
- DUPLICATE_NORMALIZED_STEM_REVIEW / DUPLICATE_NORMALIZED_STEM_REVIEW / REVIEW: Question stem is identical to matching rows: `JEE26-MAT-008`, `JEE26-MAT-038`.
  Evidence: {"duplicateGroupId":"DUP-STEM-109","matchingCount":2}
- EXPLANATION_INSUFFICIENT / EXPLANATION_INSUFFICIENT / REVIEW: Explanation text 'Ans is obvious. Use shortcut.' appears vague or insufficient. Detail derivation or reasoning.
  Evidence: {"explanation":"Ans is obvious. Use shortcut."}

### Row 110 - JEE26-MAT-029 (NEEDS_REVIEW)

- Raw Type: MSQ
- Canonical Type: MSQ
- Skipped Rules: EXPLANATION_KEY_MISMATCH
- DUPLICATE_NORMALIZED_STEM_REVIEW / DUPLICATE_NORMALIZED_STEM_REVIEW / REVIEW: Question stem is identical to matching rows: `JEE26-MAT-009`, `JEE26-MAT-019`, `JEE26-MAT-039`.
  Evidence: {"duplicateGroupId":"DUP-STEM-110","matchingCount":3}

### Row 111 - JEE26-MAT-030 (REJECTED)

- Raw Type: ASSERTION_REASON
- Canonical Type: MCQ
- Skipped Rules: EXPLANATION_KEY_MISMATCH
- CONTEXT_MISSING / CONTEXT_MISSING / BLOCK: Question stem consists solely of generic text without essential proposition or stimulus.
- DUPLICATE_NORMALIZED_STEM_REVIEW / DUPLICATE_NORMALIZED_STEM_REVIEW / REVIEW: Question stem is identical to matching rows: `JEE26-PHY-018`, `JEE26-CHE-027`.
  Evidence: {"duplicateGroupId":"DUP-STEM-111","matchingCount":2}

### Row 112 - JEE26-MAT-031 (REJECTED)

- Raw Type: SCQ
- Canonical Type: MCQ
- Skipped Rules: None
- REQUIRED_MEDIA_MISSING / REQUIRED_MEDIA_MISSING / BLOCK: Image is flagged as required for this question, but no file name or asset URL is attached.

### Row 113 - JEE26-MAT-032 (VALID)

- Raw Type: NUMERICAL
- Canonical Type: TEXT_ENTRY
- Skipped Rules: None

### Row 114 - JEE26-MAT-003 (REJECTED)

- Raw Type: INTEGER
- Canonical Type: TEXT_ENTRY
- Skipped Rules: None
- DUPLICATE_QUESTION_ID / DUPLICATE_QUESTION_ID / BLOCK: Duplicate Question ID found: JEE26-MAT-003

### Row 115 - JEE26-MAT-034 (VALID)

- Raw Type: SCQ
- Canonical Type: MCQ
- Skipped Rules: EXPLANATION_KEY_MISMATCH

### Row 116 - JEE26-MAT-035 (VALID)

- Raw Type: NUMERICAL
- Canonical Type: TEXT_ENTRY
- Skipped Rules: None

### Row 117 - JEE26-MAT-036 (REJECTED)

- Raw Type: SCQ
- Canonical Type: MCQ
- Skipped Rules: MCQ_ANSWER_IN_OPTIONS, MCQ_ANSWER_TEXT_MATCH
- MCQ_SINGLE_CORRECT_ONLY / MCQ_SINGLE_CORRECT_ONLY / BLOCK: MCQ must have exactly one correct answer. Found multiple delimited values.
- MCQ_SHOULD_BE_MSQ_REVIEW / MCQ_SHOULD_BE_MSQ_REVIEW / REVIEW: Row is marked as MCQ but answer contains multiple values. Consider changing to MSQ.

### Row 118 - JEE26-MAT-037 (REJECTED)

- Raw Type: INTEGER
- Canonical Type: TEXT_ENTRY
- Skipped Rules: None
- EXPLANATION_FORMAT_INCOMPATIBLE / EXPLANATION_FORMAT_INCOMPATIBLE / BLOCK: Explanation concludes with an option answer, which is incompatible with a text-entry interaction.
  Evidence: {"extractedValue":"D","structuredValue":["28"],"confidence":0.98,"extractionMethod":"explicit_final_marker","sourceSpan":"Final answer: Option D","comparisonPolicy":"interaction_mode_compatibility"}

### Row 119 - JEE26-MAT-038 (NEEDS_REVIEW)

- Raw Type: SCQ
- Canonical Type: MCQ
- Skipped Rules: None
- DUPLICATE_NORMALIZED_STEM_REVIEW / DUPLICATE_NORMALIZED_STEM_REVIEW / REVIEW: Question stem is identical to matching rows: `JEE26-MAT-008`, `JEE26-MAT-028`.
  Evidence: {"duplicateGroupId":"DUP-STEM-119","matchingCount":2}

### Row 120 - JEE26-MAT-039 (NEEDS_REVIEW)

- Raw Type: MSQ
- Canonical Type: MSQ
- Skipped Rules: EXPLANATION_KEY_MISMATCH
- DUPLICATE_NORMALIZED_STEM_REVIEW / DUPLICATE_NORMALIZED_STEM_REVIEW / REVIEW: Question stem is identical to matching rows: `JEE26-MAT-009`, `JEE26-MAT-019`, `JEE26-MAT-029`.
  Evidence: {"duplicateGroupId":"DUP-STEM-120","matchingCount":3}

### Row 121 - JEE26-MAT-040 (REJECTED)

- Raw Type: MATRIX_MATCH
- Canonical Type: UNSUPPORTED
- Skipped Rules: None
- UNSUPPORTED_TYPE_FOR_TARGET_EXPORT / UNSUPPORTED_TYPE_FOR_TARGET_EXPORT / BLOCK: Question type 'MATRIX_MATCH' is unsupported for the current target export profile.
  Suppressed: EXPLICIT_TYPE_OVERRIDDEN
  Evidence: {"rawType":"MATRIX_MATCH"}
- MATRIX_MATCH_INCOMPLETE / MATRIX_MATCH_INCOMPLETE / BLOCK: Matrix-match interaction requires non-empty left and right entity columns.
