import type { ReactNode } from "react";

import { SectionActions } from "@/components/section-actions";

import type { SectionAction } from "@/lib/content";
import { cn } from "@/lib/utils";

/** Every section is the same column, the same rhythm, separated by one hairline. */
export function Section({
  id,
  heading,
  blurb,
  actions = [],
  children,
  className,
}: {
  id: string;
  heading: string;
  blurb?: string;
  actions?: SectionAction[];
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("border-t border-rule", className)}>
      <div className="mx-auto w-full max-w-[1040px] px-6 py-20 sm:py-24">
        <div className="mb-10">
          <h2 className="font-heading text-[31px] font-normal tracking-[-0.01em] text-foreground sm:text-[34px]">
            {heading}
          </h2>

          {blurb ? (
            <p className="mt-2 max-w-[60ch] text-[17px] leading-[1.6] text-muted-foreground">
              {blurb}
            </p>
          ) : null}
        </div>

        {children}

        <SectionActions actions={actions} />
      </div>
    </section>
  );
}
