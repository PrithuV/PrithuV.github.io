import Image from "next/image";

/**
 * The square in front of an institution's name, the way a LinkedIn entry carries
 * one. Until a real mark is dropped into `public/`, the same square holds a
 * monogram in the school's own colour — so the column lines up either way and a
 * missing file degrades to something deliberate rather than to a gap.
 */

/** "University of North Texas (Graduated)" → "UN"; "NYU, Courant" → "NY". */
function monogram(name: string) {
  const words = name
    .replace(/\(.*?\)/g, " ")
    .split(/[\s,]+/)
    .filter((word) => /^[A-Za-z]/.test(word) && !STOP_WORDS.has(word.toLowerCase()));

  const initials = words.map((word) => word[0].toUpperCase()).join("");
  return initials.slice(0, 2) || name.slice(0, 2).toUpperCase();
}

const STOP_WORDS = new Set(["of", "the", "at", "and", "for", "in"]);

export function InstitutionLogo({
  name,
  logo,
  color,
  colorDark,
}: {
  name: string;
  logo?: string;
  color?: string;
  colorDark?: string;
}) {
  const tint = color
    ? ({
        "--brand": color,
        ...(colorDark ? { "--brand-dark": colorDark } : {}),
      } as React.CSSProperties)
    : undefined;

  /*
    A real mark gets the box to itself — no frame, no inset — so a crest fills
    the square instead of sitting in a tile inside it. The frame is only there
    to give the monogram something to be drawn on.
  */
  if (logo) {
    return (
      <div className="relative size-[56px] shrink-0 sm:size-[64px]">
        {/* Letterboxed, never cropped: a wide wordmark and a square crest both
            have to survive the same box. */}
        <Image src={logo} alt="" fill sizes="64px" className="object-contain" />
      </div>
    );
  }

  return (
    <div className="relative size-[56px] shrink-0 overflow-hidden rounded-lg border border-rule bg-surface sm:size-[64px]">
      <span
        aria-hidden
        style={tint}
        className={`absolute inset-0 grid place-items-center font-heading text-[19px] ${
          color ? "brand-ink" : "text-muted-foreground"
        }`}
      >
        {monogram(name)}
      </span>
    </div>
  );
}
