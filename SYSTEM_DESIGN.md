# AssessmentCore — System Design Document

> **Purpose:** This document gives any engineer, designer, or stakeholder a complete picture of what AssessmentCore does, how it is built, and how every major system inside it works. No prior context is assumed.

---

## 1. What Is AssessmentCore?

**AssessmentCore** is a browser-based SaaS tool for educators and educational content teams. Its job is to take a raw question bank — a messy Excel or CSV spreadsheet — and turn it into a clean, validated, standards-compliant package that can be imported directly into any Learning Management System (LMS).

### The Core Problem It Solves

Creating assessment content at scale is painful. Educators typically maintain question banks in spreadsheets, but those spreadsheets are messy: wrong answer formats, missing fields, duplicate questions, inconsistent delimiters, grammar errors, and factually wrong correct answers. Manually cleaning thousands of rows before uploading to an LMS takes days and is error-prone.

AssessmentCore automates this entirely:

1. **Upload** your spreadsheet (Excel or CSV)
2. **Validate** every row automatically — structural issues, duplicates, type detection
3. **Clean & Fix** the data — three-pass automated pipeline
4. **AI Audit** — semantic review for grammar, logic, clarity, and factual accuracy
5. **Configure** export format and LMS target
6. **Download** a ready-to-import LMS package (QTI XML, Moodle XML, Canvas XML, or JSON)

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18 + TypeScript | UI, state management, orchestration |
| Build tool | Vite 6 | Fast dev server, optimized production builds |
| Routing | React Router 7 | SPA routing |
| Styling | Tailwind CSS 4 + shadcn/ui (Radix UI) | Design system, accessible primitives |
| Database & Auth | Supabase (PostgreSQL + Supabase Auth) | User accounts, usage tracking, session management |
| File parsing | XLSX (SheetJS), PapaParse | Read Excel (.xlsx, .xls) and CSV files |
| Export packaging | JSZip | Assemble ZIP packages for download |
| Annotated export | ExcelJS | Write styled XLSX validation reports |
| Math rendering | KaTeX 0.16, MathJax 4.1 | Render LaTeX in question previews |
| AI — Gate 2 single-row | Groq (`llama-3.1-8b-instant`) | Fast per-row semantic audit |
| AI — Gate 2 batch | Gemini 2.0 Flash | Bulk audit (50 rows per API call) |
| AI — QTI validation | Groq / Gemini (configurable) | Validate generated QTI XML for schema compliance |
| Serverless backend | Supabase Edge Functions (Deno runtime) | Hold AI API keys server-side; browser never sees them |

---

## 3. Repository Structure

