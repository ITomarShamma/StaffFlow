"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { remainingMinutes } from "@/domain/balance";
import { parseDmy } from "@/domain/format";
import { nextStatus, validateSubmission, type LeaveInput, type SubmissionError } from "@/domain/leave";
import { yearOf } from "@/domain/tz";
import { serverNow } from "../clock";
import { loadConfig } from "../config";
import { prisma } from "../db";
import { withLock } from "../lock";
import { toLeave } from "../mappers";
import { requireRole } from "../session";
import type { ActionResult } from "./types";

const hm = z.string().regex(/^\d{2}:\d{2}$/);

const submitSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("hourly"), date: z.string(), fromTime: hm, toTime: hm, reason: z.string().max(200) }),
  z.object({ kind: z.literal("daily"), startDate: z.string(), endDate: z.string(), reason: z.string().max(200) }),
]);

export type SubmitLeaveError = SubmissionError | "invalid";

/** Spec §6 — submit; the balance and overlap rules run here, server-side, on the server clock. */
export async function submitLeave(raw: unknown): Promise<ActionResult<SubmitLeaveError>> {
  const me = await requireRole("agent");
  const parsed = submitSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const p = parsed.data;
  let input: LeaveInput;
  let year: number;
  if (p.kind === "hourly") {
    const date = parseDmy(p.date);
    if (!date) return { ok: false, error: "invalid_window" };
    input = { kind: "hourly", date, fromTime: p.fromTime, toTime: p.toTime, reason: p.reason };
    year = yearOf(date);
  } else {
    const startDate = parseDmy(p.startDate);
    const endDate = parseDmy(p.endDate);
    if (!startDate || !endDate) return { ok: false, error: "invalid_window" };
    input = { kind: "daily", startDate, endDate, reason: p.reason };
    year = yearOf(startDate);
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

/** The agent cancels while pending. */
export async function cancelLeave(rawId: unknown): Promise<ActionResult<"invalid" | "not_allowed">> {
  const me = await requireRole("agent");
  const id = z.string().min(1).safeParse(rawId);
  if (!id.success) return { ok: false, error: "invalid" };
  const result = await withLock(async (): Promise<ActionResult<"invalid" | "not_allowed">> => {
    const row = await prisma.leaveRequest.findUnique({ where: { id: id.data } });
    if (!row || row.userId !== me.user.id) return { ok: false, error: "not_allowed" };
    const status = nextStatus(toLeave(row).status, "cancel", "agent");
    if (!status) return { ok: false, error: "not_allowed" };
    await prisma.leaveRequest.update({ where: { id: row.id }, data: { status } });
    return { ok: true };
  });
  revalidatePath("/", "layout");
  return result;
}
