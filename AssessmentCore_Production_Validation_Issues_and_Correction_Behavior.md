# AssessmentCore Production Validation Issues and Correction Behaviour

**Purpose:** Engineering and product specification for validating messy teacher-submitted assessment data before LMS/QTI export.

This document defines the issue, severity, trigger, one example, and required correction behaviour. It is intended to prevent the validation system from silently changing academic meaning or approving structurally valid but unusable questions.

## Status model

| Severity        | Required behaviour                                                     |
| --------------- | ---------------------------------------------------------------------- |
| `BLOCK`         | Row or package cannot be exported until corrected.                     |
| `REVIEW`        | Human decision is required; export depends on approval policy.         |
| `WARNING`       | Non-fatal, but the user must be informed.                              |
| `ENGINE DEFECT` | The validator/report itself is behaving incorrectly and must be fixed. |

## Mandatory correction contract

1. **Never silently change academic meaning.** Correct answers, question types, option content, scoring, explanations, and scientific values require explicit confirmation.
2. **Preserve raw and normalized values.** Every transformation must be reversible and auditable.
3. **Show before and after.** Suggested corrections must display the exact proposed change.
4. **Invalidate dependent approvals.** Changing an answer, stem, option, scoring rule, explanation, media mapping, or question type must trigger re-review.
5. **Rerun dependent rules.** A correction is not complete until affected structural, academic, scoring, media, and export checks pass.
6. **Use safe auto-correction narrowly.** Whitespace cleanup, unambiguous delimiter normalization, and configured sign conversion may be automated; content decisions may not.
7. **Keep unsupported types intact.** An unsupported hotspot or matrix-match item must remain that type and be blocked, not guessed into another interaction.
8. **Record the actor and reason.** Manual and automatic corrections must have rule ID, timestamp, user/system actor, and justification.

---

## 1. Ingestion and normalization

### `COLUMN_MAPPING_AMBIGUOUS`

- **Severity:** `BLOCK`
- **Trigger:** Two or more source columns could represent the same canonical field, or confidence is below the mapping threshold.
- **Example:** `Answer`, `Correct option`, and `Key` all exist, but the importer cannot determine which is authoritative.
- **Correction behaviour:** Do not guess. Pause normalization for the affected field, show the candidate columns with sample values, require the user to select one, save the mapping profile, and then re-normalize every row.

### `QUESTION_ID_FIELD_MISMAPPED`

- **Severity:** `BLOCK`
- **Trigger:** The engine maps an intake identifier such as `Submission_ID` into the canonical `Question_ID` field.
- **Example:** The report displays `SUB-0001` under `Question ID` although the actual question ID is `JEE26-PHY-001`.
- **Correction behaviour:** Never auto-relabel silently. Show the mapped source column, allow remapping, preserve both identifiers separately, rebuild duplicate-ID indexes, and rerun all identifier and export checks.

### `QUESTION_TYPE_ALIAS_UNMAPPED`

- **Severity:** `BLOCK`
- **Trigger:** A known raw type alias is not mapped to a supported canonical type.
- **Example:** `SCQ` is supplied, but the engine only recognizes `MCQ` and marks the row `UNKNOWN`.
- **Correction behaviour:** Map known aliases deterministically through a versioned alias table, record the raw and normalized values, and rerun type-specific validation. Unknown aliases must remain blocked.

### `EXPLICIT_TYPE_OVERRIDDEN`

- **Severity:** `BLOCK`
- **Trigger:** The importer replaces an explicitly supplied type with a different inferred type.
- **Example:** `Hotspot` is explicitly supplied, but populated option columns cause the engine to convert it into `MCQ`.
- **Correction behaviour:** Explicit type must take precedence over inference. If unsupported or structurally inconsistent, retain the original type and raise a separate issue. Never silently convert it.

### `RESPONSE_SUBTYPE_LOST`

- **Severity:** `BLOCK`
- **Trigger:** Normalization preserves only a generic response type and discards constraints such as integer, numeric, formula, or case-sensitive text.
- **Example:** An `INTEGER` question with answer `1.5` becomes generic `TEXT_ENTRY` and passes.
- **Correction behaviour:** Store `type` and `responseMode` separately. Reconstruct subtype constraints, validate them, and block export until the answer satisfies the subtype.

### `NEGATIVE_MARKS_CONVENTION_AMBIGUOUS`

- **Severity:** `REVIEW`
- **Trigger:** The source uses a positive penalty magnitude while the canonical model expects a signed negative number, and no test-level convention is configured.
- **Example:** `Negative_Marks = 1` may mean deduct one mark, not award one mark.
- **Correction behaviour:** Ask once at batch level whether penalties are magnitudes or signed values. Then normalize consistently, preserve the raw value, log the conversion, and rerun scoring rules.

