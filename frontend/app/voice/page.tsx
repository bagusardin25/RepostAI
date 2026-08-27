"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { getVoice, type VoicePayload } from "@frontend/lib/api";
import { formatRelative } from "@frontend/lib/format";
import { PlatformMark } from "@frontend/components/platform-mark";
import { StatusPill } from "@frontend/components/status-pill";
import { PageHeader } from "@frontend/components/page-header";
import { useToast } from "@frontend/components/toast";
import {
  IconChevronRight,
  IconDownload,
  IconExternalLink,
} from "@frontend/components/icons";

type ActionFilter = "all" | "approve" | "edit" | "reject";

export default function VoicePage() {
  const toast = useToast();
  const [data, setData] = useState<VoicePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<ActionFilter>("all");

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
    return data.edits.filter((edit) => actionFilter === "all" || edit.action === actionFilter);
  }, [data?.edits, actionFilter]);

  if (error) {
    return (
      <div className="panel p-8 text-center space-y-4 max-w-md mx-auto">
        <p className="text-xs text-bad" role="alert">{error}</p>
        <Link href="/desk" className="btn btn-ghost btn-sm">
          Back to desk
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-8 max-w-3xl mx-auto" aria-busy="true">
        <PageHeader
          kicker="Style"
          title="Your posting style"
          lede="What we learned from your reviews. The next pack follows this."
        />
        <div className="skel h-40 rounded-[var(--radius-xl)]" />
        <div className="skel h-40 rounded-[var(--radius-xl)]" />
      </div>
    );
  }

  const keep = [
    ...data.memory.notes,
    ...(data.memory.preferredHooks ?? []).map((hook) => `Hook that worked: ${hook}`),
  ];
  const stop = data.memory.rejectedReasons;
  const platformNotes = Object.entries(data.memory.platformNotes).filter(([, notes]) => (notes ?? []).length > 0);
  const isEmpty = keep.length === 0 && stop.length === 0 && platformNotes.length === 0 && data.edits.length === 0;
  const score = data.score ?? data.memory.score ?? null;

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <PageHeader
        kicker="Style"
        title="Your posting style"
        lede="What we learned from your reviews. Approving and editing clips on the desk already teaches the next pack."
        actions={
          <Link href="/desk" className="btn btn-primary btn-sm">
            Back to desk
          </Link>
        }
      />

      {isEmpty ? (
        <section className="panel p-8 sm:p-10 text-center space-y-3">
          <h2 className="section-title">Nothing learned yet</h2>
          <p className="text-xs text-[var(--fg-muted)] max-w-sm mx-auto leading-relaxed">
            Review a content pack — approve, rewrite, or skip. Those choices show up here and steer the next clips.
          </p>
          <Link href="/desk" className="btn btn-primary btn-sm">
            Review a pack
          </Link>
        </section>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <section className="panel p-5 space-y-3">
            <div>
              <p className="timecode text-[11px] text-[var(--ok)]">Keep doing</p>
              <h2 className="section-title">The next pack will lean this way</h2>
            </div>
            {keep.length === 0 ? (
              <p className="text-xs text-[var(--fg-muted)] leading-relaxed">
                No keep-rules yet. Approve or save an edit on the desk.
              </p>
            ) : (
              <ul className="space-y-2">
                {keep.map((note) => (
                  <li key={note} className="cell p-3 text-xs text-[var(--fg)] leading-relaxed">
                    {note}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel p-5 space-y-3">
            <div>
              <p className="timecode text-[11px] text-bad">Stop doing</p>
              <h2 className="section-title">These patterns get skipped</h2>
            </div>
            {stop.length === 0 ? (
              <p className="text-xs text-[var(--fg-muted)] leading-relaxed">
                No avoid-rules yet. Reject a clip with a note if something should not come back.
              </p>
            ) : (
              <ul className="space-y-2">
                {stop.map((reason) => {
                  const impact = data.reasonImpacts?.find((item) => item.reason === reason);
                  return (
                    <li key={reason} className="cell p-3 text-xs text-[var(--fg)] leading-relaxed space-y-1.5">
                      <p>{reason}</p>
                      <LaterJobs jobs={impact?.laterJobs} />
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}

      {platformNotes.length > 0 && (
        <section className="space-y-2">
          <h2 className="section-title">On each platform</h2>
          <div className="grid gap-2 sm:grid-cols-3">
            {platformNotes.map(([platform, notes]) => (
              <article key={platform} className="cell p-3.5 space-y-2">
                <PlatformMark platform={platform} detail />
                <ul className="space-y-1.5 pt-2 border-t border-[var(--border)] text-xs text-[var(--fg-muted)]">
                  {(notes ?? []).map((note) => (
                    <li key={note} className="leading-relaxed">
                      {note}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      )}

      {data.edits.length > 0 && (
        <details className="disclosure panel">
          <summary className="px-5 py-4">
            <span className="flex items-center gap-2 min-w-0">
              <IconChevronRight className="disclosure-chevron h-3.5 w-3.5 text-[var(--fg-muted)]" aria-hidden="true" />
              <span>
                <span className="section-title block">Review history</span>
                <span className="text-xs text-[var(--fg-muted)]">{data.edits.length} decisions from the desk</span>
              </span>
            </span>
          </summary>
          <div className="px-4 pb-4 space-y-3 border-t border-[var(--border)] pt-3">
            <div className="seg">
              {(["all", "approve", "edit", "reject"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActionFilter(key)}
                  className={`seg-item ${actionFilter === key ? "is-active" : ""}`}
                >
                  {key === "all" ? "All" : key === "approve" ? "Approved" : key === "edit" ? "Edited" : "Rejected"}
                </button>
              ))}
            </div>

            <div className="divide-y divide-[var(--border)] rounded-xl overflow-hidden cell">
              {filteredEdits.length === 0 ? (
                <p className="p-6 text-center text-xs text-[var(--fg-muted)]">No decisions match this filter.</p>
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
                          edit.action === "edit" ? "edited" : edit.action === "approve" ? "approved" : "rejected"
                        }
                      />
                    </div>
                    {edit.note && (
                      <p className="text-[var(--fg)]">
                        <span className="text-[var(--fg-muted)]">Note: </span>
                        {edit.note}
                      </p>
                    )}
                    {edit.editedCaption ? (
                      <p className="leading-relaxed text-[var(--fg)]">{edit.editedCaption}</p>
                    ) : (
                      <p className="text-[var(--fg-muted)] leading-relaxed">{edit.originalCaption}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-3">
                      {edit.jobId && (
                        <Link
                          href={`/jobs/${edit.jobId}`}
                          className="inline-flex items-center gap-1 text-[11px] text-[var(--fg-muted)] hover:text-[var(--fg)] underline underline-offset-4"
                        >
                          <span>Open pack</span>
                          <IconExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                      <LaterJobs jobs={edit.laterJobs} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </details>
      )}

      {(score || !isEmpty) && (
        <details className="disclosure panel">
          <summary className="px-5 py-4">
            <span className="flex items-center gap-2 min-w-0">
              <IconChevronRight className="disclosure-chevron h-3.5 w-3.5 text-[var(--fg-muted)]" aria-hidden="true" />
              <span>
                <span className="section-title block">How this is measured</span>
                <span className="text-xs text-[var(--fg-muted)]">Score and export — not needed to review clips</span>
              </span>
            </span>
          </summary>
          <div className="px-5 pb-5 space-y-3 border-t border-[var(--border)] pt-4">
            {score && (
              <div className="space-y-2">
                <p className="text-sm text-[var(--fg)]">
                  {score.label}
                  {score.score != null ? ` · ${score.score.toFixed(1)} / ${score.max}` : ""}
                </p>
                <p className="text-xs text-[var(--fg-muted)] leading-relaxed">{score.detail}</p>
                <p className="text-xs text-[var(--fg-muted)]">
                  Approved {Math.round(score.approveRate * 100)}% · Edited {Math.round(score.editRate * 100)}% ·
                  Rejected {Math.round(score.rejectRate * 100)}%
                </p>
              </div>
            )}
            <button type="button" onClick={exportMemoryJson} className="btn btn-ghost btn-xs">
              <IconDownload className="h-3 w-3" />
              <span>Export JSON</span>
            </button>
          </div>
        </details>
      )}
    </div>
  );
}

function LaterJobs({
  jobs,
}: {
  jobs?: Array<{ id: string; sourceTitle: string }>;
}) {
  if (!jobs || jobs.length === 0) return null;
  return (
    <p className="text-[11px] text-[var(--fg-muted)]">
      Used on{" "}
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
