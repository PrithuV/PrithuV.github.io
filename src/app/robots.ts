import type { MetadataRoute } from "next";

import { getSite } from "@/lib/content";

/*
  Nothing here is private, so every crawler gets the whole site. The sitemap
  line is only worth emitting when site.yaml carries a real origin — a relative
  one would be meaningless to a crawler.
*/
/* A static export has no server to run these on request, so both are
   emitted once at build time. */
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  const { url } = getSite();

  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: url ? new URL("/sitemap.xml", url).toString() : undefined,
    host: url,
  };
}
