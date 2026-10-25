import type { Platform } from "@frontend/lib/constants";

/** A part of the 9:16 frame covered by the app's own UI, as shares of the frame (0 to 1). */
export type CoveredArea = { label: string; x: number; y: number; w: number; h: number };

/**
 * Roughly where each app draws its own UI over a full-screen 9:16 video, from common creator
 * safe-zone guides. Approximate: the apps move these around between versions.
 */
export const COVERED_AREAS: Record<Platform, CoveredArea[]> = {
  tiktok: [
    { label: "Tabs", x: 0, y: 0, w: 1, h: 0.08 },
    { label: "Buttons", x: 0.85, y: 0.35, w: 0.15, h: 0.45 },
    { label: "Caption & username", x: 0, y: 0.8, w: 1, h: 0.2 },
  ],
  instagram: [
    { label: "Header", x: 0, y: 0, w: 1, h: 0.12 },
    { label: "Buttons", x: 0.85, y: 0.45, w: 0.15, h: 0.3 },
    { label: "Caption & username", x: 0, y: 0.75, w: 1, h: 0.25 },
  ],
  x: [
    { label: "Header", x: 0, y: 0, w: 1, h: 0.06 },
    { label: "Player controls", x: 0, y: 0.85, w: 1, h: 0.15 },
  ],
};

/** Where on-screen text can start without sitting under the top bar: just below it. */
export function hookTop(platform: Platform) {
  const topBar = COVERED_AREAS[platform].find((area) => area.y === 0 && area.w === 1);
  return (topBar?.h ?? 0) + 0.03;
}
