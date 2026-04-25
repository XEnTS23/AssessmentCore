import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  FileSpreadsheet,
  XCircle,
  Shield,
  Zap,
  TrendingUp,
  Download,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { cn } from "./ui/utils";
import { useTheme } from "../../contexts/ThemeContext";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface TopIssue {
  impactPercent: number;
  title: string;
  description: string;
  lmsRiskLevel: "High" | "Critical";
}

export interface ValidationDashboardData {
  originalCount: number;
  uniqueCount: number;
  readyNowCount: number;
  recoverableCount: number;
  roiHoursSaved: number;
  topIssues: TopIssue[];
  filename?: string;
  date?: string;
}

interface ValidationDashboardProps {
  data: ValidationDashboardData;
  onApproveRemediation?: () => void;
  onDownloadReport?: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString();
}

// ── QTI Syntax Highlighting ────────────────────────────────────────────────────

function QtiSnippet() {
  const br = (t: string) => <span style={{ color: "#569CD6" }}>{t}</span>;
  const kw = (t: string) => <span style={{ color: "#4EC9B0" }}>{t}</span>;
  const at = (t: string) => <span style={{ color: "#9CDCFE" }}>{t}</span>;
  const av = (t: string) => <span style={{ color: "#CE9178" }}>{t}</span>;
  const tx = (t: string) => <span style={{ color: "#D4D4D4" }}>{t}</span>;
  const cm = (t: string) => <span style={{ color: "#6A9955" }}>{t}</span>;
  const sp = (n = 2) => " ".repeat(n);

  return (
    <>
      {cm("<!-- QTI 2.1 IMS Standard — AssessmentCore Output -->\n")}
      {br("<")}{kw("assessmentItem")}{"\n"}
      {sp(2)}{at("identifier")}{br("=")}{av('"Q001"')}{"\n"}
      {sp(2)}{at("title")}{br("=")}{av('"What is 2+2?"')}{"\n"}
      {sp(2)}{at("adaptive")}{br("=")}{av('"false"')}{"\n"}
      {sp(2)}{at("timeDependent")}{br("=")}{av('"false"')}{br(">")}{"\n"}
      {"\n"}
      {sp(2)}{br("<")}{kw("responseDeclaration")}{"\n"}
      {sp(4)}{at("identifier")}{br("=")}{av('"RESPONSE"')}{"\n"}
      {sp(4)}{at("cardinality")}{br("=")}{av('"single"')}{"\n"}
      {sp(4)}{at("baseType")}{br("=")}{av('"identifier"')}{br(">")}{"\n"}
      {sp(4)}{br("<")}{kw("correctResponse")}{br(">")}{"\n"}
      {sp(6)}{br("<")}{kw("value")}{br(">")}{tx("choice_A")}{br("</")}{kw("value")}{br(">")}{"\n"}
      {sp(4)}{br("</")}{kw("correctResponse")}{br(">")}{"\n"}
      {sp(2)}{br("</")}{kw("responseDeclaration")}{br(">")}{"\n"}
      {"\n"}
      {sp(2)}{br("<")}{kw("itemBody")}{br(">")}{"\n"}
      {sp(4)}{br("<")}{kw("choiceInteraction")}{"\n"}
      {sp(6)}{at("responseIdentifier")}{br("=")}{av('"RESPONSE"')}{"\n"}
      {sp(6)}{at("shuffle")}{br("=")}{av('"false"')}{"\n"}
      {sp(6)}{at("maxChoices")}{br("=")}{av('"1"')}{br(">")}{"\n"}
      {sp(6)}{br("<")}{kw("prompt")}{br(">")}{tx("What is 2+2?")}{br("</")}{kw("prompt")}{br(">")}{"\n"}
      {sp(6)}{br("<")}{kw("simpleChoice")}{" "}{at("identifier")}{br("=")}{av('"choice_A"')}{br(">")}{tx("4")}{br("</")}{kw("simpleChoice")}{br(">")}{"\n"}
      {sp(6)}{br("<")}{kw("simpleChoice")}{" "}{at("identifier")}{br("=")}{av('"choice_B"')}{br(">")}{tx("5")}{br("</")}{kw("simpleChoice")}{br(">")}{"\n"}
      {sp(6)}{br("<")}{kw("simpleChoice")}{" "}{at("identifier")}{br("=")}{av('"choice_C"')}{br(">")}{tx("6")}{br("</")}{kw("simpleChoice")}{br(">")}{"\n"}
      {sp(4)}{br("</")}{kw("choiceInteraction")}{br(">")}{"\n"}
      {sp(2)}{br("</")}{kw("itemBody")}{br(">")}{"\n"}
      {"\n"}
      {br("</")}{kw("assessmentItem")}{br(">")}{"\n"}
    </>
  );
}

