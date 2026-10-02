import "server-only";

import fs from "node:fs";
import path from "node:path";

import { load as parseYaml } from "js-yaml";
import { z } from "zod";

import { hasBody, listBodies } from "@/lib/markdown";

/**
 * Every piece of copy on this site comes from `content/*.yaml`.
 * Nothing below hardcodes text — it only describes the shape the YAML must take.
 *
 * Adding a field: extend the schema here, then read it in the matching section
 * component. Optional fields are genuinely optional: when they are absent the
 * component renders nothing for them, no placeholders.
 */

const CONTENT_DIR = path.join(process.cwd(), "content");
const PUBLIC_DIR = path.join(process.cwd(), "public");

/** A string that is present and not just whitespace. Blank values are treated as absent. */
const nonEmpty = z.string().trim().min(1);

/** Optional text: missing, null, or blank all collapse to `undefined`. */
const optionalText = z
  .union([z.string(), z.number(), z.null()])
  .transform((value) => {
    if (value === null) return undefined;
    const text = String(value).trim();
    return text.length > 0 ? text : undefined;
  })
  .optional();

const optionalList = z.array(nonEmpty).optional().default([]);

/**
 * Dates are free-form. YAML may hand us a real date (`2026-05-04`) or a string
 * (`"Spring 2026"`); both are kept as text and only reformatted when they parse.
 */
const optionalDate = z
  .union([z.string(), z.date(), z.null()])
  .transform((value) => {
    if (value === null) return undefined;
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    const text = value.trim();
    return text.length > 0 ? text : undefined;
  })
  .optional();

// ---------------------------------------------------------------- site

const siteSchema = z.object({
  title: nonEmpty,
  description: optionalText,
  url: optionalText,
  /**
   * The link-preview card, as a path in `public/`. Regenerate it with
   * `npm run og` after changing the name, title, description or portrait.
   */
  og_image: optionalText,
  og_image_alt: optionalText,
  brand: optionalText,
  /** The "back" link at the top of every standalone page. Falls back to `title`. */
  back_label: optionalText,
  nav: z
    .array(z.object({ label: nonEmpty, href: nonEmpty }))
    .optional()
    .default([]),
  footer: optionalText,
  /**
   * Copy for the 404 page. Every field falls back to a sensible default, so the
   * block can be trimmed to just the lines worth changing.
   */
  not_found: z
    .object({
      code: optionalText,
      heading: optionalText,
      message: optionalText,
      home_label: optionalText,
      /** Links offered under the message. Falls back to the main nav. */
      links: z
        .array(z.object({ label: nonEmpty, href: nonEmpty }))
        .optional(),
    })
    .optional()
    .default({}),
  /**
   * The "click here to vibe" button in the header. Drop the whole block — or
   * just `src` — and the button never renders.
   */
  vibe: z
    .object({
      /**
       * Leave this out and every audio file in `public/audio/` is picked up,
       * sorted by name — dropping a file in is all it takes. Set it to take
       * control of the order, or to name a track something other than its
       * filename.
       */
      tracks: z
        .array(
          z.union([
            nonEmpty.transform((src) => ({
              src,
              title: undefined as string | undefined,
              artist: undefined as string | undefined,
            })),
            z.object({ src: nonEmpty, title: optionalText, artist: optionalText }),
          ]),
        )
        .optional(),
      label: optionalText,
      playing_label: optionalText,
      /** The line above the track name in the corner toast. */
      now_playing_label: optionalText,
      /** Start again at the top of the playlist when the last track ends. */
      loop: z.boolean().optional().default(true),
      /** Play in a random order each time. */
      shuffle: z.boolean().optional().default(false),
      volume: z.number().min(0).max(1).optional().default(0.7),
    })
    .optional()
    .default({ loop: true, shuffle: false, volume: 0.7 }),
});

export const SOCIAL_KEYS = [
  "github",
  "linkedin",
  "huggingface",
  "hashnode",
  "medium",
  "youtube",
  "google_scholar",
  "open_review",
  "instagram",
  "spotify",
] as const;

export type SocialKey = (typeof SOCIAL_KEYS)[number];

/**
 * The "View GitHub" / "View Google Scholar" buttons that sit at the foot of a
 * section. Naming a `social` borrows that platform's icon and label, so
 * `{ social: github, href: ... }` renders as "View GitHub" with the right mark.
 * A `label` overrides the generated text; an entry with no `social` is a plain
 * button and gets no icon.
 */
