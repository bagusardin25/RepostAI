export function snapshotVoice(memory) {
  if (!memory) {
    return {
      notes: [],
      rejectedReasons: [],
      preferredHooks: [],
      platformNotes: {},
      score: null,
      sampleSize: 0,
    };
  }
  return {
    notes: memory.notes ?? [],
    rejectedReasons: memory.rejectedReasons ?? [],
    preferredHooks: memory.preferredHooks ?? [],
    platformNotes: memory.platformNotes ?? {},
    score: memory.score?.score ?? null,
    sampleSize: memory.score?.sampleSize ?? 0,
  };
}

export function voiceHasHistory(snapshot) {
  if (!snapshot) return false;
  return (
    (snapshot.notes?.length ?? 0) > 0 ||
    (snapshot.rejectedReasons?.length ?? 0) > 0 ||
    (snapshot.preferredHooks?.length ?? 0) > 0 ||
    Object.keys(snapshot.platformNotes ?? {}).length > 0
  );
}

const PLATFORM_ORDER = ["tiktok", "instagram", "x"];

function displayClip(clip) {
  if (!clip) return null;
  return {
    id: clip.id ?? null,
    hook: clip.editedHook || clip.hook || "",
    caption: clip.editedCaption || clip.caption || "",
    reason: clip.reason || "",
    status: clip.status || null,
    reviewNote: clip.reviewNote || null,
    startSec: clip.startSec ?? null,
    endSec: clip.endSec ?? null,
    durationSec: clip.durationSec ?? null,
    videoPath: clip.videoPath ?? null,
  };
}

export function compareJobPackages(leftClips, rightClips) {
  const leftMap = new Map((leftClips ?? []).map((clip) => [clip.platform, clip]));
  const rightMap = new Map((rightClips ?? []).map((clip) => [clip.platform, clip]));
  const platforms = [
    ...PLATFORM_ORDER.filter((platform) => leftMap.has(platform) || rightMap.has(platform)),
    ...[...leftMap.keys(), ...rightMap.keys()].filter((platform) => !PLATFORM_ORDER.includes(platform)),
  ];
  const unique = [...new Set(platforms)];

  return unique.map((platform) => {
    const left = displayClip(leftMap.get(platform));
    const right = displayClip(rightMap.get(platform));
    return {
      platform,
      left,
      right,
      hookChanged: Boolean(left && right && left.hook !== right.hook),
      captionChanged: Boolean(left && right && left.caption !== right.caption),
      windowChanged: Boolean(
        left &&
          right &&
          (left.startSec !== right.startSec || left.endSec !== right.endSec),
      ),
      taughtBy: left?.status === "rejected" || left?.status === "edited" ? left.status : null,
    };
  });
}

export function comparePlatformClips(previousClips, currentClips) {
  const prevByPlatform = new Map((previousClips ?? []).map((clip) => [clip.platform, clip]));
  return (currentClips ?? []).map((clip) => {
    const previous = prevByPlatform.get(clip.platform);
    if (!previous) {
      return {
        platform: clip.platform,
        first: true,
        previousHook: null,
        previousStatus: null,
        previousNote: null,
        currentHook: clip.hook,
        changed: false,
      };
    }
    const previousHook = previous.editedHook || previous.hook;
    const currentHook = clip.hook;
    return {
      platform: clip.platform,
      first: false,
      previousHook,
      previousStatus: previous.status,
      previousNote: previous.reviewNote,
      currentHook,
      changed: previousHook !== currentHook,
    };
  });
}
