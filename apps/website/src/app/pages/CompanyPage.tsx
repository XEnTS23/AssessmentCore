import { Link } from "react-router";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Code2,
  Compass,
  FileCheck2,
  Globe2,
  Layers,
  MapPin,
  Shield,
  Sparkles,
  Target,
  UserCheck,
} from "lucide-react";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";

export function CompanyPage() {
  const companyValues = [
    {
      icon: <Target className="h-5 w-5 text-primary" />,
      title: "Outcome Over Hype",
      description:
        "We don't sell AI magic or superficial OCR. Our deliverable is usable, validated assessment content that imports reliably into production LMS and authoring platforms.",
    },
    {
      icon: <Code2 className="h-5 w-5 text-primary" />,
      title: "Standards & Interoperability",
      description:
        "We build around IMS Global QTI 2.1 / 3.0, clean LaTeX, and semantic MathML. We adapt to platform-specific quirks (such as Canvas or Moodle) with tested adapters.",
    },
    {
      icon: <Shield className="h-5 w-5 text-primary" />,
      title: "Transparency in Quality",
      description:
        "The goal is not to hide uncertainty behind false claims of 100% precision. It is to identify anomalies and missing assets before content ever reaches learners.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <Navbar />

      {/* Hero Section */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-20">
        <div className="flex flex-col items-start max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            <Globe2 className="h-3.5 w-3.5" />
            About Husimi
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl leading-[1.1]">
            Specialized assessment content services and technology.
          </h1>
          <p className="mt-5 text-base sm:text-lg leading-relaxed text-muted-foreground">
            Husimi helps education companies create, digitize, validate, and migrate assessment content. We build proprietary technology underneath our services to automate more of that work over time.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/contact"
              className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-6 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Discuss a Project
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              to="/services"
              className="inline-flex h-11 items-center gap-2 rounded-md border border-border bg-card px-5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              Explore Services
            </Link>
          </div>
        </div>
      </section>

      {/* The Story / Company Background */}
      <section className="border-t border-border bg-muted/20 px-6 py-20 transition-colors">
        <div className="mx-auto grid w-full max-w-6xl gap-12 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-7 space-y-5 text-sm leading-relaxed text-muted-foreground">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              <UserCheck className="h-4 w-4" />
              Our Background
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Built around real-world assessment authoring workflows
            </h2>
            <p>
              Husimi was established out of direct, hands-on experience authoring and managing digital assessment content for STEM education, test-prep curricula, and institutional learning platforms.
            </p>
            <p>
              Educators and content teams routinely struggle with the same frustrating bottleneck: decades of high-quality mock tests, practice problems, and question banks exist only in Word documents, multi-column print PDFs, or legacy spreadsheets. Moving them into modern systems like Canvas, Moodle, or custom testing platforms requires painful manual retyping, broken formulas, and detached diagrams.
            </p>
            <p>
              We founded Husimi to solve this content problem directly. Customers work with Husimi today to take responsibility for real assessment backlogs, while our proprietary technology platform is being engineered to increasingly automate segmentation, LaTeX extraction, validation, and QTI packaging.
            </p>
            <p>
              At Husimi, project clients work directly with the specialists who understand the assessment data structures, platform nuances, and parsing engine from the ground up.
            </p>
          </div>

          <div className="lg:col-span-5 rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-3">
              Direct Practical Experience
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-foreground">Canvas Assessment Workflows: </span>
                  Hands-on construction and troubleshooting of Classic and New Quizzes QTI packages.
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-foreground">Delta AT Authoring Workflows: </span>
                  Experience with digital item authoring, question structures, and content schemas.
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-foreground">STEM &amp; Physics Content: </span>
                  Specialized handling for circuit diagrams, chemical structures, and multi-step LaTeX formulas.
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-foreground">Structured Assessment Schemas: </span>
                  IMS Global QTI 2.1 &amp; 3.0 specification mapping, identifier rules, and response declarations.
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
              Based in Tamluk, West Bengal, India · Serving education companies and assessment platforms globally.
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="px-6 py-20 transition-colors">
        <div className="mx-auto w-full max-w-6xl">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-wide text-primary">
              Principles
            </div>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
              What guides our work
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              We approach educational content with the engineering discipline and pedagogical care it deserves.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {companyValues.map((val, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-border bg-card p-6 shadow-xs"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/40">
                  {val.icon}
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground">
                  {val.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {val.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Brand Architecture Relationship */}
      <section className="border-t border-border bg-muted/20 px-6 py-20 transition-colors">
        <div className="mx-auto w-full max-w-4xl text-center">
          <span className="text-xs font-semibold uppercase tracking-wide text-primary">
            Service &amp; Technology Platform
          </span>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            Our Approach &amp; Platform
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground max-w-2xl mx-auto">
            <strong className="text-foreground">Husimi</strong> takes full responsibility for complex assessment content backlogs (<code className="text-xs bg-muted px-1.5 py-0.5 rounded">husimisolutions.com</code>), using our proprietary processing pipeline to automate question segmentation, LaTeX extraction, validation rules, and platform-ready QTI exports.
          </p>

          <div className="mt-8 flex justify-center gap-3">
            <Link
              to="/contact"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Discuss Your Project
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              to="/documentation"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-card px-5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              Read Documentation
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
