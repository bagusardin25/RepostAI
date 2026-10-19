import type { Metadata } from "next";
import { IngestForm } from "@frontend/components/ingest-form";
import { JobList } from "@frontend/components/job-list";
import { WatchCard } from "@frontend/components/watch-card";

export const metadata: Metadata = {
  title: "Desk",
  description: "Paste a YouTube link or drop a video to start a pack.",
};

export default function DeskPage() {
  return (
    <div className="mx-auto min-w-0 max-w-[55rem] space-y-10 sm:space-y-14">
      <section aria-label="Start a pack" className="sm:pt-4">
        <IngestForm />
      </section>

      <div className="page-dim space-y-4">
        <section aria-labelledby="projects-title" className="space-y-4">
          <JobList titleId="projects-title" />
        </section>

        <WatchCard />
      </div>
    </div>
  );
}