### `NORMALIZATION_AUDIT_MISSING`

- **Severity:** `BLOCK`
- **Trigger:** A value was transformed but the system did not retain the original value, transformation rule, and timestamp.
- **Example:** `1` was converted to `-1` for negative marking with no audit record.
- **Correction behaviour:** Every normalization must store raw value, normalized value, rule ID, confidence, actor, and timestamp. Block production export when a meaning-changing transformation lacks an audit trail.

## 2. Core structure and answer integrity

### `EMPTY_ROW`

- **Severity:** `WARNING`
- **Trigger:** All mapped cells are empty or whitespace.
- **Example:** A spreadsheet contains a blank row between Question 14 and Question 15.
- **Correction behaviour:** Do not create a question. Mark the row as ignored, allow bulk removal, and exclude it from counts unless the user explicitly keeps it.

### `REQUIRED_STEM_MISSING`

- **Severity:** `BLOCK`
- **Trigger:** The question stem is empty after trimming and extraction.
- **Example:** Options A-D and an answer are present, but the question text is blank.
- **Correction behaviour:** No automatic content generation. Require the teacher or production editor to enter the missing stem, then rerun all content, type, media, and answer checks.

### `TRUNCATED_STEM`

- **Severity:** `BLOCK`
- **Trigger:** The stem appears cut off because it ends abruptly, contains OCR truncation markers, or lacks a grammatical/structural ending.
- **Example:** `The stopping potential for photoelectrons is 1.5 V. The...`
- **Correction behaviour:** Do not infer the missing text. Link back to the source document, require restoration of the full stem, compare before/after, and rerun duplicate and academic checks.

### `CONTEXT_MISSING`

- **Severity:** `BLOCK`
- **Trigger:** The stem depends on a missing passage, image, table, prior statement, or external context.
- **Example:** `Find the correct answer from the following.` with no preceding statement or options that supply context.
- **Correction behaviour:** Require the missing stimulus or rewrite the question to be self-contained. Do not allow production export until all referenced context resolves.

### `BROKEN_ENCODING`

- **Severity:** `BLOCK`
- **Trigger:** Text contains replacement characters, null bytes, invalid control characters, or corrupted symbols.
- **Example:** `x� + y� = 4` appears after a failed file conversion.
- **Correction behaviour:** Do not guess the intended symbol. Recover it from the original source, replace the corrupted content, retain the original snapshot, and rerun math rendering and semantic validation.

### `UNKNOWN_QUESTION_TYPE`

- **Severity:** `BLOCK`
- **Trigger:** The canonical type cannot be determined after mapping and alias normalization.
- **Example:** The raw value is `Matrix-Type-A`, which has no registered mapping.
- **Correction behaviour:** Show raw type, candidate matches, and required structure. Require explicit user selection or addition of a supported mapping. Do not infer solely from populated columns when ambiguity remains.

### `MINIMUM_OPTIONS_NOT_MET`

- **Severity:** `BLOCK`
- **Trigger:** An option-based interaction has fewer than the required number of usable options.
- **Example:** An MCQ contains only Option A and Option B is blank.
- **Correction behaviour:** Require enough non-empty options for the selected interaction. Remove trailing empty columns only when they are truly unused; otherwise require the missing option text.

### `EMPTY_OPTION_TEXT`

- **Severity:** `BLOCK`
- **Trigger:** An option object exists but its visible text is empty.
- **Example:** Option C has an identifier but contains only spaces.
- **Correction behaviour:** Do not renumber options automatically if that can shift the answer key. Ask whether to delete the empty option or supply text, then remap and revalidate the answer.

### `DUPLICATE_OPTION_TEXT`

- **Severity:** `REVIEW`
- **Trigger:** Two or more options are identical after normalization.
- **Example:** Option B and Option D both read `5 m`.
- **Correction behaviour:** Highlight both options and the current answer. Require a teacher/editor decision to replace a distractor or confirm an intentional duplicate. Never auto-delete one.

### `DUPLICATE_OPTION_IDENTIFIER`

- **Severity:** `BLOCK`
- **Trigger:** Two option objects share the same internal identifier.
- **Example:** Both Option B and Option C have internal ID `OPT_B`.
- **Correction behaviour:** Regenerate unique internal IDs without changing visible labels, update answer references transactionally, and rerun all answer-integrity checks.

### `MISSING_CORRECT_ANSWER`

- **Severity:** `BLOCK`
- **Trigger:** No correct answer is supplied for a gradable question.
- **Example:** A numerical question has a stem and explanation but no accepted answer.
- **Correction behaviour:** No academic auto-fill. Require an approved answer, record reviewer identity, and rerun explanation, scoring, and type-specific validation.

