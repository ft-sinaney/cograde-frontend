"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAppStore } from "@/lib/app-store";
import { useToast } from "@/lib/toast";
import { api, ApiError, NetworkError, downloadBlob, type ExamAnalyticsOut } from "@/lib/api";
import { BarChart } from "@/components/ui/BarChart";
import { DonutChart } from "@/components/ui/DonutChart";
import {
  BarChartIcon,
  CheckCircleIcon,
  ClipboardListIcon,
  DownloadIcon,
  LoaderIcon,
  ShieldIcon,
  UsersIcon,
} from "@/components/icons";

export default function AnalyticsPage() {
  const { examId } = useAppStore();
  const toast = useToast();
  const [analytics, setAnalytics] = useState<ExamAnalyticsOut | null>(null);
  const [examTotalMarks, setExamTotalMarks] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = () => {
    if (examId === null) return;
    setLoadError(null);
    Promise.all([api.getAnalytics(examId), api.getExam(examId)])
      .then(([a, exam]) => {
        setAnalytics(a);
        setExamTotalMarks(exam.total_marks);
      })
      .catch((err) => {
        // Graceful degradation per the brief: if analytics fail to load,
        // that's surfaced here without blocking the rest of the app.
        setLoadError(err instanceof ApiError || err instanceof NetworkError ? err.message : "Could not load analytics.");
      });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  const handleExport = async () => {
    if (examId === null) return;
    setExporting(true);
    try {
      const blob = await api.exportResultsCSV(examId);
      downloadBlob(blob, `cograde-results-exam-${examId}.csv`);
    } catch (err) {
      toast.error(err instanceof ApiError || err instanceof NetworkError ? err.message : "Could not export the report.");
    } finally {
      setExporting(false);
    }
  };

  if (loadError) {
    return (
      <AppShell title="Analytics & Reports" subtitle="Insights to help improve learning outcomes.">
        <div className="rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
          Analytics are temporarily unavailable — {loadError}{" "}
          <button type="button" onClick={load} className="ml-1 font-medium underline">
            Retry
          </button>
        </div>
      </AppShell>
    );
  }

  if (!analytics) {
    return (
      <AppShell title="Analytics & Reports" subtitle="Insights to help improve learning outcomes.">
        <div className="flex justify-center py-20">
          <LoaderIcon size={24} className="animate-spin-slow text-primary" />
        </div>
      </AppShell>
    );
  }

  const finalizedCount = analytics.graded_count - analytics.flagged_count;
  const avgPct =
    analytics.average_marks !== null && examTotalMarks ? Math.round((analytics.average_marks / examTotalMarks) * 100) : null;
  const KPIS = [
    { icon: ClipboardListIcon, label: "Answer Sheets", value: analytics.total_students.toString(), colorVar: "--primary" },
    {
      icon: BarChartIcon,
      label: "Average Score",
      value: avgPct !== null ? `${avgPct}%` : "—",
      colorVar: "--info",
    },
    { icon: CheckCircleIcon, label: "Flagged for Review", value: analytics.flagged_count.toString(), colorVar: "--danger" },
    {
      icon: ShieldIcon,
      label: "Avg. AI Confidence",
      value: analytics.average_confidence !== null ? `${Math.round(analytics.average_confidence * 100)}%` : "—",
      colorVar: "--success",
    },
  ];

  return (
    <AppShell
      title="Analytics & Reports"
      subtitle={analytics.exam_name}
      topbarRight={
        <button type="button" onClick={handleExport} disabled={exporting} className="btn-primary btn-sm">
          {exporting ? <LoaderIcon size={14} className="animate-spin-slow" /> : <DownloadIcon size={14} />}
          Export
        </button>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {KPIS.map((kpi) => (
            <div key={kpi.label} className="kpi-card">
              <div
                className="mb-1 flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: `hsl(var(${kpi.colorVar}) / 0.14)`, color: `hsl(var(${kpi.colorVar}))` }}
              >
                <kpi.icon size={18} />
              </div>
              <p className="text-2xl font-bold text-text sm:text-3xl">{kpi.value}</p>
              <p className="text-xs text-text-faint">{kpi.label}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
          <div className="card p-5 sm:p-6">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text">Score Distribution</h3>
              <span className="badge-neutral">marks range</span>
            </div>
            <p className="mb-6 text-xs text-text-faint">
              {analytics.average_marks !== null
                ? `Class average: ${analytics.average_marks}${examTotalMarks ? ` / ${examTotalMarks}` : ""} marks`
                : "No graded results yet."}
            </p>
            <BarChart data={analytics.score_distribution.map((b) => ({ label: b.range, value: b.count }))} barColorVar="--primary" />
          </div>

          <div className="card p-5 sm:p-6">
            <h3 className="mb-1 text-sm font-semibold text-text">Evaluation Status</h3>
            <p className="mb-6 text-xs text-text-faint">Finalized vs. needing teacher review</p>
            <DonutChart
              centerLabel={analytics.total_students > 0 ? `${Math.round((finalizedCount / analytics.total_students) * 100)}%` : "0%"}
              centerSublabel="Finalized"
              segments={[
                { label: "Finalized", value: Math.max(finalizedCount, 0), colorVar: "--success" },
                { label: "Needs Review", value: analytics.flagged_count, colorVar: "--danger" },
                { label: "Pending", value: analytics.pending_count, colorVar: "--warning" },
              ]}
            />
          </div>
        </div>

        <div className="card p-5 sm:p-6">
          <h3 className="mb-1 text-sm font-semibold text-text">Question Difficulty</h3>
          <p className="mb-4 text-xs text-text-faint">Higher difficulty means more students struggled with that question.</p>
          <div className="overflow-x-auto">
            <table className="table-shell">
              <thead>
                <tr>
                  <th className="w-16">Q. No.</th>
                  <th>Question</th>
                  <th className="w-28 text-right">Avg. Marks</th>
                  <th className="w-24 text-right">Pass Rate</th>
                  <th className="w-24 text-right">Difficulty</th>
                  <th>Common Gaps</th>
                </tr>
              </thead>
              <tbody>
                {analytics.question_analysis.map((q) => (
                  <tr key={q.q_no}>
                    <td className="font-semibold text-text-muted">{q.q_no}</td>
                    <td className="max-w-xs truncate text-text-muted">{q.question}</td>
                    <td className="text-right tabular-nums">{q.avg_marks !== null ? `${q.avg_marks}/${q.max_marks}` : "—"}</td>
                    <td className="text-right tabular-nums">{q.pass_rate !== null ? `${q.pass_rate}%` : "—"}</td>
                    <td className="text-right tabular-nums">{q.difficulty_index !== null ? q.difficulty_index : "—"}</td>
                    <td className="text-xs text-text-faint">{q.common_mistakes.slice(0, 2).join(", ") || "—"}</td>
                  </tr>
                ))}
                {analytics.question_analysis.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-text-faint">
                      No graded questions yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <UsersIcon size={16} className="text-text-faint" />
            <h3 className="text-sm font-semibold text-text">Grading Consistency</h3>
          </div>
          {analytics.grading_consistency.note ? (
            <p className="rounded-lg bg-bg-sunken px-3.5 py-3 text-sm text-text-muted">
              {analytics.grading_consistency.note}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-shell">
                <thead>
                  <tr>
                    <th>Grader</th>
                    <th className="text-right">Overrides</th>
                    <th className="text-right">Avg. Override Marks</th>
                    <th className="text-right">Deviation from Panel Avg.</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.grading_consistency.graders.map((g) => (
                    <tr key={g.user_id}>
                      <td className="text-text">{g.grader}</td>
                      <td className="text-right tabular-nums">{g.override_count}</td>
                      <td className="text-right tabular-nums">{g.avg_override_marks}</td>
                      <td className="text-right tabular-nums">
                        {g.deviation_from_panel_average !== null
                          ? `${g.deviation_from_panel_average > 0 ? "+" : ""}${g.deviation_from_panel_average} (${g.deviation_pct_of_total_marks}%)`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
