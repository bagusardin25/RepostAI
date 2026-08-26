"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { getVoice, type VoicePayload } from "@frontend/lib/api";
import { formatRelative } from "@frontend/lib/format";
import { PlatformMark } from "@frontend/components/platform-mark";
import { StatusPill } from "@frontend/components/status-pill";
import { useToast } from "@frontend/components/toast";
import {
  IconDownload,
  IconExternalLink,
} from "@frontend/components/icons";

type ActionFilter = "all" | "approve" | "edit" | "reject";
type PlatformFilter = "all" | "tiktok" | "instagram" | "x";

export default function VoicePage() {
  const toast = useToast();
  const [data, setData] = useState<VoicePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<ActionFilter>("all");
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");

  useEffect(() => {
    getVoice()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load voice memory"));
  }, []);

  function exportMemoryJson() {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `repostai-voice-memory-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported JSON");
  }

  const filteredEdits = useMemo(() => {
    if (!data?.edits) return [];
    return data.edits.filter((edit) => {
      if (actionFilter !== "all" && edit.action !== actionFilter) return false;
      if (platformFilter !== "all" && edit.platform !== platformFilter) return false;
      return true;
    });
  }, [data?.edits, actionFilter, platformFilter]);

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

  if (!data) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="skel h-20 rounded-xl" />
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="skel h-20 rounded-lg" />
          <div className="skel h-20 rounded-lg" />
          <div className="skel h-20 rounded-lg" />
          <div className="skel h-20 rounded-lg" />
        </div>
        <div className="skel h-64 rounded-xl" />
      </div>
    );
  }

  const isEmpty =
    data.memory.notes.length === 0 &&
    data.edits.length === 0 &&
    data.memory.rejectedReasons.length === 0 &&
    Object.keys(data.memory.platformNotes).length === 0;

  const totalDecisions = data.edits.length;
  const avoidCount = data.memory.rejectedReasons.length;
  const standingNotesCount = data.memory.notes.length;
  const platformCount = Object.keys(data.memory.platformNotes).length;
  const score = data.score ?? data.memory.score ?? null;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[var(--border)] pb-5">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[var(--fg-bright)]">
            What the Mind Remembers
          </h1>
          <p className="text-xs sm:text-sm text-[var(--fg-muted)] leading-relaxed">
            Standing rules from your reviews are injected into the next Mind proposal. Open a later job to see hooks change against the previous package.
          </p>
        </div>

        {!isEmpty && (
          <button
            type="button"
            onClick={exportMemoryJson}
            className="btn btn-ghost btn-xs text-[var(--fg-muted)] hover:text-[var(--fg)]"
          >
            <IconDownload className="h-3 w-3" />
            <span>Export JSON</span>
          </button>
        )}
      </header>

      {score && (
        <section className="panel p-5 sm:p-6 space-y-3">
          <div className="flex items-end justify-between gap-4">
            <div className="space-y-1">
              <p className="timecode text-[11px] text-[var(--fg-muted)]">Voice consistency</p>
              <h2 className="text-lg font-semibold text-[var(--fg-bright)]">{score.label}</h2>
              <p className="text-xs text-[var(--fg-muted)] leading-relaxed max-w-xl">{score.detail}</p>
            </div>
            <p className="text-3xl font-semibold tabular-nums text-[var(--fg)]">
              {score.score == null ? "—" : score.score.toFixed(1)}
              <span className="text-sm text-[var(--fg-muted)] font-normal"> / {score.max}</span>
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs text-[var(--fg-muted)]">
            <p>Approve {Math.round(score.approveRate * 100)}%</p>
            <p>Edit {Math.round(score.editRate * 100)}%</p>
            <p>Reject {Math.round(score.rejectRate * 100)}%</p>
          </div>
        </section>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="panel p-4 space-y-1">
          <p className="timecode text-[11px] text-[var(--fg-muted)]">Decisions</p>
          <p className="text-xl font-semibold text-[var(--fg)]">{totalDecisions}</p>
        </div>

        <div className="panel p-4 space-y-1">
          <p className="timecode text-[11px] text-[var(--fg-muted)]">Style Guidelines</p>
          <p className="text-xl font-semibold text-[var(--fg)]">{standingNotesCount}</p>
        </div>

        <div className="panel p-4 space-y-1">
          <p className="timecode text-[11px] text-[var(--fg-muted)]">Negative Constraints</p>
          <p className="text-xl font-semibold text-[var(--fg)]">{avoidCount}</p>
        </div>

        <div className="panel p-4 space-y-1">
          <p className="timecode text-[11px] text-[var(--fg-muted)]">Profiles</p>
          <p className="text-xl font-semibold text-[var(--fg)]">{platformCount || 3}</p>
        </div>
      </div>

      {/* Empty State */}
      {isEmpty && (
        <div className="panel p-10 text-center space-y-3">
          <p className="text-sm font-medium text-[var(--fg)]">No memory recorded yet</p>
          <p className="text-xs text-[var(--fg-muted)] max-w-sm mx-auto">
            When you edit a caption or reject a clip on the desk, the Mind records your style preference here.
          </p>
          <Link href="/" className="btn btn-primary btn-xs">
            Open Desk
          </Link>
        </div>
      )}

      {/* Section 1: Standing Guidelines */}
      {data.memory.notes.length > 0 && (
        <section className="space-y-2.5">
          <h2 className="text-xs font-semibold text-[var(--fg)] uppercase tracking-wider timecode">
            Style Guidelines
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {data.memory.notes.map((note) => (
              <div
                key={note}
                className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-xs text-[var(--fg)] leading-relaxed"
              >
                {note}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Section 2: Negative Constraints */}
      {data.memory.rejectedReasons.length > 0 && (
        <section className="space-y-2.5">
          <h2 className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider timecode">
            Avoid Patterns (Negative Constraints)
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {data.memory.rejectedReasons.map((reason) => {
              const impact = data.reasonImpacts?.find((item) => item.reason === reason);
              return (
                <div
                  key={reason}
                  className="p-3 rounded-lg border border-rose-500/20 bg-rose-500/5 text-xs text-rose-700 dark:text-rose-300 leading-relaxed space-y-2"
                >
                  <p>{reason}</p>
                  <LaterJobs jobs={impact?.laterJobs} />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {data.memory.preferredHooks && data.memory.preferredHooks.length > 0 && (
        <section className="space-y-2.5">
          <h2 className="text-xs font-semibold text-[var(--fg)] uppercase tracking-wider timecode">
            Preferred hooks
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {data.memory.preferredHooks.map((hook) => (
              <div
                key={hook}
                className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-xs text-[var(--fg)] leading-relaxed"
              >
                {hook}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Section 3: Platform Profiles */}
      {Object.entries(data.memory.platformNotes).length > 0 && (
        <section className="space-y-2.5">
          <h2 className="text-xs font-semibold text-[var(--fg)] uppercase tracking-wider timecode">
            Per-Platform Profiles
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {Object.entries(data.memory.platformNotes).map(([platform, notes]) => (
              <article
                key={platform}
                className="p-3.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] space-y-2.5"
              >
                <PlatformMark platform={platform} detail />
                <ul className="space-y-1.5 pt-2 border-t border-[var(--border)] text-xs text-[var(--fg-muted)]">
                  {(notes ?? []).map((note) => (
                    <li key={note} className="leading-relaxed">
                      • {note}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Section 4: Decision Audit Ledger */}
      {data.edits.length > 0 && (
        <section className="space-y-3 pt-4 border-t border-[var(--border)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <h2 className="text-xs font-semibold text-[var(--fg)] uppercase tracking-wider timecode">
              Decision Ledger
            </h2>

            {/* Filter controls */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActionFilter("all")}
                className={`px-2.5 py-1 rounded transition-colors ${
                  actionFilter === "all" ? "text-[var(--fg)] bg-[var(--border)] font-medium" : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setActionFilter("approve")}
                className={`px-2.5 py-1 rounded transition-colors ${
                  actionFilter === "approve" ? "text-[var(--fg)] bg-[var(--border)] font-medium" : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
                }`}
              >
                Approved
              </button>
              <button
                type="button"
                onClick={() => setActionFilter("edit")}
                className={`px-2.5 py-1 rounded transition-colors ${
                  actionFilter === "edit" ? "text-[var(--fg)] bg-[var(--border)] font-medium" : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
                }`}
              >
                Edited
              </button>
              <button
                type="button"
                onClick={() => setActionFilter("reject")}
                className={`px-2.5 py-1 rounded transition-colors ${
                  actionFilter === "reject" ? "text-[var(--fg)] bg-[var(--border)] font-medium" : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
                }`}
              >
                Rejected
              </button>
            </div>
          </div>

          <div className="panel divide-y divide-[var(--border)] rounded-xl overflow-hidden">
            {filteredEdits.length === 0 ? (
              <p className="p-6 text-center text-xs text-[var(--fg-muted)]">
                No decisions match this filter.
              </p>
            ) : (
              filteredEdits.map((edit) => (
                <div key={edit.id} className="p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-[var(--fg-muted)] timecode">
                      <PlatformMark platform={edit.platform} compact />
                      <span>·</span>
                      <span>{formatRelative(edit.createdAt)}</span>
                    </div>

                    <StatusPill
                      value={
                        edit.action === "edit"
                          ? "edited"
                          : edit.action === "approve"
                            ? "approved"
                            : "rejected"
                      }
                    />
                  </div>

                  {edit.note && (
                    <p className="text-[var(--fg)]">
                      <span className="text-[var(--fg-muted)] font-medium">Note:</span> &ldquo;{edit.note}&rdquo;
                    </p>
                  )}

                  {edit.editedCaption ? (
                    <div className="p-2.5 rounded bg-[var(--bg-card)] border border-[var(--border)] text-[var(--fg)]">
                      <span className="timecode text-[10px] text-[var(--fg-muted)] block mb-0.5">Rewritten caption:</span>
                      <p className="leading-relaxed">{edit.editedCaption}</p>
                    </div>
                  ) : (
                    <p className="text-[var(--fg-muted)] italic">&ldquo;{edit.originalCaption}&rdquo;</p>
                  )}

                  <div className="flex flex-wrap items-center gap-3">
                  {edit.jobId && (
                    <Link
                      href={`/jobs/${edit.jobId}`}
                      className="inline-flex items-center gap-1 text-[11px] text-[var(--fg-muted)] hover:text-[var(--fg)] underline underline-offset-4"
                    >
                      <span>Source job {edit.jobId.slice(0, 8)}</span>
                      <IconExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                  <LaterJobs jobs={edit.laterJobs} />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function LaterJobs({
  jobs,
}: {
  jobs?: Array<{ id: string; sourceTitle: string }>;
}) {
  if (!jobs || jobs.length === 0) {
    return <p className="text-[11px] text-[var(--fg-muted)]">No later job yet — run a new one to see this rule apply.</p>;
  }
  return (
    <p className="text-[11px] text-[var(--fg-muted)]">
      Steered{" "}
      {jobs.map((job, index) => (
        <span key={job.id}>
          {index > 0 ? ", " : ""}
          <Link href={`/jobs/${job.id}`} className="underline underline-offset-4 hover:text-[var(--fg)]">
            {job.sourceTitle.slice(0, 40)}
          </Link>
        </span>
      ))}
    </p>
  );
}
