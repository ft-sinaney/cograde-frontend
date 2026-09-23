"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { LoaderIcon, XIcon } from "@/components/icons";
import { useAuth } from "@/lib/auth";
import { useAppStore } from "@/lib/app-store";

function FullPageSpinner() {
  return (
    <div className="flex h-dvh w-full items-center justify-center bg-bg">
      <LoaderIcon size={28} className="animate-spin-slow text-primary" />
    </div>
  );
}

export function AppShell({
  title,
  subtitle,
  topbarRight,
  children,
  /** Most in-app pages operate on a specific exam and need one selected
   * first (Night 6: every Night 2-5 endpoint is exam-scoped). Pages that
   * aren't exam-specific (Settings, the Exams picker itself) opt out. */
  requireExam = true,
}: {
  title: string;
  subtitle?: string;
  topbarRight?: React.ReactNode;
  children: React.ReactNode;
  requireExam?: boolean;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { examId, examHydrated } = useAppStore();

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!authLoading && user && requireExam && examHydrated && examId === null) {
      router.replace("/exams");
    }
  }, [authLoading, user, requireExam, examHydrated, examId, router]);

  // Auth still resolving, or we're about to redirect somewhere -- render a
  // blank loading state instead of a page that has nothing to fetch yet.
  if (authLoading || !user) return <FullPageSpinner />;
  if (requireExam && (!examHydrated || examId === null)) return <FullPageSpinner />;

  return (
    <div className="flex h-dvh min-h-dvh bg-bg">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 animate-fade-in">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
          <button
            className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-lg bg-surface text-text"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <XIcon size={18} />
          </button>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          title={title}
          subtitle={subtitle}
          onMenuClick={() => setMobileOpen(true)}
          right={topbarRight}
        />
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