const sectionActionsSchema = z
  .array(
    z
      .object({
        social: z.enum(SOCIAL_KEYS).optional(),
        label: optionalText,
        href: nonEmpty,
      })
      .refine((action) => action.social || action.label, {
        message: "needs a `social` or a `label` — otherwise the button has no text",
      }),
  )
  .optional()
  .default([]);

// ---------------------------------------------------------------- hero

const heroSchema = z.object({
  name: nonEmpty,
  title: nonEmpty,
  tagline: optionalText,
  location: optionalText,
  /** A file in `public/` (or a full URL). Omit it and the hero is text only. */
  photo: optionalText,
  /**
   * Screen-reader description. Defaults to the name, which is the right answer
   * for a portrait — override it only if the picture is of something else.
   */
  photo_alt: optionalText,
  /**
   * Credential badges under the tagline — a logo and its name. `href` makes the
   * whole chip a link to the credential. Drop the block and none render.
   */
  badges: z
    .array(
      z.object({
        image: nonEmpty,
        label: nonEmpty,
        href: optionalText,
      }),
    )
    .optional()
    .default([]),
  actions: z
    .array(
      z.object({
        label: nonEmpty,
        href: nonEmpty,
        variant: z.enum(["primary", "secondary"]).optional().default("secondary"),
      }),
    )
    .optional()
    .default([]),
});

// ---------------------------------------------------------------- news

const newsSchema = z.object({
  /** The small word in front of the line — "Latest", "News", "Now". */
  label: optionalText,
  /**
   * Seconds each item holds before the next fades in. Long enough to finish
   * reading a line without hurrying, which is the whole point of the pause.
   */
  interval: z.number().min(2).max(60).optional().default(6),
  items: z
    .array(z.object({ text: nonEmpty, href: optionalText }))
    .optional()
    .default([]),
});

// ---------------------------------------------------------------- education

const educationSchema = z.object({
  heading: nonEmpty,
  actions: sectionActionsSchema,
  blurb: optionalText,
  items: z
    .array(
      z.object({
        institution: nonEmpty,
        /**
         * The school's mark, as a file in `public/`. Leave it out and the entry
         * shows a monogram in the institution's own colour instead, so the
         * column still lines up.
         */
        logo: optionalText,
        /**
         * The institution's own colour, as hex. Hex only — it is written
         * straight into a style attribute, so nothing else is accepted.
         */
        color: nonEmpty
          .regex(/^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i, "must be a hex colour, e.g. #57068C")
          .optional(),
        /** Overrides the auto-lightened colour used in dark mode. */
        color_dark: nonEmpty
          .regex(/^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i, "must be a hex colour, e.g. #B98FE0")
          .optional(),
        degree: optionalText,
        field: optionalText,
        location: optionalText,
        /** Free text — "01/23 – 05/26", "Expected 05/28", anything. */
        dates: optionalText,
        grade: optionalText,
        /** A file in `public/` or a full URL. Adds a "View transcript" button. */
        transcript: optionalText,
        affiliations: optionalList,
        awards: optionalList,
        coursework: z
          .array(z.object({ name: nonEmpty, grade: optionalText }))
          .optional()
          .default([]),
      }),
    )
    .optional()
    .default([]),
});

// ---------------------------------------------------------------- research

/**
 * Where a paper is in its life. Only the colour of the dot depends on this —
 * the words the reader sees are whatever `status` says.
 */
export const PAPER_STAGES = [
  "accepted",
  "published",
  "under_review",
  "preprint",
  "in_progress",
] as const;

export type PaperStage = (typeof PAPER_STAGES)[number];

const paperSchema = z.object({
  title: nonEmpty,
  authors: optionalList,
  /**
   * Where the paper stands, in full: "Under review, 2026" while it is out,
   * the venue once it is accepted. One field, so nothing else changes later.
   */
  status: optionalText,
  /**
   * Colours the dot on the status pill: green for accepted or published,
   * amber for under review, blue for a preprint, grey for work in progress.
   * Leave it out and the pill is plain grey with no dot.
   */
  stage: z.enum(PAPER_STAGES).optional(),
  year: optionalText,
  summary: optionalText,
  links: z
    .object({
      pdf: optionalText,
      arxiv: optionalText,
      code: optionalText,
      doi: optionalText,
    })
    .optional()
    .default({}),
});

