export type CalendarDate = `${number}-${string}-${string}`;

export type DueDateStatus = "overdue" | "today" | "tomorrow" | "upcoming";

const CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseCalendarDateParts(date: CalendarDate): {
  readonly year: number;
  readonly month: number;
  readonly day: number;
} {
  const match = CALENDAR_DATE_PATTERN.exec(date);
  if (!match) {
    throw new Error(`Invalid CalendarDate: "${date}"`);
  }
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

/**
 * Type guard checking that a value is a valid local `YYYY-MM-DD` calendar date.
 * Rejects impossible calendar dates such as `2026-02-30` or `2026-13-01`.
 */
export function isCalendarDate(value: unknown): value is CalendarDate {
  if (typeof value !== "string") {
    return false;
  }

  const match = CALENDAR_DATE_PATTERN.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const probe = new Date(year, month - 1, day);
  return probe.getFullYear() === year && probe.getMonth() === month - 1 && probe.getDate() === day;
}

/**
 * Formats a `Date` instance using local calendar components (`YYYY-MM-DD`).
 * Never uses UTC conversion so due dates remain timezone-safe.
 */
export function toCalendarDate(date: Date): CalendarDate {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Returns today's local calendar date (`YYYY-MM-DD`).
 */
export function todayCalendarDate(now: Date = new Date()): CalendarDate {
  return toCalendarDate(now);
}

/**
 * Adds a signed integer number of calendar days to a `CalendarDate` using local time.
 */
export function addCalendarDays(date: CalendarDate, days: number): CalendarDate {
  const { year, month, day } = parseCalendarDateParts(date);
  return toCalendarDate(new Date(year, month - 1, day + days));
}

/**
 * Compares two `CalendarDate` values lexicographically (`-1 | 0 | 1`).
 */
export function compareCalendarDates(a: CalendarDate, b: CalendarDate): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Classifies a due date relative to `today` (defaults to local today).
 */
export function classifyDueDate(
  dueDate: CalendarDate,
  today: CalendarDate = todayCalendarDate(),
): DueDateStatus {
  const cmp = compareCalendarDates(dueDate, today);
  if (cmp < 0) return "overdue";
  if (cmp === 0) return "today";

  const tomorrow = addCalendarDays(today, 1);
  if (dueDate === tomorrow) return "tomorrow";

  return "upcoming";
}
