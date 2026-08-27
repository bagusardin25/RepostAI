import { execFile, execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import { promisify } from "node:util";

const require = createRequire(import.meta.url);
const ffmpegStatic = require("ffmpeg-static");
const execFileAsync = promisify(execFile);

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
  const bin = ffmpegPath();
  if (!bin) throw new Error("ffmpeg binary is not available");

  await execFileAsync(
    bin,
    [
      "-y",
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
      input.outputPath,
    ],
    { windowsHide: true, timeout: 120_000 },
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
  const bin = ffmpegPath();
  if (!bin) throw new Error("ffmpeg binary is not available");
  await execFileAsync(
    bin,
    [
      "-y",
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
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-shortest",
      outputPath,
    ],
    { windowsHide: true, timeout: 60_000 },
  );
}
