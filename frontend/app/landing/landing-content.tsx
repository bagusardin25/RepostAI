"use client";

import Link from "next/link";
import { BrandMark } from "@frontend/components/brand-mark";
import { IconArrowRight } from "@frontend/components/icons";
import { Showcase } from "@frontend/components/showcase";
import { ThemeToggle } from "@frontend/components/theme-provider";

const REPO_URL = "https://github.com/bagusardin25/RepostAI";

// Real output from the bundled 1:36 sample, so the table shows what a pack holds.
const CLIP_ROWS = [
  {
    name: "TikTok",
    format: "9:16 · up to 60s",
    range: "0:07–0:25",
    sample: "“Caption for TikTok, then a different hook for Reels, then a thread for X.”",
  },
  {
    name: "Instagram Reels",
    format: "9:16 · up to 90s",
    range: "0:36–0:58",
    sample: "“First, find the sentence that would still make sense if someone muted the video.”",
  },
  {
    name: "X",
    format: "9:16 · up to 140s",
    range: "1:09–1:25",
    sample: "“If I approve a clip, I want the next one to remember that I hate cold intros.”",
  },
];

const DRAFT_ROWS = [
  { name: "TikTok script", format: "Spoken lines and on-screen text", sample: "6 lines, ending on “Follow for the next cut.”" },
  {
    name: "Instagram carousel",
    format: "Slides with a title and body",
    sample: "5 slides: The problem, Why copy-paste fails, The rule, What to do, Save this",
  },
  { name: "X thread", format: "Posts under 280 characters", sample: "5 posts, opening on the four-hours line" },
  { name: "LinkedIn post", format: "Text only, no video", sample: "381 characters" },
];

const LIMITS = [
  {
    title: "The video needs captions",
    body: "Every cut is timed from the YouTube captions. If a video has none, the pack stops instead of guessing what was said.",
  },
  {
    title: "Uploads need the link too",
    body: "You can upload an MP4, WebM or MOV up to 500 MB. Add the same video's YouTube link so its captions can be read.",
  },
  {
    title: "One clip per platform",
    body: "Each pack has one clip for TikTok, one for Reels and one for X. Reject any of them and keep the rest.",
  },
  {
    title: "It never posts for you",
    body: "You download the MP4s and copy the text. Nothing is sent to TikTok, Instagram, X or LinkedIn.",
  },
];

