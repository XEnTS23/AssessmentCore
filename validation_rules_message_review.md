# Batch Creator Validation Rules and Message Review

## Scope

This document reviews the **102 rules registered in `defaultRules`** and executed by the Batch Creator row-validation engine after upload/normalization.

It records the current message from the source code, the condition that emits it, a simple example, and whether the wording correctly represents the condition.

This table does not cover separate later-stage checks such as export-readiness gates, package/artifact validation, AI audit responses, or the legacy `questionValidator` flow.

## Recommended columns

In addition to the requested columns, the table includes:

- **Rule ID** — uniquely identifies the source rule.
- **Severity** — explains whether the issue blocks export or requires review.
- **Field / scope** — identifies where the user should make a correction.
- **Review finding** — records whether the current message is correct, misleading, redundant, or affected by a runtime defect.

### Review finding legend

| Finding | Meaning |
|---|---|
| OK | Message accurately describes the trigger. |
| Review | Message is broadly related but may overstate, omit, or misdescribe part of the condition. |
| Defect | The intended message may not reach the user or directly contradicts the condition. |
| Redundant | Another active rule can emit substantially the same issue for the same condition. |

## 1. General, structural, and metadata rules

| No. | Category | Rule ID | Severity | Validation error message | When it triggers, with example | Field / scope | Review finding |
|---:|---|---|---|---|---|---|---|
| 1 | Structural | `REQUIRED_QUESTION_FIELD` | Block | `Question stem is required.` | A resolved question type has an empty stem. Example: MCQ with `Question_Text = ""`. | `stem` | OK |
| 2 | Structural | `UNKNOWN_QUESTION_TYPE_BLOCK` | Block | `Question type could not be determined.` | Normalization leaves the type as `UNKNOWN`. Example: `Question_Type = "Essay Plus"` with no supported alias. | `type` | OK |
| 3 | Export readiness | `UNSUPPORTED_TYPE_FOR_TARGET_EXPORT` | Block | `Question type '{rawType}' is unsupported for the current target export profile.` | The normalized type is `UNSUPPORTED`. Example: raw type `MATCH_THE_FOLLOWING` is preserved as unsupported. | `type` | Review — the condition does not inspect a target export profile, so “current target” is more specific than the trigger. |
| 4 | Content quality | `EMPTY_ROW_WARNING` | Warning | `Row appears to be completely empty.` | Type is `UNKNOWN`, raw stem is empty, and all mapped cells are empty. Example: a blank spreadsheet row. | Row | OK |
| 5 | Metadata | `DUPLICATE_QUESTION_ID` | Block | `Duplicate Question ID found: {questionId}` | Another row has exactly the same canonical question ID. Example: two rows use `Q-101`. | `questionId` | OK |
| 6 | Content quality | `DUPLICATE_NORMALIZED_STEM_REVIEW` | Review | `Question stem is identical to matching rows: {IDs/row numbers}.` | Another supported question has the same trimmed, case-insensitive stem. Example: rows Q1 and Q8 both contain `What is 2 + 2?`. | `stem` | OK — includes useful matching-row context. |
| 7 | Content quality | `LATEX_STEM_DELIMITER_VALID` | Review | Dynamic LaTeX message, such as `LaTeX math opened with \( but is not closed; expected \).`, `Found closing LaTeX delimiter \) without a matching opening delimiter.`, or `LaTeX command \frac must be enclosed in an inline or display math delimiter.` | The stem contains unclosed, unexpected, mismatched, empty, or missing LaTeX delimiters. Example: `Solve \(x+1`. | `stem` | OK |
| 8 | Media | `MEDIA_URL_INVALID_FORMAT` | Dynamic: block, warning, or info | Dynamic media message, including `Invalid public media URL.`, `Unsupported protocol: {protocol}. Only HTTP/HTTPS are supported.`, `Unsupported {type} format: {extension}...`, `External URL provided...`, or `Missing accessibility description for asset...` | A media reference has an unsafe/invalid URL, HTTP URL, unsupported extension, external-link compatibility concern, or missing alt text. Example: `ftp://host/image.bmp`. | `mediaReferences[index]` | Review — one rule ID represents several materially different media conditions and severities. |
| 9 | Scoring | `MARKS_INVALID` | Block | `Marks must be a finite number greater than 0.` | Marks are present but non-finite or less than/equal to zero. Example: `Marks = 0`. | `marks` | Redundant — overlaps `POSITIVE_MARKS_INVALID`; deduplication normally keeps one canonical issue. |
| 10 | Scoring | `NEGATIVE_MARKS_INVALID` | Block | `Negative marks must be a finite number less than or equal to 0.` | Negative marks are non-finite or positive. Example: normalized `Negative_Marks = +1`. | `negativeMarks` | OK, although a separate convention rule may also ask whether a positive value means a deduction. |
| 11 | Metadata | `TIME_LIMIT_INVALID` | Block | `Time limit must be a finite number greater than 0 seconds.` | A time limit is present but non-finite or less than/equal to zero. Example: `Expected_Time_sec = 0`. | `timeLimitSeconds` | OK |
| 12 | Metadata | `YEAR_INVALID` | Warning | `Unusual year value: {year}` | `parseInt(year)` is NaN, earlier than 1900, or more than five years in the future. Example: `Year = 1899`. | `year` | Review — “unusual” is vague, and values such as `2025abc` can pass because `parseInt` accepts the numeric prefix. |

