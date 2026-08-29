# AssessmentCore Validator Regression Fixture Report

## Run Metadata

- Validator Build: 5.0.0-regression-fixture-stable
- Rule Set Version: 5.0.0
- Normalizer Version: 1.7.0
- Regression Fixture Version: 1.0.0
- Fixture: D:\PC-13-06\download\AssessmentCore\test\fixtures\validator-regression-fixture.xlsx
- Expectation Manifest: D:\PC-13-06\download\AssessmentCore\test\fixtures\validator-regression-expectations.json
- Mapping Hash Used by Ingestion: 94131f6b
- Mapping Hash Used by Report: 94131f6b

## Raw Field Population and Mutation Read-Back

- Copyright_Status populated: 28/28
- Source_Reference populated: 28/28
- Teacher_Version populated: 28/28
- Submitted_At populated: 28/28
- Last_Updated_At populated: 28/28
- Raw U+FFFD read-back row IDs: [REG-ENC-001, REG-ENC-002]
- Active unit-bearing numerical rows: 3
- Active unit-bearing numerical row IDs: [REG-UNIT-001, REG-UNIT-002, REG-UNIT-003]
- Inactive Numerical_Answer rows: 5
- Inactive Numerical_Answer row IDs: [REG-INACTIVE-001, REG-INACTIVE-002, REG-INACTIVE-003, REG-INACTIVE-004, REG-INACTIVE-005]

## Final-Issue Coverage

### BROKEN_ENCODING

- Expected row IDs: [REG-ENC-001, REG-ENC-002]
- Applicable row IDs: [REG-ENC-001, REG-ENC-002]
- Detected row IDs: [REG-ENC-001, REG-ENC-002]
- Missed row IDs: []
- False-positive row IDs: []

### COPYRIGHT_UNVERIFIED

- Expected row IDs: [REG-COPY-001, REG-COPY-002, REG-COPY-003, REG-COPY-004, REG-COPY-005]
- Applicable row IDs: [REG-COPY-001, REG-COPY-002, REG-COPY-003, REG-COPY-004, REG-COPY-005]
- Detected row IDs: [REG-COPY-001, REG-COPY-002, REG-COPY-003, REG-COPY-004, REG-COPY-005]
- Missed row IDs: []
- False-positive row IDs: []

### WRONG_SUBJECT_TAG

- Expected row IDs: [REG-SUBJ-001, REG-SUBJ-002, REG-SUBJ-003]
- Applicable row IDs: [REG-SUBJ-001, REG-SUBJ-002, REG-SUBJ-003]
- Detected row IDs: [REG-SUBJ-001, REG-SUBJ-002, REG-SUBJ-003]
- Missed row IDs: []
- False-positive row IDs: []

### VERSION_TIMESTAMP_CONFLICT

- Expected row IDs: [REG-VERS-001, REG-VERS-002, REG-VERS-003]
- Applicable row IDs: [REG-VERS-001, REG-VERS-002, REG-VERS-003]
- Detected row IDs: [REG-VERS-001, REG-VERS-002, REG-VERS-003]
- Missed row IDs: []
- False-positive row IDs: []

### UNIT_EMBEDDED_IN_NUMERIC_ANSWER

- Expected row IDs: [REG-UNIT-001, REG-UNIT-002, REG-UNIT-003]
- Applicable row IDs: [REG-UNIT-001, REG-UNIT-002, REG-UNIT-003]
- Detected row IDs: [REG-UNIT-001, REG-UNIT-002, REG-UNIT-003]
- Missed row IDs: []
- False-positive row IDs: []

### INACTIVE_FIELD_CONTAINS_DATA

- Expected row IDs: [REG-INACTIVE-001, REG-INACTIVE-002, REG-INACTIVE-003, REG-INACTIVE-004, REG-INACTIVE-005]
- Applicable row IDs: [REG-INACTIVE-001, REG-INACTIVE-002, REG-INACTIVE-003, REG-INACTIVE-004, REG-INACTIVE-005]
- Detected row IDs: [REG-INACTIVE-001, REG-INACTIVE-002, REG-INACTIVE-003, REG-INACTIVE-004, REG-INACTIVE-005]
- Missed row IDs: []
- False-positive row IDs: []

