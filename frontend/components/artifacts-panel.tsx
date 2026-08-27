"use client";

import { useState } from "react";
import type { ContentArtifacts } from "@frontend/lib/api";
import { useToast } from "@frontend/components/toast";
import { IconCopy, IconCheck } from "@frontend/components/icons";

type Tab = "script" | "carousel" | "thread" | "linkedin";

export function ArtifactsPanel({ artifacts }: { artifacts: ContentArtifacts }) {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("script");
  const [copied, setCopied] = useState(false);

  const text = artifactText(artifacts, tab);

  function copy() {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied draft");
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
        <div>
          <h2 className="section-title">Text packages</h2>
          <p className="text-xs text-[var(--fg-muted)]">Script, carousel, thread, and LinkedIn — still review-only.</p>
        </div>
        <button type="button" className="btn btn-ghost btn-xs" onClick={copy}>
          {copied ? <IconCheck className="h-3 w-3" /> : <IconCopy className="h-3 w-3" />}
          <span>{copied ? "Copied" : "Copy tab"}</span>
        </button>
      </div>

      <div className="px-4 pt-3">
        <div className="seg flex-wrap">
        {(
          [
            ["script", "TikTok script"],
            ["carousel", "IG carousel"],
            ["thread", "X thread"],
            ["linkedin", "LinkedIn"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`seg-item ${tab === key ? "is-active" : ""}`}
          >
            {label}
          </button>
        ))}
        </div>
      </div>

      <div className="p-4">
        {tab === "script" && (
          <div className="space-y-3">
            {artifacts.tiktokScript.onScreenText && (
              <p className="text-xs text-[var(--fg-muted)]">
                On-screen: <span className="text-[var(--fg)]">{artifacts.tiktokScript.onScreenText}</span>
              </p>
            )}
            <ol className="space-y-2 text-sm text-[var(--fg)]">
              {artifacts.tiktokScript.lines.map((line, index) => (
                <li key={`${index}-${line}`} className="leading-relaxed">
                  <span className="timecode text-[11px] text-[var(--fg-muted)] mr-2">{index + 1}</span>
                  {line}
                </li>
              ))}
            </ol>
            {artifacts.tiktokScript.cta && (
              <p className="text-xs text-[var(--fg-muted)]">CTA: {artifacts.tiktokScript.cta}</p>
            )}
          </div>
        )}

        {tab === "carousel" && (
          <div className="grid gap-2 sm:grid-cols-2">
            {artifacts.instagramCarousel.slides.map((slide, index) => (
              <article key={`${slide.title}-${index}`} className="cell p-3 space-y-1">
                <p className="timecode text-[11px] text-[var(--fg-muted)]">
                  {index + 1} / {artifacts.instagramCarousel.slides.length}
                </p>
                <h3 className="text-xs font-semibold text-[var(--fg)]">{slide.title}</h3>
                <p className="text-xs text-[var(--fg-muted)] leading-relaxed">{slide.body}</p>
              </article>
            ))}
          </div>
        )}

        {tab === "thread" && (
          <ol className="space-y-2">
            {artifacts.xThread.tweets.map((tweet, index) => (
              <li key={`${index}-${tweet}`} className="cell p-3 text-sm leading-relaxed">
                <span className="timecode text-[11px] text-[var(--fg-muted)] block mb-1">
                  {index + 1}/{artifacts.xThread.tweets.length} · {tweet.length}/280
                </span>
                {tweet}
              </li>
            ))}
          </ol>
        )}

        {tab === "linkedin" && (
          <pre className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--fg)] font-sans">
            {artifacts.linkedinPost.text}
          </pre>
        )}
      </div>
    </section>
  );
}

function artifactText(artifacts: ContentArtifacts, tab: Tab) {
  if (tab === "script") {
    return [
      artifacts.tiktokScript.onScreenText && `On-screen: ${artifacts.tiktokScript.onScreenText}`,
      ...artifacts.tiktokScript.lines.map((line, index) => `${index + 1}. ${line}`),
      artifacts.tiktokScript.cta && `CTA: ${artifacts.tiktokScript.cta}`,
    ]
      .filter(Boolean)
      .join("\n");
  }
  if (tab === "carousel") {
    return artifacts.instagramCarousel.slides
      .map((slide, index) => `${index + 1}. ${slide.title}\n${slide.body}`)
      .join("\n\n");
  }
  if (tab === "thread") {
    return artifacts.xThread.tweets.map((tweet, index) => `${index + 1}/${artifacts.xThread.tweets.length}\n${tweet}`).join("\n\n");
  }
  return artifacts.linkedinPost.text;
}