## 2. Content integrity and media-presence rules

| No. | Category | Rule ID | Severity | Validation error message | When it triggers, with example | Field / scope | Review finding |
|---:|---|---|---|---|---|---|---|
| 13 | Content quality | `TRUNCATED_STEM` | Block | `Question stem appears truncated or incomplete: '{last 30 characters}'.` | The stem ends with an ellipsis, an abrupt connector/article, or an unclosed parenthesis followed by ellipsis. Example: `The correct expression is...`. | `stem` | OK — appropriately says “appears,” because this is heuristic. |
| 14 | Content quality | `CONTEXT_MISSING` | Block; figure branch attempts `caution` | One of: `Question stem consists solely of generic text without essential proposition or stimulus.`; `Question stem references a figure or diagram below, but no image asset is associated. Media is optional, so this question can still be exported.`; `Question stem references a reading passage, but no passage is linked.` | Generic stem, missing referenced figure, or missing referenced passage. Example: `As shown in the figure below...` with no media. | `stem` | **Defect** — the figure branch emits invalid severity `caution`; the engine replaces this text with `VALIDATION_RULE_EXECUTION_ERROR`. The “media is optional” assertion can also contradict the academic condition. |
| 15 | Content quality | `BROKEN_ENCODING` | Block | `Field '{field}' contains a Unicode replacement character, null byte, or disallowed control character.` | A raw or normalized field contains U+FFFD, a null/control character, or a recognized mojibake sequence. Example: `x� + y = 4`. | Detected field | Review — the message omits mojibake even though mojibake also triggers the rule. |
| 16 | Media | `REQUIRED_MEDIA_MISSING` | Warning; non-blocking | `Image is flagged as required for this question, but no file name or asset URL is attached. Media is optional, so this question can still be exported.` | `Image_Required` is true/1/yes and no filename, URL, or media reference exists. Example: `Image_Required = Yes`, `Image_File_Name = blank`. | `mediaRequired` | **Defect** — “flagged as required” directly contradicts “media is optional.” |
| 17 | Media | `MEDIA_REFERENCE_NOT_FOUND` | Review; non-blocking | `Referenced media asset '{fileName}' was not found in the uploaded package bundle. Media is optional, so this question can still be exported.` | A filename exists, a package asset list is available, and no case-insensitive filename match is found. Example: row references `diagram.png`, bundle contains only `photo.png`. | `mediaFileName` | Review — optionality is not established by this condition and may be false for a required or figure-dependent asset. |

## 3. Compliance and metadata-quality rules

| No. | Category | Rule ID | Severity | Validation error message | When it triggers, with example | Field / scope | Review finding |
|---:|---|---|---|---|---|---|---|
| 18 | Metadata | `COPYRIGHT_UNVERIFIED` | Block | `Copyright status '{status}' is not approved for source '{source}'.` | Copyright is missing/unverified and the source looks copied, or the configured policy requires an approved status. Example: source `Screenshot from coaching material`, status `Unknown`. | `copyrightStatus` | OK |
| 19 | Media | `AMBIGUOUS_MEDIA_FILENAME` | Review | `Media filename '{fileName}' is generic or ambiguous. Re-link with unique asset name to prevent collisions.` | Filename matches a generic name or `image<number>.(png/jpg/jpeg)`. Example: `image1.png`. | `mediaFileName` | OK |
| 20 | Metadata | `WRONG_SUBJECT_TAG` | Review | `Chapter '{chapter}' belongs to {expectedSubject}, but the row is tagged as '{subject}'.` | A chapter in the built-in deterministic taxonomy conflicts with the subject. Example: chapter `Dual Nature of Matter`, subject `Chemistry`. | `subject` | OK within the limited built-in taxonomy. |
| 21 | Metadata | `NONSTANDARD_DIFFICULTY` | Warning | `Difficulty rating '{difficulty}' is non-standard. Expected one of: Easy, Medium, Hard.` | Difficulty is non-empty and is not an exact case-sensitive match for Easy/Medium/Hard. Example: `Very Hard`. | `difficulty` | Review — lowercase `easy` is semantically standard but is still reported as non-standard. |
| 22 | Metadata | `VERSION_TIMESTAMP_CONFLICT` | Review | `Version '{version}' was last updated at {updated}, before it was submitted at {submitted}.` | Both timestamps parse successfully and `lastUpdated < submitted`. Example: submitted Aug 20, updated Aug 19. | `lastUpdatedAt` | OK |
| 23 | Scoring | `PARTIAL_MARKING_AMBIGUOUS_PROSE` | Block | `Partial marking rule '{rawRule}' is ambiguous and non-deterministic for automated scoring.` | Raw prose contains phrases such as `depending on closeness`, `teacher discretion`, or `approximate credit`. | `partialMarkingRule` | OK |

