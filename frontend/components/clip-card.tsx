"use client";

import { useEffect, useId, useImperativeHandle, useState, type Ref } from "react";
import { formatTimecode, reviewClip, type ClipPackage } from "@frontend/lib/api";
import { PLATFORM_SPECS } from "@frontend/lib/constants";
import { clipDownloadUrl, clipFileName, formatHashtags, isClipReady } from "@frontend/lib/content-pack";
import { isPlatform, platformLabel } from "@frontend/lib/format";
import { PlatformMark } from "@frontend/components/platform-mark";
import { StatusPill } from "@frontend/components/status-pill";
import { useToast } from "@frontend/components/toast";
import {
  IconCopy,
  IconCheck,
  IconDownload,
  IconClock,
} from "@frontend/components/icons";

// How long the hook stays on the preview once the clip plays, like on-screen text in the first seconds.
const HOOK_SECONDS = 3;

/** What the pack page's review shortcuts can do to a card. */
export type ClipCardHandle = {
  approve: () => Promise<void>;
  reject: () => Promise<void>;
  copyPost: () => Promise<void>;
};

export function ClipCard({
  clip,
  onChange,
  previousHook,
  previousNote,
  ref,
}: {
  clip: ClipPackage;
  onChange: (clip: ClipPackage) => void;
  previousHook?: string | null;
  previousNote?: string | null;
  ref?: Ref<ClipCardHandle>;
}) {
  const toast = useToast();
  const hookId = useId();
  const captionId = useId();
  const noteId = useId();

  const [caption, setCaption] = useState(clip.displayCaption);
  const [hook, setHook] = useState(clip.displayHook);
  const [note, setNote] = useState(clip.reviewNote ?? "");
  // The post text last copied: the card reads "Copied" until the hook or caption changes.
  const [copiedPost, setCopiedPost] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [justApproved, setJustApproved] = useState(false);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [pastHook, setPastHook] = useState(false);

  useEffect(() => {
    setCaption(clip.displayCaption);
    setHook(clip.displayHook);
    setNote(clip.reviewNote ?? "");
  }, [clip.displayCaption, clip.displayHook, clip.reviewNote]);

  const dirty = caption !== clip.displayCaption || hook !== clip.displayHook;
  const limit = isPlatform(clip.platform) ? PLATFORM_SPECS[clip.platform].captionLimit : 2200;
  const charCount = caption.length;
  const overLimit = charCount > limit;
  const ready = isClipReady(clip.status);

  function captionWithHashtags() {
    const tags = formatHashtags(clip.hashtags);
    return [caption.trim(), tags].filter(Boolean).join("\n\n");
  }

  const postText = `${hook}\n\n${captionWithHashtags()}`.trim();
  const postCopied = copiedPost === postText;
  const hookOnScreen = hook.trim() && (!playing || !pastHook) ? hook.trim() : null;

  async function copyPost() {
    try {
      await navigator.clipboard.writeText(postText);
      setCopiedPost(postText);
      toast.success("Copied post");
    } catch {
      toast.error("Could not copy to clipboard");
    }
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
        setJustApproved(true);
        setTimeout(() => setJustApproved(false), 1400);
        toast.success(`Approved ${clip.platform}. We'll keep this style.`);
      } else if (action === "reject") {
        toast.showToast("Rejected. The next pack will avoid this.", "error");
      } else {
        toast.success("Saved your edit");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Review action failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  }

  useImperativeHandle(ref, () => ({
    approve: () => act("approve"),
    reject: () => act("reject"),
    copyPost,
  }));

  const primaryLabel = busy === "approve"
    ? "Saving…"
    : dirty
      ? "Save & approve"
      : ready
        ? "Ready"
        : "Approve";

  return (
    <article
      id={`clip-${clip.id}`}
      data-clip-id={clip.id}
      tabIndex={-1}
      aria-label={`${platformLabel(clip.platform)} clip`}
      className={`panel clip-card flex flex-col overflow-hidden transition-all duration-300 scroll-mt-28 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tally)] ${
        ready ? "clip-accent-ready" : clip.status === "rejected" ? "clip-accent-rejected" : "clip-accent-review"
      } ${justApproved ? "card-approved-flash" : ""}`}
    >
      <header className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
        <PlatformMark platform={clip.platform} />
        <StatusPill value={clip.status} />
      </header>

      <div className="bg-black p-3 flex flex-col items-center">
        {clip.videoUrl ? (
          <div className="relative w-full max-w-[260px] aspect-[9/16] max-h-[min(48vh,380px)] rounded-lg overflow-hidden bg-black border border-white/10 flex items-center justify-center">
            <video
              aria-label={`${platformLabel(clip.platform)} clip, ${formatTimecode(clip.startSec)} to ${formatTimecode(clip.endSec)}`}
              className="h-full w-full object-contain"
              src={clip.videoUrl}
              controls
              playsInline
              preload="metadata"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
              onTimeUpdate={(e) => setPastHook(e.currentTarget.currentTime >= HOOK_SECONDS)}
            />
            {/* The hook as viewers would see it on screen; the field below stays the source of truth. */}
            {hookOnScreen && (
              <p
                aria-hidden="true"
                data-testid="hook-overlay"
                className="pointer-events-none absolute inset-x-3 top-[12%] line-clamp-3 text-center text-[15px] font-semibold leading-snug text-white"
              >
                <span className="rounded bg-black/60 px-1.5 py-0.5 [box-decoration-break:clone] [-webkit-box-decoration-break:clone] [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]">
                  {hookOnScreen}
                </span>
              </p>
            )}
          </div>
        ) : (
          <div className="w-full max-w-[260px] aspect-[9/16] max-h-[min(48vh,380px)] rounded-lg flex flex-col items-center justify-center p-4 text-center text-xs text-zinc-400 space-y-2 bg-zinc-900 border border-white/10">
            <p className="font-medium text-white">No MP4 for this clip</p>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              The window is ready, but the source file was not downloaded so the clip could not be cut. Copy the caption, or retry.
            </p>
          </div>
        )}

        <div className="w-full flex items-center justify-between pt-2 px-1 text-xs text-zinc-400">
          <div className="flex items-center gap-1 timecode text-[11px]">
            <IconClock className="h-3 w-3" />
            <span>
              {formatTimecode(clip.startSec)}–{formatTimecode(clip.endSec)} ({clip.durationSec}s)
            </span>
          </div>

          {clip.videoUrl && (
            <a
              href={clipDownloadUrl(clip) ?? clip.videoUrl}
              download={clipFileName(clip)}
              aria-label={`Download ${platformLabel(clip.platform)} MP4`}
              className="inline-flex min-h-6 items-center gap-1 px-1 -mr-1 text-[11px] text-zinc-300 hover:text-white transition-colors"
            >
              <IconDownload className="h-3 w-3" />
              <span>MP4</span>
            </a>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3.5 p-4">
        {clip.reason && (
          <div className="text-xs cell p-2.5 space-y-1">
            <button
              type="button"
              className="flex min-h-6 w-full items-center justify-between gap-2 text-left"
              aria-expanded={reasonOpen}
              onClick={() => setReasonOpen((current) => !current)}
            >
              <p className="timecode text-[10px] text-[var(--fg-muted)]">Why this moment</p>
              <span className="timecode text-[10px] text-[var(--fg-subtle)]">{reasonOpen ? "Hide" : "Show"}</span>
            </button>
            {reasonOpen && <p className="text-[var(--fg)] leading-relaxed">{clip.reason}</p>}
            {!reasonOpen && (
              <p className="text-[var(--fg-muted)] leading-relaxed line-clamp-2">{clip.reason}</p>
            )}
          </div>
        )}

        {previousHook && previousHook !== clip.displayHook && (
          <p className="text-[11px] text-[var(--fg-muted)] leading-relaxed">
            Last pack: {previousHook}
            {previousNote ? `. Note: ${previousNote}` : ""}
          </p>
        )}

        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--fg)]" htmlFor={hookId}>
            Hook
          </label>
          <textarea
            id={hookId}
            value={hook}
            onChange={(e) => setHook(e.target.value)}
            rows={2}
            className="field text-xs leading-relaxed"
            placeholder="Opening line on screen..."
          />
          <p className="text-[11px] text-[var(--fg-subtle)] leading-relaxed">
            On screen for the first {HOOK_SECONDS} seconds, as previewed on the video. Not the post.
          </p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-[var(--fg)]" htmlFor={captionId}>
              Caption
            </label>
            <span className={`timecode text-[11px] ${overLimit ? "text-bad font-bold" : "text-[var(--fg-muted)]"}`}>
              {charCount}/{limit}
            </span>
          </div>
          <textarea
            id={captionId}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={4}
            aria-invalid={overLimit}
            className={`field text-xs leading-relaxed ${
              overLimit ? "border-[var(--bad)]" : ""
            }`}
            placeholder="Platform caption..."
          />
          <p className="text-[11px] text-[var(--fg-subtle)] leading-relaxed">
            The post you paste under the video.
          </p>
        </div>

        {clip.hashtags.length > 0 && (
          <ul className="flex flex-wrap gap-1" aria-label="Hashtags">
            {clip.hashtags.map((tag) => (
              <li key={tag}>
                <span className="timecode text-[11px] px-2 py-0.5 rounded-md glass-chip text-[var(--fg-muted)]">
                  {tag.startsWith("#") ? tag : `#${tag}`}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-1 pt-1 border-t border-[var(--border)]">
          <label className="text-[11px] text-[var(--fg-muted)]" htmlFor={noteId}>
            Note for future clips
          </label>
          <input
            id={noteId}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Shorter hook, skip intro"
            className="field h-8 text-xs"
          />
        </div>

        {error && <p className="text-xs text-bad" role="alert">{error}</p>}

        <div className="mt-auto pt-2 border-t border-[var(--border)] space-y-1.5">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void act("approve")}
            className="btn btn-primary min-h-9 w-full text-xs"
          >
            {primaryLabel}
          </button>

          <div className="flex items-center justify-between gap-2 text-xs">
            <button
              type="button"
              onClick={() => void copyPost()}
              className={`btn btn-ghost btn-xs flex-1 ${
                postCopied ? "text-ok" : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
              }`}
            >
              {postCopied ? <IconCheck className="h-3 w-3" /> : <IconCopy className="h-3 w-3" />}
              <span>{postCopied ? "Copied" : "Copy post"}</span>
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
