"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  formatTimecode,
  getJobCompare,
  listJobs,
  type JobComparePayload,
  type JobSummary,
} from "@frontend/lib/api";
import { formatDuration, platformLabel } from "@frontend/lib/format";
import { PlatformMark } from "@frontend/components/platform-mark";
import { StatusPill } from "@frontend/components/status-pill";

export function JobCompare() {
  const router = useRouter();
  const params = useSearchParams();
  const a = params.get("a") ?? "";
  const b = params.get("b") ?? "";

  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [leftId, setLeftId] = useState(a);
  const [rightId, setRightId] = useState(b);
  const [data, setData] = useState<JobComparePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listJobs()
      .then((payload) => setJobs(payload.jobs))
      .catch(() => setJobs([]));
  }, []);

  useEffect(() => {
    setLeftId(a);
    setRightId(b);
  }, [a, b]);

  useEffect(() => {
    if (!a || !b || a === b) {
      setData(null);
      return;
    }
    let cancelled = false;
    setBusy(true);
    getJobCompare(a, b)
      .then((payload) => {
        if (cancelled) return;
        setData(payload);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setData(null);
        setError(err instanceof Error ? err.message : "Could not compare jobs");
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [a, b]);

  const readyJobs = useMemo(
    () => jobs.filter((job) => job.status === "ready" || (job.clipCount ?? 0) > 0),
    [jobs],
  );

  function applyPair(nextA: string, nextB: string) {
    const query = new URLSearchParams();
    if (nextA) query.set("a", nextA);
    if (nextB) query.set("b", nextB);
    router.replace(`/jobs/compare?${query.toString()}`);
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <nav className="flex items-center gap-1.5 text-xs text-[var(--fg-muted)]" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-[var(--fg)]">
          Desk
        </Link>
        <span>/</span>
        <span className="text-[var(--fg)] font-medium">Compare jobs</span>
      </nav>

      <header className="space-y-2">
        <p className="kicker">Persistence</p>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[var(--fg-bright)]">
          What changed after you taught the Mind
        </h1>
        <p className="text-sm text-[var(--fg-muted)] max-w-2xl leading-relaxed">
          Earlier job on the left, later job on the right. Reviews on the left are what steered the packages on the right.
        </p>
      </header>

      <div className="panel p-4 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
        <JobSelect
          label="Earlier"
          value={leftId}
          jobs={readyJobs}
          exclude={rightId}
          onChange={(id) => {
            setLeftId(id);
            applyPair(id, rightId);
          }}
        />
        <p className="timecode text-[11px] text-[var(--fg-muted)] text-center pb-2 hidden sm:block">then</p>
        <JobSelect
          label="Later"
          value={rightId}
          jobs={readyJobs}
          exclude={leftId}
          onChange={(id) => {
            setRightId(id);
            applyPair(leftId, id);
          }}
        />
      </div>

      {!a || !b ? (
        <p className="text-sm text-[var(--fg-muted)]">Pick two jobs to see hook, caption, and window changes.</p>
      ) : a === b ? (
        <p className="text-sm text-[var(--fg-muted)]">Pick two different jobs.</p>
      ) : busy && !data ? (
        <div className="skel h-80 rounded-xl" aria-busy="true" />
      ) : error ? (
        <p className="text-xs text-rose-500" role="alert">
          {error}
        </p>
      ) : data ? (
        <CompareResult data={data} />
      ) : null}
    </div>
  );
}

function JobSelect({
  label,
  value,
  jobs,
  exclude,
  onChange,
}: {
  label: string;
  value: string;
  jobs: JobSummary[];
  exclude: string;
  onChange: (id: string) => void;
}) {
  return (
    <label className="space-y-1 text-xs">
      <span className="timecode text-[var(--fg-muted)]">{label}</span>
      <select
        className="field h-10 text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Select a job</option>
        {jobs.map((job) => (
          <option key={job.id} value={job.id} disabled={job.id === exclude}>
            {job.sourceTitle.slice(0, 72)}
          </option>
        ))}
      </select>
    </label>
  );
}

function CompareResult({ data }: { data: JobComparePayload }) {
  const { earlier, later, packages, teaching, changedCount, voiceSteered } = data;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <JobMeta job={earlier.job} href={`/jobs/${earlier.job.id}`} side="Earlier" />
        <JobMeta job={later.job} href={`/jobs/${later.job.id}`} side="Later" />
      </div>

      <section className="panel p-5 space-y-3">
        <p className="timecode text-[11px] text-[var(--fg-muted)]">Teaching from the earlier job</p>
        {teaching.length === 0 ? (
          <p className="text-xs text-[var(--fg-muted)]">
            No approve / edit / reject on the earlier job yet. Review those clips to steer the next one.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-3 text-xs">
            {teaching.map((edit) => (
              <li key={edit.id} className="rounded-lg border border-[var(--border)] p-3 space-y-1">
                <p className="font-medium text-[var(--fg)]">
                  {platformLabel(edit.platform)} · {edit.action}
                </p>
                {edit.note ? <p className="text-[var(--fg-muted)]">{edit.note}</p> : null}
                {edit.action === "edit" && edit.editedCaption ? (
                  <p className="text-[var(--fg-muted)] line-clamp-3">{edit.editedCaption}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-[var(--fg-muted)]">
          {changedCount} platform{changedCount === 1 ? "" : "s"} changed
          {voiceSteered ? " · later job loaded standing voice" : ""}.
        </p>
      </section>

      <div className="space-y-4">
        {packages.map((row) => (
          <article key={row.platform} className="panel overflow-hidden">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
              <PlatformMark platform={row.platform} />
              <div className="flex flex-wrap gap-2 timecode text-[10px] text-[var(--fg-muted)]">
                {row.taughtBy ? <span className="text-orange-600 dark:text-orange-400">Taught by {row.taughtBy}</span> : null}
                {row.hookChanged ? <span>Hook changed</span> : null}
                {row.captionChanged ? <span>Caption changed</span> : null}
                {row.windowChanged ? <span>Window changed</span> : null}
              </div>
            </header>
            <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[var(--border)]">
              <Side clip={row.left} empty="No clip on the earlier job" />
              <Side clip={row.right} empty="No clip on the later job" />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function JobMeta({
  job,
  href,
  side,
}: {
  job: JobComparePayload["earlier"]["job"];
  href: string;
  side: string;
}) {
  return (
    <div className="panel p-4 space-y-1">
      <p className="timecode text-[11px] text-[var(--fg-muted)]">{side}</p>
      <Link href={href} className="text-sm font-semibold text-[var(--fg)] hover:underline underline-offset-4">
        {job.sourceTitle}
      </Link>
      <p className="text-xs text-[var(--fg-muted)]">
        {job.analyzer === "minds" ? "Mind" : job.analyzer === "fallback" ? "Fallback" : "Job"} · {formatDuration(job.durationSec)}
      </p>
    </div>
  );
}

function Side({
  clip,
  empty,
}: {
  clip: JobComparePayload["packages"][number]["left"];
  empty: string;
}) {
  if (!clip) {
    return <div className="p-4 text-xs text-[var(--fg-muted)]">{empty}</div>;
  }
  return (
    <div className="p-4 space-y-3">
      {clip.videoUrl ? (
        <video className="w-full max-h-56 rounded-lg bg-black object-contain" src={clip.videoUrl} controls playsInline preload="metadata" />
      ) : null}
      <div className="flex items-center justify-between gap-2">
        {clip.status ? <StatusPill value={clip.status} /> : null}
        {clip.startSec != null && clip.endSec != null ? (
          <span className="timecode text-[11px] text-[var(--fg-muted)]">
            {formatTimecode(clip.startSec)}–{formatTimecode(clip.endSec)}
          </span>
        ) : null}
      </div>
      <p className="text-sm text-[var(--fg)] leading-relaxed">{clip.hook || "—"}</p>
      <p className="text-xs text-[var(--fg-muted)] leading-relaxed line-clamp-5">{clip.caption || "—"}</p>
      {clip.reason ? (
        <p className="text-[11px] text-[var(--fg-muted)] leading-relaxed">
          Mind: {clip.reason}
        </p>
      ) : null}
      {clip.reviewNote ? (
        <p className="text-[11px] text-orange-700 dark:text-orange-300">Note: {clip.reviewNote}</p>
      ) : null}
    </div>
  );
}
