import { ArrowRight, ArrowUpRight } from "lucide-react";

import { BrandMark } from "@/components/brand-mark";
import { LinkButton } from "@/components/link-button";
import { ExpandableList } from "@/components/expandable-list";
import { Section } from "@/components/section";
import { Thumbnail } from "@/components/thumbnail";
import {
  getProjects,
  readMoreHref,
  type Project,
  type Projects,
} from "@/lib/content";

/**
 * A search-result row: thumbnail on the left, everything else stacked to its
 * right. One project per line, full width. Stacks vertically on phones.
 */
function ProjectRow({
  project,
  labels,
}: {
  project: Project;
  labels: Projects["labels"];
}) {
  const readMore = readMoreHref(project);
  const { code, demo } = project.links;
  const hasActions = Boolean(readMore || code || demo);

  return (
    <div className="flex flex-col gap-4 py-7 sm:flex-row sm:gap-6">
      <Thumbnail src={project.thumbnail} />

      <div className="min-w-0 flex-1">
        <h3 className="font-heading text-[20px] font-normal leading-[1.35] text-foreground">
          {project.title}
        </h3>

        {project.description ? (
          <p className="mt-2 max-w-[68ch] text-[17px] leading-[1.6] text-foreground/80">
            {project.description}
          </p>
        ) : null}

        {project.tags.length > 0 ? (
          <ul className="mt-3.5 flex flex-wrap gap-2">
            {project.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-md bg-tag px-2 py-1 text-[15px] leading-[1.3] text-tag-foreground"
              >
                {tag}
              </li>
            ))}
          </ul>
        ) : null}

        {/* The live thing first, and the only filled button of the three:
            reading about a project is the fallback, trying it is the point. */}
        {hasActions ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {demo ? (
              <LinkButton href={demo} variant="default" className="try-cta">
                {labels.demo ?? "Try it here"}
                <ArrowUpRight
                  data-icon="inline-end"
                  className="transition-transform duration-200 group-hover/button:translate-x-0.5 group-hover/button:-translate-y-0.5"
                />
              </LinkButton>
            ) : null}

            {code ? (
              <LinkButton href={code}>
                <BrandMark name="github" slot="inline-start" />
                {labels.code ?? "Code"}
              </LinkButton>
            ) : null}

            {readMore ? (
              <LinkButton href={readMore}>
                {labels.read_more ?? "Read more"}
                <ArrowRight data-icon="inline-end" />
              </LinkButton>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ProjectsSection() {
  const projects = getProjects();
  if (projects.items.length === 0) return null;

  return (
    <Section id="projects" heading={projects.heading} blurb={projects.blurb} actions={projects.actions}>
      <ExpandableList initialCount={projects.initial_count}>
        {projects.items.map((project) => (
          <ProjectRow key={project.slug} project={project} labels={projects.labels} />
        ))}
      </ExpandableList>
    </Section>
  );
}
