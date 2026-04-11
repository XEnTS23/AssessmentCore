# AssessmentCore — Full Project Context

> Hand this file to any AI agent to give it deep, accurate context about this codebase.

---

## What This App Does

**AssessmentCore** is a browser-based SaaS tool for educators and educational platforms. It takes raw question banks (Excel/CSV files) and:
1. Validates every row for structural correctness (missing stems, wrong answer format, duplicates, etc.)
2. Optionally auto-cleans the data (trim whitespace, remove duplicates, fix delimiters, fuzzy-match answers)
3. Exports the cleaned questions as standards-compliant QTI 3.0 XML packages, Moodle XML, Canvas XML, or JSON — ready to import into any LMS.

The core value proposition: upload a messy spreadsheet, get a clean, validated, LMS-importable package back.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript, React Router 7 |
| Build | Vite 6 |
| Styling | Tailwind CSS 4 + shadcn/ui (Radix UI primitives) |
| Database / Auth | Supabase (PostgreSQL + Supabase Auth) |
| Math rendering | KaTeX 0.16, MathJax 4.1 |
| File parsing | XLSX (SheetJS), PapaParse |
| Export packaging | JSZip |
| XLSX export (annotated sheet) | ExcelJS |
| AI validation | Groq / Gemini via Supabase Edge Functions |

---

## Repository Layout

```
src/
├── app/
│   ├── pages/
│   │   ├── LandingPage.tsx             — Public marketing page
│   │   ├── auth/                       — Login, Register, Verify, ForgotPassword, ResetPassword
│   │   └── workspace/
│   │       ├── WorkspaceLayout.tsx     — Auth-guarded shell with sidebar nav + quota display
│   │       ├── BatchCreator.tsx        — THE MAIN PAGE (upload → validate → export, ~4500 lines)
│   │       ├── QTIRenderer.tsx         — QTI XML viewer / XPath explorer
│   │       ├── LMSExportPage.tsx       — Canvas-specific QTI repackager
│   │       └── ValidationDashboardPage.tsx — Stub for future metrics dashboard
│   ├── components/
│   │   ├── ValidationReport.tsx        — Inline-editable validation table (core UI)
│   │   ├── ValidationReportOptimized.tsx — Virtualized variant for 1000+ rows
│   │   ├── DataFixingWorkspace.tsx     — Manual-fix UI for PASS 3 suggestions
│   │   ├── AIValidationReport.tsx      — Display AI-identified QTI issues
│   │   ├── ValidationDashboard.tsx     — Aggregated issue metrics
│   │   ├── MathMLRenderer.tsx          — KaTeX → MathML for question previews
│   │   ├── TemplateMappingUI.tsx       — Column-to-template-field mapping UI
│   │   └── ui/                         — Shadcn/Radix UI primitives (Button, Card, etc.)
│   └── utils/
│       ├── questionValidator.ts        — Core validation engine (~2100 lines) [CRITICAL]
│       ├── validationRuleEngine.ts     — Declarative rule layer (MCQ/MSQ/etc.)
│       ├── dataCleaningPipeline.ts     — 3-pass cleaning pipeline
│       ├── fileParser.ts               — Excel/CSV → rows + column detection
│       ├── chunkedValidator.ts         — Progress wrapper for large files
│       ├── qtiConverter.ts             — Routes to correct engine builder
│       ├── lmsConverters.ts            — Moodle, Canvas, Blackboard (stub) XML
│       ├── canvasPackageFixer.ts       — Rewrite QTI ZIP for Canvas compatibility
│       ├── templateXmlApplier.ts       — Inject placeholder values into template XML
│       ├── templateDataMapper.ts       — Excel rows → QTI from mapped template
│       ├── templateFieldExtractor.ts   — Parse QTI template, extract placeholder names
│       ├── mathmlConverter.ts          — LaTeX → sanitized MathML for QTI
│       ├── mediaUtils.ts               — Image extraction, URL mapping, path normalization
│       └── placeholderHandler.ts       — Find/replace/remove placeholders in QTI XML
├── contexts/
│   └── AuthContext.tsx                 — user, userProfile, userUsage; login/register/logout
├── services/
│   ├── supabaseClient.ts               — Supabase JS client (5s timeout)
│   ├── authService.ts                  — Signup, OTP verify, password reset, usage tracking
│   ├── batchCreatorService.ts          — Premium token redemption → batch_creator_access flag
│   ├── aiValidationService.ts          — Call Supabase Edge Functions (validate-qti, auto-fix-qti)
│   └── mediaUploadService.ts           — Upload images to Supabase Storage → public URLs
├── types/
│   └── auth.ts                         — AuthResponse, UserProfile, UserUsage, AuthContextType
└── engine/                             — QTI XML generation engine
    ├── index.ts                        — Exports: generateAndValidateMCQ, generateAndValidateTextEntry, generateQTIByVersion
    ├── types.ts                        — Question, QuestionBuilder, GenerationError
    ├── generationService.ts            — generateQTIByVersion() router (1.2 / 2.1 / 3.0)
    ├── builders/qti12/                 — QTI 1.2 MCQ + TextEntry builders
    ├── builders/qti21/                 — QTI 2.1 MCQ + TextEntry builders
    ├── builders/qti30/                 — QTI 3.0 MCQ + TextEntry builders (basic)
    └── qti3/                           — QTI 3.0 full implementation [PRIMARY]
        ├── mcqItemBuilder.ts           — assessment-item for MCQ, choice-interaction
        ├── textEntryItemBuilder.ts     — assessment-item for text entry / numeric
        ├── responseProcessingBuilder.ts — match_correct template, partial credit
        ├── outcomeMapper.ts            — SCORE, MAXSCORE, PASS outcome declarations
        ├── feedbackBuilder.ts          — Modal feedback (correct/incorrect/partial/hints)
        ├── testBuilder.ts              — Assemble assessment-test with test-part + sections
        ├── manifestBuilder.ts          — imsmanifest.xml (items, test, images, stimulus)
        ├── packageBuilder.ts           — JSZip assembly; validate structure; multiple output modes
        ├── resourceRegistry.ts         — Track all package resources + dependencies
        ├── metadataMapper.ts           — LOM metadata (difficulty, Bloom's, copyright, subject)
        ├── stimulusBuilder.ts          — assessmentStimulus; shared stimulus across items
        └── imageUtils.ts               — Image extraction, path normalization for packaging

supabase/
└── functions/
    ├── validate-qti/index.ts           — AI QTI validation (Groq/Gemini) — server-side to hide API keys
    └── auto-fix-qti/index.ts           — AI QTI rewrite for schema compliance

docs/                                   — Implementation guides (auth, features, testing)
VALIDATION_PROCESS_GUIDE.md            — Authoritative end-to-end technical reference [READ THIS]
```

