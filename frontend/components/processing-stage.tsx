"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { JobDetail } from "@frontend/lib/api";
import { formatDuration, formatElapsed, JOB_STAGES } from "@frontend/lib/format";
import { CLIP_SPAN, snapshotFrom, stageIndex, stepHeadline, useSmoothProgress } from "@frontend/lib/progress";
import { extractYoutubeId, youtubeThumbnail } from "@frontend/lib/youtube";
import { FootageArt, type FootageCrop } from "@frontend/components/footage";
import { IconCheck } from "@frontend/components/icons";

const CUTS: Array<{ platform: string; label: string; crop: FootageCrop; position: string }> = [
  { platform: "tiktok", label: "TikTok", crop: "tiktok", position: "30% 50%" },
  { platform: "instagram", label: "Reels", crop: "reels", position: "50% 40%" },
  { platform: "x", label: "X", crop: "x", position: "70% 50%" },
];

// Illustrative windows on the source timeline, one per cut, and where the
// 9:16 crop sits on the source frame while that cut is made.
const WINDOWS = [
  { left: "7.3%", width: "18.8%", crop: "8%" },
  { left: "37.5%", width: "22.9%", crop: "36%" },
  { left: "71.9%", width: "16.7%", crop: "64%" },
];

// Caption segments on the timeline: one block per transcript line.
const SEGMENTS: Array<[number, number]> = [
  [1, 7],
  [9, 7.5],
  [17.5, 5.5],
  [24, 9],
  [34, 7],
  [42, 7.5],
  [50.5, 7.5],
  [59, 7.5],
  [67.5, 9],
  [77.5, 7],
  [85.5, 7],
  [93.5, 5.5],
];

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

/**
 * The pack's "making of" view. The bar and the three 9:16 frames follow the
 * backend's real stage (and clip counts while cutting); between polls the
 * value eases forward so it stays fluid without ever going backwards.
 */
