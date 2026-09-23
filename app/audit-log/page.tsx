"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAppStore } from "@/lib/app-store";
import { useToast } from "@/lib/toast";
import { api, ApiError, NetworkError, downloadBlob, type AuditLogEntryOut } from "@/lib/api";
import { DownloadIcon, FilterIcon, HistoryIcon, LoaderIcon, SearchIcon, XIcon } from "@/components/icons";

/** Every action code the backend actually logs against an exam (see
 * app/core/audit.py's record_audit() call sites across the backend) --
 * user.register / user.login are excluded here since those are logged
 * with exam_id=None and never show up in an exam-scoped audit log. */
const ACTION_META: Record<string, { label: string; className: string }> = {
  "exam.create": { label: "Exam Created", className: "badge-info" },
  "exam.extract_questions": { label: "Questions Extracted", className: "badge-info" },
  "exam.upload_answer_sheets": { label: "Answer Sheets Uploaded", className: "badge-info" },
  "exam.generate_rubric": { label: "Rubric Generated", className: "badge-info" },
  "rubric.edit": { label: "Rubric Edited", className: "badge-warning" },
  "rubric.approve": { label: "Rubric Approved", className: "badge-success" },
  "exam.grade_answer": { label: "Answer Graded", className: "badge-neutral" },
  "exam.batch_grade": { label: "Batch Grading Run", className: "badge-neutral" },
  "result.override": { label: "Mark Overridden", className: "badge-warning" },
  "exam.export_results": { label: "Results Exported", className: "badge-neutral" },
  "exam.finalize": { label: "Exam Finalized", className: "badge-success" },
  "exam.export_audit_log": { label: "Audit Log Exported", className: "badge-neutral" },
};

function actionMeta(action: string) {
  return ACTION_META[action] ?? { label: action, className: "badge-neutral" };
}

/** details is a free-form JSONB blob whose shape varies per action -- this
 * renders it as a compact "key: value, key: value" line rather than raw
 * JSON, and skips a couple of noisy/internal-looking keys. */
function formatDetails(details: Record<string, unknown> | null): string {
  if (!details || Object.keys(details).length === 0) return "—";
  return Object.entries(details)
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
    .join(" · ");
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function AuditLogPage() {
  const { examId } = useAppStore();
  const toast = useToast();

  const [entries, setEntries] = useState<AuditLogEntryOut[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const [actionFilter, setActionFilter] = useState("");
  const [rollFilter, setRollFilter] = useState("");
  const [appliedRollFilter, setAppliedRollFilter] = useState("");

  const load = () => {
    if (examId === null) return;
    setLoadError(null);
    api
      .getAuditLog(examId, {
        action: actionFilter || undefined,
        roll_no: appliedRollFilter || undefined,
      })
      .then((res) => setEntries(res.entries))
      .catch((err) => {
        // Graceful degradation per the brief: an audit-log failure shouldn't
        // take down the rest of the app -- this is its own isolated page.
        setLoadError(err instanceof ApiError || err instanceof NetworkError ? err.message : "Could not load the audit log.");
      });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId, actionFilter, appliedRollFilter]);

  const handleRollSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedRollFilter(rollFilter.trim());
  };

  const clearFilters = () => {
    setActionFilter("");
    setRollFilter("");
    setAppliedRollFilter("");
  };

  const handleExport = async () => {
    if (examId === null) return;
    setExporting(true);
    try {
      const blob = await api.exportAuditLogCSV(examId, {
        action: actionFilter || undefined,
        roll_no: appliedRollFilter || undefined,
      });
      downloadBlob(blob, `cograde-audit-log-exam-${examId}.csv`);
    } catch (err) {
      toast.error(err instanceof ApiError || err instanceof NetworkError ? err.message : "Could not export the audit log.");
    } finally {
      setExporting(false);
    }
  };

  const hasFilters = Boolean(actionFilter || appliedRollFilter);

  return (
    <AppShell
      title="Audit Log"
      subtitle="A complete, timestamped record of every action taken on this exam."
      topbarRight={
        <button type="button" onClick={handleExport} disabled={exporting || entries === null} className="btn-primary btn-sm">
          {exporting ? <LoaderIcon size={14} className="animate-spin-slow" /> : <DownloadIcon size={14} />}
          Export CSV
        </button>
      }
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-56">
            <FilterIcon size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="input appearance-none pl-9"
            >
              <option value="">All actions</option>
              {Object.entries(ACTION_META).map(([code, meta]) => (
                <option key={code} value={code}>
                  {meta.label}
                </option>
              ))}
            </select>
          </div>

          <form onSubmit={handleRollSubmit} className="relative sm:w-56">
            <SearchIcon size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
            <input
              value={rollFilter}
              onChange={(e) => setRollFilter(e.target.value)}
              placeholder="Filter by register no…"
              className="input pl-9"
            />
          </form>

          {hasFilters && (
            <button type="button" onClick={clearFilters} className="btn-secondary btn-sm w-fit">
              <XIcon size={13} />
              Clear filters
            </button>
          )}
        </div>

        {entries && (
          <p className="text-xs text-text-faint">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </p>
        )}
      </div>

      {loadError && (
        <div className="mb-4 rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
          {loadError}{" "}
          <button type="button" onClick={load} className="ml-1 font-medium underline">
            Retry
          </button>
        </div>
      )}

      {entries === null && !loadError && (
        <div className="flex justify-center py-20">
          <LoaderIcon size={24} className="animate-spin-slow text-primary" />
        </div>
      )}

      {entries && entries.length === 0 && (
        <div className="card flex flex-col items-center gap-2 p-12 text-center">
          <HistoryIcon size={28} className="text-text-faint" />
          <p className="text-sm text-text-muted">
            {hasFilters ? "No audit entries match these filters." : "No actions have been logged for this exam yet."}
          </p>
        </div>
      )}

      {entries && entries.length > 0 && (
        <div className="overflow-x-auto">
          <table className="table-shell">
            <thead>
              <tr>
                <th className="w-44">Timestamp</th>
                <th className="w-52">Action</th>
                <th className="w-48">User</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const meta = actionMeta(entry.action);
                return (
                  <tr key={entry.id}>
                    <td className="whitespace-nowrap text-xs text-text-faint">{formatTimestamp(entry.created_at)}</td>
                    <td>
                      <span className={meta.className}>{meta.label}</span>
                    </td>
                    <td className="text-text-muted">
                      {entry.user ? (
                        <span>
                          {entry.user.email} <span className="text-text-faint">({entry.user.role})</span>
                        </span>
                      ) : (
                        <span className="text-text-faint">System</span>
                      )}
                    </td>
                    <td className="max-w-md truncate text-xs text-text-faint" title={formatDetails(entry.details)}>
                      {formatDetails(entry.details)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
