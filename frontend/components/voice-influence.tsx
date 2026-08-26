"use client";

import Link from "next/link";
import type { JobLineage, VoiceApplied } from "@frontend/lib/api";
import { platformLabel } from "@frontend/lib/format";

export function VoiceInfluence({
  steered,
  voiceApplied,
  lineage,
  currentJobId,
}: {
  steered: boolean;
  voiceApplied: VoiceApplied | null;
  lineage: JobLineage | null;
  currentJobId?: string;
}) {
  const rejects = voiceApplied?.rejectedReasons ?? [];
  const notes = (voiceApplied?.notes ?? []).slice(0, 4);

  return (
    <section className="glass p-5 sm:p-6 space-y-4 rounded-[var(--radius-xl)]">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="timecode text-[11px] text-[var(--fg-muted)]">Voice applied to this job</p>
          <h2 className="text-sm font-semibold text-[var(--fg)]">
            {steered ? "The Mind was steered by your prior reviews" : "No prior voice yet"}
          </h2>
          <p className="text-xs text-[var(--fg-muted)] leading-relaxed max-w-2xl">
            {steered
              ? "These standing notes were injected into the Mind before it proposed packages."
              : "Approve, edit, or reject these clips. The next job will show what changed."}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {lineage?.previousJobId && currentJobId ? (
            <Link
              href={`/jobs/compare?a=${lineage.previousJobId}&b=${currentJobId}`}
              className="btn btn-ghost btn-xs"
            >
              Compare jobs
            </Link>
          ) : null}
          <Link href="/voice" className="btn btn-ghost btn-xs">
            Voice memory
          </Link>
        </div>
      </div>

      {steered && (rejects.length > 0 || notes.length > 0) && (
        <ul className="grid gap-2 sm:grid-cols-2 text-xs">
          {rejects.slice(0, 4).map((reason) => (
            <li key={reason} className="rounded-lg border border-[var(--border)] p-3 text-[var(--fg)]">
              <span className="timecode text-[10px] text-rose-600 dark:text-rose-400 block mb-1">Avoid</span>
              {reason}
            </li>
          ))}
          {notes.map((note) => (
            <li key={note} className="rounded-lg border border-[var(--border)] p-3 text-[var(--fg-muted)]">
              {note}
            </li>
          ))}
        </ul>
      )}

      {lineage && !lineage.firstJob && lineage.platforms.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-[var(--border)]">
          <p className="text-xs text-[var(--fg-muted)]">
            Compared with{" "}
            {lineage.previousJobId ? (
              <Link
                href={`/jobs/compare?a=${lineage.previousJobId}&b=${encodeURIComponent(currentJobId ?? "")}`}
                className="underline underline-offset-4 hover:text-[var(--fg)]"
              >
                {lineage.previousTitle || "previous job"}
              </Link>
            ) : (
              "previous job"
            )}
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {lineage.platforms.map((row) => (
              <article key={row.platform} className="rounded-lg bg-[var(--bg-card)] border border-[var(--border)] p-3 space-y-1.5">
                <p className="timecode text-[10px] text-[var(--fg-muted)]">{platformLabel(row.platform)}</p>
                {row.first ? (
                  <p className="text-xs text-[var(--fg-muted)]">No earlier clip on this platform.</p>
                ) : (
                  <>
                    <p className="text-xs text-[var(--fg)] leading-relaxed">{row.currentHook}</p>
                    <p className="text-[11px] text-[var(--fg-muted)] leading-relaxed">
                      Last time: {row.previousHook}
                      {row.previousStatus === "rejected" ? " (rejected)" : ""}
                      {row.previousNote ? ` — ${row.previousNote}` : ""}
                    </p>
                    {row.changed ? (
                      <p className="timecode text-[10px] text-orange-600 dark:text-orange-400">Hook changed</p>
                    ) : null}
                  </>
                )}
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
