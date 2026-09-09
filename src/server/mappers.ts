// Prisma rows → domain records. Enumerations are validated here, at the boundary.

import { z } from "zod";
import type { BreakSession, BreakType, LeaveRequest, Team, User } from "@/generated/prisma/client";
import type { AgentRef, BreakTypeConfig, LeaveRecord, SessionRecord, TeamCaps } from "@/domain/types";

const breakCode = z.enum(["smoke", "prayer", "meal", "toilet"]);
const endedBy = z.enum(["agent", "system", "team_lead"]).nullable();
const endReason = z.enum(["auto_end", "stale", "end_of_day"]).nullable();
const leaveKind = z.enum(["hourly", "daily"]);
const leaveStatus = z.enum(["pending", "approved", "rejected", "cancelled", "revoked"]);
const gender = z.enum(["male", "female"]);
const role = z.enum(["agent", "team_lead", "branch_manager"]);
const pool = z.enum(["general", "toilet"]);

export function toSession(r: BreakSession): SessionRecord {
  return {
    id: r.id,
    userId: r.userId,
    typeCode: breakCode.parse(r.typeCode),
    startedAt: r.startedAt,
    endedAt: r.endedAt,
    effectiveMaxMin: r.effectiveMaxMin,
    endedBy: endedBy.parse(r.endedBy),
    endReason: endReason.parse(r.endReason),
    overrunMin: r.overrunMin,
    stale: r.stale,
    voided: r.voided,
    editNote: r.editNote,
    editedById: r.editedById,
    editedAt: r.editedAt,
    originalEndedAt: r.originalEndedAt,
    originalEndedBy: endedBy.parse(r.originalEndedBy),
  };
}

export function toLeave(r: LeaveRequest): LeaveRecord {
  return {
    id: r.id,
    userId: r.userId,
    kind: leaveKind.parse(r.kind),
    date: r.date,
    fromTime: r.fromTime,
    toTime: r.toTime,
    startDate: r.startDate,
    endDate: r.endDate,
    startsAt: r.startsAt,
    endsAt: r.endsAt,
    minutes: r.minutes,
    reason: r.reason,
    status: leaveStatus.parse(r.status),
    decidedById: r.decidedById,
    decidedAt: r.decidedAt,
    decisionNote: r.decisionNote,
    createdAt: r.createdAt,
  };
}

export function toBreakType(r: BreakType): BreakTypeConfig {
  return {
    code: breakCode.parse(r.code),
    pool: pool.parse(r.pool),
    maxMin: r.maxMin,
    graceMin: r.graceMin,
    autoEndAtMin: r.autoEndAtMin,
    allowancePerDay: r.allowancePerDay,
    countsTowardBudget: r.countsTowardBudget,
    sortOrder: r.sortOrder,
  };
}

export function toCaps(t: Team): TeamCaps {
  return { capGeneral: t.capGeneral, capToiletFemale: t.capToiletFemale, capToiletMale: t.capToiletMale };
}

export interface AppUser {
  id: string;
  teamId: string;
  username: string;
  nameAr: string;
  role: "agent" | "team_lead" | "branch_manager";
  gender: "male" | "female";
  active: boolean;
}

export function toUser(u: User): AppUser {
  return {
    id: u.id,
    teamId: u.teamId,
    username: u.username,
    nameAr: u.nameAr,
    role: role.parse(u.role),
    gender: gender.parse(u.gender),
    active: u.active,
  };
}

export function toAgentRef(u: AppUser): AgentRef {
  return { id: u.id, gender: u.gender };
}
