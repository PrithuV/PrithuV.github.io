import {
  siGithub,
  siGooglescholar,
  siHashnode,
  siHuggingface,
  siInstagram,
  siMedium,
  siSpotify,
  siYoutube,
} from "simple-icons";
import { ScrollText } from "lucide-react";
import type { ComponentType } from "react";

import type { SocialKey } from "@/lib/content";

/**
 * Brand marks come from simple-icons, which no longer ships LinkedIn (pulled for
 * trademark reasons) and has never shipped OpenReview. Those two get a neutral
 * stand-in — a lettered glyph and a document glyph. Drop an official SVG in here
 * if you would rather have the real mark. Every button also carries its name in
 * text, so nothing depends on the icon being recognised.
 */
function BrandIcon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false">
      <path d={path} />
    </svg>
  );
}

function LetterIcon({ letters }: { letters: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden focusable="false">
      <rect
        x="1.5"
        y="1.5"
        width="21"
        height="21"
        rx="5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <text
        x="12"
        y="16.5"
        textAnchor="middle"
        fill="currentColor"
        fontSize="11"
        fontWeight="600"
        fontFamily="inherit"
      >
        {letters}
      </text>
    </svg>
  );
}

const brand = (path: string) => {
  const Icon = () => <BrandIcon path={path} />;
  return Icon;
};

type Social = { label: string; Icon: ComponentType };

export const SOCIALS: Record<SocialKey, Social> = {
  github: { label: "GitHub", Icon: brand(siGithub.path) },
  linkedin: { label: "LinkedIn", Icon: () => <LetterIcon letters="in" /> },
  huggingface: { label: "Hugging Face", Icon: brand(siHuggingface.path) },
  hashnode: { label: "Hashnode", Icon: brand(siHashnode.path) },
  medium: { label: "Medium", Icon: brand(siMedium.path) },
  youtube: { label: "YouTube", Icon: brand(siYoutube.path) },
  google_scholar: { label: "Google Scholar", Icon: brand(siGooglescholar.path) },
  open_review: { label: "OpenReview", Icon: ScrollText },
  instagram: { label: "Instagram", Icon: brand(siInstagram.path) },
  spotify: { label: "Spotify", Icon: brand(siSpotify.path) },
};
