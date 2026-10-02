"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { NewsItem } from "@/lib/content";

/**
 * A single line of news under the hero, one item at a time.
 *
 * Deliberately quiet: a slow fade and a few pixels of travel, no marquee, no
 * sliding banner. It rotates only when there is more than one item, and it
 * stops while the pointer or keyboard focus is on it, so a line can always be
 * finished — or its link clicked — without it moving away mid-read.
 *
 * Screen readers get the full list at once (below), so nothing depends on
 * waiting for a rotation to come round.
 */
export function NewsLine({
  label,
  items,
  interval,
}: {
  label?: string;
  items: NewsItem[];
  interval: number;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (items.length < 2 || paused) return;
    const id = window.setInterval(
      () => setIndex((current) => (current + 1) % items.length),
      interval * 1000,
    );
    return () => window.clearInterval(id);
  }, [items.length, interval, paused]);

  if (items.length === 0) return null;

  const item = items[index % items.length];

  return (
    <div
      className="mt-6 flex items-center gap-2.5 text-[16px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {label ? (
        <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-stage-accepted px-2 py-0.5 text-[13px] font-medium tracking-[0.01em] text-stage-accepted-foreground">
          <span aria-hidden className="news-dot size-1.5 rounded-full bg-stage-accepted-swatch" />
          {label}
        </span>
      ) : null}

      {/*
        Keyed on the index so React swaps the node rather than mutating it,
        which is what re-triggers the entrance animation on every rotation.
      */}
      <span key={index} aria-hidden className="news-item min-w-0 truncate text-muted-foreground">
        {item.href ? (
          <Link
            href={item.href}
            className="underline decoration-rule underline-offset-[3px] transition-colors hover:text-foreground hover:decoration-current"
          >
            {item.text}
          </Link>
        ) : (
          item.text
        )}
      </span>

      {/* The whole list, unrotated, for anything that does not watch the page. */}
      <ul className="sr-only">
        {items.map((entry) => (
          <li key={entry.text}>{entry.text}</li>
        ))}
      </ul>
    </div>
  );
}
