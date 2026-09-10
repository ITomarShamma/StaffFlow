// Seed data shared by prisma/seed.ts and the unit tests, so "every row of spec §5.1"
// is tested against exactly what the app runs on. Headcount, names, caps, break
// parameters, work hours and leave rules are data (CLAUDE.md rule 6) — change them here
// or through scripts/admin.ts, never in code.

import type { BreakTypeConfig } from "../src/domain/types";

export const SEED_BRANCH = { name: "الفرع الرئيسي" };

export const SEED_TEAM = {
  name: "فريق خدمة العملاء",
  capGeneral: 2,
  capToiletFemale: 1,
  capToiletMale: 2,
};

/** Spec §5.1 — one row per type. Toilet has no max/grace; autoEndAtMin is its stale threshold. */
export const SEED_BREAK_TYPES: BreakTypeConfig[] = [
  { code: "smoke", pool: "general", maxMin: 3, graceMin: 1, autoEndAtMin: 10, allowancePerDay: 5, countsTowardBudget: true, sortOrder: 1 },
  { code: "prayer", pool: "general", maxMin: 10, graceMin: 2, autoEndAtMin: 20, allowancePerDay: 1, countsTowardBudget: true, sortOrder: 2 },
  { code: "meal", pool: "general", maxMin: 15, graceMin: 2, autoEndAtMin: 25, allowancePerDay: 1, countsTowardBudget: true, sortOrder: 3 },
  { code: "toilet", pool: "toilet", maxMin: null, graceMin: null, autoEndAtMin: 20, allowancePerDay: null, countsTowardBudget: false, sortOrder: 4 },
  // Decision 2026-09-10: a work call is not rest — no cap, no maximum, no daily limit and
  // outside the budget; the system closes a forgotten one after 10 minutes.
  { code: "call", pool: "none", maxMin: null, graceMin: null, autoEndAtMin: 10, allowancePerDay: null, countsTowardBudget: false, sortOrder: 5 },
];

/** Spec §12 — Config table rows (all values are strings in the table). */
export const SEED_CONFIG: Record<string, string> = {
  daily_budget_min: "25",
  work_start: "08:00",
  work_end: "16:00",
  working_days: "6,0,1,2,3,4", // Sat–Thu (0 = Sunday, 6 = Saturday); only Friday is off
  annual_leave_days: "14",
  hours_per_leave_day: "8",
  leave_year_start: "01-01",
  board_refresh_s: "5",
  correction_window_days: "7",
  min_session_s: "15", // breaks shorter than this are mis-clicks and count for nothing
  demo_clock_multiplier: "10",
};

export type SeedUser = {
  username: string;
  nameAr: string;
  role: "agent" | "team_lead" | "branch_manager";
  gender: "male" | "female";
};

/** 12 agents (9 male, 3 female) + 1 team lead + 1 branch manager. Names from the design handoff. */
export const SEED_USERS: SeedUser[] = [
  { username: "agent01", nameAr: "حمزة عيسى", role: "agent", gender: "male" },
  { username: "agent02", nameAr: "حمزة شحرور", role: "agent", gender: "male" },
  { username: "agent03", nameAr: "وسيم شمس الدين", role: "agent", gender: "male" },
  { username: "agent04", nameAr: "كرم قويدر", role: "agent", gender: "male" },
  { username: "agent05", nameAr: "عمر شمه", role: "agent", gender: "male" },
  { username: "agent06", nameAr: "فراس شما", role: "agent", gender: "male" },
  { username: "agent07", nameAr: "طارق السراقبي", role: "agent", gender: "male" },
  { username: "agent08", nameAr: "ملاذ كويتر", role: "agent", gender: "male" },
  { username: "agent09", nameAr: "حازم مهاوش", role: "agent", gender: "male" },
  { username: "agent10", nameAr: "نور أورفهلي", role: "agent", gender: "female" },
  { username: "agent11", nameAr: "آلاء", role: "agent", gender: "female" },
  { username: "agent12", nameAr: "إسراء", role: "agent", gender: "female" },
  { username: "lead", nameAr: "مشرف", role: "team_lead", gender: "male" },
  { username: "manager", nameAr: "مدير الفرع", role: "branch_manager", gender: "male" },
];
