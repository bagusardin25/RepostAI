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
  type KeyboardEvent as ReactKeyboardEvent,
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
import { IconLink, IconUpload, IconXMark } from "@frontend/components/icons";

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
 * empty → paste or type a link; valid YouTube link → preview row;
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
        setError("That file isn't a video. Use an MP4, WebM or MOV.");
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
        if (phase !== "file") setAnnounce(data ? `YouTube video: ${data.title}` : "YouTube link added");
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
          throw new Error("Add this video's YouTube link. The cuts are timed from its captions.");
        }
        setBusy("file");
        setUpload({ loaded: 0, total: file.size });
        setAnnounce(`Uploading ${file.name}`);
        const { job } = await createJob(
          { file, youtubeUrl: url.trim() },
          { onUploadProgress: (loaded, total) => setUpload({ loaded, total }) },
        );
        setAnnounce("Uploaded. Starting the pack.");
        router.push(`/jobs/${job.id}`);
        return;
      }
      if (!ytId) {
        linkInputRef.current?.focus();
        throw new Error(
          hasUrl
            ? "Invalid YouTube URL. Paste a youtube.com or youtu.be link, or drop the video file."
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

  // Submit stays disabled until the link is a YouTube one, and a disabled submit also stops
  // Enter from sending the form. Say why on Enter instead of waiting for the field to blur.
  function onLinkKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" || !hasUrl || ytId) return;
    event.preventDefault();
    setTouched(true);
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
  const linkInvalidMessage = "Invalid YouTube URL. Paste a youtube.com or youtu.be link, or drop the video file.";
  const portrait = fileMeta ? fileMeta.height > fileMeta.width : false;
  const helpId = `${inputId}-help`;
  const submitLabel = busy === "url" ? "Starting…" : "Cut this video";

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
          <form onSubmit={onLinkSubmit} noValidate>
            <div
              className={`grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                phase === "empty" ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
              aria-hidden={phase === "empty" ? undefined : "true"}
            >
              <div className="overflow-hidden">
                <div className="pb-6">
                  <h1 id={`${inputId}-title`} className="page-title">
                    Paste a YouTube link
                  </h1>
                  <p id={helpId} className="mt-2 text-[0.9375rem] leading-normal text-[var(--fg-muted)]">
                    The video needs captions. You can also drop a video file anywhere on this page.
                  </p>
                </div>
              </div>
            </div>

            <label
              htmlFor={inputId}
              className={phase === "link" ? "mb-2.5 block text-sm font-semibold text-[var(--fg)]" : "sr-only"}
            >
              YouTube link
            </label>
            <div className="source-input-row" data-invalid={urlInvalid ? "true" : "false"}>
              <IconLink className="ml-2 h-[18px] w-[18px] shrink-0 text-[var(--fg-subtle)]" aria-hidden="true" />
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
                onKeyDown={onLinkKeyDown}
                onPaste={onInputPaste}
                placeholder="youtube.com/watch?v=…"
                inputMode="url"
                autoComplete="url"
                spellCheck={false}
                autoFocus
                disabled={busy !== null}
                aria-invalid={urlInvalid ? "true" : undefined}
                aria-describedby={urlInvalid ? hintId : phase === "empty" ? helpId : undefined}
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
                  <IconXMark className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : null}
              <button
                type="submit"
                className="btn btn-primary min-h-11 shrink-0 hidden sm:inline-flex"
                disabled={busy !== null || !ytId}
              >
                {submitLabel}
              </button>
            </div>
            {urlInvalid ? (
              <p id={hintId} role="alert" className="mt-2 text-sm text-bad">
                {linkInvalidMessage}
              </p>
            ) : null}
            <button type="submit" className="btn btn-primary btn-lg mt-3 w-full sm:hidden" disabled={busy !== null || !ytId}>
              {submitLabel}
            </button>

            {phase === "link" && ytId ? (
              <div className="source-preview source-swap mt-5">
                <div className="source-thumb w-32 sm:w-[10.5rem] aspect-video">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={youtubeThumbnail(ytId)} alt="" loading="lazy" />
                </div>
                <div className="min-w-0 space-y-1">
                  {preview?.loading ? (
                    <>
                      <span className="skel block h-4 w-48 max-w-full" />
                      <span className="skel block h-3 w-28" />
                    </>
                  ) : (
                    <>
                      <p className="text-[0.9375rem] font-semibold leading-snug text-[var(--fg-bright)] line-clamp-2">
                        {preview?.data?.title ?? "YouTube video"}
                      </p>
                      {preview?.data?.author ? (
                        <p className="text-[0.8125rem] text-[var(--fg-muted)] truncate">{preview.data.author}</p>
                      ) : null}
                    </>
                  )}
                  <p className="pt-1 text-[0.8125rem] text-[var(--fg-subtle)]">Captions are checked when the pack starts.</p>
                </div>
              </div>
            ) : null}

            {phase === "empty" ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-[var(--border)] pt-1 text-sm text-[var(--fg-muted)] sm:justify-start sm:border-0 sm:pt-0">
                <button
                  type="button"
                  className="btn source-file-btn min-h-11"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={busy !== null}
                >
                  <IconUpload className="hidden h-4 w-4 sm:block" aria-hidden="true" />
                  Choose a file
                </button>
                <span className="hidden sm:inline" aria-hidden="true">
                  or
                </span>
                <button
                  type="button"
                  className="btn btn-quiet min-h-11 px-1 font-semibold text-[var(--tally-fg)] hover:!text-[var(--tally-fg)]"
                  onClick={() => void submit("fixture")}
                  disabled={busy !== null}
                >
                  {busy === "fixture" ? "Starting the sample…" : "Run the sample"}
                </button>
                <span className="w-full text-[0.8125rem] text-[var(--fg-subtle)] sm:ml-auto sm:w-auto">
                  MP4, WebM or MOV · up to 500 MB
                </span>
              </div>
            ) : null}
          </form>
        ) : (
          <form onSubmit={onLinkSubmit} className="space-y-5 source-swap" noValidate>
            <h1 id={`${inputId}-title`} className="sr-only">
              Video ready to upload
            </h1>
            <div className="flex items-center gap-4">
              <div
                className={`source-thumb ${portrait ? "w-20 sm:w-[5.5rem] aspect-[9/16]" : "w-32 sm:w-[8.75rem] aspect-video"}`}
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
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-[0.9375rem] font-semibold text-[var(--fg-bright)] truncate">{file?.name}</p>
                <p className="timecode text-xs text-[var(--fg-muted)]">
                  {file ? formatBytes(file.size) : ""}
                  {fileMeta?.duration ? ` · ${formatDuration(fileMeta.duration)}` : ""}
                  {fileMeta?.width ? ` · ${fileMeta.width}×${fileMeta.height}` : ""}
                </p>
                {busy === "file" ? null : (
                  <div className="flex gap-1.5 pt-1.5">
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={busy !== null}
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      className="btn btn-quiet btn-xs btn-danger-quiet"
                      onClick={removeFile}
                      disabled={busy !== null}
                      aria-label="Remove video"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>

            {busy === "file" && upload ? (
              <div className="space-y-2.5 border-t border-[var(--border)] pt-[1.125rem] source-swap" role="status">
                <p className="flex items-center justify-between gap-3 text-sm text-[var(--fg)]">
                  <span>{uploadPct >= 100 ? "Uploaded. Starting the pack…" : "Uploading"}</span>
                  <span className="timecode tabular-nums text-[0.8125rem]">{uploadPct}%</span>
                </p>
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
                <p className="timecode text-xs text-[var(--fg-subtle)]">
                  {formatBytes(upload.loaded)} of {formatBytes(upload.total)}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label htmlFor={captionsId} className="block text-sm font-semibold text-[var(--fg)]">
                    YouTube link for this video
                  </label>
                  <input
                    id={captionsId}
                    ref={captionsInputRef}
                    className="field min-h-12 text-[0.9375rem]"
                    value={url}
                    onChange={(event) => {
                      setUrl(event.target.value);
                      setError(null);
                    }}
                    onBlur={() => hasUrl && setTouched(true)}
                    onKeyDown={onLinkKeyDown}
                    onPaste={onInputPaste}
                    placeholder="youtube.com/watch?v=…"
                    inputMode="url"
                    autoComplete="url"
                    spellCheck={false}
                    aria-invalid={urlInvalid ? "true" : undefined}
                    aria-describedby={`${captionsId}-hint`}
                  />
                  <p
                    id={`${captionsId}-hint`}
                    className={`text-[0.8125rem] leading-normal ${urlInvalid ? "text-bad" : "text-[var(--fg-muted)]"}`}
                  >
                    {urlInvalid
                      ? "Invalid YouTube URL. Paste the youtube.com or youtu.be link for this video."
                      : ytId
                        ? "Captions will come from this link."
                        : "The cuts come from your file. Their timing comes from this video's YouTube captions."}
                  </p>
                </div>
                <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
                  <button type="button" className="btn btn-quiet min-h-11" onClick={removeFile}>
                    Use a link instead
                  </button>
                  <button type="submit" className="btn btn-primary btn-lg" disabled={busy !== null || !ytId}>
                    Upload and cut
                  </button>
                </div>
              </>
            )}
          </form>
        )}

        {error ? (
          <div role="alert" className="alert alert-bad mt-5 source-swap">
            <span>{error}</span>
          </div>
        ) : null}
      </div>

      {dragging ? (
        <div className="source-drop animate-scale-in" aria-hidden="true">
          {dragKind === "link" ? (
            <IconLink className="h-8 w-8 text-[var(--tally-fg)]" />
          ) : (
            <IconUpload className="h-8 w-8 text-[var(--tally-fg)]" />
          )}
          <p className="font-display text-[1.75rem] font-semibold tracking-[-0.02em] text-[var(--fg-bright)]">
            {dragKind === "link" ? "Drop the link here" : over ? "Let go to add it" : "Drop the video here"}
          </p>
          <p className="text-sm text-[var(--fg-muted)]">
            {dragKind === "link" ? "It needs to be a YouTube link." : "MP4, WebM or MOV, up to 500 MB"}
          </p>
        </div>
      ) : null}

      <p className="sr-only" aria-live="polite">
        {dragging ? (dragKind === "link" ? "Drop the link to add it" : "Drop the video to add it") : announce}
      </p>
    </section>
  );
}
