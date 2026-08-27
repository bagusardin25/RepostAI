"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { listJobs, type JobSummary } from "@frontend/lib/api";
import { formatDuration, formatRelative, sourceTypeLabel } from "@frontend/lib/format";
import { StatusPill } from "@frontend/components/status-pill";
import {
  IconSearch,
  IconRefresh,
  IconArrowRight,
} from "@frontend/components/icons";

const ACTIVE = new Set(["queued", "fetching_source", "analyzing", "clipping"]);

type FilterTab = "all" | "active" | "review" | "done";

export function JobList() {
  const [jobs, setJobs] = useState<JobSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function load(quiet = false) {
    if (!quiet) setIsRefreshing(true);
    try {
      const data = await listJobs();
      setJobs(data.jobs);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load jobs");
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
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to poll jobs");
      }
    }

    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  const counts = useMemo(() => {
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

  if (error) {
    return (
      <div className="panel p-6 text-center space-y-3">
        <p className="text-xs text-bad" role="alert">{error}</p>
        <button type="button" className="btn btn-ghost btn-xs" onClick={() => void load()}>
          Retry
        </button>
      </div>
    );
  }

  if (!jobs) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="skel h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="seg flex-wrap">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`seg-item ${filter === "all" ? "is-active" : ""}`}
          >
            All ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setFilter("review")}
            className={`seg-item ${filter === "review" ? "is-active" : ""}`}
          >
            Needs Review ({counts.review})
          </button>
          <button
            type="button"
            onClick={() => setFilter("active")}
            className={`seg-item ${filter === "active" ? "is-active" : ""}`}
          >
            In Progress ({counts.active})
          </button>
          <button
            type="button"
            onClick={() => setFilter("done")}
            className={`seg-item ${filter === "done" ? "is-active" : ""}`}
          >
            Completed ({counts.done})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--fg-subtle)]" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects…"
              aria-label="Search projects"
              className="field field-icon h-8 text-xs w-48 sm:w-56"
            />
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={isRefreshing}
            className="btn btn-ghost h-8 px-2 text-[var(--fg-muted)] hover:text-[var(--fg)]"
            title="Refresh"
          >
            <IconRefresh className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
          {jobs.length >= 2 && (
            <Link href="/jobs/compare" className="btn btn-ghost h-8 px-2.5 text-[11px]">
              Compare
            </Link>
          )}
        </div>
      </div>

      {/* Jobs List */}
      {filteredJobs.length === 0 ? (
        <div className="panel p-8 text-center text-xs text-[var(--fg-muted)] space-y-2 animate-fade-in-up">
          <p>
            {jobs.length === 0
              ? "No projects yet. Paste a captioned YouTube link or try the demo sample."
              : "No projects match this filter."}
          </p>
        </div>
      ) : (
        <div key={filter} className="panel divide-y divide-[var(--border)] rounded-xl overflow-hidden animate-fade-in-up">
          {filteredJobs.map((job) => {
            const pending = job.pendingReview ?? 0;

            return (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 hover:bg-[var(--bg-card)] transition-all duration-200"
              >
                <div className="min-w-0 space-y-1">
                  <p className="font-medium text-xs sm:text-sm text-[var(--fg)] truncate group-hover:text-[var(--fg-bright)]">
                    {job.sourceTitle}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--fg-muted)] timecode">
                    <span>{sourceTypeLabel(job.sourceType)}</span>
                    <span>·</span>
                    <span>{formatDuration(job.durationSec)}</span>
                    <span>·</span>
                    <span>{job.clipCount ?? 0} clips</span>
                    <span>·</span>
                    <span>{formatRelative(job.createdAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  {pending > 0 && (
                    <span className="timecode text-[10px] text-tally font-medium">
                      {pending} awaiting review
                    </span>
                  )}
                  {job.analyzer === "minds" ? (
                    <span className="timecode text-[10px] text-[var(--fg)]">Mind</span>
                  ) : job.analyzer === "fallback" ? (
                    <span className="timecode text-[10px] text-[var(--fg-subtle)]">Alt process</span>
                  ) : null}
                  <StatusPill value={job.status} />
                  <IconArrowRight className="h-3.5 w-3.5 text-[var(--fg-subtle)] group-hover:text-[var(--fg)] group-hover:translate-x-0.5 transition-all duration-200" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
