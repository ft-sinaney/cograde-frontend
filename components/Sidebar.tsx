"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoWordmark } from "@/components/ui/Logo";
import { useAuth } from "@/lib/auth";
import {
  BarChartIcon,
  ClipboardListIcon,
  GraduationCapIcon,
  HistoryIcon,
  LogOutIcon,
  SettingsIcon,
  UploadIcon,
  UsersIcon,
} from "@/components/icons";

const NAV_ITEMS = [
  { href: "/exams", label: "Exams", icon: GraduationCapIcon },
  { href: "/upload-question", label: "Upload", icon: UploadIcon },
  { href: "/results", label: "Results", icon: BarChartIcon },
  { href: "/students", label: "Students", icon: UsersIcon },
  { href: "/analytics", label: "Analytics", icon: ClipboardListIcon },
  { href: "/audit-log", label: "Audit Log", icon: HistoryIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

function initials(email: string) {
  const local = email.split("@")[0] || "?";
  const parts = local.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}

export function Sidebar({
  className = "",
  onNavigate,
}: {
  className?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <aside
      className={`flex h-full w-64 shrink-0 flex-col border-r border-border-soft bg-bg-raised ${className}`}
    >
      <div className="flex items-center gap-2 px-5 py-5">
        <Link href="/exams" onClick={onNavigate}>
          <LogoWordmark size={26} />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onNavigate}
              className={active ? "nav-link-active" : "nav-link"}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {user && (
        <div className="border-t border-border-soft px-4 py-4">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-sm font-semibold text-white">
              {initials(user.email)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text">{user.email}</p>
              <p className="truncate text-xs capitalize text-text-faint">{user.role}</p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-faint transition-colors hover:bg-danger-soft hover:text-danger"
              aria-label="Log out"
              title="Log out"
            >
              <LogOutIcon size={16} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
