import { describe, expect, it } from "vitest";
import { dailyMinutes, findOverlap, hourlyMinutes, inputInterval, leaveOnDate, leaveStateAt, nextStatus, overlaps, validateDailyRange, validateHourlyWindow, validateSubmission } from "@/domain/leave";
import { annualMinutes } from "@/domain/balance";
import { DAY, FRI, SAT, SUN, THU, at, cfg, daily, hourly } from "./fixtures";

const FULL = annualMinutes(cfg); // 6720

describe("leave hours (spec §6)", () => {
  it("hourly 14:00–16:00 = 120 min = 0.25 day", () => {
    expect(hourlyMinutes("14:00", "16:00", cfg)).toBe(120);
    expect(hourlyMinutes("08:00", "09:30", cfg)).toBe(90);
  });

  it("hourly windows must sit inside 08:00–16:00 with from < to", () => {
    expect(hourlyMinutes("07:30", "09:00", cfg)).toBeNull();
    expect(hourlyMinutes("15:00", "16:01", cfg)).toBeNull();
    expect(hourlyMinutes("10:00", "10:00", cfg)).toBeNull();
    expect(hourlyMinutes("11:00", "10:00", cfg)).toBeNull();
    expect(hourlyMinutes("1:00", "10:00", cfg)).toBeNull();
  });

  it("daily: 8 h per working day; only Friday is free (Sat–Thu week)", () => {
    expect(dailyMinutes(FRI, FRI, cfg)).toBe(0); // Friday alone costs nothing
    expect(dailyMinutes(FRI, SAT, cfg)).toBe(480); // the Saturday is worked
    expect(dailyMinutes(SUN, "2026-09-17", cfg)).toBe(2400); // Sun–Thu = 5 days
    expect(dailyMinutes(THU, SUN, cfg)).toBe(1440); // Thu, Sat, Sun — Friday skipped
    expect(dailyMinutes(THU, THU, cfg)).toBe(480);
  });
});

describe("overlap", () => {
  const a = inputInterval({ kind: "hourly", date: DAY, fromTime: "10:00", toTime: "11:00", reason: "x" })!;
  it("touching windows do not overlap; intersecting ones do", () => {
    const touching = inputInterval({ kind: "hourly", date: DAY, fromTime: "11:00", toTime: "12:00", reason: "x" })!;
    const crossing = inputInterval({ kind: "hourly", date: DAY, fromTime: "10:30", toTime: "12:00", reason: "x" })!;
    expect(overlaps(a, touching)).toBe(false);
    expect(overlaps(a, crossing)).toBe(true);
  });

  it("an hourly request on a day inside a daily range overlaps", () => {
    const range = inputInterval({ kind: "daily", startDate: THU, endDate: SUN, reason: "x" })!;
    const inside = inputInterval({ kind: "hourly", date: SAT, fromTime: "09:00", toTime: "10:00", reason: "x" })!;
    const dayAfter = inputInterval({ kind: "hourly", date: "2026-09-14", fromTime: "08:00", toTime: "09:00", reason: "x" })!;
    expect(overlaps(range, inside)).toBe(true);
    expect(overlaps(range, dayAfter)).toBe(false);
  });

  it("only pending and approved requests count", () => {
    const existing = [
      hourly({ date: DAY, from: "10:30", to: "12:00", status: "rejected" }),
      hourly({ date: DAY, from: "10:30", to: "12:00", status: "cancelled" }),
      hourly({ date: DAY, from: "10:30", to: "12:00", status: "revoked" }),
    ];
    expect(findOverlap(a, existing)).toBeUndefined();
    const pending = hourly({ date: DAY, from: "10:30", to: "12:00", status: "pending" });
    expect(findOverlap(a, [...existing, pending])).toBe(pending);
  });
});

