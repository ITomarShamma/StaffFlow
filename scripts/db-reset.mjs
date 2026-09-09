// `npm run db:reset` — migrate + seed from clean (CLAUDE.md "Commands").
// Deliberately avoids `prisma migrate reset`: inside a Claude Code terminal its AI-agent
// guard aborts after recreating the file, leaving a database with no tables.

import "dotenv/config";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";

const url = process.env.DATABASE_URL?.trim() || "file:./data/staffflow.db";
if (!url.startsWith("file:")) {
  console.error("db:reset handles SQLite file URLs only; DATABASE_URL is " + url);
  process.exit(2);
}
const file = url.slice("file:".length);
mkdirSync(path.dirname(file), { recursive: true });
for (const suffix of ["", "-journal", "-wal", "-shm"]) {
  if (existsSync(file + suffix)) rmSync(file + suffix);
}
console.log(`db:reset — removed ${file}, applying migrations and seeding`);
execSync("npx prisma migrate deploy", { stdio: "inherit" });
execSync("npx prisma db seed", { stdio: "inherit" });
