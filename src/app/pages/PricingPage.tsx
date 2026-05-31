import { Link } from "react-router";
import {
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  XCircle,
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

export function PricingPage() {
  const { isDark } = useTheme();

  const faqs = [
    {
      question: "How is the 100-question limit counted on the Free tier?",
      answer: "The limit is based on successful, exported questions. If our structural validation engine blocks a row due to formatting errors, it does not count against your limit. You are only charged for what you successfully export.",
    },
    {
      question: "Do you store my question bank data?",
      answer: "No. Your data is processed in memory through our deterministic pipeline and immediately purged after your session ends or your ZIP package is generated.",
    },
    {
      question: "Is my PDF data used to train your AI models?",
      answer: "Absolutely not. AssessmentCore uses zero-retention enterprise APIs. Your legacy test papers and intellectual property are processed in memory and immediately purged. We do not train models on your proprietary question banks.",
    },
    {
      question: "Can I cancel my Premium subscription at any time?",
      answer: "Yes. Premium is a month-to-month subscription. You can cancel anytime from your billing dashboard, and you will retain access until the end of your billing cycle.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <Navbar />

      {/* Hero Section */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-20 text-center">
        <h1 className="max-w-4xl mx-auto text-5xl font-semibold tracking-tight leading-[1.1]">
          Transparent pricing for <span className="text-primary">computational scaling.</span>
        </h1>
        <p className="mt-6 mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Start building for free to test our structural validation engine. Upgrade to scale your assessment generation infinitely.
        </p>
      </section>

      {/* Pricing Cards */}
      <section className="mx-auto w-full max-w-6xl px-6 py-12">
        <div className="grid gap-8 lg:grid-cols-3 lg:gap-8">

          {/* Free Tier */}
          <div className="flex flex-col rounded-[0.625rem] border border-border bg-card p-8 shadow-sm">
            <h3 className="text-xl font-semibold text-foreground">Developer / Trial</h3>
            <div className="mt-4 flex items-baseline text-5xl font-semibold tracking-tight text-foreground">
              0
              <span className="ml-1 text-base font-medium text-muted-foreground">/mo</span>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">Perfect for testing the deterministic pipeline and validation rules.</p>

            <ul className="mt-8 flex-1 space-y-4">
              <li className="flex items-start gap-3 text-sm text-foreground">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                <span className="font-semibold">100 questions or 10 PDF pages total</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-foreground">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                <span>Basic Text-Only OCR Processing</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-foreground">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                <span>Standard QTI 3.0 Export</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-muted-foreground opacity-60">
                <XCircle className="h-5 w-5 shrink-0 text-muted-foreground" />
                <span>Canvas / Moodle specific adapters</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-muted-foreground opacity-60">
                <XCircle className="h-5 w-5 shrink-0 text-muted-foreground" />
                <span>Algorithmic Quality Auditing</span>
              </li>
            </ul>

            <Link
              to="/auth/register"
              className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-md border border-border bg-background px-6 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Start for free
            </Link>
          </div>

          {/* Premium Tier */}
          <div className="relative flex flex-col rounded-[0.625rem] border-2 border-primary bg-card p-8 shadow-lg">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold uppercase tracking-wider text-primary-foreground">
              Most Popular
            </div>
            <h3 className="text-xl font-semibold text-foreground">Premium</h3>
            <div className="mt-4 flex items-baseline text-5xl font-semibold tracking-tight text-foreground">
              ₹1999
              <span className="ml-1 text-base font-medium text-muted-foreground">/mo</span>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">Full access to the deterministic OCR engine for EdTechs and coaching institutes.</p>

            <ul className="mt-8 flex-1 space-y-4">
              <li className="flex items-start gap-3 text-sm text-foreground">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                <span className="font-semibold">Unlimited CSV conversions + 2,500 OCR pages/mo</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-foreground">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                <span>State-of-the-Art Vision OCR (Bilingual + Math)</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-foreground">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                <span>Spatial Diagram & Image Extraction</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-foreground">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                <span>Canvas, Moodle & Blackboard Adapters</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-foreground">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                <span>Algorithmic Quality Auditing</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-foreground">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                <span>MathML Native & MathJax Support</span>
              </li>
            </ul>

            <Link
              to="/auth/register"
              className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Upgrade to Premium
            </Link>
          </div>

          {/* Enterprise Tier */}
          <div className="flex flex-col rounded-[0.625rem] border border-border bg-card p-8 shadow-sm">
            <h3 className="text-xl font-semibold text-foreground">Institutional</h3>
            <div className="mt-4 flex items-baseline text-4xl font-semibold tracking-tight text-foreground">
              Custom
            </div>
            <p className="mt-5 text-sm text-muted-foreground">Dedicated infrastructure for massive legacy PDF archives and question bank migrations.</p>

            <ul className="mt-8 flex-1 space-y-4">
              <li className="flex items-start gap-3 text-sm text-foreground">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                <span className="font-semibold">Everything in Premium</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-foreground">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                <span>Custom XML Template Engineering</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-foreground">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                <span>High-Volume Bulk PDF Ingestion</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-foreground">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                <span>Dedicated deployment & support</span>
              </li>
            </ul>

            <Link
              to="/contact"
              className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-md border border-border bg-background px-6 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Contact Sales
            </Link>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="border-t border-border bg-muted/30 px-6 py-24 transition-colors duration-200">
        <div className="mx-auto w-full max-w-4xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-semibold tracking-tight">Frequently Asked Questions</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {faqs.map((faq, idx) => (
              <div key={idx} className="rounded-[0.625rem] border border-border bg-card p-6 shadow-sm">
                <div className="flex items-start gap-3">
                  <HelpCircle className="mt-1 h-5 w-5 shrink-0 text-primary/60" />
                  <div>
                    <h4 className="font-semibold text-foreground">{faq.question}</h4>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
                  </div>
                </div>
              </div>
            ))}
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