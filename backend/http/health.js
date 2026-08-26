import { getDb } from "../db/client.js";
import { json } from "../lib/http.js";
import { ffmpegAvailable, ffmpegPath } from "../pipeline/ffmpeg.js";
import { mindsHealth } from "../pipeline/minds.js";
import { BACKEND_PORT, FRONTEND_PORT } from "../lib/ports.js";

export async function GET() {
  let db = false;
  try {
    await getDb();
    db = true;
  } catch {
    db = false;
  }

  return json({
    ok: db,
    db,
    ports: {
      frontend: FRONTEND_PORT,
      backend: BACKEND_PORT,
    },
    ffmpeg: {
      available: ffmpegAvailable(),
      path: ffmpegPath(),
    },
    minds: await mindsHealth(),
  });
}
