// `npm run db:reset` → prisma migrate reset --force → this seed. Prints the usernames and
// the shared password once. Everything here is data from prisma/seed-data.ts.

import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/server/auth";
import { SEED_BRANCH, SEED_BREAK_TYPES, SEED_CONFIG, SEED_TEAM, SEED_USERS } from "./seed-data";

const url = process.env.DATABASE_URL?.trim() || "file:./data/staffflow.db";
const password = process.env.SEED_PASSWORD?.trim() || "Demo1234";
const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });

async function main() {
  await prisma.$executeRawUnsafe("PRAGMA journal_mode=WAL");
  // Clean slate (migrate reset already dropped the tables, but the seed is safe to rerun).
  await prisma.auditLog.deleteMany();
  await prisma.authSession.deleteMany();
  await prisma.breakSession.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.user.deleteMany();
  await prisma.team.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.breakType.deleteMany();
  await prisma.config.deleteMany();

  const branch = await prisma.branch.create({ data: { name: SEED_BRANCH.name } });
  const team = await prisma.team.create({ data: { branchId: branch.id, ...SEED_TEAM } });

  for (const t of SEED_BREAK_TYPES) await prisma.breakType.create({ data: t });
  for (const [key, value] of Object.entries(SEED_CONFIG)) await prisma.config.create({ data: { key, value } });

  const passwordHash = hashPassword(password);
  for (const u of SEED_USERS) {
    await prisma.user.create({ data: { teamId: team.id, username: u.username, nameAr: u.nameAr, role: u.role, gender: u.gender, passwordHash, active: true } });
  }

  const pad = (s: string, n: number) => s + " ".repeat(Math.max(0, n - s.length));
  console.log("");
  console.log("StaffFlow seed — accounts (password shown once):");
  console.log(`  ${pad("username", 10)} ${pad("role", 16)} name`);
  for (const u of SEED_USERS) console.log(`  ${pad(u.username, 10)} ${pad(u.role, 16)} ${u.nameAr}`);
  console.log(`  password for every account: ${password}`);
  console.log(`  team "${SEED_TEAM.name}": general cap ${SEED_TEAM.capGeneral}, toilet F ${SEED_TEAM.capToiletFemale}, toilet M ${SEED_TEAM.capToiletMale}`);
  console.log("");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
