import { IngestForm } from "@frontend/components/ingest-form";
import { JobList } from "@frontend/components/job-list";
import { WatchCard } from "@frontend/components/watch-card";

export default function HomePage() {
  return (
    <div className="space-y-10 max-w-4xl mx-auto">
      {/* Hero Header */}
      <section className="space-y-2 pt-2">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--fg-bright)]">
          One video in. Three vertical packages out.
        </h1>
        <p className="text-sm text-[var(--fg-muted)] leading-relaxed max-w-2xl">
          RepostAI extracts high-engagement moments, re-frames 9:16 cuts, and drafts TikTok, Reels, X, carousel, thread, and LinkedIn packages.
          You review every package. The Mind remembers your edits.
        </p>
      </section>

      {/* Main Ingest Desk */}
      <section>
        <IngestForm />
      </section>

      <WatchCard />

      {/* Desk Queue Feed */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--fg)]">Desk Queue</h2>
          <span className="timecode text-[11px] text-[var(--fg-muted)]">Live Realtime</span>
        </div>
        <JobList />
      </section>

      {/* Structured 3-Step Guide */}
      <section className="pt-8 border-t border-[var(--border)] grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-[var(--fg-muted)]">
        <div className="space-y-1">
          <p className="font-semibold text-[var(--fg)] timecode">01 / Ingest</p>
          <p className="leading-relaxed">
            Paste a YouTube link or drop an MP4. Audio transcript is extracted automatically.
          </p>
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-[var(--fg)] timecode">02 / Mind & Cut</p>
          <p className="leading-relaxed">
            Minds agent identifies 3 story arcs. FFmpeg re-frames clean 9:16 vertical clips.
          </p>
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-[var(--fg)] timecode">03 / Human Review</p>
          <p className="leading-relaxed">
            Review every package. Approvals and caption edits are written back into the Mind.
          </p>
        </div>
      </section>
    </div>
  );
}
