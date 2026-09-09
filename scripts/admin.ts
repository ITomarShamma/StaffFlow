// Admin script — headcount and caps are data, never code (CLAUDE.md rule 6; spec §2 "Out": no
// user-management screen in v0). Run with `npm run admin -- <command> [options]`.
//
//   list                                              accounts and caps
//   add-agent --username U --name "الاسم" --gender male|female [--password P]
//   set-password --username U --password P
//   deactivate --username U | activate --username U
//   set-cap --general 1|2|3 [--toilet-female N] [--toilet-male N]
//   backup [--to path]                                consistent copy of the SQLite file
//   reset                                             same as `npm run db:reset`

import "dotenv/config";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/server/auth";

const url = process.env.DATABASE_URL?.trim() || "file:./data/staffflow.db";
const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });

function opts(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a.startsWith("--")) {
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        out[a.slice(2)] = next;
        i++;
      } else out[a.slice(2)] = "true";
    }
  }
  return out;
}

function need(o: Record<string, string>, key: string): string {
  const v = o[key];
  if (!v) {
    console.error(`missing --${key}`);
    process.exit(2);
  }
  return v;
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const o = opts(rest);
  switch (cmd) {
    case "list": {
      const team = await prisma.team.findFirstOrThrow();
      const users = await prisma.user.findMany({ orderBy: { username: "asc" } });
      console.log(`team "${team.name}": general cap ${team.capGeneral}, toilet F ${team.capToiletFemale}, toilet M ${team.capToiletMale}`);
      for (const u of users) console.log(`  ${u.username.padEnd(10)} ${u.role.padEnd(16)} ${u.gender.padEnd(7)} ${u.active ? "active  " : "inactive"} ${u.nameAr}`);
      break;
    }
    case "add-agent": {
      const username = need(o, "username");
      const nameAr = need(o, "name");
      const gender = need(o, "gender");
      if (gender !== "male" && gender !== "female") throw new Error("--gender must be male or female");
      const password = o.password ?? process.env.SEED_PASSWORD ?? "Demo1234";
      const team = await prisma.team.findFirstOrThrow();
      await prisma.user.create({ data: { teamId: team.id, username, nameAr, gender, role: "agent", passwordHash: hashPassword(password), active: true } });
      console.log(`added agent ${username} (${nameAr}, ${gender}); password: ${password}`);
      break;
    }
    case "set-password": {
      const username = need(o, "username");
      const password = need(o, "password");
      await prisma.user.update({ where: { username }, data: { passwordHash: hashPassword(password) } });
      await prisma.authSession.deleteMany({ where: { user: { username } } });
      console.log(`password changed for ${username}; existing logins ended`);
      break;
    }
    case "deactivate":
    case "activate": {
      const username = need(o, "username");
      const active = cmd === "activate";
      await prisma.user.update({ where: { username }, data: { active } });
      if (!active) await prisma.authSession.deleteMany({ where: { user: { username } } });
      console.log(`${username} is now ${active ? "active" : "inactive"}`);
      break;
    }
    case "set-cap": {
      const team = await prisma.team.findFirstOrThrow();
      const data: { capGeneral?: number; capToiletFemale?: number; capToiletMale?: number } = {};
      if (o.general) {
        const n = Number(o.general);
        if (![1, 2, 3].includes(n)) throw new Error("--general must be 1, 2 or 3");
        data.capGeneral = n;
      }
      if (o["toilet-female"]) data.capToiletFemale = Number(o["toilet-female"]);
      if (o["toilet-male"]) data.capToiletMale = Number(o["toilet-male"]);
      if (Object.keys(data).length === 0) throw new Error("nothing to change");
      const t = await prisma.team.update({ where: { id: team.id }, data });
      console.log(`caps: general ${t.capGeneral}, toilet F ${t.capToiletFemale}, toilet M ${t.capToiletMale}`);
      break;
    }
    case "backup": {
      const file = url.replace(/^file:/, "");
      const stamp = new Date().toISOString().slice(0, 10);
      const to = o.to ?? path.join(path.dirname(file), "backups", `staffflow-${stamp}.db`);
      mkdirSync(path.dirname(to), { recursive: true });
      // better-sqlite3's online backup API copies a consistent snapshot even while the app writes.
      const { default: Database } = await import("better-sqlite3");
      const db = new Database(file, { readonly: true });
      await db.backup(to);
      db.close();
      console.log(`backup written to ${to}`);
      break;
    }
    case "reset": {
      execSync("node scripts/db-reset.mjs", { stdio: "inherit" });
      break;
    }
    default:
      console.log("commands: list | add-agent | set-password | deactivate | activate | set-cap | backup | reset");
      process.exit(cmd ? 2 : 0);
  }
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