### `ANSWER_NOT_IN_OPTIONS`

- **Severity:** `BLOCK`
- **Trigger:** The supplied answer does not match any option identifier, label, or unambiguous option text.
- **Example:** Correct answer is `E`, but only A-D exist.
- **Correction behaviour:** Show all available options and the raw answer. Require correction of the key or addition of the missing option. Do not choose the nearest option.

### `MULTIPLE_ANSWERS_FOR_SCQ`

- **Severity:** `BLOCK`
- **Trigger:** A single-correct question contains multiple delimited answers.
- **Example:** `Correct_Answer = A,C` for an SCQ.
- **Correction behaviour:** Offer two explicit corrections: convert to MSQ or retain one correct option. Require user confirmation, then apply the corresponding scoring and validation rules.

### `AMBIGUOUS_ANSWER_TEXT`

- **Severity:** `BLOCK`
- **Trigger:** Answer text matches more than one option.
- **Example:** The raw answer is `5 m`, and two options both contain `5 m`.
- **Correction behaviour:** Require an option identifier after resolving duplicate options. Never select the first match.

### `MSQ_MIXED_ANSWER_MODE`

- **Severity:** `BLOCK`
- **Trigger:** An MSQ answer mixes labels, IDs, and full option text.
- **Example:** `A, Conservation of energy, C`
- **Correction behaviour:** Show the parsed tokens and require a single answer mode. Convert only after each token maps unambiguously; otherwise require manual correction.

### `MSQ_DUPLICATE_ANSWER_TOKEN`

- **Severity:** `WARNING`
- **Trigger:** The same correct option appears multiple times.
- **Example:** `A, A, C`
- **Correction behaviour:** Safely deduplicate after confirming all tokens map to the same option. Preserve the raw input and show the normalized result before saving.

### `IRREGULAR_MSQ_DELIMITER`

- **Severity:** `WARNING`
- **Trigger:** The answer uses inconsistent separators or spacing.
- **Example:** `A ;B| C`
- **Correction behaviour:** Normalize delimiters only when every token maps unambiguously. Show the resulting canonical list and keep the original string in the audit record.

## 3. Numeric responses, units, and scoring

### `NUMERIC_ANSWER_NOT_NUMERIC`

- **Severity:** `BLOCK`
- **Trigger:** A numeric-response answer cannot be parsed as a finite number under the configured locale.
- **Example:** `Numerical_Answer = 2.5 m`
- **Correction behaviour:** Split a trailing recognized unit only as a suggested correction. Require confirmation, store `2.5` and `m` separately, and rerun numeric and unit checks.

### `INTEGER_ANSWER_NOT_INTEGER`

- **Severity:** `BLOCK`
- **Trigger:** An integer-response answer contains a decimal, fraction, or non-integer value.
- **Example:** `INTEGER` response with accepted answer `1.5`.
- **Correction behaviour:** Do not round automatically. Require correction of either the answer or the response subtype, with academic approval.

### `NUMERIC_TOLERANCE_MISSING`

- **Severity:** `REVIEW`
- **Trigger:** A numeric question has neither a tolerance nor an explicit exact-answer/rounding policy.
- **Example:** Accepted answer is `0.3333`, but no tolerance or decimal policy is defined.
- **Correction behaviour:** Require the author to select exact match, absolute tolerance, relative tolerance, accepted range, or decimal-place policy. Recompute previewed accepted values before approval.

### `NUMERIC_TOLERANCE_INVALID`

- **Severity:** `BLOCK`
- **Trigger:** Tolerance is negative, non-numeric, infinite, or incompatible with the response mode.
- **Example:** `Tolerance = -0.1`
- **Correction behaviour:** Reject the value and require a non-negative finite tolerance. Do not silently take the absolute value.

### `UNIT_EMBEDDED_IN_NUMERIC_ANSWER`

- **Severity:** `BLOCK`
- **Trigger:** The numeric answer field contains units or descriptive text.
- **Example:** `Numerical_Answer = 9.8 m/s²`
- **Correction behaviour:** Offer a parsed number/unit split only when unambiguous. Require confirmation, preserve raw input, and validate the unit against the stem and explanation.

### `UNIT_POLICY_INVALID`

- **Severity:** `REVIEW`
- **Trigger:** The unit requirement is contradictory, missing where dimensioned, or incorrectly warned for a dimensionless quantity.
- **Example:** A determinant question is flagged because the unit field is empty.
- **Correction behaviour:** Infer dimensionless status only from an approved question subtype or explicit policy, not from a blank string. Suppress false warnings; require units only for clearly dimensioned answers.

