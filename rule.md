# AssessmentCore Validation Rules and Autofix Features

## Overview
AssessmentCore implements a comprehensive validation and autofix system for educational assessment questions. The system validates against 25+ structural and semantic rules and provides multiple autofix mechanisms ranging from deterministic cleaning to AI-powered corrections.

## Validation Rules

The system uses a declarative rule engine with rules categorized by question type (MCQ, MSQ, ORDER, TRUE_FALSE, TEXT_ENTRY, NUMERIC, UNKNOWN). Rules are prioritized and executed in order of severity and priority.

### Core Validation Rules

#### General Rules (Apply to All Types)
- **REQUIRED_QUESTION_FIELD_RULE**: Question text/stem is required for export mapping
- **WHITESPACE_AUTOFIX_RULE**: Detects leading/trailing/extra whitespace that needs cleaning

#### MCQ (Multiple Choice Question) Rules
- **REQUIRED_OPTIONS_RULE**: Requires at least optionA and optionB to be non-empty
- **MCQ_MIN_OPTIONS_RULE**: Requires at least 2 options
- **MCQ_OPTION_TEXT_NOT_EMPTY_RULE**: Every option must have non-empty text
- **MCQ_OPTIONS_UNIQUE_RULE**: Option texts must be unique
- **MCQ_OPTION_IDENTIFIERS_UNIQUE_RULE**: Option identifiers must be unique
- **MCQ_OPTION_IDENTIFIER_VALID_RULE**: Option identifiers must be non-empty strings
- **MCQ_HAS_CORRECT_ANSWER_RULE**: At least one correct answer must be selected
- **MCQ_ANSWER_IN_OPTIONS_RULE**: Correct answer must exist in the provided options
- **MCQ_ANSWER_TEXT_MATCH_RULE**: Answer text must match option text when using text-based answers
- **MCQ_ANSWER_TEXT_AMBIGUOUS_RULE**: Answer text must not match multiple options ambiguously
- **MCQ_SINGLE_CORRECT_ONLY_RULE**: Only one correct answer should be selected for MCQ
- **MCQ_SHOULD_BE_MSQ_RULE**: Multiple correct answers detected - should be MSQ instead
- **MCQ_SUSPECT_TYPE_RULE**: Detects suspicious question types (single option, true/false options)

#### MSQ (Multiple Selection Question) Rules
- **MSQ_HAS_CORRECT_ANSWERS_RULE**: At least one correct answer must be provided
- **MSQ_ANSWER_IDENTIFIER_VALID_RULE**: Answer identifiers must be valid
- **MSQ_OPTIONS_UNIQUE_RULE**: Option identifiers must be unique
- **MSQ_CORRECT_ANSWERS_IN_OPTIONS_RULE**: All correct answers must exist in options
- **MSQ_MIXED_IDENTIFIER_MODE_RULE**: Answers should not mix identifiers and text values
- **MSQ_ANSWER_TEXT_MATCH_RULE**: Answer text must match option text
- **MSQ_ANSWER_TEXT_AMBIGUOUS_RULE**: Answer text must not match multiple options ambiguously
- **MSQ_ANSWER_CARDINALITY_CHECK_RULE**: Answer count must match expected cardinality
- **MSQ_NO_DUPLICATE_CORRECT_ANSWERS_RULE**: Correct answers must not contain duplicates
- **MSQ_EXACT_SET_MATCH_RULE**: Answers must exactly match the expected set

#### MSQ/ORDER Specific Rules
- **DELIMITER_FORMAT_RULE**: Answer must use pipe delimiter only (e.g., A|B|C) with no trailing/leading/double pipes

### Rule Categories and Severities
- **Categories**: structural, content_quality, type_suspicion
- **Severities**: 
  - `block`: Critical issues preventing export
  - `review`: Issues requiring manual review
  - `warning`: Minor issues that may be autofixed

## Autofix Features

AssessmentCore provides multiple levels of autofix capabilities:

### 1. 3-Pass Deterministic Cleaning Pipeline (No AI)

