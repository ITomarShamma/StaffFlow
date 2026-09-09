import { describe, expect, it } from "vitest";
import { annualMinutes, daysOf, formatDays, remainingMinutes, usedMinutes } from "@/domain/balance";
import { DAY, THU, cfg, daily, hourly } from "./fixtures";

describe("balance (spec §6)", () => {
  it("112 h per calendar year = 6720 min = 14.00 days", () => {
    expect(annualMinutes(cfg)).toBe(6720);
    expect(formatDays(annualMinutes(cfg), cfg)).toBe("14.00");
  });

  it("demo step 9: 14.00 → 13.75 after a 2-hour leave", () => {
    const rs = [hourly({ date: DAY, from: "14:00", to: "16:00" })];
    expect(usedMinutes(rs, 2026)).toBe(120);
    expect(formatDays(remainingMinutes(cfg, rs, 2026), cfg)).toBe("13.75");
  });

  it("demo step 10: 14.00 → 13.00 after one working day", () => {
    const rs = [daily({ start: THU, end: THU, minutes: 480 })];
    expect(formatDays(remainingMinutes(cfg, rs, 2026), cfg)).toBe("13.00");
  });

  it("only approved requests in the year count", () => {
    const rs = [
      hourly({ date: DAY, from: "14:00", to: "16:00", status: "pending" }),
      hourly({ date: DAY, from: "09:00", to: "10:00", status: "rejected" }),
      hourly({ date: DAY, from: "10:00", to: "11:00", status: "revoked" }),
      hourly({ date: DAY, from: "11:00", to: "12:00", status: "cancelled" }),
      hourly({ date: "2025-09-09", from: "08:00", to: "16:00" }),
      daily({ start: THU, end: THU, minutes: 480 }),
    ];
    expect(usedMinutes(rs, 2026)).toBe(480);
    expect(usedMinutes(rs, 2025)).toBe(480);
  });

  it("two decimals, Western digits", () => {
    expect(formatDays(30, cfg)).toBe("0.06");
    expect(daysOf(120, cfg)).toBe(0.25);
    expect(formatDays(6720 - 30, cfg)).toBe("13.94");
  });
});
