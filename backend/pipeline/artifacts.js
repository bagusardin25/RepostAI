import { extractJsonObject } from "../lib/json.js";
import { parseTranscriptCues, textBetween } from "./recipes.js";

const EMPTY = {
  tiktokScript: { lines: [], onScreenText: "", cta: "" },
  instagramCarousel: { slides: [] },
  xThread: { tweets: [] },
  linkedinPost: { text: "" },
};

export function emptyArtifacts() {
  return structuredClone(EMPTY);
}

export function parseMindArtifacts(text, transcript) {
  const fallback = fallbackArtifacts(transcript);
  if (!text || typeof text !== "string") return fallback;
  try {
    const root = extractJsonObject(text);
    const raw = root.artifacts && typeof root.artifacts === "object" ? root.artifacts : root;
    return mergeArtifacts(normalizeArtifacts(raw), fallback);
  } catch {
    return fallback;
  }
}

export function fallbackArtifacts(transcript) {
  const cues = parseTranscriptCues(transcript ?? "");
  const sentences = spokenSentences(cues, transcript ?? "");
  const hook = sentences[0] || "One source video. Three platform jobs.";
  const takeaway = sentences[Math.min(2, sentences.length - 1)] || hook;

  return {
    tiktokScript: {
      lines: sentences.slice(0, 6).map((line, index) =>
        index === 0 ? hook.slice(0, 90) : line.slice(0, 110),
      ),
      onScreenText: hook.slice(0, 48),
      cta: "Follow for the next cut.",
    },
    instagramCarousel: {
      slides: [
        { title: "The problem", body: hook },
        {
          title: "Why copy-paste fails",
          body: sentences[1] || "Each platform wants a different first three seconds.",
        },
        {
          title: "The rule",
          body: sentences[2] || "One source, three jobs, never the same hook.",
        },
        {
          title: "What to do",
          body: sentences[3] || "Put the muted-video sentence at second zero.",
        },
        { title: "CTA", body: "Save this and reuse the next upload." },
      ],
    },
    xThread: {
      tweets: buildThread(sentences, hook, takeaway),
    },
    linkedinPost: {
      text: buildLinkedIn(sentences, hook, takeaway),
    },
  };
}

export function artifactsHaveContent(artifacts) {
  if (!artifacts || typeof artifacts !== "object") return false;
  return (
    (artifacts.tiktokScript?.lines?.length ?? 0) > 0 ||
    (artifacts.instagramCarousel?.slides?.length ?? 0) > 0 ||
    (artifacts.xThread?.tweets?.length ?? 0) > 0 ||
    Boolean(artifacts.linkedinPost?.text)
  );
}

function normalizeArtifacts(raw) {
  const script = raw.tiktokScript ?? raw.tiktok_script ?? {};
  const carousel = raw.instagramCarousel ?? raw.instagram_carousel ?? raw.carousel ?? {};
  const thread = raw.xThread ?? raw.x_thread ?? raw.twitterThread ?? {};
  const linkedin = raw.linkedinPost ?? raw.linkedin_post ?? raw.linkedin ?? {};

  const lines = asStringList(script.lines ?? script.script).map((line) => line.slice(0, 160));
  const slides = asSlides(carousel.slides ?? carousel);
  const tweets = asStringList(thread.tweets ?? thread.posts ?? thread)
    .map((tweet) => tweet.slice(0, 280))
    .filter(Boolean);
  const text = String(linkedin.text ?? linkedin.body ?? (typeof linkedin === "string" ? linkedin : ""))
    .trim()
    .slice(0, 3000);

  return {
    tiktokScript: {
      lines,
      onScreenText: String(script.onScreenText ?? script.on_screen_text ?? lines[0] ?? "").slice(0, 80),
      cta: String(script.cta ?? "Follow for the next cut.").slice(0, 80),
    },
    instagramCarousel: { slides },
    xThread: { tweets },
    linkedinPost: { text },
  };
}

function mergeArtifacts(parsed, fallback) {
  return {
    tiktokScript: {
      lines: parsed.tiktokScript.lines.length ? parsed.tiktokScript.lines : fallback.tiktokScript.lines,
      onScreenText: parsed.tiktokScript.onScreenText || fallback.tiktokScript.onScreenText,
      cta: parsed.tiktokScript.cta || fallback.tiktokScript.cta,
    },
    instagramCarousel: {
      slides:
        parsed.instagramCarousel.slides.length > 0
          ? parsed.instagramCarousel.slides
          : fallback.instagramCarousel.slides,
    },
    xThread: {
      tweets: parsed.xThread.tweets.length ? parsed.xThread.tweets : fallback.xThread.tweets,
    },
    linkedinPost: {
      text: parsed.linkedinPost.text || fallback.linkedinPost.text,
    },
  };
}

function asStringList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === "string" && value.trim()) {
    return value
      .split(/\n+/)
      .map((line) => line.replace(/^\d+[\).\s-]+/, "").trim())
      .filter(Boolean);
  }
  return [];
}

function asSlides(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((slide, index) => {
      if (!slide) return null;
      if (typeof slide === "string") {
        return { title: `Slide ${index + 1}`, body: slide.trim().slice(0, 280) };
      }
      const title = String(slide.title ?? slide.heading ?? `Slide ${index + 1}`).slice(0, 80);
      const body = String(slide.body ?? slide.text ?? slide.copy ?? "").trim().slice(0, 320);
      if (!body) return null;
      return { title, body };
    })
    .filter(Boolean)
    .slice(0, 8);
}

function spokenSentences(cues, transcript) {
  const spoken =
    cues.length > 0
      ? textBetween(cues, 0, Number.POSITIVE_INFINITY)
      : transcript.replace(/\[[^\]]+\]/g, " ");
  return spoken
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter((part) => part.length > 12)
    .slice(0, 10);
}

function buildThread(sentences, hook, takeaway) {
  const tweets = [
    hook.slice(0, 240),
    (sentences[1] || "Most creators copy the same clip to every platform. That is the leak.").slice(0, 240),
    (sentences[2] || "TikTok wants a punch. Reels want a loop. X wants one takeaway.").slice(0, 240),
    (sentences[3] || takeaway).slice(0, 240),
    "Review every package before it ships. The next batch should already sound like you.",
  ];
  return tweets.filter((tweet, index, list) => list.findIndex((item) => item === tweet) === index);
}

function buildLinkedIn(sentences, hook, takeaway) {
  const body = [
    hook,
    "",
    sentences[1] || "Repurposing is where the original idea usually dies.",
    sentences[2] || "Each channel has a different first three seconds, length, and tone.",
    "",
    takeaway,
    "",
    "I review every draft before it ships. The agent is supposed to learn the corrections — not publish for me.",
  ];
  return body.join("\n").slice(0, 3000);
}
