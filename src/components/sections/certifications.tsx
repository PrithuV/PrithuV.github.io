import { BadgeCheck, ExternalLink } from "lucide-react";
import Image from "next/image";

import { LinkButton } from "@/components/link-button";
import { Section } from "@/components/section";
import { formatDate, getCertifications, type Certification } from "@/lib/content";

function CertificationRow({ item }: { item: Certification }) {
  return (
    <div className="flex gap-5 py-6">
      {/*
        One frame whatever the artwork is. `object-contain` letterboxes instead
        of cropping, because a square badge and a landscape certificate both end
        up here and cropping either one loses the part that identifies it.
      */}
      <div className="relative size-[76px] shrink-0 overflow-hidden rounded-lg border border-rule bg-surface sm:size-[92px]">
        {item.thumbnail ? (
          <Image
            src={item.thumbnail}
            alt=""
            fill
            sizes="92px"
            className="object-contain p-2"
          />
        ) : (
          <span aria-hidden className="absolute inset-0 grid place-items-center">
            <BadgeCheck className="size-6 text-muted-foreground/35" />
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="font-heading text-[18px] font-normal leading-[1.4] text-foreground">
          {item.title}
        </h3>

        {item.date ? (
          <p className="mt-1 text-[15px] text-muted-foreground">
            {formatDate(item.date)}
          </p>
        ) : null}

        {item.description ? (
          <p className="mt-2 text-[17px] leading-[1.6] text-foreground/85">
            {item.description}
          </p>
        ) : null}
        
        {item.credential_id ? (
          <p className="mt-2 text-[17px] leading-[1.6] text-foreground/85">
            <b>Credential ID:</b> {item.credential_id}
          </p>
        ) : null}


        {item.credential ? (
          <div className="mt-3">
            <LinkButton href={item.credential}>
              <ExternalLink data-icon="inline-start" />
              View credential
            </LinkButton>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function CertificationsSection() {
  const certifications = getCertifications();
  // An empty section is worse than no section, so it hides until there is one.
  if (certifications.items.length === 0) return null;

  return (
    <Section
      id="certifications"
      heading={certifications.heading}
      blurb={certifications.blurb}
      actions={certifications.actions}
    >
      <ol className="divide-y divide-rule border-y border-rule">
        {certifications.items.map((item) => (
          <li key={item.title}>
            <CertificationRow item={item} />
          </li>
        ))}
      </ol>
    </Section>
  );
}
