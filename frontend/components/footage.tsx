/**
 * Stand-in footage: a soft-focus talking-head shot drawn with CSS gradients
 * (see `.scene` in globals.css). The 9:16 crops are windows onto the same
 * 16:9 frame, so each vertical clip visibly comes from the wide shot.
 * The parent must be positioned and clip its overflow.
 */
export type FootageCrop = "wide" | "tiktok" | "reels" | "x";

export function FootageArt({ crop = "wide", className = "" }: { crop?: FootageCrop; className?: string }) {
  return <span className={`scene ${className}`.trim()} data-crop={crop} aria-hidden="true" />;
}
