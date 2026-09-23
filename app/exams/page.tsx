"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { useAppStore } from "@/lib/app-store";
import { useToast } from "@/lib/toast";
import { api, ApiError, NetworkError, type ExamOut } from "@/lib/api";
import {
  CalendarIcon,
  ClipboardListIcon,
  GraduationCapIcon,
  LoaderIcon,
  PlusIcon,
} from "@/components/icons";

const STATUS_META: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "badge-neutral" },
  questions_extracted: { label: "Questions Extracted", className: "badge-info" },
  rubric_pending: { label: "Rubric Pending", className: "badge-warning" },
  rubric_approved: { label: "Rubric Approved", className: "badge-info" },
  grading_in_progress: { label: "Grading In Progress", className: "badge-warning" },
  completed: { label: "Completed", className: "badge-success" },
  finalized: { label: "Finalized", className: "badge-success" },
};

/** Where clicking into an exam should land, based on how far it's gotten. */
function nextRouteFor(status: string): string {
  switch (status) {
    case "draft":
      return "/upload-question";
    case "questions_extracted":
    case "rubric_pending":
      return "/extracted-questions";
    case "rubric_approved":
      return "/upload-answers";
    default:
      return "/results";
  }
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function ExamsPage() {
  const router = useRouter();
  const toast = useToast();
  const { setExamId, resetWorkflow } = useAppStore();

  const [exams, setExams] = useState<ExamOut[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);

  const [subject, setSubject] = useState("");
  const [examName, setExamName] = useState("");
  const [examDate, setExamDate] = useState(todayISO());
  const [totalMarks, setTotalMarks] = useState(50);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const load = () => {
    setLoadError(null);
    api
      .listExams()
      .then((res) => setExams(res.exams))
      .catch((err) => {
        setLoadError(err instanceof ApiError || err instanceof NetworkError ? err.message : "Could not load exams.");
      });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectExam = (exam: ExamOut) => {
    resetWorkflow();
    setExamId(exam.id);
    router.push(nextRouteFor(exam.status));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setCreating(true);
    try {
      const exam = await api.createExam({
        subject,
        exam_name: examName,
        exam_date: examDate,
        total_marks: totalMarks,
      });
      toast.success(`Exam "${exam.exam_name}" created.`);
      resetWorkflow();
      setExamId(exam.id);
      router.push("/upload-question");
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
        if (err.fieldErrors.length) {
          const map: Record<string, string> = {};
          err.fieldErrors.forEach((fe) => (map[fe.field] = fe.message));
          setFieldErrors(map);
        }
      } else if (err instanceof NetworkError) {
        setFormError(err.message);
      } else {
        setFormError("Could not create the exam. Please try again.");
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <AppShell
      title="Exams"
      subtitle="Pick an exam to continue, or start a new one."
      requireExam={false}
      topbarRight={
        <button type="button" onClick={() => setShowForm((v) => !v)} className="btn-primary btn-sm">
          <PlusIcon size={14} />
          New Exam
        </button>
      }
    >
      <div className="mx-auto max-w-4xl">
        {showForm && (
          <form onSubmit={handleCreate} className="card mb-6 p-6">
            <h2 className="text-sm font-semibold text-text">Create a new exam</h2>
            {formError && (
              <div className="mt-3 rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
                {formError}
              </div>
            )}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-muted">Subject</label>
                <input
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="input"
                  placeholder="Database Management Systems"
                />
                {fieldErrors.subject && <p className="mt-1 text-xs text-danger">{fieldErrors.subject}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-muted">Exam name</label>
                <input
                  required
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                  className="input"
                  placeholder="Semester 4 Mid-Term"
                />
                {fieldErrors.exam_name && <p className="mt-1 text-xs text-danger">{fieldErrors.exam_name}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-muted">Exam date</label>
                <input
                  required
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="input"
                />
                {fieldErrors.exam_date && <p className="mt-1 text-xs text-danger">{fieldErrors.exam_date}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-muted">Total marks</label>
                <input
                  required
                  type="number"
                  min={1}
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(Number(e.target.value) || 0)}
                  className="input"
                />
                {fieldErrors.total_marks && <p className="mt-1 text-xs text-danger">{fieldErrors.total_marks}</p>}
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary btn-sm">
                Cancel
              </button>
              <button type="submit" disabled={creating} className="btn-primary btn-sm">
                {creating && <LoaderIcon size={13} className="animate-spin-slow" />}
                Create & Continue
              </button>
            </div>
          </form>
        )}

        {loadError && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
            {loadError}{" "}
            <button type="button" onClick={load} className="ml-1 font-medium underline">
              Retry
            </button>
          </div>
        )}

        {exams === null && !loadError && (
          <div className="flex justify-center py-16">
            <LoaderIcon size={24} className="animate-spin-slow text-primary" />
          </div>
        )}

        {exams && exams.length === 0 && (
          <div className="card flex flex-col items-center gap-2 p-12 text-center">
            <GraduationCapIcon size={28} className="text-text-faint" />
            <p className="text-sm text-text-muted">No exams yet — create your first one to get started.</p>
          </div>
        )}

        {exams && exams.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {exams.map((exam) => {
              const meta = STATUS_META[exam.status] ?? { label: exam.status, className: "badge-neutral" };
              return (
                <button
                  key={exam.id}
                  type="button"
                  onClick={() => selectExam(exam)}
                  className="card flex flex-col gap-3 p-5 text-left transition-colors hover:bg-surface-hover"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text">{exam.exam_name}</p>
                      <p className="truncate text-xs text-text-faint">{exam.subject}</p>
                    </div>
                    <span className={meta.className}>{meta.label}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-text-muted">
                    <span className="flex items-center gap-1.5">
                      <CalendarIcon size={13} />
                      {exam.exam_date}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <ClipboardListIcon size={13} />
                      {exam.total_marks} marks
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
