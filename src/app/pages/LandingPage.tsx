import { FormEvent, useState } from "react";
import { Link } from "react-router";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Download,
  Facebook,
  Github,
  Linkedin,
  Mail,
  MapPin,
  MessageCircle,
  Moon,
  Package,
  Play,
  Phone,
  ShieldCheck,
  Sparkles,
  Upload,
  Sun,
  Wand,
  Youtube,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";

function Stage({
  num,
  title,
  detail,
  icon,
  active,
}: {
  num: string;
  title: string;
  detail: string;
  icon: React.ReactNode;
  active?: boolean;
}) {
  return (
    <div
      className={`min-w-0 flex-1 rounded-lg border p-4 transition-colors duration-200 ${
        active ? "bg-card border-primary/50" : "bg-muted border-border"
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-md border transition-colors ${
            active
              ? "bg-primary/10 border-primary/30 text-primary"
              : "bg-background border-border text-muted-foreground"
          }`}
        >
          {icon}
        </div>
        <span className="text-[10px] font-semibold tracking-wide text-muted-foreground">GATE {num}</span>
      </div>
      <div className="mb-1 text-sm font-semibold text-foreground">{title}</div>
      <p className="text-xs leading-relaxed text-muted-foreground">{detail}</p>
    </div>
  );
}

