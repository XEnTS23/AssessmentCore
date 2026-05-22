import { FormEvent, useState } from "react";
import { Link } from "react-router";
import {
  ArrowRight,
  BookOpen,
  Check,
  Facebook,
  Github,
  Linkedin,
  Mail,
  MapPin,
  MessageCircle,
  Play,
  Phone,
  Sparkles,
  ScanText,
  Wand,
  Youtube,
} from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";
import { Navbar } from "../components/Navbar";

export function LandingPage() {
  const { isDark } = useTheme();

  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactStatus, setContactStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleContactSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setContactStatus("idle");
    setErrorMessage("");

    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
      setContactStatus("error");
      setErrorMessage("Please fill in your name, email, and message.");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(contactEmail)) {
      setContactStatus("error");
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setContactStatus("loading");

    try {
      // TODO: Replace this simulated delay with your actual backend fetch request
      // Example: 
      // await fetch('/api/contact', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ name: contactName, email: contactEmail, message: contactMessage })
      // });

      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulating network request

      setContactStatus("success");
      setContactName("");
      setContactEmail("");
      setContactMessage("");
    } catch (error) {
      setContactStatus("error");
      setErrorMessage("Something went wrong. Please try again later.");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <Navbar />

      {/* Hero Section */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-12 pt-16">
        <div className="mb-4 inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-medium text-blue-700">
          <Sparkles className="h-3 w-3" />
          QTI 3.0 · Canvas · Moodle · Blackboard
        </div>

        <h1 className="max-w-4xl text-5xl font-semibold tracking-tight leading-[1.1]">
          Turn messy PDFs and images into <span className="text-primary">LMS-ready</span> assessments.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Digitize 10 years of legacy mock tests. Extract complex physics diagrams, nested LaTeX equations, and bilingual (English/Regional) text into an editable workspace...
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-2">
          <Link
            to="/auth/register"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Sign Up
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/solutions"
            className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-card px-4 text-sm text-foreground hover:bg-muted transition-colors"
          >
            <Play className="h-3.5 w-3.5" />
            Explore
          </Link>
          <span className="ml-2 text-xs text-muted-foreground">1 free export · no card required</span>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-4 pt-6 sm:grid-cols-4">
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

      {/* OCR Feature Section */}
      <section className="border-y border-border bg-muted/30 px-6 py-20 transition-colors duration-200">
        <div className="mx-auto w-full max-w-6xl">
          <div className="grid grid-cols-1 gap-16">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
                <ScanText className="h-3 w-3" />
                OCR Powerhouse
              </div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                A deterministic pipeline to digitize legacy question banks.
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
                Combine AI-powered LaTeX extraction with human-in-the-loop diagram tagging to guarantee 100% flawless LMS imports, no matter how chaotic the source PDF is.
              </p>

              <div className="mt-10 space-y-6">
                {[
                  {
                    title: "Advanced OCR Extraction",
                    desc: "Handle messy legacy scans, complex two-column test papers, and faded printed documents with absolute precision.",
                    icon: <ScanText className="h-5 w-5" />
                  },
                  {
                    title: "Editable Spreadsheet UI",
                    desc: "Fix extraction errors or tweak content directly in a familiar grid interface before exporting.",
                    icon: <Wand className="h-5 w-5" />
                  },
                  {
                    title: "Math & Multi-language",
                    desc: "Full support for LaTeX equations and seamless processing of Bengali, Hindi, and English text.",
                    icon: <Sparkles className="h-5 w-5" />
                  }
                ].map((feature, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-primary shadow-sm">
                      {feature.icon}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">{feature.title}</h4>
                      <p className="mt-1 text-sm text-muted-foreground">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10">
                <Link
                  to="/auth/register"
                  className="inline-flex h-12 items-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-[1.02]"
                >
                  Try OCR Now
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logic/Determinism Section */}
      <section className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-6 py-14 lg:grid-cols-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Why teams use it</div>
          <h3 className="mt-2 text-3xl font-semibold tracking-tight">Deterministic by default. AI where it helps.</h3>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
            Validation and cleaning run on deterministic logic. AI is added only for language and quality review, not for fragile parsing.
          </p>
          <div className="mt-6 flex gap-2">
            <Link to="/resources" className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors">
              <BookOpen className="h-3.5 w-3.5" />
              Read docs
            </Link>
            <Link to="/solutions" className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors">
              Explore solutions
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 transition-colors duration-200">
          {[
            {
              title: "Spatial Diagram Mapping",
              desc: "Our 2D Proximity Engine automatically binds extracted diagrams to their exact question stems and options, preserving the spatial layout of multi-column test papers.",
            },
            "Rollback-safe cleaning pipeline",
            "Seven supported question types",
            "LMS-specific export packaging",
            "Server-side API key handling",
          ].map((item) => (
            <div key={typeof item === 'string' ? item : item.title} className="flex items-start gap-2 border-t border-border/50 py-4 first:border-t-0 first:pt-0 last:pb-0">
              <span className="mt-0.5 rounded border border-emerald-500/20 bg-emerald-500/10 p-0.5 text-emerald-500">
                <Check className="h-3 w-3" />
              </span>
              <div>
                <p className="text-sm text-foreground">
                  {typeof item === 'string' ? item : item.title}
                </p>
                {typeof item !== 'string' && (
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {item.desc}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Contact Section */}
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
              <div className="flex flex-col">
                <label htmlFor="name" className="text-xs font-medium text-muted-foreground">Name</label>
                <input
                  id="name"
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary"
                  placeholder="Your name"
                />
              </div>
              <div className="flex flex-col">
                <label htmlFor="email" className="text-xs font-medium text-muted-foreground">Email</label>
                <input
                  id="email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-col">
              <label htmlFor="message" className="text-xs font-medium text-muted-foreground">Message</label>
              <textarea
                id="message"
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                rows={5}
                className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
                placeholder="Tell us how we can help"
              />
            </div>

            {contactStatus === "error" && (
              <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{errorMessage}</p>
            )}
            {contactStatus === "success" && (
              <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">Message sent successfully! We will get back to you soon.</p>
            )}

            <button
              type="submit"
              disabled={contactStatus === "loading"}
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {contactStatus === "loading" ? "Sending..." : "Send message"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
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