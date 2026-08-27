"use client";

import { useEffect, useState } from "react";
import { getWatch, pollWatch, saveWatch, type WatchState } from "@frontend/lib/api";
import { formatRelative } from "@frontend/lib/format";
import { useToast } from "@frontend/components/toast";
import { IconChevronRight } from "@frontend/components/icons";

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
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load channel watch"));
  }, []);

  async function persist(enabled: boolean) {
    setBusy("save");
    setError(null);
    try {
      const { watch: next } = await saveWatch({ channelUrl: channelUrl.trim(), enabled });
      setWatch(next);
      setChannelUrl(next.channelUrl);
      if (enabled) setOpen(true);
      toast.success(enabled ? "Channel watch on" : "Channel watch off");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not save watch";
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
      if (next.enqueued) toast.success("New video queued");
      else toast.info("No new video");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Poll failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  }

  const enabled = Boolean(watch?.enabled);

  return (
    <section className="panel overflow-hidden">
      <button
        type="button"
        className="w-full flex items-start justify-between gap-3 p-5 sm:p-6 text-left"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <IconChevronRight
              className={`h-3.5 w-3.5 text-[var(--fg-muted)] transition-transform duration-150 ${open ? "rotate-90" : ""}`}
              aria-hidden="true"
            />
            <h2 className="section-title">Optional: automate new uploads</h2>
          </div>
          {!open && (
            <p className="text-xs text-[var(--fg-muted)] leading-relaxed ml-[1.375rem]">
              When a new public video goes up, start a content pack automatically.
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 timecode text-[11px] text-[var(--fg-muted)] shrink-0">
          {enabled ? (
            <span className="inline-flex items-center gap-1 text-[var(--ok)] font-medium">
              <span className="radar-dot-ok" />
              <span>On</span>
            </span>
          ) : (
            <span>Off</span>
          )}
        </div>
      </button>

      {open && (
        <div className="px-5 sm:px-6 pb-5 sm:pb-6 space-y-4 border-t border-[var(--border)] pt-4">
          <p className="text-xs text-[var(--fg-muted)] leading-relaxed max-w-xl">
            Point at a public channel. New uploads can enqueue themselves. Nothing publishes.
          </p>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              value={channelUrl}
              onChange={(e) => setChannelUrl(e.target.value)}
              placeholder="Channel URL or @handle"
              className="field flex-1 text-sm"
              disabled={busy !== null}
            />
            <button
              type="button"
              className="btn btn-primary btn-sm whitespace-nowrap active:scale-95 transition-transform"
              disabled={busy !== null || !channelUrl.trim()}
              onClick={() => void persist(true)}
            >
              {busy === "save" ? "Saving…" : enabled ? "Update" : "Watch channel"}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--fg-muted)]">
            <button
              type="button"
              className="btn btn-ghost btn-xs active:scale-95 transition-transform"
              disabled={busy !== null || !watch?.channelId}
              onClick={() => void checkNow()}
            >
              {busy === "poll" ? "Checking…" : "Check now"}
            </button>
            {enabled && (
              <button
                type="button"
                className="btn btn-ghost btn-xs active:scale-95 transition-transform"
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
