"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Dropzone } from "@/components/ui/Dropzone";
import { useAppStore } from "@/lib/app-store";
import { useToast } from "@/lib/toast";
import { api, ApiError, MAX_UPLOAD_MB, NetworkError } from "@/lib/api";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  FileTextIcon,
  ImageIcon,
  LoaderIcon,
  TrashIcon,
} from "@/components/icons";

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const ALLOWED_EXT = [".pdf", ".jpg", ".jpeg", ".png"];

export default function UploadAnswersPage() {
  const router = useRouter();
  const toast = useToast();
  const { examId, answerFiles, addAnswerFiles, removeAnswerFile, setEvaluationComplete } = useAppStore();
  const [submitting, setSubmitting] = useState(false);

  const handleFiles = (files: File[]) => {
    const wrongFormat = files.filter((f) => !ALLOWED_EXT.some((ext) => f.name.toLowerCase().endsWith(ext)));
    const tooLarge = files.filter(
      (f) => ALLOWED_EXT.some((ext) => f.name.toLowerCase().endsWith(ext)) && f.size > MAX_UPLOAD_MB * 1024 * 1024
    );
    const empty = files.filter(
      (f) =>
        ALLOWED_EXT.some((ext) => f.name.toLowerCase().endsWith(ext)) &&
        f.size <= MAX_UPLOAD_MB * 1024 * 1024 &&
        f.size === 0
    );
    const valid = files.filter(
      (f) => ALLOWED_EXT.some((ext) => f.name.toLowerCase().endsWith(ext)) && f.size > 0 && f.size <= MAX_UPLOAD_MB * 1024 * 1024
    );

    if (wrongFormat.length > 0) {
      toast.error(
        `${wrongFormat.length} file${wrongFormat.length === 1 ? "" : "s"} skipped — only PDF, JPG and PNG are supported.`
      );
    }
    if (tooLarge.length > 0) {
      toast.error(
        `${tooLarge.length} file${tooLarge.length === 1 ? "" : "s"} skipped — over the ${MAX_UPLOAD_MB}MB limit.`
      );
    }
    if (empty.length > 0) {
      toast.error(
        `${empty.length} file${empty.length === 1 ? "" : "s"} skipped — appear${empty.length === 1 ? "s" : ""} empty or corrupted.`
      );
    }
    if (valid.length) addAnswerFiles(valid);
  };

  const startEvaluation = async () => {
    if (examId === null || answerFiles.length === 0) return;
    setSubmitting(true);
    try {
      const res = await api.uploadAnswerSheets(
        examId,
        answerFiles.map((f) => f.file)
      );
      toast.success(
        `${res.auto_created_result_rows} answer sheet${res.auto_created_result_rows === 1 ? "" : "s"} uploaded` +
          (res.flagged_count > 0 ? ` (${res.flagged_count} flagged for manual roll-number entry).` : ".")
      );
      setEvaluationComplete(false);
      router.push("/evaluating");
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
      else if (err instanceof NetworkError) toast.error(err.message);
      else toast.error("Could not upload answer sheets. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <AppShell
      title="Upload Answer Sheets"
      subtitle="Upload scanned answer sheets. Register numbers will be automatically detected."
    >
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="card p-6 sm:p-8">
          <Dropzone
            multiple
            accept=".pdf,.png,.jpg,.jpeg"
            onFiles={handleFiles}
            title="Drag & drop answer sheets here"
            hint={`Supports PDF, JPG, PNG · Max ${MAX_UPLOAD_MB}MB each · Multiple files allowed`}
          />
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              disabled={answerFiles.length === 0 || submitting}
              onClick={startEvaluation}
              className="btn-primary"
            >
              {submitting && <LoaderIcon size={14} className="animate-spin-slow" />}
              {submitting ? "Uploading…" : "Start Evaluation"}
              {!submitting && <ArrowRightIcon size={16} />}
            </button>
          </div>
        </div>

        <div className="card flex max-h-[560px] flex-col p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text">
              Uploaded Files
            </h2>
            <span className="badge-neutral">{answerFiles.length}</span>
          </div>
          {answerFiles.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
              <ImageIcon size={28} className="text-text-faint" />
              <p className="text-sm text-text-faint">
                No answer sheets uploaded yet.
              </p>
            </div>
          ) : (
            <ul className="flex-1 space-y-2.5 overflow-y-auto pr-1">
              {answerFiles.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border-soft bg-bg-sunken px-3.5 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                      {f.kind === "pdf" ? (
                        <FileTextIcon size={15} />
                      ) : (
                        <ImageIcon size={15} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text">
                        {f.name}
                      </p>
                      <p className="text-[11px] text-text-faint">
                        {formatBytes(f.size)}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <CheckCircleIcon size={16} className="text-success" />
                    <button
                      type="button"
                      onClick={() => removeAnswerFile(f.id)}
                      disabled={submitting}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-text-faint transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-40"
                      aria-label={`Remove ${f.name}`}
                    >
                      <TrashIcon size={13} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}
