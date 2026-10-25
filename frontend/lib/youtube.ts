// Mirrors backend/pipeline/youtube.js extractYoutubeId so the desk can validate
// a link before it is sent.
const VIDEO_ID = /(?:v=|youtu\.be\/|\/shorts\/|\/embed\/|\/live\/)([A-Za-z0-9_-]{11})/;

export function extractYoutubeId(input: string) {
  const trimmed = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;
  return trimmed.match(VIDEO_ID)?.[1] ?? null;
}

export function looksLikeUrl(input: string) {
  const trimmed = input.trim();
  return /^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(trimmed);
}

export function youtubeThumbnail(id: string) {
  return `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
}

export type YoutubePreview = { title: string; author: string };

/** Title and channel from YouTube's public oEmbed endpoint; null if it can't be read. */
export async function fetchYoutubePreview(id: string, signal?: AbortSignal): Promise<YoutubePreview | null> {
  try {
    const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`;
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: string; author_name?: string };
    if (!data.title) return null;
    return { title: data.title, author: data.author_name ?? "" };
  } catch {
    return null;
  }
}