## 4. Ingestion and normalization rules

| No. | Category | Rule ID | Severity | Validation error message | When it triggers, with example | Field / scope | Review finding |
|---:|---|---|---|---|---|---|---|
| 24 | Ingestion | `COLUMN_MAPPING_AMBIGUOUS` | Block | `Multiple candidate columns detected for canonical fields: {columns}. Explicit selection required.` | Mapping context contains one or more ambiguous candidates. Example: both `Answer` and `Correct_Answer` look canonical. | `columnMapping` | OK |
| 25 | Ingestion | `QUESTION_ID_FIELD_MISMAPPED` | Block | `Intake submission identifier '{id}' mapped as canonical Question ID. Verify column mapping.` | Canonical question ID begins `SUB-`, `SUBMISSION_`, or `TEMP_ROW_`. Example: `SUB-8831`. | `questionId` | OK, but prefix-based and therefore heuristic. |
| 26 | Ingestion | `QUESTION_TYPE_ALIAS_UNMAPPED` | Block | `Raw question type '{rawType}' is not mapped to any supported canonical type.` | Type is `UNKNOWN` and a raw type value is retained. Example: `Question_Type = Fill Blank Advanced`. | `type` | OK |
| 27 | Ingestion | `EXPLICIT_TYPE_OVERRIDDEN` | Block | `Explicit raw question type '{rawType}' is unsupported for canonical export and must not be silently converted.` | Normalized type is `UNSUPPORTED`. Example: explicit `HOTSPOT` retained as unsupported by the selected canonical model. | `type` | Redundant — canonical deduplication normally keeps `UNSUPPORTED_TYPE_FOR_TARGET_EXPORT`. |
| 28 | Ingestion | `RESPONSE_SUBTYPE_LOST` | Block | `Integer response subtype required, but accepted answer '{answers}' is not an integer.` | TEXT_ENTRY subtype is integer and at least one accepted answer is NaN or non-integer. Example: `2.5`. | `acceptedAnswers` | Redundant — overlaps `INTEGER_ANSWER_NOT_INTEGER` and is normally deduplicated. |
| 29 | Scoring | `NEGATIVE_MARKS_CONVENTION_AMBIGUOUS` | Review | `Negative marks specified as positive magnitude (+{value}). Confirm whether this represents a deduction (-{value}).` | Negative-marks value is positive and the convention has not been confirmed. Example: `Negative_Marks = 1`. | `negativeMarks` | OK, but can appear alongside the blocking `NEGATIVE_MARKS_INVALID` message and confuse users. |
| 30 | Ingestion | `NORMALIZATION_AUDIT_MISSING` | Block | `Row data underwent value transformation without a complete normalization audit log.` | Row history exists, audit is empty, meaningful scoring data exists, and `__transformedWithoutAudit` is set. | `normalizationAudit` | OK |

## 5. MCQ rules

