# AssessmentCore — System Design

This document provides a comprehensive technical overview of the AssessmentCore system, designed to allow a new team of developers to understand and build the system from scratch.

## 1. System Overview

**AssessmentCore** is a cloud-based SaaS platform that automates the creation, validation, and deployment of educational assessment questions across multiple Learning Management Systems (LMS). It takes raw question banks (in Excel/CSV formats), applies rigorous structural/semantic validation, audits them with AI, and exports standard QTI 3.0 packages tailored for platforms like Canvas, Moodle, and Blackboard.

## 2. Color Palette & Theming (Tailwind CSS)

The system uses a custom design system with both Light and Dark themes, grounded in a neutral scale but featuring distinct accent colors for success/warning/destructive actions. 

### Light Theme Variables
- **Backgrounds:** `--background` `#F8FAFC`, `--card` `#FFFFFF`, `--popover` `#FFFFFF`, `--muted` `#F1F5F9`, `--workspace-bg` `#F8FBFF`
- **Text:** `--foreground` `#111827`, `--muted-foreground` `#64748B`
- **Primary:** `--primary` `#000000`, `--primary-foreground` `#FFFFFF`
- **Secondary:** `--secondary` `#64748B`, `--secondary-foreground` `#F8FAFC`
- **Accent:** `--accent` `#E0F0FF`, `--accent-foreground` `#0B5A9A` (Core Brand Color)
- **Status Colors:**
  - Success: `#16A34A` (Light: `#F0FDF4`)
  - Warning: `#EA580C` (Light: `#FFF7ED`)
  - Destructive: `#DC2626` (Light: `#FEF2F2`)
- **Borders:** `--border` `#E2E8F0`, `--border-light` `#F1F5F9`

### Typography
- **Sans-serif:** `"Archivo", "Segoe UI", Roboto...` (Used for UI text, headings)
- **Monospace:** `"Roboto Mono", ui-monospace...` (Used for code blocks, raw data views)
- **Base Size:** 16px

## 3. Functionalities & Features

1. **Intelligent File Parsing:** Parses Excel and CSV files via `xlsx` and `papaparse`. Automatically detects and maps columns to system fields (Stem, Options, Correct Answer, Question Type).
2. **OCR Data Extraction:** An integrated OCR Processor (`OCRProcessor.tsx` & `ocrService.ts`) handles raw image/PDF uploads. It extracts structured questions, options, and latex math equations, then forwards the results to the Supabase storage bucket (`ocr-exports`) and database (`ocr_history`) for seamlessly bridging to the Batch Creator.
3. **Gate 1 Validation (Structural & Semantic):** Validates uploaded rows against 25+ deterministic rules (e.g., matching options count, missing stems, duplicate detection using dual-fingerprinting).
4. **3-Pass Cleaning Pipeline:** Pure logic, deterministic character-level fixes, structural alignments, and actionable suggestions to format messy spreadsheet data without AI hallucinations.
5. **Gate 2 Validation (AI Audit):** Optional phase powered by Groq and Google Gemini to review semantic logic, grammar, clarity, and factual accuracy. Additionally handles generative "auto-fix" suggestions.
6. **QTI 3.0 Generation Engine:** Converts parsed data into standard QTI XML, supporting 7 question types (MCQ, MSQ, True/False, Text Entry, Numeric, Ordering, Unknown).
7. **LMS Repackaging:** Takes the QTI XML and repackages the ZIP structure to precisely meet Canvas, Moodle, or Blackboard requirements.
8. **Multiple Export Formats:** The system can export to standardized QTI packages, direct flat JSON structure (`validate-json-output`), or LMS-specific repackaged XML.
9. **Auth & Workspaces:** Powered by Supabase Auth (Email/Password, OTP). Users have private workspaces with quota and usage tracking, upgrading to Pro/Enterprise plans when free quotas have been exhausted.
10. **Math & Media:** Renders LaTeX formulas to MathML via KaTeX/MathJax. Manages embedded media using Supabase Storage mapping assets intelligently to question text.

## 4. The Batch Creator & Document Pipeline

The core component of the app is the **Batch Creator** (`BatchCreator.tsx`), functioning as a multi-step wizard. Here is how each stage operates and communicates with the others including the preceding document analysis step:

### Stage 0: OCR Extraction (Pre-Pipeline)
- **Input:** User uploads a PDF or Image containing raw unformatted questions.
- **Process:** Managed by `OCRProcessor.tsx`. `ocrService.ts` extracts raw text, math arrays (LaTeX), tabular data, and structured multi-choice components.
- **Output:** Transforms unstructured image data into an intermediate format (OCRResult).
- **Communication:** The data is pushed to Supabase (`ocr-exports` Bucket and tracked in `ocr_history` table). It provides a hand-off point directly to Stage 1. Output acts directly as `ParsedRow[]` data simulating a CSV upload.

### Stage 1: Upload & Parse
- **Input:** User drops a CSV or Excel file (or accepts Hand-off from Stage 0).
- **Process:** The file is handed to `fileParser.ts`. The parser reads the headers, infers semantic meaning (e.g., "Q Text" = Stem), and generates an array of normalized objects (`ParsedRow[]`).
- **State Transition:** The parsed mapped configuration is passed to the Validation engine.

