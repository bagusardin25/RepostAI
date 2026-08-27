import { IconTikTok, IconInstagram, IconX, IconYoutube } from "@frontend/components/icons";
import { PLATFORM_LABEL, isPlatform, platformSpecLine } from "@frontend/lib/format";

export function PlatformMark({
  platform,
  detail,
  compact,
}: {
  platform: string;
  detail?: boolean;
  compact?: boolean;
}) {
  const isTT = platform === "tiktok";
  const isIG = platform === "instagram";
  const isX = platform === "x";
  const isYT = platform === "youtube";

  let brandIcon = <span className="font-bold text-xs uppercase">{platform.slice(0, 2)}</span>;

  if (isTT) {
    brandIcon = <IconTikTok className="h-3.5 w-3.5" />;
  } else if (isIG) {
    brandIcon = <IconInstagram className="h-3.5 w-3.5" />;
  } else if (isX) {
    brandIcon = <IconX className="h-3 w-3" />;
  } else if (isYT) {
    brandIcon = <IconYoutube className="h-3.5 w-3.5 text-[var(--bad)]" />;
  }

  const label = isPlatform(platform) ? PLATFORM_LABEL[platform] : platform;

  if (compact) {
    return (
      <span className="glass-chip inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium text-[var(--fg)]">
        {brandIcon}
        <span>{label}</span>
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2.5">
      <div
        className="grid h-7 w-7 place-items-center rounded-md glass-chip text-[var(--fg)]"
        aria-hidden
      >
        {brandIcon}
      </div>
      <div>
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-[var(--fg)]">{label}</p>
          {!detail ? (
            <span className="timecode text-[10px] text-[var(--fg-subtle)] font-normal">
              {isTT ? "9:16 · 60s" : isIG ? "9:16 · 90s" : isX ? "9:16 · 140s" : "9:16"}
            </span>
          ) : null}
        </div>
        {detail ? (
          <p className="timecode text-[11px] text-[var(--fg-subtle)]">{platformSpecLine(platform)}</p>
        ) : null}
      </div>
    </div>
  );
}
