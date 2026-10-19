"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { JobDetail } from "@frontend/lib/api";
import { formatElapsed, JOB_STAGES } from "@frontend/lib/format";
import { CLIP_SPAN, snapshotFrom, stageIndex, stepHeadline, useSmoothProgress } from "@frontend/lib/progress";
import { extractYoutubeId, youtubeThumbnail } from "@frontend/lib/youtube";
import { FootageArt, type FootageCrop } from "@frontend/components/footage";
import { IconCheck } from "@frontend/components/icons";

const CUTS: Array<{ platform: string; label: string; crop: FootageCrop; position: string }> = [
  { platform: "tiktok", label: "TikTok", crop: "tiktok", position: "30% 50%" },
  { platform: "instagram", label: "Reels", crop: "reels", position: "50% 40%" },
  { platform: "x", label: "X", crop: "x", position: "70% 50%" },
];

// Illustrative windows on the source timeline, one per cut.
const WINDOWS = [
  { left: "8%", width: "16%", crop: "8%" },
  { left: "39%", width: "18%", crop: "36%" },
  { left: "71%", width: "13%", crop: "64%" },
];

const WAVE = [
  30, 48, 36, 62, 44, 70, 54, 34, 58, 76, 50, 40, 66, 82, 56, 38, 52, 70, 46, 32, 60, 78, 54, 42, 64, 48, 36, 56, 72,
  44, 30, 54, 66, 40, 58, 46, 62, 50, 38, 68,
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
  const stageLabel = done ? "Ready for review" : status === "queued" ? "Queued" : JOB_STAGES[current].label;
  const elapsedSec = Math.max(0, Math.floor(now / 1000) - job.createdAt);
  const stageElapsedSec =
    job.progress?.stageStartedAt && job.progress.serverNow
      ? Math.max(0, (job.progress.serverNow - job.progress.stageStartedAt) / 1000)
      : 0;
  const ytId = job.sourceUrl ? extractYoutubeId(job.sourceUrl) : null;
  const still = ytId ? youtubeThumbnail(ytId) : null;
  const activeCut = cutStates.findIndex((state) => state === "active");
  const showWindows = status === "clipping" || status === "analyzing" || done;

  return (
    <section
      className="proc p-5 sm:p-8 space-y-7"
      data-leaving={leaving ? "true" : "false"}
      aria-label="Pack progress"
      aria-busy={done ? "false" : "true"}
    >
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0 space-y-2">
          <p className="kicker kicker-tally">
            {done ? "Done" : `Step ${current + 1} of 4`} · {stageLabel}
          </p>
          <div className="proc-label" aria-live="polite">
            <h2 key={headline} className="page-title text-[1.5rem] sm:text-[1.9rem]">
              {headline}
            </h2>
          </div>
          <p className="text-sm text-[var(--fg-muted)]">
            {done
              ? "Opening your clips…"
              : stageElapsedSec > 45
                ? "Taking longer than usual. You can leave this page; the pack keeps going."
                : `Working for ${formatElapsed(job.createdAt, now)}. This page updates by itself.`}
          </p>
        </div>
        <p
          className="font-display shrink-0 text-[2.6rem] sm:text-[3.4rem] font-bold leading-none tracking-tight tabular-nums text-[var(--fg-bright)]"
          aria-hidden="true"
        >
          {percent}
          <span className="text-[1.1rem] sm:text-[1.4rem] text-[var(--fg-muted)]">%</span>
        </p>
      </div>

      <div className="space-y-4">
        <div
          className="proc-bar"
          role="progressbar"
          aria-label="Pack progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-valuetext={`${percent}% · ${stageLabel}`}
        >
          <span ref={fillRef} className="proc-fill" data-done={done ? "true" : "false"} style={{ transform: "scaleX(0)" }}>
            {!done ? <span className="proc-sheen" /> : null}
          </span>
        </div>
        <ol className="proc-steps">
          {JOB_STAGES.map((stage, index) => {
            const state = done || index < current ? "done" : index === current ? "active" : "todo";
            return (
              <li key={stage.key} className="proc-step" data-state={state}>
                <span className="proc-node" aria-hidden="true">
                  {state === "done" ? <IconCheck className="h-3 w-3 animate-pop" /> : null}
                </span>
                <span>{stage.label}</span>
                <span className="sr-only">{state === "done" ? "(done)" : state === "active" ? "(in progress)" : ""}</span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="proc-visual" aria-hidden="true">
        <div>
          <div className="proc-source" data-stage={status}>
            {still ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={still} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <FootageArt crop="wide" />
            )}
            {status === "fetching_source" || status === "queued" ? <span className="proc-loading" /> : null}
            {status === "clipping" && activeCut >= 0 ? (
              <span className="proc-crop" style={{ left: WINDOWS[activeCut].crop }} />
            ) : null}
          </div>
          <div className="proc-track">
            <div className="proc-wave">
              {WAVE.map((h, i) => (
                <i key={i} style={{ height: `${h}%`, animationDelay: `${i * 18}ms` }} />
              ))}
            </div>
            {showWindows
              ? WINDOWS.map((win, index) => (
                  <span
                    key={win.left}
                    className="proc-win"
                    data-state={
                      status === "analyzing" ? "pending" : cutStates[index] === "done" ? "done" : cutStates[index] === "active" ? "active" : "idle"
                    }
                    style={{ left: win.left, width: win.width, animationDelay: `${index * 160}ms` }}
                  />
                ))
              : null}
            {status === "analyzing" ? <span className="proc-scan" /> : null}
          </div>
          <p className="timecode mt-2 text-[11px] text-[var(--fg-subtle)]">
            {status === "fetching_source" || status === "queued"
              ? "Source · loading"
              : status === "analyzing"
                ? "Source · scanning the transcript"
                : "Source · three windows picked"}
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
                  <img src={still} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: cut.position }} />
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
                  <IconCheck className="h-4 w-4" />
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
