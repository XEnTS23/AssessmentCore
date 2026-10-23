import { Link } from "react-router";
import {
  Archive,
  ArrowRight,
  Download,
  FileText,
  ImagePlus,
  Sparkles,
  Facebook,
  Github,
  Linkedin,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Youtube,
} from "lucide-react";
import { useTheme } from "../../../contexts/ThemeContext";
import { Navbar } from "../../components/Navbar";
import { Footer } from "../../components/Footer";

export function SamplePackagePage() {
  const { isDark } = useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <Navbar />
      <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-20 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
          <Archive className="h-4 w-4" />
          Sample Package
        </div>
        <h1 className="max-w-4xl mx-auto text-5xl font-semibold tracking-tight leading-[1.1] sm:text-6xl">
          A proof package from{" "}
          <span className="text-primary">messy PDF to clean QTI.</span>
        </h1>
        <p className="mt-6 mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground">
          This page shows the sample deliverable bundle you can expect from the
          deterministic pipeline.
        </p>
      </section>

      <section className="border-t border-border bg-muted/30 px-6 py-20 transition-colors duration-200">
        <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-2">
          <div className="rounded-[0.625rem] border border-border bg-card p-8 shadow-sm">
            <h2 className="text-2xl font-semibold tracking-tight">
              Included in the package
            </h2>
            <div className="mt-6 space-y-4">
              {[
                "Source PDF snapshot",
                "OCR output with bilingual text",
                "LaTeX and MathML-ready content",
                "LMS-ready QTI 3.0 package",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-2 text-sm text-foreground"
                >
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="mailto:hello@husimisolutions.com?subject=Sample%20package%20request"
                className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Download className="h-4 w-4" />
                Request delivery
              </a>
              <Link
                to="/resources"
                className="inline-flex h-11 items-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Back to resources
              </Link>
            </div>
          </div>
          <div className="rounded-[0.625rem] border border-border bg-card p-8 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-background p-4">
                <FileText className="h-5 w-5 text-primary" />
                <div className="mt-3 text-sm font-medium">Source PDF</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Multi-column physics paper with diagrams
                </div>
              </div>
              <div className="rounded-lg border border-border bg-background p-4">
                <ImagePlus className="h-5 w-5 text-primary" />
                <div className="mt-3 text-sm font-medium">
                  Diagram extraction
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Spatially mapped images and figure references
                </div>
              </div>
            </div>
            <div className="mt-6 rounded-lg border border-dashed border-border bg-muted/40 p-6 text-sm text-muted-foreground">
              If you need the actual file asset, use the request button and we
              will provide a live sample bundle.
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
