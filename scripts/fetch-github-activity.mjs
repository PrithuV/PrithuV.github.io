/**
 * Writes the GitHub contribution calendar to content/generated/github-activity.json,
 * which the Skills section reads at build time. The site ships that file, so a
 * visitor's browser never talks to GitHub.
 *
 * Reads github.com/users/<login>/contributions — the same fragment the profile
 * page uses. It needs no token, which is why it is preferred over the GraphQL
 * API here, but it is not a documented API and its markup could change. The
 * generated file is committed, so a failed fetch leaves the last good data in
 * place rather than emptying the section.
 *
 *   node scripts/fetch-github-activity.mjs <login>
 */
import fs from "node:fs";
import path from "node:path";

const login = process.argv[2];
if (!login) {
  console.error("usage: node scripts/fetch-github-activity.mjs <login>");
  process.exit(1);
}

const OUT = path.join(process.cwd(), "content", "generated", "github-activity.json");

/** GitHub answers with 406 unless the request looks like a browser. */
const HEADERS = {
  "user-agent": "Mozilla/5.0 (compatible; portfolio-build/1.0)",
  accept: "text/html",
};

function parseCalendar(html) {
  // Each day is a <td> carrying its date and a 0-4 intensity level.
  const cells = [...html.matchAll(
    /<td[^>]*data-date="(\d{4}-\d{2}-\d{2})"[^>]*id="(contribution-day-component-[\d-]+)"[^>]*data-level="(\d)"/g,
  )];

  // The exact count lives in a <tool-tip> that points back at the cell id.
  const counts = new Map();
  for (const [, id, text] of html.matchAll(
    /<tool-tip[^>]*for="(contribution-day-component-[\d-]+)"[^>]*>([^<]*)</g,
  )) {
    const match = text.match(/^([\d,]+) contribution/);
    counts.set(id, match ? Number(match[1].replace(/,/g, "")) : 0);
  }

  return (
    cells
      .map(([, date, id, level]) => ({
        date,
        count: counts.get(id) ?? 0,
        level: Number(level),
      }))
      // The page emits the grid one weekday row at a time — every Sunday, then
      // every Monday — so the cells arrive in column order, not date order.
      .sort((a, b) => a.date.localeCompare(b.date))
  );
}

const response = await fetch(`https://github.com/users/${login}/contributions`, {
  headers: HEADERS,
});
if (!response.ok) {
  throw new Error(`GitHub returned ${response.status} for ${login}`);
}

const days = parseCalendar(await response.text());
if (days.length < 300) {
  // A calendar is a year of days. Far fewer means the markup moved and the
  // regexes matched something else — better to keep the old file than write junk.
  throw new Error(`parsed only ${days.length} days; the page markup has changed`);
}

fs.writeFileSync(
  OUT,
  `${JSON.stringify({ login, generated_at: new Date().toISOString(), days }, null, 2)}\n`,
);

const total = days.reduce((sum, day) => sum + day.count, 0);
console.log(`wrote ${days.length} days (${total} contributions) for ${login}`);
