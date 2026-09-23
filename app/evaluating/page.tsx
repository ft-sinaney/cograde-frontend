"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { useAppStore } from "@/lib/app-store";
import { api, ApiError, NetworkError } from "@/lib/api";
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  CheckIcon,
  LoaderIcon,
  PlayIcon,
} from "@/components/icons";

interface Step {
  label: string;
  threshold: number;
}

const STEPS: Step[] = [
  { label: "Extracting register numbers", threshold: 15 },
  { label: "Reading and understanding answers", threshold: 40 },
  { label: "Matching with rubric and evaluating", threshold: 70 },
  { label: "Generating explanations", threshold: 90 },
  { label: "Saving results to database", threshold: 100 },
];

type Phase = "running" | "done" | "error";

export default function EvaluatingPage() {
  const router = useRouter();
  const { examId, answerFiles, setEvaluationComplete, setLastGradeSummary } = useAppStore();
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<Phase>("running");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const startedForAttempt = useRef(-1);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Batch-grading here is one synchronous backend call (no job queue /
  // progress-polling endpoint exists on the backend), so this animates
  // toward ~92% while the request is in flight and only jumps to 100% once
  // the real response comes back -- the step checklist below is cosmetic
  // pacing, not literal per-stage backend progress.
  useEffect(() => {
    if (phase !== "running") return;
    const id = setTimeout(() => {
      setProgress((p) => (p >= 92 ? p : Math.min(92, p + Math.random() * 7 + 3)));
    }, 220);
    return () => clearTimeout(id);
  }, [progress, phase]);

  useEffect(() => {
    if (examId === null || startedForAttempt.current === attempt) return;
    startedForAttempt.current = attempt;
    (async () => {
      try {
        const res = await api.batchGrade(examId);
        setLastGradeSummary(res);
        setProgress(100);
        setPhase("done");
        setEvaluationComplete(true);
      } catch (err) {
        setPhase("error");
        if (err instanceof ApiError || err instanceof NetworkError) setErrorMsg(err.message);
        else setErrorMsg("Grading failed unexpectedly. Please try again.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId, attempt]);

  useEffect(() => {
    if (phase === "done") {
      redirectTimer.current = setTimeout(() => router.push("/results"), 1400);
    }
    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, [phase, router]);

  const retry = () => {
    setProgress(0);
    setErrorMsg(null);
    setPhase("running");
    setAttempt((a) => a + 1);
  };

  const fileCount = Math.max(answerFiles.length, 1);
  const isDone = phase === "done";
  const isError = phase === "error";

  return (
    <AppShell
      title="Evaluating Answer Sheets"
      subtitle="AI is analyzing the answer sheets. This may take a few minutes."
    >
      <div className="mx-auto max-w-lg">
        <div className="card flex flex-col items-center p-8 sm:p-10">
          {isError ? (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-danger-soft text-danger">
                <AlertTriangleIcon size={28} />
              </div>
              <p className="mt-4 text-center text-sm font-medium text-text">Grading failed</p>
              <p className="mt-1 text-center text-sm text-text-muted">{errorMsg}</p>
              <button type="button" onClick={retry} className="btn-primary mt-6">
                Try Again
              </button>
            </>
          ) : (
            <>
              <div className="relative">
                <ProgressRing
                  value={progress}
                  label={isDone ? " " : `${Math.round(progress)}%`}
                  sublabel={isDone ? undefined : "Processing…"}
                  size={180}
                  strokeWidth={13}
                />
                {isDone && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <CheckIcon size={40} className="text-success" />
                    <span className="mt-2 text-sm font-semibold text-success">
                      Complete
                    </span>
                  </div>
                )}
              </div>

              <p className="mt-2 text-sm text-text-muted">
                Evaluating {fileCount} answer sheet{fileCount === 1 ? "" : "s"}
              </p>

              <ul className="mt-8 w-full space-y-3.5">
                {STEPS.map((step) => {
                  const isActive =
                    !isDone &&
                    progress < step.threshold &&
                    (STEPS[STEPS.indexOf(step) - 1]
                      ? progress >= STEPS[STEPS.indexOf(step) - 1].threshold
                      : true);
                  const isDoneStep = progress >= step.threshold;
                  return (
                    <li key={step.label} className="flex items-center gap-3">
                      <div
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                          isDoneStep
                            ? "bg-success-soft text-success"
                            : isActive
                              ? "bg-primary-soft text-primary"
                              : "bg-bg-sunken text-text-faint"
                        }`}
                      >
                        {isDoneStep ? (
                          <CheckIcon size={13} />
                        ) : isActive ? (
                          <LoaderIcon size={13} className="animate-spin-slow" />
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        )}
                      </div>
                      <span
                        className={`text-sm ${
                          isDoneStep
                            ? "text-text"
                            : isActive
                              ? "font-medium text-text"
                              : "text-text-faint"
                        }`}
                      >
                        {step.label}
                      </span>
                    </li>
                  );
                })}
              </ul>

              {isDone && (
                <button
                  type="button"
                  onClick={() => router.push("/results")}
                  className="btn-primary mt-8 w-full"
                >
                  View Results
                  <ArrowRightIcon size={16} />
                </button>
              )}
            </>
          )}
        </div>

        {!isDone && !isError && (
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-text-faint">
            <PlayIcon size={12} />
            Please keep this tab open until grading finishes.
          </div>
        )}
      </div>
    </AppShell>
  );
}
