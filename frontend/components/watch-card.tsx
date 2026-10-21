"use client";

import { useEffect, useState } from "react";
import { getWatch, pollWatch, saveWatch, type WatchState } from "@frontend/lib/api";
import { formatRelative } from "@frontend/lib/format";
import { useToast } from "@frontend/components/toast";
import { IconChevronDown } from "@frontend/components/icons";

export function WatchCard() {
  const toast = useToast();
  const [watch, setWatch] = useState<WatchState | null>(null);
  const [channelUrl, setChannelUrl] = useState("");
  const [busy, setBusy] = useState<"save" | "poll" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    getWatch()
      .then(({ watch: next }) => {
        setWatch(next);
        setChannelUrl(next.channelUrl);
        if (next.enabled) setOpen(true);
      })
      .catch(() => setError("Couldn't load channel watch. Refresh to try again."));
  }, []);

  async function persist(enabled: boolean) {
    setBusy("save");
    setError(null);
    try {
      const { watch: next } = await saveWatch({ channelUrl: channelUrl.trim(), enabled });
      setWatch(next);
      setChannelUrl(next.channelUrl);
      if (enabled) setOpen(true);
      toast.success(enabled ? "Watching the channel" : "Channel watch paused");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Couldn't save the channel. Try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  }

  async function checkNow() {
    setBusy("poll");
    setError(null);
    try {
      const { watch: next } = await pollWatch();
      setWatch(next);
      if (next.enqueued) toast.success("New upload found. Pack started.");
      else toast.info("No new uploads since the last check.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Couldn't check the channel. Try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  }

  const enabled = Boolean(watch?.enabled);

  return (
    <section className="overflow-hidden rounded-xl border border-[var(--border)]">
      <button
        type="button"
        className="flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-[var(--bg-card-hover)] sm:px-5"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[0.9375rem] font-semibold text-[var(--fg-bright)]">Watch a channel</span>
          <span className="mt-0.5 block text-[0.8125rem] leading-relaxed text-[var(--fg-muted)]">
            New uploads from a channel you pick start a pack on their own.
          </span>
        </span>
        {enabled ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 text-[0.8125rem] font-medium text-[var(--ok)]">
            <span className="radar-dot-ok" aria-hidden="true" />
            On
          </span>
        ) : (
          <span className="shrink-0 text-[0.8125rem] text-[var(--fg-muted)]">Off</span>
        )}
        <IconChevronDown
          className={`h-4 w-4 shrink-0 text-[var(--fg-subtle)] transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="space-y-4 border-t border-[var(--border)] px-4 pb-5 pt-4 sm:px-5">
          <p className="max-w-xl text-[0.8125rem] leading-relaxed text-[var(--fg-muted)]">
            Paste a public channel. When it posts a new video, a pack starts here for you to review.
          </p>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              value={channelUrl}
              onChange={(e) => setChannelUrl(e.target.value)}
              placeholder="Channel URL or @handle"
              aria-label="YouTube channel"
              className="field flex-1 text-sm"
              disabled={busy !== null}
            />
            <button
              type="button"
              className="btn btn-primary whitespace-nowrap"
              disabled={busy !== null || !channelUrl.trim()}
              onClick={() => void persist(true)}
            >
              {busy === "save" ? "Saving…" : enabled ? "Update" : "Watch channel"}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[0.8125rem] text-[var(--fg-muted)]">
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              disabled={busy !== null || !watch?.channelId}
              onClick={() => void checkNow()}
            >
              {busy === "poll" ? "Checking…" : "Check now"}
            </button>
            {enabled && (
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                disabled={busy !== null}
                onClick={() => void persist(false)}
              >
                Pause
              </button>
            )}
            {watch?.lastCheckedAt ? <span>Last check {formatRelative(watch.lastCheckedAt)}</span> : null}
            {watch?.lastVideoId ? <span className="timecode">Last video {watch.lastVideoId}</span> : null}
          </div>

          {(error || watch?.lastError) && (
            <p className="text-xs text-bad" role="alert">
              {error || watch?.lastError}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
