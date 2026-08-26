import { getJob, listClipsForJob, listVoiceEdits } from "../db/client.js";
import { compareJobPackages, snapshotVoice, voiceHasHistory } from "../pipeline/lineage.js";
import { loadVoiceMemory } from "../pipeline/voice.js";
import { publicClip, publicJobDetail } from "./serialize.js";
import { json } from "../lib/http.js";

export async function GET(request) {
  const url = new URL(request.url);
  const a = url.searchParams.get("a")?.trim();
  const b = url.searchParams.get("b")?.trim();
  if (!a || !b) {
    return json({ error: "Provide two job ids as a and b" }, 400);
  }
  if (a === b) {
    return json({ error: "Pick two different jobs" }, 400);
  }

  const [jobA, jobB] = await Promise.all([getJob(a), getJob(b)]);
  if (!jobA || !jobB) {
    return json({ error: "One or both jobs were not found" }, 404);
  }

  const earlier = jobA.createdAt <= jobB.createdAt ? jobA : jobB;
  const later = earlier.id === jobA.id ? jobB : jobA;
  const [earlierClips, laterClips] = await Promise.all([
    listClipsForJob(earlier.id),
    listClipsForJob(later.id),
  ]);

  const voiceApplied =
    later.voiceApplied ?? snapshotVoice(await loadVoiceMemory({ beforeSec: later.createdAt }));
  const teaching = (await listVoiceEdits(80)).filter((edit) => edit.jobId === earlier.id);
  const earlierPublic = earlierClips.map(publicClip);
  const laterPublic = laterClips.map(publicClip);
  const packages = compareJobPackages(earlierClips, laterClips).map((row) => ({
    ...row,
    left: attachVideo(row.left, earlierPublic),
    right: attachVideo(row.right, laterPublic),
  }));

  return json({
    earlier: {
      job: publicJobDetail(earlier),
      clips: earlierPublic,
    },
    later: {
      job: publicJobDetail(later),
      clips: laterPublic,
    },
    packages,
    teaching,
    voiceApplied,
    voiceSteered: voiceHasHistory(voiceApplied),
    changedCount: packages.filter((row) => row.hookChanged || row.captionChanged || row.windowChanged).length,
  });
}

function attachVideo(side, clips) {
  if (!side) return null;
  const match = clips.find((clip) => clip.id === side.id);
  return { ...side, videoUrl: match?.videoUrl ?? null };
}
