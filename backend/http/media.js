import fs from "node:fs";
import { clipsDir, safeJoin, sourcesDir, uploadsDir } from "../lib/paths.js";
import { corsHeaders, json } from "../lib/http.js";

const KINDS = {
  clips: clipsDir,
  sources: sourcesDir,
  uploads: uploadsDir,
};

export async function GET(_request, params) {
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

  const data = fs.readFileSync(filePath);
  return new Response(new Uint8Array(data), {
    headers: {
      ...corsHeaders(),
      "Content-Type": "video/mp4",
      "Content-Length": String(data.length),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
