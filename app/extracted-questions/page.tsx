"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { useAppStore } from "@/lib/app-store";
import { useToast } from "@/lib/toast";
import { api, ApiError, NetworkError, type RubricEntry } from "@/lib/api";
import type { QuestionSpec } from "@/lib/types";
import { ArrowRightIcon, CheckIcon, EditIcon, LoaderIcon } from "@/components/icons";

export default function ExtractedQuestionsPage() {
  const router = useRouter();
  const toast = useToast();
  const { examId, questions, setQuestions, updateQuestionMarks, updateQuestionText, rubric, setRubric } =
    useAppStore();
  const [editing, setEditing] = useState(false);
  const [hydrating, setHydrating] = useState(questions.length === 0);
  const [saving, setSaving] = useState(false);
  const [examTotalMarks, setExamTotalMarks] = useState<number | null>(null);
  const [sumError, setSumError] = useState<string | null>(null);

  // If this page is opened without having just come from upload-question
  // (a page refresh, or clicking into an exam that already has questions),
  // hydrate everything from the server instead of showing an empty table.
  useEffect(() => {
    if (examId === null) return;
    if (questions.length > 0 && rubric) {
      setHydrating(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const exam = await api.getExam(examId);
        if (cancelled) return;
        setExamTotalMarks(exam.total_marks);
        if (questions.length === 0) {
          const qs: QuestionSpec[] = exam.questions
            .slice()
            .sort((a, b) => a.id - b.id)
            .map((q, i) => ({ qNo: i + 1, text: q.question_text, maxMarks: q.marks }));
          setQuestions(qs);
        }
        if (!rubric) {
          if (exam.rubric) {
            setRubric(exam.rubric.content.rubric);
          } else {
            const generated = await api.generateRubric(examId);
            setRubric(generated.rubric);
          }
        }
      } catch (err) {
        toast.error(err instanceof ApiError || err instanceof NetworkError ? err.message : "Could not load this exam's questions.");
      } finally {
        if (!cancelled) setHydrating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  // Also fetch total_marks even when questions/rubric were already in the
  // store (came straight from upload-question) so sum-validation works.
  useEffect(() => {
    if (examId === null || examTotalMarks !== null) return;
    api
      .getExam(examId)
      .then((exam) => setExamTotalMarks(exam.total_marks))
      .catch(() => {
        /* non-fatal -- validation just falls back to the extracted total */
      });
  }, [examId, examTotalMarks]);

  const total = questions.reduce((s, q) => s + q.maxMarks, 0);
  const expectedTotal = examTotalMarks ?? total;

  const handleContinue = async () => {
    if (examId === null || !rubric) return;
    if (total !== expectedTotal) {
      setSumError(
        `Question marks add up to ${total}, but this exam's total is ${expectedTotal}. Adjust the marks so they match before continuing.`
      );
      return;
    }
    setSumError(null);
    setSaving(true);
    try {
      const mergedRubric: Record<string, RubricEntry> = {};
      questions.forEach((q) => {
        const key = `q${q.qNo}`;
        const existing = rubric[key];
        mergedRubric[key] = existing
          ? { ...existing, marks: q.maxMarks, question: q.text }
          : { question_id: 0, question: q.text, marks: q.maxMarks, concepts: [], common_mistakes: [], scoring: {} };
      });

      await api.updateRubric(examId, mergedRubric);
      await api.approveRubric(examId);
      toast.success("Rubric approved. Ready for answer sheets.");
      router.push("/upload-answers");
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
      else if (err instanceof NetworkError) toast.error(err.message);
      else toast.error("Could not save the rubric. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell
      title="Extracted Questions & Rubric"
      subtitle="Review and edit the extracted questions, marks and AI-generated grading rubric."
      topbarRight={
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          disabled={hydrating}
          className={editing ? "btn-primary btn-sm" : "btn-secondary btn-sm"}
        >
          {editing ? <CheckIcon size={14} /> : <EditIcon size={14} />}
          {editing ? "Done Editing" : "Edit Manually"}
        </button>
      }
    >
      <div className="mx-auto max-w-4xl">
        {hydrating ? (
          <div className="flex justify-center py-20">
            <LoaderIcon size={24} className="animate-spin-slow text-primary" />
          </div>
        ) : (
          <>
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="table-shell">
                  <thead>
                    <tr>
                      <th className="w-16">Q. No.</th>
                      <th>Question</th>
                      <th className="w-40">Rubric Concepts</th>
                      <th className="w-32 text-right">Max Marks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {questions.map((q) => (
                      <tr key={q.qNo}>
                        <td className="font-semibold text-text-muted">{q.qNo}</td>
                        <td>
                          {editing ? (
                            <textarea
                              value={q.text}
                              onChange={(e) => updateQuestionText(q.qNo, e.target.value)}
                              className="input min-h-[44px] resize-y"
                              rows={2}
                            />
                          ) : (
                            q.text
                          )}
                        </td>
                        <td className="text-xs text-text-muted">
                          {(rubric?.[`q${q.qNo}`]?.concepts ?? []).slice(0, 3).join(" · ") || "—"}
                        </td>
                        <td className="text-right tabular-nums">
                          {editing ? (
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={q.maxMarks}
                              onChange={(e) => updateQuestionMarks(q.qNo, Number(e.target.value) || 0)}
                              className="input w-20 text-right tabular-nums"
                            />
                          ) : (
                            q.maxMarks
                          )}
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={3} className="text-right font-semibold text-text">
                        Total
                      </td>
                      <td
                        className={`text-right text-base font-bold tabular-nums ${
                          total !== expectedTotal ? "text-danger" : "text-text"
                        }`}
                      >
                        {total}
                        {examTotalMarks !== null && (
                          <span className="ml-1 text-xs font-normal text-text-faint">/ {expectedTotal}</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {sumError && (
              <p className="mt-3 rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
                {sumError}
              </p>
            )}

            <div className="mt-6 flex flex-col-reverse items-center justify-between gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => router.push("/upload-question")}
                className="btn-secondary"
              >
                Back
              </button>
              <button type="button" disabled={saving} onClick={handleContinue} className="btn-primary">
                {saving && <LoaderIcon size={14} className="animate-spin-slow" />}
                {saving ? "Approving…" : "Approve Rubric & Continue"}
                {!saving && <ArrowRightIcon size={16} />}
              </button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
