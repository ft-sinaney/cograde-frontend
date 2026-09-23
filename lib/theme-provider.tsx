"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { api, getToken } from "./api";

export type Theme = "dark" | "light";

const STORAGE_KEY = "cograde-theme";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Inline script rendered in <head> so the correct data-theme attribute is
 * applied before first paint (prevents a light/dark flash on load).
 */
export function ThemeInitScript() {
  const code = `(function(){try{var k='${STORAGE_KEY}';var s=localStorage.getItem(k);var t=s==='light'||s==='dark'?s:'dark';document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;
  // eslint-disable-next-line react/no-danger
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    if (current === "light" || current === "dark") {
      setThemeState(current);
    }
  }, []);

  const applyTheme = useCallback((t: Theme) => {
    setThemeState(t);
    document.documentElement.setAttribute("data-theme", t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      // ignore write failures (private mode, etc.)
    }
    // Best-effort sync to the backend so *every* theme change -- not just
    // the one the Settings page's own buttons make -- is visible there.
    // Bug this fixes: the header's quick ThemeToggle only ever wrote to
    // localStorage, so the server-side preference went stale the moment
    // someone used it instead of the Settings page; the Settings page's
    // own mount effect (see app/settings/page.tsx) then pulled that stale
    // value back down and silently reverted the theme the next time the
    // user visited it. Only attempted when signed in -- ThemeToggle also
    // renders on the public landing page and /login, where an authenticated
    // PUT would 401 and (via api.ts's onUnauthorized handler) bounce the
    // visitor to /login just for switching themes. Swallowed on failure
    // either way (offline, private mode) -- the theme still works locally.
    if (getToken()) {
      api.updateSettings(t).catch(() => {});
    }
  }, []);

  const toggleTheme = useCallback(() => {
    applyTheme(theme === "dark" ? "light" : "dark");
  }, [theme, applyTheme]);

  return (
    <ThemeContext.Provider
      value={{ theme, toggleTheme, setTheme: applyTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