---

## User Journey (Full Flow)

```
1. Landing page (/) → marketing page, public
2. /auth/register → email + password → Supabase signup → OTP email
3. /auth/verify-email → enter OTP → account verified
4. /auth/login → session created → redirect to /workspace
5. /workspace/batch-creator → MAIN TOOL:

   a. UPLOAD
      - Drop Excel/CSV
      - System runs fileParser.parseFile() → rows + auto-detected column mapping
      - Columns detected: question, answer, optionA-H, type, orderItems, image, feedback, etc.
      - Each row gets __rowKey = "{id}#{1-based-index}", __sourceRowNumber

   b. VALIDATE
      - "Proceed to Validation" button triggers validateAllQuestions()
        (or validateAllQuestionsChunked() for >500 rows, shows progress bar)
      - Per row: normalizeRow → detectTypeFromStructure → validateWithProfile → rule engine
      - After all rows: applyDuplicateAnalysis (3 fingerprint levels)
      - Results: Map<rowKey, ValidationResult> stored in state

   c. REVIEW VALIDATION RESULTS
      - Summary card: valid / caution / rejected counts
      - ValidationReport table: inline-edit cells, per-row issue badges
      - Download PDF Report / Download Row Analysis / Download Annotated Sheet (XLSX)
      - (Optional) Run cleaning pipeline → PASS 1+2+3 → DataFixingWorkspace for PASS 3 fixes
      - (Optional) Run AI validation via Supabase Edge Function

   d. CONFIGURE EXPORT
      - Export mode: 'qti-package' (ZIP) or 'xml-media-folder' (flat)
      - Output format: QTI 3.0, JSON, Canvas XML, Moodle XML
      - (Optional) Upload media ZIP → images mapped to rows
      - (Optional) Upload QTI template XML → column mapping → placeholder injection

   e. GENERATE & DOWNLOAD
      - generateAndValidateMCQ30() / generateAndValidateTextEntry30() per question
      - Package: items/*.xml + assessmentTest.xml + imsmanifest.xml + images/*
      - JSZip → Blob → download
      - usage tracked in user_usage (Supabase)

6. /workspace/lms-export → upload QTI ZIP → rewrite for Canvas → download
7. /workspace/qti-renderer → upload QTI ZIP → parse + navigate items → validate XML
```