| No. | Category | Rule ID | Severity | Validation error message | When it triggers, with example | Field / scope | Review finding |
|---:|---|---|---|---|---|---|---|
| 31 | Structural | `MCQ_MIN_OPTIONS` | Block | `MCQ must have at least 2 options.` | MCQ options are missing or fewer than two. Example: only option A exists. | `options` | OK |
| 32 | Content quality | `MCQ_OPTION_TEXT_NOT_EMPTY` | Block | `Option {label/index} has empty text.` | Any MCQ option text is empty/whitespace. Example: option C has `""`. | `options[index]` | OK |
| 33 | Content quality | `MCQ_OPTIONS_UNIQUE` | Review | `Duplicate option text found in options {label1} and {label2}.` | Two option texts are equal after trim and lowercase. Example: A=`Paris`, C=` paris `. | `options` | OK |
| 34 | Structural | `MCQ_OPTION_IDENTIFIERS_UNIQUE` | Block | `Duplicate option identifier detected internally.` | Two MCQ options share the same internal ID. Example: IDs A, A, C. | `options` | OK, though including the duplicate ID would be more actionable. |
| 35 | Structural | `MCQ_OPTION_IDENTIFIER_VALID` | Block | `Option is missing an internal identifier.` | An option ID is empty or whitespace. | `options` | OK, though including the option label/index would be more actionable. |
| 36 | Structural | `MCQ_HAS_CORRECT_ANSWER` | Block | `Correct answer is required.` | `correctAnswerId` is missing, null, or blank. | `correctAnswerId` | OK |
| 37 | Structural | `MCQ_ANSWER_IN_OPTIONS` | Block | `Correct answer '{answer}' does not match any option.` | Parsed canonical answer ID is not one of the option IDs. Example: answer `Z`, options A-D. | `correctAnswerId` | OK |
| 38 | Content quality | `MCQ_ANSWER_TEXT_MATCH` | Block | `Answer text '{rawAnswer}' does not match any option.` | Raw answer token cannot resolve by ID, label, or normalized option text. Example: `Blue` when no option is Blue. | `correctAnswerId` | Redundant — shares the canonical “answer not in options” problem with rule 37 and is normally deduplicated. |
| 39 | Content quality | `MCQ_ANSWER_TEXT_AMBIGUOUS` | Block | `Answer text '{rawAnswer}' matches multiple options. Select an unambiguous option identifier.` | Raw answer text matches more than one option. Example: two options both say `All of these`, and the answer contains that text. | `correctAnswerId` | OK |
| 40 | Structural | `MCQ_SINGLE_CORRECT_ONLY` | Block | `MCQ must have exactly one correct answer. Found multiple delimited values.` | `correctAnswerId` contains comma or semicolon. Example: `A,B`. | `correctAnswerId` | OK |
| 41 | Type suspicion | `MCQ_SHOULD_BE_MSQ_REVIEW` | Review | `Row is marked as MCQ but answer contains multiple values. Consider changing to MSQ.` | Same comma/semicolon condition as rule 40. Example: MCQ answer `A;C`. | `type` | Redundant but useful — gives a type-correction path in addition to the blocking structural message. |
| 42 | Type suspicion | `MCQ_SUSPECT_TRUE_FALSE_REVIEW` | Info | `Question has True/False options. This could be mapped to a TRUE_FALSE question type later.` | MCQ has exactly two options whose normalized texts are `true` and `false`. | `options` | OK |

## 6. MSQ rules

| No. | Category | Rule ID | Severity | Validation error message | When it triggers, with example | Field / scope | Review finding |
|---:|---|---|---|---|---|---|---|
| 43 | Structural | `MSQ_MIN_OPTIONS` | Block | `MSQ must have at least 2 options.` | MSQ options are missing or fewer than two. | `options` | OK |
| 44 | Structural | `MSQ_HAS_CORRECT_ANSWERS` | Block | `At least one correct answer is required for MSQ.` | Correct-answer array is missing or empty. | `correctAnswerIds` | OK |
| 45 | Structural | `MSQ_ANSWER_IDENTIFIER_VALID` | Block | `Correct answer contains an empty identifier.` | At least one correct-answer entry is empty/whitespace. Example: `["A", ""]`. | `correctAnswerIds` | OK |
| 46 | Structural | `MSQ_OPTION_IDENTIFIERS_UNIQUE` | Block | `Duplicate option identifier detected internally.` | Two MSQ options have the same ID. | `options` | OK, but the duplicate ID is not shown. |
| 47 | Content quality | `MSQ_OPTIONS_UNIQUE` | Review | `Duplicate option text found in options {label1} and {label2}.` | Two option texts match after trim/lowercase. | `options` | OK |
| 48 | Structural | `MSQ_CORRECT_ANSWERS_IN_OPTIONS` | Block | `Correct answers [{invalidAnswers}] do not match any option.` | One or more canonical correct-answer IDs are absent from the option IDs. Example: answers A,Z with options A-D. | `correctAnswerIds` | OK |
| 49 | Type suspicion | `MSQ_MIXED_IDENTIFIER_MODE` | Block | `Answers mix option identifiers and option text. Use one answer mode consistently.` | Raw MSQ tokens include at least one direct ID/label and at least one option-text match. Example: `A; Newton`. | `correctAnswerIds` | OK |
| 50 | Content quality | `MSQ_ANSWER_TEXT_MATCH` | Block | `Answer text not found in options: {unmatchedTokens}.` | One or more raw answer tokens cannot resolve to an option. Example: `A; Purple` with no Purple option. | `correctAnswerIds` | Redundant — normally deduplicated with rule 48 as “answer not in options.” |
| 51 | Content quality | `MSQ_ANSWER_TEXT_AMBIGUOUS` | Block | `Answer text matches multiple options: {ambiguousTokens}.` | One or more raw tokens match duplicate option texts. | `correctAnswerIds` | OK |
| 52 | Content quality | `MSQ_NO_DUPLICATE_CORRECT_ANSWERS` | Review | `Correct answers array contains duplicate identifiers.` | Correct-answer array contains duplicates. Example: `[A, A, C]`. | `correctAnswerIds` | OK; the current reference document incorrectly lists a different severity/message. |
| 53 | Content quality | `MSQ_EXACT_SET_MATCH` | Review | `This MSQ has identical stem and exact same answer set as another question.` | Another MSQ has the same normalized stem and the same sorted correct-answer set. | `stem` | Review — it does not identify the matching row, unlike the general duplicate-stem rule. |
| 54 | Structural | `DELIMITER_FORMAT_FOR_MSQ` | Review | `Answer identifier '{answer}' contains a pipe '&#124;' character. It may not have been parsed correctly.` or `Answer identifier '{answer}' contains a comma ','. If this is a list of options, it should be parsed into separate items.` | A supposedly parsed answer entry still contains a pipe or comma. Example: one array entry is `A&#124;C`. | `correctAnswerIds` | OK |
| 55 | Scoring | `MSQ_SCORING_REVIEW` | Warning | `Partial marking is enabled. Ensure export targets (like LMS) fully support this.` | `scoringConfig.partialMarking` is truthy. | `scoringConfig.partialMarking` | Review — this is advisory and does not check the actual configured export target. |

