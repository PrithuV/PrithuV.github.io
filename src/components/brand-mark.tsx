import Image from "next/image";
import * as simpleIcons from "simple-icons";

/**
 * The little logo in front of a skill.
 *
 * Marks come from simple-icons, matched from the skill's own name — "PyTorch"
 * finds `siPytorch` — so a new skill usually needs nothing but its name. The
 * handful of names that do not match their brand's slug are listed below, and
 * anything else can override the lookup from YAML with `icon:`.
 *
 * Drawn in `currentColor`, not the brand's hex: these sit on three different
 * tinted pills in two themes, and a dozen brand colours on top of that reads as
 * confetti. It also means a mark that is pure black (or pure white) does not
 * disappear into the pill behind it.
 */

/** Names whose brand slug cannot be derived from the name itself. */
const SLUG_ALIASES: Record<string, string> = {
  "c/c++": "cplusplus",
  "c++": "cplusplus",
  "next.js": "nextdotjs",
  "node.js": "nodedotjs",
  "react native": "react",
  "scikit-learn": "scikitlearn",
  "google ai studio": "googlegemini",
  "claude code": "anthropic",
  tensorrt: "nvidia",
};

/** "scikit-learn" → "siScikitlearn", which is how simple-icons names its exports. */
function iconFor(slug: string) {
  const key = slug.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!key) return undefined;
  const icon = (simpleIcons as Record<string, unknown>)[
    `si${key.charAt(0).toUpperCase()}${key.slice(1)}`
  ];
  return icon as { path: string } | undefined;
}

export function BrandMark({
  name,
  icon,
  className = "size-3.5",
  slot,
}: {
  name: string;
  icon?: string | false;
  className?: string;
  /** Marks the mark as a button's leading or trailing icon, for its padding. */
  slot?: "inline-start" | "inline-end";
}) {
  // `icon: false` in YAML is how a skill opts out of a mark it would otherwise get.
  if (icon === false) return null;

  // A path is an image the reader supplied; anything else is a slug to look up.
  if (icon?.startsWith("/") || icon?.startsWith("http")) {
    return (
      <Image
        src={icon}
        alt=""
        width={14}
        height={14}
        data-icon={slot}
        className={`${className} shrink-0 object-contain`}
      />
    );
  }

  const mark = iconFor(icon ?? SLUG_ALIASES[name.toLowerCase()] ?? name);
  if (!mark) return null;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      focusable="false"
      data-icon={slot}
      className={`${className} shrink-0 ${slot ? "" : "opacity-70"}`}
    >
      <path d={mark.path} />
    </svg>
  );
}
