import { getJob, listClipsForJob } from "../db/client.js";
import { processJob } from "../pipeline/process.js";
import { publicClip, publicJobDetail } from "./serialize.js";
import { defer, json } from "../lib/http.js";

export async function GET(_request, params) {
  const job = await getJob(params.id);
  if (!job) return json({ error: "Job not found" }, 404);
  const clips = await listClipsForJob(params.id);
  return json({
    job: publicJobDetail(job),
    clips: clips.map(publicClip),
  });
}

export async function POST(_request, params) {
  const job = await getJob(params.id);
  if (!job) return json({ error: "Job not found" }, 404);

  defer(async () => {
    await processJob(params.id);
  });

  return json({ ok: true, status: "queued" });
}