### `POSITIVE_MARKS_INVALID`

- **Severity:** `BLOCK`
- **Trigger:** Positive marks are missing where required, non-finite, zero, or negative.
- **Example:** `Positive_Marks = -4`
- **Correction behaviour:** Require a finite positive value from the configured section scheme. No automatic sign flipping.

### `NEGATIVE_MARKS_INVALID`

- **Severity:** `BLOCK`
- **Trigger:** The canonical penalty is non-finite or greater than zero after normalization.
- **Example:** `normalizedNegativeMarks = +1`
- **Correction behaviour:** Apply the configured sign convention during normalization. If the canonical result is still positive or invalid, block and require correction.

### `NEGATIVE_MARKS_EXCEED_POSITIVE`

- **Severity:** `BLOCK`
- **Trigger:** The absolute penalty exceeds the positive marks.
- **Example:** `+4` for correct and `-5` for incorrect.
- **Correction behaviour:** Do not clamp automatically. Require correction or an explicitly approved exceptional scoring policy at test level.

### `QUESTION_SCORING_CONFLICTS_WITH_SECTION`

- **Severity:** `REVIEW`
- **Trigger:** Question-level marks differ from the section/test scoring configuration without an approved override.
- **Example:** A Physics SCQ has `+3/-1` while the section rule is `+4/-1`.
- **Correction behaviour:** Show both values and require either alignment to the section scheme or a documented per-question override approved by production.

### `PARTIAL_MARKING_AMBIGUOUS`

- **Severity:** `BLOCK`
- **Trigger:** Partial-marking text cannot be converted into deterministic scoring conditions.
- **Example:** `Award 3, 2, or 1 depending on closeness.`
- **Correction behaviour:** Require a machine-actionable scoring table covering every response state. Preview the score matrix and block export until it is complete.

### `TIME_LIMIT_INVALID`

- **Severity:** `BLOCK`
- **Trigger:** A question or section time limit is non-finite, zero, or negative.
- **Example:** `Expected_Time_sec = 0`
- **Correction behaviour:** Require a positive number or remove the per-question limit if the LMS uses only a test timer. Record which policy applies.

## 4. Explanation and academic consistency

### `EXPLANATION_MISSING`

- **Severity:** `REVIEW`
- **Trigger:** The platform requires explanations for review or post-test feedback, but none is supplied.
- **Example:** Correct answer is present, but the explanation cell is blank.
- **Correction behaviour:** Do not generate a final explanation silently. Allow an AI draft only as unapproved content; require teacher or reviewer approval before publishing.

### `EXPLANATION_INSUFFICIENT`

- **Severity:** `REVIEW`
- **Trigger:** The explanation is too vague to reproduce or justify the answer.
- **Example:** `Ans is obvious. Use shortcut.`
- **Correction behaviour:** Request a reproducible derivation, concept, or reasoning. AI may propose an expanded draft, but it must remain marked unapproved until reviewed.

### `EXPLANATION_KEY_MISMATCH`

- **Severity:** `BLOCK`
- **Trigger:** The explanation's stated final option or result conflicts with the structured answer.
- **Example:** `Correct_Answer = A`, but the explanation ends with `Final answer: Option D`.
- **Correction behaviour:** Never auto-change the key or explanation. Show both values side by side and require academic resolution with reviewer sign-off.

### `EXPLANATION_NUMERIC_RESULT_MISMATCH`

- **Severity:** `BLOCK`
- **Trigger:** A computed value in the explanation does not equal the accepted numerical answer within tolerance.
- **Example:** Accepted answer is `25`, but the final calculation in the explanation gives `20`.
- **Correction behaviour:** Require academic review. Recompute using a deterministic parser where possible, but never choose which value is correct automatically.

### `EXPLANATION_UNIT_MISMATCH`

- **Severity:** `BLOCK`
- **Trigger:** The explanation's final unit conflicts with the answer unit or the dimension implied by the question.
- **Example:** Accepted unit is `m`, but the explanation gives `m/s`.
- **Correction behaviour:** Show the conflicting units and dimensional context. Require correction of the stem, answer, or explanation; then rerun numeric grading checks.

### `MULTIPLE_CORRECT_OPTIONS_SUSPECTED`

- **Severity:** `REVIEW`
- **Trigger:** Content analysis indicates more than one option may be correct in a single-correct item.
- **Example:** Both `2 Ω` and `2.0 Ω` appear as separate options.
- **Correction behaviour:** Flag for academic review, identify the suspected options, and prevent automatic publication until one-correctness is confirmed.

## 5. Mathematics, language, and text rendering

### `MALFORMED_LATEX_DELIMITER`

