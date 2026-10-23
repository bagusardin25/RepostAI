import type { JobSummary } from "@frontend/lib/api";
import { analyzerLabel } from "@frontend/lib/format";

const EXPLANATION: Record<NonNullable<JobSummary["analyzer"]>, string> = {
  minds:
    "The Mind read the transcript, picked one moment for each platform and wrote its hook and caption, following any style you have saved.",
  minds_saved:
    "The Mind already answered this demo sample with the same saved style, so that answer was reused instead of asking again.",
  fallback:
    "The Mind did not return usable clips for this video, so the clips come from fixed parts of it: the opening for TikTok, the middle for Instagram and the end for X. Each hook and caption is a line spoken in that clip.",
};

const CHOOSING = new Set(["queued", "fetching_source", "analyzing"]);

/** Says whether the Mind or alternative processing picked this pack's moments. */
export function SelectionMethod({ analyzer, status }: { analyzer: JobSummary["analyzer"]; status: string }) {
  const [title, detail] = analyzer
    ? [analyzerLabel(analyzer), EXPLANATION[analyzer]]
    : CHOOSING.has(status)
      ? ["Still choosing", "Once the moments are chosen, this says whether the Mind or alternative processing picked them."]
      : status === "failed"
        ? ["Not chosen", "This pack stopped before its moments were chosen."]
        : ["Not recorded", "This pack does not record how its moments were picked."];

  return (
    <section className="cell p-4 space-y-1.5">
      <p className="timecode text-[11px] text-[var(--fg-muted)]">How the moments were picked</p>
      <h2 className="section-title">{title}</h2>
      <p className="text-xs text-[var(--fg-muted)] leading-relaxed max-w-2xl">{detail}</p>
    </section>
  );
}
