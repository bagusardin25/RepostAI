import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  createJob,
  getJob,
  insertClips,
  listClipsForJob,
  updateJob,
} from "../db/client.js";
import { cutClip, ffmpegAvailable, probeDurationSec, writeFixtureVideo } from "./ffmpeg.js";
import { FIXTURE_DURATION_SEC, FIXTURE_TITLE, FIXTURE_TRANSCRIPT } from "./fixture.js";
import { mindsConfigured, proposeClipsWithMinds, requestAutonomousFollowUp } from "./minds.js";
import { clipsDir, ensureDataDirs, sourcesDir, uploadsDir } from "../lib/paths.js";
import { fallbackArtifacts } from "./artifacts.js";
import { fallbackClipRecipes } from "./recipes.js";
import { loadVoiceMemory } from "./voice.js";
import { downloadYoutubeVideo, fetchYoutubeMeta } from "./youtube.js";

export async function enqueueJob(input) {
  ensureDataDirs();
  const id = randomUUID();

  if (input.fixture) {
    return createJob({
      id,
      sourceType: "fixture",
      sourceTitle: input.title || FIXTURE_TITLE,
      transcript: FIXTURE_TRANSCRIPT,
      durationSec: FIXTURE_DURATION_SEC,
    });
  }

  let sourceType = input.youtubeUrl ? "youtube" : "upload";
  let sourceVideoPath = null;
  if (input.file) {
    const ext = path.extname(input.file.filename || ".mp4") || ".mp4";
    sourceVideoPath = path.join(uploadsDir(), `${id}${ext}`);
    fs.writeFileSync(sourceVideoPath, input.file.buffer);
    sourceType = input.youtubeUrl ? "youtube" : "upload";
  }

  return createJob({
    id,
    sourceType,
    sourceUrl: input.youtubeUrl ?? null,
    sourceTitle: input.title || (input.youtubeUrl ? "YouTube video" : "Uploaded video"),
    sourceVideoPath,
    transcript: input.transcript ?? "",
  });
}

export async function processJob(jobId) {
  const job = await getJob(jobId);
  if (!job) throw new Error("Job not found");

  try {
    await updateJob(jobId, { status: "fetching_source", error: null });
    const source = await resolveSource(jobId);

    await updateJob(jobId, { status: "analyzing" });
    const voice = await loadVoiceMemory();
    let recipes = [];
    let analyzer = "fallback";
    let artifacts = fallbackArtifacts(source.transcript);

    if (mindsConfigured()) {
      try {
        const result = await proposeClipsWithMinds({
          title: source.title,
          transcript: source.transcript,
          durationSec: source.durationSec,
          voice,
        });
        recipes = result.recipes;
        analyzer = "minds";
        if (result.artifacts) artifacts = result.artifacts;
      } catch (error) {
        console.warn("Minds clip proposal failed, using fallback", error);
      }
    }

    if (recipes.length === 0) {
      recipes = fallbackClipRecipes(source.transcript, source.durationSec);
      analyzer = "fallback";
    }

    await updateJob(jobId, { analyzer, artifacts, status: "clipping" });
    await materializeClips(jobId, source.sourceVideoPath, recipes);
    await updateJob(jobId, { status: "ready" });
    await writeFollowUp(jobId, source.title, recipes);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pipeline failed";
    await updateJob(jobId, { status: "failed", error: message });
    throw error;
  }
}

async function resolveSource(jobId) {
  const job = await getJob(jobId);
  let title = job.sourceTitle;
  let transcript = job.transcript;
  let durationSec = job.durationSec;
  let sourceVideoPath = job.sourceVideoPath;

  if (job.sourceType === "fixture") {
    if (!sourceVideoPath && ffmpegAvailable()) {
      const dest = path.join(sourcesDir(), `${job.id}.mp4`);
      await writeFixtureVideo(dest, FIXTURE_DURATION_SEC);
      sourceVideoPath = dest;
    }
  }

  if (job.sourceType === "youtube" && job.sourceUrl) {
    const meta = await fetchYoutubeMeta(job.sourceUrl);
    title = meta.title;
    if (!transcript) transcript = meta.transcript;
    durationSec = meta.durationSec ?? durationSec;
    if (!sourceVideoPath && ffmpegAvailable()) {
      const dest = path.join(sourcesDir(), `${job.id}.mp4`);
      try {
        await downloadYoutubeVideo(job.sourceUrl, dest);
        sourceVideoPath = dest;
      } catch (error) {
        console.warn("YouTube download skipped", error);
      }
    }
  }

  if (sourceVideoPath && fs.existsSync(sourceVideoPath) && !durationSec) {
    durationSec = await probeDurationSec(sourceVideoPath);
  }

  if (!transcript.trim()) {
    throw new Error("No transcript available. Provide captions, a transcript, or a fixture job.");
  }

  await updateJob(jobId, {
    sourceTitle: title,
    transcript,
    durationSec: durationSec ?? null,
    sourceVideoPath,
  });

  return { title, transcript, durationSec: durationSec ?? null, sourceVideoPath };
}

async function materializeClips(jobId, sourceVideoPath, recipes) {
  const existing = await listClipsForJob(jobId);
  if (existing.length > 0) return;

  const records = [];
  for (const recipe of recipes) {
    const id = randomUUID();
    let videoPath = null;
    if (sourceVideoPath && fs.existsSync(sourceVideoPath) && ffmpegAvailable()) {
      const dest = path.join(clipsDir(), `${id}.mp4`);
      try {
        await cutClip({
          sourcePath: sourceVideoPath,
          outputPath: dest,
          startSec: recipe.startSec,
          endSec: recipe.endSec,
          aspectRatio: recipe.aspectRatio,
        });
        videoPath = dest;
      } catch (error) {
        console.warn(`Clip cut failed for ${recipe.platform}`, error);
      }
    }

    records.push({
      id,
      jobId,
      platform: recipe.platform,
      startSec: recipe.startSec,
      endSec: recipe.endSec,
      durationSec: recipe.endSec - recipe.startSec,
      aspectRatio: recipe.aspectRatio,
      reason: recipe.reason,
      hook: recipe.hook,
      caption: recipe.caption,
      hashtags: recipe.hashtags,
      videoPath,
      editedCaption: null,
      editedHook: null,
      reviewNote: null,
    });
  }

  await insertClips(records);
}

async function writeFollowUp(jobId, title, recipes) {
  try {
    const followup = await requestAutonomousFollowUp({
      title,
      platforms: recipes.map((recipe) => recipe.platform),
    });
    await updateJob(jobId, { followup });
  } catch (error) {
    console.warn("Follow-up skipped", error);
  }
}
