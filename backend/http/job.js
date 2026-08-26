import { getJob, listClipsForJob } from "../db/client.js";
import { artifactsHaveContent, fallbackArtifacts } from "../pipeline/artifacts.js";
import { processJob } from "../pipeline/process.js";
import { publicClip, publicJobDetail } from "./serialize.js";
import { defer, json } from "../lib/http.js";

export async function GET(_request, params) {
  const job = await getJob(params.id);
  if (!job) return json({ error: "Job not found" }, 404);
  const clips = await listClipsForJob(params.id);
  const artifacts = artifactsHaveContent(job.artifacts)
    ? job.artifacts
    : job.transcript
      ? fallbackArtifacts(job.transcript)
      : null;
  const followup =
    job.followup ??
    (job.status === "ready"
      ? {
          reminder: `Packages for "${job.sourceTitle}" are ready. Nothing ships until you review them.`,
          nextMove: "Approve, edit, or reject each clip so I remember your voice on the next job.",
        }
      : null);
  return json({
    job: publicJobDetail(job),
    clips: clips.map(publicClip),
    artifacts,
    followup,
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
