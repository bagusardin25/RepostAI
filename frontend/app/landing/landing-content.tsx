"use client";

import Link from "next/link";
import { BrandMark } from "@frontend/components/brand-mark";
import {
  IconArrowRight,
  IconBrain,
  IconInstagram,
  IconMessageCircle,
  IconShield,
  IconSparkles,
  IconTikTok,
  IconX,
  IconYoutube,
} from "@frontend/components/icons";
import { Showcase } from "@frontend/components/showcase";
import { ThemeToggle } from "@frontend/components/theme-provider";

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
          <nav aria-label="Landing" className="hidden md:flex min-w-0 flex-1 items-center justify-center gap-1">
            <a href="#how" className="chip">
              How it works
            </a>
            <a href="#packages" className="chip">
              What you get
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
        <section className="hero overflow-x-clip" aria-labelledby="hero-title">
          <div className="hero-glow" aria-hidden="true" />
          <div className="site-wrap relative flex flex-col gap-12 pt-14 pb-16 sm:pt-20 lg:min-h-[calc(100svh-var(--header-h))] lg:flex-row lg:items-center lg:py-20">
            <div className="hero-fade" aria-hidden="true" />
            <div className="relative max-w-[35rem] space-y-7 animate-fade-in-up">
              <p className="kicker kicker-tally">One long video. A week of posts.</p>
              <h1 id="hero-title" className="display-title hero-title">
                <span>One source.</span>
                <span>Three vertical cuts.</span>
                <span>Four text drafts.</span>
              </h1>
              <p className="page-lede text-base sm:text-[1.0625rem] lg:max-w-[30rem]">
                Paste a YouTube link. Review 3 vertical clips and 4 text drafts in minutes, not an afternoon of
                recutting. Nothing posts until you say so.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/desk" className="btn btn-primary btn-lg">
                  Start with a video
                  <IconArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <a
                  href="https://github.com/bagusardin25/RepostAI"
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-ghost btn-lg"
                >
                  View source
                </a>
              </div>
              <dl className="grid grid-cols-3 gap-4 pt-2 max-w-md">
                <Stat label="Recut time" value="Minutes" />
                <Stat label="You get" value="3 + 4" />
                <Stat label="Auto-post" value="Never" />
              </dl>
            </div>
            <div className="showcase-slot">
              <Showcase />
            </div>
          </div>
        </section>

        <section id="how" className="border-t border-[var(--border)]">
          <div className="site-wrap py-16 sm:py-24 space-y-10">
            <div className="space-y-3 max-w-2xl">
              <p className="kicker">How it works</p>
              <h2 className="page-title">We cut. You decide what ships.</h2>
              <p className="page-lede">
                Captions become the transcript. If a video has no captions, we stop. Speech is never invented.
              </p>
            </div>
            <ol className="grid gap-4 sm:grid-cols-3">
              <Step
                number="01"
                title="Paste a link or drop a file"
                body="A public YouTube link with captions, an upload with its captions link, or the demo sample."
              />
              <Step
                number="02"
                title="Three windows, one per platform"
                body="9:16 clips for TikTok, Reels and X, plus a script, carousel, thread and LinkedIn post."
              />
              <Step number="03" title="Approve, rewrite or skip" body="Copy the pack and download each MP4. Nothing publishes." />
            </ol>
          </div>
        </section>

        <section id="packages" className="border-t border-[var(--border)]">
          <div className="site-wrap py-16 sm:py-24">
            <div className="max-w-2xl space-y-3 mb-10">
              <p className="kicker">What you get</p>
              <h2 className="page-title">Clips to post and copy to paste</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <PlatformCard
                icon={<IconTikTok className="h-5 w-5" />}
                name="TikTok"
                spec="9:16 · up to 60s"
                note="Vertical cut plus a spoken script."
              />
              <PlatformCard
                icon={<IconInstagram className="h-5 w-5" />}
                name="Instagram Reels"
                spec="9:16 · up to 90s"
                note="Reels cut plus carousel slides."
              />
              <PlatformCard
                icon={<IconX className="h-5 w-5" />}
                name="X"
                spec="9:16 · up to 140s"
                note="Short takeaway clip plus a thread."
              />
            </div>
            <div className="mt-4 grid gap-3 grid-cols-2 lg:grid-cols-4">
              <DraftChip name="TikTok script" note="Line-by-line spoken draft" />
              <DraftChip name="IG carousel" note="Slide titles and body" />
              <DraftChip name="X thread" note="Post-sized beats" />
              <DraftChip name="LinkedIn" note="Text draft only, no video" />
            </div>
            <p className="mt-6 text-xs text-[var(--fg-muted)]">Copy and download locally. RepostAI never posts.</p>
          </div>
        </section>

        <section id="mind" className="border-t border-[var(--border)]">
          <div className="site-wrap py-16 sm:py-24 grid gap-10 lg:grid-cols-2">
            <div className="space-y-4">
              <p className="kicker">It learns what you keep</p>
              <h2 className="page-title">The next pack follows your taste</h2>
              <p className="page-lede">
                Approve, rewrite or skip. Those choices shape the next hooks and captions. You still review every pack.
              </p>
              <ul className="space-y-3 text-sm pt-1">
                <MindPoint icon={<IconBrain className="h-4 w-4" />} title="Memory" body="Voice notes, preferred hooks and reject patterns go back to the Mind." />
                <MindPoint icon={<IconSparkles className="h-4 w-4" />} title="Follow-up" body="When a pack is ready, the Mind suggests the next move without another prompt." />
                <MindPoint icon={<IconYoutube className="h-4 w-4" />} title="Channel watch" body="Point at a public channel. New uploads can start a pack by themselves." />
                <MindPoint icon={<IconMessageCircle className="h-4 w-4" />} title="Optional chat" body="Talk to the Mind in the app. Telegram works too, once connected." />
                <MindPoint icon={<IconShield className="h-4 w-4" />} title="Tenet" body="Never publish. You stay on the gate." />
              </ul>
              <Link href="/mind" className="btn btn-ghost btn-sm mt-2">
                See the Mind
                <IconArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
            <div className="glass p-5 sm:p-7 space-y-5 self-start">
              <p className="kicker">Voice loop</p>
              <ol className="space-y-4">
                <LoopRow n="1" title="Pack proposes" body="Default or learned style, grounded in the transcript window." />
                <LoopRow n="2" title="You decide" body="Approve, edit the hook, or reject with a note." />
                <LoopRow n="3" title="Mind records" body="The decision goes back on the same conversation as the proposal." />
                <LoopRow n="4" title="Next pack adapts" body="No cold intros if you said so. Shorter captions if you rewrote them." />
              </ol>
              <Link
                href="/voice"
                className="inline-flex text-xs underline underline-offset-4 text-[var(--fg-muted)] hover:text-[var(--fg)]"
              >
                See what the Mind remembers
              </Link>
            </div>
          </div>
        </section>

        <section className="border-t border-[var(--border)]">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 py-20 sm:py-28 text-center space-y-6">
            <h2 className="display-title">Chop once. Review forever.</h2>
            <p className="page-lede mx-auto">
              Paste a captioned YouTube link, review the pack, and keep the publish button in your own hands.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/desk" className="btn btn-primary btn-lg">
                Start with a video
                <IconArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <a href="https://hellominds.ai" target="_blank" rel="noreferrer" className="btn btn-ghost btn-lg">
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
          <p className="flex flex-wrap items-center justify-center gap-3 text-[11px]">
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-[var(--fg-subtle)]">{label}</dt>
      <dd className="mt-1 text-base sm:text-lg font-semibold leading-tight text-[var(--fg-bright)]">{value}</dd>
    </div>
  );
}

