"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAuthSession, destroyAuthSession, verifyPassword } from "../auth";
import { ensureDb, prisma } from "../db";
import { env } from "../env";
import { toUser } from "../mappers";
import { getCurrentUser } from "../session";
import { SESSION_COOKIE, homeFor, signSessionCookie } from "../session-cookie";

export interface LoginState {
  error: boolean;
}

const loginSchema = z.object({ username: z.string().trim().min(1).max(64), password: z.string().min(1).max(200) });

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({ username: formData.get("username"), password: formData.get("password") });
  if (!parsed.success) return { error: true };
  await ensureDb();
  const row = await prisma.user.findUnique({ where: { username: parsed.data.username } });
  if (!row || !row.active || !verifyPassword(parsed.data.password, row.passwordHash)) return { error: true };
  const user = toUser(row);
  const now = new Date(); // real time: login sessions never run on the demo clock
  const { token, expiresAt } = await createAuthSession(user.id, now);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await signSessionCookie(token, user.role, env.sessionSecret), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  redirect(homeFor(user.role));
}

export async function logout(): Promise<void> {
  const me = await getCurrentUser();
  if (me) await destroyAuthSession(me.token);
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}