const researchSchema = z.object({
  heading: nonEmpty,
  actions: sectionActionsSchema,
  blurb: optionalText,
  /** Bolded wherever it turns up in an author list. */
  highlight_author: optionalText,
  items: z.array(paperSchema).optional().default([]),
});

// ---------------------------------------------------------------- projects

const projectSchema = z.object({
  slug: nonEmpty.regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "must be lowercase words joined by hyphens, e.g. my-project",
  ),
  title: nonEmpty,
  description: optionalText,
  thumbnail: optionalText,
  tags: optionalList,
  links: z
    .object({
      code: optionalText,
      demo: optionalText,
      /** An external "Read more" target. Overrides the generated detail page. */
      read_more: optionalText,
    })
    .optional()
    .default({}),
  details: z
    .array(z.object({ heading: optionalText, body: nonEmpty }))
    .optional()
    .default([]),
});

const projectsSchema = z.object({
  heading: nonEmpty,
  actions: sectionActionsSchema,
  blurb: optionalText,
  /**
   * What the three buttons on a project say. Every one falls back to its own
   * wording, so the block can be trimmed to just the line worth changing.
   */
  labels: z
    .object({ demo: optionalText, code: optionalText, read_more: optionalText })
    .optional()
    .default({}),
  /** How many rows show before the "View more" button. 0 shows everything. */
  initial_count: z.number().int().min(0).optional().default(3),
  items: z
    .array(projectSchema)
    .optional()
    .default([])
    .refine(
      (items) => new Set(items.map((item) => item.slug)).size === items.length,
      { message: "two projects share a slug — each one is a URL, so they must be unique" },
    ),
});

// ---------------------------------------------------------------- blogs

const blogSchema = z.object({
  /** Only required when the post carries `details`, since that becomes its URL. */
  slug: nonEmpty
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "must be lowercase words joined by hyphens, e.g. my-post",
    )
    .optional(),
  title: nonEmpty,
  description: optionalText,
  date: optionalDate,
  reading_time: optionalText,
  thumbnail: optionalText,
  tags: optionalList,
  /** Where the post is published, if anywhere. */
  url: optionalText,
  details: z
    .array(z.object({ heading: optionalText, body: nonEmpty }))
    .optional()
    .default([]),
});

const blogsSchema = z.object({
  heading: nonEmpty,
  actions: sectionActionsSchema,
  blurb: optionalText,
  /** How many rows show before the "View more" button. 0 shows everything. */
  initial_count: z.number().int().min(0).optional().default(3),
  items: z
    .array(blogSchema)
    .optional()
    .default([])
    .refine(
      (items) => items.every((item) => item.details.length === 0 || item.slug),
      { message: "a post with `details` also needs a `slug` — that becomes its URL" },
    ),
});

// ---------------------------------------------------------------- skills

/**
 * Proficiency shades a skill's pill. The order here is the order the legend
 * renders in, strongest first.
 */
export const SKILL_LEVELS = ["proficient", "working", "beginner"] as const;

export type SkillLevel = (typeof SKILL_LEVELS)[number];

/** A bare string is shorthand for a skill at the middle level. */
const skillItemSchema = z.union([
  nonEmpty.transform((name) => ({
    name,
    level: "working" as SkillLevel,
    icon: undefined as string | false | undefined,
  })),
  z.object({
    name: nonEmpty,
    level: z.enum(SKILL_LEVELS).optional().default("working"),
    /**
     * Overrides the mark matched from the name: either a simple-icons slug
     * ("nextdotjs") or a file in `public/`. `false` drops the mark entirely.
     */
    icon: z.union([nonEmpty, z.literal(false)]).optional(),
  }),
]);

const skillsSchema = z.object({
  heading: nonEmpty,
  actions: sectionActionsSchema,
  blurb: optionalText,
  /**
   * Labels for the colour key. Drop a level's label and it vanishes from the
   * legend; drop the whole block and no legend renders at all.
   */
  legend: z
    .object(
      Object.fromEntries(SKILL_LEVELS.map((level) => [level, optionalText])) as {
        [K in SkillLevel]: typeof optionalText;
      },
    )
    .optional()
    .default({}),
  groups: z
    .array(
      z.object({
        name: nonEmpty,
        items: z.array(skillItemSchema).optional().default([]),
      }),
    )
    .optional()
    .default([]),
  /**
   * The contribution strip under the skill groups. The squares come from
   * content/generated/github-activity.json, refreshed on every deploy — only
   * the settings live here. Drop the block and the strip disappears.
   */
  activity: z
    .object({
      label: optionalText,
      /** How far back the strip reaches. Twelve is the full GitHub year. */
      months: z.number().int().min(1).max(12).optional().default(6),
    })
    .optional(),
});

