"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { canStart, endByAgent, newSessionDraft, openSessionOf, type Refusal } from "@/domain/sessions";
import { typeByCode } from "@/domain/types";
import { serverNow } from "../clock";
import { prisma } from "../db";
import { withLock } from "../lock";
import { toAgentRef } from "../mappers";
import { loadTeamContext } from "../queries";
import { requireRole } from "../session";
import type { ActionResult } from "./types";

const codeSchema = z.enum(["smoke", "prayer", "meal", "toilet"]);

/** Spec §5.3 — self-serve start. The gender for the toilet pool comes from the database, never the client. */
export async function startBreak(codeRaw: unknown): Promise<ActionResult<Refusal | "invalid">> {
  const me = await requireRole("agent");
  const code = codeSchema.safeParse(codeRaw);
  if (!code.success) return { ok: false, error: "invalid" };
  const result = await withLock(async (): Promise<ActionResult<Refusal | "invalid">> => {
    const now = await serverNow();
    const ctx = await loadTeamContext(now, { locked: true });
    const type = typeByCode(ctx.types, code.data);
    const startCtx = {
      now,
      agent: ctx.usersById.get(me.user.id) ?? toAgentRef(me.user),
      type,
      types: ctx.types,
      team: ctx.team.caps,
      cfg: ctx.cfg,
      agentTodaySessions: ctx.todaySessions.filter((s) => s.userId === me.user.id),
      teamOpenSessions: ctx.openSessions,
      usersById: ctx.usersById,
      agentApprovedLeave: ctx.leave.filter((r) => r.userId === me.user.id),
    };
    const decision = canStart(startCtx);
    if (!decision.ok) return { ok: false, error: decision.reason };
    await prisma.breakSession.create({ data: newSessionDraft(startCtx, decision) });
    return { ok: true };
  });
  revalidatePath("/", "layout");
  return result;
}

/** Spec §5.3 step 5 — "Back on floor". */
export async function endBreak(): Promise<ActionResult<"no_open_session">> {
  const me = await requireRole("agent");
  const result = await withLock(async (): Promise<ActionResult<"no_open_session">> => {
    const now = await serverNow();
    const ctx = await loadTeamContext(now, { locked: true });
    const open = openSessionOf(me.user.id, ctx.openSessions);
    if (!open) return { ok: false, error: "no_open_session" };
    const patch = endByAgent(open, typeByCode(ctx.types, open.typeCode), now);
    await prisma.breakSession.updateMany({ where: { id: open.id, endedAt: null }, data: patch });
    return { ok: true };
  });
  revalidatePath("/", "layout");
  return result;
}
