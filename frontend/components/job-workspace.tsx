"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, type Dispatch, type SetStateAction } from "react";
import {
  ApiUnreachableError,
  getJob,
  retryJob,
  deleteJob,
  reviewClip,
  type ClipPackage,
  type ContentArtifacts,
  type FollowUp,
  type JobDetail,
  type JobLineage,
  type VoiceApplied,
} from "@frontend/lib/api";

import {
  clipDownloadUrl,
  clipFileName,
  copyPackMessage,
  formatContentPack,
  isClipReady,
  summarizeClipDecisions,
} from "@frontend/lib/content-pack";
import { analyzerLabel, formatDuration, packStatus, sourceTypeLabel } from "@frontend/lib/format";
import { clipPlatformLabel } from "@frontend/lib/progress";
import { ArtifactsPanel } from "@frontend/components/artifacts-panel";
import { ClipCard } from "@frontend/components/clip-card";
import { SelectionMethod } from "@frontend/components/selection-method";
import { VoiceInfluence } from "@frontend/components/voice-influence";
import { ProcessingStage } from "@frontend/components/processing-stage";
import { StatusPill } from "@frontend/components/status-pill";
import { useToast } from "@frontend/components/toast";
import {
  IconChevronRight,
  IconCopy,
  IconExternalLink,
  IconRefresh,
  IconSearch,
  IconTrash,
} from "@frontend/components/icons";


const ACTIVE = new Set(["queued", "fetching_source", "analyzing", "clipping"]);

type PackView = "all" | "video" | "copy";