export function LandingPage() {
  const { isAuthenticated } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactError, setContactError] = useState("");
  const [contactSuccess, setContactSuccess] = useState("");

  const handleContactSubmit = (e: FormEvent) => {
    e.preventDefault();
    setContactError("");
    setContactSuccess("");

    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
      setContactError("Please fill in your name, email, and message.");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(contactEmail)) {
      setContactError("Please enter a valid email address.");
      return;
    }

    const subject = `AssessmentCore enquiry from ${contactName.trim()}`;
    const body = [
      `Name: ${contactName.trim()}`,
      `Email: ${contactEmail.trim()}`,
      "",
      "Message:",
      contactMessage.trim(),
    ].join("\n");

    window.location.href = `mailto:hello@assessmentcore.in?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setContactSuccess("Your mail app is opening. Please send the prefilled message to contact us.");
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur transition-colors duration-200">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <img src={isDark ? '/logo-dark-1.png' : '/AC_logo.png'} alt="AssessmentCore logo" className="h-7 w-7 rounded-md object-contain" />
            <span className="text-sm font-semibold text-foreground">AssessmentCore</span>
            <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">v1.0</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="mr-2 flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Toggle dark mode"
            >
              {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
            <Link to="/documentation" className="hidden text-xs text-muted-foreground hover:text-foreground transition-colors sm:inline">
              Documentation
            </Link>
            <Link to="/auth/login" className="rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors">
              Log in
            </Link>
            <Link
              to={isAuthenticated ? "/workspace/dashboard" : "/auth/register"}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Get started
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-6xl px-6 pb-12 pt-16">
        <div className="mb-4 inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-medium text-blue-700">
          <Sparkles className="h-3 w-3" />
          QTI 3.0 · Canvas · Moodle · Blackboard
        </div>

        <h1 className="max-w-4xl text-5xl font-semibold tracking-tight">
          Turn messy question banks into LMS-ready assessments.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Upload an Excel or CSV, validate structural rules, run a deterministic cleaning pipeline, audit with AI,
          and export a standards-compliant package ready for LMS import.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-2">
          <Link
            to={isAuthenticated ? "/workspace/dashboard" : "/auth/register"}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Start free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to={isAuthenticated ? "/workspace/dashboard" : "/auth/login"}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-card px-4 text-sm text-foreground hover:bg-muted transition-colors"
          >
            <Play className="h-3.5 w-3.5" />
            Open workspace
          </Link>
          <span className="ml-2 text-xs text-muted-foreground">1 free export · no card required</span>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-4 border-t border-slate-200 pt-6 sm:grid-cols-4">
          {[
            ["25+", "validation rules"],
            ["3-pass", "cleaning pipeline"],
            ["7", "question types"],
            ["10,000+", "rows per batch"],
          ].map(([n, l]) => (
            <div key={l}>
              <div className="text-2xl font-semibold tracking-tight">{n}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{l}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-muted/30 px-6 py-10 transition-colors duration-200">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">The pipeline</div>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">Six deterministic stages, zero manual XML.</h2>
          </div>
          <div className="flex items-stretch gap-1 overflow-x-auto pb-2">
            <Stage num="0" title="Upload" detail="Excel or CSV. Columns auto-mapped from headers." icon={<Upload className="h-3.5 w-3.5" />} active />
            <div className="flex items-center text-muted-foreground/50"><ChevronRight className="h-4 w-4" /></div>
            <Stage num="1" title="Validate" detail="Duplicate fingerprinting, type inference, and strict rule checks." icon={<ShieldCheck className="h-3.5 w-3.5" />} active />
            <div className="flex items-center text-muted-foreground/50"><ChevronRight className="h-4 w-4" /></div>
            <Stage num="2" title="Clean" detail="3-pass deterministic fixes for whitespace, delimiters, and answers." icon={<Wand className="h-3.5 w-3.5" />} active />
            <div className="flex items-center text-muted-foreground/50"><ChevronRight className="h-4 w-4" /></div>
            <Stage num="3" title="AI audit" detail="Grammar, clarity, and factual review where AI actually helps." icon={<Sparkles className="h-3.5 w-3.5" />} />
            <div className="flex items-center text-muted-foreground/50"><ChevronRight className="h-4 w-4" /></div>
            <Stage num="4" title="Generate" detail="QTI per-item XML, test structure, manifest, and media." icon={<Package className="h-3.5 w-3.5" />} />
            <div className="flex items-center text-muted-foreground/50"><ChevronRight className="h-4 w-4" /></div>
            <Stage num="5" title="Export" detail="LMS-specific repackaging and one-click package download." icon={<Download className="h-3.5 w-3.5" />} />
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-6 py-14 lg:grid-cols-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Why teams use it</div>
          <h3 className="mt-2 text-3xl font-semibold tracking-tight">Deterministic by default. AI where it helps.</h3>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
            Validation and cleaning run on deterministic logic. AI is added only for language and quality review, not for fragile parsing.
          </p>
          <div className="mt-6 flex gap-2">
            <Link to="/documentation" className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors">
              <BookOpen className="h-3.5 w-3.5" />
              Read docs
            </Link>
            <Link to="/workspace/dashboard" className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors">
              Open workspace
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 transition-colors duration-200">
          {[
            "Dual-fingerprint duplicate detection",
            "Rollback-safe cleaning pipeline",
            "Seven supported question types",
            "LMS-specific export packaging",
            "Server-side API key handling",
          ].map((item) => (
            <div key={item} className="flex items-start gap-2 border-t border-border/50 py-4 first:border-t-0 first:pt-0 last:pb-0">
              <span className="mt-0.5 rounded border border-emerald-500/20 bg-emerald-500/10 p-0.5 text-emerald-500">
                <Check className="h-3 w-3" />
              </span>
              <p className="text-sm text-foreground">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-workspace-bg px-6 py-14 transition-colors duration-200">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Contact</div>
            <h3 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Need help with your question bank?</h3>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Share your requirement and our team will get back to you with the best way to proceed.
            </p>
            <div className="mt-5 space-y-2 text-sm text-foreground">
              <a href="mailto:hello@assessmentcore.in" className="flex items-center gap-2 hover:text-primary transition-colors">
                <Mail className="h-4 w-4" />
                hello@assessmentcore.in
              </a>
              <a href="tel:+919382565942" className="flex items-center gap-2 hover:text-primary transition-colors">
                <Phone className="h-4 w-4" />
                +91 9382565942
              </a>
            </div>
          </div>

          <form onSubmit={handleContactSubmit} className="rounded-lg border border-border bg-card p-5 shadow-sm transition-colors duration-200">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="text-xs font-medium text-muted-foreground">
                Name
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary"
                  placeholder="Your name"
                />
              </label>
              <label className="text-xs font-medium text-muted-foreground">
                Email
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary"
                  placeholder="you@example.com"
                />
              </label>
            </div>

            <label className="mt-4 block text-xs font-medium text-muted-foreground">
              Message
              <textarea
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                rows={5}
                className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
                placeholder="Tell us how we can help"
              />
            </label>

            {contactError ? (
              <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{contactError}</p>
            ) : null}
            {contactSuccess ? (
              <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{contactSuccess}</p>
            ) : null}

            <button
              type="submit"
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Send message
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </section>

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
                <a href="#" aria-label="LinkedIn" className="rounded-md border border-border bg-background p-2 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors">
                  <Linkedin className="h-4 w-4" />
                </a>
                <a href="#" aria-label="GitHub" className="rounded-md border border-border bg-background p-2 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors">
                  <Github className="h-4 w-4" />
                </a>
                <a href="#" aria-label="Facebook" className="rounded-md border border-border bg-background p-2 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors">
                  <Facebook className="h-4 w-4" />
                </a>
                <a href="#" aria-label="WhatsApp" className="rounded-md border border-border bg-background p-2 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors">
                  <MessageCircle className="h-4 w-4" />
                </a>
                <a href="#" aria-label="YouTube" className="rounded-md border border-border bg-background p-2 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors">
                  <Youtube className="h-4 w-4" />
                </a>
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
                <Link to="/documentation" className="hover:text-foreground transition-colors">Documentation</Link>
                <a href="#" className="hover:text-foreground transition-colors">Changelog</a>
                <a href="#" className="hover:text-foreground transition-colors">Status</a>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-border pt-4 text-xs text-muted-foreground">
            AssessmentCore · v1.0 · April 2026
          </div>
        </div>
      </footer>
    </div>
  );
}
