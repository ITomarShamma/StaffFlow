import { describe, expect, it } from "vitest";
import { anchorAt, demoClock, jumpForward, parseMultiplier, realClock } from "@/domain/clock";

describe("clock", () => {
  it("multiplier 1 or empty means real time", () => {
    expect(parseMultiplier(undefined)).toBe(1);
    expect(parseMultiplier("")).toBe(1);
    expect(parseMultiplier("0")).toBe(1);
    expect(parseMultiplier("abc")).toBe(1);
    expect(parseMultiplier("10")).toBe(10);
    const before = Date.now();
    const t = realClock.now().getTime();
    expect(t).toBeGreaterThanOrEqual(before);
  });

  it("10× advances ten demo seconds per real second", () => {
    let real = 1_000_000;
    const a = anchorAt(5_000_000, real, 10);
    const clock = demoClock(a, () => real);
    expect(clock.now().getTime()).toBe(5_000_000);
    real += 1000;
    expect(clock.now().getTime()).toBe(5_010_000);
  });

  it("jumps forward only and keeps the multiplier", () => {
    const real = 1_000_000;
    const a = anchorAt(5_000_000, real, 10);
    const j = jumpForward(a, 9_000_000, real + 500);
    expect(j).not.toBeNull();
    expect(demoClock(j!, () => real + 500).now().getTime()).toBe(9_000_000);
    expect(j!.multiplier).toBe(10);
    expect(jumpForward(a, 4_000_000, real + 500)).toBeNull();
  });
});
