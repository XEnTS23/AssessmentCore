import { useState } from "react";
import { Link } from "react-router";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  FileCheck2,
  FileCode2,
  FileText,
  GraduationCap,
  Layers,
  Sparkles,
  HelpCircle,
  Lightbulb,
  CheckCircle2,
  ShieldCheck,
  Atom,
  Target,
  ArrowUpRight,
} from "lucide-react";
import { Navbar } from "../../components/Navbar";
import { Footer } from "../../components/Footer";
import { ContactProjectForm } from "../../components/ContactProjectForm";

export function ContentDevelopmentPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const capabilities = [
    {
      title: "Learning & Instructional Content",
      desc: "Concept explainers, topic notes, worked examples, revision materials, practice sequences, and instructional content designed for the target learner level.",
      icon: <BookOpen className="h-5 w-5 text-primary" />,
    },
    {
      title: "Assessment Items & Question Banks",
      desc: "Single-choice MCQs, multiple-select items, short-answer and numerical-response questions, application-based problems, and specification-led assessments with clear keys and rationales.",
      icon: <CheckCircle2 className="h-5 w-5 text-primary" />,
    },
    {
      title: "STEM-Rich Content",
      desc: "Mathematics, Physics, Chemistry and school Science questions involving equations, graphs, diagrams, units, LaTeX/MathML, and step-by-step solutions when appropriate.",
      icon: <Atom className="h-5 w-5 text-primary" />,
    },
    {
      title: "Editorial & Authoring Support",
      desc: "Learning-objective tagging, difficulty and cognitive-level classification, question-quality checks, answer explanations, feedback, consistency review, and structured authoring handoff.",
      icon: <FileCheck2 className="h-5 w-5 text-primary" />,
    },
  ];

  const curriculumCards = [
    {
      region: "India",
      details:
        "CBSE; CISCE (ICSE / ISC); selected State Board syllabi. NCERT-aligned topic sequencing and board-specific exam patterns can be incorporated when the project brief requires them.",
      tag: "Classes 1–12",
    },
    {
      region: "United Kingdom",
      details:
        "England's National Curriculum and Key Stage objectives; GCSE and A-level content developed against the specified subject and awarding-body requirements. Other UK curricula are scoped separately.",
      tag: "KS1–KS5 / GCSE & A-Level",
    },
    {
      region: "United States",
      details:
        "Grade-specific and state-specific K–12 standards. Common Core Mathematics and NGSS Science frameworks can inform learning objectives, question design, and coverage where applicable.",
      tag: "Grades K–12",
    },
  ];

  const stages = [
    {
      title: "Foundation / Primary",
      desc: "Clear language, familiar contexts, concept recognition, and supported practice.",
    },
    {
      title: "Middle School",
      desc: "Multi-step reasoning, examples tied to everyday observations, and increasing independence.",
    },
    {
      title: "Secondary / Senior Secondary",
      desc: "Deeper subject knowledge, analytical questions, exam-style practice, and transparent worked solutions.",
    },
  ];

  const principles = [
    {
      title: "Make ideas tangible",
      desc: "examples grounded in familiar situations or authentic data.",
    },
    {
      title: "Build understanding progressively",
      desc: "scaffold from foundational knowledge to reasoning and application.",
    },
    {
      title: "Use purposeful variation",
      desc: "mix response formats and levels of cognitive demand.",
    },
    {
      title: "Target misconceptions",
      desc: "plausible distractors and feedback that explain why an answer works.",
    },
    {
      title: "Keep notation precise",
      desc: "consistent math, scientific units, diagrams, and answer specifications.",
    },
    {
      title: "Review before delivery",
      desc: "editorial and subject checks tailored to the agreed scope.",
    },
  ];

  const workflowSteps = [
    {
      step: "01",
      title: "Define the brief",
      desc: "agree subjects, grades, curriculum, outputs, voice and quality criteria.",
    },
    {
      step: "02",
      title: "Map learning objectives",
      desc: "establish scope, taxonomy, coverage and item blueprint.",
    },
    {
      step: "03",
      title: "Develop content",
      desc: "author questions, explanations and required learning assets.",
    },
    {
      step: "04",
      title: "Review & refine",
      desc: "check subject accuracy, pedagogy, language, answers and consistency; resolve flagged issues.",
    },
    {
      step: "05",
      title: "Deliver in your format",
      desc: "hand over agreed documents, spreadsheets or structured question-bank files, with applicable metadata and assets.",
    },
  ];

  const deliverables = [
    "Curriculum-mapped question banks",
    "Topic-level practice and revision material",
    "Answer keys, worked solutions and feedback",
    "Grade, objective and difficulty metadata",
    "STEM notation and media assets",
    "Agreed Word, spreadsheet or structured authoring outputs",
  ];

  const faqs = [
    {
      q: "Which Indian boards do you support?",
      a: "We can scope work for CBSE, CISCE (ICSE/ISC), and selected state-board syllabi. Share the class, subject, board and current syllabus so coverage can be confirmed before authoring.",
    },
    {
      q: "Can you develop for UK and US school curricula?",
      a: "Yes. Content is planned against the relevant UK curriculum or exam specification, or the applicable US state standards and subject frameworks, rather than using the same material for every market.",
    },
    {
      q: "Do you develop more than multiple-choice questions?",
      a: "Yes. Projects can include explanations, worked solutions, numerical and short-answer questions, applied problems, revision content, and structured question banks.",
    },
    {
      q: "Can you provide structured files for our platform?",
      a: "We can define output schemas and metadata as part of the brief. Platform-specific packaging or migration is separately scoped according to your LMS or authoring system.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <Navbar />

      {/* 1. Breadcrumb + Hero */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-12 sm:pt-16">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/services" className="hover:text-foreground transition-colors">
            Services
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium">Content Development</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          <div className="lg:col-span-7">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              <GraduationCap className="h-3.5 w-3.5" />
              SERVICE 01 / CONTENT DEVELOPMENT
            </div>

            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-5xl leading-[1.15]">
              Curriculum-Aligned Content That Makes Learning Meaningful.
            </h1>

            <p className="mt-5 text-base sm:text-lg leading-relaxed text-muted-foreground">
              We develop engaging, academically rigorous educational content for school learners across Indian, UK, and US curricula. From concept-based lessons and interactive practice questions to complete assessment banks, our work combines subject expertise, sound pedagogy, and structured digital authoring.
            </p>

            <p className="mt-3 text-xs sm:text-sm font-medium text-foreground">
              Built for EdTech teams, publishers, assessment platforms, and education providers.
            </p>

            {/* Factual Chips */}
            <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center rounded-md border border-border bg-card px-2.5 py-1 font-medium text-foreground">
                School Education
              </span>
              <span className="text-border">·</span>
              <span className="inline-flex items-center rounded-md border border-border bg-card px-2.5 py-1 font-medium text-foreground">
                India / UK / US
              </span>
              <span className="text-border">·</span>
              <span className="inline-flex items-center rounded-md border border-border bg-card px-2.5 py-1 font-medium text-foreground">
                STEM &amp; Assessment Content
              </span>
            </div>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="#contact"
                className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-6 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
              >
                Discuss Your Content Requirements
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
              <a
                href="#capabilities"
                className="inline-flex h-11 items-center gap-2 rounded-md border border-border bg-background px-6 text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                Explore Our Capabilities
              </a>
            </div>
          </div>

          {/* Right Hero Column: Illustration */}
          <div className="lg:col-span-5 flex justify-center">
            <img
              src="/watercolor-study-desk-illustration.png"
              alt="Curriculum-aligned K–12 educational content study desk illustration"
              className="w-full max-w-md lg:max-w-none h-auto object-contain rounded-xl"
              loading="eager"
            />
          </div>
        </div>
      </section>

      {/* 2. The Value Proposition */}
      <section className="border-t border-border bg-muted/20 px-6 py-20 transition-colors">
        <div className="mx-auto w-full max-w-6xl">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-wider text-primary">
              HOW WE APPROACH CONTENT
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Not just more questions. Better learning experiences.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Good educational content does more than check whether a learner remembers an answer. It introduces ideas at the right level, helps students practise reasoning, addresses common misconceptions, and provides feedback they can use. We develop content around defined learning outcomes, with attention to clarity, conceptual accuracy, age-appropriate language, and assessment quality.
            </p>
          </div>

          {/* Three modest benefit modules */}
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
              <div className="text-sm font-semibold text-foreground">Curriculum-aware</div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Questions and learning assets mapped to the specified grade, topic, and learning objectives.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
              <div className="text-sm font-semibold text-foreground">Designed for understanding</div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Conceptual prompts, real-world applications, worked steps, and useful feedback.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
              <div className="text-sm font-semibold text-foreground">Ready for digital delivery</div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Consistent structure, metadata, notation, and output formats shaped around the client's workflow.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Capabilities */}
      <section id="capabilities" className="scroll-mt-16 px-6 py-20 transition-colors">
        <div className="mx-auto w-full max-w-6xl">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-wider text-primary">
              WHAT WE DEVELOP
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              From first explanation to final assessment.
            </h2>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {capabilities.map((cap, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-border bg-card p-6 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    {cap.icon}
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">{cap.title}</h3>
                  <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">{cap.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            Interactive assessment types and platform-specific packaging can be scoped where supported by the target system.
          </p>
        </div>
      </section>

      {/* 4. Curriculum Coverage */}
      <section className="border-t border-border bg-muted/20 px-6 py-20 transition-colors">
        <div className="mx-auto w-full max-w-6xl">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-wider text-primary">
              CURRICULUM COVERAGE
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              One learning goal. Different curriculum expectations.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Effective content development starts with the actual syllabus or specification—not a generic question template. We tailor topic depth, language, assessment format, and learning objectives to the framework supplied for each project.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {curriculumCards.map((card, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-border bg-card p-6 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
                    <h3 className="text-base font-semibold text-foreground">{card.region}</h3>
                    <span className="text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                      {card.tag}
                    </span>
                  </div>
                  <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{card.details}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            Curriculum coverage and alignment criteria are agreed during scoping. References to curricula or standards do not imply affiliation or endorsement.
          </p>
        </div>
      </section>

      {/* 5. Age-Appropriate Design */}
      <section className="px-6 py-20 transition-colors">
        <div className="mx-auto w-full max-w-6xl">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-wider text-primary">
              LEARNER-CENTRED DEVELOPMENT
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Written for the learner—not just the syllabus.
            </h2>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {stages.map((stage, idx) => (
              <div key={idx} className="rounded-xl border border-border bg-card p-6 shadow-xs">
                <div className="text-xs font-semibold text-primary uppercase tracking-wide">
                  Stage 0{idx + 1}
                </div>
                <h3 className="mt-1 text-sm font-semibold text-foreground">{stage.title}</h3>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{stage.desc}</p>
              </div>
            ))}
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            Stage labels are indicative; exact class, year, and grade mapping is defined for each country and curriculum.
          </p>
        </div>
      </section>

      {/* 6. How We Make Content Engaging */}
      <section className="border-t border-border bg-muted/20 px-6 py-20 transition-colors">
        <div className="mx-auto w-full max-w-6xl">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-wider text-primary">
              CONTENT PRINCIPLES
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Engagement built into the question design.
            </h2>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {principles.map((principle, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 rounded-lg border border-border/80 bg-card p-4 shadow-2xs"
              >
                <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <span className="font-semibold text-foreground">{principle.title}</span> —{" "}
                  <span className="text-muted-foreground">{principle.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Illustrative Mini-Example */}
      <section className="px-6 py-20 transition-colors">
        <div className="mx-auto w-full max-w-6xl">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-wider text-primary">
              ILLUSTRATIVE ITEM
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              What thoughtful question design looks like.
            </h2>
          </div>

          {/* Question Preview Box */}
          <div className="mt-8 rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xs max-w-3xl">
            {/* Metadata Badges */}
            <div className="flex flex-wrap items-center gap-2 border-b border-border pb-4 text-xs font-mono text-muted-foreground">
              <span className="rounded bg-muted px-2 py-0.5 font-medium text-foreground">
                Grade 8 Science
              </span>
              <span>·</span>
              <span className="rounded bg-muted px-2 py-0.5 font-medium text-foreground">
                Force &amp; Pressure
              </span>
              <span>·</span>
              <span className="rounded bg-primary/10 px-2 py-0.5 font-medium text-primary">
                Concept Application
              </span>
            </div>

            {/* Stem */}
            <div className="mt-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Question Stem
              </div>
              <p className="mt-2 text-sm sm:text-base font-medium text-foreground leading-relaxed">
                Two identical drawing pins are pushed into a noticeboard with equal force. Why does the pointed end penetrate more easily than the flat end?
              </p>
            </div>

            {/* Expected Explanation */}
            <div className="mt-5 rounded-lg border border-border/80 bg-muted/40 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Expected Explanation:
              </div>
              <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Pressure = force / area. For the same force, the smaller contact area produces greater pressure.
              </p>
            </div>

            {/* Learning Objective & Metadata Grid */}
            <div className="mt-5 pt-4 border-t border-border grid gap-3 sm:grid-cols-2 text-xs">
              <div>
                <span className="font-semibold text-foreground">Learning Objective: </span>
                <span className="text-muted-foreground">Apply the relation between force, area, and pressure.</span>
              </div>
              <div>
                <span className="font-semibold text-foreground">Content Metadata: </span>
                <span className="text-muted-foreground">Grade / Topic / Objective / Question type / Difficulty / Answer / Explanation.</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/60 text-[11px] text-muted-foreground italic">
              Illustrative example created to demonstrate our content approach.
            </div>
          </div>
        </div>
      </section>

      {/* 8. Delivery Process */}
      <section className="border-t border-border bg-muted/20 px-6 py-20 transition-colors">
        <div className="mx-auto w-full max-w-6xl">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-wider text-primary">
              OUR WORKFLOW
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              A clear process, from brief to delivery.
            </h2>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {workflowSteps.map((wf, idx) => (
              <div key={idx} className="rounded-xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold text-primary font-mono">{wf.step}</div>
                  <h3 className="mt-2 text-xs font-semibold text-foreground">{wf.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{wf.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. Why Husimi — Evidence-Led Experience */}
      <section className="px-6 py-20 transition-colors">
        <div className="mx-auto w-full max-w-6xl">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-wider text-primary">
              WHY HUSIMI
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Educational thinking, paired with production-ready authoring.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Our approach is informed by hands-on STEM content development, assessment-item authoring, and the practical requirements of structured digital question banks. We account for how a question is taught, answered, reviewed, tagged, and ultimately delivered—not just how it reads in a document.
            </p>
          </div>

          {/* Three quiet capability lines */}
          <div className="mt-8 flex flex-wrap gap-3">
            <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-xs font-medium text-foreground shadow-2xs">
              <Check className="h-3.5 w-3.5 text-primary" />
              <span>STEM and mathematical notation</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-xs font-medium text-foreground shadow-2xs">
              <Check className="h-3.5 w-3.5 text-primary" />
              <span>Professional assessment-authoring workflows</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-xs font-medium text-foreground shadow-2xs">
              <Check className="h-3.5 w-3.5 text-primary" />
              <span>Consistent answer, feedback, and metadata structures</span>
            </div>
          </div>

          {/* Authoring workflow familiarity note */}
          <p className="mt-6 text-xs text-muted-foreground max-w-2xl leading-relaxed">
            Our workflows are informed by hands-on experience authoring structured digital assessments and familiarity with production standards including Delta AT workflows—ensuring content integrates cleanly into digital delivery pipelines without costly re-formatting.
          </p>
        </div>
      </section>

      {/* 10. Deliverables */}
      <section className="border-t border-border bg-muted/20 px-6 py-20 transition-colors">
        <div className="mx-auto w-full max-w-6xl">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Content your team can actually use.
            </h2>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {deliverables.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2.5 rounded-lg border border-border bg-card p-3.5 text-xs text-foreground shadow-2xs"
              >
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            QTI, JSON and LMS-ready delivery are available through our{" "}
            <Link
              to="/services#lms-migration"
              className="font-medium text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
            >
              LMS &amp; Assessment Migration
            </Link>{" "}
            service when specified and technically supported.
          </p>
        </div>
      </section>

      {/* 11. FAQ */}
      <section className="px-6 py-20 transition-colors">
        <div className="mx-auto w-full max-w-4xl">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-wider text-primary">
              COMMON QUESTIONS
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Frequently asked questions
            </h2>
          </div>

          <div className="mt-8 space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-border bg-card transition-colors"
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="flex w-full items-center justify-between p-5 text-left text-sm font-medium text-foreground hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-expanded={isOpen}
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 transition-transform duration-200 text-muted-foreground ${
                        isOpen ? "rotate-180 text-primary" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs leading-relaxed text-muted-foreground border-t border-border/50">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 12. Final CTA with Contact Form */}
      <section id="contact" className="border-t border-border bg-muted/20 px-6 py-20 transition-colors">
        <div className="mx-auto w-full max-w-6xl">
          <div className="mb-10 max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-wider text-primary">
              LET'S BUILD THE CONTENT YOU NEED
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Have a syllabus, content brief, or question bank to develop?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Tell us the subject, grades, curriculum, approximate content volume, preferred formats, and timeline. We'll review the scope and discuss a practical starting point.
            </p>

            {/* Small secondary internal links */}
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>Adjacent services:</span>
              <Link
                to="/services#digitization"
                className="font-medium text-primary hover:underline transition-colors"
              >
                Content Digitization
              </Link>
              <span>·</span>
              <Link
                to="/services#qa-remediation"
                className="font-medium text-primary hover:underline transition-colors"
              >
                Question Bank QA
              </Link>
            </div>
          </div>

          <ContactProjectForm embedded defaultProjectType="Content development" />
        </div>
      </section>

      <Footer />
    </div>
  );
}
