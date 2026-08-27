"use client";

import { useEffect, useState } from "react";
import { getWatch, pollWatch, saveWatch, type WatchState } from "@frontend/lib/api";
import { formatRelative } from "@frontend/lib/format";
import { useToast } from "@frontend/components/toast";

export function WatchCard() {
  const toast = useToast();
  const [watch, setWatch] = useState<WatchState | null>(null);
  const [channelUrl, setChannelUrl] = useState("");
  const [busy, setBusy] = useState<"save" | "poll" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getWatch()
      .then(({ watch: next }) => {
        setWatch(next);
        setChannelUrl(next.channelUrl);
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

  return (
    <section className="panel p-5 sm:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="section-title">Autonomous channel watch</h2>
          <p className="text-xs text-[var(--fg-muted)] leading-relaxed max-w-xl">
            When a new public upload appears, the Mind starts a job without you pasting the link. Nothing publishes.
          </p>
        </div>
        <span className="timecode text-[11px] text-[var(--fg-muted)]">
          {watch?.enabled ? "On" : "Off"}
        </span>
      </div>

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
          className="btn btn-primary btn-sm whitespace-nowrap"
          disabled={busy !== null || !channelUrl.trim()}
          onClick={() => void persist(true)}
        >
          {busy === "save" ? "Saving…" : watch?.enabled ? "Update" : "Watch channel"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--fg-muted)]">
        <button
          type="button"
          className="btn btn-ghost btn-xs"
          disabled={busy !== null || !watch?.channelId}
          onClick={() => void checkNow()}
        >
          {busy === "poll" ? "Checking…" : "Check now"}
        </button>
        {watch?.enabled && (
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
    </section>
  );
}
