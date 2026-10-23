import { Link } from "react-router";
import {
  ArrowRight,
  FileCheck2,
  Mail,
  MapPin,
  Phone,
  Send,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { ContactProjectForm } from "../components/ContactProjectForm";

export function ContactPage() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <Navbar />

      {/* Hero Section */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-12 pt-16">
        <div className="flex flex-col items-start max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            <Send className="h-3.5 w-3.5" />
            Project Discussion &amp; Scoping
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl leading-[1.1]">
            Discuss an assessment project with Husimi.
          </h1>
          <p className="mt-4 text-base sm:text-lg leading-relaxed text-muted-foreground">
            Whether you have a 30-question diagnostic sample, an archive of legacy PDFs, or need structured LMS migration packages, tell us what you are working with and we will evaluate the right implementation path.
          </p>
        </div>
      </section>

      {/* Main Scoping Form Section */}
      <section className="border-t border-border bg-muted/20 px-6 py-16 transition-colors">
        <div className="mx-auto w-full max-w-6xl">
          <ContactProjectForm />
        </div>
      </section>

      {/* FAQ / Expectations Section */}
      <section className="px-6 py-20 transition-colors">
        <div className="mx-auto w-full max-w-4xl">
          <div className="text-center max-w-xl mx-auto">
            <div className="text-xs font-semibold uppercase tracking-wider text-primary">
              What to Expect
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Frequently asked questions
            </h2>
          </div>

          <div className="mt-10 space-y-4">
            {[
              {
                q: "How does the sample evaluation work?",
                a: "You provide 20–30 representative questions in your existing source format (PDF, Word, or spreadsheet). Husimi processes the sample using our automated pipeline, flags any STEM diagram or LaTeX quirks, and shows you the validated output and exception report before scoping a pilot.",
              },
              {
                q: "Who reviews my inquiry and source content?",
                a: "Early project inquiries receive direct expert review. You will communicate with the specialists who build and configure the underlying assessment processing software.",
              },
              {
                q: "Can you handle complex STEM diagrams and math formulas?",
                a: "Yes. Our workflow specifically targets difficult STEM content, including physics circuit diagrams, chemical structures, and multi-step LaTeX/MathML mathematical notation.",
              },
              {
                q: "Do you guarantee 100% automated accuracy?",
                a: "No. Real educational source material is often ambiguous, scanned at poor resolution, or contains non-standard symbols. We automate the structural heavy lifting and employ human review on flagged exceptions so errors are caught before production.",
              },
              {
                q: "Which LMS platforms are supported?",
                a: "We support Canvas (QTI zip packages), Moodle (Quiz XML & QTI), Blackboard, QTI 2.1 / 3.0 standard packages, and structured JSON for proprietary authoring engines.",
              },
            ].map((faq, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-border bg-card p-5 shadow-xs"
              >
                <h3 className="text-sm font-semibold text-foreground">
                  {faq.q}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
