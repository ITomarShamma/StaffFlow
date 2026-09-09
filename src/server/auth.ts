// Passwords (scrypt, Node built-in) and server-side login sessions.

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { prisma } from "./db";
import { env } from "./env";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export async function createAuthSession(userId: string, now: Date): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(now.getTime() + env.sessionHours * 3600 * 1000);
  await prisma.authSession.create({ data: { id: token, userId, createdAt: now, expiresAt } });
  return { token, expiresAt };
}

export async function destroyAuthSession(token: string): Promise<void> {
  await prisma.authSession.deleteMany({ where: { id: token } });
}
