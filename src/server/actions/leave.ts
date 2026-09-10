"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { remainingMinutes } from "@/domain/balance";
import { nextStatus, validateSubmission, type LeaveInput, type SubmissionError } from "@/domain/leave";
import { isIsoDate, localParts, yearOf } from "@/domain/tz";
import { serverNow } from "../clock";
import { loadConfig } from "../config";
import { prisma } from "../db";
import { withLock } from "../lock";
import { toLeave } from "../mappers";
import { requireRole } from "../session";
import type { ActionResult } from "./types";

// The shape check is deliberately loose: it only proves the fields are strings, so the
// domain gets to name the real reason (empty date, bad time, window outside work hours…)
// instead of everything collapsing into one "invalid" (decision 2026-09-10).
const str = z.string().max(200);

const submitSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("hourly"), date: str, fromTime: str, toTime: str, reason: str }),
  z.object({ kind: z.literal("daily"), startDate: str, endDate: str, reason: str }),
]);

export type SubmitLeaveError = SubmissionError | "reason_too_long" | "server_error";

/**
 * Spec §6 — submit; the balance and overlap rules run here, server-side, on the server clock.
 * Agents and the Team Lead request leave (decision 2026-09-10); the Branch Manager decides.
 */
export async function submitLeave(raw: unknown): Promise<ActionResult<SubmitLeaveError>> {
  const me = await requireRole("agent", "team_lead");
  const parsed = submitSchema.safeParse(raw);
  // The only shape failure the form can produce is an over-long reason; anything else is a
  // crafted request, and "reason too long" is the honest thing to say about a 200+ char field.
  if (!parsed.success) return { ok: false, error: "reason_too_long" };
  const p = parsed.data;
  const input: LeaveInput =
    p.kind === "hourly"
      ? { kind: "hourly", date: p.date, fromTime: p.fromTime, toTime: p.toTime, reason: p.reason }
      : { kind: "daily", startDate: p.startDate, endDate: p.endDate, reason: p.reason };
  // The year the balance is counted in; only read once the date is known to be a real one.
  const dateForYear = p.kind === "hourly" ? p.date : p.startDate;

  let result: ActionResult<SubmitLeaveError>;
  try {
    result = await withLock(async (): Promise<ActionResult<SubmitLeaveError>> => {
      const now = await serverNow();
      const cfg = await loadConfig();
      const mine = (await prisma.leaveRequest.findMany({ where: { userId: me.user.id } })).map(toLeave);
      // A date that is not a real one fails validation below; until then count against this year.
      const year = isIsoDate(dateForYear) ? yearOf(dateForYear) : yearOf(localParts(now).date);
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
  } catch (e) {
    // A locked or unreachable database must not reach the requester as an unhandled crash.
    console.error("submitLeave failed", e);
    return { ok: false, error: "server_error" };
  }
  revalidatePath("/", "layout");
  return result;
}

export type CancelLeaveError = "invalid" | "not_allowed" | "server_error";

/** The requester cancels while pending. */
export async function cancelLeave(rawId: unknown): Promise<ActionResult<CancelLeaveError>> {
  const me = await requireRole("agent", "team_lead");
  const id = z.string().min(1).safeParse(rawId);
  if (!id.success) return { ok: false, error: "invalid" };
  let result: ActionResult<CancelLeaveError>;
  try {
    result = await withLock(async (): Promise<ActionResult<CancelLeaveError>> => {
      const row = await prisma.leaveRequest.findUnique({ where: { id: id.data } });
      if (!row || row.userId !== me.user.id) return { ok: false, error: "not_allowed" };
      const status = nextStatus(toLeave(row).status, "cancel", me.user.role);
      if (!status) return { ok: false, error: "not_allowed" };
      await prisma.leaveRequest.update({ where: { id: row.id }, data: { status } });
      return { ok: true };
    });
  } catch (e) {
    console.error("cancelLeave failed", e);
    return { ok: false, error: "server_error" };
  }
  revalidatePath("/", "layout");
  return result;
}
