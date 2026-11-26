import { describe, expect, it } from "vite-plus/test";
import {
  addCalendarDays,
  classifyDueDate,
  compareCalendarDates,
  formatDueDateLabel,
  isCalendarDate,
  toCalendarDate,
  todayCalendarDate,
} from "./calendarDate";

describe("calendarDate", () => {
  it("validates real calendar dates and rejects impossible dates", () => {
    expect(isCalendarDate("2026-11-26")).toBe(true);
    expect(isCalendarDate("2024-02-29")).toBe(true); // leap year
    expect(isCalendarDate("2025-02-29")).toBe(false); // non-leap year
    expect(isCalendarDate("2026-02-30")).toBe(false);
    expect(isCalendarDate("2026-13-01")).toBe(false);
    expect(isCalendarDate("2026-00-10")).toBe(false);
    expect(isCalendarDate("2026-11-6")).toBe(false);
    expect(isCalendarDate("not-a-date")).toBe(false);
    expect(isCalendarDate(null)).toBe(false);
    expect(isCalendarDate(20261126)).toBe(false);
  });

  it("formats local Date components without UTC shifting", () => {
    const localLateNight = new Date(2026, 10, 26, 23, 59, 59);
    expect(toCalendarDate(localLateNight)).toBe("2026-11-26");
    expect(todayCalendarDate(localLateNight)).toBe("2026-11-26");
  });

  it("adds calendar days across month and year boundaries", () => {
    expect(addCalendarDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addCalendarDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addCalendarDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addCalendarDays("2024-03-01", -1)).toBe("2024-02-29");
  });

  it("compares calendar dates lexicographically", () => {
    expect(compareCalendarDates("2026-11-25", "2026-11-26")).toBe(-1);
    expect(compareCalendarDates("2026-11-26", "2026-11-26")).toBe(0);
    expect(compareCalendarDates("2026-11-27", "2026-11-26")).toBe(1);
  });

  it("classifies overdue, today, tomorrow, and upcoming due dates", () => {
    const today = "2026-11-26";
    expect(classifyDueDate("2026-11-25", today)).toBe("overdue");
    expect(classifyDueDate("2026-11-26", today)).toBe("today");
    expect(classifyDueDate("2026-11-27", today)).toBe("tomorrow");
    expect(classifyDueDate("2026-12-05", today)).toBe("upcoming");
  });

  it("formats relative and absolute due date labels", () => {
    const today = "2026-11-26";
    expect(formatDueDateLabel("2026-11-26", today)).toBe("Today");
    expect(formatDueDateLabel("2026-11-27", today)).toBe("Tomorrow");
    expect(formatDueDateLabel("2026-11-25", today)).toBe("Yesterday");
    expect(formatDueDateLabel("2026-12-15", today)).toBe("Dec 15");
    expect(formatDueDateLabel("2027-01-05", today)).toBe("Jan 5, 2027");
  });
});
