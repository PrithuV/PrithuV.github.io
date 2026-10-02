import { Mail, Phone } from "lucide-react";

import { Section } from "@/components/section";
import { SOCIALS } from "@/components/social-icon";
import { Button } from "@/components/ui/button";
import { getContact, SOCIAL_KEYS } from "@/lib/content";

export function ContactSection() {
  const contact = getContact();

  // A social button exists only when the YAML carries a value for it.
  const socials = SOCIAL_KEYS.flatMap((key) => {
    const href = contact.socials[key];
    return href ? [{ key, href, ...SOCIALS[key] }] : [];
  });

  return (
    <Section id="contact" heading={contact.heading} blurb={contact.blurb} actions={contact.actions}>
      {contact.email || contact.phone ? (
        <div className="divide-y divide-rule border-y border-rule">
          {contact.email ? (
            <a
              href={`mailto:${contact.email}`}
              className="group flex items-center gap-3 py-4 text-[17px] text-foreground transition-colors hover:text-link"
            >
              <Mail className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-link" />
              <span className="truncate">{contact.email}</span>
            </a>
          ) : null}

          {contact.phone ? (
            <a
              href={`tel:${contact.phone.replace(/[^+\d]/g, "")}`}
              className="group flex items-center gap-3 py-4 text-[17px] text-foreground transition-colors hover:text-link"
            >
              <Phone className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-link" />
              <span className="truncate tabular-nums">{contact.phone}</span>
            </a>
          ) : null}
        </div>
      ) : null}

      {socials.length > 0 ? (
        <div className="mt-8 flex flex-wrap gap-2">
          {socials.map(({ key, href, label, Icon }) => (
            <Button
              key={key}
              variant="outline"
              size="sm"
              render={<a href={href} target="_blank" rel="noreferrer noopener" />}
            >
              <span data-icon="inline-start" className="flex size-3.5 items-center">
                <Icon />
              </span>
              {label}
            </Button>
          ))}
        </div>
      ) : null}
    </Section>
  );
}
