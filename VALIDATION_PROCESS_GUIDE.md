# Assessment Validation System: End-to-End Technical Guide

## Purpose
This document explains exactly how the validation pipeline works from file upload to validation report export, including row normalization, column mapping, canonical modeling, issue generation, duplicate detection, and PDF/report content generation.

It is written so another AI agent can understand your system behavior, constraints, and debugging flow without reverse-engineering the codebase.

## Primary Runtime Entry Points
1. Upload trigger and proceed flow:
[src/app/pages/workspace/BatchCreator.tsx](src/app/pages/workspace/BatchCreator.tsx#L709)
2. File parsing:
[src/app/utils/fileParser.ts](src/app/utils/fileParser.ts#L16)
3. Auto column detection:
[src/app/utils/fileParser.ts](src/app/utils/fileParser.ts#L138)
4. Validation orchestration:
[src/app/utils/questionValidator.ts](src/app/utils/questionValidator.ts#L1361)
5. Duplicate analysis:
[src/app/utils/questionValidator.ts](src/app/utils/questionValidator.ts#L1093)
6. Validation report generation (HTML/PDF print content):
[src/app/pages/workspace/BatchCreator.tsx](src/app/pages/workspace/BatchCreator.tsx#L2369)

## Data Flow: Exact Sequence (Upload to Report)

1. User selects a file in the UI.
2. The file object is stored in state only.
3. User clicks Proceed To Validation.
4. Configuration checks run (format, export mode, image/math/template settings).
5. Source file is parsed (XLSX or CSV path chosen by extension).
6. Columns are auto-detected into a mapping object.
7. Optional image URL mapping is applied (xml-media-folder flow).
8. Internal row keys are attached to rows.
9. Validation runs:
1. Small batches: direct validateAllQuestions.
2. Large batches: validateAllQuestionsChunked progress wrapper, then one full validateAllQuestions pass.
10. Validation results are stored in a row-keyed map.
11. UI report components read from the same result map.
12. Download Validation Report builds report stats, flagged rows, and duplicate appendix.
13. HTML report content is assembled and printed/downloaded as PDF content.

## Parsing Layer

### XLSX Path
1. Read first sheet.
2. Convert sheet to JSON rows.
3. Derive columns from first row.
4. Add compatibility id fallback and metadata:
1. id fallback for blank/missing IDs.
2. __sourceRowNumber
3. __sourceIdRaw
4. __explicitIdMissing

Reference:
[src/app/utils/fileParser.ts](src/app/utils/fileParser.ts#L33)

### CSV Path
Same normalization contract as XLSX.

Reference:
[src/app/utils/fileParser.ts](src/app/utils/fileParser.ts#L90)

## Column Detection Layer

### Generic strategy
1. Detect title/question/answer/type/metadata columns by alias-like token matching.
2. Detect option columns with regex for Option A/B/C or numeric variants.

### Order column resolution (important root-cause fix)
When multiple order-related columns exist:
1. Prefer explicit order-items content aliases first.
2. Only fall back to generic order/sequence/arrange matches if no explicit order-items candidate exists.

This prevents empty metadata columns (example: Display Order) from overriding populated payload columns (example: Order Items).

Reference:
[src/app/utils/fileParser.ts](src/app/utils/fileParser.ts#L224)

## Validation Core Model

### Entry
[src/app/utils/questionValidator.ts](src/app/utils/questionValidator.ts#L1311)

### Per-row pipeline
1. normalizeRow
2. detectTypeFromStructure
3. validateWithProfile
4. produce canonicalItem + issues
5. after all rows: applyDuplicateAnalysis
6. finalizeLegacyShape (status, warnings/errors compatibility)

### Canonical outputs
Each row result includes:
1. rowId/rowKey/rowNumber
2. status + decision
3. categories
4. issues (canonical issue list)
5. criticalErrors/warnings (legacy compatibility projection)
6. canonicalItem with:
1. canonicalType
2. normalized stem
3. normalized options
4. parsed orderItems
5. resolved correctResponseIdentifiers
6. answer tokens + raw answer
7. metadata and export targets

## Order Item Parsing and Mapping

### Order payload read path
Order parsing uses the resolved columnMapping.orderCol only.

Reference:
[src/app/utils/questionValidator.ts](src/app/utils/questionValidator.ts#L471)

### Parsing behavior
1. Supports configured delimiter if provided.
2. Supports default delimiters for general cases.
3. Handles array payloads and JSON-like payloads.
4. Produces ordered token list, preserving sequence.

### Order answer resolution
1. Tokenize answer sequence.
2. Resolve each token to ORDER_n identifier using orderItems.
3. Validate complete one-to-one sequence coverage.

## Duplicate Classification

### Exact fingerprint
Reference:
[src/app/utils/questionValidator.ts](src/app/utils/questionValidator.ts#L1050)

Includes:
1. canonical type
2. normalized stem
3. option text model
4. orderItems model
5. answer model identifiers
6. textEntryMode

For order rows, sequence is preserved.

### Conflict and near logic
Reference:
[src/app/utils/questionValidator.ts](src/app/utils/questionValidator.ts#L1093)

Behavior:
1. Exact duplicates -> DUPLICATE_EXACT.
2. Same/similar model with different semantic answer model -> DUPLICATE_CONFLICT.
3. High-similarity variants -> DUPLICATE_NEAR or DUPLICATE_SUSPICIOUS.
4. For order rows, sequence differences prevent exact duplicate collapse.

## Chunked vs Non-Chunked Validation

### Small data
Direct full validation call.

### Large data
Chunked progress updates for UI, but still one full deterministic validation pass so cross-row checks remain correct.

Reference:
[src/app/utils/chunkedValidator.ts](src/app/utils/chunkedValidator.ts#L8)

## Report/PDF Generation Pipeline

### Stats source
Validation stats are computed from canonical result.issues and categories.

Reference:
[src/app/pages/workspace/BatchCreator.tsx](src/app/pages/workspace/BatchCreator.tsx#L2310)

### Flagged row appendix source
Flagged report rows use result.issues as canonical message source, ensuring newly caught issue types are listed in report content.

Reference:
[src/app/pages/workspace/BatchCreator.tsx](src/app/pages/workspace/BatchCreator.tsx#L2430)

### Duplicate appendix
Duplicate rows are grouped by question text key and duplicate issue categories, then rendered into report HTML.

Reference:
[src/app/pages/workspace/BatchCreator.tsx](src/app/pages/workspace/BatchCreator.tsx#L2382)

### PDF style/layout
Report HTML/CSS structure is defined inline in report builder; content source can change without layout changes.

Reference:
[src/app/pages/workspace/BatchCreator.tsx](src/app/pages/workspace/BatchCreator.tsx#L2487)

## Compatibility and Invariants

The system intentionally preserves:
1. Legacy criticalErrors/warnings fields for UI compatibility.
2. Canonical issues as source-of-truth for modern behavior.
3. Decision/status mapping:
1. block -> rejected
2. review -> caution
3. pass -> valid
4. Stable row-key-based lookup to avoid id-only ambiguity.
5. Report/PDF layout style independent from issue-source logic.

## Root-Cause Example (Resolved)

### Historical failure
1. Row had:
1. Order Items: populated payload
2. Display Order: empty
2. Mapping selected Display Order as orderCol.
3. parseOrderItems read empty value.
4. Order validation failed with requires at least two items. Found 0.
5. Order duplicate fingerprints collapsed toward stem-only behavior.

### Current behavior
1. Mapping prefers payload-like order-items aliases.
2. orderCol resolves to populated Order Items.
3. parseOrderItems yields ordered item sequence.
4. Validation passes for valid rows.
5. Exact fingerprints include order sequence and answer model.
6. Sequence variants are not exact duplicates.

## Operational Debug Checklist

1. Confirm detected mapping contains correct orderCol.
2. Log raw_order_value_read and raw_answer_value_read.
3. Confirm parsed_order_items and canonical_order_model.
4. Verify validation_result.status and issue codes.
5. Inspect exact_fingerprint and near/conflict fingerprints.
6. Confirm report-layer row uses same row key and issue messages from result.issues.

## Suggested Diagnostic Command
npx vitest run src/app/utils/__tests__/questionValidator.test.ts -t "production-path diagnostics" --reporter=verbose

Diagnostic references:
[src/app/utils/__tests__/questionValidator.test.ts](src/app/utils/__tests__/questionValidator.test.ts#L924)

## What Another AI Agent Must Not Change Accidentally

1. Do not bypass columnMapping.orderCol and re-read raw columns ad hoc.
2. Do not sort orderItems for order-type exact fingerprints.
3. Do not reintroduce report messaging from only criticalErrors/warnings.
4. Do not alter report HTML/CSS when fixing content logic.
5. Do not break row-key usage in validationResults map lookups.

## Extension Guidance

If adding new issue types:
1. Add canonical issue code/category/severity in validator.
2. Ensure finalizeLegacyShape compatibility projection remains consistent.
3. Ensure report category labeling covers new categories.
4. Ensure report message builder reads canonical issues.
5. Add production-path diagnostics or regression tests for the new issue path.
