"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import {
  getJob,
  retryJob,
  reviewClip,
  type ClipPackage,
  type ContentArtifacts,
  type FollowUp,
  type JobDetail,
} from "@frontend/lib/api";
import { formatDuration, sourceTypeLabel } from "@frontend/lib/format";
import { ArtifactsPanel } from "@frontend/components/artifacts-panel";
import { ClipCard } from "@frontend/components/clip-card";
import { Pipeline } from "@frontend/components/pipeline";
import { StatusPill } from "@frontend/components/status-pill";
import { useToast } from "@frontend/components/toast";
import {
  IconExternalLink,
  IconRefresh,
  IconCopy,
  IconSearch,
} from "@frontend/components/icons";

const ACTIVE = new Set(["queued", "fetching_source", "analyzing", "clipping"]);

export function JobWorkspace({ jobId }: { jobId: string }) {
  const toast = useToast();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [clips, setClips] = useState<ClipPackage[]>([]);
  const [artifacts, setArtifacts] = useState<ContentArtifacts | null>(null);
  const [followup, setFollowup] = useState<FollowUp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [batchBusy, setBatchBusy] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [sourceTab, setSourceTab] = useState<"video" | "transcript">("video");
  const [transcriptSearch, setTranscriptSearch] = useState("");

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
      toast.success(`Approved all packages`);
      setNonce((n) => n + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Approval failed");
    } finally {
      setBatchBusy(false);
    }
  }

  function handleCopyAllCaptions() {
    if (clips.length === 0) return;
    const text = clips
      .map((c) => {
        const platform = c.platform.toUpperCase();
        const tags = c.hashtags.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ");
        return `[${platform} · ${formatDuration(c.durationSec)}]\nHOOK:\n${c.displayHook}\n\nCAPTION:\n${c.displayCaption}\n\nTAGS:\n${tags}\n`;
      })
      .join("\n---\n\n");

    void navigator.clipboard.writeText(text);
    toast.success("Copied all 3 packages to clipboard");
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
        <p className="text-xs text-rose-500" role="alert">{error}</p>
        <Link href="/" className="btn btn-ghost btn-sm">
          Back to Desk
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

  const waitingCount = clips.filter((c) => c.status === "needs_review").length;
  const approvedCount = clips.filter((c) => c.status === "approved").length;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Breadcrumbs & Actions */}
      <div className="flex items-center justify-between text-xs text-[var(--fg-muted)]">
        <nav className="flex items-center gap-1.5" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-[var(--fg)] transition-colors">
            Desk
          </Link>
          <span>/</span>
          <span className="text-[var(--fg)] font-medium">Job {job.id.slice(0, 8)}</span>
        </nav>

        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(job.id);
            toast.info("Copied ID");
          }}
          className="hover:text-[var(--fg)] transition-colors timecode"
        >
          Copy ID
        </button>
      </div>

      {/* Header */}
      <header className="panel p-5 sm:p-6 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 text-xs text-[var(--fg-muted)] timecode">
              <span>{sourceTypeLabel(job.sourceType)} Ingest</span>
              <span>·</span>
              <span>{formatDuration(job.durationSec)}</span>
              {job.analyzer === "minds" && <span>· Mind Agent</span>}
            </div>

            <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-[var(--fg-bright)]">
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
                      toast.success("Restarted job");
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

      {/* Stepper Pipeline */}
      <Pipeline status={job.status} />

      {followup && (
        <aside className="panel p-4 sm:p-5 space-y-1.5 border-[var(--border-strong)]">
          <p className="timecode text-[11px] text-[var(--fg-muted)]">Mind follow-up</p>
          <p className="text-sm text-[var(--fg)] leading-relaxed">{followup.reminder}</p>
          <p className="text-xs text-[var(--fg-muted)] leading-relaxed">{followup.nextMove}</p>
        </aside>
      )}

      {/* Error Message */}
      {job.status === "failed" && job.error && (
        <div role="alert" className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-300">
          <p className="font-semibold mb-0.5">Pipeline stopped</p>
          <p>{job.error}</p>
        </div>
      )}

      {/* Clip Packages */}
      {clips.length > 0 ? (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
            <div>
              <h2 className="text-sm font-semibold text-[var(--fg)]">Clip Packages</h2>
              <p className="text-xs text-[var(--fg-muted)]">
                {approvedCount} of {clips.length} approved
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyAllCaptions}
                className="btn btn-ghost btn-xs"
              >
                <IconCopy className="h-3 w-3" />
                <span>Copy All</span>
              </button>

              {waitingCount > 0 && (
                <button
                  type="button"
                  onClick={() => void handleApproveAll()}
                  disabled={batchBusy}
                  className="btn btn-primary btn-xs"
                >
                  <span>{batchBusy ? "Approving…" : `Approve All (${waitingCount})`}</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3 items-start">
            {clips.map((clip) => (
              <ClipCard
                key={clip.id}
                clip={clip}
                onChange={(next) =>
                  setClips((current) => current.map((item) => (item.id === next.id ? next : item)))
                }
              />
            ))}
          </div>
        </section>
      ) : ACTIVE.has(job.status) ? (
        <div className="panel p-8 text-center text-xs text-[var(--fg-muted)] space-y-2">
          <p className="font-medium text-[var(--fg)]">Processing moments and cutting video files…</p>
          <p>This workspace updates automatically.</p>
        </div>
      ) : null}

      {artifacts && <ArtifactsPanel artifacts={artifacts} />}

      {clips.length > 0 && (
        <section className="panel p-5 space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-[var(--fg)]">Ship kit</h2>
            <p className="text-xs text-[var(--fg-muted)]">
              Copy and download locally. RepostAI never posts to TikTok, Instagram, X, or LinkedIn.
            </p>
          </div>
          <ul className="grid gap-2 text-xs text-[var(--fg-muted)] sm:grid-cols-3">
            {clips.map((clip) => (
              <li key={clip.id} className="rounded-lg border border-[var(--border)] p-3 space-y-1">
                <p className="font-medium text-[var(--fg)]">{clip.platform}</p>
                <p>{clip.status === "approved" || clip.status === "edited" ? "Ready to paste" : "Review first"}</p>
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

      {/* Source Video & Transcript Explorer */}
      {(job.sourceVideoUrl || job.transcript) && (
        <section className="panel rounded-xl overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-card)]/50 px-4 py-2.5">
            <span className="text-xs font-semibold text-[var(--fg)]">Raw Source</span>

            <div className="flex items-center gap-1 text-xs">
              {job.sourceVideoUrl && (
                <button
                  type="button"
                  onClick={() => setSourceTab("video")}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    sourceTab === "video" ? "bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] font-medium" : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
                  }`}
                >
                  Video
                </button>
              )}
              {job.transcript && (
                <button
                  type="button"
                  onClick={() => setSourceTab("transcript")}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    sourceTab === "transcript" ? "bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] font-medium" : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
                  }`}
                >
                  Transcript
                </button>
              )}
            </div>
          </div>

          {sourceTab === "video" && job.sourceVideoUrl && (
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

          {sourceTab === "transcript" && job.transcript && (
            <div className="p-4 space-y-3 bg-[var(--bg-surface)]">
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1 max-w-xs">
                  <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--fg-subtle)]" />
                  <input
                    type="search"
                    value={transcriptSearch}
                    onChange={(e) => setTranscriptSearch(e.target.value)}
                    placeholder="Search transcript…"
                    className="field h-8 pl-8 pr-2 text-xs"
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

              <pre className="max-h-64 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3.5 text-xs font-mono leading-relaxed text-[var(--fg)] whitespace-pre-wrap">
                {filteredTranscript}
              </pre>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
