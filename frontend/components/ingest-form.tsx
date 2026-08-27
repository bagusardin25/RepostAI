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

const DEMO_PRESETS = [
  {
    id: "podcast",
    title: "Creator Economy & AI Agents",
    duration: "14m",
    desc: "Autonomous workflow discussion and multi-platform distribution strategy.",
  },
  {
    id: "launch",
    title: "Product Keynote & Architecture",
    duration: "8m",
    desc: "Fast-paced breakdown with core takeaways and problem-solution arcs.",
  },
  {
    id: "tutorial",
    title: "Fullstack Engineering Walkthrough",
    duration: "18m",
    desc: "Technical walk-through with concise, actionable insights.",
  },
];

export function IngestForm() {
  const router = useRouter();
  const fileInputId = useId();
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
            YouTube
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("upload");
              setError(null);
            }}
            className={`seg-item ${mode === "upload" ? "is-active" : ""}`}
          >
            Upload File
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
            Demo Samples
          </button>
        </div>

        <span className="timecode text-[11px] text-[var(--fg-muted)] hidden sm:inline-block">
          Auto 9:16 Re-framing
        </span>
      </div>

      {/* Mode 1: YouTube */}
      {mode === "youtube" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit("url");
          }}
          className="space-y-3.5"
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
              className="field flex-1 text-sm"
            />
            <button
              type="submit"
              disabled={busy !== null || !url.trim()}
              className="btn btn-primary min-h-10 px-5 text-xs font-semibold whitespace-nowrap"
            >
              {busy === "url" ? "Processing…" : "Make 3 Clips"}
            </button>
          </div>
          <p className="text-xs text-[var(--fg-muted)]">
            Needs a public video with captions. The Mind grounds timestamps in that transcript — it will not invent speech.
          </p>
        </form>
      )}

      {/* Mode 2: Upload */}
      {mode === "upload" && (
        <div className="space-y-3">
          <input
            id={fileInputId}
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
            className="sr-only"
            disabled={busy !== null}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />

          {!file ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-8 panel-dashed text-center cursor-pointer transition-colors ${
                isDragging
                  ? "border-solid border-[var(--fg)]"
                  : "hover:border-[var(--fg-muted)]"
              }`}
            >
              <IconUpload className="h-5 w-5 mx-auto text-[var(--fg-muted)] mb-2" />
              <p className="text-sm font-medium text-[var(--fg)]">Drop video file here or click to browse</p>
              <p className="timecode text-[11px] text-[var(--fg-muted)] mt-1">MP4, WebM, MOV · Max 500MB</p>
              <p className="text-[11px] text-[var(--fg-muted)] mt-2">Upload alone has no speech-to-text. Pair with a YouTube URL that has captions, or use a fixture.</p>
            </div>
          ) : (
            <div className="cell p-3.5 flex items-center justify-between gap-4">
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
                  {busy === "file" ? "Starting…" : "Start Job"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mode 3: Presets */}
      {mode === "presets" && (
        <div className="grid gap-2.5 sm:grid-cols-3">
          {DEMO_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => void submit("fixture")}
              disabled={busy !== null}
              className="panel-card p-3.5 text-left space-y-1"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[var(--fg)]">{preset.title}</span>
                <span className="timecode text-[10px] text-[var(--fg-muted)]">{preset.duration}</span>
              </div>
              <p className="text-xs text-[var(--fg-muted)] line-clamp-2 leading-relaxed">{preset.desc}</p>
            </button>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="alert alert-bad"
        >
          <IconAlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Platform target badges */}
      <div className="pt-2.5 border-t border-[var(--border)] flex flex-wrap items-center justify-between text-xs text-[var(--fg-muted)]">
        <span className="timecode text-[11px]">Supported Platforms:</span>
        <div className="flex items-center gap-4 text-[11px]">
          <span>TikTok (9:16 · 60s)</span>
          <span>Instagram Reels (9:16 · 90s)</span>
          <span>X (9:16 · 140s)</span>
        </div>
      </div>
    </div>
  );
}
