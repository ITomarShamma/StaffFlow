import { describe, expect, it } from "vitest";
import { agentStatus, buttonStateFor, buttonStates, canStart, endByAgent, isOverrun, overrunMinutes, type StartContext } from "@/domain/sessions";
import { typeByCode } from "@/domain/types";
import { at, cfg, daily, f1, hourly, m1, m2, m3, session, team, types, usersById } from "./fixtures";

const smoke = typeByCode(types, "smoke");
const meal = typeByCode(types, "meal");

function ctx(over: Partial<StartContext> = {}): StartContext {
  return {
    now: at("10:00"),
    agent: m1,
    type: smoke,
    types,
    team,
    cfg,
    agentTodaySessions: [],
    teamOpenSessions: [],
    usersById,
    agentApprovedLeave: [],
    ...over,
  };
}

describe("canStart — spec §5.3 checks in order", () => {
  it("all pass → starts with the effective max recorded", () => {
    expect(canStart(ctx())).toEqual({ ok: true, pool: "general", effectiveMaxMin: 3 });
    expect(canStart(ctx({ type: meal }))).toEqual({ ok: true, pool: "general", effectiveMaxMin: 15 });
  });

  it("(a) outside 08:00–16:00 beats everything else", () => {
    const open = [session({ userId: "m1", typeCode: "smoke", startedAt: at("07:50") })];
    expect(canStart(ctx({ now: at("07:59"), teamOpenSessions: open }))).toEqual({ ok: false, reason: "outside_hours" });
    expect(canStart(ctx({ now: at("16:00") }))).toEqual({ ok: false, reason: "outside_hours" });
    expect(canStart(ctx({ now: at("15:59") })).ok).toBe(true);
  });

  it("(b) an agent already on a break is not on floor", () => {
    const open = [session({ userId: "m1", typeCode: "toilet", startedAt: at("09:55"), effectiveMaxMin: null })];
    expect(canStart(ctx({ teamOpenSessions: open }))).toEqual({ ok: false, reason: "not_on_floor" });
  });

  it("(b) an agent on approved leave right now cannot start; pending leave does not block", () => {
    const away = [hourly({ userId: "m1", date: "2026-09-09", from: "09:00", to: "11:00" })];
    expect(canStart(ctx({ agentApprovedLeave: away }))).toEqual({ ok: false, reason: "on_leave" });
    const onLeave = [daily({ userId: "m1", start: "2026-09-09", end: "2026-09-09", minutes: 480 })];
    expect(canStart(ctx({ agentApprovedLeave: onLeave }))).toEqual({ ok: false, reason: "on_leave" });
    const pending = [hourly({ userId: "m1", date: "2026-09-09", from: "09:00", to: "11:00", status: "pending" })];
    expect(canStart(ctx({ agentApprovedLeave: pending })).ok).toBe(true);
    // outside the window it is fine
    expect(canStart(ctx({ now: at("11:00"), agentApprovedLeave: away })).ok).toBe(true);
  });

  it("(c) allowance before (d) budget before (e) pool", () => {
    const prayerDone = [session({ userId: "m1", typeCode: "prayer", startedAt: at("08:30"), endedAt: at("08:40") })];
    expect(canStart(ctx({ type: typeByCode(types, "prayer"), agentTodaySessions: prayerDone }))).toEqual({ ok: false, reason: "allowance_used" });
  });

  it("meal then prayer = 25 → smoke refused with budget_exhausted, toilet still starts", () => {
    const today = [
      session({ userId: "m1", typeCode: "meal", startedAt: at("08:30"), endedAt: at("08:45") }),
      session({ userId: "m1", typeCode: "prayer", startedAt: at("09:00"), endedAt: at("09:10") }),
    ];
    expect(canStart(ctx({ agentTodaySessions: today }))).toEqual({ ok: false, reason: "budget_exhausted" });
    expect(canStart(ctx({ agentTodaySessions: today, type: typeByCode(types, "toilet") }))).toEqual({
      ok: true,
      pool: "toilet_male",
      effectiveMaxMin: null,
    });
  });

  it("(e) a full pool is the last check", () => {
    const open = [
      session({ userId: "m2", typeCode: "smoke", startedAt: at("09:58") }),
      session({ userId: "m3", typeCode: "meal", startedAt: at("09:59") }),
    ];
    expect(canStart(ctx({ teamOpenSessions: open }))).toEqual({ ok: false, reason: "pool_full" });
  });

  it("with 14 min left a meal starts clamped to 14", () => {
    const today = [session({ userId: "m1", typeCode: "prayer", startedAt: at("08:30"), endedAt: at("08:41") })];
    expect(canStart(ctx({ type: meal, agentTodaySessions: today }))).toEqual({ ok: true, pool: "general", effectiveMaxMin: 14 });
  });
});

