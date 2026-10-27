import { PLATFORM_SPECS } from "@frontend/lib/constants";
import { isPlatform } from "@frontend/lib/format";

const DEFAULT_CAPTION_LIMIT = 2200;

export function captionLimit(platform: string) {
  return isPlatform(platform) ? PLATFORM_SPECS[platform].captionLimit : DEFAULT_CAPTION_LIMIT;
}

/**
 * The message that stops a review action, or null when it may go ahead.
 * Approve with an unsaved edit saves the edit first, so Approve is checked like Save. Reject always goes through.
 */
export function reviewBlockedBy(action: "approve" | "reject" | "edit", platform: string, caption: string) {
  if (action === "reject") return null;
  const over = caption.length - captionLimit(platform);
  return over > 0 ? `Caption is ${over} characters over limit.` : null;
}
