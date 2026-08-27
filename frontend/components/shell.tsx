"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getHealth } from "@frontend/lib/api";
import { ToastProvider } from "@frontend/components/toast";
import { ThemeProvider, ThemeToggle } from "@frontend/components/theme-provider";
import { BrandMark } from "@frontend/components/brand-mark";
import {
  IconXMark,
  IconRefresh,
} from "@frontend/components/icons";

type Health = {
  cutter: boolean;
  mind: boolean;
  desk: boolean;
};

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ShellContent>{children}</ShellContent>
      </ToastProvider>
    </ThemeProvider>
  );
}

function ShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [health, setHealth] = useState<Health | null>(null);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const isLanding = pathname === "/" || pathname.startsWith("/landing");

  useEffect(() => {
    if (isLanding) return;
    getHealth()
      .then((data) =>
        setHealth({
          cutter: data.ffmpeg.available,
          mind: data.minds.configured && data.minds.ok,
          desk: data.db,
        }),
      )
      .catch(() => setHealth({ cutter: false, mind: false, desk: false }));
  }, [isLanding]);

  if (isLanding) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col text-[var(--fg)]">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--fg)] focus:text-[var(--bg)] focus:rounded-md text-xs font-semibold"
        href="#content"
      >
        Skip to content
      </a>

      <header className="site-header sticky top-0 z-40 w-full">
        <div className="site-wrap flex min-h-[var(--header-h)] items-center gap-2 sm:gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-6">
            <BrandMark href="/" current={false} />

            <nav aria-label="Primary" className="flex min-w-0 items-center gap-1 overflow-x-auto">
              <NavLink href="/" active={false}>
                Overview
              </NavLink>
              <NavLink href="/desk" active={pathname === "/desk"}>
                Desk
              </NavLink>
              <NavLink href="/voice" active={pathname.startsWith("/voice")}>
                <span className="sm:hidden">Voice</span>
                <span className="hidden sm:inline">Voice Memory</span>
              </NavLink>
              <NavLink href="/mind" active={pathname.startsWith("/mind")}>
                Mind
              </NavLink>
            </nav>
          </div>

          {/* Right Status & Theme Toggle */}
          <div className="flex shrink-0 items-center gap-2.5">
            <ThemeToggle />

            <button
              type="button"
              onClick={() => setShowHealthModal(true)}
              className="glass-chip hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md text-[11px] text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
            >
              <HealthDot ok={health?.cutter} label="Cutter" />
              <span className="text-[var(--fg-subtle)]">·</span>
              <HealthDot ok={health?.mind} label="Mind" />
              <span className="text-[var(--fg-subtle)]">·</span>
              <HealthDot ok={health?.desk} label="DB" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main id="content" className="site-wrap flex-1 py-8 sm:py-12">
        {children}
      </main>

      <footer className="border-t border-[var(--border)] py-8 mt-auto text-xs text-[var(--fg-muted)]">
        <div className="site-wrap flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[var(--fg)]">RepostAI</span>
            <span>—</span>
            <span>Creative Minds Jam #1</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span>TikTok / Reels / X</span>
            <span>·</span>
            <a
              href="https://hellominds.ai"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[var(--fg)] transition-colors"
            >
              Powered by Minds Agent
            </a>
          </div>
        </div>
      </footer>

      {/* Health Modal */}
      {showHealthModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowHealthModal(false)}
        >
          <div
            className="glass-strong relative w-full max-w-sm p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="font-semibold text-sm text-[var(--fg)]">System Engines</h3>
              <button
                type="button"
                onClick={() => setShowHealthModal(false)}
                className="text-[var(--fg-muted)] hover:text-[var(--fg)]"
                aria-label="Close"
              >
                <IconXMark className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 cell">
                <span className="text-[var(--fg)]">FFmpeg Video Cutter</span>
                <StatusBadge ok={health?.cutter} />
              </div>
              <div className="flex items-center justify-between p-2.5 cell">
                <span className="text-[var(--fg)]">Minds AI Agent</span>
                <StatusBadge ok={health?.mind} />
              </div>
              <div className="flex items-center justify-between p-2.5 cell">
                <span className="text-[var(--fg)]">SQLite Database</span>
                <StatusBadge ok={health?.desk} />
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center text-[11px] text-[var(--fg-muted)] border-t border-[var(--border)]">
              <span>Realtime telemetry</span>
              <button
                type="button"
                onClick={() => {
                  setHealth(null);
                  getHealth()
                    .then((data) =>
                      setHealth({
                        cutter: data.ffmpeg.available,
                        mind: data.minds.configured && data.minds.ok,
                        desk: data.db,
                      }),
                    )
                    .catch(() => setHealth({ cutter: false, mind: false, desk: false }));
                }}
                className="btn btn-ghost btn-xs"
              >
                <IconRefresh className="h-3 w-3" />
                <span>Check</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`chip ${active ? "is-active" : ""}`}
    >
      {children}
    </Link>
  );
}

function HealthDot({ ok, label }: { ok: boolean | undefined; label: string }) {
  const isOk = ok === true;
  const isErr = ok === false;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isOk ? "bg-[var(--ok)]" : isErr ? "bg-[var(--bad)]" : "bg-[var(--warn)]"
        }`}
        aria-hidden
      />
      <span>{label}</span>
    </span>
  );
}

function StatusBadge({ ok }: { ok: boolean | undefined }) {
  if (ok === undefined) {
    return <span className="timecode text-[10px] text-[var(--fg-muted)]">Checking…</span>;
  }
  if (ok) {
    return <span className="timecode text-[10px] text-ok font-medium">Online</span>;
  }
  return <span className="timecode text-[10px] text-[var(--fg-muted)]">Offline</span>;
}
