"use client";

import { useEffect, useRef, useState } from "react";
import { FootageArt, type FootageCrop } from "@frontend/components/footage";
import { IconCheck } from "@frontend/components/icons";

const CUTS: Array<{ crop: FootageCrop; tag: string; hook: string; length: string }> = [
  { crop: "tiktok", tag: "TikTok", hook: "Stop copying the same clip.", length: "0:18" },
  { crop: "reels", tag: "Reels", hook: "The first three seconds decide it.", length: "0:22" },
  { crop: "x", tag: "X", hook: "One takeaway. Under 280.", length: "0:16" },
];

const DRAFTS = ["TikTok script", "IG carousel", "X thread · LinkedIn"];

// Fixed bar heights so server and client render the same waveform.
const WAVE = [
  34, 52, 40, 66, 48, 72, 58, 38, 62, 80, 54, 44, 70, 86, 60, 42, 56, 74, 50, 36, 64, 82, 58, 46, 68, 52, 40, 60, 76,
  48, 34, 58, 70, 44, 62, 50,
];

/**
 * Looping 12s product demo for the landing hero: a YouTube source is scanned,
 * three moments are marked, three 9:16 cuts rise out of it, drafts follow.
 * Pure CSS animation; paused while off-screen; static final frame for
 * reduced motion.
 */
export function Showcase() {
  const ref = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setPaused(!entry.isIntersecting), { threshold: 0.05 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <figure
      ref={ref}
      className="showcase"
      data-paused={paused ? "true" : "false"}
      aria-label="Demo: one YouTube video becomes three vertical clips and four text drafts"
    >
      <div className="sc-source">
        <div className="sc-bar">
          <span className="rec-dot" aria-hidden="true" />
          <span className="sc-url">youtube.com/watch?v=creator-talk</span>
          <span className="ml-auto">16:9 · 12:48</span>
        </div>
        <div className="sc-frame">
          <FootageArt crop="wide" />
          <span className="sc-sub">the first three seconds decide it</span>
          <span className="sc-crop" aria-hidden="true" />
        </div>
        <div className="sc-track-wrap">
          <div className="sc-track" aria-hidden="true">
            <div className="sc-wave">
              {WAVE.map((h, i) => (
                <i key={i} style={{ height: `${h}%` }} />
              ))}
            </div>
            <span className="sc-mark sc-mark-1" />
            <span className="sc-mark sc-mark-2" />
            <span className="sc-mark sc-mark-3" />
            <span className="sc-head" />
          </div>
          <div className="sc-status flex justify-between">
            <span>Reading captions…</span>
            <span>Finding the strongest moments…</span>
            <span>Cutting 9:16 clips…</span>
            <span>3 clips + 4 drafts ready for review</span>
          </div>
        </div>
      </div>

      <div className="sc-cuts">
        {CUTS.map((cut, index) => (
          <div key={cut.tag} className="sc-cut-slot">
            <div className={`sc-cut sc-cut-${index + 1}`}>
              <FootageArt crop={cut.crop} />
              <span className="sc-tag">{cut.tag}</span>
              <p className="sc-hook">{cut.hook}</p>
              <span className="sc-len">{cut.length}</span>
              <span className="sc-check">
                <IconCheck className="h-3 w-3" aria-hidden="true" />
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="sc-drafts">
        {DRAFTS.map((draft) => (
          <span key={draft} className="sc-draft">
            <i aria-hidden="true" />
            {draft}
          </span>
        ))}
      </div>
    </figure>
  );
}
