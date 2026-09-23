"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoWordmark } from "@/components/ui/Logo";
import {
  ArrowRightIcon,
  BarChartIcon,
  CheckCircleIcon,
  ClipboardListIcon,
  PlayIcon,
  ShieldIcon,
  SparklesIcon,
  UploadIcon,
  UsersIcon,
  ZapIcon,
} from "@/components/icons";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it Works", href: "#how-it-works" },
  { label: "For Educators", href: "#for-educators" },
];

const STATS = [
  { value: "95%+", label: "Evaluation Accuracy" },
  { value: "70%", label: "Time Saved" },
  { value: "100%", label: "Teacher Control" },
];

const FEATURES = [
  {
    icon: SparklesIcon,
    title: "AI-Powered Evaluation",
    desc: "Answer sheets are read, matched against your rubric, and scored automatically — handwriting and diagrams included.",
  },
  {
    icon: ShieldIcon,
    title: "Teacher Stays in Control",
    desc: "Every AI-graded answer is transparent and editable. Low-confidence sheets are flagged for your review before anything is final.",
  },
  {
    icon: BarChartIcon,
    title: "Actionable Analytics",
    desc: "Score distributions, class averages, and per-question insight so you know exactly where students are struggling.",
  },
  {
    icon: ZapIcon,
    title: "Fast, Batch Processing",
    desc: "Upload an entire class set at once and get graded, explained results back in minutes, not hours.",
  },
];

const STEPS = [
  {
    icon: ClipboardListIcon,
    title: "Upload Question Paper",
    desc: "Drop in your question paper — CoGrade extracts each question and its mark allocation automatically.",
  },
  {
    icon: UploadIcon,
    title: "Upload Answer Sheets",
    desc: "Batch-upload scanned or photographed answer sheets. Register numbers are detected automatically.",
  },
  {
    icon: SparklesIcon,
    title: "AI Evaluates Each Answer",
    desc: "Every response is read, compared to the rubric, and scored with a confidence rating and written feedback.",
  },
  {
    icon: UsersIcon,
    title: "Review & Finalize",
    desc: "Skim AI-confident results, focus your time on flagged answers, then export final marks in one click.",
  },
];

function PreviewCard() {
  return (
    <div className="relative">
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-brand-gradient opacity-20 blur-3xl" />
      <div className="card relative w-full max-w-md overflow-hidden p-0 shadow-raised">
        <div className="flex items-center justify-between border-b border-border-soft px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
          </div>
          <span className="text-xs font-medium text-text-faint">
            Evaluation Results
          </span>
        </div>
        <div className="space-y-3 p-5">
          <div className="flex items-center justify-between rounded-lg border border-border-soft bg-bg-sunken px-3.5 py-2.5">
            <span className="text-xs text-text-muted">Analyzing answer sheets…</span>
            <span className="text-xs font-semibold text-primary">68%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-border-soft">
            <div className="h-full w-[68%] rounded-full bg-brand-gradient" />
          </div>
          {[
            { reg: "1001", marks: "92/100", tone: "success" },
            { reg: "1002", marks: "86/100", tone: "success" },
            { reg: "1003", marks: "78/100", tone: "warning" },
          ].map((row) => (
            <div
              key={row.reg}
              className="flex items-center justify-between rounded-lg px-3.5 py-2.5 transition-colors hover:bg-surface-hover"
            >
              <div className="flex items-center gap-2.5">
                <CheckCircleIcon
                  size={16}
                  className={
                    row.tone === "success" ? "text-success" : "text-warning"
                  }
                />
                <span className="text-sm text-text">Reg No. {row.reg}</span>
              </div>
              <span className="text-sm font-semibold text-text">
                {row.marks}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="card absolute -bottom-6 -left-8 hidden w-44 p-3.5 shadow-raised sm:block">
        <p className="text-[11px] font-medium text-text-faint">
          Processing Accuracy
        </p>
        <p className="mt-1 text-2xl font-bold text-gradient">95%</p>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-bg">
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[560px] bg-radial-glow" />

      <header className="sticky top-0 z-40 border-b border-border-soft bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <LogoWordmark size={26} />
          <nav className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-text-muted transition-colors hover:text-text"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle className="hidden sm:flex" />
            <Link href="/login" className="btn-ghost btn-sm hidden sm:inline-flex">
              Sign in
            </Link>
            <Link href="/login" className="btn-primary btn-sm">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-2 lg:px-8 lg:pt-20">
          <div className="animate-fade-in">
            <span className="badge-info mb-6">
              <SparklesIcon size={12} />
              AI EVALUATION ASSISTANT
            </span>
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-text sm:text-5xl lg:text-[3.25rem]">
              Smarter Evaluation
              <br />
              for a <span className="text-gradient">Brighter Future</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-text-muted sm:text-lg">
              AI-powered answer sheet evaluation with accuracy, transparency
              and teacher control. Automate grading, save time, and focus on
              what truly matters — teaching.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/login" className="btn-primary">
                Get Started
                <ArrowRightIcon size={16} />
              </Link>
              <button type="button" className="btn-secondary">
                <PlayIcon size={14} />
                Watch Demo
              </button>
            </div>
            <div className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-border-soft pt-8">
              {STATS.map((s) => (
                <div key={s.label}>
                  <p className="text-2xl font-bold text-text sm:text-3xl">
                    {s.value}
                  </p>
                  <p className="mt-1 text-xs leading-snug text-text-faint">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-center pt-6 lg:justify-end lg:pt-0">
            <PreviewCard />
          </div>
        </section>

        {/* Features */}
        <section
          id="features"
          className="border-t border-border-soft bg-bg-sunken/40 py-20"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-text">
                Everything you need to grade with confidence
              </h2>
              <p className="mt-3 text-text-muted">
                CoGrade handles the repetitive work of reading and scoring
                answers, while keeping every decision visible and editable.
              </p>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f) => (
                <div key={f.title} className="card p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <f.icon size={20} />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-text">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-muted">
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-text">
                From answers to insights
              </h2>
              <p className="mt-3 text-text-muted">
                Four simple steps take you from a stack of answer sheets to a
                finalized, exportable mark sheet.
              </p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, i) => (
                <div key={step.title} className="relative">
                  <div className="card h-full p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-gradient text-white">
                        <step.icon size={18} />
                      </div>
                      <span className="text-sm font-bold text-text-faint">
                        0{i + 1}
                      </span>
                    </div>
                    <h3 className="mt-4 text-sm font-semibold text-text">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-text-muted">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section id="for-educators" className="px-4 pb-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-brand-gradient px-8 py-14 text-center shadow-raised sm:px-16">
            <h2 className="text-3xl font-bold text-white">
              Ready to save 70% of your grading time?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-white/85">
              Join educators using CoGrade to evaluate answer sheets faster,
              fairer, and with full transparency.
            </p>
            <Link
              href="/login"
              className="btn mt-8 inline-flex bg-white text-primary hover:bg-white/90"
            >
              Get Started for Free
              <ArrowRightIcon size={16} />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border-soft py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
          <LogoWordmark size={22} />
          <p className="text-xs text-text-faint">
            © 2026 CoGrade. Students Grow, Educators Thrive, Education
            Evolves.
          </p>
        </div>
      </footer>
    </div>
  );
}
