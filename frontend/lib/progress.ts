import { useEffect, useRef, useState } from "react";
import type { JobProgress } from "@frontend/lib/api";
import { platformLabel } from "@frontend/lib/format";

// Downloads and the progress line use the same platform names as the clip cards.
export function clipPlatformLabel(value: string) {
  return platformLabel(value);
}

/** Share of the whole bar each backend stage owns. */
const SPANS: Record<string, [number, number]> = {
  queued: [0, 0.05],
  fetching_source: [0.05, 0.32],
  analyzing: [0.32, 0.62],
  clipping: [0.62, 0.97],
  ready: [1, 1],
};

export const CLIP_SPAN = SPANS.clipping;

const STAGE_ORDER = ["fetching_source", "analyzing", "clipping", "ready"] as const;

export function stageIndex(status: string) {
  if (status === "queued") return 0;
  const index = STAGE_ORDER.indexOf(status as (typeof STAGE_ORDER)[number]);
  return index < 0 ? 0 : index;
}

/** Approaches `cap` over time; used where the backend can't count steps. */
function settle(elapsedMs: number, tauMs: number, cap = 0.9) {
  return cap * (1 - Math.exp(-Math.max(0, elapsedMs) / tauMs));
}

export type ProgressSnapshot = {
  status: string;
  progress: JobProgress | null | undefined;
  /** client clock minus server clock, from the last poll */
  offsetMs: number;
  /** fallback stage start (ms, client clock) when the backend sent none */
  fallbackStartMs: number;
};

export function snapshotFrom(
  status: string,
  progress: JobProgress | null | undefined,
  updatedAtSec: number | undefined,
): ProgressSnapshot {
  const now = Date.now();
  return {
    status,
    progress,
    offsetMs: progress?.serverNow ? now - progress.serverNow : 0,
    fallbackStartMs: updatedAtSec ? updatedAtSec * 1000 : now,
  };
}

/** Where the bar should be right now (0–1), from real stage data plus time. */
export function targetProgress(snap: ProgressSnapshot, nowMs = Date.now()) {
  const span = SPANS[snap.status];
  if (!span) return 0;
  if (snap.status === "ready") return 1;
  const [lo, hi] = span;
  const p = snap.progress?.stage === snap.status ? snap.progress : null;
  const serverNow = nowMs - snap.offsetMs;
  const elapsed = p?.stageStartedAt ? serverNow - p.stageStartedAt : nowMs - snap.fallbackStartMs;

  let fraction: number;
  switch (snap.status) {
    case "queued":
      fraction = settle(elapsed, 1500);
      break;
    case "fetching_source":
      if (p?.step === "download") {
        const mb = (p.bytes ?? 0) / (1024 * 1024);
        fraction = 0.45 + 0.5 * (1 - Math.exp(-mb / 60));
      } else {
        fraction = settle(elapsed, 5000, 0.45);
      }
      break;
    case "analyzing":
      fraction = settle(elapsed, p?.step === "mind" ? 9000 : 1200, 0.92);
      break;
    case "clipping":
      if (p?.total) {
        const sinceClip = p.updatedAt ? serverNow - p.updatedAt : 0;
        const done = Math.min(p.done ?? 0, p.total);
        const partial = done < p.total ? settle(sinceClip, 2500) : 0;
        fraction = (done + partial) / p.total;
      } else {
        fraction = settle(elapsed, 6000);
      }
      break;
    default:
      fraction = 0;
  }
  return lo + (hi - lo) * Math.min(1, Math.max(0, fraction));
}

/** One line on what is happening now, in creator words. */
export function stepHeadline(status: string, progress: JobProgress | null | undefined) {
  const p = progress?.stage === status ? progress : null;
  switch (status) {
    case "queued":
      return "Waiting to start…";
    case "fetching_source":
      if (p?.step === "download") {
        const mb = (p.bytes ?? 0) / (1024 * 1024);
        return mb >= 1 ? `Downloading the video · ${mb.toFixed(0)} MB` : "Downloading the video…";
      }
      return "Reading the captions…";
    case "analyzing":
      return p?.step === "mind" ? "The Mind is choosing three moments…" : "Choosing three moments…";
    case "clipping":
      if (p?.total) {
        const done = p.done ?? 0;
        if (done >= p.total) return "Writing the text drafts…";
        return `Cutting clip ${done + 1} of ${p.total}${p.platform ? ` for ${clipPlatformLabel(p.platform)}` : ""}`;
      }
      return "Cutting the clips…";
    case "ready":
      return "Ready to review";
    default:
      return "Working…";
  }
}

function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Eases a displayed value toward `targetProgress` every frame. It never moves
 * backwards, and it keeps creeping between polls so the bar never stalls and
 * never jumps. `onFrame` gets the raw value for direct style writes; the
 * returned number only changes when the whole percent does.
 */
export function useSmoothProgress(snap: ProgressSnapshot, onFrame?: (value: number) => void) {
  const snapRef = useRef(snap);
  snapRef.current = snap;
  const frameRef = useRef(onFrame);
  frameRef.current = onFrame;
  const valueRef = useRef<number | null>(null);
  const [percent, setPercent] = useState(() => Math.round(targetProgress(snap) * 100));

  useEffect(() => {
    let raf = 0;
    let timer = 0;
    let last = performance.now();

    const apply = (value: number) => {
      valueRef.current = value;
      frameRef.current?.(value);
      const next = Math.round(value * 100);
      setPercent((current) => (current === next ? current : next));
    };

    if (reducedMotion()) {
      const step = () => {
        const target = targetProgress(snapRef.current);
        apply(Math.max(valueRef.current ?? 0, target));
      };
      step();
      timer = window.setInterval(step, 1000);
      return () => window.clearInterval(timer);
    }

    const tick = (time: number) => {
      const dt = Math.min(80, time - last);
      last = time;
      const target = targetProgress(snapRef.current);
      let value = valueRef.current ?? target * 0.9;
      if (target > value) {
        // Faster catch-up when finishing, gentle otherwise.
        const tau = target >= 1 ? 220 : 420;
        value += (target - value) * (1 - Math.exp(-dt / tau));
        if (target >= 1 && 1 - value < 0.002) value = 1;
      }
      apply(value);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return percent;
}
