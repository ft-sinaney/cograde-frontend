"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { useAppStore } from "@/lib/app-store";
import { useToast } from "@/lib/toast";
import { api, ApiError, NetworkError, downloadBlob, type ResultOut, type ReviewSummaryOut } from "@/lib/api";
import { ConfidencePill, StatusBadge, YesNoBadge } from "@/components/ui/Badges";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  EyeIcon,
  FilterIcon,
  LoaderIcon,
  LockIcon,
  SearchIcon,
} from "@/components/icons";

type StatusFilter = "All" | "Flagged" | "Finalized";
type SortKey = "regNo" | "totalMarks" | "confidence";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 12;

function finalMarks(r: ResultOut): number | null {
  return r.teacher_override_marks ?? r.marks;
}

export default function ResultsPage() {
  const { examId } = useAppStore();
  const toast = useToast();

  const [results, setResults] = useState<ResultOut[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [examStatus, setExamStatus] = useState<string | null>(null);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummaryOut | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("regNo");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);

  const load = () => {
    if (examId === null) return;
    setLoadError(null);
    Promise.all([api.listResults(examId), api.getExam(examId), api.getReviewSummary(examId)])
      .then(([res, exam, summary]) => {
        setResults(res.results);
        setExamStatus(exam.status);
        setReviewSummary(summary);
      })
      .catch((err) => {
        setLoadError(err instanceof ApiError || err instanceof NetworkError ? err.message : "Could not load results.");
      });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  const filtered = useMemo(() => {
    let list = (results ?? []).slice();
    if (statusFilter === "Flagged") list = list.filter((r) => r.flagged);
    if (statusFilter === "Finalized") list = list.filter((r) => !r.flagged);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r) => r.roll_number.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "regNo") cmp = a.roll_number.localeCompare(b.roll_number);
      if (sortKey === "totalMarks") cmp = (finalMarks(a) ?? -1) - (finalMarks(b) ?? -1);
      if (sortKey === "confidence") cmp = (a.confidence_score ?? -1) - (b.confidence_score ?? -1);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [results, search, statusFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  };

  const handleExport = async () => {
    if (examId === null) return;
    setExporting(true);
    try {
      const blob = await api.exportResultsCSV(examId);
      downloadBlob(blob, `cograde-results-exam-${examId}.csv`);
    } catch (err) {
      toast.error(err instanceof ApiError || err instanceof NetworkError ? err.message : "Could not export results.");
    } finally {
      setExporting(false);
    }
  };

  const handleFinalize = async () => {
    if (examId === null) return;
    setFinalizing(true);
    try {
      const res = await api.finalizeExam(examId);
      toast.success(`Exam finalized — ${res.finalized_count} result(s) locked in.`);
      setExamStatus(res.status);
      api.getReviewSummary(examId).then(setReviewSummary).catch(() => {});
    } catch (err) {
      toast.error(err instanceof ApiError || err instanceof NetworkError ? err.message : "Could not finalize the exam.");
    } finally {
      setFinalizing(false);
    }
  };

  const isFinalized = examStatus === "finalized";
  // Mirrors the backend's own finalize precondition (app/api/review.py):
  // every result needs marks (AI or override), and every flagged result
  // needs to have actually been reviewed first. Gating the button on this
  // client-side avoids sending a finalize call that's guaranteed to 400.
  const hasUngraded = (results ?? []).some((r) => r.marks === null && r.teacher_override_marks === null);
  const pendingReview = reviewSummary?.pending_review ?? 0;
  const canFinalize = !hasUngraded && pendingReview === 0;
  const finalizeBlockedReason = hasUngraded
    ? "Every answer sheet needs marks (AI or teacher override) before this exam can be finalized."
    : pendingReview > 0
      ? `${pendingReview} flagged result${pendingReview === 1 ? "" : "s"} still need${pendingReview === 1 ? "s" : ""} review before this exam can be finalized.`
      : null;

  return (
    <AppShell
      title="Evaluation Results"
      subtitle="View, filter and manage all student evaluations."
      topbarRight={
        <>
          {isFinalized ? (
            <span className="badge-success">
              <LockIcon size={12} />
              Finalized
            </span>
          ) : (
            <button
              type="button"
              onClick={handleFinalize}
              disabled={finalizing || !results || results.length === 0 || !canFinalize}
              className="btn-secondary btn-sm"
              title={
                finalizeBlockedReason ??
                "Lock grades in for official records once every flagged answer has been reviewed"
              }
            >
              {finalizing ? <LoaderIcon size={14} className="animate-spin-slow" /> : <LockIcon size={14} />}
              Finalize
            </button>
          )}
          <button type="button" onClick={handleExport} disabled={exporting} className="btn-secondary btn-sm">
            {exporting ? <LoaderIcon size={14} className="animate-spin-slow" /> : <DownloadIcon size={14} />}
            Export
          </button>
        </>
      }
    >
      {loadError && (
        <div className="mb-4 rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
          {loadError}{" "}
          <button type="button" onClick={load} className="ml-1 font-medium underline">
            Retry
          </button>
        </div>
      )}

      {!isFinalized && finalizeBlockedReason && results && results.length > 0 && (
        <div className="mb-4 rounded-lg border border-warning/30 bg-warning-soft px-3.5 py-2.5 text-sm text-warning">
          {finalizeBlockedReason}
        </div>
      )}

      {reviewSummary && reviewSummary.total > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <SummaryTile label="Total" value={reviewSummary.total} />
          <SummaryTile label="Flagged" value={reviewSummary.flagged} tone="danger" />
          <SummaryTile label="Overridden" value={reviewSummary.overridden} />
          <SummaryTile label="Pending Review" value={reviewSummary.pending_review} tone={reviewSummary.pending_review > 0 ? "warning" : undefined} />
          <SummaryTile label="Finalized" value={reviewSummary.finalized} tone="success" />
        </div>
      )}

      {results === null && !loadError ? (
        <div className="flex justify-center py-20">
          <LoaderIcon size={24} className="animate-spin-slow text-primary" />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-border-soft p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <SearchIcon
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint"
              />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search register number…"
                className="input pl-9"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setFilterOpen((v) => !v)}
                  className="btn-secondary btn-sm"
                >
                  <FilterIcon size={14} />
                  {statusFilter}
                  <ChevronDownIcon size={14} />
                </button>
                {filterOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(false)} />
                    <div className="absolute right-0 z-20 mt-2 w-40 overflow-hidden rounded-lg border border-border bg-bg-raised shadow-raised">
                      {(["All", "Flagged", "Finalized"] as StatusFilter[]).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            setStatusFilter(opt);
                            setFilterOpen(false);
                            setPage(1);
                          }}
                          className={`block w-full px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-surface-hover ${
                            statusFilter === opt ? "font-semibold text-primary" : "text-text"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="table-shell">
              <thead>
                <tr>
                  <SortableTh label="Register No." active={sortKey === "regNo"} dir={sortDir} onClick={() => toggleSort("regNo")} />
                  <SortableTh
                    label="Total Marks"
                    active={sortKey === "totalMarks"}
                    dir={sortDir}
                    onClick={() => toggleSort("totalMarks")}
                  />
                  <SortableTh
                    label="AI Confidence"
                    active={sortKey === "confidence"}
                    dir={sortDir}
                    onClick={() => toggleSort("confidence")}
                  />
                  <th>Teacher Review</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((r) => {
                  const marks = finalMarks(r);
                  return (
                    <tr key={r.id}>
                      <td className="font-medium text-text">{r.roll_number}</td>
                      <td className="tabular-nums">
                        {marks !== null ? marks : "—"} / {r.total_marks}
                      </td>
                      <td>
                        {r.confidence_score !== null ? (
                          <ConfidencePill value={Math.round(r.confidence_score * 100)} />
                        ) : (
                          <span className="badge-neutral">Ungraded</span>
                        )}
                      </td>
                      <td>
                        <YesNoBadge value={r.flagged} />
                      </td>
                      <td>
                        <StatusBadge status={r.flagged ? "Flagged" : "Finalized"} />
                      </td>
                      <td className="text-right">
                        <Link href={`/results/${encodeURIComponent(r.roll_number)}`} className="btn-ghost btn-sm inline-flex">
                          <EyeIcon size={14} />
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {pageItems.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-text-faint">
                      {results && results.length === 0 ? "No answer sheets graded yet." : "No students match your filters."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col items-center justify-between gap-3 border-t border-border-soft px-4 py-3.5 sm:flex-row">
            <p className="text-xs text-text-faint">
              Showing{" "}
              <span className="font-medium text-text">
                {pageItems.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}
                –{Math.min(currentPage * PAGE_SIZE, filtered.length)}
              </span>{" "}
              of <span className="font-medium text-text">{filtered.length}</span> students
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-muted transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeftIcon size={15} />
              </button>
              <span className="px-2 text-xs font-medium text-text-muted">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-muted transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRightIcon size={15} />
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function SortableTh({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  return (
    <th>
      <button
        type="button"
        onClick={onClick}
        className={`flex items-center gap-1 transition-colors hover:text-text ${active ? "text-primary" : ""}`}
      >
        {label}
        <ChevronDownIcon
          size={12}
          className={`transition-transform ${active && dir === "desc" ? "rotate-180" : ""} ${
            active ? "opacity-100" : "opacity-30"
          }`}
        />
      </button>
    </th>
  );
}

function SummaryTile({ label, value, tone }: { label: string; value: number; tone?: "danger" | "warning" | "success" }) {
  const toneClass = tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : tone === "success" ? "text-success" : "text-text";
  return (
    <div className="kpi-card !p-4">
      <p className={`text-xl font-bold ${toneClass}`}>{value}</p>
      <p className="text-xs text-text-faint">{label}</p>
    </div>
  );
}
