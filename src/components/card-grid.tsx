import Link from "next/link";
import type { ReactNode } from "react";

import { Thumbnail } from "@/components/thumbnail";

/**
 * The index pages' layout: every entry the same card, two or three to a row.
 *
 * The home page lists the same items as full-width rows — long description, a
 * button per link. A card is the other trade: the thumbnail does the work, the
 * text is clamped, and the whole card is one link, because a grid of cards each
 * carrying three buttons reads as a control panel rather than as a list.
 */

export function CardGrid({ children }: { children: ReactNode }) {
  return (
    <ul className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      {children}
    </ul>
  );
}

export function EntryCard({
  href,
  title,
  meta,
  description,
  tags = [],
  thumbnail,
  footer,
}: {
  /** Omit it and the card is inert — an entry with nowhere to go. */
  href?: string;
  title: string;
  meta?: string;
  description?: string;
  tags?: string[];
  thumbnail?: string;
  footer?: ReactNode;
}) {
  const body = (
    <>
      {/*
        The whole card lifts on hover, so the thumbnail is the only thing that
        moves under it — a small zoom, which is what says "this is clickable"
        without a button.
      */}
      <div className="overflow-hidden rounded-lg">
        <div className="transition-transform duration-300 group-hover:scale-[1.03]">
          <Thumbnail src={thumbnail} className="w-full sm:w-full lg:w-full" />
        </div>
      </div>

      <h3 className="mt-4 font-heading text-[19px] font-normal leading-[1.35] text-foreground">
        {title}
      </h3>

      {meta ? <p className="mt-1.5 text-[14px] text-muted-foreground">{meta}</p> : null}

      {description ? (
        // Three lines, so a long entry and a short one make the same shape.
        <p className="mt-2 line-clamp-3 text-[16px] leading-[1.6] text-foreground/80">
          {description}
        </p>
      ) : null}

      {tags.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {tags.slice(0, 3).map((tag) => (
            <li
              key={tag}
              className="rounded-md bg-tag px-2 py-0.5 text-[13px] leading-[1.4] text-tag-foreground"
            >
              {tag}
            </li>
          ))}
          {tags.length > 3 ? (
            <li className="px-1 py-0.5 text-[13px] leading-[1.4] text-muted-foreground">
              +{tags.length - 3}
            </li>
          ) : null}
        </ul>
      ) : null}
    </>
  );

  return (
    <li className="group">
      {href ? (
        <Link href={href} className="block rounded-lg outline-offset-4">
          {body}
        </Link>
      ) : (
        body
      )}

      {footer ? <div className="mt-3">{footer}</div> : null}
    </li>
  );
}
