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

export function parseMindClipRecipes(text, durationSec, transcript) {
  return groundPlatformCopy(parseClipRecipes(extractJsonObject(text), durationSec), transcript);
}

export function fallbackClipRecipes(transcript, durationSec, title = "") {
  const cues = parseTranscriptCues(transcript);
  const duration =
    durationSec && durationSec > 0
      ? durationSec
      : cues.length > 0
        ? Math.max(cues[cues.length - 1].startSec + 20, 45)
        : 60;
  const heading = String(title ?? "").trim();

  const windows = [
    { platform: "tiktok", ...fallbackWindow("tiktok", duration) },
    { platform: "instagram", ...fallbackWindow("instagram", duration) },
    { platform: "x", ...fallbackWindow("x", duration) },
  ];

  return windows
    .map((window) => {
      const spec = PLATFORM_SPECS[window.platform];
      return clampRecipe(
        {
          platform: window.platform,
          startSec: window.startSec,
          endSec: window.endSec,
          aspectRatio: spec.aspectRatio,
          reason: "",
          hook: "",
          caption: "",
          hashtags: [],
        },
        duration,
      );
    })
    .filter(Boolean)
    .map((recipe) => {
      const { platform } = recipe;
      const spoken = textBetween(cues, recipe.startSec, recipe.endSec);
      const lines = spokenLines(cues, recipe.startSec, recipe.endSec);
      const copy =
        lines.length > 0
          ? {
              hook: trimTo(lines[0], HOOK_LIMIT),
              caption: captionFromLines(platform, lines),
              hashtags: keywordTags(spoken, TAG_LIMITS[platform].max),
            }
          : {
              hook: heading ? trimTo(cleanCaption("x", heading), HOOK_LIMIT) : "Watch this part.",
              caption: cleanCaption(platform, heading) || "Key moment from the source video.",
              hashtags: keywordTags(heading, TAG_LIMITS[platform].max),
            };
      return { ...recipe, ...copy, reason: `${clockRange(recipe)} · ${FALLBACK_REASONS[platform]}` };
    });
}

const HOOK_LIMIT = 90;
const X_CAPTION_LIMIT = 220;
const HOOK_MATCH = 0.6;
const CAPTION_MATCH = 0.5;
const MIN_LINE_WORDS = 6;

const TAG_LIMITS = {
  tiktok: { min: 3, max: 4 },
  instagram: { min: 4, max: 5 },
  x: { min: 1, max: 2 },
};

const BANNED_TAGS = new Set(
  "#fyp #fy #foryou #foryoupage #viral #trending #explore #reels #repostai #creators".split(" "),
);

const PLATFORM_FIT = {
  tiktok: "Spoken beat short enough to open a TikTok.",
  instagram: "Self-contained spoken explanation for a Reel.",
  x: "Single spoken takeaway sized for an X video.",
};

const FALLBACK_REASONS = {
  tiktok: "Fallback pick (AI analysis unavailable): opening section of the video.",
  instagram: "Fallback pick (AI analysis unavailable): middle section of the video.",
  x: "Fallback pick (AI analysis unavailable): closing section of the video.",
};

