import { cache } from "react";
import { parseConfig } from "@/domain/config";
import type { AppConfig, BreakTypeConfig, TeamCaps } from "@/domain/types";
import { ensureDb, prisma } from "./db";
import { toBreakType, toCaps } from "./mappers";

export async function getConfigValue(key: string): Promise<string | null> {
  await ensureDb();
  const row = await prisma.config.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function setConfigValue(key: string, value: string): Promise<void> {
  await prisma.config.upsert({ where: { key }, update: { value }, create: { key, value } });
}

export const loadConfig = cache(async (): Promise<AppConfig> => {
  await ensureDb();
  const rows = await prisma.config.findMany();
  return parseConfig(Object.fromEntries(rows.map((r) => [r.key, r.value])));
});

export const loadBreakTypes = cache(async (): Promise<BreakTypeConfig[]> => {
  const rows = await prisma.breakType.findMany({ orderBy: { sortOrder: "asc" } });
  return rows.map(toBreakType);
});

/** v0 has exactly one team (spec §2). Caps are read fresh on every call (spec §5.6). */
export async function loadTeam(): Promise<{ id: string; name: string; caps: TeamCaps }> {
  const t = await prisma.team.findFirstOrThrow();
  return { id: t.id, name: t.name, caps: toCaps(t) };
}