## Per-Row Integrity

| Row ID               | Expected                          | Actual Final Canonical Problems                                                                      | Missed | Forbidden Issue Violations | Unexpected Additional Issues |
| -------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------- | ------ | -------------------------- | ---------------------------- |
| REG-BASE-001         | []                                | []                                                                                                   | []     | []                         | []                           |
| REG-ENC-001          | [BROKEN_ENCODING]                 | [BROKEN_ENCODING]                                                                                    | []     | []                         | []                           |
| REG-ENC-002          | [BROKEN_ENCODING]                 | [BROKEN_ENCODING]                                                                                    | []     | []                         | []                           |
| REG-ENC-CONTROL      | []                                | []                                                                                                   | []     | []                         | []                           |
| REG-COPY-001         | [COPYRIGHT_UNVERIFIED]            | [COPYRIGHT_UNVERIFIED]                                                                               | []     | []                         | []                           |
| REG-COPY-002         | [COPYRIGHT_UNVERIFIED]            | [COPYRIGHT_UNVERIFIED]                                                                               | []     | []                         | []                           |
| REG-COPY-003         | [COPYRIGHT_UNVERIFIED]            | [COPYRIGHT_UNVERIFIED]                                                                               | []     | []                         | []                           |
| REG-COPY-004         | [COPYRIGHT_UNVERIFIED]            | [COPYRIGHT_UNVERIFIED]                                                                               | []     | []                         | []                           |
| REG-COPY-005         | [COPYRIGHT_UNVERIFIED]            | [COPYRIGHT_UNVERIFIED]                                                                               | []     | []                         | []                           |
| REG-COPY-CONTROL     | []                                | []                                                                                                   | []     | []                         | []                           |
| REG-SUBJ-001         | [WRONG_SUBJECT_TAG]               | [WRONG_SUBJECT_TAG]                                                                                  | []     | []                         | []                           |
| REG-SUBJ-002         | [WRONG_SUBJECT_TAG]               | [WRONG_SUBJECT_TAG]                                                                                  | []     | []                         | []                           |
| REG-SUBJ-003         | [WRONG_SUBJECT_TAG]               | [WRONG_SUBJECT_TAG]                                                                                  | []     | []                         | []                           |
| REG-VERS-001         | [VERSION_TIMESTAMP_CONFLICT]      | [VERSION_TIMESTAMP_CONFLICT]                                                                         | []     | []                         | []                           |
| REG-VERS-002         | [VERSION_TIMESTAMP_CONFLICT]      | [VERSION_TIMESTAMP_CONFLICT]                                                                         | []     | []                         | []                           |
| REG-VERS-003         | [VERSION_TIMESTAMP_CONFLICT]      | [VERSION_TIMESTAMP_CONFLICT]                                                                         | []     | []                         | []                           |
| REG-VERS-CONTROL     | []                                | []                                                                                                   | []     | []                         | []                           |
| REG-UNIT-001         | [UNIT_EMBEDDED_IN_NUMERIC_ANSWER] | [NUMERIC_ANSWER_NOT_NUMERIC, UNIT_EMBEDDED_IN_NUMERIC_ANSWER]                                        | []     | []                         | []                           |
| REG-UNIT-002         | [UNIT_EMBEDDED_IN_NUMERIC_ANSWER] | [NUMERIC_ANSWER_NOT_NUMERIC, UNIT_EMBEDDED_IN_NUMERIC_ANSWER]                                        | []     | []                         | []                           |
| REG-UNIT-003         | [UNIT_EMBEDDED_IN_NUMERIC_ANSWER] | [NUMERIC_ANSWER_NOT_NUMERIC, UNIT_EMBEDDED_IN_NUMERIC_ANSWER]                                        | []     | []                         | []                           |
| REG-UNIT-CONTROL-001 | []                                | []                                                                                                   | []     | []                         | []                           |
| REG-UNIT-CONTROL-002 | []                                | []                                                                                                   | []     | []                         | []                           |
| REG-UNIT-CONTROL-003 | []                                | []                                                                                                   | []     | []                         | []                           |
| REG-INACTIVE-001     | [INACTIVE_FIELD_CONTAINS_DATA]    | [INACTIVE_FIELD_CONTAINS_DATA]                                                                       | []     | []                         | []                           |
| REG-INACTIVE-002     | [INACTIVE_FIELD_CONTAINS_DATA]    | [INACTIVE_FIELD_CONTAINS_DATA]                                                                       | []     | []                         | []                           |
| REG-INACTIVE-003     | [INACTIVE_FIELD_CONTAINS_DATA]    | [INACTIVE_FIELD_CONTAINS_DATA]                                                                       | []     | []                         | []                           |
| REG-INACTIVE-004     | [INACTIVE_FIELD_CONTAINS_DATA]    | [INACTIVE_FIELD_CONTAINS_DATA, MATRIX_MATCH_INCOMPLETE, UNSUPPORTED_TYPE_FOR_TARGET_EXPORT]          | []     | []                         | []                           |
| REG-INACTIVE-005     | [INACTIVE_FIELD_CONTAINS_DATA]    | [HOTSPOT_CONFIGURATION_INCOMPLETE, INACTIVE_FIELD_CONTAINS_DATA, UNSUPPORTED_TYPE_FOR_TARGET_EXPORT] | []     | []                         | []                           |

