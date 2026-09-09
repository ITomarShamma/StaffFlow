// Spec §6 balance — 14 days per calendar year tracked as minutes (112 h), computed from
// approved requests only (§8), displayed in days with two decimals.

import { requestDate } from "./leave";
import { yearOf } from "./tz";
import type { AppConfig, LeaveRecord } from "./types";

export function annualMinutes(cfg: AppConfig): number {
  return cfg.annualLeaveDays * cfg.hoursPerLeaveDay * 60;
}

export function usedMinutes(requests: readonly LeaveRecord[], year: number): number {
  let total = 0;
  for (const r of requests) {
    if (r.status !== "approved") continue;
    if (yearOf(requestDate(r)) !== year) continue;
    total += r.minutes;
  }
  return total;
}

export function remainingMinutes(cfg: AppConfig, requests: readonly LeaveRecord[], year: number): number {
  return annualMinutes(cfg) - usedMinutes(requests, year);
}

export function daysOf(minutes: number, cfg: AppConfig): number {
  return minutes / 60 / cfg.hoursPerLeaveDay;
}

/** "13.75" — always two decimals, Western digits. */
export function formatDays(minutes: number, cfg: AppConfig): string {
  return daysOf(minutes, cfg).toFixed(2);
}
