import { Link } from "react-router";
import {
  ArrowRight,
  BookOpen,
  Code2,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  LibrarySquare,
  LifeBuoy,
  Sigma,
} from "lucide-react";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";

export function ResourcesPage() {
  const resourceCategories = [
    {
      icon: <FileSpreadsheet className="h-6 w-6" />,
      title: "Ingestion Schemas & Formatting",
      description:
        "Learn optimal PDF scanning resolutions, Word document formatting, and exact CSV/Excel structures for question bank ingestion.",
      link: "/documentation#formatting",
    },
    {
      icon: <LibrarySquare className="h-6 w-6" />,
      title: "Supported Question Types",
      description:
        "Comprehensive guides on formatting Multiple Choice, Multiple Select, True/False, and Text Entry questions.",
      link: "/documentation#question-types",
    },
    {
      icon: <Sigma className="h-6 w-6" />,
      title: "MathML & LaTeX Handling",
      description:
        "Understand how our engine parses mathematical equations and the differences between MathJax and native MathML outputs.",
      link: "/documentation#math-latex",
    },
    {
      icon: <Code2 className="h-6 w-6" />,
      title: "QTI 2.1 & 3.0 Specifications",
      description:
        "Deep dive into the underlying XML architecture. See how we map assessment data to valid IMS Global QTI nodes.",
      link: "/documentation#step-5",
    },
    {
      icon: <GraduationCap className="h-6 w-6" />,
      title: "LMS Export Guides",
      description:
        "Instructions and best practices for importing generated ZIP packages into Canvas, Moodle, and Blackboard.",
      link: "/documentation#step-5",
    },
    {
      icon: <LifeBuoy className="h-6 w-6" />,
      title: "Validation Rule Reference",
      description:
        "A complete list of the 25+ deterministic structural rules checked before content packaging.",
      link: "/documentation#step-2",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <Navbar />

      {/* Hero Section */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-20">
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            <BookOpen className="h-4 w-4" />
            Technical Documentation &amp; Guides
          </div>
          <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl leading-tight">
            Husimi technical library.
          </h1>
          <p className="mt-5 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            Explore our assessment processing architecture, validation rule catalog, and LMS-specific XML packaging adapters.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              to="/documentation"
              className="inline-flex h-[2.75rem] items-center justify-center gap-2 rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
            >
              <FileText className="h-4 w-4" />
              View Full Documentation
            </Link>
          </div>
        </div>
      </section>

      {/* Main Resources Grid */}
      <section className="border-t border-border bg-muted/30 px-6 py-20 transition-colors duration-200">
        <div className="mx-auto w-full max-w-6xl">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {resourceCategories.map((category, idx) => (
              <Link
                key={idx}
                to={category.link}
                className="group flex flex-col rounded-[0.625rem] border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/40"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  {category.icon}
                </div>
                <h3 className="mb-2 text-lg font-semibold tracking-tight text-foreground">
                  {category.title}
                </h3>
                <p className="mb-6 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {category.description}
                </p>
                <div className="mt-auto flex items-center gap-1.5 text-sm font-medium text-primary">
                  Read documentation
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Proof Package Section */}
      <section className="mx-auto w-full max-w-6xl px-6 py-24">
        <div className="flex flex-col items-center justify-between gap-8 rounded-2xl border border-border bg-card p-10 shadow-lg md:flex-row md:p-12">
          <div className="max-w-xl">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Proof Package
            </div>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
              Download a Sample Conversion Package
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Inspect a real sample: download a multi-column STEM Physics PDF alongside the validated, LMS-ready QTI 3.0 package generated through our assessment workflow.
            </p>
          </div>
          <div className="flex shrink-0 gap-3">
            <Link
              to="/resources/sample-package"
              className="inline-flex h-12 items-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-all"
            >
              <FileText className="h-4 w-4" />
              Download Sample .zip
            </Link>
            <Link
              to="/resources/source-pdf"
              className="inline-flex h-12 items-center gap-2 rounded-md border border-border bg-transparent px-6 text-sm font-medium text-foreground hover:bg-muted transition-all"
            >
              View Source PDF
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