// ---------------------------------------------------------------- certifications

const certificationsSchema = z.object({
  heading: nonEmpty,
  actions: sectionActionsSchema,
  blurb: optionalText,
  items: z
    .array(
      z.object({
        title: nonEmpty,
        /**
         * A badge or certificate image in `public/`. Badges are square and
         * certificates are landscape, so the frame letterboxes rather than
         * crops — nothing is cut off whichever you have.
         */
        thumbnail: optionalText,
        description: optionalText,
        /** Free text, so "Issued Mar 2026" and "2026-03-14" both work. */
        date: optionalText,
        /** Renders the "View credential" button. Omit it and no button shows. */
        credential_id: optionalText,
        credential: optionalText,
      }),
    )
    .optional()
    .default([]),
});

// ---------------------------------------------------------------- documents

/**
 * The filing cabinet: résumé, transcripts, certificate copies. Every entry is a
 * file in `public/` (or a full URL) plus the words that describe it — `group`
 * is free text and becomes the sub-heading the document is filed under, in the
 * order the groups first appear.
 */
const documentsSchema = z.object({
  heading: nonEmpty,
  actions: sectionActionsSchema,
  blurb: optionalText,
  items: z
    .array(
      z.object({
        title: nonEmpty,
        description: optionalText,
        group: optionalText,
        /** Free text, so "Issued Mar 2026" and "2026-03-14" both work. */
        date: optionalText,
        /** A file in `public/` or a full URL. */
        file: nonEmpty,
        /** Shown on the button — "PDF", "PNG". Falls back to the extension. */
        kind: optionalText,
        /** A preview image in `public/`. Omit it and a file glyph shows. */
        thumbnail: optionalText,
      }),
    )
    .optional()
    .default([]),
});

// ---------------------------------------------------------------- contact

/**
 * The order here is the order the buttons render in. A social is shown only when
 * the YAML carries a non-blank value for it.
 */
const contactSchema = z.object({
  heading: nonEmpty,
  actions: sectionActionsSchema,
  blurb: optionalText,
  email: optionalText,
  phone: optionalText,
  socials: z
    .object(Object.fromEntries(SOCIAL_KEYS.map((key) => [key, optionalText])) as {
      [K in SocialKey]: typeof optionalText;
    })
    .optional()
    .default({}),
});

// ---------------------------------------------------------------- types

export type Site = z.infer<typeof siteSchema>;
export type Certification = z.infer<typeof certificationsSchema>["items"][number];
export type Hero = z.infer<typeof heroSchema>;
export type Education = z.infer<typeof educationSchema>;
export type Research = z.infer<typeof researchSchema>;
export type Paper = z.infer<typeof paperSchema>;
export type Projects = z.infer<typeof projectsSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Blogs = z.infer<typeof blogsSchema>;
export type Blog = z.infer<typeof blogSchema>;
export type News = z.infer<typeof newsSchema>;
export type NewsItem = News["items"][number];
export type Skills = z.infer<typeof skillsSchema>;
export type Contact = z.infer<typeof contactSchema>;
export type Documents = z.infer<typeof documentsSchema>;
export type DocumentItem = Documents["items"][number];
export type Skill = Skills["groups"][number]["items"][number];
export type EducationItem = Education["items"][number];


// ---------------------------------------------------------------- loading

function readYaml(file: string): unknown {
  const filePath = path.join(CONTENT_DIR, `${file}.yaml`);
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, "utf8");
  } catch {
    throw new Error(
      `Missing content file: content/${file}.yaml — every section reads its copy from there.`,
    );
  }
  try {
    return parseYaml(raw) ?? {};
  } catch (error) {
    throw new Error(
      `content/${file}.yaml is not valid YAML.\n${(error as Error).message}`,
    );
  }
}

/**
 * A thumbnail pointing into `public/` has to actually be there. A missing file
 * renders as an empty frame and reports nothing, which is easy to ship without
 * noticing — so it fails the build instead.
 */
