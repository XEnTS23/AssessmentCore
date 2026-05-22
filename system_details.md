# AssessmentCore: System Design & Functional Specification

This document provides a comprehensive technical and design blueprint of the **AssessmentCore** platform. It is intended to serve as a complete reference for rebuilding the system from scratch, covering architecture, aesthetics, workflows, and core logic.

---

## 1. System Overview
**AssessmentCore** is a high-performance web application designed to transform unstructured question banks, OCR-extracted content, and spreadsheet-based assessment data into standards-compliant export packages (QTI 1.2, 2.1, 3.0, and XML + Media Folder outputs). It bridges the gap between manual data entry, OCR extraction, and professional Learning Management System (LMS) requirements through a deterministic validation, cleaning, and export pipeline.

---

## 2. Technology Stack
- **Framework:** React 18 with Vite 6.
- **Language:** TypeScript (Strict mode).
- **Styling:** Tailwind CSS 4 (using modern `@theme` variables) and Vanilla CSS.
- **Icons:** Lucide React.
- **UI Components:** 
  - Radix UI (Primitives for accessibility).
  - Shadcn/UI (Built on Radix).
  - Material UI (MUI) for complex data grids and specific components.
- **State Management:** React Context API (Auth, Theme).
- **Routing:** React Router 7.
- **Backend/Services:** 
  - **Supabase:** Authentication, PostgreSQL Database, and Edge Functions.
  - **AI Services:** 
    - **OpenRouter:** Llama 3.1 8B for high-performance OCR processing (Free Tier).
    - **OpenAI/Gemini/Deepseek:** For pedagogy auditing and XML auto-fixing.
- **OCR Pipeline:** Mistral Vision OCR for image extraction, OCR history persistence, and multi-diagram asset extraction (supporting stem and option-based images).
- **Core Utilities:**
  - `JSZip` for package generation.
  - `ExcelJS` for parsing spreadsheet data.
  - `Zod` for schema validation.
  - `Vitest` for the test suite.

---

## 3. Design System & Aesthetics

### 3.1 Color Palette (CSS Variables)
The system uses a refined, high-contrast palette with full support for Light and Dark modes.

| Token | Light Mode | Dark Mode |
| :--- | :--- | :--- |
| `--background` | `#F8FAFC` | `#000000` |
| `--foreground` | `#111827` | `#F8FAFC` |
| `--primary` | `#000000` | `#FFFFFF` |
| `--card` | `#FFFFFF` | `#0A0A0A` |
| `--accent` | `#E0F0FF` | `#1A1A1A` |
| `--success` | `#16A34A` | `#22C55E` |
| `--warning` | `#EA580C` | `#F97316` |
| `--destructive` | `#DC2626` | `#EF4444` |
| `--border` | `#E2E8F0` | `#262626` |
| `--workspace-bg` | `#F8FBFF` | `#000000` |

### 3.2 Typography
- **Sans Serif:** `"Archivo"`, fallback to Segoe UI/Roboto. Used for all UI text.
- **Monospace:** `"Roboto Mono"`. Used for data displays, XML previews, and code blocks.
- **Base Font Size:** `16px`.
- **Weights:** Normal (400), Medium (500), Semibold (600).

### 3.3 Visual Style
- **Glassmorphism:** Core aesthetic used across the platform, featuring subtle `backdrop-blur`, semi-transparent backgrounds, and thin borders on headers, sidebars, and cards.
- **Premium Marketing UI:** Solutions, Services, and Pricing pages feature high-end layouts with refined spacing, smooth gradients, and interactive micro-animations.
- **Shadows:** Multi-layered shadows (e.g., `--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1)`).
- **Radius:** Standardized at `0.625rem` (10px) for cards, buttons, and inputs.
- **Animations:** Smooth transitions (`duration-200`) for theme switching and sidebar expansion. Framer Motion used for page transitions and interactive elements.

---

## 4. Core Workflows & Features

### 4.1 The Batch Creator Wizard
The flagship feature of the system, a 6-stage deterministic pipeline with OCR reuse support:

1.  **Upload:** 
  - Supports `.xlsx`, `.csv`, `.json`, `.tsv`.
    - Automated column detection for Question Text, Type, Options, and Correct Answer.
    - Media ZIP upload for mapping local images to questions.
  - Can load the latest OCR export and treat it as the source sheet.
2.  **Validate:** 
    - Runs 25+ structural rules (e.g., missing options, duplicate questions, invalid identifiers).
    - **Identifier-First Strategy:** Prioritizes machine-readable IDs over text matching.
3.  **Fixing (DataFixingWorkspace):**
    - **Manual Fixing Stage:** Decoupled AI suggestions from manual edits. Unlocked rows allow direct remediation by the user.
    - Split-screen view: Original Data vs. Remediation Suggestion.
    - Auto-fix capability for common formatting errors.
    - **Multi-Diagram Support:** Displays multiple image attachments per question (stem and options) within the validation workspace.
