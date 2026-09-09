// Shared test fixtures. Times are Asia/Damascus local, converted with the domain's own tz helpers.

import { SEED_BREAK_TYPES, SEED_CONFIG } from "../../prisma/seed-data";
import { parseConfig } from "@/domain/config";
import { inputInterval } from "@/domain/leave";
import { localToUtc } from "@/domain/tz";
import type { AgentRef, LeaveRecord, SessionRecord, TeamCaps } from "@/domain/types";
import { typeByCode } from "@/domain/types";

export const cfg = parseConfig(SEED_CONFIG);
export const types = SEED_BREAK_TYPES;
export const team: TeamCaps = { capGeneral: 2, capToiletFemale: 1, capToiletMale: 2 };

/** Wednesday 9 Sep 2026 — a working day. */
export const DAY = "2026-09-09";
export const FRI = "2026-09-11";
export const SAT = "2026-09-12";
export const SUN = "2026-09-13";
export const THU = "2026-09-10";

/** Local Damascus time on DAY (or `date`) → UTC Date. */
export function at(time: string, date: string = DAY, plusSeconds = 0): Date {
  return new Date(localToUtc(date, time).getTime() + plusSeconds * 1000);
}

export const m1: AgentRef = { id: "m1", gender: "male" };
export const m2: AgentRef = { id: "m2", gender: "male" };
export const m3: AgentRef = { id: "m3", gender: "male" };
export const f1: AgentRef = { id: "f1", gender: "female" };
export const f2: AgentRef = { id: "f2", gender: "female" };
export const usersById = new Map<string, AgentRef>([m1, m2, m3, f1, f2].map((a) => [a.id, a]));

let seq = 0;

export function session(p: Partial<SessionRecord> & Pick<SessionRecord, "typeCode" | "startedAt">): SessionRecord {
  const type = typeByCode(types, p.typeCode);
  return {
    id: p.id ?? `s${++seq}`,
    userId: p.userId ?? "m1",
    typeCode: p.typeCode,
    startedAt: p.startedAt,
    endedAt: p.endedAt ?? null,
    effectiveMaxMin: p.effectiveMaxMin === undefined ? type.maxMin : p.effectiveMaxMin,
    endedBy: p.endedBy ?? (p.endedAt ? "agent" : null),
    endReason: p.endReason ?? null,
    overrunMin: p.overrunMin ?? 0,
    stale: p.stale ?? false,
    voided: p.voided ?? false,
    editNote: p.editNote ?? null,
    editedById: p.editedById ?? null,
    editedAt: p.editedAt ?? null,
    originalEndedAt: p.originalEndedAt ?? null,
    originalEndedBy: p.originalEndedBy ?? null,
  };
}

export function hourly(p: { userId?: string; date: string; from: string; to: string; status?: LeaveRecord["status"]; id?: string }): LeaveRecord {
  const iv = inputInterval({ kind: "hourly", date: p.date, fromTime: p.from, toTime: p.to, reason: "x" });
  if (!iv) throw new Error("bad hourly fixture");
  const [fh, fm] = p.from.split(":").map(Number) as [number, number];
  const [th, tm] = p.to.split(":").map(Number) as [number, number];
  return {
    id: p.id ?? `l${++seq}`,
    userId: p.userId ?? "m1",
    kind: "hourly",
    date: p.date,
    fromTime: p.from,
    toTime: p.to,
    startDate: null,
    endDate: null,
    startsAt: iv.startsAt,
    endsAt: iv.endsAt,
    minutes: th * 60 + tm - (fh * 60 + fm),
    reason: "موعد طبي",
    status: p.status ?? "approved",
    decidedById: null,
    decidedAt: null,
    decisionNote: null,
    createdAt: iv.startsAt,
  };
}

export function daily(p: { userId?: string; start: string; end: string; minutes: number; status?: LeaveRecord["status"]; id?: string }): LeaveRecord {
  const iv = inputInterval({ kind: "daily", startDate: p.start, endDate: p.end, reason: "x" });
  if (!iv) throw new Error("bad daily fixture");
  return {
    id: p.id ?? `l${++seq}`,
    userId: p.userId ?? "m1",
    kind: "daily",
    date: null,
    fromTime: null,
    toTime: null,
    startDate: p.start,
    endDate: p.end,
    startsAt: iv.startsAt,
    endsAt: iv.endsAt,
    minutes: p.minutes,
    reason: "ظرف عائلي",
    status: p.status ?? "approved",
    decidedById: null,
    decidedAt: null,
    decisionNote: null,
    createdAt: iv.startsAt,
  };
}
