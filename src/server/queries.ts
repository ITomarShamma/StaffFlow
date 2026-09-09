// Reads. Every read that touches sessions runs the sweep first (CLAUDE.md rule 9).

import { formatDays, remainingMinutes } from "@/domain/balance";
import { budgetUsedDisplay, usedToday } from "@/domain/budget";
import { usedCount } from "@/domain/allowances";
import { leaveStateAt, requestDate } from "@/domain/leave";
import { poolCounts, type PoolCounts } from "@/domain/pools";
import { agentStatus, buttonStates, isOverrun, openSessionOf, type ButtonState } from "@/domain/sessions";
import { dailySummary, type SummaryRow } from "@/domain/summary";
import { localDayBounds, localParts, yearOf } from "@/domain/tz";
import type { AgentRef, AgentStatus, AppConfig, BreakTypeCode, BreakTypeConfig, LeaveRecord, SessionRecord, TeamCaps } from "@/domain/types";
import { typeByCode } from "@/domain/types";
import { serverNow } from "./clock";
import { loadBreakTypes, loadConfig, loadTeam } from "./config";
import { prisma } from "./db";
import { toAgentRef, toLeave, toSession, toUser, type AppUser } from "./mappers";
import { runSweep, sweepUnlocked } from "./sweep";

export interface TeamContext {
  now: Date;
  day: { date: string; start: Date; end: Date };
  cfg: AppConfig;
  types: BreakTypeConfig[];
  team: { id: string; caps: TeamCaps };
  agents: AppUser[];
  usersById: Map<string, AgentRef>;
  openSessions: SessionRecord[];
  todaySessions: SessionRecord[];
  /** Approved leave touching today. */
  leave: LeaveRecord[];
}

/**
 * Everything the board and the agent screen need, after the sweep.
 * `locked: true` means the caller already holds the write lock.
 */
export async function loadTeamContext(now?: Date, opts: { locked?: boolean } = {}): Promise<TeamContext> {
  const at = now ?? (await serverNow());
  if (opts.locked) await sweepUnlocked(at);
  else await runSweep(at);
  const day = localDayBounds(at);
  const [cfg, types, team, agentRows, openRows, todayRows, leaveRows] = await Promise.all([
    loadConfig(),
    loadBreakTypes(),
    loadTeam(),
    prisma.user.findMany({ where: { role: "agent", active: true }, orderBy: { username: "asc" } }),
    prisma.breakSession.findMany({ where: { endedAt: null, voided: false } }),
    prisma.breakSession.findMany({ where: { startedAt: { gte: day.start, lt: day.end } }, orderBy: { startedAt: "asc" } }),
    prisma.leaveRequest.findMany({ where: { status: "approved", startsAt: { lt: day.end }, endsAt: { gt: day.start } } }),
  ]);
  const agents = agentRows.map(toUser);
  return {
    now: at,
    day,
    cfg,
    types,
    team,
    agents,
    usersById: new Map(agents.map((a) => [a.id, toAgentRef(a)])),
    openSessions: openRows.map(toSession),
    todaySessions: todayRows.map(toSession),
    leave: leaveRows.map(toLeave),
  };
}

export interface TimerVM {
  startedAtMs: number;
  effectiveMaxMin: number | null;
  /** Instant after which the session counts as overrun; null for toilet. */
  overrunAtMs: number | null;
  typeCode: BreakTypeCode;
}

export interface TileVM {
  userId: string;
  name: string;
  status: AgentStatus;
  timer: TimerVM | null;
  budgetUsed: number;
  budget: number;
  counters: { smoke: [number, number]; prayer: [number, number]; meal: [number, number] };
  flags: ("autoEnded" | "stale" | "endOfDay" | "edited")[];
  note: { kind: "away"; from: string; to: string } | { kind: "leave"; start: string; end: string } | null;
}

export function timerFor(s: SessionRecord, types: BreakTypeConfig[]): TimerVM {
  const type = typeByCode(types, s.typeCode);
  const overrunAtMs =
    type.countsTowardBudget && s.effectiveMaxMin != null ? s.startedAt.getTime() + (s.effectiveMaxMin + (type.graceMin ?? 0)) * 60000 : null;
  return { startedAtMs: s.startedAt.getTime(), effectiveMaxMin: s.effectiveMaxMin, overrunAtMs, typeCode: s.typeCode };
}

