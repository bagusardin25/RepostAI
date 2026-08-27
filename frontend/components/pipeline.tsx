import { JOB_STAGES, JOB_STATUS_COPY } from "@frontend/lib/format";
import { IconCheck } from "@frontend/components/icons";

const ORDER = ["fetching_source", "analyzing", "clipping", "ready"] as const;

function stageIndex(status: string) {
  if (status === "queued") return -1;
  if (status === "failed") return ORDER.indexOf("clipping");
  const index = ORDER.indexOf(status as (typeof ORDER)[number]);
  return index;
}

export function Pipeline({ status }: { status: string }) {
  const current = stageIndex(status);
  const copy = JOB_STATUS_COPY[status];
  const failed = status === "failed";
  const isReady = status === "ready";

  return (
    <section className="space-y-3" aria-label="Job pipeline">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {JOB_STAGES.map((stage, index) => {
          const isDone = !failed && (isReady || current > index);
          const isActive = !failed && !isReady && current === index;
          const isFailHere = failed && index === current;

          return (
            <div
              key={stage.key}
              className={`p-3 rounded-lg border text-xs transition-all duration-300 ${
                isFailHere
                  ? "bg-[var(--bad-bg)] border-[var(--bad-border)] text-[var(--bad)]"
                  : isDone
                    ? "glass-chip text-[var(--fg)] hover:border-[var(--ok-border)]"
                    : isActive
                      ? "glass-strong text-[var(--fg-bright)] font-medium ring-1 ring-[var(--tally-border)] shadow-[0_0_16px_rgba(234,88,12,0.12)] scale-[1.02]"
                      : "border-[var(--border)] bg-transparent text-[var(--fg-subtle)]"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="timecode text-[10px] text-[var(--fg-subtle)]">0{index + 1}</span>
                {isDone && <IconCheck className="h-3.5 w-3.5 text-[var(--ok)] animate-pop" />}
                {isActive && <span className="radar-dot" />}
              </div>
              <p className="font-semibold">{stage.label}</p>
            </div>
          );
        })}
      </div>

      {copy && !isReady && (
        <p className="text-xs text-[var(--fg-muted)]" aria-live="polite">
          {copy.detail}
        </p>
      )}
    </section>
  );
}
