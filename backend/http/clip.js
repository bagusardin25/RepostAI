import { getClip, getJob } from "../db/client.js";
import { publicClip, publicJob } from "./serialize.js";
import { json } from "../lib/http.js";

export async function GET(_request, params) {
  const clip = await getClip(params.id);
  if (!clip) return json({ error: "Clip not found" }, 404);
  const job = await getJob(clip.jobId);
  return json({
    clip: publicClip(clip),
    job: job ? publicJob(job) : null,
  });
}
