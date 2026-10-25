/** Live step data the backend keeps while a pack is processing (null once done). */
export type JobProgress = {
  stage?: string;
  step?: "captions" | "download" | "mind" | "recipes" | "cutting";
  stageStartedAt?: number;
  updatedAt?: number;
  serverNow?: number;
  bytes?: number;
  done?: number;
  total?: number;
  platform?: string | null;
};

export type JobSummary = {
  id: string;
  sourceType: string;
  sourceTitle: string;
  sourceUrl?: string | null;
  durationSec: number | null;
  status: string;
  error: string | null;
  analyzer: "minds" | "minds_saved" | "fallback" | null;
  createdAt: number;
  updatedAt?: number;
  hasTranscript: boolean;
  hasSourceVideo: boolean;
  sourceVideoUrl: string | null;
  clipCount?: number;
  pendingReview?: number;
  progress?: JobProgress | null;
  /** Started from a pull request preview; the live app leaves it out of its desk and style. */
  sandbox?: boolean;
};

export type FollowUp = {
  reminder: string;
  nextMove: string;
};

export type ContentArtifacts = {
  tiktokScript: { lines: string[]; onScreenText: string; cta: string };
  instagramCarousel: { slides: Array<{ title: string; body: string }> };
  xThread: { tweets: string[] };
  linkedinPost: { text: string };
};

export type VoiceScore = {
  score: number | null;
  max: number;
  label: string;
  detail: string;
  trend: "up" | "down" | "flat";
  approveRate: number;
  editRate: number;
  rejectRate: number;
  sampleSize: number;
};

export type MindMessage = {
  fingerprint: string;
  messageId: string;
  text: string;
  createdAt: string | null;
  fromMind: boolean;
  senderName: string;
};

export type MindDesk = {
  configured: boolean;
  ok: boolean;
  alias: string;
  error?: string;
  mind: {
    mindId: string;
    name: string | null;
    email: string | null;
    isEnabled?: boolean;
    hasTelegram: boolean;
    telegramBotId: string | null;
    walletAddress: string | null;
    chain: string | null;
    cognition?: number | null;
    species?: string | null;
  } | null;
  circle: Array<{ email?: string; name?: string; isSteward?: boolean }>;
  equippedSkills: Array<{ skillId: string; name?: string; description?: string }>;
  bazaarSkills: Array<{ skillId: string; name: string; description?: string; equippedCount?: number }>;
};

export type WatchState = {
  enabled: boolean;
  channelUrl: string;
  channelId: string;
  lastVideoId: string;
  lastCheckedAt: number | null;
  lastError: string;
  lastJobId: string;
  intervalSec: number;
  polled?: boolean;
  enqueued?: boolean;
  jobId?: string;
};

export type VoiceApplied = {
  notes: string[];
  rejectedReasons: string[];
  preferredHooks?: string[];
  platformNotes: Partial<Record<string, string[]>>;
  score: number | null;
  sampleSize: number;
};

export type JobLineage = {
  firstJob: boolean;
  previousJobId: string | null;
  previousTitle: string | null;
  platforms: Array<{
    platform: string;
    first: boolean;
    previousHook: string | null;
    previousStatus: string | null;
    previousNote: string | null;
    currentHook: string;
    changed: boolean;
  }>;
};

export type JobDetail = JobSummary & {
  transcript: string;
  followup?: FollowUp | null;
  artifacts?: ContentArtifacts | null;
  voiceApplied?: VoiceApplied | null;
};

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
    score?: VoiceScore;
  };
  score?: VoiceScore | null;
  edits: Array<{
    id: string;
    clipId: string;
    jobId: string;
    platform: string;
    action: string;
    originalCaption: string;
    editedCaption: string | null;
    originalHook?: string | null;
    editedHook?: string | null;
    note: string | null;
    createdAt: number;
    laterJobs?: Array<{ id: string; sourceTitle: string; createdAt?: number }>;
  }>;
  reasonImpacts?: Array<{
    reason: string;
    laterJobs: Array<{ id: string; sourceTitle: string }>;
  }>;
};

function apiUrl(path: string) {
  const base = (process.env.NEXT_PUBLIC_BACKEND_ORIGIN || "").replace(/\/$/, "");
  return `${base}${path}`;
}

/** The API could not be reached, or answered without JSON (for example while it restarts). */
export class ApiUnreachableError extends Error {}

const UNREACHABLE = "Can't reach the RepostAI server. Check that the backend is running, then retry.";

async function parse<T>(res: Promise<Response> | Response): Promise<T> {
  let resolved: Response;
  try {
    resolved = await res;
  } catch {
    throw new ApiUnreachableError(UNREACHABLE);
  }
  const text = await resolved.text().catch(() => "");
  let data: (T & { error?: string }) | null = null;
  try {
    data = text ? (JSON.parse(text) as T & { error?: string }) : null;
  } catch {
    // A proxy error page is not JSON: the API is down or restarting.
  }
  if (!data) throw new ApiUnreachableError(UNREACHABLE);
  if (!resolved.ok) throw new Error(data.error || resolved.statusText || "Request failed");
  return data;
}

