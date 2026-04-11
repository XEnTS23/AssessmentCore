# AssessmentCore — Comprehensive System Design

**Version:** 1.0  
**Last Updated:** April 2026  
**Audience:** Educators, LMS administrators, technical stakeholders, investors, and development teams

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Problem Statement & Value Proposition](#problem-statement--value-proposition)
3. [System Overview](#system-overview)
4. [Technology Stack](#technology-stack)
5. [Architecture](#architecture)
6. [User Journey & Workflows](#user-journey--workflows)
7. [Core Systems](#core-systems)
   - [Validation Engine (Gate 1)](#validation-engine-gate-1)
   - [Cleaning Pipeline](#cleaning-pipeline)
   - [AI Audit System (Gate 2)](#ai-audit-system-gate-2)
   - [QTI Generation Engine](#qti-generation-engine)
   - [Export & LMS Compatibility](#export--lms-compatibility)
8. [Data Models](#data-models)
9. [Authentication & Access Control](#authentication--access-control)
10. [Performance & Scalability](#performance--scalability)
11. [Security](#security)
12. [Integration Points](#integration-points)
13. [Deployment & Infrastructure](#deployment--infrastructure)

---

## Executive Summary

**AssessmentCore** is a cloud-based SaaS platform that automates the creation, validation, and deployment of educational assessment questions across multiple Learning Management Systems (LMS). 

### The Problem It Solves

Educators and content teams maintain question banks in spreadsheets, but these spreadsheets are inherently messy:
- Missing or incomplete fields (stems, answers, options)
- Inconsistent formatting and delimiters
- Duplicate or near-duplicate questions
- Incorrect answer mappings
- Grammar and factual errors
- Incompatible with LMS import requirements

Manually cleaning thousands of rows before uploading to an LMS takes days and introduces human error.

### The Solution

AssessmentCore provides a complete, automated pipeline:
1. **Upload** Excel/CSV files
2. **Validate** using structural and semantic rules
3. **Clean & Fix** automatically with a 3-pass pipeline
4. **Audit** using AI for grammar, logic, and factual accuracy
5. **Export** as standards-compliant QTI 3.0 packages
6. **Deploy** directly to Canvas, Moodle, Blackboard, or other LMS platforms

### Key Capabilities

✅ Supports 7 question types (MCQ, MSQ, True/False, Text Entry, Numeric, Ordering, Unknown)  
✅ Auto-detects column mapping from headers  
✅ Validates 25+ structural and semantic rules  
✅ 3-pass deterministic cleaning pipeline (no AI, pure logic)  
✅ AI semantic audit (grammar, logic, clarity, factual accuracy)  
✅ QTI 3.0 standards-compliant output  
✅ LMS-specific repackaging (Canvas, Moodle, Blackboard)  
✅ Batch processing (1 to 10,000+ rows)  
✅ Media embedding and asset management  
✅ Template-based question generation  
✅ Per-user quota and usage tracking  
✅ Role-based access control via Supabase Auth

---

## Problem Statement & Value Proposition

### The Current Pain Points

1. **Time-Consuming Manual Work**
   - Educators spend hours formatting and validating question data manually
   - Spreadsheet-based workflows are error-prone and repetitive
   - No real-time feedback on data quality

2. **Structural Incompatibilities**
   - Question banks aren't in LMS-compatible formats
   - Manual XML creation is complex and rarely done correctly
   - Re-importing into new LMS platforms requires full rework

3. **Duplicate & Quality Issues**
   - Exact duplicates go undetected in large spreadsheets
   - Near-duplicates and conflicting questions aren't flagged
   - Grammar and factual errors slip through

4. **Format Fragmentation**
   - Different LMS platforms require different XML formats (QTI, Moodle, Canvas)
   - Maintaining multiple versions is impractical
   - Learning curve is steep for each platform's requirements

### The Value Add

**For Educators:**
- Spend minutes, not hours, validating and exporting question banks
- Get automated grammar and factual review via AI
- Deploy instantly to multiple LMS platforms
- Reduce error rates from manual entry

**For Institutions:**
- Scale question bank creation and maintenance
- Ensure quality assurance through automated validation
- Reduce time-to-deployment for courses
- Maintain a clean, deduplicated content library

**For Technical Teams:**
- Open standards (QTI 3.0, IMS Manifest)
- Programmatic API for batch operations
- Full audit trail via database logging
- Zero vendor lock-in

---

## System Overview

### What AssessmentCore Does

**In = Excel/CSV files**  
**Process = Validate → Clean → Audit → Generate → Package**  
**Out = TstandARDS-compliant QTI ZIP ready for any LMS**

### High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    USER UPLOADS FILE                        │
│                   (Excel or CSV)                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │  FILE PARSING & COLUMN     │
        │     DETECTION (Auto)       │
        └────────────┬───────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │ GATE 1: VALIDATION         │
        │  (Structural + Semantic)   │
        │  25+ rule checks           │
        │  Duplicate detection       │
        └────────────┬───────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │  GATE 2: AI AUDIT          │
        │  (Optional)                │
        │  Grammar, Logic, Clarity   │
        │  Factual Accuracy          │
        └────────────┬───────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │   3-PASS CLEANING          │
        │  Character-level fixes     │
        │  Structural alignment      │
        │  Suggestion generation     │
        └────────────┬───────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │  QTI GENERATION            │
        │  (QTI 3.0 / 2.1 / 1.2)     │
        │  Per-question XML          │
        │  Assessment test structure │
        │  Manifest + packaging      │
        └────────────┬───────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │  LMS-SPECIFIC REPACKAGING  │
        │  (Canvas, Moodle, etc.)    │
        └────────────┬───────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │   DOWNLOAD ZIP             │
        │  Ready for LMS Import      │
        └────────────────────────────┘
```

---

## Technology Stack

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Frontend Framework** | React | 18+ | UI component rendering |
| **Language** | TypeScript | 5.0+ | Type-safe frontend code |
| **Build Tool** | Vite | 6+ | Fast dev server, optimized builds |
| **Routing** | React Router | 7+ | Client-side navigation |
| **UI Components** | shadcn/ui + Radix UI | Latest | Accessible, styled primitives |
| **Styling** | Tailwind CSS | 4+ | Utility-first CSS |
| **State** | React Context + Hooks | N/A | Application state management |
| **HTTP Client** | Supabase JS Client | Latest | API calls to backend |
| **Auth** | Supabase Auth | PostgreSQL native | User login, signup, session management |
| **Database** | PostgreSQL | 14+ | User profiles, usage tracking |
| **File Parsing** | XLSX (SheetJS), PapaParse | Latest | Excel and CSV parsing |
| **File Format Export** | JSZip | Latest | Create ZIP packages |
| **Excel Export** | ExcelJS | Latest | Generate annotated XLSX reports |
| **Math Rendering** | KaTeX, MathJax | 0.16, 4.1 | LaTeX → HTML/MathML conversion |
| **AI — Semantic Audit** | Groq + Gemini | Latest | LLM-based quality review |
| **API Orchestration** | Supabase Edge Functions | Deno | Serverless function execution |
| **Deployment** | Vercel | N/A | Frontend hosting |
| **CDN** | Vercel Edge Network | N/A | Global content delivery |

### Key Dependencies

```json
{
  "react": "^18.x",
  "typescript": "^5.x",
  "vite": "^6.x",
  "react-router-dom": "^7.x",
  "tailwindcss": "^4.x",
  "@radix-ui/*": "latest",
  "shadcn-ui": "latest",
  "@supabase/supabase-js": "latest",
  "xlsx": "^0.18.x",
  "papaparse": "^5.x",
  "jszip": "^3.x",
  "exceljs": "^4.x",
  "katex": "^0.16.x",
  "mathjax": "^4.1.x"
}
```

---

## Architecture

### High-Level Component Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      USER BROWSER                            │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              React Application (SPA)                   │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │                                                        │  │
│  │  Pages:                                               │  │
│  │  ├─ Landing Page                                      │  │
│  │  ├─ Auth Pages (Register, Login, Verify, Reset)      │  │
│  │  └─ Workspace                                         │  │
│  │     ├─ BatchCreatorPage (MAIN TOOL)                  │  │
│  │     ├─ QTI Renderer                                   │  │
│  │     ├─ LMS Export (Canvas repackager)                │  │
│  │     └─ Validation Dashboard                           │  │
│  │                                                        │  │
│  │  Components:                                          │  │
│  │  ├─ ValidationReport (editable table)                │  │
│  │  ├─ AiAuditReviewer (Gate 2 UI)                      │  │
│  │  ├─ DataFixingWorkspace (manual fixes)               │  │
│  │  ├─ TemplateMappingUI (template placeholder mapper)  │  │
│  │  └─ MathMLRenderer (formula preview)                 │  │
│  │                                                        │  │
│  │  Services:                                            │  │
│  │  ├─ File Parsing (XLSX, CSV, Column detection)       │  │
│  │  ├─ Validation (Gate 1: 25+ rules, dual fingerprint) │  │
│  │  ├─ Cleaning (3-pass pipeline)                       │  │
│  │  ├─ QTI Generation (MCQ, MSQ, Text Entry, etc.)      │  │
│  │  └─ Media Handling (image extraction, URLs)          │  │
│  │                                                        │  │
│  │  Contexts:                                            │  │
│  │  └─ AuthContext (user, session, profile)             │  │
│  │                                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                              │                                │
└──────────────────────────────┼────────────────────────────────┘
                               │
                    (HTTPS REST API)
                               │
┌──────────────────────────────┼────────────────────────────────┐
│                         SUPABASE                              │
├──────────────────────────────┼────────────────────────────────┤
│                              ▼                                │
│  ┌────────────────────────────────────────┐                 │
│  │      Authentication & Session          │                 │
│  │  (Email/Password, OTP Verification)    │                 │
│  └────────────────────────────────────────┘                 │
│                              │                                │
│  ┌────────────────────────────────────────┐                 │
│  │      PostgreSQL Database               │                 │
│  │  ├─ user_profiles                      │                 │
│  │  ├─ user_usage (quota tracking)        │                 │
│  │  └─ RLS Policies (data isolation)      │                 │
│  └────────────────────────────────────────┘                 │
│                              │                                │
│  ┌────────────────────────────────────────┐                 │
│  │    Edge Functions (Deno Runtime)       │                 │
│  │  ├─ validate-qti                       │                 │
│  │  ├─ auto-fix-qti                       │                 │
│  │  ├─ audit-row                          │                 │
│  │  ├─ audit-batch                        │                 │
│  │  └─ auto-fix-stem                      │                 │
│  └────────────────────────────────────────┘                 │
│                              │                                │
│  ┌────────────────────────────────────────┐                 │
│  │    Storage (Image/Media Bucket)        │                 │
│  │  ├─ Public URLs for media assets       │                 │
│  │  └─ RLS for user isolation             │                 │
│  └────────────────────────────────────────┘                 │
│                                                               │
└──────────────────────────────────────────────────────────────┘
                               │
                    (API Calls: Groq, Gemini)
                               │
┌──────────────────────────────┼────────────────────────────────┐
│                     EXTERNAL APIs                             │
├──────────────────────────────┼────────────────────────────────┤
│                              ▼                                │
│  ┌────────────────────────────────────────┐                 │
│  │  Groq Cloud (LLM)                      │                 │
│  │  ├─ Semantic audit (single row)        │                 │
│  │  ├─ QTI XML validation                 │                 │
│  │  └─ Stem auto-fix                      │                 │
│  └────────────────────────────────────────┘                 │
│                                                               │
│  ┌────────────────────────────────────────┐                 │
│  │  Google Gemini 2.0 Flash                │                 │
│  │  ├─ Batch audit (up to 50 rows)        │                 │
│  │  └─ QTI XML validation                 │                 │
│  └────────────────────────────────────────┘                 │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
AssessmentCore/
├── src/
│   ├── app/
│   │   ├── pages/
│   │   │   ├── LandingPage.tsx
│   │   │   ├── auth/
│   │   │   │   ├── RegisterPage.tsx
│   │   │   │   ├── LoginPage.tsx
│   │   │   │   ├── VerifyEmailPage.tsx
│   │   │   │   └── ResetPasswordPage.tsx
│   │   │   └── workspace/
│   │   │       ├── WorkspaceLayout.tsx (shell with auth guard)
│   │   │       ├── BatchCreator.tsx (MAIN TOOL, ~4500 lines)
│   │   │       ├── QTIRenderer.tsx
│   │   │       ├── LMSExportPage.tsx
│   │   │       └── ValidationDashboardPage.tsx
│   │   │
│   │   ├── components/
│   │   │   ├── ValidationReport.tsx (editable results table)
│   │   │   ├── ValidationReportOptimized.tsx (virtualized variant)
│   │   │   ├── AiAuditReviewer.tsx (Gate 2 audit UI)
│   │   │   ├── DataFixingWorkspace.tsx (manual fix UI)
│   │   │   ├── AIValidationReport.tsx (display AI issues)
│   │   │   ├── ValidationDashboard.tsx (metrics overview)
│   │   │   ├── MathMLRenderer.tsx (formula preview)
│   │   │   ├── TemplateMappingUI.tsx (column mapping)
│   │   │   └── ui/ (shadcn/Radix primitives)
│   │   │
│   │   └── utils/
│   │       ├── fileParser.ts (Excel/CSV → rows+mapping)
│   │       ├── questionValidator.ts (Gate 1: ~2100 lines)
│   │       ├── validationRuleEngine.ts (declarative rules)
│   │       ├── dataCleaningPipeline.ts (3-pass cleaning)
│   │       ├── chunkedValidator.ts (progress wrapper)
│   │       ├── qtiConverter.ts (routes to correct builder)
│   │       ├── lmsConverters.ts (Moodle, Canvas XML)
│   │       ├── canvasPackageFixer.ts (Canvas repackaging)
│   │       ├── templateXmlApplier.ts (placeholder injection)
│   │       ├── mathmlConverter.ts (LaTeX → MathML)
│   │       ├── mediaUtils.ts (image extraction, URLs)
│   │       └── placeholderHandler.ts (find/replace placeholders)
│   │
│   ├── contexts/
│   │   └── AuthContext.tsx (user, session, auth methods)
│   │
│   ├── services/
│   │   ├── supabaseClient.ts (client initialization)
│   │   ├── authService.ts (signup, login, OTP, password)
│   │   ├── batchCreatorService.ts (quota management)
│   │   ├── aiValidationService.ts (Edge Function calls)
│   │   ├── rowAuditService.ts (Gate 2 audit API)
│   │   └── mediaUploadService.ts (image upload)
│   │
│   ├── engine/ (QTI XML generation)
│   │   ├── index.ts
│   │   ├── generationService.ts (routes by version)
│   │   ├── types.ts (Question, QuestionBuilder types)
│   │   ├── builders/
│   │   │   ├── qti12/ (QTI 1.2 MCQ, TextEntry)
│   │   │   └── qti21/ (QTI 2.1 MCQ, TextEntry)
│   │   └── qti3/ (PRIMARY: QTI 3.0 full implementation)
│   │       ├── mcqItemBuilder.ts
│   │       ├── textEntryItemBuilder.ts
│   │       ├── responseProcessingBuilder.ts
│   │       ├── outcomeMapper.ts
│   │       ├── feedbackBuilder.ts
│   │       ├── testBuilder.ts
│   │       ├── manifestBuilder.ts
│   │       ├── packageBuilder.ts
│   │       ├── resourceRegistry.ts
│   │       └── metadataMapper.ts
│   │
│   ├── types/
│   │   └── auth.ts (AuthResponse, UserProfile, etc.)
│   │
│   └── styles/ (Tailwind CSS global styles)
│
├── supabase/
│   └── functions/
│       ├── validate-qti/ (Groq/Gemini QTI validation)
│       ├── auto-fix-qti/ (AI QTI rewrite)
│       ├── audit-row/ (single-row semantic audit)
│       ├── audit-batch/ (bulk audit, up to 50 rows)
│       └── auto-fix-stem/ (stem rewrite)
│
├── docs/
│   ├── DATABASE_SETUP.sql (schema + RLS)
│   ├── AUTH_IMPLEMENTATION_GUIDE.md
│   ├── FEATURE_IMPLEMENTATION_SUMMARY.md
│   └── TESTING_GUIDE.md
│
├── public/ (static assets)
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── package.json
└── .env.example (template for secrets)
```

---

## User Journey & Workflows

### Complete User Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. LANDING PAGE                                             │
│    • Marketing copy                                          │
│    • Call-to-action: "Sign Up" or "Login"                   │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────┐
        │ 2. REGISTER (if new user)           │
        │    • Email + Name + Password        │
        │    • Password validation            │
        │    • Create account in Supabase     │
        │    • Send OTP to email              │
        └─────────────┬───────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────────────┐
        │ 3. VERIFY EMAIL (OTP confirmation)  │
        │    • Enter 6-digit code             │
        │    • Email confirmed                │
        │    • Account activated              │
        └─────────────┬───────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────────────┐
        │ 4. LOGIN                            │
        │    • Email + Password               │
        │    • Session created                │
        │    • Redirect to workspace          │
        └─────────────┬───────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────────────────────────────┐
        │ 5. WORKSPACE - BATCH CREATOR (MAIN TOOL)            │
        │    Multi-step wizard workflow                        │
        └─────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┴───────────────────────────────────────┐
        │                                                       │
        ▼                                                       ▼
   StEP 1: UPLOAD                                     STEP 2: VALIDATION
   ├─ Drop Excel/CSV                                 ├─ Auto-detect columns
   ├─ Parse file                                      ├─ Validate all rows
   ├─ Auto-detect columns                             ├─ Review results
   ├─ Show preview                                    ├─ Download reports
   └─ Click "Proceed"                                 └─ Click "Continue"
        │                                                    │
        └─────────────────────────────────────────────────┬──┘
                                                          │
                                                          ▼
   STEP 3: CLEAN & FIX (Optional)
   ├─ Review validation results
   ├─ (Optional) Run 3-pass cleaning pipeline
   ├─ View "Raw" vs "Clean" comparison
   ├─ Accept/reject PASS 3 suggestions
   └─ Click "Continue"
       │
       ▼
   STEP 4: AI AUDIT (Optional, can skip)
   ├─ AiAuditReviewer component
   ├─ Semantic quality review (Groq/Gemini)
   ├─ Grammar, logic, clarity, factual accuracy
   ├─ Manual review + AI auto-fix capability
   └─ Click "Continue" or "Skip"
       │
       ▼
   STEP 5: CONFIGURE
   ├─ Choose export format (QTI 3.0 / 2.1 / 1.2 / JSON)
   ├─ Choose output mode (ZIP or flat)
   ├─ Select LMS (Canvas / Moodle / Blackboard)
   ├─ (Optional) Upload template QTI XML
   ├─ (Optional) Upload media ZIP
   └─ Click "Generate"
       │
       ▼
   STEP 6: TRANSFORM & DOWNLOAD
   ├─ Generate QTI XML per question
   ├─ Assemble package (items, test, manifest)
   ├─ JSZip → blob
   ├─ Download ZIP to computer
   ├─ Track usage in database
   └─ Redirect to import instructions
       │
       ▼
   DONE: User imports ZIP into their LMS
```

### Alternative Workflows

**Workflow 2: Canvas-Specific Repackaging**
```
1. User uploads existing QTI ZIP
2. System extracts manifest, rewrites for Canvas compatibility
3. Download Canvas-ready ZIP
```

**Workflow 3: QTI Renderer (View & Validate)**
```
1. Upload QTI ZIP file
2. System parses imsmanifest.xml
3. Navigate items via tree view
4. View individual question XML
5. Run XPath queries for debugging
6. Validate XML against QTI schema
```

---

## Core Systems

### Validation Engine (Gate 1)

The validation engine is the foundation of AssessmentCore. It runs in the browser and performs deterministic structural and semantic validation on question data.

#### Architecture

```
INPUT: File (Excel/CSV)
   │
   ├─ File Parser
   │  └─ XLSX or CSV reader
   │  └─ Rows + Column mapping extraction
   │  └─ Row key assignment (__rowKey, __sourceRowNumber)
   │
   ├─ Per-Row Pipeline (parallelizable within browser)
   │  │
   │  ├─ normalizeRow()
   │  │  └─ Clean and standardize row data
   │  │  └─ Map columns → CanonicalItem
   │  │
   │  ├─ detectTypeFromStructure()
   │  │  └─ MCQ / MSQ / True/False / Text Entry / Numeric / Order / Unknown
   │  │  └─ Assign confidence: high / medium / low / none
   │  │
   │  ├─ validateWithProfile()
   │  │  └─ Run 25+ rule checks
   │  │  └─ Generate ValidationIssue[]
   │  │
   │  ├─ executeRules() [Rule Engine V2]
   │  │  └─ MCQ/MSQ-specific declarative rules
   │  │  └─ Additional ValidationIssue[]
   │  │
   │  └─ Output: ValidationResult {status, issues, canonicalItem}
   │
   ├─ Cross-Row Analysis
   │  │
   │  └─ applyDuplicateAnalysis()
   │     ├─ Exact fingerprint (type+stem+options+answers+sequence)
   │     ├─ Conflict fingerprint (type+stem+options, different answers)
   │     ├─ Near-duplicate detection (Jaccard ≥ 0.92 on stem tokens)
   │     └─ Suspicious duplicate detection (Jaccard ≥ 0.85)
   │
   └─ finalizeLegacyShape()
      └─ Derive status (valid/caution/rejected) from issues[]
      └─ Populate criticalErrors/warnings for UI compatibility
      └─ Populate decision (pass/review/block)

OUTPUT: Map<rowKey, ValidationResult>
```

#### Question Types

| Type | Definition | Detection |
|------|-----------|-----------|
| `single_choice` | One correct answer (MCQ) | 2+ options, single answer token |
| `multi_select` | Multiple correct answers (MSQ) | Multiple answer tokens (comma/pipe) |
| `true_false` | Binary choice | Exactly 2 options + true/false values |
| `text_entry` | Short answer / fill-in-blank | No options, text answer |
| `numeric` | Numeric answer ± tolerance | Number answer, no options |
| `order` | Ordering / sequencing items | orderItems column present |
| `unknown` | Could not detect | Fallback when all else fails |

#### Validation Rules (25+)

**Structural Rules:**
| Rule | Severity | Description |
|------|----------|-------------|
| MISSING_ID | block | No explicit ID provided |
| MISSING_STEM | block | Question text missing |
| SHORT_STEM | review | Question < 5 characters |
| DUPLICATE_ID | block | Same ID on multiple rows |
| UNKNOWN_EXPLICIT_TYPE | block | Type column value not recognized |

**Content Rules:**
| Rule | Severity | Description |
|------|----------|-------------|
| MISSING_ANSWER | block | No answer provided |
| INSUFFICIENT_OPTIONS | block | < 2 options for MCQ/MSQ |
| ANSWER_NOT_IN_OPTIONS | block | Answer doesn't match any option |
| AMBIGUOUS_ANSWER_MAPPING | block | Answer matches multiple options |
| INVALID_ORDER_ITEMS | block | < 2 order items |
| ORDER_SEQUENCE_INCOMPLETE | block | Order answer doesn't cover all items once |

**Quality Rules:**
| Rule | Severity | Description |
|------|----------|-------------|
| DUPLICATE_EXACT | block | Row is exact duplicate of another |
| DUPLICATE_CONFLICT | block | Same stem+options, different answers |
| DUPLICATE_NEAR | review | High similarity on stem (Jaccard 0.92+) |
| DUPLICATE_SUSPICIOUS | review | Moderate similarity on stem (Jaccard 0.85+) |

#### ValidationResult Data Model

```typescript
interface ValidationResult {
  rowKey: string                          // "{id}#{rowNumber}"
  rowNumber: number                       // 1-based
  rowId: string                           // same as rowKey
  status: 'valid' | 'caution' | 'rejected'
  decision: 'pass' | 'review' | 'block'
  issues: ValidationIssue[]              // canonical source of truth
  canonicalItem?: CanonicalItem          // normalized question data
  exportReady: boolean
  errorCount: number
  warningCount: number
  // legacy compatibility fields (derived from issues):
  criticalErrors: ValidationError[]
  warnings: ValidationError[]
}

interface ValidationIssue {
  code: string                            // e.g., 'MISSING_ANSWER'
  category: 'normalization' | 'structural' | 'mapping' | 'duplicate' | 'content_quality' | 'export_readiness'
  field: string                           // column name
  message: string                         // human-readable description
  severity: 'block' | 'review'            // block → rejected, review → caution
}

interface CanonicalItem {
  id: string
  canonicalType: QuestionType
  stem: string
  typeResolution: TypeResolution
  choices?: Choice[]                      // for MCQ/MSQ
  correctResponseIdentifiers: string[]    // for MCQ/MSQ: ["A", "B"]
  orderItems?: string[]                   // for order questions
  textEntryMode?: 'short' | 'essay' | 'numeric'
  numericTolerance?: { min: number; max: number }
  answer: string                          // raw answer value
  answerTokens: string[]                  // parsed answer tokens
  feedback?: string
  image?: string
  metadata?: Record<string, any>
}
```

#### Performance Characteristics

- **Small files (≤500 rows):** Validation runs synchronously, ~100ms
- **Large files (500-5000 rows):** Chunked validation with progress bar, ~1-5s
- **Very large files (5000+ rows):** Chunked, may take 10-30s depending on row complexity

### Cleaning Pipeline

The cleaning pipeline is a 3-pass deterministic system for automatically fixing and suggesting corrections to question data. It uses no AI or fuzzy matching — only logical rules.

#### Pass 1: Character-Level Cleaning

Applied to all mapped columns simultaneously and deterministically.

```
PASS 1 Rules (in order):
1. INVISIBLE_CHAR_REMOVAL
   └─ Remove zero-width spaces, BOM, control chars

2. LINE_BREAK_NORMALIZATION
   └─ CRLF → LF (cross-platform consistency)

3. TRIM
   └─ Remove leading/trailing whitespace

4. WHITESPACE_NORMALIZATION
   └─ Collapse internal spaces (for answer/option columns)

5. DELIMITER_NORMALIZATION
   └─ "A , B" → "A,B" (standardize comma spacing)
   └─ Pipe: "Step A | Step B" → clean pipe separation

6. QUOTE_NORMALIZATION
   └─ "Smart quotes" → "straight quotes"

7. NULL_COERCION
   └─ Convert: "null", "n/a", "undefined", "-", "" → null sentinel
```

**Safety Model:** PASS 1 is always safe — never rolled back.

#### Pass 2: Structural Cleaning & Alignment

Applied per-row with rollback if validation status worsens.

```
PASS 2 Rules:
1. COLUMN_FALLBACK
   └─ If primary column empty, fill from alias column
   └─ Example: If answer blank, check answer_text, answer_key, etc.

2. STRUCTURE_FIX
   └─ Rebuild order sequences into canonical format
   └─ Normalize delimiters for consistency

3. OPTION_CLEANUP
   └─ Remove duplicate options
   └─ Shift remaining options up (fill gaps)
   └─ Remove trailing empty options
   └─ Adjust answer mapping accordingly

4. ANSWER_ALIGNMENT
   └─ Convert answer text → option identifier (if exact match)
   └─ Example: answer="Option A" → answer="A"
```

**Safety Model:**
- Each row is validated before and after
- If status regresses (valid→caution, caution→rejected), rollback all changes
- Already-valid rows are skipped (immutable)

#### Pass 3: Suggestion-Based Remediation

Generates human-readable suggestions with confidence levels. User manually accepts or rejects.

```
PASS 3 Suggestion Types:

1. MISSING_ANSWER_SINGLE_OPTION (HIGH)
   └─ Empty answer + exactly 1 option
   └─ Suggestion: Use that option as answer

2. CASE_ALIGNMENT (HIGH)
   └─ Answer matches option after case normalization
   └─ Example: answer="TRUE" → option="true"
   └─ Suggestion: Update answer to match case

3. FUZZY_MATCH (HIGH/MEDIUM)
   └─ Answer similar to an option (>70% + clear gap from others)
   └─ Suggestion: Use closest matching option

4. PLACEHOLDER_ANSWER (MEDIUM)
   └─ Answer was null-coerced from "TBD", "FILL_ME", etc.
   └─ Suggestion: Manually fill in correct answer

5. MISSING_ANSWER_MULTIPLE_OPTIONS (MEDIUM)
   └─ Empty answer + 2+ options
   └─ Suggestion: Choose correct option(s)

6. ORDER_MISMATCH (MEDIUM)
   └─ Order sequence structural issues
   └─ Suggestion: Fix order item sequence

7. ANSWER_NOT_IN_OPTIONS (MEDIUM)
   └─ Answer doesn't match any option
   └─ Suggestion: Try fuzzy matching or manual correction
```

**Pass 3 Auto-Apply:**
- Only HIGH confidence suggestions are auto-applied
- Each application is validated individually
- If validation status regresses, revert immediately
- Non-actionable suggestions remain for manual review

#### Cleaning Output

```typescript
interface CleaningResult {
  improvements: {
    rowsImproved: number
    issuesResolved: number
    effectivenessPercentage: number
  }
  safety: {
    rowsSkipped: number        // already valid
    rollbacksPerformed: number // status regression prevented
  }
  suggestions: RemediationSuggestion[]
}

interface RemediationSuggestion {
  rowKey: string
  rowIndex: number
  field: string
  type: RemediationType
  message: string
  suggestedValue: string
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
}
```

### AI Audit System (Gate 2)

Optional semantic quality review using LLMs. Evaluates grammar, logic, clarity, and factual accuracy.

#### Architecture

```
USER CLICKS "AUDIT ALL" or "AUDIT ROW"
   │
   ├─ SINGLE-ROW AUDIT (Groq)
   │  ├─ Question stem + options + answer
   │  └─ LLM evaluates:
   │     ├─ Grammar quality
   │     ├─ Logic clarity (is the question answerable?)
   │     ├─ Semantic correctness (is the answer actually correct?)
   │     └─ Option quality (are distractors reasonable?)
   │  └─ Output: {status: 'certified'|'rejected', issues: []}
   │
   ├─ BATCH AUDIT (Gemini 2.0 Flash)
   │  ├─ Up to 50 questions per API call
   │  ├─ Sequential chunks for large batches
   │  └─ Same evaluation as single-row
   │
   └─ AUTO-FIX STEM (Groq)
      └─ LLM rewrites stem to fix detected issues
      └─ Preserve options, only rewrite question text
```

#### UI Components

**AiAuditReviewer.tsx**
```
Left Panel (Scrollable List):
├─ All questions with status icons
│  ├─ ⏳ Pending (not yet audited)
│  ├─ ✅ Certified
│  ├─ ❌ Rejected (issues detected)
├─ Per-row "Audit" button (re-audit if needed)
└─ "Audit All" button (batch audit)

Right Panel (Detail View):
├─ Full question display
│  ├─ Stem (formatted)
│  ├─ Options (with correct answer highlighted)
│  └─ Answer explanation
├─ AI Audit Result
│  └─ Status card
│  └─ Per-issue cards (grammar/logic/clarity/factual)
├─ Issue & Fix Modal
│  ├─ Original question data
│  ├─ Color-coded issue cards
│  ├─ Editable stem textarea
│  ├─ "Apply" button per issue
│  └─ "AI Auto-Fix" button (full stem rewrite)
└─ Navigation controls
```

#### Concurrency Protection

- `useRef`-based lock prevents double-firing "Audit All"
- `try/finally` ensures loading state clears even on API errors
- Graceful timeout handling (30-second limit per API call)

#### Cost Optimization

- **Groq (single-row):** Fast, cheap, best for spot-checks
- **Gemini (batch):** Bulk audit, 50 rows per call, more cost-effective for large batches

### QTI Generation Engine

Converts validated, cleaned question data into standards-compliant QTI XML.

#### Supported Versions

| Version | Status | Use Case |
|---------|--------|----------|
| QTI 3.0 | ✅ Primary | Latest standard, most features, Canvas/Moodle native |
| QTI 2.1 | ✅ Supported | Widely deployed, good compatibility |
| QTI 1.2 | ✅ Supported | Legacy systems, basic features only |

#### Generation Pipeline

```
INPUT: CanonicalItem (validated question)
   │
   ├─ Route by QTI version (generationService.ts)
   │
   ├─ QTI 3.0 Path (Primary)
   │  │
   │  ├─ Select builder per question type
   │  │  ├─ mcqItemBuilder.ts (single_choice)
   │  │  ├─ msqItemBuilder.ts (multi_select)
   │  │  ├─ textEntryItemBuilder.ts (text_entry, numeric)
   │  │  ├─ truefalseItemBuilder.ts (true_false) [derived from MCQ]
   │  │  ├─ orderItemBuilder.ts (order)
   │  │  └─ unknownItemBuilder.ts (fallback to text_entry)
   │  │
   │  ├─ Build assessment-item XML
   │  │  ├─ response-declaration (correct answer)
   │  │  ├─ outcome-declaration (SCORE, MAXSCORE, PASS)
   │  │  ├─ item-body (visible question content)
   │  │  ├─ *-interaction (choice, text-entry, order, etc.)
   │  │  └─ response-processing (scoring template)
   │  │
   │  ├─ Attach metadata (LOM)
   │  │  ├─ Difficulty level
   │  │  ├─ Bloom's taxonomy level
   │  │  ├─ Subject classification
   │  │  └─ Time estimate
   │  │
   │  ├─ Embed feedback
   │  │  ├─ Correct answer feedback
   │  │  ├─ Incorrect answer feedback
   │  │  ├─ Hint feedback
   │  │  └─ Partial credit feedback
   │  │
   │  └─ Embed media
   │     ├─ Extract images from row
   │     ├─ Normalize paths
   │     └─ Create <img> references in item-body
   │
   ├─ Assemble test structure
   │  ├─ testBuilder.ts
   │  ├─ assessment-test
   │  ├─ test-part (all questions in one part)
   │  └─ assessment-section (organize by type/topic)
   │
   ├─ Generate manifest
   │  ├─ manifestBuilder.ts
   │  ├─ imsmanifest.xml
   │  ├─ Resource declarations (items, test, media)
   │  └─ File references
   │
   └─ Package everything
      ├─ packageBuilder.ts
      ├─ JSZip assembly
      ├─ items/*.xml (individual question files)
      ├─ assessmentTest.xml (test structure)
      ├─ imsmanifest.xml (package manifest)
      ├─ images/* (media folder)
      └─ Output: ZIP blob → download

OUTPUT: ZIP file ready for LMS import
```

#### QTI 3.0 XML Structure Example (MCQ)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
  identifier="item_001"
  title="Capital of France"
  adaptive="false"
  timeDependent="false"
  xmlns="http://www.imsglobal.org/spec/qti/v3p0/model/imsqti_v3p0_asiv3p0.xsd">

  <qti-response-declaration identifier="RESPONSE" cardinality="single" baseType="identifier">
    <qti-correct-response>
      <qti-value>B</qti-value>  <!-- Correct answer identifier -->
    </qti-correct-response>
  </qti-response-declaration>

  <qti-outcome-declaration identifier="SCORE" cardinality="single" baseType="float" normalMaximum="1">
    <qti-default-value>
      <qti-value>0</qti-value>
    </qti-default-value>
  </qti-outcome-declaration>

  <qti-item-body>
    <p>What is the capital of France?</p>
    <qti-choice-interaction responseIdentifier="RESPONSE" shuffle="true">
      <qti-choice identifier="A">London</qti-choice>
      <qti-choice identifier="B">Paris</qti-choice>
      <qti-choice identifier="C">Berlin</qti-choice>
      <qti-choice identifier="D">Madrid</qti-choice>
    </qti-choice-interaction>
  </qti-item-body>

  <qti-response-processing template="http://www.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct" />

  <qti-modal-feedback outcomeIdentifier="FEEDBACK" showHide="show">
    <p>Correct! Paris is the capital of France.</p>
  </qti-modal-feedback>
</qti-assessment-item>
```

#### Key Features

- **Response Processing:** Match-correct template with partial credit support
- **Metadata:** LOM (Learning Object Metadata) for difficulty, subject, Bloom's level
- **Feedback:** Modal feedback for correct/incorrect/partial/hints
- **Stimulus Reuse:** Support for shared stimulus across multiple questions
- **Media Embedding:** Images, videos, interactive content
- **Accessibility:** WCAG compliance, proper text alternatives
- **Templating:** Support for parameterized questions with placeholders

### Export & LMS Compatibility

#### Supported Export Formats

| Format | LMS Targets | Output |
|--------|-------------|--------|
| QTI 3.0 | Canvas, Moodle, Blackboard, Desire2Learn | ZIP package |
| QTI 2.1 | Legacy systems, wide compatibility | ZIP package |
| QTI 1.2 | Very legacy systems | ZIP package |
| Moodle XML | Moodle (native format) | XML file(s) |
| Canvas XML | Canvas (legacy importer) | XML file(s) |
| JSON | Custom systems, APIs | JSON file(s) |

#### Canvas-Specific Repackaging

Canvas has stricter manifest validation. The system includes a repackager (`canvasPackageFixer.ts`):

```
INPUT: Standard QTI ZIP
   │
   ├─ Extract manifest
   ├─ Parse resource declarations
   ├─ Verify Canvas compatibility
   ├─ Rewrite manifest references if needed
   │  ├─ Ensure correct file paths
   │  ├─ Add required metadata
   │  └─ Fix namespaces
   ├─ Re-ZIP with Canvas-compatible structure
   │
OUTPUT: Canvas-ready ZIP
```

#### Output Modes

| Mode | Structure | Use Case |
|------|-----------|----------|
| `qti-package` | Standard IMS Content Package (ZIP) | LMS import, archival, portability |
| `xml-media-folder` | Flat folder with items/*.xml, images/* | Manual inspection, debugging |

---

## Data Models

### User Model (AuthContext)

```typescript
interface User {
  id: string              // UUID from Supabase Auth
  email: string
  full_name?: string
  email_confirmed_at?: string
  created_at: string
  metadata?: Record<string, any>
}

interface UserProfile {
  id: string              // same as User.id
  email: string
  full_name: string
  created_at: string
  updated_at: string
}

interface UserUsage {
  user_id: string         // foreign key to User.id
  exports_count: number   // total successful exports
  last_export_at?: string
  total_questions_converted: number
  created_at: string
  updated_at: string
}
```

### Question Models

```typescript
type QuestionType = 
  | 'single_choice'
  | 'multi_select'
  | 'true_false'
  | 'text_entry'
  | 'numeric'
  | 'order'
  | 'unknown'

interface Choice {
  identifier: string      // "A", "B", "C", etc.
  text: string           // display text
  isCorrect: boolean     // populated during validation
}

interface CanonicalItem {
  id: string
  canonicalType: QuestionType
  stem: string           // question text
  typeResolution: TypeResolution
  choices?: Choice[]
  correctResponseIdentifiers: string[]
  orderItems?: string[]
  textEntryMode?: 'short' | 'essay' | 'numeric'
  numericTolerance?: { min: number; max: number }
  answer: string
  answerTokens: string[]
  feedback?: string
  image?: string
  metadata?: Record<string, any>
}

interface TypeResolution {
  type: QuestionType
  source: 'explicit' | 'detected'
  confidence: 'high' | 'medium' | 'low' | 'none'
}
```

---

## Authentication & Access Control

### Auth Flow

```
1. User Registration (Email)
   → Supabase creates user account
   → OTP sent via email
   → User verifies OTP
   → Account activated

2. User Login
   → Email + Password
   → Supabase Auth validates
   → Session token created
   → Stored in browser (localStorage/sessionStorage)
   → User redirected to Workspace

3. Session Persistence
   → Browser stores auth token
   → On page reload, token validated
   → Session restored automatically
   → User stays logged in

4. Logout
   → Session cleared
   → Token invalidated
   → Redirect to login
```

### Feature Gating (Quota System)

```typescript
Free Tier:
├─ 1 free export per account
└─ After first export, access revoked

Premium Tier (future):
├─ Unlimited exports
├─ Priority support
├─ Advanced features
└─ Paid via Stripe subscription
```

### Row-Level Security (RLS) Policies

**Supabase Database:**
```sql
-- user_profiles table
┌─ Users can read/write their own profile only
├─ Admin can read all profiles
└─ No anonymous access

-- user_usage table
┌─ Users can read/write their own usage record
├─ Track per-user exports-count
└─ Prevent quota bypass via database direct access
```

---

## Performance & Scalability

### Browser-Side Validation

**Upside:**
- No server latency
- Scales to 10,000+ rows (varies by device)
- 100% free processing (no server cost)
- Instant feedback to user

**Process:**
- Rows ≤500: Direct validation, ~100ms
- Rows 500-5000: Chunked validation with progress bars, ~1-5s
- Rows 5000+: Chunked validation, ~10-30s

**Limiting Factors:**
- Browser JavaScript execution speed
- Available RAM on user's device
- DOM rendering for large result tables (virtualization used when needed)

### Server-Side AI Processing

**Edge Functions (Supabase Deno Runtime):**
- Single-row audit (Groq): ~200ms per row
- Batch audit (Gemini): ~500ms per batch up to 50 rows
- Concurrent requests: Limited by API quota (contact Groq/Gemini for limits)

**Optimization Strategies:**
- Use Groq for single-row (faster feedback loop)
- Use Gemini batch for 50+ rows (better batch pricing)
- Implement request queueing to respect API limits

### Database Performance

**Supabase PostgreSQL:**
- user_profiles: O(1) lookup by user_id
- user_usage: O(1) update on export
- RLS: Minimal overhead with indexed user_id foreign keys

**Recommendations:**
- Single writes per export (fast)
- No bulk operations needed for current scale
- Future: Batch write tracking if needed for audit logs

---

## Security

### Authentication & Authorization

✅ **Supabase Auth**
- Industry-standard, battle-tested
- OTP email verification
- Password hashing (PBKDF2)
- JWT session tokens
- Automatic token refresh

✅ **Row-Level Security (RLS)**
- Database-enforced access control
- Impossible to bypass via direct queries
- Each user sees only their own data

✅ **HTTPS Everywhere**
- All traffic encrypted in transit
- TLS 1.2+
- Vercel + Supabase default HTTPS

### API Security

✅ **AI API Keys Server-Side Only**
- Groq and Gemini keys stored in Supabase secrets
- Browser never sees keys
- All API calls go through Edge Functions
- Prevents unauthorized API usage

✅ **CORS Protection**
- Supabase CORS headers configured
- Only allowed origins can call APIs
- Prevents cross-site request forgery

### Data Protection

✅ **Input Validation**
- File uploads validated for type (XLSX, CSV only)
- Formula injection prevention (strip `=`, `+`, `-`, `@` prefixes)
- CSV injection protection

✅ **Output Encoding**
- All user data escaped in HTML/XML output
- XSS prevention in report generation

✅ **Deletion & Retention**
- User can request account deletion (future feature)
- Usage records retained for billing (future feature)
- All personal data removed on deletion

---

## Integration Points

### External APIs

| Service | Purpose | Authentication |
|---------|---------|-----------------|
| **Groq Cloud** | LLM for single-row semantic audit | API key in Edge Function |
| **Google Gemini** | LLM for batch semantic audit | API key in Edge Function |
| **Supabase Storage** | Media hosting (images, videos) | Built-in RLS + public URLs |

### LMS Integration

| LMS | Native Format | Export Capability | Status |
|-----|---------------|------------------|--------|
| **Canvas** | QTI 3.0 | ✅ Full ZIP package | Working |
| **Moodle** | Moodle XML + QTI | ✅ XML or QTI ZIP | Working |
| **Blackboard** | QTI 2.1 | ✅ ZIP package | Working (tested) |
| **Desire2Learn** | QTI 2.1 | ✅ ZIP package | Working (tested) |
| **Generic LMS** | QTI 3.0 | ✅ ZIP package | Working |

### File Format Support

**Input:**
- Excel: `.xlsx`, `.xls` (via SheetJS)
- CSV: `.csv`, `.tsv` (via PapaParse)

**Output:**
- QTI ZIP: `application/zip`
- Moodle XML: `application/xml`
- Canvas XML: `application/xml`
- JSON: `application/json`

---

## Deployment & Infrastructure

### Architecture Diagram

```
┌────────────────────────────────────────────┐
│   User's Browser (React SPA)               │
│   ├─ In-browser validation engine          │
│   ├─ File processing                       │
│   └─ State management                      │
└────────┬─────────────────────────────────┬─┘
         │ HTTPS                    HTTPS  │
         │                                 │
         ▼                                 ▼
┌────────────────────────┐      ┌──────────────────────┐
│ Vercel Edge Network    │      │ Supabase Cloud       │
│ ├─ Frontend hosting    │      │ ├─ PostgreSQL DB     │
│ ├─ Static assets       │      │ ├─ Auth (JWT)        │
│ ├─ CDN (global)        │      │ ├─ Storage (images)  │
│ └─ Zero cold start     │      │ ├─ Edge Functions    │
└────────────────────────┘      │   (Deno runtime)     │
                                 └──────┬───────┬──────┘
                                        │       │
                    ┌───────────────────┘       │
                    │                           │
                    ▼                           ▼
           ┌─────────────────┐       ┌─────────────────┐
           │ Groq Cloud      │       │ Google Gemini   │
           │ (LLM APIs)      │       │ (LLM APIs)      │
           └─────────────────┘       └─────────────────┘
```

### Hosting

**Frontend:** Vercel
- Zero-config deployment from Git
- Automatic SSL/HTTPS
- Global CDN
- Zero cold starts (functions v3)
- Built-in analytics

**Backend:** Supabase (managed PostgreSQL + serverless functions)
- Managed database (auto-backup, auto-scale)
- Supabase Auth (managed sessions)
- Edge Functions (Deno runtime, global presence)
- Storage (S3-compatible, CDN-backed)

### Environment Configuration

**.env.local** (template: .env.example)
```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# (Optional) Groq API key (loaded in server-side Edge Function, not exposed to browser)
# (Optional) Google Gemini API key (loaded in server-side Edge Function)
```

### Monitoring & Logs

**Vercel:**
- Function logs: https://vercel.com/dashboard/logs
- Deployment history
- Analytics (performance metrics)

**Supabase:**
- Database logs: Query performance, slow queries
- Auth logs: Login attempts, failed auth
- Function logs: Edge Function execution, errors

---

## Advanced Features

### Template-Based Question Generation

Users can upload a QTI template XML with placeholder values. The system:
1. Parses template to extract placeholder names
2. User maps spreadsheet columns to placeholders
3. System injects row values into template
4. Generates personalized questions per row

**Example Use Case:**
```
Template: "The function f(x) = {{A}}x + {{B}}.
What is f({{C}})?"

Spreadsheet Row:
A=2, B=3, C=5

Output: "The function f(x) = 2x + 3.
What is f(5)?"
```

### Media Management

- Extract images from Excel (embedded images)
- Upload media ZIP → extract + map to rows
- Generate public URLs for all images
- Embed in QTI items
- Automatic path normalization for LMS compatibility

### Duplicate Detection

**Levels:**
1. **Exact:** Type + stem + options + answer + order sequence must all match
2. **Conflict:** Same question structure, different answers (logical conflict)
3. **Near:** Stem Jaccard similarity ≥ 0.92 (very similar)
4. **Suspicious:** Stem Jaccard similarity ≥ 0.85 (moderately similar)

**Use:** Detect content plagiarism, accidental copies, suspicious material

---

## Summary

AssessmentCore is a comprehensive, production-ready system for educators to validate, clean, audit, and export assessment questions to any LMS platform. The architecture combines:

✅ **In-browser validation** (fast, scalable, no server cost)  
✅ **Deterministic cleaning** (safe, predictable, no AI)  
✅ **AI semantic audit** (optional, uses Groq/Gemini)  
✅ **Standards-compliant export** (QTI 3.0, Moodle, Canvas)  
✅ **User authentication** (Supabase Auth, per-user quotas)  
✅ **Global infrastructure** (Vercel + Supabase)

The system is production-deployed, tested on real educator workflows, and ready to scale to thousands of concurrent users.

---

**For Questions:** Refer to [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md), [VALIDATION_PROCESS_GUIDE.md](VALIDATION_PROCESS_GUIDE.md), and [CLEANING_SYSTEM_OVERVIEW.md](CLEANING_SYSTEM_OVERVIEW.md) for deeper technical details.
