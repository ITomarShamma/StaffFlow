import { describe, expect, it } from "vitest";
import { allowanceLeft } from "@/domain/allowances";
import { chargedMinutes } from "@/domain/budget";
import { canCorrect, editEnd, voidSession } from "@/domain/corrections";
import { poolCounts } from "@/domain/pools";
import { isOverrun } from "@/domain/sessions";
import { typeByCode } from "@/domain/types";
import { at, cfg, session, team, types, usersById } from "./fixtures";

const smoke = typeByCode(types, "smoke");
const prayer = typeByCode(types, "prayer");
const now = at("12:00");

/** Demo step 6: A's smoke auto-ended at 10 min. */
const autoEnded = () =>
  session({ userId: "m1", typeCode: "smoke", startedAt: at("09:00"), endedAt: at("09:10"), endedBy: "system", endReason: "auto_end", overrunMin: 7 });

describe("corrections (spec §5.5, demo step 7)", () => {
  it("A corrected to 5 min → charged 5, overrun 1, edited, original 10 kept, ended_by stays system", () => {
    const r = editEnd({ session: autoEnded(), type: smoke, newEndedAt: at("09:05"), note: "عاد قبل التسجيل", editorId: "lead", now, cfg });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.patch.endedAt).toEqual(at("09:05"));
    expect(r.patch.overrunMin).toBe(2); // 5 − 3, grace exceeded
    expect(r.patch.originalEndedAt).toEqual(at("09:10"));
    expect(r.patch.originalEndedBy).toBe("system");
    expect(r.patch.editNote).toBe("عاد قبل التسجيل");
    expect(r.patch.editedById).toBe("lead");
    const corrected = { ...autoEnded(), ...r.patch };
    expect(chargedMinutes(corrected, smoke, now)).toBe(5);
    expect(isOverrun(corrected, smoke, now)).toBe(true);
    expect(corrected.endedBy).toBe("system");
  });

  it("a second edit keeps the first original", () => {
    const first = editEnd({ session: autoEnded(), type: smoke, newEndedAt: at("09:05"), note: "n1", editorId: "lead", now, cfg });
    if (!first.ok) throw new Error();
    const once = { ...autoEnded(), ...first.patch };
    const second = editEnd({ session: once, type: smoke, newEndedAt: at("09:04"), note: "n2", editorId: "lead", now, cfg });
    if (!second.ok) throw new Error();
    expect(second.patch.originalEndedAt).toEqual(at("09:10"));
    expect(second.patch.originalEndedBy).toBe("system");
  });

  it("refuses an empty note, an end at or before the start, and an end in the future", () => {
    const s = autoEnded();
    expect(editEnd({ session: s, type: smoke, newEndedAt: at("09:05"), note: "   ", editorId: "lead", now, cfg })).toEqual({ ok: false, error: "note_required" });
    expect(editEnd({ session: s, type: smoke, newEndedAt: at("09:00"), note: "x", editorId: "lead", now, cfg })).toEqual({ ok: false, error: "end_before_start" });
    expect(editEnd({ session: s, type: smoke, newEndedAt: at("12:01"), note: "x", editorId: "lead", now, cfg })).toEqual({ ok: false, error: "end_in_future" });
  });

  it("refuses sessions older than 7 days, open sessions and already-voided sessions", () => {
    const old = session({ userId: "m1", typeCode: "smoke", startedAt: at("09:00", "2026-09-01"), endedAt: at("09:03", "2026-09-01") });
    expect(canCorrect(old, now, cfg)).toEqual({ ok: false, reason: "too_old" });
    const recent = session({ userId: "m1", typeCode: "smoke", startedAt: at("09:00", "2026-09-03"), endedAt: at("09:03", "2026-09-03") });
    expect(canCorrect(recent, now, cfg)).toEqual({ ok: true });
    expect(canCorrect(session({ userId: "m1", typeCode: "smoke", startedAt: at("11:50") }), now, cfg)).toEqual({ ok: false, reason: "open" });
    expect(canCorrect({ ...autoEnded(), voided: true }, now, cfg)).toEqual({ ok: false, reason: "voided" });
    expect(voidSession({ session: { ...autoEnded(), voided: true }, note: "x", editorId: "lead", now, cfg })).toEqual({ ok: false, error: "voided" });
  });

  it("void → charge 0, allowance restored, pool slot not counted, note required", () => {
    const p = session({ userId: "m1", typeCode: "prayer", startedAt: at("09:00"), endedAt: at("09:10") });
    expect(voidSession({ session: p, note: "", editorId: "lead", now, cfg })).toEqual({ ok: false, error: "note_required" });
    const r = voidSession({ session: p, note: "أُدخلت بالخطأ", editorId: "lead", now, cfg });
    if (!r.ok) throw new Error();
    const voided = { ...p, ...r.patch };
    expect(voided.voided).toBe(true);
    expect(chargedMinutes(voided, prayer, now)).toBe(0);
    expect(allowanceLeft(prayer, [voided])).toBe(true);
    expect(poolCounts([{ ...voided, endedAt: null }], usersById, types, team).general.active).toBe(0);
  });
});