---

## Question Types

```typescript
type CanonicalQuestionType =
  | 'single_choice'   // MCQ, one correct answer
  | 'multi_select'    // MSQ, multiple correct answers
  | 'true_false'      // binary choice
  | 'text_entry'      // short answer / fill-in-blank / essay
  | 'numeric'         // numeric with optional tolerance
  | 'order'           // ordering / sequencing
  | 'unknown'         // could not detect
```

**Type detection priority** (questionValidator.ts):
1. Explicit type column value → TYPE_ALIASES lookup
2. orderCol has value → `order`
3. 2 options + true/false texts → `true_false`
4. Multiple answer tokens → `multi_select`
5. 2+ options → `single_choice`
6. Numeric answer → `numeric`
7. Fallback → `text_entry` (low confidence)

**Column aliases recognized in uploaded files:**
- Question: `question`, `title`, `stem`, `prompt`, `text`, `q`
- Answer: `answer`, `correct`, `key`, `correct_answer`
- Options: `optionA`–`optionH`, `optA`–`optH`, `choiceA`–`choiceH`, bare `A`–`H`, `option1`–`option8`
- Type: `type`, `question_type`, `qtype`
- Order items: `order_items`, `ordering_items`, `sequence_items`, `arrange_items` (preferred over generic `order`/`sequence`)
- Image: `image`, `img`, `picture`, `media`
- Feedback: `feedback`, `explanation`, `rationale`

---

## Validation Pipeline (exact sequence)

```
fileParser.parseFile(file)
  └── rows: [ { ...data, __sourceRowNumber, __rowKey, id } ]
      └── detectQuestionColumns(rows) → columnMapping

validateAllQuestions(rows, columnMapping, profile)
  ├── Per row:
  │   ├── normalizeRow(row, columnMapping) → CanonicalItem draft
  │   ├── detectTypeFromStructure(row, columnMapping) → TypeResolution
  │   │     { type, source: 'explicit'|'detected', confidence: 'high'|'medium'|'low'|'none' }
  │   ├── validateWithProfile(canonicalItem, profile) → ValidationIssue[]
  │   └── executeRules(canonicalItem, issues) [validationRuleEngine V2]
  ├── After all rows:
  │   └── applyDuplicateAnalysis(allResults)
  │         ├── Exact fingerprint: type+stem+options+orderItems+answers+textEntryMode
  │         ├── Conflict fingerprint: type+stem+options+orderItems (no answer)
  │         └── Near/Suspicious: Jaccard on stem tokens (≥0.92 = NEAR, ≥0.85 = SUSPICIOUS)
  └── finalizeLegacyShape(result) → status/decision/categories/criticalErrors/warnings
```

**ValidationResult shape:**
```typescript
{
  rowId: string            // same as rowKey
  rowKey: string           // "{id}#{rowNumber}" — canonical lookup key
  rowNumber: number
  status: 'valid' | 'caution' | 'rejected'
  decision: 'pass' | 'review' | 'block'
  issues: ValidationIssue[]     // SOURCE OF TRUTH — use this, not criticalErrors/warnings
  canonicalItem?: CanonicalItem // normalized question representation
  exportReady: boolean
  errorCount: number
  warningCount: number
  // legacy compat (derived from issues, not primary):
  criticalErrors: ValidationError[]
  warnings: ValidationError[]
}
```

**ValidationIssue shape:**
```typescript
{
  code: string        // e.g. 'MISSING_ANSWER', 'DUPLICATE_EXACT'
  category: 'normalization' | 'structural' | 'mapping' | 'duplicate' | 'content_quality' | 'export_readiness'
  field: string       // which column has the issue
  message: string     // human-readable description
  severity: 'block' | 'review'   // block → rejected, review → caution
}
```

**Important issue codes:**
| Code | Severity | Meaning |
|------|----------|---------|
| `MISSING_ID` | block | no explicit id |
| `MISSING_STEM` | block | no question text |
| `SHORT_STEM` | review | < 5 chars |
| `UNKNOWN_EXPLICIT_TYPE` | block | type column value not in TYPE_ALIASES |
| `DUPLICATE_ID` | block | same id on multiple rows |
| `MISSING_ANSWER` | block | no answer value |
| `INSUFFICIENT_OPTIONS` | block | < 2 options for MCQ/MSQ |
| `ANSWER_NOT_IN_OPTIONS` | block | answer can't resolve to any option |
| `AMBIGUOUS_ANSWER_MAPPING` | block | answer matches multiple options |
| `INVALID_ORDER_ITEMS` | block | < 2 order items |
| `ORDER_SEQUENCE_INCOMPLETE` | block | answer doesn't cover all order items exactly once |
| `DUPLICATE_EXACT` | block | exact duplicate row |
| `DUPLICATE_CONFLICT` | block | same stem+options, different answers |
| `DUPLICATE_NEAR` | review | Jaccard ≥ 0.92 on stem tokens |
| `DUPLICATE_SUSPICIOUS` | review | Jaccard ≥ 0.85 on stem tokens |

