import { listClipsForJob, listJobs } from "../db/client.js";
import { enqueueJob, processJob } from "../pipeline/process.js";
import { publicJob } from "./serialize.js";
import { defer, json } from "../lib/http.js";
import { extractYoutubeId } from "../pipeline/youtube.js";

export async function GET() {
  const jobs = await listJobs();
  const withCounts = await Promise.all(
    jobs.map(async (job) => {
      const clips = await listClipsForJob(job.id);
      return {
        ...publicJob(job),
        clipCount: clips.length,
        pendingReview: clips.filter((clip) => clip.status === "needs_review").length,
      };
    }),
  );
  return json({ jobs: withCounts });
}

export async function POST(request) {
  const contentType = request.headers.get("content-type") ?? "";
  let youtubeUrl;
  let transcript;
  let title;
  let fixture = false;
  let file;

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    youtubeUrl = stringField(form.get("youtubeUrl"));
    transcript = stringField(form.get("transcript"));
    title = stringField(form.get("title"));
    fixture = stringField(form.get("fixture")) === "true";
    const uploaded = form.get("file");
    if (uploaded instanceof File && uploaded.size > 0) {
      file = {
        buffer: Buffer.from(await uploaded.arrayBuffer()),
        filename: uploaded.name,
      };
    }
  } else {
    let body = {};
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }
    youtubeUrl = optionalString(body.youtubeUrl);
    transcript = optionalString(body.transcript);
    title = optionalString(body.title);
    fixture = body.fixture === true;
  }

  if (!fixture && !youtubeUrl && !file && !transcript) {
    return json(
      { error: "Provide youtubeUrl, a video file, a transcript, or fixture: true" },
      400,
    );
  }

  if (youtubeUrl && !extractYoutubeId(youtubeUrl)) {
    return json({ error: "Invalid YouTube URL" }, 400);
  }

  const job = await enqueueJob({ youtubeUrl, transcript, title, fixture, file });
  defer(async () => {
    await processJob(job.id);
  });

  return json({ job: publicJob(job) }, 202);
}

function optionalString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function stringField(value) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
