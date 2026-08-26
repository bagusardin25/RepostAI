import { Innertube, UniversalCache } from "youtubei.js";
import { getSetting, listJobs, setSetting } from "../db/client.js";
import { defer } from "../lib/http.js";
import { enqueueJob, processJob } from "./process.js";

const CHANNEL_ID = /(?:channel\/)?(UC[\w-]{22})/;
const WATCH_INTERVAL_MS = 5 * 60 * 1000;

export function extractChannelId(input) {
  if (!input || typeof input !== "string") return null;
  const trimmed = input.trim();
  const match = trimmed.match(CHANNEL_ID);
  return match?.[1] ?? null;
}

export function parseChannelFeed(xml) {
  if (!xml) return [];
  const entries = [];
  const blocks = String(xml).split(/<entry\b/i).slice(1);
  for (const block of blocks) {
    const videoId =
      block.match(/<yt:videoId>\s*([^<\s]+)\s*</i)?.[1] ??
      block.match(/watch\?v=([A-Za-z0-9_-]{11})/)?.[1];
    if (!videoId) continue;
    const title = decodeXml(block.match(/<title>([^<]+)/i)?.[1] ?? "YouTube video");
    const published = block.match(/<published>([^<]+)/i)?.[1] ?? null;
    entries.push({
      videoId,
      title,
      published,
      url: `https://www.youtube.com/watch?v=${videoId}`,
    });
  }
  return entries;
}

export async function getWatchState() {
  const [enabled, channelUrl, channelId, lastVideoId, lastCheckedAt, lastError, lastJobId] =
    await Promise.all([
      getSetting("watch.enabled"),
      getSetting("watch.channelUrl"),
      getSetting("watch.channelId"),
      getSetting("watch.lastVideoId"),
      getSetting("watch.lastCheckedAt"),
      getSetting("watch.lastError"),
      getSetting("watch.lastJobId"),
    ]);

  return {
    enabled: enabled === "true",
    channelUrl: channelUrl || process.env.YOUTUBE_CHANNEL_URL || "",
    channelId: channelId || "",
    lastVideoId: lastVideoId || "",
    lastCheckedAt: lastCheckedAt ? Number(lastCheckedAt) : null,
    lastError: lastError || "",
    lastJobId: lastJobId || "",
    intervalSec: Math.round(WATCH_INTERVAL_MS / 1000),
  };
}

export async function saveWatchConfig(input) {
  const channelUrl = typeof input.channelUrl === "string" ? input.channelUrl.trim() : "";
  const enabled = input.enabled === true;
  let channelId = extractChannelId(channelUrl);

  if (channelUrl && !channelId) {
    channelId = await resolveChannelId(channelUrl);
  }
  if (channelUrl && !channelId) {
    throw new Error("Could not resolve that YouTube channel. Use a /channel/UC… URL or @handle.");
  }

  await setSetting("watch.channelUrl", channelUrl);
  await setSetting("watch.channelId", channelId || "");
  await setSetting("watch.enabled", enabled && channelUrl ? "true" : "false");
  await setSetting("watch.lastError", "");
  return getWatchState();
}

export async function pollWatch({ force = false } = {}) {
  const state = await getWatchState();
  if (!force && !state.enabled) {
    return { ...state, polled: false, enqueued: false };
  }
  if (!state.channelId && !state.channelUrl) {
    return { ...state, polled: false, enqueued: false };
  }

  try {
    const channelId = state.channelId || (await resolveChannelId(state.channelUrl));
    if (!channelId) throw new Error("Channel id missing");
    if (channelId !== state.channelId) await setSetting("watch.channelId", channelId);

    const xml = await fetchChannelFeed(channelId);
    const entries = parseChannelFeed(xml);
    const latest = entries[0];
    const checkedAt = String(Math.floor(Date.now() / 1000));
    await setSetting("watch.lastCheckedAt", checkedAt);
    await setSetting("watch.lastError", "");

    if (!latest) {
      return { ...(await getWatchState()), polled: true, enqueued: false, latest: null };
    }

    if (!force && latest.videoId === state.lastVideoId) {
      return { ...(await getWatchState()), polled: true, enqueued: false, latest };
    }

    const existing = (await listJobs()).find((job) => job.sourceUrl === latest.url);
    if (existing) {
      await setSetting("watch.lastVideoId", latest.videoId);
      await setSetting("watch.lastJobId", existing.id);
      return { ...(await getWatchState()), polled: true, enqueued: false, latest, jobId: existing.id };
    }

    const job = await enqueueJob({
      youtubeUrl: latest.url,
      title: latest.title,
    });
    await setSetting("watch.lastVideoId", latest.videoId);
    await setSetting("watch.lastJobId", job.id);
    defer(async () => {
      await processJob(job.id);
    });

    return { ...(await getWatchState()), polled: true, enqueued: true, latest, jobId: job.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Watch poll failed";
    await setSetting("watch.lastError", message);
    await setSetting("watch.lastCheckedAt", String(Math.floor(Date.now() / 1000)));
    return { ...(await getWatchState()), polled: true, enqueued: false, error: message };
  }
}

export function startWatchLoop() {
  const kick = () => {
    pollWatch().catch((error) => console.warn("Channel watch failed", error));
  };
  setTimeout(kick, 20_000);
  setInterval(kick, WATCH_INTERVAL_MS);
}

async function fetchChannelFeed(channelId) {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
  const response = await fetch(url, {
    headers: { "user-agent": "RepostAI/0.1 (Creative Minds Jam)" },
  });
  if (!response.ok) throw new Error(`YouTube channel feed returned ${response.status}`);
  return response.text();
}

async function resolveChannelId(input) {
  const direct = extractChannelId(input);
  if (direct) return direct;

  try {
    const page = await fetch(normalizeChannelUrl(input), {
      headers: { "user-agent": "Mozilla/5.0 RepostAI" },
    });
    if (page.ok) {
      const html = await page.text();
      const fromHtml = html.match(/"channelId":"(UC[\w-]{22})"/)?.[1];
      if (fromHtml) return fromHtml;
    }
  } catch {
    // Fall through to Innertube.
  }

  try {
    const yt = await Innertube.create({
      generate_session_locally: true,
      cache: new UniversalCache(false),
    });
    const resolved = await yt.resolveURL(normalizeChannelUrl(input));
    const payload = JSON.stringify(resolved ?? {});
    return payload.match(/(UC[\w-]{22})/)?.[1] ?? null;
  } catch {
    return null;
  }
}

function normalizeChannelUrl(input) {
  const trimmed = input.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("@")) return `https://www.youtube.com/${trimmed}`;
  return `https://www.youtube.com/${trimmed}`;
}

function decodeXml(value) {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