- **Severity:** `BLOCK`
- **Trigger:** LaTeX delimiters are unclosed, mismatched, or invalidly nested.
- **Example:** `Use \(v^2=u^2+2as.`
- **Correction behaviour:** Offer a delimiter repair preview only when the intended closing token is unambiguous. Require confirmation and renderer verification before clearing the block.

### `MATH_RENDER_FAILED`

- **Severity:** `BLOCK`
- **Trigger:** The configured student renderer fails to render a math expression.
- **Example:** The source looks valid, but MathJax reports an unsupported command.
- **Correction behaviour:** Show the renderer error and source expression. Require conversion or correction, then rerun the exact production renderer—not merely a parser.

### `UNSUPPORTED_MATH_FORMAT`

- **Severity:** `REVIEW`
- **Trigger:** The source uses MathType objects, equation images, or syntax unsupported by the target LMS.
- **Example:** A Word MathType equation cannot be represented in the current QTI export.
- **Correction behaviour:** Convert to MathML or approved LaTeX through a reviewable pipeline, compare visual output, and preserve the original equation as a source artifact.

### `UNICODE_MATH_FALSE_POSITIVE`

- **Severity:** `ENGINE DEFECT`
- **Trigger:** Valid Unicode mathematics is flagged merely because it is not enclosed in LaTeX delimiters.
- **Example:** `Evaluate ∫₀¹ x² dx.` is marked for review despite rendering correctly.
- **Correction behaviour:** Do not require delimiters by default. Validate actual renderer output. Emit `info` only when conversion is recommended, and block only on verified rendering failure.

### `LANGUAGE_METADATA_MISMATCH`

- **Severity:** `REVIEW`
- **Trigger:** The declared language does not match the detected content.
- **Example:** Language is `English`, but the stem includes `निम्नलिखित में से सही विकल्प चुनिए`.
- **Correction behaviour:** Offer corrected language metadata or a bilingual classification. Do not remove text automatically. Require user confirmation when detection confidence is not high.

### `UNSUPPORTED_HTML_OR_SCRIPT`

- **Severity:** `BLOCK`
- **Trigger:** Question content contains scripts, event handlers, unsafe embeds, or unsupported HTML.
- **Example:** `<img src=x onerror=alert(1)>` appears in the stem.
- **Correction behaviour:** Sanitize using an allowlist, show removed content, and block if sanitization changes meaning or removes required media.

## 6. Media and rights

### `REQUIRED_MEDIA_MISSING`

- **Severity:** `BLOCK`
- **Trigger:** A row says media is required, but no asset or filename is provided.
- **Example:** `Image_Required = Yes` and `Image_File_Name` is empty.
- **Correction behaviour:** Require an upload or change `Image_Required` to `No` with confirmation. Verify the asset before clearing the issue.

### `MEDIA_REFERENCE_NOT_FOUND`

- **Severity:** `BLOCK`
- **Trigger:** The sheet references a file or URL that does not exist in the upload package or cannot be resolved.
- **Example:** `Image_File_Name = phy_q17.png`, but the ZIP contains no such file.
- **Correction behaviour:** Search exact and case-insensitive matches, then suggest candidates. Require manual confirmation before remapping. Otherwise request the missing asset.

### `AMBIGUOUS_MEDIA_FILENAME`

- **Severity:** `REVIEW`
- **Trigger:** A generic filename cannot be uniquely mapped.
- **Example:** `image1.png` appears for several questions.
- **Correction behaviour:** Show candidate questions and image previews. Require manual mapping, then rename or internally alias the asset using the stable Question_ID.

### `MEDIA_CORRUPTED`

- **Severity:** `BLOCK`
- **Trigger:** The file cannot be decoded or opened.
- **Example:** A `.png` exists but image decoding fails.
- **Correction behaviour:** Do not attempt blind repair in production. Request a new file or an approved converted copy, verify it opens, and record a checksum.

### `MEDIA_MIME_EXTENSION_MISMATCH`

- **Severity:** `BLOCK`
- **Trigger:** The actual file type differs from its extension or declared MIME type.
- **Example:** `diagram.png` contains PDF bytes.
- **Correction behaviour:** Detect the real type. Offer a safe conversion only through an approved converter, create a new filename, and never merely rename the extension.

### `MEDIA_DIMENSION_OR_RESOLUTION_INVALID`

- **Severity:** `REVIEW`
- **Trigger:** The image violates size, dimension, or readability requirements.
- **Example:** A circuit diagram is 180×120 px and unreadable when enlarged.
- **Correction behaviour:** Provide a preview at student scale, request a higher-quality source or approved redraw, and block only when readability fails the configured threshold.

