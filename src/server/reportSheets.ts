// The two exported sheets (decision 2026-09-12): which columns, in which groups, with which
// totals. Numbers are written as real numbers, not text, so a manager can sum and sort them.

import { fmtDate, formatHours } from "@/domain/format";
import { averagePerDay, type MonthlyRow, type SummaryRow } from "@/domain/summary";
import { localParts, weekdayOf } from "@/domain/tz";
import { ar } from "@/i18n/ar";
import { buildWorkbook, type SheetColumn } from "./excel";
import type { MonthlyReport } from "./reports";

const s = ar.design.summary;
const r = ar.todo.reports;
const sep = `  ${ar.breaks.counterSeparator.trim()}  `;
const org = `${r.org} ${ar.breaks.counterSeparator.trim()} ${ar.brand}`;
const footer = `&C${r.pageFooter}`;

/** Column builders bound to one row type. Numeric columns total by summing unless told otherwise. */
function columnsFor<R>() {
  return {
    text: (header: string, get: (x: R) => string, width = 24): SheetColumn<R> => ({ header, width, kind: "text", value: get }),
    num: (
      header: string,
      get: (x: R) => number,
      o: { group?: string; width?: number; kind?: "int" | "dec"; total?: (rows: readonly R[]) => number } = {},
    ): SheetColumn<R> => ({
      header,
      group: o.group,
      width: o.width ?? 9,
      kind: o.kind ?? "int",
      value: get,
      total: o.total ?? ((rows) => rows.reduce((n, x) => n + get(x), 0)),
    }),
  };
}

const hours = (minutes: number) => Number(formatHours(minutes));

export function dayLabel(date: string): string {
  return `${fmtDate(date)} (${r.weekdays[weekdayOf(date)]})`;
}

export function monthLabel(month: string): string {
  return `${r.months[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;
}

function stamp(d: Date): string {
  const p = localParts(d);
  return `${fmtDate(p.date)} ${p.time}`;
}

export function dailyWorkbook(date: string, rows: readonly SummaryRow[], issuedAt: Date): Promise<Buffer> {
  const c = columnsFor<SummaryRow>();
  return buildWorkbook({
    sheetName: ar.nav.dailySummary,
    title: `${ar.nav.dailySummary} — ${dayLabel(date)}`,
    org,
    meta: [`${r.staffCount}: ${rows.length}`, `${r.issuedAt}: ${stamp(issuedAt)}`].join(sep),
    columns: [
      c.text(ar.table.agent, (x) => x.name),
      c.num(r.budgetMinutes, (x) => x.budgetUsed, { width: 14 }),
      c.num(ar.table.count, (x) => x.smoke.count, { group: s.smoke }),
      c.num(ar.table.minutes, (x) => x.smoke.minutes, { group: s.smoke }),
      c.num(ar.table.count, (x) => x.prayer.count, { group: s.prayer }),
      c.num(ar.table.minutes, (x) => x.prayer.minutes, { group: s.prayer }),
      c.num(ar.table.count, (x) => x.meal.count, { group: s.meal }),
      c.num(ar.table.minutes, (x) => x.meal.minutes, { group: s.meal }),
      c.num(ar.table.count, (x) => x.toiletCount, { group: s.toilet, width: 10 }),
      c.num(ar.table.count, (x) => x.callCount, { group: s.call, width: 10 }),
      c.num(ar.table.overruns, (x) => x.overruns, { width: 10 }),
      c.num(ar.breaks.autoEnded, (x) => x.autoEnded, { width: 11 }),
      c.num(ar.breaks.edited, (x) => x.edited),
      c.num(ar.leave.hours, (x) => hours(x.leaveMinutes), {
        group: s.leave,
        kind: "dec",
        total: (rows) => hours(rows.reduce((n, x) => n + x.leaveMinutes, 0)),
      }),
      c.num(ar.table.day, (x) => x.leaveDay, { group: s.leave }),
    ],
    rows,
    totalLabel: r.total,
    footer,
  });
}

export function monthlyWorkbook(report: MonthlyReport): Promise<Buffer> {
  const c = columnsFor<MonthlyRow>();
  const { dates, rows } = report;
  const coverage = dates.length > 0 ? r.coverage(fmtDate(dates[0]!), fmtDate(dates[dates.length - 1]!), dates.length) : r.noDays;
  const total = (rows: readonly MonthlyRow[], f: (x: MonthlyRow) => number) => rows.reduce((n, x) => n + f(x), 0);
  return buildWorkbook({
    sheetName: ar.nav.monthlyReport,
    title: `${ar.nav.monthlyReport} — ${monthLabel(report.month)}`,
    org,
    meta: [coverage, `${r.staffCount}: ${rows.length}`, `${r.issuedAt}: ${stamp(report.issuedAt)}`].join(sep),
    columns: [
      c.text(ar.table.agent, (x) => x.name),
      c.num(r.daysAtWork, (x) => x.daysAtWork, { width: 11 }),
      c.num(r.budgetMinutes, (x) => x.budgetUsed, { width: 14 }),
      c.num(r.avgPerDay, (x) => x.avgPerDay, {
        width: 13,
        kind: "dec",
        // The team average is total minutes over total days at work, not an average of averages.
        total: (rs) => averagePerDay(total(rs, (x) => x.budgetUsed), total(rs, (x) => x.daysAtWork)),
      }),
      c.num(ar.table.count, (x) => x.smoke.count, { group: s.smoke }),
      c.num(ar.table.minutes, (x) => x.smoke.minutes, { group: s.smoke }),
      c.num(ar.table.count, (x) => x.prayer.count, { group: s.prayer }),
      c.num(ar.table.minutes, (x) => x.prayer.minutes, { group: s.prayer }),
      c.num(ar.table.count, (x) => x.meal.count, { group: s.meal }),
      c.num(ar.table.minutes, (x) => x.meal.minutes, { group: s.meal }),
      c.num(ar.table.count, (x) => x.toiletCount, { group: s.toilet, width: 10 }),
      c.num(ar.table.count, (x) => x.callCount, { group: s.call, width: 10 }),
      c.num(ar.table.overruns, (x) => x.overruns, { width: 10 }),
      c.num(ar.breaks.autoEnded, (x) => x.autoEnded, { width: 11 }),
      c.num(ar.breaks.edited, (x) => x.edited),
      c.num(ar.leave.hours, (x) => hours(x.leaveMinutes), {
        group: s.leave,
        kind: "dec",
        total: (rs) => hours(total(rs, (x) => x.leaveMinutes)),
      }),
      c.num(r.leaveDays, (x) => x.leaveDays, { group: s.leave }),
    ],
    rows,
    totalLabel: r.total,
    footer,
  });
}
