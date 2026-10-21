"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { listJobs, deleteJob, type JobSummary } from "@frontend/lib/api";
import { formatDuration, formatRelative, packStatus, sourceTypeLabel } from "@frontend/lib/format";
import { snapshotFrom, stepHeadline, useSmoothProgress } from "@frontend/lib/progress";
import { StatusPill } from "@frontend/components/status-pill";
import { useToast } from "@frontend/components/toast";
import { IconChevronRight, IconRefresh, IconSearch, IconTrash } from "@frontend/components/icons";

const ACTIVE = new Set(["queued", "fetching_source", "analyzing", "clipping"]);

type FilterTab = "all" | "active" | "review" | "done";

const TABS: Array<{ key: FilterTab; label: string }> = [
  { key: "all", label: "All" },
  { key: "review", label: "To review" },
  { key: "active", label: "Running" },
  { key: "done", label: "Reviewed" },
];

const LOAD_ERROR = "Couldn't load projects. Check the connection and retry.";

export function JobList({ titleId }: { titleId?: string }) {
  const toast = useToast();
  const [jobs, setJobs] = useState<JobSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(e: React.MouseEvent, jobId: string, title: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Delete "${title}"? Its clips and drafts go too.`)) return;
    setDeletingId(jobId);
    try {
      await deleteJob(jobId);
      setJobs((prev) => (prev ? prev.filter((j) => j.id !== jobId) : null));
      toast.success(`Deleted "${title}"`);
    } catch {
      toast.error("Couldn't delete this project. Try again.");
    } finally {
      setDeletingId(null);
    }
  }

  async function load(quiet = false) {
    if (!quiet) setIsRefreshing(true);
    try {
      const data = await listJobs();
      setJobs(data.jobs);
      setError(null);
    } catch {
      setError(LOAD_ERROR);
    } finally {
      if (!quiet) setIsRefreshing(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const data = await listJobs();
        if (cancelled) return;
        setJobs(data.jobs);
        setError(null);
        if (data.jobs.some((job) => ACTIVE.has(job.status))) {
          timer = setTimeout(() => void poll(), 2000);
        }
      } catch {
        if (cancelled) return;
        setError(LOAD_ERROR);
      }
    }

    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  const counts = useMemo<Record<FilterTab, number>>(() => {
    if (!jobs) return { all: 0, active: 0, review: 0, done: 0 };
    return {
      all: jobs.length,
      active: jobs.filter((j) => ACTIVE.has(j.status)).length,
      review: jobs.filter((j) => (j.pendingReview ?? 0) > 0).length,
      done: jobs.filter((j) => j.status === "ready" && (j.pendingReview ?? 0) === 0).length,
    };
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    if (!jobs) return [];
    return jobs.filter((job) => {
      if (filter === "active" && !ACTIVE.has(job.status)) return false;
      if (filter === "review" && (job.pendingReview ?? 0) === 0) return false;
      if (filter === "done" && (job.status !== "ready" || (job.pendingReview ?? 0) > 0)) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        return job.sourceTitle.toLowerCase().includes(q) || job.id.toLowerCase().includes(q);
      }
      return true;
    });
  }, [jobs, filter, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id={titleId} className="font-display text-[1.375rem] font-semibold tracking-[-0.015em]">
          Projects
        </h2>
        {jobs && jobs.length > 0 ? (
          <div className="seg flex-nowrap overflow-x-auto max-w-full [&>button]:shrink-0" aria-label="Filter projects">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                aria-pressed={filter === tab.key}
                className={`seg-item gap-1.5 ${filter === tab.key ? "is-active" : ""}`}
              >
                {tab.label}
                <span className="font-normal text-[var(--fg-subtle)] tabular-nums">{counts[tab.key]}</span>
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex w-full items-center gap-2 min-w-0 sm:ml-auto sm:w-auto">
          <div className="relative min-w-0 flex-1 sm:flex-none">
            <IconSearch
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--fg-subtle)]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search titles"
              aria-label="Search projects"
              className="field field-icon h-10 min-h-10 w-full text-[0.8125rem] sm:w-52"
            />
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={isRefreshing}
            className="btn btn-ghost h-10 w-10 px-0"
            title="Refresh"
            aria-label="Refresh projects"
          >
            <IconRefresh className={`h-[15px] w-[15px] ${isRefreshing ? "animate-spin" : ""}`} aria-hidden="true" />
          </button>
          {jobs && jobs.length >= 2 ? (
            <Link href="/jobs/compare" className="btn btn-ghost h-10">
              Compare
            </Link>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="panel p-6 text-center space-y-3">
          <p className="text-sm text-bad" role="alert">
            {error}
          </p>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void load()}>
            Retry
          </button>
        </div>
      ) : !jobs ? (
        <div className="space-y-2" aria-busy="true" aria-label="Loading projects">
          {Array.from({ length: 2 }, (_, index) => (
            <div key={index} className="skel h-[4.5rem] rounded-xl" />
          ))}
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="panel-dashed p-8 text-center text-sm text-[var(--fg-muted)] animate-fade-in-up">
          <p>{jobs.length === 0 ? "No projects yet. Packs you start show up here." : "Nothing in this tab."}</p>
        </div>
      ) : (
        <div key={filter} className="panel divide-y divide-[var(--border)] overflow-hidden rounded-xl animate-fade-in-up">
          {filteredJobs.map((job) => {
            const pending = job.pendingReview ?? 0;
            const active = ACTIVE.has(job.status);

            return (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="group flex flex-col gap-3 px-4 py-4 transition-colors duration-200 hover:bg-[var(--bg-card-hover)] sm:flex-row sm:items-center sm:gap-4 sm:px-5"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.9375rem] font-medium text-[var(--fg-bright)]">
                    {job.sourceTitle}
                  </span>
                  <span className="mt-0.5 block text-[0.8125rem] text-[var(--fg-muted)]">
                    {sourceTypeLabel(job.sourceType)} ·{" "}
                    <span className="timecode text-xs">{formatDuration(job.durationSec)}</span> ·{" "}
                    {active
                      ? stepHeadline(job.status, job.progress)
                      : `${job.clipCount ?? 0} clips · ${formatRelative(job.createdAt)}`}
                  </span>
                </span>

                <span className="flex items-center gap-3 self-start sm:self-center">
                  {active ? <LiveBar job={job} /> : null}
                  {pending > 0 ? (
                    <span className="text-[0.8125rem] font-semibold text-[var(--live-fg)]">{pending} to review</span>
                  ) : null}
                  {pending > 0 ? null : (
                    <StatusPill value={packStatus(job.status, job.pendingReview ?? 0, job.clipCount ?? 0)} />
                  )}
                  <button
                    type="button"
                    onClick={(e) => void handleDelete(e, job.id, job.sourceTitle)}
                    disabled={deletingId === job.id}
                    className="icon-btn h-9 w-9 hover:!text-[var(--bad)] hover:!bg-[var(--bad-bg)] opacity-80 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100"
                    title="Delete project"
                    aria-label={`Delete project ${job.sourceTitle}`}
                  >
                    <IconTrash className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <IconChevronRight
                    className="hidden h-4 w-4 text-[var(--fg-subtle)] transition-transform duration-200 group-hover:translate-x-0.5 sm:block"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Slim bar for packs still processing; eased like the workspace stage. */
function LiveBar({ job }: { job: JobSummary }) {
  const fill = useRef<HTMLSpanElement>(null);
  const snap = useMemo(
    () => snapshotFrom(job.status, job.progress, job.updatedAt),
    [job.status, job.progress, job.updatedAt],
  );
  useSmoothProgress(snap, (value) => {
    if (fill.current) fill.current.style.transform = `scaleX(${value})`;
  });
  return (
    <span className="live-bar hidden sm:block" aria-hidden="true">
      <span ref={fill} style={{ transform: "scaleX(0)" }} />
    </span>
  );
}
