import { toast } from "sonner";
import { ValidationDashboard } from "../../components/ValidationDashboard";
import type { ValidationDashboardData } from "../../components/ValidationDashboard";

// ── Sample data (mirrors the output.txt report from the test CSV) ──────────────
const SAMPLE_DATA: ValidationDashboardData = {
  originalCount: 10000,
  uniqueCount: 670,
  readyNowCount: 62,
  recoverableCount: 416,
  roiHoursSaved: 208, // 416 * 0.5
  filename: "enterprise_question_bank_2026.xlsx",
  date: "March 22, 2026",
  topIssues: [
    {
      impactPercent: 43,
      title: "Missing Question Stem",
      description:
        "Missing text blocks the entire Canvas upload — the LMS has no content to render and rejects the item silently. Every affected row must have a non-empty stem before package import.",
      lmsRiskLevel: "Critical",
    },
    {
      impactPercent: 38,
      title: "Answer Not Resolvable to Options",
      description:
        "The declared correct answer cannot be mapped to any available choice. Moodle will import the question but mark zero points for every student response — an invisible scoring failure.",
      lmsRiskLevel: "Critical",
    },
    {
      impactPercent: 29,
      title: "Duplicate Question IDs",
      description:
        "Multiple rows share the same identifier. QTI packages with colliding IDs are rejected at the schema validation step — the entire package fails, not just the duplicated item.",
      lmsRiskLevel: "Critical",
    },
    {
      impactPercent: 22,
      title: "Insufficient Answer Options",
      description:
        "MCQ/MSQ questions with fewer than two choices fail QTI schema validation. Blackboard Ultra surfaces this as an 'invalid item structure' error during content import.",
      lmsRiskLevel: "High",
    },
    {
      impactPercent: 17,
      title: "Ambiguous Answer Mapping",
      description:
        "The answer token matches multiple option texts (e.g., two options both contain '4'). Without a deterministic mapping the system cannot guarantee correct scoring — use identifier labels instead.",
      lmsRiskLevel: "High",
    },
  ],
};

export function ValidationDashboardPage() {
  function handleApprove() {
    toast.success("Remediation Sprint approved! Your team will be notified.");
  }

  function handleDownload() {
    toast.info("Downloading full validation report PDF…");
  }

  return (
    <ValidationDashboard
      data={SAMPLE_DATA}
      onApproveRemediation={handleApprove}
      onDownloadReport={handleDownload}
    />
  );
}