```
src/
├── app/
│   ├── pages/
│   │   ├── LandingPage.tsx              — Public marketing page
│   │   ├── auth/                        — Login, Register, OTP verify, Password reset
│   │   └── workspace/
│   │       ├── WorkspaceLayout.tsx      — Auth-guarded shell with sidebar + quota display
│   │       ├── BatchCreator.tsx         — THE MAIN TOOL (~4500 lines, orchestrates everything)
│   │       ├── QTIRenderer.tsx          — Upload QTI ZIP → view/navigate XML items
│   │       ├── LMSExportPage.tsx        — Canvas-specific QTI repackager
│   │       └── ValidationDashboardPage.tsx
│   ├── components/
│   │   ├── ValidationReport.tsx         — Inline-editable validation results table
│   │   ├── ValidationReportOptimized.tsx — Virtualized variant for 1000+ row datasets
│   │   ├── AiAuditReviewer.tsx          — Gate 2 AI audit split-panel UI
│   │   ├── DataFixingWorkspace.tsx      — Manual fix UI for PASS 3 suggestions
│   │   ├── AIValidationReport.tsx       — Display AI-identified QTI XML issues
│   │   ├── ValidationDashboard.tsx      — Aggregated issue metrics overview
│   │   ├── MathMLRenderer.tsx           — KaTeX → MathML for question previews
│   │   ├── TemplateMappingUI.tsx        — Column-to-QTI-template field mapping
│   │   └── ui/                          — shadcn/Radix primitives (Button, Card, Dialog, etc.)
│   └── utils/
│       ├── questionValidator.ts         — Core validation engine (~2100 lines)
│       ├── validationRuleEngine.ts      — Declarative rule layer (MCQ/MSQ)
│       ├── dataCleaningPipeline.ts      — Three-pass automated cleaning pipeline
│       ├── fileParser.ts                — Excel/CSV → rows + auto-detect column mapping
│       ├── chunkedValidator.ts          — Progress wrapper for large (>500 row) files
│       ├── qtiConverter.ts              — Routes each question to the correct QTI builder
│       ├── lmsConverters.ts             — Moodle XML, Canvas XML converters
│       ├── canvasPackageFixer.ts        — Rewrite QTI ZIP for Canvas manifest compatibility
│       ├── templateXmlApplier.ts        — Inject row values into QTI template XML
│       ├── mathmlConverter.ts           — LaTeX string → sanitized MathML
│       └── mediaUtils.ts                — Image extraction, URL mapping, path normalization
├── contexts/
│   └── AuthContext.tsx                  — user, userProfile, userUsage; login/register/logout
├── services/
│   ├── supabaseClient.ts                — Supabase JS client (5-second request timeout)
│   ├── authService.ts                   — Signup, OTP verify, password reset, usage tracking
│   ├── batchCreatorService.ts           — Premium token redemption → feature flag unlock
│   ├── aiValidationService.ts           — Call validate-qti / auto-fix-qti Edge Functions
│   ├── rowAuditService.ts               — Gate 2: auditRow, auditBatch, autoFixStem
│   └── mediaUploadService.ts            — Upload images to Supabase Storage → public URLs
└── engine/                              — QTI XML generation engine
    ├── index.ts
    ├── generationService.ts             — Route by QTI version (1.2 / 2.1 / 3.0)
    ├── builders/qti12/                  — QTI 1.2 MCQ + TextEntry XML builders
    ├── builders/qti21/                  — QTI 2.1 MCQ + TextEntry XML builders
    └── qti3/                            — QTI 3.0 full implementation (primary)
        ├── mcqItemBuilder.ts            — assessment-item + choice-interaction
        ├── textEntryItemBuilder.ts      — assessment-item + textEntryInteraction
        ├── responseProcessingBuilder.ts — match_correct, partial credit
        ├── outcomeMapper.ts             — SCORE, MAXSCORE, PASS outcome declarations
        ├── feedbackBuilder.ts           — Modal feedback (correct/incorrect/hints)
        ├── testBuilder.ts               — assessment-test + test-part + sections
        ├── manifestBuilder.ts           — imsmanifest.xml assembly
        └── packageBuilder.ts            — JSZip assembly + multiple output modes

supabase/
└── functions/
    ├── validate-qti/                    — AI QTI XML schema validation (Groq/Gemini)
    ├── auto-fix-qti/                    — AI QTI XML rewrite for compliance
    ├── audit-row/                       — Gate 2: single-row semantic audit (Groq)
    ├── audit-batch/                     — Gate 2: bulk semantic audit up to 50 rows (Gemini)
    └── auto-fix-stem/                   — Gate 2: AI stem rewrite to resolve detected issues (Groq)
```

---

## 4. Full User Journey

```
Landing Page (/)
    ↓
Register (/auth/register)
  → email + password → Supabase signup → OTP sent by email
    ↓
Verify Email (/auth/verify-email)
  → enter 6-digit OTP → account activated
    ↓
Login (/auth/login)
  → session created → redirect to /workspace
    ↓
Workspace (/workspace/batch-creator)  ← MAIN TOOL
  → See wizard steps below
    ↓
Optional tools:
  /workspace/lms-export    — Upload QTI ZIP → rewrite for Canvas → download
  /workspace/qti-renderer  — Upload QTI ZIP → view XML items, navigate, validate
```

---

## 5. The Main Tool: BatchCreator Wizard

The entire data processing flow lives inside `BatchCreator.tsx` as a multi-step wizard. Each step is a discrete UI state. Steps are never skipped (except AI Audit which has an explicit skip).

```
STEP 1: Upload
STEP 2: Validating  (progress bar shown for large files)
STEP 3: Clean & Fix (validation results review + cleaning pipeline)
STEP 4: AI Audit    (optional — user can skip)
STEP 5: Configure   (choose export format, LMS target, media, template)
STEP 6: Transform   (generate + download)
```

### Step 1 — Upload

- User drops an Excel (`.xlsx`, `.xls`) or CSV file
- `fileParser.parseFile()` runs immediately
  - Reads all rows
  - Auto-detects column mapping (question, answer, options A–H, type, order items, image, feedback)
  - Attaches internal keys to each row: `__rowKey = "{id}#{1-based-row-number}"`, `__sourceRowNumber`
