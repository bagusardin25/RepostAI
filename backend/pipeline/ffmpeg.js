import { execFile, execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const require = createRequire(import.meta.url);
const ffmpegStatic = require("ffmpeg-static");
const execFileAsync = promisify(execFile);

// By default every ffmpeg run starts threads per visible CPU core. The Railway container
// sees many host cores but allows few threads, so a handful of packs processed at once
// failed with "pthread_create failed: Resource temporarily unavailable". Cap both the
// threads per run and how many runs execute at the same time.
const FFMPEG_THREADS = String(positiveInt(process.env.FFMPEG_THREADS, 2));
const FFMPEG_MAX_PARALLEL = positiveInt(process.env.FFMPEG_MAX_PARALLEL, 2);

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Runs at most `max` tasks at once; the rest wait in arrival order. */
export function createLimiter(max) {
  let active = 0;
  const waiting = [];

  function next() {
    if (active >= max || waiting.length === 0) return;
    active += 1;
    const { task, resolve, reject } = waiting.shift();
    Promise.resolve()
      .then(task)
      .then(resolve, reject)
      .finally(() => {
        active -= 1;
        next();
      });
  }

  return function limit(task) {
    return new Promise((resolve, reject) => {
      waiting.push({ task, resolve, reject });
      next();
    });
  };
}

const limitFfmpeg = createLimiter(FFMPEG_MAX_PARALLEL);

function runFfmpeg(args, timeout) {
  const bin = ffmpegPath();
  if (!bin) throw new Error("ffmpeg binary is not available");
  return limitFfmpeg(() => execFileAsync(bin, args, { windowsHide: true, timeout }));
}

let resolved = undefined;

function systemFfmpeg() {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore", windowsHide: true, timeout: 5000 });
    return "ffmpeg";
  } catch {
    return null;
  }
}

export function ffmpegPath() {
  if (resolved !== undefined) return resolved;
  const fromEnv = process.env.FFMPEG_PATH;
  if (fromEnv && fs.existsSync(fromEnv)) {
    resolved = fromEnv;
    return resolved;
  }
  if (ffmpegStatic && fs.existsSync(ffmpegStatic)) {
    resolved = ffmpegStatic;
    return resolved;
  }
  resolved = systemFfmpeg();
  return resolved;
}

export function ffmpegAvailable() {
  return Boolean(ffmpegPath());
}

function cropFilter(aspect) {
  if (aspect === "1:1") {
    return "scale=1080:1080:force_original_aspect_ratio=increase,crop=1080:1080";
  }
  if (aspect === "16:9") {
    return "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080";
  }
  return "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920";
}

export async function cutClip(input) {
  await runFfmpeg(
    [
      "-y",
      "-filter_threads",
      FFMPEG_THREADS,
      "-threads",
      FFMPEG_THREADS,
      "-ss",
      String(input.startSec),
      "-to",
      String(input.endSec),
      "-i",
      input.sourcePath,
      "-vf",
      cropFilter(input.aspectRatio),
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-c:a",
      "aac",
      "-movflags",
      "+faststart",
      "-threads",
      FFMPEG_THREADS,
      input.outputPath,
    ],
    120_000,
  );
}

export async function probeDurationSec(sourcePath) {
  const bin = ffmpegPath();
  if (!bin) return null;
  try {
    const { stderr } = await execFileAsync(bin, ["-i", sourcePath], {
      windowsHide: true,
      timeout: 20_000,
    });
    const match = stderr.match(/Duration: (\d+):(\d+):(\d+)/);
    if (!match) return null;
    return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
  } catch (error) {
    const stderr = error instanceof Error && "stderr" in error ? String(error.stderr) : "";
    const match = stderr.match(/Duration: (\d+):(\d+):(\d+)/);
    if (!match) return null;
    return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
  }
}

export async function writeFixtureVideo(outputPath, durationSec = 48) {
  await runFfmpeg(
    [
      "-y",
      "-filter_threads",
      FFMPEG_THREADS,
      "-f",
      "lavfi",
      "-i",
      `testsrc=duration=${durationSec}:size=1280x720:rate=30`,
      "-f",
      "lavfi",
      "-i",
      `sine=frequency=440:duration=${durationSec}`,
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-shortest",
      "-threads",
      FFMPEG_THREADS,
      outputPath,
    ],
    120_000,
  );
}

const cachedRenders = new Map();

/**
 * Packs that need the same rendered file share one render. Each caller gets its own copy,
 * because deleting a pack deletes the file it owns. A failed render leaves no temp file.
 */
async function copyFromCache(outputPath, cachedPath, render) {
  if (!fs.existsSync(cachedPath)) {
    if (!cachedRenders.has(cachedPath)) {
      const tmp = `${cachedPath}.tmp.mp4`;
      const pending = Promise.resolve()
        .then(() => render(tmp))
        .then(() => fs.renameSync(tmp, cachedPath))
        .catch((error) => {
          fs.rmSync(tmp, { force: true });
          throw error;
        })
        .finally(() => cachedRenders.delete(cachedPath));
      cachedRenders.set(cachedPath, pending);
    }
    await cachedRenders.get(cachedPath);
  }
  fs.copyFileSync(cachedPath, outputPath);
}

/**
 * The demo sample's test-pattern video depends only on its length, so it is rendered once
 * into `cacheDir` and copied for each new pack.
 */
export async function copyFixtureVideo(outputPath, durationSec, cacheDir, render = writeFixtureVideo) {
  const cached = path.join(cacheDir, `fixture-${durationSec}s.mp4`);
  await copyFromCache(outputPath, cached, (tmp) => render(tmp, durationSec));
}

/** Stable file name for one demo-sample clip window. Colons in aspect ratios are unsafe on Windows. */
export function fixtureClipCacheKey(recipe) {
  const start = Math.round(Number(recipe.startSec) * 1000);
  const end = Math.round(Number(recipe.endSec) * 1000);
  const aspect = String(recipe.aspectRatio ?? "9:16").replace(/[^a-z0-9]+/gi, "");
  return `fixture-clip-${start}-${end}-${aspect}`;
}

/**
 * Demo-sample clips depend only on the window, so the first pack cuts once and later packs
 * copy that file. Packs started together share the one cut.
 */
export async function copyCachedClip(outputPath, cacheKey, cacheDir, render) {
  const cached = path.join(cacheDir, `${cacheKey}.mp4`);
  await copyFromCache(outputPath, cached, render);
}
