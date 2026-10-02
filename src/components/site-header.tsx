"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { VibeButton, type VibeConfig } from "@/components/vibe-button";
import { cn } from "@/lib/utils";

type NavItem = { label: string; href: string };

/**
 * Notion's top bar: flush with the page until you scroll, then a single hairline
 * separates it. No shadow, no blur-heavy glass.
 */
export function SiteHeader({
  brand,
  nav,
  vibe,
}: {
  brand: string;
  nav: NavItem[];
  vibe: VibeConfig;
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 bg-background/90 backdrop-blur-[6px] transition-colors",
        scrolled ? "border-b border-rule" : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex h-14 w-full max-w-[1040px] items-center justify-between gap-6 px-6">
        <Link
          href="/"
          className="truncate font-heading text-[19px] font-normal tracking-[-0.01em] text-foreground"
        >
          {brand}
        </Link>

        <nav className="flex items-center gap-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="hidden rounded-md px-2 py-1 text-[16px] text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground sm:block"
            >
              {item.label}
            </Link>
          ))}
          <div className="ml-1 flex items-center gap-1.5">
            {/*
              On a wide screen this leaves the flow and pins itself to the very
              top-right corner of the viewport, clear of the nav. Narrower than
              that there is no corner to spare, so it stays in the header row as
              a compact waveform.
            */}
            <div className="lg:fixed lg:top-3 lg:right-5 lg:z-60">
              <VibeButton vibe={vibe} />
            </div>
            <ThemeToggle />
          </div>
        </nav>
      </div>
    </header>
  );
}
