import { Link } from "react-router";
import {
  ArrowRight,
  Briefcase,
  Check,
  CheckCircle2,
  Cpu,
  FileCheck2,
  FileCode2,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Layers,
  LineChart,
  Network,
  RefreshCw,
  Search,
  Server,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { ContactProjectForm } from "../components/ContactProjectForm";

export function ServicesPage() {
  const servicePillars = [
    {
      id: "content-development",
      number: "01",
      title: "Assessment Content Development",
      summary:
        "Create high-quality digital assessment content for learning platforms, test-prep products, publishers, and assessment systems.",
      capabilities: [
        "MCQ / single-choice items",
        "Multiple-response items (MSQ)",
        "Text-entry & numeric questions",
        "Structured and interactive assessment items",
        "STEM question development (Physics, Math, Chemistry)",
        "Answer explanations and step-by-step feedback",
        "Difficulty tagging & cognitive level mapping",
        "Curriculum and taxonomy alignment",
        "Subject-matter expert (SME) review workflows",
        "Content formatting and standardization",
      ],
      deliverable:
        "Delivered as structured question banks ready for platform authoring or LMS import, complete with keys, explanations, and media assets.",
    },
    {
      id: "digitization",
      number: "02",
      title: "Assessment Content Digitization",
      summary:
        "Turn unstructured and legacy educational material into clean, structured digital assessment content. Ambiguous items are flagged for human review.",
      capabilities: [
        "PDF to structured questions (native & scanned)",
        "Word document (.docx) extraction & conversion",
        "Spreadsheet / CSV normalization",
        "Scanned-paper test digitization",
        "Handwritten assessment conversion",
        "Mathematical notation recognition (LaTeX/MathML)",
        "STEM figure and circuit diagram handling",
        "Chemistry skeletal structure handling",
        "Question segmentation across complex layouts",
        "Answer-option extraction & key mapping",
        "Interaction-type detection",
      ],
      deliverable:
        "Raw documents converted into structured digital items with diagrams neatly cropped, linked, and verified.",
    },
    {
      id: "qa-remediation",
      number: "03",
      title: "Question Bank QA & Remediation",
      summary:
        "Clean, normalize, and validate existing question banks before they reach learners or production systems. Identify uncertainty before production.",
      capabilities: [
        "Answer-key verification workflows",
        "Malformed option & truncated stem detection",
        "Duplicate-content & ID collision checks",
        "Metadata and taxonomy normalization",
        "Question-type consistency enforcement",
        "Math notation & LaTeX delimiter validation",
        "Missing asset and broken image detection",
        "Formatting and whitespace cleanup",
        "Detailed exception reporting",
        "Human review of uncertain or ambiguous items",
      ],
      deliverable:
        "A remediated question bank with an audit report detailing every flagged exception, repair made, and manual decision required.",
    },
    {
      id: "lms-migration",
      number: "04",
      title: "LMS & Assessment Migration",
      summary:
        "Prepare assessment content for modern LMS and assessment platforms without forcing internal teams to rebuild every item manually.",
      capabilities: [
        "Canvas assessment workflows & QTI packaging",
        "Moodle quiz XML & QTI import formatting",
        "QTI 2.1 standard packages",
        "QTI 3.0 standard packages",
        "Structured JSON exports for custom web apps",
        "CSV / Excel bulk upload schemas",
        "Media asset packaging & path resolution",
        "Import troubleshooting & platform quirk adaptation",
        "Legacy assessment conversion",
        "Platform-specific validation before deployment",
      ],
      deliverable:
        "Validated export packages tested against target platform requirements, with manual workarounds provided for platform rendering quirks.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <Navbar />

      {/* Hero Section */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-20">
        <div className="flex flex-col items-start max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            <Briefcase className="h-3.5 w-3.5" />
            Service Offerings
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl leading-[1.1]">
            Assessment content services, powered by proprietary technology.
          </h1>
          <p className="mt-5 text-base sm:text-lg leading-relaxed text-muted-foreground">
            Husimi helps education companies create, digitize, validate, and migrate assessment content. We combine assessment-authoring experience with proprietary automation technology to take responsibility for real assessment-content backlogs.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#contact"
              className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-6 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Discuss a Service Requirement
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </section>

      {/* Service Pillars Detailed Breakdown */}
      <section className="border-t border-border bg-muted/20 px-6 py-20 transition-colors">
        <div className="mx-auto w-full max-w-6xl space-y-16">
          {servicePillars.map((pillar) => (
            <div
              key={pillar.id}
              id={pillar.id}
              className="scroll-mt-24 rounded-2xl border border-border bg-card p-8 shadow-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Pillar {pillar.number}
                  </div>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                    {pillar.title}
                  </h2>
                </div>
                <a
                  href="#contact"
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-4 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <span>Scope this service</span>
                  <ArrowRight className="h-3 w-3" />
                </a>
              </div>

              <p className="mt-5 text-sm leading-relaxed text-muted-foreground max-w-3xl">
                {pillar.summary}
              </p>

              <div className="mt-8">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  Capabilities &amp; Scope:
                </h3>
                <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {pillar.capabilities.map((cap) => (
                    <div
                      key={cap}
                      className="flex items-start gap-2 text-xs text-muted-foreground"
                    >
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{cap}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 rounded-lg border border-border/80 bg-muted/30 p-4 text-xs text-foreground">
                <span className="font-semibold text-foreground">Deliverable: </span>
                <span className="text-muted-foreground">{pillar.deliverable}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Engagement Workflow */}
      <section className="px-6 py-20 transition-colors">
        <div className="mx-auto w-full max-w-6xl">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-wide text-primary">
              Delivery Framework
            </div>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
              How Husimi delivers your project
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              We structure projects so you can verify content accuracy and target platform import success early with low initial investment.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "01. Discovery & Sample",
                desc: "We analyze a sample of your content to determine math notation, diagram styles, and target LMS quirks.",
              },
              {
                step: "02. Processing & QA",
                desc: "Our automated engine extracts and structures the data, followed by human review of ambiguous questions.",
              },
              {
                step: "03. Validation Audit",
                desc: "Every item is checked against target schema rules, and an exception log is shared for transparency.",
              },
              {
                step: "04. Platform Delivery",
                desc: "Packages are delivered in your target format (QTI, Canvas, Moodle, JSON) ready for instructor use.",
              },
            ].map((st, idx) => (
              <div key={idx} className="rounded-xl border border-border bg-card p-5 shadow-xs">
                <div className="text-xs font-semibold text-primary">{st.step}</div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {st.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="border-t border-border px-6 py-20 transition-colors">
        <div className="mx-auto w-full max-w-6xl">
          <ContactProjectForm embedded />
        </div>
      </section>

      <Footer />
    </div>
  );
}
