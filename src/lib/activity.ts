import fs from "node:fs";
import path from "node:path";

const DATA = path.join(process.cwd(), "content", "generated", "github-activity.json");

export type ActivityDay = { date: string; count: number; level: number };

/**
 * The contribution calendar written by scripts/fetch-github-activity.mjs. It is
 * missing on a fresh clone that has not run the script, so the caller renders
 * nothing rather than the build failing over data it can regenerate.
 */
export function getGithubActivity(): {
  login: string;
  generated_at: string;
  days: ActivityDay[];
} | undefined {
  if (!fs.existsSync(DATA)) return undefined;
  return JSON.parse(fs.readFileSync(DATA, "utf8"));
}

/**
 * The last `months` of days, trimmed back to a Sunday so the grid's first
 * column is a whole week and the weekday rows line up.
 */
export function recentWeeks(days: ActivityDay[], months: number): ActivityDay[][] {
  // The generator sorts, but chunking into weeks is silently wrong on unsorted
  // input, so this does not take it on trust.
  const ordered = [...days].sort((a, b) => a.date.localeCompare(b.date));

  const cutoff = new Date(ordered[ordered.length - 1].date);
  cutoff.setMonth(cutoff.getMonth() - months);

  const recent = ordered.filter((day) => new Date(day.date) >= cutoff);
  const firstSunday = recent.findIndex((day) => new Date(`${day.date}T00:00:00`).getUTCDay() === 0);
  const aligned = recent.slice(firstSunday === -1 ? 0 : firstSunday);

  const weeks: ActivityDay[][] = [];
  for (let i = 0; i < aligned.length; i += 7) weeks.push(aligned.slice(i, i + 7));
  return weeks;
}
