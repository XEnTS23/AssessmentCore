import { Link } from "react-router";
import {
  ArrowRight,
  ArrowUpRight,
  Atom,
  Check,
  CheckCircle2,
  ChevronRight,
  Code2,
  Cpu,
  Crop,
  Database,
  FileCheck2,
  FileCode,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Layers,
  Library,
  Network,
  RefreshCw,
  Search,
  Server,
  ShieldAlert,
  Sigma,
  Sparkles,
  UserCheck,
  Workflow,
  Zap,
} from "lucide-react";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { ContactProjectForm } from "../components/ContactProjectForm";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <Navbar />

      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-background via-muted/10 to-background px-6 pt-16 pb-16 lg:pt-24 lg:pb-20">
        {/* Ambient background graphics */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          {/* Subtle radial blueprint dot-matrix */}
          <div
            className="absolute inset-0 opacity-[0.035] dark:opacity-[0.06]"
            style={{
              backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
              backgroundSize: "24px 24px",
              maskImage: "radial-gradient(ellipse at 65% 35%, black 20%, transparent 75%)",
              WebkitMaskImage: "radial-gradient(ellipse at 65% 35%, black 20%, transparent 75%)",
            }}
          />

          {/* Soft ambient lighting gradient blobs */}
          <div className="absolute -top-32 right-1/4 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute top-1/3 -right-20 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />

          {/* Technical registration marks in negative space corners */}
          <div className="absolute top-6 left-6 font-mono text-[11px] text-border/80 select-none">
            + 0.00, 0.00
          </div>
          <div className="absolute top-6 right-6 font-mono text-[11px] text-border/80 select-none hidden lg:block">
            REF: STEM_PARSE_V2 +
          </div>
        </div>

        <div className="mx-auto w-full max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-7 flex flex-col items-start">
              {/* Capability line badge */}
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Create · Digitize · Validate · Migrate</span>
              </div>

              {/* Recommended Hero Headline */}
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl leading-tight">
                Assessment content, from source to platform.
              </h1>

              {/* Recommended Subheadline */}
              <p className="mt-5 text-base sm:text-lg leading-relaxed text-muted-foreground max-w-2xl">
                Husimi helps education companies create, digitize, validate, and migrate assessment content — from PDFs, Word documents, spreadsheets, scans, and legacy question banks to clean, structured, platform-ready assessments.
              </p>

              {/* CTAs */}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a
                  href="#contact"
                  className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-all hover:scale-[1.01]"
                >
                  Discuss a Project
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>

              {/* Strategic Outcome Note */}
              <div className="mt-8 rounded-lg border border-border/80 bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">The operational outcome: </span>
                Give Husimi the assessment-content problem. Receive clean, validated, usable assessment content back.
              </div>
            </div>

            {/* Right Interactive STEM & Mathematical Syntax Canvas */}
            <div className="relative hidden lg:flex lg:col-span-5 flex-col justify-center gap-3.5 pl-4">
              {/* Card 1: LaTeX Calculus */}
              <div className="group relative flex items-center justify-between rounded-xl border border-border/80 bg-card/70 p-4 shadow-xs backdrop-blur-xs transition-all duration-300 ease-out hover:-translate-y-1 hover:border-primary/50 hover:bg-card hover:shadow-md cursor-default">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/60 text-indigo-600 dark:text-indigo-400 transition-all duration-300 group-hover:scale-110 group-hover:border-indigo-500/40 group-hover:bg-indigo-500/10">
                    <Sigma className="h-5 w-5 transition-transform duration-300 ease-out group-hover:rotate-12 group-hover:scale-110" />
                  </div>
                  <div>
                    <div className="font-mono text-xs font-semibold text-foreground tracking-wide transition-colors group-hover:text-primary">
                      ∫ f(x) dx · \sum_{`{i=1}`}^{`{n}`}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      LaTeX &amp; MathML notation preservation
                    </div>
                  </div>
                </div>
                <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                  MATH
                </span>
              </div>

              {/* Card 2: STEM Diagram & Coordinate Crop */}
              <div className="group relative flex items-center justify-between rounded-xl border border-border/80 bg-card/70 p-4 shadow-xs backdrop-blur-xs transition-all duration-300 ease-out hover:-translate-y-1 hover:border-primary/50 hover:bg-card hover:shadow-md cursor-default">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/60 text-emerald-600 dark:text-emerald-400 transition-all duration-300 group-hover:scale-110 group-hover:border-emerald-500/40 group-hover:bg-emerald-500/10">
                    <Crop className="h-5 w-5 transition-transform duration-300 ease-out group-hover:rotate-12 group-hover:scale-110" />
                  </div>
                  <div>
                    <div className="font-mono text-xs font-semibold text-foreground tracking-wide transition-colors group-hover:text-primary">
                      [x: 142, y: 388, w: 420, h: 280]
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Circuit &amp; STEM figure segmentation
                    </div>
                  </div>
                </div>
                <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                  CROP
                </span>
              </div>

              {/* Card 3: Chemical Molecular Bonds */}
              <div className="group relative flex items-center justify-between rounded-xl border border-border/80 bg-card/70 p-4 shadow-xs backdrop-blur-xs transition-all duration-300 ease-out hover:-translate-y-1 hover:border-primary/50 hover:bg-card hover:shadow-md cursor-default">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/60 text-amber-600 dark:text-amber-400 transition-all duration-300 group-hover:scale-110 group-hover:border-amber-500/40 group-hover:bg-amber-500/10">
                    <Atom className="h-5 w-5 transition-transform duration-300 ease-out group-hover:rotate-12 group-hover:scale-110" />
                  </div>
                  <div>
                    <div className="font-mono text-xs font-semibold text-foreground tracking-wide transition-colors group-hover:text-primary">
                      C₆H₁₂O₆ · Reaction Scheme
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Organic molecular structures &amp; bonds
                    </div>
                  </div>
                </div>
                <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                  STEM
                </span>
              </div>

              {/* Card 4: QTI 3.0 / IMS XML Structure */}
              <div className="group relative flex items-center justify-between rounded-xl border border-border/80 bg-card/70 p-4 shadow-xs backdrop-blur-xs transition-all duration-300 ease-out hover:-translate-y-1 hover:border-primary/50 hover:bg-card hover:shadow-md cursor-default">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/60 text-primary transition-all duration-300 group-hover:scale-110 group-hover:border-primary/40 group-hover:bg-primary/10">
                    <Code2 className="h-5 w-5 transition-transform duration-300 ease-out group-hover:rotate-12 group-hover:scale-110" />
                  </div>
                  <div>
                    <div className="font-mono text-xs font-semibold text-foreground tracking-wide transition-colors group-hover:text-primary">
                      &lt;qti-assessment-item /&gt;
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      IMS Global QTI 2.1 &amp; 3.0 standards
                    </div>
                  </div>
                </div>
                <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                  QTI 3.0
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

{/* 2. TRUST / CREDIBILITY STRIP UNDER HERO */}
      <section className="border-b border-border bg-card/60 px-6 py-4 transition-colors">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 text-xs font-medium text-muted-foreground">
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
            Core Focus Areas:
          </span>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Assessment Content Development
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              STEM Content Workflows
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Question Bank QA
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              LMS Migration
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              QTI 2.1 / 3.0 &amp; JSON
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Canvas &amp; Moodle Workflows
            </span>
          </div>
        </div>
      </section>

      {/* 3. WHO WE HELP SECTION */}
      <section id="solutions" className="px-6 py-20 transition-colors">
        <div className="mx-auto w-full max-w-6xl">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-wide text-primary">
              Target Audiences
            </div>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Built for teams that manage assessment content at scale
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              Whether migrating legacy archives, publishing new item banks, or validating high-stakes test material, Husimi provides operational support and backend execution.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: <Server className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
                title: "Assessment Platforms",
                description:
                  "For companies managing item banks, test delivery, assessment authoring, and customer migrations.",
                benefit: "Clean, structured imports that fit authoring schemas.",
              },
              {
                icon: <GraduationCap className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />,
                title: "EdTech Companies",
                description:
                  "For digital-learning businesses that need structured assessment content and reliable operational support.",
                benefit: "End-to-end question production and taxonomy alignment.",
              },
              {
                icon: <Zap className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
                title: "Test-Prep Companies",
                description:
                  "For organizations producing and maintaining high-volume practice-question libraries with complex STEM needs.",
                benefit: "Diagram-bound questions, formulas, and step-by-step solutions.",
              },
              {
                icon: <Library className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />,
                title: "Publishers",
                description:
                  "For editorial teams converting legacy print and digital content into structured, platform-ready assessment assets.",
                benefit: "Textbook problem sets transformed into digital items.",
              },
              {
                icon: <FileCheck2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />,
                title: "Training & Certification Providers",
                description:
                  "For organizations moving certification banks and exam pools into LMS or proctoring environments.",
                benefit: "Strict metadata tracking and answer key verification.",
              },
              {
                icon: <Network className="h-5 w-5 text-rose-600 dark:text-rose-400" />,
                title: "LMS / Implementation Partners",
                description:
                  "For service providers that need a reliable backend execution partner for client assessment migrations.",
                benefit: "Troubleshooting complex imports and XML format quirks.",
              },
            ].map((card, idx) => (
              <div
                key={idx}
                className="group rounded-xl border border-border bg-card p-6 shadow-xs transition-all hover:border-primary/40 hover:shadow-sm"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/50 transition-all duration-300 group-hover:scale-110 group-hover:bg-primary/10 group-hover:border-primary/30">
                  <div className="transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-6">
                    {card.icon}
                  </div>
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground">
                  {card.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {card.description}
                </p>
                <div className="mt-4 border-t border-border/60 pt-3 text-xs font-medium text-foreground">
                  <span className="text-muted-foreground font-normal">Outcome: </span>
                  {card.benefit}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. FOUR CORE SERVICES SECTION */}
      <section id="services" className="border-t border-border bg-muted/20 px-6 py-20 transition-colors">
        <div className="mx-auto w-full max-w-6xl">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-wide text-primary">
              Core Offerings
            </div>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Assessment content services
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              Husimi delivers four focused service pillars designed to take full responsibility for assessment content challenges.
            </p>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-2">
            {/* SERVICE 1 */}
            <div className="rounded-xl border border-border bg-card p-7 shadow-xs">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <h3 className="text-xl font-semibold text-foreground">
                  Assessment Content Development
                </h3>
                <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-primary">
                  Service 01
                </span>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                Create high-quality digital assessment content for learning platforms, test-prep products, publishers, and assessment systems.
              </p>
              <div className="mt-5 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  Capabilities &amp; Deliverables:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                  {[
                    "MCQ / single-choice items",
                    "Multiple-response items",
                    "Text-entry & numeric questions",
                    "Structured interactive items",
                    "STEM question authoring",
                    "Explanations & feedback",
                    "Difficulty tagging",
                    "Taxonomy & curriculum alignment",
                    "SME review workflows",
                    "Formatting standardization",
                  ].map((cap) => (
                    <div key={cap} className="flex items-center gap-1.5">
                      <Check className="h-3 w-3 text-emerald-600 shrink-0" />
                      <span>{cap}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* SERVICE 2 */}
            <div className="rounded-xl border border-border bg-card p-7 shadow-xs">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <h3 className="text-xl font-semibold text-foreground">
                  Assessment Content Digitization
                </h3>
                <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-primary">
                  Service 02
                </span>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                Turn unstructured and legacy educational material into clean, structured digital assessment content with human verification of ambiguous items.
              </p>
              <div className="mt-5 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  Capabilities &amp; Deliverables:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                  {[
                    "PDF to structured questions",
                    "Word (.docx) conversion",
                    "Spreadsheet / CSV normalization",
                    "Scanned-paper digitization",
                    "Handwritten assessment conversion",
                    "Mathematical notation recognition",
                    "STEM figure & diagram handling",
                    "Chemistry structure handling",
                    "Question segmentation",
                    "Interaction-type detection",
                  ].map((cap) => (
                    <div key={cap} className="flex items-center gap-1.5">
                      <Check className="h-3 w-3 text-emerald-600 shrink-0" />
                      <span>{cap}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* SERVICE 3 */}
            <div className="rounded-xl border border-border bg-card p-7 shadow-xs">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <h3 className="text-xl font-semibold text-foreground">
                  Question Bank QA &amp; Remediation
                </h3>
                <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-primary">
                  Service 03
                </span>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                Clean, normalize, and validate existing question banks before they reach learners or production systems. The goal is to identify uncertainty before production.
              </p>
              <div className="mt-5 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  Capabilities &amp; Deliverables:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                  {[
                    "Answer-key verification workflows",
                    "Malformed option detection",
                    "Duplicate-content checks",
                    "Metadata normalization",
                    "Identifier validation",
                    "Question-type consistency",
                    "Math & media asset checks",
                    "Missing asset detection",
                    "Exception reporting",
                    "Human review of uncertain items",
                  ].map((cap) => (
                    <div key={cap} className="flex items-center gap-1.5">
                      <Check className="h-3 w-3 text-emerald-600 shrink-0" />
                      <span>{cap}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* SERVICE 4 */}
            <div className="rounded-xl border border-border bg-card p-7 shadow-xs">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <h3 className="text-xl font-semibold text-foreground">
                  LMS &amp; Assessment Migration
                </h3>
                <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-primary">
                  Service 04
                </span>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                Prepare assessment content for modern LMS and assessment platforms without forcing internal teams to rebuild every item manually.
              </p>
              <div className="mt-5 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  Capabilities &amp; Deliverables:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                  {[
                    "Canvas workflows",
                    "Moodle workflows",
                    "QTI 2.1 standard packaging",
                    "QTI 3.0 standard packaging",
                    "Structured JSON exports",
                    "CSV / Excel normalization",
                    "Question-bank migration",
                    "Media packaging & linking",
                    "Import troubleshooting",
                    "Platform-specific validation",
                  ].map((cap) => (
                    <div key={cap} className="flex items-center gap-1.5">
                      <Check className="h-3 w-3 text-emerald-600 shrink-0" />
                      <span>{cap}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. HUMAN REVIEW / QUALITY MODEL */}
      <section className="border-t border-border bg-muted/20 px-6 py-20 transition-colors">
        <div className="mx-auto w-full max-w-6xl">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-wide text-primary">
              Quality Assurance Model
            </div>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Automation where it works. Review where it matters.
            </h2>
            <p className="mt-3.5 text-base leading-relaxed text-muted-foreground">
              We do not claim that software operates with magical zero-defect precision. Real educational content is messy and ambiguous. Our five-stage workflow automates the repetitive heavy lifting and surfaces exceptions for human verification before delivery.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              {
                step: "01",
                title: "Ingest",
                description:
                  "Source content arrives from Word, PDF, spreadsheet, scan, image, or legacy question bank.",
              },
              {
                step: "02",
                title: "Structure",
                description:
                  "Our automated pipeline extracts and organizes stems, options, answers, interactions, metadata, and media.",
              },
              {
                step: "03",
                title: "Validate",
                description:
                  "Automated rules identify structural problems, missing fields, malformed items, and inconsistent content.",
              },
              {
                step: "04",
                title: "Review",
                description:
                  "Ambiguous or unsupported items are flagged for human review instead of silently passing errors.",
              },
              {
                step: "05",
                title: "Deliver",
                description:
                  "Validated content is returned in the required structured format (QTI, JSON) or loaded into the target platform.",
              },
            ].map((st) => (
              <div
                key={st.step}
                className="relative rounded-xl border border-border bg-card p-5 shadow-xs transition-colors hover:border-primary/40"
              >
                <div className="text-2xl font-bold tracking-tight text-primary/30">
                  {st.step}
                </div>
                <h3 className="mt-3 text-sm font-semibold text-foreground">
                  {st.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {st.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. PROJECT / PILOT WORKFLOW */}
      <section className="border-t border-border px-6 py-20 transition-colors">
        <div className="mx-auto w-full max-w-6xl">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-wide text-primary">
              Getting Started
            </div>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Start with your own content
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              We make the first engagement low risk. Send a representative sample to test compatibility and review structured output before scoping a larger pilot.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {[
              {
                step: "Step 1",
                title: "Send a Sample",
                desc: "Share 20–30 representative questions from a real assessment-content workflow.",
              },
              {
                step: "Step 2",
                title: "We Evaluate",
                desc: "Husimi reviews source formats, content complexity, diagrams, and target LMS requirements.",
              },
              {
                step: "Step 3",
                title: "Sample Conversion",
                desc: "We process the sample and return the structured output, validation results, and exceptions.",
              },
              {
                step: "Step 4",
                title: "Scope a Pilot",
                desc: "If the result is useful, move to a defined 200–500 item pilot with agreed criteria.",
              },
              {
                step: "Step 5",
                title: "Scale",
                desc: "Scope larger migrations, recurring content authoring, or continuous question bank QA.",
              },
            ].map((flow) => (
              <div
                key={flow.step}
                className="rounded-xl border border-border bg-card p-5 shadow-xs"
              >
                <span className="text-xs font-semibold text-primary uppercase">
                  {flow.step}
                </span>
                <h3 className="mt-2 text-sm font-semibold text-foreground">
                  {flow.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {flow.desc}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 11. WORKFLOW POSITIONING */}
      <section className="border-t border-border bg-muted/20 px-6 py-20 transition-colors">
        <div className="mx-auto w-full max-w-6xl">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
                <UserCheck className="h-3.5 w-3.5" />
                Specialized Engineering
              </div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Built around real assessment workflows
              </h2>
              <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground max-w-2xl">
                <p>
                  Husimi is an assessment content and technology business. Our proprietary platform is being developed from hands-on experience with digital assessment authoring, STEM content production, structured question banks, and LMS workflows.
                </p>
                <p>
                  This direct involvement allows projects to stay close to the engineers building the underlying technology. You talk directly with specialists who understand how questions parse, validate, and render.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap gap-2 text-xs font-medium text-foreground">
                <span className="rounded-md border border-border bg-card px-3 py-1.5 shadow-xs">
                  Canvas Assessment Workflows
                </span>
                <span className="rounded-md border border-border bg-card px-3 py-1.5 shadow-xs">
                  Delta AT Authoring Workflows
                </span>
                <span className="rounded-md border border-border bg-card px-3 py-1.5 shadow-xs">
                  STEM &amp; Physics Content
                </span>
                <span className="rounded-md border border-border bg-card px-3 py-1.5 shadow-xs">
                  Structured Assessment Schemas
                </span>
                <span className="rounded-md border border-border bg-card px-3 py-1.5 shadow-xs">
                  QTI 2.1 &amp; 3.0 Standard Packaging
                </span>
              </div>
            </div>

            <div className="lg:col-span-4 rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Direct Contact
              </div>
              <div className="mt-3 text-base font-semibold text-foreground">
                Expert Review on Every Inquiry
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Have questions about custom formulas, legacy scanning formats, or an upcoming platform migration? Reach out directly.
              </p>
              <div className="mt-5 space-y-2 text-xs text-foreground font-medium">
                <div>hello@husimisolutions.com</div>
                <div>+91 9382565942</div>
                <div className="text-muted-foreground font-normal">Tamluk, India</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 12. CONTACT / PROJECT SCOPING SECTION */}
      <section id="contact" className="border-t border-border px-6 py-20 transition-colors">
        <div className="mx-auto w-full max-w-6xl">
          <ContactProjectForm embedded />
        </div>
      </section>

      {/* 13. FOOTER */}
      <Footer />
    </div>
  );
}
