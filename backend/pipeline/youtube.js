import fs from "node:fs";
import { ClientType, Innertube, UniversalCache } from "youtubei.js";
import { parseTranscriptCues } from "./recipes.js";

const VIDEO_ID = /(?:v=|youtu\.be\/|\/shorts\/|\/embed\/|\/live\/)([A-Za-z0-9_-]{11})/;
const PREFERRED_LANGS = ["en", "en-US", "en-GB", "id", "id-ID"];

export function extractYoutubeId(input) {
  const trimmed = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(VIDEO_ID);
  return match?.[1] ?? null;
}

function formatTs(totalSec) {
  const sec = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `00:${pad(m)}:${pad(s)}`;
}

export function cuesToTranscript(cues) {
  return cues.map((cue) => `[${formatTs(cue.startSec)}] ${cue.text}`).join("\n");
}

export function pickCaptionTrack(tracks) {
  if (!Array.isArray(tracks) || tracks.length === 0) return null;
  for (const lang of PREFERRED_LANGS) {
    const manual = tracks.find((track) => track.language_code === lang && track.kind !== "asr");
    if (manual) return manual;
  }
  for (const lang of PREFERRED_LANGS) {
    const asr = tracks.find((track) => track.language_code === lang);
    if (asr) return asr;
  }
  return tracks.find((track) => track.kind !== "asr") ?? tracks[0];
}

export function parseJson3Captions(body) {
  try {
    const data = JSON.parse(body);
    if (!Array.isArray(data.events)) return null;
    return data.events
      .map((event) => {
        const text = (event.segs ?? [])
          .map((seg) => String(seg.utf8 ?? ""))
          .join("")
          .replace(/\s+/g, " ")
          .trim();
        return { startSec: Number(event.tStartMs ?? 0) / 1000, text };
      })
      .filter((cue) => cue.text.length > 0);
  } catch {
    return null;
  }
}

export function parseXmlCaptions(body) {
  if (!body || !body.includes("<text")) return [];
  const cues = [];
  const re = /<text\b([^>]*)>([\s\S]*?)<\/text>/gi;
  let match;
  while ((match = re.exec(body))) {
    const start = Number(match[1].match(/\bstart="([^"]+)"/i)?.[1] ?? 0);
    const text = decodeXml(match[2].replace(/<[^>]+>/g, " "))
      .replace(/\s+/g, " ")
      .trim();
    if (text) cues.push({ startSec: start, text });
  }
  return cues;
}

function decodeXml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function segmentText(segment) {
  const snippet = segment.snippet ?? segment.transcript_segment_renderer?.snippet ?? {};
  const runs = Array.isArray(snippet.runs) ? snippet.runs.map((run) => run.text ?? "").join("") : "";
  return String(snippet.text ?? runs ?? "").trim();
}

async function createYoutube(clientType = ClientType.WEB) {
  return Innertube.create({
    generate_session_locally: true,
    cache: new UniversalCache(false),
    client_type: clientType,
  });
}

async function transcriptFromPanel(info) {
  const data = await info.getTranscript();
  const segments = data.transcript.content?.body?.initial_segments ?? [];
  return segments
    .map((segment) => ({
      startSec: Number(segment.start_ms ?? 0) / 1000,
      text: segmentText(segment),
    }))
    .filter((cue) => cue.text.length > 0);
}

async function fetchTrackBody(track, fmt) {
  const url = new URL(track.base_url);
  if (fmt) url.searchParams.set("fmt", fmt);
  else url.searchParams.delete("fmt");
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Accept-Language": "en,id;q=0.9",
    },
  });
  if (!response.ok) {
    throw new Error(`Caption track HTTP ${response.status}`);
  }
  return response.text();
}

async function cuesFromCaptionTracks(info) {
  const tracks = info.captions?.caption_tracks ?? [];
  const track = pickCaptionTrack(tracks);
  if (!track?.base_url) return [];

  try {
    const jsonBody = await fetchTrackBody(track, "json3");
    const jsonCues = parseJson3Captions(jsonBody);
    if (jsonCues?.length) return jsonCues;
  } catch (error) {
    console.warn("json3 caption fetch failed", error);
  }

  const xmlBody = await fetchTrackBody(track);
  return parseXmlCaptions(xmlBody);
}

async function loadVideoInfo(videoId) {
  const web = await createYoutube(ClientType.WEB);
  const info = await web.getInfo(videoId);
  const tracks = info.captions?.caption_tracks ?? [];
  if (tracks.length > 0) return info;

  try {
    const android = await createYoutube(ClientType.ANDROID);
    return await android.getInfo(videoId);
  } catch (error) {
    console.warn("Android YouTube client failed", error);
    return info;
  }
}

export async function fetchYoutubeMeta(url) {
  const videoId = extractYoutubeId(url);
  if (!videoId) throw new Error("Invalid YouTube URL");

  const info = await loadVideoInfo(videoId);
  const title = info.basic_info.title ?? "YouTube video";
  const durationSec = info.basic_info.duration ?? null;
  const tracks = info.captions?.caption_tracks ?? [];

  let cues = [];
  try {
    cues = await transcriptFromPanel(info);
  } catch (error) {
    console.warn("YouTube transcript panel unavailable, trying caption tracks", error);
  }

  if (cues.length === 0) {
    try {
      cues = await cuesFromCaptionTracks(info);
    } catch (error) {
      console.warn("YouTube caption tracks failed", error);
    }
  }

  const transcript = cuesToTranscript(cues);
  if (!transcript) {
    throw new Error(
      tracks.length > 0
        ? "Captions exist on this video but could not be downloaded. Try again, or paste a transcript."
        : "Could not read captions for this video. Use a public video with the CC button enabled, or send a transcript.",
    );
  }

  let nextTranscript = transcript;
  if (parseTranscriptCues(nextTranscript).length === 0) {
    nextTranscript = `[00:00:00] ${nextTranscript}`;
  }

  return { videoId, title, durationSec, transcript: nextTranscript };
}

async function writeDownloadStream(stream, destPath) {
  const reader = stream.getReader();
  const out = fs.createWriteStream(destPath);
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        if (!out.write(Buffer.from(value))) {
          await new Promise((resolve) => out.once("drain", resolve));
        }
      }
    }
  } finally {
    await new Promise((resolve, reject) => {
      out.end((error) => (error ? reject(error) : resolve()));
    });
  }
}

export async function downloadYoutubeVideo(url, destPath) {
  const videoId = extractYoutubeId(url);
  if (!videoId) throw new Error("Invalid YouTube URL");

  const clients = [ClientType.ANDROID, ClientType.WEB, ClientType.IOS];
  let lastError = null;

  for (const clientType of clients) {
    try {
      const yt = await createYoutube(clientType);
      const stream = await yt.download(videoId, {
        type: "video+audio",
        quality: "best",
        format: "mp4",
      });
      await writeDownloadStream(stream, destPath);
      if (fs.existsSync(destPath) && fs.statSync(destPath).size > 1024) {
        return;
      }
    } catch (error) {
      lastError = error;
      console.warn(`YouTube download failed via ${clientType}`, error);
    }
  }

  throw lastError ?? new Error("YouTube download failed");
}
