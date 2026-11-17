/**
 * Client-side relative time via Intl.RelativeTimeFormat (PROJ-03).
 * No extra dependency — call only from the client to avoid SSR/client mismatch.
 */

const DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { amount: 60, unit: "second" },
  { amount: 60, unit: "minute" },
  { amount: 24, unit: "hour" },
  { amount: 7, unit: "day" },
  { amount: 4.34524, unit: "week" },
  { amount: 12, unit: "month" },
  { amount: Number.POSITIVE_INFINITY, unit: "year" },
];

export function formatRelativeTime(
  input: Date | string | number,
  now: Date = new Date(),
  locales: string | string[] = "en",
): string {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "";

  const rtf = new Intl.RelativeTimeFormat(locales, { numeric: "auto" });
  let durationSeconds = (date.getTime() - now.getTime()) / 1000;

  for (const division of DIVISIONS) {
    if (Math.abs(durationSeconds) < division.amount) {
      return rtf.format(Math.round(durationSeconds), division.unit);
    }
    durationSeconds /= division.amount;
  }
  return rtf.format(Math.round(durationSeconds), "year");
}

/** Absolute timestamp for tooltips / title attributes. */
export function formatAbsoluteTime(
  input: Date | string | number,
  locales: string | string[] = "en",
): string {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locales, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