- Column detection uses a priority-ranked alias list (e.g. `question`, `stem`, `prompt`, `title`, `q` all map to the question column)
- Formula injection is sanitized: cells starting with `=`, `+`, `-`, `@` are stripped (prevents CSV injection / CVE-2023-30533)

### Step 2 — Validating

- User clicks "Proceed to Validation"
- Pre-flight checks run: format mode, image/math mode, template settings
- For files ≤ 500 rows: `validateAllQuestions()` runs directly in-browser
- For files > 500 rows: `validateAllQuestionsChunked()` runs with a live progress bar, then one full pass for duplicate analysis
- Output: `Map<rowKey, ValidationResult>` stored in component state
- Each `ValidationResult` contains: `status` (valid/caution/rejected), `issues[]` (canonical), `canonicalItem` (normalized question), `exportReady` flag

### Step 3 — Clean & Fix

This is the validation review and automated cleaning stage.

**Review panel:**
- Summary card: counts of valid / caution / rejected rows
- `ValidationReport` table: inline-editable cells, per-row issue badges, expandable issue details
- Download options: PDF report, per-row analysis XLSX, annotated spreadsheet (ExcelJS, colour-coded)

**Cleaning pipeline (optional):**
- User clicks "Clean & Fix" → `runDualValidation()` runs three passes (see §7 below)
- After cleaning, user can toggle between "Raw" and "Clean" view to compare before/after
- PASS 3 suggestions that need human judgement appear in `DataFixingWorkspace` — user accepts or rejects each one

**AI QTI Validation (optional):**
- After export, generated XML can be sent to the `validate-qti` Edge Function
- Groq or Gemini reviews the raw QTI XML for schema compliance and structural issues
- Results shown in `AIValidationReport` with per-item issue cards and auto-fix capability

### Step 4 — AI Audit (Gate 2)

Semantic quality review by AI. This step can be skipped entirely.

- `AiAuditReviewer` component renders in split-panel layout
- **Left panel:** scrollable list of all questions with per-row status icons (pending/certified/rejected) and per-row "Audit" button
- **Right panel:** full question detail for the selected row — stem, options with correct answer highlighted, AI verdict card
- **"Audit All" button:** runs chunked batch via Gemini (50 rows per API call, sequential chunks, live progress bar)
- **Per-row "Audit" button:** runs single-row audit via Groq (faster, for spot-checks and re-audits after fixing)
- **Issues & Fix modal:** opens when a row is rejected — shows original question data, colour-coded issue cards (grammar/logic/clarity/factual), editable stem textarea, "Apply" button per issue, and an "AI Auto-Fix" button that rewrites the stem via Groq in one shot
- **Concurrency protection:** `useRef`-based lock prevents double-firing of Audit All; `try/finally` ensures loading state always clears even on API errors

### Step 5 — Configure

- Export mode: `qti-package` (ZIP with manifest) or `xml-media-folder` (flat files)
- Output format: QTI 3.0, QTI 2.1, QTI 1.2, JSON, Moodle XML, Canvas XML
- Math mode: yes / no / unsure → controls whether LaTeX is converted to MathML
- Image mode: yes / no / unsure → controls media embedding
- Optional: upload media ZIP → images are extracted and mapped to rows by filename
- Optional: upload QTI template XML → `TemplateMappingUI` maps spreadsheet columns to template placeholders → `templateXmlApplier` injects values

### Step 6 — Transform (Generate & Download)

- For each validated row: `generateQTIByVersion()` (or `generateAndValidateMCQ()` / `generateAndValidateTextEntry()`) builds the XML item
- Items assembled into: `items/*.xml` + `assessmentTest.xml` + `imsmanifest.xml` + `images/*`
- `packageBuilder.ts` packs everything into a JSZip blob → browser download
- Usage tracked in Supabase `user_usage` table (exports_count, total_questions_converted)

---

## 6. Question Types

AssessmentCore supports 7 canonical question types:

| Type | Description | Detection Method |
|------|-------------|-----------------|
| `single_choice` | MCQ — one correct answer | 2+ options, single answer token |
| `multi_select` | MSQ — multiple correct answers | Multiple answer tokens (comma/pipe separated) |
| `true_false` | Binary choice | Exactly 2 options + true/false text values |
| `text_entry` | Short answer / fill-in-blank / essay | No options, non-numeric answer |
| `numeric` | Numeric answer with optional tolerance | No options, answer parseable as number |
| `order` | Ordering / sequencing | `orderItems` column has a value |
| `unknown` | Could not detect | Fallback when all other methods fail |

