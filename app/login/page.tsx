"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogoWordmark } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { ApiError, NetworkError } from "@/lib/api";
import { LoaderIcon, LockIcon } from "@/components/icons";

type Mode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading, login, register } = useAuth();
  const toast = useToast();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"teacher" | "admin">("teacher");
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) router.replace("/exams");
  }, [authLoading, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, role);
        toast.success("Account created — you're signed in.");
      }
      router.push("/exams");
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
        if (err.fieldErrors.length) {
          const map: Record<string, string> = {};
          err.fieldErrors.forEach((fe) => (map[fe.field] = fe.message));
          setFieldErrors(map);
        }
      } else if (err instanceof NetworkError) {
        setFormError(err.message);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || user) {
    return (
      <div className="flex h-dvh items-center justify-center bg-bg">
        <LoaderIcon size={28} className="animate-spin-slow text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[420px] bg-radial-glow" />
      <header className="flex items-center justify-between px-4 py-5 sm:px-8">
        <Link href="/">
          <LogoWordmark size={24} />
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="card w-full max-w-sm p-6 sm:p-8">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <LockIcon size={20} />
            </div>
            <h1 className="text-lg font-semibold text-text">
              {mode === "login" ? "Sign in to CoGrade" : "Create your CoGrade account"}
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              {mode === "login"
                ? "Use your teacher or admin account to continue."
                : "Set up a new teacher account."}
            </p>
          </div>

          {formError && (
            <div className="mb-4 rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-muted">Email address</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@college.edu.in"
              />
              {fieldErrors.email && <p className="mt-1 text-xs text-danger">{fieldErrors.email}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-muted">Password</label>
              <input
                type="password"
                required
                minLength={mode === "register" ? 8 : undefined}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
              />
              {fieldErrors.password && <p className="mt-1 text-xs text-danger">{fieldErrors.password}</p>}
              {mode === "register" && (
                <p className="mt-1 text-xs text-text-faint">At least 8 characters.</p>
              )}
            </div>

            {mode === "register" && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-muted">Role</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["teacher", "admin"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`rounded-lg border-2 px-3 py-2 text-sm font-medium capitalize transition-colors ${
                        role === r
                          ? "border-primary bg-primary-soft/40 text-text"
                          : "border-border-soft text-text-muted hover:bg-surface-hover"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting && <LoaderIcon size={14} className="animate-spin-slow" />}
              {mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-text-faint">
            {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode((m) => (m === "login" ? "register" : "login"));
                setFormError(null);
                setFieldErrors({});
              }}
              className="font-medium text-primary hover:underline"
            >
              {mode === "login" ? "Create one" : "Sign in instead"}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
