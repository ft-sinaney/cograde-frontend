export type EvalStatus = "correct" | "partial" | "incomplete";

export interface QuestionSpec {
  qNo: number;
  text: string;
  maxMarks: number;
  subParts?: string[];
}

export interface HighlightSpan {
  text: string;
  kind: "correct" | "missing" | "unclear";
}

export interface QuestionResult {
  qNo: number;
  question: string;
  maxMarks: number;
  marksAwarded: number;
  confidence: number;
  feedback: string;
  status: EvalStatus;
  highlights: HighlightSpan[];
}

export type ReviewStatus = "Flagged" | "Finalized";

export interface Student {
  id: string;
  regNo: string;
  name: string;
  totalMarks: number;
  maxMarks: number;
  confidence: number;
  teacherReview: boolean;
  status: ReviewStatus;
  submittedAt: string;
  questions: QuestionResult[];
  teacherNotes: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: "uploading" | "uploaded" | "error";
  kind: "pdf" | "image";
  /** Night 6: the real File blob, kept alongside the display metadata so it
   * can actually be sent to the backend (the original mock-only shape only
   * ever stored name/size). */
  file: File;
}