## 7. Text-entry rules

| No. | Category | Rule ID | Severity | Validation error message | When it triggers, with example | Field / scope | Review finding |
|---:|---|---|---|---|---|---|---|
| 56 | Structural | `TEXT_ENTRY_HAS_ANSWER` | Block | `At least one accepted answer is required.` | Accepted-answer array is missing or empty. | `acceptedAnswers` | OK |
| 57 | Content quality | `TEXT_ENTRY_ACCEPTED_ANSWERS_NOT_EMPTY` | Block | `Accepted answers cannot be empty strings.` | At least one accepted answer is null, undefined, empty, or whitespace. | `acceptedAnswers` | OK |
| 58 | Content quality | `TEXT_ENTRY_MULTIPLE_ANSWERS_DELIMITER_VALID` | Warning | `Answer '{answer}' contains a pipe '&#124;'. Make sure delimiters were parsed correctly.` | There are multiple accepted answers and an individual entry still contains a pipe. Example: `["red&#124;blue", "green"]`. | `acceptedAnswers` | OK |
| 59 | Scoring | `TEXT_ENTRY_CASE_POLICY_DEFINED` | Review | `Case sensitivity policy should be explicitly defined for text mode.` | Text mode is selected and `caseSensitive` is undefined. | `caseSensitive` | OK |
| 60 | Scoring | `TEXT_ENTRY_TRIM_POLICY_DEFINED` | Review | `Trim whitespace policy should be explicitly defined.` | `trimPolicy` is undefined. | `trimPolicy` | OK |
| 61 | Content quality | `TEXT_ENTRY_NUMERIC_ANSWER_VALID` | Block | `Numeric mode selected, but answer '{answer}' cannot be parsed as a number.` | Numeric mode is selected and `Number(answer)` is NaN. Example: `12 kg`. | `acceptedAnswers` | Redundant — overlaps `NUMERIC_ANSWER_NOT_NUMERIC`; the latter is more precise because it also rejects Infinity. |
| 62 | Scoring | `TEXT_ENTRY_NUMERIC_TOLERANCE_VALID` | Block | `Numeric tolerance must be a non-negative number.` | Numeric mode tolerance is not a number, NaN, or negative. Example: `-0.1`. | `numericTolerance` | Redundant — overlaps `NUMERIC_TOLERANCE_INVALID`. It also does not reject Infinity despite saying “number.” |
| 63 | Scoring | `TEXT_ENTRY_UNIT_POLICY_VALID` | Warning | `Units defined but empty string provided.` | Numeric mode has a `units` property whose trimmed value is empty. | `units` | Redundant — canonicalized with `UNIT_POLICY_INVALID` only when both represent the same field problem. |
| 64 | Content quality | `TEXT_ENTRY_FORMULA_FORMAT_VALID` | Block | `Formula answer cannot be empty.` | Formula mode has an empty accepted-answer entry. | `acceptedAnswers` | Redundant — the generic empty-answer rule can also fire. |
| 65 | Content quality | `TEXT_ENTRY_LATEX_VALID` | Warning | `Unclosed LaTeX delimiter detected in formula answer '{answer}'.` | Formula mode answer contains an odd number of unescaped dollar signs. Example: `$x+1`. | `acceptedAnswers` | Review — it validates only `$` counts, not the full delimiter set handled by the stem analyzer. |

## 8. Numeric, unit, and scoring rules

