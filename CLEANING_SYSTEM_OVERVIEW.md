# Data Cleaning System Overview

## Overview

The data cleaning system in this project is a sophisticated, multi-pass pipeline designed to automatically clean and standardize question data from CSV/Excel files. It operates deterministically without AI or fuzzy matching, ensuring safe, predictable transformations.

## Architecture

The cleaning system consists of **4 sequential passes**, each building on the previous:

### PASS 1: Character-Level Cleaning
**Purpose**: Remove invisible characters, normalize whitespace, and standardize delimiters.

**Rules Applied** (in strict order):
- `INVISIBLE_CHAR_REMOVAL` - Removes zero-width characters, BOM markers
- `LINE_BREAK_NORMALIZATION` - Converts all line breaks to `\n`
- `TRIM` - Removes leading/trailing whitespace
- `WHITESPACE_NORMALIZATION` - Collapses internal whitespace (scoped to answer/option/order fields)
- `DELIMITER_NORMALIZATION` - Standardizes comma/pipe spacing: `"A , B"` → `"A,B"`
- `QUOTE_NORMALIZATION` - Converts smart quotes to straight quotes
- `NULL_COERCION` - Converts placeholder values (`null`, `n/a`, `undefined`, `-`) to `null`

**Scope**: Only applied to mapped columns (question, answer, options, order) and known aliases.

### PASS 2: Structural Cleaning & Alignment
**Purpose**: Fix structural issues and align related fields.

**Safety Model**:
- Rows already marked as `valid` are never touched
- Each row is processed individually with rollback safety
- If a change would worsen validation status, all changes are reverted

**Rules Applied**:
- `COLUMN_FALLBACK` - Fills empty order/answer columns from sibling columns containing delimited data
- `STRUCTURE_FIX` - Rebuilds order sequences into canonical comma-separated format
- `OPTION_CLEANUP` - Removes duplicate options and empty slots while preserving answer alignment
- `ANSWER_ALIGNMENT` - Converts answer text to option identifiers when they match exactly

### PASS 3: Suggestion-Based Remediation
**Purpose**: Generate human-readable correction suggestions for remaining issues.

**Confidence Levels**:
- `HIGH` - Unambiguous fixes that can be auto-applied
- `MEDIUM` - Likely fixes requiring human confirmation
- `LOW` - Informational only

**Suggestion Types** (priority order):
1. `MISSING_ANSWER_SINGLE_OPTION` - Empty answer with exactly 1 option (HIGH)
2. `PLACEHOLDER_ANSWER` - Answer was null-coerced from placeholder (MEDIUM)
3. `MISSING_ANSWER_MULTIPLE_OPTIONS` - Empty answer with 2+ options (MEDIUM)
4. `ORDER_MISMATCH` - Order sequence structural issues (MEDIUM)
5. `CASE_ALIGNMENT` - Answer matches option after case normalization (HIGH)
6. `FUZZY_MATCH` - High similarity between answer and option (>70% + clear gap) (HIGH/MEDIUM)
7. `ANSWER_NOT_IN_OPTIONS` - Answer present but matches nothing (MEDIUM)

### PASS 3 Execution: Auto-Apply High-Confidence Suggestions
**Purpose**: Automatically apply safe, high-confidence suggestions.

**Safety Model**:
- Only `HIGH` confidence suggestions are applied
- Each change is validated individually
- If validation status regresses, the change is immediately reverted
- Only actionable suggestion types produce actual changes

## Key Design Principles

### Deterministic & Safe
- No randomness or AI inference
- All transformations are predictable and reversible
- Safety checks prevent data degradation

### Scoped Application
- Only mapped columns and known aliases are cleaned
- Internal metadata fields (`__*`) are never touched
- ID fields receive minimal cleaning (trim only)

### Rollback Protection
- PASS 2: Per-row validation rollback
- PASS 3: Individual suggestion validation rollback
- Valid rows are never modified

### Performance Considerations
- Character-level rules are fast (regex-based)
- Structural rules include safety validation
- Suggestion generation is comprehensive but selective

## Metrics & Reporting

The system provides detailed metrics:

- **Improvement Metrics**: Issues resolved, rows improved, cleaning effectiveness
- **Safety Metrics**: Rows skipped due to safety, rollbacks performed
- **Suggestion Metrics**: Coverage, confidence distribution, types generated
- **Execution Metrics**: Suggestions applied, rollbacks, rows fixed

## Integration Points

- **BatchCreator**: Orchestrates the full pipeline
- **Validation Engine**: Provides baseline validation and re-validation
- **UI Components**: Display cleaning results and suggestions
- **Export Functions**: Use cleaned results for downloads

## Usage in Application

The cleaning system is triggered when users upload data and can be viewed in "clean" mode, which shows:
- Validation results on cleaned data
- Cleaning logs showing all transformations
- Improvement metrics
- Remediation suggestions

This multi-pass approach ensures data quality while maintaining safety and providing actionable feedback for manual corrections.