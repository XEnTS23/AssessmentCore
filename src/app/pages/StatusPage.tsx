import { Link } from "react-router";
import {
  Activity,
  CheckCircle2,
  CircleAlert,
  Server,
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

const services = [
  {
    name: "OCR ingestion",
    status: "Operational",
    icon: CheckCircle2,
    tone: "text-emerald-500",
  },
  {
    name: "Validation engine",
    status: "Operational",
    icon: CheckCircle2,
    tone: "text-emerald-500",
  },
  {
    name: "QTI export",
    status: "Operational",
    icon: CheckCircle2,
    tone: "text-emerald-500",
  },
  {
    name: "Support desk",
    status: "Monitoring",
    icon: CircleAlert,
    tone: "text-amber-500",
  },
];

export function StatusPage() {
  const { isDark } = useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <Navbar />
      <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-20 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
          <Activity className="h-4 w-4" />
          Status
        </div>
        <h1 className="max-w-4xl mx-auto text-5xl font-semibold tracking-tight leading-[1.1] sm:text-6xl">
          Platform status for the{" "}
          <span className="text-primary">deterministic pipeline.</span>
        </h1>
        <p className="mt-6 mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Current service health and operational notes for OCR, validation, and
          export workflows.
        </p>
      </section>

      <section className="border-t border-border bg-muted/30 px-6 py-20 transition-colors duration-200">
        <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="rounded-[0.625rem] border border-border bg-card p-8 shadow-sm">
            <div className="flex items-center gap-3">
              <Server className="h-6 w-6 text-primary" />
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Overall status
                </div>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  All systems operational
                </h2>
              </div>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {services.map((service) => {
                const Icon = service.icon;
                return (
                  <div
                    key={service.name}
                    className="rounded-lg border border-border bg-background p-4"
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`mt-0.5 h-4 w-4 ${service.tone}`} />
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {service.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {service.status}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="rounded-[0.625rem] border border-border bg-card p-8 shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              System notes
            </div>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li>Deterministic OCR queues are processing normally.</li>
              <li>Validation rule execution is within expected latency.</li>
              <li>
                QTI packages continue to export with full LMS compatibility.
              </li>
              <li>No active incidents reported.</li>
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/contact"
                className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Contact support
              </Link>
              <Link
                to="/documentation"
                className="inline-flex h-11 items-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Read docs
              </Link>
            </div>
          </div>
        </div>
      </section>

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
        </div>
      </footer>
    </div>
  );
}