function assertAssetsExist(file: string, paths: (string | undefined)[]) {
  const referenced = [...new Set(paths.filter((p): p is string => !!p))];
  const missing = referenced
    .filter((p) => p.startsWith("/"))
    // The YAML holds a URL path, so %20 and friends have to come back out
    // before it can be matched against a filename on disk.
    .filter((p) => {
      let filePath = p;
      try {
        filePath = decodeURIComponent(p);
      } catch {
        // A malformed escape just falls through to the literal path.
      }
      return !fs.existsSync(path.join(PUBLIC_DIR, filePath));
    });

  if (missing.length > 0) {
    throw new Error(
      `content/${file}.yaml points at files that are not in public/:\n` +
        missing.map((p) => `  \u2022 ${p}`).join("\n"),
    );
  }
}

function load<T extends z.ZodType>(file: string, schema: T): z.infer<T> {
  const result = schema.safeParse(readYaml(file));
  if (result.success) return result.data;

  const problems = result.error.issues
    .map((issue) => `  • ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
  throw new Error(`content/${file}.yaml does not match the expected shape:\n${problems}`);
}

const AUDIO_DIR = path.join(PUBLIC_DIR, "audio");
const AUDIO_EXTENSIONS = new Set([".mp3", ".m4a", ".aac", ".ogg", ".oga", ".opus", ".wav", ".flac", ".webm"]);

/** Every audio file in `public/audio/`, in name order. */
function audioFiles(): string[] {
  try {
    return fs
      .readdirSync(AUDIO_DIR)
      .filter((file) => AUDIO_EXTENSIONS.has(path.extname(file).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, "en", { numeric: true, sensitivity: "base" }));
  } catch {
    return [];
  }
}

/**
 * The playlist, from `content/songs.yaml`. Rows play in the order they are
 * written; `title` and `artist` may be left out, and a track without them is
 * named from its filename, which is read as `Song, Artist.mp3`.
 */
const songsSchema = z.object({
  tracks: z
    .array(z.object({ file: nonEmpty, title: optionalText, artist: optionalText }))
    .optional()
    .default([]),
});

function songsPlaylist(): { src: string; title?: string; artist?: string }[] {
  // The file is optional: with no songs.yaml at all, the folder is the playlist.
  if (!fs.existsSync(path.join(CONTENT_DIR, "songs.yaml"))) {
    return audioFiles().map((file) => ({
      src: `/audio/${encodeURIComponent(file)}`,
      title: undefined,
      artist: undefined,
    }));
  }

  const { tracks } = load("songs", songsSchema);

  const available = new Set(audioFiles());
  const missing = tracks.filter((track) => !available.has(track.file));
  if (missing.length > 0) {
    throw new Error(
      `content/songs.yaml lists ${missing.length > 1 ? "files" : "a file"} that ` +
        `${missing.length > 1 ? "are" : "is"} not in public/audio/:\n` +
        missing.map((track) => `  \u2022 ${track.file}`).join("\n") +
        "\nAdd the file, or delete the entry.",
    );
  }

  const listed = new Set(tracks.map((track) => track.file));

  return [
    ...tracks,
    // A file dropped into the folder still plays without being written down —
    // it just goes last, and is named from its filename.
    ...audioFiles()
      .filter((file) => !listed.has(file))
      .map((file) => ({ file, title: undefined, artist: undefined })),
  ].map((track) => ({
    // Filenames go into a URL, so each one is encoded — spaces and other
    // awkward characters survive the trip.
    src: `/audio/${encodeURIComponent(track.file)}`,
    title: track.title,
    artist: track.artist,
  }));
}

export const getSite = () => {
  const site = load("site", siteSchema);

  // An explicit list in site.yaml still wins; otherwise songs.yaml is the
  // playlist, and it falls back to the folder when that file is not there.
  const tracks = site.vibe.tracks ?? songsPlaylist();
  assertAssetsExist("site", tracks.map((track) => track.src));

  return { ...site, vibe: { ...site.vibe, tracks } };
};
export const getHero = () => {
  const hero = load("hero", heroSchema);
  assertAssetsExist("hero", [hero.photo, ...hero.badges.map((b) => b.image)]);
  return hero;
};
export const getNews = () => load("news", newsSchema);
export const getEducation = () => {
  const education = load("education", educationSchema);
  assertAssetsExist("education", education.items.map((item) => item.logo));
  return education;
};
export const getResearch = () => load("research", researchSchema);
export const getProjects = () => {
  const projects = load("projects", projectsSchema);
  assertAssetsExist("projects", projects.items.map((item) => item.thumbnail));
  assertBodiesMatch("projects", "projects.yaml", projects.items);
  return projects;
};
export const getBlogs = () => {
  const blogs = load("blogs", blogsSchema);
  assertAssetsExist("blogs", blogs.items.map((item) => item.thumbnail));

  assertBodiesMatch("blog", "blogs.yaml", blogs.items);

  return blogs;
};
/**
 * A Markdown file with no matching entry is unreachable, and an entry with both
 * a `details:` block and a file has one body that is dead text. Both are silent
 * failures, so both stop the build.
 */
function assertBodiesMatch(
  collection: "blog" | "projects",
  yamlFile: string,
  items: { slug?: string; details: unknown[] }[],
) {
  const slugs = new Set(items.flatMap((item) => (item.slug ? [item.slug] : [])));

  const orphans = listBodies(collection).filter((slug) => !slugs.has(slug));
  if (orphans.length > 0) {
    throw new Error(
      `content/${collection}/ has ${orphans.length > 1 ? "files" : "a file"} with no entry in ` +
        `${yamlFile}, so nothing links to ${orphans.length > 1 ? "them" : "it"}:\n` +
        orphans
          .map((slug) => `  - ${slug}.md (add an item with slug: "${slug}")`)
          .join("\n"),
    );
  }

  const doubled = items.filter(
    (item) => item.details.length > 0 && hasBody(collection, item.slug),
  );
  if (doubled.length > 0) {
    throw new Error(
      "these entries have both a `details:` block and a Markdown file — keep one:\n" +
        doubled
          .map(
            (item) =>
              `  - ${item.slug} (drop the details: block, or delete content/${collection}/${item.slug}.md)`,
          )
          .join("\n"),
    );
  }
}

export const getSkills = () => {
  const skills = load("skills", skillsSchema);
  /* An `icon:` holding a path has to point at a real file; a bare slug is a
     simple-icons name and is resolved at render time instead. */
  assertAssetsExist(
    "skills",
    skills.groups.flatMap((group) =>
      group.items.map((item) =>
        typeof item.icon === "string" && item.icon.startsWith("/") ? item.icon : undefined,
      ),
    ),
  );
  return skills;
};
export const getCertifications = () => {
  const certifications = load("certifications", certificationsSchema);
  assertAssetsExist(
    "certifications",
    certifications.items.map((item) => item.thumbnail),
  );
  return certifications;
};
export const getDocuments = () => {
  const documents = load("documents", documentsSchema);
  assertAssetsExist("documents", [
    ...documents.items.map((item) => item.file),
    ...documents.items.map((item) => item.thumbnail),
  ]);
  return documents;
};
export const getContact = () => load("contact", contactSchema);

/** Looks up one project by its slug, for the generated detail pages. */
export function getProject(slug: string): Project | undefined {
  return getProjects().items.find((project) => project.slug === slug);
}

/** Looks up one post by its slug, for the generated detail pages. */
export function getBlog(slug: string): Blog | undefined {
  return getBlogs().items.find((post) => post.slug === slug);
}

/** The on-site page for a post, when it has one. */
export function blogDetailHref(post: Blog): string | undefined {
  if (!post.slug) return undefined;
  // Either source of a body earns the post a page here.
  const hosted = post.details.length > 0 || hasBody("blog", post.slug);
  return hosted ? `/blog/${post.slug}` : undefined;
}

/**
 * Renders a date as "4 May 2026" when it parses, and verbatim when it does not —
 * so "Spring 2026" survives untouched. Fixed locale, since only the server
 * renders it.
 */
export function formatDate(value?: string): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

/** The URL for a project's "Read more", or `undefined` when there is nothing to read. */
export function readMoreHref(project: Project): string | undefined {
  if (project.links.read_more) return project.links.read_more;
  // Either source of a body earns the project a page here.
  if (project.details.length > 0 || hasBody("projects", project.slug)) {
    return `/projects/${project.slug}`;
  }
  return undefined;
}

export type SectionAction = z.infer<typeof sectionActionsSchema>[number];
