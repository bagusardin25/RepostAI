// Live progress for packs that are processing right now. Kept in memory only:
// it matters while a job runs and is dropped once the job is ready or failed.
const live = new Map();

export function setProgress(jobId, patch) {
  const prev = live.get(jobId) ?? {};
  const now = Date.now();
  const next = { ...prev, ...patch, updatedAt: now };
  if (patch.stage && patch.stage !== prev.stage) {
    next.stageStartedAt = now;
    // Counters belong to one stage; do not carry them into the next.
    if (!("done" in patch)) delete next.done;
    if (!("total" in patch)) delete next.total;
    if (!("bytes" in patch)) delete next.bytes;
    if (!("platform" in patch)) delete next.platform;
  }
  live.set(jobId, next);
  return next;
}

export function getProgress(jobId) {
  const entry = live.get(jobId);
  if (!entry) return null;
  return { ...entry, serverNow: Date.now() };
}

export function clearProgress(jobId) {
  live.delete(jobId);
}
