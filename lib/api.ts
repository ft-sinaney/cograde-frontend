/**
 * Night 6: typed client for the CoGrade backend (built Nights 2-5).
 *
 * Every request goes through `request()`, which attaches the JWT from
 * localStorage, throws a typed `ApiError` on any non-2xx response (parsing
 * the backend's `{detail}` / `{detail, errors}` shape from
 * app/main.py's exception handlers), and redirects to /login on a 401 so a
 * page never has to think about "what if my token expired" itself.
 */

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";

/** Mirrors app/core/config.py's MAX_UPLOAD_SIZE_MB on the backend, so the
 * frontend can reject an oversized file immediately instead of waiting on
 * a round trip just to get the same 413 back. */
export const MAX_UPLOAD_MB = 20;

const TOKEN_KEY = "cograde_token";

// ---------------------------------------------------------------------------
// Token storage
// ---------------------------------------------------------------------------

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // ignore (private mode / storage disabled)
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Error type + fetch plumbing
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  status: number;
  fieldErrors: { field: string; message: string }[];

  constructor(status: number, message: string, fieldErrors: { field: string; message: string }[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

/** Network-level failure (server unreachable, CORS, DNS, offline). Distinct
 * from ApiError so callers can show "check your connection" instead of a
 * server-provided message. */
export class NetworkError extends Error {
  constructor(message = "Could not reach the CoGrade server. Check your connection and try again.") {
    super(message);
    this.name = "NetworkError";
  }
}

let unauthorizedHandler: (() => void) | null = null;
/** Registered once from a top-level client component (see lib/auth.tsx) so
 * api.ts — a plain module, not a React component — can still react to an
 * expired/invalid token by sending the app back to /login. */
export function onUnauthorized(handler: () => void) {
  unauthorizedHandler = handler;
}

function parseErrorDetail(body: any): { message: string; fieldErrors: { field: string; message: string }[] } {
  if (!body) return { message: "Something went wrong.", fieldErrors: [] };
  // Night 5/6 validation_exception_handler shape: {detail, errors: [{loc, msg}, ...]}
  if (Array.isArray(body.errors)) {
    const fieldErrors = body.errors.map((e: any) => ({
      field: Array.isArray(e.loc) ? e.loc.slice(1).join(".") : "field",
      message: e.msg || "Invalid value",
    }));
    return { message: body.detail || "Validation error", fieldErrors };
  }
  if (typeof body.detail === "string") return { message: body.detail, fieldErrors: [] };
  return { message: "Something went wrong.", fieldErrors: [] };
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  isForm?: boolean;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Skip attaching the Authorization header (login/register only). */
  anonymous?: boolean;
}

function buildQuery(query?: RequestOptions["query"]): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, isForm, query, anonymous } = opts;
  const url = `${API_BASE}${path}${buildQuery(query)}`;

  const headers: Record<string, string> = {};
  if (!isForm && body !== undefined) headers["Content-Type"] = "application/json";
  if (!anonymous) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
  } catch {
    throw new NetworkError();
  }

  if (res.status === 401 && !anonymous) {
    clearToken();
    unauthorizedHandler?.();
    const parsed = parseErrorDetail(await safeJson(res));
    throw new ApiError(401, parsed.message || "Your session expired. Please sign in again.", []);
  }

  if (!res.ok) {
    const parsed = parseErrorDetail(await safeJson(res));
    throw new ApiError(res.status, parsed.message, parsed.fieldErrors);
  }

  if (res.status === 204) return undefined as T;
  return (await safeJson(res)) as T;
}

