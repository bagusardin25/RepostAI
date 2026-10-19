"use client";

import { useEffect, useRef, useState } from "react";
import { FootageArt, type FootageCrop } from "@frontend/components/footage";

// Lines from the bundled 1:36 sample. The three picked lines open the three clips.
const LINES: Array<{ t: string; text: string; pick?: 1 | 2 | 3; platform?: string; minor?: boolean }> = [
  { t: "0:00", text: "Hey, I used to spend four hours after every YouTube upload just chopping clips." },
  { t: "0:08", text: "Caption for TikTok, then a different hook for Reels, then a thread for X.", pick: 1, platform: "TikTok" },
  { t: "0:16", text: "None of those platforms want the same first three seconds.", minor: true },
  { t: "0:22", text: "TikTok needs a punch in the face. Instagram needs a loop.", minor: true },
  { t: "0:32", text: "So here is the rule I use now: one source video, three jobs, never copy-paste.", minor: true },
  {
    t: "0:40",
    text: "First, find the sentence that would still make sense if someone muted the video.",
    pick: 2,
    platform: "Reels",
  },
  { t: "0:48", text: "That sentence is your hook. Put it at second zero, not after your intro.", minor: true },
  {
    t: "1:14",
    text: "If I approve a clip, I want the next one to remember that I hate cold intros.",
    pick: 3,
    platform: "X",
  },
];

const CUTS: Array<{ crop: FootageCrop; tag: string; cap: [string, string, string]; range: string; length: string }> = [
  { crop: "tiktok", tag: "TikTok", cap: ["a different ", "hook", " for Reels"], range: "0:07–0:25", length: "18s" },
  { crop: "reels", tag: "Reels", cap: ["if someone ", "muted", " the video"], range: "0:36–0:58", length: "22s" },
  { crop: "x", tag: "X", cap: ["I hate ", "cold", " intros"], range: "1:09–1:25", length: "16s" },
];

const DRAFTS = [
  { name: "TikTok script", spec: "6 lines", excerpt: "Hey, I used to spend four hours after every upload…" },
  { name: "Carousel", spec: "5 slides", excerpt: "The problem · Why copy-paste fails · The rule" },
  { name: "X thread", spec: "5 posts", excerpt: "None of those platforms want the same first…" },
  { name: "LinkedIn post", spec: "381 chars", excerpt: "I review every draft before it ships." },
];

/**
 * Landing hero stage built from the real sample pack: the transcript with
 * its three picked lines, the three 9:16 clips cut from them, and the four
 * drafts. A 12s CSS loop; paused off-screen; finished frame for reduced motion.
 */
export function Showcase() {
  const ref = useRef<HTMLElement>(null);
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
      // One labelled image for screen readers; the looping parts inside are decoration.
      role="img"
      aria-label="Example: the 1:36 sample video, its transcript with three picked lines, and the three clips and four drafts made from it"
    >
      <div className="sc-src">
        <div className="sc-head">
          <div className="sc-thumb">
            <FootageArt crop="wide" />
            <span className="sc-badge timecode">1:36</span>
          </div>
          <div className="min-w-0">
            <p className="sc-title">Stop posting the same YouTube video everywhere</p>
            <p className="sc-meta">Sample video · English captions</p>
          </div>
        </div>
        <ol className="sc-lines">
          {LINES.map((line) => (
            <li key={line.t} className="sc-line" data-pick={line.pick} data-minor={line.minor ? "" : undefined}>
              <span className="sc-tc timecode">{line.t}</span>
              <span>
                {line.pick ? <span className="sc-mark">{line.text}</span> : line.text}
                {line.platform ? <span className="sc-pick">{line.platform}</span> : null}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="sc-out">
        <div className="sc-cuts">
          {CUTS.map((cut) => (
            <div key={cut.tag} className="sc-cut">
              <div className="sc-frame">
                <FootageArt crop={cut.crop} />
                <span className="clip-tag">{cut.tag}</span>
                <p className="clip-cap">
                  {cut.cap[0]}
                  <b>{cut.cap[1]}</b>
                  {cut.cap[2]}
                </p>
              </div>
              <p className="sc-len timecode">
                <span>{cut.range}</span>
                <span>{cut.length}</span>
              </p>
            </div>
          ))}
        </div>
        <div className="sc-drafts">
          {DRAFTS.map((draft) => (
            <div key={draft.name} className="sc-draft">
              <p className="sc-draft-head">
                <span className="sc-draft-name">{draft.name}</span>
                <span className="sc-draft-spec timecode">{draft.spec}</span>
              </p>
              <p className="sc-excerpt">{draft.excerpt}</p>
            </div>
          ))}
        </div>
      </div>
    </figure>
  );
}
