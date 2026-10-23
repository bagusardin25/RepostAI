/** Marks a pack started from a pull request preview, which the live app keeps out of its desk and style. */
export function TestPackBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`pill border border-dashed border-[var(--border-strong)] ${className}`}
      title="Made from a pull request preview. Kept out of the live app's desk and saved style."
    >
      Preview test pack
    </span>
  );
}
