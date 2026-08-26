import { MIN_CLIP_SEC, PLATFORMS, PLATFORM_SPECS } from "../lib/constants.js";
import { extractJsonObject } from "../lib/json.js";

export function parseTranscriptCues(transcript) {
  const cues = [];
  const lineRe = /\[(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\]\s*(.+)/g;
  let match;
  while ((match = lineRe.exec(transcript))) {
    const hours = match[1] ? Number(match[1]) : 0;
    const minutes = Number(match[2]);
    const seconds = Number(match[3]);
    cues.push({
      startSec: hours * 3600 + minutes * 60 + seconds,
      text: match[4].trim(),
    });
  }
  return cues;
}

export function textBetween(cues, startSec, endSec) {
  return cues
    .filter((cue) => cue.startSec >= startSec && cue.startSec < endSec)
    .map((cue) => cue.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function asPlatform(value) {
  return PLATFORMS.includes(value) ? value : null;
}

function asAspect(value, fallback) {
  if (value === "9:16" || value === "1:1" || value === "16:9") return value;
  return fallback;
}

function clampRecipe(recipe, durationSec) {
  const spec = PLATFORM_SPECS[recipe.platform];
  const maxEnd = durationSec && durationSec > 0 ? durationSec : recipe.endSec;
  let start = Math.max(0, Math.floor(recipe.startSec));
  let end = Math.max(start + MIN_CLIP_SEC, Math.ceil(recipe.endSec));
  end = Math.min(end, start + spec.maxDuration, Math.floor(maxEnd));
  if (end - start < MIN_CLIP_SEC) {
    start = Math.max(0, end - spec.maxDuration);
  }
  if (end - start < MIN_CLIP_SEC) return null;
  return {
    ...recipe,
    startSec: start,
    endSec: end,
    aspectRatio: recipe.aspectRatio || spec.aspectRatio,
    caption: recipe.caption.slice(0, spec.captionLimit),
    hashtags: recipe.hashtags.slice(0, 8),
  };
}

export function parseClipRecipes(payload, durationSec) {
  const root = payload ?? {};
  const list = Array.isArray(root.clips)
    ? root.clips
    : Array.isArray(root.packages)
      ? root.packages
      : Array.isArray(payload)
        ? payload
        : [];

  const recipes = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const platform = asPlatform(item.platform);
    if (!platform) continue;
    const spec = PLATFORM_SPECS[platform];
    const startSec = Number(item.startSec ?? item.start_sec ?? item.start);
    const endSec = Number(item.endSec ?? item.end_sec ?? item.end);
    if (!Number.isFinite(startSec) || !Number.isFinite(endSec)) continue;
    const hashtags = Array.isArray(item.hashtags)
      ? item.hashtags.map(String)
      : String(item.hashtags ?? "")
          .split(/[\s,]+/)
          .filter(Boolean);
    const recipe = clampRecipe(
      {
        platform,
        startSec,
        endSec,
        aspectRatio: asAspect(item.aspectRatio ?? item.aspect_ratio, spec.aspectRatio),
        reason: String(item.reason ?? item.why ?? "Selected as a platform-ready moment."),
        hook: String(item.hook ?? "").slice(0, 120),
        caption: String(item.caption ?? item.copy ?? ""),
        hashtags,
      },
      durationSec,
    );
    if (recipe) recipes.push(recipe);
  }

  const seen = new Set();
  return recipes.filter((recipe) => {
    const key = `${recipe.platform}:${recipe.startSec}:${recipe.endSec}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function parseMindClipRecipes(text, durationSec) {
  return parseClipRecipes(extractJsonObject(text), durationSec);
}

export function fallbackClipRecipes(transcript, durationSec) {
  const cues = parseTranscriptCues(transcript);
  const duration =
    durationSec && durationSec > 0
      ? durationSec
      : cues.length > 0
        ? Math.max(cues[cues.length - 1].startSec + 20, 45)
        : 60;

  const windows = [
    { platform: "tiktok", start: Math.min(8, Math.max(0, duration * 0.08)), len: 18 },
    { platform: "instagram", start: duration * 0.38, len: 22 },
    { platform: "x", start: Math.max(duration * 0.72, duration - 28), len: 16 },
  ];

  return windows
    .map((window) => {
      const spec = PLATFORM_SPECS[window.platform];
      const startSec = Math.floor(Math.max(0, window.start));
      const endSec = Math.min(duration, startSec + window.len);
      const spoken = textBetween(cues, startSec, endSec);
      const snippet = spoken || "Key moment from the source video.";
      return clampRecipe(
        {
          platform: window.platform,
          startSec,
          endSec,
          aspectRatio: spec.aspectRatio,
          reason: fallbackReason(window.platform),
          hook: hookFromText(snippet),
          caption: captionFromText(window.platform, snippet),
          hashtags: hashtagsFor(window.platform),
        },
        duration,
      );
    })
    .filter(Boolean);
}

function fallbackReason(platform) {
  if (platform === "tiktok") return "Hook-first opening: the first dense spoken beat after the intro.";
  if (platform === "instagram") return "Mid-video explanation with enough context for a Reels loop.";
  return "Closing punchline / takeaway sized for an X video.";
}

function hookFromText(text) {
  const clean = text.replace(/^[-–—]\s*/, "").trim();
  if (!clean) return "Watch this part.";
  const sentence = clean.split(/(?<=[.!?])\s+/)[0] ?? clean;
  return sentence.slice(0, 90);
}

function captionFromText(platform, text) {
  const base = text || "New clip from today's video.";
  if (platform === "x") return base.slice(0, 240);
  return `${base}\n\nFull breakdown on the original video.`.slice(
    0,
    PLATFORM_SPECS[platform].captionLimit,
  );
}

function hashtagsFor(platform) {
  if (platform === "tiktok") return ["#fyp", "#creatortips", "#repostai"];
  if (platform === "instagram") return ["#reels", "#creators", "#contentrepurpose"];
  return ["#buildinpublic"];
}