### Stage 2: Gate 1 Validation
- **Input:** Internal mapped data configuration (`ParsedRow[]`).
- **Process:** Passed into the `questionValidator.ts`. This engine runs the data through `validationRuleEngine.ts` checking for:
  - Empty required fields.
  - Correct answers matching provided options.
  - Duplicate detection.
- **Output:** A structured `ValidationReport` mapping row indexes to Error/Warning states.
- **Communication:** The UI renders `ValidationReport.tsx`, allowing users to manually edit invalid fields in a data-grid. Edits trigger re-validation for the specific row.

### Stage 3: Clean & Fix (3-Pass Pipeline)
- **Input:** Validation report containing structural issues.
- **Process:** Handled by `dataCleaningPipeline.ts`.
  - *Pass 1:* Character-level fixes (stripping weird whitespace, fixing quotes).
  - *Pass 2:* Structural alignment (removing numbering prefixes like "A)", "1." from options).
  - *Pass 3:* Deterministic suggestions (generating fix proposals based on rules).
- **Communication:** The UI presents a split view (Raw vs. Cleaned). The user accepts/rejects changes. Data is updated in the central React state.

### Stage 4: Gate 2 AI Audit (Optional)
- **Input:** Structurally clean data rows.
- **Process:** Data batches (up to 50 rows) are sent to Supabase Edge Functions (`audit-batch` or `audit-row`), which forward prompts to Gemini/Groq LLMs.
- **Output:** JSON objects outlining grammar flags, logic inconsistencies, and suggested rewrites.
- **Communication:** Flags are loaded into `AiAuditReviewer.tsx`. User reviews have the option to apply LLM-suggested fixes. The modified row state is updated in memory.

### Stage 5: QTI Generation & LMS Export
- **Input:** Final, validated, and approved `ParsedRow[]` data.
- **Process:** 
  1. Forwarded to `qtiConverter.ts` which routes each item to the appropriate builder in `src/engine/qti3/` (e.g., `mcqItemBuilder.ts`).
  2. The system generates XML for each question, a manifest (`manifestBuilder.ts`), and packages it all via `jszip` (`packageBuilder.ts`).
  3. The resulting QTI package is then passed through `lmsConverters.ts` (e.g., `canvasPackageFixer.ts`) to mutate the manifest and structure for target LMS compatibility.
- **Output:** A downloadable `.zip` file triggered via browser Blob download.

## 5. Sub-Systems & Services

Behind the sequential pipeline are discrete, isolated services that manage data orchestration:

- **AI Validation Service (`aiValidationService.ts`)**: Proxies batch API requests to Supabase Edge Functions (`validate-qti`, `auto-fix-qti`) wrapping LLM keys securely to ensure Groq/Gemini calls remain untampered.
- **OCR Service (`ocrService.ts`)**: Manages the API calls that convert visual blocks to question arrays and captures math expressions.
- **Media Upload Service (`mediaUploadService.ts`)**: Synchronizes embedded images in questions. Validates limits, uploads blobs directly to Supabase Storage, retrieves RLS-protected URLs, and appends them back to the `ParsedRow` reference strings so QTI builders (`packageBuilder.ts`) can package them into the final ZIP without breaking XML links.
- **Generation Service (`generationService.ts`)**: Acts as a router traversing the AST to apply QTI 1.2, 2.1, or 3.0 specs according to user selection. Coordinates builders (e.g. `mcqItemBuilder.ts`, `textEntryItemBuilder.ts`) and uses KaTeX to bridge `mathmlConverter.ts` inside XML nodes.

## 6. Data Modeling & Database Structure (Supabase PostgreSQL)

All database operations enforce **Row Level Security (RLS)** ensuring tenant isolation.

1. **`user_profiles`**: Tracks identical identities from Supabase Auth (`id`, `email`, `full_name`).
2. **`user_usage`**: Keeps a toll on the user's batch operations (`exports_count`), creating a hard boundary to upgrade users (`PricingPage.tsx`) after the initial quota is utilized.
3. **`ocr_history`**: Maintains ledger items of extraction actions mapping extracted documents inside `ocr-exports` buckets explicitly to an isolated user ID.

## 7. System Technology Stack

- **Frontend:** React 18+, TypeScript 5+, React Router 7, Vite 6+, Tailwind CSS 4+, Radix/shadcn ui.
- **Backend/API:** Supabase Edge Functions (Deno).
- **Database / Auth / Storage:** PostgreSQL (Supabase tables/RLS), Supabase Auth, Storage Buckets (e.g. `ocr-exports`).
- **AI Providers:** Groq (fast single operations), Gemini 2.0 Flash (batch operations).
- **Utilities:** `xlsx`, `papaparse` (file reading), `jszip` (packaging), `katex`/`mathjax` (MathML conversion), `ExcelJS` (annotated sheet returns).

This document serves as the foundational blueprint for understanding what AssessmentCore is, its look and feel, feature set, its modular sub-services, and the state-machine execution flow of its primary Batch Creator feature.