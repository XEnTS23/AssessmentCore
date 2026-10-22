import { useState } from "react";
import { Link } from "react-router";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  FileCheck2,
  FileCode2,
  FileSpreadsheet,
  FileText,
  FileScan,
  PenTool,
  Atom,
  Binary,
  Layers,
  Sparkles,
  HelpCircle,
  Database,
  Search,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Navbar } from "../../components/Navbar";
import { Footer } from "../../components/Footer";
import { ContactProjectForm } from "../../components/ContactProjectForm";

export function ContentDigitizationPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const whyStructureCards = [
    {
      title: "Preserve the question structure",
      desc: "Separate stems, subquestions, options, answers, feedback, and passage references where the source provides them.",
    },
    {
      title: "Protect technical meaning",
      desc: "Handle mathematical notation, scientific symbols, units, and figures carefully, with review for ambiguous extraction.",
    },
    {
      title: "Prepare content for reuse",
      desc: "Organize digital items with consistent identifiers, metadata, and linked assets for downstream publishing or platform workflows.",
    },
  ];

  const sourceMaterials = [
    {
      title: "PDF textbooks and question papers",
      desc: "Extract, segment, and organize questions, explanations, passages, and associated figures.",
      icon: <FileText className="h-5 w-5 text-primary" />,
      badge: "PDF",
    },
    {
      title: "Word documents and worksheets",
      desc: "Convert DOCX content into consistent, editable question and lesson-content structures.",
      icon: <FileCode2 className="h-5 w-5 text-primary" />,
      badge: "DOCX",
    },
    {
      title: "Scanned documents",
      desc: "Apply OCR-assisted extraction and targeted review to printed source images.",
      icon: <FileScan className="h-5 w-5 text-primary" />,
      badge: "TIFF / PNG / PDF",
    },
    {
      title: "Handwritten educational material",
      desc: "Transcribe legible handwritten questions and notation with human verification where needed; complexity and source quality determine feasibility.",
      icon: <PenTool className="h-5 w-5 text-primary" />,
      badge: "Handwritten",
    },
    {
      title: "Spreadsheets and legacy question banks",
      desc: "Normalize inconsistent XLSX/CSV rows, columns, answer fields, and content identifiers.",
      icon: <FileSpreadsheet className="h-5 w-5 text-primary" />,
      badge: "XLSX / CSV",
    },
    {
      title: "STEM-rich source material",
      desc: "Retain equations, units, diagrams, chemistry notation, tables, and image-to-question associations.",
      icon: <Atom className="h-5 w-5 text-primary" />,
      badge: "LaTeX / Media",
    },
  ];

  const technicalHandling = [
    {
      title: "Mathematics & equations",
      desc: "Preserve fractions, indices, symbols, and equations; use LaTeX or MathML where the agreed output requires them.",
    },
    {
      title: "Science diagrams & media",
      desc: "Extract or recreate assets only within the agreed scope; maintain correct associations between questions, captions, and figures.",
    },
    {
      title: "Assessment structures",
      desc: "Identify question stems, response options, keys provided by the source, explanations, and nested parts.",
    },
    {
      title: "Metadata & consistency",
      desc: "Standardize identifiers and supplied curriculum/topic/difficulty information without inventing missing metadata.",
    },
  ];

  const workflowStages = [
    {
      step: "01",
      title: "Review & scope",
      desc: "Inspect sample content, formats, complexity, target schema, and expected deliverables.",
    },
    {
      step: "02",
      title: "Extract",
      desc: "Retrieve text, tables, equations, and media, using OCR-assisted methods for image-based content where appropriate.",
    },
    {
      step: "03",
      title: "Structure",
      desc: "Segment questions and normalize response options, answer-key fields, metadata, and media references.",
    },
    {
      step: "04",
      title: "Validate & review",
      desc: "Check completeness, consistency, formatting, and ambiguous or low-confidence content; flag issues for human review.",
    },
    {
      step: "05",
      title: "Deliver",
      desc: "Supply the agreed structured files, organized media assets, and a summary of exceptions or unresolved items.",
    },
  ];

  const deliverables = [
    {
      title: "Structured question records",
      desc: "Clearly separated stems, options, answers, explanations, and related fields as available in the source.",
    },
    {
      title: "Editable datasets",
      desc: "Agreed spreadsheet or structured data formats such as XLSX, CSV, or JSON.",
    },
    {
      title: "Organized media assets",
      desc: "Extracted images, diagrams, filenames, and references associated with their corresponding items.",
    },
    {
      title: "Validation & exception reports",
      desc: "Documentation of missing fields, ambiguous source passages, illegible content, and items requiring resolution.",
    },
  ];

  const audiences = [
    {
      title: "Educational publishers",
      desc: "Digitize legacy print-based exercises, question collections, and supplemental resources.",
    },
    {
      title: "EdTech product teams",
      desc: "Convert learning content into structured records for digital experiences.",
    },
    {
      title: "Assessment platforms",
      desc: "Prepare question banks for standardized content storage and downstream validation.",
    },
    {
      title: "Test-preparation providers",
      desc: "Normalize mixed-format question sets and support consistent production workflows.",
    },
  ];

  const faqs = [
    {
      q: "Can you digitize scanned and handwritten questions?",
      a: "Yes, depending on readability and complexity. We review representative samples first and identify which content requires manual transcription or extra verification.",
    },
    {
      q: "How are equations and scientific diagrams handled?",
      a: "We consider the format required by your publishing or assessment system. Mathematical notation and diagrams may need specialized extraction, formatting, and human review.",
    },
    {
      q: "Do you provide only extracted text?",
      a: "No. Projects can also include question segmentation, structured answer options, metadata normalization, media linkage, and validation reporting, as agreed in scope.",
    },
    {
      q: "What file formats can you deliver?",
      a: "Typical structured deliverables can include XLSX, CSV, or JSON. LMS-specific formats are scoped separately as part of the migration workflow.",
    },
    {
      q: "How do we start?",
      a: "Share a representative sample and your target output format. We can evaluate complexity, identify potential issues, and propose a defined scope.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <Navbar />

      {/* Section A — Hero */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-12 sm:pt-16">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/services" className="hover:text-foreground transition-colors">
            Services
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium">Content Digitization</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          <div className="lg:col-span-7">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              <FileScan className="h-3.5 w-3.5" />
              ASSESSMENT CONTENT SERVICES / CONTENT DIGITIZATION
            </div>

            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-5xl leading-[1.15]">
              From source documents to structured digital content.
            </h1>

            <p className="mt-5 text-base sm:text-lg leading-relaxed text-foreground font-medium">
              Turn textbooks, worksheets, scanned assessments, handwritten questions, and legacy question banks into clean, editable, structured educational content.
            </p>

            <p className="mt-3.5 text-xs sm:text-sm leading-relaxed text-muted-foreground">
              Husimi supports educational publishers, EdTech companies, and assessment providers with document conversion and question digitization. Our approach focuses on more than extracting text: we preserve the meaning and structure of questions, formulas, figures, answer choices, and supporting metadata.
            </p>

            {/* Micro-labels */}
            <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center rounded-md border border-border bg-card px-2.5 py-1 font-medium text-foreground">
                PDF &amp; DOCX
              </span>
              <span className="text-border">·</span>
              <span className="inline-flex items-center rounded-md border border-border bg-card px-2.5 py-1 font-medium text-foreground">
                Scans &amp; Handwriting
              </span>
              <span className="text-border">·</span>
              <span className="inline-flex items-center rounded-md border border-border bg-card px-2.5 py-1 font-medium text-foreground">
                STEM Content
              </span>
              <span className="text-border">·</span>
              <span className="inline-flex items-center rounded-md border border-border bg-card px-2.5 py-1 font-medium text-foreground">
                Structured Data
              </span>
            </div>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="#contact"
                className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-6 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
              >
                Discuss a Digitization Project
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
              <a
                href="#workflow"
                className="inline-flex h-11 items-center gap-2 rounded-md border border-border bg-background px-6 text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                Explore Our Process
              </a>
            </div>
          </div>

          {/* Hero Visual: Source-to-Structured Technical Composition */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-md lg:max-w-none space-y-3 font-mono text-xs">
              {/* Source Document Card */}
              <div className="rounded-xl border border-border bg-card p-4 shadow-2xs">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/70 text-[11px] text-muted-foreground font-sans">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground uppercase tracking-wider text-[10px]">
                    <FileText className="h-3 w-3 text-primary" />
                    Source Material (PDF / Scan)
                  </div>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">Page 42</span>
                </div>
                <div className="space-y-1.5 text-muted-foreground font-sans text-xs">
                  <p className="text-foreground font-medium">
                    12. A car starts from rest ($u = 0$) and accelerates at $2.5\text{ m/s}^2$ for $6\text{ s}$.
                  </p>
                  <p className="text-[11px] pl-2 text-muted-foreground">
                    (A) 12 m/s &nbsp; (B) 15 m/s &nbsp; (C) 18 m/s &nbsp; (D) 20 m/s
                  </p>
                  <div className="pt-1 text-[11px] text-muted-foreground italic font-mono">
                    Key provided: B
                  </div>
                </div>
              </div>

              {/* Transformation Bridge */}
              <div className="flex items-center justify-center gap-2 text-muted-foreground text-[11px] font-sans">
                <div className="h-px w-12 bg-border"></div>
                <span className="flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                  <Binary className="h-3 w-3" />
                  Structure &amp; LaTeX Extraction
                </span>
                <div className="h-px w-12 bg-border"></div>
              </div>

              {/* Parsed Structured Output */}
              <div className="rounded-xl border border-border bg-card p-4 shadow-2xs">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/70 text-[11px] text-muted-foreground font-sans">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground uppercase tracking-wider text-[10px]">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    Structured Educational Item
                  </div>
                  <span className="rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 text-[10px] font-medium font-sans">
                    Validated
                  </span>
                </div>
                <div className="space-y-1 text-[11px] text-muted-foreground">
                  <div>
                    <span className="text-primary font-semibold">"id": </span>
                    <span className="text-foreground">"PHY-KIN-042"</span>,
                  </div>
                  <div>
                    <span className="text-primary font-semibold">"type": </span>
                    <span className="text-foreground">"single_choice"</span>,
                  </div>
                  <div>
                    <span className="text-primary font-semibold">"stem": </span>
                    <span className="text-foreground">"A car starts from rest ($u = 0$)..."</span>,
                  </div>
                  <div>
                    <span className="text-primary font-semibold">"options": </span>
                    <span className="text-foreground">&#123; "A": "12 m/s", "B": "15 m/s", ... &#125;</span>,
                  </div>
                  <div>
                    <span className="text-primary font-semibold">"correct_key": </span>
                    <span className="text-foreground">"B"</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section B — The challenge */}
      <section className="border-t border-border bg-muted/20 px-6 py-20 transition-colors">
        <div className="mx-auto w-full max-w-6xl">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-wider text-primary">
              WHY STRUCTURE MATTERS
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Digitization is more than copying text.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Educational materials often contain nested questions, equations, tables, image references, answer keys, and formatting that carries meaning. A plain OCR export can lose those relationships. We focus on converting source material into content that editorial, product, and assessment teams can actually review, update, and reuse.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {whyStructureCards.map((card, idx) => (
              <div key={idx} className="rounded-xl border border-border bg-card p-6 shadow-xs">
                <h3 className="text-sm font-semibold text-foreground">{card.title}</h3>
                <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section C — What we digitize */}
      <section className="px-6 py-20 transition-colors">
        <div className="mx-auto w-full max-w-6xl">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-wider text-primary">
              SOURCE MATERIALS
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Built for the formats educational teams already use.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              We work with both born-digital and image-based educational materials, from individual problem sets to larger legacy collections.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sourceMaterials.map((item, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-border bg-card p-6 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      {item.icon}
                    </div>
                    <span className="text-[10px] font-mono font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {item.badge}
                    </span>
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-8 text-xs text-muted-foreground">
            Conversion scope is assessed from representative samples, especially for low-resolution scans, handwriting, and complex layouts.
          </p>
        </div>
      </section>

      {/* Section D — Technical content handling */}
      <section className="border-t border-border bg-muted/20 px-6 py-20 transition-colors">
        <div className="mx-auto w-full max-w-6xl">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-wider text-primary">
              STEM-AWARE DIGITIZATION
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              The details matter—especially in technical content.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              A misplaced exponent, missing figure, or detached answer choice can change an assessment item entirely. Digitization therefore needs to account for the structure and meaning of the original question, not just its visual appearance.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {technicalHandling.map((item, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-border bg-card p-5 shadow-2xs flex items-start gap-3"
              >
                <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <span className="font-semibold text-foreground">{item.title}: </span>
                  <span className="text-muted-foreground">{item.desc}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-start gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <span>Where source content is ambiguous or damaged, flag it for review rather than silently guessing.</span>
          </div>
        </div>
      </section>

      {/* Section E — Before / after example */}
      <section className="px-6 py-20 transition-colors">
        <div className="mx-auto w-full max-w-6xl">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-wider text-primary">
              WHAT STRUCTURED CONTENT LOOKS LIKE
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              One question. A more usable format.
            </h2>
            <p className="mt-3 text-xs text-muted-foreground">
              Illustrative example demonstrating source transformation into structured item records.
            </p>
          </div>

          {/* Two-Panel Visualization */}
          <div className="mt-8 grid gap-6 md:grid-cols-2 max-w-4xl">
            {/* Left: Source Document */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    SOURCE DOCUMENT
                  </h3>
                  <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                    Raw Print / PDF
                  </span>
                </div>
                <div className="mt-5 space-y-4 text-xs font-sans text-foreground">
                  <p className="font-medium leading-relaxed">
                    Q12. A body starts from rest and accelerates uniformly at 2 m/s² for 4 s. What is its final speed?
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-muted-foreground pl-2 text-xs">
                    <div>(A) 4 m/s</div>
                    <div>(B) 6 m/s</div>
                    <div>(C) 8 m/s</div>
                    <div>(D) 10 m/s</div>
                  </div>
                  <div className="pt-2 border-t border-border/60 text-xs font-semibold text-foreground">
                    Answer key: C
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-3 border-t border-border/50 text-[11px] text-muted-foreground">
                Unstructured text representation
              </div>
            </div>

            {/* Right: Structured Item */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-xs flex flex-col justify-between font-mono">
              <div>
                <div className="flex items-center justify-between border-b border-border pb-3 font-sans">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">
                    STRUCTURED ITEM
                  </h3>
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    Normalized Data
                  </span>
                </div>
                <div className="mt-5 space-y-2 text-xs text-muted-foreground">
                  <div>
                    <span className="text-foreground font-medium">identifier: </span>
                    <span className="text-primary font-semibold">"PHY-KIN-012"</span>
                  </div>
                  <div>
                    <span className="text-foreground font-medium">question_type: </span>
                    <span>"single_choice"</span>
                  </div>
                  <div>
                    <span className="text-foreground font-medium">stem: </span>
                    <span className="text-foreground">"A body starts from rest and accelerates..."</span>
                  </div>
                  <div>
                    <span className="text-foreground font-medium">options: </span>
                    <span>&#123; A: "4 m/s", B: "6 m/s", C: "8 m/s", D: "10 m/s" &#125;</span>
                  </div>
                  <div>
                    <span className="text-foreground font-medium">correct_answer: </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">"C"</span>
                  </div>
                  <div>
                    <span className="text-foreground font-medium">topic: </span>
                    <span>"Kinematics"</span>
                  </div>
                  <div>
                    <span className="text-foreground font-medium">assets: </span>
                    <span>none</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-3 border-t border-border/50 text-[11px] text-muted-foreground font-sans">
                Ready for database ingestion, editor workflows, or platform export
              </div>
            </div>
          </div>

          <p className="mt-4 text-[11px] text-muted-foreground italic">
            Illustrative field names only; the actual delivery schema is agreed for each project.
          </p>
        </div>
      </section>

      {/* Section F — Process */}
      <section id="workflow" className="border-t border-border bg-muted/20 px-6 py-20 transition-colors">
        <div className="mx-auto w-full max-w-6xl">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-wider text-primary">
              OUR WORKFLOW
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              From intake to quality-reviewed delivery.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              A practical workflow makes conversions predictable and surfaces source-quality issues before they become downstream problems.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {workflowStages.map((wf, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-primary font-mono">{wf.step}</div>
                  <h3 className="mt-2 text-xs font-semibold text-foreground">{wf.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{wf.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section G — Deliverables */}
      <section className="px-6 py-20 transition-colors">
        <div className="mx-auto w-full max-w-6xl">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-wider text-primary">
              DELIVERABLES
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Digital content ready for your next workflow.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Deliverables are defined by the receiving system and the content's complexity.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {deliverables.map((del, idx) => (
              <div key={idx} className="rounded-xl border border-border bg-card p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{del.title}</h3>
                  <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">{del.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-8 text-xs text-muted-foreground">
            Need QTI 2.1/3.0, Canvas, or Moodle-specific packages? Explore Husimi's{" "}
            <Link
              to="/services#lms-migration"
              className="font-medium text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
            >
              LMS &amp; Assessment Migration
            </Link>{" "}
            service.
          </p>
        </div>
      </section>

      {/* Section H — Who we work with */}
      <section className="border-t border-border bg-muted/20 px-6 py-20 transition-colors">
        <div className="mx-auto w-full max-w-6xl">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-wider text-primary">
              BUILT FOR CONTENT TEAMS
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Designed for teams managing educational content at scale.
            </h2>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {audiences.map((aud, idx) => (
              <div key={idx} className="rounded-xl border border-border bg-card p-6 shadow-xs">
                <h3 className="text-sm font-semibold text-foreground">{aud.title}</h3>
                <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">{aud.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section I — FAQ */}
      <section className="px-6 py-20 transition-colors">
        <div className="mx-auto w-full max-w-4xl">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-wider text-primary">
              COMMON QUESTIONS
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Questions before starting a digitization project?
            </h2>
          </div>

          <div className="mt-8 space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-border bg-card transition-colors"
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="flex w-full items-center justify-between p-5 text-left text-sm font-medium text-foreground hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-expanded={isOpen}
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 transition-transform duration-200 text-muted-foreground ${
                        isOpen ? "rotate-180 text-primary" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs leading-relaxed text-muted-foreground border-t border-border/50">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section J — Final CTA */}
      <section id="contact" className="border-t border-border bg-muted/20 px-6 py-20 transition-colors">
        <div className="mx-auto w-full max-w-6xl">
          <div className="mb-10 max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-wider text-primary">
              START WITH A REPRESENTATIVE SAMPLE
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Have educational content that needs to become digital?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Tell us what your source files look like, how many items you need to process, and where the final content needs to go. We'll help define a digitization approach and the right deliverables.
            </p>

            {/* Small secondary internal links */}
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>Adjacent services:</span>
              <Link
                to="/services/content-development"
                className="font-medium text-primary hover:underline transition-colors"
              >
                Content Development
              </Link>
              <span>·</span>
              <Link
                to="/services#qa-remediation"
                className="font-medium text-primary hover:underline transition-colors"
              >
                Question Bank QA
              </Link>
              <span>·</span>
              <Link
                to="/services#lms-migration"
                className="font-medium text-primary hover:underline transition-colors"
              >
                LMS &amp; Assessment Migration
              </Link>
            </div>
          </div>

          <ContactProjectForm embedded defaultProjectType="Digitization" />
        </div>
      </section>

      <Footer />
    </div>
  );
}