## Control-Row Results

- REG-BASE-001: actual=[]; forbidden=[]; unexpected=[]
- REG-ENC-CONTROL: actual=[]; forbidden=[]; unexpected=[]
- REG-COPY-CONTROL: actual=[]; forbidden=[]; unexpected=[]
- REG-VERS-CONTROL: actual=[]; forbidden=[]; unexpected=[]
- REG-UNIT-CONTROL-001: actual=[]; forbidden=[]; unexpected=[]
- REG-UNIT-CONTROL-002: actual=[]; forbidden=[]; unexpected=[]
- REG-UNIT-CONTROL-003: actual=[]; forbidden=[]; unexpected=[]

## Batch-Level Issues

- None

## Source-Rule / Canonical-Problem Diagnostics

| Source Rule                                 | Pre-dedup Emitted | Suppressed | Final Rows Under Same Rule ID | Canonical Problem                           | Final Rows Under Canonical Problem |
| ------------------------------------------- | ----------------: | ---------: | ----------------------------: | ------------------------------------------- | ---------------------------------: |
| AMBIGUOUS_MEDIA_FILENAME                    |                 0 |          0 |                             0 | AMBIGUOUS_MEDIA_FILENAME                    |                                  0 |
| BROKEN_ENCODING                             |                 2 |          0 |                             2 | BROKEN_ENCODING                             |                                  2 |
| COLUMN_MAPPING_AMBIGUOUS                    |                 0 |          0 |                             0 | COLUMN_MAPPING_AMBIGUOUS                    |                                  0 |
| CONTEXT_MISSING                             |                 0 |          0 |                             0 | CONTEXT_MISSING                             |                                  0 |
| COPYRIGHT_UNVERIFIED                        |                 5 |          0 |                             5 | COPYRIGHT_UNVERIFIED                        |                                  5 |
| CORRECTION_ACTION_AMBIGUOUS                 |                 0 |          0 |                             0 | CORRECTION_ACTION_AMBIGUOUS                 |                                  0 |
| CORRECTION_AUDIT_TRAIL_MISSING              |                 0 |          0 |                             0 | CORRECTION_AUDIT_TRAIL_MISSING              |                                  0 |
| DELIMITER_FORMAT_FOR_MSQ                    |                 0 |          0 |                             0 | DELIMITER_FORMAT_FOR_MSQ                    |                                  0 |
| DUPLICATE_MATCH_CONTEXT_MISSING             |                 0 |          0 |                             0 | DUPLICATE_MATCH_CONTEXT_MISSING             |                                  0 |
| DUPLICATE_NORMALIZED_STEM_REVIEW            |                 0 |          0 |                             0 | DUPLICATE_NORMALIZED_STEM_REVIEW            |                                  0 |
| DUPLICATE_QUESTION_ID                       |                 0 |          0 |                             0 | DUPLICATE_QUESTION_ID                       |                                  0 |
| EMPTY_ROW_WARNING                           |                 0 |          0 |                             0 | EMPTY_ROW_WARNING                           |                                  0 |
| EXPLANATION_FORMAT_INCOMPATIBLE             |                 0 |          0 |                             0 | EXPLANATION_FORMAT_INCOMPATIBLE             |                                  0 |
| EXPLANATION_INSUFFICIENT                    |                 0 |          0 |                             0 | EXPLANATION_INSUFFICIENT                    |                                  0 |
| EXPLANATION_KEY_MISMATCH                    |                 0 |          0 |                             0 | EXPLANATION_KEY_MISMATCH                    |                                  0 |
| EXPLANATION_MISSING                         |                 0 |          0 |                             0 | EXPLANATION_MISSING                         |                                  0 |
| EXPLANATION_RESULT_MISMATCH                 |                 0 |          0 |                             0 | EXPLANATION_RESULT_MISMATCH                 |                                  0 |
| EXPLANATION_UNIT_MISMATCH                   |                 0 |          0 |                             0 | EXPLANATION_UNIT_MISMATCH                   |                                  0 |
| EXPLICIT_TYPE_OVERRIDDEN                    |                 2 |          2 |                             0 | UNSUPPORTED_TYPE_FOR_TARGET_EXPORT          |                                  2 |
| HOTSPOT_CONFIGURATION_INCOMPLETE            |                 1 |          0 |                             1 | HOTSPOT_CONFIGURATION_INCOMPLETE            |                                  1 |
| INACTIVE_FIELD_CONTAINS_DATA                |                 5 |          0 |                             5 | INACTIVE_FIELD_CONTAINS_DATA                |                                  5 |
| INTEGER_ANSWER_NOT_INTEGER                  |                 0 |          0 |                             0 | INTEGER_ANSWER_NOT_INTEGER                  |                                  0 |
| ISSUE_MESSAGE_TRUNCATED                     |                 0 |          0 |                             0 | ISSUE_MESSAGE_TRUNCATED                     |                                  0 |
| LANGUAGE_METADATA_MISMATCH                  |                 0 |          0 |                             0 | LANGUAGE_METADATA_MISMATCH                  |                                  0 |
| LATEX_STEM_DELIMITER_VALID                  |                 0 |          0 |                             0 | MALFORMED_LATEX_DELIMITER                   |                                  0 |
| MALFORMED_LATEX_DELIMITER                   |                 0 |          0 |                             0 | MALFORMED_LATEX_DELIMITER                   |                                  0 |
| MARKS_INVALID                               |                 0 |          0 |                             0 | POSITIVE_MARKS_INVALID                      |                                  0 |
| MATH_RENDER_FAILED                          |                 0 |          0 |                             0 | MATH_RENDER_FAILED                          |                                  0 |
| MATRIX_MATCH_INCOMPLETE                     |                 1 |          0 |                             1 | MATRIX_MATCH_INCOMPLETE                     |                                  1 |
| MCQ_ANSWER_IN_OPTIONS                       |                 0 |          0 |                             0 | ANSWER_NOT_IN_OPTIONS                       |                                  0 |
| MCQ_ANSWER_TEXT_AMBIGUOUS                   |                 0 |          0 |                             0 | MCQ_ANSWER_TEXT_AMBIGUOUS                   |                                  0 |
| MCQ_ANSWER_TEXT_MATCH                       |                 0 |          0 |                             0 | ANSWER_NOT_IN_OPTIONS                       |                                  0 |
| MCQ_HAS_CORRECT_ANSWER                      |                 0 |          0 |                             0 | MCQ_HAS_CORRECT_ANSWER                      |                                  0 |
| MCQ_MIN_OPTIONS                             |                 0 |          0 |                             0 | MCQ_MIN_OPTIONS                             |                                  0 |
| MCQ_OPTIONS_UNIQUE                          |                 0 |          0 |                             0 | MCQ_OPTIONS_UNIQUE                          |                                  0 |
| MCQ_OPTION_IDENTIFIERS_UNIQUE               |                 0 |          0 |                             0 | MCQ_OPTION_IDENTIFIERS_UNIQUE               |                                  0 |
| MCQ_OPTION_IDENTIFIER_VALID                 |                 0 |          0 |                             0 | MCQ_OPTION_IDENTIFIER_VALID                 |                                  0 |
| MCQ_OPTION_TEXT_NOT_EMPTY                   |                 0 |          0 |                             0 | MCQ_OPTION_TEXT_NOT_EMPTY                   |                                  0 |
| MCQ_SHOULD_BE_MSQ_REVIEW                    |                 0 |          0 |                             0 | MCQ_SHOULD_BE_MSQ_REVIEW                    |                                  0 |
| MCQ_SINGLE_CORRECT_ONLY                     |                 0 |          0 |                             0 | MCQ_SINGLE_CORRECT_ONLY                     |                                  0 |
| MCQ_SUSPECT_TRUE_FALSE_REVIEW               |                 0 |          0 |                             0 | MCQ_SUSPECT_TRUE_FALSE_REVIEW               |                                  0 |
| MEDIA_REFERENCE_NOT_FOUND                   |                 0 |          0 |                             0 | MEDIA_REFERENCE_NOT_FOUND                   |                                  0 |
| MEDIA_URL_INVALID_FORMAT                    |                 0 |          0 |                             0 | MEDIA_URL_INVALID_FORMAT                    |                                  0 |
| MSQ_ANSWER_IDENTIFIER_VALID                 |                 0 |          0 |                             0 | MSQ_ANSWER_IDENTIFIER_VALID                 |                                  0 |
| MSQ_ANSWER_TEXT_AMBIGUOUS                   |                 0 |          0 |                             0 | MSQ_ANSWER_TEXT_AMBIGUOUS                   |                                  0 |
| MSQ_ANSWER_TEXT_MATCH                       |                 0 |          0 |                             0 | ANSWER_NOT_IN_OPTIONS                       |                                  0 |
| MSQ_CORRECT_ANSWERS_IN_OPTIONS              |                 0 |          0 |                             0 | ANSWER_NOT_IN_OPTIONS                       |                                  0 |
| MSQ_EXACT_SET_MATCH                         |                 0 |          0 |                             0 | MSQ_EXACT_SET_MATCH                         |                                  0 |
| MSQ_HAS_CORRECT_ANSWERS                     |                 0 |          0 |                             0 | MSQ_HAS_CORRECT_ANSWERS                     |                                  0 |
| MSQ_MIN_OPTIONS                             |                 0 |          0 |                             0 | MSQ_MIN_OPTIONS                             |                                  0 |
| MSQ_MIXED_IDENTIFIER_MODE                   |                 0 |          0 |                             0 | MSQ_MIXED_IDENTIFIER_MODE                   |                                  0 |
| MSQ_NO_DUPLICATE_CORRECT_ANSWERS            |                 0 |          0 |                             0 | MSQ_NO_DUPLICATE_CORRECT_ANSWERS            |                                  0 |
| MSQ_OPTIONS_UNIQUE                          |                 0 |          0 |                             0 | MSQ_OPTIONS_UNIQUE                          |                                  0 |
| MSQ_OPTION_IDENTIFIERS_UNIQUE               |                 0 |          0 |                             0 | MSQ_OPTION_IDENTIFIERS_UNIQUE               |                                  0 |
| MSQ_SCORING_REVIEW                          |                 0 |          0 |                             0 | MSQ_SCORING_REVIEW                          |                                  0 |
| MULTIPLE_CORRECT_OPTIONS_SUSPECTED          |                 0 |          0 |                             0 | MULTIPLE_CORRECT_OPTIONS_SUSPECTED          |                                  0 |
| NEGATIVE_MARKS_CONVENTION_AMBIGUOUS         |                 0 |          0 |                             0 | NEGATIVE_MARKS_CONVENTION_AMBIGUOUS         |                                  0 |
| NEGATIVE_MARKS_EXCEED_POSITIVE              |                 0 |          0 |                             0 | NEGATIVE_MARKS_EXCEED_POSITIVE              |                                  0 |
| NEGATIVE_MARKS_INVALID                      |                 0 |          0 |                             0 | NEGATIVE_MARKS_INVALID                      |                                  0 |
| NONSTANDARD_DIFFICULTY                      |                 0 |          0 |                             0 | NONSTANDARD_DIFFICULTY                      |                                  0 |
| NORMALIZATION_AUDIT_MISSING                 |                 0 |          0 |                             0 | NORMALIZATION_AUDIT_MISSING                 |                                  0 |
| NUMERIC_ANSWER_NOT_NUMERIC                  |                 3 |          0 |                             3 | NUMERIC_ANSWER_NOT_NUMERIC                  |                                  3 |
| NUMERIC_TOLERANCE_INVALID                   |                 0 |          0 |                             0 | NUMERIC_TOLERANCE_INVALID                   |                                  0 |
| NUMERIC_TOLERANCE_MISSING                   |                 0 |          0 |                             0 | NUMERIC_TOLERANCE_MISSING                   |                                  0 |
| ORDER_HAS_CORRECT_SEQUENCE                  |                 0 |          0 |                             0 | ORDER_HAS_CORRECT_SEQUENCE                  |                                  0 |
| ORDER_MIN_OPTIONS                           |                 0 |          0 |                             0 | ORDER_MIN_OPTIONS                           |                                  0 |
| ORDER_SEQUENCE_INVALID                      |                 0 |          0 |                             0 | ORDER_SEQUENCE_INVALID                      |                                  0 |
| ORDER_SEQUENCE_MATCH                        |                 0 |          0 |                             0 | ORDER_SEQUENCE_MATCH                        |                                  0 |
| PARTIAL_MARKING_AMBIGUOUS                   |                 0 |          0 |                             0 | PARTIAL_MARKING_AMBIGUOUS                   |                                  0 |
| PARTIAL_MARKING_AMBIGUOUS_PROSE             |                 0 |          0 |                             0 | PARTIAL_MARKING_AMBIGUOUS_PROSE             |                                  0 |
| PASSAGE_LINK_BROKEN                         |                 0 |          0 |                             0 | PASSAGE_LINK_BROKEN                         |                                  0 |
| POSITIVE_MARKS_INVALID                      |                 0 |          0 |                             0 | POSITIVE_MARKS_INVALID                      |                                  0 |
| POSSIBLE_EXPLANATION_RESULT_MISMATCH        |                 0 |          0 |                             0 | POSSIBLE_EXPLANATION_RESULT_MISMATCH        |                                  0 |
| QUESTION_ID_FIELD_MISMAPPED                 |                 0 |          0 |                             0 | QUESTION_ID_FIELD_MISMAPPED                 |                                  0 |
| QUESTION_SCORING_CONFLICTS_WITH_SECTION     |                 0 |          0 |                             0 | QUESTION_SCORING_CONFLICTS_WITH_SECTION     |                                  0 |
| QUESTION_TYPE_ALIAS_UNMAPPED                |                 0 |          0 |                             0 | QUESTION_TYPE_ALIAS_UNMAPPED                |                                  0 |
| REPORT_FIELD_MISLABELED                     |                 0 |          0 |                             0 | REPORT_FIELD_MISLABELED                     |                                  0 |
| REQUIRED_MEDIA_MISSING                      |                 0 |          0 |                             0 | REQUIRED_MEDIA_MISSING                      |                                  0 |
| REQUIRED_QUESTION_FIELD                     |                 0 |          0 |                             0 | REQUIRED_QUESTION_FIELD                     |                                  0 |
| RESPONSE_SUBTYPE_LOST                       |                 0 |          0 |                             0 | INTEGER_ANSWER_NOT_INTEGER                  |                                  0 |
| TEXT_ENTRY_ACCEPTED_ANSWERS_NOT_EMPTY       |                 0 |          0 |                             0 | TEXT_ENTRY_ACCEPTED_ANSWERS_NOT_EMPTY       |                                  0 |
| TEXT_ENTRY_CASE_POLICY_DEFINED              |                 0 |          0 |                             0 | TEXT_ENTRY_CASE_POLICY_DEFINED              |                                  0 |
| TEXT_ENTRY_FORMULA_FORMAT_VALID             |                 0 |          0 |                             0 | TEXT_ENTRY_FORMULA_FORMAT_VALID             |                                  0 |
| TEXT_ENTRY_HAS_ANSWER                       |                 0 |          0 |                             0 | TEXT_ENTRY_HAS_ANSWER                       |                                  0 |
| TEXT_ENTRY_LATEX_VALID                      |                 0 |          0 |                             0 | TEXT_ENTRY_LATEX_VALID                      |                                  0 |
| TEXT_ENTRY_MULTIPLE_ANSWERS_DELIMITER_VALID |                 0 |          0 |                             0 | TEXT_ENTRY_MULTIPLE_ANSWERS_DELIMITER_VALID |                                  0 |
| TEXT_ENTRY_NUMERIC_ANSWER_VALID             |                 3 |          3 |                             0 | NUMERIC_ANSWER_NOT_NUMERIC                  |                                  3 |
| TEXT_ENTRY_NUMERIC_TOLERANCE_VALID          |                 0 |          0 |                             0 | TEXT_ENTRY_NUMERIC_TOLERANCE_VALID          |                                  0 |
| TEXT_ENTRY_TRIM_POLICY_DEFINED              |                 0 |          0 |                             0 | TEXT_ENTRY_TRIM_POLICY_DEFINED              |                                  0 |
| TEXT_ENTRY_UNIT_POLICY_VALID                |                 0 |          0 |                             0 | UNIT_POLICY_INVALID                         |                                  0 |
| TIME_LIMIT_INVALID                          |                 0 |          0 |                             0 | TIME_LIMIT_INVALID                          |                                  0 |
| TRUNCATED_STEM                              |                 0 |          0 |                             0 | TRUNCATED_STEM                              |                                  0 |
| UNICODE_MATH_FALSE_POSITIVE                 |                 0 |          0 |                             0 | UNICODE_MATH_FALSE_POSITIVE                 |                                  0 |
| UNIT_EMBEDDED_IN_NUMERIC_ANSWER             |                 3 |          0 |                             3 | UNIT_EMBEDDED_IN_NUMERIC_ANSWER             |                                  3 |
| UNIT_POLICY_INVALID                         |                 0 |          0 |                             0 | UNIT_POLICY_INVALID                         |                                  0 |
| UNKNOWN_QUESTION_TYPE_BLOCK                 |                 0 |          0 |                             0 | UNKNOWN_QUESTION_TYPE_BLOCK                 |                                  0 |
| UNSUPPORTED_HTML_OR_SCRIPT                  |                 0 |          0 |                             0 | UNSUPPORTED_HTML_OR_SCRIPT                  |                                  0 |
| UNSUPPORTED_MATH_FORMAT                     |                 0 |          0 |                             0 | UNSUPPORTED_MATH_FORMAT                     |                                  0 |
| UNSUPPORTED_TYPE_FOR_TARGET_EXPORT          |                 2 |          0 |                             2 | UNSUPPORTED_TYPE_FOR_TARGET_EXPORT          |                                  2 |
| VERSION_TIMESTAMP_CONFLICT                  |                 3 |          0 |                             3 | VERSION_TIMESTAMP_CONFLICT                  |                                  3 |
| WRONG_SUBJECT_TAG                           |                 3 |          0 |                             3 | WRONG_SUBJECT_TAG                           |                                  3 |
| YEAR_INVALID                                |                 0 |          0 |                             0 | YEAR_INVALID                                |                                  0 |
