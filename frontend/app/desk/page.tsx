import type { Metadata } from "next";
import { IngestForm } from "@frontend/components/ingest-form";
import { JobList } from "@frontend/components/job-list";
import { PageHeader } from "@frontend/components/page-header";
import { WatchCard } from "@frontend/components/watch-card";

export const metadata: Metadata = {
  title: "Desk",
  description: "One video in. Three vertical packages out. Review before anything ships.",
};

export default function DeskPage() {
  return (
    <div className="space-y-10 max-w-4xl mx-auto min-w-0">
      <PageHeader
        kicker="Desk"
        title={
          <>
            One video in.{" "}
            <span className="block sm:inline">Three vertical packages out.</span>
          </>
        }
        lede="RepostAI extracts high-engagement moments, re-frames 9:16 cuts, and drafts TikTok, Reels, X, carousel, thread, and LinkedIn packages. You review every package. The Mind remembers your edits."
      />

      <section>
        <IngestForm />
      </section>

      <WatchCard />

      <section className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Desk Queue</h2>
          <span className="timecode text-[11px] text-[var(--fg-muted)]">Live Realtime</span>
        </div>
        <JobList />
      </section>

      <section className="pt-8 border-t border-[var(--border)] grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-[var(--fg-muted)]">
        <div className="space-y-1">
          <p className="font-semibold text-tally timecode">01 / Ingest</p>
          <p className="leading-relaxed">
            Paste a public YouTube link with captions, or run a demo sample.
          </p>
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-tally timecode">02 / Mind & Cut</p>
          <p className="leading-relaxed">
            Minds agent identifies 3 story arcs. FFmpeg re-frames clean 9:16 vertical clips.
          </p>
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-tally timecode">03 / Human Review</p>
          <p className="leading-relaxed">
            Review every package. Approvals and caption edits are written back into the Mind.
          </p>
        </div>
      </section>
    </div>
  );
}
