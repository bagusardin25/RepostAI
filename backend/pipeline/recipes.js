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
  const unique = recipes.filter((recipe) => {
    const key = `${recipe.platform}:${recipe.startSec}:${recipe.endSec}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return diversifyClipWindows(unique, durationSec);
}

export function diversifyClipWindows(recipes, durationSec) {
  const duration =
    durationSec && durationSec > 0
      ? durationSec
      : Math.max(...recipes.map((recipe) => recipe.endSec), 60);
  const used = new Set();
  return recipes.map((recipe) => {
    const key = `${recipe.startSec}:${recipe.endSec}`;
    if (!used.has(key)) {
      used.add(key);
      return recipe;
    }
    const spread = fallbackWindow(recipe.platform, duration);
    const next = clampRecipe({ ...recipe, startSec: spread.startSec, endSec: spread.endSec }, duration);
    if (!next) return recipe;
    const nextKey = `${next.startSec}:${next.endSec}`;
    if (used.has(nextKey)) return recipe;
    used.add(nextKey);
    return next;
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
    { platform: "tiktok", ...fallbackWindow("tiktok", duration) },
    { platform: "instagram", ...fallbackWindow("instagram", duration) },
    { platform: "x", ...fallbackWindow("x", duration) },
  ];

  return windows
    .map((window) => {
      const spec = PLATFORM_SPECS[window.platform];
      const startSec = window.startSec;
      const endSec = window.endSec;
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

export function fallbackWindow(platform, durationSec) {
  const duration = durationSec && durationSec > 0 ? durationSec : 60;
  if (platform === "tiktok") {
    const startSec = Math.floor(Math.min(8, Math.max(0, duration * 0.08)));
    return { startSec, endSec: Math.min(duration, startSec + Math.min(18, Math.max(8, duration))) };
  }
  if (platform === "instagram") {
    const startSec = Math.floor(duration * 0.38);
    return { startSec, endSec: Math.min(duration, startSec + 22) };
  }
  const startSec = Math.floor(Math.max(duration * 0.72, duration - 28));
  return { startSec, endSec: Math.min(duration, startSec + 16) };
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
