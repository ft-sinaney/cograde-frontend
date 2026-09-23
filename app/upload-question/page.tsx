"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Dropzone } from "@/components/ui/Dropzone";
import { useAppStore } from "@/lib/app-store";
import { useToast } from "@/lib/toast";
import { api, ApiError, MAX_UPLOAD_MB, NetworkError } from "@/lib/api";
import type { QuestionSpec } from "@/lib/types";
import {
  CheckCircleIcon,
  ClipboardListIcon,
  FileTextIcon,
  LoaderIcon,
  TrashIcon,
  UploadIcon,
} from "@/components/icons";

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const FLOW_STEPS = [
  { icon: UploadIcon, label: "Upload Question Paper", active: true },
  { icon: ClipboardListIcon, label: "Extract & Review", active: false },
  { icon: FileTextIcon, label: "Upload Answer Sheets", active: false },
];

export default function UploadQuestionPage() {
  const router = useRouter();
  const toast = useToast();
  const { examId, questionFile, setQuestionFile, setQuestions, setRubric } = useAppStore();
  const [submitting, setSubmitting] = useState(false);

  const handleFiles = (files: File[]) => {
    const file = files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("The question paper must be a PDF file.");
      return;
    }
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      toast.error(`"${file.name}" is too large — the maximum file size is ${MAX_UPLOAD_MB}MB.`);
      return;
    }
    if (file.size === 0) {
      toast.error(`"${file.name}" appears to be empty or corrupted. Please choose a different file.`);
      return;
    }
    setQuestionFile(file);
  };

  const handleContinue = async () => {
    if (!questionFile || examId === null) return;
    setSubmitting(true);
    try {
      const extraction = await api.extractQuestions(examId, questionFile);
      const questions: QuestionSpec[] = extraction.questions.map((q, i) => ({
        qNo: i + 1,
        text: q.text,
        maxMarks: q.marks,
      }));
      setQuestions(questions);

      const rubricRes = await api.generateRubric(examId);
      setRubric(rubricRes.rubric);

      toast.success(`Extracted ${questions.length} question${questions.length === 1 ? "" : "s"} and generated a rubric.`);
      router.push("/extracted-questions");
    } catch (err) {
      if (err instanceof ApiError) {
        // Already extracted for this exam (e.g. navigated back here) --
        // that's not really an error, just continue to the next step and
        // let it hydrate from what's already on the server.
        if (err.status === 400 && /already been extracted/i.test(err.message)) {
          toast.info("Questions were already extracted for this exam — continuing.");
          router.push("/extracted-questions");
          return;
        }
        toast.error(err.message);
      } else if (err instanceof NetworkError) {
        toast.error(err.message);
      } else {
        toast.error("Could not extract questions. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell
      title="Upload Question Paper"
      subtitle="Upload the question paper and let AI extract and structure the questions."
    >
      <div className="mx-auto max-w-2xl">
        {/* Step indicator */}
        <div className="mb-8 flex items-center justify-between">
          {FLOW_STEPS.map((step, i) => (
            <div key={step.label} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-2 text-center">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold ${
                    step.active
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border-soft text-text-faint"
                  }`}
                >
                  {i + 1}
                </div>
                <span
                  className={`hidden text-xs font-medium sm:block ${
                    step.active ? "text-text" : "text-text-faint"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {i < FLOW_STEPS.length - 1 && (
                <div className="mx-2 h-px flex-1 bg-border-soft" />
              )}
            </div>
          ))}
        </div>

        <div className="card p-6 sm:p-8">
          <Dropzone
            multiple={false}
            accept=".pdf"
            onFiles={handleFiles}
            title="Drag & drop your question paper here"
            hint={`PDF only (Max ${MAX_UPLOAD_MB}MB)`}
          />

          {questionFile && (
            <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-border-soft bg-bg-sunken px-4 py-3.5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <FileTextIcon size={18} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text">
                    {questionFile.name}
                  </p>
                  <p className="text-xs text-text-faint">
                    {formatBytes(questionFile.size)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="badge-success shrink-0">
                  <CheckCircleIcon size={12} />
                  Ready
                </span>
                <button
                  type="button"
                  onClick={() => setQuestionFile(null)}
                  disabled={submitting}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-text-faint transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-40"
                  aria-label="Remove file"
                >
                  <TrashIcon size={15} />
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              disabled={!questionFile || submitting}
              onClick={handleContinue}
              className="btn-primary"
            >
              {submitting && <LoaderIcon size={14} className="animate-spin-slow" />}
              {submitting ? "Extracting…" : "Continue"}
            </button>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-text-faint">
          CoGrade will read your question paper and automatically detect each
          question and its allotted marks — you can review and edit them on
          the next step.
        </p>
      </div>
    </AppShell>
  );
}