**Type detection priority (in order):**
1. Explicit `type` column value → looked up in `TYPE_ALIASES` dictionary
2. `orderItems` column has a value → `order`
3. Exactly 2 options + true/false text values → `true_false`
4. Answer contains multiple tokens (comma or pipe separated) → `multi_select`
5. 2 or more options detected → `single_choice`
6. Answer is a parseable number → `numeric`
7. Fallback → `text_entry` (low confidence)

Each detected type carries a **confidence level** (high / medium / low / none) and **source** (explicit / detected), both preserved in `ValidationResult` for downstream use.

---

## 7. Validation Engine (Gate 1)

The validation engine (`questionValidator.ts`, ~2100 lines) is the heart of the system. It runs entirely in the browser — no server required.

### Per-Row Pipeline

```
normalizeRow(row, columnMapping)
  → CanonicalItem draft (stem, choices, correctResponseIdentifiers, orderItems, etc.)

detectTypeFromStructure(row, columnMapping)
  → TypeResolution { type, source, confidence }

validateWithProfile(canonicalItem, profile)
  → ValidationIssue[]

executeRules(canonicalItem, issues)          ← Rule Engine V2 (MCQ/MSQ only)
  → additional ValidationIssue[]

[after all rows]
applyDuplicateAnalysis(allResults)
  → DUPLICATE_EXACT / DUPLICATE_CONFLICT / DUPLICATE_NEAR / DUPLICATE_SUSPICIOUS issues

finalizeLegacyShape(result)
  → status, decision, categories, criticalErrors, warnings (all derived from issues[])
```

### ValidationResult Shape

```typescript
{
  rowKey: string           // "{id}#{rowNumber}" — canonical lookup key
  rowNumber: number
  status: 'valid' | 'caution' | 'rejected'
  decision: 'pass' | 'review' | 'block'
  issues: ValidationIssue[]     // SOURCE OF TRUTH — canonical list
  canonicalItem?: CanonicalItem // normalized question representation
  exportReady: boolean
  errorCount: number
  warningCount: number
}
```

### Issue Severity Model

- `block` severity → row status becomes `rejected`
- `review` severity → row status becomes `caution` (still export-eligible with warnings)

### Important Issue Codes

| Code | Severity | Meaning |
|------|----------|---------|
| `MISSING_ID` | block | Row has no explicit ID |
| `MISSING_STEM` | block | No question text |
| `SHORT_STEM` | review | Stem is fewer than 5 characters |
| `UNKNOWN_EXPLICIT_TYPE` | block | Type column value not in TYPE_ALIASES |
| `DUPLICATE_ID` | block | Same ID on multiple rows |
| `MISSING_ANSWER` | block | No correct answer specified |
| `INSUFFICIENT_OPTIONS` | block | Fewer than 2 options for MCQ/MSQ |
| `ANSWER_NOT_IN_OPTIONS` | block | Answer text/identifier cannot be matched to any option |
| `AMBIGUOUS_ANSWER_MAPPING` | block | Answer matches multiple options |
| `INVALID_ORDER_ITEMS` | block | Fewer than 2 order items |
| `ORDER_SEQUENCE_INCOMPLETE` | block | Answer doesn't cover all order items exactly once |
| `DUPLICATE_EXACT` | block | Identical row already exists in the batch |
| `DUPLICATE_CONFLICT` | block | Same stem + options, different answers |
| `DUPLICATE_NEAR` | review | Jaccard similarity ≥ 0.92 on stem tokens |
| `DUPLICATE_SUSPICIOUS` | review | Jaccard similarity ≥ 0.85 on stem tokens |

### Duplicate Detection (3-Level Fingerprinting)

| Level | Fingerprint Components | Threshold |
|-------|----------------------|-----------|
| Exact | type + normalized stem + options + order items + answers + text entry mode | 100% match |
| Conflict | type + normalized stem + options sorted + order items (different answers) | 100% structural match |
| Near | Jaccard similarity on stem token sets | ≥ 0.92 |
| Suspicious | Jaccard similarity on stem token sets | ≥ 0.85 |

**Important:** Order item sequences are **never sorted** in fingerprints — sequence order is semantically significant for ordering questions.

### Rule Engine V2 (MCQ/MSQ Layer)

A secondary declarative rule layer runs after core validation, firing only for MCQ and MSQ types. Rules are grouped into priority bands:

