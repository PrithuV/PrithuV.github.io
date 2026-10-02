import { BookOpen } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DetailArticle } from "@/components/detail-article";
import { LinkButton } from "@/components/link-button";
import { formatDate, getBlog, getBlogs } from "@/lib/content";
import { hasBody, renderBody } from "@/lib/markdown";

/**
 * One page per post with a body — either a `details:` block in blogs.yaml or a
 * `content/blog/<slug>.md` file. Posts that only link out never route here.
 */
export function generateStaticParams() {
  return getBlogs()
    .items.filter(
      (post) => post.slug && (post.details.length > 0 || hasBody("blog", post.slug)),
    )
    .map((post) => ({ slug: post.slug as string }));
}

export async function generateMetadata({
  params,
}: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlog(slug);
  if (!post) return {};

  return { title: post.title, description: post.description };
}

export default async function BlogPage({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = getBlog(slug);
  if (!post) notFound();

  const html = renderBody("blog", slug);
  if (!html && post.details.length === 0) notFound();

  const meta = [formatDate(post.date), post.reading_time].filter(Boolean).join(" · ");

  return (
    <DetailArticle
      backHref="/#blogs"
      backLabel="All writing"
      title={post.title}
      description={post.description}
      meta={meta || undefined}
      tags={post.tags}
      thumbnail={post.thumbnail}
      blocks={post.details}
      html={html}
      actions={
        post.url ? (
          <LinkButton href={post.url}>
            <BookOpen data-icon="inline-start" />
            Read post
          </LinkButton>
        ) : null
      }
    />
  );
}
