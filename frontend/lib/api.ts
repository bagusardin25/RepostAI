export type JobSummary = {
  id: string;
  sourceType: string;
  sourceTitle: string;
  sourceUrl?: string | null;
  durationSec: number | null;
  status: string;
  error: string | null;
  analyzer: "minds" | "fallback" | null;
  createdAt: number;
  updatedAt?: number;
  hasTranscript: boolean;
  hasSourceVideo: boolean;
  sourceVideoUrl: string | null;
  clipCount?: number;
  pendingReview?: number;
};

export type JobDetail = JobSummary & { transcript: string };

export type ClipPackage = {
  id: string;
  jobId: string;
  platform: "tiktok" | "instagram" | "x";
  startSec: number;
  endSec: number;
  durationSec: number;
  aspectRatio: string;
  reason: string;
  hook: string;
  caption: string;
  hashtags: string[];
  status: "needs_review" | "approved" | "rejected" | "edited";
  reviewNote: string | null;
  videoUrl: string | null;
  displayCaption: string;
  displayHook: string;
};

export type VoicePayload = {
  memory: {
    notes: string[];
    rejectedReasons: string[];
    preferredHooks?: string[];
    platformNotes: Partial<Record<string, string[]>>;
  };
  edits: Array<{
    id: string;
    clipId: string;
    jobId: string;
    platform: string;
    action: string;
    originalCaption: string;
    editedCaption: string | null;
    note: string | null;
    createdAt: number;
  }>;
};

async function parse<T>(res: Promise<Response> | Response): Promise<T> {
  const resolved = await res;
  const data = (await resolved.json()) as T & { error?: string };
  if (!resolved.ok) throw new Error(data.error || resolved.statusText);
  return data;
}

export function createJob(body: { youtubeUrl?: string; fixture?: boolean; file?: File }) {
  if (body.file) {
    const form = new FormData();
    if (body.youtubeUrl) form.set("youtubeUrl", body.youtubeUrl);
    if (body.fixture) form.set("fixture", "true");
    form.set("file", body.file);
    return parse<{ job: JobSummary }>(
      fetch("/api/jobs", {
        method: "POST",
        body: form,
      }),
    );
  }

  return parse<{ job: JobSummary }>(
    fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        youtubeUrl: body.youtubeUrl,
        fixture: body.fixture,
      }),
    }),
  );
}

export function listJobs() {
  return parse<{ jobs: JobSummary[] }>(fetch("/api/jobs"));
}

export function getJob(id: string) {
  return parse<{ job: JobDetail; clips: ClipPackage[] }>(fetch(`/api/jobs/${id}`));
}

export function retryJob(id: string) {
  return parse<{ ok: boolean }>(fetch(`/api/jobs/${id}`, { method: "POST" }));
}

export function reviewClip(
  id: string,
  body: { action: "approve" | "reject" | "edit"; caption?: string; hook?: string; note?: string },
) {
  return parse<{ clip: ClipPackage }>(
    fetch(`/api/clips/${id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

export function getVoice() {
  return parse<VoicePayload>(fetch("/api/voice"));
}

export function getHealth() {
  return parse<{
    ok: boolean;
    db: boolean;
    ffmpeg: { available: boolean };
    minds: { configured: boolean; ok: boolean };
  }>(fetch("/api/health"));
}

export function formatTimecode(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}
