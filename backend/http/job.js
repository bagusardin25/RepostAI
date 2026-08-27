import fs from "node:fs";
import { deleteJob as dbDeleteJob, getJob, listClipsForJob, listJobs } from "../db/client.js";
import { artifactsHaveContent, fallbackArtifacts } from "../pipeline/artifacts.js";
import { comparePlatformClips, snapshotVoice, voiceHasHistory } from "../pipeline/lineage.js";
import { processJob } from "../pipeline/process.js";
import { loadVoiceMemory } from "../pipeline/voice.js";
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

  const voiceApplied =
    job.voiceApplied ?? snapshotVoice(await loadVoiceMemory({ beforeSec: job.createdAt }));

  const previous = (await listJobs()).find(
    (item) => item.id !== job.id && item.status === "ready" && item.createdAt < job.createdAt,
  );
  let lineage = {
    firstJob: !previous,
    previousJobId: previous?.id ?? null,
    previousTitle: previous?.sourceTitle ?? null,
    platforms: [],
  };
  if (previous) {
    const previousClips = await listClipsForJob(previous.id);
    lineage = {
      ...lineage,
      platforms: comparePlatformClips(previousClips, clips),
    };
  }

  return json({
    job: publicJobDetail(job),
    clips: clips.map(publicClip),
    artifacts,
    followup,
    voiceApplied,
    voiceSteered: voiceHasHistory(voiceApplied),
    lineage,
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

export async function DELETE(_request, params) {
  const job = await getJob(params.id);
  if (!job) return json({ error: "Job not found" }, 404);
  const clips = await listClipsForJob(params.id);

  if (job.sourceVideoPath && fs.existsSync(job.sourceVideoPath)) {
    try {
      fs.unlinkSync(job.sourceVideoPath);
    } catch {}
  }
  for (const clip of clips) {
    if (clip.videoPath && fs.existsSync(clip.videoPath)) {
      try {
        fs.unlinkSync(clip.videoPath);
      } catch {}
    }
  }

  await dbDeleteJob(params.id);
  return json({ ok: true, id: params.id });
}

