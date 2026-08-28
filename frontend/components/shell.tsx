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
            <BrandMark
              href="/"
              current={pathname === "/"}
            />

            <nav aria-label="Primary" className="flex min-w-0 items-center gap-1 overflow-x-auto">
              <NavLink href="/desk" active={pathname === "/desk" || pathname.startsWith("/jobs")}>
                Desk
              </NavLink>
              <NavLink href="/voice" active={pathname.startsWith("/voice")}>
                Style
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
              <SystemStatus health={health} />
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
            <Link href="/" className="font-medium text-[var(--fg)] hover:opacity-80 transition-opacity">
              RepostAI
            </Link>
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-backdrop-in"
          onClick={() => setShowHealthModal(false)}
        >
          <div
            className="glass-strong relative w-full max-w-sm p-6 space-y-4 animate-scale-in shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="font-semibold text-sm text-[var(--fg)]">System status</h3>
              <button
                type="button"
                onClick={() => setShowHealthModal(false)}
                className="text-[var(--fg-muted)] hover:text-[var(--fg)] active:scale-90 transition-transform"
                aria-label="Close"
              >
                <IconXMark className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 cell hover:border-[var(--border-strong)] transition-colors">
                <span className="text-[var(--fg)]">Video cutter</span>
                <StatusBadge ok={health?.cutter} />
              </div>
              <div className="flex items-center justify-between p-2.5 cell hover:border-[var(--border-strong)] transition-colors">
                <span className="text-[var(--fg)]">Mind</span>
                <StatusBadge ok={health?.mind} />
              </div>
              <div className="flex items-center justify-between p-2.5 cell hover:border-[var(--border-strong)] transition-colors">
                <span className="text-[var(--fg)]">Saved projects</span>
                <StatusBadge ok={health?.desk} />
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center text-[11px] text-[var(--fg-muted)] border-t border-[var(--border)]">
              <span>If something is offline, retry or refresh</span>
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
      className={`chip transition-all duration-200 ${active ? "is-active font-medium scale-[1.02]" : "hover:text-[var(--fg)]"}`}
    >
      {children}
    </Link>
  );
}

function SystemStatus({ health }: { health: Health | null }) {
  const processingOk = health?.cutter === true && health?.desk === true;
  const allOk = processingOk && health?.mind === true;
  const knownBad = health?.cutter === false || health?.desk === false;
  const label = !health
    ? "Checking…"
    : allOk
      ? "System ready"
      : processingOk
        ? "Processing available"
        : "Check system";
  const tone = !health ? "bg-[var(--warn)]" : allOk || processingOk ? "bg-[var(--ok)] shadow-[0_0_6px_rgba(4,120,87,0.5)]" : knownBad ? "bg-[var(--bad)]" : "bg-[var(--warn)]";

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${tone}`} aria-hidden />
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
