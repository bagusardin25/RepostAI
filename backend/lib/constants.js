export const PLATFORMS = ["tiktok", "instagram", "x"];

export const PLATFORM_SPECS = {
  tiktok: { maxDuration: 60, aspectRatio: "9:16", captionLimit: 2200 },
  instagram: { maxDuration: 90, aspectRatio: "9:16", captionLimit: 2200 },
  x: { maxDuration: 140, aspectRatio: "9:16", captionLimit: 280 },
};

export const MIN_CLIP_SEC = 8;
export const REVIEW_ACTIONS = ["approve", "reject", "edit"];
