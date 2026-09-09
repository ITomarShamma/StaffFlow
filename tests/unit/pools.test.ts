import { describe, expect, it } from "vitest";
import { capOf, hasFreeSlot, poolCounts, resolvePool, validateCap } from "@/domain/pools";
import { canStart } from "@/domain/sessions";
import { typeByCode } from "@/domain/types";
import { at, cfg, f1, f2, m1, m2, m3, session, team, types, usersById } from "./fixtures";

const toilet = typeByCode(types, "toilet");
const smoke = typeByCode(types, "smoke");

function ctxFor(agent: typeof m1, code: "smoke" | "toilet", open: ReturnType<typeof session>[], caps = team) {
  return {
    now: at("10:00"),
    agent,
    type: typeByCode(types, code),
    types,
    team: caps,
    cfg,
    agentTodaySessions: [],
    teamOpenSessions: open,
    usersById,
    agentApprovedLeave: [],
  };
}

describe("pools", () => {
  it("resolves the toilet pool from the agent's gender, never from the request", () => {
    expect(resolvePool(toilet, "female")).toBe("toilet_female");
    expect(resolvePool(toilet, "male")).toBe("toilet_male");
    expect(resolvePool(smoke, "female")).toBe("general");
  });

  it("reads caps from the team at call time", () => {
    expect(capOf("general", team)).toBe(2);
    expect(capOf("general", { ...team, capGeneral: 3 })).toBe(3);
    expect(capOf("toilet_female", team)).toBe(1);
    expect(capOf("toilet_male", team)).toBe(2);
  });

  it("female agent is refused when the female pool is full while the male pool has room", () => {
    const open = [session({ userId: "f1", typeCode: "toilet", startedAt: at("09:50"), effectiveMaxMin: null })];
    const counts = poolCounts(open, usersById, types, team);
    expect(counts.toilet_female).toEqual({ active: 1, cap: 1 });
    expect(counts.toilet_male).toEqual({ active: 0, cap: 2 });
    expect(hasFreeSlot("toilet_female", counts)).toBe(false);
    expect(hasFreeSlot("toilet_male", counts)).toBe(true);
    expect(canStart(ctxFor(f2, "toilet", open))).toEqual({ ok: false, reason: "pool_full" });
    expect(canStart(ctxFor(m1, "toilet", open))).toEqual({ ok: true, pool: "toilet_male", effectiveMaxMin: null });
  });

  it("and vice versa: male pool full (2), female pool free", () => {
    const open = [
      session({ userId: "m1", typeCode: "toilet", startedAt: at("09:50"), effectiveMaxMin: null }),
      session({ userId: "m2", typeCode: "toilet", startedAt: at("09:51"), effectiveMaxMin: null }),
    ];
    expect(canStart(ctxFor(m3, "toilet", open))).toEqual({ ok: false, reason: "pool_full" });
    expect(canStart(ctxFor(f1, "toilet", open))).toEqual({ ok: true, pool: "toilet_female", effectiveMaxMin: null });
  });

  it("cap raised from 2 to 3 admits a waiting agent and never ends a running one", () => {
    const open = [
      session({ userId: "m1", typeCode: "smoke", startedAt: at("09:58") }),
      session({ userId: "m2", typeCode: "meal", startedAt: at("09:59") }),
    ];
    expect(canStart(ctxFor(m3, "smoke", open))).toEqual({ ok: false, reason: "pool_full" });
    const raised = { ...team, capGeneral: 3 };
    expect(canStart(ctxFor(m3, "smoke", open, raised)).ok).toBe(true);
    // the two running sessions are untouched: still open, still counted
    expect(poolCounts(open, usersById, types, raised).general).toEqual({ active: 2, cap: 3 });
    expect(open.every((s) => s.endedAt === null)).toBe(true);
  });

  it("cap lowered below the running count blocks new starts and ends nothing (3/1)", () => {
    const open = [
      session({ userId: "m1", typeCode: "smoke", startedAt: at("09:58") }),
      session({ userId: "m2", typeCode: "meal", startedAt: at("09:59") }),
      session({ userId: "f1", typeCode: "prayer", startedAt: at("09:59") }),
    ];
    const lowered = { ...team, capGeneral: 1 };
    expect(poolCounts(open, usersById, types, lowered).general).toEqual({ active: 3, cap: 1 });
    expect(canStart(ctxFor(m3, "smoke", open, lowered))).toEqual({ ok: false, reason: "pool_full" });
  });

  it("only 1, 2 and 3 are valid caps", () => {
    expect(validateCap(1)).toBe(true);
    expect(validateCap(3)).toBe(true);
    expect(validateCap(0)).toBe(false);
    expect(validateCap(4)).toBe(false);
    expect(validateCap("2")).toBe(false);
  });
});
