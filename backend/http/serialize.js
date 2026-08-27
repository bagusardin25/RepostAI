function getFilename(filePath) {
  if (!filePath) return null;
  const parts = filePath.split(/[\\/]/);
  return parts[parts.length - 1] || null;
}

export function publicJob(job) {
  const { sourceVideoPath, transcript, ...rest } = job;
  const filename = getFilename(sourceVideoPath);
  return {
    ...rest,
    hasTranscript: Boolean(transcript && transcript.length > 0),
    hasSourceVideo: Boolean(sourceVideoPath),
    hasArtifacts: Boolean(job.artifacts),
    sourceVideoUrl: filename ? `/api/media/sources/${filename}` : null,
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
  const filename = getFilename(videoPath);
  return {
    ...rest,
    videoUrl: filename ? `/api/media/clips/${filename}` : null,
    displayCaption: clip.editedCaption ?? clip.caption,
    displayHook: clip.editedHook ?? clip.hook,
  };
}

