"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { useAppStore } from "@/lib/app-store";
import { useToast } from "@/lib/toast";
import { api, ApiError, NetworkError, type QuestionBreakdownEntry, type ResultOut } from "@/lib/api";
import { ConfidencePill, StatusBadge } from "@/components/ui/Badges";
import { HandwritingSheet } from "@/components/ui/HandwritingSheet";
import type { HighlightSpan } from "@/lib/types";
import {
  AlertTriangleIcon,
  ChevronLeftIcon,
  CheckIcon,
  LoaderIcon,
  XIcon,
} from "@/components/icons";

type EvalStatus = "correct" | "partial" | "incomplete";

const TABS = ["Question-wise Analysis", "Full Answer Sheet", "AI Feedback", "Teacher Notes"] as const;
type Tab = (typeof TABS)[number];

const STATUS_META: Record<EvalStatus, { label: string; className: string; icon: typeof CheckIcon }> = {
  correct: { label: "Correct", className: "text-success", icon: CheckIcon },
  partial: { label: "Needs Review", className: "text-warning", icon: AlertTriangleIcon },
  incomplete: { label: "Incomplete", className: "text-danger", icon: XIcon },
};

function statusFor(marks: number, maxMarks: number): EvalStatus {
  const ratio = maxMarks > 0 ? marks / maxMarks : 0;
  if (ratio >= 0.8) return "correct";
  if (ratio >= 0.5) return "partial";
  return "incomplete";
}

function highlightsFor(q: QuestionBreakdownEntry): HighlightSpan[] {
  const spans: HighlightSpan[] = q.covered_concepts.map((c) => ({ text: c, kind: "correct" as const }));
  q.missing_concepts.forEach((c) => spans.push({ text: `Missing: ${c}`, kind: "missing" as const }));
  if (spans.length === 0) spans.push({ text: "No concept breakdown recorded for this answer.", kind: "unclear" });
  return spans;
}