describe("button labels (spec §5.3 step 3 + design)", () => {
  it("only pool_full says busy; on break / on leave grey out with no label; the rest say unavailable", () => {
    expect(buttonStateFor({ ok: false, reason: "pool_full" })).toBe("busy");
    expect(buttonStateFor({ ok: false, reason: "not_on_floor" })).toBe("blocked");
    expect(buttonStateFor({ ok: false, reason: "on_leave" })).toBe("blocked");
    expect(buttonStateFor({ ok: false, reason: "allowance_used" })).toBe("unavailable");
    expect(buttonStateFor({ ok: false, reason: "budget_exhausted" })).toBe("unavailable");
    expect(buttonStateFor({ ok: false, reason: "outside_hours" })).toBe("unavailable");
    expect(buttonStateFor({ ok: true, pool: "general", effectiveMaxMin: 3 })).toBe("available");
  });

  it("buttonStates evaluates every type", () => {
    const today = [
      session({ userId: "m1", typeCode: "meal", startedAt: at("08:30"), endedAt: at("08:45") }),
      session({ userId: "m1", typeCode: "prayer", startedAt: at("09:00"), endedAt: at("09:10") }),
    ];
    const { type: _t, ...rest } = ctx({ agentTodaySessions: today });
    expect(buttonStates(rest)).toEqual({ smoke: "unavailable", prayer: "unavailable", meal: "unavailable", toilet: "available" });
  });
});

describe("overrun and ending (spec §5.4)", () => {
  it("smoke overruns after 4:00 (max 3 + grace 1), not at 4:00", () => {
    const s = session({ userId: "m1", typeCode: "smoke", startedAt: at("10:00") });
    expect(isOverrun(s, smoke, at("10:04"))).toBe(false);
    expect(isOverrun(s, smoke, at("10:04", undefined, 1))).toBe(true);
  });

  it("uses the effective max, not the type max", () => {
    const s = session({ userId: "m1", typeCode: "meal", startedAt: at("10:00"), effectiveMaxMin: 14 });
    expect(isOverrun(s, meal, at("10:16"))).toBe(false);
    expect(isOverrun(s, meal, at("10:16", undefined, 1))).toBe(true);
  });

  it("toilet never overruns", () => {
    const s = session({ userId: "m1", typeCode: "toilet", startedAt: at("10:00"), effectiveMaxMin: null });
    expect(isOverrun(s, typeByCode(types, "toilet"), at("11:00"))).toBe(false);
  });

  it("ending by the agent records overrun minutes beyond the effective max", () => {
    const s = session({ userId: "m1", typeCode: "smoke", startedAt: at("10:00") });
    expect(endByAgent(s, smoke, at("10:03"))).toEqual({ endedAt: at("10:03"), endedBy: "agent", overrunMin: 0 });
    expect(endByAgent(s, smoke, at("10:05"))).toEqual({ endedAt: at("10:05"), endedBy: "agent", overrunMin: 2 });
    expect(overrunMinutes({ ...s, endedAt: at("10:04", undefined, 20) }, smoke, at("10:05"))).toBe(1);
  });
});

describe("agent status precedence (decision A10)", () => {
  const now = at("14:02");
  it("daily leave > open session (overrun > on break) > hourly leave > on floor", () => {
    const open = session({ userId: "m1", typeCode: "smoke", startedAt: at("13:55") });
    const dailyLeave = [daily({ userId: "m1", start: "2026-09-09", end: "2026-09-09", minutes: 480 })];
    const hourlyLeave = [hourly({ userId: "m1", date: "2026-09-09", from: "14:00", to: "16:00" })];
    expect(agentStatus({ now, openSession: open, types, approvedLeave: dailyLeave })).toBe("on_leave");
    expect(agentStatus({ now, openSession: open, types, approvedLeave: hourlyLeave })).toBe("overrun");
    expect(agentStatus({ now: at("13:57"), openSession: open, types, approvedLeave: hourlyLeave })).toBe("on_break");
    expect(agentStatus({ now, openSession: undefined, types, approvedLeave: hourlyLeave })).toBe("away");
    expect(agentStatus({ now, openSession: undefined, types, approvedLeave: [] })).toBe("on_floor");
    expect(agentStatus({ now: at("13:00"), openSession: undefined, types, approvedLeave: hourlyLeave })).toBe("on_floor");
  });

  it("a female agent's toilet break shows as on break like any other", () => {
    const open = session({ userId: f1.id, typeCode: "toilet", startedAt: at("13:55"), effectiveMaxMin: null });
    expect(agentStatus({ now, openSession: open, types, approvedLeave: [] })).toBe("on_break");
  });
});
