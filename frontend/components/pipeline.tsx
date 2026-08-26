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
              className={`p-3 rounded-lg border text-xs transition-colors ${
                isFailHere
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                  : isDone
                    ? "bg-white/[0.03] border-white/[0.1] text-zinc-300"
                    : isActive
                      ? "bg-white/[0.06] border-white/[0.2] text-white font-medium"
                      : "bg-transparent border-white/[0.04] text-zinc-600"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="timecode text-[10px] text-zinc-500">0{index + 1}</span>
                {isDone && <IconCheck className="h-3 w-3 text-emerald-400" />}
                {isActive && <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" />}
              </div>
              <p className="font-semibold">{stage.label}</p>
            </div>
          );
        })}
      </div>

      {copy && !isReady && (
        <p className="text-xs text-zinc-400" aria-live="polite">
          {copy.detail}
        </p>
      )}
    </section>
  );
}