| No. | Category | Rule ID | Severity | Validation error message | When it triggers, with example | Field / scope | Review finding |
|---:|---|---|---|---|---|---|---|
| 66 | Content quality | `NUMERIC_ANSWER_NOT_NUMERIC` | Block | `Numeric mode selected, but answer '{answer}' cannot be parsed as a finite number.` | Numeric mode answer is blank or `Number(answer)` is non-finite. Example: `Infinity` or `12 kg`. | `acceptedAnswers` | OK |
| 67 | Content quality | `INTEGER_ANSWER_NOT_INTEGER` | Block | `Integer response mode required, but answer '{answer}' contains decimals or non-integer characters.` | Response mode/subtype is integer and answer is non-finite or not an integer. Example: `2.5`. | `acceptedAnswers` | OK |
| 68 | Scoring | `NUMERIC_TOLERANCE_MISSING` | Review | `Numeric response question has no tolerance or exact-match rounding policy defined.` | Numeric mode is selected and tolerance is undefined. | `numericTolerance` | OK |
| 69 | Scoring | `NUMERIC_TOLERANCE_INVALID` | Block | `Numeric tolerance must be a non-negative finite number. Found '{value}'.` | Tolerance is not a number, NaN, or negative. Example: `-1`. | `numericTolerance` | Review — condition uses `isNaN` rather than `Number.isFinite`, so `Infinity` incorrectly passes although the message says finite. |
| 70 | Content quality | `UNIT_EMBEDDED_IN_NUMERIC_ANSWER` | Block | `Numeric answer field '{answer}' contains unit or text. Separate value and unit.` | Numeric/integer answer begins with a numeric value followed by a detected unit/text, with or without a space. Example: `9.8 m/s`. | `acceptedAnswers` | OK |
| 71 | Content quality | `INACTIVE_FIELD_CONTAINS_DATA` | Review | `Inactive field '{column}' contains data ('{value}') for question type '{type}'.` | A non-TEXT_ENTRY row contains data in the mapped numerical/accepted-answer column. Example: MCQ has `Numerical_Answer = 4`. | Raw inactive column | OK |
| 72 | Scoring | `UNIT_POLICY_INVALID` | Review | `Unit policy is set to required, but no unit was provided.` | Numeric mode unit policy is `required` and units are missing/blank. | `units` | OK |
| 73 | Scoring | `POSITIVE_MARKS_INVALID` | Block | `Positive marks must be a finite number greater than 0. Found '{marks}'.` | Marks are present but non-finite or less than/equal to zero. Example: `-2`. | `marks` | OK; normally becomes the primary deduplicated message instead of rule 9. |
| 74 | Scoring | `NEGATIVE_MARKS_EXCEED_POSITIVE` | Block | `Absolute penalty magnitude ({penalty}) exceeds positive marks (+{marks}).` | Valid negative penalty magnitude is greater than positive marks. Example: +4 marks and -5 penalty. | `negativeMarks` | OK |
| 75 | Scoring | `QUESTION_SCORING_CONFLICTS_WITH_SECTION` | Review | `Question marks (+{questionMarks}) differ from section default scheme (+{sectionMarks}).` | Both values are truthy, differ, and no scoring override is approved. Example: row +3, section default +4. | `marks` | OK; it will not run meaningfully in the upload validation stage unless export configuration is supplied. |
| 76 | Scoring | `PARTIAL_MARKING_AMBIGUOUS` | Block | `Partial marking is enabled but partial scoring strategy is undefined.` | MSQ partial marking is an object with `enabled: true` and no strategy. | `partialMarking` | OK |

## 9. Ordering rules

| No. | Category | Rule ID | Severity | Validation error message | When it triggers, with example | Field / scope | Review finding |
|---:|---|---|---|---|---|---|---|
| 77 | Structural | `ORDER_MIN_OPTIONS` | Block | `Ordering question must have at least 2 options to order.` | ORDER options are missing or fewer than two. | `options` | OK |
| 78 | Structural | `ORDER_HAS_CORRECT_SEQUENCE` | Block | `Correct sequence is required.` or `Correct sequence length ({sequenceLength}) must match the number of options ({optionCount}).` | Sequence is empty, or its length differs from the option count. Example: four options but three sequence IDs. | `correctSequenceIds` | OK |
| 79 | Structural | `ORDER_SEQUENCE_MATCH` | Block | `Sequence item '{id}' does not match any option.` and/or `Correct sequence contains duplicate items.` | A sequence ID is unknown or the sequence repeats an ID. Example: `[A, B, B]`. | `correctSequenceIds` | OK |

## 10. Explanation and academic-consistency rules

