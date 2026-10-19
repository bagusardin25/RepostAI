"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ClipboardEvent as ReactClipboardEvent,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { createJob } from "@frontend/lib/api";
import { formatBytes, formatDuration } from "@frontend/lib/format";
import {
  extractYoutubeId,
  fetchYoutubePreview,
  looksLikeUrl,
  youtubeThumbnail,
  type YoutubePreview,
} from "@frontend/lib/youtube";
import { useToast } from "@frontend/components/toast";
import {
  IconAlertCircle,
  IconArrowRight,
  IconCheck,
  IconLink,
  IconUpload,
  IconVideo,
  IconXMark,
} from "@frontend/components/icons";

const MAX_BYTES = 500 * 1024 * 1024;
const VIDEO_EXT = /\.(mp4|webm|mov|mkv|m4v)$/i;
const ACCEPT = "video/mp4,video/webm,video/quicktime,video/x-matroska,.mp4,.webm,.mov,.mkv,.m4v";

type Busy = "url" | "file" | "fixture" | null;
type DragKind = "file" | "link";
type FileMeta = { duration: number | null; width: number; height: number };
type PreviewState = { id: string; data: YoutubePreview | null; loading: boolean };

function isVideoFile(file: File) {
  return file.type.startsWith("video/") || VIDEO_EXT.test(file.name);
}

