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
import {
  copyCachedClip,
  copyFixtureVideo,
  cutClip,
  ffmpegAvailable,
  fixtureClipCacheKey,
  probeDurationSec,
} from "./ffmpeg.js";
import { FIXTURE_DURATION_SEC, FIXTURE_TITLE, FIXTURE_TRANSCRIPT } from "./fixture.js";
import { mindsConfigured, proposeClipsWithMinds, requestAutonomousFollowUp } from "./minds.js";
import { clipsDir, ensureDataDirs, sourcesDir, uploadsDir } from "../lib/paths.js";
import { fallbackArtifacts } from "./artifacts.js";
import { fallbackClipRecipes } from "./recipes.js";
import { snapshotVoice } from "./lineage.js";
import { clearProgress, setProgress } from "./progress.js";
import { loadVoiceMemory, voiceSourceKey } from "./voice.js";
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
    setProgress(jobId, { stage: "fetching_source", step: "captions" });
    await updateJob(jobId, { status: "fetching_source", error: null });
    const source = await resolveSource(jobId);

    setProgress(jobId, { stage: "analyzing", step: mindsConfigured() ? "mind" : "recipes" });
    await updateJob(jobId, { status: "analyzing" });
    const voice = await loadVoiceMemory({
      beforeSec: job.createdAt + 1,
      sourceKey: voiceSourceKey(job),
    });
    const voiceApplied = snapshotVoice(voice);
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
          reuseSavedAnswer: job.sourceType === "fixture",
        });
        recipes = result.recipes;
        analyzer = result.savedAnswer ? "minds_saved" : "minds";
        if (result.artifacts) artifacts = result.artifacts;
      } catch (error) {
        console.warn("Minds clip proposal failed, using fallback", error);
      }
    }

    if (recipes.length === 0) {
      recipes = fallbackClipRecipes(source.transcript, source.durationSec, source.title);
      analyzer = "fallback";
    }

    // Deleted while the moments were chosen: don't queue ffmpeg cuts for a pack that is gone.
    if (!(await getJob(jobId))) {
      clearProgress(jobId);
      return;
    }
    setProgress(jobId, { stage: "clipping", step: "cutting", done: 0, total: recipes.length });
    await updateJob(jobId, { analyzer, artifacts, voiceApplied, status: "clipping" });
    await materializeClips(jobId, source.sourceVideoPath, recipes, {
      reuseCuts: job.sourceType === "fixture",
    });
    clearProgress(jobId);
    await updateJob(jobId, { status: "ready" });
    await writeFollowUp(jobId, source.title, recipes, job.sourceType === "fixture");
  } catch (error) {
    // A pack deleted mid-run fails on its own missing row (no job to read, or clips that
    // break the foreign key). Nothing is left to mark as failed, so stop quietly.
    clearProgress(jobId);
    if (!(await getJob(jobId))) return;
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
      await copyFixtureVideo(dest, FIXTURE_DURATION_SEC, sourcesDir());
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
        setProgress(jobId, { step: "download", bytes: 0 });
        await downloadYoutubeVideo(job.sourceUrl, dest, {
          onBytes: (bytes) => setProgress(jobId, { bytes }),
        });
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

async function materializeClips(jobId, sourceVideoPath, recipes, { reuseCuts = false } = {}) {
  const existing = await listClipsForJob(jobId);
  if (existing.length > 0) return;

  const records = [];
  for (const [index, recipe] of recipes.entries()) {
    const id = randomUUID();
    setProgress(jobId, { done: index, total: recipes.length, platform: recipe.platform });
    let videoPath = null;
    if (sourceVideoPath && fs.existsSync(sourceVideoPath) && ffmpegAvailable()) {
      const dest = path.join(clipsDir(), `${id}.mp4`);
      const cut = {
        sourcePath: sourceVideoPath,
        startSec: recipe.startSec,
        endSec: recipe.endSec,
        aspectRatio: recipe.aspectRatio,
      };
      try {
        if (reuseCuts) {
          await copyCachedClip(dest, fixtureClipCacheKey(recipe), sourcesDir(), (tmp) =>
            cutClip({ ...cut, outputPath: tmp }),
          );
        } else {
          await cutClip({ ...cut, outputPath: dest });
        }
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

  setProgress(jobId, { done: recipes.length, total: recipes.length, platform: null });
  await insertClips(records);
}

async function writeFollowUp(jobId, title, recipes, reuseSavedAnswer) {
  try {
    const followup = await requestAutonomousFollowUp({
      title,
      platforms: recipes.map((recipe) => recipe.platform),
      reuseSavedAnswer,
    });
    await updateJob(jobId, { followup });
  } catch (error) {
    console.warn("Follow-up skipped", error);
  }
}
