"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useRef, type DragEvent } from "react";
import { createJob } from "@frontend/lib/api";
import { formatBytes } from "@frontend/lib/format";
import { useToast } from "@frontend/components/toast";
import {
  IconUpload,
  IconAlertCircle,
} from "@frontend/components/icons";

type IngestMode = "youtube" | "upload" | "presets";
type BusyKind = "url" | "file" | "fixture" | null;

const DEMO_SAMPLE = {
  title: "Stop posting the same YouTube video everywhere",
  duration: "1m 36s",
  desc: "A short creator-workflow sample. You get 3 vertical cuts and 4 text drafts — the same result every time.",
};

export function IngestForm() {
  const router = useRouter();
  const fileInputId = useId();
  const captionInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const [mode, setMode] = useState<IngestMode>("youtube");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [busy, setBusy] = useState<BusyKind>(null);
  const [error, setError] = useState<string | null>(null);

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type.startsWith("video/") || /\.(mp4|webm|mov|mkv)$/i.test(droppedFile.name)) {
        setFile(droppedFile);
        setMode("upload");
        toast.success(`Loaded ${droppedFile.name}`);
      } else {
        setError("Please drop a valid video file (.mp4, .webm, .mov)");
      }
    }
  }

  async function submit(kind: Exclude<BusyKind, null>) {
    setError(null);
    setBusy(kind);
    try {
      if (kind === "fixture") {
        const { job } = await createJob({ fixture: true });
        router.push(`/jobs/${job.id}`);
        return;
      }
      if (kind === "file") {
        if (!file) throw new Error("Select a video file first.");
        const { job } = await createJob({ file, youtubeUrl: url.trim() || undefined });
        router.push(`/jobs/${job.id}`);
        return;
      }
      const youtubeUrl = url.trim();
      if (!youtubeUrl) throw new Error("Paste a YouTube URL first.");
      const { job } = await createJob({ youtubeUrl });
      router.push(`/jobs/${job.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not start job";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="glass p-6 sm:p-7 space-y-5">
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
        <div className="seg">
          <button
            type="button"
            onClick={() => {
              setMode("youtube");
              setError(null);
            }}
            className={`seg-item ${mode === "youtube" ? "is-active" : ""}`}
          >
            YouTube link
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("upload");
              setError(null);
            }}
            className={`seg-item ${mode === "upload" ? "is-active" : ""}`}
          >
            Upload video
            {file && <span className="ml-1.5 h-1.5 w-1.5 inline-block rounded-full bg-[var(--ok)]" />}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("presets");
              setError(null);
            }}
            className={`seg-item ${mode === "presets" ? "is-active" : ""}`}
          >
            Try sample
          </button>
        </div>

        <span className="timecode text-[11px] text-[var(--fg-muted)] hidden sm:inline-block">
          3 clips · 4 drafts
        </span>
      </div>

      {mode === "youtube" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit("url");
          }}
          className="space-y-3.5 animate-fade-in-up"
        >
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              id="youtubeUrl"
              name="youtubeUrl"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste YouTube link (e.g. youtube.com/watch?v=...)"
              inputMode="url"
              autoComplete="url"
              disabled={busy !== null}
              className="field flex-1 text-sm focus:ring-1 focus:ring-[var(--fg)]"
            />
            <button
              type="submit"
              disabled={busy !== null || !url.trim()}
              className="btn btn-primary min-h-10 px-5 text-xs font-semibold whitespace-nowrap"
            >
              {busy === "url" ? "Starting…" : "Create content pack"}
            </button>
          </div>
          <p className="text-xs text-[var(--fg-muted)]">
            Needs a public video with captions. Timestamps come from that transcript — speech is never invented.
          </p>
        </form>
      )}

      {mode === "upload" && (
        <div className="space-y-3 animate-fade-in-up">
          <input
            id={fileInputId}
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
            className="sr-only"
            disabled={busy !== null}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--fg)]" htmlFor={captionInputId}>
              YouTube link for captions (optional)
            </label>
            <input
              id={captionInputId}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="youtube.com/watch?v=… with captions"
              inputMode="url"
              autoComplete="url"
              disabled={busy !== null}
              className="field w-full text-sm focus:ring-1 focus:ring-[var(--fg)]"
            />
            <p className="text-[11px] text-[var(--fg-muted)] leading-relaxed">
              {url.trim()
                ? "Your uploaded file will be cut. Captions from this YouTube link become the transcript."
                : "Upload alone has no speech-to-text. Add a YouTube link with captions, or try the demo sample."}
            </p>
          </div>

          {!file ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-8 panel-dashed text-center cursor-pointer transition-all duration-200 ${
                isDragging
                  ? "border-solid border-[var(--fg)] bg-[var(--cell-bg)] scale-[1.01] shadow-lg"
                  : "hover:border-[var(--fg-muted)] hover:bg-[var(--cell-bg)]/60"
              }`}
            >
              <IconUpload className={`h-5 w-5 mx-auto text-[var(--fg-muted)] mb-2 transition-transform duration-200 ${isDragging ? "-translate-y-1 text-[var(--fg)] scale-110" : ""}`} />
              <p className="text-sm font-medium text-[var(--fg)]">Drop video file here or click to browse</p>
              <p className="timecode text-[11px] text-[var(--fg-muted)] mt-1">MP4, WebM, MOV · Max 500MB</p>
            </div>
          ) : (
            <div className="cell p-3.5 flex items-center justify-between gap-4 animate-scale-in">
              <div className="min-w-0">
                <p className="font-medium text-xs text-[var(--fg)] truncate">{file.name}</p>
                <p className="timecode text-[11px] text-[var(--fg-muted)]">{formatBytes(file.size)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  disabled={busy !== null}
                  className="btn btn-ghost btn-xs"
                >
                  Remove
                </button>
                <button
                  type="button"
                  onClick={() => void submit("file")}
                  disabled={busy !== null}
                  className="btn btn-primary btn-sm font-medium"
                >
                  {busy === "file" ? "Starting…" : "Create content pack"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {mode === "presets" && (
        <div className="animate-fade-in-up">
          <button
            type="button"
            onClick={() => void submit("fixture")}
            disabled={busy !== null}
            className="panel-card p-4 text-left w-full space-y-2 cursor-pointer group"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="pill pill-tally">Demo data</span>
              <span className="timecode text-[11px] text-[var(--fg-muted)]">{DEMO_SAMPLE.duration}</span>
            </div>
            <p className="font-semibold text-sm text-[var(--fg)] group-hover:text-[var(--tally-fg)] transition-colors">
              {DEMO_SAMPLE.title}
            </p>
            <p className="text-xs text-[var(--fg-muted)] leading-relaxed">{DEMO_SAMPLE.desc}</p>
            <p className="text-xs font-medium text-[var(--fg)] pt-1">
              {busy === "fixture" ? "Starting…" : "Try this sample"}
            </p>
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="alert alert-bad"
        >
          <IconAlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="pt-2.5 border-t border-[var(--border)] flex flex-wrap items-center justify-between text-xs text-[var(--fg-muted)]">
        <span className="timecode text-[11px]">Output:</span>
        <div className="flex items-center gap-4 text-[11px]">
          <span>TikTok (9:16 · 60s)</span>
          <span>Instagram Reels (9:16 · 90s)</span>
          <span>X (9:16 · 140s)</span>
        </div>
      </div>
    </div>
  );
}