function dragKindOf(event: DragEvent): DragKind | null {
  const types = Array.from(event.dataTransfer?.types ?? []);
  if (types.includes("Files")) return "file";
  if (types.includes("text/uri-list") || types.includes("text/plain")) return "link";
  return null;
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * The desk's one entry point. It adapts to what it is given:
 * empty → paste or type a link; valid YouTube link → preview card;
 * a video dragged anywhere on the page → the box grows into a drop target;
 * a dropped file → thumbnail chip plus the captions link uploads need;
 * uploading → real byte progress.
 */
export function IngestForm() {
  const router = useRouter();
  const toast = useToast();
  const inputId = useId();
  const captionsId = useId();
  const hintId = useId();

  const boxRef = useRef<HTMLElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const captionsInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  const [url, setUrl] = useState("");
  const [touched, setTouched] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileMeta, setFileMeta] = useState<FileMeta | null>(null);
  const [dragKind, setDragKind] = useState<DragKind | null>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [upload, setUpload] = useState<{ loaded: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [announce, setAnnounce] = useState("");

  const ytId = extractYoutubeId(url);
  const hasUrl = url.trim().length > 0;
  const urlInvalid = hasUrl && !ytId && touched;
  const phase: "empty" | "link" | "file" = file ? "file" : ytId ? "link" : "empty";
  const dragging = dragKind !== null && busy === null;

  // --- File handling -------------------------------------------------------

  const acceptFile = useCallback(
    (next: File) => {
      if (!isVideoFile(next)) {
        setError("That file isn't a video. Drop an MP4, WebM or MOV.");
        return;
      }
      if (next.size > MAX_BYTES) {
        setError("That video is over 500 MB. Trim it, or paste its YouTube link instead.");
        return;
      }
      setError(null);
      setFileMeta(null);
      setFile(next);
      setAnnounce(`Video added: ${next.name}`);
      // A non-YouTube link typed earlier can't serve as captions; clear it.
      setUrl((current) => (extractYoutubeId(current) ? current : ""));
      setTouched(false);
    },
    [],
  );

  useEffect(() => {
    if (!file) {
      setFileUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setFileUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  function removeFile() {
    setFile(null);
    setFileMeta(null);
    setUpload(null);
    setError(null);
    setAnnounce("Video removed");
    requestAnimationFrame(() => linkInputRef.current?.focus());
  }

  // --- Link preview --------------------------------------------------------

  useEffect(() => {
    if (!ytId) {
      setPreview(null);
      return;
    }
    const controller = new AbortController();
    setPreview({ id: ytId, data: null, loading: true });
    const timer = window.setTimeout(() => {
      void fetchYoutubePreview(ytId, controller.signal).then((data) => {
        if (controller.signal.aborted) return;
        setPreview({ id: ytId, data, loading: false });
        if (phase !== "file") setAnnounce(data ? `YouTube video: ${data.title}` : "YouTube link looks good");
      });
    }, 220);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
    // phase is read only for the announcement text
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ytId]);

  // --- Page-wide drag, drop and paste ---------------------------------------

  useEffect(() => {
    function onDragEnter(event: DragEvent) {
      const kind = dragKindOf(event);
      if (!kind || busy) return;
      event.preventDefault();
      dragDepth.current += 1;
      setDragKind(kind);
    }

    function onDragOver(event: DragEvent) {
      if (!dragKindOf(event) || busy) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    }

    function onDragLeave(event: DragEvent) {
      if (!dragKindOf(event)) return;
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) {
        setDragKind(null);
        setOver(false);
      }
    }

    function onDrop(event: DragEvent) {
      const kind = dragKindOf(event);
      if (!kind) return;
      event.preventDefault();
      dragDepth.current = 0;
      setDragKind(null);
      setOver(false);
      if (busy) return;
      const dropped = event.dataTransfer?.files?.[0];
      if (dropped) {
        acceptFile(dropped);
        return;
      }
      const text = (event.dataTransfer?.getData("text/uri-list") || event.dataTransfer?.getData("text/plain") || "")
        .split(/\r?\n/)
        .find((line) => line.trim() && !line.startsWith("#"));
      if (text) {
        setUrl(text.trim());
        setTouched(true);
        setError(null);
      }
    }

    function onPaste(event: ClipboardEvent) {
      if (busy) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable='true']")) return;
      const pastedFile = event.clipboardData?.files?.[0];
      if (pastedFile) {
        event.preventDefault();
        acceptFile(pastedFile);
        return;
      }
      const text = event.clipboardData?.getData("text")?.trim();
      if (text && (looksLikeUrl(text) || extractYoutubeId(text))) {
        event.preventDefault();
        setUrl(text);
        setTouched(true);
        setError(null);
        requestAnimationFrame(() => (file ? captionsInputRef.current : linkInputRef.current)?.focus());
      }
    }

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
      window.removeEventListener("paste", onPaste);
    };
  }, [acceptFile, busy, file]);

  // Dim the rest of the desk while something is dragged over the page.
  useEffect(() => {
    if (dragging) document.body.dataset.dragging = "true";
    else delete document.body.dataset.dragging;
    return () => {
      delete document.body.dataset.dragging;
    };
  }, [dragging]);

  // --- Fluid size changes ---------------------------------------------------

  // Grow into a large drop target while dragging, then settle back.
  useLayoutEffect(() => {
    const box = boxRef.current;
    const inner = innerRef.current;
    if (!box || !inner) return;
    if (dragging) {
      const current = box.offsetHeight;
      box.style.minHeight = `${current}px`;
      void box.offsetHeight;
      box.style.minHeight = `max(${current}px, clamp(20rem, 62vh, 36rem))`;
      return;
    }
    if (!box.style.minHeight) return;
    box.style.minHeight = `${inner.offsetHeight + 2}px`;
    const clear = () => {
      box.style.minHeight = "";
    };
    const timer = window.setTimeout(clear, prefersReducedMotion() ? 0 : 520);
    return () => window.clearTimeout(timer);
  }, [dragging]);

  // Animate height between content states instead of jumping.
  const layoutKey = `${phase}|${preview?.loading ? "l" : preview?.data ? "d" : "n"}|${error ? "e" : ""}|${urlInvalid ? "i" : ""}|${busy ?? ""}|${upload ? "u" : ""}|${fileMeta ? "m" : ""}`;
  const lastLayout = useRef<{ key: string; height: number } | null>(null);
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const height = box.offsetHeight;
    const last = lastLayout.current;
    lastLayout.current = { key: layoutKey, height };
    if (!last || last.key === layoutKey || dragging || box.style.minHeight || prefersReducedMotion()) return;
    if (Math.abs(last.height - height) < 2) return;
    box.animate([{ height: `${last.height}px` }, { height: `${height}px` }], {
      duration: 420,
      easing: "cubic-bezier(0.16, 1, 0.3, 1)",
    });
  });

  useEffect(() => {
    const reset = () => {
      lastLayout.current = null;
    };
    window.addEventListener("resize", reset);
    return () => window.removeEventListener("resize", reset);
  }, []);

  // --- Submit ---------------------------------------------------------------

  async function submit(kind: Exclude<Busy, null>) {
    setError(null);
    setTouched(true);
    try {
      if (kind === "fixture") {
        setBusy("fixture");
        const { job } = await createJob({ fixture: true });
        router.push(`/jobs/${job.id}`);
        return;
      }
      if (kind === "file") {
        if (!file) throw new Error("Choose a video file first.");
        if (!ytId) {
          captionsInputRef.current?.focus();
          throw new Error("Add the YouTube link for this video so we can read its captions.");
        }
        setBusy("file");
        setUpload({ loaded: 0, total: file.size });
        setAnnounce(`Uploading ${file.name}`);
        const { job } = await createJob(
          { file, youtubeUrl: url.trim() },
          { onUploadProgress: (loaded, total) => setUpload({ loaded, total }) },
        );
        setAnnounce("Upload done. Starting your pack.");
        router.push(`/jobs/${job.id}`);
        return;
      }
      if (!ytId) {
        linkInputRef.current?.focus();
        throw new Error(
          hasUrl
            ? "That isn't a YouTube link. Paste a youtube.com or youtu.be link, or drop the video file."
            : "Paste a YouTube link first.",
        );
      }
      setBusy("url");
      const { job } = await createJob({ youtubeUrl: url.trim() });
      router.push(`/jobs/${job.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't start this pack. Try again.";
      setError(message);
      setBusy(null);
      setUpload(null);
      if (kind !== "url" && kind !== "file") toast.error(message);
    }
  }

  function onLinkSubmit(event: FormEvent) {
    event.preventDefault();
    void submit(file ? "file" : "url");
  }

  // Clicking empty space in the box goes to the link field, like a big label.
  function focusFromBox(event: ReactMouseEvent<HTMLElement>) {
    if (busy || dragging) return;
    const target = event.target as HTMLElement;
    if (target.closest("button, a, input, label, video, select, textarea")) return;
    event.preventDefault();
    (file ? captionsInputRef.current : linkInputRef.current)?.focus();
  }

  function onInputPaste(event: ReactClipboardEvent<HTMLInputElement>) {
    const pastedFile = event.clipboardData.files?.[0];
    if (pastedFile) {
      event.preventDefault();
      acceptFile(pastedFile);
      return;
    }
    setTouched(true);
    setError(null);
  }

  const uploadPct = upload && upload.total > 0 ? Math.min(100, Math.round((upload.loaded / upload.total) * 100)) : 0;
  const linkInvalidMessage = "That isn't a YouTube link. Paste a youtube.com or youtu.be link, or drop the video file.";
  const portrait = fileMeta ? fileMeta.height > fileMeta.width : false;

  return (
    <section
      ref={boxRef}
      className="source-box"
      data-drag={dragging ? "true" : "false"}
      data-over={over ? "true" : "false"}
      onMouseDown={focusFromBox}
      onDragEnter={() => setOver(true)}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(false);
      }}
      aria-labelledby={`${inputId}-title`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const picked = event.target.files?.[0];
          if (picked) acceptFile(picked);
          event.target.value = "";
        }}
      />

      <div
        ref={innerRef}
        className="source-box-inner transition-[opacity,filter] duration-300"
        style={dragging ? { opacity: 0.12, filter: "blur(2px)" } : undefined}
        aria-hidden={dragging ? "true" : undefined}
      >
        {phase !== "file" ? (
          <form onSubmit={onLinkSubmit} className="space-y-5" noValidate>
            <div
              className={`grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                phase === "empty" ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
              aria-hidden={phase === "empty" ? undefined : "true"}
            >
              <div className="overflow-hidden">
                <div className="flex flex-col items-center text-center gap-4 pb-2">
                  <div className="flex gap-2" aria-hidden="true">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--tally-bg)] text-[var(--tally-fg)]">
                      <IconLink className="h-5 w-5" />
                    </span>
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--bg-sunken)] text-[var(--fg-muted)]">
                      <IconVideo className="h-5 w-5" />
                    </span>
                  </div>
                  <h1 id={`${inputId}-title`} className="page-title text-center max-w-xl">
                    Paste a YouTube link or drop a video
                  </h1>
                  <p className="page-lede text-center max-w-md">
                    You get 3 vertical clips and 4 text drafts to review. Captions set the timestamps, so speech is
                    never invented.
                  </p>
                </div>
              </div>
            </div>

            {phase === "link" ? (
              <p className="kicker" aria-hidden="true">
                YouTube link
              </p>
            ) : null}

            <div>
              <label htmlFor={inputId} className="sr-only">
                YouTube link
              </label>
              <div className="source-input-row" data-invalid={urlInvalid ? "true" : "false"}>
                <IconLink className="ml-2.5 h-4 w-4 shrink-0 text-[var(--fg-subtle)]" aria-hidden="true" />
                <input
                  id={inputId}
                  ref={linkInputRef}
                  className="source-input"
                  value={url}
                  onChange={(event) => {
                    setUrl(event.target.value);
                    setError(null);
                  }}
                  onBlur={() => hasUrl && setTouched(true)}
                  onPaste={onInputPaste}
                  placeholder="youtube.com/watch?v=…"
                  inputMode="url"
                  autoComplete="url"
                  spellCheck={false}
                  autoFocus
                  disabled={busy !== null}
                  aria-invalid={urlInvalid ? "true" : undefined}
                  aria-describedby={hintId}
                />
                {hasUrl ? (
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => {
                      setUrl("");
                      setTouched(false);
                      setError(null);
                      linkInputRef.current?.focus();
                    }}
                    aria-label="Clear link"
                    disabled={busy !== null}
                  >
                    <IconXMark className="h-4 w-4" />
                  </button>
                ) : null}
                <button
                  type="submit"
                  className="btn btn-primary shrink-0 hidden sm:inline-flex"
                  disabled={busy !== null || !ytId}
                >
                  {busy === "url" ? "Starting…" : "Create content pack"}
                </button>
              </div>
              <p id={hintId} className={`mt-2 text-xs ${urlInvalid ? "text-bad" : "text-[var(--fg-subtle)]"}`}>
                {urlInvalid
                  ? linkInvalidMessage
                  : phase === "link"
                    ? "Public videos with captions work best."
                    : "Tip: paste anywhere on this page, or drag a video in. MP4, WebM or MOV, up to 500 MB."}
              </p>
            </div>

            {phase === "link" && ytId ? (
              <div className="space-y-4 source-swap">
                <div className="source-preview">
                  <div className="source-thumb w-36 sm:w-48 aspect-video">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={youtubeThumbnail(ytId)} alt="" loading="lazy" />
                    <span className="source-badge">YouTube</span>
                  </div>
                  <div className="min-w-0 space-y-1.5">
                    {preview?.loading ? (
                      <>
                        <span className="skel block h-4 w-48 max-w-full" />
                        <span className="skel block h-3 w-28" />
                      </>
                    ) : (
                      <>
                        <p className="text-sm sm:text-[0.9375rem] font-semibold leading-snug text-[var(--fg-bright)] line-clamp-2">
                          {preview?.data?.title ?? "YouTube video"}
                        </p>
                        <p className="text-xs text-[var(--fg-muted)] truncate">
                          {preview?.data?.author ? `${preview.data.author} · ` : ""}
                          <span className="timecode">{ytId}</span>
                        </p>
                      </>
                    )}
                    <p className="inline-flex items-center gap-1.5 text-xs text-ok">
                      <IconCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      Link looks good. We read its captions next.
                    </p>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-lg w-full sm:hidden" disabled={busy !== null}>
                  {busy === "url" ? "Starting…" : "Create content pack"}
                  <IconArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ) : null}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-x-3 gap-y-2 text-sm text-[var(--fg-muted)]">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy !== null}
              >
                <IconUpload className="h-4 w-4" aria-hidden="true" />
                Choose video file
              </button>
              <span className="hidden sm:inline" aria-hidden="true">
                or
              </span>
              <button
                type="button"
                className="btn btn-quiet text-[var(--tally-fg)] font-semibold"
                onClick={() => void submit("fixture")}
                disabled={busy !== null}
              >
                {busy === "fixture" ? "Starting sample…" : "Try the sample"}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={onLinkSubmit} className="space-y-5 source-swap" noValidate>
            <h1 id={`${inputId}-title`} className="sr-only">
              Video ready to upload
            </h1>
            <div className="flex items-center gap-4">
              <div
                className={`source-thumb ${portrait ? "w-20 sm:w-24 aspect-[9/16]" : "w-36 sm:w-44 aspect-video"}`}
                onMouseEnter={(event) => void event.currentTarget.querySelector("video")?.play().catch(() => {})}
                onMouseLeave={(event) => event.currentTarget.querySelector("video")?.pause()}
              >
                {fileUrl ? (
                  <video
                    src={`${fileUrl}#t=0.5`}
                    muted
                    playsInline
                    loop
                    preload="metadata"
                    aria-label={`Preview of ${file?.name ?? "your video"}`}
                    onLoadedMetadata={(event) => {
                      const video = event.currentTarget;
                      setFileMeta({
                        duration: Number.isFinite(video.duration) ? video.duration : null,
                        width: video.videoWidth,
                        height: video.videoHeight,
                      });
                    }}
                  />
                ) : null}
                {fileMeta?.duration ? <span className="source-badge">{formatDuration(fileMeta.duration)}</span> : null}
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="kicker">Video file</p>
                <p className="text-sm sm:text-[0.9375rem] font-semibold text-[var(--fg-bright)] truncate">{file?.name}</p>
                <p className="timecode text-xs text-[var(--fg-muted)]">
                  {file ? formatBytes(file.size) : ""}
                  {fileMeta?.duration ? ` · ${formatDuration(fileMeta.duration)}` : ""}
                  {fileMeta?.width ? ` · ${fileMeta.width}×${fileMeta.height}` : ""}
                </p>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={busy !== null}
                  >
                    Replace file
                  </button>
                  <button
                    type="button"
                    className="btn btn-quiet btn-xs btn-danger-quiet"
                    onClick={removeFile}
                    disabled={busy !== null}
                    aria-label="Remove video"
                  >
                    <IconXMark className="h-3.5 w-3.5" aria-hidden="true" />
                    Remove
                  </button>
                </div>
              </div>
            </div>

            {busy === "file" && upload ? (
              <div className="cell p-4 space-y-2.5 source-swap" role="status">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">
                    {uploadPct >= 100 ? "Upload done. Starting your pack…" : `Uploading ${file?.name}`}
                  </span>
                  <span className="timecode tabular-nums">{uploadPct}%</span>
                </div>
                <div
                  className="upload-bar"
                  role="progressbar"
                  aria-label="Upload progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={uploadPct}
                >
                  <span style={{ transform: `scaleX(${uploadPct / 100})` }} />
                </div>
                <p className="timecode text-[11px] text-[var(--fg-subtle)]">
                  {formatBytes(upload.loaded)} of {formatBytes(upload.total)}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label htmlFor={captionsId} className="text-sm font-semibold text-[var(--fg-bright)]">
                    Captions link
                  </label>
                  <input
                    id={captionsId}
                    ref={captionsInputRef}
                    className="field min-h-11 text-[0.9375rem]"
                    value={url}
                    onChange={(event) => {
                      setUrl(event.target.value);
                      setError(null);
                    }}
                    onBlur={() => hasUrl && setTouched(true)}
                    onPaste={onInputPaste}
                    placeholder="youtube.com/watch?v=… for this same video"
                    inputMode="url"
                    autoComplete="url"
                    spellCheck={false}
                    aria-invalid={urlInvalid ? "true" : undefined}
                    aria-describedby={`${captionsId}-hint`}
                  />
                  <p id={`${captionsId}-hint`} className={`text-xs ${urlInvalid ? "text-bad" : "text-[var(--fg-subtle)]"}`}>
                    {urlInvalid
                      ? "That isn't a YouTube link. Paste the youtube.com or youtu.be link for this video."
                      : ytId
                        ? "Got it. We cut your file and read timestamps from this link's captions."
                        : "Uploads need this video's YouTube captions for timestamps. Speech-to-text isn't supported yet."}
                  </p>
                </div>
                <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
                  <button type="button" className="btn btn-quiet" onClick={removeFile}>
                    Use a YouTube link instead
                  </button>
                  <button type="submit" className="btn btn-primary btn-lg" disabled={busy !== null || !ytId}>
                    Create content pack
                    <IconArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </>
            )}
          </form>
        )}

        {error ? (
          <div role="alert" className="alert alert-bad mt-5 source-swap">
            <IconAlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span>{error}</span>
          </div>
        ) : null}
      </div>

      {dragging ? (
        <div className="absolute inset-3 sm:inset-4 source-drop animate-scale-in" aria-hidden="true">
          <span className="source-drop-icon">
            {dragKind === "link" ? <IconLink className="h-8 w-8" /> : <IconUpload className="h-8 w-8" />}
          </span>
          <p className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--fg-bright)]">
            {dragKind === "link" ? "Drop the link" : over ? "Let go to add it" : "Drop your video"}
          </p>
          <p className="text-sm text-[var(--fg-muted)]">
            {dragKind === "link" ? "We'll check it's a YouTube video." : "MP4, WebM or MOV, up to 500 MB"}
          </p>
        </div>
      ) : null}

      <p className="sr-only" aria-live="polite">
        {dragging ? (dragKind === "link" ? "Drop the link to add it" : "Drop the video to add it") : announce}
      </p>
    </section>
  );
}
