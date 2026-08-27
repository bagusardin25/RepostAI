"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandMark } from "@frontend/components/brand-mark";
import {
  IconArrowRight,
  IconBrain,
  IconCheck,
  IconChevronRight,
  IconInstagram,
  IconMessageCircle,
  IconScissors,
  IconShield,
  IconSparkles,
  IconTikTok,
  IconX,
  IconYoutube,
} from "@frontend/components/icons";
import { ThemeToggle } from "@frontend/components/theme-provider";

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(media.matches);
    const onChange = () => setReduced(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function PipelineDemo() {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(reduced ? 3 : 0);
  const steps = [
    { label: "Source", icon: IconYoutube },
    { label: "Mind", icon: IconBrain },
    { label: "Cut", icon: IconScissors },
    { label: "Review", icon: IconCheck },
  ];

  useEffect(() => {
    if (reduced) {
      setStep(3);
      return;
    }
    const interval = window.setInterval(() => {
      setStep((current) => (current + 1) % steps.length);
    }, 2200);
    return () => window.clearInterval(interval);
  }, [reduced, steps.length]);

  return (
    <ol className="flex items-start gap-2 sm:gap-4 overflow-x-auto pb-1 max-w-full">
      {steps.map((item, index) => {
        const Icon = item.icon;
        const active = index <= step;
        return (
          <li key={item.label} className="flex items-center gap-2 sm:gap-4">
            <div className={`flex flex-col items-center gap-2 min-w-[4.5rem] ${active ? "opacity-100" : "opacity-40"}`}>
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-lg border ${
                  active
                    ? "glass-chip border-[var(--glass-border)]"
                    : "border-[var(--border)] bg-transparent"
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <span className="timecode text-[11px] text-[var(--fg-muted)]">{item.label}</span>
            </div>
            {index < steps.length - 1 ? (
              <IconChevronRight
                className={`h-4 w-4 mt-4 shrink-0 ${index < step ? "text-[var(--fg)]" : "text-[var(--fg-subtle)]"}`}
                aria-hidden="true"
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function PackageStrip() {
  const frames = [
    { platform: "TikTok", hook: "Stop copying the same clip.", time: "00:08–00:26" },
    { platform: "Reels", hook: "The first three seconds decide it.", time: "00:32–00:54" },
    { platform: "X", hook: "One takeaway. Under 280.", time: "01:04–01:20" },
  ];

  return (
    <figure className="glass w-full min-w-0 overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-2.5">
        <figcaption className="timecode text-[11px] text-[var(--fg-muted)]">Example packages from one source</figcaption>
        <span className="timecode text-[11px] text-[var(--fg-muted)]">9:16</span>
      </div>
      <div className="grid grid-cols-3 gap-2 p-3 min-w-0">
        {frames.map((frame) => (
          <article key={frame.platform} className="cell min-w-0 p-2 sm:p-3 min-h-[11rem] flex flex-col">
            <p className="timecode text-[10px] text-[var(--fg-muted)]">{frame.platform}</p>
            <p className="mt-3 text-xs font-medium leading-relaxed text-[var(--fg)] break-words">{frame.hook}</p>
            <p className="timecode mt-auto pt-4 text-[10px] text-[var(--fg-subtle)]">{frame.time}</p>
          </article>
        ))}
      </div>
      <p className="px-4 py-2.5 text-[11px] text-[var(--fg-muted)] border-t border-[var(--border)]">
        Also drafted: TikTok script · IG carousel · X thread · LinkedIn post
      </p>
    </figure>
  );
}

export function LandingContent() {
  return (
    <div className="relative min-h-screen text-[var(--fg)]">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--fg)] focus:text-[var(--bg)] focus:rounded-md text-xs font-semibold"
        href="#content"
      >
        Skip to content
      </a>

      <header className="site-header sticky top-0 z-50">
        <div className="site-wrap flex min-h-[var(--header-h)] items-center justify-between gap-2 sm:gap-3">
          <BrandMark href="/" current />
          <nav aria-label="Landing" className="hidden sm:flex min-w-0 flex-1 items-center justify-center gap-1 text-xs text-[var(--fg-muted)]">
            <a href="#how" className="chip">
              How it works
            </a>
            <a href="#packages" className="chip">
              Packages
            </a>
            <a href="#mind" className="chip">
              Mind
            </a>
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <Link href="/desk" className="btn btn-primary btn-sm shrink-0">
              Open desk
              <IconArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <main id="content" className="relative z-10">
        <section className="site-wrap pt-14 pb-16 sm:pt-20 sm:pb-24">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center">
            <div className="space-y-6">
              <p className="kicker">Creative Minds Jam #1 · Content repurposing</p>
              <h1 className="display-title">
                One source.
                <br />
                Three vertical cuts.
                <br />
                Four text packages.
              </h1>
              <p className="page-lede text-sm sm:text-base">
                Paste a YouTube URL. The Minds agent picks moments, FFmpeg cuts 9:16 clips, and you
                review every hook and caption. Approvals write back into the Mind. Nothing publishes.
              </p>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <Link href="/desk" className="btn btn-primary px-5">
                  Try the desk
                </Link>
                <a
                  href="https://github.com/bagusardin25/RepostAI"
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-ghost px-5"
                >
                  View source
                </a>
              </div>
              <dl className="grid grid-cols-3 gap-2 pt-2 max-w-md min-w-0">
                <div className="glass-chip min-w-0 rounded-lg px-2.5 py-2 sm:px-3">
                  <dt className="text-[11px] text-[var(--fg-muted)]">Clips</dt>
                  <dd className="text-lg font-semibold tabular-nums">3</dd>
                </div>
                <div className="glass-chip min-w-0 rounded-lg px-2.5 py-2 sm:px-3">
                  <dt className="text-[11px] text-[var(--fg-muted)]">Text drafts</dt>
                  <dd className="text-lg font-semibold tabular-nums">4</dd>
                </div>
                <div className="glass-chip min-w-0 rounded-lg px-2.5 py-2 sm:px-3">
                  <dt className="text-[11px] text-[var(--fg-muted)]">Auto-post</dt>
                  <dd className="text-sm sm:text-lg font-semibold leading-tight">Never</dd>
                </div>
              </dl>
            </div>
            <PackageStrip />
          </div>
        </section>

        <section id="how" className="border-y border-[var(--border)]">
          <div className="site-wrap py-14 sm:py-20 grid gap-10 lg:grid-cols-2 lg:items-center">
            <div className="space-y-3">
              <p className="kicker">Pipeline</p>
              <h2 className="page-title">
                The desk runs the job. You run the gate.
              </h2>
              <p className="text-sm text-[var(--fg-muted)] leading-relaxed max-w-lg">
                YouTube captions become the transcript. If a video has no captions, the job stops —
                we do not invent speech. Uploads need a transcript too.
              </p>
            </div>
            <PipelineDemo />
          </div>
          <div className="site-wrap pb-16 grid gap-6 sm:grid-cols-3">
            <Step number="01" title="Ingest" body="Paste a public YouTube link with captions, drop an MP4 plus transcript, or run the demo fixture." />
            <Step number="02" title="Mind & cut" body="The Mind proposes one window per platform. FFmpeg re-frames 9:16 and writes the files locally." />
            <Step number="03" title="Review" body="Approve, rewrite, or reject. Each decision is stored and sent to the Mind before the next job." />
          </div>
        </section>

        <section id="packages" className="site-wrap py-16 sm:py-24">
          <div className="max-w-2xl space-y-3 mb-10">
            <p className="kicker">Packages</p>
            <h2 className="page-title">
              Video cuts and copy, still review-only
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <PlatformCard icon={<IconTikTok className="h-5 w-5" />} name="TikTok" spec="9:16 · ≤ 60s · 2,200 chars" note="Hook-first clip plus spoken script." />
            <PlatformCard icon={<IconInstagram className="h-5 w-5" />} name="Instagram" spec="9:16 · ≤ 90s · 2,200 chars" note="Reels cut plus carousel slides." />
            <PlatformCard icon={<IconX className="h-5 w-5" />} name="X" spec="9:16 · ≤ 140s · 280 chars" note="Short takeaway clip plus a thread." />
          </div>
          <p className="mt-6 text-xs text-[var(--fg-muted)]">
            LinkedIn is a text draft only. Ship kit copies and downloads locally — RepostAI never posts.
          </p>
        </section>

        <section id="mind" className="border-t border-[var(--border)]">
          <div className="site-wrap py-16 sm:py-24 grid gap-10 lg:grid-cols-2">
            <div className="space-y-4">
              <p className="kicker">Minds agent</p>
              <h2 className="page-title">
                Persistence is the product
              </h2>
              <p className="text-sm text-[var(--fg-muted)] leading-relaxed">
                RepostAI talks to one Mind on a stable conversation alias. Reviews are messages, not
                just rows in SQLite. The next job sees what you rewrote, rejected, and approved.
              </p>
              <ul className="space-y-3 text-sm">
                <MindPoint icon={<IconBrain className="h-4 w-4" />} title="Memory" body="Voice notes, preferred hooks, and reject patterns go back to the Mind." />
                <MindPoint icon={<IconSparkles className="h-4 w-4" />} title="Follow-up" body="When a job is ready, the Mind writes the next move without another prompt." />
                <MindPoint icon={<IconYoutube className="h-4 w-4" />} title="Channel watch" body="Point at a public channel. New uploads can enqueue themselves." />
                <MindPoint icon={<IconMessageCircle className="h-4 w-4" />} title="Mind desk" body="Read the transcript in the app. Telegram is optional once you connect it in Minds." />
                <MindPoint icon={<IconShield className="h-4 w-4" />} title="Tenet" body="Never publish. The steward stays on the gate." />
              </ul>
              <Link href="/mind" className="btn btn-ghost btn-sm mt-2">
                Open Mind desk
                <IconArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
            <div className="glass p-5 sm:p-6 space-y-4">
              <p className="timecode text-[11px] text-[var(--fg-muted)]">Voice loop</p>
              <ol className="space-y-3">
                <LoopRow n="1" title="Job proposes" body="Default or learned style, grounded in the transcript window." />
                <LoopRow n="2" title="You decide" body="Approve, edit the hook, or reject with a note." />
                <LoopRow n="3" title="Mind records" body="The decision is sent on the same conversation as the proposal." />
                <LoopRow n="4" title="Next job adapts" body="No cold intros if you said so. Shorter captions if you rewrote them." />
              </ol>
              <p className="text-xs text-[var(--fg-muted)]">
                Voice Memory also scores how close recent packages are to your edits.
              </p>
              <Link href="/voice" className="text-xs underline underline-offset-4 text-[var(--fg-muted)] hover:text-[var(--fg)]">
                What the Mind remembers
              </Link>
            </div>
          </div>
        </section>

        <section className="border-t border-[var(--border)]">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 py-20 sm:py-24 text-center space-y-5">
            <p className="kicker">Start a job</p>
            <h2 className="display-title">
              Chop once. Review forever.
            </h2>
            <p className="text-sm text-[var(--fg-muted)] max-w-lg mx-auto">
              Open the desk, paste a captioned YouTube link, and keep the publish button in your own hands.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <Link href="/desk" className="btn btn-primary px-6">
                Launch desk
              </Link>
              <a href="https://hellominds.ai" target="_blank" rel="noreferrer" className="btn btn-ghost px-6">
                Minds platform
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-[var(--border)] py-8 text-xs text-[var(--fg-muted)]">
        <div className="site-wrap flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>
            <span className="font-medium text-[var(--fg)]">RepostAI</span>
            <span> · Creative Minds Jam #1 · MIT</span>
          </p>
          <p className="flex flex-wrap items-center gap-3 text-[11px]">
            <span>TikTok / Reels / X / LinkedIn draft</span>
            <a href="https://hellominds.ai" target="_blank" rel="noreferrer" className="hover:text-[var(--fg)]">
              Powered by Minds
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

function Step({ number, title, body }: { number: string; title: string; body: string }) {
  return (
    <article className="space-y-2">
      <p className="timecode text-tally">{number}</p>
      <h3 className="text-sm font-semibold text-[var(--fg)]">{title}</h3>
      <p className="text-xs text-[var(--fg-muted)] leading-relaxed">{body}</p>
    </article>
  );
}

function PlatformCard({
  icon,
  name,
  spec,
  note,
}: {
  icon: React.ReactNode;
  name: string;
  spec: string;
  note: string;
}) {
  return (
    <article className="panel p-5 space-y-3">
      <div className="flex items-center gap-2">
        <span aria-hidden="true">{icon}</span>
        <h3 className="text-sm font-semibold">{name}</h3>
      </div>
      <p className="timecode text-[11px] text-[var(--fg-muted)]">{spec}</p>
      <p className="text-xs text-[var(--fg-muted)] leading-relaxed">{note}</p>
    </article>
  );
}

function MindPoint({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 text-[var(--fg-muted)]" aria-hidden="true">
        {icon}
      </span>
      <span>
        <span className="font-medium text-[var(--fg)]">{title}. </span>
        <span className="text-[var(--fg-muted)]">{body}</span>
      </span>
    </li>
  );
}

function LoopRow({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <li className="flex gap-3 border-b border-[var(--border)] pb-3 last:border-0 last:pb-0">
      <span className="timecode text-[11px] text-tally w-4">{n}</span>
      <span>
        <span className="block text-xs font-semibold text-[var(--fg)]">{title}</span>
        <span className="block text-xs text-[var(--fg-muted)] leading-relaxed">{body}</span>
      </span>
    </li>
  );
}
