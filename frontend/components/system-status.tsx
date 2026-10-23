"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { getHealth } from "@frontend/lib/api";
import {
  IconXMark,
  IconRefresh,
} from "@frontend/components/icons";

type Health = {
  cutter: boolean;
  mind: boolean;
  desk: boolean;
};

function loadHealth(): Promise<Health> {
  return getHealth()
    .then((data) => ({
      cutter: data.ffmpeg.available,
      mind: data.minds.configured && data.minds.ok,
      desk: data.db,
    }))
    .catch(() => ({ cutter: false, mind: false, desk: false }));
}

/** Header chip that opens the system status dialog, on the landing page and inside the app. */
export function SystemStatusButton() {
  const titleId = useId();
  const [health, setHealth] = useState<Health | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    void loadHealth().then(setHealth);
  }, []);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="hidden sm:flex h-8 items-center gap-2 rounded-lg border border-[var(--border-strong)] px-2.5 text-[0.8125rem] text-[var(--fg-muted)] hover:text-[var(--fg-bright)] transition-colors"
      >
        <SystemStatus health={health} />
      </button>

      {/* Rendered at the body, so a blurred or transformed header can never trap the fixed overlay. */}
      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-backdrop-in text-[var(--fg)]"
            onClick={() => setOpen(false)}
          >
            <div
              className="glass-strong relative w-full max-w-sm p-6 space-y-4 animate-scale-in shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <h3 id={titleId} className="font-semibold text-sm text-[var(--fg)]">System status</h3>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
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
                  <span className="text-[var(--fg)]">Projects</span>
                  <StatusBadge ok={health?.desk} />
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center text-[11px] text-[var(--fg-muted)] border-t border-[var(--border)]">
                <span>If a part is offline, wait a moment and check again.</span>
                <button
                  type="button"
                  onClick={() => {
                    setHealth(null);
                    void loadHealth().then(setHealth);
                  }}
                  className="btn btn-ghost btn-xs"
                >
                  <IconRefresh className="h-3 w-3" />
                  <span>Check again</span>
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function SystemStatus({ health }: { health: Health | null }) {
  const processingOk = health?.cutter === true && health?.desk === true;
  const allOk = processingOk && health?.mind === true;
  const knownBad = health?.cutter === false || health?.desk === false;
  const label = !health
    ? "Checking…"
    : allOk
      ? "Ready"
      : processingOk
        ? "Ready, Mind off"
        : "Something's offline";
  const tone = !health ? "bg-[var(--warn)]" : allOk || processingOk ? "bg-[var(--ok)]" : knownBad ? "bg-[var(--bad)]" : "bg-[var(--warn)]";

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-[7px] w-[7px] rounded-full transition-all duration-300 ${tone}`} aria-hidden />
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
