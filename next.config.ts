import type { NextConfig } from "next";

/**
 * The site is deployed to GitHub Pages, which serves plain files — so Next
 * exports a fully static `out/` directory. Every route here is either static or
 * generated from YAML at build time, so nothing needs a server.
 */
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    // Pages has no image optimiser to call.
    unoptimized: true,
  },
};

export default nextConfig;