export function ProcessingStage({ job, leaving = false }: { job: JobDetail; leaving?: boolean }) {
  const status = job.status;
  const done = status === "ready";
  const snap = useMemo(
    () => snapshotFrom(status, job.progress, job.updatedAt),
    // A new poll gives a new progress object; the snapshot follows it.
    [status, job.progress, job.updatedAt],
  );

  const fillRef = useRef<HTMLSpanElement>(null);
  const cutFillRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const cutEdgeRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const [cutStates, setCutStates] = useState<Array<"waiting" | "active" | "done">>(["waiting", "waiting", "waiting"]);

  const percent = useSmoothProgress(snap, (value) => {
    if (fillRef.current) fillRef.current.style.transform = `scaleX(${value})`;
    const [lo, hi] = CLIP_SPAN;
    const clipped = clamp01((value - lo) / (hi - lo)) * CUTS.length;
    const nextStates = CUTS.map((_, index) => {
      const fill = value >= 1 ? 1 : clamp01(clipped - index);
      const fillNode = cutFillRefs.current[index];
      const edgeNode = cutEdgeRefs.current[index];
      if (fillNode) fillNode.style.transform = `scaleY(${fill})`;
      if (edgeNode) {
        edgeNode.style.transform = `translateY(${(1 - fill) * 100}%)`;
        edgeNode.style.opacity = fill > 0 && fill < 1 ? "1" : "0";
      }
      return fill >= 0.999 ? "done" : fill > 0 ? "active" : "waiting";
    });
    setCutStates((current) => (current.every((s, i) => s === nextStates[i]) ? current : nextStates));
  });

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const current = done ? 3 : stageIndex(status);
  const headline = stepHeadline(status, job.progress);
  const stageLabel = done ? "Ready to review" : status === "queued" ? "Queued" : JOB_STAGES[current].label;
  const stageElapsedSec =
    job.progress?.stageStartedAt && job.progress.serverNow
      ? Math.max(0, (job.progress.serverNow - job.progress.stageStartedAt) / 1000)
      : 0;
  const ytId = job.sourceUrl ? extractYoutubeId(job.sourceUrl) : null;
  const still = ytId ? youtubeThumbnail(ytId) : null;
  const activeCut = cutStates.findIndex((state) => state === "active");
  const nextCut = status === "clipping" ? cutStates.findIndex((state) => state === "waiting") : -1;
  const showWindows = status === "clipping" || status === "analyzing" || done;
  const loading = status === "fetching_source" || status === "queued";

  return (
    <section
      className="proc p-5 sm:p-8"
      data-leaving={leaving ? "true" : "false"}
      aria-label="Pack progress"
      aria-busy={done ? "false" : "true"}
    >
      <div className="flex items-end justify-between gap-6">
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="flex justify-between gap-3 text-[0.8125rem] font-semibold text-[var(--fg-subtle)]">
            <span>{done ? "Done" : `Step ${current + 1} of 4`}</span>
            <span className="timecode text-[var(--fg-bright)] sm:hidden" aria-hidden="true">
              {percent}%
            </span>
          </p>
          <div className="proc-label" aria-live="polite">
            <h2 key={headline} className="page-title text-[1.375rem] sm:text-[1.75rem]">
              {headline}
            </h2>
          </div>
          <p className="text-sm sm:text-[0.9375rem] text-[var(--fg-muted)]">
            {done
              ? "Opening your clips…"
              : stageElapsedSec > 45
                ? "Taking longer than usual. It keeps going if you leave this page."
                : `Started ${formatElapsed(job.createdAt, now)} ago. It keeps going if you leave this page.`}
          </p>
        </div>
        <p
          className="hidden shrink-0 font-display text-[2.5rem] font-semibold leading-none tracking-[-0.02em] tabular-nums text-[var(--fg-bright)] sm:block"
          aria-hidden="true"
        >
          {percent}
          <span className="text-xl text-[var(--fg-subtle)]">%</span>
        </p>
      </div>

      <div
        className="proc-bar mt-5 sm:mt-6"
        role="progressbar"
        aria-label="Pack progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${percent}%, ${stageLabel}`}
      >
        <span ref={fillRef} className="proc-fill" data-done={done ? "true" : "false"} style={{ transform: "scaleX(0)" }}>
          {!done ? <span className="proc-sheen" /> : null}
        </span>
      </div>
      <ol className="proc-steps mt-3.5">
        {JOB_STAGES.map((stage, index) => {
          const state = done || index < current ? "done" : index === current ? "active" : "todo";
          return (
            <li key={stage.key} className="proc-step" data-state={state}>
              <span className="proc-node" aria-hidden="true">
                {state === "done" ? <IconCheck className="h-[11px] w-[11px] animate-pop" /> : null}
              </span>
              <span>{stage.label}</span>
              <span className="sr-only">{state === "done" ? "(done)" : state === "active" ? "(in progress)" : ""}</span>
            </li>
          );
        })}
      </ol>

      <div className="proc-visual mt-6 sm:mt-8" aria-hidden="true">
        <div className="space-y-3">
          <div className="proc-source" data-stage={status}>
            {still ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={still} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <FootageArt crop="wide" />
            )}
            {loading ? <span className="proc-loading" /> : null}
            {status === "clipping" && activeCut >= 0 ? (
              <span className="proc-crop" style={{ left: WINDOWS[activeCut].crop }} />
            ) : null}
          </div>
          <div className="proc-track">
            {SEGMENTS.map(([left, width]) => (
              <i key={left} className="proc-seg" style={{ left: `${left}%`, width: `${width}%` }} />
            ))}
            {showWindows
              ? WINDOWS.map((win, index) => (
                  <span
                    key={win.left}
                    className="proc-win"
                    data-state={
                      status === "analyzing"
                        ? "pending"
                        : cutStates[index] === "done"
                          ? "done"
                          : cutStates[index] === "active"
                            ? "active"
                            : "idle"
                    }
                    style={{ left: win.left, width: win.width, animationDelay: `${index * 160}ms` }}
                  />
                ))
              : null}
            {status === "analyzing" ? <span className="proc-scan" /> : null}
          </div>
          <p className="flex justify-between gap-3 text-xs text-[var(--fg-subtle)]">
            <span>
              {loading ? "Loading the video" : status === "analyzing" ? "Reading the transcript" : "Transcript · 3 moments picked"}
            </span>
            {job.durationSec ? <span className="timecode">{formatDuration(job.durationSec)}</span> : null}
          </p>
        </div>

        <div className="proc-cuts">
          {CUTS.map((cut, index) => (
            <div key={cut.platform} className="proc-cut" data-state={cutStates[index]}>
              <span
                ref={(node) => {
                  cutFillRefs.current[index] = node;
                }}
                className="proc-cut-fill"
                style={{ transform: "scaleY(0)" }}
              >
                {still ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={still}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{ objectPosition: cut.position }}
                  />
                ) : (
                  <FootageArt crop={cut.crop} />
                )}
              </span>
              <span
                ref={(node) => {
                  cutEdgeRefs.current[index] = node;
                }}
                className="proc-cut-edge"
                style={{ opacity: 0 }}
              />
              <span className="proc-cut-tag">{cut.label}</span>
              {cutStates[index] === "done" ? (
                <span className="proc-cut-check">
                  <IconCheck className="h-3 w-3" />
                </span>
              ) : null}
              {index === nextCut ? <span className="proc-cut-next">Next</span> : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
