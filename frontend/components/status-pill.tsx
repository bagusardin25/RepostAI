import { statusLabel } from "@frontend/lib/format";

interface StatusPillProps {
  value: string;
  className?: string;
}

export function StatusPill({ value, className = "" }: StatusPillProps) {
  let tone = "pill";
  let dot: React.ReactNode = null;

  switch (value) {
    case "queued":
      tone = "pill pill-warn";
      dot = <span className="h-1.5 w-1.5 rounded-full bg-[var(--warn)]" />;
      break;
    case "fetching_source":
    case "analyzing":
    case "clipping":
      tone = "pill pill-live";
      dot = <span className="radar-dot" />;
      break;
    case "ready":
    case "approved":
    case "edited":
      tone = "pill pill-ok";
      dot = <span className="h-1.5 w-1.5 rounded-full bg-[var(--ok)]" />;
      break;
    case "failed":
    case "rejected":
      tone = "pill pill-bad";
      if (value === "failed") {
        dot = <span className="h-1.5 w-1.5 rounded-full bg-[var(--bad)]" />;
      }
      break;
    case "needs_review":
      tone = "pill pill-tally";
      dot = <span className="h-1.5 w-1.5 rounded-full bg-[var(--tally)]" />;
      break;
    default:
      tone = "pill";
  }

  const label = statusLabel(value);

  return (
    <span className={`${tone} ${className}`.trim()}>
      {dot}
      <span>{label}</span>
    </span>
  );
}
