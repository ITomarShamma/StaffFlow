# StaffFlow — project instructions for Claude Code

Internal floor-coverage and leave tool for one customer-service branch of Sham Cash.

`docs/spec.md` is the source of truth. Spec §10 (the demo script) is the acceptance test for v0.
If this file and the spec disagree, the spec wins — and tell me.

## Stack (decided — do not substitute)

- Node, current LTS · npm
- Next.js, current stable, App Router, TypeScript `strict`
- Tailwind CSS
- Prisma + SQLite (`./data/staffflow.db`)
- Zod for every input boundary
- Vitest (unit) · Playwright (e2e)
- No UI kit unless I approve one. No client state library: server components + server actions + light client state.

## Non-negotiables

1. **Arabic only, RTL.** Root layout is `<html lang="ar" dir="rtl">`. Use logical properties and Tailwind logical utilities (`ms-` `me-` `ps-` `pe-` `start-` `end-` `text-start`). Never `left` / `right` / `ml-` / `mr-` / `pl-` / `pr-`. Digits are Western (0–9).
2. **All UI strings live in `src/i18n/ar.ts`.** No string literals in components. Strings come from spec Appendix A and the design handoff. A string that exists in neither gets added with a `// TODO-COPY` comment for my review.
3. **Server-authoritative time.** Every start, end and decision timestamp comes from `src/domain/clock.ts` on the server. Clients never send timestamps. `clock.now()` honours `DEMO_CLOCK_MULTIPLIER`.
4. **Domain rules are pure functions in `src/domain/`,** each with unit tests. Server actions and route handlers call the domain; they never re-implement a rule. If you are writing an `if` about minutes, caps, pools or balances outside `src/domain/`, stop.
5. **Authorization on every server action and route handler**: session → role check. Toilet breaks additionally check the agent's gender against the pool, server-side. Never trust role or gender from the client.
6. **Headcount, names, caps, break parameters, work hours and leave rules are data** (Prisma seed + `Config` table). Never constants in code.
7. **Timestamps stored as UTC ISO.** Converted to `Asia/Damascus` only for display and for day / work-hour boundaries.
8. **Scope is spec §2 "In".** Anything else goes to `docs/BACKLOG.md` as one line — not into the code.
9. **Idempotent sweep.** Auto-end, stale toilet release and the 16:00 close are done by `sweep(now)` in `src/domain/sweep.ts`, called at the start of every read and write that touches sessions, plus an interval in the server entry. Never rely on cron or on the client.

## Repository layout

```
src/app/(auth)/login
src/app/agent/          role: agent
src/app/lead/           role: team_lead
src/app/manager/        role: branch_manager
src/domain/             clock, pools, allowances, budget, sessions, sweep, leave, balance — pure, tested
src/server/             db client, auth, session, server actions (thin)
src/components/
src/i18n/ar.ts
prisma/schema.prisma    prisma/seed.ts
scripts/                admin script (add agent, change cap, reset)
tests/unit              tests/e2e
docs/spec.md  docs/DECISIONS.md  docs/BACKLOG.md  docs/DEPLOY.md  docs/design/ (if a handoff exists)
```

## Commands

- `npm run dev` — dev server on `0.0.0.0:3000`
- `npm test` — unit tests
- `npm run test:e2e` — Playwright demo script
- `npm run db:reset` — migrate + seed from clean
- `npm run demo` — start with `DEMO_CLOCK_MULTIPLIER=10`
- `npm run build && npm start` — production

## How we work

- Before touching `src/domain/` or `prisma/schema.prisma`: write the plan, show it, wait for my go.
- Domain rules: failing test first, then the implementation.
- `npm test` after every domain change. e2e before calling a phase done.
- One commit per phase: `phase N: <what>`.
- Spec silent or ambiguous → ask me. Record the answer in `docs/DECISIONS.md` (date · question · decision).
- Status reports: at most 5 lines — done, next, what you need from me.

## Definition of done — v0

- `npm run db:reset && npm run demo` works from a clean clone.
- Spec §10 passes as a Playwright test in demo mode.
- An agent session cannot reach `/lead` or `/manager` (403), and cannot start a toilet break on the other gender's pool even with a crafted request.
- `docs/DEPLOY.md` explains running as a Windows service on the branch LAN.
