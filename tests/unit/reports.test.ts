// Decision 2026-09-12: the monthly report and the formatted Excel export.

import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { averagePerDay, dailySummary, monthlyTotals, reportDates, type SummaryRow } from "@/domain/summary";
import { datesOfMonth, isIsoMonth, monthOf } from "@/domain/tz";
import { buildWorkbook } from "@/server/excel";
import { at, cfg, daily, session, types } from "./fixtures";

describe("month helpers", () => {
  it("lists every date of a month, including short months and leap years", () => {
    expect(datesOfMonth("2026-09")).toHaveLength(30);
    expect(datesOfMonth("2026-09")[0]).toBe("2026-09-01");
    expect(datesOfMonth("2026-09").at(-1)).toBe("2026-09-30");
    expect(datesOfMonth("2026-02")).toHaveLength(28);
    expect(datesOfMonth("2028-02")).toHaveLength(29);
  });

  it("validates YYYY-MM and extracts the month of a date", () => {
    expect(isIsoMonth("2026-09")).toBe(true);
    expect(isIsoMonth("2026-13")).toBe(false);
    expect(isIsoMonth("2026-9")).toBe(false);
    expect(monthOf("2026-09-15")).toBe("2026-09");
  });
});

describe("which days a monthly report covers", () => {
  it("working days only (Saturday to Thursday), and never a day after today", () => {
    const days = reportDates("2026-09", "2026-09-12", cfg);
    // 1–12 Sep 2026: Fridays are the 4th and the 11th
    expect(days).toEqual(["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-05", "2026-09-06", "2026-09-07", "2026-09-08", "2026-09-09", "2026-09-10", "2026-09-12"]);
    expect(days).not.toContain("2026-09-13");
  });

  it("a past month is covered in full; a future month not at all", () => {
    expect(reportDates("2026-08", "2026-09-12", cfg)).toHaveLength(27); // 31 days minus 4 Fridays
    expect(reportDates("2026-10", "2026-09-12", cfg)).toEqual([]);
  });
});

describe("monthly totals are the daily summaries added up", () => {
  const agents = [{ id: "m1", nameAr: "أ" }];
  const day = (date: string, sessions: ReturnType<typeof session>[], leave = [] as ReturnType<typeof daily>[]) => ({
    date,
    rows: dailySummary({ date, agents, sessions, types, approvedLeave: leave, cfg, now: at("16:00", date) }),
  });

  it("sums counts and minutes across days and averages over the days at work", () => {
    const d1 = day("2026-09-08", [
      session({ typeCode: "smoke", startedAt: at("09:00", "2026-09-08"), endedAt: at("09:03", "2026-09-08") }),
      session({ typeCode: "meal", startedAt: at("12:00", "2026-09-08"), endedAt: at("12:15", "2026-09-08") }),
      session({ typeCode: "call", startedAt: at("13:00", "2026-09-08"), endedAt: at("13:04", "2026-09-08") }),
    ]);
    const d2 = day("2026-09-09", [session({ typeCode: "smoke", startedAt: at("10:00", "2026-09-09"), endedAt: at("10:02", "2026-09-09") })]);
    const [row] = monthlyTotals(agents, [d1, d2]);
    expect(row!.daysCounted).toBe(2);
    expect(row!.daysAtWork).toBe(2);
    expect(row!.smoke).toEqual({ count: 2, minutes: 5 });
    expect(row!.meal).toEqual({ count: 1, minutes: 15 });
    expect(row!.callCount).toBe(1);
    expect(row!.budgetUsed).toBe(20); // 18 on day one, 2 on day two — calls are outside the budget
    expect(row!.avgPerDay).toBe(10);
    // …and the monthly figure equals the daily ones added together
    expect(row!.budgetUsed).toBe(d1.rows[0]!.budgetUsed + d2.rows[0]!.budgetUsed);
  });

  it("a day on daily leave is counted, but not as a day at work", () => {
    const off = daily({ start: "2026-09-09", end: "2026-09-09", minutes: 480, status: "approved", userId: "m1" });
    const [row] = monthlyTotals(agents, [day("2026-09-08", []), day("2026-09-09", [], [off])]);
    expect(row!.leaveDays).toBe(1);
    expect(row!.daysAtWork).toBe(1);
  });

  it("a person with no rows gets zeros, and the average never divides by zero", () => {
    const [row] = monthlyTotals([{ id: "nobody", nameAr: "ب" }], [day("2026-09-08", [])]);
    expect(row!.budgetUsed).toBe(0);
    expect(averagePerDay(0, 0)).toBe(0);
    expect(averagePerDay(25, 3)).toBe(8.3);
  });
});

describe("formatted Excel export", () => {
  type Row = { name: string; a: number; b: number };
  const rows: Row[] = [
    { name: "أحمد", a: 1, b: 2 },
    { name: "سارة", a: 3, b: 4 },
  ];

  it("writes a right-to-left sheet with a title block, grouped header, real numbers and a totals row", async () => {
    const buf = await buildWorkbook<Row>({
      sheetName: "الملخص اليومي",
      title: "الملخص اليومي",
      org: "شام كاش",
      meta: "عدد الموظفين: 2",
      columns: [
        { header: "الموظف", width: 24, kind: "text", value: (x) => x.name },
        { group: "تدخين", header: "العدد", width: 8, kind: "int", value: (x) => x.a, total: (rs) => rs.reduce((n, x) => n + x.a, 0) },
        { group: "تدخين", header: "الدقائق", width: 8, kind: "int", value: (x) => x.b },
      ],
      rows,
      totalLabel: "المجموع",
      footer: "&Cصفحة &P من &N",
    });
    expect(buf.subarray(0, 2).toString()).toBe("PK"); // a real .xlsx (zip), not text

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
    const ws = wb.worksheets[0]!;
    expect(ws.name).toBe("الملخص اليومي");
    expect(ws.views[0]?.rightToLeft).toBe(true);
    expect(ws.getCell("A1").value).toBe("الملخص اليومي");
    expect(ws.getCell(5, 1).value).toBe("الموظف"); // spans both header rows
    expect(ws.getCell(5, 2).value).toBe("تدخين"); // group over its two columns
    expect(ws.getCell(6, 2).value).toBe("العدد");
    expect(ws.getCell(6, 3).value).toBe("الدقائق");
    expect(ws.getCell(7, 1).value).toBe("أحمد");
    expect(ws.getCell(8, 2).value).toBe(3); // a number, so it can be summed in Excel
    expect(ws.getCell(9, 1).value).toBe("المجموع");
    expect(ws.getCell(9, 2).value).toBe(4);
    expect(ws.getCell(9, 3).value).toBeNull(); // no total asked for
    expect(ws.pageSetup.orientation).toBe("landscape");
  });
});
