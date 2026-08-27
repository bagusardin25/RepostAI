import Link from "next/link";

export function BrandMark({
  href = "/",
  current = false,
}: {
  href?: string;
  current?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className="flex items-center gap-2"
    >
      <span className="brand-dot" aria-hidden="true" />
      <span className="text-sm font-semibold tracking-tight text-[var(--fg)]">
        Repost<span className="text-[var(--fg-muted)]">AI</span>
      </span>
    </Link>
  );
}
