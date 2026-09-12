import type { Prisma } from "@/generated/prisma/client";

export type AuditAction = "cap_changed" | "session_edited" | "session_voided" | "leave_decided" | "leave_revoked" | "demo_clock_set" | "password_changed";

export async function audit(
  tx: Prisma.TransactionClient,
  entry: { actorId: string; action: AuditAction; entity: string; entityId: string; before?: unknown; after?: unknown; at: Date },
): Promise<void> {
  await tx.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      before: entry.before === undefined ? null : JSON.stringify(entry.before),
      after: entry.after === undefined ? null : JSON.stringify(entry.after),
      at: entry.at,
    },
  });
}
