// Server-authoritative time (CLAUDE.md rule 3). The real clock is Date.now(); the demo
// clock runs `multiplier` times faster from an anchor pair (a real instant paired with
// the demo instant it maps to). Jumps are forward only and replace the anchor.

export interface Clock {
  now(): Date;
}

export interface DemoAnchor {
  anchorRealMs: number;
  anchorDemoMs: number;
  multiplier: number;
}

export const realClock: Clock = { now: () => new Date() };

export function parseMultiplier(raw: string | undefined | null): number {
  if (raw == null || raw.trim() === "") return 1;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export function demoNowMs(a: DemoAnchor, realMs: number): number {
  return a.anchorDemoMs + (realMs - a.anchorRealMs) * a.multiplier;
}

export function demoClock(a: DemoAnchor, real: () => number = Date.now): Clock {
  return { now: () => new Date(demoNowMs(a, real())) };
}

/** A fresh anchor that maps `realMs` to `demoMs`. */
export function anchorAt(demoMs: number, realMs: number, multiplier: number): DemoAnchor {
  return { anchorRealMs: realMs, anchorDemoMs: demoMs, multiplier };
}

/** Jump the demo clock forward to `targetDemoMs`. Returns null when the target is in the demo past. */
export function jumpForward(a: DemoAnchor, targetDemoMs: number, realMs: number): DemoAnchor | null {
  if (targetDemoMs < demoNowMs(a, realMs)) return null;
  return anchorAt(targetDemoMs, realMs, a.multiplier);
}
