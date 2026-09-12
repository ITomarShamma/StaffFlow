"use server";

// Change password from the login screen (decision 2026-09-12). Anyone who knows their
// current password can set a new one without an administrator. Every existing login of that
// account is ended, so a desktop left signed in elsewhere is signed out too; with the stale-
// cookie fix those desktops land on the login form instead of an error.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { passwordProblem, type PasswordProblem } from "@/domain/password";
import { audit } from "../audit";
import { hashPassword, verifyPassword } from "../auth";
import { ensureDb, prisma } from "../db";
import { SESSION_COOKIE } from "../session-cookie";

export interface ChangePasswordState {
  error: PasswordProblem | "wrong_credentials" | null;
}

const schema = z.object({
  username: z.string().trim().min(1).max(64),
  current: z.string().min(1).max(200),
  next: z.string().max(200),
  confirm: z.string().max(200),
});

export async function changePassword(_prev: ChangePasswordState, formData: FormData): Promise<ChangePasswordState> {
  const parsed = schema.safeParse({
    username: formData.get("username"),
    current: formData.get("current"),
    next: formData.get("next"),
    confirm: formData.get("confirm"),
  });
  // A missing username or current password is reported exactly like a wrong one.
  if (!parsed.success) return { error: "wrong_credentials" };
  const { username, current, next, confirm } = parsed.data;

  // The new password is checked first: it needs no database and costs no hashing.
  const problem = passwordProblem({ current, next, confirm });
  if (problem) return { error: problem };

  await ensureDb();
  const row = await prisma.user.findUnique({ where: { username } });
  // One message for an unknown user and a wrong password, as on the login form.
  if (!row || !row.active || !verifyPassword(current, row.passwordHash)) return { error: "wrong_credentials" };

  const now = new Date(); // real time, like login sessions
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: row.id }, data: { passwordHash: hashPassword(next) } });
    await tx.authSession.deleteMany({ where: { userId: row.id } });
    await audit(tx, { actorId: row.id, action: "password_changed", entity: "user", entityId: row.id, at: now });
  });
  // This browser's own cookie, if any, now points at a deleted session.
  (await cookies()).set(SESSION_COOKIE, "", { path: "/", expires: new Date(0), httpOnly: true, sameSite: "lax" });
  redirect("/login?changed=1");
}