---

## Cleaning Pipeline (dataCleaningPipeline.ts)

Three passes, run when user clicks "Clean & Fix":

**PASS 1 — Character-level (always safe, never rolled back):**
- TRIM: strip leading/trailing whitespace
- INVISIBLE_CHAR_REMOVAL: remove zero-width spaces, BOM
- LINE_BREAK_NORMALIZATION: CRLF → LF
- WHITESPACE_NORMALIZATION: collapse internal spaces (answer/option cols)
- DELIMITER_NORMALIZATION: normalize `"A , B"` → `"A,B"`, `"Step A | Step B"` → clean pipes
- QUOTE_NORMALIZATION: smart quotes → ASCII
- NULL_COERCION: convert `"null"`, `"N/A"`, `"undefined"`, `""` → null sentinel

**PASS 2 — Structural (rollback if row status degrades):**
- COLUMN_FALLBACK: use alias column if primary missing
- OPTION_CLEANUP: deduplicate options (shift remaining options up, remove last)
- ANSWER_ALIGNMENT: align answer format to match cleaned options
- Only applies to rejected rows; skips already-valid rows

**PASS 3 — Suggestions only (no auto-mutation except HIGH confidence):**
Generates `RemediationSuggestion[]`:
```typescript
{
  rowKey: string            // same format as ValidationResult.rowKey
  rowIndex: number          // 1-based
  field: string
  type: RemediationType
  message: string
  suggestedValue: string
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
}
```
Suggestion types: `MISSING_ANSWER_SINGLE_OPTION`, `MISSING_ANSWER_MULTIPLE_OPTIONS`, `PLACEHOLDER_ANSWER`, `ORDER_MISMATCH`, `CASE_ALIGNMENT`, `FUZZY_MATCH`, `ANSWER_NOT_IN_OPTIONS`

**Execution policy:**
- HIGH confidence → auto-applied (with rollback safety: validate candidate, revert if worse)
- MEDIUM confidence → shown in DataFixingWorkspace for user action, never auto-applied
- LOW confidence → not shown

**DualValidationResult output:**
```typescript
{
  rawResults: Record<string, ValidationResult>      // pre-cleaning
  cleanedRows: QuestionData[]                       // after PASS 1+2
  cleanLogs: CleanLog[]                             // all PASS 1+2 changes
  cleanResults: Record<string, ValidationResult>   // post-cleaning
  pass3Result: { suggestions: RemediationSuggestion[] }
  pass3ExecutionResult: { executedRows, appliedCount, rolledBackCount, ... }
  metrics: ImprovementMetrics
}
```

---

## validationRuleEngine.ts (V2 Layer)

Runs AFTER core validation. Only fires for MCQ/MSQ types.

**Priority bands:**
- 0–49: structural (MCQ_MIN_OPTIONS, MCQ_OPTION_TEXT_NOT_EMPTY)
- 50–79: semantic (MCQ_HAS_CORRECT_ANSWER, MCQ_ANSWER_IN_OPTIONS, MCQ_SINGLE_CORRECT_ONLY)
- 80–99: fallback (MSQ_EXACT_SET_MATCH) — MCQ_ANSWER_TEXT_MATCH is DISABLED
- 100+: ambiguity (MCQ_ANSWER_TEXT_AMBIGUOUS, MCQ_SHOULD_BE_MSQ, MCQ_SUSPECT_TYPE)

**MCQ_ANSWER_IN_OPTIONS:** determines 'identifier' vs 'text' mode based on whether option identifiers are non-trivial (longer than single letter/digit).

---

## Export Formats

