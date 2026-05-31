import { Link } from "react-router";
import {
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle,
  FileDigit,
  GraduationCap,
  HardDriveUpload,
  LineChart,
  PackageCheck,
  Facebook,
  Github,
  Linkedin,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Youtube,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { Navbar } from "../components/Navbar";

export function ServicesPage() {
  const { isDark } = useTheme();
  const { isAuthenticated } = useAuth();

  const services = [
    {
      icon: <HardDriveUpload className="h-6 w-6" />,
      title: "Legacy PDF & Document Digitization",
      description: "Transform decades of legacy paper tests, multi-column PDFs, and raw CSVs into modern formats. Our deterministic OCR pipeline perfectly extracts bilingual text, LaTeX equations, and complex spatial diagrams.",
      tags: ["PDF OCR", "Bilingual Extraction", "Data Normalization"],
    },
    {
      icon: <PackageCheck className="h-6 w-6" />,
      title: "LMS-Native Packaging",
      description: "We don't just generate generic QTI. Our service applies specific formatting adapters to output strictly compliant IMS packages customized for the distinct rendering quirks of Canvas, Moodle, and Blackboard.",
      tags: ["QTI 3.0 Standard", "Canvas Adapters", "MathML Optimization"],
    },
    {
      icon: <LineChart className="h-6 w-6" />,
      title: "Algorithmic Quality Auditing",
      description: "Ensure structural integrity across massive datasets. Our deterministic validation engine scans for missing options, broken LaTeX delimiters, and unlinked diagrams, allowing you to fix extraction anomalies in a guided UI.",
      tags: ["Pedagogical Review", "Structural Validation", "Error Flagging"],
    },
    {
      icon: <FileDigit className="h-6 w-6" />,
      title: "Custom Template Engineering",
      description: "Got custom metadata? We provide precise XML placeholder mapping. Route your custom spreadsheet columns directly into specific LMS metadata fields using our deterministic routing architecture.",
      tags: ["Metadata Mapping", "Custom XML", "Schema Enforcement"],
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <Navbar />

      {/* Hero Section */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-20">
        <div className="flex flex-col items-start">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            <Briefcase className="h-4 w-4" />
            Enterprise Capabilities
          </div>
          <h1 className="max-w-4xl text-5xl font-semibold tracking-tight leading-[1.1]">
            Industrial-grade <span className="text-primary">assessment engineering.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Our computational services ensure perfect data integrity from messy legacy PDFs to the final LMS screen.
          </p>
        </div>
      </section>

      {/* Core Services Grid */}
      <section className="border-t border-border bg-muted/30 px-6 py-20 transition-colors duration-200">
        <div className="mx-auto w-full max-w-6xl">
          <div className="grid gap-10 md:grid-cols-2">
            {services.map((service, idx) => (
              <div
                key={idx}
                className="group relative flex flex-col rounded-[0.625rem] border border-border bg-card p-8 shadow-sm transition-all hover:shadow-md"
              >
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl border border-primary/10 bg-primary/5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                  {service.icon}
                </div>
                <h3 className="mb-3 text-2xl font-semibold tracking-tight text-foreground">{service.title}</h3>
                <p className="mb-8 flex-1 text-base leading-relaxed text-muted-foreground">
                  {service.description}
                </p>
                <div className="flex flex-wrap gap-2 mt-auto border-t border-border/50 pt-6">
                  {service.tags.map((tag, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
                      <CheckCircle className="h-3 w-3 text-emerald-500" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases / Target Audience */}
      <section className="mx-auto w-full max-w-6xl px-6 py-24">
        <div className="rounded-[0.625rem] border border-border bg-card p-10 md:p-16 text-center shadow-lg">
          <h2 className="text-3xl font-semibold tracking-tight">Built for scale. Trusted by experts.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Our infrastructure is designed to handle the rigorous demands of institutional data migration.
          </p>

          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-2 max-w-4xl mx-auto">
            <div className="flex flex-col items-center p-6">
              <div className="mb-4 rounded-full bg-blue-50 p-4 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                <GraduationCap className="h-8 w-8" />
              </div>
              <h4 className="text-lg font-semibold">EdTechs & Coaching Institutes</h4>
              <p className="mt-2 text-sm text-muted-foreground">Digitize 10 years of legacy mock tests and bilingual STEM question banks into your LMS without losing spatial formatting or complex physics diagrams.</p>
            </div>
            <div className="flex flex-col items-center p-6">
              <div className="mb-4 rounded-full bg-emerald-50 p-4 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                <Building2 className="h-8 w-8" />
              </div>
              <h4 className="text-lg font-semibold">Educational Publishers</h4>
              <p className="mt-2 text-sm text-muted-foreground">Standardize test banks across different authors and export pristine QTI 3.0 packages for seamless distribution.</p>
            </div>
          </div>

          <div className="mt-12 flex justify-center">
            <Link
              to={isAuthenticated ? "/workspace" : "/auth/register"}
              className="inline-flex h-12 items-center gap-2 rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-all"
            >
              Start processing your data
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