| Band | Priority | Examples |
|------|----------|---------|
| Structural | 0–49 | `MCQ_MIN_OPTIONS`, `MCQ_OPTION_TEXT_NOT_EMPTY` |
| Semantic | 50–79 | `MCQ_HAS_CORRECT_ANSWER`, `MCQ_ANSWER_IN_OPTIONS`, `MCQ_SINGLE_CORRECT_ONLY` |
| Fallback | 80–99 | `MSQ_EXACT_SET_MATCH` |
| Ambiguity | 100+ | `MCQ_ANSWER_TEXT_AMBIGUOUS`, `MCQ_SHOULD_BE_MSQ`, `MCQ_SUSPECT_TYPE` |

`MCQ_ANSWER_IN_OPTIONS` determines whether the answer is in **identifier mode** (when option identifiers are non-trivial, longer than a single letter/digit) or **text mode** (when identifiers are simple letters like A, B, C).

---

## 8. Data Cleaning Pipeline (Gate 1.5)

Three automated passes run when the user clicks "Clean & Fix". The pipeline lives in `dataCleaningPipeline.ts`.

### PASS 1 — Character-Level (Always Safe)

These changes are always applied, never rolled back:

| Operation | What It Does |
|-----------|-------------|
| `TRIM` | Strip leading/trailing whitespace from all text cells |
| `INVISIBLE_CHAR_REMOVAL` | Remove zero-width spaces, BOM characters |
| `LINE_BREAK_NORMALIZATION` | CRLF → LF |
| `WHITESPACE_NORMALIZATION` | Collapse multiple internal spaces (answer/option columns) |
| `DELIMITER_NORMALIZATION` | Normalize `"A , B"` → `"A,B"`, clean pipe separators |
| `QUOTE_NORMALIZATION` | Smart quotes (`"" ''`) → ASCII quotes |
| `NULL_COERCION` | Convert `"null"`, `"N/A"`, `"undefined"`, `""` → null sentinel |

### PASS 2 — Structural (With Rollback Safety)

Applied only to rejected rows. Each change is validated before committing — if the row's status would degrade, the change is rolled back:

| Operation | What It Does |
|-----------|-------------|
| `COLUMN_FALLBACK` | Use an alias column if the primary column is empty |
| `OPTION_CLEANUP` | Deduplicate option values; shift remaining options up |
| `ANSWER_ALIGNMENT` | Re-align the answer field to match cleaned option values |

### PASS 3 — Suggestions (Human-in-the-Loop)

Generates `RemediationSuggestion[]` objects rather than mutating data directly:

| Confidence | Handling |
|------------|---------|
| HIGH | Auto-applied with rollback safety — if the row would degrade, the change is reverted |
| MEDIUM | Shown in `DataFixingWorkspace` for the user to accept or reject |
| LOW | Discarded — not shown |

Suggestion types: `MISSING_ANSWER_SINGLE_OPTION`, `MISSING_ANSWER_MULTIPLE_OPTIONS`, `PLACEHOLDER_ANSWER`, `ORDER_MISMATCH`, `CASE_ALIGNMENT`, `FUZZY_MATCH`, `ANSWER_NOT_IN_OPTIONS`.

---

## 9. AI Audit Pipeline (Gate 2)

Gate 2 is a semantic quality review layer that runs after the structural validation (Gate 1) and cleaning pipeline. It checks questions for educational quality problems that rule-based logic can't detect.

### Architecture

```
Browser (AiAuditReviewer.tsx)
    │
    │  supabase.functions.invoke(...)
    │  Authorization: Bearer <jwt>
    │
    ├──► Supabase Edge Function: audit-batch  (Gemini 2.0 Flash)
    │        • Up to 50 rows per API call
    │        • Single structured prompt for the entire chunk
    │        • Returns JSON array of { rowKey, status, issues[] }
    │        • Fills skipped rows as ai_certified (safe default)
    │
    └──► Supabase Edge Function: audit-row   (Groq llama-3.1-8b-instant)
             • One row per call
             • Used for per-row re-audits after manual fixes
             • Returns { rowKey, status, issues[] }

                        │
                        │  Issues detected?
                        ▼
         Supabase Edge Function: auto-fix-stem  (Groq llama-3.1-8b-instant)
             • Takes stem + issues array
             • Returns a single rewritten stem that resolves all issues
             • temperature: 0.2, max_tokens: 256
```

### Why Two Different AI Models?

| Use Case | Model | Reason |
|----------|-------|--------|
| Audit All (batch) | Gemini 2.0 Flash | High token throughput; 50 rows in one API call avoids Groq rate limits |
| Per-row audit / re-audit | Groq llama-3.1-8b-instant | Lower latency for single requests; ideal for interactive spot-checks |
| Auto-fix stem | Groq llama-3.1-8b-instant | Short creative task; Groq's low latency gives a snappy UX |

