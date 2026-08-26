import { listJobs, listVoiceEdits } from "../db/client.js";
import { json } from "../lib/http.js";
import { loadVoiceMemory } from "../pipeline/voice.js";

export async function GET() {
  const [memory, edits, jobs] = await Promise.all([
    loadVoiceMemory(),
    listVoiceEdits(40),
    listJobs(),
  ]);

  const withImpact = edits.map((edit) => ({
    ...edit,
    laterJobs: jobs
      .filter((job) => job.id !== edit.jobId && job.createdAt > edit.createdAt)
      .slice(0, 5)
      .map((job) => ({ id: job.id, sourceTitle: job.sourceTitle, createdAt: job.createdAt })),
  }));

  const reasonImpacts = (memory.rejectedReasons ?? []).map((reason) => {
    const source = edits.find(
      (edit) =>
        edit.action === "reject" &&
        (edit.note === reason || (edit.originalCaption && reason.includes(String(edit.originalCaption).slice(0, 40)))),
    );
    const laterJobs = source
      ? jobs
          .filter((job) => job.id !== source.jobId && job.createdAt > source.createdAt)
          .slice(0, 5)
          .map((job) => ({ id: job.id, sourceTitle: job.sourceTitle }))
      : jobs.filter((job) => job.status === "ready").slice(0, 3).map((job) => ({ id: job.id, sourceTitle: job.sourceTitle }));
    return { reason, laterJobs };
  });

  return json({ memory, edits: withImpact, score: memory.score ?? null, reasonImpacts });
}
