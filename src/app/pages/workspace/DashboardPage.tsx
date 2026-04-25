import { useMemo } from "react";
import { useNavigate } from "react-router";
import { Activity, ArrowRight, Download, FileJson, Layers, ShieldCheck, Sparkles, Upload } from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";

function StatCard({ label, value, caption }: { label: string; value: string | number; caption: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 transition-colors duration-200">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{caption}</div>
    </div>
  );
}

function ToolCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 transition-colors duration-200 hover:border-primary/50">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
        <span className="text-muted-foreground">{icon}</span>
        {title}
      </div>
      <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{description}</p>
      <button
        type="button"
        onClick={onClick}
        className="inline-flex h-8 items-center gap-1 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Open
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { userUsage } = useAuth();

  const usageSummary = useMemo(() => {
    const converted = userUsage?.total_questions_converted || 0;
    const isPremium = !!userUsage?.is_premium;
    const remaining = Math.max(100 - converted, 0);
    return {
      converted,
      isPremium,
      label: isPremium ? "Premium" : `${remaining} free conversions left`,
    };
  }, [userUsage?.total_questions_converted, userUsage?.is_premium]);

  return (
    <div className="min-h-full space-y-6 bg-workspace-bg p-6 sm:p-8 transition-colors duration-200">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-medium text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            Workspace overview
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Start from any pipeline tool and monitor conversion readiness before final LMS export.
          </p>
        </div>
        <span className="rounded-md border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground">
          {usageSummary.label}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label="Conversion Usage"
          value={usageSummary.converted}
          caption="Total successful conversions tracked."
        />
        <StatCard
          label="Account Status"
          value={usageSummary.isPremium ? "Premium" : "Free Tier"}
          caption={usageSummary.isPremium ? "Full access enabled." : "Limited to basic cleaning."}
        />
        <StatCard
          label="Current Plan"
          value={usageSummary.isPremium ? "Unlimited" : "Restricted"}
          caption={usageSummary.isPremium ? "All premium features available." : "Upgrade for AI audit and LMS export."}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ToolCard
          icon={<FileJson className="h-4 w-4" />}
          title="QTI Renderer"
          description="Inspect and validate question XML/JSON quickly."
          onClick={() => navigate("/workspace/qti-renderer")}
        />
        <ToolCard
          icon={<Layers className="h-4 w-4" />}
          title="Batch Creator"
          description="Run the full pipeline: upload, validate, clean, audit, export."
          onClick={() => navigate("/workspace/batch-creator")}
        />
        <ToolCard
          icon={<Download className="h-4 w-4" />}
          title="LMS Export"
          description="Prepare and convert packages for Canvas and other LMS targets."
          onClick={() => navigate("/workspace/lms-export")}
        />
      </div>

      <div className="rounded-lg border border-border bg-card p-4 transition-colors duration-200">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Activity className="h-4 w-4 text-muted-foreground" />
          Workflow Health
        </div>
        <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
          <div className="rounded-md border border-border bg-muted px-3 py-2 text-foreground">
            <Upload className="mr-2 inline h-4 w-4 text-muted-foreground" />
            Upload and map columns
          </div>
          <div className="rounded-md border border-border bg-muted px-3 py-2 text-foreground">
            <ShieldCheck className="mr-2 inline h-4 w-4 text-muted-foreground" />
            Validate and resolve issues
          </div>
          <div className="rounded-md border border-border bg-muted px-3 py-2 text-foreground">
            <Download className="mr-2 inline h-4 w-4 text-muted-foreground" />
            Export to target LMS
          </div>
        </div>
      </div>

      {!usageSummary.isPremium && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Upgrade Your Workflow</h2>
            <div className="h-px flex-1 bg-border" />
          </div>
          
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Free Card */}
            <div className="relative flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm transition-colors duration-200">
              <div className="mb-4">
                <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Current Plan</span>
                <h3 className="mt-2 text-xl font-bold text-foreground">Free Tier</h3>
                <p className="mt-1 text-sm text-muted-foreground">Perfect for exploring and basic cleaning.</p>
              </div>
              <div className="mb-6 flex-1 space-y-3">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" /> Standard Data Validation
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" /> Auto-cleaning & Manual Fixing
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" /> Excel Export (100 row limit)
                </div>
              </div>
              <div className="mt-auto pt-4 text-2xl font-bold text-foreground">$0<span className="text-sm font-normal text-muted-foreground"> / month</span></div>
            </div>

            {/* Premium Card */}
            <div className="relative flex flex-col rounded-xl border-2 border-primary bg-card p-6 shadow-md ring-4 ring-primary/10 transition-colors duration-200">
              <div className="absolute -top-3 right-6 rounded-full bg-primary px-3 py-1 text-[10px] font-bold text-primary-foreground uppercase tracking-wider">Most Popular</div>
              <div className="mb-4">
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">Premium Tier</span>
                <h3 className="mt-2 text-xl font-bold text-foreground">Professional</h3>
                <p className="mt-1 text-sm text-muted-foreground">Full power for large scale assessment teams.</p>
              </div>
              <div className="mb-6 flex-1 space-y-3">
                <div className="flex items-center gap-2 text-sm text-foreground font-medium">
                  <Sparkles className="h-4 w-4 text-amber-500" /> AI-Powered Pedagogy Audit
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground font-medium">
                  <Sparkles className="h-4 w-4 text-amber-500" /> Unlimited Rows & Questions
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground font-medium">
                  <Sparkles className="h-4 w-4 text-amber-500" /> Full LMS Export (QTI, Canvas, etc.)
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground font-medium">
                  <Sparkles className="h-4 w-4 text-amber-500" /> Advanced XML/Configuration
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground font-medium">
                  <Sparkles className="h-4 w-4 text-amber-500" /> Image & MathML Conversion
                </div>
              </div>
              <a 
                href="mailto:hello@assessmentcore.in?subject=Upgrade to Premium"
                className="mt-4 inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
              >
                Upgrade to Premium
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
