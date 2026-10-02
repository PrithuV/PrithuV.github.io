*Placeholder write-up — the shape is right, the detail is thin. Expand it when you have time.*

Learning material scatters. A YouTube playlist saved for later, a few papers in a
downloads folder, a book half-read, a course you enrolled in and forgot. None of
these apps know about each other, so nothing anywhere can answer the only question
that matters: *what am I actually part-way through?*

Folio is a self-hosted answer to that. One workspace, every kind of resource, and
just enough structure to stay honest about progress without turning tracking into
a second job.

## What it does

- **YouTube playlists** are imported from a URL and become a course tracker —
  video list grouped by section, embedded player, per-video completion, timestamped
  notes.
- **PDFs** open in a built-in viewer that restores your last page automatically.
- **Books** track current page against total.
- **Papers** carry real metadata: authors, abstract, venue, year, DOI.
- **External courses** (Udemy, Coursera) get manual progress with a platform label
  and estimated hours.
- **Folders and colour-coded labels** organise all of it, filterable from the
  sidebar; the dashboard shows what is active and what was added recently.

## How it is built

React and Vite on the client, FastAPI on the server, MongoDB for resources and
progress, JWT for auth. Playlists come in through the YouTube Data API v3; uploaded
PDFs live in Cloudflare R2 rather than on the box. Three containers — Mongo, the
API, and the client behind nginx — come up with a single `docker-compose up`.

## Notes to expand

- Why one resource model covers videos, PDFs, books, papers and courses instead of
  five separate ones.
- What "progress" means for a resource with no natural unit, and how the tracker
  handles it.
- Why self-hosted, and what that rules out.
