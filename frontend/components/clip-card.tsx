"use client";

import { useEffect, useId, useState } from "react";
import { formatTimecode, reviewClip, type ClipPackage } from "@frontend/lib/api";
import { PLATFORM_SPECS } from "@frontend/lib/constants";
import { isPlatform } from "@frontend/lib/format";
import { PlatformMark } from "@frontend/components/platform-mark";
import { StatusPill } from "@frontend/components/status-pill";
import { useToast } from "@frontend/components/toast";
import {
  IconCopy,
  IconCheck,
  IconDownload,
  IconClock,
} from "@frontend/components/icons";

export function ClipCard({
  clip,
  onChange,
  previousHook,
  previousNote,
}: {
  clip: ClipPackage;
  onChange: (clip: ClipPackage) => void;
  previousHook?: string | null;
  previousNote?: string | null;
}) {
  const toast = useToast();
  const hookId = useId();
  const captionId = useId();
  const noteId = useId();

  const [caption, setCaption] = useState(clip.displayCaption);
  const [hook, setHook] = useState(clip.displayHook);
  const [note, setNote] = useState(clip.reviewNote ?? "");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCaption(clip.displayCaption);
    setHook(clip.displayHook);
    setNote(clip.reviewNote ?? "");
  }, [clip.displayCaption, clip.displayHook, clip.reviewNote]);

  const dirty = caption !== clip.displayCaption || hook !== clip.displayHook;
  const limit = isPlatform(clip.platform) ? PLATFORM_SPECS[clip.platform].captionLimit : 2200;
  const charCount = caption.length;
  const overLimit = charCount > limit;

  async function copyToClipboard(text: string, fieldLabel: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldLabel);
      toast.success(`Copied ${fieldLabel}`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  }

  function copyAllPackage() {
    const tags = clip.hashtags.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ");
    const fullText = `${hook}\n\n${caption}\n\n${tags}`.trim();
    void copyToClipboard(fullText, "Package");
  }

  async function act(action: "approve" | "reject" | "edit") {
    if (overLimit && action !== "reject") {
      const msg = `Caption is ${charCount - limit} characters over limit.`;
      setError(msg);
      toast.error(msg);
      return;
    }

    setBusy(action);
    setError(null);
    try {
      if (action === "approve" && dirty) {
        await reviewClip(clip.id, {
          action: "edit",
          caption,
          hook,
          note: note.trim() || undefined,
        });
      }

      const { clip: next } = await reviewClip(clip.id, {
        action,
        caption: action === "edit" ? caption : undefined,
        hook: action === "edit" ? hook : undefined,
        note: note.trim() || undefined,
      });

      onChange(next);

      if (action === "approve") {
        toast.success(`Approved ${clip.platform}. Mind will keep this.`);
      } else if (action === "reject") {
        toast.showToast(`Rejected — Mind will avoid this pattern next job`, "error");
      } else {
        toast.success("Edit sent to the Mind");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Review action failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  }

  return (
    <article className="panel flex flex-col rounded-xl overflow-hidden shadow-sm">
      {/* Card Header */}
      <header className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3 bg-[var(--bg-card)]/50">
        <PlatformMark platform={clip.platform} />
        <StatusPill value={clip.status} />
      </header>

      {/* 9:16 Video Player Area */}
      <div className="bg-black p-3 flex flex-col items-center">
        {clip.videoUrl ? (
          <div className="w-full max-w-[260px] aspect-[9/16] max-h-[min(48vh,380px)] rounded-lg overflow-hidden bg-black border border-white/10 flex items-center justify-center">
            <video
              className="h-full w-full object-contain"
              src={clip.videoUrl}
              controls
              playsInline
              preload="metadata"
            />
          </div>
        ) : (
          <div className="w-full max-w-[260px] aspect-[9/16] max-h-[min(48vh,380px)] rounded-lg flex flex-col items-center justify-center p-4 text-center text-xs text-zinc-400 space-y-1 bg-zinc-900 border border-white/10">
            <p className="font-medium text-white">Slice: {clip.durationSec}s</p>
            <p className="text-[11px] text-zinc-400">Video cut ready</p>
          </div>
        )}

        {/* Video Timecode & Download */}
        <div className="w-full flex items-center justify-between pt-2 px-1 text-xs text-zinc-400">
          <div className="flex items-center gap-1 timecode text-[11px]">
            <IconClock className="h-3 w-3" />
            <span>
              {formatTimecode(clip.startSec)}–{formatTimecode(clip.endSec)} ({clip.durationSec}s)
            </span>
          </div>

          {clip.videoUrl && (
            <a
              href={clip.videoUrl}
              download={`${clip.platform}-${clip.id.slice(0, 6)}.mp4`}
              className="inline-flex items-center gap-1 text-[11px] text-zinc-300 hover:text-white transition-colors"
            >
              <IconDownload className="h-3 w-3" />
              <span>MP4</span>
            </a>
          )}
        </div>
      </div>

      {/* Card Content Form */}
      <div className="flex flex-1 flex-col gap-3.5 p-4 bg-[var(--bg-surface)]">
        {/* Mind Selection Rationale */}
        {clip.reason && (
          <div className="text-xs bg-[var(--bg-card)] p-2.5 rounded border border-[var(--border)] space-y-1">
            <p className="timecode text-[10px] text-[var(--fg-muted)]">Mind chose this window</p>
            <p className="text-[var(--fg)] leading-relaxed">{clip.reason}</p>
          </div>
        )}

        {previousHook && previousHook !== clip.displayHook && (
          <p className="text-[11px] text-[var(--fg-muted)] leading-relaxed">
            Last job: {previousHook}
            {previousNote ? ` — ${previousNote}` : ""}
          </p>
        )}

        {/* Hook */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-[var(--fg)]" htmlFor={hookId}>
              Hook
            </label>
            <button
              type="button"
              onClick={() => void copyToClipboard(hook, "Hook")}
              className="text-[11px] text-[var(--fg-muted)] hover:text-[var(--fg)] inline-flex items-center gap-1"
            >
              {copiedField === "Hook" ? <IconCheck className="h-3 w-3 text-emerald-500" /> : <IconCopy className="h-3 w-3" />}
              <span>{copiedField === "Hook" ? "Copied" : "Copy"}</span>
            </button>
          </div>
          <textarea
            id={hookId}
            value={hook}
            onChange={(e) => setHook(e.target.value)}
            rows={2}
            className="field text-xs leading-relaxed"
            placeholder="Opening hook..."
          />
        </div>

        {/* Caption */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-[var(--fg)]" htmlFor={captionId}>
              Caption
            </label>
            <div className="flex items-center gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => void copyToClipboard(caption, "Caption")}
                className="text-[11px] text-[var(--fg-muted)] hover:text-[var(--fg)] inline-flex items-center gap-1"
              >
                {copiedField === "Caption" ? <IconCheck className="h-3 w-3 text-emerald-500" /> : <IconCopy className="h-3 w-3" />}
                <span>{copiedField === "Caption" ? "Copied" : "Copy"}</span>
              </button>
              <span className={`timecode ${overLimit ? "text-rose-500 font-bold" : "text-[var(--fg-muted)]"}`}>
                {charCount}/{limit}
              </span>
            </div>
          </div>
          <textarea
            id={captionId}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={4}
            aria-invalid={overLimit}
            className={`field text-xs leading-relaxed ${
              overLimit ? "border-rose-500" : ""
            }`}
            placeholder="Platform caption..."
          />
        </div>

        {/* Hashtags */}
        {clip.hashtags.length > 0 && (
          <ul className="flex flex-wrap gap-1" aria-label="Hashtags">
            {clip.hashtags.map((tag) => (
              <li key={tag}>
                <button
                  type="button"
                  onClick={() => void copyToClipboard(tag.startsWith("#") ? tag : `#${tag}`, tag)}
                  className="timecode text-[11px] px-2 py-0.5 rounded bg-[var(--bg-card)] text-[var(--fg-muted)] hover:text-[var(--fg)] border border-[var(--border)] transition-colors"
                >
                  {tag.startsWith("#") ? tag : `#${tag}`}
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Note to Mind */}
        <div className="space-y-1 pt-1 border-t border-[var(--border)]">
          <label className="text-[11px] text-[var(--fg-muted)]" htmlFor={noteId}>
            Feedback note for Mind
          </label>
          <input
            id={noteId}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g., Shorter hook, skip intro"
            className="field h-8 text-xs"
          />
        </div>

        {/* Error */}
        {error && <p className="text-xs text-rose-500" role="alert">{error}</p>}

        {/* Action Buttons */}
        <div className="mt-auto pt-2 border-t border-[var(--border)] space-y-1.5">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void act("approve")}
              className="btn btn-primary min-h-9 text-xs"
            >
              {busy === "approve" ? "Saving…" : clip.status === "approved" ? "Approved" : "Approve"}
            </button>

            <button
              type="button"
              disabled={busy !== null || !dirty}
              onClick={() => void act("edit")}
              className="btn btn-ghost min-h-9 text-xs"
            >
              {busy === "edit" ? "Saving…" : "Save Edit"}
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 text-xs">
            <button
              type="button"
              onClick={copyAllPackage}
              className="btn btn-ghost btn-xs flex-1 text-[var(--fg-muted)] hover:text-[var(--fg)]"
            >
              Copy Full Text
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void act("reject")}
              className="btn btn-danger btn-xs"
            >
              Reject
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
