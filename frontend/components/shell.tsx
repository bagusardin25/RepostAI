"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getHealth } from "@frontend/lib/api";
import { ToastProvider } from "@frontend/components/toast";
import { ThemeProvider, ThemeToggle } from "@frontend/components/theme-provider";
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
  const isLanding = pathname.startsWith("/landing");

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
    <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--fg)]">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:dark:bg-white focus:dark:text-black focus:rounded-md focus:shadow-xl focus:border focus:border-neutral-300 text-xs font-semibold"
        href="#content"
      >
        Skip to content
      </a>

      {/* Minimalist Topbar */}
      <header className="sticky top-0 z-40 w-full border-b border-[var(--border)] bg-[var(--header-bg)] backdrop-blur-md">
        <div className="mx-auto flex h-[var(--header-h)] max-w-6xl items-center justify-between px-4 sm:px-6">
          {/* Brand Logo & Nav */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="h-2 w-2 rounded-full bg-orange-500" />
              <span className="text-sm font-semibold tracking-tight text-[var(--fg)]">
                Repost<span className="text-[var(--fg-muted)]">AI</span>
              </span>
            </Link>

            {/* Navigation */}
            <nav aria-label="Primary" className="flex items-center gap-1">
              <NavLink href="/landing" active={false}>
                Overview
              </NavLink>
              <NavLink href="/" active={pathname === "/"}>
                Desk
              </NavLink>
              <NavLink href="/voice" active={pathname.startsWith("/voice")}>
                Voice Memory
              </NavLink>
              <NavLink href="/mind" active={pathname.startsWith("/mind")}>
                Mind
              </NavLink>
            </nav>
          </div>

          {/* Right Status & Theme Toggle */}
          <div className="flex items-center gap-2.5">
            <ThemeToggle />

            <button
              type="button"
              onClick={() => setShowHealthModal(true)}
              className="flex items-center gap-2 px-2.5 py-1 rounded-md border border-[var(--border)] text-[11px] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:border-[var(--border-strong)] transition-colors"
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
      <main id="content" className="flex-1 mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        {children}
      </main>

      {/* Minimalist Footer */}
      <footer className="border-t border-[var(--border)] bg-[var(--bg)] py-8 mt-auto text-xs text-[var(--fg-muted)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
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
            className="panel relative w-full max-w-sm p-6 space-y-4 shadow-xl border-[var(--border-strong)]"
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
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border)]">
                <span className="text-[var(--fg)]">FFmpeg Video Cutter</span>
                <StatusBadge ok={health?.cutter} />
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border)]">
                <span className="text-[var(--fg)]">Minds AI Agent</span>
                <StatusBadge ok={health?.mind} />
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border)]">
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
      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
        active
          ? "text-[var(--fg)] bg-[var(--border)]"
          : "text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--border)]/50"
      }`}
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
          isOk ? "bg-emerald-500" : isErr ? "bg-red-500" : "bg-amber-500"
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
    return <span className="timecode text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Online</span>;
  }
  return <span className="timecode text-[10px] text-[var(--fg-muted)]">Offline</span>;
}
