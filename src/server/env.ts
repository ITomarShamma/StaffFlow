// Process environment, read once. No Prisma here: proxy.ts imports this too.

import { randomBytes } from "node:crypto";
import { parseMultiplier } from "@/domain/clock";

type G = typeof globalThis & { __sfSessionSecret?: string };

function sessionSecret(): string {
  const fromEnv = process.env.SESSION_SECRET?.trim();
  if (fromEnv) return fromEnv;
  // Not configured: a per-process secret. Sessions end when the server restarts (docs/DEPLOY.md).
  const g = globalThis as G;
  g.__sfSessionSecret ??= randomBytes(32).toString("hex");
  return g.__sfSessionSecret;
}

export const env = {
  databaseUrl: process.env.DATABASE_URL?.trim() || "file:./data/staffflow.db",
  seedPassword: process.env.SEED_PASSWORD?.trim() || "Demo1234",
  demoMultiplier: parseMultiplier(process.env.DEMO_CLOCK_MULTIPLIER),
  /** "YYYY-MM-DD HH:mm" Asia/Damascus, demo mode only. */
  demoClockStart: process.env.DEMO_CLOCK_START?.trim() || null,
  get sessionSecret(): string {
    return sessionSecret();
  },
  sessionHours: 12,
};

export function isDemoMode(): boolean {
  return env.demoMultiplier > 1;
}
