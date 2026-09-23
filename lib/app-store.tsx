"use client";

/**
 * Night 6: this used to hold hardcoded mock questions/files so every page
 * had something to render. It now holds the *real* client-side state for
 * the upload -> extract -> rubric -> grade flow: the exam currently being
 * worked on, the actual File blobs chosen (so they can be POSTed, not just
 * displayed), and the server data fetched along the way. Persisted data
 * (questions, results, analytics, ...) itself always comes fresh from the
 * API in each page -- this store is just the client-side staging area that
 * needs to survive navigating between the wizard's steps.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { BatchGradeResponse, RubricEntry } from "./api";
import type { QuestionSpec, UploadedFile } from "./types";

const CURRENT_EXAM_KEY = "cograde_current_exam_id";

interface AppStoreValue {
  // --- Which exam this whole flow is operating on ---
  examId: number | null;
  setExamId: (id: number | null) => void;
  /** False until the one-time localStorage read for examId has run --
   * lets a page tell "no exam selected yet" apart from "still checking". */
  examHydrated: boolean;

  // --- Step 1: question paper ---
  questionFile: File | null;
  setQuestionFile: (f: File | null) => void;

  // --- Step 2: extracted questions + generated rubric ---
  questions: QuestionSpec[];
  setQuestions: (qs: QuestionSpec[]) => void;
  updateQuestionMarks: (qNo: number, marks: number) => void;
  updateQuestionText: (qNo: number, text: string) => void;

  rubric: Record<string, RubricEntry> | null;
  setRubric: (r: Record<string, RubricEntry> | null) => void;

  // --- Step 3: answer sheets ---
  answerFiles: UploadedFile[];
  addAnswerFiles: (files: File[]) => void;
  removeAnswerFile: (id: string) => void;
  clearAnswerFiles: () => void;

  // --- Step 4: grading ---
  evaluationComplete: boolean;
  setEvaluationComplete: (v: boolean) => void;
  lastGradeSummary: BatchGradeResponse | null;
  setLastGradeSummary: (s: BatchGradeResponse | null) => void;

  /** Clears everything except examId -- called when starting a fresh
   * upload/grade cycle so a previous exam's leftover files/questions don't
   * bleed into the next one. */
  resetWorkflow: () => void;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

let fileIdCounter = 0;
const nextFileId = () => `f-${Date.now()}-${fileIdCounter++}`;

function fileKind(name: string): "pdf" | "image" {
  return name.toLowerCase().endsWith(".pdf") ? "pdf" : "image";
}

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [examId, setExamIdState] = useState<number | null>(null);
  const [examHydrated, setExamHydrated] = useState(false);
  const [questionFile, setQuestionFile] = useState<File | null>(null);
  const [questions, setQuestions] = useState<QuestionSpec[]>([]);
  const [rubric, setRubric] = useState<Record<string, RubricEntry> | null>(null);
  const [answerFiles, setAnswerFiles] = useState<UploadedFile[]>([]);
  const [evaluationComplete, setEvaluationComplete] = useState(false);
  const [lastGradeSummary, setLastGradeSummary] = useState<BatchGradeResponse | null>(null);

  // Hydrate the selected exam from localStorage after mount (avoids an
  // SSR/client hydration mismatch -- window isn't available during the
  // server render).
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CURRENT_EXAM_KEY);
      if (stored) setExamIdState(Number(stored));
    } catch {
      // ignore
    } finally {
      setExamHydrated(true);
    }
  }, []);

  const setExamId = useCallback((id: number | null) => {
    setExamIdState(id);
    try {
      if (id === null) localStorage.removeItem(CURRENT_EXAM_KEY);
      else localStorage.setItem(CURRENT_EXAM_KEY, String(id));
    } catch {
      // ignore
    }
  }, []);

  const updateQuestionMarks = useCallback((qNo: number, marks: number) => {
    setQuestions((prev) => prev.map((q) => (q.qNo === qNo ? { ...q, maxMarks: marks } : q)));
  }, []);

  const updateQuestionText = useCallback((qNo: number, text: string) => {
    setQuestions((prev) => prev.map((q) => (q.qNo === qNo ? { ...q, text } : q)));
  }, []);

  const addAnswerFiles = useCallback((files: File[]) => {
    setAnswerFiles((prev) => [
      ...prev,
      ...files.map(
        (f): UploadedFile => ({
          id: nextFileId(),
          name: f.name,
          size: f.size,
          progress: 100,
          status: "uploaded",
          kind: fileKind(f.name),
          file: f,
        })
      ),
    ]);
  }, []);

  const removeAnswerFile = useCallback((id: string) => {
    setAnswerFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const clearAnswerFiles = useCallback(() => setAnswerFiles([]), []);

  const resetWorkflow = useCallback(() => {
    setQuestionFile(null);
    setQuestions([]);
    setRubric(null);
    setAnswerFiles([]);
    setEvaluationComplete(false);
    setLastGradeSummary(null);
  }, []);

  const value = useMemo<AppStoreValue>(
    () => ({
      examId,
      setExamId,
      examHydrated,
      questionFile,
      setQuestionFile,
      questions,
      setQuestions,
      updateQuestionMarks,
      updateQuestionText,
      rubric,
      setRubric,
      answerFiles,
      addAnswerFiles,
      removeAnswerFile,
      clearAnswerFiles,
      evaluationComplete,
      setEvaluationComplete,
      lastGradeSummary,
      setLastGradeSummary,
      resetWorkflow,
    }),
    [
      examId,
      setExamId,
      examHydrated,
      questionFile,
      questions,
      updateQuestionMarks,
      updateQuestionText,
      rubric,
      answerFiles,
      addAnswerFiles,
      removeAnswerFile,
      clearAnswerFiles,
      evaluationComplete,
      lastGradeSummary,
      resetWorkflow,
    ]
  );

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore() {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error("useAppStore must be used within AppStoreProvider");
  return ctx;
}
