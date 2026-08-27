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
    label: "Reading source",
    detail: "Pulling the video and captions.",
  },
  {
    key: "analyzing",
    label: "Finding moments",
    detail: "Picking the strongest windows and drafting copy.",
  },
  {
    key: "clipping",
    label: "Preparing clips",
    detail: "Cutting 9:16 files and finishing your drafts.",
  },
  {
    key: "ready",
    label: "Ready for review",
    detail: "Review each clip, then copy or download.",
  },
] as const;

export const JOB_STATUS_COPY: Record<string, { label: string; detail: string }> = {
  queued: { label: "Queued", detail: "Waiting to start this content pack." },
  fetching_source: JOB_STAGES[0],
  analyzing: JOB_STAGES[1],
  clipping: JOB_STAGES[2],
  ready: JOB_STAGES[3],
  failed: { label: "Failed", detail: "This pack stopped. Retry, or start a new source." },
};

export const STATUS_LABEL: Record<string, string> = {
  queued: "Queued",
  fetching_source: "Reading source",
  analyzing: "Finding moments",
  clipping: "Preparing clips",
  ready: "Ready for review",
  failed: "Failed",
  needs_review: "Needs review",
  approved: "Ready",
  edited: "Ready",
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
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function sourceTypeLabel(value: string) {
  if (value === "youtube") return "YouTube";
  if (value === "fixture") return "Demo";
  if (value === "upload") return "Upload";
  if (value === "watch") return "Channel watch";
  return value;
}

export function statusLabel(value: string) {
  return STATUS_LABEL[value] ?? value.replaceAll("_", " ");
}

export function analyzerLabel(value: string | null | undefined) {
  if (value === "minds") return "Mind";
  if (value === "fallback") return "Alternative processing";
  return null;
}

export function formatElapsed(fromUnixSec: number, nowMs = Date.now()) {
  const sec = Math.max(0, Math.floor(nowMs / 1000) - fromUnixSec);
  if (sec < 60) return `${sec}s`;
  const minutes = Math.floor(sec / 60);
  const remain = sec % 60;
  return `${minutes}m ${String(remain).padStart(2, "0")}s`;
}
