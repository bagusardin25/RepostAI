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
    brandIcon = <IconYoutube className="h-3.5 w-3.5 text-red-500" />;
  }

  const label = isPlatform(platform) ? PLATFORM_LABEL[platform] : platform;

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-white/[0.04] border border-white/[0.08] text-zinc-300">
        {brandIcon}
        <span>{label}</span>
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2.5">
      <div
        className="grid h-7 w-7 place-items-center rounded-md bg-white/[0.05] border border-white/[0.08] text-zinc-200"
        aria-hidden
      >
        {brandIcon}
      </div>
      <div>
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-white">{label}</p>
          <span className="timecode text-[10px] text-zinc-500 font-normal">
            {isTT ? "9:16 · 60s" : isIG ? "9:16 · 90s" : isX ? "9:16 · 140s" : "9:16"}
          </span>
        </div>
        {detail ? (
          <p className="timecode text-[11px] text-zinc-500">{platformSpecLine(platform)}</p>
        ) : null}
      </div>
    </div>
  );
}