export function LandingContent() {
  return (
    <div className="relative min-h-screen text-[var(--fg)]">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--fg)] focus:text-[var(--bg)] focus:rounded-md text-sm font-semibold"
        href="#content"
      >
        Skip to content
      </a>

      <header className="site-header sticky top-0 z-50">
        <div className="site-wrap flex min-h-[var(--header-h)] items-center justify-between gap-2 sm:gap-3">
          <BrandMark href="/" current />
          <nav aria-label="Landing" className="hidden md:flex min-w-0 flex-1 items-center justify-center gap-2">
            <a href="#pack" className="chip text-sm">
              The pack
            </a>
            <a href="#edits" className="chip text-sm">
              Your edits
            </a>
            <a href="#limits" className="chip text-sm">
              Before you start
            </a>
          </nav>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <Link href="/desk" className="btn btn-primary shrink-0">
              Open the desk
            </Link>
          </div>
        </div>
      </header>

      <main id="content" className="relative z-10">
        <section aria-labelledby="hero-title" className="site-wrap pt-10 pb-20 sm:pt-16 lg:pt-[5.5rem] lg:pb-[6.5rem]">
          <div className="grid gap-5 sm:gap-6 lg:grid-cols-12 lg:gap-x-8 lg:items-end">
            <h1 id="hero-title" className="hero-title lg:col-span-7 animate-fade-in-up">
              Cut a YouTube video into clips for TikTok, Reels and X.
            </h1>
            <div className="space-y-6 lg:col-span-5 lg:pb-1.5">
              <p className="max-w-[30rem] text-base sm:text-lg leading-relaxed text-[var(--fg-soft)]">
                RepostAI reads the captions, cuts three moments to 9:16 and drafts the posts that go with them. You
                review everything and post it yourself.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/desk" className="btn btn-primary btn-lg">
                  Start with a link
                  <IconArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <a href={REPO_URL} target="_blank" rel="noreferrer" className="btn btn-ghost btn-lg">
                  View on GitHub
                </a>
              </div>
              <p className="text-sm text-[var(--fg-subtle)]">
                Open source, MIT. Works with public YouTube videos that have captions.
              </p>
            </div>
          </div>
          <div className="mt-10 sm:mt-12 lg:mt-16">
            <Showcase />
          </div>
        </section>

        <section id="pack" aria-labelledby="pack-title" className="border-t border-[var(--border)]">
          <div className="site-wrap grid gap-10 py-20 lg:grid-cols-12 lg:gap-x-8 lg:py-28">
            <div className="space-y-4 lg:col-span-4">
              <h2 id="pack-title" className="section-heading">
                What&apos;s in a pack
              </h2>
              <p className="max-w-[22rem] leading-relaxed text-[var(--fg-muted)]">
                This is the real output from the 1:36 sample. Each clip comes with an on-screen hook, a caption and
                hashtags. You can edit all of it before you copy it.
              </p>
            </div>
            <div className="text-[0.9375rem] lg:col-span-8">
              <div
                className="hidden md:grid grid-cols-[11rem_13rem_minmax(0,1fr)] gap-6 border-b border-[var(--border-strong)] pb-3 text-[0.8125rem] font-medium text-[var(--fg-subtle)]"
                aria-hidden="true"
              >
                <span>Output</span>
                <span>Format</span>
                <span>From the sample</span>
              </div>
              <PackGroup title="Clips">
                {CLIP_ROWS.map((row) => (
                  <PackRow
                    key={row.name}
                    name={row.name}
                    format={<span className="timecode text-[0.8125rem]">{row.format}</span>}
                    sample={
                      <>
                        <span className="timecode mr-2 text-[0.8125rem] text-[var(--fg-subtle)]">{row.range}</span>
                        {row.sample}
                      </>
                    }
                  />
                ))}
              </PackGroup>
              <PackGroup title="Text drafts">
                {DRAFT_ROWS.map((row) => (
                  <PackRow key={row.name} name={row.name} format={row.format} sample={row.sample} />
                ))}
              </PackGroup>
            </div>
          </div>
        </section>

        <section id="edits" aria-labelledby="edits-title" className="border-t border-[var(--border)] bg-[var(--bg-sunken)]">
          <div className="site-wrap grid gap-12 py-20 lg:grid-cols-12 lg:gap-x-8 lg:items-center lg:py-28">
            <div className="space-y-5 lg:col-span-5">
              <h2 id="edits-title" className="section-heading">
                Your edits shape the next pack
              </h2>
              <p className="leading-relaxed text-[var(--fg-muted)]">
                Approve a clip, rewrite its hook, or reject it with a note. The Mind keeps those decisions and starts the
                next pack from them. The{" "}
                <Link href="/voice" className="underline underline-offset-4 hover:text-[var(--fg-bright)]">
                  Style page
                </Link>{" "}
                shows what it has kept.
              </p>
              <dl className="grid gap-4 pt-3 text-[0.9375rem] leading-relaxed">
                <div className="border-t border-[var(--border-strong)] pt-4">
                  <dt className="font-semibold text-[var(--fg-bright)]">Channel watch</dt>
                  <dd className="mt-1 text-[var(--fg-muted)]">
                    Point it at your channel. Each new upload starts a pack for you to review.
                  </dd>
                </div>
                <div className="border-t border-[var(--border-strong)] pt-4">
                  <dt className="font-semibold text-[var(--fg-bright)]">Chat</dt>
                  <dd className="mt-1 text-[var(--fg-muted)]">
                    Ask the Mind about a pack in the app, or on Telegram once you connect it.
                  </dd>
                </div>
              </dl>
            </div>
            <ReviewExample />
          </div>
        </section>

        <section id="limits" aria-labelledby="limits-title" className="border-t border-[var(--border)]">
          <div className="site-wrap grid gap-10 py-20 lg:grid-cols-12 lg:gap-x-8 lg:py-28">
            <h2 id="limits-title" className="section-heading lg:col-span-4">
              Before you start
            </h2>
            <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:col-span-8">
              {LIMITS.map((item) => (
                <div key={item.title} className="border-t border-[var(--border-strong)] pt-[1.125rem]">
                  <h3 className="text-base font-semibold tracking-normal">{item.title}</h3>
                  <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--fg-muted)]">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="cta-title" className="border-t border-[var(--border)]">
          <div className="site-wrap flex flex-col items-start gap-6 py-24 lg:py-[7.5rem]">
            <h2 id="cta-title" className="display-title">
              Try it on your latest upload.
            </h2>
            <p className="text-base sm:text-lg leading-relaxed text-[var(--fg-soft)]">
              No video handy? The desk has a 1:36 sample you can run first.
            </p>
            <Link href="/desk" className="btn btn-primary btn-lg mt-2">
              Start with a link
              <IconArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-[var(--border)] py-7 text-[0.8125rem] text-[var(--fg-subtle)]">
        <div className="site-wrap flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p>RepostAI · MIT licence · Made for Creative Minds Jam #1</p>
          <p className="flex gap-5">
            <a href="https://hellominds.ai" target="_blank" rel="noreferrer" className="text-[var(--fg-muted)] hover:text-[var(--fg-bright)]">
              Built on Minds
            </a>
            <a href={REPO_URL} target="_blank" rel="noreferrer" className="text-[var(--fg-muted)] hover:text-[var(--fg-bright)]">
              GitHub
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

function PackGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="pt-7 first:pt-0 md:first:pt-7 [&+&]:pt-9">
      <h3 className="pb-2.5 text-[0.8125rem] font-semibold tracking-normal text-[var(--fg-muted)]">{title}</h3>
      <ul>{children}</ul>
    </div>
  );
}