export function tileFor(ctx: TeamContext, agent: AppUser): TileVM {
  const mine = ctx.todaySessions.filter((s) => s.userId === agent.id);
  const open = openSessionOf(agent.id, ctx.openSessions);
  const leave = ctx.leave.filter((r) => r.userId === agent.id);
  const status = agentStatus({ now: ctx.now, openSession: open, types: ctx.types, approvedLeave: leave });
  const used = usedToday(mine, ctx.types, ctx.now);
  const count = (code: BreakTypeCode): [number, number] => {
    const t = typeByCode(ctx.types, code);
    return [usedCount(t, mine), t.allowancePerDay ?? 0];
  };
  const ended = mine.filter((s) => s.endedAt !== null);
  const flags: TileVM["flags"] = [];
  if (ended.some((s) => s.endReason === "auto_end" && !s.voided)) flags.push("autoEnded");
  if (ended.some((s) => s.stale && !s.voided)) flags.push("stale");
  if (ended.some((s) => s.endReason === "end_of_day" && !s.voided)) flags.push("endOfDay");
  if (mine.some((s) => s.editedAt !== null)) flags.push("edited");
  const state = leaveStateAt(leave, ctx.now);
  let note: TileVM["note"] = null;
  if (status === "away" && state.kind === "hourly") note = { kind: "away", from: state.request.fromTime ?? "", to: state.request.toTime ?? "" };
  if (status === "on_leave" && state.kind === "daily") note = { kind: "leave", start: state.request.startDate ?? "", end: state.request.endDate ?? "" };
  return {
    userId: agent.id,
    name: agent.nameAr,
    status,
    timer: open && status !== "on_leave" ? timerFor(open, ctx.types) : null,
    budgetUsed: budgetUsedDisplay(used, ctx.cfg),
    budget: ctx.cfg.dailyBudgetMin,
    counters: { smoke: count("smoke"), prayer: count("prayer"), meal: count("meal") },
    flags,
    note,
  };
}

export interface BoardVM {
  tiles: TileVM[];
  pools: PoolCounts;
  capGeneral: number;
  nowMs: number;
}

export function boardFor(ctx: TeamContext): BoardVM {
  return {
    tiles: ctx.agents.map((a) => tileFor(ctx, a)),
    pools: poolCounts(ctx.openSessions, ctx.usersById, ctx.types, ctx.team.caps),
    capGeneral: ctx.team.caps.capGeneral,
    nowMs: ctx.now.getTime(),
  };
}

export interface AgentHomeVM {
  status: AgentStatus;
  timer: TimerVM | null;
  buttons: Record<BreakTypeCode, ButtonState>;
  nowMs: number;
}

export function agentHomeFor(ctx: TeamContext, me: AppUser): AgentHomeVM {
  const agent = ctx.usersById.get(me.id) ?? toAgentRef(me);
  const open = openSessionOf(me.id, ctx.openSessions);
  const leave = ctx.leave.filter((r) => r.userId === me.id);
  const status = agentStatus({ now: ctx.now, openSession: open, types: ctx.types, approvedLeave: leave });
  const buttons = buttonStates({
    now: ctx.now,
    agent,
    types: ctx.types,
    team: ctx.team.caps,
    cfg: ctx.cfg,
    agentTodaySessions: ctx.todaySessions.filter((s) => s.userId === me.id),
    teamOpenSessions: ctx.openSessions,
    usersById: ctx.usersById,
    agentApprovedLeave: leave,
  });
  return { status, timer: open ? timerFor(open, ctx.types) : null, buttons, nowMs: ctx.now.getTime() };
}

/** Corrections dialog: one agent's sessions started today, oldest first. */
export interface CorrectionRowVM {
  id: string;
  typeCode: BreakTypeCode;
  startMs: number;
  endMs: number | null;
  voided: boolean;
  flags: ("overrun" | "autoEnded" | "stale" | "endOfDay" | "edited")[];
  canAct: boolean;
}

export function correctionRowsFor(ctx: TeamContext, agentId: string): { rows: CorrectionRowVM[]; budgetUsed: number } {
  const mine = ctx.todaySessions.filter((s) => s.userId === agentId);
  const rows = mine.map((s): CorrectionRowVM => {
    const type = typeByCode(ctx.types, s.typeCode);
    const flags: CorrectionRowVM["flags"] = [];
    if (s.endedAt && isOverrun(s, type, ctx.now)) flags.push("overrun");
    if (s.endReason === "auto_end") flags.push("autoEnded");
    if (s.stale) flags.push("stale");
    if (s.endReason === "end_of_day") flags.push("endOfDay");
    if (s.editedAt) flags.push("edited");
    return {
      id: s.id,
      typeCode: s.typeCode,
      startMs: s.startedAt.getTime(),
      endMs: s.endedAt?.getTime() ?? null,
      voided: s.voided,
      flags,
      canAct: s.endedAt !== null && !s.voided,
    };
  });
  return { rows, budgetUsed: budgetUsedDisplay(usedToday(mine, ctx.types, ctx.now), ctx.cfg) };
}

// ---- Leave ----

export interface LeaveRowVM {
  id: string;
  userId: string;
  agentName: string;
  kind: "hourly" | "daily";
  date: string | null;
  fromTime: string | null;
  toTime: string | null;
  startDate: string | null;
  endDate: string | null;
  minutes: number;
  reason: string;
  status: LeaveRecord["status"];
  decisionNote: string | null;
  /** Remaining balance of that agent for the request's year, formatted in days. */
  remainingDays: string;
  sortKey: string;
}

