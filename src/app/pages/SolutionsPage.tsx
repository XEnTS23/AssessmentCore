import { Link } from "react-router";
import {
  ArrowRight,
  Briefcase,
  Check,
  Cpu,
  Database,
  FileCheck2,
  FileSpreadsheet,
  GraduationCap,
  Layers,
  Library,
  Network,
  Server,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { ContactProjectForm } from "../components/ContactProjectForm";

export function SolutionsPage() {
  const audienceSolutions = [
    {
      id: "platforms",
      icon: <Server className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
      audience: "Assessment Platforms",
      heading: "Scale content authoring and frictionless customer migrations",
      challenge:
        "New customers frequently bring disorganized item banks stored in Word documents, old database dumps, or heterogeneous CSV files. Manually re-keying items delays onboarding.",
      solution:
        "Husimi provides the backend ingestion and conversion pipeline. We normalize question types, extract metadata, structure formulas into LaTeX/MathML, and deliver QTI or JSON files conforming to your authoring API.",
      benefits: [
        "Accelerate new platform customer onboarding from months to days",
        "Normalize varied client formats into standard QTI 2.1 or 3.0",
        "Deterministic rule validation prevents corrupt questions from entering your item repository",
        "Preserve complex math notation and diagram bindings without manual recopying",
      ],
    },
    {
      id: "edtech",
      icon: <GraduationCap className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />,
      audience: "EdTech Companies",
      heading: "Reliable assessment content operations for digital learning products",
      challenge:
        "Scaling a learning product requires continuous delivery of fresh, accurate practice questions and diagnostic assessments. Internal engineering teams shouldn't be wrangling assessment formatting.",
      solution:
        "Husimi functions as your assessment content operations partner. We author, digitize, and validate assessment assets aligned to curriculum standards and deliver clean JSON or LMS packages ready for production.",
      benefits: [
        "Outsource routine question authoring and digitization with strict QA",
        "Accurate taxonomy tagging, Bloom's taxonomy mapping, and difficulty scoring",
        "Comprehensive answer explanations and step-by-step diagnostic feedback",
        "Fast turnaround on backlogs so product teams stay focused on software",
      ],
    },
    {
      id: "test-prep",
      icon: <Zap className="h-6 w-6 text-amber-600 dark:text-amber-400" />,
      audience: "Test-Prep Organizations",
      heading: "High-volume STEM question libraries with diagrams and solutions",
      challenge:
        "Competitive exam preparation (such as JEE, NEET, SAT, AP, or regional mock tests) relies on thousands of intricate physics circuit diagrams, chemical structures, and multi-step math proofs.",
      solution:
        "Husimi digitizes legacy printed mock tests, binds spatial diagrams to their exact question stems, parses LaTeX equations, and ensures answer keys match pedagogical step-by-step solutions.",
      benefits: [
        "Spatial diagram binding links cropped graphics to the right question stems",
        "Multi-lingual and regional language font handling alongside English stems",
        "Rigorous verification of answer keys against written explanations",
        "Bulk conversion of 10-year archives of past examination papers",
      ],
    },
    {
      id: "publishers",
      icon: <Library className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />,
      audience: "Publishers",
      heading: "Convert print textbooks & legacy digital archives into modern item banks",
      challenge:
        "Decades of high-value textbook exercises and teacher test banks are locked in print editions, scanned PDFs, or proprietary desktop software formats that cannot be ingested into modern LMS platforms.",
      solution:
        "We systematically extract problem sets, section reviews, and chapter tests from print or PDF layouts, convert them into structured QTI/JSON packages, and flag copyright and missing assets.",
      benefits: [
        "Monetize back-catalog print assets by transforming them into digital learning banks",
        "Extract chapter metadata, textbook references, and subject taxonomies",
        "Standardize formatting across multi-author editorial series",
        "Provide human verification of OCR anomalies in printed mathematical typography",
      ],
    },
    {
      id: "certification",
      icon: <FileCheck2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />,
      audience: "Training & Certification Providers",
      heading: "Secure, structured assessment banks for credentialing and LMS delivery",
      challenge:
        "Professional credentialing bodies require strict item bank integrity, psychometric validity tracking, and clean migrations into LMS or computer-based testing (CBT) engines.",
      solution:
        "Husimi audits and normalizes certification questions, verifies option schemas, checks identifier uniqueness, and prepares LMS-ready packages for Canvas, Moodle, Blackboard, or proprietary testing engines.",
      benefits: [
        "Audit question banks for duplicate identifiers, malformed keys, and missing options",
        "Package test forms with strict point values, negative marking, and time constraints",
        "Format questions specifically for high-stakes LMS testing engines",
        "Complete exception reporting for psychometric and compliance records",
      ],
    },
    {
      id: "partners",
      icon: <Network className="h-6 w-6 text-rose-600 dark:text-rose-400" />,
      audience: "LMS & Implementation Partners",
      heading: "A reliable backend execution partner for content migration contracts",
      challenge:
        "LMS implementation consultants excel at platform architecture, SSO, and SIS integration, but client assessment content migrations often turn into costly, manual copy-paste sinkholes.",
      solution:
        "Husimi acts as your white-label or backend assessment conversion partner. Hand us the client's messy source files; we deliver validated, platform-ready QTI packages that import cleanly.",
      benefits: [
        "Eliminate manual content re-entry from LMS deployment timelines",
        "Pre-test and adapt packages for Canvas, Moodle, and Blackboard quirks",
        "Protect fixed-price migration project margins with predictable delivery",
        "Direct expert support to troubleshoot stubborn LMS import error logs",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <Navbar />

      {/* Hero Section */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-20">
        <div className="flex flex-col items-start max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            <Users className="h-3.5 w-3.5" />
            Solutions by Organization Type
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl leading-[1.1]">
            Solutions for teams managing assessment content at scale.
          </h1>
          <p className="mt-5 text-base sm:text-lg leading-relaxed text-muted-foreground">
            Whether you run an assessment platform, build EdTech software, produce high-stakes test-prep, or migrate clients to modern LMS environments, Husimi delivers the content engineering and validation your workflow requires.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#contact"
              className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-6 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Discuss Your Use Case
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </section>

      {/* Audience Solutions Breakdown */}
      <section className="border-t border-border bg-muted/20 px-6 py-20 transition-colors">
        <div className="mx-auto w-full max-w-6xl space-y-16">
          {audienceSolutions.map((sol) => (
            <div
              key={sol.id}
              id={sol.id}
              className="scroll-mt-24 rounded-2xl border border-border bg-card p-8 shadow-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-muted/50">
                    {sol.icon}
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-primary">
                      {sol.audience}
                    </div>
                    <h2 className="text-xl font-semibold text-foreground sm:text-2xl">
                      {sol.heading}
                    </h2>
                  </div>
                </div>

                <a
                  href="#contact"
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-4 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <span>Discuss project</span>
                  <ArrowRight className="h-3 w-3" />
                </a>
              </div>

              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <div className="rounded-lg border border-border/80 bg-muted/20 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    The Content Challenge:
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {sol.challenge}
                  </p>
                </div>

                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-primary">
                    How Husimi Delivers:
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-foreground">
                    {sol.solution}
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <div className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3">
                  Key Operational Outcomes:
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {sol.benefits.map((benefit, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
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