async function safeJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function requestBlob(path: string, query?: RequestOptions["query"]): Promise<Blob> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}${buildQuery(query)}`, { headers });
  } catch {
    throw new NetworkError();
  }
  if (res.status === 401) {
    clearToken();
    unauthorizedHandler?.();
    throw new ApiError(401, "Your session expired. Please sign in again.");
  }
  if (!res.ok) {
    const parsed = parseErrorDetail(await safeJson(res));
    throw new ApiError(res.status, parsed.message, parsed.fieldErrors);
  }
  return res.blob();
}

/** Retries a request up to `attempts` times with a short backoff — used for
 * the two file-upload calls, per the brief's "network error handling"
 * requirement. Only retries network-level failures, never a real 4xx/5xx
 * from the server (retrying a 422 "not a PDF" would just fail 3 times). */
async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!(err instanceof NetworkError)) throw err;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw lastErr;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Types (mirroring the backend's Pydantic response schemas)
// ---------------------------------------------------------------------------

export type UserRole = "teacher" | "admin";

export interface UserOut {
  id: number;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface ExamOut {
  id: number;
  teacher_id: number;
  subject: string;
  exam_name: string;
  exam_date: string;
  total_marks: number;
  status: string;
  created_at: string;
}

export interface ExamDetailOut extends ExamOut {
  question_count: number;
  answer_sheet_count: number;
  result_count: number;
  rubric: RubricOut | null;
  questions: QuestionOut[];
}

export interface QuestionOut {
  id: number;
  exam_id: number;
  question_text: string;
  marks: number;
  extracted_at: string;
}

export interface ExtractedQuestionOut {
  id: number;
  text: string;
  marks: number;
}

export interface QuestionExtractionResponse {
  exam_id: number;
  questions: ExtractedQuestionOut[];
  total_marks: number;
  extraction_confidence: number;
  pdf_pages: number;
  pdf_type: string;
  source_filename: string;
}

export interface RubricEntry {
  question_id: number;
  question: string;
  marks: number;
  concepts: string[];
  common_mistakes: string[];
  scoring: Record<string, string>;
}

export interface RubricOut {
  id: number;
  exam_id: number;
  content: { rubric: Record<string, RubricEntry>; total_marks: number; generated_by: string };
  approved_by_teacher: boolean;
  approved_at: string | null;
}

export interface RubricGenerateResponse {
  exam_id: number;
  rubric_id: number;
  rubric: Record<string, RubricEntry>;
  total_marks: number;
  approved_by_teacher: boolean;
}

export interface ExtractedStudentOut {
  roll_number: string | null;
  student_name: string | null;
  confidence: number;
  flagged: boolean;
  reason: string | null;
  answer_sheet_id: number | null;
  result_id: number | null;
}

export interface RollDetectionResponse {
  exam_id: number;
  persisted: boolean;
  extracted_students: ExtractedStudentOut[];
  auto_created_result_rows: number;
  flagged_count: number;
  success_rate: string;
}

export interface QuestionBreakdownEntry {
  q_no: number;
  question_id: number;
  marks: number;
  max_marks: number;
  confidence: number;
  feedback: string;
  covered_concepts: string[];
  missing_concepts: string[];
}

export interface ResultOut {
  id: number;
  exam_id: number;
  answer_sheet_id: number;
  roll_number: string;
  student_name: string | null;
  marks: number | null;
  total_marks: number;
  confidence_score: number | null;
  flagged: boolean;
  flag_reason: string | null;
  ai_feedback: string | null;
  teacher_override_marks: number | null;
  teacher_feedback: string | null;
  reviewed_at: string | null;
  status: string;
  question_breakdown: QuestionBreakdownEntry[] | null;
  final_marks?: number | null;
}

export interface ResultListResponse {
  exam_id: number;
  total: number;
  results: ResultOut[];
}

export interface BatchGradeResponse {
  exam_id: number;
  graded_count: number;
  flagged_count: number;
  skipped_count: number;
  results: ResultOut[];
}

export interface ScoreDistributionBucket {
  range: string;
  count: number;
}

export interface QuestionAnalysisOut {
  q_no: number;
  question_id: number;
  question: string;
  max_marks: number;
  graded_count: number;
  avg_marks: number | null;
  pass_rate: number | null;
  difficulty_index: number | null;
  common_mistakes: string[];
}

export interface GraderStatsOut {
  user_id: number;
  grader: string;
  override_count: number;
  avg_override_marks: number;
  deviation_from_panel_average: number | null;
  deviation_pct_of_total_marks: number | null;
}

export interface GradingConsistencyOut {
  graders: GraderStatsOut[];
  note: string | null;
}

export interface ExamAnalyticsOut {
  exam_id: number;
  exam_name: string;
  total_students: number;
  graded_count: number;
  pending_count: number;
  flagged_count: number;
  average_marks: number | null;
  median_marks: number | null;
  highest_marks: number | null;
  lowest_marks: number | null;
  pass_count: number;
  fail_count: number;
  pass_percentage: number | null;
  average_confidence: number | null;
  score_distribution: ScoreDistributionBucket[];
  question_analysis: QuestionAnalysisOut[];
  grading_consistency: GradingConsistencyOut;
}

export interface StudentComparisonOut {
  exam_id: number;
  roll_number: string;
  student_name: string | null;
  student_marks: number | null;
  total_marks: number;
  student_percentage: number | null;
  class_average_marks: number | null;
  class_average_percentage: number | null;
  difference_from_average: number | null;
  percentile: number | null;
  performance: "above_average" | "average" | "below_average" | null;
  graded_class_size: number;
  flagged: boolean;
  status: string;
}

export interface WeakestQuestionOut {
  q_no: number | null;
  question_id: number;
  marks: number;
  max_marks: number;
  confidence: number;
  feedback: string;
  missing_concepts: string[];
}

export interface FlaggedAnswerOut extends ResultOut {
  weakest_question: WeakestQuestionOut | null;
}

export interface FlaggedAnswersResponse {
  exam_id: number;
  flagged_count: number;
  total_results: number;
  flagged_answers: FlaggedAnswerOut[];
}

export interface ReviewSummaryOut {
  exam_id: number;
  total: number;
  flagged: number;
  overridden: number;
  reviewed: number;
  finalized: number;
  pending_review: number;
  flagged_percentage: number;
}

export interface FinalizeExamResponse {
  exam_id: number;
  status: string;
  finalized_count: number;
  message: string;
}

export interface AuditUserOut {
  id: number;
  email: string;
  role: string;
}

export interface AuditLogEntryOut {
  id: number;
  exam_id: number | null;
  action: string;
  user: AuditUserOut | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditLogListResponse {
  exam_id: number;
  total: number;
  entries: AuditLogEntryOut[];
}

export type Theme = "light" | "dark";

export interface SettingsOut {
  id: number;
  user_id: number;
  theme: Theme;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Endpoint functions
// ---------------------------------------------------------------------------

export const api = {
  // --- Auth --------------------------------------------------------------
  register: (email: string, password: string, role: UserRole = "teacher") =>
    request<{ message: string; user: UserOut }>("/api/auth/register", {
      method: "POST",
      body: { email, password, role },
      anonymous: true,
    }),
  login: (email: string, password: string) =>
    request<{ access_token: string; token_type: string }>("/api/auth/login", {
      method: "POST",
      body: { email, password },
      anonymous: true,
    }),
  me: () => request<UserOut>("/api/auth/me"),

  // --- Exams ---------------------------------------------------------------
  listExams: () => request<{ total: number; exams: ExamOut[] }>("/api/exams"),
  createExam: (payload: { subject: string; exam_name: string; exam_date: string; total_marks: number }) =>
    request<ExamOut>("/api/exams", { method: "POST", body: payload }),
  getExam: (examId: number) => request<ExamDetailOut>(`/api/exams/${examId}`),
  approveRubric: (examId: number) =>
    request<{ message: string; rubric: RubricOut }>(`/api/exams/${examId}/approve-rubric`, { method: "POST" }),

  // --- Extraction (Night 3) --------------------------------------------------
  extractQuestions: (examId: number, file: File, force = false) =>
    withRetry(() => {
      const form = new FormData();
      form.append("question_paper", file);
      return request<QuestionExtractionResponse>(`/api/exams/${examId}/extract-questions`, {
        method: "POST",
        body: form,
        isForm: true,
        query: force ? { force: true } : undefined,
      });
    }),
  uploadAnswerSheets: (examId: number, files: File[]) =>
    withRetry(() => {
      const form = new FormData();
      files.forEach((f) => form.append("files", f));
      return request<RollDetectionResponse>(`/api/exams/${examId}/upload-answer-sheets`, {
        method: "POST",
        body: form,
        isForm: true,
      });
    }),

  // --- Grading (Night 4) -------------------------------------------------
  generateRubric: (examId: number, force = false) =>
    request<RubricGenerateResponse>(`/api/exams/${examId}/generate-rubric`, {
      method: "POST",
      query: force ? { force: true } : undefined,
    }),
  updateRubric: (examId: number, rubric: Record<string, RubricEntry>) =>
    request<RubricOut>(`/api/exams/${examId}/rubric`, { method: "PUT", body: { rubric } }),
  batchGrade: (examId: number, force = false) =>
    request<BatchGradeResponse>(`/api/exams/${examId}/batch-grade`, {
      method: "POST",
      query: force ? { force: true } : undefined,
    }),

  // --- Results / analytics (Night 2 + 5) ----------------------------------
  listResults: (examId: number, opts?: { filter?: "all" | "flagged" | "overridden"; sort?: string }) =>
    request<ResultListResponse>(`/api/exams/${examId}/results`, { query: opts }),
  overrideResult: (resultId: number, payload: { teacher_override_marks: number; teacher_feedback?: string }) =>
    request<{ message: string; result: ResultOut }>(`/api/results/${resultId}/override`, {
      method: "PUT",
      body: payload,
    }),
  getAnalytics: (examId: number, passingPercentage?: number) =>
    request<ExamAnalyticsOut>(`/api/exams/${examId}/analytics`, {
      query: passingPercentage !== undefined ? { passing_percentage: passingPercentage } : undefined,
    }),
  getStudentComparison: (examId: number, rollNumber: string) =>
    request<StudentComparisonOut>(`/api/exams/${examId}/student/${encodeURIComponent(rollNumber)}/comparison`),
  getQuestionDifficulty: (examId: number, qNo: number) =>
    request<QuestionAnalysisOut>(`/api/exams/${examId}/question/${qNo}/difficulty`),
  exportResultsCSV: (examId: number) => requestBlob(`/api/exams/${examId}/results/export`),

  // --- Review panel (Night 5, Module 1) -----------------------------------
  getFlaggedAnswers: (examId: number, opts?: { max_confidence?: number; sort?: string }) =>
    request<FlaggedAnswersResponse>(`/api/exams/${examId}/flagged-answers`, { query: opts }),
  getReviewSummary: (examId: number) => request<ReviewSummaryOut>(`/api/exams/${examId}/review-summary`),
  finalizeExam: (examId: number) =>
    request<FinalizeExamResponse>(`/api/exams/${examId}/finalize`, { method: "POST" }),

  // --- Audit trail (Night 5, Module 3) ------------------------------------
  getAuditLog: (
    examId: number,
    opts?: { action?: string; user_id?: number; roll_no?: string; date_from?: string; date_to?: string }
  ) => request<AuditLogListResponse>(`/api/exams/${examId}/audit-log`, { query: opts }),
  exportAuditLogCSV: (examId: number, opts?: { action?: string; roll_no?: string }) =>
    requestBlob(`/api/exams/${examId}/audit-log/export`, opts),

  // --- Settings ------------------------------------------------------------
  getSettings: () => request<SettingsOut>("/api/settings"),
  updateSettings: (theme: Theme) => request<SettingsOut>("/api/settings", { method: "PUT", body: { theme } }),
};
