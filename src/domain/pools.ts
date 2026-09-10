// Spec §5.1, §5.6 — pools, caps and free slots. The toilet pool is resolved from the
// agent's gender as stored on the server; the general cap is read from the team at call time.

import type { AgentRef, BreakTypeConfig, Gender, Pool, SessionRecord, TeamCaps } from "./types";
import { typeByCode } from "./types";

export const POOLS: readonly Pool[] = ["general", "toilet_female", "toilet_male"];

export type PoolCounts = Record<Pool, { active: number; cap: number }>;

/** null = the type occupies no pool, so concurrency is unlimited (call break). */
export function resolvePool(type: BreakTypeConfig, gender: Gender): Pool | null {
  if (type.pool === "none") return null;
  if (type.pool === "general") return "general";
  return gender === "female" ? "toilet_female" : "toilet_male";
}

export function capOf(pool: Pool, team: TeamCaps): number {
  switch (pool) {
    case "general":
      return team.capGeneral;
    case "toilet_female":
      return team.capToiletFemale;
    case "toilet_male":
      return team.capToiletMale;
  }
}

export function poolCounts(
  openSessions: readonly SessionRecord[],
  usersById: ReadonlyMap<string, AgentRef>,
  types: readonly BreakTypeConfig[],
  team: TeamCaps,
): PoolCounts {
  const counts: PoolCounts = {
    general: { active: 0, cap: capOf("general", team) },
    toilet_female: { active: 0, cap: capOf("toilet_female", team) },
    toilet_male: { active: 0, cap: capOf("toilet_male", team) },
  };
  for (const s of openSessions) {
    if (s.voided || s.endedAt) continue;
    const user = usersById.get(s.userId);
    if (!user) throw new Error(`open session ${s.id} belongs to unknown user ${s.userId}`);
    const pool = resolvePool(typeByCode(types, s.typeCode), user.gender);
    if (pool) counts[pool].active++;
  }
  return counts;
}

export function hasFreeSlot(pool: Pool, counts: PoolCounts): boolean {
  return counts[pool].active < counts[pool].cap;
}

export function validateCap(n: unknown): n is 1 | 2 | 3 {
  return n === 1 || n === 2 || n === 3;
}