4.  **AI Audit:** 
    - Optional pedagogical review.
    - Checks for grammar, clarity, and factual accuracy in options.
5.  **Configure:** 
    - Selection of output format (QTI Package, XML Media Folder).
    - MathML rendering settings (MathJax vs. native MathML).
    - Template XML mapping for custom LMS metadata.
  - When "Contains Images = yes", can reuse media URLs, including OCR-extracted diagram assets, and map them to the correct question rows before export.
6.  **Transform & Export:** 
    - Generation of `imsmanifest.xml`.
    - ZIP packaging with structured media folders.
  - XML + Media Folder output preserves image references as package-friendly assets.

### 4.2 OCR Processor
- Converts scanned PDFs and image files into OCR-ready page images.
- **Multi-Diagram Extraction:** Enhanced Edge Function extracts and links multiple diagrams per question (supporting both Question Stem and Option images).
- **Media Serving:** Uses a public `ocr-diagrams` storage bucket for reliable media retrieval and embedding.
- Persists the latest OCR export for reuse in Batch Creator.
- Captures question-level OCR results and diagram metadata, including bounding box information.
- Stores reusable diagram assets for the latest run so they can be mapped back into assessment rows.

### 4.3 QTI Renderer
- Interactive preview tool for QTI 3.0 XML.
- Real-time rendering of MCQ, MSQ, and Text Entry types.
- MathML support via a custom `MathMLRenderer` component.

### 4.4 LMS Export Pipeline
- **Canvas Adapter:** Specific logic to rewrite XML for Canvas LMS and other LMS targets (handles nested `<p>` tags, `feedbackBlock` to `modalFeedback` conversion, and image-safe XML insertion).
- **Package Inspection:** Validates ZIP structure and manifest presence before conversion.
- **Media Reuse:** Image references can come from uploaded media files or OCR-derived diagram assets, then be packaged into the export archive.

---

## 5. Information Architecture & UI Components

### 5.1 Global Layout (`WorkspaceLayout`)
- **Unified Navbar:** A consistent, high-end navigation bar shared across all application modules (Landing, OCR, Workspace, Renderer).
- **Sidebar:** 228px width, collapsible. Contains navigation (Dashboard, Renderer, Batch Creator, LMS Export) and user plan summary.
- **Header:** Sticky, contains breadcrumbs, help/notifications, and a profile dropdown.
- **Theme Toggle:** Switch between Light and Dark mode with persistence in `localStorage`.

### 5.2 Key Components
- **ValidationReport:** A high-level summary dashboard using charts (MUI/Custom) to show data quality metrics (Usability, Critical Issues, etc.).
- **AiAuditReviewer:** A side-by-side diff viewer for AI suggestions.
- **TemplateMappingUI:** A drag-and-drop or select-based interface for mapping spreadsheet columns to custom XML placeholders.
- **OCR Reuse Mapping:** Batch Creator configuration can reuse stored OCR diagram URLs and map them to question rows before XML generation.

---

## 6. Logic & Algorithms

### 6.1 Validation Rule Engine (`validationRuleEngine.ts`)
- **Execution Flow:** Deterministic order of rules ensuring predictable error detection.
- **Identifier-First Strategy:** Prioritizes machine-readable IDs (Identifiers) over fuzzy text matching for robust question-answer mapping.
- **Severity Bands:** `block` (must fix), `caution` (should review), `info`.
- **Confidence Scoring:** Calculated based on the percentage of passed rules and the weight of triggered uncertainty flags (e.g., `LOW_COVERAGE`, `INCOMPLETE_RULE_SET`).

### 6.2 Data Cleaning Pipeline
- **3-Pass Strategy:** 
  - **Pass 1:** Normalization (whitespace, case, delimiters).
  - **Pass 2:** Structural Fixes (mapping labels to IDs).
  - **Pass 3:** Safety Guards (rollback mechanism to prevent data degradation).

---

## 7. Security & User Management
- **Auth:** Supabase Auth (Email/Password).
- **Session Management:** Protected routes using a `useAuth` hook and a `loading` guard.
- **Usage Tracking:** Server-side tracking of "Questions Converted" to enforce free-tier limits (100 questions) vs. Premium (unlimited).
- **OCR Storage:** 
  - `ocr-exports`: Stores JSON/Metadata and latest Excel exports for user reuse.
  - `ocr-diagrams`: Public bucket for hosting extracted question diagrams.
- **Batch Creator Access:** Token-based access and `user_usage.batch_creator_access` govern premium Batch Creator availability.

---

## 8. Interaction Details
- **Toasts:** Sonner for non-intrusive feedback (Success, Error, Info).
- **Favicon:** Dynamic favicon switching based on theme (Dark logo for Light mode, Light logo for Dark mode).
- **Empty States:** Custom illustrations and "Get Started" call-to-actions for empty dashboards.
- **Responsiveness:** Flex/Grid layouts designed for desktop-first workflows with overflow handling for large data tables.

---

*This document represents the state of AssessmentCore as of May 2026.*
