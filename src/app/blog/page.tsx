import type { Metadata } from "next";

import { CardGrid, EntryCard } from "@/components/card-grid";
import { PageIntro } from "@/components/page-intro";
import { SectionActions } from "@/components/section-actions";
import { blogDetailHref, formatDate, getBlogs, getSite, type Blog } from "@/lib/content";

/**
 * Every post at once, as a grid — the counterpart to /projects. A post with no
 * page of its own links out to wherever it was published instead, which is the
 * same rule the home page rows follow.
 *
 * Filed by year, newest first. Dates are free-form, so the year is whatever
 * four digits the date carries; a post with no date at all sorts last, under no
 * heading, rather than inventing a year for it.
 */

/** Sorts on: the date if it parses, else the bare year, else nothing. */
function sortKey(post: Blog) {
  if (!post.date) return undefined;
  const parsed = Date.parse(post.date);
  if (!Number.isNaN(parsed)) return parsed;
  const year = post.date.match(/(?:19|20)\d{2}/)?.[0];
  return year ? Date.parse(`${year}-01-01`) : undefined;
}

function yearOf(post: Blog) {
  const key = sortKey(post);
  return key === undefined ? undefined : new Date(key).getUTCFullYear();
}

/** Posts grouped by year, years newest first, undated last. */
function byYear(posts: Blog[]) {
  const years = new Map<number | undefined, Blog[]>();
  for (const post of posts) {
    const year = yearOf(post);
    years.set(year, [...(years.get(year) ?? []), post]);
  }

  return [...years.entries()]
    .sort(([a], [b]) => (b ?? -Infinity) - (a ?? -Infinity))
    .map(([year, items]) => ({
      year,
      items: items.sort((a, b) => (sortKey(b) ?? 0) - (sortKey(a) ?? 0)),
    }));
}
export function generateMetadata(): Metadata {
  const blogs = getBlogs();
  return { title: blogs.heading, description: blogs.blurb };
}

export default function BlogIndexPage() {
  const blogs = getBlogs();
  const site = getSite();

  return (
    <PageIntro
      backHref="/"
      backLabel={site.back_label ?? site.title}
      title={blogs.heading}
      blurb={blogs.blurb}
    >
      <div className="space-y-14">
        {byYear(blogs.items).map(({ year, items }) => (
          <section key={year ?? "undated"}>
            {year ? (
              // The year is a rubric, not a title: small, set off to the side of
              // the grid it labels rather than competing with the post titles.
              <h2 className="mb-6 border-b border-rule pb-2 text-[13px] font-medium uppercase tracking-[0.14em] text-muted-foreground tabular-nums">
                {year}
              </h2>
            ) : null}

            <CardGrid>
              {items.map((post) => (
                <EntryCard
                  key={post.slug ?? post.title}
                  href={blogDetailHref(post) ?? post.url}
                  title={post.title}
                  meta={[formatDate(post.date), post.reading_time]
                    .filter(Boolean)
                    .join(" · ")}
                  description={post.description}
                  tags={post.tags}
                  thumbnail={post.thumbnail}
                />
              ))}
            </CardGrid>
          </section>
        ))}
      </div>

      <SectionActions actions={blogs.actions} />
    </PageIntro>
  );
}
