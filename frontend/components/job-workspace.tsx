"use client";

import Link from "next/link";
import { useEffect, useState, useMemo, type Dispatch, type SetStateAction } from "react";
import {
  getJob,
  retryJob,
  reviewClip,
  type ClipPackage,
  type ContentArtifacts,
  type FollowUp,
  type JobDetail,
  type JobLineage,
  type VoiceApplied,
} from "@frontend/lib/api";
import { formatContentPack, isClipReady, summarizeClipDecisions } from "@frontend/lib/content-pack";
import {
  analyzerLabel,
  formatDuration,
  formatElapsed,
  JOB_STATUS_COPY,
  sourceTypeLabel,
} from "@frontend/lib/format";
import { ArtifactsPanel } from "@frontend/components/artifacts-panel";
import { ClipCard } from "@frontend/components/clip-card";
import { VoiceInfluence } from "@frontend/components/voice-influence";
import { Pipeline } from "@frontend/components/pipeline";
import { StatusPill } from "@frontend/components/status-pill";
import { useToast } from "@frontend/components/toast";
import {
  IconChevronRight,
  IconCopy,
  IconExternalLink,
  IconInstagram,
  IconRefresh,
  IconScissors,
  IconSearch,
  IconTikTok,
  IconX,
} from "@frontend/components/icons";

const ACTIVE = new Set(["queued", "fetching_source", "analyzing", "clipping"]);

type PackView = "all" | "video" | "copy";

