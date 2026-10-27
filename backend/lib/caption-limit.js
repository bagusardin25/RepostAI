import { PLATFORM_SPECS } from "./constants.js";

const DEFAULT_CAPTION_LIMIT = 2200;

export function captionLimit(platform) {
  return Object.hasOwn(PLATFORM_SPECS, platform) ? PLATFORM_SPECS[platform].captionLimit : DEFAULT_CAPTION_LIMIT;
}

/** How many characters a caption runs over its platform's limit; 0 when it fits. */
export function captionOverLimit(platform, caption) {
  return Math.max(0, (caption ?? "").length - captionLimit(platform));
}
