import { FormEvent, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  FileCheck,
  HelpCircle,
  Mail,
  Phone,
  Send,
  Sparkles,
  UserCheck,
} from "lucide-react";

interface ContactProjectFormProps {
  embedded?: boolean;
}

export function ContactProjectForm({ embedded = false }: ContactProjectFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    role: "",
    projectType: "Digitization",
    itemCount: "50-200 questions",
    sourceFormat: "PDF documents (scans or native)",
    targetPlatform: "Canvas LMS (QTI)",
    description: "",
  });

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("idle");
    setErrorMessage("");

    if (!formData.name.trim() || !formData.email.trim() || !formData.description.trim()) {
      setStatus("error");
      setErrorMessage("Please fill in your name, work email, and a brief description of your project.");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      setStatus("error");
      setErrorMessage("Please enter a valid work email address.");
      return;
    }

    setStatus("loading");

    try {
      // Simulated delivery - hooks into future backend endpoint
      await new Promise((resolve) => setTimeout(resolve, 1200));

      setStatus("success");
      setFormData({
        name: "",
        email: "",
        company: "",
        role: "",
        projectType: "Digitization",
        itemCount: "50-200 questions",
        sourceFormat: "PDF documents (scans or native)",
        targetPlatform: "Canvas LMS (QTI)",
        description: "",
      });
    } catch {
      setStatus("error");
      setErrorMessage("Failed to send message. Please contact us directly at hello@husimisolutions.com.");
    }
  };

  return (
    <div className={`w-full ${embedded ? "" : "mx-auto max-w-6xl"}`}>
      <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
        {/* Left Column: Context & Review Note */}
        <div className="lg:col-span-5 space-y-6">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              <FileCheck className="h-3 w-3" />
              Project Scoping
            </div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Have an assessment-content backlog?
            </h2>
            <p className="mt-3.5 text-sm leading-relaxed text-muted-foreground">
              Tell us what you are working with — PDF, Word, Excel, scans, handwritten sheets, or an existing LMS — and what you need the final content to become.
            </p>
          </div>

          {/* Key reassurance cards */}
          <div className="space-y-3.5 pt-2">
            <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <UserCheck className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-foreground">
                    Expert Review
                  </h4>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Early project enquiries are reviewed directly by our experts to evaluate format compatibility, STEM complexity, and delivery scope.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-foreground">
                    Low-Risk Evaluation
                  </h4>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Prefer to start small? Share a 20–30 question sample. We will convert the sample and show you the structured output, validation results, and exceptions.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="rounded-lg border border-border/80 bg-muted/40 p-4 text-xs text-muted-foreground space-y-2">
            <div className="font-medium text-foreground">Direct communication:</div>
            <a
              href="mailto:hello@husimisolutions.com"
              className="flex items-center gap-2 hover:text-foreground transition-colors"
            >
              <Mail className="h-3.5 w-3.5 text-primary" />
              hello@husimisolutions.com
            </a>
            <a
              href="tel:+919382565942"
              className="flex items-center gap-2 hover:text-foreground transition-colors"
            >
              <Phone className="h-3.5 w-3.5 text-primary" />
              +91 9382565942
            </a>
          </div>
        </div>

        {/* Right Column: Scoping Form */}
        <div className="lg:col-span-7">
          <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-border bg-card p-6 sm:p-8 shadow-sm transition-colors"
          >
            <div className="border-b border-border pb-4 mb-6">
              <h3 className="text-base font-semibold text-foreground">
                Project &amp; Content Details
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Help us understand your source material, target platform, and timeline.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col">
                <label htmlFor="contact-name" className="text-xs font-medium text-foreground">
                  Your Name *
                </label>
                <input
                  id="contact-name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Elena Rostova"
                  className="mt-1.5 h-10 rounded-md border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex flex-col">
                <label htmlFor="contact-email" className="text-xs font-medium text-foreground">
                  Work Email *
                </label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="name@company.com"
                  className="mt-1.5 h-10 rounded-md border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex flex-col">
                <label htmlFor="contact-company" className="text-xs font-medium text-foreground">
                  Company / Organization
                </label>
                <input
                  id="contact-company"
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="e.g. Apex Learning"
                  className="mt-1.5 h-10 rounded-md border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex flex-col">
                <label htmlFor="contact-role" className="text-xs font-medium text-foreground">
                  Your Role
                </label>
                <input
                  id="contact-role"
                  type="text"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  placeholder="e.g. Assessment Director / Content Lead"
                  className="mt-1.5 h-10 rounded-md border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Project Specifications */}
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col">
                <label htmlFor="project-type" className="text-xs font-medium text-foreground">
                  Project Type
                </label>
                <select
                  id="project-type"
                  value={formData.projectType}
                  onChange={(e) => setFormData({ ...formData, projectType: e.target.value })}
                  className="mt-1.5 h-10 rounded-md border border-border bg-background px-3 text-xs text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="Content development">Assessment Content Development</option>
                  <option value="Digitization">Assessment Content Digitization</option>
                  <option value="Question-bank cleanup / QA">Question Bank QA &amp; Remediation</option>
                  <option value="LMS / platform migration">LMS &amp; Platform Migration</option>
                  <option value="Technology & Platform Integration">Technology & Platform Integration</option>
                  <option value="Other">Other Assessment Requirement</option>
                </select>
              </div>

              <div className="flex flex-col">
                <label htmlFor="item-count" className="text-xs font-medium text-foreground">
                  Approximate Number of Items
                </label>
                <select
                  id="item-count"
                  value={formData.itemCount}
                  onChange={(e) => setFormData({ ...formData, itemCount: e.target.value })}
                  className="mt-1.5 h-10 rounded-md border border-border bg-background px-3 text-xs text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="Sample (20-50 questions)">Sample Test (20–50 questions)</option>
                  <option value="Pilot scope (200-500 questions)">Pilot Scope (200–500 questions)</option>
                  <option value="Medium backlog (500-2,000 questions)">Medium Backlog (500–2,000 questions)</option>
                  <option value="Large scale (2,000-10,000 questions)">Large Scale (2,000–10,000 questions)</option>
                  <option value="Enterprise backlog (10,000+ questions)">Enterprise Backlog (10,000+ questions)</option>
                </select>
              </div>

              <div className="flex flex-col">
                <label htmlFor="source-format" className="text-xs font-medium text-foreground">
                  Current Source Format
                </label>
                <select
                  id="source-format"
                  value={formData.sourceFormat}
                  onChange={(e) => setFormData({ ...formData, sourceFormat: e.target.value })}
                  className="mt-1.5 h-10 rounded-md border border-border bg-background px-3 text-xs text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="PDF documents (scans or native)">PDF Documents (Scans or Native)</option>
                  <option value="Microsoft Word (.docx)">Microsoft Word (.docx)</option>
                  <option value="Spreadsheets (.xlsx / .csv)">Spreadsheets (.xlsx / .csv)</option>
                  <option value="Handwritten / Paper Material">Handwritten / Paper Material</option>
                  <option value="Legacy Question Bank / LMS Export">Legacy Question Bank / LMS Export</option>
                  <option value="Mixed Formats">Mixed Formats</option>
                </select>
              </div>

              <div className="flex flex-col">
                <label htmlFor="target-platform" className="text-xs font-medium text-foreground">
                  Target Platform / Output
                </label>
                <select
                  id="target-platform"
                  value={formData.targetPlatform}
                  onChange={(e) => setFormData({ ...formData, targetPlatform: e.target.value })}
                  className="mt-1.5 h-10 rounded-md border border-border bg-background px-3 text-xs text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="Canvas LMS (QTI)">Canvas LMS (QTI)</option>
                  <option value="Moodle LMS (XML/QTI)">Moodle LMS (XML/QTI)</option>
                  <option value="QTI 2.1 / 3.0 Standard Package">QTI 2.1 / 3.0 Standard Package</option>
                  <option value="Structured JSON / API">Structured JSON / API</option>
                  <option value="Blackboard / Brightspace">Blackboard / Brightspace</option>
                  <option value="Custom Proprietary System">Custom Proprietary System</option>
                  <option value="Not sure yet">Not Sure Yet / Need Recommendation</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex flex-col">
              <label htmlFor="contact-description" className="text-xs font-medium text-foreground">
                Project Description &amp; Backlog Notes *
              </label>
              <textarea
                id="contact-description"
                rows={4}
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your assessment content (e.g. subjects, math equations, diagram types, timeline, or current challenges)..."
                className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            {status === "error" && (
              <div className="mt-4 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {errorMessage}
              </div>
            )}

            {status === "success" && (
              <div className="mt-4 flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>
                  Thank you! Your project details have been received. Our experts will review your scope and get back to you shortly.
                </span>
              </div>
            )}

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border pt-5">
              <p className="text-xs text-muted-foreground">
                No commitment required. We can begin with a sample conversion.
              </p>
              <button
                type="submit"
                disabled={status === "loading"}
                className="inline-flex h-10 w-full sm:w-auto items-center justify-center gap-2 rounded-md bg-primary px-6 text-xs font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-50"
              >
                {status === "loading" ? "Submitting..." : "Discuss My Project"}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
