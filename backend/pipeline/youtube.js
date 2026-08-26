import fs from "node:fs";
import { Innertube, UniversalCache } from "youtubei.js";
import { parseTranscriptCues } from "./recipes.js";

const VIDEO_ID = /(?:v=|youtu\.be\/|\/shorts\/|\/embed\/)([A-Za-z0-9_-]{11})/;

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

function cuesToTranscript(cues) {
  return cues.map((cue) => `[${formatTs(cue.startSec)}] ${cue.text}`).join("\n");
}

export async function fetchYoutubeMeta(url) {
  const videoId = extractYoutubeId(url);
  if (!videoId) throw new Error("Invalid YouTube URL");

  const yt = await Innertube.create({
    generate_session_locally: true,
    cache: new UniversalCache(false),
  });
  const info = await yt.getInfo(videoId);
  const title = info.basic_info.title ?? "YouTube video";
  const durationSec = info.basic_info.duration ?? null;

  let transcript = "";
  try {
    const data = await info.getTranscript();
    const segments = data.transcript.content?.body?.initial_segments ?? [];
    const cues = segments
      .map((segment) => {
        const startMs = Number(segment.start_ms ?? 0);
        const text = String(segment.snippet?.text ?? "").trim();
        return { startSec: startMs / 1000, text };
      })
      .filter((cue) => cue.text.length > 0);
    transcript = cuesToTranscript(cues);
  } catch {
    transcript = "";
  }

  if (!transcript) {
    throw new Error(
      "Could not read captions for this video. Use a video with captions, or send a transcript.",
    );
  }

  if (parseTranscriptCues(transcript).length === 0) {
    transcript = `[00:00:00] ${transcript}`;
  }

  return { videoId, title, durationSec, transcript };
}

export async function downloadYoutubeVideo(url, destPath) {
  const videoId = extractYoutubeId(url);
  if (!videoId) throw new Error("Invalid YouTube URL");

  const yt = await Innertube.create({
    generate_session_locally: true,
    cache: new UniversalCache(false),
  });
  const stream = await yt.download(videoId, {
    type: "video+audio",
    quality: "best",
    format: "mp4",
  });

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