### Issue Categories

| Category | What It Flags |
|----------|-------------|
| `grammar` | Spelling errors, punctuation mistakes, subject-verb agreement, tense inconsistency |
| `logic` | Correct answer is actually wrong; distractors are implausible or give away the answer |
| `clarity` | Ambiguous wording, double negatives, unclear what is being asked |
| `factual` | Factual claim in the stem or answer is incorrect |

### Chunking Strategy

```
N rows → split into chunks of 50
Each chunk → one Gemini API call (sequential, not parallel)
Progress callback fires after each chunk → live progress bar updates

Example: 200 rows = 4 API calls (not 200)
```

### Concurrency Protection

The "Audit All" button uses a `useRef`-based boolean lock (`isAuditingRef`) that flips synchronously before React processes any state update. This prevents a second `handleAuditAll` invocation from firing before the button visually disables — the `useState` approach alone would have a race condition window.

A `try/finally` block ensures `isAuditingAll`, `batchProgress`, and the ref are all reset even if the API call throws or times out.

### API Key Security

API keys (`GROQ_API_KEY`, `GEMINI_API_KEY`) are stored as **Supabase Secrets** and only accessible inside the Deno runtime of the Edge Functions. The browser never sees them. All calls go through `supabase.functions.invoke()` with the user's JWT for authentication.

---

## 10. Export Formats

| Format | Output | LMS Target |
|--------|--------|-----------|
| QTI 3.0 Package | ZIP: `items/*.xml` + `assessmentTest.xml` + `imsmanifest.xml` + `images/*` | Any QTI 3.0-compliant LMS |
| QTI 2.1 Package | ZIP: backward-compatible structure | Moodle, Blackboard, Sakai |
| QTI 1.2 Package | ZIP: basic support | Legacy systems |
| JSON | Structured question objects | Custom integrations |
| Moodle XML | `<quiz><question type="...">` format | Moodle LMS |
| Canvas XML | QTI rewritten with Canvas manifest compatibility | Canvas LMS |
| XML + Media Folder | Flat: `items/*.xml` + `images/*` (no manifest) | Custom / manual import |

### QTI 3.0 Package Contents

```
package.zip
├── imsmanifest.xml              — IMS content package manifest
├── assessmentTest.xml           — Test assembly (test-part, sections, item refs)
├── items/
│   ├── item_001.xml             — assessment-item: choice-interaction
│   ├── item_002.xml             — assessment-item: textEntryInteraction
│   └── ...
└── images/
    ├── question_01_fig.png
    └── ...
```

Each `assessment-item` includes:
- Interaction element (choiceInteraction, textEntryInteraction, orderInteraction)
- Response declaration (correct response mapping)
- Outcome declarations (SCORE, MAXSCORE, PASS)
- Response processing (match_correct template or partial credit)
- Modal feedback blocks (correct / incorrect / partial / hints) — optional

### Canvas Repackaging

Canvas has its own QTI manifest format. AssessmentCore handles this in two ways:
1. **Direct export:** BatchCreator → "Canvas XML" option → `convertToCanvasXML()` in `lmsConverters.ts`
2. **Post-export fix:** `/workspace/lms-export` page — upload any existing QTI ZIP → `canvasPackageFixer.ts` rewrites the manifest → download Canvas-ready ZIP

---

## 11. Authentication & Access Control

### Auth Provider

Supabase Auth (email + password, JWT sessions). Sessions are stored by the Supabase SDK and auto-refreshed.

### Database Tables

| Table | Purpose |
|-------|---------|
| `user_profiles` | Display name, email |
| `user_usage` | `exports_count`, `total_questions_converted`, `is_unlimited`, `batch_creator_access` |

### Access Tiers

| Tier | Quota | How Unlocked |
|------|-------|-------------|
| Free | 100 questions / month | Default on registration |
| Unlimited | No quota | `is_unlimited = true` (paid plan) |
| Batch Creator | Full BatchCreator access | `batch_creator_access = true` via token redemption |

### Session Handling

- All Supabase client requests have a **5-second timeout** to prevent hanging on misconfiguration
- JWT is passed as `Authorization: Bearer <token>` in Edge Function calls
- `AuthContext.tsx` exposes `user`, `userProfile`, `userUsage` across the app

---

## 12. Column Detection Logic

