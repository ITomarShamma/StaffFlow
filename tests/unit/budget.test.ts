import { describe, expect, it } from "vitest";
import { budgetUsedDisplay, chargedMinutes, effectiveMax, remainingBudget, roundMinutes, usedToday } from "@/domain/budget";
import { typeByCode } from "@/domain/types";
import { SEED_BREAK_TYPES } from "../../prisma/seed-data";
import { at, cfg, session, types } from "./fixtures";

const smoke = typeByCode(types, "smoke");
const prayer = typeByCode(types, "prayer");
const meal = typeByCode(types, "meal");
const toilet = typeByCode(types, "toilet");

describe("spec §5.1 table — every row, from the seed data the app runs on", () => {
  it.each([
    ["smoke", "general", 3, 1, 10, 5, true],
    ["prayer", "general", 10, 2, 20, 1, true],
    ["meal", "general", 15, 2, 25, 1, true],
    ["toilet", "toilet", null, null, 20, null, false],
  ] as const)("%s: pool %s, max %s, grace %s, auto-end %s, allowance %s, budgeted %s", (code, pool, max, grace, autoEnd, allowance, budgeted) => {
    const t = SEED_BREAK_TYPES.find((x) => x.code === code)!;
    expect(t.pool).toBe(pool);
    expect(t.maxMin).toBe(max);
    expect(t.graceMin).toBe(grace);
    expect(t.autoEndAtMin).toBe(autoEnd);
    expect(t.allowancePerDay).toBe(allowance);
    expect(t.countsTowardBudget).toBe(budgeted);
  });

  it("the daily budget is 25 minutes", () => {
    expect(cfg.dailyBudgetMin).toBe(25);
  });
});

describe("budget (spec §5.2)", () => {
  const now = at("12:00");

  it("charges the actual duration including overrun: a 3-min smoke ending at 5 min costs 5", () => {
    const s = session({ typeCode: "smoke", startedAt: at("09:00"), endedAt: at("09:05") });
    expect(chargedMinutes(s, smoke, now)).toBe(5);
  });

  it("rounds to the nearest minute, minimum 1 (decision Q5)", () => {
    expect(roundMinutes(0)).toBe(0);
    expect(roundMinutes(10)).toBe(1);
    expect(roundMinutes(89)).toBe(1);
    expect(roundMinutes(90)).toBe(2);
    expect(roundMinutes(180)).toBe(3);
    expect(roundMinutes(209)).toBe(3);
    expect(roundMinutes(210)).toBe(4);
  });

  it("a meal started with 14 min left is clamped to 14", () => {
    const used = usedToday([session({ typeCode: "prayer", startedAt: at("09:00"), endedAt: at("09:11") })], types, now);
    expect(used).toBe(11);
    const remaining = remainingBudget(cfg, used);
    expect(remaining).toBe(14);
    expect(effectiveMax(meal, remaining)).toBe(14);
    expect(effectiveMax(smoke, remaining)).toBe(3);
  });

  it("meal 15 + prayer 10 = 25 leaves no smoke minutes", () => {
    const today = [
      session({ typeCode: "meal", startedAt: at("09:00"), endedAt: at("09:15") }),
      session({ typeCode: "prayer", startedAt: at("10:00"), endedAt: at("10:10") }),
    ];
    expect(usedToday(today, types, now)).toBe(25);
    expect(remainingBudget(cfg, 25)).toBe(0);
    expect(effectiveMax(smoke, 0)).toBe(0);
  });

  it("toilet never counts; voided sessions charge nothing", () => {
    expect(chargedMinutes(session({ typeCode: "toilet", startedAt: at("09:00"), endedAt: at("09:30"), effectiveMaxMin: null }), toilet, now)).toBe(0);
    expect(chargedMinutes(session({ typeCode: "meal", startedAt: at("09:00"), endedAt: at("09:15"), voided: true }), meal, now)).toBe(0);
  });

  it("used can exceed 25 through overrun; remaining clamps at 0; display clamps at 25", () => {
    const today = [
      session({ typeCode: "meal", startedAt: at("09:00"), endedAt: at("09:25") }),
      session({ typeCode: "prayer", startedAt: at("10:00"), endedAt: at("10:09") }),
    ];
    const used = usedToday(today, types, now);
    expect(used).toBe(34);
    expect(remainingBudget(cfg, used)).toBe(0);
    expect(budgetUsedDisplay(used, cfg)).toBe(25);
    expect(budgetUsedDisplay(12, cfg)).toBe(12);
  });

  it("an open session is charged for its elapsed time (the budget ticks on the board)", () => {
    const open = session({ typeCode: "smoke", startedAt: at("11:58") });
    expect(chargedMinutes(open, smoke, at("11:59", undefined, 30))).toBe(2); // 90 s → 2
    expect(chargedMinutes(open, smoke, at("11:58", undefined, 5))).toBe(1);
    expect(effectiveMax(toilet, 10)).toBeNull();
  });
});
