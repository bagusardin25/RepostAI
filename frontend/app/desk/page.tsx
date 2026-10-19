import type { Metadata } from "next";
import { IngestForm } from "@frontend/components/ingest-form";
import { JobList } from "@frontend/components/job-list";
import { WatchCard } from "@frontend/components/watch-card";

export const metadata: Metadata = {
  title: "Desk",
  description: "Turn one video into 3 vertical clips and 4 text drafts. Review before you post.",
};

export default function DeskPage() {
  return (
    <div className="space-y-12 max-w-4xl mx-auto min-w-0">
      <section aria-label="Start a content pack" className="pt-2 sm:pt-6">
        <IngestForm />
      </section>

      <div className="page-dim space-y-12">
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div className="space-y-1">
              <p className="kicker">Desk</p>
              <h2 className="section-title text-lg">Your projects</h2>
            </div>
          </div>
          <JobList />
        </section>

        <WatchCard />

        <section className="pt-8 border-t border-[var(--border)] grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm text-[var(--fg-muted)]">
          <div className="space-y-1.5">
            <p className="timecode text-xs font-medium text-tally">01 · Start</p>
            <p className="leading-relaxed">Paste a YouTube link with captions, drop a video, or try the sample.</p>
          </div>
          <div className="space-y-1.5">
            <p className="timecode text-xs font-medium text-tally">02 · Cut</p>
            <p className="leading-relaxed">Three 9:16 windows, one per platform, plus four text drafts.</p>
          </div>
          <div className="space-y-1.5">
            <p className="timecode text-xs font-medium text-tally">03 · Review</p>
            <p className="leading-relaxed">Approve, rewrite or skip. Then copy and download. Nothing publishes.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
