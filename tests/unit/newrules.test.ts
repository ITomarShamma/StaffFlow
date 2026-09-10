// Decisions of 2026-09-10: the 15-second mis-click safety, the call break type, and
// leave that may not be backdated.

import { describe, expect, it } from "vitest";
import { chargedMinutes, countable, isDiscarded, usedToday } from "@/domain/budget";
import { allowanceLeft, usedCount } from "@/domain/allowances";
import { validateDailyRange, validateSubmission } from "@/domain/leave";
import { poolCounts, resolvePool } from "@/domain/pools";
import { canStart } from "@/domain/sessions";
import { dailySummary } from "@/domain/summary";
import { planSweep } from "@/domain/sweep";
import { typeByCode } from "@/domain/types";
import { DAY, at, cfg, f1, m1, m2, session, team, types } from "./fixtures";

const smoke = typeByCode(types, "smoke");
const call = typeByCode(types, "call");

const startCtx = (over: Partial<Parameters<typeof canStart>[0]> = {}) => ({
  now: at("09:00"),
  agent: m1,
  type: smoke,
  types,
  team,
  cfg,
  agentTodaySessions: [],
  teamOpenSessions: [],
  usersById: new Map([[m1.id, m1], [m2.id, m2], [f1.id, f1]]),
  agentApprovedLeave: [],
  ...over,
});

describe("15-second mis-click safety (config min_session_s)", () => {
  const misclick = session({ typeCode: "smoke", startedAt: at("08:30"), endedAt: at("08:30", DAY, 14) });
  const real = session({ typeCode: "smoke", startedAt: at("08:40"), endedAt: at("08:40", DAY, 15) });

  it("threshold comes from config, not from code", () => {
    expect(cfg.minSessionS).toBe(15);
  });

  it("a break under the threshold is discarded; exactly at it is real", () => {
    expect(isDiscarded(misclick, cfg)).toBe(true);
    expect(isDiscarded(real, cfg)).toBe(false);
    expect(countable([misclick, real], cfg)).toEqual([real]);
  });

  it("an open session is never discarded — the agent is off the floor right now", () => {
    const open = session({ typeCode: "smoke", startedAt: at("09:00") });
    expect(isDiscarded(open, cfg)).toBe(false);
  });

  it("a mis-click costs no allowance and no budget", () => {
    const five = [1, 2, 3, 4, 5].map(() =>
      session({ typeCode: "smoke", startedAt: at("08:30"), endedAt: at("08:30", DAY, 5) }),
    );
    // five mis-clicks would otherwise exhaust the 5-per-day smoke allowance
    expect(usedCount(smoke, five)).toBe(5);
    expect(allowanceLeft(smoke, countable(five, cfg))).toBe(true);
    expect(canStart(startCtx({ agentTodaySessions: five })).ok).toBe(true);
    // and would otherwise charge 1 minute each (roundMinutes has a floor of 1)
    expect(chargedMinutes(five[0]!, smoke, at("09:00"))).toBe(1);
    expect(usedToday(countable(five, cfg), types, at("09:00"))).toBe(0);
  });

  it("a mis-click never reaches the daily summary", () => {
    const rows = dailySummary({
      date: DAY,
      agents: [{ id: "m1", nameAr: "أ" }],
      sessions: [misclick, real],
      types,
      approvedLeave: [],
      cfg,
      now: at("16:00"),
    });
    expect(rows[0]!.smoke.count).toBe(1);
  });
});