async function leaveRows(where: { userId?: string; status?: string | { in: string[] } }): Promise<LeaveRowVM[]> {
  const [cfg, rows, users] = await Promise.all([
    loadConfig(),
    prisma.leaveRequest.findMany({ where, orderBy: { createdAt: "desc" } }),
    prisma.user.findMany({ where: { role: "agent" } }),
  ]);
  const names = new Map(users.map((u) => [u.id, u.nameAr]));
  const userIds = [...new Set(rows.map((r) => r.userId))];
  const approved = userIds.length
    ? (await prisma.leaveRequest.findMany({ where: { userId: { in: userIds }, status: "approved" } })).map(toLeave)
    : [];
  return rows.map(toLeave).map((r) => {
    const year = yearOf(requestDate(r));
    const remaining = remainingMinutes(
      cfg,
      approved.filter((a) => a.userId === r.userId),
      year,
    );
    return {
      id: r.id,
      userId: r.userId,
      agentName: names.get(r.userId) ?? "",
      kind: r.kind,
      date: r.date,
      fromTime: r.fromTime,
      toTime: r.toTime,
      startDate: r.startDate,
      endDate: r.endDate,
      minutes: r.minutes,
      reason: r.reason,
      status: r.status,
      decisionNote: r.decisionNote,
      remainingDays: formatDays(remaining, cfg),
      sortKey: r.kind === "hourly" ? `${r.date} ${r.fromTime}` : `${r.startDate}`,
    };
  });
}

export async function myLeave(userId: string): Promise<{ rows: LeaveRowVM[]; remainingDays: string }> {
  const now = await serverNow();
  const year = yearOf(localParts(now).date);
  const [cfg, rows, approved] = await Promise.all([
    loadConfig(),
    leaveRows({ userId }),
    prisma.leaveRequest.findMany({ where: { userId, status: "approved" } }),
  ]);
  rows.sort((a, b) => (a.sortKey < b.sortKey ? 1 : a.sortKey > b.sortKey ? -1 : 0));
  return { rows, remainingDays: formatDays(remainingMinutes(cfg, approved.map(toLeave), year), cfg) };
}

export async function allLeave(): Promise<LeaveRowVM[]> {
  const rows = await leaveRows({});
  rows.sort((a, b) => (a.sortKey < b.sortKey ? 1 : a.sortKey > b.sortKey ? -1 : 0));
  return rows;
}

export async function leaveByStatus(status: "pending" | "approved"): Promise<LeaveRowVM[]> {
  const rows = await leaveRows({ status });
  if (status === "pending") rows.sort((a, b) => (a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0));
  else rows.sort((a, b) => (a.sortKey < b.sortKey ? 1 : a.sortKey > b.sortKey ? -1 : 0));
  return rows;
}

export async function pendingCounts(): Promise<{ pending: number; approved: number }> {
  const [pending, approved] = await Promise.all([
    prisma.leaveRequest.count({ where: { status: "pending" } }),
    prisma.leaveRequest.count({ where: { status: "approved" } }),
  ]);
  return { pending, approved };
}

export interface BalanceRowVM {
  userId: string;
  name: string;
  usedDays: string;
  remainingDays: string;
  usedPct: number;
}

export async function balancesFor(year: number): Promise<BalanceRowVM[]> {
  const [cfg, agents, approved] = await Promise.all([
    loadConfig(),
    prisma.user.findMany({ where: { role: "agent", active: true }, orderBy: { username: "asc" } }),
    prisma.leaveRequest.findMany({ where: { status: "approved" } }),
  ]);
  const all = approved.map(toLeave);
  const total = cfg.annualLeaveDays * cfg.hoursPerLeaveDay * 60;
  return agents.map((a) => {
    const remaining = remainingMinutes(cfg, all.filter((r) => r.userId === a.id), year);
    const used = total - remaining;
    return {
      userId: a.id,
      name: a.nameAr,
      usedDays: formatDays(used, cfg),
      remainingDays: formatDays(remaining, cfg),
      usedPct: total > 0 ? Math.round((used / total) * 100) : 0,
    };
  });
}

export async function summaryFor(date: string): Promise<SummaryRow[]> {
  const now = await serverNow();
  await runSweep(now);
  const start = localDayBounds(new Date(`${date}T12:00:00Z`)); // any instant on that local day
  const [cfg, types, agents, sessions, leave] = await Promise.all([
    loadConfig(),
    loadBreakTypes(),
    prisma.user.findMany({ where: { role: "agent", active: true }, orderBy: { username: "asc" } }),
    prisma.breakSession.findMany({ where: { startedAt: { gte: start.start, lt: start.end } } }),
    prisma.leaveRequest.findMany({ where: { status: "approved", startsAt: { lt: start.end }, endsAt: { gt: start.start } } }),
  ]);
  return dailySummary({
    date,
    agents: agents.map((a) => ({ id: a.id, nameAr: a.nameAr })),
    sessions: sessions.map(toSession),
    types,
    approvedLeave: leave.map(toLeave),
    cfg,
    now,
  });
}
