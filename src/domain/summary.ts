// Spec §9 — per agent, per day metrics, and the CSV.

import { budgetUsedDisplay, chargedMinutes } from "./budget";
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
    const all = i.sessions.filter((s) => s.userId === agent.id);
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
