"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { editEnd, voidSession, type EditError } from "@/domain/corrections";
import { localParts, localToUtc } from "@/domain/tz";
import { typeByCode } from "@/domain/types";
import { audit } from "../audit";
import { serverNow } from "../clock";
import { loadBreakTypes, loadConfig } from "../config";
import { prisma } from "../db";
import { withLock } from "../lock";
import { toSession } from "../mappers";
import { requireRole } from "../session";
import { sweepUnlocked } from "../sweep";
import type { ActionResult } from "./types";

const editSchema = z.object({
  sessionId: z.string().min(1),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  note: z.string().max(500),
});

const voidSchema = z.object({
  sessionId: z.string().min(1),
  note: z.string().max(500),
});

export type CorrectionError = EditError | "invalid" | "not_found";

/** Spec §5.5 — edit the end time (same local day as the start). Original values are preserved. */
export async function editSessionEnd(raw: unknown): Promise<ActionResult<CorrectionError>> {
  const me = await requireRole("team_lead");
  const input = editSchema.safeParse(raw);
  if (!input.success) return { ok: false, error: "invalid" };
  const result = await withLock(async (): Promise<ActionResult<CorrectionError>> => {
    const now = await serverNow();
    await sweepUnlocked(now);
    const row = await prisma.breakSession.findUnique({ where: { id: input.data.sessionId } });
    if (!row) return { ok: false, error: "not_found" };
    const session = toSession(row);
    const [types, cfg] = await Promise.all([loadBreakTypes(), loadConfig()]);
    const newEndedAt = localToUtc(localParts(session.startedAt).date, input.data.endTime);
    const r = editEnd({ session, type: typeByCode(types, session.typeCode), newEndedAt, note: input.data.note, editorId: me.user.id, now, cfg });
    if (!r.ok) return { ok: false, error: r.error };
    await prisma.$transaction(async (tx) => {
      await tx.breakSession.update({ where: { id: session.id }, data: r.patch });
      await audit(tx, {
        actorId: me.user.id,
        action: "session_edited",
        entity: "break_session",
        entityId: session.id,
        before: { endedAt: session.endedAt, overrunMin: session.overrunMin },
        after: { endedAt: r.patch.endedAt, overrunMin: r.patch.overrunMin, note: r.patch.editNote },
        at: now,
      });
    });
    return { ok: true };
  });
  revalidatePath("/", "layout");
  return result;
}

/** Spec §5.5 — void a session. It stays listed, struck through, and charges nothing. */
export async function voidBreakSession(raw: unknown): Promise<ActionResult<CorrectionError>> {
  const me = await requireRole("team_lead");
  const input = voidSchema.safeParse(raw);
  if (!input.success) return { ok: false, error: "invalid" };
  const result = await withLock(async (): Promise<ActionResult<CorrectionError>> => {
    const now = await serverNow();
    await sweepUnlocked(now);
    const row = await prisma.breakSession.findUnique({ where: { id: input.data.sessionId } });
    if (!row) return { ok: false, error: "not_found" };
    const session = toSession(row);
    const cfg = await loadConfig();
    const r = voidSession({ session, note: input.data.note, editorId: me.user.id, now, cfg });
    if (!r.ok) return { ok: false, error: r.error };
    await prisma.$transaction(async (tx) => {
      await tx.breakSession.update({ where: { id: session.id }, data: r.patch });
      await audit(tx, {
        actorId: me.user.id,
        action: "session_voided",
        entity: "break_session",
        entityId: session.id,
        before: { voided: false, endedAt: session.endedAt },
        after: { voided: true, note: r.patch.editNote },
        at: now,
      });
    });
    return { ok: true };
  });
  revalidatePath("/", "layout");
  return result;
}
