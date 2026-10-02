*Upload a resume in any format. Edit it with an assistant that sees the surrounding text. Export back out to PDF, DOCX or LaTeX.*

Word processors are good at formatting and bad at writing. Chat assistants are the
reverse — they will happily rewrite your third bullet, but you have to copy the
document out, paste it in, and paste the answer back, losing the formatting on both
trips. Polish puts the model inside the editor, where the document already is.

## The problem

A resume is a document you edit under pressure, in a format you did not choose. It
arrives as a PDF someone sent you, or a DOCX from a template, or a LaTeX file you
compiled two years ago and can no longer build. Every round of editing is a format
conversion, and every conversion costs you the layout.

Meanwhile the actual editing work — tightening a bullet, reframing a role, matching
the language of a job posting — is exactly the kind of thing a language model is
good at, and exactly the kind of thing that is miserable to do through a chat window
one paragraph at a time.

## What it does

**Import anything.** PDF, DOCX, RTF, TXT and LaTeX all come in and become one
structured document. The parse is server-side, so the browser never has to know
about five file formats.

**Edit inline.** Select a line and ask for a change. The prompt is scoped to the
selection with the surrounding text as context, so a suggestion for one bullet does
not quietly rewrite the section above it. Gemini 2.5 Flash does the suggestion,
scoring and summarisation.

**Never lose a draft.** Autosave runs against a dedicated endpoint, and every save
is a version. Version history is restorable per-document, so an aggressive rewrite
is a thing you can undo rather than a thing you regret.

**Export anywhere.** The same structured document renders back out to PDF, DOCX or
LaTeX. Import format and export format are independent — a PDF in can be a LaTeX
file out.

## How it is built

Two services, deployed separately.

The **frontend** is Next.js 14 on the App Router, TypeScript, Tailwind v4 and
shadcn/ui. The editor, dashboard, onboarding and auth screens all live there, along
with the inline prompt, the export dialog and the AI chat panel.

The **backend** is Express in TypeScript, with Prisma over PostgreSQL for documents,
versions and users, and Redis for sessions. Authentication is JWT with an
access/refresh token pair rather than a single long-lived token.

Both services are containerised. Deployment is Railway, running four things:
frontend, backend, PostgreSQL and Redis. GitHub Actions type-checks every push, and
the branch strategy is `feature/*` → `dev` → `main`, so staging is a real
environment rather than a convention.

## What I would write up next

- Why the editor keeps a structured document model instead of raw text, and what
  that buys on export.
- How inline prompts are scoped so a suggestion cannot clobber unrelated sections.
- What version history costs in storage, and when it should get pruned.
