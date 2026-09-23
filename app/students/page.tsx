"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { useAppStore } from "@/lib/app-store";
import { api, ApiError, NetworkError, type ResultOut } from "@/lib/api";
import { ConfidencePill, StatusBadge } from "@/components/ui/Badges";
import { LoaderIcon, SearchIcon } from "@/components/icons";

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function StudentsPage() {
  const { examId } = useAppStore();
  const [results, setResults] = useState<ResultOut[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = () => {
    if (examId === null) return;
    setLoadError(null);
    api
      .listResults(examId)
      .then((res) => setResults(res.results))
      .catch((err) => {
        setLoadError(err instanceof ApiError || err instanceof NetworkError ? err.message : "Could not load students.");
      });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = results ?? [];
    if (!q) return list;
    return list.filter(
      (s) => s.roll_number.toLowerCase().includes(q) || (s.student_name ?? "").toLowerCase().includes(q)
    );
  }, [results, search]);

  return (
    <AppShell title="Students" subtitle={`${(results ?? []).length} students in this evaluation batch.`}>
      {loadError && (
        <div className="mb-4 rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
          {loadError}{" "}
          <button type="button" onClick={load} className="ml-1 font-medium underline">
            Retry
          </button>
        </div>
      )}

      {results === null && !loadError ? (
        <div className="flex justify-center py-20">
          <LoaderIcon size={24} className="animate-spin-slow text-primary" />
        </div>
      ) : (
        <>
          <div className="mb-5 relative max-w-xs">
            <SearchIcon
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or register no…"
              className="input pl-9"
            />
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s) => (
              <Link
                key={s.id}
                href={`/results/${encodeURIComponent(s.roll_number)}`}
                className="card flex items-center gap-3.5 p-4 transition-colors hover:bg-surface-hover"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-sm font-semibold text-white">
                  {s.student_name ? initials(s.student_name) : s.roll_number.slice(-2)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">{s.student_name ?? "Name not detected"}</p>
                  <p className="text-xs text-text-faint">Reg. No. {s.roll_number}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <StatusBadge status={s.flagged ? "Flagged" : "Finalized"} />
                  {s.confidence_score !== null && <ConfidencePill value={Math.round(s.confidence_score * 100)} />}
                </div>
              </Link>
            ))}
            {filtered.length === 0 && (
              <p className="col-span-full py-10 text-center text-sm text-text-faint">
                {results && results.length === 0 ? "No students uploaded yet." : `No students match "${search}".`}
              </p>
            )}
          </div>
        </>
      )}
    </AppShell>
  );
}
