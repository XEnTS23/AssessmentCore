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
  Facebook,
  Github,
  Linkedin,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Youtube,
} from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";
import { Navbar } from "../components/Navbar";

export function ResourcesPage() {
  const { isDark } = useTheme();

  const resourceCategories = [
    {
      icon: <FileSpreadsheet className="h-6 w-6" />,
      title: "Ingestion Schemas & OCR Guidelines",
      description: "Learn the optimal PDF scanning resolutions and layout best practices for our OCR engine, plus exact CSV/Excel structures for manual uploads.",
      link: "/docs/schemas",
    },
    {
      icon: <LibrarySquare className="h-6 w-6" />,
      title: "Supported Question Types",
      description: "Comprehensive guides on formatting Multiple Choice, Multiple Select, True/False, and Text Entry questions.",
      link: "/docs/question-types",
    },
    {
      icon: <Sigma className="h-6 w-6" />,
      title: "MathML & LaTeX Handling",
      description: "Understand how our engine parses mathematical equations and the differences between MathJax and native MathML outputs.",
      link: "/docs/math-rendering",
    },
    {
      icon: <Code2 className="h-6 w-6" />,
      title: "QTI 3.0 Specifications",
      description: "Deep dive into the underlying XML architecture. See how we map spreadsheet data to valid IMS Global QTI 3.0 nodes.",
      link: "/docs/qti-specs",
    },
    {
      icon: <GraduationCap className="h-6 w-6" />,
      title: "LMS Export Guides",
      description: "Step-by-step instructions for importing your generated ZIP packages into Canvas, Moodle, and Blackboard.",
      link: "/docs/lms-exports",
    },
    {
      icon: <LifeBuoy className="h-6 w-6" />,
      title: "Validation Rule Reference",
      description: "A complete list of the 25+ deterministic structural rules our system checks before allowing an export.",
      link: "/docs/validation-rules",
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
            Technical Library
          </div>
          <h1 className="max-w-4xl text-5xl font-semibold tracking-tight leading-[1.1]">
            Master the <span className="text-primary">computational pipeline.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Everything you need to know about our deterministic architecture, validation logic, and LMS-specific XML formatting adapters.
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
                <h3 className="mb-2 text-lg font-semibold tracking-tight text-foreground">{category.title}</h3>
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

      {/* Featured Template Section */}
      <section className="mx-auto w-full max-w-6xl px-6 py-24">
        <div className="flex flex-col items-center justify-between gap-8 rounded-2xl border border-border bg-card p-10 shadow-lg md:flex-row md:p-12">
          <div className="max-w-xl">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Quick Start</div>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
              Download a Proof-of-Concept Package
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Don't just take our word for it. Download a messy, multi-column Physics PDF alongside the flawless, LMS-ready QTI 3.0 package our deterministic engine generated from it.
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
              View the source PDF
            </Link>
          </div>
        </div>
      </section>

      {/* Standard Footer */}
      <footer className="border-t border-border bg-muted/50 px-6 transition-colors duration-200">
        <div className="mx-auto w-full max-w-7xl py-10">
          <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr]">
            <div>
              <div className="flex items-center gap-2">
                <img src={isDark ? '/logo-dark-1.png' : '/AC_logo.png'} alt="AssessmentCore logo" className="h-7 w-7 rounded-md object-contain" />
                <span className="text-sm font-semibold text-foreground">AssessmentCore</span>
              </div>
              <p className="mt-3 max-w-sm text-xs leading-relaxed text-muted-foreground">
                Build, validate, and export high-quality assessments with a deterministic workflow and LMS-ready outputs.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact</h4>
              <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                <a href="mailto:hello@assessmentcore.in" className="flex items-center gap-2 hover:text-foreground transition-colors">
                  <Mail className="h-3.5 w-3.5" />
                  hello@assessmentcore.in
                </a>
                <a href="tel:+919382565942" className="flex items-center gap-2 hover:text-foreground transition-colors">
                  <Phone className="h-3.5 w-3.5" />
                  +91 9382565942
                </a>
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-3.5 w-3.5" />
                  <span>Tamluk, India</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Connect</h4>
              <div className="mt-3 flex items-center gap-2">
                <a href="https://www.linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn" className="rounded-md border border-border bg-background p-2 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors">
                  <Linkedin className="h-4 w-4" />
                </a>
                <a href="https://github.com" target="_blank" rel="noreferrer" aria-label="GitHub" className="rounded-md border border-border bg-background p-2 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors">
                  <Github className="h-4 w-4" />
                </a>
                <a href="https://www.facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook" className="rounded-md border border-border bg-background p-2 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors">
                  <Facebook className="h-4 w-4" />
                </a>
                <a href="https://wa.me/919382565942" target="_blank" rel="noreferrer" aria-label="WhatsApp" className="rounded-md border border-border bg-background p-2 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors">
                  <MessageCircle className="h-4 w-4" />
                </a>
                <a href="https://www.youtube.com" target="_blank" rel="noreferrer" aria-label="YouTube" className="rounded-md border border-border bg-background p-2 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors">
                  <Youtube className="h-4 w-4" />
                </a>
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
                <Link to="/documentation" className="hover:text-foreground transition-colors">Documentation</Link>
                <Link to="/changelog" className="hover:text-foreground transition-colors">Changelog</Link>
                <Link to="/status" className="hover:text-foreground transition-colors">Status</Link>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-border pt-4 text-xs text-muted-foreground">
            AssessmentCore · v1.0 · {new Date().getFullYear()}
          </div>
        </div>
      </footer>
    </div>
  );
}