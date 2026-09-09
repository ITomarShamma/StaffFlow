import { describe, expect, it } from "vitest";
import { formatHours } from "@/domain/format";
import { dailySummary, summaryCsv } from "@/domain/summary";
import { DAY, at, cfg, hourly, session, types } from "./fixtures";

const agents = [
  { id: "A", nameAr: "حمزة عيسى" },
  { id: "D", nameAr: "كرم قويدر" },
  { id: "E", nameAr: "عمر شمه" },
  { id: "N", nameAr: "نور أورفهلي" },
];

describe("daily summary (spec §9, demo step 11)", () => {
  const now = at("15:00");
  const sessions = [
    // A: smoke auto-ended at 10, corrected by the lead to 5
    session({ userId: "A", typeCode: "smoke", startedAt: at("09:00"), endedAt: at("09:05"), endedBy: "system", endReason: "auto_end", overrunMin: 2, editedAt: at("09:30"), editedById: "lead", editNote: "n", originalEndedAt: at("09:10"), originalEndedBy: "system" }),
    // D: meal 15 then prayer 10
    session({ userId: "D", typeCode: "meal", startedAt: at("10:00"), endedAt: at("10:15") }),
    session({ userId: "D", typeCode: "prayer", startedAt: at("11:00"), endedAt: at("11:10") }),
    // N: two toilet breaks (one stale), one voided smoke, one end-of-day close
    session({ userId: "N", typeCode: "toilet", startedAt: at("09:00"), endedAt: at("09:03"), effectiveMaxMin: null }),
    session({ userId: "N", typeCode: "toilet", startedAt: at("10:00"), endedAt: at("10:20"), effectiveMaxMin: null, endedBy: "system", endReason: "stale", stale: true }),
    session({ userId: "N", typeCode: "smoke", startedAt: at("11:00"), endedAt: at("11:03"), voided: true, editedAt: at("11:30"), editedById: "lead", editNote: "n" }),
    session({ userId: "N", typeCode: "prayer", startedAt: at("15:55", "2026-09-08"), endedAt: at("16:00", "2026-09-08"), endedBy: "system", endReason: "end_of_day" }),
  ];
  const leave = [hourly({ userId: "E", date: DAY, from: "14:00", to: "16:00" })];

  it("A: smoke 1, 5 min, 1 overrun, edited (and auto-ended, since the system did end it)", () => {
    const rows = dailySummary({ date: DAY, agents, sessions: sessions.filter((s) => s.startedAt >= at("00:00")), types, approvedLeave: leave, cfg, now });
    const a = rows.find((r) => r.userId === "A")!;
    expect(a.smoke).toEqual({ count: 1, minutes: 5 });
    expect(a.overruns).toBe(1);
    expect(a.edited).toBe(1);
    expect(a.autoEnded).toBe(1);
    expect(a.budgetUsed).toBe(5);
  });

  it("D: 25 / 25; E: 2 h leave; N: toilet 2, stale not auto-ended, voided smoke excluded but counted as edited", () => {
    const rows = dailySummary({ date: DAY, agents, sessions: sessions.filter((s) => s.startedAt >= at("00:00")), types, approvedLeave: leave, cfg, now });
    const d = rows.find((r) => r.userId === "D")!;
    expect(d.budgetUsed).toBe(25);
    expect(d.meal).toEqual({ count: 1, minutes: 15 });
    expect(d.prayer).toEqual({ count: 1, minutes: 10 });
    const e = rows.find((r) => r.userId === "E")!;
    expect(e.leaveMinutes).toBe(120);
    expect(e.leaveDay).toBe(0);
    const n = rows.find((r) => r.userId === "N")!;
    expect(n.toiletCount).toBe(2);
    expect(n.autoEnded).toBe(0);
    expect(n.smoke).toEqual({ count: 0, minutes: 0 });
    expect(n.edited).toBe(1);
  });

  it("the 16:00 close counts as auto-ended on its own day (decision A9)", () => {
    const rows = dailySummary({ date: "2026-09-08", agents, sessions: sessions.filter((s) => s.startedAt < at("00:00")), types, approvedLeave: [], cfg, now });
    expect(rows.find((r) => r.userId === "N")!.autoEnded).toBe(1);
  });

  it("CSV: header row, CRLF, quoting, Arabic preserved, hours formatted", () => {
    const rows = dailySummary({ date: DAY, agents: [{ id: "E", nameAr: 'عمر "أبو علي" شمه, مدير' }], sessions: [], types, approvedLeave: leave, cfg, now });
    const csv = summaryCsv(["الموظف", "الرصيد المستخدم"], rows, formatHours);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe("الموظف,الرصيد المستخدم");
    expect(lines[1]).toBe('"عمر ""أبو علي"" شمه, مدير",0/25,0,0,0,0,0,0,0,0,0,0,2,0');
    expect(csv.endsWith("\r\n")).toBe(true);
    expect(formatHours(90)).toBe("1.5");
    expect(formatHours(15)).toBe("0.25");
  });
});