export default function StudentDetailPage() {
  const params = useParams<{ id: string }>();
  const { examId } = useAppStore();
  const toast = useToast();

  const [results, setResults] = useState<ResultOut[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("Question-wise Analysis");
  const [selectedQ, setSelectedQ] = useState<number>(1);
  const [notes, setNotes] = useState("");
  const [overrideMarks, setOverrideMarks] = useState<number>(0);
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (examId === null) return;
    setLoadError(null);
    api
      .listResults(examId)
      .then((res) => setResults(res.results))
      .catch((err) => {
        setLoadError(err instanceof ApiError || err instanceof NetworkError ? err.message : "Could not load this result.");
      });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  const result = useMemo(() => results?.find((r) => r.roll_number === params.id) ?? null, [results, params.id]);
  const breakdown = result?.question_breakdown ?? [];

  useEffect(() => {
    if (!result) return;
    setNotes(result.teacher_feedback ?? "");
    setOverrideMarks(result.teacher_override_marks ?? result.marks ?? 0);
    if (breakdown.length && !breakdown.some((q) => q.q_no === selectedQ)) {
      const weakest = breakdown.slice().sort((a, b) => a.confidence - b.confidence)[0];
      setSelectedQ(weakest.q_no);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.id]);

  const selectedQuestion = breakdown.find((q) => q.q_no === selectedQ);

  const handleSaveOverride = async () => {
    if (!result) return;
    if (overrideMarks < 0 || overrideMarks > result.total_marks) {
      setOverrideError(`Enter a value between 0 and ${result.total_marks}.`);
      return;
    }
    setOverrideError(null);
    setSaving(true);
    try {
      const res = await api.overrideResult(result.id, {
        teacher_override_marks: overrideMarks,
        teacher_feedback: notes,
      });
      setResults((prev) => (prev ? prev.map((r) => (r.id === res.result.id ? res.result : r)) : prev));
      toast.success("Marks and feedback saved.");
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors.length) {
        setOverrideError(err.fieldErrors[0].message);
      } else {
        toast.error(err instanceof ApiError || err instanceof NetworkError ? err.message : "Could not save the override.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (results === null && !loadError) {
    return (
      <AppShell title="Student Detailed Evaluation">
        <div className="flex justify-center py-20">
          <LoaderIcon size={24} className="animate-spin-slow text-primary" />
        </div>
      </AppShell>
    );
  }

  if (loadError) {
    return (
      <AppShell title="Student Detailed Evaluation">
        <div className="rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
          {loadError}{" "}
          <button type="button" onClick={load} className="ml-1 font-medium underline">
            Retry
          </button>
        </div>
      </AppShell>
    );
  }

  if (!result) {
    notFound();
  }

  const marks = result.teacher_override_marks ?? result.marks;
  const confidencePct = result.confidence_score !== null ? Math.round(result.confidence_score * 100) : null;

  return (
    <AppShell title="Student Detailed Evaluation" subtitle={`Register No. ${result.roll_number}`}>
      <div className="mx-auto max-w-5xl">
        <Link
          href="/results"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-text"
        >
          <ChevronLeftIcon size={16} />
          Back to Results
        </Link>

        {/* Header card */}
        <div className="card mb-6 flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gradient text-base font-bold text-white">
              {result.roll_number.slice(-2)}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text">Register No. {result.roll_number}</h2>
              {result.student_name && <p className="text-xs text-text-faint">{result.student_name}</p>}
            </div>
            <StatusBadge status={result.flagged ? "Flagged" : "Finalized"} />
          </div>
          <div className="flex items-center gap-6 sm:gap-8">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-text-faint">Total Marks</p>
              <p className="text-xl font-bold text-text">
                {marks !== null ? marks : "—"}{" "}
                <span className="text-sm font-normal text-text-faint">/ {result.total_marks}</span>
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-text-faint">Confidence</p>
              <div className="mt-1">
                {confidencePct !== null ? <ConfidencePill value={confidencePct} /> : <span className="badge-neutral">Ungraded</span>}
              </div>
            </div>
          </div>
        </div>

        {result.flag_reason && (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning">
            <AlertTriangleIcon size={16} className="mt-0.5 shrink-0" />
            {result.flag_reason}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-border-soft bg-bg-sunken p-1 scrollbar-none">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                activeTab === tab ? "bg-bg-raised text-primary shadow-sm" : "text-text-muted hover:text-text"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {breakdown.length === 0 && activeTab !== "Teacher Notes" && (
          <div className="card p-6 text-sm text-text-muted">
            {result.marks === null
              ? "This sheet hasn't produced a question-by-question breakdown — it may be illegible and waiting on a manual review. Use Teacher Notes to enter marks by hand."
              : "No per-question breakdown was recorded for this answer sheet."}
          </div>
        )}

        {activeTab === "Question-wise Analysis" && breakdown.length > 0 && (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table-shell">
                <thead>
                  <tr>
                    <th className="w-16">Q. No.</th>
                    <th className="w-24">Max Marks</th>
                    <th className="w-32">Marks Awarded</th>
                    <th className="w-32">Confidence</th>
                    <th>AI Feedback</th>
                    <th className="w-14 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown.map((q) => {
                    const meta = STATUS_META[statusFor(q.marks, q.max_marks)];
                    const Icon = meta.icon;
                    return (
                      <tr key={q.q_no}>
                        <td className="font-semibold text-text-muted">{q.q_no}</td>
                        <td className="tabular-nums">{q.max_marks}</td>
                        <td className="tabular-nums font-medium text-text">{q.marks}</td>
                        <td>
                          <ConfidencePill value={q.confidence} />
                        </td>
                        <td className="text-text-muted">{q.feedback}</td>
                        <td className="text-center">
                          <Icon size={16} className={meta.className} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "Full Answer Sheet" && breakdown.length > 0 && (
          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <div className="card p-4">
              <div className="mb-3 flex flex-wrap gap-2">
                {breakdown.map((q) => (
                  <button
                    key={q.q_no}
                    type="button"
                    onClick={() => setSelectedQ(q.q_no)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                      selectedQ === q.q_no
                        ? "bg-brand-gradient text-white"
                        : "border border-border text-text-muted hover:bg-surface-hover"
                    }`}
                  >
                    Q{q.q_no}
                  </button>
                ))}
              </div>
              <div className="overflow-hidden rounded-lg border border-border-soft">
                <HandwritingSheet
                  seed={Number(result.roll_number.replace(/\D/g, "") || "0") + selectedQ}
                  highlights={selectedQuestion ? highlightsFor(selectedQuestion) : []}
                  height={340}
                />
              </div>
              <p className="mt-3 text-xs text-text-faint">
                This is a simulated rendering of the answer sheet — CoGrade doesn't yet capture the original scan's
                pixel layout, only the AI's concept-level read of it (below).
              </p>
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-text-muted">
                <LegendDot colorVar="--success" label="Covered concept" />
                <LegendDot colorVar="--danger" label="Missing concept" />
              </div>
            </div>

            {selectedQuestion && (
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-text">Q.{selectedQuestion.q_no} Evaluation</h3>
                <p className="mt-3 text-xs uppercase tracking-wide text-text-faint">Marks Awarded</p>
                <p className="text-2xl font-bold text-text">
                  {selectedQuestion.marks}
                  <span className="text-base font-normal text-text-faint"> / {selectedQuestion.max_marks}</span>
                </p>
                <p className="mt-4 text-xs uppercase tracking-wide text-text-faint">Confidence</p>
                <div className="mt-1">
                  <ConfidencePill value={selectedQuestion.confidence} />
                </div>
                <p className="mt-4 text-xs uppercase tracking-wide text-text-faint">AI Feedback</p>
                <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{selectedQuestion.feedback}</p>
                <p className="mt-4 text-xs uppercase tracking-wide text-text-faint">Concept Coverage</p>
                <ul className="mt-2 space-y-1.5">
                  {highlightsFor(selectedQuestion).map((h, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-text-muted">
                      <span
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor: `hsl(var(${h.kind === "correct" ? "--success" : h.kind === "missing" ? "--danger" : "--warning"}))`,
                        }}
                      />
                      {h.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {activeTab === "AI Feedback" && breakdown.length > 0 && (
          <div className="space-y-4">
            {breakdown.map((q) => {
              const meta = STATUS_META[statusFor(q.marks, q.max_marks)];
              return (
                <div key={q.q_no} className="card p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-text-faint">Question {q.q_no}</p>
                    </div>
                    <span className={`badge-neutral shrink-0 ${meta.className}`}>
                      {q.marks}/{q.max_marks}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-text-muted">{q.feedback}</p>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "Teacher Notes" && (
          <div className="card p-6">
            <label className="text-sm font-medium text-text">Override total marks</label>
            <input
              type="number"
              min={0}
              max={result.total_marks}
              value={overrideMarks}
              onChange={(e) => setOverrideMarks(Number(e.target.value) || 0)}
              className="input mt-2 max-w-[160px]"
            />
            {overrideError ? (
              <p className="mt-1 text-xs text-danger">{overrideError}</p>
            ) : (
              <p className="mt-1 text-xs text-text-faint">
                Out of {result.total_marks}. This becomes the student's final mark, overriding the AI's mark.
              </p>
            )}

            <label className="mt-5 block text-sm font-medium text-text">Notes for this evaluation</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              placeholder="Add notes about this student's evaluation — e.g. handwriting concerns, marks overridden, context for other reviewers…"
              className="input mt-2 resize-y"
            />
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button type="button" onClick={handleSaveOverride} disabled={saving} className="btn-primary btn-sm">
                {saving && <LoaderIcon size={13} className="animate-spin-slow" />}
                Save Marks & Notes
              </button>
              {result.reviewed_at && (
                <span className="text-xs text-text-faint">
                  Last reviewed {new Date(result.reviewed_at).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function LegendDot({ colorVar, label }: { colorVar: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: `hsl(var(${colorVar}))` }} />
      {label}
    </span>
  );
}
