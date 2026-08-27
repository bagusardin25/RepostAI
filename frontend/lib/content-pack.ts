import type { ClipPackage, ContentArtifacts } from "@frontend/lib/api";
import { formatDuration } from "@frontend/lib/format";

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

export function formatClipPost(clip: {
  platform: string;
  durationSec: number;
  displayHook: string;
  displayCaption: string;
  hashtags: string[];
}) {
  const tags = formatHashtags(clip.hashtags);
  return [
    `[${clip.platform.toUpperCase()} · ${formatDuration(clip.durationSec)}]`,
    "HOOK:",
    clip.displayHook,
    "",
    "CAPTION:",
    clip.displayCaption,
    tags ? `\nTAGS:\n${tags}` : "",
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

export function formatReadyClips(clips: ClipPackage[]) {
  const ready = clips.filter((clip) => isClipReady(clip.status));
  const waitingCount = clips.filter((clip) => clip.status === "needs_review").length;
  return {
    ready,
    waitingCount,
    text: ready.map(formatClipPost).join("\n\n---\n\n"),
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

export function formatContentPack(clips: ClipPackage[], artifacts: ContentArtifacts | null) {
  const pack = formatReadyClips(clips);
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
