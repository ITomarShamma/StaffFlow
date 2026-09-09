// The server clock (CLAUDE.md rule 3). Real time unless DEMO_CLOCK_MULTIPLIER > 1; the
// demo anchor is persisted in the Config table so a restart keeps continuity, and a
// forward jump (decision Q1) replaces it. Clients only display what the server sends.

import { anchorAt, demoClock, jumpForward, realClock, type Clock, type DemoAnchor } from "@/domain/clock";
import { isIsoDate, isHm, localToUtc } from "@/domain/tz";
import { getConfigValue, setConfigValue } from "./config";
import { env, isDemoMode } from "./env";

const KEY_REAL = "demo_anchor_real";
const KEY_DEMO = "demo_anchor_demo";
const KEY_START = "demo_anchor_start";
const KEY_MULT = "demo_anchor_multiplier";

type G = typeof globalThis & { __sfAnchor?: DemoAnchor | null };
const g = globalThis as G;

function parseStart(raw: string | null): Date | null {
  if (!raw) return null;
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})$/.exec(raw);
  if (!m || !isIsoDate(m[1]!) || !isHm(m[2]!)) return null;
  return localToUtc(m[1]!, m[2]!);
}

async function loadAnchor(): Promise<DemoAnchor> {
  if (g.__sfAnchor) return g.__sfAnchor;
  const [real, demo, start, mult] = await Promise.all([getConfigValue(KEY_REAL), getConfigValue(KEY_DEMO), getConfigValue(KEY_START), getConfigValue(KEY_MULT)]);
  const wantedStart = env.demoClockStart ?? "";
  const stored = real && demo && Number(mult) === env.demoMultiplier && (start ?? "") === wantedStart
    ? { anchorRealMs: Number(real), anchorDemoMs: Number(demo), multiplier: env.demoMultiplier }
    : null;
  if (stored && Number.isFinite(stored.anchorRealMs) && Number.isFinite(stored.anchorDemoMs)) {
    g.__sfAnchor = stored;
    return stored;
  }
  const realNow = Date.now();
  const startAt = parseStart(env.demoClockStart);
  const fresh = anchorAt(startAt ? startAt.getTime() : realNow, realNow, env.demoMultiplier);
  await saveAnchor(fresh);
  return fresh;
}

async function saveAnchor(a: DemoAnchor): Promise<void> {
  await Promise.all([
    setConfigValue(KEY_REAL, String(a.anchorRealMs)),
    setConfigValue(KEY_DEMO, String(a.anchorDemoMs)),
    setConfigValue(KEY_START, env.demoClockStart ?? ""),
    setConfigValue(KEY_MULT, String(a.multiplier)),
  ]);
  g.__sfAnchor = a;
}

export async function getClock(): Promise<Clock> {
  if (!isDemoMode()) return realClock;
  return demoClock(await loadAnchor());
}

export async function serverNow(): Promise<Date> {
  return (await getClock()).now();
}

export interface ClockInfo {
  nowMs: number;
  multiplier: number;
  demo: boolean;
}

export function clockFrom(now: Date): ClockInfo {
  return { nowMs: now.getTime(), multiplier: env.demoMultiplier, demo: isDemoMode() };
}

export async function clockInfo(): Promise<ClockInfo> {
  return clockFrom(await serverNow());
}

/** Demo mode only. Forward only. Returns the new demo time, or null when refused. */
export async function jumpDemoClockTo(target: Date): Promise<Date | null> {
  if (!isDemoMode()) return null;
  const a = await loadAnchor();
  const next = jumpForward(a, target.getTime(), Date.now());
  if (!next) return null;
  await saveAnchor(next);
  return target;
}