describe("submission (spec §6)", () => {
  it("hourly 14:00–16:00 with a full balance is accepted at 120 min", () => {
    const r = validateSubmission({ input: { kind: "hourly", date: DAY, fromTime: "14:00", toTime: "16:00", reason: "موعد" }, existing: [], remainingMinutes: FULL, cfg });
    expect(r).toMatchObject({ ok: true, minutes: 120, startsAt: at("14:00"), endsAt: at("16:00") });
  });

  it("a request beyond the remaining balance is blocked", () => {
    const r = validateSubmission({ input: { kind: "daily", startDate: SUN, endDate: "2026-09-17", reason: "سفر" }, existing: [], remainingMinutes: 2399, cfg });
    expect(r).toEqual({ ok: false, error: "exceeds_balance" });
    const ok = validateSubmission({ input: { kind: "daily", startDate: SUN, endDate: "2026-09-17", reason: "سفر" }, existing: [], remainingMinutes: 2400, cfg });
    expect(ok.ok).toBe(true);
  });

  it("an overlapping request is blocked", () => {
    const existing = [daily({ start: THU, end: SUN, minutes: 960, status: "pending" })];
    const r = validateSubmission({ input: { kind: "hourly", date: SAT, fromTime: "09:00", toTime: "10:00", reason: "x" }, existing, remainingMinutes: FULL, cfg });
    expect(r).toEqual({ ok: false, error: "overlaps" });
  });

  it("balance is checked before overlap", () => {
    const existing = [daily({ start: THU, end: SUN, minutes: 960, status: "approved" })];
    const r = validateSubmission({ input: { kind: "hourly", date: SAT, fromTime: "09:00", toTime: "10:00", reason: "x" }, existing, remainingMinutes: 30, cfg });
    expect(r).toEqual({ ok: false, error: "exceeds_balance" });
  });

  it("a Friday-only request is accepted at 0 minutes; adding the Saturday costs a day", () => {
    const friday = validateSubmission({ input: { kind: "daily", startDate: FRI, endDate: FRI, reason: "x" }, existing: [], remainingMinutes: 0, cfg });
    expect(friday).toMatchObject({ ok: true, minutes: 0 });
    const withSaturday = validateSubmission({ input: { kind: "daily", startDate: FRI, endDate: SAT, reason: "x" }, existing: [], remainingMinutes: 0, cfg });
    expect(withSaturday).toEqual({ ok: false, error: "exceeds_balance" });
  });

  // Each refusal carries its own code so the form can point at the field that caused it
  // (decision 2026-09-10). Same accept / reject outcomes as before, finer reasons.
  const err = (input: Parameters<typeof validateSubmission>[0]["input"], remaining = FULL) =>
    validateSubmission({ input, existing: [], remainingMinutes: remaining, cfg });

  it("names the reason a submission is refused, one code per cause", () => {
    const hourly = { kind: "hourly" as const, date: DAY, fromTime: "09:00", toTime: "10:00", reason: "x" };
    const daily = { kind: "daily" as const, startDate: SUN, endDate: SUN, reason: "x" };

    // hourly, in form order: date, then the window, then the reason
    expect(err({ ...hourly, date: "" })).toEqual({ ok: false, error: "date_invalid" });
    expect(err({ ...hourly, date: "2026-02-30" })).toEqual({ ok: false, error: "date_invalid" });
    expect(err({ ...hourly, fromTime: "" })).toEqual({ ok: false, error: "time_invalid" });
    expect(err({ ...hourly, toTime: "9:5" })).toEqual({ ok: false, error: "time_invalid" });
    expect(err({ ...hourly, fromTime: "16:00", toTime: "14:00" })).toEqual({ ok: false, error: "time_order" });
    expect(err({ ...hourly, fromTime: "10:00", toTime: "10:00" })).toEqual({ ok: false, error: "time_order" });
    expect(err({ ...hourly, fromTime: "07:00" })).toEqual({ ok: false, error: "outside_work_hours" });
    expect(err({ ...hourly, toTime: "17:00" })).toEqual({ ok: false, error: "outside_work_hours" });
    expect(err({ ...hourly, reason: "  " })).toEqual({ ok: false, error: "reason_required" });

    // daily
    expect(err({ ...daily, startDate: "" })).toEqual({ ok: false, error: "start_date_invalid" });
    expect(err({ ...daily, endDate: "2026-13-01" })).toEqual({ ok: false, error: "end_date_invalid" });
    expect(err({ ...daily, startDate: SUN, endDate: THU })).toEqual({ ok: false, error: "date_order" });
    expect(err({ ...daily, startDate: "2026-12-30", endDate: "2027-01-03" })).toEqual({ ok: false, error: "crosses_year" });
    expect(err({ ...daily, reason: "" })).toEqual({ ok: false, error: "reason_required" });

    // the window is judged before the balance, and the balance before the overlap
    expect(err({ ...hourly, fromTime: "16:00", toTime: "17:00" }, 0)).toEqual({ ok: false, error: "outside_work_hours" });
    expect(err(hourly, 0)).toEqual({ ok: false, error: "exceeds_balance" });
  });

  it("validateHourlyWindow and validateDailyRange give the same codes on their own", () => {
    expect(validateHourlyWindow("09:00", "10:30", cfg)).toEqual({ ok: true, minutes: 90 });
    expect(validateHourlyWindow(null, "10:00", cfg)).toEqual({ ok: false, error: "time_invalid" });
    expect(validateHourlyWindow("10:00", "09:00", cfg)).toEqual({ ok: false, error: "time_order" });
    expect(validateHourlyWindow("06:00", "09:00", cfg)).toEqual({ ok: false, error: "outside_work_hours" });
    expect(validateDailyRange(SUN, SUN, cfg)).toEqual({ ok: true, minutes: 8 * 60 });
    expect(validateDailyRange(FRI, FRI, cfg)).toEqual({ ok: true, minutes: 0 });
    expect(validateDailyRange(FRI, SAT, cfg)).toEqual({ ok: true, minutes: 480 });
    expect(validateDailyRange(SUN, THU, cfg)).toEqual({ ok: false, error: "date_order" });
  });
});

