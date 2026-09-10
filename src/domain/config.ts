// Spec §12 — parse the Config table (key/value strings) into a typed AppConfig.

import { z } from "zod";
import type { AppConfig } from "./types";

const hm = z.string().regex(/^\d{2}:\d{2}$/);

const schema = z.object({
  daily_budget_min: z.coerce.number().int().positive(),
  work_start: hm,
  work_end: hm,
  working_days: z
    .string()
    .transform((s) => s.split(",").map((x) => Number(x.trim())).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)),
  annual_leave_days: z.coerce.number().positive(),
  hours_per_leave_day: z.coerce.number().positive(),
  leave_year_start: z.string().regex(/^\d{2}-\d{2}$/),
  board_refresh_s: z.coerce.number().int().positive(),
  correction_window_days: z.coerce.number().int().nonnegative(),
  min_session_s: z.coerce.number().int().nonnegative(),
});

export function parseConfig(rows: Record<string, string>): AppConfig {
  const c = schema.parse(rows);
  return {
    dailyBudgetMin: c.daily_budget_min,
    workStart: c.work_start,
    workEnd: c.work_end,
    workingDays: c.working_days,
    annualLeaveDays: c.annual_leave_days,
    hoursPerLeaveDay: c.hours_per_leave_day,
    leaveYearStart: c.leave_year_start,
    boardRefreshS: c.board_refresh_s,
    correctionWindowDays: c.correction_window_days,
    minSessionS: c.min_session_s,
  };
}
