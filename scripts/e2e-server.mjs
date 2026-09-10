// Starts the app for the Playwright run on its own throwaway database (data/e2e.db):
// fresh file, migrations applied, seeded, then a production build served on port 3100 in
// demo mode with a fixed clock start (a Tuesday, so "tomorrow" in demo step 10 is a working
// day). A production server is used so the run does not collide with a `next dev` that may
// already be running in this directory.

import { execSync, spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";

const DB_FILE = "data/e2e.db";
const env = {
  ...process.env,
  DATABASE_URL: `file:./${DB_FILE}`,
  SESSION_SECRET: "e2e-secret",
  SEED_PASSWORD: "Demo1234",
  DEMO_CLOCK_MULTIPLIER: process.env.E2E_MULTIPLIER ?? "5",
  DEMO_CLOCK_START: process.env.E2E_DAY ? `${process.env.E2E_DAY} 08:30` : "2026-09-15 08:30",
};

// Only the e2e scratch file is ever touched here — never the app's database.
for (const suffix of ["", "-journal", "-wal", "-shm"]) {
  const f = `${DB_FILE}${suffix}`;
  if (existsSync(f)) rmSync(f);
}
execSync("npx prisma migrate deploy", { stdio: "inherit", env });
execSync("npx prisma db seed", { stdio: "inherit", env });
if (process.env.E2E_SKIP_BUILD !== "1") execSync("npx next build", { stdio: "inherit", env });

const child = spawn("npx", ["next", "start", "-p", "3100"], { stdio: "inherit", env, shell: true });
child.on("exit", (code) => process.exit(code ?? 0));
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill());
