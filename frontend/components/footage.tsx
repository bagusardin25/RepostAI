"use client";

import { useId } from "react";

/**
 * A stylised "talking head" frame used as stand-in footage. The same scene is
 * cropped to 16:9 for the source and to 9:16 windows for each platform cut,
 * so the vertical clips visibly come from the wide shot.
 */
export type FootageCrop = "wide" | "tiktok" | "reels" | "x";

const VIEWBOX: Record<FootageCrop, string> = {
  wide: "0 0 640 360",
  tiktok: "300 0 202.5 360",
  reels: "321 38 157.5 280",
  x: "262 0 202.5 360",
};

export function FootageArt({ crop = "wide", className }: { crop?: FootageCrop; className?: string }) {
  const raw = useId();
  const id = raw.replace(/[^a-zA-Z0-9_-]/g, "");
  const bg = `${id}-bg`;
  const key = `${id}-key`;
  const win = `${id}-win`;
  const lamp = `${id}-lamp`;

  return (
    <svg
      viewBox={VIEWBOX[crop]}
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={bg} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2c1e15" />
          <stop offset="1" stopColor="#0d0b0a" />
        </linearGradient>
        <radialGradient id={key} cx="0.64" cy="0.34" r="0.55">
          <stop offset="0" stopColor="#ff8a4c" stopOpacity="0.5" />
          <stop offset="1" stopColor="#ff8a4c" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={win} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd2a6" stopOpacity="0.34" />
          <stop offset="1" stopColor="#ffd2a6" stopOpacity="0.04" />
        </linearGradient>
        <radialGradient id={lamp} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffc38f" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffc38f" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect x="-80" y="-80" width="800" height="520" fill={`url(#${bg})`} />
      <rect x="-80" y="-80" width="800" height="520" fill={`url(#${key})`} />

      {/* window and shelf */}
      <rect x="44" y="44" width="150" height="206" rx="10" fill="#3a2a1f" opacity="0.55" />
      <rect x="56" y="56" width="126" height="182" rx="6" fill={`url(#${win})`} />
      <rect x="118" y="56" width="3" height="182" fill="#2b1f17" opacity="0.7" />
      <rect x="486" y="236" width="150" height="6" rx="3" fill="#2e221a" />
      <circle cx="520" cy="222" r="14" fill="#25321f" opacity="0.8" />
      <rect x="512" y="224" width="16" height="12" rx="2" fill="#4a3426" />
      <rect x="560" y="206" width="14" height="30" rx="2" fill="#3b2b20" />
      <rect x="578" y="214" width="12" height="22" rx="2" fill="#51392a" />

      {/* lamp and bokeh */}
      <circle cx="580" cy="84" r="70" fill={`url(#${lamp})`} />
      <circle cx="580" cy="84" r="16" fill="#ffd0a3" opacity="0.55" />
      <circle cx="118" cy="304" r="34" fill="#ffb27a" opacity="0.06" />
      <circle cx="252" cy="58" r="12" fill="#ffb27a" opacity="0.09" />
      <circle cx="612" cy="306" r="24" fill="#ffb27a" opacity="0.05" />

      {/* subject */}
      <path d="M292 364 C294 268 344 226 400 226 C456 226 506 268 508 364 Z" fill="#16110e" />
      <rect x="384" y="186" width="32" height="44" rx="12" fill="#16110e" />
      <circle cx="400" cy="150" r="47" fill="#16110e" />
      <path d="M436 112 C455 130 456 170 438 190" stroke="#ff8a4c" strokeOpacity="0.7" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M470 250 C492 268 504 300 506 340" stroke="#ff8a4c" strokeOpacity="0.45" strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* microphone */}
      <path d="M530 372 L476 268" stroke="#231b16" strokeWidth="8" strokeLinecap="round" />
      <rect x="454" y="232" width="24" height="44" rx="12" fill="#2b221c" transform="rotate(-24 466 254)" />
      <rect x="460" y="240" width="5" height="22" rx="2.5" fill="#ffffff" opacity="0.12" transform="rotate(-24 466 254)" />
    </svg>
  );
}
