interface StatusPillProps {
  value: string;
  className?: string;
}

export function StatusPill({ value, className = "" }: StatusPillProps) {
  let styleClass = "text-zinc-400 bg-white/[0.04] border-white/[0.08]";
  let dot = null;

  switch (value) {
    case "queued":
      styleClass = "text-amber-400/90 bg-amber-400/10 border-amber-400/20";
      dot = <span className="h-1.5 w-1.5 rounded-full bg-amber-400/80" />;
      break;
    case "fetching_source":
    case "analyzing":
    case "clipping":
      styleClass = "text-zinc-200 bg-white/[0.06] border-white/[0.12]";
      dot = <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" />;
      break;
    case "ready":
      styleClass = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      dot = <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />;
      break;
    case "failed":
      styleClass = "text-rose-400 bg-rose-500/10 border-rose-500/20";
      dot = <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />;
      break;
    case "needs_review":
      styleClass = "text-orange-400 bg-orange-500/10 border-orange-500/25";
      dot = <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />;
      break;
    case "approved":
      styleClass = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      dot = <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />;
      break;
    case "rejected":
      styleClass = "text-rose-400/90 bg-rose-500/10 border-rose-500/20";
      break;
    case "edited":
      styleClass = "text-zinc-300 bg-white/[0.06] border-white/[0.1]";
      break;
    default:
      styleClass = "text-zinc-400 bg-white/[0.04] border-white/[0.08]";
  }

  const label = value.replaceAll("_", " ");

  return (
    <span
      className={`timecode inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] uppercase tracking-wider rounded border font-medium ${styleClass} ${className}`}
    >
      {dot}
      <span>{label}</span>
    </span>
  );
}
