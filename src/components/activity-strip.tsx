import { getGithubActivity, recentWeeks } from "@/lib/activity";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * A quiet contribution grid at the foot of Skills. Rendered from a committed
 * JSON file at build time, so there is no client JavaScript and no request to
 * GitHub from the reader's browser.
 */
export function ActivityStrip({
  label,
  months,
}: {
  label?: string;
  months: number;
}) {
  const activity = getGithubActivity();
  if (!activity || activity.days.length === 0) return null;

  const weeks = recentWeeks(activity.days, months);
  if (weeks.length === 0) return null;

  const total = weeks.flat().reduce((sum, day) => sum + day.count, 0);

  // One label per month, placed on the week where that month starts.
  const monthLabels = weeks.map((week, index) => {
    const first = week[0];
    if (!first) return undefined;
    const date = new Date(`${first.date}T00:00:00`);
    if (index === 0) return undefined;
    const previous = new Date(`${weeks[index - 1][0].date}T00:00:00`);
    return date.getUTCMonth() === previous.getUTCMonth()
      ? undefined
      : MONTH_NAMES[date.getUTCMonth()];
  });

  return (
    <div className="mt-10 border-t border-rule pt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        {label ? (
          <p className="text-[15px] text-muted-foreground">{label}</p>
        ) : null}
        <p className="text-[15px] text-muted-foreground tabular-nums">
          {total.toLocaleString("en-US")} contributions
        </p>
      </div>

      {/*
        A year of squares is wider than a phone. The grid scrolls inside this
        box rather than stretching the page, and stays left-aligned when it
        fits — which is why it is not centred.
      */}
      <div className="mt-3 -mx-6 overflow-x-auto px-6">
        <div className="w-max">
          <div className="flex gap-[3px]" aria-hidden>
            {monthLabels.map((month, index) => (
              <span
                key={index}
                className="w-[11px] text-[12px] leading-[1.4] text-muted-foreground"
              >
                {month}
              </span>
            ))}
          </div>

          {/*
            A table would imply the rows mean something; they are just weekdays.
            The grid is decorative, and the summary line above carries the
            information, so it is hidden from screen readers.
          */}
          <div className="mt-1 flex gap-[3px]" aria-hidden>
            {weeks.map((week) => (
              <div key={week[0].date} className="flex flex-col gap-[3px]">
                {week.map((day) => (
                  <span
                    key={day.date}
                    data-level={day.level}
                    title={`${day.count === 0 ? "No" : day.count} contribution${
                      day.count === 1 ? "" : "s"
                    } on ${day.date}`}
                    className="activity-cell"
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-[12px] text-muted-foreground">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <span key={level} data-level={level} className="activity-cell" aria-hidden />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
