// Plain records used by the pure domain functions. src/server/ maps Prisma rows to these.

export type Role = "agent" | "team_lead" | "branch_manager";
export type Gender = "male" | "female";
export type BreakTypeCode = "smoke" | "prayer" | "meal" | "toilet" | "call";
/** "none" = unlimited concurrency: the break occupies no pool slot (call, decision 2026-09-10). */
export type PoolKind = "general" | "toilet" | "none";
export type Pool = "general" | "toilet_female" | "toilet_male";
export type EndedBy = "agent" | "system" | "team_lead";
export type EndReason = "auto_end" | "stale" | "end_of_day";
export type LeaveKind = "hourly" | "daily";
export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled" | "revoked";
export type AgentStatus = "on_floor" | "on_break" | "overrun" | "away" | "on_leave";

export const ROLES: Role[] = ["agent", "team_lead", "branch_manager"];
export const GENDERS: Gender[] = ["male", "female"];
export const BREAK_TYPE_CODES: BreakTypeCode[] = ["smoke", "prayer", "meal", "toilet", "call"];
export const LEAVE_STATUSES: LeaveStatus[] = ["pending", "approved", "rejected", "cancelled", "revoked"];

/** One row of spec §5.1, read from the BreakType table. */
export interface BreakTypeConfig {
  code: BreakTypeCode;
  pool: PoolKind;
  maxMin: number | null;
  graceMin: number | null;
  autoEndAtMin: number;
  allowancePerDay: number | null;
  countsTowardBudget: boolean;
  sortOrder: number;
}

/** Team caps, read at call time (spec §5.6). */
export interface TeamCaps {
  capGeneral: number;
  capToiletFemale: number;
  capToiletMale: number;
}

/** Spec §12, parsed from the Config table. */
export interface AppConfig {
  dailyBudgetMin: number;
  workStart: string; // "HH:mm" Asia/Damascus
  workEnd: string; // "HH:mm"
  workingDays: number[]; // 0 = Sunday
  annualLeaveDays: number;
  hoursPerLeaveDay: number;
  leaveYearStart: string; // "MM-DD"
  boardRefreshS: number;
  correctionWindowDays: number;
  /** Breaks shorter than this many seconds are mis-clicks and count for nothing. */
  minSessionS: number;
}

export interface AgentRef {
  id: string;
  gender: Gender;
}

export interface SessionRecord {
  id: string;
  userId: string;
  typeCode: BreakTypeCode;
  startedAt: Date;
  endedAt: Date | null;
  effectiveMaxMin: number | null;
  endedBy: EndedBy | null;
  endReason: EndReason | null;
  overrunMin: number;
  stale: boolean;
  voided: boolean;
  editNote: string | null;
  editedById: string | null;
  editedAt: Date | null;
  originalEndedAt: Date | null;
  originalEndedBy: EndedBy | null;
}

export interface LeaveRecord {
  id: string;
  userId: string;
  kind: LeaveKind;
  date: string | null; // hourly: YYYY-MM-DD
  fromTime: string | null; // hourly: HH:mm
  toTime: string | null;
  startDate: string | null; // daily: YYYY-MM-DD
  endDate: string | null;
  startsAt: Date;
  endsAt: Date;
  minutes: number;
  reason: string;
  status: LeaveStatus;
  decidedById: string | null;
  decidedAt: Date | null;
  decisionNote: string | null;
  createdAt: Date;
}

export function typeByCode(types: readonly BreakTypeConfig[], code: BreakTypeCode): BreakTypeConfig {
  const t = types.find((x) => x.code === code);
  if (!t) throw new Error(`unknown break type: ${code}`);
  return t;
}