describe("board effect and reporting", () => {
  it("approved hourly leave makes the agent away during the window only; daily leave covers the day", () => {
    const h = hourly({ date: DAY, from: "14:00", to: "16:00" });
    expect(leaveStateAt([h], at("13:59")).kind).toBe("none");
    expect(leaveStateAt([h], at("14:00")).kind).toBe("hourly");
    expect(leaveStateAt([h], at("15:59")).kind).toBe("hourly");
    expect(leaveStateAt([h], at("16:00")).kind).toBe("none");
    const d = daily({ start: THU, end: THU, minutes: 480 });
    expect(leaveStateAt([d], at("00:00", THU)).kind).toBe("daily");
    expect(leaveStateAt([d], at("23:59", THU)).kind).toBe("daily");
    expect(leaveStateAt([d], at("23:59", DAY)).kind).toBe("none");
    expect(leaveStateAt([hourly({ date: DAY, from: "14:00", to: "16:00", status: "pending" })], at("14:30")).kind).toBe("none");
  });

  it("leaveOnDate: hourly minutes that day, and whether a daily leave covers it", () => {
    const rs = [hourly({ date: DAY, from: "14:00", to: "16:00" }), daily({ start: THU, end: SUN, minutes: 960 })];
    expect(leaveOnDate(rs, DAY)).toEqual({ hourlyMinutes: 120, dailyCovers: false });
    expect(leaveOnDate(rs, SAT)).toEqual({ hourlyMinutes: 0, dailyCovers: true });
  });
});

describe("lifecycle", () => {
  it("only the Branch Manager decides pending requests and revokes approved ones; the requester (agent or Team Lead) cancels pending", () => {
    expect(nextStatus("pending", "approve", "branch_manager")).toBe("approved");
    expect(nextStatus("pending", "reject", "branch_manager")).toBe("rejected");
    expect(nextStatus("pending", "cancel", "agent")).toBe("cancelled");
    expect(nextStatus("approved", "revoke", "branch_manager")).toBe("revoked");
    expect(nextStatus("approved", "cancel", "agent")).toBeNull();
    expect(nextStatus("approved", "approve", "branch_manager")).toBeNull();
    expect(nextStatus("pending", "revoke", "branch_manager")).toBeNull();
    expect(nextStatus("pending", "approve", "team_lead")).toBeNull();
    expect(nextStatus("pending", "cancel", "team_lead")).toBe("cancelled");
    expect(nextStatus("approved", "cancel", "team_lead")).toBeNull();
    expect(nextStatus("pending", "reject", "team_lead")).toBeNull();
    expect(nextStatus("rejected", "approve", "branch_manager")).toBeNull();
  });
});
