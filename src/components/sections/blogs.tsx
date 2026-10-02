import { ArrowRight, BookOpen } from "lucide-react";

import { LinkButton } from "@/components/link-button";
import { ExpandableList } from "@/components/expandable-list";
import { Section } from "@/components/section";
import { Thumbnail } from "@/components/thumbnail";
import { blogDetailHref, formatDate, getBlogs, type Blog } from "@/lib/content";

/**
 * The same search-result row as Projects: thumbnail left, everything else to its
 * right, one post per line. The extra line under the title carries the date and
 * reading time when the YAML supplies them.
 */
function BlogRow({ post }: { post: Blog }) {
  const detail = blogDetailHref(post);
  const meta = [formatDate(post.date), post.reading_time].filter(Boolean);

  return (
    <div className="flex flex-col gap-4 py-7 sm:flex-row sm:gap-6">
      <Thumbnail src={post.thumbnail} />

      <div className="min-w-0 flex-1">
        <h3 className="font-heading text-[20px] font-normal leading-[1.35] text-foreground">
          {post.title}
        </h3>

        {meta.length > 0 ? (
          <p className="mt-1.5 text-[15px] text-muted-foreground">
            {meta.join(" · ")}
          </p>
        ) : null}

        {post.description ? (
          <p className="mt-2 max-w-[68ch] text-[17px] leading-[1.6] text-foreground/80">
            {post.description}
          </p>
        ) : null}

        {post.tags.length > 0 ? (
          <ul className="mt-3.5 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-md bg-tag px-2 py-1 text-[15px] leading-[1.3] text-tag-foreground"
              >
                {tag}
              </li>
            ))}
          </ul>
        ) : null}

        {detail || post.url ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {detail ? (
              <LinkButton href={detail} variant="default">
                Read more
                <ArrowRight data-icon="inline-end" />
              </LinkButton>
            ) : null}

            {post.url ? (
              <LinkButton href={post.url} variant={detail ? "outline" : "default"}>
                <BookOpen data-icon="inline-start" />
                Read post
              </LinkButton>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function BlogsSection() {
  const blogs = getBlogs();
  if (blogs.items.length === 0) return null;

  return (
    <Section id="blogs" heading={blogs.heading} blurb={blogs.blurb} actions={blogs.actions}>
      <ExpandableList initialCount={blogs.initial_count}>
        {blogs.items.map((post) => (
          <BlogRow key={post.slug ?? post.title} post={post} />
        ))}
      </ExpandableList>
    </Section>
  );
}
