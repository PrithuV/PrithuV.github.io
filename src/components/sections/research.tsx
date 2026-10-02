import { FileText, Link2, Code2, BookMarked } from "lucide-react";
import { Fragment } from "react";

import { LinkButton } from "@/components/link-button";
import { Section } from "@/components/section";
import { cn } from "@/lib/utils";
import { getResearch, type Paper, type PaperStage } from "@/lib/content";

/**
 * A paper's stage shows as a coloured dot on its status pill: green once it is
 * in, amber while it is out for review. The words stay whatever the YAML says —
 * only the colour is decided here.
 */
const STAGE_STYLES: Record<PaperStage, { pill: string; dot: string }> = {
  accepted: {
    pill: "bg-stage-accepted text-stage-accepted-foreground",
    dot: "bg-stage-accepted-swatch",
  },
  published: {
    pill: "bg-stage-accepted text-stage-accepted-foreground",
    dot: "bg-stage-accepted-swatch",
  },
  under_review: {
    pill: "bg-stage-review text-stage-review-foreground",
    dot: "bg-stage-review-swatch",
  },
  preprint: {
    pill: "bg-stage-preprint text-stage-preprint-foreground",
    dot: "bg-stage-preprint-swatch",
  },
  in_progress: {
    pill: "bg-tag text-tag-foreground",
    dot: "bg-muted-foreground",
  },
};

/**
 * Renders an author list with your own name in bold. Comparison ignores case
 * and surrounding space, so "Arnav Verma" matches however it is spaced.
 */
function Authors({ authors, highlight }: { authors: string[]; highlight?: string }) {
  const target = highlight?.trim().toLowerCase();

  return (
    <p className="mt-1.5 text-[16px] leading-[1.55] text-muted-foreground">
      {authors.map((author, index) => (
        <Fragment key={`${author}-${index}`}>
          {index > 0 ? ", " : null}
          {target && author.trim().toLowerCase() === target ? (
            <span className="font-semibold text-foreground">{author}</span>
          ) : (
            author
          )}
        </Fragment>
      ))}
    </p>
  );
}

function PaperRow({ paper, highlight }: { paper: Paper; highlight?: string }) {
  const { pdf, arxiv, code, doi } = paper.links;
  const hasLinks = Boolean(pdf || arxiv || code || doi);
  const stage = paper.stage ? STAGE_STYLES[paper.stage] : undefined;

  return (
    <div className="py-6">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8">
        <h3 className="font-heading text-[18px] font-normal leading-[1.45] text-foreground">
          {paper.title}
        </h3>

        {paper.year ? (
          <span className="shrink-0 text-[16px] tabular-nums text-muted-foreground">
            {paper.year}
          </span>
        ) : null}
      </div>

      {paper.authors.length > 0 ? (
        <Authors authors={paper.authors} highlight={highlight} />
      ) : null}

      {paper.status ? (
        <p className="mt-2.5">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[15px] leading-[1.3]",
              stage ? stage.pill : "bg-tag text-tag-foreground",
            )}
          >
            {stage ? (
              <span aria-hidden className={cn("size-1.5 rounded-full", stage.dot)} />
            ) : null}
            {paper.status}
          </span>
        </p>
      ) : null}

      {paper.summary ? (
        <p className="mt-3 max-w-[68ch] text-[17px] leading-[1.6] text-foreground/80">
          {paper.summary}
        </p>
      ) : null}

      {hasLinks ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {pdf ? (
            <LinkButton href={pdf}>
              <FileText data-icon="inline-start" />
              PDF
            </LinkButton>
          ) : null}
          {arxiv ? (
            <LinkButton href={arxiv}>
              <BookMarked data-icon="inline-start" />
              arXiv
            </LinkButton>
          ) : null}
          {code ? (
            <LinkButton href={code}>
              <Code2 data-icon="inline-start" />
              Code
            </LinkButton>
          ) : null}
          {doi ? (
            <LinkButton href={doi}>
              <Link2 data-icon="inline-start" />
              DOI
            </LinkButton>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ResearchSection() {
  const research = getResearch();
  if (research.items.length === 0) return null;

  return (
    <Section id="research" heading={research.heading} blurb={research.blurb} actions={research.actions}>
      <ol className="divide-y divide-rule border-t border-rule">
        {research.items.map((paper, index) => (
          <li key={`${paper.title}-${index}`}>
            <PaperRow paper={paper} highlight={research.highlight_author} />
          </li>
        ))}
      </ol>
    </Section>
  );
}
