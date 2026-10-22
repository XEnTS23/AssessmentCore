# Husimi Workspace — Platform Capabilities

**Husimi Solutions · Assessment Content Conversion & Quality Assurance**

The Husimi Workspace turns question banks that sit in PDFs, scans, Word exports and spreadsheets into clean, validated, LMS-ready assessment packages. It runs the whole job in one guided workflow: extracting content, checking every question against a detailed rule set, fixing problems, previewing items as a learner would see them, and exporting to QTI 2.1, QTI 3.0 or JSON.

---

## At a glance

| | |
|---|---|
| **Inputs** | PDF, PNG, JPEG, WEBP (via OCR) · Excel (.xlsx) · CSV |
| **Question types exported** | Single-answer MCQ · Multiple-select (MSQ) · Ordering / sequencing · Text entry (text, numeric, integer, formula) |
| **Validation** | Catalogue of 154 rules; 99 run on every question automatically |
| **Outputs** | QTI 2.1 package · QTI 3.0 package · JSON · Custom LMS mapping · Corrected spreadsheet · HTML validation report |
| **Batch size** | Up to 10,000 questions and 25 MB per upload |
| **Math** | LaTeX, MathML and MathJax, with a built-in equation editor |
| **Media** | Images, audio and video references, checked and packaged |

---

## 1. End-to-end workflow

Every batch moves through the same guided stages. Each stage shows its status, and the system will not let a batch move on to export while blocking problems remain.

```
 Capture  →  Upload & Map  →  Validate  →  Fix & Clean  →  Configure  →  Build & Preview  →  Download
  (OCR)
```

1. **Capture**: digitise PDFs and images with AI vision OCR (optional).
2. **Upload & Map**: load a spreadsheet or the latest OCR output; columns are detected automatically.
3. **Validate**: every question is checked and given a clear status.
4. **Fix & Clean**: safe automatic cleaning, then guided manual correction in a rich editor.
5. **Configure**: choose the target platform, scoring, feedback, media and math handling.
6. **Build & Preview**: generate the package, check every artifact, and try items as a learner.
7. **Download**: export the package, corrected source sheet and validation report.

---

## 2. Content capture: AI OCR

Turns printed or scanned question papers into structured, editable questions.

- **Accepts** multi-page PDFs and PNG, JPEG and WEBP images, processed in batches.
- **Splits PDFs into pages** and processes them one page at a time.
- **Keeps equations intact** by extracting them as LaTeX instead of flattening them to plain text.
- **Captures diagrams.** Operators can draw manual crop regions and assign each to a question number, so every diagram ends up attached to the right question.
- **Separates questions** on each page, along with their answer options and keys.
- **Shows the output** as a structured preview or as raw Markdown.
- **Exports to Excel (.xlsx)**, or sends the output straight into the Batch Creator in one click ("Load AI OCR").
- **Shows a live run summary**: files selected, pages processed and questions ready for export.

---

## 3. Upload and column mapping

- **Excel (.xlsx) and CSV** are supported.
- **Columns are mapped automatically** using scored header matching. Ambiguous headers such as "Question ID" or "Question Level" are not mistaken for the question text column.
- **Excel files are safety-checked** before they are opened.
- **Original data is kept** for every row and stays recoverable at any point in the workflow.
- **Batch limits are enforced** with clear messages:

| Limit | Value |
|---|---|
| File size | 25 MB |
| Rows (questions) | 10,000 |
| Columns | 250 |
| Characters per cell | 100,000 |
| Total characters per batch | 20,000,000 |

Large batches are processed in chunks, so the interface stays responsive.

---

## 4. Question types

| Type | What the system understands |
|---|---|
| **MCQ (single answer)** | Options, option labels and IDs, and a correct answer given as a letter, an ID or the option text |
| **MSQ (multiple select)** | Several correct answers in mixed delimiter styles, with partial-credit scoring |
| **Ordering / sequencing** | The correct sequence of items |
| **Text entry** | Free text, numeric, integer and formula responses; several accepted answers; numeric tolerance; units; case sensitivity; whitespace trimming |