export function createJob(
  body: { youtubeUrl?: string; fixture?: boolean; file?: File },
  options: { onUploadProgress?: (loaded: number, total: number) => void } = {},
) {
  if (body.file) {
    const form = new FormData();
    if (body.youtubeUrl) form.set("youtubeUrl", body.youtubeUrl);
    if (body.fixture) form.set("fixture", "true");
    form.set("file", body.file);
    return uploadForm<{ job: JobSummary }>(apiUrl("/api/jobs"), form, options.onUploadProgress);
  }

  return parse<{ job: JobSummary }>(
    fetch(apiUrl("/api/jobs"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        youtubeUrl: body.youtubeUrl,
        fixture: body.fixture,
      }),
    }),
  );
}

// fetch() cannot report upload progress, so file uploads go through XHR.
function uploadForm<T>(url: string, form: FormData, onProgress?: (loaded: number, total: number) => void) {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.responseType = "text";
    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress(event.loaded, event.total);
      };
    }
    xhr.onload = () => {
      let data: (T & { error?: string }) | null = null;
      try {
        data = JSON.parse(xhr.responseText) as T & { error?: string };
      } catch {
        // fall through to the status check
      }
      if (xhr.status >= 200 && xhr.status < 300 && data) resolve(data);
      else reject(new Error(data?.error || xhr.statusText || "Upload failed"));
    };
    xhr.onerror = () => reject(new Error("Upload failed. Check your connection and try again."));
    xhr.onabort = () => reject(new Error("Upload cancelled."));
    xhr.send(form);
  });
}

export function listJobs() {
  return parse<{ jobs: JobSummary[] }>(fetch(apiUrl("/api/jobs")));
}

export function getJob(id: string) {
  return parse<{
    job: JobDetail;
    clips: ClipPackage[];
    artifacts?: ContentArtifacts | null;
    followup?: FollowUp | null;
    voiceApplied?: VoiceApplied | null;
    voiceSteered?: boolean;
    lineage?: JobLineage;
  }>(fetch(apiUrl(`/api/jobs/${id}`)));
}

export type CompareSideClip = {
  id: string | null;
  hook: string;
  caption: string;
  reason: string;
  status: string | null;
  reviewNote: string | null;
  startSec: number | null;
  endSec: number | null;
  durationSec: number | null;
  videoUrl: string | null;
};

export type JobComparePayload = {
  earlier: { job: JobDetail; clips: ClipPackage[] };
  later: { job: JobDetail; clips: ClipPackage[] };
  packages: Array<{
    platform: string;
    left: CompareSideClip | null;
    right: CompareSideClip | null;
    hookChanged: boolean;
    captionChanged: boolean;
    windowChanged: boolean;
    taughtBy: string | null;
  }>;
  teaching: VoicePayload["edits"];
  voiceApplied: VoiceApplied;
  voiceSteered: boolean;
  changedCount: number;
};

export function getJobCompare(a: string, b: string) {
  return parse<JobComparePayload>(
    fetch(apiUrl(`/api/jobs/compare?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`)),
  );
}

export function retryJob(id: string) {
  return parse<{ ok: boolean }>(fetch(apiUrl(`/api/jobs/${id}`), { method: "POST" }));
}

export function deleteJob(id: string) {
  return parse<{ ok: boolean; id: string }>(fetch(apiUrl(`/api/jobs/${id}`), { method: "DELETE" }));
}


export function reviewClip(
  id: string,
  body: { action: "approve" | "reject" | "edit"; caption?: string; hook?: string; note?: string },
) {
  return parse<{ clip: ClipPackage }>(
    fetch(apiUrl(`/api/clips/${id}/review`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

export function getVoice() {
  return parse<VoicePayload>(fetch(apiUrl("/api/voice")));
}

export function getMindDesk() {
  return parse<MindDesk>(fetch(apiUrl("/api/mind")));
}

export function getMindHistory(limit = 40) {
  return parse<{ alias: string; messages: MindMessage[] }>(
    fetch(apiUrl(`/api/mind/history?limit=${limit}`)),
  );
}

export function seedMindTenets() {
  return parse<{ ok: boolean; alias: string }>(fetch(apiUrl("/api/mind/tenets"), { method: "POST" }));
}

export function sendMindMessage(text: string) {
  return parse<{ ok: boolean; alias: string }>(
    fetch(apiUrl("/api/mind/messages"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    }),
  );
}

export function equipMindSkill(skillId: string) {
  return parse<{ ok: boolean }>(
    fetch(apiUrl("/api/mind/skills"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skillId }),
    }),
  );
}

export function getWatch() {
  return parse<{ watch: WatchState }>(fetch(apiUrl("/api/watch")));
}

export function saveWatch(body: { channelUrl: string; enabled: boolean }) {
  return parse<{ watch: WatchState }>(
    fetch(apiUrl("/api/watch"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

export function pollWatch() {
  return parse<{ watch: WatchState }>(
    fetch(apiUrl("/api/watch/poll"), {
      method: "POST",
    }),
  );
}

export function getHealth() {
  return parse<{
    ok: boolean;
    db: boolean;
    ffmpeg: { available: boolean };
    minds: {
      configured: boolean;
      ok: boolean;
      isEnabled?: boolean;
      hasTelegram?: boolean;
      cognition?: number | null;
    };
  }>(fetch(apiUrl("/api/health")));
}

export function formatTimecode(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}
