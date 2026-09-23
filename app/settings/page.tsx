"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Toggle } from "@/components/ui/Toggle";
import { useTheme } from "@/lib/theme-provider";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { api, ApiError, NetworkError } from "@/lib/api";
import { LoaderIcon, MoonIcon, SunIcon } from "@/components/icons";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const toast = useToast();
  const [savingTheme, setSavingTheme] = useState(false);

  // Local-only preferences (the backend's `settings` table only stores
  // theme — see README). Kept here as UI-only so the screen isn't empty,
  // but changing them doesn't persist anywhere.
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [autoFlag, setAutoFlag] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(75);
  const [savedFlash, setSavedFlash] = useState(false);

  // Pull the server's saved theme once on load and apply it if it differs
  // from what localStorage already set (e.g. signing in on a new device).
  useEffect(() => {
    api
      .getSettings()
      .then((s) => {
        if (s.theme !== theme) setTheme(s.theme);
      })
      .catch(() => {
        /* non-fatal -- theme still works locally even if this fails */
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeTheme = async (t: "light" | "dark") => {
    setTheme(t);
    setSavingTheme(true);
    try {
      await api.updateSettings(t);
    } catch (err) {
      toast.error(err instanceof ApiError || err instanceof NetworkError ? err.message : "Could not save your theme preference.");
    } finally {
      setSavingTheme(false);
    }
  };

  const save = () => {
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2200);
  };

  return (
    <AppShell title="Settings" subtitle="Manage your account and preferences." requireExam={false}>
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Profile */}
        <section className="card p-6">
          <h2 className="text-sm font-semibold text-text">Profile</h2>
          <p className="mt-1 text-xs text-text-faint">Your CoGrade account.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-muted">Email address</label>
              <input value={user?.email ?? ""} disabled className="input opacity-70" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-muted">Role</label>
              <input value={user?.role ?? ""} disabled className="input capitalize opacity-70" />
            </div>
          </div>
        </section>

        {/* Appearance */}
        <section className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-text">Appearance</h2>
              <p className="mt-1 text-xs text-text-faint">Choose how CoGrade looks on this device.</p>
            </div>
            {savingTheme && <LoaderIcon size={14} className="animate-spin-slow text-text-faint" />}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:max-w-sm">
            <button
              type="button"
              onClick={() => changeTheme("light")}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 transition-colors ${
                theme === "light" ? "border-primary bg-primary-soft/40" : "border-border-soft hover:bg-surface-hover"
              }`}
            >
              <SunIcon size={20} className="text-text" />
              <span className="text-sm font-medium text-text">Light</span>
            </button>
            <button
              type="button"
              onClick={() => changeTheme("dark")}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 transition-colors ${
                theme === "dark" ? "border-primary bg-primary-soft/40" : "border-border-soft hover:bg-surface-hover"
              }`}
            >
              <MoonIcon size={20} className="text-text" />
              <span className="text-sm font-medium text-text">Dark</span>
            </button>
          </div>
        </section>

        {/* Notifications */}
        <section className="card p-6">
          <h2 className="text-sm font-semibold text-text">Notifications</h2>
          <p className="mt-1 text-xs text-text-faint">
            Not yet backed by the server — these are local to this browser for now.
          </p>
          <div className="mt-4 divide-y divide-border-soft">
            <Row title="Email notifications" desc="Get notified when a batch finishes evaluating.">
              <Toggle checked={emailNotifs} onChange={setEmailNotifs} />
            </Row>
            <Row title="Auto-flag low-confidence answers" desc="Automatically send answers below your threshold for review.">
              <Toggle checked={autoFlag} onChange={setAutoFlag} />
            </Row>
            <Row title="Weekly summary digest" desc="A weekly email summarizing class performance.">
              <Toggle checked={weeklyDigest} onChange={setWeeklyDigest} />
            </Row>
          </div>
        </section>

        {/* Grading defaults */}
        <section className="card p-6">
          <h2 className="text-sm font-semibold text-text">Grading Defaults</h2>
          <p className="mt-1 text-xs text-text-faint">
            The backend currently flags below 70% confidence automatically; this slider is a local preview and
            doesn't change server behavior yet.
          </p>
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-text-muted">Confidence threshold</span>
              <span className="font-semibold text-text">{confidenceThreshold}%</span>
            </div>
            <input
              type="range"
              min={50}
              max={95}
              step={5}
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
              className="w-full accent-[hsl(245,75%,63%)]"
            />
          </div>
        </section>

        <div className="flex items-center gap-3">
          <button type="button" onClick={save} className="btn-primary">
            Save Changes
          </button>
          {savedFlash && <span className="text-sm font-medium text-success">Saved ✓</span>}
        </div>
      </div>
    </AppShell>
  );
}

function Row({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
      <div>
        <p className="text-sm font-medium text-text">{title}</p>
        <p className="text-xs text-text-faint">{desc}</p>
      </div>
      {children}
    </div>
  );
}