| No. | Category | Rule ID | Severity | Validation error message | When it triggers, with example | Field / scope | Review finding |
|---:|---|---|---|---|---|---|---|
| 80 | Academic consistency | `EXPLANATION_MISSING` | Review | `Question explanation is missing.` | A supported question has no explanation and `exportConfig.requireExplanations` is true. | `explanation` | OK; upload-stage context currently does not supply this configuration, so the registered rule normally stays silent there. |
| 81 | Academic consistency | `EXPLANATION_INSUFFICIENT` | Review | `Explanation text '{text}' appears vague or insufficient. Detail derivation or reasoning.` | Explanation is shorter than 8 characters or contains `ans is obvious`/`use shortcut`. | `explanation` | OK, but heuristic. |
| 82 | Academic consistency | `EXPLANATION_KEY_MISMATCH` | Block | `Explanation concludes with option set '{stated}', but structured answer is '{expected}'.` | High-confidence explanation extraction returns an option/set different from the MCQ/MSQ structured answer. Example: explanation concludes D; key is A. | `explanation` | OK |
| 83 | Academic consistency | `EXPLANATION_RESULT_MISMATCH` | Block | `Explanation concludes with high-confidence result '{result}', but accepted answer is '{answers}'.` | High-confidence numeric conclusion differs from every accepted numeric answer outside tolerance. Example: explanation ends 2; accepted answer 1.25. | `explanation` | OK |
| 84 | Academic consistency | `POSSIBLE_EXPLANATION_RESULT_MISMATCH` | Review | `Explanation may conclude with result '{result}', but accepted answer is '{answers}'.` | Medium-confidence numeric conclusion (0.65 to below 0.9) differs outside tolerance. | `explanation` | OK |
| 85 | Academic consistency | `EXPLANATION_FORMAT_INCOMPATIBLE` | Block | `Explanation concludes with an option answer, which is incompatible with a text-entry interaction.` | TEXT_ENTRY explanation extractor returns option or option-set mode. Example: explanation ends `Therefore option B`. | `explanation` | OK |
| 86 | Academic consistency | `EXPLANATION_UNIT_MISMATCH` | Block | `Explanation uses unit 'm/s', but specified answer unit is '{units}'.` | Units equal exactly `m` and the explanation contains ` m/s`. | `units` | Review — message is accurate when emitted, but the condition covers only one hard-coded unit conflict. |
| 87 | Academic consistency | `MULTIPLE_CORRECT_OPTIONS_SUSPECTED` | Review | `Suspected multiple correct or equivalent options found in single-choice question.` | MCQ contains duplicate normalized option text. Example: A=`2`, B=`2.0`. | `options` | Review — duplicate/equivalent options do not prove multiple correct answers; also overlaps `MCQ_OPTIONS_UNIQUE`. |

## 11. Rendering and language rules

| No. | Category | Rule ID | Severity | Validation error message | When it triggers, with example | Field / scope | Review finding |
|---:|---|---|---|---|---|---|---|
| 88 | Rendering | `MALFORMED_LATEX_DELIMITER` | Block | `Malformed LaTeX delimiter in stem: {analyzerMessage}` | The LaTeX analyzer finds the first structural issue other than a missing wrapper. Example: `\(x+1` is unclosed. | `stem` | OK; overlaps the review-level LaTeX rule and becomes the primary blocking canonical issue. |
| 89 | Rendering | `MATH_RENDER_FAILED` | Block | `KaTeX/MathJax rendering failed: {runtimeError}` | Row contains `__mathRenderError`. Example: renderer reports an invalid command. | `stem` | OK |
| 90 | Rendering | `UNSUPPORTED_MATH_FORMAT` | Review | `Source text contains MathType or MathML objects requiring LaTeX conversion.` | Stem includes `<math`, `MathType`, or `w:object`. Example: pasted MathML. | `stem` | Review — `<math>` is already MathML and may not always require LaTeX conversion. |
| 91 | System defect | `UNICODE_MATH_FALSE_POSITIVE` | Engine defect | `Validator defect: Valid Unicode math symbol flagged as a blocking LaTeX error.` | Stem matches the configured Unicode-math symbol pattern and `__unicodeMathFlaggedAsBlock` is true. | `stem` | OK in intent; the source regex visibly contains mojibake-like literals and should be technically reviewed. |
| 92 | Metadata | `LANGUAGE_METADATA_MISMATCH` | Review | `Language metadata is set to English, but text contains Devanagari (Hindi) script.` | Declared language is English and the stem contains any Devanagari code point. Example: English metadata with `प्रश्न`. | `language` | Review — Devanagari is a script used by multiple languages; the condition does not prove the text is Hindi. |
| 93 | Rendering | `UNSUPPORTED_HTML_OR_SCRIPT` | Block | `Unsafe HTML script or event handler detected in question text.` | Stem contains `<script`, `onerror=`, `onload=`, or `javascript:` case-insensitively. | `stem` | OK |

## 12. Advanced and linked-content rules