`fileParser.ts` auto-detects column mappings from spreadsheet headers using alias lists and scoring:

| Field | Recognized Column Names |
|-------|------------------------|
| Question (stem) | `question`, `title`, `stem`, `prompt`, `text`, `q` |
| Answer | `answer`, `correct`, `key`, `correct_answer` |
| Options | `optionA`–`optionH`, `optA`–`optH`, `choiceA`–`choiceH`, bare `A`–`H`, `option1`–`option8` |
| Type | `type`, `question_type`, `qtype` |
| Order items | `order_items`, `ordering_items`, `sequence_items`, `arrange_items` *(preferred)* |
| Image | `image`, `img`, `picture`, `media` |
| Feedback | `feedback`, `explanation`, `rationale` |
| ID | `id`, `question_id`, `qid` |

**Priority rule for order items:** Payload columns (`order_items`, `ordering_items`) take priority over generic names (`order`, `sequence`). This prevents an unrelated metadata column like "Display Order" from overriding the actual order items column.

---

## 13. Math & Image Support

### Math (LaTeX → MathML)

- `containsMath` flag in Configure step: `yes` / `no` / `unsure`
- When enabled: `mathmlConverter.ts` processes each question stem with `processXmlMath()`
- LaTeX inline (`$...$`) and block (`$$...$$`) → converted to sanitized MathML using KaTeX
- MathML is embedded directly in QTI XML for LMS compatibility
- `MathMLRenderer.tsx` provides live preview rendering in the UI (KaTeX → HTML)

### Images

Two workflows:

**Workflow A — Media ZIP upload:**
1. User uploads a ZIP alongside the spreadsheet
2. `mediaUtils.extractMediaZip()` extracts all image files
3. `uploadMediaFilesToSupabase()` uploads them to Supabase Storage → public URLs
4. URLs are injected into the `image` column of the corresponding rows
5. Images are embedded in QTI XML as `<img>` tags and packaged in the ZIP

**Workflow B — XML + Media Folder mode:**
1. Export mode: `xml-media-folder`
2. Images are referenced by relative path in the XML
3. No manifest generated — suitable for manual import workflows

---

## 14. QTI Template Workflow

For teams that already have a QTI template XML and want to populate it with spreadsheet data:

1. User uploads a QTI template XML file
2. `templateFieldExtractor.ts` parses the XML and finds all placeholder tokens (e.g. `{{QUESTION_TEXT}}`, `{{OPTION_A}}`)
3. `TemplateMappingUI` lets the user map each spreadsheet column to a placeholder
4. For each row: `templateXmlApplier.ts` clones the template and injects the row values
5. The filled XML items are packaged into the output ZIP

---

## 15. Key Invariants

These rules must never be violated:

1. `result.issues[]` is the **canonical source of truth** for all validation results — never read `criticalErrors` or `warnings` as primary (they are derived from `issues[]` for legacy UI compatibility only)
2. `columnMapping.orderCol` is the **only read path** for order items — never ad-hoc re-read row columns
3. Order item sequences are **never sorted** in exact duplicate fingerprints — sequence order is semantically significant
4. Row key format is always `"{id}#{1-based-index}"` — this key is used for all Map lookups throughout the system
5. Every row in `editedRows` always has `__rowKey` attached — set by `ensureInternalRowKeys()` after parsing
6. PASS 2 always rolls back if a row's validation status would degrade after structural changes
7. MEDIUM confidence PASS 3 suggestions are **never auto-applied** — only shown for human decision in `DataFixingWorkspace`
8. AI API keys are **never in the browser** — only in Supabase Edge Function secrets

---

