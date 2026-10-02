/**
 * Renders public/og.png — the link-preview card social platforms show.
 *
 * This is a script rather than an app/opengraph-image.tsx route on purpose:
 * under `output: export` that route emits a file with no extension, and GitHub
 * Pages serves those as application/octet-stream, which LinkedIn and Slack
 * reject outright. A plain .png in public/ is served as an image.
 *
 * Re-run it (`npm run og`) after changing the name, title, description or
 * portrait in content/.
 */
import fs from "node:fs";
import path from "node:path";

import { ImageResponse } from "next/og.js";
import { load as parseYaml } from "js-yaml";

const root = process.cwd();
const readYaml = (name) =>
  parseYaml(fs.readFileSync(path.join(root, "content", `${name}.yaml`), "utf8"));

const site = readYaml("site");
const hero = readYaml("hero");

const SIZE = { width: 1200, height: 630 };

// Satori has no filesystem, so the portrait has to be inlined as a data URI.
let portrait;
if (hero.photo?.startsWith("/")) {
  const file = path.join(root, "public", decodeURIComponent(hero.photo));
  if (fs.existsSync(file)) {
    const ext = path.extname(file).slice(1).toLowerCase();
    const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    portrait = `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
  } else {
    throw new Error(`hero.photo points at ${hero.photo}, which is not in public/`);
  }
}

const INK = "#37352f";
const MUTED = "#787774";

const card = {
  type: "div",
  props: {
    style: {
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      background: "#ffffff",
      color: INK,
      padding: "72px 80px",
    },
    children: [
      {
        type: "div",
        props: {
          style: { flex: 1, display: "flex", alignItems: "center", gap: 44 },
          children: [
            portrait && {
              type: "img",
              props: {
                src: portrait,
                width: 196,
                height: 196,
                style: { borderRadius: 30, objectFit: "cover" },
              },
            },
            {
              type: "div",
              props: {
                style: { display: "flex", flexDirection: "column" },
                children: [
                  {
                    type: "div",
                    props: {
                      style: { fontSize: 78, fontWeight: 600, letterSpacing: "-0.03em" },
                      children: hero.name,
                    },
                  },
                  {
                    type: "div",
                    props: {
                      style: { fontSize: 36, color: MUTED, marginTop: 12 },
                      children: hero.title,
                    },
                  },
                  hero.location && {
                    type: "div",
                    props: {
                      style: { fontSize: 26, color: MUTED, marginTop: 22 },
                      children: hero.location,
                    },
                  },
                ].filter(Boolean),
              },
            },
          ].filter(Boolean),
        },
      },
      {
        type: "div",
        props: {
          style: { height: 1, background: "rgba(55, 53, 47, 0.12)" },
        },
      },
      {
        type: "div",
        props: {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginTop: 26,
            fontSize: 25,
            color: MUTED,
          },
          children: [
            {
              type: "div",
              props: { style: { display: "flex", maxWidth: 780 }, children: site.description ?? "" },
            },
            {
              type: "div",
              props: {
                style: { display: "flex", color: INK, whiteSpace: "nowrap", marginLeft: 32 },
                children: (site.url ?? "").replace(/^https?:\/\//, ""),
              },
            },
          ],
        },
      },
    ],
  },
};

const response = new ImageResponse(card, SIZE);
const out = path.join(root, "public", "og.png");
fs.writeFileSync(out, Buffer.from(await response.arrayBuffer()));
console.log(`Wrote ${path.relative(root, out)} (${SIZE.width}x${SIZE.height})`);
