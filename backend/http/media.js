import fs from "node:fs";
import { clipsDir, safeJoin, sourcesDir, uploadsDir } from "../lib/paths.js";
import { corsHeaders, json } from "../lib/http.js";

const KINDS = {
  clips: clipsDir,
  sources: sourcesDir,
  uploads: uploadsDir,
};

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
    const chunk = fs.readFileSync(filePath).subarray(start, end + 1);
    return new Response(new Uint8Array(chunk), {
      status: 206,
      headers: {
        ...corsHeaders(),
        "Content-Type": "video/mp4",
        "Accept-Ranges": "bytes",
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Content-Length": String(chunk.length),
        "Cache-Control": "private, max-age=3600",
      },
    });
  }

  const data = fs.readFileSync(filePath);
  return new Response(new Uint8Array(data), {
    headers: {
      ...corsHeaders(),
      "Content-Type": "video/mp4",
      "Accept-Ranges": "bytes",
      "Content-Length": String(data.length),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
