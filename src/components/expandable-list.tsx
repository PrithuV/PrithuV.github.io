"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { Children, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

/**
 * A list that shows its first few rows and hides the rest behind a button.
 *
 * Every row is rendered on the server and stays in the DOM — hidden ones carry
 * the `hidden` attribute rather than being dropped — so the full list is still
 * in the HTML for search engines and for anyone reading with assistive tech
 * after expanding.
 */
export function ExpandableList({
  children,
  initialCount,
  moreLabel = "View more",
  lessLabel = "View less",
}: {
  children: ReactNode;
  initialCount: number;
  moreLabel?: string;
  lessLabel?: string;
}) {
  const rows = Children.toArray(children);
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const collapsible = initialCount > 0 && rows.length > initialCount;
  const hidingRows = collapsible && !expanded;
  const hiddenCount = rows.length - initialCount;

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    // Collapsing a long list would otherwise leave you stranded far below the
    // section you were reading.
    if (!next) {
      containerRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  };

  return (
    <div ref={containerRef} className="scroll-mt-28">
      <div className="relative">
        <ol className="divide-y divide-rule border-t border-rule">
          {rows.map((row, index) => (
            <li key={index} hidden={hidingRows && index >= initialCount}>
              {row}
            </li>
          ))}
        </ol>

        {hidingRows ? (
          // A soft edge on the last visible row, so it reads as "there is more"
          // rather than "this is the end".
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-background via-background/80 to-transparent"
          />
        ) : null}
      </div>

      {collapsible ? (
        <div className="mt-6 flex justify-center">
          <Button
            size="lg"
            variant="default"
            onClick={toggle}
            aria-expanded={expanded}
            className="min-w-[220px] justify-center"
          >
            {expanded ? (
              <>
                {lessLabel}
                <ChevronUp data-icon="inline-end" />
              </>
            ) : (
              <>
                {`${moreLabel} (${hiddenCount})`}
                <ChevronDown data-icon="inline-end" />
              </>
            )}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