function PackRow({ name, format, sample }: { name: string; format: React.ReactNode; sample: React.ReactNode }) {
  return (
    <li className="grid gap-1 border-t border-[var(--border)] py-4 last:border-b md:grid-cols-[11rem_13rem_minmax(0,1fr)] md:gap-6">
      <span className="font-semibold text-[var(--fg-bright)]">{name}</span>
      <span className="text-[var(--fg-muted)]">{format}</span>
      <span className="text-[var(--fg-soft)]">{sample}</span>
    </li>
  );
}

/** A static picture of one review: what the Mind sees when you edit a clip. */
function ReviewExample() {
  return (
    <div className="space-y-3 lg:col-span-6 lg:col-start-7" role="img" aria-label="Example review: a Reels hook rewritten, a note for next time, and the next pack opening on the point">
      <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 sm:p-[1.375rem] shadow-[0_1px_2px_rgba(23,20,15,0.05)]">
        <p className="flex items-baseline justify-between gap-3 text-sm">
          <span className="font-semibold text-[var(--fg-bright)]">Reels clip</span>
          <span className="timecode text-xs text-[var(--fg-subtle)]">0:36–0:58 · 22s</span>
        </p>
        <div className="space-y-1.5">
          <p className="text-[0.8125rem] font-semibold text-[var(--fg)]">Hook</p>
          <p className="text-sm text-[var(--fg-subtle)] line-through">
            So here is the rule I use now: one source video, three jobs.
          </p>
          <p className="flex min-h-11 items-center rounded-lg border-[1.5px] border-[var(--fg-bright)] px-3 text-[0.9375rem] text-[var(--fg-bright)]">
            Would this sentence still make sense on mute?
          </p>
        </div>
        <div className="space-y-1.5">
          <p className="text-[0.8125rem] font-semibold text-[var(--fg)]">Note for next time</p>
          <p className="flex min-h-11 items-center rounded-lg border border-[var(--field-border)] px-3 text-[0.9375rem] text-[var(--fg-bright)]">
            No cold intros. Open on the point.
          </p>
        </div>
        <div className="flex gap-2.5" aria-hidden="true">
          <span className="btn btn-primary min-h-11 pointer-events-none">Approve with edits</span>
          <span className="btn btn-ghost min-h-11 pointer-events-none">Reject</span>
        </div>
      </div>
      <p className="flex items-baseline gap-3 rounded-[0.625rem] border border-dashed border-[var(--border-strong)] px-[1.125rem] py-3.5 text-sm text-[var(--fg-soft)]">
        <span className="whitespace-nowrap font-semibold text-[var(--fg-bright)]">Next pack</span>
        <span>Hooks open on the point, not the intro.</span>
      </p>
    </div>
  );
}
