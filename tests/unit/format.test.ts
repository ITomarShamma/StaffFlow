import { describe, expect, it } from "vitest";
import { fmtDate, hhmm, hhmmss, mmss, parseDmy } from "@/domain/format";
import { at } from "./fixtures";

describe("format — Western digits only", () => {
  it("mm:ss keeps counting past an hour", () => {
    expect(mmss(0)).toBe("00:00");
    expect(mmss(72)).toBe("01:12");
    expect(mmss(3900)).toBe("65:00");
    expect(mmss(-5)).toBe("00:00");
  });

  it("local clock strings", () => {
    expect(hhmm(at("08:05"))).toBe("08:05");
    expect(hhmmss(at("08:05", undefined, 9))).toBe("08:05:09");
  });

  it("dd/mm/yyyy both ways", () => {
    expect(fmtDate("2026-09-09")).toBe("09/09/2026");
    expect(fmtDate("2026-09-15")).toBe("15/09/2026");
    expect(parseDmy("9/9/2026")).toBe("2026-09-09");
    expect(parseDmy("15/09/2026")).toBe("2026-09-15"); // day first, never month first
    expect(parseDmy("01/12/2026")).toBe("2026-12-01");
    expect(parseDmy("31/02/2026")).toBeNull();
    expect(parseDmy("2026-09-09")).toBeNull();
  });
});
