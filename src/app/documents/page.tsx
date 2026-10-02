import { FileText } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { PageIntro } from "@/components/page-intro";
import { SectionActions } from "@/components/section-actions";
import { formatDate, getDocuments, getSite, type DocumentItem } from "@/lib/content";

/**
 * The filing cabinet. Every row is one file and the whole row opens it, so
 * there is no button to hunt for — the page is a list of things to take away.
 */
export function generateMetadata(): Metadata {
  const documents = getDocuments();
  return { title: documents.heading, description: documents.blurb };
}

/** "/documents/resume.pdf" → "PDF", for when the YAML does not say. */
function kindOf(item: DocumentItem) {
  if (item.kind) return item.kind;
  const extension = item.file.split("?")[0].split(".").pop();
  return extension && extension.length <= 4 ? extension.toUpperCase() : undefined;
}

function DocumentRow({ item }: { item: DocumentItem }) {
  const kind = kindOf(item);

  return (
    <li>
      <Link
        href={item.file}
        className="group flex items-start gap-5 py-6 outline-offset-4"
      >
        {/*
          A page preview when there is one, a file glyph when there is not —
          same box either way, so titles stay on one line down the list.
        */}
        <div className="relative size-[56px] shrink-0 overflow-hidden rounded-lg border border-rule bg-surface sm:size-[68px]">
          {item.thumbnail ? (
            <Image
              src={item.thumbnail}
              alt=""
              fill
              sizes="68px"
              className="object-cover"
            />
          ) : (
            <span aria-hidden className="absolute inset-0 grid place-items-center">
              <FileText className="size-5 text-muted-foreground/45" />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 className="font-heading text-[19px] font-normal leading-[1.4] text-foreground group-hover:underline group-hover:underline-offset-4">
              {item.title}
            </h3>

            {kind ? (
              <span className="rounded-md bg-tag px-1.5 py-0.5 text-[12px] font-medium tracking-[0.04em] text-tag-foreground">
                {kind}
              </span>
            ) : null}
          </div>

          {item.date ? (
            <p className="mt-1 text-[15px] text-muted-foreground">{formatDate(item.date)}</p>
          ) : null}

          {item.description ? (
            <p className="mt-2 max-w-[68ch] text-[16px] leading-[1.6] text-foreground/80">
              {item.description}
            </p>
          ) : null}
        </div>
      </Link>
    </li>
  );
}

export default function DocumentsPage() {
  const documents = getDocuments();
  const site = getSite();

  /*
    Grouped by `group`, in the order the groups first appear in the YAML —
    the file is the running order, so reordering there reorders the page.
  */
  const groups: { name?: string; items: DocumentItem[] }[] = [];
  for (const item of documents.items) {
    const existing = groups.find((group) => group.name === item.group);
    if (existing) existing.items.push(item);
    else groups.push({ name: item.group, items: [item] });
  }

  return (
    <PageIntro
      backHref="/"
      backLabel={site.back_label ?? site.title}
      title={documents.heading}
      blurb={documents.blurb}
    >
      <div className="space-y-12">
        {groups.map((group, index) => (
          <section key={group.name ?? index}>
            {group.name ? (
              <h2 className="text-[12px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                {group.name}
              </h2>
            ) : null}

            <ul className="mt-3 divide-y divide-rule border-t border-rule">
              {group.items.map((item) => (
                <DocumentRow key={item.file} item={item} />
              ))}
            </ul>
          </section>
        ))}
      </div>

      <SectionActions actions={documents.actions} />
    </PageIntro>
  );
}
