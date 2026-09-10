# Decisions

Date · question · decision. Question numbers refer to `docs/phase0-plan.md` §2.
Entries marked **assumed** were taken to keep the build moving on 9 Sep 2026 after the
design handoff arrived; say so if any should change.

| Date | Question | Decision |
|---|---|---|
| 2026-09-09 | Design handoff (Q31) | `docs/design/` holds the Claude Design export (`StaffFlow Screens.dc.html`, `StaffFlow.dc.html`, `support.js`, `github.md`). Tile layout **1a**. Its "decisions to confirm" are adopted: red is overrun only, validation and login errors use the indigo tint with a "!" marker; the agent's status card turns red on overrun with «تجاوز المدة»; break buttons grey out with no label while a break runs; corrections act on ended sessions only; a voided session stays listed, struck through, carrying «معدّل»; a cap change opens a confirm before the audit-logged write. The dark wall-screen board stays in the backlog. |
| 2026-09-09 | Q30 logo | `public/brand/mark.svg` is the placeholder drawn from the description. Replace the file with the real SVG; nothing else moves. |
| 2026-09-09 | Q1 demo clock (**assumed**) | `DEMO_CLOCK_START` ("YYYY-MM-DD HH:mm", Asia/Damascus) sets where the demo clock starts; the anchor is persisted in `Config` so restarts keep continuity. Team Lead and Branch Manager get a forward-only jump control in the demo badge (a time today, or next day at work start), audit-logged as `demo_clock_set`. Absent when the multiplier is 1. |
| 2026-09-09 | Q5 rounding (**assumed**) | Budget charge = actual duration rounded to the nearest whole minute, minimum 1. Timestamps keep seconds, so the rule can change without data loss. |
| 2026-09-09 | Q6 auto-end on a clamped break (**assumed**) | Literal §5.4: auto-end at the type's own mark (10 / 20 / 25) regardless of the effective max. |
| 2026-09-09 | A7 used above 25 | The board and summary display the used budget clamped at 25 («25 / 25»), as in the design; remaining is 0. |
| 2026-09-09 | A8 overrun minutes | `overrun_min` = charged minutes beyond the effective max once the grace has been exceeded; overrun itself is elapsed > effective max + grace. |
| 2026-09-09 | A9 16:00 close in reports | Counts as auto-ended in the summary (`ended_by = system`, stale excluded, per §9), shown as «نهاية الدوام» in Corrections. The design's prototype excluded it; the spec wins. |
| 2026-09-09 | A10 status precedence | daily leave > open session (overrun > on break) > hourly-leave window > on floor. |
| 2026-09-09 | Q16 Team Lead ending open sessions | No (design): corrections act on ended sessions only. `ended_by = team_lead` stays unused in v0. |
| 2026-09-09 | Q17 auto-ended then corrected (**assumed**) | `ended_by` stays `system`; the editor is recorded in `editedById/editedAt`. The session still counts as auto-ended and as edited in the summary. |
| 2026-09-09 | A19 corrections window | The dialog lists today's sessions; the 7-day rule is enforced server-side (`started_at ≥ now − 7 × 24 h`). |
| 2026-09-09 | Q21 balance for the submission check (**assumed**) | Spec-literal: displayed balance and the submission check both use approved requests only (as the design prototype does). Approval re-checks the balance and refuses with «يتجاوز الرصيد المتبقي» if other approvals used it up. |
| 2026-09-09 | Q22 past dates (**assumed**) | Any date is accepted (late arrival is filed after the fact); the Branch Manager judges. A daily range crossing 1 January is refused — file two requests. |
| 2026-09-09 | A23 overlap | Checked against pending + approved; touching windows do not overlap; an hourly request on a day inside a daily range does. |
| 2026-09-09 | Q29 credentials (**assumed**) | Usernames `agent01`…`agent12`, `lead`, `manager`. One `SEED_PASSWORD` (default `Demo1234`) for every seeded account, printed once by the seed. Passwords hashed with scrypt. |
| 2026-09-09 | A33 login session | Opaque token in an `HttpOnly`, `SameSite=Lax` cookie signed with `SESSION_SECRET`; 12 h fixed expiry on the real clock; not `Secure` (plain HTTP on the LAN). |
| 2026-09-09 | 403 mechanism | `src/proxy.ts` (Next 16's replacement for middleware) verifies the signed cookie and rewrites a wrong-role request to `/403` with a real 403 status; every page, route handler and server action re-checks the session against the database. |
| 2026-09-09 | Time inputs | Plain `HH:mm` text fields rather than `<input type="time">`, which browsers render in the OS locale (12-hour, sometimes Arabic-Indic digits). Dates are `dd/mm/yyyy` text fields as in the design. |
| 2026-09-09 | Schema deviations from §8 | Additive: `endReason`, `editedAt`, `originalEndedBy`; `LeaveRequest.startsAt/endsAt` (derived UTC interval) and `minutes` instead of `hours`; `AuthSession` as the name for login sessions; `Config` as key/value. The budget charge is never stored. |
| 2026-09-09 | Enumerations | String columns validated by Zod (SQLite has no native enums); Postgres enums are a v1 migration. |
| 2026-09-09 | Prisma 7 | `prisma-client` generator into `src/generated/prisma` (git-ignored, regenerated on install) with the better-sqlite3 driver adapter; `prisma.config.ts` holds the datasource and the seed command. |
| 2026-09-09 | Service host | NSSM rather than pm2 (see `docs/DEPLOY.md` §3). |
| 2026-09-09 | Demo-day pitfall | If the demo runs on a Thursday, "daily leave for tomorrow" is a Friday and costs 0; the e2e pins a Tuesday. |
| 2026-09-10 | Team Lead and leave (user) | The Team Lead requests leave like an agent (`/lead/leave`, same balance rule, same Branch Manager decision), may cancel their own pending request, and appears as a tile on the **Branch Manager's** board only, marked «مشرف», with no break budget. Balances and the daily summary list agents first, then the Team Lead. The Team Lead still takes no breaks (spec §3). |
| 2026-09-10 | Date fields (user) | Leave dates and the summary date use the browser's calendar picker (`<input type="date">`, ISO values) instead of the design's dd/mm/yyyy text fields. Times stay HH:mm text. |
| 2026-09-10 | e2e server | The Playwright run serves a production build (`next build` + `next start` on port 3100) so it can run while `npm run demo` is open in another terminal. |
