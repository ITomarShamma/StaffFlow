// Applies the domain's sweep plan (CLAUDE.md rule 9). Called at the start of every read
// and write that touches sessions, and every few seconds from instrumentation.ts.

import { planSweep } from "@/domain/sweep";
import { serverNow } from "./clock";
import { loadBreakTypes, loadConfig } from "./config";
import { ensureDb, prisma } from "./db";
import { withLock } from "./lock";
import { toSession } from "./mappers";

/** Runs the sweep without taking the lock — for callers already inside withLock. */
export async function sweepUnlocked(now: Date): Promise<number> {
  await ensureDb();
  const [types, cfg, open] = await Promise.all([
    loadBreakTypes(),
    loadConfig(),
    prisma.breakSession.findMany({ where: { endedAt: null, voided: false } }),
  ]);
  const actions = planSweep({ now, openSessions: open.map(toSession), types, cfg });
  if (actions.length === 0) return 0;
  await prisma.$transaction(async (tx) => {
    for (const a of actions) {
      // `endedAt: null` in the filter keeps this idempotent even if two sweeps overlap.
      await tx.breakSession.updateMany({
        where: { id: a.sessionId, endedAt: null },
        data: { endedAt: a.endedAt, endedBy: a.endedBy, endReason: a.endReason, stale: a.stale, overrunMin: a.overrunMin },
      });
    }
  });
  return actions.length;
}

export async function runSweep(now?: Date): Promise<number> {
  return withLock(async () => sweepUnlocked(now ?? (await serverNow())));
}