### `MEDIA_ALT_TEXT_MISSING`

- **Severity:** `REVIEW`
- **Trigger:** A meaningful instructional image has no accessibility description.
- **Example:** A ray diagram is attached with empty alt text.
- **Correction behaviour:** Require concise descriptive alt text. AI may draft it, but a human must confirm accuracy for diagrams and scientific figures.

### `MEDIA_URL_INVALID`

- **Severity:** `BLOCK`
- **Trigger:** A remote media URL is malformed, insecure where disallowed, or uses an unsupported scheme.
- **Example:** `file:///C:/teacher/image.png` is supplied as an LMS media URL.
- **Correction behaviour:** Require an uploaded asset or approved HTTPS URL. Never export local machine paths.

### `MEDIA_MAPPING_UNVERIFIED`

- **Severity:** `REVIEW`
- **Trigger:** The file exists, but its content has not been confirmed to match the question.
- **Example:** The filename says `JEE26-PHY-017.png`, but the image shows a chemistry structure.
- **Correction behaviour:** Show the image beside the stem and require visual confirmation. Store the reviewer and checksum.

### `COPYRIGHT_UNVERIFIED`

- **Severity:** `BLOCK`
- **Trigger:** Rights status is unknown, source attribution is missing, or the asset/question appears copied from third-party material.
- **Example:** `Source_Reference = Screenshot from coaching material`, `Copyright_Status = Unknown`.
- **Correction behaviour:** Do not publish. Require evidence of ownership, licence, permission, or replacement with original/approved content. Preserve the compliance decision.

## 7. Metadata, duplicates, and approval workflow

### `WRONG_SUBJECT_TAG`

- **Severity:** `REVIEW`
- **Trigger:** Subject metadata conflicts with the chapter, terminology, or content.
- **Example:** A current-electricity question is tagged `Chemistry`.
- **Correction behaviour:** Suggest the likely subject with confidence and evidence. Require confirmation, then rerun chapter, test-count, and reviewer-routing rules.

### `CHAPTER_TOPIC_MISMATCH`

- **Severity:** `REVIEW`
- **Trigger:** The selected topic is not valid under the selected chapter or syllabus taxonomy.
- **Example:** Chapter is `Current Electricity`, topic is `Organic Reaction Mechanism`.
- **Correction behaviour:** Show allowed taxonomy paths, require selection of a valid path or approved custom taxonomy entry, and update dependent analytics.

### `NONSTANDARD_DIFFICULTY`

- **Severity:** `WARNING`
- **Trigger:** Difficulty is outside the approved vocabulary.
- **Example:** `Very Hard` is supplied when only `Easy`, `Medium`, and `Hard` are supported.
- **Correction behaviour:** Offer a mapped value, but require user confirmation unless a configured deterministic mapping exists. Preserve the original teacher label.

### `DUPLICATE_QUESTION_ID`

- **Severity:** `BLOCK`
- **Trigger:** Two rows in the same scope share the same canonical Question_ID.
- **Example:** `SUB-0005` and `SUB-0025` both use `JEE26-PHY-005`.
- **Correction behaviour:** Show every conflicting row. Require a unique stable ID or intentional version linkage. Regenerate IDs only with explicit user approval.

### `EXACT_DUPLICATE_STEM`

- **Severity:** `REVIEW`
- **Trigger:** Normalized stems are identical.
- **Example:** Two rows contain exactly `The modulus of 3 + 4i is:`.
- **Correction behaviour:** Group duplicates, show differing options, answers, and metadata, and require keep/merge/version decisions. Do not delete automatically.

### `NEAR_DUPLICATE_CONTENT`

- **Severity:** `REVIEW`
- **Trigger:** Questions are semantically equivalent despite wording or parameter differences beyond the configured threshold.
- **Example:** `A body is projected upward...` and `A particle is thrown vertically upward...`
- **Correction behaviour:** Show similarity score and matching row. Require manual confirmation; never reject solely from an embedding score.

### `DUPLICATE_CONTENT_DIFFERENT_ANSWER`

- **Severity:** `BLOCK`
- **Trigger:** Duplicate or near-duplicate questions have conflicting answer keys.
- **Example:** Two identical stems use answers `A` and `C`.
- **Correction behaviour:** Escalate to academic review, freeze both rows, and require resolution before either is published.

### `VERSION_TIMESTAMP_CONFLICT`

- **Severity:** `REVIEW`
- **Trigger:** Version labels and timestamps contradict each other.
- **Example:** `final_final_latest2` has a last-updated time earlier than the original submission.
- **Correction behaviour:** Display the complete version history, require selection of the authoritative version, and retain superseded versions as read-only records.

