import { describe, expect, it } from "vitest";
import { allowanceLeft, usedCount } from "@/domain/allowances";
import { typeByCode } from "@/domain/types";
import { at, session, types } from "./fixtures";

const smoke = typeByCode(types, "smoke");
const prayer = typeByCode(types, "prayer");
const meal = typeByCode(types, "meal");
const toilet = typeByCode(types, "toilet");

const ended = (code: "smoke" | "prayer" | "meal" | "toilet", start: string, end: string, voided = false) =>
  session({ typeCode: code, startedAt: at(start), endedAt: at(end), voided });

describe("allowances (spec §5.1)", () => {
  it("smoke: 5 per day — the 5th is allowed, the 6th refused", () => {
    const four = [ended("smoke", "08:10", "08:13"), ended("smoke", "09:10", "09:13"), ended("smoke", "10:10", "10:13"), ended("smoke", "11:10", "11:13")];
    expect(allowanceLeft(smoke, four)).toBe(true);
    const five = [...four, ended("smoke", "12:10", "12:13")];
    expect(usedCount(smoke, five)).toBe(5);
    expect(allowanceLeft(smoke, five)).toBe(false);
  });

  it("prayer and meal: 1 per day", () => {
    expect(allowanceLeft(prayer, [ended("prayer", "12:00", "12:10")])).toBe(false);
    expect(allowanceLeft(meal, [ended("meal", "12:00", "12:15")])).toBe(false);
    expect(allowanceLeft(meal, [ended("prayer", "12:00", "12:10")])).toBe(true);
  });

  it("toilet is unlimited", () => {
    const many = Array.from({ length: 12 }, (_, i) => ended("toilet", `${String(8 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "05"}`, `${String(8 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "33" : "08"}`));
    expect(allowanceLeft(toilet, many)).toBe(true);
  });

  it("voided sessions do not count", () => {
    expect(allowanceLeft(prayer, [ended("prayer", "12:00", "12:10", true)])).toBe(true);
  });
});
