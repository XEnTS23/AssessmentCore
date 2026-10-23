import { Link } from "react-router";
import {
  CalendarDays,
  CheckCircle2,
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
import { useTheme } from "../../contexts/ThemeContext";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";

const releases = [
  {
    version: "v1.0.0",
    date: "Current",
    notes: [
      "Assessment content digitization & QTI foundation",
      "Deterministic validation workflows",
      "Assessment validation and export",
    ],
    highlighted: true,
  },
  {
    version: "v0.9.0",
    date: "Previous",
    notes: [
      "OCR pre-crop tooling",
      "Spreadsheet cleanup workspace",
      "Bilingual and LaTeX handling",
    ],
  },
  {
    version: "v0.8.0",
    date: "Earlier",
    notes: [
      "QTI packaging pipeline",
      "LMS adapters",
      "Template mapping and export controls",
    ],
  },
];

export function ChangelogPage() {
  const { isDark } = useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <Navbar />
      <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-20 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
          <Sparkles className="h-4 w-4" />
          Changelog
        </div>
        <h1 className="max-w-4xl mx-auto text-5xl font-semibold tracking-tight leading-[1.1] sm:text-6xl">
          Release notes for the{" "}
          <span className="text-primary">assessment engine.</span>
        </h1>
        <p className="mt-6 mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Follow the major additions that shaped the OCR pipeline, validation
          rules, and LMS packaging flow.
        </p>
      </section>

      <section className="border-t border-border bg-muted/30 px-6 py-20 transition-colors duration-200">
        <div className="mx-auto grid w-full max-w-6xl gap-6">
          {releases.map((release) => (
            <div
              key={release.version}
              className={`rounded-[0.625rem] border ${release.highlighted ? "border-primary/30 bg-card shadow-lg" : "border-border bg-card shadow-sm"} p-8`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {release.date}
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                    {release.version}
                  </h2>
                </div>
                <CalendarDays className="h-6 w-6 text-primary" />
              </div>
              <div className="mt-6 grid gap-3 md:grid-cols-3">
                {release.notes.map((note) => (
                  <div
                    key={note}
                    className="flex items-start gap-2 rounded-lg border border-border bg-background p-4 text-sm text-foreground"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <span>{note}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
