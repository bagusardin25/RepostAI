import path from "node:path";

export function publicJob(job) {
  const { sourceVideoPath, transcript, ...rest } = job;
  return {
    ...rest,
    hasTranscript: Boolean(transcript && transcript.length > 0),
    hasSourceVideo: Boolean(sourceVideoPath),
    sourceVideoUrl: sourceVideoPath
      ? `/api/media/sources/${path.basename(sourceVideoPath)}`
      : null,
  };
}

export function publicJobDetail(job) {
  return {
    ...publicJob(job),
    transcript: job.transcript,
  };
}

export function publicClip(clip) {
  const { videoPath, ...rest } = clip;
  return {
    ...rest,
    videoUrl: videoPath ? `/api/media/clips/${path.basename(videoPath)}` : null,
    displayCaption: clip.editedCaption ?? clip.caption,
    displayHook: clip.editedHook ?? clip.hook,
  };
}
