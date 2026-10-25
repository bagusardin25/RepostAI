"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ToastProvider } from "@frontend/components/toast";
import { ThemeProvider, ThemeToggle } from "@frontend/components/theme-provider";
import { BrandMark } from "@frontend/components/brand-mark";
import { SystemStatusButton } from "@frontend/components/system-status";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ShellContent>{children}</ShellContent>
      </ToastProvider>
    </ThemeProvider>
  );
}

function ShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === "/" || pathname.startsWith("/landing");

  if (isLanding) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col text-[var(--fg)]">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--fg)] focus:text-[var(--bg)] focus:rounded-md text-xs font-semibold"
        href="#content"
      >
        Skip to content
      </a>

      <header className="site-header sticky top-0 z-40 w-full">
        <div className="site-wrap flex min-h-[var(--header-h)] items-center gap-2 sm:gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-6">
            <BrandMark
              href="/"
              current={pathname === "/"}
            />

            <nav aria-label="Primary" className="flex min-w-0 items-center gap-1 overflow-x-auto">
              <NavLink href="/desk" active={pathname === "/desk" || pathname.startsWith("/jobs")}>
                Desk
              </NavLink>
              <NavLink href="/voice" active={pathname.startsWith("/voice")}>
                Style
              </NavLink>
              <NavLink href="/mind" active={pathname.startsWith("/mind")}>
                Mind
              </NavLink>
            </nav>
          </div>

          {/* Right Status & Theme Toggle */}
          <div className="flex shrink-0 items-center gap-2.5">
            <ThemeToggle />
            <SystemStatusButton />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main id="content" className="site-wrap flex-1 py-8 sm:py-12">
        {children}
      </main>

      <footer className="border-t border-[var(--border)] py-6 mt-auto text-[0.8125rem] text-[var(--fg-subtle)]">
        <div className="site-wrap flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-[var(--fg-muted)] hover:text-[var(--fg-bright)] transition-colors">
              RepostAI
            </Link>
            <span aria-hidden="true">·</span>
            <span>Creative Minds Jam #1</span>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://hellominds.ai"
              target="_blank"
              rel="noreferrer"
              className="text-[var(--fg-muted)] hover:text-[var(--fg-bright)] transition-colors"
            >
              Built on Minds
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`chip transition-all duration-200 ${active ? "is-active font-medium scale-[1.02]" : "hover:text-[var(--fg)]"}`}
    >
      {children}
    </Link>
  );
}