### `MULTIPLE_AUTHORITATIVE_VERSIONS`

- **Severity:** `BLOCK`
- **Trigger:** More than one file or row is marked as final/approved for the same question.
- **Example:** `final.docx` and `final revised.docx` are both marked approved.
- **Correction behaviour:** Require a single authoritative version. Revoke approval on superseded versions and preserve the decision trail.

### `REVIEW_APPROVAL_MISSING`

- **Severity:** `BLOCK`
- **Trigger:** A row reaches production state without required academic, media, or compliance approval.
- **Example:** The answer was edited after review, but the old approval remains.
- **Correction behaviour:** Invalidate dependent approvals whenever protected content changes. Require re-review and record reviewer identity and timestamp.

## 8. Advanced interactions and linked content

### `MATRIX_MATCH_INCOMPLETE`

- **Severity:** `BLOCK`
- **Trigger:** A matrix-match item lacks complete left/right entities, mapping relations, or scoring rules.
- **Example:** `Correct_Answer = P-1,Q-2`, but the right-column entities are missing.
- **Correction behaviour:** Retain the matrix-match type. Require structured columns and complete mappings; do not convert it to MCQ, MSQ, or text entry.

### `HOTSPOT_CONFIGURATION_INCOMPLETE`

- **Severity:** `BLOCK`
- **Trigger:** A hotspot item lacks an image, coordinate regions, coordinate system, or keyed regions.
- **Example:** Type is `Hotspot`, but `Image_Required = No` and no coordinates exist.
- **Correction behaviour:** Retain hotspot type, require the asset and region editor configuration, preview clickable regions, and verify target-LMS compatibility.

### `ORDER_SEQUENCE_INVALID`

- **Severity:** `BLOCK`
- **Trigger:** The correct order is missing, has wrong length, contains duplicates, or references unknown options.
- **Example:** Four items exist, but the sequence is `A,C,C`.
- **Correction behaviour:** Require a complete permutation of available option IDs. Offer drag-and-drop correction, then rerun sequence integrity checks.

### `PASSAGE_LINK_BROKEN`

- **Severity:** `BLOCK`
- **Trigger:** A linked question references a missing passage or stimulus.
- **Example:** `Passage_ID = PASS-12`, but no PASS-12 object exists.
- **Correction behaviour:** Require the passage, remap to an existing passage, or detach and rewrite the question as self-contained. Update all linked rows transactionally.

## 9. Test-level assembly and LMS/QTI export

### `TEST_COUNT_MISMATCH`

- **Severity:** `BLOCK`
- **Trigger:** Validated question counts do not match the configured test structure.
- **Example:** The configuration requires 25 Physics questions, but only 23 approved Physics rows remain.
- **Correction behaviour:** Show expected versus available counts by subject, section, and type. Require replacement rows or an approved test-structure change.

### `TOTAL_MARKS_MISMATCH`

- **Severity:** `BLOCK`
- **Trigger:** The sum of question marks differs from the configured test total.
- **Example:** Configured total is 300, but approved rows sum to 296.
- **Correction behaviour:** Recalculate from canonical scoring, identify contributing rows, and require score corrections or an approved test-total update.

### `UNAPPROVED_ROWS_PRESENT`

- **Severity:** `BLOCK`
- **Trigger:** Rows needing review, missing approval, or carrying unresolved warnings that policy treats as blocking are included in the export set.
- **Example:** A row marked `needs_review` is still selected for the final mock test.
- **Correction behaviour:** Exclude it automatically from production export or require explicit authorized approval according to policy. Never silently include it.

### `UNSUPPORTED_TYPE_FOR_TARGET_EXPORT`

- **Severity:** `BLOCK`
- **Trigger:** The canonical question type cannot be represented reliably in the selected LMS/export format.
- **Example:** A hotspot item is selected for a target profile that supports only MCQ and text entry.
- **Correction behaviour:** Keep the original type, explain the incompatibility, and offer supported alternatives as manual conversions—not automatic transformations.

### `QTI_RESOURCE_FILE_MISSING`

- **Severity:** `BLOCK`
- **Trigger:** A QTI item references a resource that is absent from the package.
- **Example:** `href="media/phy_q17.png"` exists in XML, but the file is missing from the ZIP.
- **Correction behaviour:** Validate every href against package contents before export. Add the missing file or remove/correct the reference, then rebuild the manifest.

### `XML_IDENTIFIER_INVALID`

- **Severity:** `BLOCK`
- **Trigger:** An identifier is empty, duplicated, or not safe for the target XML/QTI profile.
- **Example:** `Question_ID = PHY 17/A` is used directly as an XML identifier.
- **Correction behaviour:** Generate a safe export identifier while retaining the original business ID in metadata. Ensure uniqueness and preserve the mapping.