export function JobWorkspace({ jobId }: { jobId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [clips, setClips] = useState<ClipPackage[]>([]);
  const [artifacts, setArtifacts] = useState<ContentArtifacts | null>(null);
  const [followup, setFollowup] = useState<FollowUp | null>(null);
  const [voiceApplied, setVoiceApplied] = useState<VoiceApplied | null>(null);
  const [voiceSteered, setVoiceSteered] = useState(false);
  const [lineage, setLineage] = useState<JobLineage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [batchBusy, setBatchBusy] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [sourceTab, setSourceTab] = useState<"video" | "transcript">("video");
  const [transcriptSearch, setTranscriptSearch] = useState("");
  const [packView, setPackView] = useState<PackView>("all");
  const [stageVisible, setStageVisible] = useState(false);
  const [stageLeaving, setStageLeaving] = useState(false);
  const status = job?.status;

  // Keep the progress stage on screen briefly after "ready" so it can finish
  // at 100% and fade out instead of vanishing when the clips arrive.
  useEffect(() => {
    if (!status) return;
    if (ACTIVE.has(status)) {
      setStageVisible(true);
      setStageLeaving(false);
      return;
    }
    if (status !== "ready") {
      setStageVisible(false);
      return;
    }
    const leave = window.setTimeout(() => setStageLeaving(true), 900);
    const hide = window.setTimeout(() => setStageVisible(false), 1400);
    return () => {
      window.clearTimeout(leave);
      window.clearTimeout(hide);
    };
  }, [status]);

  async function handleDeleteJob() {
    if (!job) return;
    if (!window.confirm(`Delete "${job.sourceTitle}"?`)) return;
    setDeleting(true);
    try {
      await deleteJob(job.id);
      toast.success(`Deleted "${job.sourceTitle}"`);
      router.push("/desk");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete project");
      setDeleting(false);
    }
  }


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
        setReconnecting(false);
        // A ready pack is usable while the Mind's follow-up is still queued, so poll for it slowly.
        const waitingFollowup = data.job.status === "ready" && !(data.followup ?? data.job.followup);
        if (ACTIVE.has(data.job.status)) {
          timer = setTimeout(() => void load(), 1500);
        } else if (waitingFollowup) {
          timer = setTimeout(() => void load(), 5000);
        }
      } catch (err) {
        if (cancelled) return;
        // A dropped connection or an API restart is not the pack's fault: keep the page and
        // keep asking until the API answers again, instead of stopping on "Failed to fetch".
        if (err instanceof ApiUnreachableError) {
          setReconnecting(true);
          timer = setTimeout(() => void load(), 3000);
          return;
        }
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
    toast.success(copyPackMessage(pack));
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
        {reconnecting && (
          <p className="text-xs text-[var(--fg-muted)] text-center" role="status">
            Can&apos;t reach the server. Retrying…
          </p>
        )}
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
  const analyzer = analyzerLabel(job.analyzer);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <nav className="flex min-w-0 items-center gap-2 text-[0.8125rem] text-[var(--fg-muted)]" aria-label="Breadcrumb">
          <Link href="/desk" className="inline-flex min-h-6 items-center hover:text-[var(--fg-bright)] transition-colors">
            Projects
          </Link>
          <span aria-hidden="true" className="text-[var(--fg-subtle)]">
            /
          </span>
          <span className="truncate text-[var(--fg-bright)]" aria-current="page">
            {job.sourceTitle || "Pack"}
          </span>
        </nav>
        {reconnecting && (
          <span className="inline-flex shrink-0 items-center gap-1.5 text-[0.8125rem] text-[var(--fg-muted)]" role="status">
            <IconRefresh className="h-3 w-3 animate-spin" aria-hidden="true" />
            Connection lost. Retrying…
          </span>
        )}
      </div>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-2.5">
          <h1 className="page-title">{job.sourceTitle}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-[var(--fg-muted)]">
            <span>
              {sourceTypeLabel(job.sourceType)} · <span className="timecode text-[0.8125rem]">{formatDuration(job.durationSec)}</span>
              {clips.length > 0 ? ` · ${clips.length} clips${draftCount ? ` + ${draftCount} drafts` : ""}` : ""}
            </span>
            <StatusPill value={packStatus(job.status, waitingCount, clips.length)} />
            {job.sourceUrl && (
              <a
                href={job.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 underline underline-offset-4 hover:text-[var(--fg-bright)]"
              >
                <span>Open on YouTube</span>
                <IconExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">

            {job.status === "failed" && (
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                disabled={retrying || deleting}
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
                <IconRefresh className={`h-3 w-3 ${retrying ? "animate-spin" : ""}`} aria-hidden="true" />
                <span>Retry</span>
              </button>
            )}

            <button
              type="button"
              className="btn btn-ghost btn-sm btn-danger-quiet"
              disabled={deleting}
              onClick={() => void handleDeleteJob()}
              title="Delete this project"
            >
              <span>{deleting ? "Deleting…" : "Delete"}</span>
            </button>
        </div>
      </header>

      {stageVisible ? <ProcessingStage job={job} leaving={stageLeaving} /> : null}

      {job.status === "failed" && job.error && (
        <div role="alert" className="alert alert-bad flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold mb-0.5">This pack stopped</p>
            <p>{job.error}</p>
          </div>
          <button
            type="button"
            className="btn btn-danger btn-xs whitespace-nowrap self-start"
            disabled={deleting}
            onClick={() => void handleDeleteJob()}
          >
            <IconTrash className="h-3 w-3" />
            <span>Delete pack</span>
          </button>
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

      {artifacts && packView !== "video" ? <ArtifactsPanel artifacts={artifacts} /> : null}

      {clips.length > 0 && packView === "copy" ? <ClipGrid clips={clips} lineage={lineage} onChange={setClips} /> : null}

      {artifacts && packView === "video" ? (
        <details className="disclosure">
          <summary className="panel px-5 py-4">
            <span className="flex items-center gap-2 min-w-0">
              <IconChevronRight className="disclosure-chevron h-3.5 w-3.5 text-[var(--fg-muted)]" aria-hidden="true" />
              <span>
                <span className="section-title block">4 text drafts</span>
                <span className="text-[0.8125rem] text-[var(--fg-muted)]">The script, carousel, thread and LinkedIn post</span>
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
            <h2 className="section-title">Downloads</h2>
            <p className="text-xs text-[var(--fg-muted)]">
              Approve a clip to mark it ready. Each file downloads on its own.
            </p>
          </div>
          <ul className="grid gap-2 text-xs text-[var(--fg-muted)] sm:grid-cols-3">
            {clips.map((clip) => (
              <li key={clip.id} className="cell p-3 space-y-1">
                <p className="font-medium text-[var(--fg)]">{clipPlatformLabel(clip.platform)}</p>
                <p>
                  {isClipReady(clip.status)
                    ? "Ready to paste"
                    : clip.status === "rejected"
                      ? "Not used"
                      : "Review first"}
                </p>
                {clip.videoUrl ? (
                  <a
                    href={clipDownloadUrl(clip) ?? clip.videoUrl}
                    download={clipFileName(clip)}
                    className="inline-flex min-h-6 items-center underline underline-offset-4"
                  >
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

      <div>
        <details className="disclosure panel">
          <summary className="px-1 py-[1.125rem]">
            <span className="flex items-center gap-2 min-w-0">
              <IconChevronRight className="disclosure-chevron h-3.5 w-3.5 text-[var(--fg-muted)]" aria-hidden="true" />
              <span>
                <span className="section-title block">Why these moments</span>
                <span className="text-[0.8125rem] text-[var(--fg-muted)]">
                  {analyzer ?? "How the clips and the style were chosen"}
                </span>
              </span>
            </span>
          </summary>
          <div className="px-1 pb-6 space-y-4 border-t border-[var(--border)] pt-5">
            <SelectionMethod analyzer={job.analyzer} status={job.status} />

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
                usedForPicks={job.analyzer !== "fallback"}
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
              className="inline-flex min-h-6 items-center text-[11px] text-[var(--fg-muted)] hover:text-[var(--fg)] timecode"
            >
              Copy pack ID
            </button>
          </div>
        </details>

        {(job.sourceVideoUrl || job.transcript) && (
          <details className="disclosure panel">
            <summary className="px-1 py-[1.125rem]">
              <span className="flex items-center gap-2 min-w-0">
                <IconChevronRight className="disclosure-chevron h-3.5 w-3.5 text-[var(--fg-muted)]" aria-hidden="true" />
                <span>
                  <span className="section-title block">Source and transcript</span>
                  <span className="text-[0.8125rem] text-[var(--fg-muted)]">The video and captions this pack came from</span>
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
                    aria-label="Source video"
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
