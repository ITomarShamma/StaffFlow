// Who is calling? Every page and server action goes through here (CLAUDE.md rule 5).
// Login sessions expire by real time, not demo time.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Role } from "@/domain/types";
import { ensureDb, prisma } from "./db";
import { env } from "./env";
import { toUser, type AppUser } from "./mappers";
import { SESSION_COOKIE, parseSessionCookie } from "./session-cookie";

export interface CurrentUser {
  user: AppUser;
  token: string;
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const jar = await cookies();
  const parsed = await parseSessionCookie(jar.get(SESSION_COOKIE)?.value, env.sessionSecret);
  if (!parsed) return null;
  await ensureDb();
  const session = await prisma.authSession.findUnique({ where: { id: parsed.token }, include: { user: true } });
  if (!session || session.expiresAt.getTime() <= Date.now() || !session.user.active) return null;
  const user = toUser(session.user);
  if (user.role !== parsed.role) return null;
  return { user, token: parsed.token };
});

/** Redirects to /login when signed out and to /403 when the role does not match. */
export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (!roles.includes(me.user.role)) redirect("/403");
  return me;
}
