"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { remainingMinutes } from "@/domain/balance";
import { nextStatus, requestDate } from "@/domain/leave";
import { yearOf } from "@/domain/tz";
import { audit } from "../audit";
import { serverNow } from "../clock";
import { loadConfig } from "../config";
import { prisma } from "../db";
import { withLock } from "../lock";
import { toLeave } from "../mappers";
import { requireRole } from "../session";
import type { ActionResult } from "./types";

const decideSchema = z.object({
  id: z.string().min(1),
  action: z.enum(["approve", "reject", "revoke"]),
  note: z.string().max(500).optional(),
});

export type DecisionError = "invalid" | "not_allowed" | "exceeds_balance";

/** Spec §6 — the Branch Manager approves, rejects or revokes; every decision is audit-logged. */
export async function decideLeave(raw: unknown): Promise<ActionResult<DecisionError>> {
  const me = await requireRole("branch_manager");
  const input = decideSchema.safeParse(raw);
  if (!input.success) return { ok: false, error: "invalid" };
  const { id, action } = input.data;
  const note = input.data.note?.trim() || null;
  const result = await withLock(async (): Promise<ActionResult<DecisionError>> => {
    const now = await serverNow();
    const row = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!row) return { ok: false, error: "not_allowed" };
    const req = toLeave(row);
    const status = nextStatus(req.status, action, "branch_manager");
    if (!status) return { ok: false, error: "not_allowed" };
    if (action === "approve") {
      // Re-check the balance at approval (decision Q21): other requests may have been approved since.
      const cfg = await loadConfig();
      const others = (await prisma.leaveRequest.findMany({ where: { userId: req.userId, status: "approved", NOT: { id } } })).map(toLeave);
      if (req.minutes > remainingMinutes(cfg, others, yearOf(requestDate(req)))) return { ok: false, error: "exceeds_balance" };
    }
    await prisma.$transaction(async (tx) => {
      await tx.leaveRequest.update({
        where: { id },
        data: { status, decidedById: me.user.id, decidedAt: now, decisionNote: note ?? req.decisionNote },
      });
      await audit(tx, {
        actorId: me.user.id,
        action: action === "revoke" ? "leave_revoked" : "leave_decided",
        entity: "leave_request",
        entityId: id,
        before: { status: req.status },
        after: { status, note },
        at: now,
      });
    });
    return { ok: true };
  });
  revalidatePath("/", "layout");
  return result;
}
