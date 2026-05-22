import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  AlertTriangle,
  BookOpen,
  Calculator,
  ChevronRight,
  DownloadCloud,
  FileSearch,
  ListChecks,
  ScanText,
  Settings,
  ShieldCheck,
  Table,
  Wand,
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

export function DocumentationPage() {
  const { isDark } = useTheme();
  const [activeSection, setActiveSection] = useState("overview");

  useEffect(() => {
    const handleScroll = () => {
      const sections = [
        "overview",
        "step-1",
        "step-2",
        "step-3",
        "step-4",
        "step-5",
        "formatting",
        "question-types",
        "math-latex",
      ];
      
      let currentSection = sections[0];
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          // Offset to trigger highlight right before it touches the top
          if (rect.top <= 120) {
            currentSection = section;
          }
        }
      }
      setActiveSection(currentSection);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Trigger once on mount
    handleScroll();
    
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-200">
      <Navbar />

      <div className="mx-auto flex w-full max-w-7xl flex-1 items-start gap-8 px-6 py-12">
        {/* Docs Sidebar */}
        <aside className="sticky top-24 hidden w-64 shrink-0 self-start lg:block">
          <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Workflow Guide
          </div>
          <nav className="flex flex-col space-y-1">
            <a href="#overview" className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${activeSection === 'overview' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
              Overview
            </a>
            <a href="#step-1" className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${activeSection === 'step-1' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
              1. Ingestion & Extraction
            </a>
            <a href="#step-2" className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${activeSection === 'step-2' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
              2. Structural Validation
            </a>
            <a href="#step-3" className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${activeSection === 'step-3' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
              3. Data Remediation
            </a>
            <a href="#step-4" className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${activeSection === 'step-4' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
              4. Linguistic Review
            </a>
            <a href="#step-5" className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${activeSection === 'step-5' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
              5. LMS Export
            </a>
          </nav>

          <div className="mt-8 mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Technical Reference
          </div>
          <nav className="flex flex-col space-y-1">
            <a href="#formatting" className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${activeSection === 'formatting' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
              Spreadsheet Formatting
            </a>
            <a href="#question-types" className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${activeSection === 'question-types' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
              Supported Question Types
            </a>
            <a href="#math-latex" className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${activeSection === 'math-latex' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
              Math & LaTeX Syntax
            </a>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 max-w-4xl pb-24">
          <div id="overview" className="mb-10 scroll-mt-24">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
              <BookOpen className="h-3 w-3" />
              Master Documentation
            </div>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              AssessmentCore Operations
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              AssessmentCore operates on a strict, deterministic pipeline. This guide covers the end-to-end workflow and the required data structures to guarantee LMS-compliant outputs.
            </p>
          </div>

          <div className="space-y-16">
            {/* WORKFLOW SECTION */}
            <div className="mb-8 border-b border-border pb-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Part 1: The Pipeline Workflow</h3>
            </div>

            {/* Step 1 */}
            <section id="step-1" className="scroll-mt-24">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-primary shadow-sm">
                  <ScanText className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-semibold tracking-tight">1. Ingestion & Extraction</h2>
              </div>
              <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                You can feed the system via raw documents or structured spreadsheets. If you lack a spreadsheet, our Optical Extraction Engine will generate one for you.
              </p>
              <div className="rounded-[0.625rem] border border-border bg-card p-6 shadow-sm">
                <ul className="space-y-3">
                  <li className="flex items-start gap-3 text-sm text-foreground">
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span><strong>Optical Extraction (PDF/Image):</strong> Upload scanned PDFs or images. The engine maps Question Text, Options, and automatically preserves equations using LaTeX delimiters.</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-foreground">
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span><strong>Direct Spreadsheet Upload:</strong> Upload standard `.xlsx` or `.csv` files. The system will auto-detect column headers if they match standard naming conventions.</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-foreground">
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span><strong>Media ZIP Linking:</strong> Upload a ZIP file containing images. The system will map files (e.g., <code>fig1.png</code>) to any question that references that filename.</span>
                  </li>
                </ul>
              </div>
            </section>

            {/* Step 2 */}
            <section id="step-2" className="scroll-mt-24">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-primary shadow-sm">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-semibold tracking-tight">2. Structural Validation</h2>
              </div>
              <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                The core of the system. We run 25+ deterministic rules against your grid to ensure strict IMS Global standards compliance.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[0.625rem] border border-red-200 bg-red-50 p-5 dark:border-red-900/30 dark:bg-red-900/10">
                  <div className="flex items-center gap-2 font-semibold text-red-700 dark:text-red-400">
                    <AlertTriangle className="h-4 w-4" />
                    Block Errors (Critical)
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-red-600/90 dark:text-red-300/80">
                    Export is disabled until these are fixed. Triggers include: Missing correct answers, duplicated Identifier IDs, or Multiple Choice questions lacking sufficient options.
                  </p>
                </div>
                <div className="rounded-[0.625rem] border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/30 dark:bg-amber-900/10">
                  <div className="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4" />
                    Caution Flags (Warnings)
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-amber-600/90 dark:text-amber-300/80">
                    Formatting anomalies that render poorly in an LMS. Triggers include: Trailing whitespaces, mismatched HTML tags, or inconsistent capitalization across options.
                  </p>
                </div>
              </div>
            </section>

            {/* Step 3 */}
            <section id="step-3" className="scroll-mt-24">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-primary shadow-sm">
                  <Wand className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-semibold tracking-tight">3. Data Remediation Workspace</h2>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                When flags are triggered, the Data Fixing Workspace provides a split-screen UI. You will see your raw data on the left, and the system's calculated correction on the right. Clicking <strong>"Apply Heuristic Fix"</strong> allows the 3-pass cleaning pipeline to strip illegal characters and normalize delimiters without corrupting mathematical equations.
              </p>
            </section>

            {/* Step 4 */}
            <section id="step-4" className="scroll-mt-24">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-primary shadow-sm">
                  <FileSearch className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-semibold tracking-tight">4. Linguistic Quality Review</h2>
              </div>
              <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                An optional but recommended step. The Linguistic Validation Engine performs a pedagogical audit across your batch.
              </p>
              <div className="rounded-[0.625rem] border border-border bg-muted/30 p-5">
                <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                  <li>Identifies grammatical mismatches between the question stem and the options.</li>
                  <li>Flags relative positional references (e.g., "All of the above") which will break if the LMS shuffles options.</li>
                  <li>Ensures tone and spelling conventions remain identical across rows compiled by multiple authors.</li>
                </ul>
              </div>
            </section>

            {/* Step 5 */}
            <section id="step-5" className="scroll-mt-24">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-primary shadow-sm">
                  <Settings className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-semibold tracking-tight">5. Export Configuration & Packaging</h2>
              </div>
              <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
                Map your data to the specific architectural quirks of your target LMS.
              </p>
              
              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-[0.625rem] border border-border bg-card p-5">
                  <h4 className="font-semibold text-foreground">LMS Targeting Adapters</h4>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Select Canvas, Moodle, or Generic QTI 3.0. Our Canvas adapter, for example, will automatically rewrite nested paragraph tags and convert standard generic feedbacks into `modalFeedback` nodes.
                  </p>
                </div>
                <div className="rounded-[0.625rem] border border-border bg-card p-5">
                  <h4 className="font-semibold text-foreground">Custom Template Mapping</h4>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Use the mapping UI to route custom spreadsheet columns (like "Difficulty Level") into specific, valid XML metadata placeholders inside the manifest.
                  </p>
                </div>
              </div>

              <div className="mt-8 rounded-[0.625rem] border border-emerald-500/20 bg-emerald-50 p-6 dark:bg-emerald-900/10">
                <div className="flex items-center gap-3 font-semibold text-emerald-700 dark:text-emerald-400">
                  <DownloadCloud className="h-5 w-5" />
                  Generate Package
                </div>
                <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-300">
                  Click "Export." The system strictly compiles the `imsmanifest.xml`, packages the media, and outputs a ready-to-upload ZIP file.
                </p>
              </div>
            </section>

            {/* TECHNICAL REFERENCE SECTION */}
            <div className="mt-16 mb-8 border-b border-border pb-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Part 2: Technical Reference</h3>
            </div>

            {/* Formatting */}
            <section id="formatting" className="scroll-mt-24">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-primary shadow-sm">
                  <Table className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-semibold tracking-tight">Spreadsheet Formatting</h2>
              </div>
              <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                To bypass the optical extraction and upload directly, your `.csv` or `.xlsx` must contain these core headers. Column order does not matter as long as the headers are identifiable.
              </p>
              <div className="overflow-x-auto rounded-[0.625rem] border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="p-3 font-medium">Required Column Header</th>
                      <th className="p-3 font-medium">Description</th>
                      <th className="p-3 font-medium">Example Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    <tr>
                      <td className="p-3 font-mono text-xs">Question_Type</td>
                      <td className="p-3 text-muted-foreground">The identifier for the logic engine.</td>
                      <td className="p-3">MCQ, MSQ, TF</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono text-xs">Question_Text</td>
                      <td className="p-3 text-muted-foreground">The actual stem of the question.</td>
                      <td className="p-3">What is the capital of France?</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono text-xs">Option_1 ... Option_N</td>
                      <td className="p-3 text-muted-foreground">The available choices.</td>
                      <td className="p-3">Paris</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono text-xs">Correct_Answer</td>
                      <td className="p-3 text-muted-foreground">Maps to the correct Option number or text.</td>
                      <td className="p-3">Option_1</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Question Types */}
            <section id="question-types" className="scroll-mt-24">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-primary shadow-sm">
                  <ListChecks className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-semibold tracking-tight">Supported Question Types</h2>
              </div>
              <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                Use the following codes in your <code>Question_Type</code> column.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { code: "MCQ", name: "Multiple Choice", desc: "Single correct answer from multiple options." },
                  { code: "MSQ", name: "Multiple Select", desc: "Multiple correct answers. Define correct answers separated by commas (e.g., 1,3)." },
                  { code: "TF", name: "True / False", desc: "Binary choice. Options must explicitly be True and False." },
                  { code: "FIB", name: "Fill in the Blank", desc: "Text entry. Correct answers are evaluated exactly." },
                ].map((type) => (
                  <div key={type.code} className="rounded-[0.625rem] border border-border bg-card p-4 shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-primary">{type.code}</span>
                      <span className="font-semibold text-foreground">{type.name}</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{type.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Math & LaTeX */}
            <section id="math-latex" className="scroll-mt-24">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-primary shadow-sm">
                  <Calculator className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-semibold tracking-tight">Math & LaTeX Syntax</h2>
              </div>
              <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                Our parser requires standard LaTeX delimiters in your spreadsheet. When configuring the export, you can choose to convert these into Native MathML or retain them for MathJax rendering depending on your LMS capabilities.
              </p>
              <div className="rounded-[0.625rem] border border-border bg-card p-6 shadow-sm space-y-4">
                <div>
                  <h4 className="font-semibold text-foreground text-sm">Inline Equations</h4>
                  <p className="mt-1 text-xs text-muted-foreground">Wrap the equation in single dollar signs.</p>
                  <code className="mt-2 block w-full rounded bg-muted px-3 py-2 font-mono text-xs text-foreground">
                    Solve for x in the equation $2x + 4 = 10$.
                  </code>
                </div>
                <div className="border-t border-border pt-4">
                  <h4 className="font-semibold text-foreground text-sm">Display (Block) Equations</h4>
                  <p className="mt-1 text-xs text-muted-foreground">Wrap the equation in double dollar signs to render it on its own line.</p>
                  <code className="mt-2 block w-full rounded bg-muted px-3 py-2 font-mono text-xs text-foreground">
                    {"Use the quadratic formula: $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$"}
                  </code>
                </div>
              </div>
            </section>

          </div>
        </main>
      </div>

      {/* Standard Footer */}
      <footer className="mt-auto border-t border-border bg-muted/50 px-6 transition-colors duration-200">
        <div className="mx-auto w-full max-w-7xl py-10">
          {/* ... Footer layout remains identical to previous implementations ... */}
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
                <a href="https://www.youtube.com" target="_blank" rel="noreferrer" aria-label="Youtube" className="rounded-md border border-border bg-background p-2 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors">
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