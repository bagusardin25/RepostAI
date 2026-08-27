"use client";

import { useState } from "react";
import type { ContentArtifacts } from "@frontend/lib/api";
import { draftTeasers, formatAllDrafts, formatDraft } from "@frontend/lib/content-pack";
import { useToast } from "@frontend/components/toast";
import { IconCopy, IconCheck } from "@frontend/components/icons";

type Tab = "script" | "carousel" | "thread" | "linkedin";

export function ArtifactsPanel({ artifacts }: { artifacts: ContentArtifacts }) {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("script");
  const [copied, setCopied] = useState<"tab" | "all" | null>(null);

  const text = formatDraft(artifacts, tab);
  const teasers = draftTeasers(artifacts);

  function copyTab() {
    void navigator.clipboard.writeText(text);
    setCopied("tab");
    toast.success("Copied this draft");
    setTimeout(() => setCopied(null), 1600);
  }

  function copyAll() {
    void navigator.clipboard.writeText(formatAllDrafts(artifacts));
    setCopied("all");
    toast.success("Copied all 4 drafts");
    setTimeout(() => setCopied(null), 1600);
  }

  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
        <div>
          <h2 className="section-title">4 text drafts</h2>
          <p className="text-xs text-[var(--fg-muted)]">Script, carousel, thread, and LinkedIn — same source as the clips.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn btn-ghost btn-xs active:scale-95 transition-transform" onClick={copyTab}>
            {copied === "tab" ? <IconCheck className="h-3 w-3 text-[var(--ok)] animate-pop" /> : <IconCopy className="h-3 w-3" />}
            <span>{copied === "tab" ? "Copied" : "Copy this draft"}</span>
          </button>
          <button type="button" className="btn btn-primary btn-xs active:scale-95 transition-transform" onClick={copyAll}>
            {copied === "all" ? <IconCheck className="h-3 w-3 text-[var(--ok)] animate-pop" /> : <IconCopy className="h-3 w-3" />}
            <span>{copied === "all" ? "Copied" : "Copy all 4 drafts"}</span>
          </button>
        </div>
      </div>

      <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-4">
        {teasers.map((tease) => (
          <button
            key={tease.key}
            type="button"
            onClick={() => setTab(tease.key)}
            className={`cell p-3 text-left space-y-1.5 transition-colors ${
              tab === tease.key ? "border-[var(--border-strong)] bg-[var(--bg-card-hover)]" : "hover:border-[var(--border-strong)]"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-[var(--fg)]">{tease.label}</p>
              <span className="timecode text-[10px] text-[var(--fg-muted)]">{tease.meta}</span>
            </div>
            <p className="text-[11px] text-[var(--fg-muted)] leading-relaxed line-clamp-2">{tease.tease}</p>
          </button>
        ))}
      </div>

      <div key={tab} className="p-4 pt-1 animate-fade-in-up">
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