| No. | Category | Rule ID | Severity | Validation error message | When it triggers, with example | Field / scope | Review finding |
|---:|---|---|---|---|---|---|---|
| 94 | Structural | `MATRIX_MATCH_INCOMPLETE` | Block | `Matrix-match interaction requires non-empty left and right entity columns.` | MATRIX_MATCH, or unsupported raw `MATRIX MATCH`, has an empty left or right entity list. | `matrix` | OK, though it does not identify which side is missing. |
| 95 | Structural | `HOTSPOT_CONFIGURATION_INCOMPLETE` | Block | `Hotspot interaction requires a background image URL and at least one coordinate region.` | HOTSPOT, or unsupported raw `HOTSPOT`, lacks an image reference or has no regions. Example: filename exists but region list is empty. | `hotspot` | Review — condition accepts a media filename as the image reference, while the message specifically requires a URL; it also does not identify which component is missing. |
| 96 | Structural | `ORDER_SEQUENCE_INVALID` | Block | `Ordering question is missing correct sequence.` or `Correct sequence length ({length}) must equal options count ({count}).` | ORDER sequence is empty or its length differs from options. | `correctSequenceIds` | Redundant — duplicates `ORDER_HAS_CORRECT_SEQUENCE` with slightly different wording. |
| 97 | Content quality | `PASSAGE_LINK_BROKEN` | Block | `Question references passage '{passageId}', but no such passage object exists in the batch.` | A passage ID exists but no passage row or passage-store object matches it. | `passageId` | OK |

## 13. Validator/report defect rules

| No. | Category | Rule ID | Severity | Validation error message | When it triggers, with example | Field / scope | Review finding |
|---:|---|---|---|---|---|---|---|
| 98 | System defect | `REPORT_FIELD_MISLABELED` | Engine defect | `Validator defect: Report heading or binding displays a canonical field under an incorrect label.` | Row carries `__reportMislabeled`. | `report` | OK |
| 99 | System defect | `ISSUE_MESSAGE_TRUNCATED` | Engine defect | `Validator defect: Issue message for rule {ruleId} was truncated in output UI.` | A pre-existing row issue message ends with `...` or `accepte accep`. | `message` | Review — any legitimate message ending in an ellipsis can cause a false positive. |
| 100 | System defect | `DUPLICATE_MATCH_CONTEXT_MISSING` | Engine defect | `Validator defect: Duplicate warning emitted without identifying matching row IDs or context.` | A pre-existing duplicate-stem issue has no `relatedRows`. | `issues` | OK |
| 101 | System defect | `CORRECTION_ACTION_AMBIGUOUS` | Engine defect | `Validator defect: UI flagged row invalid without providing actionable correction paths.` | Row carries `__ambiguousCorrectionAction`. | `correction` | OK |
| 102 | Ingestion | `CORRECTION_AUDIT_TRAIL_MISSING` | Block | `Manual or automatic correction modified question content without recording a complete audit entry.` | Row carries `__manuallyEditedWithoutAudit`. | `audit` | OK |

## UI display findings

The following issues affect what users actually see after validation, independently of whether a rule’s internal message is correct:

| No. | UI condition | Current displayed behavior | Review |
|---:|---|---|---|
| 1 | Validation-stage row has issues | The table displays up to two **rule IDs** such as `MCQ_ANSWER_IN_OPTIONS`; it does not display the human-readable `issue.message`. | Add an expandable details area, tooltip, or selected-row panel containing message, field, evidence, and correction guidance. |
| 2 | Manual-fix row has one or more issues | The banner appears for any severity, counts only issues whose severity equals `block`, and always says `must be resolved before export.` | A warning-only or review-only row can display `0 blocking issue(s) must be resolved before export.` Count `engine_defect`/`blocksExport`, and use severity-aware text. |
| 3 | Row status is `needs_review` | The hook calculates the count, but the validation summary, distribution percentages, and status filter omit `needs_review`. | Add a Needs Review card, distribution segment, and filter option. |
| 4 | User downloads the validation report | The report includes the complete human-readable issue message and field. | This is currently the only Batch Creator validation-stage surface that consistently exposes full messages. |

## High-priority corrections identified

1. Replace the contradictory `REQUIRED_MEDIA_MISSING` statement. The system must decide whether `Image_Required = Yes` is truly required or merely advisory, then make the condition, severity, export behavior, and message agree.
2. Replace invalid issue severity `caution` in the figure branch of `CONTEXT_MISSING` with a supported severity such as `warning` or `review`. Until corrected, the intended message is replaced by a generic blocking rule-execution error.
3. Make the Manual Fix banner conditional on actual export blockers rather than the existence of any issue.
4. Expose `issue.message` in the validation and manual-fix UI instead of showing rule IDs alone.
5. Add semantic message assertions to tests. Current broad rule coverage verifies only that a message is non-empty, so misleading text can pass all automated tests.
6. Update the existing `validation_rules_reference.md`; at least the duplicate-stem and duplicate-MSQ-answer entries no longer match the current implementation.

## Verification notes

- Registry coverage: **102 of 102 active rules listed**.
- Existing targeted validation tests reviewed: **163 assertions passed** across rule coverage, fixture, media, resilience, LaTeX, and dataflow suites.
- The TypeScript checker independently reports the invalid `severity: "caution"` assignment in `CONTEXT_MISSING`.
- No validation source code was modified while preparing this review.
