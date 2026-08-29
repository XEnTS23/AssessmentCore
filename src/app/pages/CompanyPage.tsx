import { Link } from "react-router";
import {
  ArrowRight,
  Code2,
  Globe2,
  Rocket,
  Shield,
  Target,
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

export function CompanyPage() {
  const { isDark } = useTheme();

  const values = [
    {
      icon: <Target className="h-6 w-6" />,
      title: "Deterministic Precision",
      description:
        "We don't guess. Our pipelines are built on strict, rule-based validation. If a question package exports from our system, it is guaranteed to render correctly.",
    },
    {
      icon: <Code2 className="h-6 w-6" />,
      title: "Standards Obsession",
      description:
        "IMS Global standards and QTI 3.0 are our baselines. We engineer custom adapters to handle the undocumented realities of major LMS platforms.",
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Data Integrity",
      description:
        "We treat your assessment data with absolute respect. Our 3-pass cleaning pipeline ensures zero data degradation during the transformation process.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <Navbar />

      {/* Hero Section */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-20">
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            <Globe2 className="h-4 w-4" />
            Our Mission
          </div>
          <h1 className="max-w-4xl text-5xl font-semibold tracking-tight leading-[1.1]">
            Engineering the infrastructure for{" "}
            <span className="text-primary">digital assessments.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            AssessmentCore was built to bridge the gap between raw data and
            modern Learning Management Systems through uncompromising
            computational logic.
          </p>
        </div>
      </section>

      {/* The Story Section */}
      <section className="border-t border-border bg-muted/30 px-6 py-24 transition-colors duration-200">
        <div className="mx-auto grid w-full max-w-6xl gap-16 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">
              The problem with manual data entry.
            </h2>
            <div className="mt-6 space-y-6 text-base leading-relaxed text-muted-foreground">
              <p>
                For years, educators, publishers, and instructional designers
                have been trapped in a cycle of manual copying and pasting.
                Manually retyping complex physics diagrams, bilingual text, and
                nested LaTeX equations from messy legacy PDFs into Canvas or
                Moodle meant thousands of hours wasted fighting fragile XML
                schemas and broken image links.
              </p>
              <p>
                Founded in Tamluk, West Bengal, AssessmentCore was built by
                developers who were tired of seeing institutions waste thousands
                of hours on data wrangling instead of pedagogy.
              </p>
              <p>
                We realized that assessment generation didn't need a new
                authoring tool—it needed an industrial-grade transformation
                pipeline. We built a system that relies on a deterministic
                Identifier-First Strategy to validate, clean, and package bulk
                data with mathematical certainty.
              </p>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-primary/5 blur-3xl" />
            <div className="relative grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col justify-center rounded-[0.625rem] border border-border bg-card p-6 shadow-sm">
                <div className="text-4xl font-bold tracking-tight text-foreground">
                  10,000+
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  Questions digitized per batch
                </div>
              </div>
              <div className="flex flex-col justify-center rounded-[0.625rem] border border-border bg-card p-6 shadow-sm">
                <div className="text-4xl font-bold tracking-tight text-foreground">
                  25+
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  Deterministic validation rules
                </div>
              </div>
              <div className="flex flex-col justify-center rounded-[0.625rem] border border-border bg-card p-6 shadow-sm sm:col-span-2">
                <div className="text-4xl font-bold tracking-tight text-foreground">
                  100%
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  LMS formatting compliance
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="mx-auto w-full max-w-6xl px-6 py-24">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-semibold tracking-tight">
            Our Core Principles
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            The engineering standards that dictate every line of our codebase.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {values.map((value, idx) => (
            <div
              key={idx}
              className="group rounded-[0.625rem] border border-border bg-card p-8 shadow-sm transition-all hover:shadow-md hover:border-primary/30"
            >
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                {value.icon}
              </div>
              <h3 className="mb-3 text-lg font-semibold tracking-tight text-foreground">
                {value.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {value.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact CTA */}
      <section className="border-t border-border bg-workspace-bg px-6 py-24 transition-colors duration-200">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center text-center">
          <Rocket className="mb-6 h-12 w-12 text-primary" />
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">
            Ready to upgrade your infrastructure?
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
            Whether you have a technical question about our XML adapters or need
            to discuss an enterprise-scale migration, our engineering team is
            ready to help.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              to="/contact"
              className="inline-flex h-12 items-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-all"
            >
              Contact our team
              <ArrowRight className="h-4 w-4" />
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
                <img
                  src={isDark ? "/logo-dark-1.png" : "/AC_logo.png"}
                  alt="AssessmentCore logo"
                  className="h-7 w-7 rounded-md object-contain"
                />
                <span className="text-sm font-semibold text-foreground">
                  AssessmentCore
                </span>
              </div>
              <p className="mt-3 max-w-sm text-xs leading-relaxed text-muted-foreground">
                Build, validate, and export high-quality assessments with a
                deterministic workflow and LMS-ready outputs.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Contact
              </h4>
              <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                <a
                  href="mailto:hello@assessmentcore.in"
                  className="flex items-center gap-2 hover:text-foreground transition-colors"
                >
                  <Mail className="h-3.5 w-3.5" />
                  hello@assessmentcore.in
                </a>
                <a
                  href="tel:+919382565942"
                  className="flex items-center gap-2 hover:text-foreground transition-colors"
                >
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
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Connect
              </h4>
              <div className="mt-3 flex items-center gap-2">
                <a
                  href="https://www.linkedin.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="LinkedIn"
                  className="rounded-md border border-border bg-background p-2 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
                >
                  <Linkedin className="h-4 w-4" />
                </a>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="GitHub"
                  className="rounded-md border border-border bg-background p-2 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
                >
                  <Github className="h-4 w-4" />
                </a>
                <a
                  href="https://www.facebook.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook"
                  className="rounded-md border border-border bg-background p-2 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
                >
                  <Facebook className="h-4 w-4" />
                </a>
                <a
                  href="https://wa.me/919382565942"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="WhatsApp"
                  className="rounded-md border border-border bg-background p-2 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                </a>
                <a
                  href="https://www.youtube.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="YouTube"
                  className="rounded-md border border-border bg-background p-2 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
                >
                  <Youtube className="h-4 w-4" />
                </a>
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
                <Link
                  to="/documentation"
                  className="hover:text-foreground transition-colors"
                >
                  Documentation
                </Link>
                <Link
                  to="/changelog"
                  className="hover:text-foreground transition-colors"
                >
                  Changelog
                </Link>
                <Link
                  to="/status"
                  className="hover:text-foreground transition-colors"
                >
                  Status
                </Link>
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