### `XML_SCHEMA_VALIDATION_FAILED`

- **Severity:** `BLOCK`
- **Trigger:** Generated XML fails the selected QTI or IMS schema.
- **Example:** An interaction element appears in an invalid parent location.
- **Correction behaviour:** Show schema line, column, and message. Fix the generator or source mapping, regenerate, and validate again before allowing download.

### `RENDER_PREVIEW_FAILED`

- **Severity:** `BLOCK`
- **Trigger:** The generated item cannot be rendered in the production-equivalent preview.
- **Example:** XML validates, but the answer interaction does not appear in the player.
- **Correction behaviour:** Treat schema validation and rendering as separate gates. Capture renderer logs and block release until both pass.

## 10. Report and correction-UI defects

### `REPORT_FIELD_MISLABELED`

- **Severity:** `ENGINE DEFECT`
- **Trigger:** The report displays one canonical field under another label.
- **Example:** `Submission_ID` is shown under the heading `Question ID`.
- **Correction behaviour:** Fix the report binding, add automated report-schema tests, and regenerate the report. Do not rely on the incorrect report for production decisions.

### `ISSUE_MESSAGE_TRUNCATED`

- **Severity:** `ENGINE DEFECT`
- **Trigger:** The report clips issue messages so users cannot understand or act on them.
- **Example:** The PDF shows fragments such as `accepte accep`.
- **Correction behaviour:** Use wrapping, expandable issue details, or a dedicated issue section. Always include full rule ID, field, raw value, message, and suggested action.

### `DUPLICATE_MATCH_CONTEXT_MISSING`

- **Severity:** `ENGINE DEFECT`
- **Trigger:** A duplicate warning does not identify the matching row or duplicate group.
- **Example:** `This question matches another row` appears without the other row's ID.
- **Correction behaviour:** Include matching Question_ID/Submission_ID, similarity score, and duplicate group. Allow side-by-side comparison.

### `CORRECTION_ACTION_AMBIGUOUS`

- **Severity:** `ENGINE DEFECT`
- **Trigger:** The UI says a row is invalid but does not provide an actionable correction path.
- **Example:** `Invalid answer` appears without showing valid option labels.
- **Correction behaviour:** For every issue, provide allowed actions, affected fields, validation dependencies, and whether the fix is safe, suggested, or manual-only.

### `CORRECTION_AUDIT_TRAIL_MISSING`

- **Severity:** `BLOCK`
- **Trigger:** A correction changes production data without recording before/after values and actor.
- **Example:** An editor changes the correct answer from A to C with no history.
- **Correction behaviour:** Record old value, new value, issue ID, user, timestamp, reason, approval impact, and validation result. Protected changes must invalidate prior approvals.

---

## Recommended correction-state workflow

```text
DETECTED
  -> USER/ENGINE PROPOSES CORRECTION
  -> BEFORE/AFTER PREVIEW
  -> USER CONFIRMS OR REJECTS
  -> APPLY WITH AUDIT RECORD
  -> INVALIDATE DEPENDENT APPROVALS
  -> RERUN DEPENDENT VALIDATIONS
  -> AWAIT REQUIRED REVIEW
  -> RESOLVED
```

A correction must not be considered resolved merely because the edited field is non-empty. It is resolved only when the triggering condition no longer exists, all dependent rules pass, and required approvals have been restored.

## Minimum issue object

```ts
interface ValidationIssue {
  issueId: string;
  ruleId: string;
  severity: "block" | "review" | "warning" | "info" | "engine_defect";
  scope: "cell" | "row" | "batch" | "package";
  submissionId?: string;
  questionId?: string;
  field?: string;
  rawValue?: unknown;
  normalizedValue?: unknown;
  message: string;
  evidence?: unknown;
  relatedRows?: Array<{
    submissionId?: string;
    questionId?: string;
    similarityScore?: number;
  }>;
  allowedCorrections: Array<{
    actionId: string;
    label: string;
    mode: "safe_auto" | "suggested" | "manual_only";
    proposedValue?: unknown;
  }>;
  blocksExport: boolean;
  invalidatesApprovals: string[];
}
```

## Minimum correction audit object

```ts
interface CorrectionAudit {
  correctionId: string;
  issueId: string;
  ruleId: string;
  actorType: "user" | "system";
  actorId: string;
  reason: string;
  oldValue: unknown;
  newValue: unknown;
  appliedAt: string;
  normalizationRuleVersion?: string;
  approvalsInvalidated: string[];
  validationResultAfterCorrection: {
    resolved: boolean;
    remainingIssueIds: string[];
  };
}
```
