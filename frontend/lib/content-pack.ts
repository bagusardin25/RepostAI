import type { ClipPackage, ContentArtifacts } from "@frontend/lib/api";
import { formatDuration } from "@frontend/lib/format";
import { clipTranscript, timedTranscript } from "@frontend/lib/transcript";

export function isClipReady(status: string) {
  return status === "approved" || status === "edited";
}

export function clipStatusLabel(status: string) {
  if (status === "approved" || status === "edited") return "Ready";
  if (status === "needs_review") return "Needs review";
  if (status === "rejected") return "Rejected";
  return status.replaceAll("_", " ");
}

export function formatHashtags(tags: string[]) {
  return tags.map((tag) => (tag.startsWith("#") ? tag : `#${tag}`)).join(" ");
}

/** One clip in Copy pack: hook, caption, tags, and the lines spoken in it when the transcript is known. */
export function formatClipPost(
  clip: {
    platform: string;
    startSec: number;
    endSec: number;
    durationSec: number;
    displayHook: string;
    displayCaption: string;
    hashtags: string[];
  },
  transcript = "",
) {
  const tags = formatHashtags(clip.hashtags);
  const spoken = timedTranscript(clipTranscript(transcript, clip.startSec, clip.endSec));
  return [
    `[${clip.platform.toUpperCase()} · ${formatDuration(clip.durationSec)}]`,
    "HOOK:",
    clip.displayHook,
    "",
    "CAPTION:",
    clip.displayCaption,
    tags ? `\nTAGS:\n${tags}` : "",
    spoken ? `\nTRANSCRIPT:\n${spoken}` : "",
  ]
    .join("\n")
    .trim();
}

export function summarizeClipDecisions(clips: Pick<ClipPackage, "status">[]) {
  return {
    readyCount: clips.filter((clip) => isClipReady(clip.status)).length,
    waitingCount: clips.filter((clip) => clip.status === "needs_review").length,
    rejectedCount: clips.filter((clip) => clip.status === "rejected").length,
  };
}

export function clipFileName(clip: Pick<ClipPackage, "id" | "platform">) {
  return `${clip.platform}-${clip.id.slice(0, 6)}.mp4`;
}

/** The clip's MP4 link that saves the file instead of opening it in the player. */
export function clipDownloadUrl(clip: Pick<ClipPackage, "id" | "platform" | "videoUrl">) {
  if (!clip.videoUrl) return null;
  const join = clip.videoUrl.includes("?") ? "&" : "?";
  return `${clip.videoUrl}${join}download=${encodeURIComponent(clipFileName(clip))}`;
}

export function formatReadyClips(clips: ClipPackage[], transcript = "") {
  const ready = clips.filter((clip) => isClipReady(clip.status));
  const waitingCount = clips.filter((clip) => clip.status === "needs_review").length;
  return {
    ready,
    waitingCount,
    text: ready.map((clip) => formatClipPost(clip, transcript)).join("\n\n---\n\n"),
  };
}

export function formatDraft(artifacts: ContentArtifacts, tab: "script" | "carousel" | "thread" | "linkedin") {
  if (tab === "script") {
    return [
      artifacts.tiktokScript.onScreenText && `On-screen: ${artifacts.tiktokScript.onScreenText}`,
      ...artifacts.tiktokScript.lines.map((line, index) => `${index + 1}. ${line}`),
      artifacts.tiktokScript.cta && `CTA: ${artifacts.tiktokScript.cta}`,
    ]
      .filter(Boolean)
      .join("\n");
  }
  if (tab === "carousel") {
    return artifacts.instagramCarousel.slides
      .map((slide, index) => `${index + 1}. ${slide.title}\n${slide.body}`)
      .join("\n\n");
  }
  if (tab === "thread") {
    return artifacts.xThread.tweets
      .map((tweet, index) => `${index + 1}/${artifacts.xThread.tweets.length}\n${tweet}`)
      .join("\n\n");
  }
  return artifacts.linkedinPost.text;
}

export function formatAllDrafts(artifacts: ContentArtifacts) {
  return [
    "## TikTok script",
    formatDraft(artifacts, "script"),
    "",
    "## Instagram carousel",
    formatDraft(artifacts, "carousel"),
    "",
    "## X thread",
    formatDraft(artifacts, "thread"),
    "",
    "## LinkedIn",
    formatDraft(artifacts, "linkedin"),
  ].join("\n");
}

export function formatContentPack(clips: ClipPackage[], artifacts: ContentArtifacts | null, transcript = "") {
  const pack = formatReadyClips(clips, transcript);
  const drafts = artifacts ? formatAllDrafts(artifacts) : "";
  const parts = [
    pack.text && `## Ready clips\n\n${pack.text}`,
    drafts && `## Text drafts\n\n${drafts}`,
  ].filter(Boolean);

  return {
    ready: pack.ready,
    waitingCount: pack.waitingCount,
    draftsIncluded: Boolean(drafts),
    text: parts.join("\n\n----\n\n"),
  };
}

/** Clips still in review are left out of Copy pack on purpose, so the toast says so. */
export function copyPackMessage(
  pack: Pick<ReturnType<typeof formatContentPack>, "ready" | "waitingCount" | "draftsIncluded">,
) {
  const copied = [
    pack.ready.length > 0 ? `${pack.ready.length} clip${pack.ready.length === 1 ? "" : "s"}` : null,
    pack.draftsIncluded ? "4 drafts" : null,
  ].filter(Boolean);
  const left =
    pack.waitingCount === 0
      ? ""
      : pack.waitingCount === 1
        ? " 1 clip still needs review and is left out until you approve it."
        : ` ${pack.waitingCount} clips still need review and are left out until you approve them.`;
  return `Copied ${copied.join(" + ")}.${left}`;
}

export function draftTeasers(artifacts: ContentArtifacts) {
  return [
    {
      key: "script" as const,
      label: "TikTok script",
      meta: `${artifacts.tiktokScript.lines.length} lines`,
      tease: artifacts.tiktokScript.lines[0] || artifacts.tiktokScript.onScreenText || "Spoken script",
    },
    {
      key: "carousel" as const,
      label: "IG carousel",
      meta: `${artifacts.instagramCarousel.slides.length} slides`,
      tease: artifacts.instagramCarousel.slides[0]?.title || "Carousel slides",
    },
    {
      key: "thread" as const,
      label: "X thread",
      meta: `${artifacts.xThread.tweets.length} posts`,
      tease: artifacts.xThread.tweets[0] || "Thread",
    },
    {
      key: "linkedin" as const,
      label: "LinkedIn",
      meta: `${artifacts.linkedinPost.text.length} chars`,
      tease: artifacts.linkedinPost.text || "Post draft",
    },
  ];
}
