"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addDays, isHm, localParts, localToUtc } from "@/domain/tz";
import { audit } from "../audit";
import { jumpDemoClockTo, serverNow } from "../clock";
import { loadConfig } from "../config";
import { prisma } from "../db";
import { isDemoMode } from "../env";
import { withLock } from "../lock";
import { requireRole } from "../session";
import { sweepUnlocked } from "../sweep";
import type { ActionResult } from "./types";

const schema = z.union([z.object({ time: z.string() }), z.object({ nextDay: z.literal(true) })]);

export type JumpError = "not_demo" | "invalid" | "backward";

/**
 * Demo mode only (decision Q1): move the demo clock forward to a time today, or to the
 * next day's work start. Audit-logged. Absent when the multiplier is 1.
 */
export async function jumpClock(raw: unknown): Promise<ActionResult<JumpError>> {
  const me = await requireRole("team_lead", "branch_manager");
  if (!isDemoMode()) return { ok: false, error: "not_demo" };
  const input = schema.safeParse(raw);
  if (!input.success) return { ok: false, error: "invalid" };
  const result = await withLock(async (): Promise<ActionResult<JumpError>> => {
    const now = await serverNow();
    const today = localParts(now).date;
    let target: Date;
    if ("nextDay" in input.data) {
      const cfg = await loadConfig();
      target = localToUtc(addDays(today, 1), cfg.workStart);
    } else {
      if (!isHm(input.data.time)) return { ok: false, error: "invalid" };
      target = localToUtc(today, input.data.time);
    }
    const jumped = await jumpDemoClockTo(target);
    if (!jumped) return { ok: false, error: "backward" };
    await sweepUnlocked(jumped);
    await prisma.$transaction(async (tx) => {
      await audit(tx, { actorId: me.user.id, action: "demo_clock_set", entity: "clock", entityId: "demo", before: { at: now }, after: { at: jumped }, at: jumped });
    });
    return { ok: true };
  });
  revalidatePath("/", "layout");
  return result;
}
