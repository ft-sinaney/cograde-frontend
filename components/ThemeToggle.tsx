"use client";

import { useTheme } from "@/lib/theme-provider";
import { MoonIcon, SunIcon } from "@/components/icons";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      className={`relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-text-muted transition-colors hover:bg-surface-hover hover:text-text ${className}`}
    >
      {theme === "dark" ? <SunIcon size={17} /> : <MoonIcon size={17} />}
    </button>
  );
}
