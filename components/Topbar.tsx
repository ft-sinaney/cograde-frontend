"use client";

import { ThemeToggle } from "@/components/ThemeToggle";
import { BellIcon, MenuIcon } from "@/components/icons";

export function Topbar({
  title,
  subtitle,
  onMenuClick,
  right,
}: {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <header className="glass-topbar flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-text-muted hover:bg-surface-hover lg:hidden"
          aria-label="Open menu"
        >
          <MenuIcon size={18} />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-text sm:text-xl">
            {title}
          </h1>
          {subtitle && (
            <p className="truncate text-xs text-text-muted sm:text-sm">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {right}
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
          aria-label="Notifications"
        >
          <BellIcon size={17} />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-danger" />
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
}
