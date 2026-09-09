"use server";

import { revalidatePath } from "next/cache";
import { validateCap } from "@/domain/pools";
import { audit } from "../audit";
import { serverNow } from "../clock";
import { loadTeam } from "../config";
import { prisma } from "../db";
import { withLock } from "../lock";
import { requireRole } from "../session";
import type { ActionResult } from "./types";

/** Spec §5.6 — General cap 1 / 2 / 3. Immediate for new starts; running breaks are never cut. */
export async function setGeneralCap(raw: unknown): Promise<ActionResult<"invalid">> {
  const me = await requireRole("team_lead");
  const cap = typeof raw === "string" ? Number(raw) : raw;
  if (!validateCap(cap)) return { ok: false, error: "invalid" };
  await withLock(async () => {
    const now = await serverNow();
    const team = await loadTeam();
    if (team.caps.capGeneral === cap) return;
    await prisma.$transaction(async (tx) => {
      await tx.team.update({ where: { id: team.id }, data: { capGeneral: cap } });
      await audit(tx, {
        actorId: me.user.id,
        action: "cap_changed",
        entity: "team",
        entityId: team.id,
        before: { capGeneral: team.caps.capGeneral },
        after: { capGeneral: cap },
        at: now,
      });
    });
  });
  revalidatePath("/", "layout");
  return { ok: true };
}