const ZERO_CLAIM = /\bsecond zero\b|\bat zero\b|\b0:00\b/i;
const LEADING_RANGE = /^\s*\d{1,2}(?::\d{2}){1,2}\s*[–-]\s*\d{1,2}(?::\d{2}){1,2}\s*[.·:—-]?\s*/;
const SENTENCE_BREAK = /(?<=[.!?]["'”’)\]]*)\s+(?=[\p{Lu}\p{N}"'“‘(])/u;

// Scripts written without spaces cannot be split into words here.
const UNSPACED_SCRIPT = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/u;

// Common English and Indonesian words that say nothing about the clip.
const STOP_WORDS = new Set(
  [
    "a an the and or but if so to of in on for with from at by as is are was were be been being am",
    "it its this that these those you your yours youre youve youll yourself i im ive me my mine myself",
    "we weve our ours us they theyre them their theirs he she his her him not no yes just then than",
    "too very really about into out up down over under after before again more most some any own same",
    "other such only also can could will would shall should may might must do does did doing done",
    "dont doesnt didnt have has had having havent there here what whats when where who whom whose how",
    "why which while all both each every few many much lot lots get got gets go goes going gonna wanna",
    "make makes made want wants know think thing things something anything everything someone people",
    "yeah okay right well still even back now one ones way time times kind sort actually basically",
    "literally like said say says tell told see look let lets thats theres isnt arent wasnt cant wont",
    "yang dan di ke dari ini itu untuk dengan adalah dalam tidak tak akan juga sudah telah sedang masih",
    "bisa dapat atau karena jadi kalau jika maka saya aku kamu anda kita kami mereka dia ada seperti",
    "lebih sangat paling menurut harus hanya agar supaya namun tetapi tapi lagi sama semua banyak orang",
    "buat bikin membuat gitu kayak udah aja nggak enggak gak ya dong sih kan lah nya pun para oleh bagi",
    "tentang secara hal bahwa ketika saat setelah sebelum sambil begitu begini sini sana situ apa siapa",
    "mana kenapa mengapa bagaimana",
    "first second third next last new old good great nice best better big bigger biggest small little",
    "single different whole sure maybe pretty quite slightly finally always never often today two three",
    "four five six seven eight nine ten hundred need needs find found check come coming came take took",
    "give gave keep put use used try because though although however since until unless whether",
  ]
    .join(" ")
    .split(" "),
);

// Mind copy carries the creator's learned voice, so it stays unless the transcript
// shows it was not said in this clip (or not in this video at all).
export function groundPlatformCopy(recipes, transcript) {
  const cues = parseTranscriptCues(transcript || "");
  const allSpeech = cues.map((cue) => cue.text).join(" ");
  return recipes.map((recipe) => {
    const { platform } = recipe;
    const limits = TAG_LIMITS[platform];
    const spoken = textBetween(cues, recipe.startSec, recipe.endSec);
    const lines = spokenLines(cues, recipe.startSec, recipe.endSec);
    const cleaned = cleanCaption(platform, recipe.caption);

    const hookFits = !spoken || fitsSpeech(recipe.hook, spoken, HOOK_MATCH);
    const captionFits = !allSpeech || fitsSpeech(cleaned, allSpeech, CAPTION_MATCH);
    const hook = hookFits ? recipe.hook : trimTo(lines[0], HOOK_LIMIT);
    const caption = captionFits || lines.length === 0 ? cleaned : captionFromLines(platform, lines);

    const ownTags = cleanTags(recipe.hashtags).slice(0, limits.max);
    const hashtags =
      ownTags.length >= limits.min
        ? ownTags
        : [...ownTags, ...keywordTags(spoken, limits.min - ownTags.length, ownTags)];

    const note = String(recipe.reason ?? "").replace(LEADING_RANGE, "").trim();
    const noteFits = hookFits && note && !(recipe.startSec > 0 && ZERO_CLAIM.test(note));
    const reason = `${clockRange(recipe)} · ${noteFits ? note : PLATFORM_FIT[platform]}`;

    return { ...recipe, hook, caption, hashtags, reason };
  });
}

function clock(totalSec) {
  const safe = Math.max(0, Math.floor(Number(totalSec) || 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const clocked = `${minutes}:${String(seconds).padStart(2, "0")}`;
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}` : clocked;
}

function clockRange(recipe) {
  return `${clock(recipe.startSec)}–${clock(recipe.endSec)}`;
}

function contentWords(text) {
  const words = String(text ?? "").toLowerCase().replace(/['’]/g, "").match(/[\p{L}\p{N}]+/gu) ?? [];
  return words.filter(
    (word) =>
      word.length >= 3 &&
      word.length <= 24 &&
      !/^\d+$/.test(word) &&
      !UNSPACED_SCRIPT.test(word) &&
      !STOP_WORDS.has(word),
  );
}

function stem(word) {
  return word.length > 4 ? word.replace(/(?:ing|ed|es|s)$/, "") : word;
}

function squash(text) {
  return String(text ?? "").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

// A verbatim line always fits. Otherwise enough of its content words must appear in
// the speech; text with no comparable words (scripts written without spaces) is kept.
function fitsSpeech(text, speech, threshold) {
  const line = squash(text);
  if (!line) return false;
  if (squash(speech).includes(line)) return true;
  const words = contentWords(text);
  if (words.length === 0) return true;
  const known = new Set(contentWords(speech).map(stem));
  return words.filter((word) => known.has(stem(word))).length / words.length >= threshold;
}

function wordCount(text) {
  return String(text ?? "").split(/\s+/).filter(Boolean).length;
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Cuts at a word boundary and marks the cut with an ellipsis, never a fake full stop.
function trimTo(text, max) {
  const clean = String(text ?? "").trim();
  if (clean.length <= max) return clean;
  const cut = clean.lastIndexOf(" ", max - 1);
  const base = clean.slice(0, cut > max / 2 ? cut : max - 1).replace(/[\s,;:.!?–—-]+$/, "");
  return `${base}…`;
}

// Auto-captions carry no punctuation, so a run of cues about one breath long
// stands in for a sentence.
function cueRuns(cues) {
  const runs = [];
  let run = [];
  for (const cue of cues) {
    run.push(cue.text.trim());
    const joined = run.join(" ");
    if (wordCount(joined) >= 8 || joined.length >= 60) {
      runs.push(joined);
      run = [];
    }
  }
  if (run.length > 0) runs.push(run.join(" "));
  return runs;
}

function spokenLines(cues, startSec, endSec) {
  const inWindow = cues.filter((cue) => cue.startSec >= startSec && cue.startSec < endSec);
  const text = inWindow
    .map((cue) => cue.text)
    .join(" ")
    .replace(/["“”]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return [];
  const pieces = (/[.!?]/.test(text) ? text.split(SENTENCE_BREAK) : cueRuns(inWindow))
    .map((piece) => piece.trim())
    .filter(Boolean);
  const whole = pieces.filter((piece) => wordCount(piece) >= MIN_LINE_WORDS);
  return (whole.length > 0 ? whole : pieces).map(capitalize);
}

function captionFromLines(platform, lines) {
  if (platform === "x") return trimTo(lines[0], X_CAPTION_LIMIT);
  const pair = lines.slice(0, 2);
  return platform === "tiktok" ? trimTo(pair.join("\n"), 300) : trimTo(pair.join(" "), 400);
}

function cleanCaption(platform, caption) {
  const text = String(caption ?? "")
    .split("\n")
    .filter((line) => !/^\s*full breakdown\b/i.test(line))
    .join("\n")
    .replace(/(^|\s)#\p{L}[\p{L}\p{N}_]*/gu, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return platform === "x" ? trimTo(text, X_CAPTION_LIMIT) : text;
}

function cleanTags(tags) {
  const seen = new Set();
  const clean = [];
  for (const tag of tags ?? []) {
    const bare = String(tag).trim().replace(/^#+/, "").replace(/[^\p{L}\p{N}_]/gu, "");
    const key = bare.toLowerCase();
    if (!bare || seen.has(key) || BANNED_TAGS.has(`#${key}`)) continue;
    seen.add(key);
    clean.push(`#${bare}`);
  }
  return clean;
}

// The most repeated content words in the clip; a word that extends one already
// tagged (podcast / podcasting) is skipped.
function keywordTags(text, limit, taken = []) {
  if (limit <= 0) return [];
  const chosen = taken.map((tag) => tag.slice(1).toLowerCase());
  const counts = new Map();
  for (const word of contentWords(text)) {
    if (word.length < 4) continue;
    const key = stem(word);
    const entry = counts.get(key) ?? { word, count: 0 };
    entry.count += 1;
    counts.set(key, entry);
  }
  // The sort is stable, so ties keep the order the words were spoken in.
  const tags = [];
  for (const { word } of [...counts.values()].sort((a, b) => b.count - a.count)) {
    if (tags.length >= limit) break;
    if (BANNED_TAGS.has(`#${word}`)) continue;
    if (chosen.some((have) => have.startsWith(word) || word.startsWith(have))) continue;
    chosen.push(word);
    tags.push(`#${word}`);
  }
  return tags;
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