// ── Section Number Badge ───────────────────────────────────────────────────────

function SectionBadge({ n, color }: { n: number; color: string }) {
  return (
    <div
      className="w-8 h-8 rounded-full text-primary-foreground flex items-center justify-center text-sm font-black flex-shrink-0 shadow-sm"
      style={{ background: color }}
    >
      {n}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function ValidationDashboard({
  data,
  onApproveRemediation,
  onDownloadReport,
}: ValidationDashboardProps) {
  const { isDark } = useTheme();
  const {
    originalCount,
    uniqueCount,
    readyNowCount,
    recoverableCount,
    roiHoursSaved,
    topIssues,
    filename = "question_bank.xlsx",
    date = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  } = data;

  const dedupPct = ((1 - uniqueCount / originalCount) * 100).toFixed(1);
  const removedCount = originalCount - uniqueCount;
  const needsReviewCount = Math.max(0, uniqueCount - readyNowCount - recoverableCount);

  const readyPct = (readyNowCount / uniqueCount) * 100;
  const recoverPct = (recoverableCount / uniqueCount) * 100;
  const reviewPct = (needsReviewCount / uniqueCount) * 100;

  return (
    <div className="bg-background min-h-screen" style={{ fontFamily: "'Inter', 'Roboto', system-ui, sans-serif" }}>

      {/* ─────────────────────────── HEADER ──────────────────────────────── */}
      <div
        className="px-6 py-10 text-primary-foreground"
        style={{ background: "linear-gradient(135deg, #6B1E1E 0%, #4A0E0E 55%, #1A0505 100%)" }}
      >
        <div className="max-w-5xl mx-auto">
          {/* Brand row */}
          <div className="flex items-center gap-3 mb-1">
            <img src={isDark ? '/logo-dark-1.png' : '/AC_logo.png'} alt="AssessmentCore logo" className="w-9 h-9 rounded-lg object-contain border border-white/20 bg-card/10" />
            <span className="text-2xl font-black tracking-tight">AssessmentCore</span>
            <span className="ml-1 bg-red-800/50 border border-red-600/40 text-red-200 text-[11px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider">
              Enterprise
            </span>
          </div>

          <h1 className="text-3xl font-bold text-primary-foreground mt-4 leading-tight">
            Question Bank Validation Report
          </h1>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-5 mt-3 text-red-200/70 text-sm">
            <div className="flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4" />
              <span className="font-medium text-red-100/90">{filename}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>Generated {date}</span>
            </div>
          </div>

          {/* KPI pill row */}
          <div className="flex flex-wrap gap-3 mt-7">
            {[
              { value: fmt(originalCount), label: "Total Rows", color: "text-red-100" },
              { value: fmt(uniqueCount), label: "Unique", color: "text-[#60A5FA]" },
              { value: fmt(readyNowCount), label: "Ready Now", color: "text-[#4ADE80]" },
              { value: fmt(recoverableCount), label: "Recoverable", color: "text-[#FCD34D]" },
              { value: `~${fmt(roiHoursSaved)}h`, label: "SME Hrs Saved", color: "text-[#C4B5FD]" },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="bg-card/10 border border-white/15 rounded-xl px-5 py-3 text-center backdrop-blur-sm"
              >
                <p className={cn("text-xl font-black leading-none", kpi.color)}>{kpi.value}</p>
                <p className="text-[11px] text-red-200/60 uppercase tracking-wide mt-1">{kpi.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─────────────────────────── BODY ────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">

        {/* ══ SECTION 1: Deduplication ══════════════════════════════════════ */}
        <section>
          <div className="flex items-center gap-3 mb-5">
            <SectionBadge n={1} color="#6B1E1E" />
            <div>
              <h2 className="text-xl font-bold text-foreground">The Deduplication Phase</h2>
              <p className="text-sm text-muted-foreground">Automatic removal of exact and near-duplicate questions</p>
            </div>
          </div>

          <div className="bg-card rounded-2xl shadow-sm border border-[#E2E8F0] p-8">
            {/* Funnel visual */}
            <div className="flex flex-col md:flex-row items-center gap-4 lg:gap-6">
              {/* Left card: Original */}
              <div className="flex-1 rounded-xl border-2 border-destructive/20 bg-destructive-light/20 p-6 text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-destructive-light border-2 border-destructive mb-4">
                  <FileSpreadsheet className="w-6 h-6 text-destructive" />
                </div>
                <p className="text-5xl font-black text-destructive leading-none tabular-nums">
                  {fmt(originalCount)}
                </p>
                <p className="text-xs font-bold text-muted-foreground mt-2 uppercase tracking-widest">
                  Raw Upload
                </p>
                <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-red-400 font-medium">
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Contains duplicates &amp; errors</span>
                </div>
              </div>

              {/* Center: Funnel + badge */}
              <div className="flex flex-col items-center gap-3 flex-shrink-0 px-2">
                {/* Tapering bars */}
                <div className="flex flex-col items-center gap-[3px]">
                  {[96, 84, 70, 56, 42, 28, 14].map((w, i) => (
                    <div
                      key={i}
                      className="rounded-[3px] h-[14px] transition-all"
                      style={{
                        width: `${w}px`,
                        background:
                          i < 3
                            ? `rgba(127,29,29,${0.60 - i * 0.08})`
                            : `rgba(29,78,216,${0.14 + (7 - i) * 0.07})`,
                      }}
                    />
                  ))}
                </div>
                {/* Badge */}
                <div className="bg-[#6B1E1E] text-primary-foreground rounded-full px-4 py-2 text-center shadow-md mt-1">
                  <p className="text-[15px] font-black leading-none">{dedupPct}%</p>
                  <p className="text-[9px] font-bold uppercase tracking-widest mt-0.5 opacity-75">
                    Removed
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-[#CBD5E1]" />
              </div>

              {/* Right card: Unique */}
              <div className="flex-1 rounded-xl border-2 border-chart-1/20 bg-accent/30 p-6 text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-accent border-2 border-chart-1 mb-4">
                  <CheckCircle2 className="w-6 h-6 text-chart-1" />
                </div>
                <p className="text-5xl font-black text-chart-1 leading-none tabular-nums">
                  {fmt(uniqueCount)}
                </p>
                <p className="text-xs font-bold text-muted-foreground mt-2 uppercase tracking-widest">
                  Unique Questions
                </p>
                <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-blue-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Distinct, validated content</span>
                </div>
              </div>
            </div>

            {/* Tagline banner */}
            <div className="mt-7 rounded-xl border border-[#E2E8F0] bg-gradient-to-r from-red-50/60 via-white to-blue-50/60 p-4 flex items-start gap-3">
              <Zap className="w-5 h-5 text-[#6B1E1E] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[#374151] leading-relaxed">
                <span className="font-black text-[#6B1E1E]">
                  Phase 1 Complete: {dedupPct}% Redundancy Removed.
                </span>{" "}
                Your subject matter experts are shielded from{" "}
                <span className="font-bold text-[#374151]">{fmt(removedCount)}</span> redundant review
                cycles — meaning zero wasted time on content that was never going to ship.
              </p>
            </div>
          </div>
        </section>

        {/* ══ SECTION 2: Recovery Value ═════════════════════════════════════ */}
        <section>
          <div className="flex items-center gap-3 mb-5">
            <SectionBadge n={2} color="#1D4ED8" />
            <div>
              <h2 className="text-xl font-bold text-foreground">The Recovery Value</h2>
              <p className="text-sm text-muted-foreground">
                From {fmt(uniqueCount)} unique questions — here is what AssessmentCore can deliver
              </p>
            </div>
          </div>

          <div className="bg-card rounded-2xl shadow-sm border border-[#E2E8F0] p-8 space-y-8">
            {/* Three stat tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Ready Now */}
              <div className="rounded-xl border-2 border-success bg-success-light/60 p-6 text-center group hover:shadow-md transition-shadow">
                <div className="w-11 h-11 rounded-full bg-success-light border-2 border-success flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />
                </div>
                <p className="text-4xl font-black text-[#15803D] leading-none tabular-nums">{fmt(readyNowCount)}</p>
                <p className="text-[11px] font-bold text-success mt-2 uppercase tracking-wider">Ready Now</p>
                <p className="text-[11px] text-success/70 mt-0.5">{readyPct.toFixed(0)}% of unique bank</p>
                <div className="mt-3 pt-3 border-t border-emerald-100">
                  <p className="text-xs text-[#374151]">Fully compliant — export immediately to Canvas, Moodle, Blackboard</p>
                </div>
              </div>

              {/* Recoverable */}
              <div className="rounded-xl border-2 border-warning bg-warning-light/60 p-6 text-center group hover:shadow-md transition-shadow">
                <div className="w-11 h-11 rounded-full bg-warning-light border-2 border-warning flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="w-5 h-5 text-[#D97706]" />
                </div>
                <p className="text-4xl font-black text-[#B45309] leading-none tabular-nums">{fmt(recoverableCount)}</p>
                <p className="text-[11px] font-bold text-warning mt-2 uppercase tracking-wider">Recoverable</p>
                <p className="text-[11px] text-warning/70 mt-0.5">{recoverPct.toFixed(0)}% of unique bank</p>
                <div className="mt-3 pt-3 border-t border-amber-100">
                  <p className="text-xs text-[#374151]">Fixable with automated remediation — no SME re-writing required</p>
                </div>
              </div>

              {/* Needs Review */}
              <div className="rounded-xl border-2 border-border bg-muted/60 p-6 text-center group hover:shadow-md transition-shadow">
                <div className="w-11 h-11 rounded-full bg-muted border-2 border-border flex items-center justify-center mx-auto mb-3">
                  <AlertCircle className="w-5 h-5 text-[#64748B]" />
                </div>
                <p className="text-4xl font-black text-[#475569] leading-none tabular-nums">{fmt(needsReviewCount)}</p>
                <p className="text-[11px] font-bold text-muted-foreground mt-2 uppercase tracking-wider">Needs Deeper Review</p>
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">{reviewPct.toFixed(0)}% of unique bank</p>
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-[#374151]">Requires manual SME attention before LMS upload</p>
                </div>
              </div>
            </div>

            {/* Stacked composition bar */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                Composition of {fmt(uniqueCount)} Unique Questions
              </p>
              <div className="flex h-6 rounded-full overflow-hidden w-full shadow-inner bg-[#F1F5F9]">
                <div
                  className="h-full transition-all duration-700"
                  style={{ width: `${readyPct}%`, background: "#16A34A" }}
                  title={`Ready: ${readyNowCount}`}
                />
                <div
                  className="h-full transition-all duration-700"
                  style={{ width: `${recoverPct}%`, background: "#F59E0B" }}
                  title={`Recoverable: ${recoverableCount}`}
                />
                <div
                  className="h-full transition-all duration-700"
                  style={{ width: `${reviewPct}%`, background: "#CBD5E1" }}
                  title={`Needs Review: ${needsReviewCount}`}
                />
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
                {[
                  { color: "#16A34A", label: "Ready Now", pct: readyPct },
                  { color: "#F59E0B", label: "Recoverable", pct: recoverPct },
                  { color: "#CBD5E1", label: "Needs Review", pct: reviewPct },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm" style={{ background: item.color }} />
                    <span className="text-[#374151] font-medium">
                      {item.label} ({item.pct.toFixed(0)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ROI callout */}
            <div
              className="rounded-2xl border-2 border-primary p-6"
              style={{ background: "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)" }}
            >
              <div className="flex items-start gap-5">
                <div className="w-14 h-14 rounded-2xl bg-[#1D4ED8] flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-200">
                  <Clock className="w-7 h-7 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-[#1D4ED8] uppercase tracking-widest">
                    Value Delivered
                  </p>
                  <p className="text-2xl font-black text-[#1E40AF] mt-1.5 leading-tight">
                    Recovering these questions saves your subject matter experts approximately{" "}
                    <span className="text-[#1D4ED8]">~{fmt(roiHoursSaved)} hours</span> of re-writing time.
                  </p>
                  <p className="text-sm text-[#3B82F6] mt-2">
                    Based on{" "}
                    <span className="font-bold text-[#1D4ED8]">{fmt(recoverableCount)} recoverable questions</span> ×
                    0.5 hrs/question estimated re-write time. At standard SME billing rates, this represents significant cost avoidance.
                  </p>

                  {/* Calculation breakdown */}
                  <div className="mt-4 flex flex-wrap gap-2 items-center text-sm font-bold text-[#1E40AF]">
                    <div className="bg-card/70 rounded-lg px-4 py-2 text-center border border-blue-100">
                      <p className="text-lg font-black">{fmt(recoverableCount)}</p>
                      <p className="text-[10px] text-[#6B7280] font-normal">Questions Saved</p>
                    </div>
                    <span className="text-[#93C5FD] text-lg">×</span>
                    <div className="bg-card/70 rounded-lg px-4 py-2 text-center border border-blue-100">
                      <p className="text-lg font-black">0.5</p>
                      <p className="text-[10px] text-[#6B7280] font-normal">Hrs / Question</p>
                    </div>
                    <span className="text-[#93C5FD] text-lg">=</span>
                    <div className="bg-[#1D4ED8] text-primary-foreground rounded-lg px-4 py-2 text-center shadow-md">
                      <p className="text-lg font-black">~{fmt(roiHoursSaved)} hrs</p>
                      <p className="text-[10px] opacity-70 font-normal">Total Saved</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══ SECTION 3: LMS Rejection Risks ═══════════════════════════════ */}
        <section>
          <div className="flex items-center gap-3 mb-5">
            <SectionBadge n={3} color="#B45309" />
            <div>
              <h2 className="text-xl font-bold text-[#111827]">LMS Rejection Risks</h2>
              <p className="text-sm text-[#6B7280]">
                These data issues will cause silent import failures in Canvas, Moodle, and Blackboard
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {topIssues.map((issue, i) => {
              const isCritical = issue.lmsRiskLevel === "Critical";
              return (
                <div
                  key={i}
                  className={cn(
                    "bg-card rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden flex",
                    "hover:shadow-md transition-shadow"
                  )}
                >
                  {/* Left accent stripe */}
                  <div
                    className="w-1.5 flex-shrink-0"
                    style={{ background: isCritical ? "#DC2626" : "#D97706" }}
                  />

                  {/* Icon */}
                  <div
                    className={cn(
                      "flex items-center justify-center px-5",
                      isCritical ? "bg-destructive-light" : "bg-warning-light"
                    )}
                  >
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        isCritical ? "bg-destructive-light" : "bg-warning-light"
                      )}
                    >
                      {isCritical ? (
                        <XCircle className="w-5 h-5 text-[#DC2626]" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-[#D97706]" />
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 px-5 py-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-bold text-[#111827] text-[15px]">{issue.title}</h3>
                      <span
                        className={cn(
                          "text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide",
                          isCritical
                            ? "bg-destructive-light text-destructive border border-destructive"
                            : "bg-warning-light text-warning border border-warning"
                        )}
                      >
                        {issue.lmsRiskLevel} Risk
                      </span>
                    </div>
                    <p className="text-sm text-[#6B7280] mt-1 leading-relaxed">{issue.description}</p>

                    {/* Impact bar */}
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1 h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${issue.impactPercent}%`,
                            background: isCritical ? "#DC2626" : "#D97706",
                          }}
                        />
                      </div>
                      <span className="text-xs font-bold text-[#6B7280] whitespace-nowrap flex-shrink-0">
                        {issue.impactPercent}% of bank
                      </span>
                    </div>
                  </div>

                  {/* Right chevron hint */}
                  <div className="flex items-center pr-4 pl-2">
                    <ChevronRight className="w-4 h-4 text-[#CBD5E1]" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ══ SECTION 4: Before / After ═════════════════════════════════════ */}
        <section>
          <div className="flex items-center gap-3 mb-5">
            <SectionBadge n={4} color="#047857" />
            <div>
              <h2 className="text-xl font-bold text-[#111827]">The AssessmentCore Transformation</h2>
              <p className="text-sm text-[#6B7280]">
                From raw spreadsheet chaos to LMS-ready QTI 2.1 standard
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* ── Before ── */}
            <div className="rounded-2xl border-2 border-destructive bg-card overflow-hidden shadow-sm">
              {/* Panel header */}
              <div className="bg-[#FEF2F2] border-b-2 border-destructive px-5 py-3 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-[#DC2626]" />
                <span className="text-sm font-bold text-[#DC2626]">BEFORE — Raw Excel Upload</span>
              </div>

              <div className="p-5 overflow-x-auto">
                <table className="text-[11px] border-collapse w-full min-w-max font-mono">
                  <thead>
                    <tr className="bg-[#F8FAFC]">
                      {["Q_ID", "Question", "Answer", "Opt A", "Opt B", "Type"].map((h) => (
                        <th
                          key={h}
                          className="border border-[#D1D5DB] px-2.5 py-1.5 text-left font-bold text-[#374151] bg-[#F1F5F9]"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Row 1: Missing ID + missing answer */}
                    <tr className="hover:bg-destructive-light/30">
                      <td className="border border-[#D1D5DB] px-2.5 py-1.5 bg-destructive-light/60">
                        <span className="text-red-400 italic font-sans">???</span>
                      </td>
                      <td className="border border-[#D1D5DB] px-2.5 py-1.5 max-w-[90px] truncate text-[#374151]">
                        What is 2+2?
                      </td>
                      <td className="border border-[#D1D5DB] px-2.5 py-1.5 bg-destructive-light/60">
                        <span className="text-red-400 italic font-sans">[empty]</span>
                      </td>
                      <td className="border border-[#D1D5DB] px-2.5 py-1.5 text-[#374151]">4</td>
                      <td className="border border-[#D1D5DB] px-2.5 py-1.5 text-[#374151]">5</td>
                      <td className="border border-[#D1D5DB] px-2.5 py-1.5 bg-warning-light">
                        <span className="text-warning font-sans">mcq???</span>
                      </td>
                    </tr>
                    {/* Row 2: Missing stem */}
                    <tr className="hover:bg-destructive-light/30">
                      <td className="border border-[#D1D5DB] px-2.5 py-1.5 text-[#374151]">Q_002</td>
                      <td className="border border-[#D1D5DB] px-2.5 py-1.5 bg-destructive-light/60">
                        <span className="text-red-400 italic font-sans">[MISSING]</span>
                      </td>
                      <td className="border border-[#D1D5DB] px-2.5 py-1.5 text-[#374151]">A</td>
                      <td className="border border-[#D1D5DB] px-2.5 py-1.5 text-[#374151]">True</td>
                      <td className="border border-[#D1D5DB] px-2.5 py-1.5 bg-destructive-light/60">
                        <span className="text-red-400 italic font-sans">[empty]</span>
                      </td>
                      <td className="border border-[#D1D5DB] px-2.5 py-1.5 text-[#374151]">TF</td>
                    </tr>
                    {/* Row 3: Duplicate of row 1 */}
                    <tr className="hover:bg-warning-light/30">
                      <td className="border border-[#D1D5DB] px-2.5 py-1.5 bg-warning-light/70">
                        <span className="text-warning line-through font-sans">Q_001</span>
                      </td>
                      <td className="border border-[#D1D5DB] px-2.5 py-1.5 text-[#374151]">What is 2+2?</td>
                      <td className="border border-[#D1D5DB] px-2.5 py-1.5 text-[#374151]">4</td>
                      <td className="border border-[#D1D5DB] px-2.5 py-1.5 text-[#374151]">4</td>
                      <td className="border border-[#D1D5DB] px-2.5 py-1.5 text-[#374151]">5</td>
                      <td className="border border-[#D1D5DB] px-2.5 py-1.5 bg-warning-light">
                        <span className="text-warning font-sans">MCQ</span>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Error tags */}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {[
                    { label: "Missing ID", color: "bg-destructive-light text-destructive border-destructive" },
                    { label: "Missing Answer", color: "bg-destructive-light text-destructive border-destructive" },
                    { label: "Missing Stem", color: "bg-destructive-light text-destructive border-destructive" },
                    { label: "Duplicate Row", color: "bg-warning-light text-warning border-warning" },
                    { label: "Unknown Type", color: "bg-warning-light text-warning border-warning" },
                  ].map((tag) => (
                    <span
                      key={tag.label}
                      className={cn(
                        "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border",
                        tag.color
                      )}
                    >
                      ⚠ {tag.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* ── After ── */}
            <div className="rounded-2xl border-2 border-emerald-800/60 bg-[#0F172A] overflow-hidden shadow-lg">
              {/* Panel header */}
              <div className="bg-[#1E2D3D] border-b border-emerald-900/60 px-5 py-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#4ADE80]" />
                <span className="text-sm font-bold text-[#4ADE80]">AFTER — QTI 2.1 Standard</span>
                <span className="ml-auto text-[10px] text-[#4B5563] font-mono bg-[#111827] px-2 py-0.5 rounded">
                  assessmentItem.xml
                </span>
              </div>

              {/* Code block */}
              <div className="p-5 overflow-x-auto">
                <pre className="text-[11.5px] font-mono leading-[1.65] whitespace-pre">
                  <QtiSnippet />
                </pre>
              </div>

              {/* Success badges */}
              <div className="border-t border-[#1E293B] px-5 py-3 flex flex-wrap gap-1.5">
                {[
                  "✓ Valid identifier",
                  "✓ Correct answer mapped",
                  "✓ IMS QTI 2.1 compliant",
                  "✓ Canvas-ready",
                ].map((badge) => (
                  <span
                    key={badge}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-900/50 text-[#4ADE80] border border-emerald-800/60"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ══ SECTION 5: Next Steps CTA ═════════════════════════════════════ */}
        <section>
          <div
            className="rounded-2xl overflow-hidden shadow-xl"
            style={{ background: "linear-gradient(135deg, #6B1E1E 0%, #3B1F7A 60%, #1E1B4B 100%)" }}
          >
            <div className="px-10 py-12 text-primary-foreground text-center">
              {/* Brand */}
              <div className="flex items-center justify-center gap-2 mb-5">
                <img src={isDark ? '/logo-dark-1.png' : '/AC_logo.png'} alt="AssessmentCore logo" className="w-5 h-5 rounded object-contain" />
                <span className="text-sm font-bold text-red-200/60 uppercase tracking-widest">
                  AssessmentCore · Next Steps
                </span>
              </div>

              {/* Headline */}
              <h2 className="text-4xl font-black text-primary-foreground leading-tight max-w-2xl mx-auto">
                Transform your data into an{" "}
                <span className="text-[#FCD34D]">LMS-ready</span> question bank.
              </h2>
              <p className="text-lg text-primary-foreground/65 mt-4 max-w-xl mx-auto leading-relaxed">
                {fmt(recoverableCount)} questions are recoverable right now. Approve the Remediation
                Sprint and we will handle the rest — automatically.
              </p>

              {/* CTA buttons */}
              <div className="flex items-center justify-center gap-4 mt-8 flex-wrap">
                <button
                  onClick={onApproveRemediation}
                  className="inline-flex items-center gap-2.5 bg-card text-[#6B1E1E] font-black px-8 py-4 rounded-xl text-base shadow-lg hover:bg-destructive-light active:bg-destructive-light transition-colors"
                >
                  <Zap className="w-5 h-5" />
                  Approve Remediation Sprint
                </button>
                <button
                  onClick={onDownloadReport}
                  className="inline-flex items-center gap-2.5 bg-card/10 border border-white/25 text-primary-foreground font-semibold px-6 py-4 rounded-xl text-base hover:bg-card/20 active:bg-card/30 transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Download Full Report
                </button>
              </div>

              {/* Bottom KPI strip */}
              <div className="mt-10 pt-8 border-t border-white/15 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-lg mx-auto">
                {[
                  { value: fmt(readyNowCount), label: "Export Immediately" },
                  { value: fmt(recoverableCount), label: "Questions Recoverable" },
                  { value: `~${fmt(roiHoursSaved)}h`, label: "Expert Hours Saved" },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <p className="text-3xl font-black text-primary-foreground tabular-nums">{stat.value}</p>
                    <p className="text-xs text-primary-foreground/45 mt-1.5 uppercase tracking-wide font-medium">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center pb-4">
          <p className="text-xs text-[#94A3B8]">
            Confidential · Generated by{" "}
            <span className="font-bold text-[#6B1E1E]">AssessmentCore</span> · {date}
          </p>
        </footer>
      </div>
    </div>
  );
}
