// Spec §9 — per agent, per day metrics, and the CSV.

import { budgetUsedDisplay, chargedMinutes, countable } from "./budget";
import { datesOfMonth, isWorkingDay } from "./tz";
import { leaveOnDate } from "./leave";
import { isOverrun } from "./sessions";
import type { AppConfig, BreakTypeConfig, LeaveRecord, SessionRecord } from "./types";
import { typeByCode } from "./types";

export interface SummaryRow {
  userId: string;
  name: string;
  budgetUsed: number; // clamped for display
  budget: number;
  smoke: { count: number; minutes: number };
  prayer: { count: number; minutes: number };
  meal: { count: number; minutes: number };
  toiletCount: number;
  callCount: number;
  overruns: number;
  autoEnded: number;
  edited: number;
  leaveMinutes: number;
  leaveDay: 0 | 1;
}

export interface SummaryInput {
  date: string;
  agents: readonly { id: string; nameAr: string }[];
  /** Sessions started on `date` (any agent), voided included. */
  sessions: readonly SessionRecord[];
  types: readonly BreakTypeConfig[];
  approvedLeave: readonly LeaveRecord[];
  cfg: AppConfig;
  now: Date;
}

export function dailySummary(i: SummaryInput): SummaryRow[] {
  return i.agents.map((agent) => {
    const all = countable(i.sessions, i.cfg).filter((s) => s.userId === agent.id);
    const live = all.filter((s) => !s.voided);
    const byType = (code: "smoke" | "prayer" | "meal") => {
      const type = typeByCode(i.types, code);
      const xs = live.filter((s) => s.typeCode === code);
      return { count: xs.length, minutes: xs.reduce((n, s) => n + chargedMinutes(s, type, i.now), 0) };
    };
    const smoke = byType("smoke");
    const prayer = byType("prayer");
    const meal = byType("meal");
    const leave = leaveOnDate(i.approvedLeave.filter((r) => r.userId === agent.id), i.date);
    return {
      userId: agent.id,
      name: agent.nameAr,
      budgetUsed: budgetUsedDisplay(smoke.minutes + prayer.minutes + meal.minutes, i.cfg),
      budget: i.cfg.dailyBudgetMin,
      smoke,
      prayer,
      meal,
      toiletCount: live.filter((s) => s.typeCode === "toilet").length,
      callCount: live.filter((s) => s.typeCode === "call").length,
      overruns: live.filter((s) => isOverrun(s, typeByCode(i.types, s.typeCode), i.now)).length,
      // ended_by = system, stale excluded (§9) — the 16:00 close counts (decision A9)
      autoEnded: live.filter((s) => s.endedBy === "system" && !s.stale).length,
      // a void is a correction too
      edited: all.filter((s) => s.editedAt !== null).length,
      leaveMinutes: leave.hourlyMinutes,
      leaveDay: leave.dailyCovers ? 1 : 0,
    };
  });
}

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Rows → CSV text with CRLF line ends. The route prepends the UTF-8 BOM for Excel. */
export function summaryCsv(headers: readonly string[], rows: readonly SummaryRow[], formatHours: (minutes: number) => string): string {
  const lines = [headers.map(csvCell).join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.name,
        `${r.budgetUsed}/${r.budget}`,
        r.smoke.count,
        r.smoke.minutes,
        r.prayer.count,
        r.prayer.minutes,
        r.meal.count,
        r.meal.minutes,
        r.toiletCount,
        r.callCount,
        r.overruns,
        r.autoEnded,
        r.edited,
        formatHours(r.leaveMinutes),
        r.leaveDay,
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return lines.join("\r\n") + "\r\n";
}

// ---------------------------------------------------------------------------------------
// Monthly report (decision 2026-09-12). A month is the sum of its daily summaries, computed
// by the same dailySummary, so a monthly figure always equals the daily figures added up
// and every daily rule (mis-clicks, voids, stale toilets, leave) carries over unchanged.

export interface MonthlyRow {
  userId: string;
  name: string;
  /** Working days the report covers. */
  daysCounted: number;
  /** daysCounted minus the days covered by daily leave. */
  daysAtWork: number;
  /** Sum of each day's reported budget use (each day already clamped at the budget). */
  budgetUsed: number;
  /** budgetUsed per day at work, one decimal. */
  avgPerDay: number;
  smoke: { count: number; minutes: number };
  prayer: { count: number; minutes: number };
  meal: { count: number; minutes: number };
  toiletCount: number;
  callCount: number;
  overruns: number;
  autoEnded: number;
  edited: number;
  leaveMinutes: number;
  leaveDays: number;
}

/** The days a monthly report covers: working days of `month`, up to and including today. */
export function reportDates(month: string, today: string, cfg: AppConfig): string[] {
  return datesOfMonth(month).filter((d) => d <= today && isWorkingDay(d, cfg));
}

/** Average break minutes per day at work, one decimal; 0 when there were no days at work. */
export function averagePerDay(budgetUsed: number, daysAtWork: number): number {
  return daysAtWork > 0 ? Math.round((budgetUsed / daysAtWork) * 10) / 10 : 0;
}

export function monthlyTotals(
  agents: readonly { id: string; nameAr: string }[],
  days: readonly { date: string; rows: readonly SummaryRow[] }[],
): MonthlyRow[] {
  return agents.map((agent) => {
    const mine = days.map((d) => d.rows.find((r) => r.userId === agent.id)).filter((r): r is SummaryRow => r !== undefined);
    const sum = (f: (r: SummaryRow) => number) => mine.reduce((n, r) => n + f(r), 0);
    const leaveDays = sum((r) => r.leaveDay);
    const daysAtWork = Math.max(0, days.length - leaveDays);
    const budgetUsed = sum((r) => r.budgetUsed);
    const pair = (k: "smoke" | "prayer" | "meal") => ({ count: sum((r) => r[k].count), minutes: sum((r) => r[k].minutes) });
    return {
      userId: agent.id,
      name: agent.nameAr,
      daysCounted: days.length,
      daysAtWork,
      budgetUsed,
      avgPerDay: averagePerDay(budgetUsed, daysAtWork),
      smoke: pair("smoke"),
      prayer: pair("prayer"),
      meal: pair("meal"),
      toiletCount: sum((r) => r.toiletCount),
      callCount: sum((r) => r.callCount),
      overruns: sum((r) => r.overruns),
      autoEnded: sum((r) => r.autoEnded),
      edited: sum((r) => r.edited),
      leaveMinutes: sum((r) => r.leaveMinutes),
      leaveDays,
    };
  });
}