The system also **detects question types it cannot export** (for example hotspot, matrix-match, drag-and-drop and essay) and **flags likely mislabelled types**. For example, it catches an MCQ that should be an MSQ, or an item that is really True/False. These items are reported rather than silently converted.

Operators can **change a question's type** in the editor. The system warns them about any data the change will affect.

---

## 5. Validation engine

The core of the platform. Every question is checked against a catalogue of **154 validation rules**, built from assessment-industry practice and QTI requirements.

- **99 rules run automatically on every question.** 65 of these block export when they fail.
- The rest are **policy-, platform- and package-level checks** that run when a client policy profile, target LMS profile or built package is supplied.

### What is checked

| Area | Examples |
|---|---|
| **Structure** | Required fields present; enough options; unique option IDs and labels; correct answer present, readable and present among the options; correct sequence for ordering items |
| **Content quality** | Empty or duplicate options; duplicate questions (by ID and by normalised question text); empty rows; truncated content |
| **Answer key and academic consistency** | Explanation missing or too thin; explanation contradicts the answer key; worked result differs from the keyed answer; unit mismatches; more than one option looks correct |
| **Scoring** | Invalid marks or negative marks; ambiguous partial-credit setup; numeric tolerance and precision conflicts |
| **Metadata** | Subject, topic, chapter, difficulty, language, year and time-limit values checked and normalised |
| **Math and rendering** | Malformed LaTeX delimiters; formulas that will not render; unsupported math formats; language metadata mismatches |
| **Media** | Missing or broken media references; invalid media URLs; media security checks |
| **Accessibility** | Accessibility checks on content and interactions |
| **Security** | Unsafe HTML or script content |
| **Linked content** | Broken passage and stimulus links |
| **Export readiness** | Final checks that every item can be built for the chosen target |

### Outcome per question

Each question gets one clear status: **Valid**, **Caution**, **Needs Review** or **Rejected**. Every issue records:
- its **severity**: Block, Review, Warning or Info
- its **category**, and the **exact field** it applies to
- a plain-language **message** with supporting evidence

### Review tools

- Filter by status, by the rule that fired, or by free-text search.
- See how questions break down by type.
- Download a **branded HTML validation report** with summary statistics, issue breakdowns and row-by-row detail. It is ready to share with stakeholders or print to PDF.

---

## 6. Fix & Clean

### 6.1 Automatic cleaning

A cleaning pipeline that only makes **safe, rule-based changes**. Every change is logged and can be reversed.

**Pass 1: character-level cleanup**
- Removes byte-order marks (BOM), invisible characters and soft hyphens, without touching anything inside math expressions
- Normalises line breaks and smart quotes
- Trims stray whitespace
- Flags placeholder values such as "N/A", "null" and "nan"

**Pass 2: structural cleanup**
- Normalises option labels (for example, `a` becomes `A`) and removes duplicate option IDs
- Matches the correct answer to its option by label or by exact text
- Normalises and de-duplicates multi-answer delimiters

**Pass 3: suggestions**
- Proposes fixes for the issues that remain, each with a confidence level.
- Only high-confidence fixes are applied automatically. Close or ambiguous cases are always left for a person to decide.

**LaTeX auto-repair**
- Detects and repairs unclosed math delimiters and missing braces.
- Is careful with currency: "$20" is not mistaken for math.

An **autofix audit panel** shows exactly what was changed on each row, and why.

### 6.2 Manual fix editor

A full editor for correcting and improving each question:

- **Rich text formatting**: bold, italic, underline, highlight, fonts, sizes, colours, alignment and line height, with a switch to edit the underlying HTML directly.
- **Equation editor**: visual equation building with symbol and structure galleries, built-in equations (fractions, integrals, sums, limits, logarithms, derivatives and more), a LaTeX source view and a live preview. Supports inline and display math.
- **Matrix builder** for inserting and editing matrices.
- **Table builder** with headers, merged cells (row-span and column-span) and border styling.
- **Media manager** for attaching images, audio and video, with image properties (alt text, width, height, border).
- **Structured sections** that can be reordered by drag-and-drop:
  - Required: Question, Response, Metadata
  - Optional: Explanation, Correct-answer feedback, Incorrect-answer feedback, Partial-credit feedback, **Conditional feedback**, Hint, Additional instructions
