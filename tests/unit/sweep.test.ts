import { describe, expect, it } from "vitest";
import { chargedMinutes } from "@/domain/budget";
import { planSweep } from "@/domain/sweep";
import { typeByCode } from "@/domain/types";
import { at, cfg, session, types } from "./fixtures";

const plan = (open: ReturnType<typeof session>[], now: Date) => planSweep({ now, openSessions: open, types, cfg });

describe("sweep (spec §5.4) — idempotent, ends stamped at the true mark", () => {
  it.each([
    ["smoke", 10],
    ["prayer", 20],
    ["meal", 25],
  ] as const)("%s auto-ends at %s min and is charged the full duration even when the sweep runs late", (code, mark) => {
    const s = session({ typeCode: code, startedAt: at("09:00") });
    expect(plan([s], at("09:00", undefined, mark * 60 - 1))).toEqual([]);
    const lateNow = at("09:00", undefined, mark * 60 + 4 * 60 + 33); // sweep noticed 4½ min late
    const actions = plan([s], lateNow);
    expect(actions).toHaveLength(1);
    const a = actions[0]!;
    expect(a.sessionId).toBe(s.id);
    expect(a.endedAt).toEqual(at("09:00", undefined, mark * 60));
    expect(a.endedBy).toBe("system");
    expect(a.endReason).toBe("auto_end");
    expect(a.stale).toBe(false);
    expect(chargedMinutes({ ...s, endedAt: a.endedAt }, typeByCode(types, code), lateNow)).toBe(mark);
  });

  it("smoke auto-ended at 10 carries overrun minutes (10 − 3 = 7)", () => {
    const s = session({ typeCode: "smoke", startedAt: at("09:00") });
    expect(plan([s], at("09:10"))[0]!.overrunMin).toBe(7);
  });

  it("stale toilet at 20 min: released, flagged stale, no charge", () => {
    const s = session({ typeCode: "toilet", startedAt: at("09:00"), effectiveMaxMin: null });
    expect(plan([s], at("09:19", undefined, 59))).toEqual([]);
    const a = plan([s], at("09:23"))[0]!;
    expect(a.endedAt).toEqual(at("09:20"));
    expect(a.endReason).toBe("stale");
    expect(a.stale).toBe(true);
    expect(a.overrunMin).toBe(0);
    expect(chargedMinutes({ ...s, endedAt: a.endedAt }, typeByCode(types, "toilet"), at("09:23"))).toBe(0);
  });

  it("16:00 closes every open session with the actual charge", () => {
    const meal = session({ typeCode: "meal", startedAt: at("15:58") });
    const toilet = session({ typeCode: "toilet", startedAt: at("15:50"), effectiveMaxMin: null });
    expect(plan([meal, toilet], at("15:59", undefined, 59))).toEqual([]);
    const actions = plan([meal, toilet], at("16:00"));
    expect(actions).toHaveLength(2);
    for (const a of actions) {
      expect(a.endedAt).toEqual(at("16:00"));
      expect(a.endReason).toBe("end_of_day");
      expect(a.stale).toBe(false);
    }
    expect(chargedMinutes({ ...meal, endedAt: at("16:00") }, typeByCode(types, "meal"), at("16:00"))).toBe(2);
  });

  it("whichever mark comes first wins", () => {
    const early = session({ typeCode: "smoke", startedAt: at("15:45") }); // mark 15:55 < 16:00
    const late = session({ typeCode: "meal", startedAt: at("15:45") }); // mark 16:10 > 16:00
    const actions = plan([early, late], at("16:30"));
    expect(actions.find((a) => a.sessionId === early.id)).toMatchObject({ endedAt: at("15:55"), endReason: "auto_end" });
    expect(actions.find((a) => a.sessionId === late.id)).toMatchObject({ endedAt: at("16:00"), endReason: "end_of_day" });
  });

  it("a session left open from a previous day is closed at that day's 16:00, not at now", () => {
    const s = session({ typeCode: "toilet", startedAt: at("15:55", "2026-09-08"), effectiveMaxMin: null });
    const a = plan([s], at("09:00", "2026-09-09"))[0]!;
    expect(a.endedAt).toEqual(at("16:00", "2026-09-08"));
    expect(a.endReason).toBe("end_of_day");
  });

  it("running twice is a no-op: ended sessions are no longer open", () => {
    const s = session({ typeCode: "smoke", startedAt: at("09:00") });
    const first = plan([s], at("09:12"));
    expect(first).toHaveLength(1);
    const after = { ...s, endedAt: first[0]!.endedAt, endedBy: first[0]!.endedBy, endReason: first[0]!.endReason };
    expect(plan([after], at("09:13"))).toEqual([]);
    expect(plan([{ ...s, voided: true }], at("09:13"))).toEqual([]);
  });
});
