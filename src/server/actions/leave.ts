"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { remainingMinutes } from "@/domain/balance";
import { nextStatus, validateSubmission, type LeaveInput, type SubmissionError } from "@/domain/leave";
import { isIsoDate, yearOf } from "@/domain/tz";
import { serverNow } from "../clock";
import { loadConfig } from "../config";
import { prisma } from "../db";
import { withLock } from "../lock";
import { toLeave } from "../mappers";
import { requireRole } from "../session";
import type { ActionResult } from "./types";

const hm = z.string().regex(/^\d{2}:\d{2}$/);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/); // native date inputs post YYYY-MM-DD

const submitSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("hourly"), date: isoDate, fromTime: hm, toTime: hm, reason: z.string().max(200) }),
  z.object({ kind: z.literal("daily"), startDate: isoDate, endDate: isoDate, reason: z.string().max(200) }),
]);

export type SubmitLeaveError = SubmissionError | "invalid";

/**
 * Spec §6 — submit; the balance and overlap rules run here, server-side, on the server clock.
 * Agents and the Team Lead request leave (decision 2026-09-10); the Branch Manager decides.
 */
export async function submitLeave(raw: unknown): Promise<ActionResult<SubmitLeaveError>> {
  const me = await requireRole("agent", "team_lead");
  const parsed = submitSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const p = parsed.data;
  let input: LeaveInput;
  let year: number;
  if (p.kind === "hourly") {
    if (!isIsoDate(p.date)) return { ok: false, error: "invalid_window" };
    input = { kind: "hourly", date: p.date, fromTime: p.fromTime, toTime: p.toTime, reason: p.reason };
    year = yearOf(p.date);
  } else {
    if (!isIsoDate(p.startDate) || !isIsoDate(p.endDate)) return { ok: false, error: "invalid_window" };
    input = { kind: "daily", startDate: p.startDate, endDate: p.endDate, reason: p.reason };
    year = yearOf(p.startDate);
  }
  const result = await withLock(async (): Promise<ActionResult<SubmitLeaveError>> => {
    const now = await serverNow();
    const cfg = await loadConfig();
    const mine = (await prisma.leaveRequest.findMany({ where: { userId: me.user.id } })).map(toLeave);
    const remaining = remainingMinutes(cfg, mine, year);
    const r = validateSubmission({ input, existing: mine, remainingMinutes: remaining, cfg });
    if (!r.ok) return { ok: false, error: r.error };
    await prisma.leaveRequest.create({
      data: {
        userId: me.user.id,
        kind: input.kind,
        date: input.date ?? null,
        fromTime: input.fromTime ?? null,
        toTime: input.toTime ?? null,
        startDate: input.startDate ?? null,
        endDate: input.endDate ?? null,
        startsAt: r.startsAt,
        endsAt: r.endsAt,
        minutes: r.minutes,
        reason: input.reason.trim(),
        status: "pending",
        createdAt: now,
      },
    });
    return { ok: true };
  });
  revalidatePath("/", "layout");
  return result;
}

/** The requester cancels while pending. */
export async function cancelLeave(rawId: unknown): Promise<ActionResult<"invalid" | "not_allowed">> {
  const me = await requireRole("agent", "team_lead");
  const id = z.string().min(1).safeParse(rawId);
  if (!id.success) return { ok: false, error: "invalid" };
  const result = await withLock(async (): Promise<ActionResult<"invalid" | "not_allowed">> => {
    const row = await prisma.leaveRequest.findUnique({ where: { id: id.data } });
    if (!row || row.userId !== me.user.id) return { ok: false, error: "not_allowed" };
    const status = nextStatus(toLeave(row).status, "cancel", me.user.role);
    if (!status) return { ok: false, error: "not_allowed" };
    await prisma.leaveRequest.update({ where: { id: row.id }, data: { status } });
    return { ok: true };
  });
  revalidatePath("/", "layout");
  return result;
}