## 16. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BROWSER (React SPA)                          │
│                                                                     │
│  Excel / CSV                                                        │
│      │                                                              │
│      ▼                                                              │
│  fileParser.ts ──────────────────────────────────────────────────► │
│  (rows + columnMapping)                                             │
│      │                                                              │
│      ▼                                                              │
│  questionValidator.ts (Gate 1)                                      │
│  ├── normalizeRow → CanonicalItem                                   │
│  ├── detectTypeFromStructure → TypeResolution                       │
│  ├── validateWithProfile → issues[]                                 │
│  ├── validationRuleEngine (V2) → more issues                        │
│  └── applyDuplicateAnalysis → duplicate issues                      │
│      │                                                              │
│      ▼                                                              │
│  ValidationReport (UI review + inline edit)                         │
│      │                                                              │
│      ▼                                                              │
│  dataCleaningPipeline (PASS 1+2+3)                                  │
│  └── DataFixingWorkspace (PASS 3 manual fixes)                      │
│      │                                                              │
│      ▼                                                              │
│  AiAuditReviewer (Gate 2)                                           │
│  ├── auditBatch() ──────────────────────────────────────────────►  │
│  │       │                                                Supabase  │
│  │       └──► audit-batch Edge Function (Gemini 2.0 Flash)         │
│  │                   ▲ GEMINI_API_KEY (secret, server-side)         │
│  │                                                                  │
│  ├── auditRow() ────────────────────────────────────────────────►  │
│  │       │                                                Supabase  │
│  │       └──► audit-row Edge Function (Groq llama-3.1-8b)          │
│  │                   ▲ GROQ_API_KEY (secret, server-side)           │
│  │                                                                  │
│  └── autoFixStem() ────────────────────────────────────────────►   │
│          │                                                Supabase  │
│          └──► auto-fix-stem Edge Function (Groq llama-3.1-8b)      │
│                      ▲ GROQ_API_KEY (secret, server-side)           │
│      │                                                              │
│      ▼                                                              │
│  Configure (export format, LMS target, media, template)             │
│      │                                                              │
│      ▼                                                              │
│  QTI Engine (engine/qti3/)                                          │
│  ├── mcqItemBuilder → assessment-item XML                           │
│  ├── textEntryItemBuilder → assessment-item XML                     │
│  ├── testBuilder → assessmentTest.xml                               │
│  ├── manifestBuilder → imsmanifest.xml                              │
│  └── packageBuilder → JSZip                                         │
│      │                                                              │
│      ▼                                                              │
│  Browser download (.zip / .xml / .json)                             │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│  Supabase Auth   — sessions, JWT                                    │
│  Supabase DB     — user_profiles, user_usage                        │
│  Supabase Storage— uploaded images → public URLs                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 17. Edge Functions Reference

| Function Name | Runtime | AI Model | Purpose | Input | Output |
|--------------|---------|---------|---------|-------|--------|
| `validate-qti` | Deno | Groq / Gemini (configurable) | Validate generated QTI XML for schema compliance | QTI XML string + question context | Array of XML issues |
| `auto-fix-qti` | Deno | Groq / Gemini | Rewrite non-compliant QTI XML | Broken XML + issues | Fixed XML string |
| `audit-row` | Deno | Groq `llama-3.1-8b-instant` | Single-row semantic quality audit | `{ rowKey, questionType, stem, choices, correctResponseIdentifiers, orderItems?, numericAnswer? }` | `{ rowKey, status, issues[] }` |
| `audit-batch` | Deno | Gemini 2.0 Flash | Bulk semantic audit (up to 50 rows) | `{ rows: BatchRow[] }` | `{ results: RowAuditResult[] }` |
| `auto-fix-stem` | Deno | Groq `llama-3.1-8b-instant` | Rewrite a question stem to fix all detected issues | `{ stem, questionType, choices, correctResponseIdentifiers, issues[] }` | `{ fixedStem: string }` |

All Edge Functions:
- Run in the Deno runtime on Supabase infrastructure
- Read API keys from Supabase Secrets (never from environment variables set by the client)
- Use a 3-tier JSON parse fallback: direct parse → strip markdown fences → regex extraction
- Return graceful fallback responses (never HTTP 500) — errors are surfaced as structured results

---

## 18. Known Limitations & Design Decisions

| Topic | Decision | Reason |
|-------|----------|--------|
| Groq rate limits | Batch audit uses Gemini, not Groq | Groq free tier hits rate limits at ~5 rows/minute; Gemini handles 50 rows per call |
| Gemini quota | Separate `GEMINI_API_KEY` for audit vs. QTI validation recommended | Shared key can exhaust quota across both features simultaneously |
| Duplicate API key | `GEMINI_API_KEY` used by both `validate-qti` and `audit-batch` | Generate a dedicated key from Google AI Studio for each function in production |
| Browser-side validation | Gate 1 runs entirely in the browser | Avoids server round-trips; keeps the tool usable offline/on slow connections for the validation step |
| No auto-sort on order types | Order item fingerprints are never sorted | Sequence order is semantically meaningful for ordering questions |
| PASS 3 is suggestions-only (MEDIUM) | Never auto-applies medium-confidence fixes | Prevents silent data mutation; user must approve ambiguous changes |
| `useRef` concurrency lock | Synchronous ref instead of state for the audit lock | `useState` is async — a state-based guard has a race window before React re-renders |
