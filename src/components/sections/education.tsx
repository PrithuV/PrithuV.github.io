import { FileText } from "lucide-react";

import { InstitutionLogo } from "@/components/institution-logo";
import { LinkButton } from "@/components/link-button";
import { Section } from "@/components/section";
import { getEducation } from "@/lib/content";
import { cn } from "@/lib/utils";

/** A small all-caps rubric introducing a block within an entry. */
function Label({ children }: { children: string }) {
  return (
    <h4 className="text-[12px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
      {children}
    </h4>
  );
}

export function EducationSection() {
  const education = getEducation();
  if (education.items.length === 0) return null;

  return (
    <Section id="education" heading={education.heading} blurb={education.blurb} actions={education.actions}>
      <ol className="divide-y divide-rule border-t border-rule">
        {education.items.map((item) => {
          // "B.S. Computer Science · Mathematics Minor"
          const qualification = [item.degree, item.field].filter(Boolean).join(" · ");
          // "Denton, TX · GPA 3.70"
          const place = [item.location, item.grade].filter(Boolean).join(" · ");

          return (
            <li key={`${item.institution}-${item.dates ?? ""}`} className="py-7">
              {/*
                The mark and the name sit on one line, the way a CV entry reads;
                everything below stays where it was rather than indenting under
                the logo, so a long course list keeps the full column width.
              */}
              <div className="flex items-start gap-4">
                <InstitutionLogo
                  name={item.institution}
                  logo={item.logo}
                  color={item.color}
                  colorDark={item.color_dark}
                />

                <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8">
                <h3
                  className={cn(
                    "text-[18px] font-bold leading-[1.45] tracking-[-0.01em]",
                    item.color ? "brand-ink" : "text-foreground",
                  )}
                  style={
                    item.color
                      ? ({
                          "--brand": item.color,
                          ...(item.color_dark ? { "--brand-dark": item.color_dark } : {}),
                        } as React.CSSProperties)
                      : undefined
                  }
                >
                  {item.institution}
                </h3>

                {item.dates ? (
                  <p className="shrink-0 text-[16px] tabular-nums text-muted-foreground">
                    {item.dates}
                  </p>
                ) : null}
              </div>

              {qualification ? (
                <p className="mt-1.5 text-[17px] leading-[1.55] text-muted-foreground">
                  {qualification}
                </p>
              ) : null}

              {place ? (
                <p className="mt-1 text-[16px] text-muted-foreground">{place}</p>
              ) : null}
                </div>
              </div>

              {item.affiliations.length > 0 ? (
                <div className="mt-5">
                  <Label>Affiliations</Label>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {item.affiliations.map((affiliation) => (
                      <li
                        key={affiliation}
                        className="rounded-md bg-tag px-2 py-1 text-[15px] leading-[1.3] text-tag-foreground"
                      >
                        {affiliation}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {item.awards.length > 0 ? (
                <div className="mt-5">
                  <Label>Awards &amp; Honors</Label>
                  <ul className="mt-2 space-y-1.5">
                    {item.awards.map((award) => (
                      <li
                        key={award}
                        className="relative pl-4 text-[17px] leading-[1.6] text-foreground/85 before:absolute before:left-0 before:top-[0.7em] before:h-[3px] before:w-[3px] before:rounded-full before:bg-muted-foreground"
                      >
                        {award}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {item.coursework.length > 0 ? (
                <div className="mt-5">
                  <Label>Coursework</Label>

                  {/*
                    Two columns of course/grade rows rather than one long list —
                    ten courses stack into five lines instead of ten. Rows fill
                    left to right, so reading order still runs down the page.
                  */}
                  <ul className="mt-2 grid grid-cols-1 border-t border-rule sm:grid-cols-2 sm:gap-x-10">
                    {item.coursework.map((course) => (
                      <li
                        key={course.name}
                        className="flex items-baseline justify-between gap-4 border-b border-rule py-2"
                      >
                        <span className="text-[17px] leading-[1.4] text-foreground/85">
                          {course.name}
                        </span>

                        {course.grade ? (
                          <span className="shrink-0 text-[15px] text-grade">
                            {course.grade}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {item.transcript ? (
                <div className="mt-5">
                  <LinkButton href={item.transcript} variant="ghost">
                    {/* <FileText data-icon="inline-start" /> */}
                    📑 View transcript
                  </LinkButton>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </Section>
  );
}
