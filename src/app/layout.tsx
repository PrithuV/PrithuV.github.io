import type { Metadata } from "next";
import { Google_Sans } from "next/font/google";

import { SiteHeader } from "@/components/site-header";
import { SmoothScroll } from "@/components/smooth-scroll";
import { ThemeProvider } from "@/components/theme-provider";
import { getSite } from "@/lib/content";

import "./globals.css";
/*
  KaTeX ships the fonts its markup depends on; the bundler emits them alongside
  the stylesheet. Math is rendered to HTML at build time, so this is the only
  thing an equation needs at runtime — no script.
*/
import "katex/dist/katex.min.css";

/*
  Google Sans for everything — headings, body, meta, tags.
*/
const googleSans = Google_Sans({
  variable: "--font-google-sans",
  subsets: ["latin"],
  display: "swap",
});

export function generateMetadata(): Metadata {
  const site = getSite();
  /*
    Slack, LinkedIn and X will not follow a relative image path, so the card
    only works if `url` in site.yaml is the real origin — metadataBase is what
    turns "/og.png" into an absolute URL here.
  */
  const image = site.og_image ?? "/og.png";
  const alt = site.og_image_alt ?? site.title;

  return {
    title: site.title,
    description: site.description,
    metadataBase: site.url ? new URL(site.url) : undefined,
    alternates: { canonical: "/" },
    openGraph: {
      title: site.title,
      description: site.description,
      siteName: site.title,
      url: "/",
      locale: "en_US",
      type: "website",
      images: [{ url: image, width: 1200, height: 630, alt }],
    },
    twitter: {
      card: "summary_large_image",
      title: site.title,
      description: site.description,
      images: [{ url: image, alt }],
    },
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  const site = getSite();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      /*
        No `h-full` here. Lenis watches <html> with a ResizeObserver to know how
        far the page scrolls, and a height pinned to the viewport never changes
        size — so the scroll limit stayed at whatever it was before the images
        and fonts landed, and the page stopped halfway.
      */
      className={`${googleSans.variable} antialiased`}
    >
      <body className="flex min-h-dvh flex-col">
        <ThemeProvider>
          <SmoothScroll />
          <SiteHeader
            brand={site.brand ?? site.title}
            nav={site.nav}
            vibe={site.vibe}
          />
          <div className="flex-1">{children}</div>
          {site.footer ? (
            <footer className="border-t border-rule">
              <div className="mx-auto w-full max-w-[1040px] px-6 py-10 text-center text-[15px] text-muted-foreground">
                {site.footer}
              </div>
            </footer>
          ) : null}
        </ThemeProvider>
      </body>
    </html>
  );
}
