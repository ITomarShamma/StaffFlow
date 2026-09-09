// Spec §5.3–§5.4 — starting, ending, overrun and status of break sessions.

import { allowanceLeft } from "./allowances";
import { durationSeconds, effectiveMax, remainingBudget, roundMinutes, usedToday } from "./budget";
import { leaveStateAt } from "./leave";
import { hasFreeSlot, poolCounts, resolvePool } from "./pools";
import { isWithinWorkHours } from "./tz";
import type {
  AgentRef,
  AgentStatus,
  AppConfig,
  BreakTypeCode,
  BreakTypeConfig,
  LeaveRecord,
  Pool,
  SessionRecord,
  TeamCaps,
} from "./types";
import { BREAK_TYPE_CODES, typeByCode } from "./types";

export type Refusal = "outside_hours" | "not_on_floor" | "on_leave" | "allowance_used" | "budget_exhausted" | "pool_full";

export interface StartContext {
  now: Date;
  agent: AgentRef;
  type: BreakTypeConfig;
  types: readonly BreakTypeConfig[];
  team: TeamCaps;
  cfg: AppConfig;
  /** The agent's sessions started today (Asia/Damascus), including voided ones. */
  agentTodaySessions: readonly SessionRecord[];
  /** Every open session in the team, any agent. */
  teamOpenSessions: readonly SessionRecord[];
  usersById: ReadonlyMap<string, AgentRef>;
  /** The agent's approved leave that could touch now. */
  agentApprovedLeave: readonly LeaveRecord[];
}

export type StartDecision =
  | { ok: true; pool: Pool; effectiveMaxMin: number | null }
  | { ok: false; reason: Refusal };

/** Spec §5.3 step 2 — the checks, in order; the first failure is the reason. */
export function canStart(ctx: StartContext): StartDecision {
  const { now, agent, type, cfg } = ctx;
  if (!isWithinWorkHours(now, cfg)) return { ok: false, reason: "outside_hours" };
  if (openSessionOf(agent.id, ctx.teamOpenSessions)) return { ok: false, reason: "not_on_floor" };
  if (leaveStateAt(ctx.agentApprovedLeave, now).kind !== "none") return { ok: false, reason: "on_leave" };
  if (!allowanceLeft(type, ctx.agentTodaySessions)) return { ok: false, reason: "allowance_used" };
  const remaining = remainingBudget(cfg, usedToday(ctx.agentTodaySessions, ctx.types, now));
  if (type.countsTowardBudget && remaining <= 0) return { ok: false, reason: "budget_exhausted" };
  const pool = resolvePool(type, agent.gender);
  if (!hasFreeSlot(pool, poolCounts(ctx.teamOpenSessions, ctx.usersById, ctx.types, ctx.team))) {
    return { ok: false, reason: "pool_full" };
  }
  return { ok: true, pool, effectiveMaxMin: effectiveMax(type, remaining) };
}

export function openSessionOf(userId: string, openSessions: readonly SessionRecord[]): SessionRecord | undefined {
  return openSessions.find((s) => s.userId === userId && s.endedAt === null && !s.voided);
}

export interface SessionDraft {
  userId: string;
  typeCode: BreakTypeCode;
  startedAt: Date;
  effectiveMaxMin: number | null;
}

export function newSessionDraft(ctx: StartContext, decision: { ok: true; effectiveMaxMin: number | null }): SessionDraft {
  return { userId: ctx.agent.id, typeCode: ctx.type.code, startedAt: ctx.now, effectiveMaxMin: decision.effectiveMaxMin };
}

export function elapsedSeconds(s: SessionRecord, now: Date): number {
  return durationSeconds(s, now);
}

/** Overrun = elapsed > effective max + grace. Never for toilet. */
export function isOverrun(s: SessionRecord, type: BreakTypeConfig, now: Date): boolean {
  if (s.voided || !type.countsTowardBudget || s.effectiveMaxMin == null) return false;
  const limitSec = (s.effectiveMaxMin + (type.graceMin ?? 0)) * 60;
  return durationSeconds(s, now) > limitSec;
}

/** Minutes charged beyond the effective max, once the grace has been exceeded; else 0. */
export function overrunMinutes(s: SessionRecord, type: BreakTypeConfig, now: Date): number {
  if (!isOverrun(s, type, now) || s.effectiveMaxMin == null) return 0;
  return Math.max(0, roundMinutes(durationSeconds(s, now)) - s.effectiveMaxMin);
}

export interface EndPatch {
  endedAt: Date;
  endedBy: "agent";
  overrunMin: number;
}

/** Spec §5.3 step 5 — "Back on floor" is the only way an agent ends a break. */
export function endByAgent(s: SessionRecord, type: BreakTypeConfig, now: Date): EndPatch {
  const ended: SessionRecord = { ...s, endedAt: now };
  return { endedAt: now, endedBy: "agent", overrunMin: overrunMinutes(ended, type, now) };
}

export interface StatusInput {
  now: Date;
  openSession: SessionRecord | undefined;
  types: readonly BreakTypeConfig[];
  approvedLeave: readonly LeaveRecord[];
}

/** Precedence (decision A10): daily leave > open session (overrun > on break) > hourly leave > on floor. */
export function agentStatus(i: StatusInput): AgentStatus {
  const leave = leaveStateAt(i.approvedLeave, i.now);
  if (leave.kind === "daily") return "on_leave";
  if (i.openSession) {
    return isOverrun(i.openSession, typeByCode(i.types, i.openSession.typeCode), i.now) ? "overrun" : "on_break";
  }
  if (leave.kind === "hourly") return "away";
  return "on_floor";
}

/**
 * Agent-screen button state (spec §5.3 step 3 + design): only a full pool says
 * "busy"; being on a break or on leave greys the button with no label ("blocked");
 * every other refusal says "unavailable" (not available today).
 */
export type ButtonState = "available" | "busy" | "unavailable" | "blocked";

export function buttonStateFor(decision: StartDecision): ButtonState {
  if (decision.ok) return "available";
  switch (decision.reason) {
    case "pool_full":
      return "busy";
    case "not_on_floor":
    case "on_leave":
      return "blocked";
    default:
      return "unavailable";
  }
}

export function buttonStates(ctx: Omit<StartContext, "type">): Record<BreakTypeCode, ButtonState> {
  const out = {} as Record<BreakTypeCode, ButtonState>;
  for (const code of BREAK_TYPE_CODES) {
    out[code] = buttonStateFor(canStart({ ...ctx, type: typeByCode(ctx.types, code) }));
  }
  return out;
}
