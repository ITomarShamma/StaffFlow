// Spec §5.1 — per-type daily allowance. Voided sessions do not count.

import type { BreakTypeConfig, SessionRecord } from "./types";

export function usedCount(type: BreakTypeConfig, todaySessions: readonly SessionRecord[]): number {
  return todaySessions.filter((s) => s.typeCode === type.code && !s.voided).length;
}

export function allowanceLeft(type: BreakTypeConfig, todaySessions: readonly SessionRecord[]): boolean {
  if (type.allowancePerDay == null) return true;
  return usedCount(type, todaySessions) < type.allowancePerDay;
}
