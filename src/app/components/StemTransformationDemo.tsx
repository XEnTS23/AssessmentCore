import { useState } from "react";
import katex from "katex";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle,
  ChevronRight,
  Code2,
  Cpu,
  Eye,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Zap,
} from "lucide-react";

function KatexSpan({ math, display = false }: { math: string; display?: boolean }) {
  try {
    const html = katex.renderToString(math, {
      displayMode: display,
      throwOnError: false,
    });
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  } catch {
    return <code>{math}</code>;
  }
}

export function StemTransformationDemo() {
  const [activeTab, setActiveTab] = useState<"all" | "mcq" | "circuit" | "chemistry" | "math">("all");

  const capabilities = [
    "Question segmentation",
    "Multiple-choice detection",
    "Text-entry detection",
    "Option extraction",
    "Mathematical notation",
    "Circuit / STEM diagram handling",
    "Chemical structure handling",
    "Clean digital rendering",
    "Structured output",
  ];

  return (
    <section id="examples" className="border-t border-border bg-muted/20 px-6 py-20 transition-colors">
      <div className="mx-auto w-full max-w-6xl">
        {/* Section Header */}
        <div className="flex flex-col items-start max-w-3xl">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            <Layers className="h-3.5 w-3.5" />
            Proof of Technology
          </div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            From unstructured content to digital assessment
          </h2>
          <p className="mt-3.5 text-base leading-relaxed text-muted-foreground">
            A single handwritten page can contain different question types, equations, circuit diagrams, chemical structures, and mathematical notation. Our processing pipeline is being developed to identify those components and turn them into structured digital items.
          </p>
        </div>

        {/* Prototype Disclosure Banner */}
        <div className="mt-6 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-900 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div>
            <span className="font-semibold uppercase tracking-wide mr-1">
              Prototype Demonstration:
            </span>
            Our automated processing engine is under active development. Human review is used where needed, and complex or ambiguous source content may require manual correction.
          </div>
        </div>

        {/* Capability Tags */}
        <div className="mt-6 flex flex-wrap gap-2">
          {capabilities.map((cap) => (
            <span
              key={cap}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground shadow-xs"
            >
              <Check className="h-3 w-3 text-emerald-600" />
              {cap}
            </span>
          ))}
        </div>

        {/* View Switcher Tabs */}
        <div className="mt-8 flex flex-wrap items-center gap-2 border-b border-border pb-3">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-2">
            Inspect Item:
          </span>
          {[
            { id: "all", label: "Overview (All 4 Items)" },
            { id: "mcq", label: "1. MCQ Single Choice" },
            { id: "circuit", label: "2. Physics / Circuit Diagram" },
            { id: "chemistry", label: "3. Chemistry Structure" },
            { id: "math", label: "4. Mathematics / Integral" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Main Transformation Display */}
        <div className="mt-6 grid gap-6 lg:grid-cols-12 items-start">
          {/* Left Column: Source Handwritten / Unstructured Representation */}
          <div className="lg:col-span-5 rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5 text-xs font-medium text-muted-foreground">
              <span className="flex items-center gap-1.5 font-semibold text-foreground">
                <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
                Raw Source Material (Handwritten Sheet)
              </span>
              <span className="rounded bg-background px-2 py-0.5 text-xs border border-border">
                Unstructured
              </span>
            </div>

            {/* Stylized Handwritten Paper Mockup */}
            <div className="relative p-5 bg-[#faf8f2] dark:bg-stone-900/60 font-serif text-stone-800 dark:text-stone-200 select-none overflow-hidden">
              {/* Lined paper texture effect */}
              <div
                className="pointer-events-none absolute inset-0 opacity-15"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(0deg, transparent, transparent 27px, #3b82f6 28px)",
                }}
              />

              <div className="relative space-y-6 text-xs leading-relaxed">
                {/* Item 1 Handwritten */}
                <div
                  className={`rounded-md border p-2.5 transition-all ${
                    activeTab === "all" || activeTab === "mcq"
                      ? "border-blue-400 bg-blue-50/60 dark:bg-blue-950/30"
                      : "border-transparent opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-sans font-semibold text-blue-700 dark:text-blue-300 mb-1">
                    <span>Q1. [Thermodynamics - MCQ]</span>
                    <span className="rounded bg-blue-100 dark:bg-blue-900/50 px-1.5 py-0.2">Bound #1</span>
                  </div>
                  <p className="font-medium italic">
                    Q1. For an adiabatic process in an ideal gas, the relation between P and V is given by:
                  </p>
                  <div className="mt-1.5 grid grid-cols-2 gap-1 text-xs font-sans">
                    <span>(A) PV = const</span>
                    <span>(B) P V<sup>γ</sup> = const</span>
                    <span>(C) P<sup>γ</sup>V = const</span>
                    <span>(D) P/V = const</span>
                  </div>
                </div>

                {/* Item 2 Handwritten: Physics Circuit */}
                <div
                  className={`rounded-md border p-2.5 transition-all ${
                    activeTab === "all" || activeTab === "circuit"
                      ? "border-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/30"
                      : "border-transparent opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-sans font-semibold text-indigo-700 dark:text-indigo-300 mb-1">
                    <span>Q2. [Electric Circuits - Diagram]</span>
                    <span className="rounded bg-indigo-100 dark:bg-indigo-900/50 px-1.5 py-0.2">Bound #2</span>
                  </div>
                  <p className="font-medium italic">
                    Q2. In the given circuit, switch S is closed at t=0. Find time constant τ:
                  </p>
                  {/* Handwritten-style Circuit Sketch */}
                  <div className="my-2 flex justify-center">
                    <svg viewBox="0 0 240 70" className="w-56 h-16 stroke-current fill-none stroke-[1.5]">
                      {/* Battery */}
                      <line x1="20" y1="20" x2="20" y2="50" />
                      <line x1="26" y1="28" x2="26" y2="42" />
                      <text x="15" y="15" className="text-[9px] font-sans fill-current stroke-none">V₀</text>
                      {/* Top wire */}
                      <path d="M 20 20 L 70 20" />
                      {/* Switch */}
                      <line x1="70" y1="20" x2="88" y2="10" />
                      <circle cx="70" cy="20" r="1.5" className="fill-current" />
                      <circle cx="92" cy="20" r="1.5" className="fill-current" />
                      <text x="75" y="8" className="text-[8px] font-sans fill-current stroke-none">S (t=0)</text>
                      {/* Resistor */}
                      <path d="M 92 20 L 110 20 L 114 14 L 122 26 L 130 14 L 138 26 L 142 20 L 160 20" />
                      <text x="120" y="10" className="text-[9px] font-sans fill-current stroke-none">R=10Ω</text>
                      {/* Capacitor */}
                      <line x1="160" y1="20" x2="185" y2="20" />
                      <line x1="185" y1="12" x2="185" y2="28" />
                      <line x1="191" y1="12" x2="191" y2="28" />
                      <line x1="191" y1="20" x2="215" y2="20" />
                      <text x="180" y="38" className="text-[9px] font-sans fill-current stroke-none">C=20μF</text>
                      {/* Bottom loop */}
                      <path d="M 215 20 L 215 50 L 26 50" />
                    </svg>
                  </div>
                </div>

                {/* Item 3 Handwritten: Chemistry */}
                <div
                  className={`rounded-md border p-2.5 transition-all ${
                    activeTab === "all" || activeTab === "chemistry"
                      ? "border-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/30"
                      : "border-transparent opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-sans font-semibold text-emerald-700 dark:text-emerald-300 mb-1">
                    <span>Q3. [Organic Chemistry - Structure]</span>
                    <span className="rounded bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-0.2">Bound #3</span>
                  </div>
                  <p className="font-medium italic">
                    Q3. Identify major product P when toluene undergoes nitration with conc. HNO₃/H₂SO₄:
                  </p>
                  <div className="my-1.5 flex items-center justify-center gap-3">
                    <svg viewBox="0 0 70 60" className="w-14 h-12 stroke-current fill-none stroke-[1.4]">
                      {/* Benzene ring with CH3 */}
                      <polygon points="35,18 52,28 52,48 35,58 18,48 18,28" />
                      <circle cx="35" cy="38" r="9" className="stroke-dashed stroke-[1]" />
                      <line x1="35" y1="18" x2="35" y2="6" />
                      <text x="32" y="5" className="text-[9px] font-sans fill-current stroke-none font-bold">CH₃</text>
                    </svg>
                    <span className="text-xs font-sans">+ HNO₃/H₂SO₄ → Major product P</span>
                  </div>
                </div>

                {/* Item 4 Handwritten: Math Integral */}
                <div
                  className={`rounded-md border p-2.5 transition-all ${
                    activeTab === "all" || activeTab === "math"
                      ? "border-purple-400 bg-purple-50/60 dark:bg-purple-950/30"
                      : "border-transparent opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-sans font-semibold text-purple-700 dark:text-purple-300 mb-1">
                    <span>Q4. [Calculus - Definite Integral]</span>
                    <span className="rounded bg-purple-100 dark:bg-purple-900/50 px-1.5 py-0.2">Bound #4</span>
                  </div>
                  <p className="font-medium italic">
                    Q4. Evaluate the definite integral: I = ∫ [0 to π/2] (sin x) / (sin x + cos x) dx
                  </p>
                  <div className="mt-1 text-xs font-sans italic text-purple-900 dark:text-purple-200">
                    Ans key written: π/4
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-muted/40 border-t border-border text-xs text-muted-foreground flex items-center justify-between">
              <span>Mixed question types &amp; spatial diagrams</span>
              <span className="text-primary font-medium flex items-center gap-1">
                Detected 4 Items <ArrowRight className="h-3 w-3" />
              </span>
            </div>
          </div>

          {/* Right Column: Structured Digital Assessment Items */}
          <div className="lg:col-span-7 space-y-4">
            {/* ITEM 1 CARD: MCQ */}
            {(activeTab === "all" || activeTab === "mcq") && (
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/40">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-100 dark:bg-blue-900/50 text-xs font-bold text-blue-700 dark:text-blue-300">
                      1
                    </span>
                    <span className="text-xs font-semibold text-foreground">
                      MCQ Single-Choice Item
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="rounded bg-muted px-2 py-0.5 text-muted-foreground font-mono">
                      QTI 3.0 · choiceInteraction
                    </span>
                    <span className="rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 font-medium">
                      Key: (B)
                    </span>
                  </div>
                </div>

                <div className="mt-3.5 text-xs">
                  <p className="font-medium text-foreground">
                    For an adiabatic process in an ideal gas, the thermodynamic relation between pressure <KatexSpan math="P" /> and volume <KatexSpan math="V" /> is given by:
                  </p>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {[
                      { key: "A", math: "PV = \\text{constant}" },
                      { key: "B", math: "PV^{\\gamma} = \\text{constant}", correct: true },
                      { key: "C", math: "P^{\\gamma}V = \\text{constant}" },
                      { key: "D", math: "\\frac{P}{V} = \\text{constant}" },
                    ].map((opt) => (
                      <div
                        key={opt.key}
                        className={`flex items-center gap-2 rounded-md border p-2 transition-colors ${
                          opt.correct
                            ? "border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/30 text-foreground font-medium"
                            : "border-border bg-background text-muted-foreground"
                        }`}
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            opt.correct
                              ? "bg-emerald-600 text-white"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {opt.key}
                        </span>
                        <KatexSpan math={opt.math} />
                        {opt.correct && (
                          <CheckCircle className="ml-auto h-3.5 w-3.5 text-emerald-600" />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground bg-muted/30 p-2 rounded border border-border/60">
                    <span className="font-semibold text-foreground">Taxonomy:</span> Physics / Thermodynamics · <span className="font-semibold text-foreground">Difficulty:</span> Medium · <span className="font-semibold text-foreground">Explanation:</span> In an adiabatic process (<KatexSpan math="dQ=0" />), the reversible path obeys <KatexSpan math="PV^{\gamma} = C" /> where <KatexSpan math="\gamma = C_p/C_v" />.
                  </div>
                </div>
              </div>
            )}

            {/* ITEM 2 CARD: PHYSICS / CIRCUIT */}
            {(activeTab === "all" || activeTab === "circuit") && (
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/40">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-indigo-100 dark:bg-indigo-900/50 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                      2
                    </span>
                    <span className="text-xs font-semibold text-foreground">
                      Physics Diagram Item (Circuit Schematic Bound to Stem)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="rounded bg-muted px-2 py-0.5 text-muted-foreground font-mono">
                      Diagram Bound · SVG Export
                    </span>
                    <span className="rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 font-medium">
                      Key: 0.20 ms
                    </span>
                  </div>
                </div>

                <div className="mt-3.5 text-xs">
                  <p className="font-medium text-foreground">
                    In the DC circuit shown below, the switch <KatexSpan math="S" /> is closed at <KatexSpan math="t = 0" />. Given <KatexSpan math="R = 10\,\Omega" /> and <KatexSpan math="C = 20\,\mu\text{F}" />, calculate the capacitive time constant <KatexSpan math="\tau" /> of the circuit.
                  </p>

                  {/* Clean Digital Vector Diagram */}
                  <div className="my-3 flex justify-center rounded-lg border border-border/80 bg-background/80 p-3">
                    <svg viewBox="0 0 320 80" className="w-72 h-18 text-foreground fill-none stroke-current stroke-[1.75]">
                      {/* Battery */}
                      <line x1="30" y1="20" x2="30" y2="60" />
                      <line x1="38" y1="30" x2="38" y2="50" className="stroke-[2.5]" />
                      <text x="24" y="15" className="text-[10px] font-sans fill-current stroke-none font-semibold">V₀</text>
                      {/* Wire to Switch */}
                      <line x1="30" y1="20" x2="80" y2="20" />
                      {/* Switch */}
                      <circle cx="80" cy="20" r="2.5" className="fill-current" />
                      <line x1="80" y1="20" x2="105" y2="8" />
                      <circle cx="110" cy="20" r="2.5" className="fill-current" />
                      <text x="86" y="6" className="text-[9px] font-sans fill-current stroke-none">S (t=0)</text>
                      {/* Wire to Resistor */}
                      <line x1="110" y1="20" x2="135" y2="20" />
                      {/* Resistor */}
                      <path d="M 135 20 L 140 12 L 150 28 L 160 12 L 170 28 L 180 12 L 185 20" />
                      <text x="145" y="8" className="text-[10px] font-sans fill-current stroke-none font-bold">R = 10 Ω</text>
                      {/* Wire to Capacitor */}
                      <line x1="185" y1="20" x2="225" y2="20" />
                      {/* Capacitor */}
                      <line x1="225" y1="10" x2="225" y2="30" className="stroke-[2.5]" />
                      <line x1="233" y1="10" x2="233" y2="30" className="stroke-[2.5]" />
                      <text x="215" y="44" className="text-[10px] font-sans fill-current stroke-none font-bold">C = 20 μF</text>
                      {/* Wire back to negative rail */}
                      <line x1="233" y1="20" x2="270" y2="20" />
                      <line x1="270" y1="20" x2="270" y2="60" />
                      <line x1="270" y1="60" x2="38" y2="60" />
                    </svg>
                  </div>

                  <div className="rounded bg-muted/40 p-2.5 text-xs text-muted-foreground border border-border/60">
                    <span className="font-semibold text-foreground">Solution:</span> Time constant <KatexSpan math="\tau = R \times C = 10\,\Omega \times 20 \times 10^{-6}\,\text{F} = 2.0 \times 10^{-4}\,\text{s} = 0.20\,\text{ms}" />.
                  </div>
                </div>
              </div>
            )}

            {/* ITEM 3 CARD: CHEMISTRY */}
            {(activeTab === "all" || activeTab === "chemistry") && (
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/40">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-100 dark:bg-emerald-950/60 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      3
                    </span>
                    <span className="text-xs font-semibold text-foreground">
                      Structured Chemistry Item (Reaction Scheme &amp; Skeletal Formula)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="rounded bg-muted px-2 py-0.5 text-muted-foreground font-mono">
                      Taxonomy: Organic Chemistry
                    </span>
                    <span className="rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 font-medium">
                      Major: 4-nitrotoluene (p-isomer)
                    </span>
                  </div>
                </div>

                <div className="mt-3.5 text-xs">
                  <p className="font-medium text-foreground">
                    Toluene undergoes electrophilic aromatic substitution when treated with concentrated <KatexSpan math="\text{HNO}_3" /> in the presence of <KatexSpan math="\text{H}_2\text{SO}_4" /> at 30°C. Identify the major regioisomer produced:
                  </p>
                  <div className="my-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {[
                      { name: "2-nitrotoluene (ortho)", pct: "40%" },
                      { name: "4-nitrotoluene (para)", pct: "58% (Major)", correct: true },
                      { name: "3-nitrotoluene (meta)", pct: "2%" },
                      { name: "2,4-dinitrotoluene", pct: "Trace" },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className={`rounded-md border p-2 text-center ${
                          item.correct
                            ? "border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/30 text-foreground font-semibold"
                            : "border-border bg-background text-muted-foreground"
                        }`}
                      >
                        <div>{item.name}</div>
                        <div className="text-xs opacity-75 mt-0.5">{item.pct}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ITEM 4 CARD: MATHEMATICS INTEGRAL */}
            {(activeTab === "all" || activeTab === "math") && (
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/40">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-purple-100 dark:bg-purple-900/50 text-xs font-bold text-purple-700 dark:text-purple-300">
                      4
                    </span>
                    <span className="text-xs font-semibold text-foreground">
                      Mathematics Item (Definite Integral &amp; LaTeX Formatting)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="rounded bg-muted px-2 py-0.5 text-muted-foreground font-mono">
                      MathML Ready · Numeric / Text-Entry
                    </span>
                    <span className="rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 font-medium">
                      Exact: π/4
                    </span>
                  </div>
                </div>

                <div className="mt-3.5 text-xs">
                  <p className="font-medium text-foreground">
                    Evaluate the definite integral by applying King&apos;s property of definite integrals:
                  </p>
                  <div className="my-3 flex items-center justify-center rounded-lg border border-border bg-muted/20 py-3 text-sm text-foreground">
                    <KatexSpan
                      display
                      math="I = \int_{0}^{\frac{\pi}{2}} \frac{\sin x}{\sin x + \cos x} \, dx = \frac{\pi}{4}"
                    />
                  </div>
                  <div className="rounded bg-muted/40 p-2 text-xs text-muted-foreground border border-border/60">
                    <span className="font-semibold text-foreground">Validation Evidence:</span> Validated against King&apos;s rule <KatexSpan math="\int_a^b f(x)\,dx = \int_a^b f(a+b-x)\,dx" />, yielding <KatexSpan math="2I = \int_0^{\pi/2} 1\,dx = \frac{\pi}{2} \implies I = \frac{\pi}{4}" />.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
