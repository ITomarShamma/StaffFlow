// Display formatting. Digits are always Western (spec Appendix A) — never toLocaleString.

import { localParts, pad2, isIsoDate } from "./tz";

/** Seconds → "mm:ss". Minutes keep growing past 59 (e.g. "65:00"). */
export function mmss(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`;
}

export function hhmm(d: Date): string {
  return localParts(d).time;
}

export function hhmmss(d: Date): string {
  const p = localParts(d);
  return `${p.time}:${pad2(p.second)}`;
}

/** "YYYY-MM-DD" → "dd/mm/yyyy". */
export function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** "dd/mm/yyyy" → "YYYY-MM-DD", or null when not a real date. */
export function parseDmy(s: string): string | null {
  const m = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*$/.exec(s);
  if (!m) return null;
  const [, day, month, year] = m as unknown as [string, string, string, string];
  const iso = `${year}-${pad2(Number(month))}-${pad2(Number(day))}`;
  return isIsoDate(iso) ? iso : null;
}

/** "2", "1.5", "0.25" — hours without trailing zeros, at most two decimals. */
export function formatHours(minutes: number): string {
  const h = Math.round((minutes / 60) * 100) / 100;
  return String(h);
}
