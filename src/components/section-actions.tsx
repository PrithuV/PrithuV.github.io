import { SOCIALS } from "@/components/social-icon";
import { Button } from "@/components/ui/button";
import type { SectionAction } from "@/lib/content";

/**
 * The row of outline buttons at the foot of a section — the same treatment as
 * the socials under Contact, so a "View GitHub" under Projects reads as the
 * same kind of control wherever it appears.
 */
export function SectionActions({ actions }: { actions: SectionAction[] }) {
  if (actions.length === 0) return null;

  return (
    <div className="mt-10 flex flex-wrap gap-2 border-t border-rule pt-8">
      {actions.map((action) => {
        const social = action.social ? SOCIALS[action.social] : undefined;
        // "View GitHub" comes free from the social; `label` overrides it.
        const label = action.label ?? `View ${social?.label}`;
        const Icon = social?.Icon;

        return (
          <Button
            key={`${label}-${action.href}`}
            variant="outline"
            size="sm"
            render={<a href={action.href} target="_blank" rel="noreferrer noopener" />}
          >
            {Icon ? (
              <span data-icon="inline-start" className="flex size-3.5 items-center">
                <Icon />
              </span>
            ) : null}
            {label}
          </Button>
        );
      })}
    </div>
  );
}
