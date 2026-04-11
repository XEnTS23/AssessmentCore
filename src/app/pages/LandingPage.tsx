import { Link } from "react-router";
import {
  ArrowRight,
  Database,
  FileCode,
  FileJson,
  GraduationCap,
  MapPin,
  Phone,
  Settings2,
  ShieldCheck,
  Sparkles,
  Workflow,
  Wrench,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { useAuth } from "../../contexts/AuthContext";

const TRUST_METRICS = [
  { value: "100,000", label: "Questions processed in under 10 minutes" },
  { value: "99.99%", label: "Accuracy in error detection and QTI conversion" },
  { value: "QTI 1.2 / 2.1 / 3.0", label: "Universal compatibility with major LMS platforms" },
];

const SERVICES = [
  {
    title: "Intelligent Data Cleanup",
    description:
      "We transform unstructured rows into pristine assets by fixing typos, resolving mapping breaks, and enforcing structural validation before export.",
    icon: Wrench,
    tone: "border-[#c7dcff] bg-[#f7faff] text-[#1f4aa0]",
  },
  {
    title: "Universal Conversion & LMS Integration",
    description:
      "Your content is converted into QTI 1.2, 2.1, 3.0, and JSON-ready payloads, tailored for plug-and-play import into Canvas, Moodle, and more.",
    icon: FileJson,
    tone: "border-[#b9e6d2] bg-[#ebfff5] text-[#18794e]",
  },
  {
    title: "STEM Content & Test Creation",
    description:
      "High-rigor STEM authoring for JEE, state boards, PSC, and custom programs including question, answer, and test-set generation.",
    icon: GraduationCap,
    tone: "border-[#d8cdfd] bg-[#f6f1ff] text-[#5b3bb6]",
  },
];

const PIPELINE = [
  {
    step: "Step 1",
    title: "Send Us the Mess",
    text: "Share your raw sheets, mixed formats, and partially structured question banks.",
    icon: Database,
  },
  {
    step: "Step 2",
    title: "We Process & Audit",
    text: "AssessmentCore runs automated validation, AI audits, and remediation checks to guarantee quality.",
    icon: ShieldCheck,
  },
  {
    step: "Step 3",
    title: "Flawless Delivery",
    text: "Receive bespoke QTI/JSON outputs mapped to your LMS import requirements and delivery timeline.",
    icon: Workflow,
  },
];

export function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(36,87,184,0.16),_transparent_34%),linear-gradient(180deg,_#f9fbff_0%,_#eef4f8_100%)] text-slate-900">
      <header className="sticky top-0 z-40 border-b border-[#d5e4ff] bg-white/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#0052CC]/12 text-[#0052CC] ring-1 ring-[#0052CC]/20 font-black flex items-center justify-center">A</div>
            <div>
              <p className="text-sm font-extrabold tracking-tight leading-none">AssessmentCore</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Premium Assessment Operations</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a href="#pilot" className="hidden sm:inline-flex">
              <Button variant="outline" className="border-[#bfd6ff] text-[#1f4aa0] hover:bg-[#eef4ff]">Book Consultation</Button>
            </a>
            <Link to={isAuthenticated ? "/workspace/dashboard" : "/auth/login"}>
              <Button className="bg-[#2457b8] hover:bg-[#1f4aa0] text-white">
                Open Workspace
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#bfd6ff] bg-[#eef4ff] px-3 py-1 text-xs font-semibold text-[#2457b8] uppercase tracking-wide">
                <Sparkles className="w-3.5 h-3.5" />
                100-Question Risk-Free Pilot
              </div>

              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.08]">
                Transforming messy data into
                <span className="block text-[#2457b8]">seamless, LMS-ready assessments</span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 max-w-2xl">
                We deliver high-speed data cleanup, universal QTI conversion, and specialized STEM test creation so your team ships flawless digital assessments without manual chaos.
              </p>

              <div className="flex flex-wrap gap-3">
                <a href="#pilot">
                  <Button className="bg-[#2457b8] hover:bg-[#1f4aa0] text-white">
                    Start 100-Question Free Pilot
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </a>
                <a href="#services">
                  <Button variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50">View Services</Button>
                </a>
              </div>
            </div>

            <div className="lg:col-span-5">
              <Card className="border-[#c7dcff] bg-[#f7faff] shadow-sm overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-slate-900">Mess-to-Delivery Visual</CardTitle>
                  <CardDescription className="text-slate-600">From broken rows to clean LMS rendering.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-[11px] font-mono text-rose-700">
                    <p className="font-semibold mb-2">Raw Sheet</p>
                    <p>Q: 2+2 ?</p>
                    <p>A) 3</p>
                    <p>B) 4</p>
                    <p>Ans: opt_broken</p>
                    <p className="mt-2 text-rose-600">ERROR: Invalid mapping</p>
                  </div>
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-[11px] text-emerald-800">
                    <p className="font-semibold mb-2">LMS Preview</p>
                    <p className="mb-1">What is 2 + 2?</p>
                    <p>○ 3</p>
                    <p>● 4</p>
                    <p className="mt-2 text-emerald-700 font-semibold">Score: 1.0</p>
                    <p className="text-emerald-700">Status: QTI valid</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <div className="grid md:grid-cols-3 gap-3">
            {TRUST_METRICS.map((metric) => (
              <Card key={metric.label} className="border-[#d7e5ff] bg-white/95 shadow-sm">
                <CardContent className="pt-4 pb-4">
                  <p className="text-lg font-extrabold text-[#1f4aa0]">{metric.value}</p>
                  <p className="text-xs text-slate-600 mt-1">{metric.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="services" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-wider font-semibold text-[#2457b8]">Core Services</p>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 mt-1">What we deliver for your assessment operations</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {SERVICES.map((service) => {
              const Icon = service.icon;
              return (
                <Card key={service.title} className={`border shadow-sm ${service.tone}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Icon className="w-4 h-4" />
                      {service.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm leading-relaxed opacity-95">{service.description}</CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-wider font-semibold text-[#2457b8]">AssessmentCore Advantage</p>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 mt-1">A simple 3-step journey</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {PIPELINE.map((step) => {
              const Icon = step.icon;
              return (
                <Card key={step.title} className="border border-[#d7e5ff] bg-white shadow-sm">
                  <CardHeader className="pb-3">
                    <CardDescription className="text-xs font-semibold uppercase tracking-wide text-[#2457b8]">{step.step}</CardDescription>
                    <CardTitle className="flex items-center gap-2 text-base text-slate-900"><Icon className="w-4 h-4 text-[#2457b8]" />{step.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-slate-600 leading-relaxed">{step.text}</CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <Card className="border border-[#c7dcff] bg-[#f7faff] shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-900 flex items-center gap-2"><Settings2 className="w-4 h-4 text-[#2457b8]" />Transparent Pricing & Scale</CardTitle>
              <CardDescription className="text-slate-600">Flexible per-question pricing with custom quotes for enterprise scale and technical complexity.</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg border border-[#d7e5ff] bg-white p-4">
                <p className="font-semibold text-slate-900">Per-question model</p>
                <p className="text-slate-600 mt-1">You pay only for the volume you need, with quality-controlled delivery included.</p>
              </div>
              <div className="rounded-lg border border-[#d7e5ff] bg-white p-4">
                <p className="font-semibold text-slate-900">Custom project quote</p>
                <p className="text-slate-600 mt-1">Large migrations, STEM-heavy workflows, and strict LMS specs are scoped and priced transparently.</p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="pilot" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <Card className="border-[#c7dcff] bg-[linear-gradient(135deg,_#ffffff_0%,_#eef4ff_100%)] shadow-sm">
            <CardContent className="py-8 grid lg:grid-cols-2 gap-8">
              <div>
                <p className="text-xs uppercase tracking-wider font-semibold text-[#2457b8] mb-1"></p>
                <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Send 100 messy questions. Pay nothing.</h2>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  We will clean, validate, and convert your sample into LMS-ready QTI or JSON output free of charge.
                  Use the pilot to verify quality, speed, and compatibility before full engagement.
                </p>

                <div className="mt-4 space-y-2 text-sm text-slate-700">
                  <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-[#2457b8]" /> hello@assessmentcore.in</p>
                  <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-[#2457b8]" /> +918918261226</p>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <a href="mailto:hello@assessmentcore.in?subject=100-Question%20Free%20Pilot%20Request">
                    <Button className="bg-[#2457b8] hover:bg-[#1f4aa0] text-white">
                      Request Free Pilot
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </a>
                  <Link to={isAuthenticated ? "/workspace/dashboard" : "/auth/login"}>
                    <Button variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50">
                      Open Dashboard
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="rounded-xl border border-[#d7e5ff] bg-white p-4 sm:p-5">
                <p className="text-sm font-semibold text-slate-900 mb-3">Book Consultation</p>
                <div className="space-y-3">
                  <Input placeholder="Your name" className="border-slate-300" />
                  <Input placeholder="Work email" className="border-slate-300" />
                  <Input placeholder="Organization" className="border-slate-300" />
                  <Textarea placeholder="Tell us your volume, LMS, and timeline" className="min-h-[110px] border-slate-300" />
                  <a href="mailto:hello@assessmentcore.in?subject=Consultation%20Request">
                    <Button className="w-full bg-[#2457b8] hover:bg-[#1f4aa0] text-white">
                      Submit Consultation Request
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t border-[#d5e4ff] bg-white/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <p className="flex items-center gap-2"><FileCode className="w-3.5 h-3.5" /> AssessmentCore</p>
          <p>Premium assessment data cleanup, conversion, and LMS delivery services.</p>
          <p>hello@assessmentcore.in</p>
        </div>
      </footer>
    </div>
  );
}
