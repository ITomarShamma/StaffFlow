// Spec §6 — hourly and daily leave: hours, overlap, submission checks, lifecycle.

import { addDays, dayStartUtc, hmToMinutes, isHm, isIsoDate, localParts, localToUtc, workingDaysBetween } from "./tz";
import type { AppConfig, LeaveKind, LeaveRecord, LeaveStatus, Role } from "./types";

export interface LeaveInput {
  kind: LeaveKind;
  date?: string | null; // hourly, YYYY-MM-DD
  fromTime?: string | null; // HH:mm
  toTime?: string | null;
  startDate?: string | null; // daily, YYYY-MM-DD
  endDate?: string | null;
  reason: string;
}

export interface Interval {
  startsAt: Date;
  endsAt: Date;
}

/** Minutes of an hourly window inside work hours, or null when the window is invalid. */
export function hourlyMinutes(from: string, to: string, cfg: AppConfig): number | null {
  if (!isHm(from) || !isHm(to)) return null;
  const f = hmToMinutes(from);
  const t = hmToMinutes(to);
  if (f < hmToMinutes(cfg.workStart) || t > hmToMinutes(cfg.workEnd) || f >= t) return null;
  return t - f;
}

/** 8 h per working day (Sun–Thu) in the inclusive range; Fri–Sat cost nothing. */
export function dailyMinutes(startDate: string, endDate: string, cfg: AppConfig): number {
  return workingDaysBetween(startDate, endDate, cfg) * cfg.hoursPerLeaveDay * 60;
}

export function inputInterval(i: LeaveInput): Interval | null {
  if (i.kind === "hourly") {
    if (!i.date || !i.fromTime || !i.toTime || !isIsoDate(i.date) || !isHm(i.fromTime) || !isHm(i.toTime)) return null;
    return { startsAt: localToUtc(i.date, i.fromTime), endsAt: localToUtc(i.date, i.toTime) };
  }
  if (!i.startDate || !i.endDate || !isIsoDate(i.startDate) || !isIsoDate(i.endDate)) return null;
  return { startsAt: dayStartUtc(i.startDate), endsAt: dayStartUtc(addDays(i.endDate, 1)) };
}

/** Half-open intervals: touching windows do not overlap. */
export function overlaps(a: Interval, b: Interval): boolean {
  return a.startsAt.getTime() < b.endsAt.getTime() && b.startsAt.getTime() < a.endsAt.getTime();
}

export function isActiveRequest(r: LeaveRecord): boolean {
  return r.status === "pending" || r.status === "approved";
}

export function findOverlap(candidate: Interval, existing: readonly LeaveRecord[]): LeaveRecord | undefined {
  return existing.find((r) => isActiveRequest(r) && overlaps(candidate, r));
}

export type SubmissionError = "invalid_window" | "exceeds_balance" | "overlaps";

export type SubmissionResult =
  | { ok: true; minutes: number; startsAt: Date; endsAt: Date }
  | { ok: false; error: SubmissionError };

/** Spec §6 — reason required, window valid, within the balance, no overlap. */
export function validateSubmission(i: {
  input: LeaveInput;
  existing: readonly LeaveRecord[];
  remainingMinutes: number;
  cfg: AppConfig;
}): SubmissionResult {
  const { input, cfg } = i;
  if (!input.reason.trim()) return { ok: false, error: "invalid_window" };
  let minutes: number | null;
  if (input.kind === "hourly") {
    minutes = input.fromTime && input.toTime ? hourlyMinutes(input.fromTime, input.toTime, cfg) : null;
  } else {
    if (!input.startDate || !input.endDate || !isIsoDate(input.startDate) || !isIsoDate(input.endDate) || input.endDate < input.startDate) {
      return { ok: false, error: "invalid_window" };
    }
    // Decision A25: a range that crosses 1 January is filed as two requests.
    if (input.startDate.slice(0, 4) !== input.endDate.slice(0, 4)) return { ok: false, error: "invalid_window" };
    minutes = dailyMinutes(input.startDate, input.endDate, cfg);
  }
  const interval = inputInterval(input);
  if (minutes == null || !interval) return { ok: false, error: "invalid_window" };
  if (minutes > i.remainingMinutes) return { ok: false, error: "exceeds_balance" };
  if (findOverlap(interval, i.existing)) return { ok: false, error: "overlaps" };
  return { ok: true, minutes, ...interval };
}

export type LeaveState = { kind: "none" } | { kind: "daily" | "hourly"; request: LeaveRecord };

/** The approved leave in effect at `now`, daily first (spec §6 board effect). */
export function leaveStateAt(approved: readonly LeaveRecord[], now: Date): LeaveState {
  const t = now.getTime();
  const active = approved.filter((r) => r.status === "approved" && r.startsAt.getTime() <= t && t < r.endsAt.getTime());
  const daily = active.find((r) => r.kind === "daily");
  if (daily) return { kind: "daily", request: daily };
  const hourly = active.find((r) => r.kind === "hourly");
  if (hourly) return { kind: "hourly", request: hourly };
  return { kind: "none" };
}

/** Spec §9 — leave on one local date: hourly minutes that day; whether a daily leave covers it. */
export function leaveOnDate(approved: readonly LeaveRecord[], date: string): { hourlyMinutes: number; dailyCovers: boolean } {
  let hourlyMinutes = 0;
  let dailyCovers = false;
  for (const r of approved) {
    if (r.status !== "approved") continue;
    if (r.kind === "hourly" && r.date === date) hourlyMinutes += r.minutes;
    if (r.kind === "daily" && r.startDate && r.endDate && r.startDate <= date && date <= r.endDate) dailyCovers = true;
  }
  return { hourlyMinutes, dailyCovers };
}

export type LeaveAction = "approve" | "reject" | "cancel" | "revoke";

/** Lifecycle (spec §6 flow). Returns the new status, or null when the actor may not do this now. */
export function nextStatus(status: LeaveStatus, action: LeaveAction, actor: Role): LeaveStatus | null {
  switch (action) {
    case "approve":
      return status === "pending" && actor === "branch_manager" ? "approved" : null;
    case "reject":
      return status === "pending" && actor === "branch_manager" ? "rejected" : null;
    case "cancel":
      // The requester cancels while pending: an agent, or the Team Lead for their own request (decision 2026-09-10).
      return status === "pending" && (actor === "agent" || actor === "team_lead") ? "cancelled" : null;
    case "revoke":
      return status === "approved" && actor === "branch_manager" ? "revoked" : null;
  }
}

/** The local date a request belongs to, for year and day filters. */
export function requestDate(r: LeaveRecord): string {
  return (r.kind === "hourly" ? r.date : r.startDate) ?? localParts(r.startsAt).date;
}
