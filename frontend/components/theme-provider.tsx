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
      className="icon-btn h-10 w-10"
      title={`Theme: ${theme} (${resolvedTheme}). Click to switch.`}
      aria-label={`Theme: ${theme}. Switch theme`}
    >
      {theme === "light" ? (
        <IconSun className="h-[18px] w-[18px]" aria-hidden="true" />
      ) : theme === "dark" ? (
        <IconMoon className="h-[18px] w-[18px]" aria-hidden="true" />
      ) : (
        <IconMonitor className="h-[18px] w-[18px]" aria-hidden="true" />
      )}
    </button>
  );
}
