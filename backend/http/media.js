import fs, { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { clipsDir, safeJoin, sourcesDir, uploadsDir } from "../lib/paths.js";
import { corsHeaders, json } from "../lib/http.js";

const KINDS = {
  clips: clipsDir,
  sources: sourcesDir,
  uploads: uploadsDir,
};

// `?download=<name>` saves the file instead of playing it, even when the link is opened
// directly, where the browser ignores the anchor's `download` attribute.
function downloadHeaders(request, filename) {
  const requested = new URL(request.url).searchParams.get("download");
  if (requested === null) return {};
  const name = requested.replace(/[^\w.-]/g, "").replace(/^\.+/, "") || filename;
  return { "Content-Disposition": `attachment; filename="${name}"` };
}

export async function GET(request, params) {
  const root = KINDS[params.kind];
  if (!root) return json({ error: "Not found" }, 404);

  let filePath;
  try {
    filePath = safeJoin(root(), params.filename);
  } catch {
    return json({ error: "Invalid filename" }, 400);
  }

  if (!fs.existsSync(filePath)) {
    return json({ error: "File not found" }, 404);
  }

  const stat = fs.statSync(filePath);
  const download = downloadHeaders(request, params.filename);
  const range = request.headers.get("range");
  const match = range?.match(/bytes=(\d+)-(\d*)/);

  if (match) {
    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : stat.size - 1;
    if (start >= stat.size || end >= stat.size || start > end) {
      return new Response(null, {
        status: 416,
        headers: {
          ...corsHeaders(),
          "Content-Range": `bytes */${stat.size}`,
        },
      });
    }
    const stream = createReadStream(filePath, { start, end });
    return new Response(Readable.toWeb(stream), {
      status: 206,
      headers: {
        ...corsHeaders(),
        "Content-Type": "video/mp4",
        "Accept-Ranges": "bytes",
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Content-Length": String(end - start + 1),
        "Cache-Control": "private, max-age=3600",
        ...download,
      },
    });
  }

  const stream = createReadStream(filePath);
  return new Response(Readable.toWeb(stream), {
    headers: {
      ...corsHeaders(),
      "Content-Type": "video/mp4",
      "Accept-Ranges": "bytes",
      "Content-Length": String(stat.size),
      "Cache-Control": "private, max-age=3600",
      ...download,
    },
  });
}