- **Conditional feedback rules**: show targeted feedback based on what the learner answers (a specific choice selected, equals, contains, a numeric range, greater than, less than), with set priorities.
- **Metadata fields**: question ID, subject, topic, chapter, difficulty, language, marks, negative marks and time limit.
- **Live re-validation** while the operator types, so each fix is confirmed straight away.
- **Undo, edit history and rollback**: every row keeps a full history and can be restored to any earlier snapshot.
- **Source inspector** to compare a question with its original uploaded data.
- **Conflict protection** that detects version conflicts before an edit is saved.
- **Student-view preview** of the question at any time.
- **Keyboard shortcuts** for faster editing.
- **Corrected sheet download**: export the cleaned and fixed batch as CSV or TSV. The original column order is kept, and each row gets its status, question type and remaining issues appended.

---

## 7. Export configuration

| Setting | Options |
|---|---|
| **Target platform** | **QTI 2.1**: Canvas, Moodle and broad LMS support · **QTI 3.0**: current assessment interoperability standard · **JSON**: APIs, databases, custom pipelines · **Custom LMS**: platform-specific mapped output |
| **Package structure** | Fixed assessment · Item bank |
| **Media handling** | Keep public URLs · Package media inside the export · LMS reference paths · Base64 inline |
| **Math format** | Raw LaTeX · MathML · MathJax |
| **Metadata** | Include all · Include selected · Exclude · Strict mapping |
| **Feedback & rationales** | Show after the attempt · Show as learner hints · Remove |
| **Option shuffling** | On / off |
| **Scoring** | Basic or advanced; partial marking (proportional or right-minus-wrong); negative marking (one global value, or per question from metadata); minimum score floor |
| **Time limits** | None · Whole assessment · Per question |

Before building, an **export readiness check** summarises the configuration and any warnings. Warnings must be acknowledged before export, and blocking issues stop the export entirely.

---

## 8. Build & Preview

- **Generates the package** for the chosen target, including the QTI manifest (`imsmanifest.xml`).
- **Checks every generated file** (QTI 2.1, QTI 3.0 and JSON) before download is allowed.
- **Student View**: answer each question as a learner would, submit it, and see the scoring and the correct, incorrect and conditional feedback.
- **Raw Output view** to inspect the generated XML or JSON.
- **One-click download** as a single file or a ZIP package.
- Build errors are shown clearly in an error panel, never hidden.

---

## 9. Quality, safety and reliability

- **Original data is never lost.** The raw upload is kept beside every cleaned and edited version.
- **Every change is audited.** Cleaning logs, autofix records and per-row edit history are kept.
- **Content is sanitised.** Unsafe HTML and scripts are blocked, and MathML is cleaned before it reaches a package.
- **Media links are checked.** Links to private or internal network addresses are rejected.
- **Validation is stable under load.** It runs in chunks for large batches, and only the latest result is ever shown while someone is typing.
- **The engine is regression-tested** with automated tests and fixed regression datasets, so validation results stay consistent from release to release.

---

## 10. Workspace and access

- Secure sign-in with email verification and password reset.
- A dedicated workspace with a dashboard, usage tracking and quick access to each tool.
- Light and dark themes.

---

## 11. Roadmap (in development)

These are planned or in progress. They are not yet available to clients.

- **AI pedagogy audit**: AI review of each question for grammar, clarity and logic, with suggested fixes that can be accepted or ignored.
- **QTI Renderer**: render and test existing QTI packages directly in the workspace.
- **Direct LMS export**: push packages straight to LMS platforms.
- **Cloud storage** for uploaded media.
- **Export for more question types**: hotspot, matrix-match, drag-and-drop and others that are already detected and validated today.

---

*Prepared by Husimi Solutions. Capabilities reflect the current platform release; roadmap items are subject to change.*