describe("call break (decision 2026-09-10)", () => {
  it("has no cap, no maximum, no daily limit and stays outside the budget", () => {
    expect(call.pool).toBe("none");
    expect(call.maxMin).toBeNull();
    expect(call.allowancePerDay).toBeNull();
    expect(call.countsTowardBudget).toBe(false);
    expect(call.autoEndAtMin).toBe(10);
  });

  it("occupies no pool, so any number of agents may be on a call at once", () => {
    expect(resolvePool(call, "male")).toBeNull();
    expect(resolvePool(call, "female")).toBeNull();
    const open = [
      session({ typeCode: "call", startedAt: at("09:00"), userId: "m1" }),
      session({ typeCode: "call", startedAt: at("09:00"), userId: "m2" }),
      session({ typeCode: "call", startedAt: at("09:00"), userId: "f1" }),
    ];
    const counts = poolCounts(open, new Map([[m1.id, m1], [m2.id, m2], [f1.id, f1]]), types, team);
    expect(counts.general.active).toBe(0);
    expect(counts.toilet_male.active).toBe(0);
    expect(counts.toilet_female.active).toBe(0);
  });

  it("is allowed even when the general pool is full and the budget is spent", () => {
    const full = [
      session({ typeCode: "smoke", startedAt: at("09:00"), userId: "m2" }),
      session({ typeCode: "meal", startedAt: at("09:00"), userId: "f1" }),
    ];
    expect(canStart(startCtx({ type: smoke, teamOpenSessions: full })).ok).toBe(false);
    expect(canStart(startCtx({ type: call, teamOpenSessions: full })).ok).toBe(true);
    const spent = [session({ typeCode: "meal", startedAt: at("08:00"), endedAt: at("08:30") })];
    expect(canStart(startCtx({ type: call, agentTodaySessions: spent })).ok).toBe(true);
  });

  it("a forgotten call is closed by the system after 10 minutes, marked as not recorded", () => {
    const open = session({ typeCode: "call", startedAt: at("09:00") });
    expect(planSweep({ now: at("09:09"), openSessions: [open], types, cfg })).toEqual([]);
    const [action] = planSweep({ now: at("09:30"), openSessions: [open], types, cfg });
    expect(action!.endedAt).toEqual(at("09:10"));
    expect(action!.endReason).toBe("stale");
    expect(action!.stale).toBe(true);
    expect(action!.overrunMin).toBe(0);
  });

  it("call time is never charged to the 25-minute budget", () => {
    const long = session({ typeCode: "call", startedAt: at("09:00"), endedAt: at("09:10") });
    expect(chargedMinutes(long, call, at("09:10"))).toBe(0);
    expect(usedToday([long], types, at("09:10"))).toBe(0);
  });

  it("calls are counted in the daily summary", () => {
    const rows = dailySummary({
      date: DAY,
      agents: [{ id: "m1", nameAr: "أ" }],
      sessions: [
        session({ typeCode: "call", startedAt: at("09:00"), endedAt: at("09:05") }),
        session({ typeCode: "call", startedAt: at("10:00"), endedAt: at("10:02") }),
      ],
      types,
      approvedLeave: [],
      cfg,
      now: at("16:00"),
    });
    expect(rows[0]!.callCount).toBe(2);
    expect(rows[0]!.budgetUsed).toBe(0);
  });
});

describe("leave may not be backdated (decision 2026-09-10)", () => {
  const base = { existing: [], remainingMinutes: 6720, cfg };

  it("an hourly request dated before today is refused", () => {
    const input = { kind: "hourly" as const, date: "2026-09-08", fromTime: "09:00", toTime: "10:00", reason: "x" };
    expect(validateSubmission({ ...base, input, today: DAY })).toEqual({ ok: false, error: "date_past" });
    expect(validateSubmission({ ...base, input: { ...input, date: DAY }, today: DAY }).ok).toBe(true);
    expect(validateSubmission({ ...base, input: { ...input, date: "2026-09-20" }, today: DAY }).ok).toBe(true);
  });

  it("a daily range starting before today is refused", () => {
    const input = { kind: "daily" as const, startDate: "2026-09-07", endDate: "2026-09-20", reason: "x" };
    expect(validateSubmission({ ...base, input, today: DAY })).toEqual({ ok: false, error: "start_date_past" });
    expect(validateDailyRange("2026-09-07", "2026-09-20", cfg, DAY)).toEqual({ ok: false, error: "start_date_past" });
  });

  it("today itself is accepted — the whole of today is still ahead", () => {
    const input = { kind: "daily" as const, startDate: DAY, endDate: DAY, reason: "x" };
    expect(validateSubmission({ ...base, input, today: DAY }).ok).toBe(true);
  });

  it("the past-date check is skipped when no today is supplied, so old tests still hold", () => {
    const input = { kind: "hourly" as const, date: "2020-01-02", fromTime: "09:00", toTime: "10:00", reason: "x" };
    expect(validateSubmission({ ...base, input }).ok).toBe(true);
  });
});
