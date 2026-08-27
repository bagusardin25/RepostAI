import type { Metadata } from "next";
import { IngestForm } from "@frontend/components/ingest-form";
import { JobList } from "@frontend/components/job-list";
import { PageHeader } from "@frontend/components/page-header";
import { WatchCard } from "@frontend/components/watch-card";

export const metadata: Metadata = {
  title: "Desk",
  description: "Turn one video into 3 vertical clips and 4 text drafts. Review before you post.",
};

export default function DeskPage() {
  return (
    <div className="space-y-10 max-w-4xl mx-auto min-w-0">
      <PageHeader
        kicker="Desk"
        title={
          <>
            Turn one video into{" "}
            <span className="block sm:inline">ready-to-use content.</span>
          </>
        }
        lede="Get 3 vertical cuts and 4 text drafts. Review everything before you post."
      />

      <section>
        <IngestForm />
      </section>

      <section className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Your projects</h2>
        </div>
        <JobList />
      </section>

      <WatchCard />

      <section className="pt-8 border-t border-[var(--border)] grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-[var(--fg-muted)]">
        <div className="space-y-1">
          <p className="font-semibold text-tally timecode">01 / Start</p>
          <p className="leading-relaxed">
            Paste a YouTube link with captions, or try the demo sample.
          </p>
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-tally timecode">02 / Cut</p>
          <p className="leading-relaxed">
            Three 9:16 windows, one per platform, plus four text drafts.
          </p>
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-tally timecode">03 / Review</p>
          <p className="leading-relaxed">
            Approve, rewrite, or skip. Then copy and download. Nothing publishes.
          </p>
        </div>
      </section>
    </div>
  );
}
