import { describe, expect, it } from "vitest";
import {
  addDays,
  dayStartUtc,
  isWithinWorkHours,
  isWorkingDay,
  localDayBounds,
  localParts,
  localToUtc,
  weekdayOf,
  workWindow,
  workingDaysBetween,
} from "@/domain/tz";
import { DAY, FRI, SAT, SUN, THU, cfg } from "./fixtures";

describe("Asia/Damascus", () => {
  it("converts local 08:00 to 05:00Z (UTC+3, no DST since 2022)", () => {
    expect(localToUtc(DAY, "08:00").toISOString()).toBe("2026-09-09T05:00:00.000Z");
    expect(localToUtc("2026-01-15", "08:00").toISOString()).toBe("2026-01-15T05:00:00.000Z");
  });

  it("round-trips through localParts", () => {
    const p = localParts(new Date("2026-09-09T05:00:00Z"));
    expect(p.date).toBe(DAY);
    expect(p.time).toBe("08:00");
    expect(p.minuteOfDay).toBe(480);
    expect(p.weekday).toBe(3); // Wednesday
  });

  it("day starts at 00:00 local = 21:00Z the evening before", () => {
    expect(dayStartUtc(DAY).toISOString()).toBe("2026-09-08T21:00:00.000Z");
    const b = localDayBounds(new Date("2026-09-09T20:59:00Z"));
    expect(b.date).toBe(DAY);
    expect(b.end.toISOString()).toBe("2026-09-09T21:00:00.000Z");
    expect(localDayBounds(new Date("2026-09-09T21:00:00Z")).date).toBe("2026-09-10");
  });

  it("work window 08:00–16:00, half-open", () => {
    const w = workWindow(DAY, cfg);
    expect(isWithinWorkHours(new Date(w.start.getTime() - 1), cfg)).toBe(false);
    expect(isWithinWorkHours(w.start, cfg)).toBe(true);
    expect(isWithinWorkHours(new Date(w.end.getTime() - 1), cfg)).toBe(true);
    expect(isWithinWorkHours(w.end, cfg)).toBe(false);
  });

  it("working days are Sun–Thu", () => {
    expect(weekdayOf(FRI)).toBe(5);
    expect(isWorkingDay(THU, cfg)).toBe(true);
    expect(isWorkingDay(FRI, cfg)).toBe(false);
    expect(isWorkingDay(SAT, cfg)).toBe(true);
    expect(isWorkingDay(SUN, cfg)).toBe(true);
    expect(workingDaysBetween(FRI, SAT, cfg)).toBe(1); // Friday off, Saturday worked
    expect(workingDaysBetween(SUN, "2026-09-17", cfg)).toBe(5);
    expect(workingDaysBetween(THU, SUN, cfg)).toBe(3); // Thu, Sat, Sun — Friday skipped
    expect(workingDaysBetween(DAY, DAY, cfg)).toBe(1);
  });

  it("addDays crosses month ends", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });
});
