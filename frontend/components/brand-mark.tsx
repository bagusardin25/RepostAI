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
      className="flex min-h-11 items-center gap-2"
    >
      <span className="brand-dot" aria-hidden="true" />
      <span className="text-[0.9375rem] font-semibold tracking-tight text-[var(--fg-bright)]">RepostAI</span>
    </Link>
  );
}
