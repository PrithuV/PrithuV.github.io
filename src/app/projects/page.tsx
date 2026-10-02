import type { Metadata } from "next";

import { CardGrid, EntryCard } from "@/components/card-grid";
import { PageIntro } from "@/components/page-intro";
import { SectionActions } from "@/components/section-actions";
import { getProjects, getSite, readMoreHref } from "@/lib/content";

/**
 * Every project at once, as a grid. The home page shows the first few as rows
 * and hides the rest behind "View more"; this is where the whole list lives, so
 * it keeps growing without the front page growing with it.
 */
export function generateMetadata(): Metadata {
  const projects = getProjects();
  return { title: projects.heading, description: projects.blurb };
}

export default function ProjectsPage() {
  const projects = getProjects();
  const site = getSite();

  return (
    <PageIntro
      backHref="/"
      backLabel={site.back_label ?? site.title}
      title={projects.heading}
      blurb={projects.blurb}
    >
      <CardGrid>
        {projects.items.map((project) => (
          <EntryCard
            key={project.slug}
            href={readMoreHref(project)}
            title={project.title}
            description={project.description}
            tags={project.tags}
            thumbnail={project.thumbnail}
          />
        ))}
      </CardGrid>

      <SectionActions actions={projects.actions} />
    </PageIntro>
  );
}
