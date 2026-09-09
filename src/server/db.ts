import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "./env";

type G = typeof globalThis & { __sfPrisma?: PrismaClient; __sfPragma?: Promise<void> };
const g = globalThis as G;

function create(): PrismaClient {
  const adapter = new PrismaBetterSqlite3({ url: env.databaseUrl });
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient = g.__sfPrisma ?? create();
if (process.env.NODE_ENV !== "production") g.__sfPrisma = prisma;

/** WAL keeps the 5-second board polls from blocking writes. Runs once per process. */
export function ensureDb(): Promise<void> {
  g.__sfPragma ??= (async () => {
    try {
      await prisma.$executeRawUnsafe("PRAGMA journal_mode=WAL");
      await prisma.$executeRawUnsafe("PRAGMA busy_timeout=5000");
    } catch {
      // read-only or already set — not fatal
    }
  })();
  return g.__sfPragma;
}
