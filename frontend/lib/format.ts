import { PLATFORM_SPECS, type Platform } from "@frontend/lib/constants";

export const PLATFORM_LABEL: Record<Platform, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  x: "X",
};

export const PLATFORM_CODE: Record<Platform, string> = {
  tiktok: "TT",
  instagram: "IG",
  x: "X",
};

export const JOB_STAGES = [
  {
    key: "fetching_source",
    label: "Get video",
    detail: "Downloading the video and reading its captions.",
  },
  {
    key: "analyzing",
    label: "Pick moments",
    detail: "Choosing three moments and drafting the posts.",
  },
  {
    key: "clipping",
    label: "Cut clips",
    detail: "Cutting the 9:16 files and finishing the drafts.",
  },
  {
    key: "ready",
    label: "Review",
    detail: "Approve each clip, then copy or download.",
  },
] as const;

export const JOB_STATUS_COPY: Record<string, { label: string; detail: string }> = {
  queued: { label: "Queued", detail: "Waiting to start this pack." },
  fetching_source: JOB_STAGES[0],
  analyzing: JOB_STAGES[1],
  clipping: JOB_STAGES[2],
  ready: JOB_STAGES[3],
  failed: { label: "Failed", detail: "This pack stopped. Retry it, or start a new one." },
};

export const STATUS_LABEL: Record<string, string> = {
  queued: "Queued",
  fetching_source: "Getting video",
  analyzing: "Picking moments",
  clipping: "Cutting clips",
  ready: "Ready to review",
  completed: "Completed",
  failed: "Failed",
  needs_review: "To review",
  approved: "Approved",
  edited: "Approved",
  rejected: "Rejected",
};

export function isPlatform(value: string): value is Platform {
  return value === "tiktok" || value === "instagram" || value === "x";
}

export function platformLabel(value: string) {
  return isPlatform(value) ? PLATFORM_LABEL[value] : value;
}

export function platformSpecLine(value: string) {
  if (!isPlatform(value)) return "";
  const spec = PLATFORM_SPECS[value];
  return `${spec.aspectRatio} · ${spec.maxDuration}s · ${spec.captionLimit} chars`;
}

export function formatClock(unixSec: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(unixSec * 1000));
}

export function formatRelative(unixSec: number) {
  const delta = Math.floor(Date.now() / 1000) - unixSec;
  if (delta < 45) return "just now";
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
  if (delta < 604800) return `${Math.floor(delta / 86400)}d ago`;
  return formatClock(unixSec);
}

export function formatDuration(sec: number | null | undefined) {
  if (sec == null) return "—";
  const total = Math.max(0, Math.floor(sec));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function sourceTypeLabel(value: string) {
  if (value === "youtube") return "YouTube";
  if (value === "fixture") return "Sample";
  if (value === "upload") return "Upload";
  if (value === "watch") return "Channel watch";
  return value;
}

export function statusLabel(value: string) {
  return STATUS_LABEL[value] ?? value.replaceAll("_", " ");
}

/** A ready pack with no clip left to review reads "Completed", not "Ready for review". */
export function packStatus(status: string, pendingReview: number, clipCount: number) {
  return status === "ready" && clipCount > 0 && pendingReview === 0 ? "completed" : status;
}

export function analyzerLabel(value: string | null | undefined) {
  if (value === "minds") return "Picked by the Mind";
  if (value === "fallback") return "Picked by the built-in picker. The Mind wasn't available for this pack.";
  return null;
}

export function formatElapsed(fromUnixSec: number, nowMs = Date.now()) {
  const sec = Math.max(0, Math.floor(nowMs / 1000) - fromUnixSec);
  if (sec < 60) return `${sec}s`;
  const minutes = Math.floor(sec / 60);
  const remain = sec % 60;
  return `${minutes}m ${String(remain).padStart(2, "0")}s`;
}
