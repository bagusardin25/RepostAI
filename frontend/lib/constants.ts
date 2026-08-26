export const PLATFORM_SPECS = {
  tiktok: { maxDuration: 60, aspectRatio: "9:16" as const, captionLimit: 2200 },
  instagram: { maxDuration: 90, aspectRatio: "9:16" as const, captionLimit: 2200 },
  x: { maxDuration: 140, aspectRatio: "9:16" as const, captionLimit: 280 },
};

export type Platform = keyof typeof PLATFORM_SPECS;
