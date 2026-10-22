import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  Activity,
  ArrowRight,
  Download,
  FileJson,
  ShieldCheck,
  Sparkles,
  Upload,
  ScanText,
  Wrench,
} from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import { getUserOCRStats } from "../../../services/ocrService";

function StatCard({
  label,
  value,
  caption,
}: {
  label: string;
  value: string | number;
  caption: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 transition-colors duration-200">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{caption}</div>
    </div>
  );
}

function ToolCard({
  icon,
  title,
  description,
  onClick,
  comingSoon = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  comingSoon?: boolean;
}) {
  return (
    <div className="relative rounded-lg border border-border bg-card p-4 transition-colors duration-200">
      <div
        className={`${!comingSoon && "hover:border-primary/50"} ${comingSoon ? "blur-sm" : ""}`}
      >
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="text-muted-foreground">{icon}</span>
          {title}
        </div>
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
        <button
          type="button"
          onClick={onClick}
          disabled={comingSoon}
          className={`inline-flex h-8 items-center gap-1 rounded-md px-3 text-xs font-medium transition-colors ${
            comingSoon
              ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          }`}
        >
          Open
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
      {comingSoon && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg">
          <div className="bg-black/50 px-4 py-2 rounded-lg backdrop-blur-sm">
            <span className="text-sm font-semibold text-white">
              Coming Soon
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { userUsage, user } = useAuth();
  const [ocrStats, setOcrStats] = useState({
    total_pages: 0,
    total_questions: 0,
  });
  const [isLoadingOcr, setIsLoadingOcr] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    const fetchOcrStats = async () => {
      setIsLoadingOcr(true);
      try {
        const stats = await getUserOCRStats(user.id);
        setOcrStats(stats);
      } catch (error) {
        console.error("Failed to fetch OCR stats:", error);
      } finally {
        setIsLoadingOcr(false);
      }
    };

    fetchOcrStats();
  }, [user?.id]);

  return (
    <div className="min-h-full space-y-6 bg-workspace-bg p-6 sm:p-8 transition-colors duration-200">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            Workspace overview
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Start from any pipeline tool and monitor conversion readiness before
            final LMS export.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label="Conversion Usage"
          value={userUsage?.total_questions_converted || 0}
          caption="Total successful conversions tracked."
        />
        <StatCard
          label="OCR Pages Processed"
          value={isLoadingOcr ? "..." : ocrStats.total_pages}
          caption="Total pages extracted via OCR."
        />
        <StatCard
          label="Questions Extracted via OCR"
          value={isLoadingOcr ? "..." : ocrStats.total_questions}
          caption="Questions generated from OCR extraction."
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <ToolCard
          icon={<ScanText className="h-4 w-4" />}
          title="OCR Processor"
          description="Extract text and images from PDFs and scanned documents."
          onClick={() => navigate("/workspace/ocr")}
        />
        <ToolCard
          icon={<FileJson className="h-4 w-4" />}
          title="QTI Renderer"
          description="Inspect and validate question XML/JSON quickly."
          onClick={() => navigate("/workspace/qti-renderer")}
          comingSoon={true}
        />

        <ToolCard
          icon={<Wrench className="h-4 w-4" />}
          title="Batch Creator"
          description="Upload, validate, clean, and fix your QTI assessments."
          onClick={() => navigate("/workspace/batch-creator")}
        />

        <ToolCard
          icon={<Download className="h-4 w-4" />}
          title="LMS Export"
          description="Prepare and convert packages for Canvas and other LMS targets."
          onClick={() => navigate("/workspace/lms-export")}
          comingSoon={true}
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
    </div>
  );
}
