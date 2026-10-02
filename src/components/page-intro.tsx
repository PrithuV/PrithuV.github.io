import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The top of a standalone index page: the way back, the title, the line under
 * it. Same column and rhythm as `Section`, so an index page and the home page
 * are plainly the same site.
 */
export function PageIntro({
  backHref,
  backLabel,
  title,
  blurb,
  children,
}: {
  backHref: string;
  backLabel: string;
  title: string;
  blurb?: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-[1040px] px-6 pt-12 pb-24 sm:pt-16 sm:pb-32">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-[15px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        {backLabel}
      </Link>

      <h1 className="mt-8 font-heading text-[38px] font-normal leading-[1.15] tracking-[-0.02em] text-foreground sm:text-[47px]">
        {title}
      </h1>

      {blurb ? (
        <p className="mt-3 max-w-[60ch] text-[19px] leading-[1.5] text-muted-foreground sm:text-[21px]">
          {blurb}
        </p>
      ) : null}

      <div className="mt-12 border-t border-rule pt-12">{children}</div>
    </main>
  );
}