function Step({ number, title, body }: { number: string; title: string; body: string }) {
  return (
    <li className="glass p-6 space-y-2.5">
      <p className="timecode text-xs text-tally">{number}</p>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="text-sm text-[var(--fg-muted)] leading-relaxed">{body}</p>
    </li>
  );
}

function DraftChip({ name, note }: { name: string; note: string }) {
  return (
    <article className="cell p-3.5 space-y-1">
      <h3 className="text-xs font-semibold text-[var(--fg-bright)]">{name}</h3>
      <p className="text-[11px] text-[var(--fg-muted)] leading-relaxed">{note}</p>
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
    <article className="panel-card p-5 space-y-3">
      <div className="flex items-center gap-2.5">
        <span
          className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--tally-bg)] text-[var(--tally-fg)]"
          aria-hidden="true"
        >
          {icon}
        </span>
        <h3 className="text-sm font-semibold">{name}</h3>
      </div>
      <p className="timecode text-[11px] text-[var(--fg-subtle)]">{spec}</p>
      <p className="text-sm text-[var(--fg-muted)] leading-relaxed">{note}</p>
    </article>
  );
}

function MindPoint({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 text-[var(--tally-fg)]" aria-hidden="true">
        {icon}
      </span>
      <span>
        <span className="font-medium text-[var(--fg-bright)]">{title}. </span>
        <span className="text-[var(--fg-muted)]">{body}</span>
      </span>
    </li>
  );
}

function LoopRow({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <li className="flex gap-3 border-b border-[var(--border)] pb-4 last:border-0 last:pb-0">
      <span className="timecode grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--tally-bg)] text-[11px] text-tally">
        {n}
      </span>
      <span>
        <span className="block text-sm font-semibold text-[var(--fg-bright)]">{title}</span>
        <span className="block text-xs text-[var(--fg-muted)] leading-relaxed">{body}</span>
      </span>
    </li>
  );
}
