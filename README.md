# Portfolio

A single-scroll portfolio site with index pages for projects and writing, built
to be forked and filled in.

**All copy lives in `content/*.yaml`.** The code in `src/` is template only and
hardcodes no text — no project title, no course name, no URL. To change what the
site says, edit YAML; you never need to open a `.tsx` file.

Built with Next.js (App Router), Tailwind CSS v4, and shadcn/ui. It exports to
plain static files, so GitHub Pages hosts it for free.

---

## Use this template

**1. Make your own copy.** Click **Use this template → Create a new repository**
at the top of this repo. Name it whatever you like — `username.github.io` gives
you `https://username.github.io`, anything else gives you
`https://username.github.io/repo-name`.

**2. Run it.**

```bash
git clone https://github.com/<you>/<your-repo>.git
cd <your-repo>
npm install
npm run dev          # http://localhost:3000
```

**3. Make it yours.** Work through [the checklist](#the-checklist) below. Start
with `content/site.yaml` and `content/hero.yaml` — between them they cover the
title, the nav and everything above the fold.

**4. Turn on Pages.** In your repo: **Settings → Pages → Build and deployment →
Source → GitHub Actions**. That is the only setting to change; the workflow in
`.github/workflows/deploy.yml` is already committed.

**5. Push.** Every push to `main` builds and deploys. The first run takes a
couple of minutes; watch it under the **Actions** tab.

### If your repo is not `username.github.io`

A project repo is served from a sub-path, which the export needs to know about.
Add this to `next.config.ts`:

```ts
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: "/your-repo-name",        // add this
  images: { unoptimized: true },
};
```

### Using your own domain

Set the domain under **Settings → Pages → Custom domain**, point a `CNAME`
record at `<username>.github.io` with your DNS provider, and leave `basePath`
out. Either way, set `url:` in `content/site.yaml` to the address the site will
actually live at — link previews, `sitemap.xml` and `robots.txt` are all built
from it.

---

## The checklist

Everything below ships with this template as *my* content. Replace it.

**Words** — every file in `content/` is commented; read the comments as you go.

- [ ] `site.yaml` — title, description, `url`, nav, footer
- [ ] `hero.yaml` — name, title, tagline, location, buttons, credential badges
- [ ] `education.yaml`, `research.yaml`, `projects.yaml`, `blogs.yaml`,
      `skills.yaml`, `certifications.yaml`, `contact.yaml`, `news.yaml`
- [ ] `documents.yaml` — résumé and anything else worth handing someone
- [ ] `songs.yaml` — the music behind the vibe button
- [ ] Delete `content/blog/*.md` and `content/projects/*.md`, and write your own

**Files** — replace these in `public/`, then point the YAML at your names:

- [ ] `public/sexy-arnav.jpeg` — your portrait (`hero.yaml: photo`)
- [ ] `public/logos/` — institution and credential marks
- [ ] `public/projects/`, `public/blog/` — thumbnails, ideally 1600×900
- [ ] `public/documents/`, `public/certifications/` — your own files
- [ ] `public/audio/` — your own music, and mind the licence if the site is public
- [ ] `public/og.png` — regenerate with `npm run og` once the YAML is yours
- [ ] `src/app/favicon.ico`

**Wiring**

- [ ] `package.json` — the `activity` script ends in `namesarnav`; put your own
      GitHub username there, or delete the `activity:` block from `skills.yaml`
      to drop the contribution grid
- [ ] `CLAUDE.md`, `AGENTS.md`, `design.md` — notes to myself about this repo.
      Keep them if you use an AI assistant, delete them otherwise.

---

## Running it

```bash
npm run dev       # http://localhost:3000
npm run build     # static export into out/ — fails loudly if the YAML is wrong
npm start
npm run lint
npm run og        # regenerate the link-preview image from your YAML
npm run activity  # refresh the GitHub contribution grid
```

`npm run build` is the real test. The schema checks every file, every asset path
and every slug, so a typo stops the build with the file, the field and the
reason rather than shipping as a blank space or a dead link.

---

## Editing content

| File | What it controls |
| --- | --- |
| `content/site.yaml` | Title, description, canonical URL, nav, footer, 404 copy, vibe-button settings |
| `content/hero.yaml` | Name, title, tagline, location, buttons, credential badges |
| `content/news.yaml` | The rotating "latest" line under the hero |
| `content/education.yaml` | Schools, with logos, coursework, awards |
| `content/research.yaml` | Papers and preprints |
| `content/projects.yaml` | Projects, their detail pages, and the button labels |
| `content/blogs.yaml` | Posts |
| `content/skills.yaml` | Skill groups and the contribution grid |
| `content/certifications.yaml` | Credentials |
| `content/documents.yaml` | The `/documents` page |
| `content/songs.yaml` | The vibe button's playlist |
| `content/contact.yaml` | Email, phone, socials |
| `content/blog/<slug>.md` | A post's body, in Markdown |
| `content/projects/<slug>.md` | A project write-up, in Markdown |

Three rules cover almost everything:

1. **Optional means optional.** Delete a field and it renders nothing — no empty
   label, no placeholder. A blank value (`grade: ""`) counts as deleted.
2. **Lists grow and shrink.** Add or remove entries under `items:` / `groups:`
   freely; the layout adapts. An empty section hides itself.
3. **Buttons follow the data.** A project's *Code* and *Try it here* buttons
   appear only when `links.code` / `links.demo` exist. Contact's socials work the
   same way: list only the ones you use.

### Pages

Beyond the home page, the build generates:

| URL | From |
| --- | --- |
| `/projects` | Every project, as a grid |
| `/blog` | Every post, as a grid, filed by year |
| `/projects/<slug>`, `/blog/<slug>` | One page per entry that has a body |
| `/documents` | `documents.yaml` |
| `/sitemap.xml`, `/robots.txt` | Generated from `site.yaml` |

The nav in `site.yaml` points at pages (`/projects`) or at home-page sections
(`/#skills`). Write section links as `/#id`, not `#id`, so they also work from a
page that is not the home page.

`/documents` is deliberately **not** in the nav and not in the sitemap — it is a
personal page. Note that "not linked" is not "private": it is still a public file
that anyone with the URL can open.

### Education

Each entry carries the institution and dates, the qualification, where it was and
how it went, then optional blocks for affiliations, awards, and coursework.

- `logo` — the school's mark, from `public/`. Without one, the entry shows the
  school's initials in its own colour, so the column still lines up.
- `color` tints the institution name — hex only, since it goes into a style
  attribute. Dark mode lightens it automatically; `color_dark` overrides that.
- `dates` is free text: `"01/23 – 05/26"` and `"Expected 05/28"` both work.
- `degree` and `field` join with a middot, as do `location` and `grade`.
- `transcript` adds a **View transcript** button. Point it at a file in `public/`
  or a full URL.
- `coursework` is a list of `{ name, grade }`; the grade prints in green and is
  free text — `A+`, `In progress`, whatever fits.

### Projects

Each entry is one full-width row on the home page — thumbnail left, then title,
description, tags and buttons — and one card on `/projects`.

- `slug` — lowercase-with-hyphens; it becomes the detail page URL.
- `thumbnail` — a path under `public/`. Cropped to 16:9 from the centre.
- `links.demo` — the filled **Try it here** button, first in the row.
- `links.code` — an outline button carrying the GitHub mark.
- A body — either a `details:` list of `{ heading, body }` blocks, or a file at
  `content/projects/<slug>.md` — generates `/projects/<slug>` and a **Read more**
  button. Having both is an error, and the build says so. `links.read_more`
  points that button somewhere external instead.
- `initial_count` — how many rows show before **View more** on the home page.
  `0` shows everything. Hidden rows stay in the HTML for search engines.
- `labels` — what the three buttons say, if you want different words.

### Writing

Posts work the same way, with a date and reading time under the title, and two
independent ways to be read:

- `url:` — where the post is published elsewhere. Adds **Read post**.
- A body (`details:` or `content/blog/<slug>.md`) — generates `/blog/<slug>` and
  adds **Read more**. A post with a body needs a `slug`; one that only links out
  does not.

Markdown bodies support GFM, ```mermaid diagrams, and `$…$` LaTeX rendered at
build time. On `/blog`, posts are grouped by year, newest first; `date` is free
text, and a post without one sorts last.

### Skills

Each item is a plain string or a `{ name, level }` pair. Levels shade the pill:
`proficient` green, `working` blue, `beginner` grey. A plain string means
`working`.

```yaml
items:
  - { name: "Python", level: proficient }
  - "SQL"                                  # same as level: working
```

Brand marks are matched automatically from the name — "PyTorch" finds PyTorch's
logo — via [simple-icons](https://simpleicons.org). A skill with no match simply
shows none. Override with `icon:` — a simple-icons slug (`icon: nextdotjs`), a
path in `public/`, or `icon: false` to drop it.

`legend:` labels the colour key; delete a level to drop it, or the whole block to
hide the key. `activity:` draws the GitHub contribution grid — see the checklist
for the username.

### The vibe button

The top bar carries a **Click here to vibe** button. On wide screens it pins
itself to the top-right corner of the viewport; narrower, it stays in the header
row as a compact waveform. Clicking it plays music and pops a card in the
bottom-right corner naming the track, which fades after five seconds; hovering
the button brings it back. Nothing downloads until someone clicks.

Add music by dropping the file into `public/audio/` and listing it:

```yaml
# content/songs.yaml
tracks:
  - file: "Droopy Likes Richochet, C418.mp3"
    title: "Droopy Likes Ricochet"
    artist: "C418"
```

`title` and `artist` are optional — leave them out and the name is read from the
filename, parsed as `Song Name, Artist.mp3` (split on the *last* comma). A file
in the folder with no entry still plays, last. A listed file that is not there
fails the build.

Empty the folder and the button disappears. Settings — labels, `loop`, `shuffle`,
`volume` — live under `vibe:` in `site.yaml`.

### Documents

`/documents` lists files to hand someone: résumé, transcripts, certificate
copies. Each entry points at a file in `public/` and is filed under a free-text
`group`, in the order the groups first appear.

### Research

`status` carries the whole truth about where a paper stands — `"Under review,
2026"` while it is out, the venue once accepted. `stage` colours the dot.
`highlight_author` is your name, bolded wherever it appears in an `authors` list.

Naming a venue while a paper is under review is only safe if that venue's
anonymity policy allows it; `"Under review, 2026"` works everywhere.

### Contact socials

Rendered in this order: `github`, `linkedin`, `huggingface`, `hashnode`,
`medium`, `youtube`, `google_scholar`, `open_review`, `instagram`, `spotify`.

---

## How it's put together

```
content/                            ← the only files you edit day to day
public/                             ← every image, document and track
src/lib/content.ts                  ← reads and validates the YAML, one schema per file
src/lib/markdown.ts                 ← Markdown, Mermaid and LaTeX, at build time
src/components/sections/            ← one component per home-page section
src/components/section.tsx          ← the shared section shell
src/components/card-grid.tsx        ← the /projects and /blog grids
src/app/globals.css                 ← the palette, as CSS variables
src/app/projects/[slug]/            ← generated project pages
src/app/blog/[slug]/                ← generated post pages
src/app/{robots,sitemap}.ts         ← generated from site.yaml
.github/workflows/deploy.yml        ← build and deploy on push to main
```

**Design.** Light by default, with a toggle in the top bar. White page and near
black ink in light mode; `#090809` under white in dark. Structure comes from type
and hairlines rather than boxes and shadows. Google Sans throughout. Scrolling is
eased with [Lenis](https://github.com/darkroomengineering/lenis); every animation
on the site stops under `prefers-reduced-motion`.

**Adding a field.** Extend the schema in `src/lib/content.ts`, then read it in the
matching component under `src/components/sections/`. Keep the string in YAML.

## Licence

The code is [MIT](LICENSE) — use it, change it, ship it.

The content is not. Everything in `content/`, and everything in `public/` —
photographs, logos, documents, music — belongs to me and is only here so the
template has something to render. Replace it with your own.
