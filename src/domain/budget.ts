// Spec §5.2 — the daily break budget. The charge is the actual duration including
// overrun, rounded to the nearest whole minute (minimum 1) — decision Q5. Nothing is
// stored: the charge is always derived from the timestamps, so corrections never leave
// a stale number. An open session is charged for its elapsed time ("budget ticking").

import type { AppConfig, BreakTypeConfig, SessionRecord } from "./types";
import { typeByCode } from "./types";

export function durationSeconds(s: SessionRecord, now: Date): number {
  const end = s.endedAt ?? now;
  return Math.max(0, (end.getTime() - s.startedAt.getTime()) / 1000);
}

export function roundMinutes(seconds: number): number {
  if (seconds <= 0) return 0;
  return Math.max(1, Math.round(seconds / 60));
}

/**
 * A break shorter than the safety threshold was a mis-click, not a break: it counts for
 * nothing — no budget, no allowance, no counter, no report line (config min_session_s).
 * Only an ended session can be discarded; an open one is real, the agent is off the floor
 * right now however briefly.
 */
export function isDiscarded(s: SessionRecord, cfg: AppConfig): boolean {
  if (s.endedAt === null || s.voided) return false;
  return durationSeconds(s, s.endedAt) < cfg.minSessionS;
}

/** The sessions that count for anything. Apply before budget, allowance or reporting. */
export function countable(sessions: readonly SessionRecord[], cfg: AppConfig): SessionRecord[] {
  return sessions.filter((s) => !isDiscarded(s, cfg));
}

export function chargedMinutes(s: SessionRecord, type: BreakTypeConfig, now: Date): number {
  if (s.voided || !type.countsTowardBudget) return 0;
  return roundMinutes(durationSeconds(s, now));
}

export function usedToday(todaySessions: readonly SessionRecord[], types: readonly BreakTypeConfig[], now: Date): number {
  let total = 0;
  for (const s of todaySessions) total += chargedMinutes(s, typeByCode(types, s.typeCode), now);
  return total;
}

export function remainingBudget(cfg: AppConfig, used: number): number {
  return Math.max(0, cfg.dailyBudgetMin - used);
}

/** min(type max, remaining budget); null for types without a max (toilet). */
export function effectiveMax(type: BreakTypeConfig, remaining: number): number | null {
  if (type.maxMin == null || !type.countsTowardBudget) return null;
  return Math.min(type.maxMin, remaining);
}

/** The board and summary show "used / 25" clamped at the budget (design decision). */
export function budgetUsedDisplay(used: number, cfg: AppConfig): number {
  return Math.min(used, cfg.dailyBudgetMin);
}