#### PASS 1: Character-Level Cleaning
Applied to all mapped columns (questions, options, answers):
- **INVISIBLE_CHAR_REMOVAL**: Removes zero-width spaces, BOM characters, soft hyphens
- **LINE_BREAK_NORMALIZATION**: Converts all line breaks to Unix-style (\n)
- **TRIM**: Removes leading/trailing whitespace
- **WHITESPACE_NORMALIZATION**: Normalizes multiple spaces/tabs to single spaces (scoped to answer/option fields)
- **DELIMITER_NORMALIZATION**: Standardizes delimiters (commas to pipes for MSQ/ORDER, removes spacing)
- **QUOTE_NORMALIZATION**: Converts smart quotes to straight quotes
- **NULL_COERCION**: Converts placeholder values (null, undefined, na, n/a, -, empty) to special null tokens

#### PASS 2: Structural Cleaning & Alignment
- **COLUMN_FALLBACK**: Uses fallback columns when primary columns are missing
- **STRUCTURE_FIX**: Fixes structural inconsistencies in data layout
- **OPTION_CLEANUP**: Cleans and normalizes option formatting
- **ANSWER_ALIGNMENT**: Aligns answers with available options

#### PASS 3: Suggestion-Based Remediation
Generates human-readable correction suggestions for remaining issues:
- **MISSING_ANSWER_SINGLE_OPTION**: When answer is null but only one option exists (HIGH confidence)
- **PLACEHOLDER_ANSWER**: When answer was null-coerced from placeholder tokens (MEDIUM confidence)
- **MISSING_ANSWER_MULTIPLE_OPTIONS**: When answer is null with multiple options (MEDIUM confidence)
- **ORDER_MISMATCH**: For ORDER type structural issues (MEDIUM confidence)
- **CASE_ALIGNMENT**: Answer matches option after case normalization (HIGH confidence)
- **FUZZY_MATCH**: Uses trigram similarity + word containment for near-matches:
  - Score >0.80: HIGH confidence (auto-applicable)
  - Score 0.70-0.80: MEDIUM confidence (informational)
- **ANSWER_NOT_IN_OPTIONS**: Fallback for unmatched answers (MEDIUM confidence)

PASS 3 suggestions can be executed with per-row rollback safety - changes are applied and re-validated, with automatic rollback if validation regresses.

### 2. AI-Based Autofix Features

#### Stem Autofix (`auto-fix-stem`)
- **Purpose**: Rewrites question stems to resolve grammar, logic, clarity, and factual issues
- **Input**: Original stem, question type, options, correct answers, detected issues
- **Process**: Uses Groq AI to generate corrected stem while preserving meaning and intent
- **Safety**: Maintains educational content and scoring logic

#### QTI XML Autofix (`auto-fix-qti`)
- **Purpose**: Fixes QTI XML structure and MathML formatting issues
- **Input**: QTI XML content, provider (Groq/Gemini), QTI version
- **Process**: Corrects XML well-formedness, QTI structural issues, and ensures clean Presentation MathML
- **MathML Rules**:
  - All math expressions wrapped in `<math xmlns="http://www.w3.org/1998/Math/MathML"><mrow>...</mrow></math>`
  - No namespace prefixes
  - Variables → `<mi>`, numbers → `<mn>`, operators → `<mo>`
  - No direct content in `<math>` tags

### 3. AI Audit System (Gate 2)
While primarily for validation, the AI audit system can identify issues that may trigger autofix:
- **audit-row**: Single row semantic audit using Groq
- **audit-batch**: Bulk audit using Gemini (50 rows per call)
- **Issue Types**: grammar, logic, clarity, factual
- **Integration**: Audit results can trigger stem autofix workflows

## Execution Flow

1. **Raw Validation**: Initial validation against all rules
2. **PASS 1 Cleaning**: Character-level fixes applied
3. **PASS 2 Cleaning**: Structural fixes applied
4. **Re-validation**: Validation run on cleaned data
5. **PASS 3 Suggestions**: Remediation suggestions generated
6. **Optional PASS 3 Execution**: High-confidence suggestions applied with rollback safety
7. **AI Audit**: Semantic review for grammar/logic/clarity/factual issues
8. **AI Autofix**: Stem and QTI XML corrections as needed

## Safety and Rollback Mechanisms

- All cleaning operations are deterministic and safe
- PASS 3 execution includes per-row validation rollback
- AI autofix preserves educational content and structure
- Changes are logged and can be tracked for auditing
- Invalid transformations are skipped with safety checks

## Performance Characteristics

- Supports batch processing (1 to 10,000+ rows)
- Chunked validation for large datasets (>500 rows)
- Progress tracking for UI feedback
- Efficient caching of normalized text comparisons
- Minimal API calls for AI features (server-side key management)