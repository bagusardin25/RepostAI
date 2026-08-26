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
    label: "Fetch",
    detail: "Pulling the source video and transcript.",
  },
  {
    key: "analyzing",
    label: "Analyze",
    detail: "The Mind is choosing moments and writing platform copy.",
  },
  {
    key: "clipping",
    label: "Cut",
    detail: "Writing 9:16 files from the selected windows.",
  },
  {
    key: "ready",
    label: "Review",
    detail: "Packages are ready. Nothing publishes without you.",
  },
] as const;

export const JOB_STATUS_COPY: Record<string, { label: string; detail: string }> = {
  queued: { label: "Queued", detail: "Waiting for the cutter to pick up the job." },
  fetching_source: JOB_STAGES[0],
  analyzing: JOB_STAGES[1],
  clipping: JOB_STAGES[2],
  ready: JOB_STAGES[3],
  failed: { label: "Failed", detail: "The job stopped. Retry, or start a new source." },
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
  return value;
}
