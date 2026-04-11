import { useMemo } from "react";
import { useNavigate } from "react-router";
import { Activity, ArrowRight, Download, FileJson, Layers, ShieldCheck, Sparkles, Upload } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { useAuth } from "../../../contexts/AuthContext";

export function DashboardPage() {
  const navigate = useNavigate();
  const { userUsage } = useAuth();

  const usageSummary = useMemo(() => {
    const converted = userUsage?.total_questions_converted || 0;
    const isUnlimited = !!userUsage?.is_unlimited;
    const remaining = Math.max(100 - converted, 0);
    return {
      converted,
      isUnlimited,
      remaining,
      label: isUnlimited ? "Unlimited" : `${remaining} free conversions left`,
    };
  }, [userUsage?.total_questions_converted, userUsage?.is_unlimited]);

  return (
    <div className="p-8 space-y-6 bg-[radial-gradient(circle_at_top_left,_rgba(36,87,184,0.14),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.1),_transparent_30%),linear-gradient(180deg,_#f7fbff_0%,_#f3f9f7_100%)] min-h-full">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#bfd6ff] bg-[linear-gradient(135deg,_#eef4ff_0%,_#e9fbf3_100%)] px-3 py-1 text-xs font-semibold text-[#2457b8]">
            <Sparkles className="w-3.5 h-3.5" />
            Assessment Workspace
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-600 max-w-2xl">
            Start from any tool in your workflow and monitor conversion readiness before exporting to LMS.
          </p>
        </div>
        <Badge className="bg-[linear-gradient(135deg,_#e8f0ff_0%,_#e7f9f0_100%)] text-[#1f4aa0] border border-[#bfd6ff] hover:bg-[linear-gradient(135deg,_#e8f0ff_0%,_#e7f9f0_100%)]">
          {usageSummary.label}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border border-[#c7dcff] bg-[linear-gradient(160deg,_#f7faff_0%,_#ecf5ff_100%)] shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs text-[#2f4b80]">Questions Converted</CardDescription>
            <CardTitle className="text-2xl text-[#1f4aa0]">{usageSummary.converted}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-[#2f4b80]">Total successful conversions tracked.</CardContent>
        </Card>

        <Card className="border border-[#b9e6d2] bg-[linear-gradient(160deg,_#ebfff5_0%,_#e6fdf3_100%)] shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs text-[#1f6c4a]">Batch Creator Access</CardDescription>
            <CardTitle className="text-2xl text-[#18794e]">{userUsage?.batch_creator_access ? "Enabled" : "Locked"}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-[#1f6c4a]">Provisioned token is required for batch workflows.</CardContent>
        </Card>

        <Card className="border border-[#f6d7ac] bg-[linear-gradient(160deg,_#fffdf7_0%,_#fff5e6_100%)] shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs text-[#8b5b12]">Plan</CardDescription>
            <CardTitle className="text-2xl text-[#7a4a08]">{usageSummary.isUnlimited ? "Unlimited" : "Free"}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-[#8b5b12]">{usageSummary.isUnlimited ? "All premium features available." : "Upgrade for AI validation and LMS export."}</CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border border-[#d7e5ff] bg-white/95 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-slate-900"><FileJson className="w-4 h-4 text-[#2457b8]" /> QTI Renderer</CardTitle>
            <CardDescription className="text-sm text-slate-600">Inspect individual XML/JSON quickly.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/workspace/qti-renderer")} className="bg-[linear-gradient(120deg,_#2457b8_0%,_#2f7ecf_100%)] hover:brightness-95 text-white rounded-md">
              Open Renderer <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        <Card className="border border-[#c7dcff] bg-[linear-gradient(160deg,_#f7faff_0%,_#f1f8ff_100%)] shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-slate-900"><Layers className="w-4 h-4 text-[#2457b8]" /> Batch Creator</CardTitle>
            <CardDescription className="text-sm text-slate-600">Run full pipeline: clean, audit, configure, export.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/workspace/batch-creator")} className="bg-[linear-gradient(120deg,_#2457b8_0%,_#1f9d86_100%)] hover:brightness-95 text-white rounded-md">
              Open Batch Creator <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        <Card className="border border-[#d9d0ff] bg-[linear-gradient(160deg,_#faf8ff_0%,_#f3f0ff_100%)] shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-slate-900"><Download className="w-4 h-4 text-[#2457b8]" /> LMS Export</CardTitle>
            <CardDescription className="text-sm text-slate-600">Prepare packages for Canvas and other LMS platforms.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/workspace/lms-export")} className="bg-[linear-gradient(120deg,_#2457b8_0%,_#5b3bb6_100%)] hover:brightness-95 text-white rounded-md">
              Open LMS Export <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-[#d7e5ff] bg-[#f7faff] shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-[#1f4aa0]"><Activity className="w-4 h-4" /> Workflow Health</CardTitle>
          <CardDescription className="text-sm text-[#2f4b80]">Recommended execution sequence for best output quality.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="rounded-lg border border-[#bfd6ff] bg-white px-3 py-2 text-[#2f4b80]"><Upload className="w-4 h-4 inline mr-2" />Upload and map columns</div>
          <div className="rounded-lg border border-[#bfd6ff] bg-white px-3 py-2 text-[#2f4b80]"><ShieldCheck className="w-4 h-4 inline mr-2" />Validate and fix issues</div>
          <div className="rounded-lg border border-[#bfd6ff] bg-white px-3 py-2 text-[#2f4b80]"><Download className="w-4 h-4 inline mr-2" />Review XML then export</div>
        </CardContent>
      </Card>
    </div>
  );
}
