# StaffFlow

Internal floor-coverage and leave tool for one customer-service branch of Sham Cash.

StaffFlow answers a single question at a glance: **is the floor covered right now, who is off it, and why?** There are two reasons anyone is off the floor — a break, or approved leave — and both live here.

The interface is Arabic-only and right-to-left. It runs on one desktop on the branch LAN, stores everything in a single SQLite file, and needs no internet connection once installed.

---

## Contents

- [What it does](#what-it-does)
- [Roles](#roles)
- [The rules it enforces](#the-rules-it-enforces)
- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Commands](#commands)
- [Configuration](#configuration)
- [Project layout](#project-layout)
- [Testing](#testing)
- [Deployment](#deployment)
- [Documentation](#documentation)

---

## What it does

**Breaks.** An agent takes a break with one click. The server decides whether that is allowed right now — work hours, a daily minute budget, a per-type allowance, and how many people are already away — then starts a timer. Breaks that run long are marked, and breaks that are never closed are ended by the server at a fixed mark, not whenever someone happens to look.

**Leave.** Agents and the Team Lead request hourly or daily leave against an annual balance. The Branch Manager approves, rejects or revokes. Approved leave changes the live board automatically for the window it covers.

**Oversight.** The Team Lead watches a live board of the whole team, raises or lowers how many people may be on break at once, and corrects mistakes with a mandatory note. The Branch Manager sees the same board read-only, decides leave, and exports a daily summary as CSV.

## Roles

| Role | Arabic | Sees |
|---|---|---|
| Agent | موظف خدمة عملاء | Own break buttons and own leave. No numbers about their own break usage. |
| Team Lead | مشرف | Live board of all agents, the break cap control, corrections, leave requests read-only, and their own leave. |
| Branch Manager | مدير الفرع | The board read-only including the Team Lead, leave decisions, daily summary, leave balances. |

Authorization is checked on the server for every page, route handler and server action. An agent reaching a Team Lead or Branch Manager URL gets a real HTTP 403, and a crafted request cannot start a toilet break on the other gender's pool.

## The rules it enforces

All of these are pure functions under `src/domain/`, each covered by unit tests:

- **Daily budget.** A per-agent minute budget across all break types; the effective maximum for a break is capped by what is left.
- **Per-type allowances.** Counts and durations per break type, per day.
- **Pools.** A general concurrency cap the Team Lead can change live, plus separate toilet pools per gender.
- **Overrun.** A break is in overrun past its effective maximum plus a grace period.
- **Automatic closure.** Auto-end at the type's mark, stale-toilet release, and an end-of-day close, all performed by one idempotent sweep that runs at the start of every read and write that touches sessions.
- **Leave.** Hourly windows inside work hours, daily ranges costed at working days only, overlap detection against pending and approved requests, and an annual balance.
- **Time.** Every timestamp is the server's. Stored as UTC, converted to `Asia/Damascus` only for display and for day and work-hour boundaries. Clients never send a time.

## Tech stack

| Layer | Choice |
|---|---|
| Runtime | Node.js LTS |
| Framework | Next.js (App Router), React Server Components and server actions |
| Language | TypeScript, `strict` |
| Styling | Tailwind CSS, logical properties only (RTL-safe) |
| Data | Prisma with SQLite, via the better-sqlite3 driver adapter |
| Validation | Zod at every input boundary |
| Tests | Vitest (unit), Playwright (end-to-end) |

No UI kit and no client state library: server components, server actions and light local state.

## Quick start

Requires Node.js LTS and Git.

```bash
git clone https://github.com/ITomarShamma/StaffFlow.git
cd StaffFlow
npm ci
cp .env.example .env
```

Set `SESSION_SECRET` in `.env` to a long random string, then:

```bash
npm run db:reset
npm run dev
```

Open `http://localhost:3000`. The seed prints every account once; all of them share the password in `SEED_PASSWORD`.

| Username | Role |
|---|---|
| `agent01` … `agent12` | Agent |
| `lead` | Team Lead |
| `manager` | Branch Manager |

To see overrun and auto-end without waiting, run the demo instead — it advances the clock ten times faster and gives the Team Lead and Branch Manager a forward clock-jump control:

```bash
npm run demo:fresh
```

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Development server on `0.0.0.0:3000` |
| `npm run build` / `npm start` | Production build and server |
| `npm test` | Unit tests |
| `npm run test:e2e` | Playwright acceptance run (builds and serves on port 3100) |
| `npm run db:reset` | Recreate the database, apply migrations, seed |
| `npm run demo` | Development server with `DEMO_CLOCK_MULTIPLIER=10` |
| `npm run demo:fresh` | Reset then demo, in one step |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run admin -- <cmd>` | Accounts, caps and backups without touching code |

Windows PowerShell 5.1 does not accept `&&` between commands. Run them one per line.

## Configuration

Everything an operator can change is data, never a constant in code. Headcount, names, caps, break parameters, work hours and leave rules live in the seed and the `Config` table.

`.env`:

| Key | Meaning |
|---|---|
| `DATABASE_URL` | SQLite file, default `file:./data/staffflow.db` |
| `SESSION_SECRET` | Signs the login cookie. Without it, every restart logs everyone out. |
| `SEED_PASSWORD` | Password given to seeded accounts on reset |
| `DEMO_CLOCK_MULTIPLIER` | Empty in production; `10` for a demo |
| `DEMO_CLOCK_START` | Empty in production; `"YYYY-MM-DD HH:mm"` to start a demo at a chosen moment |

Day-to-day administration:

```bash
npm run admin -- list
npm run admin -- set-password --username agent01 --password "…"
npm run admin -- add-agent --username agent13 --name "…" --gender female
npm run admin -- set-cap --general 3
npm run admin -- backup
```

## Project layout

```
src/app/(auth)/login      login
src/app/agent             role: agent
src/app/lead              role: team_lead
src/app/manager           role: branch_manager
src/domain                pure, tested rules — clock, tz, pools, allowances, budget,
                          sessions, sweep, corrections, leave, balance, summary
src/server                database client, auth, session, server actions (thin)
src/components            RTL React components
src/i18n/ar.ts            every UI string
prisma/                   schema, migrations, seed
scripts/                  admin script, database reset, e2e server
tests/unit                Vitest
tests/e2e                 Playwright
docs/                     spec, decisions, backlog, deployment, design handoff
```

Server actions and route handlers call the domain; they never re-implement a rule.

## Testing

```bash
npm test          # 90 unit tests across the domain
npm run test:e2e  # the acceptance script, end to end
```

The end-to-end run is the acceptance test for v0: it walks the full demo script from spec §10 in one browser with three signed-in roles, covering breaks, pools, the cap change, overrun, auto-end, corrections, leave submission and refusals, approval, the daily summary and the CSV export, plus the 403 boundaries. It builds the app and serves it on port 3100, so it can run while a development server is open.

## Deployment

One Windows desktop on the branch hosts the server; every other desktop opens it in a browser over the LAN.

- [`run.md`](run.md) — step-by-step setup for the host desktop and the employee desktops, in plain language.
- [`docs/DEPLOY.md`](docs/DEPLOY.md) — the full reference: running as a Windows service with NSSM, firewall and LAN address, nightly backups, upgrades, troubleshooting.

## Documentation

| File | Contents |
|---|---|
| [`docs/spec.md`](docs/spec.md) | The source of truth for behaviour |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | Every question the spec left open, and how it was settled |
| [`docs/BACKLOG.md`](docs/BACKLOG.md) | Out of scope for v0, one line each |
| [`docs/DEPLOY.md`](docs/DEPLOY.md) | Operations reference |
| [`run.md`](run.md) | Plain-language run guide |
| [`CLAUDE.md`](CLAUDE.md) | Working agreement and non-negotiables for contributors |
