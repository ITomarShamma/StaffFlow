// Spec §5.4 — auto-end, stale toilet release and the 16:00 close, as one idempotent plan.
// Inputs are the open sessions; every end instant is fixed by the start time (start + mark,
// or that day's work end), never by when the sweep happened to run. Running the plan
// twice yields nothing the second time because the sessions are no longer open.

import { overrunMinutes } from "./sessions";
import { localParts, workWindow } from "./tz";
import type { AppConfig, BreakTypeConfig, EndReason, SessionRecord } from "./types";
import { typeByCode } from "./types";

export interface SweepAction {
  sessionId: string;
  endedAt: Date;
  endedBy: "system";
  endReason: EndReason;
  stale: boolean;
  overrunMin: number;
}

export interface SweepInput {
  now: Date;
  openSessions: readonly SessionRecord[];
  types: readonly BreakTypeConfig[];
  cfg: AppConfig;
}

export function planSweep(i: SweepInput): SweepAction[] {
  const actions: SweepAction[] = [];
  for (const s of i.openSessions) {
    if (s.endedAt || s.voided) continue;
    const type = typeByCode(i.types, s.typeCode);
    const markAt = new Date(s.startedAt.getTime() + type.autoEndAtMin * 60000);
    const markReason: EndReason = type.countsTowardBudget ? "auto_end" : "stale";
    const eodAt = workWindow(localParts(s.startedAt).date, i.cfg).end;

    // Earliest applicable end; on a tie the type's own mark wins.
    let endedAt: Date;
    let endReason: EndReason;
    if (markAt.getTime() <= eodAt.getTime()) {
      endedAt = markAt;
      endReason = markReason;
    } else {
      endedAt = eodAt;
      endReason = "end_of_day";
    }
    if (endedAt.getTime() < s.startedAt.getTime()) endedAt = s.startedAt;
    if (endedAt.getTime() > i.now.getTime()) continue;

    const ended: SessionRecord = { ...s, endedAt };
    actions.push({
      sessionId: s.id,
      endedAt,
      endedBy: "system",
      endReason,
      stale: endReason === "stale",
      overrunMin: overrunMinutes(ended, type, endedAt),
    });
  }
  return actions;
}
