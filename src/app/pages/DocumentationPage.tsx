import { Link } from "react-router";
import { ArrowRight, CheckCircle2, CircleHelp, Mail, Phone, Upload } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";

export function DocumentationPage() {
  const { isAuthenticated } = useAuth();
  const { isDark } = useTheme();

  return (
    <div className="min-h-screen bg-muted text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <img src={isDark ? '/logo-dark-1.png' : '/AC_logo.png'} alt="AssessmentCore logo" className="h-7 w-7 rounded-md object-contain" />
            <span className="text-sm font-semibold">AssessmentCore</span>
            <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-slate-500">Docs</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/" className="rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted">Home</Link>
            <Link
              to={isAuthenticated ? "/workspace/dashboard" : "/auth/register"}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-white"
            >
              Open Workspace
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-6xl px-6 pb-10 pt-14">
        <h1 className="text-4xl font-semibold tracking-tight">User Documentation</h1>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          This guide helps you use AssessmentCore confidently, from uploading your question bank to exporting final files.
          It focuses only on what you need to do in the product.
        </p>
      </section>

      <section className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-4 px-6 pb-12 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-base font-semibold">Quick Start</h2>
          <div className="mt-4 space-y-3 text-sm text-foreground">
            <div className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" /><span>Sign in and open your workspace.</span></div>
            <div className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" /><span>Upload your spreadsheet on Batch Creator.</span></div>
            <div className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" /><span>Review validation messages and continue through each stage.</span></div>
            <div className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" /><span>Export your final package when everything looks correct.</span></div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-base font-semibold">Before You Upload</h2>
          <div className="mt-4 space-y-3 text-sm text-foreground">
            <div className="flex gap-2"><Upload className="mt-0.5 h-4 w-4 text-slate-500" /><span>Keep one question per row.</span></div>
            <div className="flex gap-2"><Upload className="mt-0.5 h-4 w-4 text-slate-500" /><span>Use clear column names (question, options, answer).</span></div>
            <div className="flex gap-2"><Upload className="mt-0.5 h-4 w-4 text-slate-500" /><span>Check that correct answers match the listed options.</span></div>
            <div className="flex gap-2"><Upload className="mt-0.5 h-4 w-4 text-slate-500" /><span>Remove empty rows before importing.</span></div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-12">
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-base font-semibold">Frequently Asked Questions</h2>
          <div className="mt-4 space-y-4 text-sm text-foreground">
            <div>
              <p className="font-medium">Why is my file not accepted?</p>
              <p className="mt-1 text-muted-foreground">Please use a supported spreadsheet format and ensure the file is not empty.</p>
            </div>
            <div>
              <p className="font-medium">Can I continue with warnings?</p>
              <p className="mt-1 text-muted-foreground">Yes. You can review warnings, apply fixes, and continue when you are satisfied.</p>
            </div>
            <div>
              <p className="font-medium">How do I contact support?</p>
              <p className="mt-1 text-muted-foreground">Use the contact details below and share a short description of your issue.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-12">
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-base font-semibold">How to Read Validation Messages</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Validation labels help you decide what to fix first. Start with rejected rows, then review caution rows.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Valid</p>
              <p className="mt-1 text-sm text-emerald-900">Good to continue. No blocking issues found.</p>
            </div>
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Caution</p>
              <p className="mt-1 text-sm text-amber-900">Check this row before export. It may still work, but needs review.</p>
            </div>
            <div className="rounded-md border border-red-200 bg-red-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-800">Rejected</p>
              <p className="mt-1 text-sm text-red-900">Must be fixed. Export can fail or produce incorrect output if ignored.</p>
            </div>
          </div>

          <div className="mt-5 space-y-3 text-sm text-foreground">
            <p className="font-medium text-foreground">Common messages and what to do:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li><span className="font-medium">Missing answer:</span> Fill in the correct answer field for that row.</li>
              <li><span className="font-medium">Answer not in options:</span> Make sure the marked answer exactly matches one of the listed options.</li>
              <li><span className="font-medium">Duplicate question:</span> Remove repeated rows or keep only the best version.</li>
              <li><span className="font-medium">Question type mismatch:</span> Confirm the question type and related fields are aligned.</li>
            </ul>
          </div>

          <div className="mt-5 rounded-md border border-border bg-muted p-3 text-sm text-foreground">
            Suggested order: <span className="font-medium">Rejected</span> → <span className="font-medium">Caution</span> → quick final scan of <span className="font-medium">Valid</span> rows.
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-16">
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-base font-semibold">Need Help?</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <a href="mailto:hello@assessmentcore.in" className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground hover:bg-muted">
              <Mail className="h-4 w-4" />
              hello@assessmentcore.in
            </a>
            <a href="tel:+919382565942" className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground hover:bg-muted">
              <Phone className="h-4 w-4" />
              +91 9382565942
            </a>
          </div>
          <div className="mt-4 inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs text-blue-700">
            <CircleHelp className="h-3.5 w-3.5" />
            Support hours: Mon-Sat, 10:00 AM to 7:00 PM IST
          </div>
        </div>
      </section>
    </div>
  );
}
