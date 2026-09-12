// Monthly report query (decision 2026-09-12): one database read for the whole month, then
// the domain's own dailySummary for each working day and monthlyTotals across them, so the
// monthly figures are, by construction, the daily figures added up.

import { dailySummary, monthlyTotals, reportDates, type MonthlyRow } from "@/domain/summary";
import { addDays, datesOfMonth, dayStartUtc, localParts } from "@/domain/tz";
import { serverNow } from "./clock";
import { loadBreakTypes, loadConfig } from "./config";
import { prisma } from "./db";
import { toLeave, toSession } from "./mappers";
import { runSweep } from "./sweep";

export interface MonthlyReport {
  month: string;
  /** The working days covered, in order. */
  dates: string[];
  rows: MonthlyRow[];
  issuedAt: Date;
}

export async function monthlySummaryFor(month: string): Promise<MonthlyReport> {
  const now = await serverNow();
  await runSweep(now);
  const cfg = await loadConfig();
  const dates = reportDates(month, localParts(now).date, cfg);
  const all = datesOfMonth(month);
  const from = dayStartUtc(all[0]!);
  const to = dayStartUtc(addDays(all[all.length - 1]!, 1));

  const [types, people, sessions, leave] = await Promise.all([
    loadBreakTypes(),
    // Same people and order as the daily summary: agents first, then the Team Lead.
    prisma.user.findMany({
      where: { role: { in: ["agent", "team_lead"] }, active: true },
      orderBy: [{ role: "asc" }, { username: "asc" }],
    }),
    prisma.breakSession.findMany({ where: { startedAt: { gte: from, lt: to } } }),
    prisma.leaveRequest.findMany({ where: { status: "approved", startsAt: { lt: to }, endsAt: { gt: from } } }),
  ]);

  const agents = people.map((p) => ({ id: p.id, nameAr: p.nameAr }));
  const records = sessions.map(toSession);
  const approved = leave.map(toLeave);
  const days = dates.map((date) => {
    const start = dayStartUtc(date).getTime();
    const end = dayStartUtc(addDays(date, 1)).getTime();
    const that = records.filter((s) => s.startedAt.getTime() >= start && s.startedAt.getTime() < end);
    return { date, rows: dailySummary({ date, agents, sessions: that, types, approvedLeave: approved, cfg, now }) };
  });

  return { month, dates, rows: monthlyTotals(agents, days), issuedAt: now };
}
