/**
 * Range presets for the Reports screen and its CSV export. All boundaries are
 * computed in UTC with Monday-based weeks, matching metrics.ts, so every review
 * surface agrees on what "this week" means. Ranges are half-open [start, end).
 */

export const REPORT_RANGES = [
  { key: "this-week", label: "This week" },
  { key: "last-week", label: "Last week" },
  { key: "this-month", label: "This month" },
  { key: "last-month", label: "Last month" },
] as const;

export type ReportRangeKey = (typeof REPORT_RANGES)[number]["key"];

export const DEFAULT_RANGE: ReportRangeKey = "this-week";

export function isReportRangeKey(v: string | null | undefined): v is ReportRangeKey {
  return REPORT_RANGES.some((r) => r.key === v);
}

function startOfWeekUTC(d: Date): Date {
  const day = d.getUTCDay(); // 0 = Sun
  const sinceMon = (day + 6) % 7;
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - sinceMon),
  );
}

export type ResolvedRange = {
  key: ReportRangeKey;
  /** Short tab label, e.g. "This week". */
  label: string;
  start: Date;
  end: Date; // exclusive
  /** Human date span for the header, e.g. "Jul 21 – Jul 27" or "July 2026". */
  periodLabel: string;
};

const dayFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const monthFmt = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function weekSpanLabel(start: Date, end: Date): string {
  const last = new Date(end.getTime() - 86400000);
  return `${dayFmt.format(start)} – ${dayFmt.format(last)}`;
}

/** Resolve a raw searchParam into a concrete range, defaulting to this week. */
export function resolveRange(raw: string | null | undefined, now = new Date()): ResolvedRange {
  const key: ReportRangeKey = isReportRangeKey(raw) ? raw : DEFAULT_RANGE;
  const label = REPORT_RANGES.find((r) => r.key === key)!.label;

  const thisWeek = startOfWeekUTC(now);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  switch (key) {
    case "last-week": {
      const start = new Date(thisWeek.getTime() - 7 * 86400000);
      return { key, label, start, end: thisWeek, periodLabel: weekSpanLabel(start, thisWeek) };
    }
    case "this-month": {
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
      return { key, label, start: monthStart, end, periodLabel: monthFmt.format(monthStart) };
    }
    case "last-month": {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
      return { key, label, start, end: monthStart, periodLabel: monthFmt.format(start) };
    }
    case "this-week":
    default: {
      const end = new Date(thisWeek.getTime() + 7 * 86400000);
      return { key, label, start: thisWeek, end, periodLabel: weekSpanLabel(thisWeek, end) };
    }
  }
}
