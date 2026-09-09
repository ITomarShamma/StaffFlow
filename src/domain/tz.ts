// Asia/Damascus calendar helpers (spec §5.7, §11). Instants are UTC Dates; calendar
// values are local strings: dates "YYYY-MM-DD", times "HH:mm". Uses Intl only — no
// dependency — so DST rules (Syria abolished DST in 2022) come from the ICU data.

import type { AppConfig } from "./types";

export const TIME_ZONE = "Asia/Damascus";

const partsFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

export interface LocalParts {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  hour: number;
  minute: number;
  second: number;
  minuteOfDay: number;
  weekday: number; // 0 = Sunday
}

export function localParts(d: Date): LocalParts {
  const raw: Record<string, string> = {};
  for (const p of partsFormat.formatToParts(d)) if (p.type !== "literal") raw[p.type] = p.value;
  const year = Number(raw.year);
  const month = Number(raw.month);
  const day = Number(raw.day);
  const hour = Number(raw.hour) % 24;
  const minute = Number(raw.minute);
  const second = Number(raw.second);
  const date = `${raw.year}-${raw.month}-${raw.day}`;
  return {
    date,
    time: `${pad2(hour)}:${pad2(minute)}`,
    hour,
    minute,
    second,
    minuteOfDay: hour * 60 + minute,
    weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
  };
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function isIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

export function isHm(s: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(s)) return false;
  const [h, m] = s.split(":").map(Number) as [number, number];
  return h >= 0 && h < 24 && m >= 0 && m < 60;
}

/** "HH:mm" → minutes since midnight. */
export function hmToMinutes(hm: string): number {
  const [h, m] = hm.split(":").map(Number) as [number, number];
  return h * 60 + m;
}

export function minutesToHm(min: number): string {
  return `${pad2(Math.floor(min / 60))}:${pad2(min % 60)}`;
}

function splitDate(date: string): [number, number, number] {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return [y, m, d];
}

/** Offset of Asia/Damascus from UTC at the given instant, in minutes. */
export function offsetMinutesAt(d: Date): number {
  const p = localParts(d);
  const [y, m, day] = splitDate(p.date);
  const asUtc = Date.UTC(y, m - 1, day, p.hour, p.minute, p.second);
  return Math.round((asUtc - d.getTime()) / 60000);
}

/** Local calendar date + "HH:mm" → UTC instant. */
export function localToUtc(date: string, time: string): Date {
  const [y, m, d] = splitDate(date);
  const [hh, mm] = time.split(":").map(Number) as [number, number];
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const off1 = offsetMinutesAt(new Date(guess));
  let utc = guess - off1 * 60000;
  const off2 = offsetMinutesAt(new Date(utc));
  if (off2 !== off1) utc = guess - off2 * 60000;
  return new Date(utc);
}

export function dayStartUtc(date: string): Date {
  return localToUtc(date, "00:00");
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = splitDate(date);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${pad2(t.getUTCMonth() + 1)}-${pad2(t.getUTCDate())}`;
}

export function weekdayOf(date: string): number {
  const [y, m, d] = splitDate(date);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function yearOf(date: string): number {
  return Number(date.slice(0, 4));
}

export function workWindow(date: string, cfg: AppConfig): { start: Date; end: Date } {
  return { start: localToUtc(date, cfg.workStart), end: localToUtc(date, cfg.workEnd) };
}

export function isWithinWorkHours(now: Date, cfg: AppConfig): boolean {
  const w = workWindow(localParts(now).date, cfg);
  return now.getTime() >= w.start.getTime() && now.getTime() < w.end.getTime();
}

export function isWorkingDay(date: string, cfg: AppConfig): boolean {
  return cfg.workingDays.includes(weekdayOf(date));
}

/** Inclusive range. */
export function workingDaysBetween(start: string, end: string, cfg: AppConfig): number {
  let n = 0;
  for (let d = start; d <= end; d = addDays(d, 1)) if (isWorkingDay(d, cfg)) n++;
  return n;
}

/** [dayStart, nextDayStart) of the local day containing `now`. */
export function localDayBounds(now: Date): { date: string; start: Date; end: Date } {
  const date = localParts(now).date;
  return { date, start: dayStartUtc(date), end: dayStartUtc(addDays(date, 1)) };
}