export function JobWorkspace({ jobId }: { jobId: string }) {
  const toast = useToast();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [clips, setClips] = useState<ClipPackage[]>([]);
  const [artifacts, setArtifacts] = useState<ContentArtifacts | null>(null);
  const [followup, setFollowup] = useState<FollowUp | null>(null);
  const [voiceApplied, setVoiceApplied] = useState<VoiceApplied | null>(null);
  const [voiceSteered, setVoiceSteered] = useState(false);
  const [lineage, setLineage] = useState<JobLineage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [batchBusy, setBatchBusy] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [sourceTab, setSourceTab] = useState<"video" | "transcript">("video");
  const [transcriptSearch, setTranscriptSearch] = useState("");
  const [packView, setPackView] = useState<PackView>("all");

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function load() {
      try {
        const data = await getJob(jobId);
        if (cancelled) return;
        setJob(data.job);
        setClips(data.clips);
        setArtifacts(data.artifacts ?? data.job.artifacts ?? null);
        setFollowup(data.followup ?? data.job.followup ?? null);
        setVoiceApplied(data.voiceApplied ?? data.job.voiceApplied ?? null);
        setVoiceSteered(Boolean(data.voiceSteered));
        setLineage(data.lineage ?? null);
        setError(null);
        const waitingFollowup = data.job.status === "ready" && !(data.followup ?? data.job.followup);
        if (ACTIVE.has(data.job.status) || waitingFollowup) {
          timer = setTimeout(() => void load(), 1500);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load job workspace");
      }
    }

    void load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [jobId, nonce]);

  async function handleApproveAll() {
    const pendingClips = clips.filter((c) => c.status === "needs_review");
    if (pendingClips.length === 0) return;

    setBatchBusy(true);
    try {
      for (const c of pendingClips) {
        await reviewClip(c.id, { action: "approve" });
      }
      toast.success(`Approved ${pendingClips.length} remaining clip${pendingClips.length === 1 ? "" : "s"}`);
      setNonce((n) => n + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Approval failed");
    } finally {
      setBatchBusy(false);
    }
  }

  function handleCopyPack() {
    const pack = formatContentPack(clips, artifacts);
    if (!pack.text.trim()) {
      toast.info("Approve a clip or wait for drafts first");
      return;
    }
    void navigator.clipboard.writeText(pack.text);
    const bits = [
      pack.ready.length > 0 ? `${pack.ready.length} clip${pack.ready.length === 1 ? "" : "s"}` : null,
      pack.draftsIncluded ? "4 drafts" : null,
    ].filter(Boolean);
    const extra = pack.waitingCount > 0 ? ` ${pack.waitingCount} still need review.` : "";
    toast.success(`Copied ${bits.join(" + ")}.${extra}`);
  }

  function reviewNext() {
    const next = clips.find((clip) => clip.status === "needs_review");
    if (!next) return;
    document.getElementById(`clip-${next.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const filteredTranscript = useMemo(() => {
    if (!job?.transcript) return "";
    const query = transcriptSearch.trim().toLowerCase();
    if (!query) return job.transcript;
    return job.transcript
      .split("\n")
      .filter((line) => line.toLowerCase().includes(query))
      .join("\n");
  }, [job?.transcript, transcriptSearch]);

  if (error) {
    return (
      <div className="panel p-8 text-center space-y-4 max-w-md mx-auto">
        <p className="text-xs text-bad" role="alert">{error}</p>
        <Link href="/desk" className="btn btn-ghost btn-sm">
          Back to projects
        </Link>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="skel h-20 rounded-xl" />
        <div className="skel h-24 rounded-xl" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="skel h-96 rounded-xl" />
          <div className="skel h-96 rounded-xl" />
          <div className="skel h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  const { readyCount, waitingCount, rejectedCount } = summarizeClipDecisions(clips);
  const draftCount = artifacts ? 4 : 0;
  const processing = ACTIVE.has(job.status);
  const analyzer = analyzerLabel(job.analyzer);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between text-xs text-[var(--fg-muted)]">
        <nav className="flex items-center gap-1.5" aria-label="Breadcrumb">
          <Link href="/desk" className="hover:text-[var(--fg)] transition-colors">
            Projects
          </Link>
          <span>/</span>
          <span className="text-[var(--fg)] font-medium truncate max-w-[16rem] sm:max-w-xs">
            {job.sourceTitle || "Content pack"}
          </span>
        </nav>
      </div>

      <header className="panel p-5 sm:p-6 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <p className="kicker">Content pack</p>
            <div className="flex items-center gap-2 text-xs text-[var(--fg-muted)] timecode">
              <span>{sourceTypeLabel(job.sourceType)}</span>
              <span>·</span>
              <span>{formatDuration(job.durationSec)}</span>
              {clips.length > 0 && (
                <>
                  <span>·</span>
                  <span>
                    {clips.length} clips{draftCount ? ` + ${draftCount} drafts` : ""}
                  </span>
                </>
              )}
            </div>

            <h1 className="page-title text-lg sm:text-xl">
              {job.sourceTitle}
            </h1>

            {job.sourceUrl && (
              <a
                href={job.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] underline underline-offset-4"
              >
                <span>Open source link</span>
                <IconExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          <div className="flex items-center gap-2 sm:self-start">
            <StatusPill value={job.status} />

            {job.status === "failed" && (
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                disabled={retrying}
                onClick={() => {
                  setRetrying(true);
                  void retryJob(job.id)
                    .then(() => {
                      toast.success("Restarted this pack");
                      setNonce((n) => n + 1);
                    })
                    .catch((err) => toast.error(err instanceof Error ? err.message : "Retry failed"))
                    .finally(() => setRetrying(false));
                }}
              >
                <IconRefresh className={`h-3 w-3 ${retrying ? "animate-spin" : ""}`} />
                <span>Retry</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {processing && <Pipeline status={job.status} />}

      {job.status === "failed" && job.error && (
        <div role="alert" className="alert alert-bad">
          <p className="font-semibold mb-0.5">This pack stopped</p>
          <p>{job.error}</p>
        </div>
      )}

      {clips.length > 0 ? (
        <section className="review-bar p-4 sm:p-5 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <h2 className="section-title">
                {clips.length} clips{draftCount ? ` + ${draftCount} text drafts` : ""}
              </h2>
              <p className="text-xs text-[var(--fg-muted)]">
                {readyCount} ready
                {waitingCount > 0 ? ` / ${waitingCount} need review` : ""}
                {rejectedCount > 0 ? ` / ${rejectedCount} rejected` : ""}
                {waitingCount === 0 && rejectedCount === 0 && clips.length > 0 ? " · all decided" : ""}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {waitingCount > 0 && (
                <button type="button" onClick={reviewNext} className="btn btn-ghost btn-xs">
                  Review next
                </button>
              )}
              {(readyCount > 0 || artifacts) && (
                <button
                  type="button"
                  onClick={handleCopyPack}
                  className={`btn btn-xs ${waitingCount === 0 ? "btn-primary" : "btn-ghost"}`}
                >
                  <IconCopy className="h-3 w-3" />
                  <span>Copy pack</span>
                </button>
              )}
              {waitingCount > 0 && (
                <button
                  type="button"
                  onClick={() => void handleApproveAll()}
                  disabled={batchBusy}
                  className="btn btn-primary btn-xs"
                >
                  <span>{batchBusy ? "Approving…" : `Approve all remaining (${waitingCount})`}</span>
                </button>
              )}
            </div>
          </div>

          <div className="seg">
            {(
              [
                ["all", "All platforms"],
                ["video", "Video-first"],
                ["copy", "Copy-first"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setPackView(key)}
                className={`seg-item ${packView === key ? "is-active" : ""}`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {clips.length > 0 && packView !== "copy" ? <ClipGrid clips={clips} lineage={lineage} onChange={setClips} /> : null}

      {clips.length === 0 && processing ? (
        <ProcessingBay status={job.status} startedAt={job.createdAt} />
      ) : null}

      {artifacts && packView !== "video" ? <ArtifactsPanel artifacts={artifacts} /> : null}

      {clips.length > 0 && packView === "copy" ? <ClipGrid clips={clips} lineage={lineage} onChange={setClips} /> : null}

      {artifacts && packView === "video" ? (
        <details className="disclosure">
          <summary className="panel px-5 py-4">
            <span className="flex items-center gap-2 min-w-0">
              <IconChevronRight className="disclosure-chevron h-3.5 w-3.5 text-[var(--fg-muted)]" aria-hidden="true" />
              <span>
                <span className="section-title block">4 text drafts</span>
                <span className="text-xs text-[var(--fg-muted)]">Open if you want the script, carousel, thread, or LinkedIn draft</span>
              </span>
            </span>
          </summary>
          <div className="pt-3">
            <ArtifactsPanel artifacts={artifacts} />
          </div>
        </details>
      ) : null}

      {clips.length > 0 && (
        <section className="panel p-5 space-y-3">
          <div>
            <h2 className="section-title">Download MP4s</h2>
            <p className="text-xs text-[var(--fg-muted)]">
              {readyCount} of {clips.length} clips ready. Files download one at a time. Nothing publishes.
            </p>
          </div>
          <ul className="grid gap-2 text-xs text-[var(--fg-muted)] sm:grid-cols-3">
            {clips.map((clip) => (
              <li key={clip.id} className="cell p-3 space-y-1">
                <p className="font-medium text-[var(--fg)]">{clip.platform}</p>
                <p>
                  {isClipReady(clip.status)
                    ? "Ready to paste"
                    : clip.status === "rejected"
                      ? "Not used"
                      : "Review first"}
                </p>
                {clip.videoUrl ? (
                  <a href={clip.videoUrl} download className="underline underline-offset-4">
                    Download MP4
                  </a>
                ) : (
                  <span>No file yet</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <details className="disclosure panel">
        <summary className="px-5 py-4">
          <span className="flex items-center gap-2 min-w-0">
            <IconChevronRight className="disclosure-chevron h-3.5 w-3.5 text-[var(--fg-muted)]" aria-hidden="true" />
            <span>
              <span className="section-title block">How this was chosen</span>
              <span className="text-xs text-[var(--fg-muted)]">
                {analyzer ? `${analyzer} · ` : ""}Why these moments, and the style used here
              </span>
            </span>
          </span>
        </summary>
        <div className="px-5 pb-5 space-y-4 border-t border-[var(--border)] pt-4">
          {followup && (
            <aside className="cell p-4 space-y-1.5">
              <p className="timecode text-[11px] text-[var(--fg-muted)]">Next move</p>
              <p className="text-sm text-[var(--fg)] leading-relaxed">{followup.reminder}</p>
              <p className="text-xs text-[var(--fg-muted)] leading-relaxed">{followup.nextMove}</p>
            </aside>
          )}

          {(job.status === "ready" || job.status === "clipping" || voiceSteered) && (
            <VoiceInfluence
              steered={voiceSteered}
              voiceApplied={voiceApplied}
              lineage={lineage}
              currentJobId={job.id}
            />
          )}

          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(job.id);
              toast.info("Copied pack ID");
            }}
            className="text-[11px] text-[var(--fg-muted)] hover:text-[var(--fg)] timecode"
          >
            Copy pack ID
          </button>
        </div>
      </details>

      {(job.sourceVideoUrl || job.transcript) && (
        <details className="disclosure panel">
          <summary className="px-5 py-4">
            <span className="flex items-center gap-2 min-w-0">
              <IconChevronRight className="disclosure-chevron h-3.5 w-3.5 text-[var(--fg-muted)]" aria-hidden="true" />
              <span>
                <span className="section-title block">Source video & transcript</span>
                <span className="text-xs text-[var(--fg-muted)]">Original file and captions used for this pack</span>
              </span>
            </span>
          </summary>
          <div className="border-t border-[var(--border)]">
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="sr-only">Source tabs</span>
              <div className="seg">
                {job.sourceVideoUrl && (
                  <button
                    type="button"
                    onClick={() => setSourceTab("video")}
                    className={`seg-item ${sourceTab === "video" || !job.transcript ? "is-active" : ""}`}
                  >
                    Video
                  </button>
                )}
                {job.transcript && (
                  <button
                    type="button"
                    onClick={() => setSourceTab("transcript")}
                    className={`seg-item ${sourceTab === "transcript" || !job.sourceVideoUrl ? "is-active" : ""}`}
                  >
                    Transcript
                  </button>
                )}
              </div>
            </div>

            {((sourceTab === "video" && job.sourceVideoUrl) || (!job.transcript && job.sourceVideoUrl)) && (
              <div className="bg-black p-4 flex justify-center">
                <video
                  className="max-h-80 w-full max-w-2xl rounded-lg object-contain"
                  src={job.sourceVideoUrl}
                  controls
                  playsInline
                  preload="metadata"
                />
              </div>
            )}

            {((sourceTab === "transcript" && job.transcript) || (!job.sourceVideoUrl && job.transcript)) && (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-xs">
                    <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--fg-subtle)]" />
                    <input
                      type="search"
                      value={transcriptSearch}
                      onChange={(e) => setTranscriptSearch(e.target.value)}
                      placeholder="Search transcript…"
                      className="field field-icon h-8 text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(job.transcript);
                      toast.success("Transcript copied");
                    }}
                    className="btn btn-ghost btn-xs"
                  >
                    <IconCopy className="h-3 w-3" />
                    <span>Copy</span>
                  </button>
                </div>

                <pre className="max-h-64 overflow-y-auto cell p-3.5 text-xs font-mono leading-relaxed text-[var(--fg)] whitespace-pre-wrap">
                  {filteredTranscript}
                </pre>
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  );
}

function ClipGrid({
  clips,
  lineage,
  onChange,
}: {
  clips: ClipPackage[];
  lineage: JobLineage | null;
  onChange: Dispatch<SetStateAction<ClipPackage[]>>;
}) {
  return (
    <section className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3 items-start animate-fade-in-up">
        {clips.map((clip) => {
          const prior = lineage?.platforms.find((row) => row.platform === clip.platform);
          return (
            <ClipCard
              key={clip.id}
              clip={clip}
              previousHook={prior && !prior.first ? prior.previousHook : null}
              previousNote={prior && !prior.first ? prior.previousNote : null}
              onChange={(next) =>
                onChange((current) => current.map((item) => (item.id === next.id ? next : item)))
              }
            />
          );
        })}
      </div>
    </section>
  );
}

const PROCESSING_FRAMES = [
  { name: "TikTok", Icon: IconTikTok },
  { name: "Reels", Icon: IconInstagram },
  { name: "X", Icon: IconX },
] as const;

function ProcessingBay({ status, startedAt }: { status: string; startedAt: number }) {
  const copy = JOB_STATUS_COPY[status];
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const elapsed = formatElapsed(startedAt, now);
  const elapsedSec = Math.max(0, Math.floor(now / 1000) - startedAt);

  return (
    <section
      className="panel p-6 sm:p-8 space-y-6 animate-scale-in"
      aria-busy="true"
      aria-live="polite"
      aria-label="Processing clips"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="cut-ring" aria-hidden="true">
          <IconScissors className="h-5 w-5 text-[var(--tally-fg)]" />
        </div>
        <div className="space-y-1 max-w-md">
          <p className="kicker">{copy?.label ?? "Working"}</p>
          <h2 className="section-title">{copy?.detail ?? "Preparing your clips and drafts…"}</h2>
          <p className="text-xs text-[var(--fg-muted)] leading-relaxed">
            Working for {elapsed}. This page updates automatically.
          </p>
          {elapsedSec >= 20 && (
            <p className="text-xs text-[var(--fg-muted)] leading-relaxed">
              Still working. If this stalls, use Retry in the header or start a new source.
            </p>
          )}
        </div>
      </div>

      <div
        className="cut-bar"
        role="progressbar"
        aria-label="Job in progress"
        aria-valuetext={copy?.label ?? "Working"}
      />

      <div className="grid grid-cols-3 gap-2 sm:gap-3 max-w-sm mx-auto">
        {PROCESSING_FRAMES.map((frame, index) => {
          const Icon = frame.Icon;
          return (
            <article
              key={frame.name}
              className="cut-frame"
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              <span className="cut-frame-scan" aria-hidden="true" />
              <Icon className="h-4 w-4 text-[var(--fg-muted)] relative z-[1]" />
              <p className="timecode text-[10px] text-[var(--fg-subtle)] relative z-[1] mt-1">{frame.name}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
