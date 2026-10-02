import fs from "node:fs";
import path from "node:path";

import katex from "katex";
import { Marked } from "marked";

/**
 * Long-form bodies live in a folder named after what they belong to:
 * `content/blog/<slug>.md` for a post, `content/projects/<slug>.md` for a
 * project write-up. Both render the same way.
 */
export type Collection = "blog" | "projects";

const collectionDir = (collection: Collection) =>
  path.join(process.cwd(), "content", collection);

/**
 * GFM, so tables, strikethrough and task lists work the way they do on
 * Hashnode or Medium. `breaks` stays off: a single newline in the source is
 * still just a wrap, which is how Markdown is normally written.
 */
const marked = new Marked({ gfm: true, breaks: false });

/**
 * A ```mermaid fence becomes `<pre class="mermaid">` holding the diagram
 * source, which is the shape mermaid itself looks for. Drawing it needs a
 * browser, so the source is passed through here and the client component picks
 * it up — see `MermaidDiagrams`.
 */
marked.use({
  renderer: {
    code({ text, lang }) {
      if (lang?.trim().toLowerCase() !== "mermaid") return false;
      return `<pre class="mermaid">${escapeHtml(text)}</pre>\n`;
    },
  },
});

/**
 * LaTeX, rendered to HTML here at build time rather than by a script in the
 * browser. The reader gets the equation in the first paint, and the page needs
 * no JavaScript to show it — only the KaTeX stylesheet, which the root layout
 * imports.
 *
 * Delimiters are the ones everyone already types: `$…$` and `\(…\)` inline,
 * `$$…$$` and `\[…\]` for a centred block.
 */
function renderMath(text: string, displayMode: boolean) {
  try {
    return katex.renderToString(text.trim(), {
      displayMode,
      // A typo should show up as a red equation on the page, not kill the build.
      throwOnError: false,
      strict: false,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return `<code class="math-error">${escapeHtml(text)} — ${escapeHtml(reason)}</code>`;
  }
}

/*
  Why the inline rule is fussy: prose is full of dollar signs, and "$100 to $200"
  must not become an equation. Two guards do that work without banning digits —
  maths like `$2^n$` and `$1/h^2$` is far too common to give up:

    - the closing `$` may not be preceded by a space, which kills "$100 to $200"
      and "$5 more" (the candidate content ends mid-space, so nothing pairs);
    - the closing `$` may not be followed by a digit, which kills "$100-$200",
      the one price form the first guard lets through.

  Neither `$` may be part of a `$$`, which belongs to the block rule.
*/
const INLINE_MATH = /^\$(?!\$)(?!\s)((?:\\.|[^\n$\\])+?)(?<![\s\\])\$(?!\$)(?!\d)/;
const INLINE_MATH_PAREN = /^\\\(([\s\S]+?)\\\)/;
const BLOCK_MATH = /^ {0,3}\$\$([\s\S]+?)\$\$(?:\n+|$)/;
const BLOCK_MATH_BRACKET = /^ {0,3}\\\[([\s\S]+?)\\\](?:\n+|$)/;

marked.use({
  extensions: [
    {
      name: "mathBlock",
      level: "block",
      start: (src: string) => {
        const dollars = src.indexOf("$$");
        const bracket = src.indexOf("\\[");
        if (dollars === -1) return bracket === -1 ? undefined : bracket;
        return bracket === -1 ? dollars : Math.min(dollars, bracket);
      },
      tokenizer(src: string) {
        const match = BLOCK_MATH.exec(src) ?? BLOCK_MATH_BRACKET.exec(src);
        if (!match) return undefined;
        return { type: "mathBlock", raw: match[0], text: match[1] };
      },
      // marked types a custom token as Generic, so the text comes back untyped.
      renderer: (token) => renderMath(String(token.text ?? ""), true),
    },
    {
      name: "mathInline",
      level: "inline",
      start: (src: string) => {
        const dollar = src.indexOf("$");
        const paren = src.indexOf("\\(");
        if (dollar === -1) return paren === -1 ? undefined : paren;
        return paren === -1 ? dollar : Math.min(dollar, paren);
      },
      tokenizer(src: string) {
        const match = INLINE_MATH.exec(src) ?? INLINE_MATH_PAREN.exec(src);
        if (!match) return undefined;
        return { type: "mathInline", raw: match[0], text: match[1] };
      },
      renderer: (token) => renderMath(String(token.text ?? ""), false),
    },
  ],
});

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Whether a rendered body contains any KaTeX output. */
export function hasMath(html?: string) {
  return !!html && html.includes("katex");
}

/** Whether a rendered post needs the mermaid bundle loaded at all. */
export function hasMermaid(html?: string) {
  return !!html && html.includes('<pre class="mermaid">');
}

/**
 * A body lives at `content/<collection>/<slug>.md` — drop the file in and the
 * page exists. Nothing needs registering; the slug in the YAML is the link
 * between the entry and its file.
 */
export function bodyPath(collection: Collection, slug: string) {
  return path.join(collectionDir(collection), `${slug}.md`);
}

export function hasBody(collection: Collection, slug?: string) {
  return !!slug && fs.existsSync(bodyPath(collection, slug));
}

/** Every slug with a Markdown file, whether or not the YAML knows about it. */
export function listBodies(collection: Collection): string[] {
  const dir = collectionDir(collection);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".md"))
    .map((name) => name.slice(0, -".md".length));
}

/**
 * Hashnode writes images as `![](url align="center")`. That trailing attribute
 * is not Markdown — the standard only allows a quoted title there — so `marked`
 * gives up on the whole image and leaves the raw text on the page. Pasting a
 * post straight out of Hashnode is the normal way content arrives here, so the
 * attributes are stripped rather than hand-edited out of every file.
 */
function stripImageAttributes(source: string) {
  return source.replace(
    /(!\[[^\]]*\]\()([^\s)]+)((?:\s+[a-zA-Z-]+="[^"]*")+)(\))/g,
    (_match, open, url, _attrs, close) => `${open}${url}${close}`,
  );
}

/**
 * Renders the body to HTML at build time. The Markdown is the site owner's own
 * file from this repo, so it is trusted and raw HTML in it is passed through
 * deliberately — that is what makes an embed or a footnote possible.
 */
export function renderBody(collection: Collection, slug: string): string | undefined {
  if (!hasBody(collection, slug)) return undefined;
  const source = fs.readFileSync(bodyPath(collection, slug), "utf8");
  return marked.parse(stripImageAttributes(source), { async: false });
}
