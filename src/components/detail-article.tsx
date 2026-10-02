import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { MermaidDiagrams } from "@/components/mermaid-diagrams";
import { hasMermaid } from "@/lib/markdown";


export type DetailBlock = { heading?: string; body: string };

/**
 * The long-form page behind a "Read more" — shared by projects and posts, since
 * they are the same page with different buttons on it.
 */
export function DetailArticle({
  backHref,
  backLabel,
  title,
  description,
  meta,
  tags,
  thumbnail,
  actions,
  blocks = [],
  html,
}: {
  backHref: string;
  backLabel: string;
  title: string;
  description?: string;
  meta?: string;
  tags: string[];
  thumbnail?: string;
  actions?: ReactNode;
  blocks?: DetailBlock[];
  /** Post body rendered from Markdown, used instead of `blocks`. */
  html?: string;
}) {
  return (
    <main className="mx-auto w-full max-w-[860px] px-6 pt-12 pb-24 sm:pt-16">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-[16px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        {backLabel}
      </Link>

      <div className="mt-8">
        <h1 className="font-heading text-[38px] font-normal leading-[1.15] tracking-[-0.02em] text-foreground sm:text-[47px]">
          {title}
        </h1>

        {meta ? (
          <p className="mt-3 text-[16px] text-muted-foreground">{meta}</p>
        ) : null}

        {description ? (
          <p className="mt-4 text-[21px] leading-[1.5] text-muted-foreground sm:text-[24px]">
            {description}
          </p>
        ) : null}
      </div>

      {tags.length > 0 ? (
        <ul className="mt-6 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <li
              key={tag}
              className="rounded-md bg-tag px-2 py-1 text-[15px] leading-[1.3] text-tag-foreground"
            >
              {tag}
            </li>
          ))}
        </ul>
      ) : null}

      {actions ? <div className="mt-7 flex flex-wrap gap-2">{actions}</div> : null}

      {thumbnail ? (
        <div className="relative mt-10 aspect-[16/8] w-full overflow-hidden rounded-lg border border-rule bg-surface">
          <Image
            src={thumbnail}
            alt=""
            fill
            sizes="(max-width: 760px) 100vw, 760px"
            className="object-cover"
            priority
          />
        </div>
      ) : null}

      {html ? (
        /*
          The Markdown is our own file, rendered at build time. `markdown` in
          globals.css styles the tags it produces — there are no classes to
          hang on them, since marked emits plain HTML.
        */
        <div
          className="markdown mt-12"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : null}

      {/* Mounted only when there is a diagram, so the bundle is never idle weight. */}
      {hasMermaid(html) ? <MermaidDiagrams /> : null}

      <div className="mt-12 space-y-10">
        {blocks.map((block, index) => (
          <section key={block.heading ?? index}>
            {block.heading ? (
              <h2 className="font-heading text-[25px] font-normal tracking-[-0.01em] text-foreground">
                {block.heading}
              </h2>
            ) : null}

            {/* Blank lines in the YAML become paragraph breaks. */}
            <div className={block.heading ? "mt-3 space-y-4" : "space-y-4"}>
              {block.body
                .split(/\n\s*\n/)
                .map((paragraph) => paragraph.trim())
                .filter(Boolean)
                .map((paragraph) => (
                  <p
                    key={paragraph}
                    className="text-[18px] leading-[1.7] text-foreground/85"
                  >
                    {paragraph}
                  </p>
                ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