| Format | Mode | Description |
|--------|------|-------------|
| QTI 3.0 Package | `qti-package` | ZIP: items/*.xml + assessmentTest.xml + imsmanifest.xml + images/* |
| QTI 2.1 Package | `qti-package` | Backward-compatible ZIP |
| QTI 1.2 Package | `qti-package` | Basic support |
| JSON | — | Structured question objects |
| Moodle XML | — | `<quiz><question type="multichoice|shortanswer|essay">` |
| Canvas XML | — | QTI rewritten for Canvas manifest compatibility |
| XML + Media Folder | `xml-media-folder` | Flat: items/*.xml + images/* (no manifest) |

Canvas repackaging happens in two ways:
1. BatchCreator → "Canvas XML" option → `convertToCanvasXML()`
2. `/workspace/lms-export` → upload QTI ZIP → `canvasPackageFixer.ts` → download

---

## Authentication

- **Provider:** Supabase Auth (email/password, JWT sessions)
- **Tables:** `user_profiles` (name, email), `user_usage` (exports_count, total_questions_converted, is_unlimited, batch_creator_access)
- **Quota:** free = 100 questions/month; `is_unlimited = true` = paid plan
- **Batch Creator feature:** `batch_creator_access = true` (unlocked via token redemption in batchCreatorService.ts)
- **Session:** stored by Supabase SDK, auto-refreshed
- **5-second timeout** on all Supabase requests (prevents hanging if misconfigured)

---

## BatchCreator.tsx — Key State

```typescript
// File & parsing
file: File | null
fileData: { columns: string[], rows: Record<string,any>[], fileName: string } | null
columnMapping: ColumnMapping | null
editedRows: Record<string,any>[]       // working rows; always has __rowKey

// Validation
validationResults: Map<string, ValidationResult>  // keyed by rowKey
showValidationReport: boolean

// Cleaning pipeline
viewMode: 'raw' | 'clean'
cleanValidationResults: Record<string, ValidationResult> | null
pass3Suggestions: RemediationSuggestion[]
pass3ExecutedRows: QuestionData[]
manualFixedRows: Map<string, any>
cleaningLogs: CleanLog[]
cleaningMetrics: ImprovementMetrics | null

// Export
currentStep: 'upload' | 'validate' | 'configure' | 'export'
exportMode: 'qti-package' | 'xml-media-folder' | ''
outputFormat: 'qti' | 'json' | ...
containsMath: 'yes' | 'no' | 'unsure'
containsImages: 'yes' | 'no' | 'unsure'
uploadedMediaUrls: UploadedMediaUrl[]

// AI validation
aiValidationResults: AIValidationItem[]
aiProvider: AIProvider
```

---

## Key Invariants (never break these)

1. `result.issues` is the canonical source of truth — never read `criticalErrors`/`warnings` as primary (they are derived)
2. `columnMapping.orderCol` is the only path to read order items — never ad-hoc re-read columns
3. Order item sequence is **never sorted** in exact duplicate fingerprints
4. Row key (`rowId` = `rowKey`) format is `"{id}#{1-based-index}"` — used for all Map lookups
5. `__rowKey` is always present on every row in `editedRows` (set by `ensureInternalRowKeys()`)
6. PASS 2 always rolls back if a row's status degrades after structural changes
7. MEDIUM confidence PASS 3 suggestions are never auto-applied — only shown in UI

---

## Critical Files to Read First

When working on this project, prioritize reading these in order:
1. `VALIDATION_PROCESS_GUIDE.md` — authoritative architecture guide
2. `src/app/utils/questionValidator.ts` — core types + validation logic
3. `src/app/pages/workspace/BatchCreator.tsx` — orchestrates everything
4. `src/app/utils/dataCleaningPipeline.ts` — cleaning + suggestion types
5. `src/app/utils/validationRuleEngine.ts` — MCQ/MSQ rule declarations

---

## Common Gotchas

- **`viewMode`** toggles between raw and clean validation results — always use `activeResults` pattern:
  ```typescript
  const activeResults = viewMode === 'clean' && cleanValidationResults
    ? new Map(Object.entries(cleanValidationResults))
    : validationResults;
  ```
- **Column detection order** for order items: payload columns (`order_items`, `ordering_items`) take priority over generic names (`order`, `sequence`) — prevents empty metadata columns from hijacking the order items slot
- **`pass3ExecutedRows` ≠ `editedRows`** — PASS 3 auto-execution produces a snapshot; `editedRows` is the live working state and is not auto-replaced
- **`XLSX` package** (SheetJS, used for parsing) does not support cell styles — use `ExcelJS` for styled exports
- **Supabase Edge Functions** hold AI provider API keys — the browser never sees them
- **Formula injection** (CVE-2023-30533): `fileParser.ts` strips leading `=`, `+`, `-`, `@` from cell values
- **rowKey collisions**: if rows have no explicit id, rowKey = `"row_{n}#{n}"` — this is intentional and safe
