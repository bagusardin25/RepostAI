"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { IconSun, IconMoon, IconMonitor } from "@frontend/components/icons";

type Theme = "system" | "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("repostai-theme") as Theme | null;
      if (stored && (stored === "light" || stored === "dark" || stored === "system")) {
        setThemeState(stored);
      }
    } catch {
      // ignore
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    function applyTheme() {
      const isDark =
        theme === "dark" || (theme === "system" && media.matches);
      const root = document.documentElement;

      if (isDark) {
        root.classList.add("dark");
        root.classList.remove("light");
        setResolvedTheme("dark");
      } else {
        root.classList.add("light");
        root.classList.remove("dark");
        setResolvedTheme("light");
      }
    }

    applyTheme();

    function onMediaChange() {
      if (theme === "system") {
        applyTheme();
      }
    }

    media.addEventListener("change", onMediaChange);
    return () => media.removeEventListener("change", onMediaChange);
  }, [theme]);

  function setTheme(next: Theme) {
    setThemeState(next);
    try {
      localStorage.setItem("repostai-theme", next);
    } catch {
      // ignore
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  function toggle() {
    if (theme === "system") {
      setTheme("light");
    } else if (theme === "light") {
      setTheme("dark");
    } else {
      setTheme("system");
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="glass-chip flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
      title={`Current: ${theme} (${resolvedTheme}). Click to switch theme.`}
      aria-label="Toggle Light / Dark / System theme"
    >
      {theme === "light" ? (
        <IconSun className="h-3.5 w-3.5 text-[var(--tally-fg)]" />
      ) : theme === "dark" ? (
        <IconMoon className="h-3.5 w-3.5 text-[var(--fg)]" />
      ) : (
        <IconMonitor className="h-3.5 w-3.5 text-[var(--fg-muted)]" />
      )}
      <span className="capitalize hidden sm:inline">{theme}</span>
    </button>
  );
}
